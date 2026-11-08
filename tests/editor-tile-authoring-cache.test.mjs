import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,definitions,applyCommand} from './fixtures/tile-authoring-editor/c1.mjs';
import {tileAuthoringExpected,tileAuthoringOperationBinding} from '../apps/editor/tile-authoring/checkpoint.js';
import {smartTileDigest} from '../apps/editor/smart-tile/checkpoint.js';
const copy=structuredClone;

test('C1 cached document/token validation never trusts mutable or shallow-frozen caller objects',async t=>{
  const h=await harness();t.after(()=>h.dispose());const initial=JSON.parse(h.raw),caller=copy(initial),token=h.binding.codec.token(caller);
  assert.equal(token,h.binding.codec.token(initial));caller.document.floorBinding.floors[4].elevationM+=.01;assert.throws(()=>h.binding.codec.token(caller));
  const shallow=Object.freeze(copy(initial));h.binding.codec.open(shallow);shallow.document.sourceJSON+='\n';assert.throws(()=>h.binding.codec.open(shallow));
  const claimed=copy(initial);claimed.validated=true;assert.throws(()=>h.binding.codec.open(claimed));
  assert.throws(()=>h.binding.codec.open(h.raw.replace('"version":3','"version":3,"version":3')),error=>error.code==='DUPLICATE_JSON_KEY');
  const negativeZero=copy(initial);negativeZero.journal.serial=-0;assert.throws(()=>h.binding.codec.token(negativeZero),error=>error.code==='INVALID_NUMBER');
  const accessor=copy(initial);let getters=0;Object.defineProperty(accessor.document.authoring.library,'definitions',{enumerable:true,get(){getters++;return [];}});assert.throws(()=>h.binding.codec.open(accessor));assert.equal(getters,0);assert.deepEqual(JSON.parse(h.raw),initial);
});

test('C1 cache verifies changed immutable record content and reconstructs only a correctly bound typed target',async t=>{
  const h=await harness();t.after(()=>h.dispose());const {a}=definitions();await applyCommand(h,h.command('recipe.create',{definition:a}));const actual=JSON.parse(h.raw);h.binding.codec.open(copy(actual));
  const tampered=copy(actual);tampered.document.authoring.library.definitions[0].body.label='Changed behind its immutable digest';assert.throws(()=>h.binding.codec.open(tampered));
  const foreign=copy(actual);foreign.journal.receipts[0].operation.target.sourceBindingToken='0'.repeat(64);assert.throws(()=>h.binding.codec.open(foreign));
  assert.equal(Object.hasOwn(actual.journal.receipts[0].operation.target,'sourceJSON'),false);assert.equal(actual.document.sourceJSON,h.document.sourceJSON);assert.deepEqual(JSON.parse(h.raw),actual);
});

test('C1 derived bindings keep the original complete canonical tokens, fixed-source bytes and fresh authority/context fields',async t=>{
  const h=await harness();t.after(()=>h.dispose());const before=h.authority.read(),{a}=definitions();await applyCommand(h,h.command('recipe.create',{definition:a}));const after=h.authority.read(),op=after.journal.receipts[0].operation,{domain}=h.binding;
  for(const document of [before.document,after.document]){
    for(const [authority,context]of [['1'.repeat(64),'2'.repeat(64)],['3'.repeat(64),'4'.repeat(64)]])assert.deepEqual(domain.expected(document,authority,context),tileAuthoringExpected(h.deps.tiles,document,authority,context));
    assert.equal(domain.documentDigest(document),smartTileDigest(document));
  }
  assert.deepEqual(domain.operationBinding(before.document,after.document,op.request,op.command,op.expected.contextToken),tileAuthoringOperationBinding(h.deps.tiles,before.document,after.document,op.request,op.command,op.expected.contextToken));
  const reordered=copy(after);reordered.document.floorBinding=Object.fromEntries(Object.entries(reordered.document.floorBinding).reverse());const retained=h.binding.codec.open(reordered);
  assert.deepEqual(Object.keys(retained.document.floorBinding),Object.keys(reordered.document.floorBinding));assert.equal(retained.document.sourceJSON,before.document.sourceJSON);assert.equal(domain.documentDigest(retained.document),smartTileDigest(reordered.document));
  for(const alter of [d=>{d.sourceJSON+='\n';},d=>{d.finishBinding.digest='0'.repeat(64);},d=>{d.tileBundle.layout.id+='other';},d=>{d.constraints.minimumClearanceM+=.01;}]){const changed=copy(after.document);alter(changed);assert.throws(()=>domain.documentBindings(changed));}
});

test('C1 repeated prospective journals inspect every operation and cannot bypass changed input or a settled request',async t=>{
  const h=await harness();t.after(()=>h.dispose());const before=h.authority.read(),{a}=definitions();await applyCommand(h,h.command('recipe.create',{definition:a}));const after=h.authority.read(),operation=copy(after.journal.receipts[0].operation),{codec}=h.binding,first=codec.stage(before,operation);
  assert.deepEqual(codec.stage(before,copy(operation)),first);assert.deepEqual(codec.stage(before,JSON.stringify(operation)),first);
  operation.target.authoring.library.definitions[0].body.label='Changed under the original digest';assert.throws(()=>codec.stage(before,operation));
  const shallow=Object.freeze(copy(after.journal.receipts[0].operation));codec.stage(before,shallow);shallow.expected.token='0'.repeat(64);assert.throws(()=>codec.stage(before,shallow));
  const hostile=copy(after.journal.receipts[0].operation);let reads=0;Object.defineProperty(hostile,'target',{enumerable:true,get(){reads++;return first.journal.pending.target;}});assert.throws(()=>codec.stage(before,hostile));assert.equal(reads,0);
  const text=JSON.stringify(after.journal.receipts[0].operation);assert.throws(()=>codec.stage(before,text.replace('"version":3','"version":3,"version":3')),error=>error.code==='DUPLICATE_JSON_KEY');
  assert.throws(()=>codec.stage(after,after.journal.receipts[0].operation),error=>error.code==='REQUEST_ID_REUSED');assert.equal(h.raw,JSON.stringify(after));
});

test('C1 prospective-journal reuse still runs the final live floor guard before the storage write',async t=>{
  const h=await harness();t.after(()=>h.dispose());const original=h.raw,{a}=definitions();assert.equal((await h.service.prepare(h.command('recipe.create',{definition:a}))).status,'reviewable');const request=h.workbench.getSnapshot().presentation.retainedApplyRequest;
  h.hook=(packet,when)=>{if(packet.phase==='stage'&&when==='before')h.floors.select('F01');};const outcome=await h.service.apply(request);assert.equal(outcome.committed,false);assert.equal(h.raw,original);assert.equal(h.authority.read().journal.serial,0);
});
