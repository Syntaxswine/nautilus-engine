import {compileWorld} from '../world-core/index.js';
import {bodyFor} from './motion.js';
import {contactShape,boundsContactShape,contactOverlap,contactSeparation,moveWithContacts} from '../traversal-core/index.js';
const epsilon=1e-7,copy=structuredClone;
export const overlap=(a,b)=>['x','y','h'].every(k=>a.min[k]<b.max[k]-epsilon&&a.max[k]>b.min[k]+epsilon);
export const transform=(v,x,z,h=0)=>({x:v.position.x+x*Math.cos(v.headingRad)+z*Math.sin(v.headingRad),y:v.position.y-x*Math.sin(v.headingRad)+z*Math.cos(v.headingRad),h:v.position.h+h});
export function vehicleContactShape(v,steering=v.steeringRad){
 const b=bodyFor(v.body),halfWidth=Math.max(1.97,b.widthM+2*b.wheelRadiusM*Math.abs(Math.sin(steering)))/2;
 return contactShape({id:v.id,points:[-1,1].flatMap(s=>[-1,1].map(t=>transform(v,s*halfWidth,t*b.lengthM/2))),minH:v.position.h,maxH:v.position.h+b.heightM});
}
export function vehicleBounds(v,steering=v.steeringRad){
 const b=bodyFor(v.body),halfWidth=Math.max(1.97,b.widthM+2*b.wheelRadiusM*Math.abs(Math.sin(steering)))/2;
 const points=[-1,1].flatMap(s=>[-1,1].map(t=>transform(v,s*halfWidth,t*b.lengthM/2)));
 return {min:{x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),h:v.position.h},max:{x:Math.max(...points.map(p=>p.x)),y:Math.max(...points.map(p=>p.y)),h:v.position.h+b.heightM}};
}
/** Conservative continuous swept AABB. For a curved step, corner arcs lie within
 * their endpoint hull plus R*dTheta²/8. This bound includes turning/reversing and
 * avoids endpoint tunnelling; narrow angled clearances may be refused early.
 */
export function sweptVehicleBounds(a,b){
 const envelopeSteering=Math.max(Math.abs(a.steeringRad),Math.abs(b.steeringRad)),aa=vehicleBounds(a,envelopeSteering),bb=vehicleBounds(b,envelopeSteering),angle=Math.abs(b.headingRad-a.headingRad),body=bodyFor(a.body),k=Math.tan(b.steeringRad)/a.wheelbaseM;
 const pad=angle&&Math.abs(k)>1e-10?(Math.abs(1/k)+Math.abs(body.axlesM[0])+Math.hypot(body.lengthM/2,1.97/2+body.wheelRadiusM))*angle*angle/8:0;
 return {min:{x:Math.min(aa.min.x,bb.min.x)-pad,y:Math.min(aa.min.y,bb.min.y)-pad,h:aa.min.h},max:{x:Math.max(aa.max.x,bb.max.x)+pad,y:Math.max(aa.max.y,bb.max.y)+pad,h:aa.max.h}};
}
export function sweptVehicleShape(a,b){
 const steering=Math.max(Math.abs(a.steeringRad),Math.abs(b.steeringRad)),aa=vehicleContactShape(a,steering),bb=vehicleContactShape(b,steering),angle=Math.abs(b.headingRad-a.headingRad),body=bodyFor(a.body),k=Math.tan(b.steeringRad)/a.wheelbaseM;
 // Endpoint hull plus analytic arc sagitta retains the original continuous
 // protection, now around the oriented footprint instead of its world AABB.
 const pad=angle&&Math.abs(k)>1e-10?(Math.abs(1/k)+Math.abs(body.axlesM[0])+Math.hypot(body.lengthM/2,1.97/2+body.wheelRadiusM))*angle*angle/8:0;
 return contactShape({id:a.id,points:[...aa.points,...bb.points],radiusM:pad,minH:aa.minH,maxH:aa.maxH});
}
function poseAt(a,b,t){
 const ds=(b.distanceM-a.distanceM)*t,k=Math.tan(b.steeringRad)/a.wheelbaseM,theta=a.headingRad,nextTheta=theta+ds*k,rear=bodyFor(a.body).axlesM[0];
 const position=Math.abs(k)<1e-10?{x:a.position.x+ds*Math.sin(theta),y:a.position.y+ds*Math.cos(theta),h:a.position.h}:{x:a.position.x+rear*Math.sin(theta)+(Math.cos(theta)-Math.cos(nextTheta))/k-rear*Math.sin(nextTheta),y:a.position.y+rear*Math.cos(theta)+(Math.sin(nextTheta)-Math.sin(theta))/k-rear*Math.cos(nextTheta),h:a.position.h};
 return {...b,position,headingRad:nextTheta,distanceM:a.distanceM+ds};
}
function covered(rect,panels){
 const cuts=[rect.min.x,rect.max.x,...panels.flatMap(p=>[Math.max(rect.min.x,p.min.x),Math.min(rect.max.x,p.max.x)])].filter(x=>x>=rect.min.x&&x<=rect.max.x).sort((a,b)=>a-b);
 for(let i=1;i<cuts.length;i++){if(cuts[i]-cuts[i-1]<epsilon)continue;const x=(cuts[i]+cuts[i-1])/2,spans=panels.filter(p=>p.min.x<=x&&p.max.x>=x).map(p=>[p.min.y,p.max.y]).sort((a,b)=>a[0]-b[0]);let edge=rect.min.y;for(const [lo,hi]of spans){if(lo>edge+epsilon)break;edge=Math.max(edge,hi);}if(edge<rect.max.y-epsilon)return false;}return true;
}
export function createVehicleQueries(world,{obstacles=()=>[]}={}){
 const index=compileWorld(world),state=index.snapshot();
 function support(bounds,floorId){
   if(bounds.min.x<0||bounds.min.y<0||bounds.max.x>state.bounds.widthM||bounds.max.y>state.bounds.depthM||bounds.max.h>state.bounds.heightM)return {ok:false,code:'OUTSIDE_WORLD',reason:'Stay within the authored course.'};
   const floor=index.getFloor(floorId);if(Math.abs(floor.elevationM-bounds.min.h)>epsilon)return {ok:false,code:'VEHICLE_TERRAIN_UNSUPPORTED',reason:'This vehicle profile requires flat supported ground.'};
   const surfaces=index.queryBounds(bounds).surfaces;
   const panels=surfaces.filter(s=>s.supports&&s.supportFloorId===floorId&&Math.abs(s.bounds.max.h-bounds.min.h)<epsilon).map(s=>s.bounds);
   return covered(bounds,panels)?{ok:true}:{ok:false,code:'VEHICLE_NO_SUPPORT',reason:'The full swept body needs continuous flat support.'};
 }
 const solids=bounds=>[...index.queryBounds(bounds).surfaces,...obstacles()].map(o=>boundsContactShape(o.id,o.bounds));
 const checkVehicle=(v,additional=[])=>{const r=support(vehicleBounds(v),v.floorId);if(!r.ok)return r;const shape=vehicleContactShape(v),hit=[...solids(vehicleBounds(v)),...additional].find(o=>contactOverlap(shape,o));return hit?{ok:false,code:'VEHICLE_BLOCKED',reason:'The oriented body is blocked by '+hit.id+'.'}:{ok:true};};
 return Object.freeze({check(bounds,floorId){
   const r=support(bounds,floorId);if(!r.ok)return r;
   const hit=[...index.queryBounds(bounds).surfaces,...obstacles()].find(o=>overlap(bounds,o.bounds));
   return hit?{ok:false,code:'VEHICLE_BLOCKED',reason:'The swept body is blocked by '+hit.id+'.'}:{ok:true};
 },checkVehicle,
 resolve(a,b,{obstacles:additional=[]}={}){
   const bounds=sweptVehicleBounds(a,b),boxes=[...solids(bounds),...additional],angle=Math.abs(b.headingRad-a.headingRad),count=Math.max(1,Math.ceil(angle/.01));
   if(count>64)throw Error('VEHICLE_CONTACT_STEP_LIMIT');
   let safe=a,contacts=[],distanceM=0,collided=false;
   for(let i=1;i<=count;i++){
     const target=poseAt(a,b,i/count),sweep=sweptVehicleShape(safe,target),hits=boxes.map(o=>({obstacle:o,hit:contactOverlap(sweep,o)})).filter(r=>r.hit).sort((x,y)=>x.obstacle.id<y.obstacle.id?-1:x.obstacle.id>y.obstacle.id?1:0);
     if(!hits.length){distanceM+=Math.hypot(target.position.x-safe.position.x,target.position.y-safe.position.y);safe=target;continue;}
     let lo=(i-1)/count,hi=i/count;
     for(let n=0;n<22;n++){const mid=(lo+hi)/2,hull=sweptVehicleShape(safe,poseAt(a,b,mid));if(hits.some(r=>contactOverlap(hull,r.obstacle)))hi=mid;else lo=mid;}
     const prefix=poseAt(a,b,Math.max((i-1)/count,lo-1e-6)),impact=sweptVehicleShape(prefix,poseAt(a,b,hi));
     distanceM+=Math.hypot(prefix.position.x-safe.position.x,prefix.position.y-safe.position.y);safe=prefix;
     const touching=hits.map(r=>contactOverlap(impact,r.obstacle)).filter(Boolean);
     // Refining a curved hull also removes its larger-interval sagitta. Its
     // conservative first contact can therefore be a few micrometres ahead of
     // the exact body. Retain the nearest real shape normal and explicit gap,
     // rather than stopping with an empty/fictional contact record.
     if(!touching.length){const near=hits.map(r=>contactSeparation(vehicleContactShape(poseAt(a,b,hi)),r.obstacle)).filter(Boolean).sort((x,y)=>x.separationM-y.separationM||(x.id<y.id?-1:x.id>y.id?1:0))[0];if(!near)throw Error('VEHICLE_CONTACT_NORMAL_UNAVAILABLE');touching.push({...near,conservative:true});}
     contacts.push(...touching);collided=true;
     let delta={x:b.position.x-safe.position.x,y:b.position.y-safe.position.y};
     for(const {normal}of touching){const inward=delta.x*normal.x+delta.y*normal.y;if(inward<0){delta.x-=inward*normal.x;delta.y-=inward*normal.y;}}
     delta={x:delta.x*.72,y:delta.y*.72};
     const moved=moveWithContacts(vehicleContactShape(safe,Math.max(Math.abs(a.steeringRad),Math.abs(b.steeringRad))),delta,boxes);
     distanceM+=moved.distanceM;contacts.push(...moved.contacts);safe={...safe,position:{x:safe.position.x+moved.delta.x,y:safe.position.y+moved.delta.y,h:safe.position.h}};break;
   }
   const supported=support(sweptVehicleBounds(a,safe),a.floorId);if(!supported.ok)return {...supported,vehicle:a,contacts:[],distanceM:0};
   const verified=checkVehicle(safe,additional);if(!verified.ok)return {...verified,vehicle:a,contacts,distanceM:0};
   return {ok:true,vehicle:collided?safe:b,contacts,distanceM,blocked:collided};
 },snapshot:()=>copy(state)});
}
