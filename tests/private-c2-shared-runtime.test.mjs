// Actual PRIVATE mirrored algorithms. No adopted Root codec/WAL, browser/GPU,
// paired AA meter, Browser Core or Artist admission claim follows from this file.
import test from 'node:test';import assert from 'node:assert/strict';
import * as original from '../apps/editor/smart-tile/checkpoint.js';
import * as privateCodec from '../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/smart-tile/checkpoint.js';
import {bindPrivateObservation} from '../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/observation.js';
import {createWindowAuthoringJournal as originalJournal} from '../packages/windows-authoring/journal.js';
import {createWindowAuthoringJournal,createWindowAuthoringJournalReadPort} from '../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/packages/windows-authoring/journal.js';
import {readAuthoringJSON as originalRead} from '../apps/editor/tile-authoring/jsonl.js';
import {readAuthoringJSON} from '../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/tile-authoring/jsonl.js';
import {createTileAuthoringCheckpointCodec as originalV3} from '../apps/editor/tile-authoring/checkpoint.js';
import {createTileAuthoringCheckpointCodec} from '../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/tile-authoring/checkpoint.js';
import {createTileAuthoringWorkspace} from '../apps/editor/tile-authoring/seed.js';
import * as mapCore from '../packages/map-core/index.js';import * as tiles from '../packages/tiles-core/index.js';import * as authoring from '../packages/tile-authoring-core/index.js';import * as examples from '../packages/tile-visuals/example.js';import {tileFinishBinding} from '../packages/tile-finishes/catalogue.js';
import {historyProtocol,cancellationHarness,defaultPrivateHarness,componentBinding,coldRecoveryProbe} from './fixtures/private-c2-shared/protocol.mjs';
import {createPrivateC2PreparationCancellationPort} from '../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/smart-tile/session.js';
import {createPrivateAuthorityObservationPort} from '../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/smart-tile/authority.js';
import {createSmartTileAuthority} from '../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/smart-tile/authority.js';
import {definitions,applyCommand} from './fixtures/tile-authoring-editor/c1.mjs';

// A labelled diagnostic backend records REAL source-hook invocations. It does
// not implement AA's work owner or certify normalized/raw-domain admission.
function recorder({stopVisit=Infinity,stopOpaque=null}={}){
 const calls=new WeakSet(),claims=new WeakMap(),stats={visits:0,textUnits:0,keys:0,entries:0,completed:0,failed:0,opaque:0,settledOpaque:0};
 const stop=()=>{const e=new Error('Diagnostic component limit');e.code='COMPONENT_OBSERVER_LIMIT';throw e;};
 const backend={begin(){const c={};calls.add(c);stats.entries++;return c;},visit(c){assert.ok(calls.has(c));if(stats.visits>=stopVisit)stop();stats.visits++;},text(c,value){assert.ok(calls.has(c));stats.textUnits+=value.length;},key(c){assert.ok(calls.has(c));stats.keys++;},beforeOpaque(c,name){assert.ok(calls.has(c));if(name===stopOpaque)stop();const claim={};claims.set(claim,c);stats.opaque++;return claim;},afterOpaque(c,claim){assert.equal(claims.get(claim),c);claims.delete(claim);stats.settledOpaque++;},failOpaque(c,claim){assert.equal(claims.get(claim),c);claims.delete(claim);},complete(c){assert.ok(calls.has(c));stats.completed++;},fail(c){assert.ok(calls.has(c));stats.failed++;}};
 return {config:{version:1,backend},snapshot:()=>Object.freeze({...stats}),scope:'diagnostic source-hook component; AA/normalized admission UNBOUND'};
}
const error=e=>({name:e.name,code:e.code,diagnostics:e.diagnostics,message:e.message});
function compareThrows(fn,actual){let a,b;try{fn();}catch(e){a=error(e);}try{actual();}catch(e){b=error(e);}assert.ok(a);assert.deepEqual(b,a);}
function document(){const source=mapCore.blankMap('PRIVATE candidate default parity'),recipe=examples.surfaceRecipe('private.c2.template',8,4,{segments:16});recipe.interior.skinId='skin.brick-pavers';return createTileAuthoringWorkspace({mapCore,tiles,authoring},{workspaceId:'private.c2.default',sourceJSON:JSON.stringify(source),profileId:'aft-native-fifteen',finishBinding:tileFinishBinding(),templateRecipe:recipe});}

test('actual PRIVATE unopted data/hash/strict-reader preserve accepted Root values and error semantics',()=>{
 for(const value of [{a:[1,null,'snowman ☃','𝒜'],z:{keep:true}},'{"kept":[1,2,3]}']){assert.deepEqual(privateCodec.smartTileData(value),original.smartTileData(value));assert.equal(privateCodec.smartTileDigest(value),original.smartTileDigest(value));assert.deepEqual(readAuthoringJSON(value),originalRead(value));}
 for(const value of ['{"a":1,"a":2}','-0','[1,]'])compareThrows(()=>originalRead(value),()=>readAuthoringJSON(value));
 const accessor={};let calls=0;Object.defineProperty(accessor,'x',{enumerable:true,get(){calls++;return 1;}});compareThrows(()=>original.smartTileData(accessor),()=>privateCodec.smartTileData(accessor));assert.equal(calls,0);
});
test('actual PRIVATE default v3 codec has identical own shape, serialized checkpoint and tokens',()=>{
 const deps={mapCore,tiles,authoring},doc=document(),a=originalV3(deps,doc),b=createTileAuthoringCheckpointCodec(deps,doc),left=a.codec.create(doc),right=b.codec.create(doc);
 assert.deepEqual(Reflect.ownKeys(b.codec),Reflect.ownKeys(a.codec));assert.equal(Object.hasOwn(b.codec,'privateObservation'),false);assert.equal(b.codec.serialize(right),a.codec.serialize(left));assert.equal(b.codec.token(right),a.codec.token(left));assert.deepEqual(b.domain.expected(right.document,b.codec.token(right),'a'.repeat(64)),a.domain.expected(left.document,a.codec.token(left),'a'.repeat(64)));
});
test('actual PRIVATE observer records actual reader visits/keys/UTF8/builtin calls without a normalized-meter claim',()=>{
 const r=recorder(),observer=bindPrivateObservation(r.config),data={word:'𝒜☃',list:[1,true,null]};assert.deepEqual(privateCodec.smartTileData(data,observer),original.smartTileData(data));assert.equal(privateCodec.smartTileDigest(data,observer),original.smartTileDigest(data));assert.deepEqual(readAuthoringJSON('{"word":"𝒜☃","list":[1,true,null]}',{observer}),data);
 const result=r.snapshot();assert.ok(result.visits>0);assert.ok(result.keys>0);assert.ok(result.textUnits>0);assert.ok(result.opaque>0);assert.equal(result.opaque,result.settledOpaque);assert.equal(observer.active,null);assert.equal(observer.depth,0);
});
test('actual PRIVATE observer refuses before payload visits and preserves counter failure instead of invalid-JSON relabelling',()=>{
 const r=recorder({stopVisit:0}),observer=bindPrivateObservation(r.config);let read=0;const input={};Object.defineProperty(input,'x',{get(){read++;return 1;},enumerable:true});assert.throws(()=>privateCodec.smartTileData(input,observer),e=>e.code==='COMPONENT_OBSERVER_LIMIT');assert.equal(read,0);assert.equal(observer.active,null);
 const p=recorder({stopOpaque:'data.parse'}),po=bindPrivateObservation(p.config);assert.throws(()=>privateCodec.smartTileData('{bad',po),e=>e.code==='COMPONENT_OBSERVER_LIMIT');assert.equal(po.active,null);
});
test('actual PRIVATE missing continued-source validator is explicitly UNBOUND before source traversal',()=>{
 const r=recorder();let reads=0;const hostile={};Object.defineProperty(hostile,'kind',{enumerable:true,get(){reads++;return 'x';}});assert.throws(()=>createTileAuthoringCheckpointCodec({mapCore,tiles,authoring},hostile,{version:1,observation:r.config}),e=>e.code==='C2_VALIDATION_COUNTER_UNBOUND');assert.equal(reads,0);
});
test('actual PRIVATE default journal shape/NoChange/redo stays identical; read port cannot borrow a foreign journal',()=>{
 const options={initialText:'{"v":0}',contextKey:'private.component',maxDocumentBytes:16000000},a=originalJournal(options),b=createWindowAuthoringJournal(options);assert.deepEqual(Reflect.ownKeys(b),Reflect.ownKeys(a));
 for(const h of [a,b]){h.accept(h.beginEdit('{"v":1}'),{});h.accept(h.beginUndo(),{});h.accept(h.beginEdit(h.snapshot.text),{});}assert.deepEqual(b.snapshot,a.snapshot);assert.equal(b.snapshot.history.redo,1);assert.throws(()=>createWindowAuthoringJournalReadPort(a,{}),e=>e.code==='C2_HISTORY_COUNTER_UNBOUND');
});

test('actual PRIVATE same-journal read port has one selected copy and intrinsic ticket/ordinal ABA fences',()=>{
 const h=createWindowAuthoringJournal({initialText:'{"v":0}',contextKey:'c2.component'}),work={},p=historyProtocol({owns:w=>w===work});h.accept(h.beginEdit('{"v":1}'),{});h.accept(h.beginEdit('{"v":2}'),{});
 const port=createWindowAuthoringJournalReadPort(h,p.observer),head=port.inspectLive({action:'undo'},work),copy=head.copySelected(work);
 assert.equal(copy.targetDocumentJSON,'{"v":1}');assert.throws(()=>head.copySelected(work),e=>e.code==='C2_HISTORY_COUNTER_UNBOUND');
 const ticket=h.beginUndo();assert.equal(head.isCurrent(work),false);assert.equal(head.matchesOwnedTicket(work,ticket,copy.targetDocumentJSON),true);assert.equal(head.matchesOwnedTicket({},ticket,copy.targetDocumentJSON),false);
 h.cancel();const replacement=h.beginUndo();assert.notEqual(ticket,replacement);assert.equal(head.matchesOwnedTicket(work,replacement,copy.targetDocumentJSON),false);
 assert.equal(h.snapshot.history.undo,2);assert.equal(h.snapshot.history.redo,0);assert.equal(p.counts.selectedCopies,1);
});
test('actual PRIVATE cached facts never choose history and missing facts require a paid scan',()=>{
 const h=createWindowAuthoringJournal({initialText:'{"v":0,"resourceRefs":["original"]}',contextKey:'c2.component'}),work={},p=historyProtocol({owns:w=>w===work});
 for(let i=1;i<4;i++)h.accept(h.beginEdit(JSON.stringify({v:i,resourceRefs:['page.'+i]})),{});
 const port=createWindowAuthoringJournalReadPort(h,p.observer),head=port.inspectLive({action:'undo'},work);head.scanObligations(work);const scans=p.counts.scans;
 const fresh=port.inspectLive({action:'undo'},work),all=fresh.scanObligations(work);assert.equal(p.counts.scans,scans);assert.deepEqual(all,[['page.3'],['original'],['page.1'],['page.2']]);
 h.setContext('changed');assert.equal(fresh.isCurrent(work),false);assert.throws(()=>fresh.scanObligations(work),e=>e.code==='C2_HISTORY_COUNTER_UNBOUND');
 assert.equal(port.inspectLive({action:'undo'},work).data.contextKey,'changed');
 const refused=createWindowAuthoringJournalReadPort(h,{...p.observer,verifyFact:()=>false});assert.throws(()=>refused.inspectLive({action:'edit'},work),e=>e.code==='C2_HISTORY_COUNTER_UNBOUND');
});
test('actual PRIVATE journal source hooks observe real encodes and retain default error/NoChange behavior',()=>{
 const r=recorder(),observer=bindPrivateObservation(r.config),h=createWindowAuthoringJournal({initialText:'{"v":0}',contextKey:'c2.component'}),p=historyProtocol(),port=createWindowAuthoringJournalReadPort(h,p.observer,observer);
 const head=port.inspectLive({action:'edit'},{});h.accept(h.beginEdit('{"v":1}'),{});h.accept(h.beginUndo(),{});h.accept(h.beginEdit(h.snapshot.text),{});
 assert.equal(h.snapshot.history.redo,1);assert.equal(head.isCurrent({}),false);assert.ok(r.snapshot().visits>0);assert.ok(r.snapshot().opaque>0);assert.equal(r.snapshot().opaque,r.snapshot().settledOpaque);
});
test('actual PRIVATE default v3 session uses real public Core/native geometry and same WAL/history without C2 opt-in',async t=>{
 const h=await defaultPrivateHarness();t.after(()=>h.dispose());const source=h.document.sourceJSON,views=h.counts.acquire,{a}=definitions();
 assert.throws(()=>createPrivateC2PreparationCancellationPort(h.session,{}),e=>e.code==='C2_CANCELLATION_UNBOUND');assert.throws(()=>createPrivateAuthorityObservationPort(h.authority),e=>e.code==='C2_AUTHORITY_OBSERVER_UNBOUND');
 await applyCommand(h,h.command('recipe.create',{definition:a}));assert.equal(h.session.getSnapshot().history.undo,1);assert.equal(h.counts.acquire,views);assert.deepEqual(h.writes.map(w=>w.phase),['stage','commit']);
 assert.equal((await h.session.undo()).committed,true);assert.equal((await h.session.redo()).committed,true);assert.equal(h.session.getSnapshot().history.undo,1);const saved=h.session.save().checkpointJSON;assert.equal((await h.session.open(saved)).ok,true);assert.equal(JSON.parse(saved).document.sourceJSON,source);assert.equal(h.session.getSnapshot().history.undo,1);
 // Same actual data/policy, with diagnostic source hooks (not a C2 meter).
 const {binding}=componentBinding(h.deps,h.document),operation=JSON.parse(saved).journal.receipts[0].operation;let raw=binding.codec.serialize(binding.codec.create(h.document));
 const authority=createSmartTileAuthority(h.deps,{read:()=>raw,write(packet){assert.equal(packet.canCommit(),true);raw=packet.nextJSON;return true;}},{codec:binding.codec}),port=createPrivateAuthorityObservationPort(authority),facts=[];
 const guard=()=>{const fact=port.currentInvocation();assert.equal(port.isCurrentInvocation(fact),true);assert.ok(fact.before);assert.ok(fact.next);assert.throws(()=>authority.read(),e=>e.code==='AUTHORITY_REENTRY');assert.equal(port.isCurrentInvocation(fact),true);facts.push(fact);return true;};
 const staged=authority.stage(operation,guard);assert.equal(staged.ack,true);assert.equal(port.resultFact(staged).method,'stage');assert.equal(port.resultFact(staged).arguments[0],operation);assert.equal(port.resultFact({...staged}),null);assert.equal(port.isCurrentInvocation(facts[0]),false);
 assert.equal(authority.commit(staged.checkpoint,guard).ack,true);assert.equal(JSON.parse(raw).journal.receipts.at(-1).id,operation.id);assert.equal(port.currentInvocation(),null);
 const cold=await coldRecoveryProbe(h,binding,operation);assert.equal(cold.nativeAcquires,1);assert.ok(cold.events.includes('recover'));
});
test('PRIVATE protocol-only phase: actual seven-method service cancel cannot cancel busy prepare; same-session connection port aborts original request',async t=>{
 const h=await cancellationHarness();t.after(()=>h.dispose());const command=h.command(),raw=h.raw,pending=h.service.prepare(command);await h.phaseStarted;
 assert.deepEqual(h.service.cancel('no-review-token'),{cancelled:false});assert.equal(h.workbench.discardDraft().code,'EDITOR_REENTRY');assert.equal(h.active.signal.aborted,false);
 const port=createPrivateC2PreparationCancellationPort(h.session,h.connection);assert.equal(port.capture('wrong-request'),null);assert.throws(()=>createPrivateC2PreparationCancellationPort(h.session,{}),e=>e.code==='C2_CANCELLATION_UNBOUND');
 const cancellation=port.capture(command.requestId);assert.ok(cancellation);assert.equal(cancellation.cancel().ok,true);assert.equal(h.active.signal.aborted,true);assert.equal(h.stats.cancel,1);assert.equal(cancellation.cancel().code,'STALE_C2_PREPARATION');assert.equal(port.capture(command.requestId),null);h.release();const result=await pending;assert.notEqual(result.status,'reviewable');assert.equal(h.raw,raw);assert.equal(h.stats.retained,1);assert.equal(cancellation.cancel().code,'STALE_C2_PREPARATION');assert.equal(h.session.getSnapshot().history.undo,0);assert.equal(h.session.getSnapshot().readiness.visual.state,'accepted');
});
test('PRIVATE protocol-only cancellation capture expires on connection loss without cancelling another owner',async t=>{
 const h=await cancellationHarness();t.after(()=>h.dispose());const command=h.command(),pending=h.service.prepare(command);await h.phaseStarted;const port=createPrivateC2PreparationCancellationPort(h.session,h.connection),capture=port.capture(command.requestId);h.disconnect();assert.equal(capture.cancel().code,'STALE_C2_PREPARATION');assert.equal(h.active.signal.aborted,false);h.session.cancel('actual-input-owner');h.release();await pending;assert.equal(h.stats.cancel,1);
});
