import {FARMYARD_DOOR_CONTRACT as C,FARMYARD_DOOR_PROFILE as P,FARMYARD_DOOR_COMPONENT} from './profile.js';
import {data,fields,id,integer,canonical,clone,fail,FarmyardDoorError} from './data.js';
import {CONTEXT_FIELDS,extract,checkContext,checkCommand,checkCheckpoint} from './model.js';
import {preview,execute,receiptId} from './mechanics.js';
import {geometry,collider} from './world.js';
import {assertRequirements} from '../../../map-core/requirements.js';
export function createFarmyardDoorState(options){const value=data(options);fields(value,['id',...CONTEXT_FIELDS],'/options');id(value.id,'/options/id');const initial=checkContext(extract(value));return openFarmyardDoorState({kind:C.schemaId,version:1,id:value.id,profileId:P.id,revision:0,initial:clone(initial),...clone(initial),receipts:[]});}
export function openFarmyardDoorState(input){
  const state=data(input);fields(state,['kind','version','id','profileId','revision','initial',...CONTEXT_FIELDS,'receipts'],'');if(state.kind!==C.schemaId||state.version!==1||state.profileId!==P.id)fail('UNSUPPORTED_PROFILE','/profileId','Use Farmyard door-state v1 with its explicit endpoint profile.');id(state.id,'/id');integer(state.revision,0,C.maximumReceipts,'/revision');checkContext(state.initial,'/initial');checkContext(extract(state));
  if(!Array.isArray(state.receipts)||state.receipts.length>C.maximumReceipts||state.revision!==state.receipts.length)fail('INVALID_JOURNAL','/receipts','Revision must equal the complete bounded journal; identities cannot be evicted.');
  let current=clone(state.initial);const ids=new Set();
  for(const [index,receipt]of state.receipts.entries()){
    const path='/receipts/'+index;if(!receipt||!['action','context'].includes(receipt.type))fail('INVALID_JOURNAL',path,'Unknown journal record type.');
    const command=receipt.type==='action'?checkCommand(receipt.command):checkCheckpoint(receipt.command);if(ids.has(command.id)||command.expectedRevision!==index)fail('INVALID_JOURNAL',path,'Journal command identity/revision is inconsistent.');ids.add(command.id);let expected;
    if(receipt.type==='action'){const result=execute(current,command,state.id,index);if(!result.preview.ok)fail('INVALID_JOURNAL',path,'A recorded door command is not valid against its historical context.');current=checkContext(result.context);expected=result.receipt;}
    else{current=clone(extract(command));expected={id:receiptId(state.id,command.id),type:'context',command:clone(command),revision:index+1};}
    if(canonical(receipt)!==canonical(expected))fail('INVALID_JOURNAL',path,'Receipt data differs from the replayed source/profile result.');
  }
  if(canonical(current)!==canonical(extract(state)))fail('STATE_MISMATCH','/','Current door/host projection differs from its complete journal.');return state;
}
export const serializeFarmyardDoorState=input=>canonical(openFarmyardDoorState(input));
export function validateFarmyardDoorState(input){try{openFarmyardDoorState(input);return [];}catch(error){return error.diagnostics||[{code:'INVALID_STATE',path:'/',message:error.message,action:'Restore the original complete door checkpoint.'}];}}
export const farmyardDoorContext=input=>clone(extract(openFarmyardDoorState(input)));
export const farmyardDoorContextToken=context=>canonical(checkContext(data(context)));
export function matchesFarmyardDoorContext(input,context){return canonical(extract(openFarmyardDoorState(input)))===farmyardDoorContextToken(context);}
export const farmyardDoorColliders=input=>openFarmyardDoorState(input).doors.map(door=>collider(door));
export const farmyardDoorGeometry=input=>geometry(openFarmyardDoorState(input));
export function previewFarmyardDoor(input,command){return preview(extract(openFarmyardDoorState(input)),checkCommand(data(command)));}
const expected=(state,context=extract(state))=>({state:canonical(state),context:canonical(context)});
function prepare(input,command,type){
  const state=openFarmyardDoorState(input),value=type==='action'?checkCommand(data(command)):checkCheckpoint(data(command)),prior=state.receipts.find(record=>record.command.id===value.id),base={next:state,expected:expected(state),receipt:null,presentation:null,consequences:[],repeated:false};
  if(prior){if(prior.type!==type||canonical(prior.command)!==canonical(value))return {...base,ok:false,code:'COMMAND_ID_CONFLICT',reason:'This durable ID already names a different command kind or payload.'};return {...base,ok:true,code:null,reason:'',receipt:clone(prior),repeated:true};}
  if(value.expectedRevision!==state.revision)return {...base,ok:false,code:'STALE_REVISION',reason:'Door context revision changed; reproject and preview current state.'};
  if(state.receipts.length>=C.maximumReceipts)return {...base,ok:false,code:'JOURNAL_LIMIT',reason:'The retained door journal is full; preserve it for an explicit reviewed archival/migration policy.'};return {state,value,base};
}
function prospective(next,base){try{return {next:openFarmyardDoorState(next)};}catch(error){if(!(error instanceof FarmyardDoorError))throw error;return {...base,ok:false,code:error.code,reason:error.message,diagnostics:error.diagnostics};}}
export function stageFarmyardDoor(input,command){
  const prepared=prepare(input,command,'action');if(!prepared.state)return prepared;const {state,value,base}=prepared,result=execute(extract(state),value,state.id,state.revision);if(!result.preview.ok)return {...base,ok:false,code:result.preview.code,reason:result.preview.reason,preview:result.preview};
  const checked=prospective({...state,...result.context,revision:state.revision+1,receipts:[...state.receipts,result.receipt]},base);if(checked.ok===false)return checked;return {...base,ok:true,code:null,reason:'',next:checked.next,receipt:clone(result.receipt),presentation:result.presentation,consequences:clone(result.receipt.consequences),preview:result.preview};
}
export function adoptFarmyardDoorContext(input,command){
  const prepared=prepare(input,command,'context');if(!prepared.state)return prepared;const {state,value,base}=prepared,current=clone(extract(value));if(canonical(current)===canonical(extract(state)))return {...base,ok:false,code:'NO_CONTEXT_CHANGE',reason:'The relevant retained context is unchanged; no checkpoint was recorded.'};const receipt={id:receiptId(state.id,value.id),type:'context',command:clone(value),revision:state.revision+1},checked=prospective({...state,...current,revision:state.revision+1,receipts:[...state.receipts,receipt]},base);if(checked.ok===false)return checked;
  // Adoption's CAS context is the captured fresh host projection, not the stale
  // previous sidecar. Compare it again inside the host's atomic transaction.
  return {...base,ok:true,code:null,reason:'',next:checked.next,receipt,expected:expected(state,current)};
}
export function farmyardDoorRequirements(input){openFarmyardDoorState(input);return {schema:{id:C.schemaId,version:1},required:[{id:C.capability,minVersion:1,maxVersion:1},...FARMYARD_DOOR_COMPONENT.requiredHostServices.map(id=>({id,minVersion:1,maxVersion:1}))],optional:[]};}
export function assertFarmyardDoorCompatible(input,consumer){const state=openFarmyardDoorState(input);assertRequirements(farmyardDoorRequirements(state),data(consumer));return state;}
