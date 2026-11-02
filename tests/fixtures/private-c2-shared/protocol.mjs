// PRIVATE component fixture, not a C2 admission backend. Actual public C1
// validation/native Three are used; the atlas is synthetic (no DOM/GPU proof).
// The hook recorder and phase owner below are deliberately protocol doubles.
import assert from 'node:assert/strict';
import {harness as c1Harness} from './c1.mjs';
import {createTileAuthoringSessionProfile} from '../../../apps/editor/tile-authoring/profile.js';
import {tileAuthoringInspectionPort} from '../../../apps/editor/tile-authoring/presentation.js';
import {validateTileStackDocument} from '../../../apps/editor/tile-stack/policy.js';
import {createTileAuthoringCheckpointCodec} from '../../../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/tile-authoring/checkpoint.js';
import {createSmartTileAuthority} from '../../../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/smart-tile/authority.js';
import {createSmartTileSession} from '../../../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/smart-tile/session.js';
import {smartTileData,smartTileDigest} from '../../../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/smart-tile/checkpoint.js';

export function diagnosticRecorder({stopVisit=Infinity,stopOpaque=null}={}){
 const calls=new WeakSet(),claims=new WeakMap(),stats={visits:0,textUnits:0,keys:0,entries:0,completed:0,failed:0,opaque:0,settledOpaque:0};
 const stop=()=>{const e=new Error('Diagnostic component limit');e.code='COMPONENT_OBSERVER_LIMIT';throw e;};
 const backend={begin(){const c={};calls.add(c);stats.entries++;return c;},visit(c){assert.ok(calls.has(c));if(stats.visits>=stopVisit)stop();stats.visits++;},text(c,value){assert.ok(calls.has(c));stats.textUnits+=value.length;},key(c){assert.ok(calls.has(c));stats.keys++;},beforeOpaque(c,name){assert.ok(calls.has(c));if(name===stopOpaque)stop();const claim={};claims.set(claim,c);stats.opaque++;return claim;},afterOpaque(c,claim){assert.equal(claims.get(claim),c);claims.delete(claim);stats.settledOpaque++;},failOpaque(c,claim){assert.equal(claims.get(claim),c);claims.delete(claim);},complete(c){assert.ok(calls.has(c));stats.completed++;},fail(c){assert.ok(calls.has(c));stats.failed++;}};
 return {config:{version:1,backend},snapshot:()=>Object.freeze({...stats}),scope:'diagnostic component; normalized/raw AA admission UNBOUND'};
}
export function componentBinding(deps,document,record=diagnosticRecorder()){
 // The real accepted C1 validators below create their own budgets. They prove
 // component data/shape parity ONLY; they are NOT the continued Browser Core.
 const validateSource=(_deps,{document:d,subject})=>{
  validateTileStackDocument(deps,Object.fromEntries(['id','sourceJSON','floorBinding','finishBinding','tileBundle','constraints'].map(k=>[k,d[k]])));
  return deps.authoring.inspectTileAuthoringRequirements(deps.tiles,{document:d,subject});
 };
 return {binding:createTileAuthoringCheckpointCodec(deps,document,{version:1,observation:record.config,validateSource}),record};
}
function componentValidation(deps,{document:d,subject}){
 validateTileStackDocument(deps,Object.fromEntries(['id','sourceJSON','floorBinding','finishBinding','tileBundle','constraints'].map(k=>[k,d[k]])));
 return deps.authoring.inspectTileAuthoringRequirements(deps.tiles,{document:d,subject});
}
export function historyProtocol({owns=()=>true,validate=text=>smartTileData(text)}={}){
 const facts=new WeakMap(),counts={scans:0,selectedCopies:0,obligationFacts:0};
 const observer={owns,open(){return {node(){},digest:smartTileDigest,freezeCopy:v=>Object.freeze(structuredClone(v)),finish(){},fail(){}};},
  documentFacts(work,text){assert.equal(owns(work),true);counts.scans++;const d=validate(text),fact=Object.freeze({data:Object.freeze({documentDigest:smartTileDigest(d),encodedBytes:new TextEncoder().encode(text).length,resourceRefs:d.resourceRefs??[]})});facts.set(fact,text);return fact;},
  verifyFact(work,fact,text){return owns(work)&&facts.get(fact)===text;},
  copySelected(work,value){assert.equal(owns(work),true);counts.selectedCopies++;return Object.freeze(structuredClone(value));},
  equalText(work,a,b){assert.equal(owns(work),true);return a===b;},
  openObligations(work){assert.equal(owns(work),true);const all=[];return {fact(f){counts.obligationFacts++;all.push(f.data.resourceRefs);},finish:()=>Object.freeze(all),fail(){}};}
 };
 return {observer,counts};
}
const unbound=()=>{const e=new Error('Private component backend is deliberately UNBOUND');e.code='C2_COMPONENT_BACKEND_UNBOUND';throw e;};
const privateHostNames=['assertPaired','requireCountedBootstrap','beginPrepare','captureRetainedIngress','originalRequestId','ownsConnection','cancelOwnedPreparation','checkAllowed','retirePreviousInput','captureSource','captureObligations','bindSourceOnce','sourceCurrent','nativeReadiness','bindActualManagerCandidate','prepareInput','requireOwnedPrepared','serializeBoundDocument','adoptActualTicket','createActualOperation','beforeActualWal','recordActualWal','phaseRefusal','retireBeforeStage','finishUnacquired','retainFailedPreparation','selectsRetainedCommand','enterActualApply','enterActualRecovery','validateActualCommit','acceptActualOutcome','refuseActualOutcome','retainActualUnknown','retireReviewThroughManager','retireSessionResourcesThroughSameManager','recoveryCanWrite','retainBootstrapRecovery','requireBootstrapEscrow','beginBootstrapRetry','finishBootstrapRetry','beginRestore','requireOwnedRestore','finishRestore','refuseRestore','restorePresentation'];
export async function cancellationHarness(){
 const record=diagnosticRecorder();let binding,connected=true;
 const connection=Object.freeze({}),attempts=new WeakMap(),works=new WeakSet(),ownedRestore=new WeakSet(),stats={cancel:0,retained:0,phase:0,boot:0};let active,release,started;
 const phaseStarted=new Promise(resolve=>started=resolve);
 const newAttempt=()=>{const controller=new AbortController(),work=Object.freeze({});works.add(work);const a=Object.freeze({work,signal:controller.signal});attempts.set(a,{controller,requestId:null});return a;};
 const history=historyProtocol({owns:w=>works.has(w),validate:text=>binding.domain.validateDocument(smartTileData(text))});
 const host={};
 for(const key of privateHostNames)host[key]=unbound;
 Object.assign(host,{
  historyObserver:history.observer,assertPaired(){},requireCountedBootstrap(){return newAttempt();},
  beginPrepare(){return active=newAttempt();},captureRetainedIngress(a,action,draft){attempts.get(a).requestId=draft.requestId;},originalRequestId:a=>attempts.get(a).requestId,
  ownsConnection:c=>connected&&c===connection,
  cancelOwnedPreparation(a){assert.ok(attempts.has(a));stats.cancel++;attempts.get(a).controller.abort();},
  checkAllowed(a,action,check){assert.ok(attempts.has(a));check();},retirePreviousInput(a,options,retire){assert.ok(attempts.has(a));retire();},
  captureSource(a,{authority}){assert.ok(attempts.has(a));return authority.read();},captureObligations(a,source,head){return head.scanObligations(a.work);},bindSourceOnce(){},sourceCurrent:()=>true,
  nativeReadiness:()=>({state:'UNBOUND'}),bindActualManagerCandidate(a,record){assert.ok(attempts.has(a));return {record};},prepareInput:(a,value)=>value,
  phaseRefusal:unbound,finishUnacquired(){},retainFailedPreparation(a){assert.ok(attempts.has(a));stats.retained++;},selectsRetainedCommand:()=>true,
  beginRestore:()=>newAttempt(),requireOwnedRestore(a,result){assert.ok(attempts.has(a));assert.ok(ownedRestore.has(result));},finishRestore(){},refuseRestore:unbound,
  async restorePresentation({attempt,scope,checkpoint}){stats.boot++;const candidate=await scope.native.acquireCandidate({bundle:checkpoint.document.tileBundle},attempt.work),result={ok:true,record:candidate.record};ownedRestore.add(result);return result;},
  retireSessionResourcesThroughSameManager({views}){views.dispose();}
 });
 const ports=Object.freeze({kind:'nautilus-editor-c2-phase-ports',version:1,restore:unbound,async prepare(input,scope){stats.phase++;assert.ok(works.has(scope.work));started();await new Promise(resolve=>release=resolve);if(scope.signal.aborted){const e=new Error('Original component preparation aborted');e.code='C2_COMPONENT_ABORTED';throw e;}return unbound();}});
 const base=await c1Harness({privateWork:{version:1,observation:record.config,validateSource:componentValidation},privateHooks(_profile,input){binding=input.binding;return {c2Host:Object.freeze(host),c2PhasePorts:ports};}});
 return {session:base.session,service:base.service,workbench:base.workbench,connection,record,stats,phaseStarted,base,binding,authority:base.authority,
  get active(){return active;},get raw(){return base.raw;},release:()=>release?.(),disconnect(){connected=false;base.authorized=false;},
  command(){return {kind:'nautilus-tile-authoring-command',version:1,requestId:'private.cancel.original',expected:base.service.snapshot().expected,operations:[{opId:'private.cancel.op',kind:'recipe.create',body:{definition:base.deps.authoring.createRectangleDefinition(base.deps.tiles,{identity:{id:'private.def',revision:1,recipeId:'private.recipe'},sourceIds:{prefix:'private.source',surfaceId:'private.surface',gridId:'private.grid'},widthM:8,depthM:4,finishId:'skin.brick-pavers',label:'Private component'}).definition}}],budgetProfile:'authoring-reference-proposal-v1'};},
  dispose(){release?.();base.dispose();}
 };
}

export async function defaultPrivateHarness(){
 return c1Harness();
}

// Actual PRIVATE authority/codec recovery, protocol-only resource escrow. No
// continued-meter or C2 admission claim; native acquisition must follow the WAL.
export async function coldRecoveryProbe(base,binding,operation){
 const original=binding.codec.stage(binding.codec.create(base.document),operation);let raw=binding.codec.serialize(original),blocked=true,nativeAcquires=0,retained;
 const events=[],authority=createSmartTileAuthority(base.deps,{read:()=>raw,write(packet){events.push(packet.phase);if(blocked)throw Error('Held actual before-write recovery fault');if(smartTileDigest(JSON.parse(raw))!==packet.expectedRecordDigest||!packet.canCommit())return false;raw=packet.nextJSON;return true;}},{codec:binding.codec});
 const works=new WeakSet(),escrows=new WeakMap(),restores=new WeakSet(),history=historyProtocol({owns:w=>works.has(w),validate:text=>binding.domain.validateDocument(smartTileData(text))});
 const newAttempt=()=>{const a=Object.freeze({work:Object.freeze({}),signal:new AbortController().signal});works.add(a.work);return a;};
 const host=Object.fromEntries(privateHostNames.map(n=>[n,unbound]));Object.assign(host,{historyObserver:history.observer,assertPaired(){},requireCountedBootstrap:newAttempt,recoveryCanWrite:()=>true,
  retainBootstrapRecovery(input){retained=Object.freeze({});escrows.set(retained,input);return retained;},requireBootstrapEscrow(escrow,checkpoint,id){assert.equal(escrows.get(escrow).checkpoint,checkpoint);assert.equal(escrows.get(escrow).requestId,id);},
  beginBootstrapRetry(escrow,checkpoint,id){assert.equal(escrow,retained);assert.equal(checkpoint,escrows.get(escrow).checkpoint);assert.equal(id,operation.id);return newAttempt();},finishBootstrapRetry(escrow,attempt,result){assert.equal(escrow,retained);assert.ok(works.has(attempt.work));events.push(result.state);},
  bindActualManagerCandidate:(attempt,record)=>({record}),requireOwnedRestore(attempt,result){assert.ok(works.has(attempt.work));assert.ok(restores.has(result));},finishRestore(){},refuseRestore:unbound,
  async restorePresentation({attempt,scope,checkpoint}){const candidate=await scope.native.acquireCandidate({bundle:checkpoint.document.tileBundle},attempt.work),result={ok:true,record:candidate.record};restores.add(result);return result;},
  retireSessionResourcesThroughSameManager({views}){views.dispose();}
 });
 const menu={...base.document.finishBinding,entries:[{id:'skin.brick-pavers',version:1,label:'Brick',available:true,reason:null}]},profile=Object.freeze({...createTileAuthoringSessionProfile(base.deps,{binding,finishCatalogue:menu,resourcePorts:base.resourcePorts,inspection:tileAuthoringInspectionPort(base.presentation)}),c2Host:Object.freeze(host),c2PhasePorts:Object.freeze({kind:'nautilus-editor-c2-phase-ports',version:1,prepare:unbound,restore:unbound})});
 const presentation={attach:base.presentation.attach,async acquire(bundle,room){nativeAcquires++;const c=JSON.parse(raw);assert.equal(c.journal.pending,null);assert.equal(c.journal.receipts.at(-1).id,operation.id);return base.presentation.acquire(bundle,room);}};
 let failure;try{await createSmartTileSession(base.deps,{authority,codec:binding.codec,profile,floorController:base.floors,presentation});}catch(error){failure=error;}
 assert.equal(failure?.code,'C2_BOOTSTRAP_RECOVERY_REQUIRED');assert.equal(nativeAcquires,0);assert.equal(failure.bootstrapRecovery.requestId,operation.id);
 // Physical storage now shows the original BEFORE-WRITE prefix. Retry must
 // still reconcile the retained pending/ID, never treat this as a fresh edit.
 raw=binding.codec.serialize(binding.codec.create(base.document));blocked=false;
 const recovered=await failure.bootstrapRecovery.retry();assert.equal(recovered.ok,true);assert.equal(recovered.outcome,'not-committed');assert.equal(nativeAcquires,1);assert.equal((await failure.bootstrapRecovery.retry()).code,'RECOVERY_RETIRED');
 recovered.session.dispose();assert.deepEqual(JSON.parse(raw).document,base.document);return {events,nativeAcquires,requestId:operation.id};
}
