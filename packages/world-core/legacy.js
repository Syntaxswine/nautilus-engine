import {openWorld,WORLD_CONTRACT} from './state.js';
import {LIMITS,fail,fields,identifier,inputData,bytes,escapeKey} from './validation.js';

// Reviewed sources remain unchanged. Renderer walls/roofs use 2.12 m intervals;
// non-hybrid tactical combat uses 3 m. Choosing either is explicit, never inferred.
export const LEGACY_HEIGHT_PROFILES=Object.freeze({
  'aft-render-v1':Object.freeze({floorSpacingM:2.12,ordinaryFloors:5,canopyIndex:5}),
  'aft-tactical-v1':Object.freeze({floorSpacingM:3,ordinaryFloors:5,canopyIndex:5})
});
function profile(id){if(typeof id!=='string'||!Object.hasOwn(LEGACY_HEIGHT_PROFILES,id))fail('SOURCE_PROFILE_REQUIRED','/sourceProfile','Choose the audited aft-render-v1 or aft-tactical-v1 mapping explicitly.');return LEGACY_HEIGHT_PROFILES[id];}
const diagnostic=(code,path,message,action='Retain the original and add a reviewed semantic binding; never clamp or discard the data.')=>({code,path,message,action});

/** A review report, not a successful semantic migration. No geometry/actor/link
 * binder from AFT is implemented in this tranche. original.text is recoverable
 * verbatim for string input, including whitespace and opaque extension fields.
 */
export function reportLegacyMigration(input,options){
  fields(options,['receiptId','sourceProfile'],'/options');identifier(options.receiptId,'/options/receiptId');const mapping=profile(options.sourceProfile),raw=inputData(input,LIMITS.legacyBytes);
  const block=raw?.kind==='red-shift-block';if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==(block?1:2)||(!block&&raw.kind!==undefined))fail('UNSUPPORTED_LEGACY_SCHEMA','/version','Only aft-map-v2 and aft-block-v1 can be reviewed here.');
  const original=typeof input==='string'?input:JSON.stringify(raw),schema={id:block?'aft-block':'aft-map',version:raw.version},diagnostics=[diagnostic('SEMANTIC_BINDING_REQUIRED','/','No audited AFT tile/object/traversal-to-world geometry binder exists in this tranche.')];
  for(const key of Object.keys(raw))if(!['version','kind','name','width','height','levels'].includes(key))diagnostics.push(diagnostic('UNCONVERTED_LEGACY_FIELD','/'+escapeKey(key),'Preserved original field requires semantic review: '+key+'.'));
  if(raw.levels!==undefined&&(!Number.isInteger(raw.levels)||raw.levels<3||raw.levels>6))diagnostics.push(diagnostic('LEGACY_FLOOR_RANGE','/levels','Legacy layer counts remain 3–6; this report does not legalize taller legacy documents.'));
  return {ok:false,world:null,original:{encoding:'utf-8',text:original},receipt:{id:options.receiptId,version:1,operation:'legacy-height-review-v1',from:schema,to:{id:WORLD_CONTRACT.schemaId,version:1},sourceProfile:options.sourceProfile,sourceBytes:bytes(original),floorSpacingM:mapping.floorSpacingM,canopyIndex:mapping.canopyIndex,sourceValidation:'not-performed',converted:false},diagnostics};
}
export function reportLegacyRepresentability(input,options){
  fields(options,['target','sourceProfile'],'/options');if(!['aft-map-v2','aft-block-v1'].includes(options.target))fail('UNSUPPORTED_LEGACY_SCHEMA','/options/target','Choose aft-map-v2 or aft-block-v1.');
  const mapping=profile(options.sourceProfile),world=openWorld(input),diagnostics=[diagnostic('SEMANTIC_BINDING_REQUIRED','/','No world-to-AFT semantic exporter exists; no legacy document was emitted.')];
  for(let index=0;index<world.floors.length;index++){const floor=world.floors[index],path='/floors/'+index;if(floor.index>=mapping.ordinaryFloors)diagnostics.push(diagnostic('UNREPRESENTABLE_FLOOR',path,'Ordinary floor '+floor.id+' would collide with or exceed the special legacy canopy slot.'));if(floor.elevationM!==floor.index*mapping.floorSpacingM)diagnostics.push(diagnostic('UNREPRESENTABLE_HEIGHT',path+'/elevationM','Explicit native elevation of '+floor.id+' differs from the chosen legacy mapping.'));}
  for(const group of ['surfaces','entities','links'])world[group].forEach((record,index)=>diagnostics.push(diagnostic('UNREPRESENTABLE_RECORD','/'+group+'/'+index,'Record '+record.id+' needs an audited legacy semantic conversion.')));
  return {ok:false,target:options.target,sourceProfile:options.sourceProfile,legacy:null,diagnostics};
}
