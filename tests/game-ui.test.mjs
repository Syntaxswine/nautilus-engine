import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gameAssetGuides} from '../packages/game-ui/index.js';
import {mountTitleScreen} from '../packages/game-ui/title.js';
import {distribution} from '../tools/distribution.mjs';
test('usage cards carry real installed guide URLs and independent copies',()=>{
  const cards=gameAssetGuides();assert.equal(cards.length,2);
  for(const card of cards){assert.ok(fs.readFileSync(new URL(card.guide),'utf8').startsWith('# '));assert.ok(card.requires.length);assert.ok(card.decisions.length);}
  cards[0].requires.length=0;assert.ok(gameAssetGuides()[0].requires.length);
});
test('optional title import is inert in Node; core omits browser presentation',()=>{
  assert.equal(typeof globalThis.document,'undefined');assert.equal(typeof mountTitleScreen,'function');
  assert.throws(()=>mountTitleScreen(null,{title:'Example',onStart(){}}),/container/);
  const core=distribution('core'),compatibility=distribution('compatibility');
  assert.ok(core.exports['./interactions']);assert.ok(core.exports['./game-ui']);
  assert.equal(core.exports['./game-ui/title'],undefined);assert.equal(core.files.includes('packages/game-ui/title.js'),false);
  for(const file of ['packages/game-ui/title.js','packages/game-ui/style.css','docs/standard-interactions.md','docs/game-title.md','docs/asset-handoffs.md'])assert.ok(compatibility.files.includes(file),file);
});