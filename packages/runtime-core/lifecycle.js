import {planModules,ModuleConfigurationError} from './planner.js';

const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
function dataProperties(value,label){
  if(!plain(value))throw new TypeError(label+' must be a plain record.');
  const fields=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(fields).some(key=>typeof key!=='string'||!Object.hasOwn(fields[key],'value')||!fields[key].enumerable))throw new TypeError(label+' must contain enumerable data properties.');
  return fields;
}
function errorMessage(error){
  try{const field=error!==null&&['object','function'].includes(typeof error)?Object.getOwnPropertyDescriptor(error,'message'):null;
    if(field&&Object.hasOwn(field,'value')&&typeof field.value==='string')return field.value.slice(0,4096);
  }catch{}
  return 'Provider hook failed.';
}
const freezeReport=(ok,errors)=>Object.freeze({ok,errors:Object.freeze(errors.map(item=>Object.freeze({...item})))});

async function cleanup(records){
  const errors=[];
  for(const item of [...records].reverse()){
    if(item.startAttempted)try{await item.hooks.stop?.call(item.handle,item.context);}catch(error){errors.push({moduleId:item.id,phase:'stop',message:errorMessage(error)});}
    try{await item.hooks.dispose?.call(item.handle,item.context);}catch(error){errors.push({moduleId:item.id,phase:'dispose',message:errorMessage(error)});}
  }
  return freezeReport(errors.length===0,errors);
}

export class ModuleStartError extends Error {
  constructor(moduleId,phase,cause,cleanup){
    super('Module '+moduleId+' failed during '+phase+': '+errorMessage(cause),{cause});
    this.name='ModuleStartError';this.code='NAUTILUS_MODULE_START';
    this.moduleId=moduleId;this.phase=phase;this.cleanup=cleanup;
  }
}

// Planning and implementation availability checks finish before any factory runs.
// A factory creates a handle; acquire resources in prepare, where rollback owns it.
export async function startModules(configuration,implementations={}){
  const result=planModules(configuration);
  if(!result.ok)throw new ModuleConfigurationError(result.errors);
  const {plan}=result,errors=[];
  let factoryFields,hostFields;
  try{
    const supplied=dataProperties(implementations,'implementations');
    if(Object.keys(supplied).some(key=>!['factories','hostServices'].includes(key)))throw new TypeError('Unknown implementations field.');
    factoryFields=dataProperties(Object.hasOwn(supplied,'factories')?supplied.factories.value:{},'factories');
    hostFields=dataProperties(Object.hasOwn(supplied,'hostServices')?supplied.hostServices.value:{},'hostServices');
  }
  catch(error){throw new ModuleConfigurationError([{code:'INVALID_IMPLEMENTATIONS',path:'/',message:errorMessage(error),action:'Pass explicit factory and host-service data records.'}]);}
  const hosts=new Map();
  for(const entry of plan.modules)if(typeof factoryFields[entry.id]?.value!=='function')errors.push({code:'MISSING_FACTORY',path:'/factories/'+entry.id,message:'Missing factory for '+entry.id+'.',action:'Supply a factory before starting this selected module.'});
  for(const entry of plan.hosts){
    let supplied;
    try{supplied=dataProperties(hostFields[entry.id]?.value,'host provider '+entry.id);}
    catch(error){errors.push({code:'MISSING_HOST_SERVICES',path:'/hostServices/'+entry.id,message:errorMessage(error),action:'Supply the exact host services promised by its manifest.'});continue;}
    for(const binding of plan.bindings.filter(item=>item.provider===entry.id))if(!Object.hasOwn(supplied,binding.service)||supplied[binding.service].value===undefined)errors.push({code:'MISSING_HOST_SERVICE',path:'/hostServices/'+entry.id+'/'+binding.service,message:'Missing host service '+binding.service+'.',action:'Provide that service or choose another provider.'});
    hosts.set(entry.id,supplied);
  }
  if(errors.length)throw new ModuleConfigurationError(errors);
  const records=[],exports=new Map();let current=null,phase='factory';
  try{
    for(const entry of plan.modules){
      current=entry.id;phase='factory';
      const services=Object.create(null),sources=Object.create(null);
      for(const binding of plan.bindings.filter(item=>item.consumer===entry.id)){
        services[binding.service]=binding.source==='host'?hosts.get(binding.provider)[binding.service].value:exports.get(binding.provider)[binding.service];
        sources[binding.service]=Object.freeze({...binding});
      }
      const context=Object.freeze({module:Object.freeze(structuredClone(entry)),services:Object.freeze(services),providers:Object.freeze(sources)});
      const handle=factoryFields[entry.id].value(context);
      const fields=dataProperties(handle,'module handle '+entry.id),hooks={};
      for(const hook of ['prepare','start','stop','dispose'])if(Object.hasOwn(fields,hook)){
        if(typeof fields[hook].value!=='function')throw new TypeError('Module hook '+hook+' must be a function.');
        hooks[hook]=fields[hook].value;
      }
      const record={id:entry.id,handle,hooks,context,startAttempted:false};records.push(record);
      for(const key of Object.keys(fields))if(!['services','prepare','start','stop','dispose'].includes(key))throw new TypeError('Unknown module handle field: '+key);
      phase='prepare';await hooks.prepare?.call(handle,context);
      const provided=dataProperties(Object.getOwnPropertyDescriptor(handle,'services')?.value,'provided services '+entry.id),output=Object.create(null);
      const allowed=new Set(entry.provides.map(item=>item.id));
      for(const key of Object.keys(provided))if(!allowed.has(key))throw new TypeError('Undeclared service export: '+key);
      for(const service of entry.provides){
        if(!Object.hasOwn(provided,service.id)||provided[service.id].value===undefined)throw new TypeError('Missing declared service export: '+service.id);
        output[service.id]=provided[service.id].value;
      }
      exports.set(entry.id,Object.freeze(output));
    }
    phase='start';
    for(const record of records){current=record.id;record.startAttempted=true;await record.hooks.start?.call(record.handle,record.context);}
  }catch(error){throw new ModuleStartError(current??'(unknown)',phase,error,await cleanup(records));}
  let state='running',stopPromise;
  return Object.freeze({
    get state(){return state;},
    get plan(){return structuredClone(plan);},
    get warnings(){return structuredClone(result.warnings);},
    service(moduleId,serviceId){
      if(state!=='running')throw new Error('Module runtime is not running.');
      const record=exports.get(moduleId);
      if(!record||!Object.hasOwn(record,serviceId))throw new TypeError('Unknown selected module/service.');
      return record[serviceId];
    },
    stop(){
      if(!stopPromise){state='stopping';stopPromise=Promise.resolve().then(()=>cleanup(records)).then(report=>{state=report.ok?'disposed':'cleanup-failed';return report;});}
      return stopPromise;
    }
  });
}
