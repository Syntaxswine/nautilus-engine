import {fail,current} from './policy.mjs';
import {createHash} from '../../art/c2-runtime/sha256.mjs';
export function utf8Length(text){let n=0;for(const c of text){const v=c.codePointAt(0);n+=v<128?1:v<2048?2:v<65536?3:4;}return n;}
export function copyData(value,{take=()=>{},bytes=()=>{},maxNodes=200000,maxDepth=32,maxBytes=6000000}={}){
 let nodes=0,characters=0;const active=new Set();
 function walk(v,depth){take();if(++nodes>maxNodes||depth>maxDepth)fail('DATA_QUOTA');if(v===null||typeof v==='boolean')return v;if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('DATA_NUMBER');return v;}if(typeof v==='string'){characters+=v.length;take(Math.ceil(v.length/16));if(characters>maxBytes)fail('DATA_BYTES');return v;}if(!v||typeof v!=='object'||active.has(v))fail('DATA_PROFILE');const array=Array.isArray(v);if(array?Object.getPrototypeOf(v)!==Array.prototype:![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('DATA_PROFILE');const keys=Reflect.ownKeys(v),out=array?[]:{};if(keys.length>maxNodes)fail('DATA_QUOTA');active.add(v);for(const k of keys){if(array&&k==='length')continue;const d=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||!d?.enumerable||!Object.hasOwn(d,'value')||array&&!/^(0|[1-9][0-9]*)$/.test(k))fail('DATA_DESCRIPTOR');characters+=k.length;if(characters>maxBytes)fail('DATA_BYTES');Object.defineProperty(out,k,{value:walk(d.value,depth+1),enumerable:true,writable:true,configurable:true});}if(array&&(out.length!==v.length||Object.keys(out).length!==v.length))fail('DATA_ARRAY');active.delete(v);return out;}
 const out=walk(value,0),n=utf8Length(JSON.stringify(out));if(n>maxBytes)fail('DATA_BYTES');bytes(n);return out;
}
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
// Uses ONE actual 512-byte owner-held store for BOTH SHA scratch (352 bytes)
// and streaming UTF-8 (128 bytes). No whole-string TextEncoder allocation.
export function createDataTools(slab,getWork){
 const plainData=(v,opts={})=>copyData(v,{take:getWork()?.take,bytes:getWork()?.metadataCopy,...opts});
 function digest(value){const work=getWork(),v=plainData(value),text=canonical(v);let cursor=0,used=0;const utf8=new Uint8Array(slab.buffer,384,128),h=createHash('sha256',{alloc(Type,arg){const n=typeof arg==='number'?arg:arg.length,start=Math.ceil(cursor/Type.BYTES_PER_ELEMENT)*Type.BYTES_PER_ELEMENT;if(start+n*Type.BYTES_PER_ELEMENT>352)fail('HASH_SCRATCH_LIMIT');const a=new Type(slab.buffer,start,n);cursor=start+n*Type.BYTES_PER_ELEMENT;if(typeof arg!=='number')a.set(arg);return a;}});
  function emit(n){utf8[used++]=n;if(used===128){h.update(utf8);used=0;}}
  for(const c of text){let n=c.codePointAt(0);if(n>=0xd800&&n<=0xdfff)n=0xfffd;if(n<128)emit(n);else if(n<2048){emit(192|(n>>6));emit(128|(n&63));}else if(n<65536){emit(224|(n>>12));emit(128|((n>>6)&63));emit(128|(n&63));}else{emit(240|(n>>18));emit(128|((n>>12)&63));emit(128|((n>>6)&63));emit(128|(n&63));}}
  if(used)h.update(utf8.subarray(0,used));work?.bytes(utf8Length(text));return h.digest('hex');
 }
 return Object.freeze({plainData,digest,same:(a,b)=>digest(a)===digest(b)});
}
