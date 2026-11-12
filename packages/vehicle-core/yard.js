import {createWorld,openWorld} from '../world-core/index.js';
import {createInteractionState,openInteractionState,createInteractionActor,openInteractionActor,createInteractionQueries,walkActor} from '../interactions/index.js';
import {createVehicleQueries,vehicleBounds,overlap} from './queries.js';
import {createVehicleSession} from './session.js';
import {vehicleData,keys} from './data.js';
const clone=structuredClone,receipt=(ok,committed=false,code=null,reason=null)=>({version:1,ok,committed,code,reason});
/** Ordinary reference host, composed from the public world and walk services.
 * No renderer, input device, wall clock, storage or game consumer is imported.
 */
export function createVehicleYard(content,{checkpoint}={}){
 content=vehicleData(content);keys(content,['identity','world','surfaces','interactions','actors','resources','vehicles','appearance']);keys(content.identity,['id','version','sourcePin']);if(!Number.isSafeInteger(content.identity.version)||content.identity.version<1||!/^[a-f0-9]{40}$/.test(content.identity.sourcePin))throw Error('VEHICLE_CONTENT_IDENTITY');
 let world=createWorld(content.world);world.surfaces=clone(content.surfaces);world=openWorld(world);
 let actors=content.actors.map(createInteractionActor),interactions=createInteractionState({worldId:world.id,...content.interactions}),resources=clone(content.resources),vehicleCheckpoint;
 if(checkpoint){const c=vehicleData(checkpoint);keys(c,['kind','version','content','world','interactions','actors','resources','vehicles']);if(c.kind!=='nautilus-vehicle-yard'||c.version!==1||JSON.stringify(c.content)!==JSON.stringify(content.identity))throw Error('VEHICLE_YARD_CHECKPOINT');
   world=openWorld(c.world);interactions=openInteractionState(c.interactions);actors=c.actors.map(openInteractionActor);resources=c.resources;vehicleCheckpoint=c.vehicles;
   if(world.id!==content.world.id||interactions.worldId!==world.id||actors.length!==content.actors.length||actors.some((a,i)=>a.id!==content.actors[i].id)||JSON.stringify(Object.keys(resources).sort())!==JSON.stringify(Object.keys(content.resources).sort()))throw Error('VEHICLE_YARD_IDENTITY');
 }
 const listeners=new Set(),notify=()=>{for(const fn of [...listeners])try{fn();}catch{}},get=id=>{const a=actors.find(a=>a.id===id);if(!a)throw Error('VEHICLE_ACTOR_UNAVAILABLE');return a;};let session,retired=false;
 const onFoot=()=>actors.filter(a=>!session?.read().occupancy.some(o=>o.actorId===a.id));
 const walkingQueries=createInteractionQueries(world,{actors:onFoot});walkingQueries.validateBindings(interactions);
 const obstacleDoors=()=>interactions.doors.flatMap(d=>{const bounds=d.open?d.openBounds:d.closedBounds;return bounds?[{id:d.id,bounds}]:[];});
 const queries=createVehicleQueries(world,{obstacles:obstacleDoors});
 function canReach({actor,from,to,ignoreVehicleId}){
   const checked=walkingQueries.walk({state:interactions,actor,from,to});if(!checked.ok)return checked;
   const bounds={min:{x:Math.min(from.x,to.x)-actor.radiusM,y:Math.min(from.y,to.y)-actor.radiusM,h:from.h},max:{x:Math.max(from.x,to.x)+actor.radiusM,y:Math.max(from.y,to.y)+actor.radiusM,h:from.h+actor.heightM}};
   const hit=session?.read().vehicles.find(v=>v.id!==ignoreVehicleId&&overlap(bounds,vehicleBounds(v)));
   return hit?receipt(false,false,'WALK_VEHICLE_BLOCKED','The way is blocked by '+hit.id+'.'):{ok:true};
 }
 session=createVehicleSession({id:content.identity.id,vehicles:content.vehicles,checkpoint:vehicleCheckpoint,queries,canReach,actors:{read:get,list:()=>actors,transact(updates,accept){
   if(retired)return receipt(false,false,'VEHICLE_YARD_RETIRED','Host retired.');if(updates.some(u=>get(u.before.id).revision!==u.before.revision||u.after.id!==u.before.id))return receipt(false,false,'STALE_ACTOR','Actor changed.');
   const replacements=new Map(updates.map(u=>[u.after.id,openInteractionActor(u.after)])),next=actors.map(a=>replacements.get(a.id)||a);accept();actors=next;return receipt(true,true);
 }}});
 const unsubscribe=session.subscribe(notify);
 for(const a of onFoot()){const r=canReach({actor:a,from:a.position,to:a.position});if(!r.ok)throw Error(r.reason);}
 return Object.freeze({connector:session,get actors(){return clone(actors);},content:clone(content.identity),actorIds:actors.map(a=>a.id),subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
   read(actorId='player'){return clone({actor:get(actorId),resources:resources[actorId],world,interactions,vehicles:session.read()});},
   readPose(actorId='player'){const s=session.readForActor(actorId),a=get(actorId);return {actorId,revision:a.revision,position:clone(a.position),mode:s.mode};},
   walk(actorId,vector,seconds){if(retired)return receipt(false,false,'VEHICLE_YARD_RETIRED','Host retired.');if(session.readForActor(actorId).mode!=='on-foot')return receipt(false,false,'VEHICLE_OCCUPIED','Exit before walking.');const a=get(actorId),r=walkActor(interactions,a,{direction:vector,seconds},{...walkingQueries,walk:({state,actor,from,to})=>canReach({actor,from,to})});if(!r.ok)return receipt(false,false,r.code,r.reason);const committed=r.actor.revision!==a.revision;actors=actors.map(old=>old.id===actorId?r.actor:old);interactions=r.state;if(committed)notify();return receipt(true,committed);},
   advance(seconds){return session.advance(seconds);},
   checkpoint:()=>clone({kind:'nautilus-vehicle-yard',version:1,content:content.identity,world,interactions,actors,resources,vehicles:session.checkpoint()}),
   dispose(){if(retired)return;retired=true;unsubscribe();session.dispose();listeners.clear();}
 });
}
