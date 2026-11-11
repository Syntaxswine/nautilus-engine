import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../packages/render-effects/three.js';
import {VEHICLE_GRID, VEHICLE_BODIES, ROAD_VEHICLES, ROAD_VEHICLE_ASSETS, ROAD_VEHICLE_SCENERY, roadVehicle}
  from '../packages/vehicle-visuals/catalogue.js';
import {createRoadVehicleKit} from '../packages/vehicle-visuals/three.js';
import {editorAssets} from '../apps/editor/asset-catalog.js';
import {sharedAsset} from '../packages/assets/index.js';
import {roadVehicleSceneryCopy, roadVehicleImportMap} from '../tools/editor-road-vehicles.mjs';

const near = (a, b, tolerance = 2e-6) => assert.ok(Math.abs(a - b) <= tolerance, a + ' vs ' + b);
const triangles = root => root.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0);

test('all 24 vehicle skins retain the 1 m tile scale and 2.12 m height reference', () => {
  assert.deepEqual(VEHICLE_GRID, {tileM: 1, storyM: 2.12});
  assert.equal(VEHICLE_BODIES.length, 8);
  assert.equal(ROAD_VEHICLES.length, 24);
  assert.equal(new Set(ROAD_VEHICLES.map(row => row.id)).size, 24);
  const kit = createRoadVehicleKit(T);
  try {
    for (const row of ROAD_VEHICLES) {
      const model = kit.create(row.id), box = new T.Box3().setFromObject(model.root);
      assert.equal(model.root.children.length, 2);
      near(box.min.y, 0);
      assert.ok(box.max.y <= VEHICLE_GRID.storyM + 1e-6);
      assert.ok(box.min.x >= -row.cells[0] / 2 && box.max.x <= row.cells[0] / 2);
      assert.ok(box.min.z >= -row.cells[1] / 2 && box.max.z <= row.cells[1] / 2);
      assert.ok(box.max.z - box.min.z <= row.lengthM + 1e-6);
      near(box.max.y, row.heightM, .002);
      const {position, normal, uv} = model.root.children.find(mesh => mesh.name.includes('windows')).geometry.attributes;
      assert.ok(position.array.every(Number.isFinite), row.id + ' has invalid painted window vertices');
      assert.ok(normal.array.every(Number.isFinite));
      assert.ok(uv.array.every(Number.isFinite));
      assert.equal(model.root.userData.metresPerUnit, 1);
      model.dispose();
    }
  } finally { kit.dispose(); }
});

test('the simplified bodies preserve sculpt dimensions and reduce triangle counts', () => {
  const kit = createRoadVehicleKit(T);
  try {
    for (const body of VEHICLE_BODIES) {
      const game = kit.create('vehicle-' + body.id + '-sage');
      const sculpt = kit.create('vehicle-' + body.id + '-sage', {lod: 'sculpt'});
      const a = new T.Box3().setFromObject(game.root), b = new T.Box3().setFromObject(sculpt.root);
      for (const axis of ['x', 'y', 'z']) { near(a.min[axis], b.min[axis]); near(a.max[axis], b.max[axis]); }
      assert.ok(triangles(game.root) < triangles(sculpt.root) * .65, body.id);
      game.dispose(); sculpt.dispose();
    }
    assert.throws(() => kit.create('vehicle-sedan-sage', {lod: 'other'}), /detail/);
  } finally { kit.dispose(); }
});

test('paint variants share geometry and one-car retirement preserves the other vehicles', () => {
  const scene = new T.Scene(), kit = createRoadVehicleKit(T);
  const a = kit.create('vehicle-hatchback-sage'), b = kit.create('vehicle:hatchback-teal');
  scene.add(a.root, b.root);
  for (let i = 0; i < a.root.children.length; i++) assert.strictEqual(a.root.children[i].geometry, b.root.children[i].geometry);
  assert.notStrictEqual(a.root.getObjectByName('Painted body').material, b.root.getObjectByName('Painted body').material);
  const owned = new Set([...a.root.children, ...b.root.children].flatMap(mesh =>
    [mesh.geometry, mesh.material, mesh.material.map]).filter(Boolean));
  const events = new Map();
  for (const resource of owned) resource.addEventListener('dispose', () => events.set(resource, (events.get(resource) ?? 0) + 1));
  a.dispose(); a.dispose();
  assert.equal(a.root.parent, null);
  assert.equal(b.root.parent, scene);
  assert.equal(events.size, 0);
  kit.dispose(); kit.dispose(); b.dispose();
  assert.equal(scene.children.length, 0);
  for (const resource of owned) assert.equal(events.get(resource), 1);
  assert.throws(() => kit.create('vehicle-sedan-sage'), /disposed/);
  assert.throws(() => createRoadVehicleKit(), TypeError);
});

test('public asset discovery and Workshop rows describe the same parked vehicles', () => {
  const rows = editorAssets({includeRoadVehicles: true}).filter(row => row.category === 'Vehicles');
  assert.equal(rows.length, ROAD_VEHICLES.length);
  for (const [i, asset] of ROAD_VEHICLE_ASSETS.entries()) {
    const spec = roadVehicle(asset.id), card = sharedAsset(asset.id);
    assert.deepEqual(card, asset);
    assert.equal(card.modelId, spec.id);
    assert.equal(rows.find(row => row.id === spec.id).bindings['prop-kind'], spec.id);
    assert.deepEqual(ROAD_VEHICLE_SCENERY[spec.id].origin, spec.cells.map(n => (n - 1) / 2));
    assert.equal(ROAD_VEHICLE_ASSETS[i].dimensions.metresPerUnit, 1);
  }
  assert.throws(() => roadVehicle('vehicle:missing'), RangeError);
});

test('Workshop scenery additions use separate module names and exact pinned inputs', () => {
  const once = (text, before, after) => { assert.equal(text.split(before).length, 2); return text.replace(before, after); };
  const source = 'export const SCENERY_PROPS=Object.freeze({\n});';
  const alias = roadVehicleSceneryCopy('dist/tactics/scenery-catalog.js', source, once);
  assert.equal(alias.path, 'dist/tactics/nautilus-vehicles-scenery-catalog.js');
  assert.ok(alias.text.includes('...ROAD_VEHICLE_SCENERY,'));
  assert.equal(source, 'export const SCENERY_PROPS=Object.freeze({\n});');
  assert.equal(roadVehicleSceneryCopy('other.js', source, once), null);
  const imports = JSON.parse(roadVehicleImportMap().replace('<script type="importmap">', '').replace('</script>', ''));
  assert.equal(Object.keys(imports.imports).length, 2);
  assert.equal(imports.imports['./scenery-scene.js'], './nautilus-vehicles-scenery-scene.js');
});