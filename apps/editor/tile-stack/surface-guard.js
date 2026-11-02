// Conservative refusal guard only. Matching, repair and geometry acceptance
// remain with the actual public core. Every loop consumes a bounded work unit.
import {fail} from '../smart-tile/checkpoint.js';
export function surfaceWork(limits={}){
  const max=limits.maxSpatialTests??100000;if(!Number.isSafeInteger(max)||max<1||max>100000)fail('B2_SURFACE_WORK_LIMIT','/limits','Use a bounded surface guard allowance.');
  let units=0;return {take(n=1){units+=n;if(units>max)fail('B2_SURFACE_WORK_LIMIT','/limits','Conservative source/semantic discovery exhausted its work allowance.');},snapshot:()=>({units,max})};
}
function envelope(recipe,owner,work){
  const min=[Infinity,Infinity],max=[-Infinity,-Infinity];
  function point(p){work.take(5);let [x,y]=p;if(recipe.frame!=='world'){if(owner.transform.mirrorX)x=-x;for(let n=0;n<owner.transform.quarterTurns;n++)[x,y]=[-y,x];x+=owner.origin[0];y+=owner.origin[1];}if(!Number.isFinite(x)||!Number.isFinite(y))fail('B2_SURFACE_ENVELOPE_UNBOUND','/source','A complete finite conservative source envelope is required.');min[0]=Math.min(min[0],x);min[1]=Math.min(min[1],y);max[0]=Math.max(max[0],x);max[1]=Math.max(max[1],y);}
  function curve(c){work.take();if(c.kind==='compound')for(const p of c.segments)curve(p);else if(c.kind==='line'){point(c.a);point(c.b);}else if(c.kind==='cubic')c.points.forEach(point);else if(c.kind==='arc'){for(const x of [c.center[0]-c.radius,c.center[0]+c.radius])for(const y of [c.center[1]-c.radius,c.center[1]+c.radius])point([x,y]);}else fail('B2_SURFACE_ENVELOPE_UNBOUND','/source','No conservative evaluator is bound for this original curve.');}
  const s=recipe.shape;if(s.kind==='region')s.outlines.forEach(curve);else if(s.kind==='profile-sweep'){curve(s.path);const pad=s.widthM*4;for(let k=0;k<2;k++){min[k]-=pad;max[k]+=pad;}}
  else if(s.kind==='field-cell'){for(const x of [s.bounds[0],s.bounds[2]])for(const y of [s.bounds[1],s.bounds[3]])point([x,y]);}
  else fail('B2_SURFACE_ENVELOPE_UNBOUND','/source','Preserve the source; this affected family needs another bound envelope.');
  for(const p of recipe.ports){curve(p.boundary.curve);point(p.endpoint);}
  for(const r of recipe.reservations)for(const x of [r.min[0],r.max[0]])for(const y of [r.min[1],r.max[1]])point([x,y]);
  if(min.some((v,k)=>!Number.isFinite(v)||!Number.isFinite(max[k])))fail('B2_SURFACE_ENVELOPE_UNBOUND','/source','A reservation-free owner still requires a complete source envelope.');
  return {min,max};
}
const near=(a,b)=>[0,1].every(k=>Math.max(a.min[k],b.min[k])<=Math.min(a.max[k],b.max[k])+.000001);
export function assertSurfaceIsolation(before,next,ownerId,constraints,work){
  const variants=new Map(),links=[];
  for(const bundle of [before,next]){
    const recipes=new Map(bundle.recipes.map(r=>[r.id,r]));
    for(const owner of bundle.layout.instances){work.take();const r=recipes.get(owner.recipeId);if(!r)fail('B2_SURFACE_ENVELOPE_UNBOUND','/source','Every owner needs its complete source.');const entries=variants.get(owner.id)??[];entries.push(envelope(r,owner,work));variants.set(owner.id,entries);}
    for(const j of bundle.layout.joins){work.take();links.push([j.a.instanceId,j.b.instanceId]);}
    for(const r of bundle.layout.relations){work.take();links.push([r.a,r.b]);}
  }
  const ids=[...variants.keys()];if(ids.length>32)fail('STACK_OWNER_LIMIT','/target','Keep the existing 32-owner bound.');
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
    let related=false;for(const a of variants.get(ids[i]))for(const b of variants.get(ids[j])){work.take(5);if(near(a,b))related=true;}if(related)links.push([ids[i],ids[j]]);
  }
  const component=new Set([ownerId]);let changed=true;while(changed){changed=false;for(const [a,b]of links){work.take();if(component.has(a)!==component.has(b)){component.add(a);component.add(b);changed=true;}}}
  const other=[...component].filter(id=>id!==ownerId),managed=new Set([...constraints.owners.map(v=>v.instanceId),...constraints.managedRelations.flatMap(r=>[r.a,r.b])]);
  if(other.length){const stack=other.some(id=>managed.has(id))||managed.has(ownerId);fail(stack?'B2_STACK_INTERACTION_UNBOUND':'B2_SURFACE_INTERACTION_UNBOUND','/draft','This original old/new source or semantic component may interact with '+other.join(', ')+'. Keep the accepted source and place a genuinely isolated level surface.');}
  return work.snapshot();
}
