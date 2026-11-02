import {sha256} from '../../../packages/parts-core/hash.js';
import {smartTileData,smartTileDigest,fields,id,fail,bytes} from '../smart-tile/checkpoint.js';
import {TILE_STACK_EDITOR as C} from './contract.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
// Explicit fixture source, never label/index multiplied by height.
export const TILE_STACK_FLOOR_PROFILES=freeze({
  'aft-native-fifteen':{version:1,tableId:'aft-native-fifteen-table',elevationsM:[0,2.12,4.24,6.36,8.48,10.6,12.72,14.84,16.96,19.08,21.2,23.32,25.44,27.56,29.68]},
  'nonuniform-fifteen':{version:1,tableId:'nonuniform-fifteen-table',elevationsM:[0,2.12,4.24,6.75,9.1,12.4,15,18.6,21.3,24.9,28.2,31,34.8,38.1,42.7]}
});
const identities=[['F00','1',0],['F01','2',1],['F02','3',2],['F03','4',null],['F04','5',null],['F05','6',null],['F06','7',null],['F07','8',null],['F08','9',null],['F09','10',null],['F10','11',null],['F11','12',null],['F12','13',null],['F13','14',null],['F14','15',null]];
// The same immutable raw source is inspected repeatedly by live receipt and
// context validation. Match the v1 bounded per-core source-validation cache.
const sourceChecks=new WeakMap();
export function validateStackSource(mapCore,sourceJSON){
  if(typeof sourceJSON!=='string'||bytes(sourceJSON)>C.limits.sourceBytes)fail('STACK_SOURCE_LIMIT','/sourceJSON','Retain complete original JSON within the existing bound.');
  let known=sourceChecks.get(mapCore);if(!known){known=new Map();sourceChecks.set(mapCore,known);}if(known.has(sourceJSON))return known.get(sourceJSON);
  const source=smartTileData(sourceJSON);
  if(!source||source.version!==2||source.kind==='red-shift-block'||source.levels!==3)fail('STACK_SOURCE_PROFILE','/sourceJSON','Retain an original three-layer portable map.');
  const forbidden=new Set(['nautilus-tile-bundle','nautilus-tile-layout','nautilus-tile-recipe','nautilus-functional-parts','nautilus-extended-world','nautilus-window-authoring','nautilus-window-pane-state','nautilus-farmyard-window-host-save']);
  function visit(v){if(!v||typeof v!=='object')return;if(forbidden.has(v.kind)||Object.hasOwn(v,'farmyardWindows'))fail('STACK_SOURCE_AUTHORITY','/sourceJSON','Do not nest another authority or migrate a window file.');Object.values(v).forEach(visit);}visit(source);
  mapCore.loadBlueprint(source); // Inspect only; discard normalized output.
  const result=Object.freeze({levels:source.levels,sha256:sha256(sourceJSON)});known.set(sourceJSON,result);while(known.size>2)known.delete(known.keys().next().value);return result;
}
export function createFloorBinding({mapCore},sourceJSON,profileId='aft-native-fifteen'){
  const source=validateStackSource(mapCore,sourceJSON),p=Object.hasOwn(TILE_STACK_FLOOR_PROFILES,profileId)&&TILE_STACK_FLOOR_PROFILES[profileId];
  if(!p)fail('STACK_FLOOR_PROFILE','/floorBinding/profile','Use an explicitly declared Gate A profile.');
  return freeze({kind:C.floorBinding,version:1,id:p.tableId,profile:{id:profileId,version:p.version},sourceSha256:source.sha256,floors:identities.map(([id,label,layerIndex],i)=>({id,label,elevationM:p.elevationsM[i],source:layerIndex===null?{kind:'authored-tile'}:{kind:'legacy-layer',layerIndex}}))});
}
export function openFloorBinding(deps,sourceJSON,input){
  const f=smartTileData(input);fields(f,['kind','version','id','profile','sourceSha256','floors'],'/floorBinding');fields(f.profile,['id','version'],'/floorBinding/profile');
  if(f.kind!==C.floorBinding||f.version!==1||f.profile.version!==1)fail('STACK_FLOOR_VERSION','/floorBinding','Unknown binding/profile versions refuse.');
  id(f.id,'/floorBinding/id');id(f.profile.id,'/floorBinding/profile/id');
  if(!Array.isArray(f.floors)||f.floors.length!==15)fail('STACK_FLOOR_COUNT','/floorBinding/floors','Supply exactly fifteen predeclared floors.');
  const ids=new Set(),layers=new Set();let previous=-Infinity;
  for(const [i,row]of f.floors.entries()){
    const path='/floorBinding/floors/'+i;fields(row,['id','label','elevationM','source'],path);id(row.id,path+'/id');
    if(ids.has(row.id)||typeof row.label!=='string'||!row.label||row.label.length>128||typeof row.elevationM!=='number'||!Number.isFinite(row.elevationM)||Object.is(row.elevationM,-0)||row.elevationM<=previous)fail('STACK_FLOOR_RECORD',path,'Retain unique ordered native floor records.');ids.add(row.id);previous=row.elevationM;
    if(row.source?.kind==='legacy-layer'){fields(row.source,['kind','layerIndex'],path+'/source');if(!Number.isInteger(row.source.layerIndex)||row.source.layerIndex<0||row.source.layerIndex>=3||layers.has(row.source.layerIndex))fail('STACK_LEGACY_LAYER',path+'/source','Reference each real legacy layer once.');layers.add(row.source.layerIndex);}
    else if(row.source?.kind==='authored-tile')fields(row.source,['kind'],path+'/source');else fail('STACK_FLOOR_SOURCE',path+'/source','Distinguish legacy-layer and tile-only identities.');
  }
  if(layers.size!==3)fail('STACK_LEGACY_LAYER','/floorBinding/floors','Retain all three legacy-layer references.');
  if(smartTileDigest(f)!==smartTileDigest(createFloorBinding(deps,sourceJSON,f.profile.id)))fail('STACK_FLOOR_TABLE_MISMATCH','/floorBinding','Preserve exact predeclared table/profile identity, source bytes and native records.');return freeze(f);
}
export const floorControllerRecords=binding=>binding.floors.map(({id,label,elevationM})=>({id,label,elevationM}));
export const floorTableToken=binding=>smartTileDigest(binding);
