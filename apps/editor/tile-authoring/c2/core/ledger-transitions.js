// Ordered lifetime checks over observations. These establish data consistency,
// never permission to mutate or retire a live Host/provider object.
import {fail,equal} from './data.js';
const live=x=>x.state!=='retired-verified';
const key=a=>[a.contextId,a.contextEpoch,a.allocationId].join('|');
const need=(v,code,path,msg)=>{if(!v)fail(code,path,msg);};
const omit=(x,keys)=>Object.fromEntries(Object.entries(x).filter(([k])=>!keys.includes(k)));
const nextStates={
 acquiring:['acquiring','live','cache-idle','retiring-unverified','retired-verified'],
 live:['live','cache-idle','retiring-unverified','retired-verified'],
 'cache-idle':['cache-idle','live','retiring-unverified','retired-verified'],
 'retiring-unverified':['retiring-unverified','retired-verified'],
 'retired-verified':['retired-verified']
};
export function lifetimeTracker(source){
 return {allocations:new Set(source.allocations.map(key)),materials:new Set(source.materials.map(x=>x.materialId))};
}
function rows(t,previous,current,step,b,seen,{kind,id,mutable,bytes=false}){
 const now=new Map(current.map(x=>[id(x),x])),before=new Map(previous.map(x=>[id(x),x]));
 for(const old of previous){
  b.take();const row=now.get(id(old));
  if(!row){
   need(!live(old)&&old.retirementReceiptDigest!==null&&old.referenceIds.length===0,'UNVERIFIED_'+kind+'_LOSS','/ledgerTrace','A physical row remains retained until its explicit positive verified retirement is observed.');
   continue;
  }
  need(equal(t,omit(old,mutable),omit(row,mutable),b),'OWNED_'+kind+'_IDENTITY','/ledgerTrace','One physical lifetime cannot change ownership, type, storage, source/blob, context or identity.');
  if(bytes){
   need(row.chargedBytes>=old.chargedBytes,'OWNED_ALLOCATION_CHARGE_SHRINK','/ledgerTrace','A live or historical physical quantity cannot be silently reduced; verified retirement changes charged state, not recorded size.');
   need(row.byteBasis===old.byteBasis||old.byteBasis==='reserved-upper-bound'&&row.byteBasis==='exact','OWNED_ALLOCATION_BASIS','/ledgerTrace','Exact measurements cannot silently become unknown; reservation refinement never reduces the retained charge.');
  }
  need(nextStates[old.state]?.includes(row.state),'OWNED_'+kind+'_STATE','/ledgerTrace','Retiring objects cannot silently revive or repeat a physical lifetime.');
  if(old.state==='retired-verified')need(equal(t,row,old,b),'RETIRED_'+kind+'_CHANGED','/ledgerTrace','Positive retirement evidence is immutable.');
  else if(row.state==='retired-verified')need(step.action==='retire-verified'&&row.retirementReceiptDigest!==null&&row.referenceIds.length===0,'RETIREMENT_EVENT_REQUIRED','/ledgerTrace','Only an explicit verified-retirement event releases charges.');
  else if(row.state==='retiring-unverified'&&old.state!==row.state)need(step.action==='retire-unverified','RETIREMENT_EVENT_REQUIRED','/ledgerTrace','Unverified retirement remains explicit and fully charged.');
 }
 for(const row of current)if(!before.has(id(row))){
  b.take();need(!seen.has(id(row)),'RETIRED_'+kind+'_REUSED','/ledgerTrace','A pruned retired physical identity cannot reappear under the same context/epoch.');
  need(['acquire','admit'].includes(step.action)&&!['retired-verified','retiring-unverified'].includes(row.state),'UNOBSERVED_'+kind+'_LIFETIME','/ledgerTrace','First observe actual acquired/live objects before retirement so transient peaks remain visible.');
  seen.add(id(row));
 }
}
export function validateLifetimes(t,previous,step,b,tracker){
 rows(t,previous.allocations,step.ledger.allocations,step,b,tracker.allocations,{kind:'ALLOCATION',id:key,mutable:['state','referenceIds','retirementReceiptDigest','chargedBytes','byteBasis'],bytes:true});
 rows(t,previous.materials,step.ledger.materials,step,b,tracker.materials,{kind:'MATERIAL',id:x=>x.materialId,mutable:['state','referenceIds','retirementReceiptDigest']});
}
