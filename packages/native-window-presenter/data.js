// Descriptor-first data boundary. Deliberate host references are validated only
// in shallow slots; never recurse into borrowed Three, materials or callbacks.
export class WindowViewError extends TypeError {
  constructor(code,message){super(message);this.name='WindowViewError';this.code=code;}
}
export const fail=(code,message)=>{throw new WindowViewError(code,message);};
export const plain=v=>v!==null&&typeof v==='object'&&[null,Object.prototype].includes(Object.getPrototypeOf(v));
export function slots(input,allowed,required=allowed){
  if(!plain(input))fail('INVALID_RECORD','Use an own plain options record.');
  const out=Object.create(null),keys=Reflect.ownKeys(input);
  if(keys.length>allowed.length)fail('INVALID_DATA','Too many option fields.');
  for(const k of keys){
    const d=Object.getOwnPropertyDescriptor(input,k);
    if(typeof k!=='string'||!allowed.includes(k)||!d.enumerable||!Object.hasOwn(d,'value'))fail('INVALID_DATA','Unknown, hidden, symbol or accessor option.');
    out[k]=d.value;
  }
  if(required.some(k=>!Object.hasOwn(out,k)))fail('MISSING_OPTION','Supply every required own option.');return out;
}
export function copyData(input){
  let nodes=0,text=0;const active=new Set();
  function copy(v,depth){
    if(++nodes>500000||depth>24)fail('DATA_LIMIT','Data exceeds 500000 nodes or depth 24.');
    if(v===null||typeof v==='boolean')return v;
    if(typeof v==='number'&&Number.isFinite(v)&&!Object.is(v,-0))return v;
    if(typeof v==='string'){text+=v.length;if(text>8000000)fail('DATA_LIMIT','Text exceeds 8000000 UTF-16 units.');return v;}
    if(typeof v!=='object'||active.has(v))fail('INVALID_DATA','Use finite, acyclic plain data.');
    const array=Array.isArray(v);if(!array&&!plain(v))fail('INVALID_DATA','Opaque handles and exotic records are not projections.');
    const length=array?Object.getOwnPropertyDescriptor(v,'length')?.value:null;
    if(array&&(!Number.isSafeInteger(length)||length>65536))fail('DATA_LIMIT','Use a bounded dense array.');
    const keys=Reflect.ownKeys(v);
    if(keys.length>(array?length+1:65536)||array&&keys.length!==length+1)fail('DATA_LIMIT','Use bounded records and dense arrays.');
    const descriptors=Object.getOwnPropertyDescriptors(v);
    for(const k of keys){if(array&&k==='length')continue;const d=descriptors[k];
      if(typeof k!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||array&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=length))fail('INVALID_DATA','Accessors, hidden/symbol keys and sparse arrays are unsupported.');
      text+=k.length;if(text>8000000)fail('DATA_LIMIT','Keys exceed the text budget.');
    }
    active.add(v);const out=array?[]:Object.create(null);
    if(array){for(let i=0;i<length;i++){if(!Object.hasOwn(descriptors,String(i)))fail('INVALID_DATA','Sparse array.');out.push(copy(descriptors[i].value,depth+1));}}
    else for(const k of keys)out[k]=copy(descriptors[k].value,depth+1);
    active.delete(v);return out;
  }
  return copy(input,0);
}
export const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export function api(input,names){
  if(!input||typeof input!=='object')fail('MISSING_API','Supply the actual owning public module.');const out=Object.create(null);
  for(const k of names){const d=Object.getOwnPropertyDescriptor(input,k);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')fail('MISSING_API','Missing own public function '+k);out[k]=d.value;}return out;
}
export function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export function idList(input){const v=copyData(input);if(!Array.isArray(v)||v.length>1024||v.some(s=>typeof s!=='string'||s.length>96)||new Set(v).size!==v.length)fail('INVALID_IDS','Use distinct complete placement IDs (at most 1024).');return v;}
