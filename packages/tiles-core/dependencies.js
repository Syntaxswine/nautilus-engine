import {fail,canonical,clone} from './data.js';
import {catalogue} from './recipes.js';
import {projectReservations} from './interfaces.js';
export const pairKey=(a,b)=>canonical([a,b].sort());
export const neighbour=(a,b,radius)=>[0,1].every(k=>Math.max(a.min[k],b.min[k])-Math.min(a.max[k],b.max[k])<=radius);
const relevantContact=(a,b,radius)=>neighbour(a,b,radius)&&[0,1].some(k=>Math.max(a.min[k],b.min[k])<Math.min(a.max[k],b.max[k]));
export function discoverDependencies(source,previousHandle,nextHandle,request,initial){
  let tests=0;const previous=catalogue(previousHandle),next=catalogue(nextHandle),floors=new Map(source.floors.map(f=>[f.id,f])),variants=new Map(),old=new Map(),radius=Math.round(request.neighbourRadiusM*1000000),add=(id,reservations)=>{tests+=reservations.length*8;if(tests>request.maxSpatialTests)fail('SPATIAL_WORK_LIMIT','/maxSpatialTests','Reservation projection exceeds the explicit discovery work budget.');variants.set(id,[...(variants.get(id)||[]),...reservations]);};
  for(const v of source.instances){const r=projectReservations(previous.get(v.recipeId).source,v,floors);old.set(v.id,r);add(v.id,r);if(!request.removeIds.includes(v.id)&&!request.replaceIds.includes(v.id))add(v.id,projectReservations(next.get(v.recipeId).source,v,floors));}
  for(const slot of request.slots)for(const a of slot.alternatives)add(slot.id,projectReservations(next.get(a.recipeId).source,{...slot,recipeId:a.recipeId,transform:a.transform},floors));
  const check=(a,b)=>{if(++tests>request.maxSpatialTests)fail('SPATIAL_WORK_LIMIT','/maxSpatialTests','Finite old/new reservation dependency discovery exhausted its explicit work bound.');return neighbour(a,b,radius);};
  const keys=[...variants.keys()].sort(),possiblePairs=[],oldContacts=new Set();for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
    const a=keys[i],b=keys[j];let near=false;for(const x of variants.get(a)){for(const y of variants.get(b))if(check(x,y)){near=true;break;}if(near)break;}if(near)possiblePairs.push([a,b]);
    let contact=false;for(const x of old.get(a)||[]){for(const y of old.get(b)||[]){check(x,y);if(relevantContact(x,y,radius)){contact=true;break;}}if(contact)break;}if(contact)oldContacts.add(pairKey(a,b));
  }
  const links=[...source.joins,...request.joins].map(j=>[j.a.instanceId,j.b.instanceId]).concat([...source.relations,...request.relations].map(r=>[r.a,r.b]),possiblePairs),affected=new Set(initial);let expanded=true;while(expanded){expanded=false;for(const [a,b]of links)if(affected.has(a)!==affected.has(b)){affected.add(a);affected.add(b);expanded=true;}if(affected.size>request.maxClosure)fail('DEPENDENCY_CLOSURE_LIMIT','/maxClosure','Old and new spatial/semantic neighbour closure exceeds the explicit bound.',{affectedIds:[...affected].sort()});}
  return {affectedIds:[...affected].sort(),possiblePairs,oldContacts,workUnits:()=>tests,checkContact(a,b){check(a,b);return relevantContact(a,b,radius);}};
}
export function requireCompleteRepair(compiled,request,dependencies){const links=new Set(request.joins.map(j=>pairKey(j.a.instanceId,j.b.instanceId)).concat(request.relations.map(r=>pairKey(r.a,r.b))));for(let i=0;i<compiled.instances.length;i++)for(let j=i+1;j<compiled.instances.length;j++){const a=compiled.instances[i],b=compiled.instances[j],key=pairKey(a.id,b.id);if(links.has(key)||dependencies.oldContacts.has(key))continue;let contact=false;for(const x of a.reservations){for(const y of b.reservations)if(dependencies.checkContact(x,y)){contact=true;break;}if(contact)break;}if(contact)fail('INCOMPLETE_REPAIR','/joins','A new spatial neighbour needs explicit join/cross/alongside/transition semantics; use this resolver discovery rather than a second editor alignment algorithm.',{a:a.id,b:b.id,joinId:'spatial:'+key});}}
