import {bodyFor,createVehicle,stepVehicle,neutralControl,finite,VEHICLE_MOTION_PROFILE} from './motion.js';
import {vehicleBounds,sweptVehicleBounds,overlap,transform} from './queries.js';
import {keys,identifier,vehicleData} from './data.js';
const clone=structuredClone,good=(committed=false)=>({version:1,ok:true,committed,code:null,reason:null}),bad=(code,reason)=>({version:1,ok:false,committed:false,code,reason});
const cabinZ=Object.freeze({hatchback:.35,sedan:.4,pickup:.65,'crew-pickup':.7,'cargo-van':1,'passenger-van':.8,'utility-suv':.4,crossover:.45});
const actorBounds=a=>({min:{x:a.position.x-a.radiusM,y:a.position.y-a.radiusM,h:a.position.h},max:{x:a.position.x+a.radiusM,y:a.position.y+a.radiusM,h:a.position.h+a.heightM}});
/** Optional headless transport authority. Host owns actors/resources/world/clock.
 * actors.transact(updates,accept) validates revisions, commits all poses and calls
 * accept synchronously before any observers. Failed transactions change nothing.
 */
export function createVehicleSession({id='road-yard',vehicles,actors,queries,canReach,checkpoint}={}){
 if(!actors?.read||!actors?.list||!actors?.transact||!queries?.check||typeof canReach!=='function')throw Error('VEHICLE_BINDINGS: bind authoritative actors, atomic poses, swept world and walk queries.');
 identifier(id);if(!Array.isArray(vehicles)||!vehicles.length||vehicles.length>64)throw Error('VEHICLE_FLEET_LIMIT');for(const v of vehicles)keys(v,['id','body','finish','position','headingRad'],['id','position']);
 let cars=vehicles.map(createVehicle),occupancy=[],occupancyRevision=0,revision=0,retired=false,serial=0;
 const nonce=globalThis.crypto.randomUUID(),listeners=new Set(),controls=new Map(),leases=new Map();
 let observerErrors=0;const emit=()=>{let count=0;for(const fn of [...listeners])try{fn();}catch{count++;}observerErrors=count;return count;};
 const get=id=>cars.find(v=>v.id===id),occupied=actorId=>occupancy.find(o=>o.actorId===actorId),actor=id=>actors.read(id);
 if(new Set(cars.map(v=>v.id)).size!==cars.length)throw Error('VEHICLE_DUPLICATE');
 if(checkpoint){const c=vehicleData(checkpoint);keys(c,['kind','version','id','revision','occupancyRevision','vehicles','occupancy']);if(c.kind!=='nautilus-road-vehicles'||c.version!==1||c.id!==id||!Array.isArray(c.vehicles)||!Array.isArray(c.occupancy))throw Error('VEHICLE_CHECKPOINT_VERSION');
   if(c.vehicles.length!==cars.length||c.vehicles.some((v,i)=>v.id!==cars[i].id||v.body!==cars[i].body||v.finish!==cars[i].finish||v.wheelbaseM!==cars[i].wheelbaseM))throw Error('VEHICLE_CHECKPOINT_IDENTITY');
   for(const v of c.vehicles){keys(v,['id','body','finish','position','headingRad','floorId','speedMps','steeringRad','distanceM','wheelAngleRad','revision','wheelbaseM']);const checked=createVehicle({id:v.id,body:v.body,finish:v.finish,position:v.position,headingRad:v.headingRad});for(const k of ['speedMps','steeringRad','distanceM','wheelAngleRad','revision'])finite(v[k],k==='revision'?0:-1e9,1e9,k);if(!Number.isSafeInteger(v.revision)||v.floorId!==checked.floorId||Math.abs(v.speedMps)>(v.speedMps<0?3:8)||Math.abs(v.steeringRad)>Math.PI/6)throw Error('VEHICLE_CHECKPOINT_STATE');}
   if(!Number.isSafeInteger(c.revision)||c.revision<0||!Number.isSafeInteger(c.occupancyRevision)||c.occupancyRevision<0)throw Error('VEHICLE_CHECKPOINT_REVISION');
   const ids=new Set(),seats=new Set();for(const o of c.occupancy){keys(o,['actorId','vehicleId','seatId']);if(!actor(o.actorId)||!c.vehicles.some(v=>v.id===o.vehicleId)||!['driver','passenger'].includes(o.seatId)||ids.has(o.actorId)||seats.has(o.vehicleId+'/'+o.seatId))throw Error('VEHICLE_CHECKPOINT_OCCUPANCY');const v=c.vehicles.find(v=>v.id===o.vehicleId),a=actor(o.actorId),p=seatPosition(v,o.seatId);if(a.floorId!==v.floorId||['x','y','h'].some(k=>Math.abs(a.position[k]-p[k])>1e-7))throw Error('VEHICLE_CHECKPOINT_POSE');ids.add(o.actorId);seats.add(o.vehicleId+'/'+o.seatId);}
   cars=c.vehicles;occupancy=c.occupancy;occupancyRevision=c.occupancyRevision;revision=c.revision;
   // Exact physical state/resources are retained. Held controls/leases are not.
 }
 function expected(actorId){const a=actor(actorId),o=occupied(actorId);return {actorRevision:a.revision,occupancyRevision,vehicleId:o?.vehicleId||null,seatId:o?.seatId||null,leaseId:o?leases.get(o.vehicleId)?.id||null:null};}
 const current=(actorId,e,{pose=false}={})=>e&&e.occupancyRevision===occupancyRevision&&e.vehicleId===(occupied(actorId)?.vehicleId||null)&&e.seatId===(occupied(actorId)?.seatId||null)&&e.leaseId===(occupied(actorId)?leases.get(occupied(actorId).vehicleId)?.id||null:null)&&(!pose||e.actorRevision===actor(actorId).revision);
 function seatPosition(v,seatId){return transform(v,seatId==='driver'?-.46:.46,cabinZ[v.body],.4);}
 function doorway(v,seatId,a,extra=0){const side=seatId==='driver'?-1:1;return transform(v,side*(Math.max(1.97,bodyFor(v.body).widthM)/2+a.radiusM+.08+extra),cabinZ[v.body]);}
 function route(actorId,v,seatId,exit){const a=actor(actorId),anchor=doorway(v,seatId,a),to=exit?doorway(v,seatId,a,.6):anchor,from=exit?anchor:a.position;
   if(a.floorId!==v.floorId||!exit&&Math.abs(a.position.h-v.position.h)>.001)return bad('VEHICLE_LEVEL','Use the same flat ground as the vehicle.');
   if(!exit&&Math.hypot(from.x-to.x,from.y-to.y)>1.45)return bad('VEHICLE_OUT_OF_REACH','Approach the '+seatId+' door.');
   const result=canReach({actor:a,from,to,ignoreVehicleId:v.id});return result.ok?{ok:true,position:to}:result;
 }
 function commit(nextCars,nextOccupancy,updates,changeOccupancy=false){let accepted=false,result,errors=0;try{result=actors.transact(updates,()=>{cars=nextCars;occupancy=nextOccupancy;revision++;if(changeOccupancy){occupancyRevision++;for(const [id,l]of leases)if(!occupancy.some(o=>o.vehicleId===id&&o.actorId===l.actorId&&o.seatId==='driver')){leases.delete(id);controls.delete(id);}}accepted=true;});}catch(e){if(!accepted)return bad('VEHICLE_TRANSACTION',e.message);errors++;}if(!accepted)return bad(result?.code||'VEHICLE_TRANSACTION','The actor/world transaction was refused.');if(result&&!result.ok)errors++;return {...good(true),observerErrors:errors+emit()};}
 function board({actorId,vehicleId,seatId,expected:e}){
   if(!current(actorId,e,{pose:true}))return bad('STALE_VEHICLE_ACTION','Refresh the current actor/door offer.');
   if(occupied(actorId))return bad('ALREADY_ABOARD','Exit the occupied vehicle first.');const v=get(vehicleId);if(!v||!['driver','passenger'].includes(seatId))return bad('VEHICLE_SEAT','Choose an available authored seat.');
   if(v.speedMps!==0)return bad('VEHICLE_MOVING','Stop before boarding.');if(occupancy.some(o=>o.vehicleId===vehicleId&&o.seatId===seatId))return bad('VEHICLE_SEAT_OCCUPIED','This seat is occupied.');
   const reached=route(actorId,v,seatId,false);if(!reached.ok)return reached;const a=actor(actorId),next={...a,position:seatPosition(v,seatId),revision:a.revision+1};
   return commit(cars,[...occupancy,{actorId,vehicleId,seatId}], [{before:a,after:next}],true);
 }
 function exit({actorId,expected:e}){
   if(!current(actorId,e,{pose:true}))return bad('STALE_VEHICLE_ACTION','Refresh the current seat offer.');const o=occupied(actorId);if(!o)return bad('VEHICLE_NOT_ABOARD','Board a vehicle first.');const v=get(o.vehicleId);if(v.speedMps!==0)return bad('VEHICLE_MOVING','Stop fully before leaving.');
   const reached=route(actorId,v,o.seatId,true);if(!reached.ok)return bad('VEHICLE_EXIT_BLOCKED',reached.reason||'The exit route is blocked.');const a=actor(actorId),result=commit(cars,occupancy.filter(x=>x!==o),[{before:a,after:{...a,position:reached.position,revision:a.revision+1}}],true);
   if(result.ok){leases.delete(v.id);controls.delete(v.id);}return result;
 }
 function control({actorId,owner,expected:e,throttle,steering,held}){
   if(!current(actorId,e,{pose:held===true}))return bad('STALE_VEHICLE_LEASE','Refresh the confirmed driver lease.');const o=occupied(actorId);if(o?.seatId!=='driver')return bad('VEHICLE_DRIVER_ONLY','Only the driver can control the car.');
   if(typeof owner!=='string'||!owner.length||typeof held!=='boolean')return bad('VEHICLE_CONTROL_SCHEMA','Use an input owner and explicit held/released state.');
   finite(throttle,-1,1,'throttle');finite(steering,-1,1,'steering');const lease=leases.get(o.vehicleId);
   if(lease&&lease.owner!==owner)return bad('VEHICLE_LEASE_OWNED','Another controller owns this driver lease.');
   if(!held){controls.delete(o.vehicleId);leases.delete(o.vehicleId);if(lease)emit();return good(!!lease);}
   if(!lease)leases.set(o.vehicleId,{id:nonce+'/'+(++serial),owner,actorId});controls.set(o.vehicleId,{throttle,steering,held:true});if(!lease)emit();return good(true);
 }
 function readForActor(actorId){const a=actor(actorId);if(!a)throw Error('VEHICLE_ACTOR_UNAVAILABLE');const o=occupied(actorId),v=o?get(o.vehicleId):null,e=expected(actorId),contextId=JSON.stringify([id,actorId,o?.vehicleId||null,o?.seatId||null,occupancyRevision]);
   return clone({version:1,connectorId:id,actorId,mode:o?(o.seatId==='driver'?'driver':'rider'):'on-foot',contextId,position:a.position,floorId:a.floorId,walkingAllowed:!o,vehicle:v,vehicleId:o?.vehicleId||null,seatId:o?.seatId||null,expected:e,lease:o?leases.get(o.vehicleId)||null:null});
 }
 function readOffers(actorId){const s=readForActor(actorId),a=actor(actorId),offers=[];
   if(s.vehicle){const r=s.vehicle.speedMps===0?route(actorId,s.vehicle,s.seatId,true):bad('VEHICLE_MOVING','Stop fully before leaving.');offers.push({id:'exit',target:{id:s.vehicleId},verb:'exit',label:'Exit '+bodyFor(s.vehicle.body).name,enabled:r.ok,reason:r.reason||null});}
   else for(const v of cars)if(Math.hypot(a.position.x-v.position.x,a.position.y-v.position.y)<5)for(const seatId of ['driver','passenger']){const r=v.speedMps!==0?bad('VEHICLE_MOVING','Stop before boarding.'):occupancy.some(o=>o.vehicleId===v.id&&o.seatId===seatId)?bad('VEHICLE_SEAT_OCCUPIED','Seat occupied.'):route(actorId,v,seatId,false);offers.push({id:v.id+'/'+seatId,target:{id:v.id},verb:'enter',label:'Enter '+bodyFor(v.body).name+' · '+seatId,enabled:r.ok,reason:r.reason||null});}
   return {context:JSON.stringify(s.expected),actions:offers};
 }
 function requestAction(actorId,actionId,offer){if(offer!==JSON.stringify(expected(actorId)))return bad('STALE_VEHICLE_ACTION','Refresh the contextual door offer.');if(actionId==='exit')return exit({actorId,expected:expected(actorId)});const [vehicleId,seatId,...rest]=actionId.split('/');if(rest.length)return bad('VEHICLE_SEAT','Unknown door.');return board({actorId,vehicleId,seatId,expected:expected(actorId)});}
 function advance(seconds){finite(seconds,0,.1,'host seconds');if(retired)throw Error('VEHICLE_RETIRED');let remaining=seconds;
   while(remaining>1e-10){const dt=Math.min(remaining,VEHICLE_MOTION_PROFILE.maxStepSeconds);remaining-=dt;const proposals=cars.map(v=>stepVehicle(v,controls.get(v.id)||neutralControl(),dt)),sweeps=proposals.map((v,i)=>sweptVehicleBounds(cars[i],v)),blocked=new Map();
     for(let i=0;i<cars.length;i++){const r=queries.check(sweeps[i],cars[i].floorId);if(!r.ok)blocked.set(i,r);for(const a of actors.list())if(!occupied(a.id)&&overlap(sweeps[i],actorBounds(a)))blocked.set(i,bad('VEHICLE_ACTOR_BLOCKED','The swept vehicle is blocked by actor '+a.id+'.'));for(let j=0;j<i;j++)if(overlap(sweeps[i],sweeps[j])){blocked.set(i,bad('VEHICLE_BLOCKED','Another vehicle occupies the swept route.'));blocked.set(j,bad('VEHICLE_BLOCKED','Another vehicle occupies the swept route.'));}}
     const next=proposals.map((v,i)=>blocked.has(i)?{...cars[i],speedMps:0,revision:cars[i].revision+(cars[i].speedMps!==0?1:0)}:v);
     if(next.some((v,i)=>v.revision!==cars[i].revision)){const updates=occupancy.flatMap(o=>{const v=next.find(v=>v.id===o.vehicleId),old=get(o.vehicleId);if(v.revision===old.revision)return [];const a=actor(o.actorId);return [{before:a,after:{...a,position:seatPosition(v,o.seatId),revision:a.revision+1}}];});const r=commit(next,occupancy,updates);if(!r.ok){controls.clear();leases.clear();return r;}}
     lastObstructions=[...blocked].map(([i,r])=>({vehicleId:cars[i].id,code:r.code,reason:r.reason}));
   }return good(true);
 }
 let lastObstructions=[];
 // Validate all saved/restored bodies before exposing any live authority.
 for(const v of cars){const r=queries.check(vehicleBounds(v),v.floorId);if(!r.ok)throw Error(r.code+': '+r.reason);}
 for(let i=0;i<cars.length;i++)for(let j=0;j<i;j++)if(overlap(vehicleBounds(cars[i]),vehicleBounds(cars[j])))throw Error('VEHICLE_INITIAL_OVERLAP');
 return Object.freeze({id,contract:{id:'nautilus-road-vehicle-connector',version:1,profile:'flat-low-speed-v1'},readForActor,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},read:()=>clone({revision,occupancyRevision,vehicles:cars,occupancy,obstructions:lastObstructions,observerErrors}),actions(actorId){return {id:'standard.road-vehicles',read:()=>readOffers(actorId),request:(actionId,offer)=>retired?bad('VEHICLE_RETIRED','Vehicle authority retired.'):requestAction(actorId,actionId,offer)};},
   dispatch(command){if(retired)return bad('VEHICLE_RETIRED','Vehicle authority retired.');try{command=vehicleData(command);if(command.version!==1)return bad('VEHICLE_COMMAND_VERSION','Use command version1.');keys(command.expected,['actorRevision','occupancyRevision','vehicleId','seatId','leaseId']);const base=['version','type','actorId','expected'];if(command.type==='board'){keys(command,[...base,'vehicleId','seatId']);return board(command);}if(command.type==='exit'){keys(command,base);return exit(command);}if(command.type==='control'){keys(command,[...base,'owner','throttle','steering','held']);return control(command);}return bad('VEHICLE_COMMAND','Unknown command.');}catch(e){return bad('VEHICLE_COMMAND_SCHEMA',e.message);}},
   release(owner){let changed=false;for(const [id,l]of leases)if(l.owner===owner){controls.delete(id);leases.delete(id);changed=true;}if(changed)emit();},advance,
   checkpoint:()=>clone({kind:'nautilus-road-vehicles',version:1,id,revision,occupancyRevision,vehicles:cars,occupancy}),
   dispose(){if(retired)return;retired=true;controls.clear();leases.clear();listeners.clear();}
 });
}
