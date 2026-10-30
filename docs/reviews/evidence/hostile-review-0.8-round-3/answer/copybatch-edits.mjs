// Round 3's instancing-edits.mjs (its reviewer's probe), adapted to CopyBatch: copy batches
// under edits, undo/redo, overlapping (stale) updates and views.
//   node copybatch-edits.mjs <tree> <out.json>
// Differential oracle: a batching PrefabLayer against one with batching off, fed the same
// documents. Per material key, the drawn triangles' count, centroid sums and bounds must
// agree (copy k drawn at mesh.matrixWorld x its batched matrix k). Also counts the
// CopyBatch objects created, disposed and still in the scene.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [tree, out] = process.argv.slice(2).map(p => path.resolve(p));
const imp = p => import(pathToFileURL(path.join(tree, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {PrefabLayer} = await imp('apps/editor/prefab-scene.js');
const {CopyBatch} = await imp('apps/editor/copy-batch.js');
const {createPrefabProviders} = await imp('apps/editor/prefab-providers.js');
const {createOriginalBuildingProvider} = await imp('packages/prefab-core/provider-original.js');
const core = await imp('packages/map-core/index.js'), prefab = await imp('packages/prefab-core/index.js');

let created = 0, disposed = 0;
const origDispose = CopyBatch.prototype.dispose, origSphere = CopyBatch.prototype.computeBoundingSphere;
CopyBatch.prototype.dispose = function (...a) {disposed++; return origDispose.apply(this, a);};
// The constructor calls computeBoundingSphere() once: count creations there.
CopyBatch.prototype.computeBoundingSphere = function (...a) {created++; return origSphere.apply(this, a);};

const providers = () => createPrefabProviders(T, {original: createOriginalBuildingProvider(T, {loadTexture: async () => new T.Texture()})});
const sceneA = new T.Scene(), sceneB = new T.Scene();
const inst = new PrefabLayer(sceneA, {}, () => {}, e => {throw e;}, {providers: providers()});
const ref = new PrefabLayer(sceneB, {}, () => {}, e => {throw e;}, {providers: providers(), instancing: false});

let map = core.blankMap('copy batch edits');
for (const [i, x] of [6, 30, 54, 78].entries()) map = prefab.placeBuilding(map, {asset: 'dockside-warehouse', x, y: 6, turns: i % 2, clearance: 1}).map;
map = prefab.placeBuilding(map, {asset: 'bramble-ranch', x: 6, y: 40, turns: 0, clearance: 1}).map;
const doc = core.openDocument(map);
const OPTIONS = {level: 0, showAllLevels: true, roofs: true, walls: true}, CUT = {level: 0, showAllLevels: false, roofs: true, walls: true};
const key = m => [m.type, m.color?.getHexString(), m.transparent, m.opacity, m.side, m.polygonOffset].join('/');
const shown = node => {for (let n = node; n; n = n.parent) if (!n.visible) return false; return true;};
function drawn(scene) {
  scene.updateMatrixWorld(true);
  const acc = new Map(), v = new T.Vector3(), c = new T.Vector3(), M = new T.Matrix4(), I = new T.Matrix4();
  scene.traverse(mesh => {
    if (!mesh.isMesh || !shown(mesh)) return;
    const g = mesh.geometry, pos = g.attributes.position, index = g.index, copies = mesh.isBatchedMesh ? mesh.instanceCount : 1;
    const groups = Array.isArray(mesh.material) ? g.groups.map(gr => [gr.start, gr.count, mesh.material[gr.materialIndex]]) : [[0, index ? index.count : pos.count, mesh.material]];
    for (let k = 0; k < copies; k++) {
      M.copy(mesh.matrixWorld); if (mesh.isBatchedMesh) M.multiply(mesh.getMatrixAt(k, I));
      for (const [start, count, material] of groups) {
        const id = key(material); let a = acc.get(id); if (!a) acc.set(id, a = {n: 0, sx: 0, sy: 0, sz: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity]});
        for (let t = start; t < start + count; t += 3) {
          c.set(0, 0, 0);
          for (let j = 0; j < 3; j++) {v.fromBufferAttribute(pos, index ? index.getX(t + j) : t + j).applyMatrix4(M); c.add(v); for (let d = 0; d < 3; d++) {a.min[d] = Math.min(a.min[d], v.getComponent(d)); a.max[d] = Math.max(a.max[d], v.getComponent(d));}}
          c.divideScalar(3); a.n++; a.sx += c.x; a.sy += c.y; a.sz += c.z;
        }
      }
    }
  });
  return acc;
}
const steps = [];
function compare(label) {
  const A = drawn(sceneA), B = drawn(sceneB), problems = [];
  for (const id of new Set([...A.keys(), ...B.keys()])) {
    const a = A.get(id), b = B.get(id);
    if (!a || !b) {problems.push(id + ' only in ' + (a ? 'batched' : 'reference')); continue;}
    if (a.n !== b.n) problems.push(id + ' triangles ' + a.n + ' vs ' + b.n);
    for (const s of ['sx', 'sy', 'sz']) if (Math.abs(a[s] - b[s]) > 1e-3 * Math.max(1, Math.abs(b[s]))) problems.push(id + ' ' + s + ' ' + a[s].toFixed(3) + ' vs ' + b[s].toFixed(3));
    for (let d = 0; d < 3; d++) if (Math.abs(a.min[d] - b.min[d]) > 1e-3 || Math.abs(a.max[d] - b.max[d]) > 1e-3) problems.push(id + ' bounds axis ' + d);
  }
  const live = sceneA.children.filter(n => n.isBatchedMesh).length;
  const row = {step: label, batches: inst.instanced.length, liveBatchesInScene: live, orphanBatches: live - inst.instanced.length, triangles: [...A.values()].reduce((n, a) => n + a.n, 0), referenceTriangles: [...B.values()].reduce((n, a) => n + a.n, 0), ok: !problems.length, problems: problems.slice(0, 5)};
  steps.push(row); console.log(JSON.stringify(row));
}
const both = async (document, options = OPTIONS) => {await inst.update(document, options); await ref.update(document, options);};
const snap = () => ({map: structuredClone(doc.map)});
try {
  await both(doc); compare('initial: 4 copies + 1 single');
  const ids = doc.map.buildingPrefabs.instances.filter(i => i.asset === 'dockside-warehouse').map(i => i.id);
  if (!doc.rotate({type: 'building', data: {id: ids[1]}}).ok) throw Error('rotate failed');
  await both(doc); compare('rotate one copy');
  {const m = structuredClone(doc.map); m.buildingPrefabs.instances = m.buildingPrefabs.instances.filter(i => i.id === ids[0] || i.asset !== 'dockside-warehouse'); doc.replace(m);}
  await both(doc); compare('remove three copies: one left, not batched');
  doc.undo(); await both(doc); compare('undo: four copies again');
  doc.undo(); await both(doc); compare('undo: rotation undone');
  doc.redo(); await both(doc); compare('redo: rotated');
  await both(doc, CUT); compare('cutaway view');
  await both(doc, OPTIONS); compare('back to all levels');
  // Overlapping updates: the first is stale when the second starts.
  doc.redo(); const later = snap(); doc.undo(); const earlier = snap();
  const p1 = inst.update(earlier, OPTIONS), p2 = inst.update(later, OPTIONS); await Promise.all([p1, p2]); await ref.update(later, OPTIONS); compare('overlapping updates (stale first)');
  const p3 = inst.update(later, CUT), p4 = inst.update(earlier, OPTIONS); await Promise.all([p3, p4]); await ref.update(earlier, OPTIONS); compare('overlapping updates, view and document both change');
} finally {
  inst.dispose(); ref.dispose(); CopyBatch.prototype.dispose = origDispose; CopyBatch.prototype.computeBoundingSphere = origSphere;
}
const result = {script: 'copybatch-edits.mjs (round 3\'s instancing-edits.mjs adapted)', steps, copyBatchesCreated: created, copyBatchDisposeCalls: disposed, leftInScene: sceneA.children.length, allOk: steps.every(s => s.ok && s.orphanBatches === 0)};
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({allOk: result.allOk, created, disposed, leftInScene: result.leftInScene}));
