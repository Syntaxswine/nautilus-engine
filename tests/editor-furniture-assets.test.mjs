import test from 'node:test';
import assert from 'node:assert/strict';
import {editorAssets,findAssets} from '../apps/editor/asset-catalog.js';
import {assetPreview} from '../apps/editor/asset-preview.js';
import {listFurnitureAssets,furnitureAsset} from '../packages/furniture-core/index.js';
import {listSharedAssets,sharedAsset} from '../packages/assets/index.js';
import {checkSharedAssets} from '../tools/shared-assets.mjs';

const source='fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b';

test('the editor discovers 96 namespaced furniture variants from eight source forms',()=>{
  const assets=editorAssets().filter(asset=>asset.category==='Furniture'),records=listFurnitureAssets();
  assert.equal(assets.length,96);assert.equal(new Set(assets.map(asset=>asset.furniture.form)).size,8);
  assert.deepEqual(assets.map(asset=>asset.id).sort(),records.map(record=>record.id).sort());
  for(const asset of assets) {
    const spec=furnitureAsset(asset.id);
    assert.match(asset.id,/^furniture:library\./);assert.equal(asset.furniture.source.commit,source);
    assert.equal(asset.preview,'furniture');assert.equal(asset.tool,'inspect-furniture');assert.match(asset.disabled,/unavailable for map placement/);
    assert.deepEqual(asset.bindings,{});assert.deepEqual([asset.w,asset.h],spec.tiles);
  }
});

test('furniture filters compose form, finish, contents and case-insensitive search',()=>{
  const assets=editorAssets(),find=(filters,query='')=>findAssets(assets,query,'Furniture',filters);
  assert.equal(find({form:'bookcase-tall'}).length,12);assert.equal(find({finish:'sage'}).length,16);assert.equal(find({contents:'books'}).length,48);
  assert.equal(find({form:'bookcase-tall',finish:'sage'}).length,2);
  const exact=find({form:'bookcase-tall',finish:'sage',contents:'books'},'  STOCKED SAGE ');
  assert.deepEqual(exact.map(asset=>asset.id),['furniture:library.bookcase-tall.sage.books']);
  assert.equal(find({form:'bookcase-tall'},'missing').length,0);assert.equal(findAssets(assets,'bookcase-tall','People').length,0);
});

test('quarter-turned furniture previews remain separate from portable map/prop data',()=>{
  for(const asset of editorAssets().filter(asset=>asset.preview==='furniture')) {
    const first=assetPreview(asset,{rotation:90,mode:'clay',lowAngle:true}),second=assetPreview(asset);
    assert.deepEqual(first.document,{furniture:{id:asset.id,rotation:90,mode:'clay',lowAngle:true}});
    assert.notEqual(first.document.furniture,second.document.furniture);assert.equal(first.document.map,undefined);assert.equal(first.document.units,undefined);
    assert.ok(Number.isFinite(first.view.span)&&first.view.span>0);
  }
});

test('public furniture discovery preserves source identity and distinguishes body dimensions from reservation tiles',()=>{
  checkSharedAssets();const records=listSharedAssets({category:'Furniture'});assert.equal(records.length,96);
  for(const record of records) {
    const spec=furnitureAsset(record.id);
    assert.equal(record.source.project,'farmyard');assert.equal(record.source.commit,source);assert.equal(record.availability,'shared-furniture-renderer');assert.equal(record.editorPlacement,'unavailable');
    assert.deepEqual(record.dimensions,{width:spec.size[0],height:spec.size[1],depth:spec.size[2],metresPerUnit:1,kind:'declared-body'});
    assert.deepEqual(record.reservation.tiles,spec.tiles);assert.deepEqual(record.placementOffset,spec.placementOffset);
  }
  const copy=records[0];copy.source.commit='changed';assert.equal(sharedAsset(copy.id).source.commit,source);
});
