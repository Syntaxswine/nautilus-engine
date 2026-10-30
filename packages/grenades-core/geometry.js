import {FARMYARD_GRENADE_PROFILE as P} from './profile.js';
import {data,xy,finite} from './validation.js';
const EPS=P.epsilon;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const cellKey=(x,y)=>Math.round(x)+','+Math.round(y);
export function interval(a,b,box){let lo=0,hi=1;for(const [key,min,max]of [['x',box.x0,box.x1],['y',box.y0,box.y1]]){const d=b[key]-a[key];if(Math.abs(d)<EPS){if(a[key]<min||a[key]>max)return null;continue;}const t0=(min-a[key])/d,t1=(max-a[key])/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return null;}return [lo,hi];}
export function airSpan(a,b,za,zb,box){const span=interval(a,b,box);if(!span)return null;let [lo,hi]=span;const dz=zb-za;if(Math.abs(dz)<EPS){if(za<box.z0||za>box.height)return null;}else{const t0=(box.z0-za)/dz,t1=(box.height-za)/dz;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return null;}return [lo,hi];}
export function near(world,a,b,padding,layer){const x0=Math.min(a.x,b.x)-padding,x1=Math.max(a.x,b.x)+padding,y0=Math.min(a.y,b.y)-padding,y1=Math.max(a.y,b.y)+padding;return world.boxes.filter(box=>(layer==='wall'?box.kind==='wall':layer==='walk'?box.kind!=='part':box.kind!=='prop')&&box.x1>=x0&&box.x0<=x1&&box.y1>=y0&&box.y0<=y1);}
export const lineClear=(world,a,b)=>!near(world,a,b,0,'wall').some(box=>{const span=interval(a,b,box);return span&&span[1]>EPS&&span[0]<1-EPS;});
export const affects=(world,point,target)=>distance(target,point)<=P.blast&&lineClear(world,point,target);
export const inside=(world,point)=>{const b=world.bounds;return point.x>=b.x-.5&&point.x<=b.x+b.w-.5&&point.y>=b.y-.5&&point.y<=b.y+b.h-.5;};
export const boxDistance=(point,box)=>Math.hypot(Math.max(box.x0-point.x,0,point.x-box.x1),Math.max(box.y0-point.y,0,point.y-box.y1));
export function trajectory(a,b){const rise=Math.min(2.5,distance(a,b)*.35);return Array.from({length:33},(_,i)=>{const t=i/32;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:1.1*(1-t)+.08*t+Math.sin(t*Math.PI)*rise};});}
export function pathBlocked(world,path){return near(world,path[0],path.at(-1),0,'air').some(box=>{for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(airSpan(a,b,a.z,b.z,box))return true;}return false;});}
export function footprint(world,point){
 const seen=new Set(world.seen);if(!seen.has(cellKey(point.x,point.y)))return [];
 const walls=near(world,point,point,P.blast,'wall');return Array.from({length:97},(_,i)=>{
  const angle=i/96*Math.PI*2,dx=Math.cos(angle),dy=Math.sin(angle),end={x:point.x+dx*P.blast,y:point.y+dy*P.blast};let reach=P.blast;
  for(const wall of walls){const span=interval(point,end,wall);if(span&&span[1]>EPS)reach=Math.min(reach,Math.max(0,span[0]*P.blast-.01));}
  for(let d=0;d<=reach;d+=.1)if(!seen.has(cellKey(point.x+dx*d,point.y+dy*d))){reach=Math.max(0,d-.1);break;}
  return {x:point.x+dx*reach,y:point.y+dy*reach};
 });
}
export function grenadeTrajectory(origin,target){return trajectory(xy(data(origin),'/origin'),xy(data(target),'/target'));}

export function sightLineClear(world,a,b){
 if(a.stance!=='prone'||b.stance!=='prone')return lineClear(world,a,b);
 return !near(world,a,b,0,'air').some(box=>{const span=interval(a,b,box);return box.kind!=='glass'&&span&&span[1]>EPS&&span[0]<1-EPS&&(box.kind==='wall'||!!airSpan(a,b,.3,.3,box));});
}
