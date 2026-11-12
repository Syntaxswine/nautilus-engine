import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,openWorld} from '../packages/world-core/index.js';
import {createVehicleYard,vehicleYardContent,createVehicle,createVehicleQueries,vehicleContactShape,transform,vehicleBounds,stepVehicle} from '../packages/vehicle-core/index.js';
import {contactOverlap,boundsContactShape} from '../packages/traversal-core/index.js';
import {createInteractionQueries,createInteractionActor,createInteractionState,walkActor,previewInteraction} from '../packages/interactions/index.js';
const profiles={collisionProfile:'oriented-slide-v1',movementProfile:'disc-slide-v1'};
const solid=(id,x,y,w,d)=>({id,floorId:'floor-0',role:'solid',bounds:{min:{x,y,h:0},max:{x:x+w,y:y+d,h:2}},supports:false,supportFloorId:null});
function content(position={x:15,y:10,h:0},headingRad=0){const c=vehicleYardContent({sourcePin:'0000000000000000000000000000000000000000'});c.world.widthM=64;c.world.depthM=64;c.surfaces=c.surfaces.filter(s=>s.supports);c.surfaces[0].bounds.max.x=64;c.surfaces[0].bounds.max.y=64;c.vehicles=[{id:'compact',body:'hatchback',position,headingRad}];const v=createVehicle(c.vehicles[0]);c.actors=[{...c.actors[0],position:transform(v,-1.45,.35)}];c.resources={player:c.resources.player};return c;}
const board=h=>h.connector.dispatch({version:1,type:'board',actorId:'player',vehicleId:'compact',seatId:'driver',expected:h.connector.readForActor('player').expected});
const drive=(h,throttle,steering=0)=>h.connector.dispatch({version:1,type:'control',actorId:'player',owner:'test',expected:h.connector.readForActor('player').expected,throttle,steering,held:true});
test('deterministic screenshot-like visible gap: broad box refuses, oriented body passes unchanged envelope',()=>{
 const c=content({x:10,y:10,h:0},Math.PI/4),wall=solid('wall-tip',7.5,10,.6,.35);c.surfaces.push(wall);const w=createWorld(c.world);w.surfaces=c.surfaces;const q=createVehicleQueries(openWorld(w)),v=createVehicle(c.vehicles[0]);
 assert.equal(q.check(vehicleBounds(v),v.floorId).ok,false);assert.equal(q.checkVehicle(v).ok,true);assert.throws(()=>createVehicleYard(c),/VEHICLE_BLOCKED/);
 const h=createVehicleYard(c,profiles);try{assert.ok(board(h).ok);assert.ok(drive(h,1).ok);for(let i=0;i<30;i++)h.advance(.05);const end=h.connector.read().vehicles[0];assert.ok(end.position.x>11&&end.position.y>11);assert.equal(contactOverlap(vehicleContactShape(end),boundsContactShape(wall.id,wall.bounds)),null);}finally{h.dispose();}
});
test('both sides glancing forward and reverse make reduced sustained progress; flush head-on has no shoulder',()=>{
 for(const side of [-1,1])for(const direction of [-1,1]){
  const angle=side*direction*.15,extent=.985*Math.cos(angle)+1.85*Math.abs(Math.sin(angle)),position={x:side>0?30-extent:30+extent,y:30,h:0},c=content(position,angle),wall=solid('side-wall',side>0?30:29.98,0,.02,64);c.surfaces.push(wall);
  // Keep the driver door on the clear side of the wall for either handed fixture.
  if(side<0)c.actors[0].position=transform(createVehicle(c.vehicles[0]),1.45,.35);
  const h=createVehicleYard(c,profiles);try{const seat=side<0?'passenger':'driver';if(side<0){const a=h.actors[0],v=h.connector.read().vehicles[0];assert.ok(Math.abs(a.position.x-v.position.x)>1);} // direct session geometry is tested below without a second authority.
   const qWorld=createWorld(c.world);qWorld.surfaces=c.surfaces;const q=createVehicleQueries(openWorld(qWorld));let v={...createVehicle(c.vehicles[0]),speedMps:direction*2},distance=0,seen=0;
   for(let i=0;i<120;i++){const proposal=stepVehicle(v,{throttle:direction,steering:0,held:true},.05),r=q.resolve(v,proposal);assert.ok(r.ok,JSON.stringify(r));if(r.blocked)seen++;assert.equal(contactOverlap(vehicleContactShape(r.vehicle),boundsContactShape(wall.id,wall.bounds)),null);const d=Math.hypot(r.vehicle.position.x-v.position.x,r.vehicle.position.y-v.position.y);distance+=d;v={...r.vehicle,speedMps:direction*2,distanceM:v.distanceM+direction*d};}
   assert.ok(seen>100);assert.ok(distance>5&&distance<12);assert.ok((v.position.y-position.y)*direction>5);
  }finally{h.dispose();}
 }
 const c=content({x:15,y:10,h:0});c.surfaces.push(solid('front',0,14,64,.02));const h=createVehicleYard(c,profiles);try{assert.ok(board(h).ok);assert.ok(drive(h,1).ok);for(let i=0;i<100;i++)h.advance(.1);const v=h.connector.read().vehicles[0];assert.equal(v.speedMps,0);assert.ok(v.position.y<=12.150001);assert.equal(v.position.x,15);assert.ok(drive(h,-1).ok);for(let i=0;i<20;i++)h.advance(.05);assert.ok(h.connector.read().vehicles[0].position.y<v.position.y-.5);}finally{h.dispose();}
});
test('thin walls, current actors, other oriented cars and unsupported ground remain solid',()=>{
 for(const kind of ['thin-wall','actor','car','support']){
  const c=content();if(kind==='thin-wall')c.surfaces.push(solid(kind,0,15,64,.001));if(kind==='actor')c.actors.push({...c.actors[0],id:'observer',position:{x:15,y:15,h:0}});if(kind==='car')c.vehicles.push({id:'parked',body:'hatchback',position:{x:15,y:17,h:0},headingRad:.4});if(kind==='support')c.surfaces[0].bounds.max.y=15;
  const h=createVehicleYard(c,profiles);try{assert.ok(board(h).ok);assert.ok(drive(h,1).ok);for(let i=0;i<80;i++)h.advance(.1);const v=h.connector.read().vehicles[0];assert.ok(v.position.y<15);assert.equal(v.speedMps,0,kind);assert.ok(h.connector.read().obstructions.length);}finally{h.dispose();}
 }
});
test('opt-in checkpoints retain spent state, reject implicit policy changes and never restore held controls',()=>{
 const c=content(),h=createVehicleYard(c,profiles);assert.ok(board(h).ok);assert.ok(drive(h,1,.4).ok);for(let i=0;i<10;i++)h.advance(.05);const saved=h.checkpoint();h.dispose();assert.equal(saved.vehicles.version,2);assert.throws(()=>createVehicleYard(c,{checkpoint:saved}),/PROFILE/);const restored=createVehicleYard(c,{...profiles,checkpoint:saved});try{assert.deepEqual(restored.checkpoint(),saved);assert.equal(restored.connector.readForActor('player').lease,null);const speed=restored.connector.read().vehicles[0].speedMps;restored.advance(.05);assert.ok(restored.connector.read().vehicles[0].speedMps<speed);}finally{restored.dispose();}
});
test('walking slide returns only accepted distance, legacy stop remains exact and support cannot be pushed off',()=>{
 const c=content();c.surfaces.push(solid('wall',20,0,.01,64));const w=createWorld(c.world);w.surfaces=c.surfaces;const world=openWorld(w),state=createInteractionState({worldId:w.id,doors:[],stairs:[]}),a=createInteractionActor({...c.actors[0],position:{x:19.72,y:10,h:0}}),options={direction:{x:1,y:1},seconds:.1};
 const legacy=walkActor(state,a,options,createInteractionQueries(world));assert.equal(legacy.ok,false);assert.deepEqual(legacy.actor,a);
 const q=createInteractionQueries(world,{movementProfile:'disc-slide-v1'}),r=walkActor(state,a,options,q);assert.ok(r.ok);assert.ok(r.actor.position.y>10);assert.ok(r.movement.distanceM<.3);assert.ok(r.movement.contacts.length);assert.deepEqual(a.position,{x:19.72,y:10,h:0});
 const edge={...a,position:{x:19.72,y:63.7,h:0}},off=walkActor(state,edge,options,q);assert.equal(off.ok,false);assert.deepEqual(off.actor,edge);assert.throws(()=>createInteractionQueries(world,{movementProfile:'guess'}),/profile/);
});
test('steering away from an initially flush side limits wheel yaw safely and recovers on either side',()=>{
 for(const side of [-1,1]){
  const c=content({x:30-side*.985,y:30,h:0},side>0?0:Math.PI),wall=solid('flush',side>0?30:29.98,0,.02,64);c.surfaces.push(wall);const h=createVehicleYard(c,profiles);
  try{assert.ok(board(h).ok);assert.ok(drive(h,1,1).ok);for(let i=0;i<30;i++){h.advance(.05);const v=h.connector.read().vehicles[0];assert.equal(contactOverlap(vehicleContactShape(v),boundsContactShape(wall.id,wall.bounds)),null);}
   const v=h.connector.read().vehicles[0];assert.ok((c.vehicles[0].position.x-v.position.x)*side>.05,JSON.stringify(v));assert.ok(v.headingRad<c.vehicles[0].headingRad-.02);assert.ok(v.speedMps>0);
  }finally{h.dispose();}
 }
});
test('simultaneous cars reserve continuous oriented routes and keep both actors at confirmed seats',()=>{
 const c=content();c.vehicles.push({id:'opposing',body:'hatchback',position:{x:15,y:22,h:0},headingRad:Math.PI});c.actors.push({...c.actors[0],id:'observer',position:transform(createVehicle(c.vehicles[1]),-1.45,.35)});c.resources.observer=structuredClone(c.resources.player);const h=createVehicleYard(c,profiles);
 try{assert.ok(board(h).ok);const s=h.connector;assert.ok(s.dispatch({version:1,type:'board',actorId:'observer',vehicleId:'opposing',seatId:'driver',expected:s.readForActor('observer').expected}).ok);assert.ok(drive(h,1).ok);assert.ok(s.dispatch({version:1,type:'control',actorId:'observer',owner:'other',expected:s.readForActor('observer').expected,held:true,throttle:1,steering:0}).ok);
  for(let i=0;i<100;i++){h.advance(.1);const [a,b]=s.read().vehicles;assert.equal(contactOverlap(vehicleContactShape(a),vehicleContactShape(b)),null);}
  const [a,b]=s.read().vehicles;assert.equal(a.speedMps,0);assert.equal(b.speedMps,0);assert.ok(a.position.y>10&&b.position.y<22);for(const id of ['player','observer'])assert.equal(s.readForActor(id).mode,'driver');
 }finally{h.dispose();}
});
test('a dynamic oriented vehicle reserves door motion without replacing door authority',()=>{
 const c=content(),w=createWorld(c.world);w.surfaces=c.surfaces;const world=openWorld(w),door={id:'door',label:'Test door',floorId:'floor-0',position:{x:8,y:8,h:0},reachM:2,open:false,locked:false,closedBounds:{min:{x:7.4,y:7.94,h:0},max:{x:8.6,y:8.06,h:2}},openBounds:{min:{x:7.4,y:6.8,h:0},max:{x:7.5,y:8,h:2}},motionBounds:{min:{x:7.4,y:6.7,h:0},max:{x:8.6,y:8.1,h:2}}},state=createInteractionState({worldId:world.id,doors:[door]}),actor=createInteractionActor({...c.actors[0],position:{x:8,y:9.5,h:0}});
 const vehicle=createVehicle({id:'car',position:{x:8,y:6,h:0}}),q=createInteractionQueries(world,{movementProfile:'disc-slide-v1',obstacles:()=>[vehicleContactShape(vehicle)]});q.validateBindings(state);const blocked=previewInteraction(state,actor,{targetId:'door',kind:'open-door'},q);assert.equal(blocked.code,'DOOR_OCCUPIED');
 const clear=createInteractionQueries(world,{movementProfile:'disc-slide-v1',obstacles:()=>[vehicleContactShape({...vehicle,position:{x:20,y:20,h:0}})]});assert.ok(previewInteraction(state,actor,{targetId:'door',kind:'open-door'},clear).ok);assert.equal(state.doors[0].open,false);
});
test('rotating forward and reverse sweeps catch a sub-millimetre obstacle inside the intermediate corner arc',()=>{
 for(const headingRad of [0,.3,1,2.2,4.6])for(const direction of [-1,1])for(const steering of [-1,1]){
  const c=content({x:32,y:32,h:0},headingRad),v={...createVehicle(c.vehicles[0]),speedMps:direction*(direction<0?3:8),steeringRad:-steering*Math.PI/6},input={held:true,throttle:direction,steering},mid=stepVehicle(v,input,.025),end=stepVehicle(v,input,.05),startShape=vehicleContactShape(v);
  const candidates=vehicleContactShape(mid).points.map(p=>({x:mid.position.x+(p.x-mid.position.x)*.9999,y:mid.position.y+(p.y-mid.position.y)*.9999}));
  const obstacle=candidates.map((p,i)=>solid('arc-'+i,p.x-.0002,p.y-.0002,.0004,.0004)).find(s=>!contactOverlap(startShape,boundsContactShape(s.id,s.bounds)));
  assert.ok(obstacle,'An intermediate corner must leave the original footprint.');c.surfaces.push(obstacle);const world=createWorld(c.world);world.surfaces=c.surfaces;const q=createVehicleQueries(openWorld(world));assert.ok(q.checkVehicle(v).ok);
  const r=q.resolve(v,end);assert.ok(r.ok);assert.equal(r.blocked,true);assert.ok(r.contacts.length);assert.equal(contactOverlap(vehicleContactShape(r.vehicle),boundsContactShape(obstacle.id,obstacle.bounds)),null);
 }
});
test('sustained contact progress is independent of host cadence and saved contact cannot replay pedal demand',()=>{
 const distances=[];for(const dt of [1/120,1/60,.025,.05,.1]){
  const angle=.15,c=content({x:30-(.985*Math.cos(angle)+1.85*Math.sin(angle)),y:30,h:0},angle);c.surfaces.push(solid('wall',30,0,.02,64));const h=createVehicleYard(c,profiles);
  try{assert.ok(board(h).ok);assert.ok(drive(h,1).ok);for(let n=0;n<Math.round(3/dt);n++)h.advance(dt);const v=h.connector.read().vehicles[0];distances.push(Math.hypot(v.position.x-c.vehicles[0].position.x,v.position.y-30));assert.ok(v.speedMps>4&&v.speedMps<8);assert.ok(h.connector.read().contacts.length);
   const saved=h.checkpoint(),loaded=createVehicleYard(c,{...profiles,checkpoint:saved});try{assert.deepEqual(loaded.checkpoint(),saved);assert.equal(loaded.connector.readForActor('player').lease,null);loaded.advance(.05);assert.ok(loaded.connector.read().vehicles[0].speedMps<v.speedMps);assert.deepEqual(loaded.read().resources,h.read().resources);}finally{loaded.dispose();}
  }finally{h.dispose();}
 }assert.ok(Math.max(...distances)-Math.min(...distances)<.002,JSON.stringify(distances));assert.ok(Math.min(...distances)>9);
});
test('leaving a glancing edge cannot apply accumulated demand as an acceleration jump',()=>{
 const angle=.15,c=content({x:30-(.985*Math.cos(angle)+1.85*Math.sin(angle)),y:10,h:0},angle);c.surfaces.push(solid('short-wall',30,0,.02,14));const h=createVehicleYard(c,profiles);let sawContact=false,sawClear=false;
 try{assert.ok(board(h).ok);assert.ok(drive(h,1).ok);for(let i=0;i<100;i++){const before=h.connector.read().vehicles[0];h.advance(.025);const state=h.connector.read(),v=state.vehicles[0];if(state.contacts.length)sawContact=true;else if(sawContact){sawClear=true;assert.ok(v.speedMps<=before.speedMps+3*.025+1e-7,JSON.stringify({before,v}));}assert.ok(Math.abs(v.speedMps)<=8);}
  assert.ok(sawContact&&sawClear);h.connector.release('test');for(let i=0;i<60;i++)h.advance(.025);assert.equal(h.connector.read().vehicles[0].speedMps,0);
 }finally{h.dispose();}
});
