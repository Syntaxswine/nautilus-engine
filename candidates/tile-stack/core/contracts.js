// Private Gate A host helper. The caller supplies the actual public ./tiles core.
export const STACK_PROFILE='nautilus-rectangle-stack-intent-v1';
export const STACK_PLANNER_LIMITS=Object.freeze({maxPlannerWork:1000000,maxPlannerBytes:4000000,maxSteps:256,maxClosure:32,maxSpatialTests:100000,maxGeometryWork:100000,neighbourRadiusM:1000});
export class StackPlanError extends TypeError{
  constructor(code,path,message,details={}){super(message);this.name='StackPlanError';this.code=code;this.diagnostics=[{code,path,message,action:'Retain accepted source/history; supply the named supported intent or capability.',...details}];}
}
export const fail=(...args)=>{throw new StackPlanError(...args);};
export const plain=v=>v!==null&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
export const clone=v=>structuredClone(v);
export const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function copyData(value){
  if(typeof value==='string'){if(value.length>4000000)fail('STACK_INPUT_LIMIT','/','Input exceeds the inherited 4 MB bound.');try{value=JSON.parse(value);}catch{fail('STACK_INVALID_JSON','/','Supply valid JSON.');}}
  let nodes=0,chars=0;const active=new Set();
  function copy(v,path,depth){
    if(++nodes>200000||depth>32)fail('STACK_INPUT_LIMIT',path,'Input exceeds bounded plain-data nodes/depth.');
    if(v===null||typeof v==='boolean')return v;
    if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('STACK_INVALID_DATA',path,'Use finite numbers without negative zero.');return v;}
    if(typeof v==='string'){chars+=v.length;if(chars>4000000)fail('STACK_INPUT_LIMIT',path,'Input text exceeds its bound.');return v;}
    if(typeof v!=='object'||active.has(v)||!Array.isArray(v)&&!plain(v))fail('STACK_INVALID_DATA',path,'Use acyclic plain JSON data.');
    const arr=Array.isArray(v),keys=Reflect.ownKeys(v);if(arr&&v.length>65536)fail('STACK_INPUT_LIMIT',path,'Array exceeds its inherited bound.');
    for(const key of keys){if(arr&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(v,key);if(typeof key!=='string'||key==='__proto__'||!d.enumerable||!Object.hasOwn(d,'value')||arr&&(!/^(0|[1-9][0-9]*)$/.test(key)||+key>=v.length))fail('STACK_INVALID_DATA',path,'Accessors, symbols, hidden fields and exotic arrays refuse.');chars+=key.length;if(chars>4000000)fail('STACK_INPUT_LIMIT',path,'Input keys exceed their bound.');}
    active.add(v);const out=arr?[]:{};
    if(arr)for(let i=0;i<v.length;i++){if(!Object.hasOwn(v,i))fail('STACK_INVALID_DATA',path,'Sparse arrays refuse.');out.push(copy(v[i],path+'/'+i,depth+1));}
    else for(const key of keys)Object.defineProperty(out,key,{value:copy(v[key],path+'/'+key,depth+1),enumerable:true,configurable:true,writable:true});
    active.delete(v);return out;
  }
  const out=copy(value,'',0);if(new TextEncoder().encode(JSON.stringify(out)).length>4000000)fail('STACK_INPUT_LIMIT','/','Complete serialized input exceeds 4 MB.');return out;
}
export function fields(v,keys,path,required=keys){if(!plain(v))fail('STACK_INVALID_RECORD',path,'Supply a plain record.');for(const key of Object.keys(v))if(!keys.includes(key))fail('STACK_UNKNOWN_FIELD',path+'/'+key,'Unsupported field.');for(const key of required)if(!Object.hasOwn(v,key))fail('STACK_MISSING_FIELD',path+'/'+key,'Required field is absent.');}
export function id(v,path){if(typeof v!=='string'||v.length>96||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*(?![\s\S])/.test(v))fail('STACK_INVALID_ID',path,'Use a stable ASCII identity of at most 96 characters.');return v;}
export function number(v,path,min=-1000000,max=1000000){if(typeof v!=='number'||!Number.isFinite(v)||Object.is(v,-0)||v<min||v>max)fail('STACK_INVALID_NUMBER',path,'Number exceeds its finite bound.');return v;}
export function integer(v,path,min,max){number(v,path,min,max);if(!Number.isSafeInteger(v))fail('STACK_INVALID_INTEGER',path,'Use a safe integer.');return v;}
export function array(v,path,max=128,min=0){if(!Array.isArray(v)||v.length<min||v.length>max)fail('STACK_INVALID_LIST',path,'List exceeds its declared bounds.');return v;}
export function unique(values,path,key=v=>v){const seen=new Set();for(const v of values){const k=key(v);if(seen.has(k))fail('STACK_DUPLICATE_ID',path,'Duplicate identity.');seen.add(k);}}
export function digest(v,path){if(typeof v!=='string'||!/^[a-f0-9]{64}(?![\s\S])/.test(v))fail('STACK_INVALID_DIGEST',path,'Supply a complete SHA-256 token.');return v;}
export function bindCore(core){
  const required=['openTileBundle','createTileCatalogue','compileTileRecipe','validateTileLayout','tileBundle','tileLayoutToken','transformTileRecipe','prepareTileRepair'];const borrowed={};
  for(const key of [...required,'TILE_CONTRACT']){const d=Object.getOwnPropertyDescriptor(core??{},key);if(!d||!Object.hasOwn(d,'value')||required.includes(key)&&typeof d.value!=='function')fail('STACK_PUBLIC_CORE_REQUIRED','/core/'+key,'Borrow the actual public v1 tiles core.');borrowed[key]=d.value;}
  if(borrowed.TILE_CONTRACT.version!==1||borrowed.TILE_CONTRACT.positionPolicy!=='metres-q1e6-v1')fail('STACK_PUBLIC_CORE_REQUIRED','/core','Use the reviewed public v1 contract.');return borrowed;
}
export function validateConstraints(input){
  const c=copyData(input);fields(c,['kind','version','floorProfileId','minimumClearanceM','owners','managedRelations'],'/constraints');
  if(c.kind!=='nautilus-stack-constraints'||c.version!==1)fail('STACK_CONSTRAINT_VERSION','/constraints','Use explicit stack constraints v1.');id(c.floorProfileId,'/constraints/floorProfileId');number(c.minimumClearanceM,'/constraints/minimumClearanceM',.000001,100000);if(Math.round(c.minimumClearanceM*1000000)<1)fail('STACK_CLEARANCE_REQUIRED','/constraints','A stack needs an explicit positive minimum clearance.');
  array(c.owners,'/constraints/owners');for(const v of c.owners){fields(v,['instanceId','primaryReservationId'],'/constraints/owners');id(v.instanceId,'/constraints/owners/instanceId');id(v.primaryReservationId,'/constraints/owners/primaryReservationId');}unique(c.owners,'/constraints/owners',v=>v.instanceId);
  array(c.managedRelations,'/constraints/managedRelations',256);for(const r of c.managedRelations){fields(r,['id','kind','a','b','clearanceM'],'/constraints/managedRelations');for(const key of ['id','a','b'])id(r[key],'/constraints/managedRelations/'+key);if(r.kind!=='cross'||r.a===r.b)fail('STACK_INVALID_RELATION','/constraints/managedRelations','Managed relations are actual distinct-owner crossings.');number(r.clearanceM,'/constraints/managedRelations/clearanceM',c.minimumClearanceM,100000);}unique(c.managedRelations,'/constraints/managedRelations',r=>r.id);return c;
}
export function validateContext(input){
  const c=copyData(input);fields(c,['contextToken','cancelled','floorProfile','sourceConstraintsDigest'],'/context');digest(c.contextToken,'/context/contextToken');digest(c.sourceConstraintsDigest,'/context/sourceConstraintsDigest');if(typeof c.cancelled!=='boolean')fail('STACK_INVALID_CANCELLATION','/context/cancelled','Capture cancellation as a boolean.');fields(c.floorProfile,['id','version','floors'],'/context/floorProfile');id(c.floorProfile.id,'/context/floorProfile/id');if(c.floorProfile.version!==1)fail('STACK_FLOOR_PROFILE_VERSION','/context/floorProfile/version','Use floor profile version1.');array(c.floorProfile.floors,'/context/floorProfile/floors',64,1);for(const f of c.floorProfile.floors){fields(f,['id','elevationM'],'/context/floorProfile/floors');id(f.id,'/context/floorProfile/floors/id');number(f.elevationM,'/context/floorProfile/floors/elevationM');}unique(c.floorProfile.floors,'/context/floorProfile/floors',f=>f.id);return c;
}
export function validateLimits(input){const l=copyData(input);fields(l,Object.keys(STACK_PLANNER_LIMITS),'/limits');for(const [key,max]of Object.entries(STACK_PLANNER_LIMITS))if(key==='neighbourRadiusM')number(l[key],'/limits/'+key,0,max);else integer(l[key],'/limits/'+key,1,max);return l;}
export function validateExpected(input){const e=copyData(input);fields(e,['revision','layoutDigest','catalogueDigest','contextToken','sourceConstraintsDigest','floorProfileDigest'],'/expected');integer(e.revision,'/expected/revision',0,Number.MAX_SAFE_INTEGER);for(const key of ['layoutDigest','catalogueDigest','contextToken','sourceConstraintsDigest','floorProfileDigest'])digest(e[key],'/expected/'+key);return e;}
