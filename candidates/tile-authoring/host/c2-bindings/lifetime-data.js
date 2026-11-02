// Private obligation bookkeeping only. No authority/history acceptance or write.
import {need,own,field,canonicalId} from './data.js';
export function createHostLifetimeRecords(){
 const records=new WeakMap();let retained=0;
 function get(handle){const r=records.get(handle);need(r,'C2_HOST_FOREIGN_LIFETIME');return r;}
 function match(r,t){need(field(t,'operation')===r.operation&&field(t,'ticket')===r.ticket&&field(t,'c2Attempt')===r.attempt&&field(t,'c2Phase')===r.phase,'C2_HOST_TRANSACTION_IDENTITY');need(field(r.operation,'id')===r.id,'C2_HOST_ORIGINAL_ID');}
 return Object.freeze({
  retain(input){const v=own(input,['id','attempt','source','ticket','operation','phase','wal']);canonicalId(v.id);need(retained<128,'C2_HOST_LIFETIME_LIMIT');need(field(v.operation,'id')===v.id&&field(field(v.wal.pending,'checkpoint').journal.pending,'id')===v.id,'C2_HOST_ORIGINAL_ID');const h=Object.freeze({}),r={...v,state:'review',outcome:null,acceptanceNoted:false,transaction:null};records.set(h,r);retained++;return h;},
  enterApply(handle,t){const r=get(handle);match(r,t);need(r.state==='review','C2_HOST_ACCEPTANCE_REPLAY');r.transaction=t;r.state='applying';},
  unknown(handle,t,known=null){const r=get(handle);match(r,t);need(r.transaction===t&&['applying','unknown','committed-debt'].includes(r.state),'C2_HOST_TRANSACTION_IDENTITY');need(known===null||known==='committed','C2_HOST_OUTCOME');if(r.acceptanceNoted)need(known==='committed','C2_HOST_KNOWN_OUTCOME');r.outcome=known;r.state=known==='committed'?'committed-debt':'unknown';},
  enterRecovery(handle,t,id){const r=get(handle);match(r,t);need(r.transaction===t&&id===r.id&&r.state==='unknown','C2_HOST_RECOVERY_ID');return Object.freeze({id:r.id,attempt:r.attempt,operation:r.operation,ticket:r.ticket,pending:r.wal.pending.checkpoint,purpose:'outcome-recovery'});},
  noteKnown(handle,t,outcome){const r=get(handle);match(r,t);need(r.transaction===t&&['applying','unknown'].includes(r.state)&&!r.acceptanceNoted&&['committed','not-committed'].includes(outcome),'C2_HOST_ACCEPTANCE_REPLAY');r.outcome=outcome;r.acceptanceNoted=outcome==='committed';r.state=outcome==='committed'?'committed-debt':'refused-debt';},
  presentationRetry(handle,t){const r=get(handle);match(r,t);need(r.transaction===t&&r.acceptanceNoted&&r.outcome==='committed'&&r.state==='committed-debt','C2_HOST_RETRY_PURPOSE');return Object.freeze({id:r.id,attempt:r.attempt,phase:r.phase,purpose:'presentation-retry'});},
  settleOwnedCleanup(handle,t){const r=get(handle);match(r,t);need(r.transaction===t&&['committed-debt','refused-debt'].includes(r.state),'C2_HOST_UNKNOWN_RETAINED');r.state='settled';for(const key of ['attempt','source','ticket','operation','phase','wal','transaction'])r[key]=null;retained--;},
  inspect(handle){const r=get(handle);return Object.freeze({id:r.id,state:r.state,outcome:r.outcome,acceptanceNoted:r.acceptanceNoted});}
 });
}
