import test from 'node:test';
import assert from 'node:assert/strict';
import {characterAppearanceChoices} from '../apps/editor/asset-appearance.js';
import {WEAPON_IDS} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';

test('bear metadata covers both native outfits and all thirteen equipment IDs without a renderer or native tool controls',()=>{
  const asset={id:'bear',bindings:{'unit-weapon':'rifle','unit-outfit':'normal'}},before=structuredClone(asset);
  assert.equal(globalThis.document,undefined);assert.equal(globalThis.window,undefined);
  for(const outfit of ['normal','red-hats'])for(const weapon of WEAPON_IDS) {
    const choices=characterAppearanceChoices(asset,{weapon,outfit});assert.equal(choices.weapon,weapon);assert.equal(choices.outfit,outfit);
    assert.deepEqual(choices.weapons.map(option=>option.value),WEAPON_IDS);assert.equal(choices.unarmed,false);
  }
  assert.deepEqual(asset,before);assert.equal(characterAppearanceChoices(asset).weapon,'rifle');
  assert.throws(()=>characterAppearanceChoices(asset,{outfit:'blue-hawaiian'}),/does not support/);
  assert.throws(()=>characterAppearanceChoices(asset,{weapon:'unreviewed-equipment'}),/does not support/);
});

test('metadata retains hen restrictions, donkey outfit support and independent returned choices',()=>{
  const hen=characterAppearanceChoices({id:'hen'});assert.deepEqual(hen.weapons.map(option=>option.value),['hands']);assert.equal(hen.unarmed,true);
  assert.throws(()=>characterAppearanceChoices({id:'hen'},{weapon:'rifle'}),/does not support/);
  assert.equal(characterAppearanceChoices({id:'donkey'},{outfit:'blue-hawaiian'}).outfit,'blue-hawaiian');
  const choices=characterAppearanceChoices({id:'cow'});choices.weapons.length=0;
  assert.equal(characterAppearanceChoices({id:'cow'}).weapons.length,13);
});
