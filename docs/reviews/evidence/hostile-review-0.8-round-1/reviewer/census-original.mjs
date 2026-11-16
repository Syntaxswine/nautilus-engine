// Census of packages/building-catalog/three.js (createBuildingModel) for all 48
// original designs at `game` and `authoring` LOD, headless in Node.
//  - exact per-function call counts (V8 precise coverage), load-independent
//  - meshes / doors / triangles / vertices / attribute bytes / materials per model
//  - build time: 1 warm-up + 7 timed builds per design and LOD (median, spread)
//  - CPU self-time hot spots (V8 sampling profiler) and allocation sampling
//  - a geometry fingerprint per design and LOD (SHA-256 over every mesh's name,
//    userData, transform and attribute bytes) so a speed change can be checked
//    for byte identity; a negative control shows the fingerprint can fail.
// Usage: node artifacts/r08-1/census-original.mjs
import {Session} from 'node:inspector/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {sandbox, nodeRig, stats, writeResult, mask} from './lib/common.mjs';

const T = await import(pathToFileURL(path.join(sandbox, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
const threeURL = pathToFileURL(path.join(sandbox, 'packages/building-catalog/three.js')).href;
const {createBuildingModel} = await import(threeURL);
const {DESIGNS, compileBuilding} = await import(pathToFileURL(path.join(sandbox, 'packages/building-catalog/index.js')).href);
const source = fs.readFileSync(path.join(sandbox, 'packages/building-catalog/three.js'), 'utf8');
const lineOf = (offset) => source.slice(0, offset).split('\n').length;
const atlas = new T.Texture();
const LODS = ['game', 'authoring'];
const REPS = Number(process.env.REPS || 7);

function census(model) {
  let meshes = 0, doorMeshes = 0, triangles = 0, vertices = 0, bytes = 0, castShadow = 0, glassMeshes = 0;
  const kinds = {}, levels = new Set(), geometries = new Set(), usedMaterials = new Set();
  model.root.traverse((o) => {
    if (!o.isMesh) return;
    meshes++; const g = o.geometry; geometries.add(g); usedMaterials.add(o.material);
    const n = g.attributes.position.count; vertices += n; triangles += (g.index?.count || n) / 3;
    for (const a of Object.values(g.attributes)) bytes += a.array.byteLength;
    if (o.castShadow) castShadow++;
    if (o.material.transparent) glassMeshes++;
    const kind = o.userData.kind; kinds[kind] = (kinds[kind] || 0) + 1; levels.add(o.userData.level);
    if (kind === 'door-leaf') doorMeshes++;
  });
  return {meshes, doorPivots: model.doorRoots.length, doorLeafMeshes: doorMeshes, structureMeshes: meshes - doorMeshes, triangles, vertices,
    attributeMiB: Math.round(bytes / 2 ** 20 * 1000) / 1000, geometries: geometries.size, materialsCreated: model.materials.size,
    materialsUsed: usedMaterials.size, transparentMeshes: glassMeshes, castShadowMeshes: castShadow, rootChildren: model.root.children.length,
    kinds, levels: [...levels].sort((a, b) => a - b), reportedTriangles: model.triangles};
}

function fingerprint(model) {
  const h = createHash('sha256');
  model.root.updateMatrixWorld(true);
  model.root.traverse((o) => {
    h.update(o.type + '|' + o.name + '|' + JSON.stringify(o.userData, (k, v) => (typeof v === 'number' ? Number(v.toPrecision(12)) : v)) + '|');
    h.update(new Uint8Array(Float64Array.from(o.matrixWorld.elements).buffer));
    if (o.isMesh) {
      const m = o.material;
      h.update([m.type, m.color.getHexString(), m.opacity, m.transparent, m.side, m.roughness, m.metalness, !!m.map].join(','));
      for (const name of Object.keys(o.geometry.attributes).sort()) {
        const a = o.geometry.attributes[name];
        h.update(name + a.itemSize); h.update(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength));
      }
    }
  });
  return h.digest('hex');
}

const session = new Session();
session.connect();
await session.post('Profiler.enable');

// 1. Exact call counts per LOD (one build of every design).
const callCounts = {};
for (const lod of LODS) {
  await session.post('Profiler.startPreciseCoverage', {callCount: true, detailed: false});
  for (const d of DESIGNS) createBuildingModel(T, d.id, {atlas, lod}).dispose();
  const {result} = await session.post('Profiler.takePreciseCoverage');
  await session.post('Profiler.stopPreciseCoverage');
  const script = result.find((s) => s.url === threeURL);
  const rows = script.functions.filter((f) => f.ranges[0].count > 0).map((f) => ({fn: f.functionName || '(anonymous)', line: lineOf(f.ranges[0].startOffset), calls: f.ranges[0].count}));
  rows.sort((a, b) => b.calls - a.calls);
  callCounts[lod] = {totalCalls: rows.reduce((n, r) => n + r.calls, 0), top: rows.slice(0, 30)};
}

// 2. Per-design census, fingerprint and timing.
const perDesign = [];
const totals = {};
for (const lod of LODS) totals[lod] = {meshes: 0, doorPivots: 0, triangles: 0, vertices: 0, attributeMiB: 0, buildMsMedianSum: 0, geometries: 0, materialsCreated: 0};
for (const d of DESIGNS) {
  const row = {id: d.id, category: d.category, stories: compileBuilding(d.id).stories};
  for (const lod of LODS) {
    const model = createBuildingModel(T, d.id, {atlas, lod});
    const c = census(model), fp = fingerprint(model);
    model.dispose();
    const samples = [];
    createBuildingModel(T, d.id, {atlas, lod}).dispose();
    for (let i = 0; i < REPS; i++) {
      const t0 = performance.now(); const m = createBuildingModel(T, d.id, {atlas, lod}); samples.push(performance.now() - t0); m.dispose();
    }
    row[lod] = {...c, fingerprint: fp, buildMs: stats(samples)};
    for (const k of Object.keys(totals[lod])) if (k !== 'buildMsMedianSum') totals[lod][k] += c[k] ?? 0;
    totals[lod].buildMsMedianSum += row[lod].buildMs.median;
  }
  perDesign.push(row);
}
for (const lod of LODS) totals[lod].attributeMiB = Math.round(totals[lod].attributeMiB * 1000) / 1000, totals[lod].buildMsMedianSum = Math.round(totals[lod].buildMsMedianSum);

// 3. Negative control: the fingerprint must change when one float changes.
const control = (() => {
  const a = createBuildingModel(T, DESIGNS[0].id, {atlas, lod: 'game'}), before = fingerprint(a);
  const mesh = a.root.children.find((o) => o.isMesh); mesh.geometry.attributes.position.array[7] += 1e-6;
  const after = fingerprint(a); a.dispose();
  const b = createBuildingModel(T, DESIGNS[0].id, {atlas, lod: 'game'}), again = fingerprint(b); b.dispose();
  return {design: DESIGNS[0].id, unchangedRebuildMatches: again === before, oneFloatPerturbedDiffers: after !== before};
})();

// 4. CPU self-time hot spots and allocation sampling over one pass of all 48 game builds.
async function profilePass(lod) {
  await session.post('Profiler.setSamplingInterval', {interval: 100});
  await session.post('Profiler.start');
  for (let r = 0; r < 3; r++) for (const d of DESIGNS) createBuildingModel(T, d.id, {atlas, lod}).dispose();
  const {profile} = await session.post('Profiler.stop');
  const self = new Map(); let total = 0;
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; const counts = new Map();
  profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dt[i] || 0)));
  for (const [id, us] of counts) {
    const n = byId.get(id), cf = n.callFrame, file = cf.url ? cf.url.split('/').slice(-2).join('/') : '(native)';
    const key = (cf.functionName || '(anonymous)') + ' ' + file + ':' + (cf.lineNumber + 1);
    self.set(key, (self.get(key) || 0) + us); total += us;
  }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([fn, us]) => ({fn, selfMs: Math.round(us / 1000), pct: Math.round(us / total * 1000) / 10}));
  const byFile = {};
  for (const [key, us] of self) { const file = key.split(' ').slice(1).join(' ').replace(/:\d+$/, ''); byFile[file] = (byFile[file] || 0) + us; }
  const files = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([file, us]) => ({file, pct: Math.round(us / total * 1000) / 10}));
  return {lod, passes: 3, sampledMs: Math.round(total / 1000), topSelf: top, byFile: files};
}
const profiles = [];
for (const lod of LODS) profiles.push(await profilePass(lod));

await session.post('HeapProfiler.enable');
await session.post('HeapProfiler.startSampling', {samplingInterval: 32768});
for (const d of DESIGNS) createBuildingModel(T, d.id, {atlas, lod: 'game'}).dispose();
const {profile: heap} = await session.post('HeapProfiler.stopSampling');
const allocations = new Map(); let allocTotal = 0;
(function walk(node) {
  const cf = node.callFrame, file = cf.url ? cf.url.split('/').slice(-2).join('/') : '(native)', key = (cf.functionName || '(anonymous)') + ' ' + file + ':' + (cf.lineNumber + 1);
  const size = node.selfSize; allocations.set(key, (allocations.get(key) || 0) + size); allocTotal += size; node.children.forEach(walk);
})(heap.head);
const allocTop = [...allocations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([fn, b]) => ({fn, sampledMiB: Math.round(b / 2 ** 20 * 10) / 10, pct: Math.round(b / allocTotal * 1000) / 10}));
session.disconnect();

const largestGame = [...perDesign].sort((a, b) => b.game.triangles - a.game.triangles).slice(0, 10).map((r) => ({id: r.id, triangles: r.game.triangles, meshes: r.game.meshes, doorPivots: r.game.doorPivots, buildMs: r.game.buildMs.median}));
const mostMeshes = [...perDesign].sort((a, b) => b.game.meshes - a.game.meshes).slice(0, 10).map((r) => ({id: r.id, meshes: r.game.meshes, doorPivots: r.game.doorPivots, triangles: r.game.triangles}));
const catalogueFingerprint = createHash('sha256').update(perDesign.map((r) => r.id + r.game.fingerprint + r.authoring.fingerprint).join('|')).digest('hex');
const file = writeResult('census-original.json', {
  rig: nodeRig(), method: 'Headless Node, vendored three r' + T.REVISION + ' (AFT 781246a), placeholder atlas Texture. Timings: 1 warm-up + ' + REPS + ' timed builds per design and LOD; machine shared, indicative only. Call counts are exact (V8 precise coverage) and load-independent.',
  designs: DESIGNS.length, totals, largestGameByTriangles: largestGame, mostGameMeshes: mostMeshes, callCounts, profiles, allocationSampling: {lod: 'game', samplingIntervalBytes: 32768, sampledTotalMiB: Math.round(allocTotal / 2 ** 20), top: allocTop},
  fingerprintControl: control, catalogueFingerprint, perDesign,
});
console.log(mask(JSON.stringify({file, totals, control, catalogueFingerprint, callsTop: callCounts.game.top.slice(0, 12), hot: profiles[0].topSelf.slice(0, 10), byFile: profiles[0].byFile, allocTop: allocTop.slice(0, 6), largestGame}, null, 1)));
