import {planModules} from '../runtime-core/index.js';
import {PLAYER_COMPONENTS,PLAYER_PORTS} from '../player-ui/descriptors.js';
import {PLAYER_ENGINE_BASE,createPlayerConfiguration,presetConfiguration} from '../player-ui/configuration.js';
import {listNativeActors,nativeActor} from '../native-actors/index.js';
import {plain,immutable,fields,id} from '../native-actors/data.js';

const port=(name,role,schema,units='none',frame='none',required=true)=>({id:name,service:{id:name,version:1},direction:'input',role,schema,units,frame,cardinality:'one',ownership:'borrowed endpoint',lifetime:'composition',required});
export const SETUP_PORTS=immutable({
  world:port('nautilus.setup-world','confirmed-state','urn:nautilus:setup-world:1','metres','world-x-y-h'),
  pose:port('nautilus.actor-pose','confirmed-state','urn:nautilus:confirmed-actor-pose:1','metres','world-x-y-h'),
  surface:port('nautilus.render-surface','confirmed-state','urn:nautilus:shared-three-surface:1','metres','three-x-height-y'),
  clock:port('nautilus.setup-clock','confirmed-state','urn:nautilus:phased-host-clock:1','seconds','host-clock'),
  native:port('nautilus.native-actor-view','confirmed-state','urn:nautilus:native-actor-view:1','metres','three-x-height-y'),
  ui:port('nautilus.setup-ui','confirmed-state','urn:nautilus:player-ui-handle:1'),
  runtime:port('nautilus.player-setup','confirmed-state','urn:nautilus:player-setup:1')
});
export const output=p=>({...plain(p),direction:p.direction==='input'?'output':'input'});
export const compatible=(a,b)=>a.id===b.id&&a.service.id===b.service.id&&a.service.version===b.service.version&&a.direction!==b.direction&&['role','schema','units','frame','cardinality','ownership','lifetime'].every(k=>a[k]===b[k]);
export const SETUP_COMPONENTS=immutable([...plain(PLAYER_COMPONENTS),
  {id:'setup.runtime',version:1,label:'Scene runtime',ports:[SETUP_PORTS.clock,SETUP_PORTS.surface,{...SETUP_PORTS.world,required:false}],settings:[],guide:'packages/player-setup/README.md',usageCard:'packages/player-setup/usage-card.json'},
  {id:'setup.actor',version:1,label:'Native actor',ports:[SETUP_PORTS.pose,SETUP_PORTS.surface],settings:[
    {id:'model',label:'Native model',type:'enum',values:listNativeActors().map(a=>a.id),default:'goat',change:'pause'},
    {id:'motion',label:'Confirmed movement animation',type:'enum',values:['native-gait','neutral-only'],default:'native-gait',change:'pause'}],guide:'packages/native-actors/README.md',usageCard:'packages/native-actors/usage-card.json'}]);
export function createSetupConfiguration({content,actorId='player',model='goat',trains=false,title=false,vehicles=false}={}){
  const config=createPlayerConfiguration({content,actorId,camera:true,title,vehicles});if(!trains)config.components=config.components.filter(c=>c.id!=='player.trains');
  config.kind='nautilus-player-setup';config.components.push(...SETUP_COMPONENTS.filter(c=>c.id.startsWith('setup.')).map(c=>({id:c.id,version:1,settings:Object.fromEntries(c.settings.map(s=>[s.id,s.id==='model'?model:s.default]))})));return config;
}
export const settings=(config,name)=>config.components.find(c=>c.id===name)?.settings;
export function uiConfiguration(config,bindings=config.bindings){const ui=plain(config);ui.kind='nautilus-player-ui-configuration';ui.components=ui.components.filter(c=>PLAYER_COMPONENTS.some(d=>d.id===c.id));
  const needed=new Set(ui.components.flatMap(c=>PLAYER_COMPONENTS.find(d=>d.id===c.id).ports.map(p=>p.id)));ui.bindings=Object.fromEntries(Object.entries(bindings).filter(([key])=>needed.has(key)));return ui;}
export function setupPreset(config,name){const next=presetConfiguration(config,name);return next;}
const registration=(id,provides,requires=[])=>({id,version:1,provides:provides.map(output),requires,ownership:'owned module'});
export function defaultSetupRegistry(config){
  const uiNeeds=config.components.filter(c=>PLAYER_COMPONENTS.some(d=>d.id===c.id)).flatMap(c=>PLAYER_COMPONENTS.find(d=>d.id===c.id).ports);
  return [registration('setup.world',[SETUP_PORTS.world,SETUP_PORTS.pose,PLAYER_PORTS.scene,PLAYER_PORTS.walking]),
    registration('setup.clock',[SETUP_PORTS.clock,PLAYER_PORTS.pause],[SETUP_PORTS.world]),
    registration('setup.surface',[SETUP_PORTS.surface],[SETUP_PORTS.world]),
    registration('setup.camera',[PLAYER_PORTS.camera,PLAYER_PORTS.bounds],[PLAYER_PORTS.scene,SETUP_PORTS.surface]),
    registration('setup.actor',[SETUP_PORTS.native],[SETUP_PORTS.pose,SETUP_PORTS.surface]),
    registration('setup.title',[PLAYER_PORTS.title],[PLAYER_PORTS.scene]),
    registration('setup.shell',[SETUP_PORTS.ui],uiNeeds),
    registration('setup.runtime',[SETUP_PORTS.runtime],[SETUP_PORTS.ui,SETUP_PORTS.clock,SETUP_PORTS.surface,SETUP_PORTS.native])];
}
const issue=(code,path,message,action='Inspect the semantic connection and bind one compatible registered provider.')=>({code,path,message,action});
export function validatePlayerSetup(input,{providers=[],registry,content}={}){
  const errors=[],connections=[];let config;
  const failed=()=>({ok:false,errors,configuration:null,compiled:null,plan:null,connections});
  try{config=plain(typeof input==='string'?JSON.parse(input):input);fields(config,['kind','version','engine','content','actorId','components','bindings']);
    if(config.kind!=='nautilus-player-setup'||config.version!==1)throw Error('Use player setup configuration version1.');
    fields(config.engine,['package','version','sourcePin']);if(Object.keys(PLAYER_ENGINE_BASE).some(k=>config.engine[k]!==PLAYER_ENGINE_BASE[k]))throw Error('Preserve the accepted Stage1 engine identity.');
    fields(config.content,['id','version','sourcePin']);id(config.content.id);id(config.actorId);if(!Number.isSafeInteger(config.content.version)||config.content.version<1||!/^[a-f0-9]{40}$/.test(config.content.sourcePin))throw Error('Use exact content identity/version/source pin.');
    if(content&&!['id','version','sourcePin'].every(k=>config.content[k]===content.identity?.[k]))throw Error('The requested content identity differs from the bound content manifest.');
    if(!Array.isArray(config.components)||config.components.length>32)throw Error('Select at most32 components.');fields(config.bindings,Object.keys(config.bindings));Object.values(config.bindings).forEach(id);
  }catch(error){errors.push(issue('INVALID_SETUP','/',error.message,'Supply the bounded version1 setup recipe and exact content/engine identities.'));return failed();}
  const seen=new Set();for(const [index,c]of config.components.entries()){
    try{fields(c,['id','version','settings']);id(c.id);}catch(error){errors.push(issue('INVALID_COMPONENT','/components/'+index,error.message,'Supply a component record with id, version and settings.'));continue;}
    const d=SETUP_COMPONENTS.find(d=>d.id===c.id);if(!d||c.version!==d.version||seen.has(c.id)){errors.push(issue('COMPONENT_UNAVAILABLE','/components/'+index,'Unknown, duplicate or incompatible component.'));continue;}seen.add(c.id);
    try{fields(c.settings,d.settings.map(s=>s.id));for(const s of d.settings){const v=c.settings[s.id];if(!(s.type==='enum'?s.values.includes(v):s.type==='boolean'?typeof v==='boolean':Number.isFinite(v)&&v>=s.min&&v<=s.max))throw Error('Unsupported setting '+c.id+'.'+s.id);}}catch(error){errors.push(issue('INVALID_SETTING','/components/'+index,error.message));}
  }
  for(const required of ['player.shell','setup.runtime','setup.actor'])if(!seen.has(required))errors.push(issue('COMPONENT_REQUIRED','/components','Keep '+required+' or select a reviewed replacement recipe.'));
  if(errors.length)return failed();
  try{nativeActor(settings(config,'setup.actor')?.model);}catch(error){errors.push(issue(error.code||'ACTOR_MODEL_UNAVAILABLE','/components',error.message));}
  if(errors.length)return failed();
  let modules,hostMetadata;
  try{modules=plain(registry||defaultSetupRegistry(config));hostMetadata=providers.map(p=>plain(p.descriptor));if(!Array.isArray(modules)||modules.length>64||hostMetadata.length>64)throw Error('Use a bounded provider registry.');
    const checkPort=p=>{fields(p,['id','service','direction','role','schema','units','frame','cardinality','ownership','lifetime','required']);fields(p.service,['id','version']);id(p.id);if(p.service.id!==p.id||!Number.isSafeInteger(p.service.version)||p.service.version<1||!['input','output'].includes(p.direction)||!['request','confirmed-state','committed-event'].includes(p.role)||p.cardinality!=='one'||p.lifetime!=='composition'||typeof p.required!=='boolean'||['schema','units','frame','ownership'].some(k=>typeof p[k]!=='string'||!p[k]))throw Error('Keep complete service/version/schema/role/units/frame/cardinality/ownership metadata.');};
    for(const m of modules){fields(m,['id','version','provides','requires','ownership']);id(m.id);if(!Array.isArray(m.provides)||!Array.isArray(m.requires)||m.provides.length>64||m.requires.length>64)throw Error('Use bounded port lists.');[...m.provides,...m.requires].forEach(checkPort);}
    for(const h of hostMetadata){fields(h,['id','version','ports']);id(h.id);if(!Array.isArray(h.ports)||h.ports.length>64)throw Error('Use bounded host ports.');h.ports.forEach(checkPort);}
  }catch(error){errors.push(issue('INVALID_REGISTRY','/registry',error.message));return failed();}
  const all=[...modules.map(m=>({...m,source:'module'})),...hostMetadata.map(p=>({id:p.id,version:p.version,provides:p.ports,requires:[],source:'host',ownership:'retained host'}))],ids=new Set();
  for(const p of all){if(ids.has(p.id)){errors.push(issue('DUPLICATE_PROVIDER','/registry','Duplicate provider '+p.id));}ids.add(p.id);}
  const selected=new Set(['setup.runtime']),bindings={},needs=new Map();
  for(let changed=true;changed&&!errors.length;){changed=false;
    for(const name of [...selected]){const module=modules.find(m=>m.id===name);if(!module){errors.push(issue('MISSING_FACTORY','/registry','No registered module '+name));break;}
      for(const need of module.requires){const previous=needs.get(need.id);if(previous&&!compatible(need,output(previous))){errors.push(issue('PORT_CONFLICT','/bindings/'+need.id,'Selected consumers disagree about '+need.id));continue;}needs.set(need.id,need);
        const declared=all.filter(p=>p.provides.some(q=>q.id===need.id));const chosenId=config.bindings[need.id];let matches=declared.filter(p=>(!chosenId||p.id===chosenId)&&p.provides.some(q=>compatible(need,q)));
        if(matches.length!==1){errors.push(issue(matches.length?'AMBIGUOUS_PORT':declared.length?'INCOMPATIBLE_PORT':'MISSING_PORT','/bindings/'+need.id,(matches.length?'Multiple compatible providers for ':declared.length?'No compatible provider for ':'Missing provider for ')+need.id));continue;}
        const chosen=matches[0];bindings[need.id]=chosen.id;if(chosen.source==='module'&&!selected.has(chosen.id)){selected.add(chosen.id);changed=true;}
      }
    }
  }
  if(errors.length)return failed();
  for(const [service,providerId]of Object.entries(config.bindings))if(!all.some(p=>p.id===providerId&&p.provides.some(q=>q.id===service)))errors.push(issue('UNKNOWN_BINDING','/bindings/'+service,'Binding references an unknown service/provider pair.'));
  for(const [service,need]of needs){const provider=all.find(p=>p.id===bindings[service]);connections.push({componentPort:plain(need),providerId:provider.id,providerPort:plain(provider.provides.find(p=>compatible(need,p))),ownership:provider.ownership});}
  const unique=ports=>[...new Map(ports.map(p=>[p.id,p])).values()];
  const compiled={version:1,modules:modules.map(m=>({id:m.id,version:m.version,provides:unique(m.provides).map(p=>({id:p.id,version:p.service.version})),requires:unique(m.requires).map(p=>({id:p.id,minVersion:p.service.version,maxVersion:p.service.version}))})),selected:['setup.runtime'],hosts:providers.map(p=>({id:p.descriptor.id,version:p.descriptor.version,provides:unique(p.descriptor.ports).map(q=>({id:q.id,version:q.service.version}))})),bindings};
  const planned=planModules(compiled);if(!planned.ok)errors.push(...planned.errors);if(errors.length)return failed();
  return {ok:true,errors:[],configuration:{...config,bindings},compiled,plan:planned.plan,connections};
}
export function bindSetupProvider(config,provider){const next=plain(config);for(const p of provider.descriptor.ports)next.bindings[p.id]=provider.descriptor.id;return next;}
