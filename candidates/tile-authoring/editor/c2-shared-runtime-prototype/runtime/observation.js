// PRIVATE prototype bridge. This observes actual source sites; it is not a
// substitute meter, validator, writer or permission created from numeric DTOs.
const own=(v,k)=>Object.getOwnPropertyDescriptor(v??{},k);
const bindings=new WeakSet();
const bad=message=>{const e=new TypeError(message);e.code='C2_OBSERVATION_UNBOUND';throw e;};
export function bindPrivateObservation(input){
  if(input===undefined)return null;
  if(input&&typeof input==='object'&&bindings.has(input))return input;
  if(!input||typeof input!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(input)))bad('Bind an own private observation configuration.');
  const keys=Reflect.ownKeys(input);if(keys.length!==2||!keys.includes('version')||!keys.includes('backend'))bad('Use the closed private observation configuration.');
  for(const key of keys){const d=own(input,key);if(typeof key!=='string'||!d?.enumerable||!Object.hasOwn(d,'value'))bad('Observer configuration cannot invoke accessors.');}
  if(own(input,'version').value!==1)bad('Unsupported private observer version.');
  const backend=own(input,'backend').value,functions={};
  for(const key of ['begin','visit','text','key','beforeOpaque','afterOpaque','failOpaque','complete','fail']){const d=own(backend,key);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')bad('Missing actual observer backend: '+key);functions[key]=d.value.bind(backend);}
  let current=null,depth=0;const failures=new WeakSet();
  const backendCall=(name,...args)=>{try{return functions[name](...args);}catch(error){if(error&&typeof error==='object')failures.add(error);throw error;}};
  const run=(name,fn,args)=>{
    const parent=current,call=backendCall('begin',name,parent,args);if(!call||typeof call!=='object')bad('The actual backend did not issue an owned call.');
    current=call;depth++;
    try{const value=fn(...args);backendCall('complete',call,value);return value;}
    catch(error){backendCall('fail',call,error);throw error;}
    finally{depth--;current=parent;}
  };
  const bridge={
    run(name,fn,...args){return run(name,fn,args);},
    fixed(name,fn){return (...args)=>run(name,fn,args);},
    get active(){return current;},
    get depth(){return depth;},
    isFailure(error){return !!error&&typeof error==='object'&&failures.has(error);},
    visit(path='',level=0){if(!current)bad('Observe visits only inside an actual fixed entry.');backendCall('visit',current,path,level);},
    text(value){if(!current)bad('Observe text only inside an actual fixed entry.');backendCall('text',current,value);},
    key(value){if(!current)bad('Observe keys only inside an actual fixed entry.');backendCall('key',current,value);},
    opaque(name,input,invoke){
      if(!current)bad('Claim the actual operation before a builtin call.');
      const claim=backendCall('beforeOpaque',current,name,input);if(!claim||typeof claim!=='object')bad('Missing owned precharge for opaque work.');
      let result;try{result=invoke();}
      catch(error){backendCall('failOpaque',current,claim,error);throw error;}
      backendCall('afterOpaque',current,claim,result);return result;
    }
  };
  bindings.add(bridge);return Object.freeze(bridge);
}
// These wrappers invoke the REAL builtin/function exactly once. The backend
// must label source-backed conservative rows as such; returned output never
// creates a refund/permission. No CPU/RSS/opaque-internal measurement is claimed.
export const observedStringify=(observer,value,site='json.stringify')=>observer?
  observer.opaque(site,value,()=>JSON.stringify(value)):JSON.stringify(value);
export const observedClone=(observer,value,site='structuredClone')=>observer?
  observer.opaque(site,value,()=>structuredClone(value)):structuredClone(value);
export const observedParse=(observer,text,site='json.parse')=>observer?
  observer.opaque(site,text,()=>JSON.parse(text)):JSON.parse(text);
export const observedEncode=(observer,text,site='utf8.encode')=>observer?
  observer.opaque(site,text,()=>new TextEncoder().encode(text)):new TextEncoder().encode(text);
