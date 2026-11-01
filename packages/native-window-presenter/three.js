import {slots,api,copyData,idList,fail} from './data.js';
import {readPrepared} from './prepare.js';
import {buildWindow,buildLegacyWall} from './geometry.js';
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
  const root=new T.Group();root.name='native-window-presenter';let retired=false,active=null;
  const stages=new Map();let nextTicket=0,checking=false;
  const live=()=>{if(retired)fail('DISPOSED','Presenter is retired.');};
  // Borrowed callback observes a detached scope; it cannot mutate the plan.
  const current=plan=>{if(checking)fail('REENTRANT_VIEW','Finish the current view check first.');checking=true;try{return isCurrent(structuredClone(plan.scope))===true;}finally{checking=false;}};
  function retire(record){
    if(!record||record.retired)return;record.retired=true;record.root.removeFromParent();record.root.clear();
    for(const resource of record.owned)resource.dispose();record.owned.clear();record.instances.clear();stages.delete(record.handle);if(active===record)active=null;
  }
  function stage(preparation){
    live();const plan=readPrepared(preparation);
    if(!current(plan))fail('STALE_VIEW','Preparation no longer matches the current host publication/ticket.');
    live();if(stages.size>=3)fail('STAGE_LIMIT','Retire/abort a view before keeping more than one active plus two candidates.');
    const record={root:null,owned:new Set(),instances:new Map(),retired:false,ticket:++nextTicket,plan,handle:null};
    try{
      record.root=new T.Group();record.root.name='window-view:'+plan.projection.sceneId;
      const p=plan.projection,defs=p.resolvedDefinitions;
      for(let i=0;i<p.document.placements.length;i++){
        const placement=p.document.placements[i],owned=new Set();
        // Track each allocation immediately, including partially built assets.
        const sink={add:g=>{owned.add(g);record.owned.add(g);}};
        const instance=buildWindow(T,materials,placement,defs[i],p.content[i],p.sceneId,sink);
        instance.owned=owned;const broken=Object.hasOwn(p.document.observedBroken,placement.id)?p.document.observedBroken[placement.id]:[];
        for(const [id,pane]of instance.panes){pane.broken=broken.includes(id);pane.root.visible=!pane.broken;}
        record.instances.set(placement.id,instance);record.root.add(instance.root);
      }
      for(const {clipped}of plan.legacyWalls)if(clipped)record.root.add(buildLegacyWall(T,materials.legacyWall,clipped,record.owned));
      const handle=Object.freeze({kind:'staged-native-window-view',version:1,ticket:record.ticket});record.handle=handle;stages.set(handle,record);
      if(!current(plan)||retired){retire(record);fail('STALE_VIEW','View became stale during acquisition.');}
      return handle;
    }catch(error){if(record.root)retire(record);else for(const g of record.owned)g.dispose();throw error;}
  }
  function activate(handle){
    live();const record=stages.get(handle);if(!record||record.retired)fail('UNKNOWN_STAGE','Use a live stage from this presenter.');
    let accepted;try{accepted=current(record.plan)&&!retired;}catch(error){if(record!==active)retire(record);throw error;}
    if(!accepted){if(record!==active)retire(record);return false;}
    const previous=active;if(previous===record)return true;root.add(record.root);active=record;if(previous)retire(previous);return true;
  }
  function abort(handle){const record=stages.get(handle);if(!record||record===active)return false;retire(record);return true;}
  function setResident(input){live();const ids=idList(input);if(!active)fail('NO_ACTIVE_VIEW','Activate a current view first.');const allowed=new Set(ids);if(ids.some(id=>!active.instances.has(id)))fail('UNKNOWN_PLACEMENT','Residency must name current complete placement IDs.');for(const [id,instance]of active.instances)instance.root.visible=allowed.has(id);}
  function removeInstance(id){live();if(typeof id!=='string'||id.length>96)fail('INVALID_ID','Use a complete placement ID.');const instance=active?.instances.get(id);if(!instance)return false;instance.root.removeFromParent();instance.root.clear();for(const g of instance.owned){g.dispose();active.owned.delete(g);}instance.owned.clear();active.instances.delete(id);return true;}
  function inspect(handle=active?.handle){
    const record=stages.get(handle);if(!record)return null;
    return {scope:structuredClone(record.plan.scope),root:record.root,instances:new Map([...record.instances].map(([id,v])=>[id,{root:v.root,panes:new Map(v.panes),solids:new Map(v.solids)}])),legacyWalls:structuredClone(record.plan.legacyWalls),ownedGeometryCount:record.owned.size,active:record===active};
  }
  function dispose(){if(retired)return;retired=true;for(const record of [...stages.values()])retire(record);root.removeFromParent();root.clear();}
  return Object.freeze({root,stage,activate,abort,setResident,removeInstance,inspect,dispose,stats:()=>({retired,stages:stages.size,instances:active?.instances.size??0,geometries:[...stages.values()].reduce((n,r)=>n+r.owned.size,0)})});
}
