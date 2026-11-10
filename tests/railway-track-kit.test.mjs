import test from 'node:test';
import assert from 'node:assert/strict';
import {createRailwayKit} from '@nautilus-engine/map-core/assets/three';
import {listSharedAssets} from '@nautilus-engine/map-core/assets';
import * as T from '../packages/render-effects/three.js';
import {editorAssets, findAssets} from '../apps/editor/asset-catalog.js';
import {assetPreview} from '../apps/editor/asset-preview.js';
import {planRailwayRoute, railwayStationAt} from '../packages/map-core/index.js';

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
    assert.equal(asset.tool, 'railway-route');
    assert.equal(asset.disabled, undefined);
    const preview = assetPreview(asset);
    assert.ok(cards.some(card => card.id === preview.railway.id));
    assert.deepEqual(preview.document.map.props, []);
  }
});

test('the continuous route shares the native profile, finishes and through-triangles at every tangent', () => {
  const waypoints = [[12, 12], [24, 12], [32, 20], [32, 30], [43, 30]];
  const plan = planRailwayRoute(waypoints), stations = plan.stations;
  const joins = plan.spans.slice(1).map(span => stations.findIndex(site => Math.abs(site.distanceM - span.startM) < 1e-8));
  const kit = createRailwayKit(T);
  try {
    const native = kit.create(STRAIGHT).root;
    const route = kit.createRoute(waypoints), {root} = route;
    assert.equal(root.children.length, 5);
    root.children.forEach((mesh, i) => assert.equal(mesh.material, native.children[i].material));
    const bed = root.children[0], [left, right] = root.children.slice(1, 3);
    const distances = (mesh, index) => {
      const {position} = mesh.geometry.attributes, site = stations[index];
      return [2 * index, 2 * index + 1].map(i =>
        (position.getX(i) - site.x) * site.c - (position.getZ(i) - site.z) * site.s);
    };
    const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, a + ' vs ' + b);
    for (const i of joins) {
      assert.ok(i > 0);
      close(distances(bed, i)[0], -1);
      close(distances(right, i)[0] - distances(left, i)[0], .90);
      close(bed.geometry.attributes.uv.getY(2 * i), 2 * stations[i].distanceM);
      for (const mesh of [bed, left, right]) {
        const index = mesh.geometry.index.array, at = (i - 1) * 6, v = 2 * i;
        assert.deepEqual([...index.slice(at, at + 12)],
          [v - 2, v, v - 1, v - 1, v, v + 1, v, v + 2, v + 1, v + 1, v + 2, v + 3]);
      }
    }
    close(bed.geometry.boundingBox.max.y, .265);
    close(left.geometry.boundingBox.max.y, .43);
    const ties = root.getObjectByName('Timber ties');
    assert.equal(ties.count, Math.round(plan.lengthM / .5));
    const matrix = new T.Matrix4();
    for (const i of [0, 16, ties.count - 1]) {
      ties.getMatrixAt(i, matrix);
      const site = railwayStationAt(plan, (i + .5) * plan.lengthM / ties.count);
      close(matrix.elements[12], site.x);
      close(matrix.elements[14], site.z);
    }
    let disposals = 0;
    bed.geometry.addEventListener('dispose', () => disposals++);
    route.dispose();
    route.dispose();
    assert.equal(disposals, 1);
  } finally { kit.dispose(); }
});
