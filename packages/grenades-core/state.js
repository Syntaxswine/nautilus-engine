import {GRENADE_CONTRACT,FARMYARD_GRENADE_PROFILE as P,GRENADE_COMPONENT,WEAPON_RANGES,costOf} from './profile.js';
import {data,fields,id,integer,canonical,xy,utf8Bytes,fail} from './validation.js';
import {context as checkContext,command as checkCommand} from './model.js';
import {preview,execute,receiptId} from './mechanics.js';
import {footprint,affects} from './geometry.js';
const extract=state=>({world:state.world,actors:state.actors,control:state.control,support:state.support});
const fresh=value=>data(value);
function checkCheckpoint(command){
 fields(command,['version','id','expectedRevision','world','actors','control','support'],'/command');
 if(command.version!==1)fail('UNSUPPORTED_COMMAND','/command/version','Expected context command version 1.');id(command.id,'/command/id');integer(command.expectedRevision,0,GRENADE_CONTRACT.maximumReceipts,'/command/expectedRevision');checkContext(extract(command),'/command');return command;
}
function checkConsistent(context){
 checkContext(context);
 if(context.actors.some(actor=>actor.burningTurns>0))fail('UNSUPPORTED_FEATURE','/actors','Active burning requires the complete fire adapter.');
 return context;
}
export function createGrenadeState(options){
 options=data(options);fields(options,['id','world','actors','control','support'],'/options');id(options.id,'/options/id');
 const initial=checkConsistent(extract(options));
 return openGrenadeState({kind:GRENADE_CONTRACT.schemaId,version:1,id:options.id,profileId:P.id,revision:0,initial:fresh(initial),...fresh(initial),receipts:[]});
}
export function openGrenadeState(input){
 const state=data(input);fields(state,['kind','version','id','profileId','revision','initial','world','actors','control','support','receipts'],'');
 if(state.kind!==GRENADE_CONTRACT.schemaId||state.version!==1)fail('UNSUPPORTED_SCHEMA','/version','Expected nautilus-grenade-state version 1.');
 if(state.profileId!==P.id)fail('UNSUPPORTED_PROFILE','/profileId','This build implements only the static same-plane Farmyard profile.');id(state.id,'/id');integer(state.revision,0,GRENADE_CONTRACT.maximumReceipts,'/revision');
 checkConsistent(state.initial);checkConsistent(extract(state));
 if(!Array.isArray(state.receipts)||state.receipts.length>GRENADE_CONTRACT.maximumReceipts||state.revision!==state.receipts.length)fail('INVALID_JOURNAL','/receipts','Revision must equal the bounded retained journal length; records cannot be evicted.');
 let current=fresh(state.initial);const ids=new Set();
 for(const [index,stored]of state.receipts.entries()){
  if(!stored||!['throw','context'].includes(stored.type))fail('INVALID_RECEIPT','/receipts/'+index,'Unsupported receipt type.');
  const command=stored.type==='throw'?checkCommand(stored.command):checkCheckpoint(stored.command);
  if(ids.has(command.id)||command.expectedRevision!==index)fail('INVALID_JOURNAL','/receipts/'+index,'Command IDs must be unique and revisions contiguous.');ids.add(command.id);
  let expected;
  if(stored.type==='throw'){
   const result=execute(current,command,state.id,index);if(!result.preview.ok)fail('INVALID_RECEIPT','/receipts/'+index,'Saved throw is not eligible against its original context.');current=result.context;expected=result.receipt;
  }else{current=checkConsistent(fresh(extract(command)));expected={id:receiptId(state.id,command.id),type:'context',command:fresh(command),revision:index+1};}
  if(canonical(stored)!==canonical(expected))fail('INVALID_RECEIPT','/receipts/'+index,'Saved receipt differs from deterministic revalidation.');
 }
 if(canonical(current)!==canonical(extract(state)))fail('INVALID_STATE','/actors','Current resources/world/control disagree with retained throws and context checkpoints.');
 if(utf8Bytes(canonical(state))>8000000)fail('STATE_LIMIT','/','Grenade state exceeds 8,000,000 UTF-8 JSON bytes.');
 return state;
}
export const serializeGrenadeState=state=>canonical(openGrenadeState(state));
export function validateGrenadeState(state){try{openGrenadeState(state);return [];}catch(error){return error.diagnostics||[{code:'INVALID_STATE',path:'/',message:'Invalid grenade state.',action:'Use the supported schema.'}];}}
export const grenadeContext=state=>fresh(extract(openGrenadeState(state)));
export function matchesGrenadeContext(state,context){return canonical(extract(openGrenadeState(state)))===canonical(checkConsistent(data(context)));}
export function grenadeCost(weapon){if(typeof weapon!=='string'||!Object.hasOwn(WEAPON_RANGES,weapon))fail('UNSUPPORTED_WEAPON','/weapon','Select a supported equipped weapon ID.');return costOf(weapon);}
export function previewGrenade(input,command){const state=openGrenadeState(input);return preview(extract(state),checkCommand(data(command),{preview:true}));}
export function grenadeBlastFootprint(input,point){const state=openGrenadeState(input);return footprint(state.world,xy(data(point),'/point'));}
export function grenadeAffects(input,point,target){const state=openGrenadeState(input);return affects(state.world,xy(data(point),'/point'),xy(data(target),'/target'));}
const expected=state=>({state:canonical(state),context:canonical(extract(state))});
function prepare(input,command,type){
 const state=openGrenadeState(input),value=type==='throw'?checkCommand(data(command)):checkCheckpoint(data(command)),prior=state.receipts.find(item=>item.command.id===value.id);
 const base={next:state,expected:expected(state),receipt:null,presentation:null,consequences:[],repeated:false};
 if(prior){if(prior.type!==type||canonical(prior.command)!==canonical(value))return {...base,ok:false,code:'COMMAND_ID_CONFLICT',reason:'This command ID already identifies a different action.'};return {...base,ok:true,code:null,reason:'',receipt:fresh(prior),repeated:true};}
 if(value.expectedRevision!==state.revision)return {...base,ok:false,code:'STALE_REVISION',reason:'Command revision differs from current grenade context.'};
 if(state.revision>=GRENADE_CONTRACT.maximumReceipts)return {...base,ok:false,code:'JOURNAL_LIMIT',reason:'The retained grenade journal is full; explicit archival/migration is required.'};
 return {state,value,base};
}
export function stageGrenade(input,command){
 const prepared=prepare(input,command,'throw');if(!prepared.state)return prepared;
 const {state,value,base}=prepared,result=execute(extract(state),value,state.id,state.revision);
 if(!result.preview.ok)return {...base,ok:false,code:result.preview.code,reason:result.preview.reason,preview:result.preview};
 checkConsistent(result.context);
 const next={...state,...result.context,revision:state.revision+1,receipts:[...state.receipts,result.receipt]};
 try{openGrenadeState(next);}catch(error){if(error.code==='STATE_LIMIT')return {...base,ok:false,code:'STATE_LIMIT',reason:error.message};throw error;}
 return {...base,ok:true,code:null,reason:'',next,receipt:result.receipt,presentation:result.presentation,consequences:fresh(result.receipt.consequences),preview:result.preview};
}
export function adoptGrenadeContext(input,command){
 const prepared=prepare(input,command,'context');if(!prepared.state)return prepared;
 const {state,value,base}=prepared,current=checkConsistent(fresh(extract(value))),receipt={id:receiptId(state.id,value.id),type:'context',command:fresh(value),revision:state.revision+1};
 const next={...state,...current,revision:state.revision+1,receipts:[...state.receipts,receipt]};
 try{openGrenadeState(next);}catch(error){if(error.code==='STATE_LIMIT')return {...base,ok:false,code:'STATE_LIMIT',reason:error.message};throw error;}
 return {...base,ok:true,code:null,reason:'',next,receipt};
}
export function grenadeRequirements(input){openGrenadeState(input);return {schema:{id:GRENADE_CONTRACT.schemaId,version:1},required:[{id:GRENADE_CONTRACT.capability,minVersion:1,maxVersion:1},...GRENADE_COMPONENT.requiredHostServices.map(id=>({id,minVersion:1,maxVersion:1}))],optional:[{id:GRENADE_CONTRACT.aimCapability,minVersion:1,maxVersion:1}]};}
export function assertGrenadeCompatible(input,consumer){
 const state=openGrenadeState(input),requirements=grenadeRequirements(state);consumer=data(consumer);fields(consumer,['id','version','contractVersion','schemas','capabilities'],'/consumer',['id','contractVersion','schemas','capabilities']);
 if(typeof consumer.id!=='string'||!consumer.id.length||consumer.id.length>96)fail('INVALID_CONSUMER','/consumer/id','Expected a stable consumer ID.');
 if(Object.hasOwn(consumer,'version')&&(typeof consumer.version!=='string'||consumer.version.length>96))fail('INVALID_CONSUMER','/consumer/version','Expected a bounded consumer version.');
 if(consumer.contractVersion!==1)fail('UNSUPPORTED_CONSUMER','/consumer/contractVersion','Expected compatibility contract version 1.');
 for(const group of ['schemas','capabilities']){
  if(!Array.isArray(consumer[group])||consumer[group].length>128)fail('INVALID_CONSUMER','/consumer/'+group,'Expected at most 128 supported ID/version records.');const seen=new Set();
  for(const [index,item]of consumer[group].entries()){
   const path='/consumer/'+group+'/'+index;fields(item,['id','versions','description'],path,['id','versions']);
   if(typeof item.id!=='string'||!item.id.length||item.id.length>96||seen.has(item.id)||!Array.isArray(item.versions)||!item.versions.length||item.versions.length>32||item.versions.some(version=>!Number.isSafeInteger(version)||version<1||version>1000000)||new Set(item.versions).size!==item.versions.length)fail('INVALID_CONSUMER',path,'Invalid or duplicate supported ID/version.');
   if(Object.hasOwn(item,'description')&&(typeof item.description!=='string'||item.description.length>1000))fail('INVALID_CONSUMER',path+'/description','Expected a bounded description.');seen.add(item.id);
  }
 }
 for(const [group,requirement]of [['schemas',requirements.schema],...requirements.required.map(item=>['capabilities',{id:item.id,version:1}])])if(!consumer[group].some(item=>item.id===requirement.id&&item.versions.includes(requirement.version)))fail('INCOMPATIBLE_CONSUMER','/consumer/'+group,'Consumer lacks '+requirement.id+' version '+requirement.version+'.');return state;
}
