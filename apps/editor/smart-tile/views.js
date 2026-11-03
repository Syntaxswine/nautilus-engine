import {SMART_TILE_LIMITS as L} from './contract.js';
import {fail} from './checkpoint.js';

// Source-private continuation lookup. The ordinary manager object is unchanged.
const retirementOwners=new WeakMap();
export function createPrivateSmartTileViewsRetirementPort(manager){
  const port=retirementOwners.get(manager);
  if(!port)fail('VIEW_RETIREMENT_OWNER','/views','Use the exact actual views coordinator.');
  return port;
}

// This owner calls the public presenter through one borrowed acquisition port.
// Allocations in callbacks and retiring allocations still consume the budget.
export function createSmartTileViews({acquire,attach,onDiagnostic=()=>{}}){
  let accepted=null,candidate=null,flight=null,queued=null,disposed=false,draining=false;
  const records=new Set(),retirements=new WeakMap(),retryHandles=new WeakMap();
  const report=code=>{try{onDiagnostic(code);}catch{}};
  const totals=()=>{let triangles=0,cells=0;for(const r of records){triangles+=r.triangles;cells+=r.cells;}return {triangles,cells};};
  function metrics(){const t=totals();return {accepted:accepted?1:0,candidate:candidate?1:0,acquiring:[...records].filter(r=>r.state==='acquiring').length,retiring:[...records].filter(r=>r.state==='retiring').length,roots:records.size,triangles:t.triangles,cells:t.cells,maxRoots:L.viewRoots,maxTriangles:L.triangles,maxCells:L.derivedCells};}
  function unlink(root){const parent=root?.parent;if(!parent)return;try{parent.remove(root);}catch{report('VIEW_DETACH_CALLBACK');}finally{for(let i=parent.children.length-1;i>=0;i--)if(parent.children[i]===root)parent.children.splice(i,1);if(root.parent===parent)root.parent=null;const next=root.parent;if(next){for(let i=next.children.length-1;i>=0;i--)if(next.children[i]===root)next.children.splice(i,1);root.parent=null;}}}
  function sameRetirement(r,m){
    return records.has(r)&&retirements.get(r)===m&&!m.settled&&
      Object.getOwnPropertyDescriptor(r,'state')?.value==='retiring'&&Object.getOwnPropertyDescriptor(r,'view')?.value===m.view;
  }
  const positiveReceipt=receipt=>!!receipt&&typeof receipt==='object'&&Object.isFrozen(receipt)&&Object.getOwnPropertyDescriptor(receipt,'complete')?.value===true;
  function finishRetirement(r,m,expectedReceipt=null){
    const view=m.view;if(!view)return {complete:false,code:'VIEW_RETIREMENT_UNVERIFIED'}; // Acquisition owns late delivery/drain.
    let clean=false,returned; m.busy=true;
    try{
      try{returned=view.dispose();}catch{report('VIEW_CLEANUP_CALLBACK');}
      finally{unlink(view.root);}
      try{const d=view.diagnostics();clean=d.disposed===true&&d.ownedGeometry===0;}catch{}
      if(expectedReceipt!==null)clean=clean&&returned===expectedReceipt&&positiveReceipt(returned)&&sameRetirement(r,m);
      if(clean){m.settled=true;r.state='released';records.delete(r);return {complete:true};}
      report('VIEW_RETIREMENT_UNVERIFIED');return {complete:false,code:expectedReceipt!==null&&returned!==expectedReceipt?'VIEW_RELEASE_RECEIPT_MISMATCH':'VIEW_RETIREMENT_UNVERIFIED'};
    }finally{m.busy=false;}
  }
  function retire(r){
    if(!r||r.state==='retiring'||r.state==='released')return;
    if(accepted===r)accepted=null;if(candidate===r)candidate=null;r.state='retiring';
    const m={view:r.view,busy:false,settled:false};retirements.set(r,m);finishRetirement(r,m);
  }
  function restore(){if(accepted?.view)accepted.view.root.visible=true;}
  function clearCandidate(){const r=candidate;candidate=null;restore();retire(r);}
  function stale(job){return disposed||!job.current();}
  function pump(){
    if(draining||flight||!queued||disposed)return;
    const job=queued;queued=null;if(stale(job)){job.resolve({ok:false,code:'STALE_VIEW'});pump();return;}
    const total=totals(),room={maxTriangles:L.triangles-total.triangles,maxCells:L.derivedCells-total.cells};
    if(records.size>=L.viewRoots||room.maxTriangles<1||room.maxCells<1){job.resolve({ok:false,code:'AGGREGATE_VIEW_BUDGET'});return;}
    const r={state:'acquiring',view:null,triangles:room.maxTriangles,cells:room.maxCells};records.add(r);flight={job,record:r};
    Promise.resolve().then(()=>stale(job)?null:acquire(job.bundle,{...room,current:()=>!stale(job)})).then(view=>{
      r.view=view;
      if(!view){records.delete(r);r.state='released';return {ok:false,code:'STALE_VIEW'};}
      const d=view.diagnostics();if(!Number.isSafeInteger(d.triangles)||d.triangles<0||d.triangles>room.maxTriangles||!Number.isSafeInteger(view.cellCount)||view.cellCount<0||view.cellCount>room.maxCells)fail('AGGREGATE_VIEW_BUDGET','/resources','The public presentation exceeded its retained aggregate allowance.');
      r.triangles=d.triangles;r.cells=view.cellCount;
      if(stale(job)){retire(r);return {ok:false,code:'STALE_VIEW'};}
      r.state='candidate';candidate=r;
      try{attach(view.root,'candidate');}catch{if(candidate===r)candidate=null;retire(r);restore();return {ok:false,code:'VIEW_ATTACH_FAILED'};}
      // add/added observers may synchronously cancel or dispose the owner.
      if(stale(job)||candidate!==r||r.state!=='candidate'){if(r.state!=='released')retire(r);unlink(view.root);restore();return {ok:false,code:'STALE_VIEW'};}
      if(accepted?.view)accepted.view.root.visible=false;
      return {ok:true,record:r};
    }).catch(error=>{if(r.view)retire(r);else {records.delete(r);r.state='released';}restore();const d=error&&typeof error==='object'&&Object.getOwnPropertyDescriptor(error,'code');return {ok:false,code:d&&Object.hasOwn(d,'value')&&typeof d.value==='string'&&/^[A-Z0-9_]{1,80}$/.test(d.value)?d.value:'PRESENTATION_REFUSED'};}).then(result=>{
      flight=null;job.resolve(result);pump();
    });
  }
  const api=Object.freeze({
    acquire(bundle,current){
      if(disposed)return Promise.resolve({ok:false,code:'DISPOSED'});
      clearCandidate();if(queued)queued.resolve({ok:false,code:'STALE_VIEW'});
      return new Promise(resolve=>{queued={bundle,current,resolve};pump();});
    },
    promote(record){
      if(disposed||record!==candidate||record.state!=='candidate')return false;
      const old=accepted;candidate=null;accepted=record;record.state='accepted';record.view.root.visible=true;if(record.view.root.userData)record.view.root.userData.smartTileRole='accepted';
      retire(old);return !disposed&&accepted===record&&record.state==='accepted';
    },
    cancel(){if(queued){const job=queued;queued=null;job.resolve({ok:false,code:'STALE_VIEW'});}clearCandidate();},
    snapshot:metrics,
    get accepted(){return accepted?.view??null;},
    dispose(){
      if(disposed)return;disposed=true;draining=true;
      if(queued){queued.resolve({ok:false,code:'DISPOSED'});queued=null;}
      const owned=[...records];accepted=null;candidate=null;
      // An in-flight promise is fenced first and drained on late delivery.
      for(const r of owned)if(r.view)retire(r);draining=false;
    }
  });
  retirementOwners.set(api,Object.freeze({
    capture(record){
      const m=retirements.get(record);
      if(!m||m.busy||!sameRetirement(record,m)||!m.view||!Object.isFrozen(m.view))fail('VIEW_RETIREMENT_RECORD','/views','Capture only this actual retained retiring record and immutable owned view.');
      const dispose=Object.getOwnPropertyDescriptor(m.view,'dispose'),diagnostics=Object.getOwnPropertyDescriptor(m.view,'diagnostics');
      if(typeof dispose?.value!=='function'||typeof diagnostics?.value!=='function')fail('VIEW_RETIREMENT_SOURCE','/views','Use the actual owned view methods.');
      const handle=Object.freeze({});retryHandles.set(handle,{record,m,dispose:dispose.value,diagnostics:diagnostics.value,used:false});return handle;
    },
    retry(handle,receipt){
      const h=retryHandles.get(handle);
      if(!h||h.used||h.m.busy||!sameRetirement(h.record,h.m))fail('VIEW_RETIREMENT_HANDLE','/views','Use the original unconsumed handle for this same retiring record.');
      if(!positiveReceipt(receipt))return Object.freeze({complete:false,code:'VIEW_RELEASE_RECEIPT_REQUIRED'});
      if(Object.getOwnPropertyDescriptor(h.m.view,'dispose')?.value!==h.dispose||Object.getOwnPropertyDescriptor(h.m.view,'diagnostics')?.value!==h.diagnostics)fail('VIEW_RETIREMENT_SOURCE','/views','The original owned view methods changed.');
      h.used=true;try{return Object.freeze(finishRetirement(h.record,h.m,receipt));}catch{return Object.freeze({complete:false,code:'VIEW_RETIREMENT_UNVERIFIED'});}
    }
  }));
  return api;
}
