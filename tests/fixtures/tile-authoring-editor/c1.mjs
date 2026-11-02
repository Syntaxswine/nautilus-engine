// Actual Core/planner/retained consumer/native Three geometry/finish pool.
// Synthetic atlas, no DOM/WebGL: this is NOT a rendered or installed proof.
import * as mapCore from '../../../packages/map-core/index.js';
import * as tiles from '../../../packages/tiles-core/index.js';
import * as authoring from '../../../packages/tile-authoring-core/index.js';
import * as examples from '../../../packages/tile-visuals/example.js';
import * as T from '../../../packages/render-effects/three.js';
import * as art from '../../../packages/tile-visuals/prepare.js';
import * as presenter from '../../../packages/tile-visuals/three.js';
import * as finishes from '../../../packages/tile-finishes/finishes.js';
import * as finishMetadata from '../../../packages/tile-finishes/catalogue.js';
import {createFloorNavigation} from '../../../packages/floor-navigation/index.js';
import {createTileAuthoringWorkspace} from '../../../apps/editor/tile-authoring/seed.js';
import {createTileAuthoringCheckpointCodec,createTileAuthoringStorage,tileAuthoringStorageKey} from '../../../apps/editor/tile-authoring/checkpoint.js';
import {createTileAuthoringSession} from '../../../apps/editor/tile-authoring/session.js';
import {createTileAuthoringHostService,createTileAuthoringWorkbenchBinding} from '../../../apps/editor/tile-authoring/host-service.js';
import {createTileAuthoringPresentation,createTileAuthoringResourcePorts} from '../../../apps/editor/tile-authoring/presentation.js';
import {createTileAuthoringJSONL} from '../../../apps/editor/tile-authoring/jsonl.js';
export {authoring,tiles,T};
export const pin=r=>({id:r.id,revision:r.revision,contentDigest:r.contentDigest});
export async function harness({values=new Map(),profileId='aft-native-fifteen',nativeFactory=presenter.createTileArtProvider,sourceIndent}={}){
  const counts={prepare:0,apply:0,acquire:0,directRepair:0},writes=[],nativeViews=[],scene=new T.Scene(),released={atlas:false,base:false};let session=null,ordinal=0,hook=()=>{},authorized=true;
  const measured={...tiles,prepareTileRepair(...args){counts.directRepair++;return tiles.prepareTileRepair(...args);},createRetainedTileConsumer(host){const actual=tiles.createRetainedTileConsumer(host);return {...actual,prepare(...args){counts.prepare++;return actual.prepare(...args);},apply(...args){counts.apply++;return actual.apply(...args);}};}};
  const deps={mapCore,tiles:measured,authoring,examples},source=mapCore.blankMap('C1 complete original map');source.metadata={retained:{hp:37,ap:0,unknown:['keep',7]}};
  const template=examples.surfaceRecipe('c1.template',8,4,{segments:16});template.interior.skinId='skin.brick-pavers';
  const document=createTileAuthoringWorkspace(deps,{workspaceId:'c1-workspace-'+profileId,sourceJSON:JSON.stringify(source,null,sourceIndent),profileId,finishBinding:finishMetadata.tileFinishBinding(),templateRecipe:template});
  const binding=createTileAuthoringCheckpointCodec(deps,document),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},key=tileAuthoringStorageKey(document.id);
  const authority=createTileAuthoringStorage(deps,{binding,storage,initialCheckpoint:binding.codec.create(document),beforeWrite(packet){writes.push({phase:packet.phase,requestId:packet.requestId});hook(packet,'before');},afterWrite(packet){hook(packet,'after');}});
  const atlas=new T.Texture({width:4,height:4});atlas.colorSpace=T.SRGBColorSpace;const base=new T.MeshStandardMaterial({roughness:.95});
  const lease=(name,value,proof)=>Object.freeze({value,proof,release(){released[name]=true;},diagnostics:()=>({released:released[name]})});
  const atlasLease=lease('atlas',atlas,finishMetadata.TILE_FINISH_ATLAS),baseLease=lease('base',base);
  const presentation=createTileAuthoringPresentation({tiles,art,presenter:{createTileArtProvider(...args){counts.acquire++;const view=nativeFactory(...args);nativeViews.push(view);return view;}},finishes,finishMetadata,THREE:T,scene,floors:document.floorBinding.floors,sectorSizeM:24,atlasLease,baseLease});
  const resourcePorts=createTileAuthoringResourcePorts({presentation,atlasLease,baseLease,readSessionResources:()=>session.getSnapshot().resources,availableProfiles:['public-v1-source-validation','owner-local-level-top-v1']});
  const floors=createFloorNavigation({floors:binding.domain.floorRecords,selectedId:'F00',cancelPreview(){session?.cancel('before-floor-change');},onFloorChange({to}){presentation.setFloor(to.id);}});
  const finishCatalogue={...document.finishBinding,entries:finishMetadata.tileFinishCatalogue().families.map(f=>({id:f.id,version:f.version,label:f.label,available:true,reason:null}))};
  session=await createTileAuthoringSession(deps,{binding,finishCatalogue,resourcePorts,authority,floorController:floors,presentation,providerToken:'actual-c1-native-source-proof',newId:()=>String(++ordinal)});
  const service=createTileAuthoringHostService({session,authoring,isAuthorized:()=>authorized}),jsonl=createTileAuthoringJSONL(service,{isAuthorized:()=>authorized});
  const workbench=createTileAuthoringWorkbenchBinding({service,session,borrowedFloorController:floors,borrowedInputOwner:{retire:reason=>session.cancel(reason)},borrowedResourcePorts:resourcePorts,allocateIds:()=>({requestId:'ui.req.'+(++ordinal),opId:'ui.op.'+ordinal})});
  return {deps,session,service,jsonl,workbench,document,binding,authority,resourcePorts,values,key,counts,writes,nativeViews,scene,presentation,floors,released,
    get raw(){return values.get(key);},set hook(value){hook=value;},set authorized(value){authorized=value;},
    command(kind,body){const n=++ordinal;return {kind:'nautilus-tile-authoring-command',version:1,requestId:'c1.req.'+n,expected:service.snapshot().expected,operations:[{opId:'c1.op.'+n,kind,body}],budgetProfile:'authoring-reference-proposal-v1'};},
    dispose(){authorized=false;session.dispose();presentation.dispose();floors.dispose();if(released.base)base.dispose();if(released.atlas)atlas.dispose();}};
}
export function definitions(){
  const a=authoring.createRectangleDefinition(tiles,{identity:{id:'c1.definition.a',revision:1,recipeId:'c1.recipe.a1'},sourceIds:{prefix:'c1.source.a',surfaceId:'c1.surface.a',gridId:'c1.grid.a'},widthM:8,depthM:4,finishId:'skin.brick-pavers',label:'A1'}).definition;
  const b1=authoring.createRectangleDefinition(tiles,{identity:{id:'c1.definition.b',revision:1,recipeId:'c1.recipe.b1'},base:a,edits:{label:'B1'}}).definition;
  const b2=authoring.createRectangleDefinition(tiles,{identity:{id:'c1.definition.b',revision:2,recipeId:'c1.recipe.b2'},base:b1,edits:{label:'B2',depthM:5}}).definition;
  const p=authoring.sealTileContentRecord(tiles,{kind:'nautilus-tile-preset',version:1,id:'c1.preset.p',revision:1,body:{label:'P1 pinned to B1',definition:pin(b1),defaultLayers:[],defaultMarks:[],requires:b1.body.requires,notices:b1.body.notices}}).record;
  return {a,b1,b2,p};
}
export async function applyCommand(h,command,{jsonl=false}={}){
  const review=jsonl?await h.jsonl.dispatch(JSON.stringify({action:'prepare',command})):await h.service.prepare(command);
  if(review.status!=='reviewable')throw Error(JSON.stringify(review));
  const request=h.workbench.getSnapshot().presentation.retainedApplyRequest;
  const outcome=jsonl?await h.jsonl.dispatch(JSON.stringify({action:'apply',request})):await h.service.apply(request);
  if(outcome.committed!==true)throw Error(JSON.stringify(outcome));return {review,request,outcome};
}
export async function library(h,records=definitions()){
  const {a,b1,b2,p}=records;
  for(const [kind,body]of [['recipe.create',{definition:a}],['recipe.clone',{base:pin(a),definition:b1}],['recipe.revise',{base:pin(b1),definition:b2}],['preset.save',{preset:p}]])await applyCommand(h,h.command(kind,body));return records;
}
export function placeBody(h,records){const floor=h.document.floorBinding.floors[0];return {preset:pin(records.p),defaults:'empty',placements:['c1.owner.one','c1.owner.two'].map((ownerId,i)=>({ownerId,originM:[20+i*12,20,floor.elevationM],floorBindings:{base:floor.id},transform:{quarterTurns:0,mirrorX:false},locked:false,anchorIds:records.b1.body.recipe.anchors.map(a=>a.id),freshMarkIds:[],freshLayerIds:[],chunkId:'c1.chunk.'+i}))};}
export const upgradeBody=records=>({ownerIds:['c1.owner.one'],from:pin(records.b1),to:pin(records.b2),anchorDecisions:[],newRecipeAnchorIds:[{ownerId:'c1.owner.one',anchorIds:records.b2.body.recipe.anchors.map(a=>a.id)}]});
