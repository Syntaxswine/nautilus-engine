import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartAuthoringJournal} from '../apps/editor/part-authoring-journal.js';
import {functionalPartsAuthoringIntent} from '../tools/fixtures/functional-parts-authoring.mjs';

const text=value=>JSON.stringify(value),compiled=key=>Object.freeze({testCompiler:true,key});
const create=(initial=text({assemblies:[]}),options={})=>createPartAuthoringJournal({initialText:initial,contextKey:'test-abi-1:kit-1:profile-1',...options});
const accepted=journal=>({text:journal.snapshot.text,revision:journal.snapshot.revision,compilation:journal.snapshot.compilation,history:journal.snapshot.history});
const apply=(journal,next,key)=>journal.accept(journal.beginEdit(next),compiled(key));
const checkBudget=journal=>{const h=journal.snapshot.history;assert.ok(h.bytes<=h.maxBytes);assert.ok(h.undo+h.redo<=h.maxEntries);};

test('one accepted assembly snapshot is one history transaction and duplicate acceptance is stale',()=>{
  const journal=create(),initial=accepted(journal);
  // Private test data, not the future parts ABI or a substitute compiler.
  const candidate=text({assemblies:[{id:'assembly-a',children:['floor-a','door-a','stairs-a'],internal:['floor-a:stairs-a'],external:[],initial:{locked:false}}]});
  const ticket=journal.beginEdit(candidate);assert.deepEqual(accepted(journal),initial);
  assert.equal(journal.accept(ticket,compiled('scene-a')).ok,true);assert.equal(journal.snapshot.history.undo,1);assert.equal(journal.snapshot.revision,1);
  const committed=accepted(journal);assert.equal(journal.accept(ticket,compiled('duplicate')).code,'EDITOR_STALE_PREPARATION');assert.deepEqual(accepted(journal),committed);
  assert.equal(journal.accept(journal.beginUndo(),compiled('empty')).ok,true);assert.equal(journal.snapshot.text,initial.text);
  assert.equal(journal.accept(journal.beginRedo(),compiled('scene-a-again')).ok,true);assert.equal(journal.snapshot.text,candidate);
  assert.equal(globalThis.document,undefined);assert.equal(globalThis.window,undefined);
});

test('late compilation cannot replace a newer accepted document or scene snapshot',async()=>{
  const journal=create();let resolve;
  const slow=new Promise(done=>{resolve=done;}),old=journal.beginEdit(text({assemblies:['old']}));
  const late=slow.then(artifact=>journal.accept(old,artifact));
  const current=journal.beginEdit(text({assemblies:['current']}));assert.equal(journal.accept(current,compiled('current')).ok,true);
  const before=accepted(journal);resolve(compiled('obsolete'));
  assert.equal((await late).code,'EDITOR_STALE_PREPARATION');assert.deepEqual(accepted(journal),before);
});

test('failed edits/imports/undo compilation preserve live state, compiled identity and redo',()=>{
  const journal=create();apply(journal,text({assemblies:['a']}),'a');apply(journal,text({assemblies:['a','b']}),'b');
  journal.accept(journal.beginUndo(),compiled('a-restored'));const before=accepted(journal);assert.equal(before.history.redo,1);
  for(const begin of [()=>journal.beginEdit(text({invalidConnection:'pending compiler refusal'})),()=>journal.beginOpen('invalid serialized input'),()=>journal.beginUndo()]) {
    const ticket=begin();assert.ok(ticket);assert.equal(journal.reject(ticket),true);assert.deepEqual(accepted(journal),before);
  }
  assert.equal(journal.accept(journal.beginRedo(),compiled('b-restored')).ok,true);assert.equal(journal.snapshot.compilation.value.key,'b-restored');
});

test('definition/profile context invalidates pending work even without an authored revision change',()=>{
  const journal=create();journal.accept(journal.beginRebuild(),compiled('kit-v1'));
  const revision=journal.snapshot.revision,ticket=journal.beginEdit(text({assemblies:['a']}));
  assert.equal(journal.setContext('test-abi-1:kit-2:profile-1'),true);assert.equal(journal.snapshot.revision,revision);
  assert.equal(journal.snapshot.compilationCurrent,false);assert.equal(journal.accept(ticket,compiled('old-kit')).code,'EDITOR_STALE_PREPARATION');
  assert.equal(journal.accept(journal.beginRebuild(),compiled('kit-v2')).ok,true);
  assert.equal(journal.snapshot.compilationCurrent,true);assert.equal(journal.snapshot.compilation.value.key,'kit-v2');assert.equal(journal.snapshot.revision,revision);assert.equal(journal.snapshot.history.undo,0);
});

test('cancelled previews, rejected oversized text and unavailable history cannot commit late',()=>{
  const journal=create(undefined,{maxDocumentBytes:128}),before=accepted(journal),ticket=journal.beginEdit(text({assemblies:['a']}));
  assert.throws(()=>journal.beginOpen('x'.repeat(129)),/bounded/);assert.deepEqual(accepted(journal),before);
  assert.equal(journal.accept(ticket,compiled('late')).ok,false);assert.equal(journal.beginUndo(),null);assert.equal(journal.snapshot.revision,0);
  let invoked=false;assert.throws(()=>journal.beginEdit({get toString(){invoked=true;return()=>'';}}),/bounded/);assert.equal(invoked,false);
  assert.throws(()=>journal.beginEdit(null),/bounded/);assert.throws(()=>journal.beginOpen(null),/bounded/);
  assert.throws(()=>journal.beginEdit('🙂'.repeat(33)),/bounded/);assert.deepEqual(accepted(journal),before);
});

test('combined history budgets hold through differently sized undo/redo snapshots',()=>{
  const initial=text({assemblies:[]}),journal=create(initial,{maxEntries:2,maxBytes:200});
  apply(journal,text({assemblies:['a']}),'a');apply(journal,text({assemblies:['b']}),'b');apply(journal,text({assemblies:['large'.repeat(80)]}),'large');
  checkBudget(journal);assert.equal(journal.snapshot.history.undo,2);
  journal.accept(journal.beginUndo(),compiled('b'));checkBudget(journal);
  assert.equal(journal.snapshot.text,text({assemblies:['b']}));assert.equal(journal.snapshot.history.undo,0);assert.equal(journal.snapshot.history.redo,0);
  assert.equal(journal.beginRedo(),null);assert.equal(journal.snapshot.revision,4);
});

test('no-op acceptance preserves redo and valid open clears history only on acceptance',()=>{
  const journal=create();apply(journal,text({assemblies:['a']}),'a');journal.accept(journal.beginUndo(),compiled('empty'));
  const before=journal.snapshot;assert.equal(journal.accept(journal.beginEdit(before.text),compiled('same')).changed,false);
  assert.equal(journal.snapshot.revision,before.revision);assert.equal(journal.snapshot.history.redo,1);
  const open=journal.beginOpen(before.text);assert.equal(journal.snapshot.history.redo,1);
  journal.accept(open,compiled('opened'));assert.equal(journal.snapshot.history.redo,0);assert.equal(journal.snapshot.revision,before.revision+1);
});

test('the first-proof fixture names authoring intentions without hand-entered runtime records',()=>{
  const intent=functionalPartsAuthoringIntent();assert.equal(intent.native.occupiedFloorHeightsM[1],2.12);assert.equal(intent.native.slabBottomM,-.12);
  assert.equal(intent.actorBinding.oversizedControlHeightM,1.7);assert.ok(intent.actorBinding.oversizedControlHeightM>intent.native.doorHeightM);
  assert.equal(intent.placements[1].quarterTurns,1);assert.ok(intent.transactions.every(command=>command.expectedHistoryDelta===1));
  for(const key of ['world','surfaces','doors','stairs','definitions'])assert.equal(Object.hasOwn(intent,key),false);
  intent.native.occupiedFloorHeightsM[1]=999;assert.equal(functionalPartsAuthoringIntent().native.occupiedFloorHeightsM[1],2.12);
});
