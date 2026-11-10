import test from 'node:test';
import assert from 'node:assert/strict';
import {createRailwayKit} from '@nautilus-engine/map-core/assets/three';
import {listSharedAssets} from '@nautilus-engine/map-core/assets';
import * as T from '../packages/render-effects/three.js';
import {editorAssets, findAssets} from '../apps/editor/asset-catalog.js';
import {assetPreview} from '../apps/editor/asset-preview.js';

const STRAIGHT = 'railway:track-straight';
const CURVE = 'railway:track-quarter-curve';

function section(root, axis, coordinate) {
  const snap = number => Math.round(number * 1e6);
  root.updateMatrixWorld(true);
  return root.children.slice(0, 3).map(mesh => {
    const {position, normal, uv} = mesh.geometry.attributes;
    const points = new Set();
    for (let i = 0; i < position.count; i++) {
      const p = new T.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      if (Math.abs(p[axis] - coordinate) > 1e-6) continue;
      const n = new T.Vector3().fromBufferAttribute(normal, i).transformDirection(mesh.matrixWorld);
      if (Math.abs(n[axis]) > .99) continue; // end caps face opposite ways
      points.add([...p.toArray(), ...n.toArray(), uv.getX(i), uv.getY(i) % 1].map(snap).join(','));
    }
    assert.ok(points.size > 8);
    return [...points].sort();
  });
}

test('ballast and steel rail ends match a straight on both sides of the rotated curve', () => {
  const kit = createRailwayKit(T);
  try {
    const a = kit.create(STRAIGHT).root, b = kit.create(CURVE).root, c = kit.create(STRAIGHT).root;
    b.position.z = 2;
    c.position.set(4, 0, 6);
    c.rotation.y = Math.PI / 2;
    assert.deepEqual(section(a, 'z', 2), section(b, 'z', 2));
    assert.deepEqual(section(b, 'x', 4), section(c, 'x', 4));
    assert.equal(a.getObjectByName('Timber ties').count, 4);
    assert.equal(b.getObjectByName('Timber ties').count, 13);
    const box = new T.Box3().setFromObject(a);
    assert.ok(box.min.distanceTo(new T.Vector3(-1, 0, 0)) < 1e-6);
    assert.ok(box.max.distanceTo(new T.Vector3(1, .43, 2)) < 1e-6);
    assert.throws(() => kit.create('railway:unknown'), /Unknown railway piece/);
  } finally { kit.dispose(); }
});

test('cloned segments retain shared paint and geometry until the kit retires', () => {
  const kit = createRailwayKit(T), scene = new T.Scene();
  const a = kit.create(STRAIGHT), b = kit.create(STRAIGHT), c = kit.create(CURVE);
  scene.add(a.root, b.root, c.root);
  const [bed] = a.root.children;
  assert.equal(b.root.children[0].geometry, bed.geometry);
  assert.equal(c.root.children[0].material, bed.material);
  let geometry = 0, paint = 0;
  bed.geometry.addEventListener('dispose', () => geometry++);
  bed.material.map.addEventListener('dispose', () => paint++);
  a.dispose();
  assert.deepEqual(scene.children, [b.root, c.root]);
  assert.deepEqual([geometry, paint], [0, 0]);
  kit.dispose();
  kit.dispose();
  assert.deepEqual(scene.children, []);
  assert.deepEqual([geometry, paint], [1, 1]);
  assert.throws(() => kit.create(STRAIGHT), /disposed/);
});

test('the shared cards and Workshop preview resolve the same railway asset IDs', () => {
  const cards = listSharedAssets({category:'Railway'});
  assert.deepEqual(cards.map(a => a.id), [STRAIGHT, CURVE]);
  assert.deepEqual(cards[1].ports.end, {position:[4, 4, 0],outward:[1, 0]});
  const assets = findAssets(editorAssets(), 'rail track', 'Railway');
  assert.equal(assets.length, cards.length);
  for (const asset of assets) {
    assert.match(asset.disabled, /Preview only/);
    const preview = assetPreview(asset);
    assert.ok(cards.some(card => card.id === preview.railway.id));
    assert.deepEqual(preview.document.map.props, []);
  }
});
