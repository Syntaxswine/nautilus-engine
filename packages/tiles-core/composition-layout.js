import {clone,freeze,canonical,TileError} from './data.js';
import {matchFaces} from './interfaces.js';
import {arithmetic,PlanarRefusal} from './planar-exact.js';
import {compositionBudget,chargeSource,preflight} from './composition-model.js';
import {rectangleOwner,compositionOverlay,exactTools,refuse} from './composition-geometry.js';
export const COMPOSITION_STATUSES=Object.freeze({availability:'candidate-unregistered-v2',authored:'saveable',geometry:'resolved-planar-rectangles',layout:'resolved',preparation:'private-headless-only',presentation:'unbound',nativeClassification:'unbound',physicalQuery:'unbound',support:'unbound',navigation:'unbound',fire:'unbound',game:'unbound',liveAdoption:false});
export function resolveComposition(layout,recipes,catalogueDigest,capturedOptions,shared=null){
  const {options,budget}=shared??compositionBudget(capturedOptions),E=shared?.E??arithmetic(budget),X=exactTools(E,budget);
  chargeSource({layout,recipes,options},budget);if(layout.compositions?.length!==1)refuse('PROFILE_REQUIRED','Complete C2a resolution requires one explicit typed composition group.');
  budget.peak('maxAffectedOwners',layout.instances.length);budget.peak('maxGroupRectangles',layout.compositions[0].members.length);const floors=new Map(layout.floors.map(f=>[f.id,f])),library=new Map(recipes.map(r=>[r.id,r])),owners=new Map();
  for(const v of layout.instances){budget.take('source');owners.set(v.id,rectangleOwner(library.get(v.recipeId),v,floors,E,budget));}
  const group=layout.compositions[0],overlay=compositionOverlay(group,owners,E,budget),memberIds=new Set(group.members.map(m=>m.instanceId));
  for(const o of owners.values())if(!memberIds.has(o.id))o.visible=[{min:o.bounds.min.slice(0,2),max:o.bounds.max.slice(0,2)}];
  const acceptedJoins=[],used=new Set();
  const selected=(end,j)=>{const owner=owners.get(end.instanceId),ports=owner.ports.filter(p=>p.source.faceId===end.faceId&&(end.portIds===null||end.portIds.includes(p.id)));if(!ports.length||end.portIds&&ports.length!==end.portIds.length)refuse('UNKNOWN_JOIN_PORT','A join must name every actual original selected port.','/joins/'+j);return ports;};
  const nativeSame=(a,b)=>a.every((p,i)=>E.eq(p,b[i]));
  for(const j of layout.joins){
    const a=selected(j.a,j.id),b=selected(j.b,j.id);budget.take('membership',a.length*b.length);
    if([...a,...b].some(p=>p.source.policy==='terminal'))refuse('TERMINAL_PORT','Terminal ports do not form joined interfaces.','/joins/'+j.id);
    const result=matchFaces(a.map(p=>p.canonical),b.map(p=>p.canonical),j.id);if(!result.ok){const error=new TileError('JOIN_MISMATCH','/joins/'+j.id,'The actual inherited matcher refused this full interface.');error.diagnostics=result.diagnostics;throw error;}
    if(!result.pairs.length)refuse('EMPTY_JOIN','A join must contain an actual matched port.');
    for(const pair of result.pairs){
      const oa=owners.get(pair.a.instanceId),ob=owners.get(pair.b.instanceId),p=oa.ports.find(p=>p.id===pair.a.portId),q=ob.ports.find(p=>p.id===pair.b.portId);
      const endpoints=(nativeSame(p.start,q.start)&&nativeSame(p.end,q.end))||(nativeSame(p.start,q.end)&&nativeSame(p.end,q.start));
      if(!endpoints||!nativeSame(p.endpoint,q.endpoint)||!p.outward.every((n,k)=>E.eq(n,E.neg(q.outward[k]))))refuse('NATIVE_JOIN_MISMATCH','Canonical-grid agreement cannot close an exact native gap.','/joins/'+j.id);
      for(const [o,port,other]of [[oa,p,ob],[ob,q,oa]]){
        const key=canonical([o.id,port.id]);if(used.has(key))refuse('PORT_ALREADY_JOINED','Every actual source port joins at most once.');used.add(key);
        if(port.bindings.some(x=>x.exposure!=='exposed'&&(!memberIds.has(other.id)||x.outsideOwners.length!==1||x.outsideOwners[0]!==other.id)))refuse('JOIN_PORT_OCCLUDED','A full join cannot ignore partially covered or unrelated internal port intervals.');
      }
    }
    acceptedJoins.push({id:j.id,pairs:result.pairs});
  }
  for(const o of owners.values())for(const p of o.ports)if(p.source.policy==='required'&&!used.has(canonical([o.id,p.id])))refuse('UNMATCHED_REQUIRED_PORT','Every required original port needs its own accepted complete interface.');
  const overlap=(a,b,k)=>E.cmp(X.max(a.min[k],b.min[k]),X.min(a.max[k],b.max[k]))<0;
  function relationCovers(r,a,b){
    budget.take('membership');const c=E.number(r.clearanceM);
    if(r.kind==='cross')return overlap(a,b,0)&&overlap(a,b,1)&&E.cmp(E.sub(X.max(a.min[2],b.min[2]),X.min(a.max[2],b.max[2])),c)>=0;
    if(r.kind==='alongside')return [0,1].some(k=>E.eq(E.sub(X.max(a.min[k],b.min[k]),X.min(a.max[k],b.max[k])),c)&&overlap(a,b,1-k)&&overlap(a,b,2));
    return false;
  }
  const pairJoins=(a,b)=>acceptedJoins.flatMap(j=>j.pairs).filter(p=>p.a.instanceId===a&&p.b.instanceId===b||p.a.instanceId===b&&p.b.instanceId===a);
  for(const r of layout.relations){
    const a=owners.get(r.a),b=owners.get(r.b),pairs=a.reservations.flatMap(x=>b.reservations.map(y=>[x,y]));budget.take('membership',pairs.length);
    if(r.kind==='cross'){const xy=pairs.filter(([x,y])=>overlap(x,y,0)&&overlap(x,y,1));if(!xy.length||xy.some(([x,y])=>!relationCovers(r,x,y)))refuse('INVALID_CROSSING','Every actual XY overlap needs the declared native vertical clearance.');}
    else if(r.kind==='alongside'){if(!pairs.some(([x,y])=>relationCovers(r,x,y)))refuse('INVALID_ALONGSIDE','A saved relation needs an actual exact lateral gap and positive length/height overlap.');}
    else if(!pairJoins(a.id,b.id).length)refuse('INVALID_TRANSITION','A transition tag requires an actual full matched port and grants no other reservation waiver.');
  }
  function joinCovers(p,a,b){
    budget.take('membership');if(p.floorId!==a.floorId||p.floorId!==b.floorId||p.source.channel!==a.channel||p.source.channel!==b.channel||p.source.layerId!==a.layerId||p.source.layerId!==b.layerId||!overlap(a,b,2)||!overlap(a,b,p.along))return false;
    const axis=p.axis,positive=E.sign(p.outward[axis])>0,plane=positive?a.max[axis]:a.min[axis],other=positive?b.min[axis]:b.max[axis];if(!E.eq(plane,other)||!E.eq(p.start[axis],plane))return false;
    const lo=X.max(a.min[p.along],b.min[p.along]),hi=X.min(a.max[p.along],b.max[p.along]),bottom=X.max(a.min[2],b.min[2]),top=X.min(a.max[2],b.max[2]);
    return E.cmp(lo,X.min(p.start[p.along],p.end[p.along]))>=0&&E.cmp(hi,X.max(p.start[p.along],p.end[p.along]))<=0&&E.cmp(bottom,p.start[2])>=0&&E.cmp(top,E.add(p.start[2],E.number(p.source.thicknessM)))<=0;
  }
  const certificates=[],contacts=[],list=[...owners.values()];
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)for(const a of list[i].reservations)for(const b of list[j].reservations){
    budget.take('pairs');const intersection=X.intersection(a,b),positive=X.positive(intersection),near=[0,1].every(k=>E.cmp(intersection.min[k],intersection.max[k])<=0),relevant=near&&[0,1].some(k=>overlap(a,b,k));
    if(!relevant&&!positive)continue;
    budget.count('maxProvenanceLinks');contacts.push({a:list[i].id,b:list[j].id,reservationA:a.id,reservationB:b.id,bounds:X.encodeBounds(intersection)});
    const oa=list[i],ob=list[j],primary=oa.groupId===group.id&&ob.groupId===group.id&&a.id===oa.primaryReservationId&&b.id===ob.primaryReservationId;
    if(primary){
      budget.count('maxProvenanceLinks');certificates.push({kind:'exact-primary-rectangle-contact',groupId:group.id,a:oa.id,b:ob.id,reservationA:a.id,reservationB:b.id,bounds:X.encodeBounds(intersection),positiveVolume:positive,meaning:'Only these named primary reservation intervals; no support, navigation or pair-wide permission.'});continue;
    }
    if(positive)refuse('RESERVATION_CONFLICT','A positive-volume overlap outside the two named compatible primary reservations is forbidden.');
    const relations=layout.relations.filter(r=>r.a===oa.id&&r.b===ob.id||r.a===ob.id&&r.b===oa.id);
    if(relations.some(r=>relationCovers(r,a,b)))continue;
    const joined=pairJoins(oa.id,ob.id).some(pair=>{const x=pair.a.instanceId===oa.id?pair.a:pair.b,y=pair.a.instanceId===oa.id?pair.b:pair.a;return joinCovers(oa.ports.find(p=>p.id===x.portId),a,b)&&joinCovers(ob.ports.find(p=>p.id===y.portId),b,a);});
    if(!joined)refuse('INCOMPLETE_REPAIR','Every external or additional reservation contact needs its own actual complete straight join or exact measured cross/alongside proof.');
  }
  const compiled={kind:'nautilus-compiled-tiles',version:2,mode:'rectangle-composition',source:clone(layout),layoutDigest:X.hash(layout),catalogueDigest,options:clone(options),sourceBindingDigest:X.hash({layout,recipes,options}),groupId:group.id,geometry:overlay.geometry,partitions:overlay.partitions,interfaces:overlay.interfaces,portBindings:overlay.portBindings,instances:list.map(o=>o.canonical),joins:acceptedJoins,certificates,contacts,statuses:COMPOSITION_STATUSES};
  return {compiled,owners,options,budget,E,overlay};
}
export function finishComposition(result){
  const {compiled,budget}=result,upper={total:budget.limits.maxWork,units:Object.fromEntries(Object.keys(budget.units).map(k=>[k,budget.limits.maxWork])),counts:{...budget.limits}};
  budget.peak('maxSerializedBytes',preflight({...compiled,work:upper},budget));compiled.work=budget.snapshot();return freeze(compiled);
}
export function compileComposition(...args){return finishComposition(resolveComposition(...args));}
export function compositionFailure(error,budget){
  if(!(error instanceof TileError)&&!(error instanceof PlanarRefusal))throw error;
  const bounded=s=>s.length<2048?s:s.slice(0,2030)+'...[truncated]';
  const diagnostics=(error instanceof TileError?error.diagnostics:[{code:error.code,path:error.path,message:error.message,action:'Keep complete source and accepted host state/history; unsupported or exhausted work has no partial candidate.'}]).map(d=>Object.fromEntries(['code','path','message','action'].map(k=>[k,bounded(d[k]??'')])));
  return {ok:false,next:null,changes:null,diagnostics,work:budget?.snapshot()??{total:0,units:{},counts:{}}};
}
