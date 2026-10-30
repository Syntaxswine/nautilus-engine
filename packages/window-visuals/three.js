// Optional, host-Three presentation. No core handles, gameplay or own clock.
import {describeWindow,WINDOW_FINISHES,WINDOW_WALLS} from './native/catalog.js';
import {WINDOW_PRESENTATION,projectAcceptedWindowPresentation,plain,fail,scopeKey,contentKey} from './projection.js';
export {WINDOW_PRESENTATION,projectAcceptedWindowPresentation};
export const WINDOW_VISUAL_CARD=Object.freeze({id:'farmyard-native-window-presentation-v1',status:'candidate; root registration/review pending',guide:'packages/window-visuals/README.md',source:'packages/window-visuals/source.json',audio:'deferred'});
const nativeModules=()=>Promise.all([import('./native/geometry.js'),import('./native/shatter.js')]).then(([a,b])=>({...a,...b}));
const finite=n=>typeof n==='number'&&Number.isFinite(n),integer=n=>Number.isSafeInteger(n)&&n>=0;
const text=s=>typeof s==='string'&&s.length>0;
const hash=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const canonical=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function boundsEqual(a,b){return a?.min?.length===3&&a?.max?.length===3&&['min','max'].every(k=>a[k].every((v,i)=>finite(v)&&Math.abs(v-b[k][i])<1e-10));}
function checkDefinition(d,s){
  if(d?.sourceCommit!==WINDOW_PRESENTATION.sourceCommit||d.version!==s.version||d.id!==s.id||d.width!==s.bounds.max[0]-s.bounds.min[0]||d.height!==s.height||!same(d.joins,s.joins)||!boundsEqual(d.bounds,s.bounds))fail('NATIVE_GEOMETRY_MISMATCH','Native definition bounds/version/joins differ.');
  for(const key of ['panes','solids'])if(!Array.isArray(d[key])||d[key].length!==s[key].length||d[key].some((p,i)=>p.id!==s[key][i].id||(key==='solids'&&p.role!==s[key][i].role)||!boundsEqual({min:p.min,max:p.max},s[key][i].bounds)))fail('NATIVE_GEOMETRY_MISMATCH','Native member IDs/bounds differ.');
}
function checked(input){
  const p=plain(input),s=p.scope;
  if(p.kind!==WINDOW_PRESENTATION.kind||p.version!==1||s?.profileId!==WINDOW_PRESENTATION.profileId||!['sceneId','stateId','contentEpoch'].every(k=>text(s[k]))||!hash(s.contentDigest)||!hash(p.geometryDigest)||!integer(p.revision)||p.revision>128||!integer(p.geometryRevision)||!Array.isArray(p.windows)||p.windows.length>1024)fail('UNSUPPORTED_PROJECTION','Use plain accepted window presentation v1.');
  const ids=new Set(),visuals=new Set(),bindings=new Set();
  for(const w of p.windows){
    const a=w.placement;
    if(!a||!text(a.id)||ids.has(a.id)||!finite(a.x)||!finite(a.y)||(a.z??0)!==0||![0,90,180,270].includes(a.rotation??0)||!text(w.engineInstanceId)||bindings.has(w.engineInstanceId)||!hash(w.definitionDigest)||!Array.isArray(w.broken)||new Set(w.broken).size!==w.broken.length||!Array.isArray(w.panes))fail('INVALID_WINDOW_PLACEMENT','Use unique ground-anchored quarter-turn native placements.');
    if(!WINDOW_FINISHES.some(f=>f.id===(a.finish??'steel'))||!WINDOW_WALLS.includes(a.wall??'brick'))fail('INVALID_WINDOW_FINISH','Choose a native finish and wall material.');
    const spec=describeWindow(a.definitionId,a.joins,a.dimensions);checkDefinition(w.definition,spec);
    if(!Number.isFinite(Math.fround(spec.height)))fail('UNSUPPORTED_VISUAL_DIMENSIONS','Native buffer coordinates must remain finite Float32 metres.');
    if(w.panes.length!==spec.panes.length||w.broken.some(id=>!spec.panes.some(q=>q.id===id)))fail('UNKNOWN_PANE','Masks must name exact distinct native panes.');
    for(const [i,pane]of w.panes.entries()){
      if(pane.paneId!==spec.panes[i].id||!text(pane.visualId)||visuals.has(pane.visualId))fail('UNKNOWN_PANE','Bindings must name exact unique native panes.');
      visuals.add(pane.visualId);
    }
    ids.add(a.id);bindings.add(w.engineInstanceId);
  }
  const r=p.latestReceipt;
  if((p.revision===0)!==(r===null)||r&&(!text(r.id)||r.revision!==p.revision||!['pane-broken','solid-hit'].includes(r.outcome)||!ids.has(r.placementId)||!['bullet','flame'].includes(r.cause)||![1,-1].includes(r.direction)||!['x','y','h'].every(k=>finite(r.point?.[k]))))fail('INVALID_RECEIPT_OBSERVATION','Use the current complete receipt identity.');
  if(r?.outcome==='pane-broken'&&!p.windows.find(w=>w.placement.id===r.placementId).broken.includes(r.paneId))fail('INVALID_RECEIPT_OBSERVATION','A broken receipt must match the accepted mask.');
  return p;
}
function cueFor(p,observation){
  if(observation===undefined)return null;
  const o=plain(observation),r=p.latestReceipt;
  if(!r||o.receiptId!==r.id||!Array.isArray(o.effects)||o.effects.length!==1||r.outcome!=='pane-broken')fail('INVALID_RECEIPT_OBSERVATION','Present only the latest acknowledged glass receipt.');
  const expected={type:'window-pane-broken',receiptId:r.id,placementId:r.placementId,paneId:r.paneId,point:r.point,direction:r.direction,cause:r.cause},e=o.effects[0];
  if(Object.keys(e).length!==Object.keys(expected).length||Object.keys(expected).some(k=>!same(e[k],expected[k])))fail('INVALID_RECEIPT_OBSERVATION','Effect fields differ from the accepted receipt.');
  return expected;
}
function seedFor(id){let seed=2166136261;for(let i=0;i<id.length;i++)seed=Math.imul(seed^id.charCodeAt(i),16777619);return seed>>>0;}
export function createFarmyardWindowPresentation({THREE:T,scene,loadNative=nativeModules,maxEffects=6,maxShards=210}={}){
  if(!T?.Group||!T?.Mesh||!(scene instanceof T.Object3D)||typeof loadNative!=='function')fail('MISSING_PRESENTATION_HOST','Borrow one Three namespace, its scene and a native-module loader.');
  if(!Number.isInteger(maxEffects)||maxEffects<0||maxEffects>6||!Number.isInteger(maxShards)||maxShards<0||maxShards>210)fail('INVALID_EFFECT_BUDGET','Use at most six effects and 210 shard triangles.');
  const root=new T.Group();root.name='nautilus-window-presentation';let disposed=false,generation=0,current=null,time=-Infinity;const effects=[];
  const live=()=>{if(disposed)fail('DISPOSED','Window presentation is disposed.');};
  const retireEffects=()=>{for(const e of effects)e.handle.dispose();effects.length=0;};
  const retire=b=>{if(!b)return;b.group.removeFromParent();b.library.dispose();b.models.clear();};
  const mask=(b,p)=>{for(const w of p.windows){const m=b.models.get(w.placement.id);for(const pane of w.panes)m.setPaneVisible(pane.paneId,!w.broken.includes(pane.paneId));}};
  function sample(hostSeconds){
    live();if(!finite(hostSeconds)||hostSeconds<time)fail('INVALID_HOST_TIME','Supply monotonic host seconds; quiet prepare permits a new time origin.');
    time=hostSeconds;
    for(let i=effects.length-1;i>=0;i--){const e=effects[i],age=hostSeconds-e.started;if(age>=e.handle.duration){e.handle.dispose();effects.splice(i,1);}else e.handle.sample(age);}
    return effects.length;
  }
  async function prepare(input,{signal}={}){
    live();const ticket=++generation,p=checked(input);let stage=null;
    const fence=()=>{live();if(ticket!==generation||signal?.aborted)fail('PREPARATION_CANCELLED','A newer preparation, accepted update or cancellation retired this preparation.');};
    try{
      fence();const modules=await loadNative();fence();
      if(typeof modules?.createWindowLibrary!=='function'||typeof modules?.createWindowShatter!=='function')fail('MISSING_NATIVE_FACTORY','The visual native factories are unavailable.');
      const library=modules.createWindowLibrary(T);stage={group:new T.Group(),library,models:new Map(),modules,projection:p,key:scopeKey(p),content:contentKey(p)};
      for(const w of p.windows){fence();const a=w.placement,m=library.build(a.definitionId,{joins:a.joins,dimensions:a.dimensions,rotation:a.rotation,finish:a.finish,wall:a.wall});stage.models.set(a.id,m);m.root.name=w.engineInstanceId;m.root.position.set(a.x,0,a.y);m.root.userData={...m.root.userData,placementId:a.id,engineInstanceId:w.engineInstanceId,definitionDigest:w.definitionDigest};for(const pane of w.panes){const v=m.panes.get(pane.paneId);v.root.name=pane.visualId;v.root.userData={...v.root.userData,visualId:pane.visualId,placementId:a.id};}stage.group.add(m.root);}
      mask(stage,p);stage.group.updateMatrixWorld(true);fence();
      // Commit presentation only after complete successful staging. No host mutation.
      retireEffects();const old=current;stage.baseline=Math.max(p.revision,old?.key===stage.key?old.baseline:0);root.add(stage.group);current=stage;stage=null;if(root.parent!==scene)scene.add(root);retire(old);time=-Infinity;
      return diagnostics();
    }catch(error){retire(stage);throw error;}
  }
  function update(input,{observation,timeSeconds}={}){
    live();if(!current)fail('NOT_PREPARED','Prepare an accepted scene first.');
    const p=checked(input),cue=cueFor(p,observation),old=current.projection;
    if(scopeKey(p)!==current.key||contentKey(p)!==current.content)fail('CONTENT_CHANGED','Quietly prepare the complete new accepted scope/content before replacing the scene.');
    if(p.revision<old.revision||p.geometryRevision<old.geometryRevision)fail('STALE_PRESENTATION','Old observations cannot restore panes; use quiet prepare for reload.');
    if(p.revision===old.revision&&(p.geometryDigest!==old.geometryDigest||!same(p.windows,old.windows)))fail('PROJECTION_MISMATCH','One accepted revision must have one geometry and mask.');
    for(const w of p.windows){const previous=old.windows.find(a=>a.placement.id===w.placement.id);if(previous.broken.some(id=>!w.broken.includes(id)))fail('STALE_PRESENTATION','Forward updates cannot repair accepted broken panes.');}
    if(timeSeconds!==undefined&&(!finite(timeSeconds)||timeSeconds<time))fail('INVALID_HOST_TIME','Supply monotonic host seconds.');
    const fresh=cue&&p.revision>current.baseline;
    if(fresh&&timeSeconds===undefined)fail('MISSING_HOST_TIME','A fresh acknowledged effect needs host seconds.');
    let effect=null;
    // Allocation failure leaves old accepted presentation untouched. Never delay
    // the mask waiting for audio or an asynchronous cosmetic preparation.
    if(fresh&&maxEffects>0&&maxShards>=4){
      const w=p.windows.find(w=>w.placement.id===cue.placementId),m=current.models.get(cue.placementId),bounds=m.panes.get(cue.paneId).bounds;
      const handle=current.modules.createWindowShatter(T,{kind:w.placement.definitionId,seed:seedFor(cue.receiptId),direction:cue.direction,bounds,maxShards:Math.min(70,maxShards),floorHeight:0,includePane:false});
      try{handle.group.position.copy(m.root.position);handle.group.quaternion.copy(m.root.quaternion);handle.sample(0);effect={handle,started:timeSeconds,receiptId:cue.receiptId,placementId:cue.placementId};}catch(error){handle.dispose();throw error;}
    }
    ++generation;mask(current,p);current.projection=p;current.baseline=Math.max(current.baseline,p.revision);
    if(effect){while(effects.length&&(effects.length>=maxEffects||effects.reduce((n,e)=>n+e.handle.pieces.length,0)+effect.handle.pieces.length>maxShards))effects.shift().handle.dispose();effects.push(effect);current.group.add(effect.handle.group);}
    if(timeSeconds!==undefined)sample(timeSeconds);
    return diagnostics();
  }
  function diagnostics(){return {disposed,prepared:!!current,generation,scope:current?plain(current.projection.scope):null,revision:current?.projection.revision??null,windows:current?.models.size??0,pool:current?.library.stats()??null,activeEffects:effects.length,shards:effects.reduce((n,e)=>n+e.handle.pieces.length,0),receiptIds:effects.map(e=>e.receiptId),audio:'deferred'};}
  function dispose(){if(disposed)return;disposed=true;++generation;retireEffects();retire(current);current=null;root.removeFromParent();root.clear();}
  return {root,prepare,update,sample,diagnostics,dispose};
}
