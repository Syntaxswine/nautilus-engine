import test from 'node:test';
import assert from 'node:assert/strict';
import {cores,smartTileFixture,finishOperation} from './fixtures/smart-tile-editor/source.mjs';
import {SMART_TILE_INTERFACE,smartTileActions,assertSmartTileAdapter} from '../apps/editor/smart-tile/contract.js';
import {openSmartTileCheckpoint,serializeSmartTileCheckpoint,smartTileCheckpointToken,smartTileDigest,stageSmartTileOperation,settleSmartTileOperation,inspectSmartTileRecovery} from '../apps/editor/smart-tile/checkpoint.js';
const clone=structuredClone,code=(run,expected)=>assert.throws(run,e=>e.code===expected);

test('editor checkpoint retains raw complete source and sibling canonical bundle/floor table',()=>{
  const f=smartTileFixture(),text=serializeSmartTileCheckpoint(cores,f.checkpoint),opened=openSmartTileCheckpoint(cores,text);
  assert.equal(opened.document.sourceJSON,f.sourceJSON);assert.deepEqual(opened,f.checkpoint);assert.deepEqual(opened.document.floorBinding.floors,f.floors);assert.equal(cores.tiles.openTileBundle(opened.document.tileBundle,{requireResolved:true}).ok,true);assert.equal(globalThis.document,undefined);
});

test('actual public repair isolates selected shared recipe while the locked neighbour survives',()=>{
  const {checkpoint}=smartTileFixture(),op=finishOperation(checkpoint),before=checkpoint.document.tileBundle,after=op.targetBundle;
  assert.equal(before.layout.instances[0].recipeId,before.layout.instances[1].recipeId);assert.equal(after.layout.instances.find(v=>v.id==='surface-a').recipeId,'selected-owner-finish');assert.deepEqual(after.layout.instances.find(v=>v.id==='surface-b'),before.layout.instances[1]);assert.deepEqual(after.recipes.find(r=>r.id==='paving-shared'),before.recipes[0]);assert.equal(after.layout.instances.find(v=>v.id==='surface-b').locked,true);assert.deepEqual(after.layout.joins,before.layout.joins);
});

test('write-ahead recovery stores the exact original request without accepting its target',()=>{
  const {checkpoint}=smartTileFixture(),op=finishOperation(checkpoint),pending=stageSmartTileOperation(cores,checkpoint,op),restored=openSmartTileCheckpoint(cores,serializeSmartTileCheckpoint(cores,pending));
  assert.deepEqual(restored.journal.pending,op);assert.deepEqual(restored.document,checkpoint.document);assert.equal(smartTileCheckpointToken(restored),op.expected.token);assert.equal(checkpoint.journal.pending,null);
});

test('unknown after-write acknowledgement recovers the same accepted operation quietly',()=>{
  const {checkpoint}=smartTileFixture(),op=finishOperation(checkpoint),pending=stageSmartTileOperation(cores,checkpoint,op),written=settleSmartTileOperation(cores,pending,op.id,'committed');
  const result=inspectSmartTileRecovery(cores,pending,written,op.id);assert.equal(result.state,'settled');assert.equal(result.outcome,'committed');assert.deepEqual(result.checkpoint.document.tileBundle,op.targetBundle);assert.equal(result.checkpoint.document.sourceJSON,checkpoint.document.sourceJSON);assert.equal(result.checkpoint.journal.receipts.length,1);assert.deepEqual(result.checkpoint.journal.receipts[0].operation,op);
});

test('before-write refusal recovers same-ID without target adoption or lost source',()=>{
  const {checkpoint}=smartTileFixture(),op=finishOperation(checkpoint),pending=stageSmartTileOperation(cores,checkpoint,op);
  for(const authority of [checkpoint,pending])assert.equal(inspectSmartTileRecovery(cores,pending,authority,op.id).state,'not-written');
  const refused=settleSmartTileOperation(cores,pending,op.id,'not-committed');assert.deepEqual(refused.document,checkpoint.document);assert.equal(inspectSmartTileRecovery(cores,pending,refused,op.id).outcome,'not-committed');code(()=>stageSmartTileOperation(cores,refused,op),'REQUEST_ID_REUSED');
});

test('foreign recovery ID, source divergence and changed receipt identity never authorize adoption',()=>{
  const {checkpoint}=smartTileFixture(),op=finishOperation(checkpoint),pending=stageSmartTileOperation(cores,checkpoint,op);
  code(()=>inspectSmartTileRecovery(cores,pending,pending,'new-id'),'RECOVERY_ID_MISMATCH');
  const foreign=clone(checkpoint);foreign.document.sourceJSON=foreign.document.sourceJSON.replace('Complete retained','Changed retained');assert.equal(inspectSmartTileRecovery(cores,pending,foreign,op.id).state,'unresolved');
  const tampered=clone(settleSmartTileOperation(cores,pending,op.id,'committed'));tampered.journal.receipts[0].operation.request.id='new-id';code(()=>openSmartTileCheckpoint(cores,tampered),'RECOVERY_ID_MISMATCH');
});

test('stale operations and a second pending request preserve accepted checkpoint',()=>{
  const {checkpoint}=smartTileFixture(),op=finishOperation(checkpoint),before=serializeSmartTileCheckpoint(cores,checkpoint),stale=clone(op);stale.expected.token='0'.repeat(64);
  code(()=>stageSmartTileOperation(cores,checkpoint,stale),'STALE_CHECKPOINT');const pending=stageSmartTileOperation(cores,checkpoint,op);code(()=>stageSmartTileOperation(cores,pending,op),'RECOVERY_REQUIRED');assert.equal(serializeSmartTileCheckpoint(cores,checkpoint),before);
});

test('floor bindings are supplied native identities/elevations rather than layer multiplication',()=>{
  const {checkpoint}=smartTileFixture(),bad=clone(checkpoint);bad.document.floorBinding.floors[1].elevationM=3;
  code(()=>openSmartTileCheckpoint(cores,bad),'FLOOR_BINDING_MISMATCH');const typed=clone(checkpoint);typed.document.floorBinding.floors[1].id=1;code(()=>openSmartTileCheckpoint(cores,typed),'INVALID_ID');
});

test('checkpoint guards refuse future/unknown authorities and fields without normalizing source',()=>{
  const {checkpoint}=smartTileFixture();for(const change of [v=>{v.version=2;},v=>{v.document.ready=true;},v=>{const raw=JSON.parse(v.document.sourceJSON);raw.metadata.authority={kind:'nautilus-tile-bundle'};v.document.sourceJSON=JSON.stringify(raw);},v=>{const raw=JSON.parse(v.document.sourceJSON);raw.kind='red-shift-block';v.document.sourceJSON=JSON.stringify(raw);},v=>{v.journal.serial=1;}]){const bad=clone(checkpoint);change(bad);assert.throws(()=>openSmartTileCheckpoint(cores,bad));}
});

test('descriptor-first checkpoint/token guards reject accessors and invalid bounded input',()=>{
  const {checkpoint}=smartTileFixture(),bad=clone(checkpoint);let calls=0;Object.defineProperty(bad.document,'trap',{get(){calls++;throw Error('executed');},enumerable:true});code(()=>openSmartTileCheckpoint(cores,bad),'INVALID_CHECKPOINT_DATA');code(()=>smartTileDigest(bad),'INVALID_CHECKPOINT_DATA');assert.equal(calls,0);
  code(()=>openSmartTileCheckpoint(cores,' '.repeat(16000001)),'CHECKPOINT_LIMIT');const large=clone(checkpoint);large.document.sourceJSON=' '.repeat(4000001);code(()=>openSmartTileCheckpoint(cores,large),'SOURCE_LIMIT');
});

test('unknown acceptance freezes editing, undo/redo, saving/opening and preserves same-ID recovery route',()=>{
  const actions=smartTileActions({phase:'recovery-required',manual:true,selected:true,hasDraft:true,undo:3,redo:2});for(const action of ['setTool','setDraft','apply','review','undo','redo','save','open','finish'])assert.equal(actions[action],false,action);assert.equal(actions.recover,true);assert.equal(actions.exportLegacy,false);assert.equal(actions.sendToGame,false);
  const review=smartTileActions({phase:'review',hasDraft:true});assert.equal(review.apply,true);assert.equal(smartTileActions({phase:'draft',hasDraft:true}).apply,false);assert.equal(smartTileActions({phase:'review',manual:false}).apply,false);assert.equal(smartTileActions({phase:'presentation-error'}).retryPresentation,true);assert.equal(smartTileActions({phase:'presentation-error'}).save,true);
});

test('the UI seam is one own-method adapter and installs no input/floor authority',()=>{
  const adapter=Object.fromEntries(SMART_TILE_INTERFACE.methods.map(name=>[name,()=>{}]));assert.equal(assertSmartTileAdapter(adapter),adapter);let calls=0;Object.defineProperty(adapter,'apply',{get(){calls++;},enumerable:true});assert.throws(()=>assertSmartTileAdapter(adapter));assert.equal(calls,0);assert.deepEqual(SMART_TILE_INTERFACE.tools,['rectangle','path','finish']);
});
