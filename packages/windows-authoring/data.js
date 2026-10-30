// Authoring-only bounded JSON. Inspect descriptors before copying or invoking
// any provider/legacy validator; retain unknown base values and key order.
export const AUTHORING_LIMITS=Object.freeze({bytes:8_000_000,nodes:500_000,depth:24,baseBytes:4_000_000,placements:1024});
export class WindowAuthoringError extends TypeError {
  constructor(code,path,reason,action='Preserve accepted authoring, history and preview; correct this field before retrying.') {
    super(reason);this.name='WindowAuthoringError';this.code=code;this.path=path;this.diagnostics=[{code,path,reason,action}];
  }
}
export const fail=(...args)=>{throw new WindowAuthoringError(...args);};
export const pointer=key=>key.replaceAll('~','~0').replaceAll('/','~1');
export const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
export function encode(value) {
  if(typeof value==='number')return Object.is(value,-0)?'-0':JSON.stringify(value);
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(encode).join(',')+']';
  return '{'+Object.keys(value).map(key=>JSON.stringify(key)+':'+encode(value[key])).join(',')+'}';
}
export const bytes=value=>new TextEncoder().encode(value).length;
export function boundedData(input) {
  if(typeof input==='string') {
    if(bytes(input)>AUTHORING_LIMITS.bytes)fail('AUTHORING_LIMIT','/','Authoring exceeds 8,000,000 UTF-8 bytes.');
    try{input=JSON.parse(input);}catch{fail('AUTHORING_INVALID_JSON','/','Supply a complete JSON authoring envelope.');}
  }
  const active=new Set();let nodes=0,textSize=0;
  function copy(value,path,depth) {
    if(++nodes>AUTHORING_LIMITS.nodes||depth>AUTHORING_LIMITS.depth)fail('AUTHORING_LIMIT',path,'Authoring exceeds its aggregate node/depth budget.');
    if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
    if(typeof value==='string'){textSize+=value.length;if(textSize>AUTHORING_LIMITS.bytes)fail('AUTHORING_LIMIT',path,'Text exceeds its budget.');return value;}
    if(typeof value!=='object'||active.has(value)||!Array.isArray(value)&&!plain(value))fail('AUTHORING_INVALID_DATA',path,'Use finite acyclic plain JSON data.');
    const array=Array.isArray(value),keys=Reflect.ownKeys(value);
    if(keys.length>AUTHORING_LIMITS.nodes||array&&value.length>65536)fail('AUTHORING_LIMIT',path,'Record/array exceeds the input bound.');
    for(const key of keys) {
      if(array&&key==='length')continue;
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(typeof key!=='string'||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')||array&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=value.length))fail('AUTHORING_INVALID_DATA',path,'Accessors, hidden fields, symbols and exotic array properties are unsupported.');
      textSize+=key.length;if(textSize>AUTHORING_LIMITS.bytes)fail('AUTHORING_LIMIT',path,'Keys exceed the text budget.');
    }
    active.add(value);const result=array?[]:{};
    if(array)for(let i=0;i<value.length;i++){if(!Object.hasOwn(value,i))fail('AUTHORING_INVALID_DATA',path,'Sparse arrays are unsupported.');result.push(copy(Object.getOwnPropertyDescriptor(value,String(i)).value,path+'/'+i,depth+1));}
    else for(const key of keys)Object.defineProperty(result,key,{value:copy(Object.getOwnPropertyDescriptor(value,key).value,path+'/'+pointer(key),depth+1),enumerable:true,writable:true,configurable:true});
    active.delete(value);return result;
  }
  const result=copy(input,'',0);if(bytes(encode(result))>AUTHORING_LIMITS.bytes)fail('AUTHORING_LIMIT','/','Authoring exceeds 8,000,000 UTF-8 bytes.');return result;
}
export function fields(value,allowed,path,required=allowed) {
  if(!plain(value))fail('AUTHORING_INVALID_RECORD',path,'Expected a plain record.');
  for(const key of Object.keys(value))if(!allowed.includes(key))fail('AUTHORING_UNKNOWN_FIELD',path+'/'+pointer(key),'Unknown authoring field.');
  for(const key of required)if(!Object.hasOwn(value,key))fail('AUTHORING_MISSING_FIELD',path+'/'+key,'Required authoring field is absent.');
}
export function identity(value,path,max=96) {if(typeof value!=='string'||value.length>max||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*(?![\s\S])/.test(value))fail('AUTHORING_INVALID_ID',path,'Supply a bounded explicit ASCII identity.');}
export function finite(value,path) {if(typeof value!=='number'||!Number.isFinite(value)||Object.is(value,-0))fail('AUTHORING_INVALID_NUMBER',path,'Use an explicit finite native metre value.');}
export function integer(value,min,max,path) {finite(value,path);if(!Number.isSafeInteger(value)||value<min||value>max)fail('AUTHORING_INVALID_INTEGER',path,'Use an integer within the supported range.');}
export function freeze(value) {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function failure(error) {
  const own=error instanceof WindowAuthoringError;
  return {ok:false,code:own?error.code:'AUTHORING_REJECTED',reason:own?error.message:'Authoring validation/preparation failed.',diagnostics:own?structuredClone(error.diagnostics):[{code:'AUTHORING_REJECTED',path:'/',reason:'Authoring validation/preparation failed.',action:'Preserve accepted state and correct the candidate.'}]};
}
