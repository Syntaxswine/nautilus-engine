// Optional artist authoring data. No renderer, file access, internal clock or game state.
import {SILO_PLAN,SILO_NATIVE,SILO_ASSETS,siloAsset,levelY,floorId} from './designs.js';
export {SILO_PLAN,SILO_NATIVE,SILO_ASSETS,siloAsset,levelY,floorId};
export {buildSiloMesh} from './mesh.js';
export const SILO_ART_CONTRACT=Object.freeze({schema:'nautilus-silo-artist-blueprint',version:1,units:'metres',
 standardFloorInterval:2.12,geometryProvider:'artist annular/polygon mesh provider',
 gameplayAdapter:null,publicPackageExport:null,
 requiredFutureBindings:Object.freeze(['curved-wall queries','clipped floor support','door/cover state queries','stair clearance and traversal','source-native placement and save semantics'])});
export function siloHeightReference(){
 return {kind:'nautilus-extended-world',version:1,id:'coldwell-height-reference',name:'Coldwell Silo height datums · geometry binding pending',profileId:'native-metres-v1',
  bounds:{widthM:136,depthM:44,minHeightM:-.5,heightM:50},
  floors:SILO_PLAN.floors.map(f=>({id:f.id,index:f.index,label:f.label,elevationM:f.worldElevationM})),
  surfaces:[],entities:[],links:[]};
}
export function createSiloBlueprint(id='coldwell-complex'){
 const asset=siloAsset(id),anchors={complex:[0,0,0],shaft:[111,0,18],capsule:[11.5,levelY(17),18],portal:[35,0,29.5],lock:[36,levelY(17),18],cover:[111,0,18]};
 const sockets=asset.kind==='cableway'?[{id:'a',position:[0,0,0],direction:[-1,0,0],clearDiameter:3},{id:'b',position:[4,0,0],direction:[1,0,0],clearDiameter:3}]:
  asset.kind==='wall'?[{id:'arc-start',position:[8,0,0],direction:[0,0,-1]},{id:'arc-end',position:[0,0,8],direction:[-1,0,0]}]:
  asset.kind==='stair'?[{id:'bottom',position:[.5,0,.6],direction:[-1,0,0]},{id:'top',position:[.5,2.12,2.4],direction:[-1,0,0]}]:[];
 return {schema:SILO_ART_CONTRACT.schema,version:1,asset,units:'metres',scale:[1,1,1],authoredAnchor:anchors[asset.kind]||[0,0,0],
  nativeKit:{tile:1,wallHeight:2,wallThickness:.16,slab:.12,floorInterval:2.12},
  nativeToWorld:structuredClone(SILO_PLAN.nativeToWorld),targetWorld:{commit:SILO_NATIVE.sourceWorldPin,schemaId:'nautilus-extended-world',version:1,profileId:'native-metres-v1',
   use:'Height/datum reference only. Custom geometry is not encoded as guessed axis-aligned solids.'},
  plan:asset.kind==='complex'?structuredClone(SILO_PLAN):{assemblyId:SILO_PLAN.id,component:asset.kind,parameters:structuredClone(SILO_PLAN[asset.kind]||{})},sockets,
  integration:{status:'artist-provider-for-intake',gameplayAdapter:null,requiredFutureBindings:[...SILO_ART_CONTRACT.requiredFutureBindings],
   legacyExport:'reject: curved walls, clipped floors, above-six-level height and moving geometry cannot be preserved by legacy map/block data'},
  authoring:{source:'detailed procedural native mesh',game:'same authored envelope with fewer curve facets/rod sides and simpler chamfers; not automatic arbitrary decimation'}};
}
export function serializeSiloBlueprint(input){
 if(!input||input.schema!==SILO_ART_CONTRACT.schema||input.version!==1)throw Error('Unsupported silo artist blueprint.');
 siloAsset(input.asset?.id);if(input.scale?.length!==3||input.scale.some(v=>v!==1)||input.nativeKit?.floorInterval!==2.12)throw Error('Preserve native scale and 2.12 m intervals.');
 return JSON.stringify(input);
}
export function exportSiloToLegacy(){
 const error=new Error('Silo custom curved geometry and extended height require an explicit consumer binding; legacy export would lose geometry.');
 error.code='UNSUPPORTED_SILO_GEOMETRY';error.diagnostics=[{code:error.code,path:'/',message:error.message}];throw error;
}
