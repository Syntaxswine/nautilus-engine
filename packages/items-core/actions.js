import {ROCK_ITEM} from './profile.js';
import {point,distance,flag,id,fail} from './validation.js';
import {lob,flightPoint} from './lob.js';
import {outcome,transact,command,advanceRevision} from './transactions.js';
const inventory=(rock,actorId,quantity)=>[{version:1,actorId,itemId:ROCK_ITEM.id,instanceId:rock.id,quantity}];
export function pickupRock(input,specification){return transact(input,(rock,expected)=>{
  command(rock,specification,['actorPosition','permitted','capacity']);
  const actorPosition=point(specification.actorPosition,'pickup actor position');flag(specification.permitted,'pickup permission');flag(specification.capacity,'capacity permission');
  if(rock.phase!=='world')fail('unavailable','Only a world rock can be picked up.');
  if(!specification.permitted)fail('forbidden','The host denied pickup.');if(!specification.capacity)fail('capacity','The host denied inventory capacity.');
  if(distance(actorPosition,rock.position)>rock.profile.pickupReach+1e-9)fail('out-of-reach','Rock is outside pickup reach.');
  advanceRevision(rock);rock.phase='carried';rock.ownerId=specification.actorId;rock.position=null;
  return outcome(rock,expected,{commandId:specification.commandId,inventoryDelta:inventory(rock,specification.actorId,1),events:[{version:1,type:'rock-picked-up',id:specification.commandId+':pickup',commandId:specification.commandId,rockId:rock.id,itemId:ROCK_ITEM.id,actorId:specification.actorId}]});
});}
function throwPreview(rock,specification){
  command(rock,specification,['throwId','origin','target','permitted']);
  id(specification.throwId,'throw ID');const origin=point(specification.origin,'release origin'),target=point(specification.target,'aim target');flag(specification.permitted,'throw permission');
  if(rock.phase!=='carried')fail('unavailable','Throw requires a carried rock.');if(rock.ownerId!==specification.actorId)fail('not-owner','Only the carrying actor can throw this rock.');
  if(!specification.permitted)fail('forbidden','The host denied this throw/action cost.');
  const range=distance(origin,target);if(range>rock.profile.maxThrowRange+1e-9)fail('out-of-range','Aim target is outside the native 3D throw range.');
  if(rock.lastImpact?.throwId===specification.throwId)fail('reused-throw','Use a new unique throw ID.');
  const arc=lob(origin,target,rock.profile.gravity);point(flightPoint({origin,...arc},arc.velocity.h/rock.profile.gravity,rock.profile.gravity),'lob apex');
  return {id:specification.throwId,commandId:specification.commandId,sourceActorId:specification.actorId,origin,target,...arc,ticks:0,pendingUnits:0,settling:null};
}
export function previewRockThrow(input,specification){return transact(input,(rock,expected)=>outcome(rock,expected,{commandId:specification?.commandId,trajectory:throwPreview(rock,specification)}));}
export function throwRock(input,specification){return transact(input,(rock,expected)=>{
  const flight=throwPreview(rock,specification);advanceRevision(rock);rock.phase='flying';rock.ownerId=null;rock.position={...flight.origin};rock.flight=flight;
  return outcome(rock,expected,{commandId:specification.commandId,inventoryDelta:inventory(rock,specification.actorId,-1),events:[{version:1,type:'rock-thrown',id:specification.commandId+':throw',commandId:specification.commandId,throwId:flight.id,rockId:rock.id,itemId:ROCK_ITEM.id,actorId:specification.actorId,origin:{...flight.origin}}]});
});}
