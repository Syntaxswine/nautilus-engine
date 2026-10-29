import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {MAP_CONTRACT} from '../packages/map-core/index.js';
import {BATHROOM_MODULES, BATHROOM_LAYOUTS, BATHROOM_CONTRACT, bathroomRecipe, compileBathroom, bathroomPlan} from '../packages/bathrooms/index.js';
import {buildBathroomMesh, hingePoint, BATHROOM_MATERIALS} from '../packages/bathrooms/mesh.js';
import {createBathroomModel} from '../packages/bathrooms/three.js';
const specs = [...BATHROOM_MODULES, ...BATHROOM_LAYOUTS], meshes = new Map(specs.map(r => [r.id, buildBathroomMesh(r.id)]));
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, message || `${a} != ${b}`), sha = b => createHash('sha256').update(b).digest('hex');
function hit(batches, origin, direction, far) {
  const ray = new T.Ray(new T.Vector3(...origin), new T.Vector3(...direction)), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), out = new T.Vector3();
  for (const batch of batches) for (let i = 0; i < batch.positions.length; i += 9) {
    a.fromArray(batch.positions, i); b.fromArray(batch.positions, i + 3); c.fromArray(batch.positions, i + 6);
    if (ray.intersectTriangle(a, b, c, false, out) && out.distanceTo(ray.origin) < far) return true;
  }
  return false;
}
test('bathroom recipes are immutable, headless and use the existing one metre tile contract', () => {
  assert.equal(MAP_CONTRACT.metresPerTile, 1); assert.equal(BATHROOM_CONTRACT.metresPerTile, 1);
  assert.equal(typeof globalThis.document, 'undefined'); assert.equal(specs.length, 23);
  const before = JSON.stringify(BATHROOM_MODULES), copy = bathroomRecipe('bath-stall-left'); copy.name = 'Changed';
  assert.equal(JSON.stringify(BATHROOM_MODULES), before); assert.ok(Object.isFrozen(BATHROOM_MODULES[0]));
  for (const r of specs) {
    const b = compileBathroom(r.id); assert.deepEqual(b, compileBathroom(b)); assert.deepEqual(b.contract.scale, [1, 1, 1]);
    assert.equal(b.consumerSupport.editorProvider, false); assert.equal(b.consumerSupport.plumbing, false);
    assert.ok(bathroomPlan(b).includes('1 × 2 tiles'));
  }
  assert.throws(() => compileBathroom({...bathroomRecipe('bath-stall-left'), width: 1.5}));
  assert.throws(() => compileBathroom('missing'));
  const layout = structuredClone(BATHROOM_LAYOUTS[0]); layout.instances[0].position[0] += .5; assert.throws(() => compileBathroom(layout), /whole tile/);
  layout.instances[0].position[0] -= .5; layout.instances[0].yaw = .2; assert.throws(() => compileBathroom(layout), /quarter turns/);
});
test('both complete stall hands occupy exactly one by two tiles, including partitions and fittings', () => {
  for (const id of ['bath-stall-left', 'bath-stall-right']) {
    const m = meshes.get(id); assert.deepEqual(m.asset.nominalFootprint, [1, 2]); assert.deepEqual(m.asset.stallCells, [[0, 0]]);
    near(m.bounds.min[0], 0); near(m.bounds.max[0], 1); near(m.bounds.min[2], 0); near(m.bounds.max[2], 2);
    for (let quarter = 0; quarter < 4; quarter++) {
      const points = [[0, 0], [1, 0], [1, 2], [0, 2]].map(([x, z]) => [x * Math.cos(quarter*Math.PI/2) + z * Math.sin(quarter*Math.PI/2), -x * Math.sin(quarter*Math.PI/2) + z * Math.cos(quarter*Math.PI/2)]);
      near(Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0])), quarter % 2 ? 2 : 1);
      near(Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1])), quarter % 2 ? 1 : 2);
    }
  }
  const row = meshes.get('bath-stall-row-3'); assert.deepEqual(row.asset.nominalFootprint, [3, 2]);
  assert.deepEqual(row.asset.stallCells, [[0, 0], [1, 0], [2, 0]]); near(row.bounds.max[0], 3); near(row.bounds.max[2], 2);
  assert.equal(row.hinges.filter(h => h.kind === 'door').length, 3);
});
test('toilets, basins, troughs and privy benches have real open cavities and rims', () => {
  for (const id of ['bath-toilet-cistern', 'bath-toilet-high-cistern', 'bath-toilet-steel']) {
    const b = meshes.get(id).batches; assert.equal(hit(b, [.25, .6, .31], [0, -1, 0], .22), false, id + ' bowl is capped');
    assert.equal(hit(b, [.455, .6, .31], [0, -1, 0], .22), true, id + ' rim is missing');
  }
  for (const id of ['bath-sink-pedestal', 'bath-sink-wall', 'bath-sink-stone']) {
    const r = bathroomRecipe(id), b = meshes.get(id).batches, x = r.width / 2, z = r.depth * .47;
    assert.equal(hit(b, [x, .95, z], [0, -1, 0], .18), false, id + ' basin is capped');
    assert.equal(hit(b, [x + r.width * .425, .95, z], [0, -1, 0], .18), true, id + ' rim is missing');
  }
  const double = meshes.get('bath-sink-double').batches;
  for (const x of [.5, 1.5]) assert.equal(hit(double, [x, .95, .27], [0, -1, 0], .18), false, 'Counter crosses basin hole');
  assert.equal(hit(double, [.96, .95, .27], [0, -1, 0], .18), true);
  const trough = meshes.get('bath-urinal-trough').batches; assert.equal(hit(trough, [1, .9, .23], [0, -1, 0], .15), false);
  assert.equal(hit(trough, [1, .9, .42], [0, -1, 0], .25), true);
  for (const id of ['bath-outhouse-timber', 'bath-outhouse-masonry']) {
    const b = meshes.get(id).batches.filter(b => !['roof', 'gable'].includes(b.kind));
    assert.equal(hit(b, [.5, .7, 1.52], [0, -1, 0], .3), false, id + ' seat hole is capped');
    assert.equal(hit(b, [.683, .7, 1.52], [0, -1, 0], .3), true);
  }
});
test('stall doors swing outwards, clear the declared aperture and operate independently from lids', () => {
  for (const hand of ['left', 'right']) {
    const model = createBathroomModel(T, 'bath-stall-' + hand), ray = new T.Raycaster();
    const cast = (x, height) => { ray.set(new T.Vector3(x, height, -.15), new T.Vector3(0, 0, 1)); ray.far = .3; return ray.intersectObject(model.root, true).length; };
    assert.ok(cast(.5, 1)); model.setDoorsOpen(true); assert.equal(cast(.5, 1), 0);
    const lo = hand === 'left' ? .17 : .09;
    for (const x of [lo, lo + .37, lo + .74]) for (const y of [.2, .9, 1.8]) assert.equal(cast(x, y), 0, 'Fully-open approach obstructed');
    const lid = model.pivots.find(p => p.userData.kind === 'lid'); assert.equal(lid.userData.angle, undefined);
    model.setLidsOpen(true); assert.equal(lid.userData.angle, 90); model.setDoorsOpen(false); assert.ok(cast(.5, 1)); assert.equal(lid.userData.angle, 90);
    const door = model.data.hinges.find(h => h.kind === 'door');
    assert.ok(door.batches.flatMap(b => Array.from({length: b.positions.length / 3}, (_, i) => hingePoint(door, b.positions.slice(i*3, i*3+3), 90)[2])).some(z => z < -.6));
    model.dispose();
  }
  const row = createBathroomModel(T, 'bath-stall-row-3'), doors = row.pivots.filter(p => p.userData.kind === 'door');
  row.setHingePose(doors[1].name, 45); assert.equal(doors[1].userData.angle, 45); assert.equal(doors[0].userData.angle, undefined); assert.equal(doors[2].userData.angle, undefined);
  assert.throws(() => row.setHingePose(doors[0].name, 91)); assert.throws(() => row.setHingePose('missing', 0)); row.dispose();
});
test('every source reduces while preserving complete closed bounds, finite UVs and unit normals', () => {
  for (const r of specs) {
    const m = meshes.get(r.id), source = buildBathroomMesh(r.id, {lod: 'source'});
    assert.ok(source.metrics.triangles > m.metrics.triangles * 1.5, r.id);
    for (const key of ['min', 'max']) source.bounds[key].forEach((v, i) => near(v, m.bounds[key][i], r.id + ' source bounds'));
    for (const b of [...m.batches, ...m.hinges.flatMap(h => h.batches)]) {
      assert.equal(b.positions.length, b.normals.length); assert.equal(b.uvs.length, b.positions.length / 3 * 2);
      assert.ok([...b.positions, ...b.normals, ...b.uvs].every(Number.isFinite));
      for (let i = 0; i < b.normals.length; i += 3) near(Math.hypot(...b.normals.slice(i, i + 3)), 1);
    }
  }
});
test('reserved motion bounds contain actual native hinge geometry at intermediate poses and rotated placements', () => {
  for (const id of ['bath-stall-row-3', 'bath-outhouse-double', 'bath-public-washroom']) {
    const model = createBathroomModel(T, id), data = model.data;
    for (const degrees of [0, 17.5, 45, 68.25, 90]) for (const pivot of model.pivots) {
      model.setHingePose(pivot.name, degrees);
      pivot.traverse(object => { if (!object.isMesh) return; const p = object.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { const point = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(object.matrixWorld).toArray();
          point.forEach((v, j) => assert.ok(v >= data.motionBounds.min[j] - 1e-6 && v <= data.motionBounds.max[j] + 1e-6, id + ' misses motion envelope')); }
      });
    }
    model.dispose();
  }
});
test('optional renderer owns its geometry/materials and preserves borrowed textures and other models', () => {
  const texture = new T.Texture(); let textureDisposed = 0, geometryDisposed = 0; texture.addEventListener('dispose', () => textureDisposed++);
  const a = createBathroomModel(T, 'bath-stall-left', {atlas: texture}), b = createBathroomModel(T, 'bath-stall-left', {atlas: texture});
  a.root.traverse(o => { if (o.isMesh) o.geometry.addEventListener('dispose', () => geometryDisposed++); });
  a.dispose(); a.dispose(); assert.ok(geometryDisposed); assert.equal(textureDisposed, 0); assert.ok(b.root.children.length);
  assert.throws(() => a.setDoorsOpen(true), /disposed/); b.dispose(); assert.equal(textureDisposed, 0);
});
test('all saved blueprints, source meshes, relative glTF resources, standard UVs and independent animation clips round trip', () => {
  const cat = JSON.parse(fs.readFileSync(new URL('../assets/bathrooms/catalogue.json', import.meta.url))); assert.equal(cat.assets.length, 23);
  for (const item of [...cat.inputs, cat.skin, cat.dimensions, ...cat.assets.flatMap(r => r.files)]) assert.equal(sha(fs.readFileSync(new URL('../' + item.file, import.meta.url))), item.sha256, item.file);
  for (const r of cat.assets) {
    const base = new URL('../assets/bathrooms/models/', import.meta.url), asset = JSON.parse(fs.readFileSync(new URL(r.id + '.blueprint.json', base))), rebuilt = buildBathroomMesh(asset);
    assert.equal(rebuilt.metrics.triangles, r.game.triangles); assert.deepEqual(rebuilt.bounds, r.bounds);
    const source = JSON.parse(gunzipSync(fs.readFileSync(new URL('../art/bathrooms/sculpts/' + r.id + '.source-mesh.json.gz', import.meta.url)))); assert.equal(source.metrics.triangles, r.source.triangles);
    const gltf = JSON.parse(fs.readFileSync(new URL(r.id + '.gltf', base))), bytes = fs.readFileSync(new URL(r.id + '.bin', base)); assert.equal(bytes.length, gltf.buffers[0].byteLength);
    for (const image of gltf.images) assert.ok(fs.existsSync(new URL(image.uri, base)));
    for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
      const idx = gltf.accessors[p.indices], view = gltf.bufferViews[idx.bufferView], count = gltf.accessors[p.attributes.POSITION].count;
      for (let i = 0; i < idx.count; i++) assert.ok(bytes.readUInt32LE(view.byteOffset + i*4) < count);
      const spec = BATHROOM_MATERIALS[gltf.materials[p.material].name], uv = gltf.accessors[p.attributes.TEXCOORD_0], uview = gltf.bufferViews[uv.bufferView];
      if (spec.tile !== null) for (let i = 0; i < uv.count; i++) {
        const u = bytes.readFloatLE(uview.byteOffset + i*8), v = bytes.readFloatLE(uview.byteOffset + i*8 + 4);
        assert.ok(u >= (spec.tile%3)/3 - 1e-6 && u <= (spec.tile%3+1)/3 + 1e-6);
        assert.ok(v >= Math.floor(spec.tile/3)/2 - 1e-6 && v <= (Math.floor(spec.tile/3)+1)/2 + 1e-6);
      }
    }
    assert.equal(gltf.animations?.length || 0, r.hinges.length);
    const native = createBathroomModel(T, rebuilt);
    for (const animation of gltf.animations || []) {
      assert.equal(animation.channels.length, 1); const channel = animation.channels[0], node = gltf.nodes[channel.target.node];
      assert.equal(node.matrix, undefined); assert.ok(node.rotation && node.translation && node.extras.axis); assert.equal(channel.target.path, 'rotation');
      const values = gltf.accessors[animation.samplers[0].output], view = gltf.bufferViews[values.bufferView];
      assert.equal(values.count, 2); for (let i = 0; i < 2; i++) near(Math.hypot(...Array.from({length: 4}, (_, j) => bytes.readFloatLE(view.byteOffset + (i*4+j)*4))), 1);
      for (const [index, degrees] of [[0, 0], [1, 90]]) {
        native.setHingePose(animation.extras.hingeId, degrees);
        const actual = native.pivots.find(p => p.name === animation.extras.hingeId).quaternion;
        const exported = new T.Quaternion(...Array.from({length: 4}, (_, j) => bytes.readFloatLE(view.byteOffset + (index*4+j)*4)));
        near(Math.abs(actual.dot(exported)), 1, 'Exported hinge pose differs from native renderer');
      }
    }
    native.dispose();
  }
});
