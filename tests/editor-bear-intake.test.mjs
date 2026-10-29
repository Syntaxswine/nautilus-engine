import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlockDocument,openDocument} from '../packages/map-core/index.js';
import {SPECIES,WEAPON_IDS} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {validateBlock as validateLegacyBlock} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';
import {bearEditorCases,bearEditorBaselineFixtures} from '../tools/fixtures/editor-bear.mjs';

const state=document=>({json:document.export(),revision:document.revision,changed:document.changed,
  undo:document.editor.undo.length,redo:document.editor.redo.length});

test('bear intake fixtures are deterministic, headless, and preserve authored Guard/NPC identities',()=>{
  const first=bearEditorBaselineFixtures(),second=bearEditorBaselineFixtures(),cases=bearEditorCases();
  assert.deepEqual(first,second);assert.equal(globalThis.document,undefined);assert.equal(globalThis.window,undefined);
  for(const [file,value]of [['comparison-cow.block.json',first.baselineBlock],['unsupported-v0.8-bear.block.json',first.unsupportedBearBlock],['acceptance-intent.json',cases]]) {
    assert.equal(fs.readFileSync(new URL('./fixtures/editor-bear/'+file,import.meta.url),'utf8'),JSON.stringify(value,null,2)+'\n');
  }
  assert.equal(cases.variants.length,26);assert.deepEqual([...new Set(cases.variants.map(item=>item.weapon))],WEAPON_IDS);
  assert.deepEqual([...new Set(cases.variants.map(item=>item.outfit))],['normal','red-hats']);
  assert.equal(first.baselineBlock.guards.length,2);assert.doesNotThrow(()=>validateLegacyBlock(first.baselineBlock));
  for(const [index,actor]of first.unsupportedBearBlock.guards.entries()) {
    assert.equal(actor.species,'bear');assert.equal(actor.outfit,cases.placements[index].options.outfit);
    assert.equal(actor.weapon,cases.placements[index].options.weapon);assert.equal(actor.heading,cases.placements[index].options.heading);
    assert.deepEqual(actor.character,first.baselineBlock.guards[index].character);
  }
  assert.deepEqual(first.baselineBlock.guards.map(actor=>actor.character.category),['combat','npc']);
  assert.equal(first.baselineBlock.guards[1].character.references[0].targetId,first.baselineBlock.guards[0].character.id);
  first.unsupportedBearBlock.guards[0].species='horse';assert.equal(second.unsupportedBearBlock.guards[0].species,'bear');
});

test('the immutable nine-species legacy validator rejects the unextended bear block instead of substituting a cow',()=>{
  const {baselineBlock,unsupportedBearBlock}=bearEditorBaselineFixtures();
  assert.equal(SPECIES.includes('bear'),false);assert.equal(SPECIES.length,9);
  const before=JSON.stringify(unsupportedBearBlock);
  assert.throws(()=>validateLegacyBlock(unsupportedBearBlock),/guard|species|appearance/i);
  assert.equal(JSON.stringify(unsupportedBearBlock),before);
  assert.equal(baselineBlock.guards[0].species,'cow');assert.equal(unsupportedBearBlock.guards[0].species,'bear');
});

// Baseline reproducer: replace with acceptance of Coder's reviewed appearance
// representation after its immutable checkpoint, retaining legacy refusal above.
test('v0.8 bear placement/import rejection preserves the live block and its redo history',()=>{
  const fixtures=bearEditorBaselineFixtures(),document=openDocument(fixtures.baselineBlock);
  const prop={tool:'prop',start:{x:15,y:7,z:0},options:{propKind:'chair-desk-teal'}};
  assert.equal(document.apply(prop).ok,true);const placed=document.export();assert.equal(document.undo(),true);
  const before=state(document);assert.equal(before.redo,1);
  for(const command of bearEditorCases().placements) {
    assert.equal(document.preview(command).ok,false);assert.deepEqual(state(document),before);
    assert.equal(document.apply(command).ok,false);assert.deepEqual(state(document),before);
  }
  assert.throws(()=>document.open(JSON.stringify(fixtures.unsupportedBearBlock)));assert.deepEqual(state(document),before);
  assert.equal(document.redo(),true);assert.equal(document.export(),placed);
  const empty=createBlockDocument();assert.equal(empty.map.guards.length,0);
});
