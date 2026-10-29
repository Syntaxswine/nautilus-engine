// Optional composition planning. This module neither imports nor starts a game service.
const ID=/^[a-zA-Z][a-zA-Z0-9_.:-]{0,95}$/;
const forbidden=new Set(['__proto__','prototype','constructor']);
const id=value=>typeof value==='string'&&ID.exec(value)?.[0]===value&&!forbidden.has(value);
const version=value=>Number.isSafeInteger(value)&&value>=1&&value<=1000000;
const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const diagnostic=(code,path,message,action,extra={})=>({code,path,message,action,...extra});
const pointer=value=>value.replaceAll('~','~0').replaceAll('/','~1');
function errorText(error){
  try{const field=error!==null&&['object','function'].includes(typeof error)?Object.getOwnPropertyDescriptor(error,'message'):null;
    if(field&&Object.hasOwn(field,'value')&&typeof field.value==='string')return field.value.slice(0,4096);
  }catch{}
  return 'Invalid configuration data.';
}

export class ModuleConfigurationError extends Error {
  constructor(diagnostics){
    super(diagnostics.map(item=>item.message).join(' '));
    this.name='ModuleConfigurationError';this.code='NAUTILUS_MODULE_CONFIGURATION';
    this.diagnostics=structuredClone(diagnostics);
  }
}

// Inspect descriptors before copying so validation cannot execute an accessor.
function dataCopy(value,path='',depth=0,budget={nodes:0}){
  if(++budget.nodes>16384||depth>16)throw Error('Configuration exceeds its bounded size/depth.');
  if(typeof value==='string'){if(value.length>256)throw Error('Configuration strings are limited to 256 characters.');return value;}
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='number'&&Number.isFinite(value))return value;
  if(!Array.isArray(value)&&!plain(value))throw Error('Expected plain JSON data at '+(path||'/')+'.');
  const array=Array.isArray(value),entries=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(entries);
  if(array&&value.length>512)throw Error('Configuration arrays are limited to 512 entries.');
  const result=array?[]:{};
  for(const key of keys){
    if(array&&key==='length')continue;
    if(typeof key!=='string'||key.length>128||forbidden.has(key))throw Error('Invalid JSON property at '+(path||'/')+'.');
    const entry=entries[key];
    if(!entry.enumerable||!Object.hasOwn(entry,'value'))throw Error('Configuration properties must be enumerable data.');
    if(array&&!/^(0|[1-9][0-9]*)$/.test(key))throw Error('Unexpected array property.');
    Object.defineProperty(result,key,{value:dataCopy(entry.value,path+'/'+pointer(key),depth+1,budget),enumerable:true,writable:true,configurable:true});
  }
  if(array&&Object.keys(result).length!==value.length)throw Error('Sparse configuration arrays are unsupported.');
  return result;
}
function fields(value,allowed,required,path,errors){
  if(!plain(value)){errors.push(diagnostic('INVALID_RECORD',path,'Expected a plain data record.','Use the documented version 1 manifest fields.'));return false;}
  for(const key of Object.keys(value))if(!allowed.includes(key))errors.push(diagnostic('UNKNOWN_FIELD',path+'/'+pointer(key),'Unknown configuration field: '+key,'Remove the field or select a supported contract version.'));
  for(const key of required)if(!Object.hasOwn(value,key))errors.push(diagnostic('MISSING_FIELD',path+'/'+key,'Missing configuration field: '+key,'Supply the required manifest field.'));
  return true;
}
function list(value,path,max,errors){
  if(!Array.isArray(value)||value.length>max){errors.push(diagnostic('INVALID_LIST',path,'Expected an array of at most '+max+' entries.','Use a bounded explicit manifest list.'));return [];}
  return value;
}
function services(value,path,required,errors){
  const seen=new Set();
  return list(value,path,64,errors).filter((entry,index)=>{
    const at=path+'/'+index,keys=required?['id','minVersion','maxVersion','optional']:['id','version'];
    if(!fields(entry,keys,required?['id','minVersion','maxVersion']:keys,at,errors))return false;
    if(!id(entry.id)||seen.has(entry.id))errors.push(diagnostic('INVALID_SERVICE_ID',at+'/id','Invalid or duplicate service ID.','Give each service one stable namespaced ID.'));
    seen.add(entry.id);
    if(required){
      if(!version(entry.minVersion)||!version(entry.maxVersion)||entry.maxVersion<entry.minVersion)errors.push(diagnostic('INVALID_SERVICE_RANGE',at,'Invalid inclusive service version range.','Supply positive minVersion and maxVersion integers.'));
      if(Object.hasOwn(entry,'optional')&&typeof entry.optional!=='boolean')errors.push(diagnostic('INVALID_OPTIONAL_FLAG',at+'/optional','Optional must be a boolean.','Use true or false.'));
      entry.optional??=false;
    }else if(!version(entry.version))errors.push(diagnostic('INVALID_SERVICE_VERSION',at+'/version','Invalid provided service version.','Declare the exact implemented service version.'));
    return true;
  });
}
function configuration(input){
  let value;
  try{value=dataCopy(input);}catch(error){return {errors:[diagnostic('INVALID_CONFIGURATION','/',errorText(error),'Supply bounded plain JSON without accessors, functions or special keys.')]};}
  const errors=[];
  if(!fields(value,['version','modules','selected','hosts','bindings'],['version','modules','selected'],'/',errors))return {errors};
  if(value.version!==1)errors.push(diagnostic('UNSUPPORTED_CONFIGURATION_VERSION','/version','Unsupported module configuration version.','Use configuration version 1 or a deliberate migration.'));
  const all=new Map(),modules=new Map(),hosts=new Map(),locations=new Map();
  for(const [group,target] of [['modules',modules],['hosts',hosts]]){
    for(const [index,entry]of list(Object.hasOwn(value,group)?value[group]:(group==='hosts'?[]:undefined),'/'+group,128,errors).entries()){
      const at='/'+group+'/'+index,keys=group==='modules'?['id','version','provides','requires']:['id','version','provides'];
      if(!fields(entry,keys,group==='modules'?['id','version','provides']:keys,at,errors))continue;
      if(!id(entry.id)||all.has(entry.id))errors.push(diagnostic('INVALID_PROVIDER_ID',at+'/id','Invalid or duplicate provider ID.','Use distinct namespaced IDs for modules and host providers.'));
      if(!version(entry.version))errors.push(diagnostic('INVALID_MODULE_VERSION',at+'/version','Invalid provider contract version.','Declare a positive integer interface version independent of package semver.'));
      entry.provides=services(entry.provides,at+'/provides',false,errors);
      if(group==='modules'){
        entry.requires=services(Object.hasOwn(entry,'requires')?entry.requires:[],at+'/requires',true,errors);
        entry.requires.forEach((service,index)=>locations.set(entry.id+'\0'+service.id,at+'/requires/'+index));
      }
      all.set(entry.id,{...entry,source:group==='modules'?'module':'host'});target.set(entry.id,entry);
    }
  }
  const selected=list(value.selected,'/selected',128,errors),seen=new Set();
  selected.forEach((key,index)=>{
    if(!id(key)||!modules.has(key)||seen.has(key))errors.push(diagnostic('INVALID_SELECTION','/selected/'+index,'Unknown or duplicate selected module: '+(typeof key==='string'?key:'(non-string)'),'Select each registered module once.'));
    else seen.add(key);
  });
  const bindings=Object.hasOwn(value,'bindings')?value.bindings:{};
  if(!plain(bindings))errors.push(diagnostic('INVALID_BINDINGS','/bindings','Bindings must be a plain service-to-provider map.','Use explicit service IDs and provider IDs.'));
  else for(const [service,provider]of Object.entries(bindings)){
    if(!id(service)||!id(provider)||!all.has(provider)||!all.get(provider).provides.some(item=>item.id===service))errors.push(diagnostic('INVALID_BINDING','/bindings/'+pointer(service),'Binding references an unknown service/provider pair.','Bind a service to a provider declaring that exact service.',{serviceId:service,providerId:provider}));
  }
  return {errors,modules,hosts,all,selected:[...seen].sort(),bindings,locations};
}

export function planModules(input){
  const config=configuration(input),errors=[...config.errors],warnings=[];
  if(errors.length)return {ok:false,errors,warnings,plan:null};
  const {modules,all,bindings,locations}=config,selected=new Set(config.selected),bound=[];
  const providers=new Map();
  for(const entry of all.values())for(const service of entry.provides){
    if(!providers.has(service.id))providers.set(service.id,[]);
    providers.get(service.id).push({provider:entry.id,source:entry.source,version:service.version});
  }
  const compatible=(provider,requirement)=>provider.version>=requirement.minVersion&&provider.version<=requirement.maxVersion;
  const available=(service,optional=false)=>{
    let entries=providers.get(service)??[];
    if(Object.hasOwn(bindings,service))entries=entries.filter(item=>item.provider===bindings[service]);
    else if(optional)entries=entries.filter(item=>item.source==='host'||selected.has(item.provider));
    return [...entries].sort((a,b)=>a.provider<b.provider?-1:a.provider>b.provider?1:0);
  };
  function groups(optional){
    const result=new Map();
    for(const consumer of [...selected].sort())for(const requirement of modules.get(consumer).requires){
      if(requirement.optional!==optional)continue;
      if(!result.has(requirement.id))result.set(requirement.id,[]);
      result.get(requirement.id).push({consumer,requirement});
    }
    return new Map([...result].sort(([a],[b])=>a<b?-1:a>b?1:0));
  }
  function chooseRequired(requirements){
    const choices=new Map(),issues=[];
    for(const [service,requests]of requirements){
      const low=Math.max(...requests.map(item=>item.requirement.minVersion)),high=Math.min(...requests.map(item=>item.requirement.maxVersion));
      const candidates=available(service),matches=candidates.filter(item=>item.version>=low&&item.version<=high);
      if(matches.length===1)choices.set(service,matches[0]);
      else issues.push({service,requests,candidates,matches,code:low>high?'INCOMPATIBLE_SERVICE':matches.length?'AMBIGUOUS_SERVICE':'MISSING_SERVICE'});
    }
    return {choices,issues};
  }
  let hard,selection;
  // Resolve all active hard ranges together. Defer ambiguous diagnostics until
  // unique providers and explicit optional activations add no more requirements.
  for(;;){
    const previous=selected.size;
    for(const next of [...selected].sort())for(const requirement of modules.get(next).requires){
      if(!requirement.optional||!Object.hasOwn(bindings,requirement.id))continue;
      const provider=all.get(bindings[requirement.id]),service=provider.provides.find(item=>item.id===requirement.id);
      if(provider.source==='module'&&service.version>=requirement.minVersion&&service.version<=requirement.maxVersion)selected.add(provider.id);
    }
    hard=groups(false);selection=chooseRequired(hard);
    for(const chosen of selection.choices.values())if(chosen.source==='module')selected.add(chosen.provider);
    if(selected.size===previous)break;
  }
  function issue(code,service,request,candidates,matches=[],chosen){
    const {consumer,requirement}=request;
    return diagnostic(code,locations.get(consumer+'\0'+service),
      (code.includes('INCOMPATIBLE')?'Provider versions conflict for ':code.includes('AMBIGUOUS')?'Multiple providers can satisfy ':'No provider satisfies ')+service+' for '+consumer+'.',
      code.includes('AMBIGUOUS')?'Choose a provider explicitly in bindings.':'Supply compatible profiles and a provider implementing the required version.',
      {moduleId:consumer,serviceId:service,minVersion:requirement.minVersion,maxVersion:requirement.maxVersion,
        ...(chosen?{providerId:chosen.provider,providedVersion:chosen.version}:{}),
        candidates:matches.map(item=>item.provider),available:candidates.map(item=>({id:item.provider,version:item.version}))});
  }
  function bind(service,request,chosen,optional){bound.push({consumer:request.consumer,service,provider:chosen.provider,source:chosen.source,version:chosen.version,optional});}
  for(const {service,requests,candidates,matches,code}of selection.issues)for(const request of requests)errors.push(issue(code,service,request,candidates,matches));
  for(const [service,requests]of hard){const chosen=selection.choices.get(service);if(chosen)for(const request of requests)bind(service,request,chosen,false);}
  for(const [service,requests]of groups(true)){
    const candidates=available(service,true),matches=candidates.filter(provider=>requests.some(item=>compatible(provider,item.requirement)));
    const chosen=selection.choices.get(service)??(matches.length===1?matches[0]:null);
    for(const request of requests){
      if(chosen&&compatible(chosen,request.requirement))bind(service,request,chosen,true);
      else warnings.push(issue(chosen?'OPTIONAL_INCOMPATIBLE_SERVICE':matches.length?'OPTIONAL_AMBIGUOUS_SERVICE':'OPTIONAL_MISSING_SERVICE',service,request,candidates,matches,chosen));
    }
  }
  const dependencies=new Map([...selected].map(key=>[key,new Set()]));
  for(const item of bound)if(item.source==='module')dependencies.get(item.consumer).add(item.provider);
  const order=[],done=new Set();
  while(order.length<selected.size){
    const ready=[...selected].sort().filter(key=>!done.has(key)&&[...dependencies.get(key)].every(other=>done.has(other)));
    if(!ready.length){errors.push(diagnostic('DEPENDENCY_CYCLE','/selected','Module dependencies contain a cycle.','Separate mutually dependent services or supply an independent host provider.',{modules:[...selected].filter(key=>!done.has(key)).sort()}));break;}
    for(const key of ready){done.add(key);order.push(key);}
  }
  if(errors.length)return {ok:false,errors,warnings,plan:null};
  const records=order.map(key=>structuredClone(modules.get(key)));
  bound.sort((a,b)=>a.consumer<b.consumer?-1:a.consumer>b.consumer?1:a.service<b.service?-1:a.service>b.service?1:0);
  const usedHosts=[...new Set(bound.filter(item=>item.source==='host').map(item=>item.provider))].sort();
  return {ok:true,errors:[],warnings,plan:{version:1,roots:config.selected,order,modules:records,hosts:usedHosts.map(key=>structuredClone(config.hosts.get(key))),bindings:bound}};
}

export function assertModulePlan(configuration){
  const result=planModules(configuration);
  if(!result.ok)throw new ModuleConfigurationError(result.errors);
  return result.plan;
}
