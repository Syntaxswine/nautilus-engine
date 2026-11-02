// One live connection to the existing Editor session. Canonical JSON is
// display/transport data; only this connection retains the one-use review.
import {smartTileDigest,fields,id,fail} from '../smart-tile/checkpoint.js';
import {readAuthoringJSON,transportRefusal} from './jsonl.js';
const connections=new WeakMap();

export function createTileAuthoringHostService({session,authoring,isAuthorized,connectionId=globalThis.crypto.randomUUID()}){
  if(typeof isAuthorized!=='function'||typeof connectionId!=='string'||!connectionId.length)fail('HOST_AUTHORIZATION_REQUIRED','/service','Bind an authorized live workspace connection.');
  for(const name of ['tileAuthoringDiscovery','planTileAuthoring','bindTileAuthoringTarget'])if(typeof authoring?.[name]!=='function')fail('AUTHORING_CORE_REQUIRED','/service/'+name,'Bind the actual reviewed public Core implementation.');
  for(const name of ['getAuthoringSnapshot','getAuthoringReview','setDraft','review','apply','cancel','recover'])if(typeof session?.[name]!=='function')fail('AUTHORING_SESSION_REQUIRED','/service/'+name,'Borrow the matching v3 session.');
  let retained=null,busy=false,lastOutcome=null,publishing=false;
  const listeners=new Set();
  const authorize=()=>{if(!isAuthorized())fail('HOST_UNAUTHORIZED','/service','This connection is no longer authorized for the workspace.');};
  const state=()=>session.getSnapshot();
  const initial=state();if(initial.recoveryId)lastOutcome={outcome:'unknown',requestId:initial.recoveryId,committed:null,recoveryRequestId:initial.recoveryId,writesFrozen:true,potentiallyCommittedResources:'retain-until-same-id-recovery'};
  const refusal=(error,requestId)=>transportRefusal(error,requestId);
  function outcome(result,requestId){
    if(result.committed===null)return {outcome:'unknown',requestId,committed:null,recoveryRequestId:requestId,writesFrozen:true,potentiallyCommittedResources:'retain-until-same-id-recovery'};
    if(result.committed===true){
      let visual='failed';try{visual=state().readiness.visual.state;}catch{}
      return {outcome:'committed',requestId,committed:true,...result.settlement,receiptId:requestId,presentation:visual==='accepted'?'ready':visual==='failed'?'failed':'pending'};
    }
    return {outcome:'rejected',requestId,committed:false,diagnostics:refusal({diagnostics:result.diagnostics??[{code:result.code??'APPLY_REJECTED',path:'/apply',message:'The original request was not committed.',action:'Keep accepted source and correct the named refusal.',ownerIds:[]}]},requestId).diagnostics};
  }
  function publish(){if(publishing)return;publishing=true;try{for(const listener of [...listeners])try{listener();}catch{}}finally{publishing=false;}}
  async function finite(task){authorize();if(busy||publishing)fail('HOST_BUSY','/service','Finish the current finite operation.');busy=true;try{return await task();}finally{publish();busy=false;}}
  const service=Object.freeze({
    describe(){authorize();return {...authoring.tileAuthoringDiscovery(),executorImplemented:true,hostProtocolVersion:1,executor:'Editor shared v3 session',unsupported:['path-placement','overlays','artwork-import','decoration-capture','content-pack-export']};},
    snapshot(){authorize();return session.getAuthoringSnapshot();},
    async query(input){
      let query;try{authorize();query=readAuthoringJSON(input);if(typeof session.queryAuthoring!=='function')fail('AUTHORING_QUERY_UNBOUND','/query','The actual Core query binding is unavailable.');const result=await session.queryAuthoring(query);return result?.ok===false?refusal(result,'query'):result;}catch(error){return refusal(error,'query');}
    },
    async prepare(input){
      let command;
      try{return await finite(async()=>{
        command=readAuthoringJSON(input);const staged=session.setDraft(command);if(!staged.ok)return refusal({diagnostics:staged.diagnostics},command?.requestId);
        retained=null;lastOutcome=null;const result=await session.review();if(!result.ok){const failed=refusal({diagnostics:result.diagnostics},command.requestId);lastOutcome={outcome:'rejected',requestId:command.requestId,committed:false,diagnostics:failed.diagnostics};return failed;}
        const review=session.getAuthoringReview();if(!review||review.requestId!==command.requestId)fail('REVIEW_BINDING_MISMATCH','/review','Retain the actual current session review.');
        const reviewToken=smartTileDigest({connectionId,reviewId:result.reviewId,requestId:command.requestId,bindings:review.bindings});
        const packet={kind:'nautilus-tile-authoring-review',version:1,...review,reviewToken,resourceReadiness:'host-bound',status:'reviewable'};
        retained={reviewId:result.reviewId,reviewToken,requestId:command.requestId,targetDigest:review.bindings.targetHostDocumentDigest,review:packet,applyRequest:{requestId:command.requestId,reviewToken,expectedTargetDigest:review.bindings.targetHostDocumentDigest}};
        return structuredClone(packet);
      });}catch(error){return refusal(error,command?.requestId);}
    },
    async apply(input){
      let request;
      try{return await finite(async()=>{
        request=readAuthoringJSON(input);fields(request,['requestId','reviewToken','expectedTargetDigest'],'/apply');
        if(!retained||request.requestId!==retained.requestId||request.reviewToken!==retained.reviewToken||request.expectedTargetDigest!==retained.targetDigest)fail('STALE_REVIEW','/apply','Apply the exact one-use review from this live connection.');
        const current=retained;retained=null;lastOutcome=outcome(await session.apply(current.reviewId),current.requestId);return structuredClone(lastOutcome);
      });}catch(error){return {outcome:'rejected',requestId:request?.requestId??'invalid-request',committed:false,diagnostics:refusal(error,request?.requestId).diagnostics};}
    },
    cancel(reviewToken){
      authorize();if(!retained||retained.reviewToken!==reviewToken)return {cancelled:false};
      retained=null;const result={cancelled:session.cancel('authoring-review-cancelled').ok===true};publish();return result;
    },
    async recover(requestId){
      try{return await finite(async()=>{id(requestId,'/requestId');const pending=state().recoveryId;if(pending&&pending!==requestId)fail('RECOVERY_ID_MISMATCH','/requestId','Recover the original pending request; its outcome and resources remain retained.');lastOutcome=outcome(await session.recover(requestId),requestId);return structuredClone(lastOutcome);});}
      catch(error){return {outcome:'rejected',requestId:typeof requestId==='string'?requestId:'invalid-request',committed:false,diagnostics:refusal(error,requestId).diagnostics};}
    }
  });
  connections.set(service,{session,authorize,listeners,
    collect(command){authorize();if(busy||publishing)return {ok:false,code:'EDITOR_REENTRY'};const result=session.setDraft(command);if(result.ok){retained=null;lastOutcome=null;publish();}return result;},
    discard(){authorize();if(busy||publishing)return {ok:false,code:'EDITOR_REENTRY'};retained=null;lastOutcome=null;const result=session.cancel('authoring-draft-discarded');publish();return result;},
    view(){
      authorize();const current=state(),snapshot=session.getAuthoringSnapshot(),command=current.draft;
      if(retained&&current.reviewId!==retained.reviewId)retained=null;
      const kinds=['recipe.create','recipe.clone','recipe.revise','preset.save','preset.place','placement.upgrade'],actions={};
      const unavailable=snapshot.missingBindings.length>0;
      for(const name of kinds)actions[name]={enabled:current.actions.setDraft&&!unavailable,diagnostics:[]};
      for(const name of ['review','apply','cancel','undo','redo','save','open','recover','retryPresentation'])actions[name]={enabled:name==='recover'?current.phase==='recovery-required'||lastOutcome?.outcome==='unknown':name==='apply'?current.actions.apply&&!!retained&&!unavailable:name==='save'?current.actions.save:current.actions[name]&&!unavailable,diagnostics:[]};
      for(const name of ['owner.remove','decoration.add','decoration.update','decoration.remove','surface.layers','stroke.group','content.import','content.export','path.place'])actions[name]={enabled:false,diagnostics:[{code:'C1_FEATURE_UNAVAILABLE',path:'/actions/'+name,message:'This feature is unavailable in the rectangle authoring tranche.',action:'Preserve source and use a supported explicit operation.',ownerIds:[]}]};
      const ops=command?.operations??[],targets=[...new Set(ops.flatMap(op=>op.body?.ownerIds??op.body?.placements?.map(p=>p.ownerId)??[]))],scope=ops.length===1&&ops[0].kind==='preset.place'?'explicit-placements':targets.length?'explicit-selected-placements':ops.length?'new-immutable-library-record':'whole-workspace';
      return structuredClone({snapshot,presentation:{command,scope,targetOwnerIds:targets,includeSelectedDecorationDefaults:false,selectedCaptureMarkIds:[],review:retained?.review??null,retainedApplyRequest:retained?.applyRequest??null,outcome:lastOutcome,actions},commandJSON:command?JSON.stringify(command):null,readiness:current.readiness,resources:current.resources});
    }});
  return service;
}

// UI borrows these Editor ports; none adds a command grammar or durable state.
export function createTileAuthoringWorkbenchBinding({service,session,borrowedFloorController,borrowedInputOwner,borrowedResourcePorts,allocateIds}){
  const connection=connections.get(service);if(!connection||connection.session!==session||typeof allocateIds!=='function')fail('AUTHORING_BINDING','/binding','Borrow the matching session/service connection and explicit ID issuer.');
  const getSnapshot=()=>connection.view();
  return Object.freeze({service,getSnapshot,collectCommand:command=>connection.collect(command),discardDraft:()=>connection.discard(),allocateIds,
    borrowedFloorController,borrowedInputOwner,borrowedResourcePorts,
    subscribe(listener){if(typeof listener!=='function')throw TypeError('Supply an observer.');let closed=false;const emit=()=>{if(!closed)listener(getSnapshot());};connection.listeners.add(emit);try{const unsubscribe=session.subscribe(emit);return()=>{closed=true;connection.listeners.delete(emit);unsubscribe();};}catch(error){connection.listeners.delete(emit);throw error;}},
    history:Object.freeze(Object.fromEntries(['undo','redo','save','open','retryPresentation'].map(name=>[name,(...args)=>{connection.authorize();return session[name](...args);}])))});
}
