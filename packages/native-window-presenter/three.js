import {slots,api,idList,fail} from './data.js';
import {readPrepared} from './prepare.js';
import {buildWindow,buildLegacyWall} from './geometry.js';
import {createCleanup} from './cleanup.js';
export {prepareRuntimeWindowView,prepareAuthoringWindowView,inspectPreparedWindowView} from './prepare.js';
export {WINDOW_PAINT_RECIPES,nativeWindowSurfacePixels} from './paint.js';
export {WindowViewError} from './data.js';

function borrowedMaterials(input){
  const m=slots(input,['glass','shine','steel','sage','ivory','walls','legacyWall']);
  for(const name of ['steel','sage','ivory'])m[name]=slots(m[name],['frame','edge']);m.walls=slots(m.walls,['brick','concrete','corrugated']);
  const resources=[m.glass,m.shine,m.legacyWall,...['steel','sage','ivory'].flatMap(n=>[m[n].frame,m[n].edge]),...Object.values(m.walls)];
  if(resources.some(r=>r===null||typeof r!=='object'||Object.getOwnPropertyDescriptor(r,'isMaterial')?.value!==true))fail('MISSING_MATERIAL','Supply actual borrowed Three material objects.');return m;
}
export function createNativeWindowPresenter(input){
  const options=slots(input,['THREE','materials','isCurrent']),T=options.THREE;
  api(T,['Group','BoxGeometry','Mesh','Vector3','BufferGeometry','LineSegments']);
  const materials=borrowedMaterials(options.materials),isCurrent=options.isCurrent;
  if(typeof isCurrent!=='function')fail('MISSING_CURRENT_FENCE','Bind the actual host publication/authoring-ticket current check.');
  const root=new T.Group();root.name='native-window-presenter';
  const stages=new Map();let nextTicket=0,retired=false,rootReleased=false,active=null,operation=null;
  const live=()=>{if(retired)fail('DISPOSED','Presenter is retired.');};
  const valid=record=>!retired&&!record.cancelled&&record.phase!=='retired'&&stages.get(record.handle)===record;
  const attached=record=>record.root.parent===root&&root.children.includes(record.root);
  const current=record=>isCurrent(structuredClone(record.plan.scope))===true;

  function retire(record,cleanup){
    if(!record||record.phase==='retired')return;
    const nodes=[...record.nodes],geometries=[...record.owned];
    // Unpublish and transfer every resource before invoking ANY Three listener.
    // The cleanup snapshot is always drained, even if a listener re-enters.
    record.phase='retired';record.cancelled=true;
    stages.delete(record.handle);if(active===record)active=null;
    record.nodes.clear();record.owned.clear();
    for(const instance of record.instances.values()){instance.nodes.clear();instance.owned.clear();instance.panes.clear();instance.solids.clear();}
    record.instances.clear();cleanup.release(nodes,geometries);
  }
  function drain(cleanup){
    // No new record can enter during a mutation; each round retires at least
    // one of the existing three records. Later callbacks may cancel earlier ones.
    for(let round=0;round<3;round++){
      const targets=[...stages.values()].filter(r=>r.cancelled||retired);
      if(!targets.length)break;
      for(const record of targets)retire(record,cleanup);
    }
    if(retired&&!rootReleased){rootReleased=true;cleanup.release([root]);}
  }
  function run(name,task,{allowRetired=false}={}){
    if(operation)fail('REENTRANT_LIFECYCLE','Nested stage, activate, removeInstance and setResident are refused.');
    if(!allowRetired)live();
    const cleanup=createCleanup(name),owner={name,cleanup,restorePrevious:null};operation=owner;
    let result,caught=false,primary;
    try{result=task(cleanup);}catch(error){caught=true;primary=error;}
    try{
      drain(cleanup);cleanup.repair();
      if(owner.restorePrevious&&valid(owner.restorePrevious))cleanup.restore(owner.restorePrevious.root,root);
    }finally{operation=null;}
    return cleanup.finish(result,caught,primary);
  }
  function checkpoint(record){if(!valid(record))fail('CANCELLED_VIEW','Acquisition was cancelled or its presenter retired.');}
  function ownership(record,instance=null){return {
    add(geometry){record.owned.add(geometry);instance?.owned.add(geometry);checkpoint(record);},
    node(node){record.nodes.add(node);instance?.nodes.add(node);checkpoint(record);},
    check(){checkpoint(record);}
  };}
  function ready(record,cleanup,requireAttachment=true){
    // A fence can request cancellation of another candidate. Settle its native
    // callbacks, then re-read the fence. Three records bound this to four rounds.
    for(let round=0;round<4;round++){
      drain(cleanup);
      if(!valid(record)||requireAttachment&&!attached(record))return false;
      if(!current(record)||!valid(record)||requireAttachment&&!attached(record))return false;
      if(![...stages.values()].some(r=>r.cancelled))return true;
    }
    fail('LIFECYCLE_LIMIT','Cancellation did not settle within the bounded stage set.');
  }
  function stage(preparation){return run('stage',cleanup=>{
    const plan=readPrepared(preparation);
    if(isCurrent(structuredClone(plan.scope))!==true)fail('STALE_VIEW','Preparation no longer matches the current host publication/ticket.');
    live();if(stages.size>=3)fail('STAGE_LIMIT','Retire/abort a view before keeping more than one active plus two candidates.');
    const handle=Object.freeze({kind:'staged-native-window-view',version:1,ticket:++nextTicket});
    const record={handle,plan,root:null,owned:new Set(),nodes:new Set(),instances:new Map(),cancelled:false,phase:'building'};
    stages.set(handle,record);const owner=ownership(record);
    try{
      record.root=new T.Group();owner.node(record.root);record.root.name='window-view:'+plan.projection.sceneId;
      const p=plan.projection;
      for(let i=0;i<p.document.placements.length;i++){
        const placement=p.document.placements[i],resources={owned:new Set(),nodes:new Set()};
        const instance=Object.assign(buildWindow(T,materials,placement,p.resolvedDefinitions[i],p.content[i],p.sceneId,ownership(record,resources)),resources);
        const broken=Object.hasOwn(p.document.observedBroken,placement.id)?p.document.observedBroken[placement.id]:[];
        for(const [id,pane]of instance.panes){pane.broken=broken.includes(id);pane.root.visible=!pane.broken;}
        record.instances.set(placement.id,instance);record.root.add(instance.root);checkpoint(record);
      }
      for(const {clipped}of plan.legacyWalls)if(clipped){record.root.add(buildLegacyWall(T,materials.legacyWall,clipped,owner));checkpoint(record);}
      if(!ready(record,cleanup,false))fail('STALE_VIEW','View became stale or cancelled during acquisition.');
      if(cleanup.hasErrors()){retire(record,cleanup);return;}
      record.phase='staged';return handle;
    }catch(error){record.cancelled=true;retire(record,cleanup);throw error;}
  });}
  function restore(previous,cleanup){
    if(!previous||!valid(previous))return;
    operation.restorePrevious=previous;
    if(!attached(previous))cleanup.attempt(()=>root.add(previous.root));
    if(valid(previous))cleanup.restore(previous.root,root);
  }
  function activate(handle){return run('activate',cleanup=>{
    const record=stages.get(handle);if(!record||record.phase==='retired')fail('UNKNOWN_STAGE','Use a live stage from this presenter.');
    const previous=active;
    if(previous===record)return ready(record,cleanup);
    try{
      if(!valid(record)||!current(record)||!valid(record)){retire(record,cleanup);return false;}
      record.phase='activating';record.root.visible=false;
      root.add(record.root);
      if(!ready(record,cleanup)||cleanup.hasErrors()){retire(record,cleanup);restore(previous,cleanup);return false;}
      if(previous?.root.parent===root)root.remove(previous.root);
      if(!ready(record,cleanup)||cleanup.hasErrors()){retire(record,cleanup);restore(previous,cleanup);return false;}
    }catch(error){retire(record,cleanup);restore(previous,cleanup);throw error;}
    // Commit only after attachment/detachment listeners and fences pass. Old
    // resource errors are then reported with the new view consistently active;
    // disposed old geometry is never resurrected to hide a notification error.
    active=record;record.phase='active';record.root.visible=true;
    if(previous)retire(previous,cleanup);
    try{if(ready(record,cleanup))return true;}catch(error){retire(record,cleanup);throw error;}
    retire(record,cleanup);return false;
  });}
  function abort(handle){
    const record=stages.get(handle);if(!record||record===active||record.cancelled)return false;
    record.cancelled=true;
    if(operation)return true;
    return run('abort',cleanup=>{retire(record,cleanup);return true;},{allowRetired:true});
  }
  function setResident(input){return run('setResident',()=>{
    const ids=idList(input);if(!active)fail('NO_ACTIVE_VIEW','Activate a current view first.');
    const allowed=new Set(ids);if(ids.some(id=>!active.instances.has(id)))fail('UNKNOWN_PLACEMENT','Residency must name current complete placement IDs.');
    for(const [id,instance]of active.instances)instance.root.visible=allowed.has(id);
  });}
  function removeInstance(id){return run('removeInstance',cleanup=>{
    if(typeof id!=='string'||id.length>96)fail('INVALID_ID','Use a complete placement ID.');
    const record=active,instance=record?.instances.get(id);if(!instance)return false;
    const nodes=[...instance.nodes],geometries=[...instance.owned];record.instances.delete(id);
    for(const node of nodes)record.nodes.delete(node);for(const g of geometries)record.owned.delete(g);
    instance.nodes.clear();instance.owned.clear();instance.panes.clear();instance.solids.clear();
    cleanup.release(nodes,geometries);return true;
  });}
  function inspect(handle=active?.handle){
    const record=stages.get(handle);if(!record)return null;
    return {scope:structuredClone(record.plan.scope),root:record.root,instances:new Map([...record.instances].map(([id,v])=>[id,{root:v.root,panes:new Map(v.panes),solids:new Map(v.solids)}])),legacyWalls:structuredClone(record.plan.legacyWalls),ownedGeometryCount:record.owned.size,active:record===active};
  }
  function dispose(){
    if(retired)return;retired=true;active=null;
    for(const record of stages.values())record.cancelled=true;
    // During native dispatch, latch intent only. The owning operation drains
    // resources before returning; a nested destructor never corrupts a loop.
    if(!operation)return run('dispose',()=>{}, {allowRetired:true});
  }
  return Object.freeze({root,stage,activate,abort,setResident,removeInstance,inspect,dispose,stats:()=>({retired,stages:stages.size,instances:active?.instances.size??0,geometries:[...stages.values()].reduce((n,r)=>n+r.owned.size,0)})});
}
