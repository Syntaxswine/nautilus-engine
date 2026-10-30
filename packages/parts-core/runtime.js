import {fields,finite,integer,list,bytes} from '../world-core/validation.js';
import {createInteractionQueries,openInteractionState,openInteractionActor,previewInteraction,applyInteraction,walkActor,advanceTraversal} from '../interactions/index.js';
import {id as interactionId} from '../interactions/state.js';
import {PARTS_CONTRACT,PARTS_LIMITS,partsInput,canonical,copy,freeze,failParts,PartsError} from './data.js';
import {requireCompiledScene} from './compiler.js';
import {compare} from './geometry.js';
import {sha256} from './hash.js';
import {apertureReadiness} from './clearance.js';

export const PARTS_RUNTIME_PROFILE=Object.freeze({id:'bounded-parts-runtime-v1',version:1,maxJournal:PARTS_LIMITS.journal,queriesProfile:'bounded-kinematic-v1'});
const known=new WeakMap(),actorOf=(runtime,id)=>runtime.actors.find(actor=>actor.id===id);
function remember(scene,runtime){if(bytes(canonical(runtime))>PARTS_LIMITS.bytes)failParts('PARTS_RUNTIME_LIMIT','/runtime','The bounded runtime checkpoint is full.','Preserve this checkpoint and deliberately migrate the session; receipts are never silently evicted.');freeze(runtime);known.set(runtime,scene.id);return runtime;}
function runtimeOf(scene,value){requireCompiledScene(scene);if(!value||known.get(value)!==scene.id)failParts('PARTS_RUNTIME_REQUIRED','/runtime','Use an immutable runtime returned by createPartsRuntime or openPartsRuntime.','Validate a complete content-bound save before replacing the current session.');return value;}
function room(runtime){if(runtime.journal.length>=PARTS_LIMITS.journal)failParts('PARTS_JOURNAL_LIMIT','/runtime/journal','The bounded commit/event journal is full.','Preserve the save and explicitly migrate to a new session/command namespace; do not clear receipts to reuse old commands.');}
function identity(command,scene){interactionId(command.id,'host commit ID');if(command.sceneId!==scene.id)failParts('STALE_PARTS_SCENE','/sceneId','The command belongs to another compiled geometry/content checkpoint.');integer(command.expectedRevision,0,PARTS_LIMITS.journal,'/expectedRevision');}
function actionCommand(command,scene){
  fields(command,['id','sceneId','expectedRevision','actorId','operation'],'/command');identity(command,scene);interactionId(command.actorId,'actor ID');const operation=command.operation;
  if(operation?.kind==='interact')fields(operation,['kind','intent'],'/command/operation');
  else if(operation?.kind==='walk'){fields(operation,['kind','direction','seconds'],'/command/operation');fields(operation.direction,['x','y'],'/command/operation/direction');finite(operation.direction.x,-1,1,'/command/operation/direction/x');finite(operation.direction.y,-1,1,'/command/operation/direction/y');finite(operation.seconds,0,1,'/command/operation/seconds');}
  else if(operation?.kind==='advance'){fields(operation,['kind','seconds'],'/command/operation');finite(operation.seconds,0,1,'/command/operation/seconds');}
  else failParts('UNSUPPORTED_PARTS_ACTION','/command/operation/kind','Choose interact, walk or advance.');
  return command;
}
function claimCommand(command,scene){fields(command,['id','sceneId','expectedRevision','eventIds'],'/command');identity(command,scene);list(command.eventIds,PARTS_LIMITS.journal,'/command/eventIds');if(!command.eventIds.length||new Set(command.eventIds).size!==command.eventIds.length||command.eventIds.some(id=>typeof id!=='string'||id.length>160))failParts('INVALID_EVENT_CLAIM','/command/eventIds','Claim a nonempty unique list of actual committed event identities.');return command;}
function fresh(runtime,command){const existing=runtime.journal.find(receipt=>receipt.command.id===command.id);if(existing)failParts(existing.commandHash===sha256(canonical(command))?'REPLAYED_PARTS_COMMAND':'PARTS_COMMAND_ID_REUSED','/command/id','This host commit identity has already been used.','Keep the accepted state/effects; use a fresh identity for a new action.');if(command.expectedRevision!==runtime.revision)failParts('STALE_PARTS_ACTION','/command/expectedRevision','The authoritative runtime or event ledger changed.','Preview against the current complete snapshot before committing.');}
function queryProvider(scene,queries){if(!queries||queries.sceneId!==scene.id||queries.worldId!==scene.world.id||queries.contractVersion!==1||queries.profileId!==PARTS_RUNTIME_PROFILE.queriesProfile)failParts('MISSING_PARTS_QUERY_BINDING','/queries','Bind the matching bounded AABB query provider once for this compiled scene.','Use createPartsQueries with the authoritative mover getter and optional pure unlock policy; rebuild the query snapshot when compiled geometry changes.');}
function execute(scene,runtime,command,queries){
  queryProvider(scene,queries);const actor=actorOf(runtime,command.actorId);if(!actor)failParts('UNKNOWN_PARTS_ACTOR','/command/actorId','The command names no authoritative mover in this session.');const operation=command.operation;
  if(operation.kind==='interact')return applyInteraction(runtime.interactions,actor,operation.intent,queries);
  if(operation.kind==='walk')return walkActor(runtime.interactions,actor,{direction:operation.direction,seconds:operation.seconds},queries);
  return advanceTraversal(runtime.interactions,actor,{seconds:operation.seconds},queries);
}
function outcome(error,runtime){return {ok:false,code:error.code||'INVALID_PARTS_ACTION',reason:error.message,runtime,events:[],diagnostics:error.diagnostics||[{code:error.code||'INVALID_PARTS_ACTION',path:'/command',reason:error.message,action:'Correct the request and preview current state before retrying.',instanceId:null,partId:null,definitionPath:null}]};}
function failed(result){if(!result.ok)failParts(result.code||'PARTS_ACTION_REJECTED','/command',result.reason||'The current authoritative query rejected this action.','Correct the current occupancy, permission, route or expected state before retrying.');}
function changed(runtime,result,actorId){return canonical(actorOf(runtime,actorId))!==canonical(result.actor)||canonical(runtime.interactions)!==canonical(result.state);}
function pending(runtime){return runtime.journal.flatMap(receipt=>receipt.type==='action'?receipt.events:[]).filter(event=>!runtime.claimedEvents.includes(event.id));}

/** Retained services are bound once. This facade keeps the existing kernel and
 * geometry profile; it adds no global event framework or gameplay permission.
 */
export function createPartsQueries(scene,options={}){
  requireCompiledScene(scene);if(!options||typeof options!=='object'||Object.getPrototypeOf(options)!==Object.prototype)failParts('INVALID_PARTS_BINDING','/queries','Supply a plain object of borrowed callback bindings.');
  for(const key of Reflect.ownKeys(options)){const descriptor=Object.getOwnPropertyDescriptor(options,key);if(!['actors','canUnlock','canLock'].includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='function')failParts('INVALID_PARTS_BINDING','/queries','Bindings must be explicit function values; accessors and unknown bindings are unsupported.');}
  const queries=createInteractionQueries(scene.world,{actors:options.actors||(()=>[])});return Object.freeze({...queries,sceneId:scene.id,contractVersion:1,profileId:PARTS_RUNTIME_PROFILE.queriesProfile,...(options.canUnlock?{canUnlock:options.canUnlock}:{}),...(options.canLock?{canLock:options.canLock}:{})});
}
function checkInitialActors(scene,input){
  list(input,PARTS_LIMITS.runtimeActors,'/actors');if(!input.length)failParts('MISSING_PARTS_ACTOR','/actors','Supply the selected native mover profile and spawn.');const actors=input.map(openInteractionActor).sort(compare),ids=new Set();
  for(const actor of actors){if(ids.has(actor.id))failParts('DUPLICATE_PARTS_ACTOR','/actors','Mover IDs must be unique.');ids.add(actor.id);if(actor.traversal!==null)failParts('INITIAL_PARTS_TRAVERSAL','/actors','Create a new session from standing actors; restore in-progress travel through its complete runtime save.');const ready=partsActorReadiness(scene,actor);if(!ready.ok)throw new PartsError(ready.code,'/actors',ready.reason,ready.diagnostics?.[0]?.action);}
  const queries=createPartsQueries(scene,{actors:()=>actors});for(const actor of actors){const candidates=scene.world.surfaces.filter(surface=>surface.supports&&surface.supportFloorId===actor.floorId&&surface.bounds.max.h===actor.position.h&&actor.position.x>=surface.bounds.min.x&&actor.position.x<=surface.bounds.max.x&&actor.position.y>=surface.bounds.min.y&&actor.position.y<=surface.bounds.max.y).sort(compare),landing={floorId:actor.floorId,surfaceId:candidates[0]?.id,position:actor.position};const support=queries.landing({actor,landing}),clear=queries.sweep({state:scene.interactions,actor,from:actor.position,to:actor.position});if(!support.ok||!clear.ok)failParts((!support.ok?support:clear).code,'/actors',(!support.ok?support:clear).reason,'Choose a confirmed supporting spawn and preserve actual native body dimensions.');}
  return actors;
}
export function partsActorReadiness(scene,input){
  try{
    requireCompiledScene(scene);const actor=openInteractionActor(input),body={radiusM:actor.radiusM,heightM:actor.heightM};
    for(const portal of scene.portals.filter(portal=>portal.mode==='functional'&&portal.doorId)){const ready=apertureReadiness({body,aperture:{widthM:portal.widthM,heightM:portal.heightM}});if(!ready.ok){const context=scene.sourceMap.find(record=>record.id===portal.id);failParts(ready.code,context?.path||'/actors',ready.reason,ready.action,context);}}
    if(scene.bodyProfile&&(actor.radiusM>scene.bodyProfile.radiusM+1e-7||actor.heightM>scene.bodyProfile.heightM+1e-7))failParts('PARTS_BODY_PROFILE_MISMATCH','/actors','The actual mover exceeds the measured maximum body used for readiness.','Compile this geometry for its actual native body and check its route/opening clearances; do not shrink the actor.');
    return {ok:true};
  }catch(error){return {ok:false,code:error.code||'INVALID_PARTS_ACTOR',reason:error.message,diagnostics:error.diagnostics||[]};}
}
export function createPartsRuntime(scene,options){
  requireCompiledScene(scene);const data=partsInput(options);fields(data,['actors'],'/options');const actors=checkInitialActors(scene,data.actors);return remember(scene,{kind:'nautilus-parts-runtime',version:1,sceneId:scene.id,revision:0,initialActors:actors,actors,interactions:scene.interactions,journal:[],claimedEvents:[]});
}
export function previewPartsAction(scene,snapshot,input,queries){
  try{
    const runtime=runtimeOf(scene,snapshot),request=partsInput(input);interactionId(request.id,'host commit ID');interactionId(request.actorId,'actor ID');room(runtime);queryProvider(scene,queries);const actor=actorOf(runtime,request.actorId);if(!actor)failParts('UNKNOWN_PARTS_ACTOR','/actorId','Select an existing authoritative mover.');let operation,label,result;
    if(request.kind==='interact'){
      fields(request,['id','actorId','kind','targetId','action'],'/request',['id','actorId','kind','targetId']);const options={targetId:request.targetId};if(Object.hasOwn(request,'action'))options.kind=request.action;result=previewInteraction(runtime.interactions,actor,options,queries);failed(result);operation={kind:'interact',intent:result.command};label=result.label;
    }else if(request.kind==='walk'){
      fields(request,['id','actorId','kind','direction','seconds'],'/request');operation={kind:'walk',direction:request.direction,seconds:request.seconds};result=walkActor(runtime.interactions,actor,{direction:request.direction,seconds:request.seconds},queries);failed(result);if(!changed(runtime,result,actor.id))failParts('NO_PARTS_CHANGE','/request','This sample does not change authoritative movement.');label='Walk';
    }else if(request.kind==='advance'){
      fields(request,['id','actorId','kind','seconds'],'/request');operation={kind:'advance',seconds:request.seconds};result=advanceTraversal(runtime.interactions,actor,{seconds:request.seconds},queries);failed(result);if(!changed(runtime,result,actor.id))failParts('NO_PARTS_CHANGE','/request','There is no positive active traversal step.');label='Advance traversal';
    }else failParts('UNSUPPORTED_PARTS_ACTION','/request/kind','Choose interact, walk or advance.');
    const command=actionCommand({id:request.id,sceneId:scene.id,expectedRevision:runtime.revision,actorId:actor.id,operation},scene);fresh(runtime,command);return {ok:true,label,command,events:[]};
  }catch(error){return outcome(error,snapshot);}
}
export function applyPartsAction(scene,snapshot,input,queries){
  try{
    const runtime=runtimeOf(scene,snapshot),command=actionCommand(partsInput(input),scene);fresh(runtime,command);room(runtime);const result=execute(scene,runtime,command,queries);failed(result);if(!changed(runtime,result,command.actorId))failParts('NO_PARTS_CHANGE','/command','No authoritative action was committed.');
    const receipt={type:'action',command,commandHash:sha256(canonical(command)),events:result.events},next={...runtime,revision:runtime.revision+1,actors:runtime.actors.map(actor=>actor.id===command.actorId?result.actor:actor),interactions:result.state,journal:[...runtime.journal,receipt]};
    return {ok:true,runtime:remember(scene,next),receipt:freeze(receipt),events:[],pendingEventIds:result.events.map(event=>event.id),expectedRevision:runtime.revision};
  }catch(error){return outcome(error,snapshot);}
}
/** Persist the returned snapshot atomically before dispatching its events.
 * Restoring a save never invokes this function or replays a presentation effect.
 */
export function claimPartsEvents(scene,snapshot,input){
  try{
    const runtime=runtimeOf(scene,snapshot),command=claimCommand(partsInput(input),scene);fresh(runtime,command);room(runtime);const available=new Map(pending(runtime).map(event=>[event.id,event])),events=command.eventIds.map(id=>{const event=available.get(id);if(!event)failParts('EVENT_NOT_PENDING','/command/eventIds','An event is unknown or has already been claimed.','Keep the current ledger; dispatch only the events returned by a newly accepted claim.');return event;});
    const receipt={type:'claim',command,commandHash:sha256(canonical(command)),events:[]},next={...runtime,revision:runtime.revision+1,journal:[...runtime.journal,receipt],claimedEvents:[...runtime.claimedEvents,...command.eventIds]};return {ok:true,runtime:remember(scene,next),receipt:freeze(receipt),events:copy(events),expectedRevision:runtime.revision};
  }catch(error){return outcome(error,snapshot);}
}
export function pendingPartsEvents(scene,snapshot){return copy(pending(runtimeOf(scene,snapshot)));}

function validateSnapshot(scene,data){
  fields(data,['kind','version','sceneId','revision','initialActors','actors','interactions','journal','claimedEvents'],'/runtime');if(data.kind!=='nautilus-parts-runtime'||data.version!==1||data.sceneId!==scene.id)failParts('INCOMPATIBLE_PARTS_RUNTIME','/runtime','Use the matching parts runtime version and compiled scene.');list(data.journal,PARTS_LIMITS.journal,'/runtime/journal');integer(data.revision,0,PARTS_LIMITS.journal,'/runtime/revision');if(data.revision!==data.journal.length)failParts('PARTS_JOURNAL_TAMPERED','/runtime/revision','Runtime revision must match the complete bounded commit journal.');
  let actors=checkInitialActors(scene,data.initialActors),interactions=scene.interactions;const ids=new Set(),claimed=[],generated=new Map();const queries=createPartsQueries(scene,{actors:()=>actors,canUnlock:()=>({ok:true}),canLock:()=>({ok:true})});
  // Re-evaluate committed geometry/kinematics only. Historical permission was a
  // host decision; no live permission callback, cost, sound or effect is replayed.
  for(const [index,receipt]of data.journal.entries()){
    const path='/runtime/journal/'+index;fields(receipt,['type','command','commandHash','events'],path);const command=receipt.type==='action'?actionCommand(receipt.command,scene):receipt.type==='claim'?claimCommand(receipt.command,scene):null;
    if(!command||command.expectedRevision!==index||ids.has(command.id)||receipt.commandHash!==sha256(canonical(command)))failParts('PARTS_JOURNAL_TAMPERED',path,'The commit identity, revision or canonical command digest is inconsistent.');ids.add(command.id);
    if(receipt.type==='action'){
      const result=execute(scene,{actors,interactions},command,queries);failed(result);if(!changed({actors,interactions},result,command.actorId)||canonical(result.events)!==canonical(receipt.events))failParts('PARTS_JOURNAL_TAMPERED',path,'A recorded action does not reproduce its committed result/events.');actors=actors.map(actor=>actor.id===command.actorId?result.actor:actor);interactions=result.state;for(const event of result.events){if(generated.has(event.id))failParts('PARTS_EVENT_COLLISION',path,'Committed event IDs must be unique.');generated.set(event.id,event);}
    }else{
      if(!Array.isArray(receipt.events)||receipt.events.length)failParts('PARTS_JOURNAL_TAMPERED',path,'An event claim cannot create another authoritative event.');for(const id of command.eventIds){if(!generated.has(id)||claimed.includes(id))failParts('PARTS_JOURNAL_TAMPERED',path,'A claim must consume a previously generated event exactly once.');claimed.push(id);}
    }
  }
  list(data.actors,PARTS_LIMITS.runtimeActors,'/runtime/actors');data.actors.forEach(openInteractionActor);openInteractionState(data.interactions);if(canonical(data.actors)!==canonical(actors)||canonical(data.interactions)!==canonical(interactions)||canonical(data.claimedEvents)!==canonical(claimed))failParts('PARTS_RUNTIME_TAMPERED','/runtime','Saved movers, routes, doors or claimed events do not match the complete committed journal.','Restore the original complete content-bound save; do not edit or normalize its runtime fields.');
  return remember(scene,data);
}
function hostData(input){const data=partsInput(input);if(!data||typeof data!=='object'||Array.isArray(data)||bytes(canonical(data))>PARTS_LIMITS.hostBytes)failParts('INVALID_PARTS_HOST_CHECKPOINT','/hostData','Preserve host-owned data as a plain object within one million UTF-8 bytes.');return data;}
export function serializePartsRuntime(scene,snapshot,gameData={}){
  const runtime=runtimeOf(scene,snapshot),envelope={kind:PARTS_CONTRACT.runtimeSchemaId,version:1,profileId:PARTS_RUNTIME_PROFILE.id,sceneId:scene.id,definitionLocks:scene.definitionLocks,world:scene.world,runtime,hostData:hostData(gameData)},wire=canonical(envelope);if(bytes(wire)>PARTS_LIMITS.bytes)failParts('PARTS_RUNTIME_LIMIT','/','The complete parts/game checkpoint exceeds eight million UTF-8 bytes.');return wire;
}
export function openPartsRuntime(scene,input){
  requireCompiledScene(scene);const data=partsInput(input);fields(data,['kind','version','profileId','sceneId','definitionLocks','world','runtime','hostData'],'');
  if(data.kind!==PARTS_CONTRACT.runtimeSchemaId||data.version!==1||data.profileId!==PARTS_RUNTIME_PROFILE.id)failParts('UNSUPPORTED_PARTS_SAVE','/version','Select the matching bounded parts-runtime-save version/profile.');if(data.sceneId!==scene.id||canonical(data.definitionLocks)!==canonical(scene.definitionLocks)||canonical(data.world)!==canonical(scene.world))failParts('STALE_PARTS_GEOMETRY','/sceneId','This save belongs to different geometry, definitions or native profile.','Compile its exact original document/content versions or perform a reviewed migration; revision counters alone do not establish compatibility.');
  const preserved=hostData(data.hostData),runtime=validateSnapshot(scene,data.runtime);return {runtime,hostData:preserved,events:[]};
}
