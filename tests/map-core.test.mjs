import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapDocument, createBlockDocument, openDocument, describeBlueprint, generateConnectedMap, emptyFeaturePlan, MAP_CONTRACT} from '../packages/map-core/index.js';
import {exampleYard} from '../packages/map-core/example.js';

test('map-core creates independent documents without browser or renderer globals', () => {
  assert.equal(typeof globalThis.document, 'undefined');
  const first = createMapDocument('First'), second = createMapDocument('Second');
  const result = first.apply({tool:'floor', start:{x:20,y:20,z:0}, end:{x:22,y:22,z:0}});
  assert.equal(result.ok, true); assert.equal(first.map.terrain[21][21], 'floor');
  assert.notEqual(second.map.terrain[21][21], 'floor'); assert.equal(second.map.name, 'Second');
});
test('an editing command can be undone and redone without changing the portable format', () => {
  const document = createMapDocument(), before = document.export();
  assert.equal(document.apply({tool:'floor', start:{x:20,y:20,z:0}, end:{x:22,y:22,z:0}}).ok, true);
  const after = document.export(); assert.notEqual(after, before);
  assert.equal(document.undo(), true); assert.equal(document.export(), before);
  assert.equal(document.redo(), true); assert.equal(document.export(), after);
  assert.equal(JSON.parse(after).version, 2);
});
test('a rejected edit leaves map and undo history intact', () => {
  const document = createMapDocument(), before = document.export(), history = document.editor.undo.length;
  const result = document.apply({tool:'prop', start:{x:10,y:10,z:0}, options:{propKind:'unknown-nautilus-object'}});
  assert.equal(result.ok, false); assert.equal(document.export(), before); assert.equal(document.editor.undo.length, history);
});
test('map and block JSON remain interchangeable with the pinned editor', () => {
  const map = exampleYard(), document = openDocument(map), reloaded = openDocument(document.export());
  assert.deepEqual(JSON.parse(reloaded.export()), JSON.parse(document.export()));
  assert.deepEqual(document.validate(), []);
  const block = createBlockDocument('A shared block'), blockText = block.export();
  assert.equal(block.size, 24); assert.equal(JSON.parse(blockText).version, 1);
  assert.equal(openDocument(blockText).block, true); assert.equal(describeBlueprint(blockText).kind, 'block');
  assert.equal(MAP_CONTRACT.width, 240); assert.equal(MAP_CONTRACT.blockSize, 24);
});
test('malformed or oversized imports cannot replace a document', () => {
  const current = openDocument(exampleYard()), before = current.export();
  assert.throws(() => openDocument('{broken')); assert.throws(() => openDocument(' '.repeat(4000001)));
  assert.equal(current.export(), before);
});
test('connected generation is repeatable and does not mutate the block library', () => {
  const block = JSON.parse(createBlockDocument('Open ground').export());
  block.connections = {north:'none', east:'none', south:'none', west:'none'};
  const designs = [block], before = JSON.stringify(designs), plan = emptyFeaturePlan();
  const first = generateConnectedMap(designs, 42, plan), second = generateConnectedMap(designs, 42, plan);
  assert.deepEqual(first, second); assert.equal(JSON.stringify(designs), before);
  assert.equal(first.terrain.length, 240); assert.equal(Object.keys(first.blockConnections).length, 100);
  assert.deepEqual(openDocument(first).validate(), []);
});
test('unsatisfied generation reports missing blocks and preserves the input', () => {
  const block = JSON.parse(createBlockDocument().export());
  block.connections = {north:'none', east:'none', south:'none', west:'none'};
  const plan = emptyFeaturePlan(); plan.rows[0] = 'road'; const before = JSON.stringify(block);
  assert.throws(() => generateConnectedMap([block], 7, plan), /Missing blocks/);
  assert.equal(JSON.stringify(block), before);
});
