import {VEHICLE_BODIES} from './catalogue.js';
import {keys,identifier,vehicleData} from './data.js';
export const VEHICLE_MOTION_PROFILE=Object.freeze({id:'flat-low-speed-v1',maxForwardMps:8,maxReverseMps:3,accelerationMps2:3,serviceBrakeMps2:8,coastBrakeMps2:2,maxSteeringRad:Math.PI/6,deadZone:.08,maxStepSeconds:.05});
export const bodyFor=id=>{const b=VEHICLE_BODIES.find(b=>b.id===id);if(!b)throw Error('VEHICLE_BODY: unknown approved body '+id);return b;};
export function finite(value,min,max,name){if(!Number.isFinite(value)||value<min||value>max)throw Error('VEHICLE_VALUE: '+name);return value;}
export function axis(value,deadZone=VEHICLE_MOTION_PROFILE.deadZone){finite(value,-1,1,'normalised axis');return Math.abs(value)<=deadZone?0:Math.sign(value)*(Math.abs(value)-deadZone)/(1-deadZone);}
export const neutralControl=()=>({throttle:0,steering:0,held:false});
const towardZero=(speed,amount)=>Math.sign(speed)*Math.max(0,Math.abs(speed)-amount)||0;
export function createVehicle(seed={}){
 seed=vehicleData(seed);keys(seed,['id','body','finish','position','headingRad'],['id','position']);const {id,body='hatchback',finish='sage',position,headingRad=0}=seed;
 const b=bodyFor(body);identifier(id);if(!['sage','oxide','teal'].includes(finish))throw Error('VEHICLE_IDENTITY');
 keys(position,['x','y','h']);for(const k of ['x','y','h'])finite(position?.[k],-1e6,1e6,'position.'+k);finite(headingRad,-1e6,1e6,'heading radians');
 return {id,body,finish,floorId:'floor-0',position:{...position},headingRad,speedMps:0,steeringRad:0,distanceM:0,wheelAngleRad:0,revision:0,wheelbaseM:b.axlesM[1]-b.axlesM[0]};
}
/** Pure bicycle step. A reversal spends at least one confirmed step at zero.
 * Local +Z is forward. Heading/steering positive turn right in world x/y.
 * Released ownership uses maximum braking; a held centred stick coasts at 2m/s².
 */
export function stepVehicle(vehicle,input,seconds,profile=VEHICLE_MOTION_PROFILE){
 const b=bodyFor(vehicle.body);finite(seconds,0,profile.maxStepSeconds,'step seconds');
 if(typeof input?.held!=='boolean')throw Error('VEHICLE_CONTROL: explicit held state required.');
 const throttle=input.held?axis(input.throttle,profile.deadZone):0,steer=input.held?axis(input.steering,profile.deadZone):0;
 const before=vehicle.speedMps;finite(before,-profile.maxReverseMps,profile.maxForwardMps,'signed m/s');
 const reversing=throttle!==0&&before!==0&&Math.sign(throttle)!==Math.sign(before);
 let speed=before;
 if(!input.held||reversing)speed=towardZero(before,profile.serviceBrakeMps2*seconds);
 else if(!throttle)speed=towardZero(before,profile.coastBrakeMps2*seconds);
 else speed=Math.max(-profile.maxReverseMps,Math.min(profile.maxForwardMps,before+throttle*profile.accelerationMps2*seconds));
 const steeringRad=steer*profile.maxSteeringRad,ds=(before+speed)*seconds/2,k=Math.tan(steeringRad)/vehicle.wheelbaseM,theta=vehicle.headingRad,nextTheta=theta+ds*k;
 let x=vehicle.position.x,y=vehicle.position.y;
 if(Math.abs(k)<1e-10){x+=ds*Math.sin(theta);y+=ds*Math.cos(theta);}
 else{
   // Integrate rear axle, then recover the authored ground-centre pivot.
   const rear=b.axlesM[0],rx=x+rear*Math.sin(theta),ry=y+rear*Math.cos(theta);
   x=rx+(Math.cos(theta)-Math.cos(nextTheta))/k-rear*Math.sin(nextTheta);
   y=ry+(Math.sin(nextTheta)-Math.sin(theta))/k-rear*Math.cos(nextTheta);
 }
 const moved=Math.abs(ds)>0||steeringRad!==vehicle.steeringRad;
 return {...vehicle,position:{x,y,h:vehicle.position.h},headingRad:nextTheta,speedMps:speed,steeringRad,distanceM:vehicle.distanceM+ds,wheelAngleRad:(vehicle.wheelAngleRad+ds/b.wheelRadiusM)%(Math.PI*2),revision:vehicle.revision+(moved||speed!==before?1:0)};
}
