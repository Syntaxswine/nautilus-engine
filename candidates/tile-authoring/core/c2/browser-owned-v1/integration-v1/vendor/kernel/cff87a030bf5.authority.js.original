// PRIVATE C2 shared-runtime prototype. Exact0e7 default algorithm; optional instrumentation only.
import {createSmartTileCheckpointCodec,smartTileDigest,fail} from './checkpoint.js';

const originalDigest=smartTileDigest,authorityObservations=new WeakMap();
export function createPrivateAuthorityObservationPort(authority){
 const state=authorityObservations.get(authority);if(!state)fail('C2_AUTHORITY_OBSERVER_UNBOUND','/authority','Borrow the actual PRIVATE observed authority instance.');
 const captures=new WeakMap();
 return Object.freeze({resultFact:result=>state.results.get(result)??null,failureFact:error=>state.failures.get(error)??null,
  currentInvocation(){const i=state.invocation;if(!i)return null;const fact=Object.freeze({method:i.method,call:i.call,arguments:i.arguments,before:i.before,phase:i.phase,next:i.next,requestId:i.requestId});captures.set(fact,i);return fact;},
  isCurrentInvocation(fact){const i=captures.get(fact);return !!i&&state.invocation===i&&fact.before===i.before&&fact.next===i.next&&fact.phase===i.phase&&fact.requestId===i.requestId;}
 });
}
// One trusted synchronous authority, shared by edits/history/recovery. A writer
// must compare expectedRecordDigest and check canCommit last before its write.
export function createSmartTileAuthority(deps,services,{codec=createSmartTileCheckpointCodec(deps)}={}){
  const observed=codec.privateObservation??null,smartTileDigest=observed?.utilities.digest??originalDigest;
  const observationState=observed?{results:new WeakMap(),failures:new WeakMap(),invocation:null}:null;
  const openSmartTileCheckpoint=(_,v)=>codec.open(v),serializeSmartTileCheckpoint=(_,v)=>codec.serialize(v),smartTileCheckpointToken=codec.token,stageSmartTileOperation=(_,v,op)=>codec.stage(v,op),settleSmartTileOperation=(_,v,id,outcome)=>codec.settle(v,id,outcome),inspectSmartTileRecovery=(_,pending,actual,id)=>codec.inspectRecovery(pending,actual,id);
  const bound={};for(const key of ['read','write']){const d=Object.getOwnPropertyDescriptor(services,key);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')fail('MISSING_AUTHORITY','/authority/'+key,'Bind an own synchronous authority function.');bound[key]=d.value;}
  let busy=false;const cache=new Map();
  const remember=(raw,c)=>{cache.set(raw,c);while(cache.size>2)cache.delete(cache.keys().next().value);};
  const run=task=>{if(busy)fail('AUTHORITY_REENTRY','/authority','Do not reenter a retained storage operation.');busy=true;try{return task();}finally{busy=false;}};
  function read(){const raw=bound.read();let c;if(typeof raw==='string'&&cache.has(raw))c=cache.get(raw);else {c=openSmartTileCheckpoint(deps,raw);if(typeof raw==='string')remember(raw,c);}if(observationState?.invocation)observationState.invocation.before=c;return c;}
  function write(before,next,phase,requestId,canCommit){
    if(observationState?.invocation)Object.assign(observationState.invocation,{before,next,phase,requestId});
    const nextJSON=serializeSmartTileCheckpoint(deps,next);let open=true;
    const packet=Object.freeze({phase,requestId,expectedRecordDigest:smartTileDigest(before),nextJSON,canCommit:()=>open&&canCommit()});
    if(!canCommit())return {ack:false,checkpoint:before};let ack;try{ack=bound.write(packet);}finally{open=false;}
    if(ack!==true&&ack!==false)fail('COMMIT_OUTCOME_UNKNOWN','/authority/write','A nonboolean acknowledgement requires authoritative same-ID recovery.');if(ack)remember(nextJSON,next);return {ack,checkpoint:ack?next:before};
  }
  const authority={
    codec,
    read(){return run(read);},
    stage(operation,canCommit){return run(()=>{const before=read(),next=stageSmartTileOperation(deps,before,operation);return write(before,next,'stage',operation.id,canCommit);});},
    commit(pending,canCommit){return run(()=>{const before=read();if(smartTileDigest(before)!==smartTileDigest(pending))return {ack:false,checkpoint:before};const next=settleSmartTileOperation(deps,pending,pending.journal.pending.id,'committed');return write(before,next,'commit',pending.journal.pending.id,canCommit);});},
    recover(pending,requestId,canCommit=()=>true){return run(()=>{const before=read(),decision=inspectSmartTileRecovery(deps,pending,before,requestId);if(decision.state==='settled')return {...decision,ack:true};if(decision.state!=='not-written')return {...decision,ack:false};const next=settleSmartTileOperation(deps,pending,requestId,'not-committed'),result=write(before,next,'recover',requestId,canCommit);return result.ack?{state:'settled',outcome:'not-committed',requestId,ack:true,checkpoint:next}:{state:'unresolved',code:'RECOVERY_WRITE_REFUSED',requestId,ack:false,checkpoint:null};});},
    token(){return run(()=>smartTileCheckpointToken(read()));}
  };
  if(observed){
    const state=observationState;authorityObservations.set(authority,state);
    for(const name of ['read','stage','commit','recover','token']){
      const actual=authority[name];authority[name]=(...args)=>observed.observer.run('authority.'+name,()=>{
        const call=observed.observer.active,prior=state.invocation,invocation={method:name,call,arguments:Object.freeze([...args]),before:null,phase:null,next:null,requestId:null};state.invocation=invocation;try{const value=actual(...args);
          if(value&&typeof value==='object')state.results.set(value,Object.freeze({method:name,call,arguments:Object.freeze([...args]),result:value}));return value;
        }catch(error){if(error&&typeof error==='object')state.failures.set(error,Object.freeze({method:name,call,arguments:invocation.arguments,error}));throw error;}finally{state.invocation=prior;}
      });
    }
  }
  return Object.freeze(authority);
}
