import {FARMYARD_DOOR_CONTRACT as C} from './profile.js';
export class FarmyardDoorError extends TypeError{constructor(code,path,message,action='Preserve the current host/door state and use the documented single-ground-leaf profile.'){super(message);this.name='FarmyardDoorError';this.code=code;this.path=path;this.diagnostics=[{code,path,message,action}];}}
export const fail=(...args)=>{throw new FarmyardDoorError(...args);};
export const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
export const pointer=key=>key.replaceAll('~','~0').replaceAll('/','~1');
export const utf8=text=>new TextEncoder().encode(text).length;
export function fields(value,allowed,path,required=allowed){if(!plain(value))fail('INVALID_RECORD',path,'Expected a plain record.');for(const key of Object.keys(value))if(!allowed.includes(key))fail('UNKNOWN_FIELD',path+'/'+pointer(key),'Unsupported field: '+key+'.');for(const key of required)if(!Object.hasOwn(value,key))fail('MISSING_FIELD',path+'/'+key,'Missing field: '+key+'.');return value;}
export function finite(value,min,max,path){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail('INVALID_NUMBER',path,'Expected a finite number from '+min+' to '+max+'.');return value;}
export function integer(value,min,max,path){finite(value,min,max,path);if(!Number.isSafeInteger(value))fail('INVALID_INTEGER',path,'Expected a safe integer.');return value;}
export function text(value,max,path){if(typeof value!=='string'||!value.length||value.length>max)fail('INVALID_TEXT',path,'Expected nonempty bounded text.');return value;}
export function id(value,path){if(Number.isSafeInteger(value)||typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,95}(?![\s\S])/.test(value))return value;fail('INVALID_ID',path,'Expected a bounded ASCII string or safe integer identity; types are preserved.');}
export function stringId(value,path){id(value,path);if(typeof value!=='string')fail('INVALID_ID',path,'This source identity must be a string.');return value;}
export function bool(value,path){if(typeof value!=='boolean')fail('INVALID_BOOLEAN',path,'Expected a boolean.');return value;}
export function list(value,max,path){if(!Array.isArray(value)||value.length>max)fail('INVALID_LIST',path,'Expected a bounded dense array.');return value;}
export function xy(value,path){fields(value,['x','y'],path);finite(value.x,-10000,10000,path+'/x');finite(value.y,-10000,10000,path+'/y');return value;}
export function data(input,{sets=false}={}){
  if(typeof input==='string'){if(input.length>C.maximumBytes||utf8(input)>C.maximumBytes)fail('STATE_LIMIT','/','Door data exceeds its byte budget.');try{input=JSON.parse(input);}catch{fail('INVALID_JSON','/','Malformed door JSON.');}}
  const active=new Set();let nodes=0,textSize=0;
  function copy(value,path,depth){
    if(++nodes>C.maximumNodes||depth>C.maximumDepth)fail('STATE_LIMIT',path,'Door data exceeds its node/depth budget.');
    if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
    if(typeof value==='string'){textSize+=value.length;if(textSize>C.maximumBytes)fail('STATE_LIMIT',path,'Door text exceeds its byte budget.');return value;}
    if(typeof value!=='object'||active.has(value))fail('INVALID_DATA',path,'Pass finite, acyclic plain data.');
    const array=Array.isArray(value),set=sets&&['/seen','/visible','/detected'].includes(path)&&Object.getPrototypeOf(value)===Set.prototype;
    if(!array&&!set&&!plain(value))fail('INVALID_DATA',path,'Pass plain data; only intrinsic source sets are accepted by projection.');
    if(array&&value.length>65536)fail('STATE_LIMIT',path,'Array exceeds the input bound.');
    const keys=Reflect.ownKeys(value);for(const key of keys){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||['__proto__','prototype','constructor'].includes(key)||array&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=value.length)||set)fail('INVALID_DATA',path,'Accessors, functions, symbols, hidden fields and non-data properties are unsupported.');textSize+=key.length;}
    if(textSize>C.maximumBytes)fail('STATE_LIMIT',path,'Field names exceed the text budget.');active.add(value);let result;
    if(set){result=[];for(const item of Set.prototype.values.call(value)){if(result.length>=65536)fail('STATE_LIMIT',path,'Source set exceeds the input bound.');result.push(copy(item,path+'/'+result.length,depth+1));}}
    else if(array){result=[];for(let i=0;i<value.length;i++){if(!Object.hasOwn(value,i))fail('INVALID_DATA',path,'Sparse arrays are unsupported.');result.push(copy(Object.getOwnPropertyDescriptor(value,String(i)).value,path+'/'+i,depth+1));}}
    else{result={};for(const key of keys)Object.defineProperty(result,key,{value:copy(Object.getOwnPropertyDescriptor(value,key).value,path+'/'+pointer(key),depth+1),enumerable:true,writable:true,configurable:true});}
    active.delete(value);return result;
  }
  const result=copy(input,'',0);if(utf8(JSON.stringify(result))>C.maximumBytes)fail('STATE_LIMIT','/','Door data exceeds its complete byte budget.');return result;
}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
export const clone=value=>structuredClone(value);
