// Pure bounded data; saved intent is copied exactly, never snapped in place.
import {sha256} from '../parts-core/hash.js';
export class TileError extends TypeError {
  constructor(code,path,message,details={}){super(message);this.name='TileError';this.code=code;this.path=path;this.diagnostics=[{code,path,message,action:'Preserve the accepted layout and supply a supported explicit tile contract.',...details}];}
}
export const fail=(...args)=>{throw new TileError(...args);};
export const plain=v=>v!==null&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
export const clone=v=>structuredClone(v);
export function data(input){
  if(typeof input==='string'){if(input.length>4000000)fail('SIZE_LIMIT','/','Tile input exceeds 4 MB.');try{input=JSON.parse(input);}catch{fail('INVALID_JSON','/','Malformed tile JSON.');}}
  let nodes=0,chars=0;const active=new Set();
  function copy(v,p,d){
    if(++nodes>200000||d>32)fail('SIZE_LIMIT',p,'Tile data exceeds its node/depth budget.');
    if(v===null||typeof v==='boolean')return v;
    if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('INVALID_NUMBER',p,'Use finite numbers without negative zero.');return v;}
    if(typeof v==='string'){chars+=v.length;if(chars>4000000)fail('SIZE_LIMIT',p,'Tile text exceeds 4 MB.');return v;}
    if(typeof v!=='object'||active.has(v)||!Array.isArray(v)&&!plain(v))fail('INVALID_DATA',p,'Use acyclic plain JSON data.');
    const array=Array.isArray(v),keys=Reflect.ownKeys(v);if(array&&v.length>65536)fail('SIZE_LIMIT',p,'Array exceeds 65,536 entries.');
    for(const k of keys){if(array&&k==='length')continue;const q=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||k==='__proto__'||!q.enumerable||!Object.hasOwn(q,'value')||array&&(!/^(0|[1-9][0-9]*)$/.test(k)||+k>=v.length))fail('INVALID_DATA',p,'Accessors, hidden fields, symbols and exotic arrays are unsupported.');chars+=k.length;if(chars>4000000)fail('SIZE_LIMIT',p,'Tile keys exceed the text budget.');}
    active.add(v);const out=array?[]:{};
    if(array)for(let i=0;i<v.length;i++){if(!Object.hasOwn(v,i))fail('INVALID_DATA',p,'Sparse arrays are unsupported.');out.push(copy(v[i],p+'/'+i,d+1));}
    else for(const k of keys)Object.defineProperty(out,k,{value:copy(v[k],p+'/'+k,d+1),enumerable:true,configurable:true,writable:true});
    active.delete(v);return out;
  }
  const out=copy(input,'',0);if(new TextEncoder().encode(JSON.stringify(out)).length>4000000)fail('SIZE_LIMIT','/','Serialized tile data exceeds 4 MB.');return out;
}
export function fields(v,allowed,p,required=allowed){if(!plain(v))fail('INVALID_RECORD',p,'Expected a plain record.');for(const k of Object.keys(v))if(!allowed.includes(k))fail('UNKNOWN_FIELD',p+'/'+k,'Unsupported field.');for(const k of required)if(!Object.hasOwn(v,k))fail('MISSING_FIELD',p+'/'+k,'Required field is absent.');return v;}
export function number(v,p,min=-1000000,max=1000000){if(typeof v!=='number'||!Number.isFinite(v)||Object.is(v,-0)||v<min||v>max)fail('INVALID_NUMBER',p,'Number is outside the declared finite range.');return v;}
export function integer(v,p,min=0,max=65536){number(v,p,min,max);if(!Number.isSafeInteger(v))fail('INVALID_INTEGER',p,'Use a safe integer.');return v;}
export function id(v,p){if(typeof v!=='string'||v.length>96||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*(?![\s\S])/.test(v))fail('INVALID_ID',p,'Use a bounded stable ASCII identity.');return v;}
export function array(v,p,max=256,min=0){if(!Array.isArray(v)||v.length>max||v.length<min)fail('INVALID_LIST',p,'List is outside its declared bounds.');return v;}
export function choice(v,values,p){if(!values.includes(v))fail('UNSUPPORTED_VALUE',p,'Choose an explicit supported value: '+values.join(', '));return v;}
export function unique(values,p,key=null){const seen=new Set();for(const [i,v]of values.entries()){if(key&&!plain(v))fail('INVALID_RECORD',p+'/'+i,'Expected a plain identity-bearing record.');const k=key?key(v):v;if(seen.has(k))fail('DUPLICATE_ID',p+'/'+i,'Duplicate identity or entry.');seen.add(k);}return values;}
export const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':plain(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export const token=v=>sha256(canonical(v));
export function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export function digest(v,p){if(typeof v!=='string'||!/^[a-f0-9]{64}(?![\s\S])/.test(v))fail('INVALID_DIGEST',p,'Use an exact SHA-256 digest.');return v;}
