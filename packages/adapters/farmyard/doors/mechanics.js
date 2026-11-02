import {planDoorTransition,commitDoorTransition} from '../../../interactions/actions.js';
import {FARMYARD_DOOR_PROFILE as P} from './profile.js';
import {clone} from './data.js';
import {collider,boxDistance,clearReach,refreshAfterDoor} from './world.js';
export const receiptId=(stateId,commandId)=>JSON.stringify(['farmyard-door-v1',stateId,commandId]);
export function preview(context,command){
  const door=context.doors.find(value=>value.id===command.doorId),actor=context.actors.find(value=>value.id===context.control.actorId),available=!!door&&command.action===(door.open?'close':'open'),combat=['player','enemy'].includes(context.control.phase)||context.actors.some(value=>value.team==='guard'&&value.hp>0&&value.alert),cost=available&&combat?P.combatCost:0;
  let code=null,reason='';const deny=(c,message)=>{code=c;reason=message;};
  if(!available)deny('ACTION_UNAVAILABLE','That action is no longer available.');
  else if(!actor||command.actorId!==actor.id||actor.hp<=0||actor.burningTurns||actor.team!=='squad'||!['explore','player','won'].includes(context.control.phase)||context.control.status!=='active')deny('CONTROL_DENIED','Wait for your turn.');
  else if(!clearReach(context,actor,door))deny('CLEAR_REACH_REQUIRED','Move within clear reach of the object.');
  else if(context.actors.some(other=>other.hp>0&&boxDistance(other,collider(door,command.action==='open'))<P.actorRadiusM+P.epsilon))deny('DOOR_OCCUPIED','Someone is in the doorway.');
  else if(actor.ap+P.epsilon<cost)deny('INSUFFICIENT_AP','Not enough AP.');
  if(!reason)planDoorTransition({label:door.name,open:door.open,locked:false},command.action+'-door');
  return {ok:!reason,code,reason,cost,doorId:command.doorId,action:available?{id:command.action,label:command.action==='open'?'Open':'Close',cost}:null};
}
export function execute(context,command,stateId,revision){
  const check=preview(context,command);if(!check.ok)return {preview:check};
  const next=clone(context),door=next.doors.find(value=>value.id===command.doorId),actor=next.actors.find(value=>value.id===next.control.actorId),before={ap:actor.ap,open:door.open},controlBefore=clone(next.control),transition={label:door.name,open:door.open,locked:false};
  next.queue=[];actor.isMoving=false;actor.ap=Math.max(0,actor.ap-check.cost);
  const eventType=commitDoorTransition(transition,command.action+'-door');door.open=transition.open;
  const consequences=[{type:'stop-movement',actorId:actor.id},{type:'door-edge',doorId:door.id,edge:door.edge,kind:door.open?'door':'closed-door',open:door.open},{type:'log-door',actorId:actor.id,doorId:door.id,name:door.name,open:door.open,cost:check.cost},{type:'invalidate-geometry-and-routes',doorId:door.id}];
  // Source ordering is debit -> door/edge -> forced refresh, distinct from a
  // grenade's engagement-before-debit sequence. No host callback runs here.
  refreshAfterDoor(next,consequences);consequences.push({type:'refresh-visibility',forceFog:true});
  const receipt={id:receiptId(stateId,command.id),type:'action',command:clone(command),revision:revision+1,cost:check.cost,before,after:{ap:actor.ap,open:door.open},controlBefore,controlAfter:clone(next.control),eventType,consequences};
  return {preview:check,context:next,receipt,presentation:{id:receipt.id,doorId:door.id,open:door.open,profileId:P.id,collider:collider(door)}};
}
