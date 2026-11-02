// Finite source-data boundary; borrowed native objects never pass through it.
export function refuse(code,message){const e=new Error(message);e.code=code;throw e;}
export function slots(value,code,allowed,required=allowed){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))refuse(code,'Use an ordinary data record.');
 const d=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(d);
 if(keys.some(k=>typeof k!=='string'||!allowed.includes(k)||!d[k].enumerable||!Object.hasOwn(d[k],'value'))||required.some(k=>!Object.hasOwn(d,k)))refuse(code,'Unknown, missing, hidden or accessor fields are refused.');
 return Object.fromEntries(keys.map(k=>[k,d[k].value]));
}
export function plainCopy(value,{maxNodes=1000000,maxDepth=48}={}){
 let nodes=0;const seen=new Set();
 const copy=(v,depth)=>{
  if(++nodes>maxNodes||depth>maxDepth)refuse('FINISH_DATA_LIMIT','Candidate data exceeds its finite inspection budget.');
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='number'&&Number.isFinite(v))return v;
  if(typeof v==='string'&&v.length<=8192)return v;
  if(!v||typeof v!=='object'||seen.has(v))refuse('FINISH_DATA','Use finite acyclic plain data.');
  const array=Array.isArray(v);if(!array&&![Object.prototype,null].includes(Object.getPrototypeOf(v)))refuse('FINISH_DATA','Native objects are not source data.');
  seen.add(v);const d=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(d),out=array?[]:{};
  if(array&&(!Number.isInteger(d.length?.value)||d.length.value>maxNodes))refuse('FINISH_DATA_LIMIT','Bound source arrays.');
  for(const k of keys){if(array&&k==='length')continue;if(typeof k!=='string'||!d[k].enumerable||!Object.hasOwn(d[k],'value')||array&&!/^(0|[1-9][0-9]*)$/.test(k))refuse('FINISH_DATA','Accessor, hidden, symbol and custom array properties refuse.');Object.defineProperty(out,k,{value:copy(d[k].value,depth+1),enumerable:true,writable:true,configurable:true});}
  if(array&&out.length!==d.length.value||array&&keys.length!==out.length+1)refuse('FINISH_DATA','Sparse arrays refuse.');
  seen.delete(v);return out;
 };return copy(value,0);
}
