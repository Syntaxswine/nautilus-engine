// Private C2a source contract. No public capability or renderer entry is assigned.
import {data,fields,id,array,integer,unique,choice,fail} from './data.js';
import {PLANAR_C1_LIMITS,PlanarBudget,planarJsonBound,chargePlanarSource} from './planar-exact.js';
export const TILE_COMPOSITION_PROFILE='level-rectangles-c2a';
export const TILE_COMPOSITION_LIMITS=Object.freeze({...PLANAR_C1_LIMITS,maxGroupRectangles:16,maxAffectedOwners:32,maxOriginalSegments:128,maxPartitions:2048,maxPortBindings:4096});
export function checkCompositions(layout){
  if(!Object.hasOwn(layout,'compositions'))return;
  array(layout.compositions,'/compositions',1);unique(layout.compositions,'/compositions',g=>g.id);
  for(const g of layout.compositions){
    fields(g,['kind','version','id','operation','profile','members','finishOrder'],'/compositions');
    choice(g.kind,['planar-composition'],'/compositions/kind');choice(g.version,[1],'/compositions/version');id(g.id,'/compositions/id');
    choice(g.operation,['union'],'/compositions/operation');choice(g.profile,[TILE_COMPOSITION_PROFILE],'/compositions/profile');
    array(g.members,'/compositions/members',16);unique(g.members,'/compositions/members',m=>m.instanceId);
    for(const m of g.members){fields(m,['instanceId','primaryReservationId'],'/compositions/members');id(m.instanceId,'/compositions/members/instanceId');id(m.primaryReservationId,'/compositions/members/primaryReservationId');if(!layout.instances.some(v=>v.id===m.instanceId))fail('UNKNOWN_INSTANCE','/compositions/members','Composition members name retained instances.');}
    array(g.finishOrder,'/compositions/finishOrder',16);unique(g.finishOrder,'/compositions/finishOrder');
    if(g.finishOrder.length!==g.members.length||g.finishOrder.some(v=>!g.members.some(m=>m.instanceId===v)))fail('INVALID_FINISH_ORDER','/compositions/finishOrder','Save an explicit permutation of every member; the first owner has highest finish precedence.');
  }
}
export function compositionOptions(input){
  const o=input===undefined?{profile:TILE_COMPOSITION_PROFILE,limits:{...TILE_COMPOSITION_LIMITS}}:data(input);
  fields(o,['profile','limits'],'/composition');choice(o.profile,[TILE_COMPOSITION_PROFILE],'/composition/profile');fields(o.limits,Object.keys(TILE_COMPOSITION_LIMITS),'/composition/limits');
  for(const [k,max]of Object.entries(TILE_COMPOSITION_LIMITS))integer(o.limits[k],'/composition/limits/'+k,1,max);return o;
}
export function compositionBudget(input){const options=compositionOptions(input);return {options,budget:new PlanarBudget(options.limits)};}
// Child geometry ceilings apply to an overlay; work, source controls, output and
// provenance are shared across old/new evaluation and the entire preparation.
export function overlayBudget(parent){
  const local=new PlanarBudget(parent.limits);
  return {limits:parent.limits,take:(k,n=1)=>parent.take(k,n),count(k,n=1){if(k==='maxProvenanceLinks')return parent.count(k,n);local.count(k,n);parent.peak(k,local.counts[k]);},peak(k,n){local.peak(k,n);parent.peak(k,n);}};
}
export const chargeSource=chargePlanarSource;
export function preflight(value,budget){return planarJsonBound(value,budget,budget.limits.maxSerializedBytes);}

// Precharge inherited catalogue/shadow validation before invoking its samplers.
// These conservative sample-operation units include unused retained recipes;
// they model the bounded child passes, not CPU instructions or timings.
export function chargeCompositionCatalogue(bundle,budget){
  const estimates=new Map();
  for(const recipe of Array.isArray(bundle.recipes)?bundle.recipes:[]){
    if(!recipe||typeof recipe!=='object')continue;let samples=0;
    for(const p of Array.isArray(recipe.ports)?recipe.ports:[]){
      const n=p?.boundary?.sampling?.segmentsPerPart,curve=p?.boundary?.curve,parts=curve?.kind==='compound'&&Array.isArray(curve.segments)?curve.segments.length:1;
      // Invalid schedules refuse in the descriptor validator without sampling.
      if(Number.isSafeInteger(n)&&n>=1&&n<=128&&parts>=1&&parts<=32)samples+=parts*n+1;
    }
    budget.take('source',samples*64);estimates.set(recipe.id,samples);
  }
  for(const instance of Array.isArray(bundle.layout?.instances)?bundle.layout.instances:[]){budget.take('source',(estimates.get(instance?.recipeId)??0)*32);}
}
