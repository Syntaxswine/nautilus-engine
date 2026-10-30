import {inputData,fields,identifier,text,finite,integer,boolean,ordered,escapeKey} from '../world-core/validation.js';
import {openWorld} from '../world-core/state.js';

export const PARTS_CONTRACT=Object.freeze({schemaId:'nautilus-functional-parts',definitionSchemaId:'nautilus-part-definition',compiledSchemaId:'nautilus-compiled-parts',runtimeSchemaId:'nautilus-parts-runtime-save',version:1,profileId:'native-quarter-turn-parts-v1',definitionProfileId:'native-aabb-parts-v1',renderProfileId:'native-part-bindings-v1',capability:'nautilus-functional-parts-v1',metresPerUnit:1,standardStoryHeightM:2.12});
export const PARTS_LIMITS=Object.freeze({bytes:8000000,definitions:64,partsPerDefinition:128,instances:256,depth:8,parameters:32,openings:32,holes:32,connections:1024,renderBindings:49152,runtimeActors:128,journal:4096,hostBytes:1000000});
export class PartsError extends TypeError{
  constructor(code,path,reason,action='Correct the complete authored parts data before compiling or replacing a live scene.',context={}){super(reason);this.name='PartsError';this.code=code;this.status=context.status||'incomplete';this.diagnostics=[{code,path,reason,action,instanceId:context.instanceId||null,partId:context.partId||null,definitionPath:context.definitionPath||null}];}
}
export const failParts=(...args)=>{throw new PartsError(...args);};
export function partsInput(input){try{return inputData(input,PARTS_LIMITS.bytes);}catch(error){failParts('INVALID_PARTS_DATA',error.diagnostics?.[0]?.path||'/',error.message,'Supply finite, bounded, acyclic plain JSON with own enumerable data fields; accessors, hidden data, functions and omitted values are unsupported.');}}
export const copy=value=>structuredClone(value);
export const canonical=value=>JSON.stringify(ordered(value));
export function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function shortId(value,max,path){if(typeof value!=='string'||value.length>max||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*(?![\s\S])/.test(value))failParts('INVALID_PARTS_ID',path,'Use an explicit bounded ASCII identity.','Use 1–24 characters for an instance key or 1–32 for a local semantic key. Preserve longer native source references separately; no key is shortened.');}
export function contentVersion(value,path){if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}(?![\s\S])/.test(value))failParts('INVALID_CONTENT_VERSION',path,'Select an exact stable content version.');}
function list(value,max,path){if(!Array.isArray(value)||value.length>max)failParts('PARTS_LIMIT',path,'Expected a bounded parts list.');}
function duplicate(id,seen,path){if(seen.has(id))failParts('DUPLICATE_PARTS_ID',path,'Semantic identities must be unique within their definition/document.');seen.add(id);}
function scalar(value,parameters,path){
  if(typeof value==='number'){finite(value,-65536,65536,path);return;}
  fields(value,['parameter','scale','offset'],path);shortId(value.parameter,32,path+'/parameter');finite(value.scale,-4096,4096,path+'/scale');finite(value.offset,-65536,65536,path+'/offset');
  if(parameters.get(value.parameter)?.type!=='number')failParts('INVALID_PARAMETER_REFERENCE',path,'A numeric expression must reference a declared numeric parameter.');
}
function condition(value,parameters,path){if(typeof value==='boolean')return;fields(value,['parameter'],path);if(parameters.get(value.parameter)?.type!=='boolean')failParts('INVALID_PARAMETER_REFERENCE',path,'A condition must reference a declared boolean parameter.');}
function point(value,parameters,path){fields(value,['x','y','h'],path);for(const axis of ['x','y','h'])scalar(value[axis],parameters,path+'/'+axis);}
function rect(value,parameters,path){fields(value,['min','max'],path);for(const end of ['min','max']){fields(value[end],['x','y'],path+'/'+end);for(const axis of ['x','y'])scalar(value[end][axis],parameters,path+'/'+end+'/'+axis);}}
function bounds(value,parameters,path){fields(value,['min','max'],path);point(value.min,parameters,path+'/min');point(value.max,parameters,path+'/max');}
function initial(value,path){fields(value,['open','locked'],path);boolean(value.open,path+'/open');boolean(value.locked,path+'/locked');if(value.open&&value.locked)failParts('INVALID_INITIAL_DOOR',path,'A locked initial door must be closed.');}
function landing(value,parameters,path){fields(value,['floorId','surfaceId','position'],path);shortId(value.floorId,32,path+'/floorId');if(value.surfaceId!==null)shortId(value.surfaceId,32,path+'/surfaceId');point(value.position,parameters,path+'/position');}

function definitionData(input){
  const data=partsInput(input);fields(data,['kind','version','id','contentVersion','label','profileId','parameters','floors','parts','source'],'');
  if(data.kind!==PARTS_CONTRACT.definitionSchemaId||data.version!==1)failParts('UNSUPPORTED_PART_DEFINITION','/version','Use part-definition v1.','Select the matching fixed definition/schema version.',{status:'unsupported'});
  if(data.profileId!==PARTS_CONTRACT.definitionProfileId)failParts('UNSUPPORTED_PART_PROFILE','/profileId','Only native axis-aligned part recipes are implemented.','Choose native-aabb-parts-v1; other geometry needs a deliberately versioned provider.',{status:'unsupported'});
  identifier(data.id,'/id');contentVersion(data.contentVersion,'/contentVersion');text(data.label,160,'/label');
  fields(data.source,['project','commit','path','notice','guide'],'/source');for(const key of ['project','path','notice','guide'])text(data.source[key],key==='project'?96:2048,'/source/'+key);if(data.source.commit!==null&&(typeof data.source.commit!=='string'||!/^[a-f0-9]{40}(?![\s\S])/.test(data.source.commit)))failParts('INVALID_PART_SOURCE','/source/commit','Use a full reviewed source commit, or null for an explicitly original/unreleased conformance recipe.');
  list(data.parameters,PARTS_LIMITS.parameters,'/parameters');const parameters=new Map();
  for(const [index,parameter]of data.parameters.entries()){
    const path='/parameters/'+index;fields(parameter,parameter?.type==='boolean'?['id','type','default']:['id','type','default','min','max','unit'],path);shortId(parameter.id,32,path+'/id');if(parameters.has(parameter.id))failParts('DUPLICATE_PARAMETER',path+'/id','Parameter IDs must be unique.');
    if(parameter.type==='boolean')boolean(parameter.default,path+'/default');else if(parameter.type==='number'){finite(parameter.min,-4096,4096,path+'/min');finite(parameter.max,parameter.min,4096,path+'/max');finite(parameter.default,parameter.min,parameter.max,path+'/default');if(!['metres','scalar'].includes(parameter.unit))failParts('INVALID_PARAMETER_UNIT',path+'/unit','Use explicit metres or scalar units.');}else failParts('UNSUPPORTED_PARAMETER_TYPE',path+'/type','Only numeric and boolean recipe parameters are supported.');
    parameters.set(parameter.id,parameter);
  }
  list(data.floors,32,'/floors');list(data.parts,PARTS_LIMITS.partsPerDefinition,'/parts');const floors=new Set(),semantics=new Set();
  for(const [index,floor]of data.floors.entries()){const path='/floors/'+index;fields(floor,['id','elevationM'],path);shortId(floor.id,32,path+'/id');duplicate(floor.id,floors,path+'/id');scalar(floor.elevationM,parameters,path+'/elevationM');}
  for(const [index,part]of data.parts.entries()){
    const path='/parts/'+index,common=['id','type','floorId','material'],keys={
      slab:[...common,'bounds','holes'],solid:[...common,'bounds'],wall:[...common,'axis','origin','lengthM','heightM','thicknessM','openings'],
      door:[...common,'portalId','axis','origin','hand','hingeInsetM','leaf','swing','reachM','initial'],stairs:[...common,'from','to','path','widthM','clearanceM','bidirectional','reachM']
    };
    if(!Object.hasOwn(keys,part?.type))failParts('UNSUPPORTED_PART_TYPE',path+'/type','Use a declared slab, solid, wall, door or stair recipe.','Preserve unsupported recipes for a matching compiler/profile.',{status:'unsupported'});
    fields(part,keys[part.type],path);shortId(part.id,32,path+'/id');duplicate(part.id,semantics,path+'/id');shortId(part.floorId,32,path+'/floorId');if(!floors.has(part.floorId))failParts('MISSING_DEFINITION_FLOOR',path+'/floorId','The part names an undeclared local floor.');identifier(part.material,path+'/material');
    if(part.type==='slab'||part.type==='solid')bounds(part.bounds,parameters,path+'/bounds');
    if(part.type==='slab'){
      list(part.holes,PARTS_LIMITS.holes,path+'/holes');for(const [holeIndex,hole]of part.holes.entries()){const hp=path+'/holes/'+holeIndex;fields(hole,['id','enabled','rect'],hp);shortId(hole.id,32,hp+'/id');duplicate(hole.id,semantics,hp+'/id');condition(hole.enabled,parameters,hp+'/enabled');rect(hole.rect,parameters,hp+'/rect');}
    }else if(part.type==='wall'){
      if(!['x','y'].includes(part.axis))failParts('UNSUPPORTED_WALL_AXIS',path+'/axis','Walls follow a local x or y axis before the native quarter turn.');point(part.origin,parameters,path+'/origin');for(const key of ['lengthM','heightM','thicknessM'])scalar(part[key],parameters,path+'/'+key);list(part.openings,PARTS_LIMITS.openings,path+'/openings');
      for(const [openingIndex,opening]of part.openings.entries()){const op=path+'/openings/'+openingIndex;fields(opening,['id','enabled','offsetM','widthM','heightM','bottomM'],op);shortId(opening.id,32,op+'/id');duplicate(opening.id,semantics,op+'/id');condition(opening.enabled,parameters,op+'/enabled');for(const key of ['offsetM','widthM','heightM','bottomM'])scalar(opening[key],parameters,op+'/'+key);}
    }else if(part.type==='door'){
      if(part.portalId!==null)shortId(part.portalId,32,path+'/portalId');if(!['x','y'].includes(part.axis))failParts('INVALID_DOOR_AXIS',path+'/axis','Choose a native local x/y portal frame.');point(part.origin,parameters,path+'/origin');if(!['start','end'].includes(part.hand)||![1,-1].includes(part.swing))failParts('INVALID_DOOR_POSE',path,'Choose an explicit hinge hand and signed quarter-turn swing.');scalar(part.hingeInsetM,parameters,path+'/hingeInsetM');fields(part.leaf,['widthM','heightM','thicknessM','offsetM','bottomM'],path+'/leaf');for(const key of ['widthM','heightM','thicknessM','offsetM','bottomM'])scalar(part.leaf[key],parameters,path+'/leaf/'+key);scalar(part.reachM,parameters,path+'/reachM');initial(part.initial,path+'/initial');
    }else if(part.type==='stairs'){
      landing(part.from,parameters,path+'/from');landing(part.to,parameters,path+'/to');for(const landing of [part.from,part.to])if(!floors.has(landing.floorId))failParts('MISSING_DEFINITION_FLOOR',path,'A stair landing names an undeclared local floor.');list(part.path,128,path+'/path');if(part.path.length<2)failParts('INVALID_STAIR_PATH',path+'/path','Provide at least two route points.');part.path.forEach((value,i)=>point(value,parameters,path+'/path/'+i));scalar(part.widthM,parameters,path+'/widthM');scalar(part.clearanceM,parameters,path+'/clearanceM');scalar(part.reachM,parameters,path+'/reachM');boolean(part.bidirectional,path+'/bidirectional');
    }
  }
  return data;
}

function documentData(input){
  const data=partsInput(input);fields(data,['kind','version','profileId','revision','world','instances','connections'],'');
  if(data.kind!==PARTS_CONTRACT.schemaId||data.version!==1)failParts('UNSUPPORTED_PARTS_SCHEMA','/version','Use functional-parts document v1.','Keep this document intact and select its matching compiler.',{status:'unsupported'});
  if(data.profileId!==PARTS_CONTRACT.profileId)failParts('UNSUPPORTED_PARTS_PROFILE','/profileId','Only native translation and quarter turns are supported.','Choose native-quarter-turn-parts-v1; scaling, mirroring and arbitrary rotations require another profile.',{status:'unsupported'});
  data.world=openWorld(data.world);
  integer(data.revision,0,1e9,'/revision');list(data.instances,PARTS_LIMITS.instances,'/instances');list(data.connections,PARTS_LIMITS.connections,'/connections');let count=0;const ids=new Set();
  const visit=(instance,path,depth)=>{
    if(depth>PARTS_LIMITS.depth||++count>PARTS_LIMITS.instances)failParts('PARTS_INSTANCE_LIMIT',path,'The authored assembly exceeds its depth/count budget.');
    fields(instance,['id','definition','transform','parameters','initial','mode','children'],path);shortId(instance.id,24,path+'/id');duplicate(instance.id,ids,path+'/id');fields(instance.definition,['id','version'],path+'/definition');identifier(instance.definition.id,path+'/definition/id');contentVersion(instance.definition.version,path+'/definition/version');
    for(const unsupported of ['scale','mirror','yawRadians','rotation'])if(instance.transform&&Object.hasOwn(instance.transform,unsupported))failParts('UNSUPPORTED_PART_TRANSFORM',path+'/transform/'+unsupported,'This profile preserves native scale and explicit quarter turns.','Remove unsupported scaling/mirroring/arbitrary rotation or select a separately implemented profile.',{status:'unsupported',instanceId:instance.id});
    fields(instance.transform,['x','y','h','quarterTurns'],path+'/transform');for(const axis of ['x','y','h'])finite(instance.transform[axis],-4096,4096,path+'/transform/'+axis);if(!Number.isInteger(instance.transform.quarterTurns)||instance.transform.quarterTurns<0||instance.transform.quarterTurns>3)failParts('UNSUPPORTED_PART_TRANSFORM',path+'/transform/quarterTurns','Choose a canonical integer quarter turn from zero to three.','Apply the intended quarter-turn command in authoring; arbitrary angles are not normalized.',{status:'unsupported',instanceId:instance.id});
    if(!instance.parameters||Array.isArray(instance.parameters)||typeof instance.parameters!=='object')failParts('INVALID_PART_PARAMETERS',path+'/parameters','Supply plain named parameter overrides.');for(const [key,value]of Object.entries(instance.parameters)){const parameterPath=path+'/parameters/'+escapeKey(key);shortId(key,32,parameterPath);if(typeof value!=='boolean')finite(value,-4096,4096,parameterPath);}
    list(instance.initial,PARTS_LIMITS.partsPerDefinition,path+'/initial');const initialIds=new Set();for(const [index,value]of instance.initial.entries()){const ip=path+'/initial/'+index;fields(value,['partId','open','locked'],ip,['partId']);shortId(value.partId,32,ip+'/partId');duplicate(value.partId,initialIds,ip+'/partId');if(!Object.hasOwn(value,'open')&&!Object.hasOwn(value,'locked'))failParts('INVALID_INITIAL_OVERRIDE',ip,'Supply an explicit supported initial setting.');for(const key of ['open','locked'])if(Object.hasOwn(value,key))boolean(value[key],ip+'/'+key);}
    if(!['functional','decorative'].includes(instance.mode))failParts('UNSUPPORTED_PART_MODE',path+'/mode','Choose functional or explicitly decorative mode.');list(instance.children,PARTS_LIMITS.instances,path+'/children');instance.children.forEach((child,index)=>visit(child,path+'/children/'+index,depth+1));
  };
  data.instances.forEach((instance,index)=>visit(instance,'/instances/'+index,1));const connectionIds=new Set();
  for(const [index,connection]of data.connections.entries()){const path='/connections/'+index;fields(connection,['id','kind','from','to'],path);identifier(connection.id,path+'/id');duplicate(connection.id,connectionIds,path+'/id');if(!['door-aperture','stair-from','stair-to'].includes(connection.kind))failParts('UNSUPPORTED_CONNECTION',path+'/kind','Choose a typed door aperture or stair landing connection.');for(const key of ['from','to']){if(key==='to'&&connection[key]===null)continue;fields(connection[key],['instanceId','partId'],path+'/'+key);shortId(connection[key].instanceId,24,path+'/'+key+'/instanceId');shortId(connection[key].partId,32,path+'/'+key+'/partId');}}
  return data;
}
function checked(run){try{return run();}catch(error){if(error instanceof PartsError)throw error;const diagnostic=error.diagnostics?.[0];failParts(error.code||'INVALID_PARTS_DATA',diagnostic?.path||'/',diagnostic?.message||error.message,'Correct this exact authored field before compiling or loading a replacement.');}}
export function openPartDefinition(input){return checked(()=>definitionData(input));}
export function openPartsDocument(input){return checked(()=>documentData(input));}
export function createPartsDocument(options){const data=partsInput(options);fields(data,['world','instances','connections'],'/options',['world']);return openPartsDocument({kind:PARTS_CONTRACT.schemaId,version:1,profileId:PARTS_CONTRACT.profileId,revision:0,world:data.world,instances:Object.hasOwn(data,'instances')?data.instances:[],connections:Object.hasOwn(data,'connections')?data.connections:[]});}
export const serializePartsDocument=input=>canonical(openPartsDocument(input));
