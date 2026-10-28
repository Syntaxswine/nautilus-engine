import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_ASSETS,GROSS_BUILDING_ASSETS,ORIGINAL_BUILDING_ASSETS,PREFAB_CATALOGUE,COMBINED_PREFAB_CATALOGUE,ORIGINAL_BUILDING_FEATURE,isPrefabCatalogue,catalogueHasAsset,catalogueForAssets,buildingAsset,DEFAULT_RESIDENTIAL_ASSETS} from '../packages/prefab-core/registry.js';

test('fixed prefab registry preserves Gross identity and adds 48 distinct original models',()=>{
  assert.equal(BUILDING_ASSETS.length,61);assert.equal(GROSS_BUILDING_ASSETS.length,13);assert.equal(ORIGINAL_BUILDING_ASSETS.length,48);
  assert.equal(PREFAB_CATALOGUE,'tinderbox-gross-housing-v1@6693bfa3fea2edec77649d830de5ac68ba4c1a50');
  assert.equal(new Set(BUILDING_ASSETS.map(a=>a.id)).size,61);
  for(const asset of BUILDING_ASSETS){assert.equal(buildingAsset(asset.id),asset);assert.ok(Object.isFrozen(asset));assert.ok(asset.bounds.every(Number.isFinite));assert.ok(asset.levels.length);}
  assert.equal(ORIGINAL_BUILDING_FEATURE,'nautilus-original-buildings-v1');
});
test('catalogue membership and copied-edit transitions never relabel old Gross saves silently',()=>{
  const gross=['albany-cottage','grossdale-spire'],mixed=[...gross,'bramble-ranch'];
  assert.equal(catalogueForAssets(gross),PREFAB_CATALOGUE);assert.equal(catalogueForAssets(mixed),COMBINED_PREFAB_CATALOGUE);
  assert.equal(catalogueForAssets(gross,COMBINED_PREFAB_CATALOGUE),COMBINED_PREFAB_CATALOGUE);
  assert.equal(catalogueHasAsset(PREFAB_CATALOGUE,'bramble-ranch'),false);
  assert.equal(catalogueHasAsset(PREFAB_CATALOGUE,'albany-cottage'),true);
  assert.ok(mixed.every(id=>catalogueHasAsset(COMBINED_PREFAB_CATALOGUE,id)));
  assert.equal(isPrefabCatalogue('future-unreviewed'),false);assert.equal(catalogueHasAsset(COMBINED_PREFAB_CATALOGUE,'missing'),false);
  assert.throws(()=>catalogueForAssets(['missing']),/known/);assert.throws(()=>catalogueForAssets(gross,'future-unreviewed'),/Unsupported/);
  assert.deepEqual(gross,['albany-cottage','grossdale-spire']);
});
test('default residential selection is explicit and fits six lots in the UI area',()=>{
  const span=Math.max(...DEFAULT_RESIDENTIAL_ASSETS.flatMap(id=>{const a=buildingAsset(id);assert.ok(a);return [Math.ceil(a.bounds[2]-a.bounds[0]),Math.ceil(a.bounds[3]-a.bounds[1])];}));
  assert.ok(Math.floor(96/(span+8))**2>=6);
  for(const a of ORIGINAL_BUILDING_ASSETS){assert.ok(a.sources.every(s=>s.id&&s.title&&s.url.startsWith('https://')));assert.equal(a.sourceCommit,'ee7c18ecdc2669168247b94a82156634b2c4ffe5');assert.match(a.envelope,/open door/);}
});
