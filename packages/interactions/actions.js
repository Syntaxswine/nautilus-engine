import {openInteractionState,openInteractionActor,interactionData,copy,object,id,integer,number,point,distance,samePoint,routeLength,routePoint,bump,fail} from './state.js';
import {SUPPORTED_WALK_CONTRACT,supportedPolicy,supportedQuery,supportPath,openSupportedTravel,floorAfterTravel,activeSupportedStep} from './supported-travel.js';
const denied=(code,reason)=>({ok:false,code,reason,events:[]});
function operate(input,actorInput,run){
  let state=null,actor=null;
  try{state=openInteractionState(input);actor=openInteractionActor(actorInput);const expected={worldRevision:state.revision,actorRevision:actor.revision};return {...run(copy(state),copy(actor)),expected};}
  catch(error){return {...denied(error.code||'INVALID_DATA',error.message),state,actor};}
}
function query(bindings,name,value){
  if(bindings?.worldId!==value.state.worldId)fail('MISSING_BINDING','Connect queries for this world before using interactions.');
  if(typeof bindings[name]!=='function')fail('MISSING_BINDING','Connect the '+name+' query before using this action.');
  const result=bindings[name](copy(value));
  if(!result||typeof result.ok!=='boolean')fail('INVALID_BINDING','Queries must return {ok, code?, reason?}.');
  if(!result.ok)fail(result.code||'BLOCKED',result.reason||'This action is currently blocked.');
  return result;
}
const event=(state,actor,type,targetId)=>({id:state.worldId+'/interactions/'+state.revision,type,targetId,actorId:actor.id,worldId:state.worldId});
// Shared flag transition. Callers validate their own authority/geometry profile;
// this primitive owns no mover, AP, clock, persistence or host side effects.
export function planDoorTransition(door,kind){
  kind??=door.open?'close-door':'open-door';
  if(!['open-door','close-door','unlock-door','lock-door'].includes(kind))fail('UNSUPPORTED_ACTION','Use a door action for this target.');
  if(kind==='unlock-door'){if(!door.locked)fail('ALREADY_UNLOCKED','This door is already unlocked.');return {kind,binding:'canUnlock',label:'Unlock '+door.label};}
  if(kind==='lock-door'){if(door.open)fail('DOOR_OPEN','Close the door before locking it.');if(door.locked)fail('ALREADY_LOCKED','This door is already locked.');return {kind,binding:'canLock',label:'Lock '+door.label};}
  if(kind==='open-door'&&door.locked)fail('LOCKED','This door is locked. Find a key or another way in.');
  if((kind==='open-door')===door.open)fail('ALREADY_SET','The door is already '+(door.open?'open.':'closed.'));
  return {kind,binding:'canSetDoor',open:kind==='open-door',label:(kind==='open-door'?'Open ':'Close ')+door.label};
}
export function commitDoorTransition(door,kind){
  const planned=planDoorTransition(door,kind);
  if(planned.kind==='unlock-door'){door.locked=false;return 'door-unlocked';}
  if(planned.kind==='lock-door'){door.locked=true;return 'door-locked';}
  door.open=planned.open;return door.open?'door-opened':'door-closed';
}
function plan(state,actor,targetId,kind,bindings){
  id(targetId);if(actor.traversal)fail('IN_TRANSIT','Finish the current stair route before using another interaction.');
  const door=state.doors.find(value=>value.id===targetId),stairs=state.stairs.find(value=>value.id===targetId);
  if(!door&&!stairs)fail('UNKNOWN_TARGET','Choose an interaction declared in this world.');
  if(door){
    if(actor.floorId!==door.floorId||distance(actor.position,door.position)>door.reachM)fail('OUT_OF_REACH','Move closer to '+door.label+'.');
    const planned=planDoorTransition(door,kind),value={state,actor,door};
    if(planned.binding==='canSetDoor')value.open=planned.open;
    query(bindings,planned.binding,value);
    return {kind:planned.kind,target:door,label:planned.label};
  }
  kind??='traverse-stairs';
  if(kind!=='traverse-stairs')fail('UNSUPPORTED_ACTION','Use stair traversal for this target.');
  const direction=actor.floorId===stairs.from.floorId?1:actor.floorId===stairs.to.floorId?-1:0;
  if(!direction||direction===-1&&!stairs.bidirectional)fail('WRONG_DIRECTION','These stairs cannot be entered from this floor.');
  const from=direction===1?stairs.from:stairs.to,to=direction===1?stairs.to:stairs.from;
  if(distance(actor.position,from.position)>stairs.reachM)fail('OUT_OF_REACH','Move to the stair landing.');
  if(actor.radiusM*2>stairs.widthM||actor.heightM>stairs.clearanceM)fail('BODY_TOO_LARGE','This stair route is too narrow or low for this actor.');
  for(const landing of [from,to])query(bindings,'landing',{state,actor,landing});
  query(bindings,'walk',{state,actor,from:actor.position,to:from.position});
  const path=[copy(actor.position),...(direction===1?copy(stairs.path):copy(stairs.path).reverse())];
  for(let index=1;index<path.length;index++)query(bindings,'sweep',{state,actor,from:path[index-1],to:path[index]});
  return {kind,target:stairs,direction,path,label:'Take '+stairs.label};
}
/** Pure readiness + revision-stamped intent. Queries must also be pure. */
export function previewInteraction(input,actorInput,options={},bindings){
  return operate(input,actorInput,(state,actor)=>{
    const data=interactionData(options);object(data,['targetId','kind'],'preview options',['targetId']);const {targetId,kind}=data;
    const planned=plan(state,actor,targetId,kind,bindings);
    return {ok:true,label:planned.label,events:[],command:{kind:planned.kind,targetId,worldId:state.worldId,worldRevision:state.revision,actorId:actor.id,actorRevision:actor.revision}};
  });
}
/** Revalidates live geometry/permissions. Host atomically commits both returned records. */
export function applyInteraction(input,actorInput,command,bindings){
  return operate(input,actorInput,(state,actor)=>{
    command=interactionData(command);
    object(command,['kind','targetId','worldId','worldRevision','actorId','actorRevision'],'interaction command');
    if(!['open-door','close-door','unlock-door','lock-door','traverse-stairs'].includes(command.kind))fail('UNSUPPORTED_ACTION','Choose a supported explicit interaction action.');
    id(command.worldId);id(command.actorId);integer(command.worldRevision,'world revision');integer(command.actorRevision,'actor revision');
    if(command.worldId!==state.worldId||command.actorId!==actor.id)fail('WRONG_SUBJECT','Command belongs to another world or actor.');
    if(command.worldRevision!==state.revision||command.actorRevision!==actor.revision)fail('STALE_ACTION','The world or actor changed. Preview the action again.');
    const planned=plan(state,actor,command.targetId,command.kind,bindings);
    let type;
    if(planned.kind==='traverse-stairs'){actor.traversal={stairId:planned.target.id,direction:planned.direction,distanceM:0,path:planned.path};type='stairs-started';}
    else type=commitDoorTransition(planned.target,planned.kind);
    bump(state);bump(actor);
    return {ok:true,state,actor,expected:{worldRevision:command.worldRevision,actorRevision:command.actorRevision},events:[event(state,actor,type,command.targetId)]};
  });
}
function seconds(value){number(value,0,1,'elapsed seconds (maximum one second per step)');}
/** Explicit capability: real support elevation, bounded steps, resumable 3D travel. */
export function walkSupportedActor(input,actorInput,options={},bindings){
 return operate(input,actorInput,(state,actor)=>{
  const data=interactionData(options);object(data,['direction','seconds','travel'],'supported walk options',['direction','seconds']);object(data.direction,['x','y'],'supported walk direction');number(data.direction.x,-1,1,'supported walk x');number(data.direction.y,-1,1,'supported walk y');seconds(data.seconds);
  if(actor.traversal)fail('IN_TRANSIT','Advance the active standard stair route before supported walking.');
  if(bindings?.worldId!==state.worldId||typeof bindings.planSupportedWalk!=='function'||typeof bindings.validateSupportedWalk!=='function')fail('MISSING_BINDING','Bind the explicit supported walking provider.');
  const policy=supportedPolicy(bindings.supportPolicy),geometryKey=bindings.geometryKey;if(typeof geometryKey!=='string'||!geometryKey||geometryKey.length>256)fail('INVALID_BINDING','Bind an authoritative geometry identity.');
  let travel=data.travel==null?null:openSupportedTravel(data.travel,{state,actor,policy,geometryKey});
  const magnitude=Math.hypot(data.direction.x,data.direction.y),budget=actor.speedMps*data.seconds*Math.min(1,magnitude),contacts=[];
  const validate=(path,segments,fromDistanceM,toDistanceM,position,floorId)=>{
   const r=supportedQuery(bindings,'validateSupportedWalk',{state,actor,policy,geometryKey,path,segments,fromDistanceM,toDistanceM,position,floorId});
   if(r.geometryKey!==geometryKey)fail('STALE_SUPPORT','Authoritative support changed before the movement commit.');
   if(r.contacts!==undefined&&(!Array.isArray(r.contacts)||r.contacts.length+contacts.length>64))fail('INVALID_BINDING','Supply at most 64 plain contact records.');contacts.push(...(r.contacts||[]));
  };
  if(!budget){const at=travel?.distanceM??0;validate(travel?.path??null,travel?.segments??null,at,at,actor.position,actor.floorId);return {ok:true,state,actor,events:[],travel,movement:{profile:SUPPORTED_WALK_CONTRACT.profile,policy:copy(policy),geometryKey,distanceM:0,contacts}};}
  const heading={x:data.direction.x/magnitude,y:data.direction.y/magnitude};let remaining=budget,travelled=0,iterations=0;
  while(remaining>1e-9&&iterations++<16){
   if(!travel){const to={x:actor.position.x+heading.x*remaining,y:actor.position.y+heading.y*remaining,h:actor.position.h},plan=supportedQuery(bindings,'planSupportedWalk',{state,actor,from:actor.position,to,direction:heading,policy,geometryKey});
    supportPath({path:plan.path,segments:plan.segments},policy);if(!samePoint(plan.path[0].position,actor.position)||plan.path[0].floorId!==actor.floorId||typeof plan.stopAtEnd!=='boolean')fail('INVALID_BINDING','Start at the exact retained foot pose/floor and declare the path end policy.');
    travel={kind:'nautilus-supported-travel',version:1,worldId:state.worldId,worldRevision:state.revision,actorId:actor.id,actorRevision:actor.revision,actorFloorId:actor.floorId,policy,geometryKey,path:copy(plan.path),segments:copy(plan.segments),stopAtEnd:plan.stopAtEnd,distanceM:0,heading};
   }
   const alignment=heading.x*travel.heading.x+heading.y*travel.heading.y;if(Math.abs(alignment)<1e-7)fail('SUPPORTED_DIRECTION','Complete or reverse the retained support transition before moving sideways.');
   const path=travel.path.map(n=>n.position),lengthM=routeLength(path),fromM=travel.distanceM,toM=Math.max(0,Math.min(lengthM,fromM+(alignment<0?-remaining:remaining))),position=routePoint(path,toM),floorId=floorAfterTravel(travel.path,fromM,toM,actor.floorId);
   validate(travel.path,travel.segments,fromM,toM,position,floorId);
   const moved=Math.abs(toM-fromM);actor.position=position;actor.floorId=floorId;travelled+=moved;remaining-=moved;travel.distanceM=toM;travel.actorFloorId=floorId;
   if(toM<=1e-8||toM>=lengthM-1e-8){const stopped=travel.stopAtEnd&&alignment>=0;travel=null;if(stopped||!moved)remaining=0;}
  }
  if(remaining>1e-8)fail('SUPPORTED_WORK_LIMIT','The provider fragmented this bounded movement into too many plans.');
  if(travelled)bump(actor);if(travel&&!activeSupportedStep(travel))travel=null;if(travel){travel.actorRevision=actor.revision;travel.actorFloorId=actor.floorId;}
  return {ok:true,state,actor,events:[],travel,movement:{profile:SUPPORTED_WALK_CONTRACT.profile,policy:copy(policy),geometryKey,distanceM:travelled,contacts}};
 });
}

export function walkActor(input,actorInput,options={},bindings){
  return operate(input,actorInput,(state,actor)=>{
    const data=interactionData(options);object(data,['direction','seconds'],'walk options');const {direction,seconds:elapsed}=data;
    if(actor.traversal)fail('IN_TRANSIT','Advance the active stair route before ordinary walking.');
    object(direction,['x','y'],'walk direction');number(direction.x,-1,1,'walk x');number(direction.y,-1,1,'walk y');seconds(elapsed);
    const length=Math.hypot(direction.x,direction.y);
    if(!length||!elapsed)return {ok:true,state,actor,events:[]};
    const step=actor.speedMps*elapsed/Math.max(1,length),to={x:actor.position.x+direction.x*step,y:actor.position.y+direction.y*step,h:actor.position.h};
    const moved=typeof bindings?.move==='function'?query(bindings,'move',{state,actor,from:actor.position,to}):null;
    if(!moved)query(bindings,'walk',{state,actor,from:actor.position,to});
    const position=moved?moved.position:to;point(position);
    if(position.h!==actor.position.h||distance(position,actor.position)>distance(to,actor.position)+1e-7)fail('INVALID_BINDING','Movement must retain height and stay within the requested distance.');
    if(!samePoint(position,actor.position)){actor.position=copy(position);bump(actor);}
    return {ok:true,state,actor,events:[],...(moved?{movement:{profile:bindings.movementProfile,distanceM:moved.distanceM,contacts:copy(moved.contacts)}}:{})};
  });
}
/** Explicit host time only; follows every crossed route segment and checks live blockers. */
export function advanceTraversal(input,actorInput,options={},bindings){
  return operate(input,actorInput,(state,actor)=>{
    const data=interactionData(options);object(data,['seconds'],'traversal options');const {seconds:elapsed}=data;
    seconds(elapsed);const travel=actor.traversal;
    if(!travel||!elapsed)return {ok:true,state,actor,events:[]};
    const stairs=state.stairs.find(value=>value.id===travel.stairId);
    if(!stairs)fail('MISSING_ROUTE','Restore the original stair binding before resuming this save.');
    const route=travel.direction===1?stairs.path:copy(stairs.path).reverse(),from=travel.direction===1?stairs.from:stairs.to,to=travel.direction===1?stairs.to:stairs.from;
    if(travel.direction===-1&&!stairs.bidirectional||actor.floorId!==from.floorId||Math.abs(travel.path[0].h-from.position.h)>1e-7||distance(travel.path[0],from.position)>stairs.reachM||JSON.stringify(travel.path.slice(1))!==JSON.stringify(route))fail('CHANGED_ROUTE','The saved stair route differs from this world. Restore its original content version.');
    if(actor.radiusM*2>stairs.widthM||actor.heightM>stairs.clearanceM)fail('BODY_TOO_LARGE','The actor no longer fits this stair route.');
    const end=Math.min(routeLength(travel.path),travel.distanceM+actor.speedMps*elapsed);
    let offset=0,position=actor.position;
    for(let index=1;index<travel.path.length;index++){
      offset+=distance(travel.path[index-1],travel.path[index]);
      if(offset<=travel.distanceM)continue;
      const next=routePoint(travel.path,Math.min(end,offset));
      query(bindings,'sweep',{state,actor,from:position,to:next});position=next;
      if(offset>=end)break;
    }
    const arrived=end>=routeLength(travel.path);
    if(arrived)query(bindings,'landing',{state,actor,landing:to});
    actor.position=position;bump(actor);const events=[];
    if(arrived){actor.floorId=to.floorId;actor.traversal=null;bump(state);events.push(event(state,actor,'stairs-arrived',stairs.id));}
    else travel.distanceM=end;
    return {ok:true,state,actor,events};
  });
}
