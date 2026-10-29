import {openInteractionState,openInteractionActor,copy,object,id,integer,number,point,distance,samePoint,routeLength,routePoint,bump,fail} from './state.js';
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
}
const event=(state,actor,type,targetId)=>({id:state.worldId+'/interactions/'+state.revision,type,targetId,actorId:actor.id,worldId:state.worldId});
function plan(state,actor,targetId,kind,bindings){
  id(targetId);if(actor.traversal)fail('IN_TRANSIT','Finish the current stair route before using another interaction.');
  const door=state.doors.find(value=>value.id===targetId),stairs=state.stairs.find(value=>value.id===targetId);
  if(!door&&!stairs)fail('UNKNOWN_TARGET','Choose an interaction declared in this world.');
  if(door){
    if(actor.floorId!==door.floorId||distance(actor.position,door.position)>door.reachM)fail('OUT_OF_REACH','Move closer to '+door.label+'.');
    kind??=door.open?'close-door':'open-door';
    if(!['open-door','close-door','unlock-door'].includes(kind))fail('UNSUPPORTED_ACTION','Use a door action for this target.');
    if(kind==='unlock-door'){
      if(!door.locked)fail('ALREADY_UNLOCKED','This door is already unlocked.');
      query(bindings,'canUnlock',{state,actor,door});return {kind,target:door,label:'Unlock '+door.label};
    }
    if(kind==='open-door'&&door.locked)fail('LOCKED','This door is locked. Find a key or another way in.');
    if((kind==='open-door')===door.open)fail('ALREADY_SET','The door is already '+(door.open?'open.':'closed.'));
    query(bindings,'canSetDoor',{state,actor,door,open:kind==='open-door'});
    return {kind,target:door,label:(kind==='open-door'?'Open ':'Close ')+door.label};
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
export function previewInteraction(input,actorInput,{targetId,kind}={},bindings){
  return operate(input,actorInput,(state,actor)=>{
    const planned=plan(state,actor,targetId,kind,bindings);
    return {ok:true,label:planned.label,events:[],command:{kind:planned.kind,targetId,worldId:state.worldId,worldRevision:state.revision,actorId:actor.id,actorRevision:actor.revision}};
  });
}
/** Revalidates live geometry/permissions. Host atomically commits both returned records. */
export function applyInteraction(input,actorInput,command,bindings){
  return operate(input,actorInput,(state,actor)=>{
    object(command,['kind','targetId','worldId','worldRevision','actorId','actorRevision'],'interaction command');
    if(!['open-door','close-door','unlock-door','traverse-stairs'].includes(command.kind))fail('UNSUPPORTED_ACTION','Choose a supported explicit interaction action.');
    id(command.worldId);id(command.actorId);integer(command.worldRevision,'world revision');integer(command.actorRevision,'actor revision');
    if(command.worldId!==state.worldId||command.actorId!==actor.id)fail('WRONG_SUBJECT','Command belongs to another world or actor.');
    if(command.worldRevision!==state.revision||command.actorRevision!==actor.revision)fail('STALE_ACTION','The world or actor changed. Preview the action again.');
    const planned=plan(state,actor,command.targetId,command.kind,bindings);
    if(planned.kind==='traverse-stairs')actor.traversal={stairId:planned.target.id,direction:planned.direction,distanceM:0,path:planned.path};
    else if(planned.kind==='unlock-door')planned.target.locked=false;
    else planned.target.open=planned.kind==='open-door';
    bump(state);bump(actor);
    const type=planned.kind==='traverse-stairs'?'stairs-started':planned.kind==='unlock-door'?'door-unlocked':planned.target.open?'door-opened':'door-closed';
    return {ok:true,state,actor,expected:{worldRevision:command.worldRevision,actorRevision:command.actorRevision},events:[event(state,actor,type,command.targetId)]};
  });
}
function seconds(value){number(value,0,1,'elapsed seconds (maximum one second per step)');}
export function walkActor(input,actorInput,{direction,seconds:elapsed}={},bindings){
  return operate(input,actorInput,(state,actor)=>{
    if(actor.traversal)fail('IN_TRANSIT','Advance the active stair route before ordinary walking.');
    object(direction,['x','y'],'walk direction');number(direction.x,-1,1,'walk x');number(direction.y,-1,1,'walk y');seconds(elapsed);
    const length=Math.hypot(direction.x,direction.y);
    if(!length||!elapsed)return {ok:true,state,actor,events:[]};
    const step=actor.speedMps*elapsed/Math.max(1,length),to={x:actor.position.x+direction.x*step,y:actor.position.y+direction.y*step,h:actor.position.h};
    query(bindings,'walk',{state,actor,from:actor.position,to});actor.position=to;bump(actor);
    return {ok:true,state,actor,events:[]};
  });
}
/** Explicit host time only; follows every crossed route segment and checks live blockers. */
export function advanceTraversal(input,actorInput,{seconds:elapsed}={},bindings){
  return operate(input,actorInput,(state,actor)=>{
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