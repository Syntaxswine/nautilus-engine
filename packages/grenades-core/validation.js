export class GrenadeCompatibilityError extends TypeError{
 constructor(code,path,message,action='Use the documented static same-plane profile or bind a separately reviewed complete host adapter.'){
  super(message);this.name='GrenadeCompatibilityError';this.code=code;this.path=path;this.diagnostics=[{code,path,message,action}];
 }
 toJSON(){return {name:this.name,diagnostics:this.diagnostics.map(item=>({...item}))};}
}
export const fail=(code,path,message,action)=>{throw new GrenadeCompatibilityError(code,path,message,action);};
export const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
// Inspect every descriptor before any serialization, clone, getter or toJSON call.
export function data(input,{sets=false}={}){
 if(typeof input==='string'){
  if(input.length>8000000||utf8Bytes(input)>8000000)fail('STATE_LIMIT','/','Grenade JSON exceeds 8,000,000 UTF-8 bytes.');
  try{input=JSON.parse(input);}catch{fail('INVALID_JSON','/','Invalid grenade JSON.');}
 }
 let count=0;const active=new Set();
 const copy=(value,path,depth)=>{
  if(++count>500000||depth>24)fail('STATE_LIMIT',path,'Grenade data exceeds its bounded node count or depth.');
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='number'){if(!Number.isFinite(value))fail('INVALID_DATA',path,'Only finite numbers are accepted.');return value;}
  if(typeof value==='string'){if(value.length>1000000)fail('STATE_LIMIT',path,'Data string is too long.');return value;}
  if(typeof value!=='object'||active.has(value))fail('INVALID_DATA',path,'Expected acyclic plain data without functions or undefined.');
  active.add(value);
  try{
   if(sets&&Object.getPrototypeOf(value)===Set.prototype){
    if(Reflect.ownKeys(value).length)fail('INVALID_DATA',path,'Host sets may not carry custom properties.');
    return [...Set.prototype.values.call(value)].map((item,index)=>copy(item,path+'/'+index,depth+1));
   }
   const array=Array.isArray(value);
   if(!array&&!plain(value))fail('INVALID_DATA',path,'Only ordinary records and arrays are accepted.');
   const descriptors=Object.getOwnPropertyDescriptors(value),result=array?[]:{};
   if(array&&value.length>131072)fail('STATE_LIMIT',path,'Array is too long.');
   for(const key of Reflect.ownKeys(descriptors)){
    if(array&&key==='length')continue;
    const entry=descriptors[key];
    if(typeof key!=='string'||key.length>128||['__proto__','prototype','constructor'].includes(key)||!entry.enumerable||!Object.hasOwn(entry,'value'))fail('INVALID_DATA',path,'Only enumerable own data properties are accepted.');
    if(array&&!/^(0|[1-9][0-9]*)$/.test(key))fail('INVALID_DATA',path,'Unexpected array property.');
    Object.defineProperty(result,key,{value:copy(entry.value,path+'/'+key,depth+1),writable:true,enumerable:true,configurable:true});
   }
   if(array&&Object.keys(result).length!==value.length)fail('INVALID_DATA',path,'Sparse arrays are unsupported.');
   return result;
  }finally{active.delete(value);}
 };
 return copy(input,'',0);
}
export function fields(value,allowed,path,required=allowed){
 if(!plain(value))fail('INVALID_RECORD',path,'Expected a plain data record.');
 for(const key of Object.keys(value))if(!allowed.includes(key))fail('UNKNOWN_FIELD',path+'/'+key,'Unknown field: '+key+'.');
 for(const key of required)if(!Object.hasOwn(value,key))fail('MISSING_FIELD',path+'/'+key,'Missing field: '+key+'.');
}
export function finite(value,min,max,path){if(!Number.isFinite(value)||value<min||value>max)fail('INVALID_NUMBER',path,'Number is outside the supported range.');return value;}
export function integer(value,min,max,path){finite(value,min,max,path);if(!Number.isSafeInteger(value))fail('INVALID_INTEGER',path,'Expected a safe integer.');return value;}
export function text(value,max,path){if(typeof value!=='string'||value.length>max)fail('INVALID_TEXT',path,'Expected a bounded string.');return value;}
export function id(value,path){if(typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/.test(value)||Number.isSafeInteger(value))return value;fail('INVALID_ID',path,'Expected a stable bounded string or safe integer ID.');}
export function bool(value,path){if(typeof value!=='boolean')fail('INVALID_BOOLEAN',path,'Expected a boolean.');return value;}
export function list(value,max,path){if(!Array.isArray(value)||value.length>max)fail('INVALID_LIST',path,'Expected a bounded array.');return value;}
export function xy(value,path){fields(value,['x','y','z'],path,['x','y']);finite(value.x,-10000,10000,path+'/x');finite(value.y,-10000,10000,path+'/y');if(Object.hasOwn(value,'z')&&value.z!==0)fail('UNSUPPORTED_FLOOR',path+'/z','Only the explicit ground floor z=0 is supported.');return {x:value.x,y:value.y};}
export const canonical=value=>JSON.stringify(order(value));
function order(value){return Array.isArray(value)?value.map(order):value!==null&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,order(value[key])])):value;}

export function utf8Bytes(text){let size=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)size++;else if(c<2048)size+=2;else if(c>=0xd800&&c<=0xdbff&&text.charCodeAt(i+1)>=0xdc00&&text.charCodeAt(i+1)<=0xdfff){size+=4;i++;}else size+=3;}return size;}
