// Gate A proposal only. No public entry, live session, DOM or storage owner.
import {SMART_TILE_INTERFACE,SMART_TILE_LIMITS,smartTileActions} from '../smart-tile/contract.js';
import {smartTileData,fields,id,fail} from '../smart-tile/checkpoint.js';
export const TILE_STACK_EDITOR=Object.freeze({
  kind:'nautilus-tile-stack-editor-adapter',version:2,
  checkpoint:'nautilus-smart-tile-editor-checkpoint',checkpointVersion:2,
  journal:'nautilus-smart-tile-editor-journal',journalVersion:2,
  operation:'nautilus-smart-tile-editor-operation',operationVersion:2,
  floorBinding:'nautilus-tile-stack-floor-binding',floorBindingVersion:1,
  storagePrefix:'nautilus-smart-tile-editor-stack-v2:',methods:SMART_TILE_INTERFACE.methods,
  optionalMethods:Object.freeze(['lockOwner','setInspection']),tools:Object.freeze(['rectangle','path','stack','finish']),
  phases:SMART_TILE_INTERFACE.phases,
  readiness:Object.freeze(['authoring','shape','visual','query','support','navigation','fire','water','game']),limits:SMART_TILE_LIMITS
});
export function assertTileStackAdapter(adapter){
  for(const name of TILE_STACK_EDITOR.methods){const d=Object.getOwnPropertyDescriptor(adapter,name);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')fail('STACK_ADAPTER_METHOD','/adapter/'+name,'Bind the explicit v2 adapter; do not reinterpret a v1 adapter.');}
  const s=adapter.getSnapshot();if(s?.version!==2||s?.interface?.kind!==TILE_STACK_EDITOR.kind||s.interface.version!==2)fail('STACK_ADAPTER_VERSION','/adapter','The proposed stack adapter is explicitly v2.');return adapter;
}
// Reuse the accepted gate, including unknown-ack freezing; no second machine.
export function tileStackActions(state,{inspectionBound=false}={}){
  const base=smartTileActions(state);return Object.freeze({...base,stack:base.setDraft,setInspection:base.setDraft&&inspectionBound});
}
export function validateStackDraft(input,floorBinding){
  const d=smartTileData(input);fields(d,['tool','ownerId','origin','widthM','depthM','seed','floorIds','minimumClearanceM','lockPolicy','finishId'],'/draft');
  if(d.tool!=='stack'||d.ownerId!==null||d.lockPolicy!=='all-except-highest')fail('STACK_DRAFT_PROFILE','/draft','This tranche creates a new aligned rectangular stack; only its highest owner remains unlocked.');
  for(const key of ['widthM','depthM'])if(typeof d[key]!=='number'||!Number.isFinite(d[key])||d[key]<.1||d[key]>64)fail('STACK_DRAFT_DIMENSION','/draft/'+key,'Use native metres within the accepted rectangle range.');
  if(!Array.isArray(d.origin)||d.origin.length!==2||d.origin.some(n=>typeof n!=='number'||!Number.isFinite(n)||Object.is(n,-0)||Math.abs(n)>1_000_000))fail('STACK_DRAFT_ORIGIN','/draft/origin','Supply native planar x,y.');
  if(!Number.isInteger(d.seed)||d.seed<0||d.seed>4294967295)fail('STACK_DRAFT_SEED','/draft/seed','Retain an explicit uint32 seed.');
  if(typeof d.minimumClearanceM!=='number'||!Number.isFinite(d.minimumClearanceM)||d.minimumClearanceM<=0||d.minimumClearanceM>100_000)fail('STACK_DRAFT_CLEARANCE','/draft/minimumClearanceM','Keep the explicit positive requested clearance; the public planner determines feasibility.');
  if(!Array.isArray(d.floorIds)||d.floorIds.length<2||d.floorIds.length>15)fail('STACK_DRAFT_FLOORS','/draft/floorIds','Select two to fifteen declared floors.');
  let previous=-1;for(const floorId of d.floorIds){const index=floorBinding.floors.findIndex(f=>f.id===floorId);if(index<0||index<=previous)fail('STACK_DRAFT_FLOORS','/draft/floorIds','Use unique declared IDs in saved table order.');previous=index;}
  id(d.finishId,'/draft/finishId');return d;
}
