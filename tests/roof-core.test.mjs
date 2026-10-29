import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {ROOF_FEATURE, ROOF_LIMITS, roofErrors, roofsOf, createSlopedRoof} from '../packages/roof-core/index.js';
import {createRoofGroup, PAINTED_ROOF_MATERIALS} from '../packages/roof-core/three.js';

const sample = {id: 'house:roof', x: 10, y: 20, width: 12, depth: 8, z: 2,
  style: 'gable', axis: 'x', pitch: 35, overhang: .3, material: 'slate', seed: 42, direction: 1};
const mapOf = (...roofs) => ({slopedRoofs: {version: 1, roofs}});
const near = (a, b, message = '') => assert.ok(Math.abs(a - b) < 1e-8 * Math.max(1, Math.abs(a), Math.abs(b)), `${message}: ${a} ≠ ${b}`);
const point = (values, i, size = 3) => values.slice(i * size, (i + 1) * size);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = a => Math.hypot(...a);
function topNormals(roof) {
  const group = roof.groups[0];
  return roof.indices.slice(group.start, group.start + group.count).filter((_, i) => i % 3 === 0).map(i => point(roof.normals, i));
}

test('headless roof contract preserves inputs, explicit direction and JSON-serializable output', () => {
  assert.equal(ROOF_FEATURE, 'nautilus-sloped-roofs-v1');
  assert.equal(ROOF_LIMITS.floorSpacing, 2.12);
  assert.equal(globalThis.document, undefined);
  const input = structuredClone(sample), map = mapOf(input), before = structuredClone(map);
  const roof = createSlopedRoof(input), specs = roofsOf(map);
  assert.deepEqual(roof, JSON.parse(JSON.stringify(roof)));
  assert.deepEqual(map, before);
  specs[0].x = 100; roof.spec.seed = 0;
  assert.deepEqual(map, before);
  const legacy = {...sample}; delete legacy.direction;
  assert.deepEqual(roofsOf(mapOf(legacy)), [sample]);
  assert.deepEqual(createSlopedRoof(legacy), createSlopedRoof(sample));
  assert.deepEqual(roofsOf({}), []);
});

test('unsupported envelopes are rejected even empty; duplicate IDs and malformed specs do not disappear', () => {
  for (const slopedRoofs of [null, undefined, [], {}, {version: 2, roofs: []}, {version: '1', roofs: []},
    {version: 1, roofs: {}}, {version: 1, roofs: [], future: true}, {version: 1, roofs: Array(4097).fill(sample)}]) {
    const map = {slopedRoofs};
    assert.ok(roofErrors(map).length, JSON.stringify(slopedRoofs)?.slice(0, 70));
    assert.throws(() => roofsOf(map), TypeError);
  }
  assert.deepEqual(roofErrors({}), []);
  assert.deepEqual(roofErrors(mapOf()), []);
  assert.ok(roofErrors(mapOf(sample, {...sample})).some(e => e.includes('Duplicate')));
  for (const map of [null, 3, [], 'map']) assert.ok(roofErrors(map).length);
  for (const invalid of [null, false, [], 'roof', {...sample, id: 'unsafe/id'}, {...sample, future: true}]) {
    assert.ok(roofErrors(mapOf(invalid)).length);
    assert.throws(() => createSlopedRoof(invalid), TypeError);
  }
  for (const key of Object.keys(sample).filter(key => key !== 'direction')) {
    const missing = {...sample}; delete missing[key];
    assert.ok(roofErrors(mapOf(missing)).length, key);
  }
});

test('authoring metadata round-trips at envelope and roof levels with detached nested copies', () => {
  const shared = {url: 'https://example.test/plan', notes: ['Artist interpretation', null, false, 1.25]};
  const metadata = {source: shared, provenance: {sourceAgain: shared, license: {reviewed: true}}, tags: []};
  const spec = {...sample, metadata}, map = mapOf(spec);
  map.slopedRoofs.metadata = {authoring: {sources: [{name: 'Studio notes', revision: 3}]}};
  const before = JSON.stringify(map);
  assert.deepEqual(roofErrors(map), []);
  assert.deepEqual(JSON.parse(before).slopedRoofs.metadata, map.slopedRoofs.metadata);
  const copy = roofsOf(map)[0], roof = createSlopedRoof(spec);
  assert.deepEqual(copy.metadata, JSON.parse(JSON.stringify(metadata)));
  assert.deepEqual(roof.spec.metadata, JSON.parse(JSON.stringify(metadata)));
  assert.equal(JSON.stringify(roof), JSON.stringify(JSON.parse(JSON.stringify(roof))));
  copy.metadata.source.notes.push('Edited copy');
  roof.spec.metadata.provenance.license.reviewed = false;
  assert.equal(JSON.stringify(map), before);
  assert.notEqual(copy.metadata, roof.spec.metadata);
  const absent = createSlopedRoof(sample);
  assert.equal(Object.hasOwn(absent.spec, 'metadata'), false);
  assert.equal(Object.hasOwn(roofsOf(mapOf(sample))[0], 'metadata'), false);
  const nullPrototype = Object.create(null);
  Object.defineProperty(nullPrototype, '__proto__', {value: {note: 'ordinary JSON key'}, enumerable: true});
  assert.deepEqual(roofErrors(mapOf({...sample, metadata: nullPrototype})), []);
  assert.equal(createSlopedRoof({...sample, metadata: nullPrototype}).spec.metadata.__proto__.note, 'ordinary JSON key');
  assert.equal(Object.prototype.note, undefined);
});

test('metadata rejects cycles, non-finite or non-JSON values and accessors without mutating or invoking them', () => {
  const cycle = {}; cycle.parent = cycle;
  const indirect = {notes: []}; indirect.notes.push(indirect);
  const sparse = Array(2), extraArray = [1]; extraArray.note = 'not a JSON array element';
  let invoked = 0;
  const accessor = Object.defineProperty({}, 'source', {enumerable: true, get() {invoked++; return 'no';}});
  const hidden = Object.defineProperty({}, 'source', {value: 'hidden', enumerable: false});
  class Note {constructor() {this.text = 'non-plain';}}
  const invalid = [null, [], 3, 'notes', undefined, cycle, indirect, accessor, hidden,
    {[Symbol('note')]: 'lost'}, new Date(), new Map(), new Note(),
    ...[NaN, Infinity, -Infinity, undefined, () => {}, Symbol('note'), 1n, new Date(), new Set(), /note/, new Uint8Array([1]), sparse, extraArray].map(value => ({nested: {value}}))];
  for (const metadata of invalid) {
    const spec = {...sample, metadata}, map = mapOf(spec), reference = spec.metadata;
    assert.ok(roofErrors(map).some(e => e.includes('metadata')));
    assert.throws(() => roofsOf(map), TypeError);
    assert.throws(() => createSlopedRoof(spec), TypeError);
    assert.equal(spec.metadata, reference);
    const empty = {slopedRoofs: {version: 1, roofs: [], metadata}};
    assert.ok(roofErrors(empty).some(e => e.includes('metadata')));
    assert.throws(() => roofsOf(empty), TypeError);
  }
  assert.equal(invoked, 0);
  for (const descriptor of [{enumerable: true, get() {invoked++; return {};}}, {enumerable: false, value: {source: 'hidden'}}]) {
    const spec = Object.defineProperty({...sample}, 'metadata', descriptor);
    assert.ok(roofErrors(mapOf(spec)).length);
    assert.throws(() => createSlopedRoof(spec), TypeError);
    const envelope = Object.defineProperty({version: 1, roofs: []}, 'metadata', descriptor);
    assert.ok(roofErrors({slopedRoofs: envelope}).length);
    assert.throws(() => roofsOf({slopedRoofs: envelope}), TypeError);
  }
  assert.equal(invoked, 0);
  assert.equal(cycle.parent, cycle); assert.equal(indirect.notes[0], indirect);
  assert.ok(roofErrors({slopedRoofs: {version: 1, roofs: [], provenance: {}}}).length);
  assert.ok(roofErrors(mapOf({...sample, source: {}})).length);
});

test('metadata never affects roof geometry, physical UVs, bounds or seeded appearance', () => {
  for (const style of ['gable', 'hip', 'shed']) {
    const plain = createSlopedRoof({...sample, style}), annotated = createSlopedRoof({...sample, style,
      metadata: {geometry: {pitch: 90, seed: 0}, source: {notes: ['opaque authoring only']}}});
    const {spec: plainSpec, ...plainData} = plain, {spec: annotatedSpec, ...annotatedData} = annotated;
    assert.deepEqual(annotatedData, plainData);
    const {metadata, ...geometrySpec} = annotatedSpec;
    assert.deepEqual(geometrySpec, plainSpec);
    assert.equal(metadata.geometry.pitch, 90);
  }
});

test('numeric bounds, enums, NaN and infinities are checked before geometry work', () => {
  const invalid = {x: [NaN, Infinity, -Infinity, '10', -.1], y: [NaN, Infinity, false],
    width: [0, .4999, 240.001, NaN, Infinity], depth: [0, -.5, NaN],
    z: [0, 1.5, 6, NaN, '2'], pitch: [0, 4.999, 75.001, NaN, Infinity],
    overhang: [-.001, 2.001, NaN, Infinity], seed: [-1, .5, 4294967296, NaN, '42'],
    style: ['flat', 'mansard', undefined], axis: ['z', 'auto', null],
    direction: [0, 2, '-1', undefined, null], material: ['wood', null]};
  for (const [key, values] of Object.entries(invalid)) for (const value of values) {
    const spec = {...sample, [key]: value};
    assert.ok(roofErrors(mapOf(spec)).length, `${key}: ${value}`);
    assert.throws(() => createSlopedRoof(spec), TypeError, `${key}: ${value}`);
  }
  for (const size of [0, -.5, .499, 240.001, NaN, Infinity, '24']) assert.ok(roofErrors(mapOf(), size).length);
  for (const pitch of [5, 75]) for (const z of [1, 5]) for (const seed of [0, 4294967295]) {
    assert.deepEqual(roofErrors(mapOf({...sample, pitch, z, seed, width: .5, depth: .5, overhang: 2})), []);
  }
});

test('ground bounds include the entire overhang in maps and 24-metre blocks without clipping', () => {
  const exact = {...sample, x: 2, y: 2, width: 20, depth: 20, overhang: 2};
  assert.deepEqual(roofErrors(mapOf(exact), 24), []);
  for (const spec of [{...exact, x: 1.999999}, {...exact, y: 2.000001}, {...exact, width: 20.000001}]) {
    assert.ok(roofErrors(mapOf(spec), 24).length);
  }
  const roof = createSlopedRoof(exact);
  assert.deepEqual([roof.bounds.min[0], roof.bounds.min[2], roof.bounds.max[0], roof.bounds.max[2]], [0, 0, 24, 24]);
  assert.deepEqual(roofErrors(mapOf({...sample, x: 0, y: 0, width: 240, depth: 240, overhang: 0})), []);
});

test('gable and shed normals express true pitch on both axes and both shed directions', () => {
  for (const style of ['gable', 'shed']) for (const axis of ['x', 'y']) for (const direction of [1, -1]) {
    for (const pitch of [5, 35, 75]) {
      const roof = createSlopedRoof({...sample, style, axis, direction, pitch});
      for (const n of topNormals(roof)) {
        assert.ok(n[1] > 0);
        near(Math.atan2(Math.hypot(n[0], n[2]), n[1]) * 180 / Math.PI, pitch);
        near(n[axis === 'x' ? 0 : 2], 0);
        if (style === 'shed') assert.equal(Math.sign(n[axis === 'x' ? 2 : 0]), -direction);
      }
      const crossSpan = (axis === 'x' ? sample.depth : sample.width) + sample.overhang * 2;
      near(roof.rise, Math.tan(pitch * Math.PI / 180) * crossSpan / (style === 'shed' ? 1 : 2));
      near(roof.bounds.min[1], sample.z * 2.12 - .12);
      near(roof.bounds.max[1], sample.z * 2.12 + roof.rise);
      near(roof.ridge[0][1], roof.bounds.max[1]);
    }
  }
});

test('all four shed high edges are distinct and symmetric styles ignore direction geometrically', () => {
  const highEdges = new Set();
  for (const axis of ['x', 'y']) for (const direction of [1, -1]) {
    const roof = createSlopedRoof({...sample, style: 'shed', axis, direction});
    const crossAxis = axis === 'x' ? 2 : 0;
    near(roof.ridge[0][crossAxis], direction === 1 ? roof.bounds.max[crossAxis] : roof.bounds.min[crossAxis]);
    near(roof.ridge[1][crossAxis], roof.ridge[0][crossAxis]);
    highEdges.add(JSON.stringify(roof.ridge));
  }
  assert.equal(highEdges.size, 4);
  for (const style of ['gable', 'hip']) {
    const a = createSlopedRoof({...sample, style, direction: 1}), b = createSlopedRoof({...sample, style, direction: -1});
    for (const key of ['positions', 'normals', 'uvs', 'indices', 'bounds']) assert.deepEqual(a[key], b[key]);
  }
});

test('hips preserve equal pitches on long axes and explicitly collapse square/short ridges to a point', () => {
  for (const axis of ['x', 'y']) {
    const long = createSlopedRoof({...sample, style: 'hip', axis, width: axis === 'x' ? 12 : 8, depth: axis === 'x' ? 8 : 12});
    for (const n of topNormals(long)) near(Math.atan2(Math.hypot(n[0], n[2]), n[1]) * 180 / Math.PI, sample.pitch);
    near(length(sub(...long.ridge)), 4);
    const square = createSlopedRoof({...sample, style: 'hip', axis, width: 8, depth: 8});
    assert.deepEqual(square.ridge[0], square.ridge[1]);
    assert.equal(square.metrics.triangles, 16);
    const short = createSlopedRoof({...sample, style: 'hip', axis, width: axis === 'x' ? 8 : 12, depth: axis === 'x' ? 12 : 8});
    assert.deepEqual(short.ridge[0], short.ridge[1]);
    const angles = topNormals(short).map(n => Math.atan2(Math.hypot(n[0], n[2]), n[1]) * 180 / Math.PI);
    near(Math.min(...angles), sample.pitch);
    assert.ok(Math.max(...angles) > sample.pitch);
  }
});

function verifyShell(spec) {
  const roof = createSlopedRoof(spec), edges = new Map(), origin = roof.bounds.min;
  let volume = 0, area = 0;
  assert.ok(roof.positions.every(Number.isFinite));
  assert.ok(roof.normals.every(Number.isFinite));
  assert.ok(roof.uvs.every(Number.isFinite));
  assert.equal(roof.positions.length, roof.normals.length);
  assert.equal(roof.positions.length / 3, roof.uvs.length / 2);
  assert.equal(roof.groups.reduce((n, g) => n + g.count, 0), roof.indices.length);
  assert.ok(roof.metrics.triangles <= 20, 'compact roof budget');
  for (let i = 0; i < roof.indices.length; i += 3) {
    const ids = roof.indices.slice(i, i + 3), p = ids.map(id => point(roof.positions, id));
    const normal = cross(sub(p[1], p[0]), sub(p[2], p[0]));
    assert.ok(length(normal) > 1e-10, `${spec.style}/${spec.axis}: degenerate triangle`);
    area += length(normal) / 2;
    volume += dot(sub(p[0], origin), cross(sub(p[1], origin), sub(p[2], origin))) / 6;
    for (const id of ids) {
      const n = point(roof.normals, id);
      near(length(n), 1);
      assert.ok(dot(normal, n) > 0, 'normal agrees with outward winding');
    }
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const ka = p[a].map(n => n.toFixed(9)).join(','), kb = p[b].map(n => n.toFixed(9)).join(',');
      const key = [ka, kb].sort().join('|'), edge = edges.get(key) || {count: 0, direction: 0};
      edge.count++; edge.direction += ka < kb ? 1 : -1; edges.set(key, edge);
      const uvA = point(roof.uvs, ids[a], 2), uvB = point(roof.uvs, ids[b], 2);
      near(length(sub(p[a], p[b])), length(sub(uvA, uvB)), 'UV edge has physical metre length');
    }
  }
  for (const edge of edges.values()) {assert.equal(edge.count, 2, 'closed manifold edge'); assert.equal(edge.direction, 0, 'opposite edge winding');}
  near(volume, (spec.width + 2 * spec.overhang) * (spec.depth + 2 * spec.overhang) * .12, 'analytical vertical-shell volume');
  near(volume, roof.metrics.enclosedVolume);
  near(area, roof.metrics.surfaceArea);
}

test('closed shells have positive volume, opposite paired edges, unit normals and metre UVs at limits and aspect degeneracies', () => {
  for (const style of ['gable', 'hip', 'shed']) for (const axis of ['x', 'y']) for (const direction of [1, -1]) {
    for (const [width, depth] of [[.5, .5], [.5, 239], [239, .5], [8, 8], [8 + 1e-8, 8], [12, 8]]) {
      for (const pitch of [5, 75]) verifyShell({...sample, x: 0, y: 0, overhang: 0, width, depth, style, axis, direction, pitch});
    }
  }
});

test('seeded paint is reproducible, translation-stable and independent from global random state', () => {
  const savedRandom = Math.random; Math.random = () => {throw Error('Global random state used');};
  try {
    const a = createSlopedRoof(sample), b = createSlopedRoof(structuredClone(sample));
    assert.deepEqual(a, b);
    const other = createSlopedRoof({...sample, seed: 0}), moved = createSlopedRoof({...sample, x: 30, y: 50});
    for (const key of ['positions', 'normals', 'indices', 'groups', 'bounds']) assert.deepEqual(a[key], other[key]);
    assert.notDeepEqual(a.uvs, other.uvs); assert.notDeepEqual(a.colors, other.colors);
    for (const key of ['normals', 'indices', 'colors']) assert.deepEqual(a[key], moved[key]);
    for (let i = 0; i < a.uvs.length; i++) near(a.uvs[i], moved.uvs[i]);
    assert.equal(other.spec.seed, 0);
  } finally {Math.random = savedRandom;}
});

test('host Three adapter preserves geometry, bounds and borrowed material ownership', () => {
  const shared = new THREE.MeshStandardMaterial({color: 0x123456}), map = new Map([['slate', shared], ['fascia', shared], ['soffit', shared]]);
  let materialDisposals = 0, geometryDisposals = 0;
  shared.addEventListener('dispose', () => materialDisposals++);
  const root = createRoofGroup(THREE, sample, {materialMap: map}), mesh = root.children[0], data = createSlopedRoof(sample);
  assert.ok(root.isGroup && mesh.isMesh); assert.equal(mesh.material.length, 3);
  assert.ok(mesh.material.every(m => m === shared));
  assert.deepEqual(mesh.geometry.index.array.length, data.indices.length);
  assert.deepEqual(mesh.geometry.groups, data.groups);
  assert.deepEqual(root.userData.spec, sample);
  assert.deepEqual(root.scale.toArray(), [1, 1, 1]);
  const bounds = new THREE.Box3().setFromObject(root);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(bounds.min.toArray()[i] - data.bounds.min[i]) < .00002);
    assert.ok(Math.abs(bounds.max.toArray()[i] - data.bounds.max[i]) < .00002);
  }
  mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  new THREE.Scene().add(root); root.dispose(); root.dispose();
  assert.equal(root.parent, null); assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 0);
  shared.dispose();
});

test('painted adapter maps every roof material explicitly without altering or disposing host atlas/textures', () => {
  const atlas = new THREE.Texture(), texture = new THREE.Texture();
  let disposed = 0; atlas.addEventListener('dispose', () => disposed++); texture.addEventListener('dispose', () => disposed++);
  const original = atlas.toJSON();
  for (const material of ['slate', 'clay', 'metal']) {
    const root = createRoofGroup(THREE, {...sample, material}, {atlas}), mesh = root.children[0];
    assert.deepEqual(mesh.material.map(m => m.userData.atlasTile), [PAINTED_ROOF_MATERIALS[material].tile, 14, 5]);
    for (const m of mesh.material) {
      const shader = {fragmentShader: '#include <map_fragment>'}; m.onBeforeCompile(shader);
      assert.ok(shader.fragmentShader.includes('textureGrad( map,'));
      assert.ok(shader.fragmentShader.includes('fract(vMapUv)'));
      assert.ok(shader.fragmentShader.includes('dFdx(vMapUv)'));
    }
    root.dispose();
  }
  const tileable = createRoofGroup(THREE, sample, {textures: {slate: texture}});
  assert.equal(tileable.children[0].material[0].map, texture); tileable.dispose();
  assert.deepEqual(atlas.toJSON(), original); assert.equal(disposed, 0);
  atlas.dispose(); texture.dispose();
});

test('adapter rejects invalid resources and disposes already-owned resources on partial failure', () => {
  assert.throws(() => createRoofGroup({}, sample), /host Three/);
  for (const options of [null, [], {atlas: {}}, {textures: {slate: {}}}, {materialMap: {slate: {}}}, {materialMap: 3}]) {
    assert.throws(() => createRoofGroup(THREE, sample, options), TypeError);
  }
  let materialDisposals = 0, geometryDisposals = 0;
  class Geometry extends THREE.BufferGeometry {dispose() {geometryDisposals++; super.dispose();}}
  class Material extends THREE.MeshStandardMaterial {dispose() {materialDisposals++; super.dispose();}}
  const host = {...THREE, BufferGeometry: Geometry, MeshStandardMaterial: Material};
  assert.throws(() => createRoofGroup(host, sample, {materialMap: {fascia: {}}}), TypeError);
  assert.equal(materialDisposals, 1); assert.equal(geometryDisposals, 1);
  assert.throws(() => createRoofGroup({...host, ShaderChunk: {}}, sample, {atlas: new THREE.Texture()}), /explicit painted-roof adapter/);
  assert.equal(geometryDisposals, 2); assert.equal(materialDisposals, 1);
});
