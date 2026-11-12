import {compileWorld} from '../world-core/index.js';
import {bodyFor} from './motion.js';
const epsilon=1e-7,copy=structuredClone;
export const overlap=(a,b)=>['x','y','h'].every(k=>a.min[k]<b.max[k]-epsilon&&a.max[k]>b.min[k]+epsilon);
export const transform=(v,x,z,h=0)=>({x:v.position.x+x*Math.cos(v.headingRad)+z*Math.sin(v.headingRad),y:v.position.y-x*Math.sin(v.headingRad)+z*Math.cos(v.headingRad),h:v.position.h+h});
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
function covered(rect,panels){
 const cuts=[rect.min.x,rect.max.x,...panels.flatMap(p=>[Math.max(rect.min.x,p.min.x),Math.min(rect.max.x,p.max.x)])].filter(x=>x>=rect.min.x&&x<=rect.max.x).sort((a,b)=>a-b);
 for(let i=1;i<cuts.length;i++){if(cuts[i]-cuts[i-1]<epsilon)continue;const x=(cuts[i]+cuts[i-1])/2,spans=panels.filter(p=>p.min.x<=x&&p.max.x>=x).map(p=>[p.min.y,p.max.y]).sort((a,b)=>a[0]-b[0]);let edge=rect.min.y;for(const [lo,hi]of spans){if(lo>edge+epsilon)break;edge=Math.max(edge,hi);}if(edge<rect.max.y-epsilon)return false;}return true;
}
export function createVehicleQueries(world,{obstacles=()=>[]}={}){
 const index=compileWorld(world),state=index.snapshot();
 return Object.freeze({check(bounds,floorId){
   if(bounds.min.x<0||bounds.min.y<0||bounds.max.x>state.bounds.widthM||bounds.max.y>state.bounds.depthM||bounds.max.h>state.bounds.heightM)return {ok:false,code:'OUTSIDE_WORLD',reason:'Stay within the authored course.'};
   const floor=index.getFloor(floorId);if(Math.abs(floor.elevationM-bounds.min.h)>epsilon)return {ok:false,code:'VEHICLE_TERRAIN_UNSUPPORTED',reason:'This vehicle profile requires flat supported ground.'};
   const surfaces=index.queryBounds(bounds).surfaces,hit=[...surfaces,...obstacles()].find(o=>overlap(bounds,o.bounds));
   if(hit)return {ok:false,code:'VEHICLE_BLOCKED',reason:'The swept body is blocked by '+hit.id+'.'};
   const panels=surfaces.filter(s=>s.supports&&s.supportFloorId===floorId&&Math.abs(s.bounds.max.h-bounds.min.h)<epsilon).map(s=>s.bounds);
   return covered(bounds,panels)?{ok:true}:{ok:false,code:'VEHICLE_NO_SUPPORT',reason:'The full swept body needs continuous flat support.'};
 },snapshot:()=>copy(state)});
}
