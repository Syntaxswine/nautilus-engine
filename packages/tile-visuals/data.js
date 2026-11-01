// Presentation input guard, not a second core validator. Read descriptors before
// caller values; never invoke accessors or toJSON while copying plain data.
const fail=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
export function recordSlots(value,code='PRESENTATION_OPTIONS',allowed=null){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail(code,'Use a plain options/binding record.');
 const keys=Reflect.ownKeys(value);if(keys.length>32)fail(code,'Options/binding record exceeds its field budget.');const result=Object.create(null);
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!d?.enumerable||!('value'in d)||allowed&&!allowed.includes(key))fail(code,'Use supported enumerable data fields, without getters or hidden/symbol fields.');Object.defineProperty(result,key,{value:d.value,enumerable:true});}
 return result;
}
export function arraySlots(value,maxLength=8192,code='PRESENTATION_OPTIONS'){
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail(code,'Use a plain binding array.');const length=Object.getOwnPropertyDescriptor(value,'length');if(!length||!('value'in length)||length.value>maxLength)fail(code,'Binding array exceeds its explicit budget.');const keys=Reflect.ownKeys(value);if(keys.length!==length.value+1)fail(code,'Use a dense binding array without extra fields.');const out=[];
 for(let i=0;i<length.value;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d?.enumerable||!('value'in d))fail(code,'Use data elements, never getters or sparse arrays.');out.push(d.value);}return out;
}
export function copyPlainData(input,{code='DETACHED_PROJECTION',maxNodes=2000000,maxDepth=64,maxStringUnits=16000000}={}){
 let nodes=0,stringUnits=0;const active=new Set();
 function copy(value,depth){if(++nodes>maxNodes||depth>maxDepth)fail(code,'Plain input exceeds its node/depth budget.');if(typeof value==='string'){stringUnits+=value.length;if(value.length>4000000||stringUnits>maxStringUnits)fail(code,'Plain strings exceed their individual/aggregate budget.');return value;}if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
  if(!value||typeof value!=='object'||active.has(value)||![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)))fail(code,'Use finite acyclic plain data, never callbacks or copied kernel handles.');
  const array=Array.isArray(value),length=array?Object.getOwnPropertyDescriptor(value,'length'):null;if(array&&(!length||!('value'in length)||length.value>maxNodes-nodes))fail(code,'Plain array exceeds its explicit budget.');const keys=Reflect.ownKeys(value);if(keys.length>maxNodes-nodes+1)fail(code,'Plain record exceeds its field budget.');const result=array?[]:Object.create(null);active.add(value);let count=0;
  for(const key of keys){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!d?.enumerable||!('value'in d)||array&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=length.value))fail(code,'Use enumerable data fields without getters, hidden fields or symbols.');stringUnits+=key.length;if(stringUnits>maxStringUnits)fail(code,'Plain keys/strings exceed their aggregate budget.');Object.defineProperty(result,key,{value:copy(d.value,depth+1),enumerable:true,writable:true,configurable:true});count++;}
  if(array&&count!==length.value)fail(code,'Use dense plain arrays.');active.delete(value);if(!array&&Object.hasOwn(result,'kind')&&result.kind==='nautilus-tile-catalogue')fail(code,'Kernel catalogue handles are not portable presentation data.');return result;
 }
 return copy(input,0);
}
