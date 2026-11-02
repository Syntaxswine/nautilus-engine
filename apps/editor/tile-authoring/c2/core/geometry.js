// Private C2 rectangle eligibility adapter; original source in vendor/c1.
import {fail,compileSource,equal} from './data.js';
export function rectangleInfo(t,r,b){
 b.take(32);compileSource(t,r,b);const s=r.shape,lines=s?.outlines?.[0]?.segments;
 if(r.frame!=='local'||s.kind!=='region'||s.baseM!==0||Object.hasOwn(s,'clip')||s.outlines.length!==1||s.outlines[0].kind!=='compound'||lines?.length!==4||lines.some(l=>l.kind!=='line')||r.reservations.length!==1||r.ports.some(p=>p.floor.offsetM!==0))fail('C1_RECTANGLE_PROFILE_REQUIRED','/recipe','Use an original local zero-base four-line level rectangle with one conservative reservation. Atomic path/field/holes profiles are unavailable.');
 const points=lines.map(l=>l.a),min=[0,1].map(k=>Math.min(...points.map(p=>p[k]))),max=[0,1].map(k=>Math.max(...points.map(p=>p[k]))),size=max.map((n,k)=>n-min[k]),reservation=r.reservations[0];
 if(size.some(n=>n<.1||n>64)||lines.some((l,i)=>!equal(t,l.b,lines[(i+1)%4].a,b)||l.a[2]!==0||l.b[2]!==0||(l.a[0]===l.b[0])===(l.a[1]===l.b[1]))||new Set(points.map(p=>JSON.stringify(p))).size!==4||points.some(p=>p[0]!==min[0]&&p[0]!==max[0]||p[1]!==min[1]&&p[1]!==max[1])||reservation.min.some((n,k)=>n>[...min,0][k])||reservation.max.some((n,k)=>n<[...max,s.thicknessM][k])||r.ports.some(p=>p.floor.slot!==reservation.floorSlot))fail('C1_RECTANGLE_PROFILE_REQUIRED','/recipe','Retain exact axis-aligned controls, native base/floor and conservative complete envelope within0.1-64m.');
 return {min,max,size,reservation};
}
