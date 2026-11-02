import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../packages/render-effects/three.js';
import {createRockModel} from '../packages/item-visuals/rock.js';

test('rock visual remains inside the collision sphere at native scale and touches the ground', () => {
  for (const seed of [0, 1, 937, 0xffffffff]) {
    const model = createRockModel(THREE, {radius: .055, seed});
    try {
      assert.deepEqual(model.root.scale.toArray(), [1, 1, 1]);
      assert.ok(model.root instanceof THREE.Group);
      assert.ok(model.mesh instanceof THREE.Mesh);
      const positions = model.mesh.geometry.attributes.position;
      for (let vertex = 0; vertex < positions.count; vertex++) {
        assert.ok(Math.hypot(positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)) <= .055 + 1e-8);
      }
      model.root.position.set(4, .055, 2);
      model.root.rotation.y = Math.PI / 2;
      const bounds = model.getBounds();
      assert.ok(Math.abs(bounds.min[1]) < 1e-8);
      assert.ok(Math.abs(bounds.max[1] - .11) < 1e-8);
      assert.equal(model.metrics.triangles, 54);
      assert.equal(model.metrics.textures, 0);
      const pos = model.mesh.geometry.attributes.position;
      const normals = model.mesh.geometry.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        assert.ok(pos.getX(i) * normals.getX(i) + pos.getY(i) * normals.getY(i) + pos.getZ(i) * normals.getZ(i) > 0);
      }
    } finally { model.dispose(); }
  }
});

test('rock shaping is deterministic and owns only its model resources', () => {
  const first = createRockModel(THREE, {seed: 53}), same = createRockModel(THREE, {seed: 53}), other = createRockModel(THREE, {seed: 54});
  try {
    assert.deepEqual(first.mesh.geometry.attributes.position.array, same.mesh.geometry.attributes.position.array);
    assert.notDeepEqual(first.mesh.geometry.attributes.position.array, other.mesh.geometry.attributes.position.array);
    let geometries = 0, materials = 0;
    first.mesh.geometry.addEventListener('dispose', () => geometries++);
    first.mesh.material.addEventListener('dispose', () => materials++);
    const scene = new THREE.Scene(); scene.add(first.root);
    first.dispose(); first.dispose();
    assert.equal(first.root.parent, null);
    assert.equal(geometries, 1); assert.equal(materials, 1);
    assert.throws(() => first.getBounds(), /disposed/);
    same.root.position.set(8, .055, 3);
    assert.ok(same.getBounds().min[0] > 7);
  } finally { first.dispose(); same.dispose(); other.dispose(); }
});

test('rock model rejects invalid namespace and nonportable parameters', () => {
  assert.throws(() => createRockModel(null), /Three/);
  for (const radius of [NaN, Infinity, 0, -.1, 1]) assert.throws(() => createRockModel(THREE, {radius}), /radius/);
  for (const seed of [-1, .5, Infinity, 0x100000000]) assert.throws(() => createRockModel(THREE, {seed}), /seed/);
  for (const color of [-1, NaN, .1, 0x1000000]) assert.throws(() => createRockModel(THREE, {color}), /colour/);
});
