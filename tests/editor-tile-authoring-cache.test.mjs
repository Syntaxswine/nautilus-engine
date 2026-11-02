import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,definitions,applyCommand} from './fixtures/tile-authoring-editor/c1.mjs';
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
