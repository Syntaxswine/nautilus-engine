import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../packages/render-effects/three.js';
import {CITY_PROPS, CITY_SCENERY, cityProp, cityPropURLs} from '../packages/city-props/index.js';
import {createCityPropLibrary} from '../packages/city-props/three.js';
import {CITY_ASSET_CATEGORY, editorAssets, findAssets} from '../apps/editor/asset-catalog.js';

const catalogue = JSON.parse(fs.readFileSync(new URL('../assets/city-props/catalogue.json', import.meta.url)));
const hash = data => createHash('sha256').update(data).digest('hex');

test('1880s exports fit their native reservations and keep a complete shared-atlas model closure', () => {
  assert.equal(new Set(CITY_PROPS.map(p => p.id)).size, 28);
  assert.equal(hash(fs.readFileSync(new URL(cityPropURLs(CITY_PROPS[0].id).atlas))), catalogue.atlas.sha256);
  assert.equal(catalogue.props.length, CITY_PROPS.length);
  for (const item of catalogue.props) {
    const spec = cityProp(item.id);
    const urls = cityPropURLs(item.id), json = fs.readFileSync(new URL(urls.model)), bytes = fs.readFileSync(new URL(urls.buffer));
    assert.equal(hash(json), item.files.gltf.sha256);
    assert.equal(hash(bytes), item.files.bin.sha256);
    const model = JSON.parse(json), [lo, hi] = item.boundsM, [w, h] = spec.cells;
    assert.equal(new URL(model.images[0].uri, urls.model).href, urls.atlas);
    assert.equal(new URL(model.buffers[0].uri, urls.model).href, urls.buffer);
    assert.equal(model.buffers[0].byteLength, bytes.length);
    assert.ok(model.bufferViews.every(view => view.byteOffset % 4 === 0 && view.byteOffset + view.byteLength <= bytes.length));
    assert.ok([...lo, ...hi].every(Number.isFinite));
    assert.ok(lo[0] >= -w / 2 && hi[0] <= w / 2 && lo[2] >= -h / 2 && hi[2] <= h / 2, item.id);
    assert.ok(lo[1] > -.01 && hi[1] <= 2.121 && item.triangles < item.sculptTriangles && item.triangles <= 4500, item.id);
    assert.equal(model.materials.some(material => material.name === 'flame'), spec.lit);
    if (spec.mounting === 'wall') assert.ok(lo[2] < -.49);
    if (spec.mounting === 'ceiling') assert.ok(Math.abs(hi[1] - 2.12) < 1e-5);
  }
});

test('workshop lookup and the sample preserve the complete city prop set', () => {
  const assets = editorAssets({includeCityProps: true});
  assert.equal(findAssets(assets, '', CITY_ASSET_CATEGORY).length, 28);
  assert.equal(findAssets(assets, 'eastlake', CITY_ASSET_CATEGORY).length, 9);
  assert.equal(findAssets(assets, 'oil lighting', CITY_ASSET_CATEGORY).length, 10);
  const sample = JSON.parse(fs.readFileSync(new URL('../assets/city-props/workshop-sample.json', import.meta.url)));
  const occupied = new Set();
  for (const p of sample.props) {
    const spec = CITY_SCENERY[p.kind];
    const w = p.rotated ? spec.h : spec.w, h = p.rotated ? spec.w : spec.h;
    for (let y = p.y; y < p.y + h; y++) for (let x = p.x; x < p.x + w; x++) {
      assert.ok(!occupied.has(x + ',' + y), 'Overlapping sample prop at ' + x + ',' + y);
      occupied.add(x + ',' + y);
    }
  }
  assert.deepEqual(new Set(sample.props.map(p => p.kind)), new Set(CITY_PROPS.map(p => p.id)));
});

test('city placements can be removed independently and the library leaves the borrowed texture alive', () => {
  const atlas = new THREE.Texture();
  const library = createCityPropLibrary(THREE, atlas);
  const a = library.build('city1880-counter'), b = library.build('city1880-counter');
  const mesh = b.root.children[0], geometry = mesh.geometry;
  let disposedGeometry = 0, disposedAtlas = 0;
  geometry.addEventListener('dispose', () => disposedGeometry++);
  atlas.addEventListener('dispose', () => disposedAtlas++);
  assert.equal(a.root.children[0].geometry, geometry);
  a.dispose();
  assert.equal(b.root.children[0].material.map, atlas);
  assert.equal(disposedGeometry, 0);
  b.dispose();
  library.dispose();
  library.dispose();
  assert.equal(disposedGeometry, 1);
  assert.equal(disposedAtlas, 0);
  atlas.dispose();
});
