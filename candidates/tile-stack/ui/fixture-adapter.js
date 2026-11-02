// Explicit UI-only v2 adapter double. No planner, recipe/CAS/history/save authority.
import {smartTileActions,SMART_TILE_LIMITS} from '../../../apps/editor/smart-tile/contract.js';
import {sha256} from '../../../packages/parts-core/hash.js';
// Literal native tables transcribed from fixed Editor proposal cfd5a322..., not height formulas.
const ids=[['F00','1',0],['F01','2',1],['F02','3',2],['F03','4',null],['F04','5',null],['F05','6',null],['F06','7',null],['F07','8',null],['F08','9',null],['F09','10',null],['F10','11',null],['F11','12',null],['F12','13',null],['F13','14',null],['F14','15',null]];
const table=values=>ids.map(([id,label,layerIndex],index)=>({id,label,elevationM:values[index],source:layerIndex===null?{kind:'authored-tile'}:{kind:'legacy-layer',layerIndex}}));
export const compatibilityFloors=table([0,2.12,4.24,6.36,8.48,10.6,12.72,14.84,16.96,19.08,21.2,23.32,25.44,27.56,29.68]);
export const nonuniformFloors=table([0,2.12,4.24,6.75,9.1,12.4,15,18.6,21.3,24.9,28.2,31,34.8,38.1,42.7]);
const clone=value=>structuredClone(value);
const entries=[['fixture.finish.brick',1,'Brick pavers'],['fixture.finish.stone',1,'Stone flags'],['fixture.finish.timber',1,'Timber boards'],['fixture.finish.concrete',1,'Poured concrete'],['skin.painterly',1,'Painterly · compatibility'],['skin.slate',1,'Slate · compatibility'],['skin.sandstone',1,'Sandstone · compatibility']].map(([id,version,label])=>({id,version,label,available:true,reason:null}));
const catalogue={id:'ui-fixture-finishes',version:1,digest:sha256(JSON.stringify(entries.map(({id,version,label})=>({id,version,label})))),entries};
const rectangle=()=>({tool:'rectangle',ownerId:null,origin:[0,0],widthM:8,depthM:4,seed:17,finishId:'skin.painterly'});
export function createTileStackUIFixture(floorController,profileId){
  const floors=profileId==='nonuniform-fifteen'?nonuniformFloors:compatibilityFloors;
  let state={version:2,interface:{kind:'nautilus-tile-stack-editor-adapter',version:2},
    workspace:{id:'ui-fixture-'+profileId,checkpointVersion:2,policyToken:sha256('ui-fixture-policy-v2'),floorProfile:{id:profileId,version:1},floorTableId:profileId+'-table',floorTableToken:sha256(JSON.stringify(floors)),sourceSha256:sha256('UI fixture only; no authoritative source map'),sourceDocumentDigest:sha256('UI fixture only; no authoritative document'),sourceConstraintsDigest:sha256('UI fixture only; no authoritative constraints'),floorProfileDigest:sha256('UI fixture only; opaque profile '+profileId),finishBinding:{id:catalogue.id,version:catalogue.version,digest:catalogue.digest}},
    floors:clone(floors),finishCatalogue:clone(catalogue),inspection:{mode:'selected-floor',cutawayFloorId:null},limits:clone(SMART_TILE_LIMITS),
    phase:'idle',tool:'rectangle',selectedOwnerId:'fixture.surface.15',draft:rectangle(),reviewId:null,requestId:null,recoveryId:null,revision:0,checkpointSerial:0,acceptedMinimumClearanceM:null,
    history:{undo:0,redo:0,bytes:0,maxEntries:64,maxBytes:16000000},
    owners:floors.map((floor,index)=>({id:'fixture.surface.'+String(index+1).padStart(2,'0'),recipeId:'fixture.rectangle',locked:index<14,shapeKind:'region',skinId:'skin.painterly',floorId:floor.id})),
    readiness:{authoring:{state:'UI fixture; not validated'},shape:{state:'No planner in this fixture'},visual:{state:'unbound',revision:null},query:{state:'unbound'},support:{state:'unbound'},navigation:{state:'unbound'},fire:{state:'unbound'},water:{state:'unbound'},game:{state:'unbound'}},
    diagnostics:[],resources:{accepted:0,candidate:0,acquiring:0,retiring:0,roots:0,triangles:0,cells:0,maxRoots:2,maxTriangles:50000,maxCells:1024}
  };
  let disposed=0,readFault=false;const listeners=new Set(),calls=[],behaviors=new Map();
  function snapshot(){
    if(readFault)throw Error('Injected UI read fault');
    const result=clone(state),navigation=floorController.state,floor=navigation.floors.find(item=>item.id===navigation.selectedId);result.floor={...floor,mode:navigation.mode};
    const base=smartTileActions({phase:result.phase,manual:navigation.mode==='manual',selected:!!result.selectedOwnerId,hasDraft:!!result.draft,undo:0,redo:0});
    const locked=!!result.owners.find(owner=>owner.id===result.selectedOwnerId)?.locked;
    result.actions={...base,finish:base.finish&&!locked,stack:base.setDraft,setInspection:false,save:false,open:false,undo:false,redo:false};
    if(result.actionOverrides)result.actions={...result.actions,...result.actionOverrides};
    result.finishCatalogue.entries=result.finishCatalogue.entries.map(entry=>({...entry,available:entry.available&&!locked,reason:locked?'Selected owner is locked in the fixture. Unlocking is not supplied.':entry.reason}));
    return result;
  }
  const notify=()=>{for(const listener of [...listeners])listener(snapshot());};
  const patch=value=>{state={...state,...clone(value)};notify();};
  const call=(name,args,normal)=>{calls.push({name,args:clone(args)});return behaviors.has(name)?behaviors.get(name)(...args):normal?.();};
  const adapter={
    getSnapshot:snapshot,subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener);},
    setTool(tool){return call('setTool',[tool],()=>{patch({tool,draft:tool==='rectangle'?rectangle():null,phase:'idle',reviewId:null});return {ok:true};});},
    selectOwner(id){return call('selectOwner',[id],()=>patch({selectedOwnerId:id}));},
    setDraft(draft){return call('setDraft',[draft],()=>{
      if(typeof draft.finishId!=='string')return {ok:false,code:'UI_FIXTURE_V1_INPUT_NEEDS_V2_FINISH_BINDING'};
      patch({draft,tool:draft.tool,phase:'draft',reviewId:null});return {ok:true};
    });},
    setInspection(inspection){return call('setInspection',[inspection],()=>{patch({inspection});return {ok:true};});},
    review(){return call('review',[],()=>{patch({phase:'review',reviewId:'fixture.review.original',requestId:'fixture.request.original'});return Promise.resolve({ok:true,reviewId:'fixture.review.original'});});},
    apply(id){return call('apply',[id],()=>{patch({phase:'idle',reviewId:null});return Promise.resolve({ok:true,committed:true,requestId:state.requestId});});},
    cancel(reason){return call('cancel',[reason],()=>{if(['applying','recovery-required'].includes(state.phase))return {ok:false,code:'UI_FIXTURE_RECOVERY_REQUIRED'};patch({phase:'idle',draft:null,reviewId:null});return {ok:true};});},
    undo(){return {ok:false,code:'UI_FIXTURE_NO_HISTORY'};},redo(){return {ok:false,code:'UI_FIXTURE_NO_HISTORY'};},
    save(){return {ok:false,code:'UI_FIXTURE_NO_STORAGE'};},open(){return {ok:false,code:'UI_FIXTURE_NO_STORAGE'};},
    recover(id){return call('recover',[id],()=>Promise.resolve({ok:true,requestId:id}));},
    retryPresentation(){return call('retryPresentation',[],()=>Promise.resolve({ok:true}));},dispose(){disposed++;}
  };
  return Object.freeze({version:2,label:'UI fixture only',adapter,calls,patch,notify,peek:snapshot,clearCalls:()=>{calls.length=0;},on:(name,fn)=>behaviors.set(name,fn),readFault:value=>{readFault=value;},diagnostics:()=>({subscriptions:listeners.size,borrowedAdapterDisposals:disposed})});
}
