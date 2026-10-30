// Engine-owned bounded data boundary. No callbacks, IO, renderer or host state.
export class WindowGeometryError extends TypeError {
  constructor(code,path,message){super(message);this.name='WindowGeometryError';this.code=code;this.path=path;this.diagnostics=[{code,path,message,action:'Preserve the accepted scene; supply explicit supported ground-window geometry and host facts.'}];}
}
export const fail=(...args)=>{throw new WindowGeometryError(...args);};
export const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const pointer=key=>key.replaceAll('~','~0').replaceAll('/','~1');
export function data(input){
  const maximumBytes=8000000,active=new Set();let nodes=0,textSize=0;
  if(typeof input==='string'){if(new TextEncoder().encode(input).length>maximumBytes)fail('STATE_LIMIT','/','Input exceeds 8 MB.');try{input=JSON.parse(input);}catch{fail('INVALID_JSON','/','Malformed JSON.');}}
  function copy(value,path,depth){
    if(++nodes>500000||depth>24)fail('STATE_LIMIT',path,'Input exceeds its node/depth budget.');
    if(value===null||typeof value==='boolean')return value;
    if(typeof value==='number'&&Number.isFinite(value)&&!Object.is(value,-0))return value;
    if(typeof value==='string'){textSize+=value.length;if(textSize>maximumBytes)fail('STATE_LIMIT',path,'Text exceeds its budget.');return value;}
    if(typeof value!=='object'||active.has(value))fail('INVALID_DATA',path,'Use finite acyclic plain data, without negative zero.');
    const array=Array.isArray(value);if(!array&&!plain(value))fail('INVALID_DATA',path,'Use plain records or dense arrays.');
    if(array&&value.length>65536)fail('STATE_LIMIT',path,'Array exceeds the input bound.');
    const keys=Reflect.ownKeys(value);
    for(const key of keys){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);
      if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||key==='__proto__'||array&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=value.length))fail('INVALID_DATA',path,'Accessors, symbols, hidden properties and exotic keys are unsupported.');
      textSize+=key.length;if(textSize>maximumBytes)fail('STATE_LIMIT',path,'Keys exceed the text budget.');
    }
    active.add(value);const result=array?[]:{};
    if(array){for(let i=0;i<value.length;i++){if(!Object.hasOwn(value,i))fail('INVALID_DATA',path,'Sparse arrays are unsupported.');result.push(copy(Object.getOwnPropertyDescriptor(value,String(i)).value,path+'/'+i,depth+1));}}
    else for(const key of keys)Object.defineProperty(result,key,{value:copy(Object.getOwnPropertyDescriptor(value,key).value,path+'/'+pointer(key),depth+1),enumerable:true,writable:true,configurable:true});
    active.delete(value);return result;
  }
  const result=copy(input,'',0);if(new TextEncoder().encode(JSON.stringify(result)).length>maximumBytes)fail('STATE_LIMIT','/','Input exceeds its complete byte budget.');return result;
}
export function fields(value,allowed,path,required=allowed){if(!plain(value))fail('INVALID_RECORD',path,'Expected a plain record.');for(const key of Object.keys(value))if(!allowed.includes(key))fail('UNKNOWN_FIELD',path+'/'+pointer(key),'Unsupported field.');for(const key of required)if(!Object.hasOwn(value,key))fail('MISSING_FIELD',path+'/'+key,'Missing required field.');return value;}
export function finite(value,path){if(typeof value!=='number'||!Number.isFinite(value)||Object.is(value,-0)||!Number.isFinite(Math.fround(value*4)))fail('INVALID_NUMBER',path,'Use a finite number with float-buffer headroom.');return value;}
export function integer(value,min,max,path){finite(value,path);if(!Number.isSafeInteger(value)||value<min||value>max)fail('INVALID_INTEGER',path,'Use a safe integer in the documented range.');return value;}
export function id(value,path,max=96){if(typeof value!=='string'||value.length>max||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*(?![\s\S])/.test(value))fail('INVALID_ID',path,'Use an explicit bounded ASCII identity.');return value;}
export function bool(value,path){if(typeof value!=='boolean')fail('INVALID_BOOLEAN',path,'Use a boolean.');return value;}
export function list(value,max,path){if(!Array.isArray(value)||value.length>max)fail('INVALID_LIST',path,'Use a bounded dense array.');return value;}
export function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const clone=value=>structuredClone(value);
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
