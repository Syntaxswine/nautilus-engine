import {fail,canonical,token} from './data.js';
import {catalogue,effectiveOrigin,effectiveTransform} from './recipes.js';
import {projectReservations} from './interfaces.js';
import {Q,DQ} from './curves.js';
export const pairKey=(a,b)=>canonical([a,b].sort());
export const neighbour=(a,b,radius)=>[0,1].every(k=>Math.max(a.min[k],b.min[k])-Math.min(a.max[k],b.max[k])<=radius);
const relevantContact=(a,b,radius)=>neighbour(a,b,radius)&&[0,1].some(k=>Math.max(a.min[k],b.min[k])<Math.min(a.max[k],b.max[k]));
export function discoverDependencies(source,previousHandle,nextHandle,request,initial){
  let tests=0;const previous=catalogue(previousHandle),next=catalogue(nextHandle),floors=new Map(source.floors.map(f=>[f.id,f])),variants=new Map(),old=new Map(),radius=Math.round(request.neighbourRadiusM*Q),recipeGeometry=new WeakMap(),oldGeometry=new Map();
  const charge=(n=1)=>{tests+=n;if(tests>request.maxSpatialTests)fail('SPATIAL_WORK_LIMIT','/maxSpatialTests','Old/new contact discovery and proof exhausted the explicit spatial work bound.');};
  const add=(id,reservations)=>{charge(reservations.length*8);variants.set(id,[...(variants.get(id)||[]),...reservations]);};
  function geometry(cat,v){
    const r=cat.get(v.recipeId).source;let digest=recipeGeometry.get(r);
    // Exact authored geometry/interface identity, independent of bookkeeping,
    // editable anchors, manual locks and cosmetic interior skin/detail/seed.
    if(!digest){digest=token({frame:r.frame,shape:r.shape,ports:r.ports,reservations:r.reservations,templates:r.templates});recipeGeometry.set(r,digest);}
    const bindings=Object.keys(v.floorBindings).sort().map(slot=>{const floor=floors.get(v.floorBindings[slot]);if(!floor)fail('UNKNOWN_FLOOR','/floorBindings/'+slot,'Contact identity requires actual saved floor identities and elevations.');return {slot,id:floor.id,elevationM:floor.elevationM};});
    return token({recipeGeometry:digest,origin:effectiveOrigin(r,v),transform:effectiveTransform(r,v),bindings});
  }
  const fingerprint=(a,b,x,y,ga,gb)=>token((a<b?[{instanceId:a,geometry:ga,reservation:x},{instanceId:b,geometry:gb,reservation:y}]:[{instanceId:b,geometry:gb,reservation:y},{instanceId:a,geometry:ga,reservation:x}]));
  for(const v of source.instances){const r=projectReservations(previous.get(v.recipeId).source,v,floors);old.set(v.id,r);oldGeometry.set(v.id,geometry(previous,v));add(v.id,r);if(!request.removeIds.includes(v.id)&&!request.replaceIds.includes(v.id))add(v.id,projectReservations(next.get(v.recipeId).source,v,floors));}
  for(const slot of request.slots)for(const a of slot.alternatives)add(slot.id,projectReservations(next.get(a.recipeId).source,{...slot,recipeId:a.recipeId,transform:a.transform},floors));
  const check=(a,b)=>{charge();return neighbour(a,b,radius);};
  const keys=[...variants.keys()].sort(),possiblePairs=[],oldContacts=new Set();for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
    const a=keys[i],b=keys[j];let near=false;for(const x of variants.get(a)){for(const y of variants.get(b))if(check(x,y)){near=true;break;}if(near)break;}if(near)possiblePairs.push([a,b]);
    for(const x of old.get(a)||[])for(const y of old.get(b)||[]){check(x,y);if(relevantContact(x,y,radius))oldContacts.add(fingerprint(a,b,x,y,oldGeometry.get(a),oldGeometry.get(b)));}
  }
  const links=[...source.joins,...request.joins].map(j=>[j.a.instanceId,j.b.instanceId]).concat([...source.relations,...request.relations].map(r=>[r.a,r.b]),possiblePairs),affected=new Set(initial);let expanded=true;while(expanded){expanded=false;for(const [a,b]of links)if(affected.has(a)!==affected.has(b)){affected.add(a);affected.add(b);expanded=true;}if(affected.size>request.maxClosure)fail('DEPENDENCY_CLOSURE_LIMIT','/maxClosure','Old and new spatial/semantic neighbour closure exceeds the explicit bound.',{affectedIds:[...affected].sort()});}
  return {affectedIds:[...affected].sort(),possiblePairs,workUnits:()=>tests,charge,geometry:v=>geometry(next,v),unchanged(a,b,x,y,ga,gb){return oldContacts.has(fingerprint(a,b,x,y,ga,gb));},checkContact(a,b){check(a,b);return relevantContact(a,b,radius);}};
}
const overlap=(a,b,axis)=>Math.max(a.min[axis],b.min[axis])<Math.min(a.max[axis],b.max[axis]);
function relationCovers(r,a,b){
  const clearance=Math.round(r.clearanceM*Q);
  if(r.kind==='cross')return overlap(a,b,0)&&overlap(a,b,1)&&Math.max(a.min[2],b.min[2])-Math.min(a.max[2],b.max[2])>=clearance;
  if(r.kind==='alongside')return [0,1].some(axis=>Math.max(a.min[axis],b.min[axis])-Math.min(a.max[axis],b.max[axis])===clearance&&overlap(a,b,1-axis)&&overlap(a,b,2));
  // A transition tag covers only the actual proved joined interface, checked
  // separately below. It grants no additional pair-wide contact permission.
  return false;
}
const automaticJoinCoverage='A continuous straight axis-aligned lateral joined segment, finite width and vertical thickness must cover this reservation contact. Curved, diagonal, cap or gapped interfaces remain valid authored/compiled joins but need a measured per-contact relation or a later reviewed coverage proof.';
function joinCovers(port,a,b,charge,cache){
  charge();if(port.floorId!==a.floorId||port.floorId!==b.floorId||port.channel!==a.channel||port.channel!==b.channel||port.layerId!==a.layerId||port.layerId!==b.layerId||!overlap(a,b,2))return false;
  const axis=[0,1].find(k=>Math.abs(port.outward[k])===DQ&&port.outward.every((v,i)=>i===k||v===0));if(axis===undefined||!overlap(a,b,1-axis))return false;
  const sign=port.outward[axis]>0?1:-1,plane=sign===1?a.max[axis]:a.min[axis];if(plane!==(sign===1?b.min[axis]:b.max[axis])||port.endpoint[axis]!==plane)return false;
  let interval=cache.get(port);
  if(interval===undefined){
    const along=1-axis,base=port.endpoint[2]/Q;let min=Infinity,max=-Infinity,previous=null,valid=true;
    for(const part of port.geometry.descriptor){
      if(!['line','cubic'].includes(part.kind)){valid=false;break;}
      const points=part.points;for(const p of points){charge();if(p[axis]!==plane/Q||p[2]!==base)valid=false;}
      if(previous&&previous.some((v,k)=>v!==points[0][k]))valid=false;
      // Endpoint ranges are attained by the continuous analytic curve. Using
      // cubic control-hull bounds here would falsely certify unvisited spans.
      for(const p of [points[0],points.at(-1)]){min=Math.min(min,p[along]*Q);max=Math.max(max,p[along]*Q);}previous=points.at(-1);
    }
    interval=valid?{min,max,base:port.endpoint[2]}:null;cache.set(port,interval);
  }
  if(!interval)return false;
  const along=1-axis,lo=Math.max(a.min[along],b.min[along]),hi=Math.min(a.max[along],b.max[along]),bottom=Math.max(a.min[2],b.min[2]),top=Math.min(a.max[2],b.max[2]);
  return lo>=interval.min&&hi<=interval.max&&hi-lo<=port.widthM*Q&&bottom>=interval.base&&top<=interval.base+port.thicknessM*Q;
}
export function requireCompleteRepair(compiled,request,dependencies){
  const geometry=new Map(compiled.source.instances.map(v=>[v.id,dependencies.geometry(v)])),ports=new Map(compiled.instances.map(v=>[v.id,new Map(v.ports.map(p=>[p.id,p]))])),joined=new Map(),relations=new Map(),cache=new WeakMap();
  for(const join of compiled.joins)for(const pair of join.pairs){const key=pairKey(pair.a.instanceId,pair.b.instanceId);joined.set(key,[...(joined.get(key)||[]),pair]);}
  for(const r of request.relations){const key=pairKey(r.a,r.b);relations.set(key,[...(relations.get(key)||[]),r]);}
  for(let i=0;i<compiled.instances.length;i++)for(let j=i+1;j<compiled.instances.length;j++){
    const a=compiled.instances[i],b=compiled.instances[j],key=pairKey(a.id,b.id);
    for(const x of a.reservations)for(const y of b.reservations){
      if(!dependencies.checkContact(x,y)||dependencies.unchanged(a.id,b.id,x,y,geometry.get(a.id),geometry.get(b.id)))continue;
      let covered=false;
      for(const r of relations.get(key)||[]){dependencies.charge();if(relationCovers(r,x,y)){covered=true;break;}}
      if(!covered)for(const pair of joined.get(key)||[]){const end=pair.a.instanceId===a.id?pair.a:pair.b,other=end===pair.a?pair.b:pair.a,p=ports.get(end.instanceId).get(end.portId),q=ports.get(other.instanceId).get(other.portId);if(joinCovers(p,x,y,dependencies.charge,cache)&&joinCovers(q,y,x,dependencies.charge,cache)){covered=true;break;}}
      if(!covered)fail('INCOMPLETE_REPAIR','/joins','A changed or new reservation contact needs a covering actual joined boundary or a measured cross/alongside relation. An old or named contact elsewhere on the same pair cannot authorize it.',{a:a.id,b:b.id,joinId:'spatial:'+key,reservations:[x,y],automaticJoinCoverage,action:'Keep accepted state; supply a measured relation covering these specific reservation intervals, or a supported finite joined boundary. Use this resolver discovery, not a second editor alignment algorithm.'});
    }
  }
}
