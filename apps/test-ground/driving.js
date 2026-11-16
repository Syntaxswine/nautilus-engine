// Original Night Ledger south-strip fixtures. Runtime uses installed public APIs.
import {createVehicle,transform} from '@nautilus-engine/map-core/vehicles';
import {clone} from './data.js';

export const DRIVING_CAPABILITIES=['vehicle-state-v1','traversal-contact-v1','confirmed-motion-v1'];
export const drivingCourse=(registry,recipe)=>registry.drivingCourses.find(c=>c.id===recipe.driving?.id)||null;
export function drivingContent(registry,recipe,box){
 const course=drivingCourse(registry,recipe);if(!course)return {surfaces:[],vehicles:[]};
 return {surfaces:[box('driving-head-on',10,61.5,0,20,61.52,1.6),box('driving-walk-edge',22,49,0,22.02,62,1.8),box('driving-gap-tip',25,54,0,28.6,54.35,1.2),box('driving-glance-east',40,49,0,40.02,62,1.2),box('driving-glance-west',44,49,0,44.02,62,1.2),box('driving-true-obstruction',31,59.5,0,36,59.52,1.6),box('driving-closed-corner',36,56.5,0,36.02,59.52,1.6)],
  vehicles:[{id:'compact',body:'hatchback',finish:'sage',position:clone(course.position),headingRad:course.headingRad},{id:'parked-pickup',body:'pickup',finish:'oxide',position:{x:51,y:54,h:0},headingRad:.3}]};
}
export function drivingSpawn(registry,recipe){
 const course=drivingCourse(registry,recipe);if(!course)return null;if(course.walkSpawn)return clone(course.walkSpawn);
 return transform(createVehicle({id:'compact',body:'hatchback',position:course.position,headingRad:course.headingRad}),-1.45,.35);
}
export function traversalBaseline(){return {profile:'shared-slide-v1',walkDistanceM:0,walkSlideDistanceM:0,vehicleDistanceM:0,vehicleSlideDistanceM:0,reverseDistanceM:0,leftYawRad:0,rightYawRad:0,boardings:0,exits:0,headOnStops:0,contacts:[],steps:0};}
export function observeVehicles(metrics,before,after,contacts=[]){
 const old=before?.vehicles.find(v=>v.id==='compact'),next=after.vehicles.find(v=>v.id==='compact');
 if(old&&next){const distance=Math.hypot(next.position.x-old.position.x,next.position.y-old.position.y),angle=next.headingRad-old.headingRad;metrics.vehicleDistanceM+=distance;
  if(next.distanceM<old.distanceM)metrics.reverseDistanceM+=distance;if(angle>0)metrics.leftYawRad+=angle;else metrics.rightYawRad-=angle;
  const touching=contacts.filter(c=>c.vehicleId==='compact');if(touching.length){metrics.vehicleSlideDistanceM+=distance;if(distance<1e-6&&next.speedMps===0)metrics.headOnStops++;metrics.contacts.push(...touching.map(c=>({...clone(c),step:metrics.steps})));}
 }
 const occupied=s=>s?.occupancy.some(o=>o.actorId==='player')||false;if(!occupied(before)&&occupied(after))metrics.boardings++;if(occupied(before)&&!occupied(after))metrics.exits++;
 metrics.contacts=metrics.contacts.slice(-64);
}
export function verifyDriving(objective,baseline,state){
 const checks=[],failures=[],before=baseline.traversal,after=state.traversal,expected=objective.expected;
 const compare=(name,value,min)=>{const ok=Number.isFinite(value)&&value>=min;checks.push({name,expected:{minimum:min},observed:value,ok});if(!ok)failures.push(name+' needs '+min+', observed '+value);};
 for(const [key,min]of Object.entries(expected.minimums))compare(key,after[key]-before[key],min);
 // Independent current geometry observations accompany the accumulated history.
 const car=state.vehicles?.vehicles.find(v=>v.id==='compact');
 if(expected.destination){const p=expected.destination,ok=!!car&&car.position.x>=p.minX&&car.position.y>=p.minY;checks.push({name:'confirmed.destination',expected:p,observed:car?.position||null,ok});if(!ok)failures.push('The car did not reach the clear-gap destination.');}
 const resourcesRetained=['health','ap','stamina'].every(k=>state.resources[k]===baseline.resources[k]);checks.push({name:'resources.retained',expected:baseline.resources,observed:state.resources,ok:resourcesRetained});if(!resourcesRetained)failures.push('Traversal changed resources.');
 return {status:failures.length?'failed':'passed',scope:'confirmed traversal since baseline',missionComplete:!failures.length,checks,failures,eventIds:[],evidence:{contacts:clone(after.contacts),steps:after.steps-baseline.traversal.steps,source:'confirmed host poses and public swept contact results; control acknowledgements are insufficient'}};
}
/** Isolated deterministic checklist script, using the same public host connector
 * and walking endpoints as human controls. Native widgets have separate proof. */
export function exerciseDriving(host,fixture){
 const connector=host.connector,expected=()=>connector.readForActor('player').expected,command=(type,rest={})=>connector.dispatch({version:1,type,actorId:'player',expected:expected(),...rest});
 const receipts=[],step=(count,throttle,steering=0)=>{receipts.push(command('control',{owner:'golden',held:true,throttle,steering}));for(let i=0;i<count;i++)host.advance(.05);};
 if(fixture.course==='walking-slide'){for(let i=0;i<30;i++){receipts.push(host.walk('player',{x:1,y:1},.15/host.read().actor.speedMps));host.advance(.05);}return {receipts};}
 receipts.push(command('board',{vehicleId:'compact',seatId:'driver'}));
 if(fixture.course==='handling'){
  step(18,1);step(10,1,1);step(10,1,-1);connector.release('golden');for(let i=0;i<20;i++)host.advance(.05);step(18,-1);connector.release('golden');for(let i=0;i<20;i++)host.advance(.05);receipts.push(command('exit'));
 }else if(fixture.course==='visible-gap')step(36,1);
 else if(fixture.course==='head-on'||fixture.course==='obstructed-gap')step(150,1);
 else step(100,1);
 connector.release('golden');return {receipts};
}
