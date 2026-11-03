import {tileLayoutToken} from '../../../../../../packages/tiles-core/index.js';
export class AppearanceError extends Error { constructor(code,message=code){super(message);this.name='AppearanceError';this.code=code;} }
export const fail=(code,message)=>{throw new AppearanceError(code,message);};
export const CAPS=Object.freeze({layers:8,storedPerChunk:4096,residentMarks:1024,decodedBytes:32*1024*1024,encodedBytes:64*1024*1024,contributors:8,binReferences:32768,derivedBytes:4*1024*1024,atlasPages:4,materials:64,roots:2,triangles:50000,cells:1024,ledgerRows:1024,traceSteps:64});
export const clone=v=>structuredClone(v);
export const digest=v=>tileLayoutToken(v);
export const same=(a,b)=>digest(a)===digest(b);
export const freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
export function plainData(value,{maxNodes=200000,maxDepth=32,maxBytes=6000000,take=()=>{}}={}){
 let nodes=0,bytes=0;const active=new Set();
 function walk(v,depth){take(1);if(++nodes>maxNodes||depth>maxDepth)fail('DATA_QUOTA');if(v===null||typeof v==='boolean')return v;if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('DATA_NUMBER');return v;}if(typeof v==='string'){take(Math.ceil(v.length/16));bytes+=v.length*3;if(bytes>maxBytes*3)fail('DATA_BYTES');return v;}if(!v||typeof v!=='object'||active.has(v))fail('DATA_PROFILE');const array=Array.isArray(v);if(!array&&![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('DATA_PROFILE');const keys=Reflect.ownKeys(v),out=array?[]:{};if(keys.length>maxNodes)fail('DATA_QUOTA');active.add(v);for(const k of keys){if(array&&k==='length')continue;const d=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||!d?.enumerable||!Object.hasOwn(d,'value')||array&&!/^(0|[1-9][0-9]*)$/.test(k))fail('DATA_DESCRIPTOR');Object.defineProperty(out,k,{value:walk(d.value,depth+1),enumerable:true,writable:true,configurable:true});}if(array&&(out.length!==v.length||Object.keys(out).length!==v.length))fail('DATA_ARRAY');active.delete(v);return out;}
 const out=walk(value,0);if(new TextEncoder().encode(JSON.stringify(out)).byteLength>maxBytes)fail('DATA_BYTES');return out;
}
export function finite(v,label,lo=-1000000,hi=1000000){if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)fail('NUMBER_PROFILE',label);return v;}
export function integer(v,label,lo=0,hi=Number.MAX_SAFE_INTEGER){finite(v,label,lo,hi);if(!Number.isSafeInteger(v))fail('INTEGER_PROFILE',label);return v;}
export function vector(v,n,label){if(!Array.isArray(v)||v.length!==n)fail('VECTOR_PROFILE',label);v.forEach(x=>finite(x,label));return v;}
export function checkCurrent(current,signal){if(signal?.aborted)fail('CANCELLED');if(typeof current!=='function'||current()!==true)fail('STALE_OWNER');if(signal?.aborted)fail('CANCELLED');}
export const pinKey=p=>p?.id+':'+p?.revision+':'+p?.contentDigest;
export const surfaceKey=s=>s.ownerId+'/'+s.surfaceId+'/'+s.floorId;
