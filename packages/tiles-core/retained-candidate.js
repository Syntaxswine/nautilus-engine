// Private dispatch counterpart of the frozen v1 retained consumer. Same one-use
// lease/CAS semantics; one candidate core resolver, no host history or storage.
// Small retained-host seam. The host owns persistence/history; this wrapper owns
// only resource-free prepared handles and a synchronous final write lease.
import {data,fields,digest,fail,freeze,clone} from './data.js';
import {prepareTileRepair} from './v2-records.js';
export function createRetainedTileConsumer(host){
  if(host===null||typeof host!=='object')fail('MISSING_HOST_SERVICE','/host','Bind a retained host record.');
  const services={};for(const key of ['read','compareAndSwap']){const descriptor=Object.getOwnPropertyDescriptor(host,key);if(!descriptor||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='function')fail('MISSING_HOST_SERVICE','/host/'+key,'Bind an own retained-host function.');services[key]=descriptor.value;}
  let retired=false,operation=null;const plans=new WeakMap();
  function run(task){if(retired)fail('DISPOSED','/consumer','The example connection is retired.');if(operation)fail('REENTRANT_EDIT','/consumer','Finish the active operation.');const owner={};operation=owner;try{return task(()=>!retired&&operation===owner);}finally{operation=null;}}
  return Object.freeze({
    prepare(request){return run(()=>{const snapshot=data(services.read());fields(snapshot,['bundle','token','contextToken','cancelled'],'/snapshot',['bundle','token','contextToken']);digest(snapshot.token,'/snapshot/token');digest(snapshot.contextToken,'/snapshot/contextToken');const result=prepareTileRepair(snapshot.bundle,request,{contextToken:snapshot.contextToken,cancelled:snapshot.cancelled??false});if(!result.ok)return result;const view=freeze({...result,expectedHostToken:snapshot.token});plans.set(view,{bundle:clone(result.next.bundle),changes:clone(result.changes),expected:{...clone(result.expected),hostToken:snapshot.token},requestId:result.requestId});return view;});},
    apply(prepared){return run(active=>{const plan=plans.get(prepared);if(!plan)fail('INVALID_PREPARED_TILE_EDIT','/prepared','Apply an actual handle from this same connection once.');plans.delete(prepared);let open=true,ack;try{ack=services.compareAndSwap({expected:clone(plan.expected),nextBundle:clone(plan.bundle),changes:clone(plan.changes),requestId:plan.requestId,canCommit:()=>open&&active()});}catch{return {ok:false,committed:null,code:'COMMIT_OUTCOME_UNKNOWN',requestId:plan.requestId};}finally{open=false;}if(ack!==true&&ack!==false)return {ok:false,committed:null,code:'COMMIT_OUTCOME_UNKNOWN',requestId:plan.requestId};return {ok:ack,committed:ack,code:ack?null:'STALE_OR_CANCELLED',requestId:plan.requestId};});},
    dispose(){retired=true;}
  });
}
