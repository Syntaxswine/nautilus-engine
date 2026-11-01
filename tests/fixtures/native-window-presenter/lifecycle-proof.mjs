import assert from 'node:assert/strict';
import {compileCase,planRuntime,makePool} from './proof.mjs';

function fixture({W,F,T,V},two=false){
  const pool=makePool(T,V),faults=[],nodes=new Set(),counts=new Map();let current=true;
  const presenter=V.createNativeWindowPresenter({THREE:T,materials:pool.pool,isCurrent:()=>current});
  const initial=compileCase(W,F);let prepared=planRuntime(V,W,F,initial);
  if(two){
    const p=structuredClone(initial.projection),next={...p.document.placements[0],id:'native-neighbour',x:p.document.placements[0].x+5};
    p.document.placements.push(next);p.document.bindings.push({placementId:next.id,engineInstanceId:'native-neighbour-view'});
    const facts=p.edgeFacts.concat(p.edgeFacts.map(f=>{const [a,x,y]=f.edge.split(':');return {...f,edge:`${a}:${Number(x)+5}:${y}`};}));
    const geometry=W.compileWindowPlacements(p.document,{definitions:F.FARMYARD_WINDOW_DEFINITIONS,world:p.world,edgeFacts:facts}),state=W.createWindowState(geometry,{id:'native-state',contentEpoch:'native-epoch',broken:{}});
    prepared=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,state,{publication:{receiptId:'acknowledged-two-native-windows',geometry:W.inspectWindowGeometry(geometry)}});
  }
  function capture(node){
    node.traverse(n=>{nodes.add(n);if(n.geometry&&!counts.has(n.geometry)){counts.set(n.geometry,0);n.geometry.addEventListener('dispose',()=>counts.set(n.geometry,counts.get(n.geometry)+1));}});
    return node;
  }
  function view(handle){const v=presenter.inspect(handle);capture(v.root);const localNodes=[];v.root.traverse(n=>localNodes.push(n));return {handle,...v,nodes:localNodes,geometries:[...new Set(localNodes.filter(n=>n.geometry).map(n=>n.geometry))]};}
  const stage=()=>view(presenter.stage(prepared));
  function on(target,type,listener){target.addEventListener(type,listener);faults.push(()=>target.removeEventListener(type,listener));}
  function prototypeEvents(proto,listeners){const previous=Object.getOwnPropertyDescriptor(proto,'_listeners');Object.defineProperty(proto,'_listeners',{configurable:true,writable:true,value:listeners});faults.push(()=>{if(previous)Object.defineProperty(proto,'_listeners',previous);else delete proto._listeners;});}
  function gone(v){assert.equal(presenter.inspect(v.handle)===null,true,'Retired stage remains registered.');for(const n of v.nodes){assert.equal(n.parent===null,true,'Retired node remains parented: '+n.name);assert.equal(n.children.length,0,'Retired node retains children: '+n.name);}for(const g of v.geometries)assert.equal(counts.get(g),1,'Each owned geometry receives exactly one native dispose call.');}
  function kept(v){assert.equal(presenter.inspect()?.root===v.root,true,'Accepted old view changed.');assert.equal(v.root.parent===presenter.root,true,'Accepted old root detached.');assert.equal(presenter.root.children.length,1,'Exactly one accepted root must remain.');assert.equal(presenter.root.children[0]===v.root,true);for(const g of v.geometries)assert.equal(counts.get(g),0);assert.equal(pool.counters.disposed,0);}
  function close(){
    for(const undo of faults.reverse())undo();
    // Baseline failures may strand ownership behind its retired flag. This
    // fixture owns only these disposable CPU geometries; finish them explicitly
    // after recording/asserting the failure, without masking the observed state.
    try{presenter.dispose();}catch{}
    for(const n of [...nodes].reverse()){n.removeFromParent();for(const child of [...n.children])n.remove(child);}
    for(const [g,count]of counts)if(count===0)g.dispose();
    assert.equal(pool.counters.disposed,0);pool.dispose();
  }
  return {W,F,T,V,presenter,pool,prepared,stage,view,capture,on,prototypeEvents,gone,kept,counts,nodes,close,setCurrent:value=>{current=value;}};
}
const cleanupFailure=action=>assert.throws(action,e=>e instanceof AggregateError&&e.code==='WINDOW_VIEW_LIFECYCLE_FAILED');
const cases=[
  {name:'added listener throws: reject and detach candidate, preserve accepted view',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage(),error=Error('candidate added listener');f.on(next.root,'added',()=>{throw error;});assert.throws(()=>f.presenter.activate(next.handle));f.kept(old);f.gone(next);assert.equal(f.presenter.stats().stages,1);}},
  {name:'added listener disposes presenter: activation never reports success',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage();f.on(next.root,'added',()=>f.presenter.dispose());assert.equal(f.presenter.activate(next.handle),false);assert.deepEqual(f.presenter.stats(),{retired:true,stages:0,instances:0,geometries:0});assert.equal(f.presenter.root.children.length,0);f.gone(old);f.gone(next);}},
  {name:'geometry dispose listener throws: visit all resources, finish records, repeat quietly',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage();f.on(old.geometries[0],'dispose',()=>{throw Error('first geometry dispose');});cleanupFailure(()=>f.presenter.dispose());assert.deepEqual(f.presenter.stats(),{retired:true,stages:0,instances:0,geometries:0});f.gone(old);f.gone(next);f.presenter.dispose();f.gone(old);}},
  {name:'abort removed/dispose listeners throw or reenter: pending ownership always drains',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage();let repeated;
    f.on(next.root.children[0],'removed',()=>{repeated=f.presenter.abort(next.handle);throw Error('removed during abort');});f.on(next.geometries[0],'dispose',()=>{assert.throws(()=>f.presenter.stage(f.prepared),e=>e.code==='REENTRANT_LIFECYCLE');throw Error('dispose during abort');});cleanupFailure(()=>f.presenter.abort(next.handle));assert.equal(repeated,false);assert.equal(f.presenter.abort(next.handle),false);f.gone(next);f.kept(old);
  }},
  {name:'removeInstance removed/dispose faults preserve neighbour geometry and borrowed pool',two:true,run(f){const old=f.stage();f.presenter.activate(old.handle);const [id,instance]=[...old.instances][0],neighbour=old.instances.get('native-neighbour'),ownNodes=[];instance.root.traverse(n=>ownNodes.push(n));const owned=[...new Set(ownNodes.filter(n=>n.geometry).map(n=>n.geometry))];let nested;
    f.on(instance.root,'removed',()=>{nested=f.presenter.abort(old.handle);throw Error('instance removed');});f.on(owned[0],'dispose',()=>{assert.throws(()=>f.presenter.removeInstance('native-neighbour'),e=>e.code==='REENTRANT_LIFECYCLE');throw Error('instance geometry dispose');});cleanupFailure(()=>f.presenter.removeInstance(id));assert.equal(nested,false);assert.equal(f.presenter.removeInstance(id),false);assert.equal(f.presenter.inspect().instances.size,1);assert.equal(f.presenter.inspect().instances.get('native-neighbour').root,neighbour.root);for(const n of ownNodes){assert.equal(n.parent,null);assert.equal(n.children.length,0);}for(const g of owned)assert.equal(f.counts.get(g),1);neighbour.root.traverse(n=>{if(n.geometry)assert.equal(f.counts.get(n.geometry),0);});assert.equal(f.pool.counters.disposed,0);
  }},
  {name:'removeInstance geometry disposal can request whole-presenter disposal without recursion',two:true,run(f){const old=f.stage();f.presenter.activate(old.handle);const id=[...old.instances.keys()][0];f.on(old.geometries[0],'dispose',()=>f.presenter.dispose());assert.equal(f.presenter.removeInstance(id),true);assert.equal(f.presenter.stats().retired,true);assert.equal(f.presenter.stats().stages,0);f.gone(old);f.presenter.dispose();}},
  {name:'actual Three acquisition event and rollback disposal faults leave no partial parents/resources',run(f){const old=f.stage();f.presenter.activate(old.handle);const partialNodes=new Set(),partialGeometries=new Set();let faultGeometry;
    const added=function(){let top=this;while(top.parent&&top.parent!==f.presenter.root)top=top.parent;f.capture(top);top.traverse(n=>{partialNodes.add(n);if(n.geometry)partialGeometries.add(n.geometry);});if(!faultGeometry&&this.geometry){faultGeometry=this.geometry;f.on(faultGeometry,'dispose',()=>{f.presenter.dispose();throw Error('rollback geometry listener');});}if(this.name==='glass:r0c1')throw Error('actual native added acquisition failure');};
    f.prototypeEvents(f.T.Mesh.prototype,{added:[added]});f.prototypeEvents(f.T.LineSegments.prototype,{added:[function(){f.capture(this);partialNodes.add(this);partialGeometries.add(this.geometry);} ]});cleanupFailure(()=>f.presenter.stage(f.prepared));assert.ok(partialGeometries.size>=2);for(const n of partialNodes){assert.equal(n.parent,null);assert.equal(n.children.length,0);}for(const g of partialGeometries)assert.equal(f.counts.get(g),1);assert.equal(f.presenter.stats().retired,true);f.gone(old);assert.equal(f.presenter.stats().geometries,0);
  }},
  {name:'added/removed callbacks changing the current publication roll back to the old view',run(f){const old=f.stage();f.presenter.activate(old.handle);let next=f.stage();f.on(next.root,'added',()=>f.setCurrent(false));assert.equal(f.presenter.activate(next.handle),false);f.kept(old);f.gone(next);f.setCurrent(true);next=f.stage();f.on(old.root,'removed',()=>f.setCurrent(false));assert.equal(f.presenter.activate(next.handle),false);f.kept(old);f.gone(next);}},
  {name:'added callback can cancel only its pending candidate',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage();let cancelled;f.on(next.root,'added',()=>{cancelled=f.presenter.abort(next.handle);});assert.equal(f.presenter.activate(next.handle),false);assert.equal(cancelled,true);f.kept(old);f.gone(next);}},
  {name:'ordinary mutators refuse reentry from actual added/removed/dispose events',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage();let refused=0;
    const attempt=()=>{for(const action of [()=>f.presenter.stage(f.prepared),()=>f.presenter.activate(old.handle),()=>f.presenter.removeInstance('missing'),()=>f.presenter.setResident([])]){assert.throws(action,e=>e.code==='REENTRANT_LIFECYCLE');refused++;}};
    f.on(next.root,'added',attempt);f.on(old.root,'removed',attempt);f.on(old.geometries[0],'dispose',attempt);assert.equal(f.presenter.activate(next.handle),true);assert.equal(refused,12);f.gone(old);f.kept(next);
  }},
  {name:'retirement callbacks can stale a committed replacement but cannot return activation success',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage();f.on(old.geometries[0],'dispose',()=>f.setCurrent(false));assert.equal(f.presenter.activate(next.handle),false);f.gone(old);f.gone(next);assert.equal(f.presenter.inspect(),null);assert.equal(f.presenter.root.children.length,0);}},
  {name:'removed/dispose reparenting cannot strand owned nodes or remove borrowed neighbours',run(f){const host=new f.T.Group(),borrowed=new f.T.Group();host.add(borrowed,f.presenter.root);const old=f.stage();f.presenter.activate(old.handle);const next=f.stage(),node=next.root.children[0];
    f.on(node,'removed',()=>{host.add(node);throw Error('removed reparent');});f.on(next.geometries[0],'dispose',()=>{host.add(next.nodes.at(-1));throw Error('dispose reparent');});cleanupFailure(()=>f.presenter.abort(next.handle));f.gone(next);assert.deepEqual(host.children,[borrowed,f.presenter.root]);f.kept(old);
    f.on(f.presenter.root,'removed',()=>{host.add(f.presenter.root);f.presenter.dispose();throw Error('presenter root reparent');});cleanupFailure(()=>f.presenter.dispose());assert.deepEqual(host.children,[borrowed]);assert.equal(f.presenter.root.parent,null);assert.equal(f.presenter.root.children.length,0);f.gone(old);f.presenter.dispose();
  }},
  {name:'deferred unrelated cancellation is settled before replacing accepted geometry',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage(),other=f.stage();f.on(next.root,'added',()=>f.presenter.abort(other.handle));f.on(other.geometries[0],'dispose',()=>f.setCurrent(false));assert.equal(f.presenter.activate(next.handle),false);f.gone(next);f.gone(other);f.kept(old);}}
  ,{name:'removed listener failure during activation restores the still-owned accepted view',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage();f.on(old.root,'removed',()=>{throw Error('old root removal refused');});assert.throws(()=>f.presenter.activate(next.handle));f.gone(next);f.kept(old);}}
  ,{name:'old-geometry notification failure is reported after a consistent replacement commit',run(f){const old=f.stage();f.presenter.activate(old.handle);const next=f.stage();f.on(old.geometries[0],'dispose',()=>{throw Error('old geometry retirement refused');});cleanupFailure(()=>f.presenter.activate(next.handle));f.gone(old);f.kept(next);assert.equal(f.presenter.stats().stages,1);}}
  ,{name:'acquisition and rollback observer failures preserve an accepted view without global disposal',run(f){const old=f.stage();f.presenter.activate(old.handle);const partialNodes=new Set(),partialGeometries=new Set();let fault;
    const added=function(){let top=this;while(top.parent&&top.parent!==f.presenter.root)top=top.parent;f.capture(top);top.traverse(n=>{partialNodes.add(n);if(n.geometry)partialGeometries.add(n.geometry);});if(!fault&&this.geometry){fault=this.geometry;f.on(fault,'dispose',()=>{throw Error('partial disposal notification');});}if(this.name==='glass:r0c1')throw Error('partial actual Three attachment');};
    f.prototypeEvents(f.T.Mesh.prototype,{added:[added]});f.prototypeEvents(f.T.LineSegments.prototype,{added:[function(){f.capture(this);partialNodes.add(this);partialGeometries.add(this.geometry);}]});cleanupFailure(()=>f.presenter.stage(f.prepared));assert.ok(partialGeometries.size>=2);for(const n of partialNodes){assert.equal(n.parent===null,true);assert.equal(n.children.length,0);}for(const g of partialGeometries)assert.equal(f.counts.get(g),1);f.kept(old);assert.equal(f.presenter.stats().stages,1);
  }}
  ,{name:'reverse-order cancellation chains drain all three staged records once',run(f){const first=f.stage(),second=f.stage(),third=f.stage();f.on(third.geometries[0],'dispose',()=>f.presenter.abort(second.handle));f.on(second.geometries[0],'dispose',()=>f.presenter.abort(first.handle));assert.equal(f.presenter.abort(third.handle),true);for(const v of [first,second,third])f.gone(v);assert.equal(f.presenter.stats().stages,0);assert.equal(f.presenter.stats().geometries,0);}}
  ,{name:'bounded error aggregation still attempts every owned resource and repairs every parent',run(f){const views=[f.stage(),f.stage(),f.stage()];for(const v of views){for(const node of v.nodes)f.on(node,'removed',()=>{throw Error('removed observer');});for(const geometry of v.geometries)f.on(geometry,'dispose',()=>{throw Error('dispose observer');});}let failure;try{f.presenter.dispose();}catch(error){failure=error;}assert.ok(failure instanceof AggregateError);assert.equal(failure.code,'WINDOW_VIEW_LIFECYCLE_FAILED');assert.equal(failure.errors.length,64);assert.ok(failure.failureCount>64);for(const v of views)f.gone(v);assert.equal(f.presenter.stats().stages,0);f.presenter.dispose();}}
];

export const lifecycleCaseNames=cases.map(c=>c.name);
export function runLifecycleCase(deps,index){const entry=cases[index],f=fixture(deps,entry.two);try{entry.run(f);assert.equal(f.pool.counters.disposed,0);return {name:entry.name,status:'pass'};}finally{f.close();}}
export function runLifecycleProof(deps,{baseline=false}={}){
  const results=cases.map((c,i)=>{try{return runLifecycleCase(deps,i);}catch(error){if(!baseline)throw error;return {name:c.name,status:'fail',reason:error.message.slice(0,1024)};}});
  return {status:results.every(r=>r.status==='pass')?'pass':'fail',actualThreeRevision:deps.T.REVISION,actualPublicCore:true,cases:results.length,results,borrowedPoolSurvival:true};
}
