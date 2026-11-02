// PRIVATE C2 shared-runtime prototype. Exact0e7 default algorithm; optional instrumentation only.
import {SMART_TILE_INTERFACE as C,SMART_TILE_LIMITS as L,smartTileActions,assertSmartTileAdapter} from '../../../../deps/apps/editor/smart-tile/contract.js';
import {createSmartTileCheckpointCodec,smartTileData,smartTileDigest,id,fail} from './checkpoint.js';
import {createPrivateAuthorityObservationPort} from './authority.js';
import {createWindowAuthoringJournal,createWindowAuthoringJournalReadPort} from '../../../packages/windows-authoring/journal.js';
import {validateSmartTileDraft,planSmartTileIntent,planSmartTileLock} from '../../../../deps/apps/editor/smart-tile/intents.js';
import {createSmartTileViews} from '../../../../deps/apps/editor/smart-tile/views.js';

const clone=structuredClone,documentText=c=>JSON.stringify(c.document);
const errorCode=e=>{const d=e&&typeof e==='object'&&Object.getOwnPropertyDescriptor(e,'code');return d&&Object.hasOwn(d,'value')&&typeof d.value==='string'&&/^[A-Z0-9_]{1,80}$/.test(d.value)?d.value:'SMART_TILE_REFUSED';};

const originalSessionOps={clone,documentText,smartTileData,smartTileDigest};
const c2SessionOwners=new WeakMap();
// Borrowed connection/input owner seam, deliberately outside the seven-method
// HostService. A captured cancel capability names ONE actual running request.
export function createPrivateC2PreparationCancellationPort(session,connection){
  const owner=c2SessionOwners.get(session);if(!owner||!owner.owns(connection))fail('C2_CANCELLATION_UNBOUND','/connection','Borrow the same opted-in private session and current connection.');
  return Object.freeze({capture(requestId){
    const entry=owner.active();if(!entry||entry.requestId!==requestId||entry.handedOff||entry.cancelled||entry.attempt.signal.aborted||!owner.owns(connection))return null;
    return Object.freeze({cancel(reason='preparation-cancelled'){
      if(owner.active()!==entry||entry.requestId!==requestId||entry.handedOff||entry.cancelled||entry.attempt.signal.aborted||!owner.owns(connection))return {ok:false,code:'STALE_C2_PREPARATION'};
      const result=owner.cancel(reason);return entry.attempt.signal.aborted?result:{ok:false,code:'C2_ABORT_UNVERIFIED'};
    }});
  }});
}
export async function createSmartTileSession(deps,{authority,floorController,presentation,newId=()=>crypto.randomUUID(),providerToken='public-canonical-tile-art-v1',retireInput=()=>{},codec=authority.codec??createSmartTileCheckpointCodec(deps),profile=null}){
  const I=profile?.interface??C,authoring=profile?.authoring===true;
  const hostSlot=profile&&Object.getOwnPropertyDescriptor(profile,'c2Host'),phaseSlot=profile&&Object.getOwnPropertyDescriptor(profile,'c2PhasePorts');
  if(hostSlot&&!Object.hasOwn(hostSlot,'value')||phaseSlot&&!Object.hasOwn(phaseSlot,'value'))fail('C2_HOST_UNBOUND','/profile','Private hooks require own data slots.');
  const c2Host=hostSlot?.value??null,c2Ports=phaseSlot?.value??null,observed=codec.privateObservation??null;let bootstrap=null;
  if(c2Host||c2Ports){
    if(!authoring||I.version!==3||!Object.isFrozen(c2Host)||!Object.isFrozen(c2Ports)||!observed)fail('C2_HOST_UNBOUND','/profile','Pair an explicit frozen private host, observed v3 codec and phase owner.');
    if(Reflect.ownKeys(c2Ports).length!==4||c2Ports.kind!=='nautilus-editor-c2-phase-ports'||c2Ports.version!==1)fail('C2_HOST_UNBOUND','/profile/c2PhasePorts','Keep the closed four-field phase interface.');
    for(const key of ['prepare','restore'])if(typeof Object.getOwnPropertyDescriptor(c2Ports,key)?.value!=='function')fail('C2_HOST_UNBOUND','/profile/c2PhasePorts/'+key,'Bind an actual phase owner.');
    for(const key of ['assertPaired','requireCountedBootstrap','beginPrepare','captureRetainedIngress','originalRequestId','ownsConnection','cancelOwnedPreparation','checkAllowed','retirePreviousInput','captureSource','captureObligations','bindSourceOnce','sourceCurrent','nativeReadiness','bindActualManagerCandidate','prepareInput','requireOwnedPrepared','serializeBoundDocument','adoptActualTicket','createActualOperation','beforeActualWal','recordActualWal','phaseRefusal','retireBeforeStage','finishUnacquired','retainFailedPreparation','selectsRetainedCommand','enterActualApply','enterActualRecovery','validateActualCommit','acceptActualOutcome','refuseActualOutcome','retainActualUnknown','retireReviewThroughManager','retireSessionResourcesThroughSameManager','recoveryCanWrite','retainBootstrapRecovery','requireBootstrapEscrow','beginBootstrapRetry','finishBootstrapRetry','beginRestore','requireOwnedRestore','finishRestore','refuseRestore','restorePresentation'])if(typeof Object.getOwnPropertyDescriptor(c2Host,key)?.value!=='function')fail('C2_HOST_UNBOUND','/profile/c2Host/'+key,'The actual private pairing is incomplete.');
    c2Host.assertPaired({codec,phasePorts:c2Ports,profile});
    bootstrap=c2Host.requireCountedBootstrap(authority,codec);
  }
  const clone=observed?.utilities.clone??originalSessionOps.clone;
  const smartTileData=observed?.utilities.data??originalSessionOps.smartTileData;
  const smartTileDigest=observed?.utilities.digest??originalSessionOps.smartTileDigest;
  const documentText=observed?c=>observed.utilities.stringify(c.document):originalSessionOps.documentText;
  if(authority.codec&&authority.codec!==codec)fail('SESSION_CODEC_MISMATCH','/host/codec','The authority and session must borrow the same bound codec.');
  if(I.version!==codec.formats.checkpointVersion||I.checkpoint!==codec.formats.checkpoint)fail('SESSION_CODEC_PROFILE','/host/profile','Bind the explicit matching session profile; do not reinterpret v2 source as v1.');
  if(profile&&!Object.isFrozen(profile))fail('SESSION_PROFILE','/host/profile','Capture an immutable private session profile.');
  const openSmartTileCheckpoint=(_,v)=>codec.open(v),serializeSmartTileCheckpoint=(_,v)=>codec.serialize(v),smartTileCheckpointToken=codec.token,stageSmartTileOperation=(_,v,op)=>codec.stage(v,op);
  if(typeof retireInput!=='function'||typeof newId!=='function'||typeof providerToken!=='string'||!providerToken.length||providerToken.length>512)fail('SESSION_BINDING','/host','Supply explicit synchronous input retirement, stable IDs and an immutable provider/pool context.');
  let checkpoint=openSmartTileCheckpoint(deps,authority.read());
  // Cold reconciliation is actual same-ID authority work BEFORE the one fresh
  // journal and native manager. Unknown construction retains an opaque handle.
  if(c2Host&&checkpoint.journal.pending){
    const original=checkpoint,requestId=original.journal.pending.id;let decision;
    try{decision=authority.recover(original,requestId,()=>c2Host.recoveryCanWrite(original,authority));}
    catch(error){decision={state:'unresolved',code:errorCode(error)};}
    if(decision.state!=='settled'){
      const escrow=c2Host.retainBootstrapRecovery({authority,codec,checkpoint:original,requestId,decision});
      c2Host.requireBootstrapEscrow(escrow,original,requestId);
      let retrying=false,settled=false;
      const handle=Object.freeze({kind:'nautilus-private-c2-bootstrap-recovery',version:1,requestId,
        async retry(){
          if(retrying||settled)return {ok:false,code:retrying?'RECOVERY_BUSY':'RECOVERY_RETIRED',requestId};
          retrying=true;let retry,retryFinished=false;
          try{
            retry=c2Host.beginBootstrapRetry(escrow,original,requestId);
            // The retained ORIGINAL pending record/ID is the recovery input,
            // even if the storage currently contains its before-write prefix.
            const outcome=authority.recover(original,requestId,()=>c2Host.recoveryCanWrite(original,authority,retry));
            c2Host.finishBootstrapRetry(escrow,retry,outcome);
            retryFinished=true;
            if(outcome.state!=='settled')return {ok:false,code:outcome.code||'RECOVERY_UNRESOLVED',requestId,recovery:handle};
            settled=true;
            const session=await createSmartTileSession(deps,{authority,floorController,presentation,newId,providerToken,retireInput,codec,profile});
            return {ok:true,requestId,outcome:outcome.outcome,session};
          }catch(error){
            if(retry&&!retryFinished)c2Host.finishBootstrapRetry(escrow,retry,{state:'unresolved',code:errorCode(error)});
            throw error;
          }finally{retrying=false;}
        }});
      const error=new TypeError('Original pending operation requires same-ID recovery before native acquisition.');error.code='C2_BOOTSTRAP_RECOVERY_REQUIRED';
      Object.defineProperty(error,'bootstrapRecovery',{value:handle});throw error;
    }
    checkpoint=openSmartTileCheckpoint(deps,decision.checkpoint);
  }
  deps.tiles.openTileBundle(checkpoint.document.tileBundle,{requireResolved:true});
  const supplied=checkpoint.document.floorBinding.floors.map(({id,label,elevationM})=>({id,label,elevationM}));
  if(smartTileDigest(supplied)!==smartTileDigest(floorController.state.floors))fail('FLOOR_AUTHORITY_MISMATCH','/floors','Borrow the actual complete supplied native floor controller.');
  // No synthetic character/contact is registered. Manual inspection is explicit.
  if(floorController.state.mode!=='manual')floorController.select(floorController.state.selectedId);
  let phase='preparing',tool=authoring?'authoring':'rectangle',selectedOwnerId=null,draft=null,reviewed=null,transaction=null,recovery=null,generation=0,disposed=false,notifying=false,invoking=false,visualRevision=null,activePreparation=null;
  // V3 alone separates durable history from the original accepted visual lease.
  // A library edit never replaces this witness or clears presentation failure.
  let visualWitness=null,visualError=false;
  const listeners=new Set(),diagnostics=[];
  const historyOptions={initialText:documentText(checkpoint),contextKey:'smart-tile-session-v'+I.version,maxEntries:L.historyEntries,maxBytes:L.historyBytes,maxDocumentBytes:L.checkpointBytes};
  const history=c2Host?observed.observer.run('session.journal.construct',()=>observed.observer.opaque('journal.construct',historyOptions,()=>createWindowAuthoringJournal(historyOptions))):createWindowAuthoringJournal(historyOptions);
  const historyRead=c2Host?createWindowAuthoringJournalReadPort(history,c2Host.historyObserver,observed.observer):null;
  const authorityObservation=c2Host?createPrivateAuthorityObservationPort(authority):null;
  let floorState=floorController.state,floorEpoch=0;
  const hostContext=()=>({floorId:floorState.selectedId,mode:floorState.mode,floorEpoch,providerToken,cancelled:disposed});
  const context=()=>profile?profile.context(checkpoint.document,hostContext()):smartTileDigest({floorId:floorState.selectedId,mode:floorState.mode,floorEpoch,providerToken});
  const diagnostic=(code,message='The operation was refused; the accepted source and history remain available.')=>{diagnostics.push({code,path:'/editor',message,action:'Correct the draft, retry presentation, or recover the retained request as indicated.'});if(diagnostics.length>32)diagnostics.shift();};
  function kernelDiagnostics(input){
    const copied=smartTileData(input);if(!Array.isArray(copied))return false;
    for(const d of copied.slice(0,16)){if(!d||typeof d.code!=='string')continue;diagnostics.push({...d,code:d.code.slice(0,128),path:typeof d.path==='string'?d.path.slice(0,512):'/editor',message:typeof d.message==='string'?d.message.slice(0,4000):'The operation was refused.',action:typeof d.action==='string'?d.action.slice(0,4000):'Keep accepted state and correct the draft using the named public contract.'});while(diagnostics.length>32)diagnostics.shift();}return copied.length>0;
  }
  const views=createSmartTileViews({...presentation,onDiagnostic:code=>diagnostic(code,'Owned presentation cleanup reported a callback failure. Borrowed resources remain host-owned.')});
  const floor=()=>({...supplied.find(f=>f.id===floorState.selectedId),mode:floorState.mode});
  const fingerprint=document=>profile.presentationFingerprint(document);
  function live(view){try{return !!view&&view.diagnostics().disposed===false;}catch{return false;}}
  function rememberVisual(){if(authoring)visualWitness=Object.freeze({view:views.accepted,fingerprint:fingerprint(checkpoint.document),revision:visualRevision});}
  function visualState(){return {view:views.accepted,witness:visualWitness,error:visualError,live:live(views.accepted)};}
  function unchangedVisual(state){return !!state&&views.accepted===state.view&&visualWitness===state.witness&&visualError===state.error&&(!state.live||live(state.view));}
  function authoringVisual(){
    if(phase==='recovery-required')return 'unconfirmed';
    if(visualError)return 'failed';
    if(phase==='review'&&reviewed?.record)return 'candidate';
    return visualWitness&&views.accepted===visualWitness.view&&live(visualWitness.view)&&visualWitness.fingerprint===fingerprint(checkpoint.document)?'accepted':'pending';
  }
  function snapshot(){
    if(observed&&!observed.observer.active)return observed.observer.run('session.snapshot',snapshot);
    const h=history.snapshot,b=checkpoint.document.tileBundle,ready=authoring?authoringVisual():phase==='recovery-required'?'unconfirmed':phase==='presentation-error'?'failed':phase==='review'?'candidate':visualRevision===h.revision?'accepted':'pending';
    const base={version:I.version,phase,tool,selectedOwnerId,draft,reviewId:reviewed?.id??null,requestId:reviewed?.requestId??transaction?.operation.id??null,recoveryId:recovery?.operation.id??null,revision:h.revision,checkpointSerial:checkpoint.journal.serial,history:h.history,floor:floor(),owners:b.layout.instances.map(v=>{const r=b.recipes.find(r=>r.id===v.recipeId);return {id:v.id,recipeId:v.recipeId,locked:v.locked,shapeKind:r.shape.kind,skinId:r.interior.skinId,floorId:v.floorBindings.base};}),readiness:{authoring:{state:phase==='recovery-required'?'recovery-required':'saveable'},shape:{state:'resolved'},visual:{state:ready,revision:visualRevision},query:{state:'unbound'},support:{state:'unbound'},navigation:{state:'unbound'},fire:{state:'unbound'},water:{state:'unbound'},game:{state:'unbound'}},actions:(profile?.actions??smartTileActions)({phase,manual:floorState.mode==='manual',selected:!!selectedOwnerId,hasDraft:!!draft,undo:h.history.undo,redo:h.history.redo}),diagnostics,resources:views.snapshot()};
    return clone(profile?profile.snapshot(base,checkpoint.document):base);
  }
  function notify(){
    if(disposed||notifying)return;notifying=true;
    try{for(const listener of [...listeners]){if(disposed)break;if(!listeners.has(listener))continue;try{listener(snapshot());}catch{diagnostic('OBSERVER_FAILED','An observer threw after state publication; acceptance and resource ownership are unchanged.');}}}finally{notifying=false;}
  }
  const setPhase=value=>{if(!disposed)phase=value;};
  const rejected=e=>{const code=errorCode(e),d=e&&typeof e==='object'&&Object.getOwnPropertyDescriptor(e,'diagnostics');let recorded=false;try{if(d&&Object.hasOwn(d,'value'))recorded=kernelDiagnostics(d.value);}catch{}if(!recorded)diagnostic(code);notify();return {ok:false,code,diagnostics:clone(diagnostics)};};
  function invoke(task){if(invoking||notifying)return {ok:false,code:'EDITOR_REENTRY'};if(disposed)return {ok:false,code:'DISPOSED'};invoking=true;try{const result=task();return result instanceof Promise?result.catch(rejected):result;}catch(e){return rejected(e);}finally{invoking=false;}}
  function allowed(action){if(!snapshot().actions[action])fail(phase==='recovery-required'?'RECOVERY_REQUIRED':'ACTION_UNAVAILABLE','/actions/'+action,'Use an available explicit editor action.');}
  function retire({keepDraft=false,preservePreparation=null}={}){
    const prior=reviewed;generation++;reviewed=null;if(!keepDraft)draft=null;
    const preparing=activePreparation;
    if(preparing!==preservePreparation&&preparing&&!preparing.handedOff&&!preparing.cancelled){preparing.cancelled=true;c2Host.cancelOwnedPreparation(preparing.attempt,{reason:'ticket-retired',manager:views,requestId:preparing.requestId});}
    // A staged/unknown transaction keeps its original history ticket privately.
    if(!transaction&&!recovery)history.cancel();try{retireInput('ticket-retired');}catch{diagnostic('INPUT_RETIRE_FAILED');}
    if(preparing!==preservePreparation&&preparing&&!preparing.handedOff){/* Original phase owns its abort/drain/escrow. */}
    else if(transaction?.c2Phase||recovery?.c2Phase)c2Host.retainActualUnknown(transaction??recovery);
    else if(prior?.c2Phase)c2Host.retireReviewThroughManager(prior,views);else views.cancel();
  }
  const current=(g,c)=>!disposed&&generation===g&&context()===c;
  function actual(){const c=authority.read();if(authoring&&c===checkpoint&&!c.journal.pending)return c;if(c.journal.pending||smartTileDigest(c)!==smartTileDigest(checkpoint))fail('STALE_AUTHORITY','/checkpoint','The authoritative complete checkpoint changed; preserve it and reopen deliberately.');return c;}
  const consumer=deps.tiles.createRetainedTileConsumer({
    read(){actual();return {bundle:checkpoint.document.tileBundle,token:smartTileCheckpointToken(checkpoint),contextToken:context(),cancelled:disposed};},
    compareAndSwap(packet){
      const t=transaction;if(!t||t.action!=='edit')return false;
      const b=checkpoint.document.tileBundle,expected={revision:b.layout.revision,layoutDigest:deps.tiles.tileLayoutToken(b.layout),catalogueDigest:b.layout.catalogueDigest,contextToken:t.context,hostToken:t.operation.expected.token};
      if(packet.requestId!==t.operation.id||smartTileDigest(packet.expected)!==smartTileDigest(expected)||smartTileDigest(packet.nextBundle)!==smartTileDigest(codec.targetDocument(checkpoint.document,t.operation).tileBundle))return false;
      const result=authority.commit(t.pending,()=>packet.canCommit()&&current(t.generation,t.context)&&phase==='applying'&&(!profile||profile.validateCommit({document:checkpoint.document,hostContext:hostContext(),transaction:t,packet}))&&(!authoring||current(t.generation,t.context)&&phase==='applying'));
      if(result.ack)t.accepted=result.checkpoint;return result.ack;
    }
  });
  function accept(t,next){
    // No callbacks until document, durable journal and the one history agree.
    checkpoint=next;
    if(authoring)t.settlement=profile.settlement(next);
    const ticket=t.ticket||history.beginOpen(documentText(next));
    const accepted=history.accept(ticket,{bundleDigest:smartTileDigest(next.document.tileBundle)});
    if(!accepted.ok)fail('HISTORY_ACCEPTANCE_FAILED','/history','Committed authority requires the retained original history ticket.');
    t.historyAccepted=true;
    transaction=null;recovery=null;reviewed=null;draft=null;
    if(t.c2Phase){
      // The durable acknowledgement and actual history acceptance are final.
      // Counter/cleanup failures after this point cannot replay either one.
      try{c2Host.acceptActualOutcome(t,next,{liveHistoryAccepted:true,managerRecord:t.record});historyRead.noteAccepted(t.c2Attempt.work);}
      catch(error){visualError=true;c2Host.retainActualUnknown(t,{outcome:'committed',error});setPhase('presentation-error');diagnostic('COMMITTED_C2_SETTLEMENT_REQUIRED');return;}
    }
    if(t.ownerId)selectedOwnerId=t.ownerId;
    if(authoring&&t.tilePreparation==='source-unchanged'&&(!t.c2Phase||t.c2Phase.native.kind==='retain-existing')){
      // Preserve the accepted object, its original provenance and all debt.
      if(!unchangedVisual(t.visualState))visualError=true;
      setPhase(visualError?'presentation-error':'idle');return;
    }
    const promoted=t.record&&views.promote(t.record);
    if(promoted){visualRevision=history.snapshot.revision;visualError=false;rememberVisual();setPhase('idle');}
    else {if(authoring)visualError=true;setPhase('presentation-error');diagnostic('COMMITTED_PRESENTATION_REQUIRED','The edit is committed. Retry its presentation without applying the operation again.');}
  }
  function refuse(t,next){checkpoint=next;history.reject(t.ticket);if(t.c2Phase)c2Host.refuseActualOutcome(t,next);transaction=null;recovery=null;reviewed=null;views.cancel();setPhase(draft?'draft':'idle');}
  function freezeRecovery(t){transaction=null;recovery=t;reviewed=null;setPhase('recovery-required');if(t.c2Phase)c2Host.retainActualUnknown(t);else views.cancel();diagnostic('COMMIT_OUTCOME_UNKNOWN','Acceptance is unknown. Edits, Undo/Redo and overwriting saves are frozen until same-request recovery.');}
  async function commitPrepared(r,action){
    if(r.c2Phase)c2Host.enterActualApply(r);
    const operation=r.operation??{kind:C.operation,version:1,id:r.requestId,documentId:checkpoint.document.id,action,expected:{token:smartTileCheckpointToken(checkpoint),contextToken:r.context},request:r.request,targetBundle:r.bundle};
    const t={...r,action,operation,pending:stageSmartTileOperation(deps,checkpoint,operation),accepted:null};
    // Retire public review/input ownership before publication or storage hooks.
    reviewed=null;transaction=t;try{retireInput('operation-start');}catch{diagnostic('INPUT_RETIRE_FAILED');}setPhase('applying');notify();
    let result;
    try{
      const staged=authority.stage(operation,()=>current(t.generation,t.context)&&phase==='applying'&&(!t.c2Phase||c2Host.validateActualCommit(t,{checkpoint,hostContext:hostContext(),actualManagerRecord:t.record,authority,authorityObservation,invocation:authorityObservation.currentInvocation(),purpose:'stage'})));
      if(!staged.ack){refuse(t,checkpoint);result={ok:false,committed:false,requestId:operation.id,code:'STALE_OR_CANCELLED'};}
      else {
        if(action==='edit'&&!(authoring&&t.tilePreparation==='source-unchanged'))result=consumer.apply(r.prepared);
        else {const outcome=authority.commit(t.pending,()=>current(t.generation,t.context)&&phase==='applying'&&(!authoring||(t.c2Phase?c2Host.validateActualCommit(t,{checkpoint,hostContext:hostContext(),actualManagerRecord:t.record,authority,authorityObservation,invocation:authorityObservation.currentInvocation(),purpose:'commit'}):profile.validateCommit({document:checkpoint.document,hostContext:hostContext(),transaction:t,packet:null})&&(t.tilePreparation!=='source-unchanged'||unchangedVisual(t.visualState)))&&current(t.generation,t.context)&&phase==='applying'));if(outcome.ack)t.accepted=outcome.checkpoint;result={ok:outcome.ack,committed:outcome.ack,requestId:operation.id,code:outcome.ack?null:'STALE_OR_CANCELLED'};}
        if(t.accepted){accept(t,t.accepted);result={ok:true,committed:true,requestId:operation.id};}
        else if(result.committed===false){const settled=authority.recover(t.pending,operation.id);if(settled.state==='settled'&&settled.outcome==='committed'){accept(t,settled.checkpoint);result={ok:true,committed:true,requestId:operation.id};}else if(settled.state==='settled'){refuse(t,settled.checkpoint);}else {freezeRecovery(t);result={ok:false,committed:null,requestId:operation.id,code:settled.code||'COMMIT_OUTCOME_UNKNOWN'};}}
        else freezeRecovery(t);
      }
    }catch{
      if(t.accepted){
        // Acknowledgement is final even if presentation/observers fail later.
        if(transaction===t&&!t.historyAccepted)accept(t,t.accepted);
        if(authoring)visualError=true;setPhase('presentation-error');result={ok:true,committed:true,requestId:operation.id};
      }else {freezeRecovery(t);result={ok:false,committed:null,requestId:operation.id,code:'COMMIT_OUTCOME_UNKNOWN'};}
    }
    notify();return {...result,...(authoring&&result.committed===true?{settlement:t.settlement}:{}),diagnostics:clone(diagnostics)};
  }
  function startC2(action,lockId=null){
    if(activePreparation)fail('C2_PREPARATION_IN_FLIGHT','/prepare','Cancel or finish the same original preparation first.');
    const attempt=c2Host.beginPrepare(checkpoint),entry={attempt,requestId:null,cancelled:false,handedOff:false};activePreparation=entry;
    return prepareC2(action,lockId,entry);
  }
  async function prepareC2(action,lockId,entry){
    const attempt=entry.attempt;let ticket=null,ownedPhase=null,admittedTicket=null,targetJSON=null,phaseStarted=false,returnedPhase=null;
    try{
      c2Host.captureRetainedIngress(attempt,action,draft,lockId);entry.requestId=c2Host.originalRequestId(attempt);id(entry.requestId,'/requestId');
      c2Host.checkAllowed(attempt,action,()=>allowed(action==='edit'?'review':action));
      c2Host.retirePreviousInput(attempt,{keepDraft:action==='edit'},()=>retire({keepDraft:action==='edit',preservePreparation:entry}));
      const g=generation,c=context(),captured=c2Host.captureSource(attempt,{authority,codec,checkpoint,hostContext:hostContext()});
      const work=attempt.work,head=historyRead.inspectLive({action},work);if(head.data.pendingTicket)fail('HISTORY_PENDING','/history','Keep the original ticket.');
      const selection=action==='edit'?null:head.copySelected(work);if(action!=='edit'&&!selection)fail('HISTORY_EMPTY','/history','No selected actual target exists.');
      const obligations=c2Host.captureObligations(attempt,captured,head,selection);c2Host.bindSourceOnce(attempt,captured,head);
      const sourceCurrent=()=>!entry.cancelled&&!attempt.signal.aborted&&current(g,c)&&(admittedTicket?head.matchesOwnedTicket(work,admittedTicket,targetJSON):head.isCurrent(work))&&c2Host.sourceCurrent(attempt,{generation,head,admittedTicket,authority,codec,authorityObservation,invocation:authorityObservation.currentInvocation()})===true;
      setPhase('preparing');notify();if(!sourceCurrent())fail('STALE_PREPARATION','/prepare','Retain the original preparation after observer reentry.');
      const scope={signal:attempt.signal,work,isCurrent:sourceCurrent,native:{readiness:()=>c2Host.nativeReadiness(attempt),async acquireCandidate(input,candidateWork){
        if(candidateWork!==work)fail('C2_ATTEMPT_MISMATCH','/work','Use the same original attempt.');
        const result=await views.acquire(input.bundle,sourceCurrent);if(!sourceCurrent()||!result.ok)fail(result.code||'STALE_VIEW','/native','Actual candidate acquisition was refused.');
        return c2Host.bindActualManagerCandidate(attempt,result.record);
      }}};
      const input=c2Host.prepareInput(attempt,{action,captured,head,selection,obligations,draft,lockId});
      phaseStarted=true;returnedPhase=await c2Ports.prepare(input,scope);if(!returnedPhase?.data?.ok)throw c2Host.phaseRefusal(returnedPhase);
      c2Host.requireOwnedPrepared(attempt,returnedPhase);ownedPhase=returnedPhase;
      if(!sourceCurrent()||!ownedPhase.isCurrent()||!head.isCurrent(work))fail('STALE_PREPARATION','/prepare','Keep the original source/head.');
      targetJSON=c2Host.serializeBoundDocument(attempt,ownedPhase.data.bound.targetDocument);
      if(!sourceCurrent()||!ownedPhase.isCurrent())fail('STALE_PREPARATION','/prepare','Serialization cannot refresh the captured source or history.');
      ticket=action==='edit'?history.beginEdit(targetJSON):action==='undo'?history.beginUndo():history.beginRedo();
      if(!head.matchesOwnedTicket(work,ticket,targetJSON))fail('HISTORY_TICKET_MISMATCH','/history','Only the same actual ticket at original ordinal+1 is admitted.');
      admittedTicket=ticket;c2Host.adoptActualTicket(attempt,head,ticket,targetJSON);
      const operation=c2Host.createActualOperation(attempt,{action,phase:ownedPhase,ticket});
      c2Host.beforeActualWal(attempt,{checkpoint,operation});
      // These are ACTUAL PRIVATE codec calls, not a callback's claimed success.
      // No write or alternative validator is used for prospective WAL checks.
      const pending=codec.stage(checkpoint,operation),committed=codec.settle(pending,operation.id,'committed'),notCommitted=codec.settle(pending,operation.id,'not-committed');
      const wal={pending:{checkpoint:pending,checkpointJSON:codec.serialize(pending)},committed:{checkpoint:committed,checkpointJSON:codec.serialize(committed)},notCommitted:{checkpoint:notCommitted,checkpointJSON:codec.serialize(notCommitted)}};
      c2Host.recordActualWal(attempt,wal);if(!sourceCurrent()||!ownedPhase.isCurrent())fail('STALE_PREPARATION','/prepare','Original bindings cannot be restamped.');
      const record=ownedPhase.native.kind==='replace-owned'?ownedPhase.native.candidate.record:null;
      const r={id:'review-'+operation.id,requestId:operation.id,context:operation.expected.contextToken,generation:g,request:operation.request,prepared:null,bundle:ownedPhase.data.bound.targetDocument.tileBundle,ownerId:null,ticket,record,operation,plan:{bound:ownedPhase.data.bound},tilePreparation:'source-unchanged',visualState:visualState(),c2Phase:ownedPhase,c2Attempt:attempt,c2Wal:wal};
      entry.handedOff=true;
      if(action!=='edit')return await commitPrepared(r,action);reviewed=r;setPhase('review');notify();return sourceCurrent()&&reviewed===r?{ok:true,reviewId:r.id,requestId:r.requestId}:{ok:false,code:'STALE_PREPARATION'};
    }catch(error){
      if(!entry.handedOff){if(ticket)history.reject(ticket);if(ownedPhase)c2Host.retireBeforeStage(attempt,ownedPhase,error,views);else if(phaseStarted)c2Host.retainFailedPreparation(attempt,error,{returnedPhase,manager:views});else c2Host.finishUnacquired(attempt,error);}
      if(!entry.handedOff&&!disposed){setPhase(draft?'draft':'idle');notify();}
      throw error;
    }finally{if(activePreparation===entry)activePreparation=null;}
  }
  async function prepare(action,lockId=null){
    const g=generation,c=context();let ticket=null;
    try{
      actual();const requestId=authoring&&action==='edit'?profile.requestId(draft):'request-'+newId();id(requestId,'/requestId');let request,prepared=null,bundle,operation,plan,ownerId=selectedOwnerId,tilePreparation='public-v1-prepared';
      const retainedVisual=authoring?visualState():null;
      if(action==='edit'){
        plan=profile?profile.plan({checkpoint,draft,requestId,newOwnerId:'owner-'+newId(),floorId:floorState.selectedId,contextToken:c,hostContext:hostContext(),lockId}):lockId?{request:planSmartTileLock(deps.tiles,checkpoint,lockId,{requestId,contextToken:c}),ownerId:lockId}:planSmartTileIntent(deps,checkpoint,draft,{requestId,newOwnerId:'owner-'+newId(),floorId:floorState.selectedId,contextToken:c});
        request=plan.request;ownerId=plan.ownerId;
        if(authoring&&plan.tilePreparation==='source-unchanged')tilePreparation='source-unchanged';
        else {prepared=consumer.prepare(request);if(!prepared.ok){const code=prepared.diagnostics?.[0]?.code||'TILE_REPAIR_REFUSED';if(!kernelDiagnostics(prepared.diagnostics||[]))diagnostic(code);setPhase(draft?'draft':'idle');notify();return {ok:false,code,diagnostics:smartTileData(prepared.diagnostics||[])};}bundle=prepared.next.bundle;}
        operation=profile?profile.editOperation({checkpoint,plan,prepared,requestId,contextToken:c,token:smartTileCheckpointToken(checkpoint),hostContext:hostContext()}):{kind:C.operation,version:1,id:requestId,documentId:checkpoint.document.id,action,expected:{token:smartTileCheckpointToken(checkpoint),contextToken:c},request,targetBundle:bundle};
        if(authoring)bundle=codec.targetDocument(checkpoint.document,operation).tileBundle;
        ticket=history.beginEdit(JSON.stringify(codec.targetDocument(checkpoint.document,operation)));
      }else {
        ticket=action==='undo'?history.beginUndo():history.beginRedo();if(!ticket)fail('HISTORY_EMPTY','/history','No saved target is available.');const target=smartTileData(ticket.targetText);
        if(profile)profile.validateHistoryTarget(checkpoint.document,target);
        else if(target.id!==checkpoint.document.id||target.sourceJSON!==checkpoint.document.sourceJSON||smartTileDigest(target.floorBinding)!==smartTileDigest(checkpoint.document.floorBinding))fail('HISTORY_SOURCE_MISMATCH','/history','History cannot replace the retained source or floor authority.');
        bundle=deps.tiles.openTileBundle(target.tileBundle,{requireResolved:true}).bundle;request={id:requestId,kind:'smart-tile-history-restore',action,targetDocumentDigest:smartTileDigest(target)};
        if(profile)operation=profile.historyOperation({checkpoint,target,requestId,action,request,contextToken:c,token:smartTileCheckpointToken(checkpoint)});
        if(authoring)tilePreparation=operation.tilePreparation;
      }
      // Check the complete prospective WAL before any allocation or write.
      operation??={kind:C.operation,version:1,id:requestId,documentId:checkpoint.document.id,action,expected:{token:smartTileCheckpointToken(checkpoint),contextToken:c},request,targetBundle:bundle};
      stageSmartTileOperation(deps,checkpoint,operation);
      if(authoring&&tilePreparation==='source-unchanged'){
        const target=codec.targetDocument(checkpoint.document,operation);
        if(smartTileDigest(target.tileBundle)!==smartTileDigest(checkpoint.document.tileBundle)||smartTileDigest(target.constraints)!==smartTileDigest(checkpoint.document.constraints)||fingerprint(target)!==fingerprint(checkpoint.document))fail('SOURCE_UNCHANGED_MISMATCH','/operation/target','Metadata must preserve exact geometry and appearance source.');
        const r={id:'review-'+requestId,requestId,context:c,generation:g,request,prepared:null,bundle,ownerId,ticket,record:null,operation,plan,tilePreparation,visualState:retainedVisual};
        if(action!=='edit')return commitPrepared(r,action);
        reviewed=r;setPhase('review');notify();return current(g,c)&&reviewed===r?{ok:true,reviewId:r.id,requestId}:{ok:false,code:'STALE_PREPARATION'};
      }
      setPhase('preparing');notify();if(!current(g,c)){history.reject(ticket);return {ok:false,code:'STALE_PREPARATION'};}
      const view=await views.acquire(bundle,()=>current(g,c));
      if(!current(g,c)){history.reject(ticket);return {ok:false,code:'STALE_PREPARATION'};}
      if(!view.ok){history.reject(ticket);setPhase(draft?'draft':'idle');diagnostic(view.code);notify();return {ok:false,code:view.code};}
      if(authoring){profile.admitPresentation({operation,record:view.record,acceptedView:views.accepted});if(!current(g,c)){history.reject(ticket);return {ok:false,code:'STALE_PREPARATION'};}}
      const r={id:'review-'+requestId,requestId,context:c,generation:g,request,prepared,bundle,ownerId,ticket,record:view.record,operation,plan,tilePreparation};
      if(action!=='edit')return commitPrepared(r,action);
      reviewed=r;setPhase('review');notify();return current(g,c)&&reviewed===r?{ok:true,reviewId:r.id,requestId}:{ok:false,code:'STALE_PREPARATION'};
    }catch(e){if(ticket)history.reject(ticket);if(current(g,c)){if(authoring)views.cancel();setPhase(draft?'draft':'idle');let recorded=false;if(authoring)try{const own=Object.getOwnPropertyDescriptor(e,'diagnostics');if(own&&Object.hasOwn(own,'value'))recorded=kernelDiagnostics(own.value);}catch{}if(!recorded)diagnostic(errorCode(e));notify();}return {ok:false,code:errorCode(e),diagnostics:clone(diagnostics)};}
  }
  async function rebuild({resetHistory=false}={}){
    if(c2Host)return restoreC2({reason:'retry-presentation'});
    retire();const g=generation,c=context();setPhase('preparing');notify();
    const r=await views.acquire(checkpoint.document.tileBundle,()=>current(g,c));
    if(!current(g,c))return {ok:false,code:'STALE_PRESENTATION'};
    if(r.ok&&views.promote(r.record)){
      if(resetHistory)history.accept(history.beginOpen(documentText(checkpoint)),{bundleDigest:smartTileDigest(checkpoint.document.tileBundle)});
      visualRevision=history.snapshot.revision;visualError=false;rememberVisual();setPhase('idle');notify();return {ok:true};
    }
    if(authoring)visualError=true;setPhase('presentation-error');diagnostic(r.code||'PRESENTATION_REFUSED');notify();return {ok:false,code:r.code||'PRESENTATION_REFUSED'};
  }
  async function restoreC2({reason,openInput,initial=false}={}){
    // A retry is presentation work, not an authoring replay or fresh ticket.
    // Boot continues the already-owned bootstrap; it cannot mint an allowance.
    const attempt=initial?bootstrap:c2Host.beginRestore(reason,checkpoint);let result=null,promoted=false;
    try{
      if(!initial){
        c2Host.checkAllowed(attempt,reason==='open'?'open':'retryPresentation',()=>allowed(reason==='open'?'open':'retryPresentation'));
        if(reason==='open'){
          const next=codec.open(openInput),source=authority.read();
          if(next.journal.pending||smartTileDigest(next)!==smartTileDigest(source)||smartTileDigest(next)!==smartTileDigest(checkpoint))fail('CHECKPOINT_AUTHORITY_MISMATCH','/checkpoint','Reopen only the same accepted authoritative checkpoint.');
        }
        retire();
      }
      const g=generation,c=context(),isCurrent=()=>!attempt.signal.aborted&&current(g,c);
      if(!initial){setPhase('preparing');notify();}
      const scope={work:attempt.work,signal:attempt.signal,isCurrent,native:{async acquireCandidate(input,work){
        if(work!==attempt.work)fail('C2_ATTEMPT_MISMATCH','/work','Restore uses the same existing owner.');
        const acquired=await views.acquire(input.bundle,isCurrent);if(!isCurrent()||!acquired.ok)fail(acquired.code||'STALE_PRESENTATION','/native','Restore did not acquire a current actual manager candidate.');
        return c2Host.bindActualManagerCandidate(attempt,acquired.record);
      }}};
      result=await c2Host.restorePresentation({reason,attempt,scope,authority,codec,checkpoint,historyRead,hostContext:hostContext()});
      c2Host.requireOwnedRestore(attempt,result);
      if(!isCurrent())fail('STALE_PRESENTATION','/native','Keep the original restore source and context.');
      promoted=result.ok===true&&views.promote(result.record);
      c2Host.finishRestore(attempt,result,{promoted,manager:views});
      if(!promoted)fail(result.code||'PRESENTATION_REFUSED','/native','Only the same actual manager candidate can be promoted.');
      visualRevision=history.snapshot.revision;visualError=false;rememberVisual();setPhase('idle');if(!initial)notify();return {ok:true};
    }catch(error){
      // A throwing retirement keeps its original charged escrow. The host must
      // not infer release from a callback's returned counters or a missing view.
      c2Host.refuseRestore(attempt,error,{result,promoted,manager:views});
      visualError=true;setPhase('presentation-error');diagnostic(errorCode(error));if(!initial)notify();return {ok:false,code:errorCode(error)};
    }
  }
  const adapter=(profile?.assertAdapter??assertSmartTileAdapter)({
    getSnapshot:snapshot,
    subscribe(listener){if(disposed)fail('DISPOSED','/subscribe','This session is retired.');if(notifying)fail('EDITOR_OBSERVER_REENTRY','/subscribe','Subscribe outside an active notification.');if(listeners.size>=32)fail('OBSERVER_LIMIT','/subscribe','Use at most 32 retained view observers.');if(typeof listener!=='function')throw TypeError('Supply a listener.');listeners.add(listener);try{notifying=true;try{listener(snapshot());}finally{notifying=false;}}catch{diagnostic('OBSERVER_FAILED');}return()=>listeners.delete(listener);},
    setTool(value){return invoke(()=>{allowed('setTool');if(!I.tools.includes(value))fail('UNSUPPORTED_SMART_TILE_TOOL','/tool','Use an available tool.');retire();tool=value;setPhase('idle');notify();return {ok:true};});},
    selectOwner(value){return invoke(()=>{allowed('selectOwner');if(value!==null&&!checkpoint.document.tileBundle.layout.instances.some(v=>v.id===value))fail('UNKNOWN_OWNER','/ownerId','Select an accepted whole owner.');retire();selectedOwnerId=value;setPhase('idle');notify();return {ok:true};});},
    setDraft(value){return invoke(()=>{allowed('setDraft');const next=(profile?.validateDraft??validateSmartTileDraft)(value);retire();draft=next;tool=authoring?'authoring':next.tool;setPhase('draft');notify();return {ok:true};});},
    review(){return Promise.resolve(invoke(()=>{if(c2Host&&c2Host.selectsRetainedCommand('edit',draft))return startC2('edit');allowed('review');retire({keepDraft:true});return prepare('edit');}));},
    apply(reviewId){return Promise.resolve(invoke(()=>{allowed('apply');const r=reviewed;if(!r||r.id!==reviewId||!current(r.generation,r.context))fail('STALE_REVIEW','/reviewId','Apply the current acquired review once.');return commitPrepared(r,'edit');}));},
    cancel(reason='cancelled'){
      if(disposed)return {ok:false,code:'DISPOSED'};
      const wasInvoking=invoking;invoking=true;try{retire();if(!transaction&&!recovery)setPhase(authoring?(visualError?'presentation-error':'idle'):visualRevision===history.snapshot.revision?'idle':'presentation-error');notify();return {ok:true,reason:typeof reason==='string'?reason.slice(0,128):'cancelled'};}finally{invoking=wasInvoking;}
    },
    undo(){return Promise.resolve(invoke(()=>{if(c2Host)return startC2('undo');allowed('undo');retire();return prepare('undo');}));},
    redo(){return Promise.resolve(invoke(()=>{if(c2Host)return startC2('redo');allowed('redo');retire();return prepare('redo');}));},
    save(){return invoke(()=>{allowed('save');actual();return {ok:true,checkpointJSON:serializeSmartTileCheckpoint(deps,checkpoint)};});},
    open(input){return Promise.resolve(invoke(()=>{if(c2Host)return restoreC2({reason:'open',openInput:input});allowed('open');const next=openSmartTileCheckpoint(deps,input),actual=authority.read();if(next.journal.pending||smartTileDigest(next)!==smartTileDigest(actual)||smartTileDigest(next)!==smartTileDigest(checkpoint))fail('CHECKPOINT_AUTHORITY_MISMATCH','/checkpoint','This retained session reopens its current authoritative checkpoint. Start a separate session to inspect a different checkpoint.');return rebuild({resetHistory:!authoring});}));},
    recover(requestId){return Promise.resolve(invoke(async()=>{
      if(authoring&&!recovery){
        const accepted=actual(),index=accepted.journal.receipts.findIndex(r=>r.id===requestId);
        if(index<0)return {ok:false,committed:false,requestId,code:'RECOVERY_ID_MISMATCH'};
        const receipt=accepted.journal.receipts[index];
        if(receipt.outcome==='not-committed')return {ok:true,committed:false,requestId,code:'RECOVERED_NOT_COMMITTED'};
        const historical=codec.open({...accepted,document:codec.targetDocument(accepted.document,receipt.operation),journal:{...accepted.journal,serial:index+1,receipts:accepted.journal.receipts.slice(0,index+1),pending:null}});
        return {ok:true,committed:true,requestId,settlement:profile.settlement(historical)};
      }
      if(recovery?.c2Phase)c2Host.enterActualRecovery(recovery);allowed('recover');const t=recovery;if(!t||requestId!==t.operation.id)return {ok:false,committed:null,requestId,code:'RECOVERY_ID_MISMATCH'};
      try{const result=authority.recover(t.pending,requestId);if(result.state!=='settled'){diagnostic(result.code||'RECOVERY_DIVERGED');notify();return {ok:false,committed:null,requestId,code:result.code||'RECOVERY_DIVERGED'};}
        if(result.outcome==='committed'){accept(t,result.checkpoint);if(!disposed&&!(authoring&&t.tilePreparation==='source-unchanged'))await rebuild();notify();return {ok:true,committed:true,requestId,...(authoring?{settlement:t.settlement}:{})};}
        refuse(t,result.checkpoint);notify();return {ok:true,committed:false,requestId};
      }catch(e){diagnostic(errorCode(e));notify();return {ok:false,committed:null,requestId,code:errorCode(e)};}
    }));},
    retryPresentation(){return Promise.resolve(invoke(()=>{if(c2Host)return restoreC2({reason:'retry-presentation'});allowed('retryPresentation');return rebuild();}));},
    // Additive bounded hook. Unlocking is not a public v1 repair operation.
    lockOwner(ownerId){return Promise.resolve(invoke(()=>{allowed('setDraft');retire();return prepare('edit',ownerId);}));},
    dispose(){if(disposed)return;disposed=true;phase='disposed';generation++;reviewed=null;draft=null;listeners.clear();for(const release of [()=>{if(activePreparation&&!activePreparation.handedOff){activePreparation.cancelled=true;c2Host.cancelOwnedPreparation(activePreparation.attempt,{reason:'session-disposed',manager:views,requestId:activePreparation.requestId});}},()=>retireInput('session-disposed'),unsubscribe,()=>consumer.dispose(),()=>{if(!transaction&&!recovery)history.cancel();},()=>{if(c2Host)c2Host.retireSessionResourcesThroughSameManager({transaction,recovery,views,checkpoint});else views.dispose();}])try{release();}catch{diagnostic('SESSION_CLEANUP_CALLBACK');}}
  });
  if(authoring){
    adapter.getAuthoringSnapshot=()=>{if(!recovery&&!transaction)actual();return clone(profile.authoringSnapshot({checkpoint,token:smartTileCheckpointToken(checkpoint),contextToken:context(),hostContext:hostContext()}));};
    adapter.getAuthoringReview=()=>reviewed?clone(profile.authoringReview(reviewed)):null;
    adapter.queryAuthoring=input=>invoke(()=>profile.query(checkpoint.document,input));
  }
  // Optional v2 presentation action uses this same retirement/context owner.
  // Default v1 profiles expose no inspection method or capability.
  if(typeof profile?.setInspection==='function')adapter.setInspection=value=>invoke(()=>{
    allowed('setInspection');const g=generation,c=context(),source=smartTileCheckpointToken(checkpoint);
    const stale=()=>({ok:false,code:disposed?'DISPOSED':'STALE_INSPECTION'});
    const bound=(expectedGeneration,expectedContext)=>{
      if(!current(expectedGeneration,expectedContext))return false;
      const checked=actual();
      return current(expectedGeneration,expectedContext)&&smartTileCheckpointToken(checked)===source&&snapshot().actions.setInspection&&current(expectedGeneration,expectedContext);
    };
    const next=profile.validateInspection(value);if(!bound(g,c))return stale();
    // Retire advances exactly once. A callback's additional retirement, floor
    // change or disposal must not become a freshly captured activation lease.
    retire();if(!bound(g+1,c))return stale();
    floorEpoch++;setPhase(authoring?(visualError?'presentation-error':'idle'):visualRevision===history.snapshot.revision?'idle':'presentation-error');const activatedContext=context();
    profile.setInspection(next);if(!bound(g+1,activatedContext))return stale();
    notify();return bound(g+1,activatedContext)?{ok:true}:stale();
  });
  if(c2Host)c2SessionOwners.set(adapter,{active:()=>activePreparation,owns:connection=>!disposed&&c2Host.ownsConnection(connection)===true,cancel:reason=>adapter.cancel(reason)});
  const unsubscribe=floorController.subscribe(next=>{
    const changed=next.selectedId!==floorState.selectedId||next.mode!==floorState.mode;
    // The host's before-floor-change hook calls cancel before moving its plane;
    // subscribe fences same-floor mode changes before later host subscribers.
    floorState=next;if(changed){floorEpoch++;adapter.cancel('floor-or-mode-change');}
  });
  if(checkpoint.journal.pending){const pending=checkpoint.journal.pending;recovery={operation:pending,pending:checkpoint,ticket:null,record:null,tilePreparation:authoring?pending.tilePreparation:null};phase='recovery-required';}
  const initialPhase=phase,bootGeneration=generation,bootContext=context(),initial=c2Host?await restoreC2({reason:'boot',initial:true}):await views.acquire(checkpoint.document.tileBundle,()=>current(bootGeneration,bootContext));
  if(initial.ok&&(c2Host||views.promote(initial.record))){visualRevision=history.snapshot.revision;rememberVisual();phase=initialPhase==='recovery-required'?initialPhase:'idle';}
  else if(!disposed){if(authoring)visualError=true;phase=initialPhase==='recovery-required'?initialPhase:'presentation-error';}
  if(authoring&&recovery)recovery.visualState=visualState();
  return Object.freeze(adapter);
}
