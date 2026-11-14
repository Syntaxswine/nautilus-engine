import {contactShape,contactOverlap,castContact,moveWithContacts} from '../traversal-core/index.js';
import {dataSHA256,clone} from './data.js';
import {MOUNT_DORA_SOURCE,MOUNT_DORA_ART,MOUNT_DORA_DONNELLY} from './contract.js';
const EPS=1e-7,ok={ok:true},bad=(code,reason)=>({ok:false,code,reason}),xy=p=>({x:p[0],y:p[1]}),bounds=(a,b,r=0)=>[Math.min(a.x,b.x)-r,Math.min(a.y,b.y)-r,Math.max(a.x,b.x)+r,Math.max(a.y,b.y)+r];
const inside=(p,ring)=>{let value=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])value=!value;}return value;};
const inSolid=(p,s)=>s.polygons?.some(poly=>inside(p,poly[0])&&!poly.slice(1).some(r=>inside(p,r)));
const disc=(p,r,minH,maxH)=>contactShape({id:'walker',points:[p],radiusM:r,minH,maxH});
function edges(shape,id,minH=0,maxH=20){
 const base={id,minH,maxH};if(shape.kind==='circle')return [contactShape({...base,points:[xy(shape.centre)],radiusM:shape.radius,maxH:shape.trunkHeight??maxH})];
 if(shape.kind==='segment')return [contactShape({...base,points:[xy(shape.a),xy(shape.b)],radiusM:shape.radius})];
 if(shape.kind!=='polygon')throw Error('MOUNT_DORA_SOLID_KIND');return shape.polygons.flatMap((poly,pi)=>poly.flatMap((ring,ri)=>ring.slice(0,-1).map((p,i)=>contactShape({...base,id:id+':'+pi+':'+ri+':'+i,points:[xy(p),xy(ring[(i+1)%ring.length])]}))));
}
// Exact interval where a swept full disc is contained in a convex support.
function supportInterval(points,a,b,r){let lo=0,hi=1,area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1];}const sign=area>=0?1:-1;
 for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);if(length<EPS)continue;const nx=-dy/length*sign,ny=dx/length*sign,v=(a.x-p[0])*nx+(a.y-p[1])*ny-r,d=(b.x-a.x)*nx+(b.y-a.y)*ny;if(Math.abs(d)<EPS){if(v<-EPS)return null;}else if(d>0)lo=Math.max(lo,-v/d);else hi=Math.min(hi,-v/d);if(lo>hi+EPS)return null;}return [Math.max(0,lo),Math.min(1,hi)];}
function touchedInterval(shape,a,b,r){const actor=disc(a,r,-1,1),delta={x:b.x-a.x,y:b.y-a.y},from=contactOverlap(actor,shape),to=contactOverlap(disc(b,r,-1,1),shape),forward=castContact(actor,delta,shape),reverse=castContact(disc(b,r,-1,1),{x:-delta.x,y:-delta.y},shape);if(!from&&!to&&!forward&&!reverse)return null;return [from?0:forward?.time??1,to?1:1-(reverse?.time??0)];}
function deckPoints(p){const [a,b]=p.ends,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,nx=-uy*p.width/2,ny=ux*p.width/2,extend=p.deck.extend||[0,0],s=[a[0]-ux*extend[0],a[1]-uy*extend[0]],e=[b[0]+ux*extend[1],b[1]+uy*extend[1]];return [[s[0]+nx-.5,s[1]+ny-.5],[e[0]+nx-.5,e[1]+ny-.5],[e[0]-nx-.5,e[1]-ny-.5],[s[0]-nx-.5,s[1]-ny-.5]];}

/** Renderer-independent native geometry. The source cache is a verified data
 * cache, distinct from the nine rendered blocks. Unloaded terrain refuses. */
export function createMountDoraGeometry(source,{placements,policy,parts=[],profile='source-compatible',nativeRevision='original'}={}){
 policy=clone(policy);
 if(source.artRevision!==MOUNT_DORA_ART||!Array.isArray(placements))throw Error('MOUNT_DORA_GEOMETRY_SOURCE');
 const compatibleDecks=policy.id==='mount-dora-source-deck-v1',suppressed=profile==='photo-guided-v1'?new Set([MOUNT_DORA_DONNELLY]):new Set(),supports=placements.filter(p=>p.kind==='pier'&&p.deck).map(p=>({id:p.id,kind:'pier',points:deckPoints(p),h:compatibleDecks?p.deck.heightM:p.deck.topM,floorId:'md-deck'}));
 for(const p of parts)if(p.support)supports.push({id:p.id,points:p.points.map(q=>[...q]),h:p.topH,footMarginM:0,floorId:p.floorId||'md-donnelly-porch'});
 const extra=parts.filter(p=>p.collider&&!p.support).map(p=>({...p,shape:contactShape({id:p.id,points:p.kind==='beam'?[{x:p.from[0],y:p.from[2]},{x:p.to[0],y:p.to[2]}]:p.points.map(xy),radiusM:p.radiusM||p.widthM/2||0,minH:p.kind==='beam'?Math.min(p.from[1],p.to[1])-p.widthM/2:p.minH,maxH:p.kind==='beam'?Math.max(p.from[1],p.to[1])+p.widthM/2:p.topH})}));
 const geometryKey='md:'+dataSHA256({source:MOUNT_DORA_SOURCE,art:MOUNT_DORA_ART,profile,parts,policy,nativeRevision});
 // Minimum-eave clearance is conservative beneath pitched roofs. These are
 // data polygons, including holes, not renderer bounds or convex hull fills.
 const openRoofs=placements.flatMap(p=>p.kind==='boathouse'?p.pieces.map((piece,i)=>({id:p.id+':roof:'+i,kind:'polygon',polygons:[[piece.points.map(([x,y])=>[x-.5,y-.5])]],minH:piece.eave-.12,maxH:piece.eave+.15})):['pavilion','stage'].includes(p.kind)?[{id:p.id+':roof',kind:'polygon',polygons:[[p.points.map(([x,y])=>[x-.5,y-.5])]],minH:2,maxH:2.27}]:[]);
 function solidSet(area){const values=source.solidsFor(area).filter(s=>!suppressed.has(s.placementId)),closed=source.closedBuildings.query(area).filter(s=>!suppressed.has(s.placementId));return [...values,...closed];}
 function colliders(a,b,actor){const area=bounds(a,b,actor.radiusM),list=[];
  for(const {run,key}of source.wallsFor(area,{walk:true})){if(run.sourceBuildingIds.every(id=>suppressed.has(id)))continue;list.push(contactShape({id:key.slice(0,250),points:[xy(run.a),xy(run.b)],radiusM:.08,minH:run.z*2.12,maxH:(run.z+run.stories-1)*2.12+2}));}
  for(const [i,s]of solidSet(area).entries())list.push(...edges(s,(s.id||s.placementId||'solid-'+i).slice(0,180)));
  for(const p of extra)list.push(p.shape);
  for(const roof of openRoofs)list.push(...edges(roof,roof.id,roof.minH,roof.maxH));
  return list;
 }
 function spans(a,b,r){const area=bounds(a,b,r),water=[],intervals=supports.map(s=>({...s,span:compatibleDecks&&s.kind==='pier'?touchedInterval(contactShape({id:s.id,points:s.points.map(xy),minH:-1,maxH:1}),a,b,r):supportInterval(s.points,a,b,s.footMarginM??r)})).filter(s=>s.span&&s.span[0]<=s.span[1]);
  for(let y=Math.floor(area[1]+.5);y<=Math.floor(area[3]+.5);y++)for(let x=Math.floor(area[0]+.5);x<=Math.floor(area[2]+.5);x++){
   const tile=source.tile(x,y),points=[[x-.5,y-.5],[x+.5,y-.5],[x+.5,y+.5],[x-.5,y+.5]];if(tile===null||tile==='water'){const shape=contactShape({id:'terrain:'+x+','+y,points:points.map(xy),minH:-1,maxH:1}),span=touchedInterval(shape,a,b,r);if(span)water.push({span,tile});}
   else if(compatibleDecks&&tile==='bridge'){const deck=supports.find(s=>s.kind==='pier'&&supportInterval(s.points,{x,y},{x,y},0));if(deck){const span=supportInterval(points,a,b,0);if(span&&span[0]<=span[1])intervals.push({id:'bridge-cell:'+x+','+y,floorId:'md-deck',h:deck.h,span});}}
  }
  const ticks=[0,1,...water.flatMap(s=>s.span),...intervals.flatMap(s=>s.span)].filter(t=>t>=0&&t<=1).sort((a,b)=>a-b).filter((n,i,a)=>!i||n-a[i-1]>EPS),result=[];
  for(let i=0;i<ticks.length-1;i++){const start=ticks[i],end=ticks[i+1],t=(start+end)/2,active=intervals.filter(s=>t>=s.span[0]-EPS&&t<=s.span[1]+EPS),raised=active.filter(s=>s.h>0).sort((a,b)=>a.h-b.h),wet=water.find(s=>t>s.span[0]+EPS&&t<s.span[1]-EPS),chosen=raised[0];result.push({start,end,h:chosen?.h??0,floorId:chosen?.floorId??'md-ground',id:chosen?.id??'md-ground',supported:!wet||!!chosen&&!compatibleDecks&&wet.tile!==null,missing:wet?.tile===null});}
  if(!result.length){const raised=intervals.sort((a,b)=>a.h-b.h)[0],wet=water.length>0,missing=water.some(s=>s.tile===null);result.push({start:0,end:1,h:raised?.h??0,floorId:raised?.floorId??'md-ground',id:raised?.id??'md-ground',supported:!wet||!!raised&&!compatibleDecks&&!missing,missing});}return result;
 }
 const at=(a,b,t,h)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,h});
 function validateBody(a,b,actor){const min=Math.min(a.h,b.h),max=Math.max(a.h,b.h)+actor.heightM,shape=disc(a,actor.radiusM,min,max),delta={x:b.x-a.x,y:b.y-a.y};for(const s of solidSet(bounds(a,b,actor.radiusM)))if(inSolid(a,s)||inSolid(b,s))return bad('CLOSED_BUILDING','Mapped exterior has no verified interior or entrance.');for(const roof of openRoofs)if(min<roof.maxH-EPS&&max>roof.minH+EPS&&(inSolid(a,roof)||inSolid(b,roof)))return bad('BODY_BLOCKED','The full actor body exceeds the conservative evidenced roof eave clearance.');for(const obstacle of colliders(a,b,actor))if(contactOverlap(shape,obstacle)||castContact(shape,delta,obstacle))return bad('BODY_BLOCKED','The complete actor body meets authoritative geometry.');return ok;}
 function validateSpan(a,b,actor,step=false){const body=validateBody(a,b,actor);if(!body.ok)return body;const sections=spans(a,b,actor.radiusM);if(sections.some(s=>!s.supported))return bad(sections.some(s=>s.missing)?'TOWN_NOT_LOADED':'UNSUPPORTED','Continuous full-foot support is required.');if(!step&&sections.some(s=>Math.abs(s.h-a.h)>EPS))return bad('SUPPORT_CHANGED','A level segment must retain its actual support height.');return ok;}
 function node(position,s){return {position,floorId:s.floorId,supportId:s.id.slice(0,96)};}
 function plan({actor,from,to}){
  // Shared rounded-body contact produces the same bounded tangent behavior as
  // ordinary engine walking; each emitted leg is independently support-checked.
  const obstacles=colliders(from,to,actor),moved=moveWithContacts(disc(from,actor.radiusM,from.h,from.h+actor.heightM),{x:to.x-from.x,y:to.y-from.y},obstacles),legs=moved.segments.length?moved.segments:[{from:{x:0,y:0},to:{x:0,y:0}}],path=[{position:clone(from),floorId:actor.floorId,supportId:'retained-foot'}],segments=[];
  let current=clone(from),halt=false;
  for(const leg of legs){const a={...current},b={x:from.x+leg.to.x,y:from.y+leg.to.y,h:current.h},length=Math.hypot(b.x-a.x,b.y-a.y);if(length<EPS)continue;const sections=spans(a,b,actor.radiusM).reduce((out,s)=>{const old=out.at(-1);if(old&&old.h===s.h&&old.id===s.id&&old.supported===s.supported)old.end=s.end;else out.push({...s});return out;},[]);
   const append=(t,s,kind)=>{const p=at(a,b,t,s.h);if(Math.hypot(p.x-current.x,p.y-current.y, p.h-current.h)>EPS){path.push(node(p,s));segments.push(kind);current=p;}};
   for(let i=0;i<sections.length;i++){const s=sections[i],next=sections[i+1];if(!s.supported){halt=true;break;}if(Math.abs(s.h-current.h)>EPS)return bad('FOOT_SUPPORT','Start at the confirmed support height.');
    if(next&&(!next.supported||Math.abs(next.h-s.h)>EPS)){
     const before=Math.max(s.start,s.end-.06/length);append(before,s,'surface');
     if(!next.supported){halt=true;break;}const rise=next.h-s.h;if(rise>policy.upM+EPS||-rise>policy.downM+EPS){halt=true;break;}
     const after=Math.min(next.end,next.start+.06/length);append(after,next,'step');
    }else append(s.end,s,'surface');
   }if(halt)break;
  }
  if(path.length>65)return bad('SUPPORTED_WORK_LIMIT','This movement crosses too many support boundaries.');return {ok:true,path,segments,stopAtEnd:halt||moved.blocked,contacts:moved.contacts};
 }
 function validate(query){const {actor,path,segments,position}=query;if(!path){const support=spans(position,position,actor.radiusM)[0];if(!support.supported||Math.abs(support.h-position.h)>EPS||actor.floorId!==support.floorId)return bad('FOOT_SUPPORT','Restore the exact saved support, floor identity and foot elevation.');return {...validateBody(position,position,actor),geometryKey};}
  if(path.length===1)return validate({...query,path:null});
  for(const node of path){const s=spans(node.position,node.position,actor.radiusM)[0];if(node.floorId!==s.floorId)return bad('FLOOR_SUPPORT','Path nodes must retain their authoritative support floor.');}
  for(let i=0;i<segments.length;i++){const a=path[i].position,b=path[i+1].position,step=segments[i]==='step',rise=b.h-a.h;if(step){if(Math.abs(rise)<EPS||rise>policy.upM+EPS||-rise>policy.downM+EPS||Math.hypot(b.x-a.x,b.y-a.y)>.120001)return bad('STEP_BOUND','A step must cross one bounded authored support edge.');const sa=spans(a,a,actor.radiusM)[0],sb=spans(b,b,actor.radiusM)[0];if(Math.abs(sa.h-a.h)>EPS||Math.abs(sb.h-b.h)>EPS)return bad('STEP_SUPPORT','Step endpoints need actual support.');}const result=validateSpan(a,b,actor,step);if(!result.ok)return result;}
  return {ok:true,geometryKey};
 }
 return Object.freeze({geometryKey,supports:clone(supports),spans,colliders:(...args)=>clone(colliders(...args)),validateBody,planSupportedWalk:plan,validateSupportedWalk:validate});
}
