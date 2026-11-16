export function plain(value,depth=0,budget={nodes:0}) {
  if(++budget.nodes>250000||depth>24)throw Error('Plain data exceeds its bounded size/depth.');
  if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
  if(typeof value==='string'&&value.length<=4000000)return value;
  if(!value||typeof value!=='object'||!(Array.isArray(value)?Object.getPrototypeOf(value)===Array.prototype:[Object.prototype,null].includes(Object.getPrototypeOf(value))))throw Error('Use finite plain JSON.');
  const result=Array.isArray(value)?[]:{},keys=Reflect.ownKeys(value);
  if(Array.isArray(value)&&keys.length!==value.length+1)throw Error('Use dense JSON arrays without extra fields.');
  for(const key of keys){if(Array.isArray(value)&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!d.enumerable||!Object.hasOwn(d,'value')||Array.isArray(value)&&!/^(0|[1-9][0-9]*)$/.test(key))throw Error('Use plain data without accessors, symbols or special keys.');
    Object.defineProperty(result,key,{value:plain(d.value,depth+1,budget),writable:true,enumerable:true,configurable:true});}
  if(Array.isArray(value)&&Object.keys(result).length!==value.length)throw Error('Use dense JSON arrays.');
  if(depth===0&&JSON.stringify(result).length>4000000)throw Error('Plain data exceeds four million characters.');return result;
}
export function fields(value,allowed,required=allowed){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(value,k)))throw Error('Unknown or missing record field.');}
export function number(value,min,max){if(!Number.isFinite(value)||value<min||value>max)throw Error('Number outside the declared range.');return value;}
export function id(value){if(typeof value!=='string'||!value||value.length>160||/[\u0000-\u001f]/u.test(value))throw Error('Use a bounded nonempty identity.');return value;}
export function point(value){fields(value,['x','y','h']);Object.values(value).forEach(n=>number(n,-1e6,1e6));return value;}
export function immutable(value){if(value&&typeof value==='object'){Object.values(value).forEach(immutable);Object.freeze(value);}return value;}
export const samePoint=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.h-b.h)<1e-7;
export const abort=signal=>{if(signal?.aborted)throw Object.assign(Error('Preparation cancelled.'),{code:'PREPARATION_CANCELLED'});};
export const receipt=(ok,code=null,reason=null,committed=false)=>({version:1,ok,committed,code,reason});
