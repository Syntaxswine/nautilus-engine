import {planModules} from '../runtime-core/index.js';
import {PLAYER_COMPONENTS,PLAYER_PRESETS,compatiblePort} from './descriptors.js';
import {data,exact,issue,frozen} from './data.js';

export const UI_MODULE='player-ui.shell',VIEW_SERVICE='nautilus.player-ui-view';
export const PLAYER_ENGINE_BASE=frozen({package:'@nautilus-engine/map-core',version:'0.10.0',sourcePin:'7f50cb2a48aef87a16fc0465997549be9ed88dc2'});
export function createPlayerConfiguration({content,actorId='player',camera=false,title=false}={}) {
  return {kind:'nautilus-player-ui-configuration',version:1,engine:data(PLAYER_ENGINE_BASE),content:data(content),actorId,
    components:PLAYER_COMPONENTS.filter(d=>!['player.camera','player.title'].includes(d.id)||d.id==='player.camera'&&camera||d.id==='player.title'&&title).map(d=>({id:d.id,version:d.version,settings:Object.fromEntries(d.settings.map(s=>[s.id,s.default]))})),bindings:{}};
}
export function validatePlayerConfiguration(input,{providers=[],descriptors=PLAYER_COMPONENTS}={}) {
  const errors=[];let config;
  try{config=data(typeof input==='string'?JSON.parse(input):input);}catch(error){return {ok:false,errors:[issue('INVALID_CONFIGURATION','/',error.message,'Supply bounded plain JSON.')],configuration:null,compiled:null,plan:null,connections:[]};}
  if(!config||typeof config!=='object'||Array.isArray(config))return {ok:false,errors:[issue('INVALID_CONFIGURATION','/','Use a recipe record.','Supply bounded plain JSON.')],configuration:null,compiled:null,plan:null,connections:[]};
  const fail=(code,path,message,action='Choose a supported descriptor/version and compatible registered provider.')=>errors.push(issue(code,path,message,action));
  if(!exact(config,['kind','version','engine','content','actorId','components','bindings'])||config.kind!=='nautilus-player-ui-configuration'||config.version!==1)fail('CONFIGURATION_VERSION','/','Use player UI configuration version1.');
  if(!exact(config.engine,['package','version','sourcePin'])||!Object.keys(PLAYER_ENGINE_BASE).every(k=>config.engine?.[k]===PLAYER_ENGINE_BASE[k]))fail('ENGINE_BASE_UNSUPPORTED','/engine','Use this candidate’s exact reviewed engine base; migrate recipes explicitly.');
  if(!exact(config.content,['id','version','sourcePin'])||typeof config.content?.id!=='string'||!Number.isSafeInteger(config.content?.version)||config.content.version<1||!/^[0-9a-f]{40}$/.test(config.content?.sourcePin||''))fail('CONTENT_IDENTITY','/content','Record exact content ID, version and full reviewed source pin.');
  if(typeof config.actorId!=='string'||!config.actorId)fail('ACTOR_REQUIRED','/actorId','Select a retained actor ID.');
  if(!Array.isArray(config.components)||config.components.length>32)fail('COMPONENT_LIST','/components','Use a bounded component list.');
  if(!exact(config.bindings,Object.keys(config.bindings||{}))||Object.values(config.bindings||{}).some(v=>typeof v!=='string'||!v))fail('INVALID_BINDINGS','/bindings','Use a service-to-provider record.');
  const selected=[],seen=new Set(),needs=new Map();
  for(const [index,entry] of (Array.isArray(config.components)?config.components:[]).entries()) {
    const d=descriptors.find(d=>d.id===entry?.id),at='/components/'+index;
    if(!d||entry.version!==d.version||seen.has(entry.id)||!exact(entry,['id','version','settings'])){fail('COMPONENT_UNAVAILABLE',at,'Unknown, duplicate or incompatible component.');continue;}seen.add(entry.id);
    if(!exact(entry.settings||{},d.settings.map(s=>s.id))){fail('UNKNOWN_SETTING',at+'/settings','Settings must come from the selected descriptor.');continue;}
    const settings={};
    for(const s of d.settings){const v=Object.hasOwn(entry.settings||{},s.id)?entry.settings[s.id]:s.default;const valid=s.type==='enum'?s.values.includes(v):s.type==='boolean'?typeof v==='boolean':Number.isFinite(v)&&v>=s.min&&v<=s.max;
      if(!valid)fail('INVALID_SETTING',at+'/settings/'+s.id,'Unsupported '+s.label+'.');else settings[s.id]=v;}
    selected.push({id:d.id,version:d.version,settings});
    for(const p of d.ports){const old=needs.get(p.id);if(old&&JSON.stringify(old)!==JSON.stringify(p))fail('PORT_CONFLICT',at,'Selected components disagree about '+p.id);else needs.set(p.id,p);}
  }
  if(!seen.has('player.shell'))fail('SHELL_REQUIRED','/components','Select the shared player shell.');
  const bindings={},connections=[];
  for(const p of needs.values()) {
    const all=providers.filter(provider=>provider.descriptor.ports.some(q=>q.id===p.id));
    let matches=all.filter(provider=>provider.descriptor.ports.some(q=>compatiblePort(p,q)));
    if(config.bindings?.[p.id])matches=matches.filter(provider=>provider.descriptor.id===config.bindings[p.id]);
    if(matches.length!==1){fail(matches.length?'AMBIGUOUS_PORT':all.length?'INCOMPATIBLE_PORT':'MISSING_PORT','/bindings/'+p.id,(matches.length?'Multiple providers for ':all.length?'Incompatible connection for ':'Missing provider for ')+p.id,'Inspect connections and bind one matching service/type/version/schema/role/units/frame.');continue;}
    bindings[p.id]=matches[0].descriptor.id;connections.push({componentPort:data(p),providerId:bindings[p.id],providerPort:data(matches[0].descriptor.ports.find(q=>compatiblePort(p,q)))});
  }
  for(const service of Object.keys(config.bindings||{}))if(!needs.has(service))fail('UNUSED_BINDING','/bindings/'+service,'Binding is not used by selected components.');
  if(errors.length)return {ok:false,errors,configuration:null,compiled:null,plan:null,connections};
  const compiled={version:1,modules:[{id:UI_MODULE,version:1,provides:[{id:VIEW_SERVICE,version:1}],requires:[...needs.keys()].map(id=>({id,minVersion:1,maxVersion:1}))}],selected:[UI_MODULE],hosts:providers.map(p=>({id:p.descriptor.id,version:p.descriptor.version,provides:p.descriptor.ports.map(q=>({id:q.id,version:q.service.version}))})),bindings};
  const planned=planModules(compiled);
  if(!planned.ok)return {ok:false,errors:planned.errors,configuration:null,compiled:null,plan:null,connections};
  return {ok:true,errors:[],configuration:{...config,components:selected,bindings},compiled,plan:planned.plan,connections};
}
export function presetConfiguration(config,presetId) {
  const preset=PLAYER_PRESETS.find(p=>p.id===presetId);if(!preset)throw new TypeError('Unknown player UI preset.');
  const next=data(config);for(const c of next.components)Object.assign(c.settings,preset.settings[c.id]||{});return next;
}
export const componentSettings=(config,id)=>config.components.find(c=>c.id===id)?.settings||null;
