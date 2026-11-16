import {contactShape,contactOverlap,castContact,moveWithContacts} from '../traversal-core/index.js';
import {dataSHA256,clone} from './data.js';
const EPS=1e-7,ok={ok:true},bad=(code,reason)=>({ok:false,code,reason});
const disc=(p,r,minH,maxH)=>contactShape({id:'house-walker',points:[{x:p.x,y:p.y}],radiusM:r,minH,maxH});
function interval(points,a,b){let lo=0,hi=1,area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1];}const sign=area>=0?1:-1;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);if(length<EPS)continue;const nx=-dy/length*sign,ny=dx/length*sign,v=(a.x-p[0])*nx+(a.y-p[1])*ny,d=(b.x-a.x)*nx+(b.y-a.y)*ny;if(Math.abs(d)<EPS){if(v<-EPS)return null;}else if(d>0)lo=Math.max(lo,-v/d);else hi=Math.min(hi,-v/d);if(lo>hi+EPS)return null;}return [Math.max(0,lo),Math.min(1,hi)];}
export function donnellyDoorShape(binding,fraction){
 const angle=-(binding.closedYawRadians+(binding.openYawRadians-binding.closedYawRadians)*fraction),c=Math.cos(angle),s=Math.sin(angle),leaf=binding.leaf,points=[];
 for(const [u,v]of [[leaf.offsetM,-leaf.thicknessM/2],[leaf.offsetM+leaf.widthM,-leaf.thicknessM/2],[leaf.offsetM+leaf.widthM,leaf.thicknessM/2],[leaf.offsetM,leaf.thicknessM/2]])points.push({x:binding.hinge.x+u*c-v*s,y:binding.hinge.y+u*s+v*c});
 return contactShape({id:binding.doorId,points,minH:binding.hinge.h+leaf.bottomM,maxH:binding.hinge.h+leaf.bottomM+leaf.heightM});
}
export function donnellyDoorSweep(binding,from,to){
 const a=donnellyDoorShape(binding,from),b=donnellyDoorShape(binding,to),angle=Math.abs(to-from)*Math.PI/2,denominator=2*Math.cos(angle/2)**2,tangents=a.points.map((p,i)=>({x:binding.hinge.x+(p.x+b.points[i].x-2*binding.hinge.x)/denominator,y:binding.hinge.y+(p.y+b.points[i].y-2*binding.hinge.y)/denominator})),points=[...a.points,...b.points,...tangents].sort((p,q)=>p.x-q.x||p.y-q.y),cross=(o,p,q)=>(p.x-o.x)*(q.y-o.y)-(p.y-o.y)*(q.x-o.x),half=items=>{const out=[];for(const p of items){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=1e-12)out.pop();out.push(p);}out.pop();return out;},hull=[...half(points),...half([...points].reverse())];
 // Endpoint corner arcs are enclosed by their tangent intersections. This
 // contains the entire ≤1-degree sweep without expanding the closed face
 // toward a body that the leaf is moving away from.
 return contactShape({id:binding.doorId,points:hull,minH:a.minH,maxH:a.maxH});
}
export function createDonnellyGeometry(base,plan,{policy,doorFraction=()=>0}={}){
 const parts=plan.parts,extraSupports=parts.filter(p=>p.support).map(p=>({id:p.id,points:p.points,h:p.topH,floorId:p.floorId})),supports=[...base.supports,...extraSupports],rows=parts.filter(p=>p.collider).map(p=>({part:p,shape:contactShape({id:p.id,points:p.kind==='beam'?[{x:p.from[0],y:p.from[2]},{x:p.to[0],y:p.to[2]}]:p.points.map(([x,y])=>({x,y})),radiusM:p.radiusM||p.widthM/2||0,minH:p.kind==='beam'?Math.min(p.from[1],p.to[1])-p.widthM/2:p.minH,maxH:p.kind==='beam'?Math.max(p.from[1],p.to[1])+p.widthM/2:p.topH})}));
 const geometryKey='house:'+dataSHA256({base:base.geometryKey,scene:plan.scene.id,parts,policy});
 const dynamic=()=>plan.doors.map(d=>donnellyDoorShape(d,doorFraction(d.doorId)));
 function spans(a,b,r=0,referenceH=a.h){
  const original=base.spans(a,b,r),intervals=extraSupports.map(s=>({...s,span:interval(s.points,a,b)})).filter(s=>s.span),ticks=[0,1,...original.flatMap(s=>[s.start,s.end]),...intervals.flatMap(s=>s.span)].filter(t=>t>=0&&t<=1).sort((a,b)=>a-b).filter((n,i,a)=>!i||n-a[i-1]>EPS),out=[];let h=referenceH;
  for(let i=0;i<ticks.length-1;i++){
   const start=ticks[i],end=ticks[i+1],t=(start+end)/2,ground=original.find(s=>t>=s.start-EPS&&t<=s.end+EPS),candidates=intervals.filter(s=>t>=s.span[0]-EPS&&t<=s.span[1]+EPS);if(ground?.supported)candidates.push(ground);
   const chosen=candidates.filter(s=>s.h<=h+policy.upM+EPS&&s.h>=h-policy.downM-EPS).sort((a,b)=>b.h-a.h||a.id.localeCompare(b.id))[0],value={start,end,h:chosen?.h??h,floorId:chosen?.floorId??null,id:chosen?.id??'unsupported',supported:!!chosen,missing:!!ground?.missing};out.push(value);if(chosen)h=chosen.h;
  }
  return out;
 }
 function exact(position,floorId){return supports.some(s=>s.floorId===floorId&&Math.abs(s.h-position.h)<EPS&&interval(s.points,position,position))||base.spans(position,position,0).some(s=>s.supported&&s.floorId===floorId&&Math.abs(s.h-position.h)<EPS);}
 function shapes(a,b,actor,{supportsToo=true}={}){
  const values=[...base.colliders(a,b,actor),...dynamic()],footTop=Math.max(a.h,b.h)+policy.upM;
  for(const row of rows){if(row.part.support&&(!supportsToo||row.shape.maxH<=footTop+EPS))continue;values.push(row.shape);}return values;
 }
 function validateBody(a,b,actor){
  const native=base.validateBody(a,b,actor);if(!native.ok)return native;
  const shape=disc(a,actor.radiusM,Math.min(a.h,b.h)+EPS,Math.max(a.h,b.h)+actor.heightM),delta={x:b.x-a.x,y:b.y-a.y};
  for(const obstacle of shapes(a,b,actor))if(contactOverlap(shape,obstacle)||castContact(shape,delta,obstacle))return bad('BODY_BLOCKED','The complete body meets authored '+obstacle.id+'.');return ok;
 }
 function planWalk({actor,from,to}){
  const distance=Math.hypot(to.x-from.x,to.y-from.y);if(distance>EPS)to={...to,x:to.x+(to.x-from.x)/distance*.24,y:to.y+(to.y-from.y)/distance*.24};
  const moved=moveWithContacts(disc(from,actor.radiusM,from.h+EPS,from.h+actor.heightM),{x:to.x-from.x,y:to.y-from.y},shapes(from,to,actor,{supportsToo:false})),legs=moved.segments.length?moved.segments:[{to:{x:0,y:0}}],path=[{position:clone(from),floorId:actor.floorId,supportId:'retained-house-foot'}],segments=[];let current=clone(from),halt=false;
  const append=(p,s,kind)=>{const length=Math.hypot(p.x-current.x,p.y-current.y,p.h-current.h);if(length<EPS)return true;if(!validateBody(current,p,actor).ok){
   // Lookahead can reach an obstruction beyond this frame's physical budget.
   // Retain the complete safe approach instead of refusing the whole leg.
   if(kind==='surface'){let lo=0,hi=1;for(let i=0;i<26;i++){const t=(lo+hi)/2,q={x:current.x+(p.x-current.x)*t,y:current.y+(p.y-current.y)*t,h:current.h};if(validateBody(current,q,actor).ok)lo=t;else hi=t;}if(lo*length>1e-6){const t=Math.max(0,lo-1e-6/length),q={x:current.x+(p.x-current.x)*t,y:current.y+(p.y-current.y)*t,h:current.h};path.push({position:q,floorId:s.floorId,supportId:s.id.slice(0,96)});segments.push(kind);current=q;}}
   halt=true;return false;}path.push({position:p,floorId:s.floorId,supportId:s.id.slice(0,96)});segments.push(kind);current=p;return true;};
  walking:for(const leg of legs){
   const a={...current},b={x:from.x+leg.to.x,y:from.y+leg.to.y,h:current.h},length=Math.hypot(b.x-a.x,b.y-a.y);if(length<EPS)continue;
   const sections=spans(a,b,actor.radiusM,current.h).reduce((out,s)=>{const last=out.at(-1);if(last&&last.h===s.h&&last.floorId===s.floorId&&last.supported===s.supported)last.end=s.end;else out.push({...s});return out;},[]),at=(t,h)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,h});
   for(let i=0;i<sections.length;i++){
    const s=sections[i],next=sections[i+1];if(!s.supported||Math.abs(s.h-current.h)>EPS){halt=true;break walking;}
    if(next&&(!next.supported||Math.abs(next.h-s.h)>EPS)){
     const before=Math.max(s.start,s.end-.06/length);if(!append(at(before,s.h),s,'surface'))break walking;
     if(!next.supported){halt=true;break walking;}const rise=next.h-s.h;if(rise>policy.upM+EPS||-rise>policy.downM+EPS){halt=true;break walking;}
     const after=Math.min(next.end,next.start+.06/length);append(at(after,next.h),next,'step');break walking;
    }
    let end=at(s.end,s.h);if(!exact(end,s.floorId))end=at(Math.max(s.start,s.end-1e-6/length),s.h);
    if(!append(end,s,'surface'))break walking;
   }
  }
  return {ok:true,path,segments,stopAtEnd:halt||moved.blocked&&Math.hypot(current.x-(from.x+moved.delta.x),current.y-(from.y+moved.delta.y))<EPS,contacts:moved.contacts};
 }
 function validate({actor,path,segments,position,floorId}){
  if(!path){if(!exact(position,floorId??actor.floorId))return bad('FOOT_SUPPORT','Restore the exact house floor, support and foot elevation.');return {...validateBody(position,position,actor),geometryKey};}
  for(const n of path)if(!exact(n.position,n.floorId))return bad('FLOOR_SUPPORT','Every station must retain an authored floor/support height.');
  for(let i=0;i<segments.length;i++){
   const a=path[i].position,b=path[i+1].position,rise=b.h-a.h;
   if(segments[i]==='step'&&(Math.abs(rise)<EPS||rise>policy.upM+EPS||-rise>policy.downM+EPS||Math.hypot(b.x-a.x,b.y-a.y)>.120001))return bad('STEP_BOUND','Cross exactly one bounded native tread edge.');
   if(segments[i]==='surface'&&spans(a,b,actor.radiusM,a.h).some(s=>!s.supported||Math.abs(s.h-a.h)>EPS))return bad('SUPPORT_CHANGED','Retain the actual level support across a walking segment.');
   const body=validateBody(a,b,actor);if(!body.ok)return body;
  }
  return {ok:true,geometryKey};
 }
 const footShapes=supports.map(s=>({h:s.h,shape:contactShape({id:s.id,points:s.points.map(([x,y])=>({x,y})),minH:-1,maxH:1})}));
 function sampleFootSupport({points,referenceH}){if(!Number.isFinite(referenceH)||!Array.isArray(points)||points.length!==4||points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('MOUNT_DORA_FOOT_SAMPLE');const sole=contactShape({id:'house-native-sole',points:points.map(p=>({x:p.x,y:p.y})),minH:-1,maxH:1});let height=0;for(const s of footShapes)if(s.h>height&&s.h<=referenceH+.53+EPS&&contactOverlap(sole,s.shape))height=s.h;return height;}
 return Object.freeze({geometryKey,supports:clone(supports),solidVolumes:rows.map(r=>clone(r.part)),doorShapes:()=>clone(dynamic()),spans,colliders:(...args)=>clone(shapes(...args)),validateBody,planSupportedWalk:planWalk,validateSupportedWalk:validate,sampleFootSupport});
}
