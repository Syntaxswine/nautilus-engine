import {fail,clone} from './contracts.js';
export const Q=1000000;
const clean=n=>Object.is(n,-0)?0:n;
const q=n=>clean(Math.round(n*Q));
export const same=(a,b)=>{if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&same(a[k],b[k]));};
export function placementPoint(r,v,p){if(r.frame==='world')return p.slice();let [x,y,h]=p;if(v.transform.mirrorX)x=-x;for(let i=0;i<v.transform.quarterTurns;i++)[x,y]=[-y,x];return [clean(x+v.origin[0]),clean(y+v.origin[1]),clean(h+v.origin[2])];}
// A conservative source hull is only discovery. It cannot certify curved contact.
export function discoverBounds(r,v,budget){
  let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];
  const point=p=>{budget.take(5);const w=placementPoint(r,v,p);for(let k=0;k<2;k++){if(!Number.isFinite(w[k]))fail('STACK_SOURCE_BOUNDS','/source','Source bounds are not finite.',{ownerIds:[v.id]});lo[k]=Math.min(lo[k],w[k]);hi[k]=Math.max(hi[k],w[k]);}};
  const curve=c=>{budget.take();if(c.kind==='compound'){for(const s of c.segments)curve(s);}else if(c.kind==='line'){point(c.a);point(c.b);}else if(c.kind==='cubic'){c.points.forEach(point);}else if(c.kind==='arc'){for(const x of [c.center[0]-c.radius,c.center[0]+c.radius])for(const y of [c.center[1]-c.radius,c.center[1]+c.radius])point([x,y,c.h0]);}else fail('STACK_SOURCE_BOUNDS','/source','No reviewed conservative bounds exist for this used source.',{ownerIds:[v.id]});};
  if(r.shape.kind==='region')r.shape.outlines.forEach(curve);else if(r.shape.kind==='profile-sweep'){curve(r.shape.path);const pad=r.shape.widthM/2;lo=lo.map(n=>n-pad);hi=hi.map(n=>n+pad);}else if(r.shape.kind==='field-cell'){const s=r.shape;for(const x of [s.bounds[0],s.bounds[2]])for(const y of [s.bounds[1],s.bounds[3]])point([x,y,0]);}else fail('STACK_SOURCE_BOUNDS','/shape','Unsupported source cannot be classified as unaffected.',{ownerIds:[v.id]});
  for(const p of r.ports){curve(p.boundary.curve);point(p.endpoint);}for(const s of r.reservations)for(const x of [s.min[0],s.max[0]])for(const y of [s.min[1],s.max[1]])point([x,y,s.min[2]]);
  // One quantum guard covers discovery rounding; it never welds/evaluates a join.
  return {min:lo.map(n=>q(n)-1),max:hi.map(n=>q(n)+1)};
}
export const near=(a,b,radius)=>[0,1].every(k=>Math.max(a.min[k],b.min[k])-Math.min(a.max[k],b.max[k])<=radius);
export function rectangleFacts(core,r,v,floors,primaryId,budget){
  budget.take(32);const s=r.shape,ownerIds=[v.id],unsupported=(code,message)=>fail(code,'/owners/'+v.id,message,{ownerIds});
  if(s.kind!=='region'||Object.hasOwn(s,'clip')||s.outlines.length!==1||s.outlines[0].kind!=='compound'||s.outlines[0].segments.length!==4||s.outlines[0].segments.some(c=>c.kind!=='line'))unsupported('STACK_UNSUPPORTED_AFFECTED_GEOMETRY','Affected source must be an original unclipped four-line level rectangle; preserve it and use a later supported family.');
  const lines=s.outlines[0].segments,points=lines.map(c=>c.a),min=[0,1].map(k=>Math.min(...points.map(p=>p[k]))),max=[0,1].map(k=>Math.max(...points.map(p=>p[k])));
  if(lines.some((c,i)=>!same(c.b,lines[(i+1)%4].a)||c.a[2]!==s.baseM||c.b[2]!==s.baseM||(c.a[0]===c.b[0])===(c.a[1]===c.b[1]))||new Set(points.map(p=>JSON.stringify(p))).size!==4||points.some(p=>![0,1].every(k=>p[k]===min[k]||p[k]===max[k]))||min.some((n,k)=>n>=max[k]))unsupported('STACK_INVALID_RECTANGLE_SOURCE','Keep exactly closed original axis-aligned corners/base; do not fit or snap source.');
  if(!primaryId)unsupported('STACK_PRIMARY_RESERVATION_REQUIRED','Name this affected ownerÃ¢â‚¬â„¢s primary envelope in saved constraints.');
  const primary=r.reservations.find(p=>p.id===primaryId);if(!primary)unsupported('STACK_INVALID_PRIMARY_ENVELOPE','The named primary reservation is absent; geometry cannot disappear with it.');
  const native={min:[...min,s.baseM],max:[...max,s.baseM+s.thicknessM]};
  if(primary.min.some((n,k)=>n>native.min[k])||primary.max.some((n,k)=>n<native.max[k]))unsupported('STACK_INVALID_PRIMARY_ENVELOPE','The named primary envelope must conservatively contain every original rectangle extent and thickness.');
  const floorId=v.floorBindings[primary.floorSlot],floor=floors.find(f=>f.id===floorId);if(!floor)unsupported('STACK_WRONG_FLOOR_BINDING','Bind the primary envelope to an actual declared native floor.');
  const base=placementPoint(r,v,[min[0],min[1],s.baseM])[2];if(base!==floor.elevationM)unsupported('STACK_WRONG_FLOOR_BINDING','This profile places the level surface at its actual declared elevation; offsets/label heights cannot substitute.');
  const checks=p=>{if(p.kind==='compound')return p.segments.flatMap(checks);if(p.kind==='line')return[p.a,p.b];if(p.kind==='cubic')return p.points;return null;};
  for(const p of r.ports){const controls=checks(p.boundary.curve);if(!controls||controls.some(c=>c[2]!==s.baseM||c[0]<min[0]||c[0]>max[0]||c[1]<min[1]||c[1]>max[1]))unsupported('STACK_UNSUPPORTED_BOUNDARY','Affected boundary controls must remain on the retained level rectangle.');}
  const sampleUnits=r.ports.reduce((n,p)=>n+((p.boundary.curve.kind==='compound'?p.boundary.curve.segments.length:1)*p.boundary.sampling.segmentsPerPart+1)*32,0)+r.reservations.length*32;budget.take(sampleUnits);
  const projected=core.transformTileRecipe(r,v,floors).geometry,world=points.map(p=>placementPoint(r,v,p)),shape={min:[0,1].map(k=>Math.min(...world.map(p=>p[k]))),max:[0,1].map(k=>Math.max(...world.map(p=>p[k])))};shape.min.push(base);shape.max.push(base+s.thicknessM);
  const canonical={min:shape.min.map(q),max:shape.max.map(q)},p=projected.reservations.find(p=>p.id===primaryId);if(!p||p.min.some((n,k)=>n>canonical.min[k])||p.max.some((n,k)=>n<canonical.max[k]))unsupported('STACK_INVALID_PRIMARY_ENVELOPE','The actual public projection must still conservatively contain the source geometry.');
  if(canonical.min.some((n,k)=>n>=canonical.max[k]))unsupported('STACK_COLLAPSED_RECTANGLE','The source must survive the public position policy.');
  return {id:v.id,recipe:r,placement:v,primaryReservationId:primaryId,floorId,native:shape,shape:canonical,reservations:clone(projected.reservations)};
}
export function contact(a,b,radius){const overlap=[0,1,2].map(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k]));if(![0,1].every(k=>overlap[k]>=-radius)||![0,1].some(k=>overlap[k]>0))return null;return {positiveXY:overlap[0]>0&&overlap[1]>0,gapQ:Math.max(a.min[2],b.min[2])-Math.min(a.max[2],b.max[2]),overlap};}
