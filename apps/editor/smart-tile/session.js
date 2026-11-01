import {SMART_TILE_INTERFACE as C,SMART_TILE_LIMITS as L,smartTileActions,assertSmartTileAdapter} from './contract.js';
import {openSmartTileCheckpoint,serializeSmartTileCheckpoint,smartTileData,smartTileDigest,smartTileCheckpointToken,stageSmartTileOperation,id,fail} from './checkpoint.js';
import {createWindowAuthoringJournal} from '../../../packages/windows-authoring/journal.js';
import {validateSmartTileDraft,planSmartTileIntent,planSmartTileLock} from './intents.js';
import {createSmartTileViews} from './views.js';

const clone=structuredClone,documentText=c=>JSON.stringify(c.document);
const errorCode=e=>{const d=e&&typeof e==='object'&&Object.getOwnPropertyDescriptor(e,'code');return d&&Object.hasOwn(d,'value')&&typeof d.value==='string'&&/^[A-Z0-9_]{1,80}$/.test(d.value)?d.value:'SMART_TILE_REFUSED';};

export async function createSmartTileSession(deps,{authority,floorController,presentation,newId=()=>crypto.randomUUID(),providerToken='public-canonical-tile-art-v1',retireInput=()=>{}}){
  if(typeof retireInput!=='function'||typeof newId!=='function'||typeof providerToken!=='string'||!providerToken.length||providerToken.length>512)fail('SESSION_BINDING','/host','Supply explicit synchronous input retirement, stable IDs and an immutable provider/pool context.');
  let checkpoint=openSmartTileCheckpoint(deps,authority.read());
  deps.tiles.openTileBundle(checkpoint.document.tileBundle,{requireResolved:true});
  const supplied=checkpoint.document.floorBinding.floors.map(({id,label,elevationM})=>({id,label,elevationM}));
  if(smartTileDigest(supplied)!==smartTileDigest(floorController.state.floors))fail('FLOOR_AUTHORITY_MISMATCH','/floors','Borrow the actual complete supplied native floor controller.');
  // No synthetic character/contact is registered. Manual inspection is explicit.
  if(floorController.state.mode!=='manual')floorController.select(floorController.state.selectedId);
  let phase='preparing',tool='rectangle',selectedOwnerId=null,draft=null,reviewed=null,transaction=null,recovery=null,generation=0,disposed=false,notifying=false,invoking=false,visualRevision=null;
  const listeners=new Set(),diagnostics=[];
  const history=createWindowAuthoringJournal({initialText:documentText(checkpoint),contextKey:'smart-tile-session-v1',maxEntries:L.historyEntries,maxBytes:L.historyBytes,maxDocumentBytes:L.checkpointBytes});
  let floorState=floorController.state,floorEpoch=0;
  const context=()=>smartTileDigest({floorId:floorState.selectedId,mode:floorState.mode,floorEpoch,providerToken});
  const diagnostic=(code,message='The operation was refused; the accepted source and history remain available.')=>{diagnostics.push({code,path:'/editor',message,action:'Correct the draft, retry presentation, or recover the retained request as indicated.'});if(diagnostics.length>32)diagnostics.shift();};
  function kernelDiagnostics(input){
    const copied=smartTileData(input);if(!Array.isArray(copied))return false;
    for(const d of copied.slice(0,16)){if(!d||typeof d.code!=='string')continue;diagnostics.push({...d,code:d.code.slice(0,128),path:typeof d.path==='string'?d.path.slice(0,512):'/editor',message:typeof d.message==='string'?d.message.slice(0,4000):'The operation was refused.',action:typeof d.action==='string'?d.action.slice(0,4000):'Keep accepted state and correct the draft using the named public contract.'});while(diagnostics.length>32)diagnostics.shift();}return copied.length>0;
  }
  const views=createSmartTileViews({...presentation,onDiagnostic:code=>diagnostic(code,'Owned presentation cleanup reported a callback failure. Borrowed resources remain host-owned.')});
  const floor=()=>({...supplied.find(f=>f.id===floorState.selectedId),mode:floorState.mode});
  function snapshot(){
    const h=history.snapshot,b=checkpoint.document.tileBundle,ready=phase==='recovery-required'?'unconfirmed':phase==='presentation-error'?'failed':phase==='review'?'candidate':visualRevision===h.revision?'accepted':'pending';
    return clone({version:C.version,phase,tool,selectedOwnerId,draft,reviewId:reviewed?.id??null,requestId:reviewed?.requestId??transaction?.operation.id??null,recoveryId:recovery?.operation.id??null,revision:h.revision,checkpointSerial:checkpoint.journal.serial,history:h.history,floor:floor(),owners:b.layout.instances.map(v=>{const r=b.recipes.find(r=>r.id===v.recipeId);return {id:v.id,recipeId:v.recipeId,locked:v.locked,shapeKind:r.shape.kind,skinId:r.interior.skinId,floorId:v.floorBindings.base};}),readiness:{authoring:{state:phase==='recovery-required'?'recovery-required':'saveable'},shape:{state:'resolved'},visual:{state:ready,revision:visualRevision},query:{state:'unbound'},support:{state:'unbound'},navigation:{state:'unbound'},fire:{state:'unbound'},water:{state:'unbound'},game:{state:'unbound'}},actions:smartTileActions({phase,manual:floorState.mode==='manual',selected:!!selectedOwnerId,hasDraft:!!draft,undo:h.history.undo,redo:h.history.redo}),diagnostics,resources:views.snapshot()});
  }
  function notify(){
    if(disposed||notifying)return;notifying=true;
    try{for(const listener of [...listeners]){if(disposed)break;if(!listeners.has(listener))continue;try{listener(snapshot());}catch{diagnostic('OBSERVER_FAILED','An observer threw after state publication; acceptance and resource ownership are unchanged.');}}}finally{notifying=false;}
  }
  const setPhase=value=>{if(!disposed)phase=value;};
  const rejected=e=>{const code=errorCode(e),d=e&&typeof e==='object'&&Object.getOwnPropertyDescriptor(e,'diagnostics');let recorded=false;try{if(d&&Object.hasOwn(d,'value'))recorded=kernelDiagnostics(d.value);}catch{}if(!recorded)diagnostic(code);notify();return {ok:false,code,diagnostics:clone(diagnostics)};};
  function invoke(task){if(invoking||notifying)return {ok:false,code:'EDITOR_REENTRY'};if(disposed)return {ok:false,code:'DISPOSED'};invoking=true;try{const result=task();return result instanceof Promise?result.catch(rejected):result;}catch(e){return rejected(e);}finally{invoking=false;}}
  function allowed(action){if(!snapshot().actions[action])fail(phase==='recovery-required'?'RECOVERY_REQUIRED':'ACTION_UNAVAILABLE','/actions/'+action,'Use an available explicit editor action.');}
  function retire({keepDraft=false}={}){
    generation++;reviewed=null;if(!keepDraft)draft=null;
    // A staged/unknown transaction keeps its original history ticket privately.
    if(!transaction&&!recovery)history.cancel();try{retireInput('ticket-retired');}catch{diagnostic('INPUT_RETIRE_FAILED');}views.cancel();
  }
  const current=(g,c)=>!disposed&&generation===g&&context()===c;
  function actual(){const c=authority.read();if(c.journal.pending||smartTileDigest(c)!==smartTileDigest(checkpoint))fail('STALE_AUTHORITY','/checkpoint','The authoritative complete checkpoint changed; preserve it and reopen deliberately.');return c;}
  const consumer=deps.tiles.createRetainedTileConsumer({
    read(){actual();return {bundle:checkpoint.document.tileBundle,token:smartTileCheckpointToken(checkpoint),contextToken:context(),cancelled:disposed};},
    compareAndSwap(packet){
      const t=transaction;if(!t||t.action!=='edit')return false;
      const b=checkpoint.document.tileBundle,expected={revision:b.layout.revision,layoutDigest:deps.tiles.tileLayoutToken(b.layout),catalogueDigest:b.layout.catalogueDigest,contextToken:t.context,hostToken:t.operation.expected.token};
      if(packet.requestId!==t.operation.id||smartTileDigest(packet.expected)!==smartTileDigest(expected)||smartTileDigest(packet.nextBundle)!==smartTileDigest(t.operation.targetBundle))return false;
      const result=authority.commit(t.pending,()=>packet.canCommit()&&current(t.generation,t.context)&&phase==='applying');
      if(result.ack)t.accepted=result.checkpoint;return result.ack;
    }
  });
  function accept(t,next){
    // No callbacks until document, durable journal and the one history agree.
    checkpoint=next;
    const ticket=t.ticket||history.beginOpen(documentText(next));
    const accepted=history.accept(ticket,{bundleDigest:smartTileDigest(next.document.tileBundle)});
    if(!accepted.ok)fail('HISTORY_ACCEPTANCE_FAILED','/history','Committed authority requires the retained original history ticket.');
    transaction=null;recovery=null;reviewed=null;draft=null;
    if(t.ownerId)selectedOwnerId=t.ownerId;
    const promoted=t.record&&views.promote(t.record);
    if(promoted){visualRevision=history.snapshot.revision;setPhase('idle');}
    else {setPhase('presentation-error');diagnostic('COMMITTED_PRESENTATION_REQUIRED','The edit is committed. Retry its presentation without applying the operation again.');}
  }
  function refuse(t,next){checkpoint=next;history.reject(t.ticket);transaction=null;recovery=null;reviewed=null;views.cancel();setPhase(draft?'draft':'idle');}
  function freezeRecovery(t){transaction=null;recovery=t;reviewed=null;views.cancel();setPhase('recovery-required');diagnostic('COMMIT_OUTCOME_UNKNOWN','Acceptance is unknown. Edits, Undo/Redo and overwriting saves are frozen until same-request recovery.');}
  async function commitPrepared(r,action){
    const operation={kind:C.operation,version:1,id:r.requestId,documentId:checkpoint.document.id,action,expected:{token:smartTileCheckpointToken(checkpoint),contextToken:r.context},request:r.request,targetBundle:r.bundle};
    const t={...r,action,operation,pending:stageSmartTileOperation(deps,checkpoint,operation),accepted:null};
    // Retire public review/input ownership before publication or storage hooks.
    reviewed=null;transaction=t;try{retireInput('operation-start');}catch{diagnostic('INPUT_RETIRE_FAILED');}setPhase('applying');notify();
    let result;
    try{
      const staged=authority.stage(operation,()=>current(t.generation,t.context)&&phase==='applying');
      if(!staged.ack){refuse(t,checkpoint);result={ok:false,committed:false,requestId:operation.id,code:'STALE_OR_CANCELLED'};}
      else {
        if(action==='edit')result=consumer.apply(r.prepared);
        else {const outcome=authority.commit(t.pending,()=>current(t.generation,t.context)&&phase==='applying');if(outcome.ack)t.accepted=outcome.checkpoint;result={ok:outcome.ack,committed:outcome.ack,requestId:operation.id,code:outcome.ack?null:'STALE_OR_CANCELLED'};}
        if(t.accepted){accept(t,t.accepted);result={ok:true,committed:true,requestId:operation.id};}
        else if(result.committed===false){const settled=authority.recover(t.pending,operation.id);if(settled.state==='settled'&&settled.outcome==='committed'){accept(t,settled.checkpoint);result={ok:true,committed:true,requestId:operation.id};}else if(settled.state==='settled'){refuse(t,settled.checkpoint);}else {freezeRecovery(t);result={ok:false,committed:null,requestId:operation.id,code:settled.code||'COMMIT_OUTCOME_UNKNOWN'};}}
        else freezeRecovery(t);
      }
    }catch{
      if(t.accepted){
        // Acknowledgement is final even if presentation/observers fail later.
        if(transaction===t)accept(t,t.accepted);
        setPhase('presentation-error');result={ok:true,committed:true,requestId:operation.id};
      }else {freezeRecovery(t);result={ok:false,committed:null,requestId:operation.id,code:'COMMIT_OUTCOME_UNKNOWN'};}
    }
    notify();return {...result,diagnostics:clone(diagnostics)};
  }
  async function prepare(action,lockId=null){
    const g=generation,c=context();let ticket=null;
    try{
      actual();const requestId='request-'+newId();id(requestId,'/requestId');let request,prepared,bundle,ownerId=selectedOwnerId;
      if(action==='edit'){
        const plan=lockId?{request:planSmartTileLock(deps.tiles,checkpoint,lockId,{requestId,contextToken:c}),ownerId:lockId}:planSmartTileIntent(deps,checkpoint,draft,{requestId,newOwnerId:'owner-'+newId(),floorId:floorState.selectedId,contextToken:c});
        request=plan.request;ownerId=plan.ownerId;prepared=consumer.prepare(request);if(!prepared.ok){const code=prepared.diagnostics?.[0]?.code||'TILE_REPAIR_REFUSED';if(!kernelDiagnostics(prepared.diagnostics||[]))diagnostic(code);setPhase(draft?'draft':'idle');notify();return {ok:false,code,diagnostics:smartTileData(prepared.diagnostics||[])};}bundle=prepared.next.bundle;
        ticket=history.beginEdit(JSON.stringify({...checkpoint.document,tileBundle:bundle}));
      }else {
        ticket=action==='undo'?history.beginUndo():history.beginRedo();if(!ticket)fail('HISTORY_EMPTY','/history','No saved target is available.');const target=smartTileData(ticket.targetText);
        if(target.id!==checkpoint.document.id||target.sourceJSON!==checkpoint.document.sourceJSON||smartTileDigest(target.floorBinding)!==smartTileDigest(checkpoint.document.floorBinding))fail('HISTORY_SOURCE_MISMATCH','/history','History cannot replace the retained source or floor authority.');
        bundle=deps.tiles.openTileBundle(target.tileBundle,{requireResolved:true}).bundle;request={id:requestId,kind:'smart-tile-history-restore',action,targetDocumentDigest:smartTileDigest(target)};
      }
      // Check the complete prospective WAL before any allocation or write.
      stageSmartTileOperation(deps,checkpoint,{kind:C.operation,version:1,id:requestId,documentId:checkpoint.document.id,action,expected:{token:smartTileCheckpointToken(checkpoint),contextToken:c},request,targetBundle:bundle});
      setPhase('preparing');notify();if(!current(g,c)){history.reject(ticket);return {ok:false,code:'STALE_PREPARATION'};}
      const view=await views.acquire(bundle,()=>current(g,c));
      if(!current(g,c)){history.reject(ticket);return {ok:false,code:'STALE_PREPARATION'};}
      if(!view.ok){history.reject(ticket);setPhase(draft?'draft':'idle');diagnostic(view.code);notify();return {ok:false,code:view.code};}
      const r={id:'review-'+requestId,requestId,context:c,generation:g,request,prepared,bundle,ownerId,ticket,record:view.record};
      if(action!=='edit')return commitPrepared(r,action);
      reviewed=r;setPhase('review');notify();return current(g,c)&&reviewed===r?{ok:true,reviewId:r.id,requestId}:{ok:false,code:'STALE_PREPARATION'};
    }catch(e){if(ticket)history.reject(ticket);if(current(g,c)){setPhase(draft?'draft':'idle');diagnostic(errorCode(e));notify();}return {ok:false,code:errorCode(e),diagnostics:clone(diagnostics)};}
  }
  async function rebuild({resetHistory=false}={}){
    retire();const g=generation,c=context();setPhase('preparing');notify();
    const r=await views.acquire(checkpoint.document.tileBundle,()=>current(g,c));
    if(!current(g,c))return {ok:false,code:'STALE_PRESENTATION'};
    if(r.ok&&views.promote(r.record)){
      if(resetHistory)history.accept(history.beginOpen(documentText(checkpoint)),{bundleDigest:smartTileDigest(checkpoint.document.tileBundle)});
      visualRevision=history.snapshot.revision;setPhase('idle');notify();return {ok:true};
    }
    setPhase('presentation-error');diagnostic(r.code||'PRESENTATION_REFUSED');notify();return {ok:false,code:r.code||'PRESENTATION_REFUSED'};
  }
  const adapter=assertSmartTileAdapter({
    getSnapshot:snapshot,
    subscribe(listener){if(disposed)fail('DISPOSED','/subscribe','This session is retired.');if(notifying)fail('EDITOR_OBSERVER_REENTRY','/subscribe','Subscribe outside an active notification.');if(listeners.size>=32)fail('OBSERVER_LIMIT','/subscribe','Use at most 32 retained view observers.');if(typeof listener!=='function')throw TypeError('Supply a listener.');listeners.add(listener);try{notifying=true;try{listener(snapshot());}finally{notifying=false;}}catch{diagnostic('OBSERVER_FAILED');}return()=>listeners.delete(listener);},
    setTool(value){return invoke(()=>{allowed('setTool');if(!C.tools.includes(value))fail('UNSUPPORTED_SMART_TILE_TOOL','/tool','Use an available tool.');retire();tool=value;setPhase('idle');notify();return {ok:true};});},
    selectOwner(value){return invoke(()=>{allowed('selectOwner');if(value!==null&&!checkpoint.document.tileBundle.layout.instances.some(v=>v.id===value))fail('UNKNOWN_OWNER','/ownerId','Select an accepted whole owner.');retire();selectedOwnerId=value;setPhase('idle');notify();return {ok:true};});},
    setDraft(value){return invoke(()=>{allowed('setDraft');const next=validateSmartTileDraft(value);retire();draft=next;tool=next.tool;setPhase('draft');notify();return {ok:true};});},
    review(){return Promise.resolve(invoke(()=>{allowed('review');retire({keepDraft:true});return prepare('edit');}));},
    apply(reviewId){return Promise.resolve(invoke(()=>{allowed('apply');const r=reviewed;if(!r||r.id!==reviewId||!current(r.generation,r.context))fail('STALE_REVIEW','/reviewId','Apply the current acquired review once.');return commitPrepared(r,'edit');}));},
    cancel(reason='cancelled'){
      if(disposed)return {ok:false,code:'DISPOSED'};
      const wasInvoking=invoking;invoking=true;try{retire();if(!transaction&&!recovery)setPhase(visualRevision===history.snapshot.revision?'idle':'presentation-error');notify();return {ok:true,reason:typeof reason==='string'?reason.slice(0,128):'cancelled'};}finally{invoking=wasInvoking;}
    },
    undo(){return Promise.resolve(invoke(()=>{allowed('undo');retire();return prepare('undo');}));},
    redo(){return Promise.resolve(invoke(()=>{allowed('redo');retire();return prepare('redo');}));},
    save(){return invoke(()=>{allowed('save');actual();return {ok:true,checkpointJSON:serializeSmartTileCheckpoint(deps,checkpoint)};});},
    open(input){return Promise.resolve(invoke(()=>{allowed('open');const next=openSmartTileCheckpoint(deps,input),actual=authority.read();if(next.journal.pending||smartTileDigest(next)!==smartTileDigest(actual)||smartTileDigest(next)!==smartTileDigest(checkpoint))fail('CHECKPOINT_AUTHORITY_MISMATCH','/checkpoint','This retained session reopens its current authoritative checkpoint. Start a separate session to inspect a different checkpoint.');return rebuild({resetHistory:true});}));},
    recover(requestId){return Promise.resolve(invoke(async()=>{
      allowed('recover');const t=recovery;if(!t||requestId!==t.operation.id)return {ok:false,committed:null,requestId,code:'RECOVERY_ID_MISMATCH'};
      try{const result=authority.recover(t.pending,requestId);if(result.state!=='settled'){diagnostic(result.code||'RECOVERY_DIVERGED');notify();return {ok:false,committed:null,requestId,code:result.code||'RECOVERY_DIVERGED'};}
        if(result.outcome==='committed'){accept(t,result.checkpoint);if(!disposed)await rebuild();notify();return {ok:true,committed:true,requestId};}
        refuse(t,result.checkpoint);notify();return {ok:true,committed:false,requestId};
      }catch(e){diagnostic(errorCode(e));notify();return {ok:false,committed:null,requestId,code:errorCode(e)};}
    }));},
    retryPresentation(){return Promise.resolve(invoke(()=>{allowed('retryPresentation');return rebuild();}));},
    // Additive bounded hook. Unlocking is not a public v1 repair operation.
    lockOwner(ownerId){return Promise.resolve(invoke(()=>{allowed('setDraft');retire();return prepare('edit',ownerId);}));},
    dispose(){if(disposed)return;disposed=true;phase='disposed';generation++;reviewed=null;draft=null;listeners.clear();for(const release of [()=>retireInput('session-disposed'),unsubscribe,()=>consumer.dispose(),()=>{if(!transaction&&!recovery)history.cancel();},()=>views.dispose()])try{release();}catch{diagnostic('SESSION_CLEANUP_CALLBACK');}}
  });
  const unsubscribe=floorController.subscribe(next=>{
    const changed=next.selectedId!==floorState.selectedId||next.mode!==floorState.mode;
    // The host's before-floor-change hook calls cancel before moving its plane;
    // subscribe fences same-floor mode changes before later host subscribers.
    floorState=next;if(changed){floorEpoch++;adapter.cancel('floor-or-mode-change');}
  });
  if(checkpoint.journal.pending){const pending=checkpoint.journal.pending;recovery={operation:pending,pending:checkpoint,ticket:null,record:null};phase='recovery-required';}
  const initialPhase=phase,bootGeneration=generation,bootContext=context(),initial=await views.acquire(checkpoint.document.tileBundle,()=>current(bootGeneration,bootContext));
  if(initial.ok&&views.promote(initial.record)){visualRevision=history.snapshot.revision;phase=initialPhase==='recovery-required'?initialPhase:'idle';}
  else if(!disposed)phase=initialPhase==='recovery-required'?initialPhase:'presentation-error';
  return Object.freeze(adapter);
}
