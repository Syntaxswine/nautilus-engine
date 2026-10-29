import test from 'node:test';
import assert from 'node:assert/strict';
import {editorAssets, findAssets} from '../apps/editor/asset-catalog.js';
import {assetPreview} from '../apps/editor/asset-preview.js';
import {createBlockDocument, openDocument} from '../packages/map-core/index.js';
import {PROPS, GROUNDS, EDGES} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';
import {SPECIES} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {buildWorld} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-world.js';

test('asset library covers every current placement registry without duplicate identities', () => {
  const assets = editorAssets(), keys = assets.map(a => `${a.category}:${a.id}`);
  assert.equal(new Set(keys).size,assets.length);
  for (const id of [...Object.keys(PROPS),...GROUNDS,...Object.keys(EDGES),...SPECIES]) assert.ok(assets.some(asset => asset.id === id),id);
  for (const asset of assets) {
    assert.ok(asset.w > 0 && asset.h > 0);
    if (asset.id.startsWith('ramp-')) {assert.equal(asset.tool,'ramp'); assert.ok(asset.bindings['ramp-direction']);}
    if (asset.id.startsWith('rampbank-')) {assert.equal(asset.tool,'ramp-bank'); assert.ok(asset.bindings['bank-step']);}
    if (asset.id.startsWith('cliff-')) assert.equal(asset.tool,'cliff');
    if (asset.id.startsWith('roof-')) assert.equal(asset.tool,'roof-tile');
  }
  assert.equal(globalThis.document,undefined);
  assert.equal(globalThis.window,undefined);
  assert.deepEqual(assets.filter(a => a.category === 'People' && a.disabled).map(a => a.id).sort(),['bull','dog','rabbit']);
});

test('search combines words, names and categories and returns an explicit empty result', () => {
  const assets = editorAssets();
  assert.deepEqual(findAssets(assets,'  CHAIR teal  ','Objects').map(a => a.id).sort(),['chair-desk-teal','chair-wingback-teal']);
  assert.equal(findAssets(assets,'ground-biome','Terrain').length,5);
  assert.equal(findAssets(assets,'chair','People').length,0);
  assert.equal(findAssets(assets,'absent asset').length,0);
});

test('every catalog entry builds an independent preview using supported renderer geometry', () => {
  const live = createBlockDocument('Live blueprint'), before = live.export();
  for (const asset of editorAssets()) {
    const first = assetPreview(asset), second = assetPreview(asset);
    if(asset.preview==='furniture'){
      assert.equal(first.document.furniture.id,asset.id);assert.notEqual(first.document.furniture,second.document.furniture);
      assert.equal(first.document.map,undefined);assert.equal(first.document.units,undefined);continue;
    }
    assert.deepEqual(buildWorld(first.document.map).diagnostics,[],asset.id);
    assert.notEqual(first.document.map,second.document.map);
    assert.ok(Number.isFinite(first.view.span) && first.view.span > 0);
    if (asset.category === 'People') assert.equal(first.document.units[0].species,asset.id);
  }
  assert.equal(live.export(),before);
});

test('selected assets retain their identities through edits, undo, save-style round trip and redo', () => {
  const doc = createBlockDocument('Asset round trip');
  assert.ok(doc.apply({tool:'floor',start:{x:0,y:0,z:0},end:{x:23,y:23,z:0},options:{}}).ok);
  const assets = editorAssets();
  const chair = assets.find(a => a.id === 'chair-wingback-teal');
  const baseline = doc.export();
  const placed = doc.apply({tool:chair.tool,start:{x:5,y:5,z:0},options:{propKind:chair.bindings['prop-kind'],rotation:90,rotated:true}});
  assert.ok(placed.ok,placed.error);
  assert.equal(doc.map.props[0].kind,chair.id);
  assert.equal(doc.map.props[0].rotation,90);
  const saved = doc.export();
  assert.ok(doc.undo()); assert.equal(doc.export(),baseline);
  assert.ok(doc.redo()); assert.equal(doc.export(),saved);
  const reopened = openDocument(saved); assert.equal(reopened.map.props[0].kind,chair.id);
  const terrain = assets.find(a => a.id === 'ground-biome-jungle');
  const painted = reopened.apply({tool:terrain.tool,start:{x:2,y:2,z:0},options:{groundKind:terrain.bindings['ground-kind']}});
  assert.ok(painted.ok,painted.error); assert.equal(reopened.map.terrain[2][2],terrain.id);
});

test('wetland and bog presets keep their distinct saved identities', () => {
  for (const id of ['wetland-v1','bog-v1']) {
    const asset = editorAssets().find(a => a.id === id), doc = createBlockDocument(id);
    assert.ok(doc.apply({tool:'floor',start:{x:0,y:0,z:0},end:{x:23,y:23,z:0},options:{}}).ok);
    assert.ok(doc.apply({tool:'texture',start:{x:0,y:0,z:0},end:{x:23,y:23,z:0},options:{groundKind:'ground-grass'}}).ok);
    const result = doc.apply({tool:asset.tool,start:{x:5,y:5,z:0},end:{x:8,y:8,z:0},options:{foliagePreset:asset.bindings['foliage-preset'],foliageDensity:65,foliageTreeCover:'brush-v1'}});
    assert.ok(result.ok,result.error);
    assert.ok(Object.values(openDocument(doc.export()).map.foliage).every(cell => cell[2] === id));
  }
});
