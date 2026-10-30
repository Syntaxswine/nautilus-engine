import {FARMYARD_DOOR_PROFILE as P} from './profile.js';
import {data,fields,plain,canonical,clone,fail,FarmyardDoorError} from './data.js';
import {extract,checkCheckpoint} from './model.js';
import {projectSource} from './projection.js';
import {geometry} from './world.js';
import {openFarmyardDoorState,serializeFarmyardDoorState,farmyardDoorContext,matchesFarmyardDoorContext,previewFarmyardDoor,stageFarmyardDoor,adoptFarmyardDoorContext,assertFarmyardDoorCompatible} from './state.js';

const setKeys=['seen','visible','detected'];
const sourceSetFields=source=>setKeys.filter(key=>source[key] instanceof Set);
function restoreSets(source,keys){const host=clone(source);for(const key of keys)host[key]=new Set(host[key]);return host;}
function token(source,keys){return JSON.stringify({source,setFields:keys});}
// Includes every retained source field, even fields absent from the small door
// context. A concurrent ammunition/RNG/inventory update must fail the host CAS.
export function farmyardDoorHostToken(source){const copied=data(source,{sets:true});return token(copied,sourceSetFields(source));}
function queryGeometry(host,query){const staged=restoreSets(data(host,{sets:true}),sourceSetFields(host)),before=farmyardDoorHostToken(staged),raw=query(staged);if(before!==farmyardDoorHostToken(staged))fail('IMPURE_GEOMETRY_QUERY','/services/geometry','The retained geometry query changed its detached source input.');return raw;}

function bundle(state,source,setFields){return data({kind:'nautilus-farmyard-door-host-save',version:1,profileId:P.id,doorState:state,source,setFields});}
function consistent(state,source,rawGeometry){
  const projected=projectSource(source,{geometry:rawGeometry});
  if(!matchesFarmyardDoorContext(state,projected.context))fail('CONTEXT_ADOPTION_REQUIRED','/source','Capture and adopt the fresh retained context before a new door action or complete save.');
  return projected;
}
export function serializeFarmyardDoorHostSave(input,host,options){
  const state=openFarmyardDoorState(input),projected=projectSource(host,options);
  if(!matchesFarmyardDoorContext(state,projected.context))fail('CONTEXT_ADOPTION_REQUIRED','/source','Adopt the fresh host projection before saving the joint checkpoint.');
  // The retained game enumerates some source records (notably edges). Keep
  // that order in a complete save instead of canonicalizing the whole host.
  return JSON.stringify(bundle(state,projected.source,sourceSetFields(host)));
}
// Query only a detached, validated source copy. This deliberately bypasses the
// donor's repair/relocation loader; no live actor or one-shot effect is touched.
export function openFarmyardDoorHostSave(input,options){
  const saved=data(input);fields(saved,['kind','version','profileId','doorState','source','setFields'],'');
  if(saved.kind!=='nautilus-farmyard-door-host-save'||saved.version!==1||saved.profileId!==P.id)fail('UNSUPPORTED_PROFILE','/profileId','Use the complete Farmyard door host-save v1 profile.');
  if(!Array.isArray(saved.setFields)||saved.setFields.some(key=>!setKeys.includes(key))||new Set(saved.setFields).size!==saved.setFields.length)fail('INVALID_DATA','/setFields','Only the three retained source fog/detection sets can be restored.');
  const descriptors=serviceRecord(options,['geometryForHost']);
  const state=openFarmyardDoorState(saved.doorState),source=data(saved.source);for(const key of setKeys)if(!Array.isArray(source[key]))fail('INVALID_DATA','/source/'+key,'Saved fog/detection data must be explicit arrays, never repaired.');
  const host=restoreSets(source,saved.setFields),before=farmyardDoorHostToken(host);
  const raw=descriptors.geometryForHost(host);
  if(before!==farmyardDoorHostToken(host))fail('IMPURE_GEOMETRY_QUERY','/options/geometryForHost','The retained geometry query changed its staged source input.');
  consistent(state,host,raw);return {doorState:state,host};
}
function baseResult(result,source,keys){return {...result,hostNext:restoreSets(source,keys),expected:{...result.expected,host:token(source,keys)}};}
function changed(record,before,after,keys){for(const key of keys)if(canonical(before[key])!==canonical(after[key]))record[key]=clone(after[key]);}
function applySourceDelta(source,state,next,receipt){
  const before=farmyardDoorContext(state),after=farmyardDoorContext(next),host=clone(source);
  for(const unit of host.units){const a=before.actors.find(actor=>actor.id===unit.id),b=after.actors.find(actor=>actor.id===unit.id);changed(unit,a,b,['ap','isMoving','alert','lastKnown','alertAge']);}
  const leaf=after.doors.find(door=>door.id===receipt.command.doorId),object=host.interactables.find(item=>item.id===leaf.id);object.open=leaf.open;host.edges[leaf.edge]=leaf.open?'door':'closed-door';host.queue=clone(after.queue);
  changed(host,before.control,after.control,['phase','round','engaged']);if(before.control.status!==after.control.status)host.solo.status=after.control.status;
  host.detected=clone(after.control.detected);host.visible=clone(after.world.visible);host.seen=clone(after.world.seen);host.fogAt=clone(after.world.fogAt);
  // Source stop() and refresh() each bump once. Each source log() bumps again.
  host.revision+=2;
  for(const effect of receipt.consequences){let line;
    if(effect.type==='log-door')line=(effect.open?'Opened':'Closed')+' the '+effect.name.toLowerCase()+' ('+effect.cost+' AP).';
    if(effect.type==='log-contact')line='Contact. Movement now spends AP by distance.';
    if(effect.type==='log-contact-broken')line='Contact broken. Real-time exploration resumed.';
    if(line){host.log.unshift(line);host.log=host.log.slice(0,35);host.revision++;}
  }
  return host;
}
function savedCandidate(result,host,keys){
  try{
    // Validate the complete prospective joint save, not only either half. The
    // geometry is the same authoritative static context + new current leaves.
    const saved=bundle(result.next,host,keys);consistent(saved.doorState,restoreSets(saved.source,keys),geometry(saved.doorState));
    return {...result,hostNext:restoreSets(saved.source,keys)};
  }catch(error){if(!(error instanceof FarmyardDoorError))throw error;return {ok:false,code:error.code,reason:error.message,diagnostics:error.diagnostics};}
}
export function stageFarmyardDoorHost(input,host,command,options){
  const state=openFarmyardDoorState(input),projected=projectSource(host,options),keys=sourceSetFields(host),result=baseResult(stageFarmyardDoor(state,command),projected.source,keys);
  if(result.repeated||result.code==='COMMAND_ID_CONFLICT')return result;
  if(!matchesFarmyardDoorContext(state,projected.context))return {...baseResult({...result,next:state,receipt:null,presentation:null,consequences:[]},projected.source,keys),ok:false,code:'CONTEXT_ADOPTION_REQUIRED',reason:'Adopt the fresh relevant host context before staging a new door action.'};
  if(!result.ok)return result;
  const candidate=savedCandidate(result,applySourceDelta(projected.source,state,result.next,result.receipt),keys);
  return candidate.ok===false?{...baseResult({...result,next:state,receipt:null,presentation:null,consequences:[]},projected.source,keys),...candidate}:candidate;
}
export function adoptFarmyardDoorHost(input,host,command,options){
  const state=openFarmyardDoorState(input),projected=projectSource(host,options),keys=sourceSetFields(host),value=checkCheckpoint(data(command)),result=baseResult(adoptFarmyardDoorContext(state,value),projected.source,keys);
  if(result.repeated||result.code==='COMMAND_ID_CONFLICT')return result;
  if(canonical(extract(value))!==canonical(projected.context))return {...baseResult({...result,next:state,receipt:null},projected.source,keys),ok:false,code:'STALE_CONTEXT',reason:'The retained host differs from the captured checkpoint; capture current data again.'};
  if(!result.ok)return result;
  const candidate=savedCandidate(result,projected.source,keys);
  return candidate.ok===false?{...baseResult({...result,next:state,receipt:null},projected.source,keys),...candidate}:candidate;
}

function serviceRecord(input,required,optional=[]){
  if(!plain(input))fail('MISSING_BINDING','/services','Supply the documented retained host services.');const result={};
  for(const key of Reflect.ownKeys(input)){const descriptor=Object.getOwnPropertyDescriptor(input,key);if(typeof key!=='string'||![...required,...optional].includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))fail('INVALID_BINDING','/services','Service bindings require known plain own data fields.');result[key]=descriptor.value;}
  for(const key of required)if(typeof result[key]!=='function')fail('MISSING_BINDING','/services/'+key,'Bind the retained '+key+' service before connecting doors.');
  for(const key of optional)if(result[key]!==undefined&&key!=='consumer'&&typeof result[key]!=='function')fail('INVALID_BINDING','/services/'+key,'Optional presentation must be a function.');return result;
}
// Connect once per retained host, not once per scene/leaf. The host's synchronous
// CAS owns the actual transaction; callbacks publish already committed results.
export function connectFarmyardDoors(options){
  const services=serviceRecord(options,['read','compareAndSwap','geometry','invalidateRoutes','publishVisibility','publishColliders'],['consumer','present']);let disposed=false;
  const snapshot=()=>{if(disposed)fail('DISPOSED','/binding','This connection has been disposed.');const value=services.read();if(!plain(value)||Reflect.ownKeys(value).length!==2||!['doorState','host'].every(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return descriptor?.enumerable&&Object.hasOwn(descriptor,'value');}))fail('INVALID_BINDING','/services/read','Return {doorState,host} as plain data fields.');return value;};
  const initial=snapshot();assertFarmyardDoorCompatible(initial.doorState,services.consumer);projectSource(initial.host,{geometry:queryGeometry(initial.host,services.geometry)});
  function transact(command,adoption){
    const {doorState,host}=snapshot(),raw=queryGeometry(host,services.geometry),result=(adoption?adoptFarmyardDoorHost:stageFarmyardDoorHost)(doorState,host,command,{geometry:raw});
    if(!result.ok||result.repeated)return {...result,committed:false,presentationErrors:[]};
    // Recheck actual prospective host geometry before replacing live records.
    // Keep source metadata (cover/material/part roles) in the borrowed query;
    // the narrow normalized context is only the door/refresh calculation.
    const prospectiveGeometry=queryGeometry(result.hostNext,services.geometry);consistent(result.next,result.hostNext,prospectiveGeometry);
    const committed=services.compareAndSwap({expected:clone(result.expected),doorState:clone(result.next),host:result.hostNext});
    if(committed!==true&&committed!==false)fail('INVALID_BINDING','/services/compareAndSwap','The atomic synchronous commit must return a boolean.');
    if(!committed)return {...result,ok:false,code:'STALE_HOST',reason:'The atomic host/state/context comparison failed; capture again.',next:openFarmyardDoorState(doorState),hostNext:host,receipt:null,consequences:[],presentation:null,committed:false,presentationErrors:[]};
    const presentationErrors=[];
    if(!adoption){const context=farmyardDoorContext(result.next),effects=[['invalidateRoutes',()=>services.invalidateRoutes({receiptId:result.receipt.id,consequences:clone(result.consequences)})],['publishVisibility',()=>services.publishVisibility({receiptId:result.receipt.id,world:clone(context.world),control:clone(context.control)})],['publishColliders',()=>services.publishColliders({receiptId:result.receipt.id,colliders:clone(prospectiveGeometry)})]];
      if(services.present)effects.push(['present',()=>services.present(clone(result.presentation))]);
      for(const [service,publish]of effects)try{publish();}catch(error){presentationErrors.push({service,message:String(error?.message??error)});}
    }
    return {...result,committed:true,presentationErrors};
  }
  return Object.freeze({
    preview(command){const {doorState,host}=snapshot();consistent(doorState,host,queryGeometry(host,services.geometry));return previewFarmyardDoor(doorState,command);},
    perform:command=>transact(command,false),adopt:command=>transact(command,true),
    save(){const {doorState,host}=snapshot();return serializeFarmyardDoorHostSave(doorState,host,{geometry:queryGeometry(host,services.geometry)});},
    dispose(){disposed=true;}
  });
}
