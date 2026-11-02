import {createSmartTileCheckpointCodec,smartTileDigest,fail} from './checkpoint.js';

// One trusted synchronous authority, shared by edits/history/recovery. A writer
// must compare expectedRecordDigest and check canCommit last before its write.
export function createSmartTileAuthority(deps,services,{codec=createSmartTileCheckpointCodec(deps)}={}){
  const openSmartTileCheckpoint=(_,v)=>codec.open(v),serializeSmartTileCheckpoint=(_,v)=>codec.serialize(v),smartTileCheckpointToken=codec.token,stageSmartTileOperation=(_,v,op)=>codec.stage(v,op),settleSmartTileOperation=(_,v,id,outcome)=>codec.settle(v,id,outcome),inspectSmartTileRecovery=(_,pending,actual,id)=>codec.inspectRecovery(pending,actual,id);
  const bound={};for(const key of ['read','write']){const d=Object.getOwnPropertyDescriptor(services,key);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')fail('MISSING_AUTHORITY','/authority/'+key,'Bind an own synchronous authority function.');bound[key]=d.value;}
  let busy=false;const cache=new Map();
  const remember=(raw,c)=>{cache.set(raw,c);while(cache.size>2)cache.delete(cache.keys().next().value);};
  const run=task=>{if(busy)fail('AUTHORITY_REENTRY','/authority','Do not reenter a retained storage operation.');busy=true;try{return task();}finally{busy=false;}};
  function read(){const raw=bound.read();if(typeof raw==='string'&&cache.has(raw))return cache.get(raw);const c=openSmartTileCheckpoint(deps,raw);if(typeof raw==='string')remember(raw,c);return c;}
  function write(before,next,phase,requestId,canCommit){
    const nextJSON=serializeSmartTileCheckpoint(deps,next);let open=true;
    const packet=Object.freeze({phase,requestId,expectedRecordDigest:smartTileDigest(before),nextJSON,canCommit:()=>open&&canCommit()});
    if(!canCommit())return {ack:false,checkpoint:before};let ack;try{ack=bound.write(packet);}finally{open=false;}
    if(ack!==true&&ack!==false)fail('COMMIT_OUTCOME_UNKNOWN','/authority/write','A nonboolean acknowledgement requires authoritative same-ID recovery.');if(ack)remember(nextJSON,next);return {ack,checkpoint:ack?next:before};
  }
  return Object.freeze({
    codec,
    read(){return run(read);},
    stage(operation,canCommit){return run(()=>{const before=read(),next=stageSmartTileOperation(deps,before,operation);return write(before,next,'stage',operation.id,canCommit);});},
    commit(pending,canCommit){return run(()=>{const before=read();if(smartTileDigest(before)!==smartTileDigest(pending))return {ack:false,checkpoint:before};const next=settleSmartTileOperation(deps,pending,pending.journal.pending.id,'committed');return write(before,next,'commit',pending.journal.pending.id,canCommit);});},
    recover(pending,requestId,canCommit=()=>true){return run(()=>{const before=read(),decision=inspectSmartTileRecovery(deps,pending,before,requestId);if(decision.state==='settled')return {...decision,ack:true};if(decision.state!=='not-written')return {...decision,ack:false};const next=settleSmartTileOperation(deps,pending,requestId,'not-committed'),result=write(before,next,'recover',requestId,canCommit);return result.ack?{state:'settled',outcome:'not-committed',requestId,ack:true,checkpoint:next}:{state:'unresolved',code:'RECOVERY_WRITE_REFUSED',requestId,ack:false,checkpoint:null};});},
    token(){return run(()=>smartTileCheckpointToken(read()));}
  });
}
