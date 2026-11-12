export function data(value,depth=0,budget={nodes:0}) {
  if(++budget.nodes>8192||depth>18)throw new TypeError('Plain data exceeds the player UI budget.');
  if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
  if(typeof value==='string'&&value.length<=8192)return value;
  if(!value||typeof value!=='object'||(!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value))))throw new TypeError('Use plain JSON data.');
  const result=Array.isArray(value)?[]:{};
  if(Array.isArray(value)&&value.length>256)throw new TypeError('Player UI lists are bounded at256 entries.');
  for(const key of Reflect.ownKeys(value)) {
    if(Array.isArray(value)&&key==='length')continue;
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw new TypeError('Use enumerable data fields without accessors.');
    if(Array.isArray(value)&&!/^(0|[1-9][0-9]*)$/.test(key))throw new TypeError('Use dense JSON arrays.');
    Object.defineProperty(result,key,{value:data(descriptor.value,depth+1,budget),enumerable:true,writable:true,configurable:true});
  }
  if(Array.isArray(value)&&Object.keys(result).length!==value.length)throw new TypeError('Sparse arrays are unsupported.');
  return result;
}
export function frozen(value) {if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
export const issue=(code,path,message,action)=>({code,path,message,action});
export const refusal=(code,reason)=>({version:1,ok:false,committed:false,code,reason});
export function exact(value,keys) {return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k));}
