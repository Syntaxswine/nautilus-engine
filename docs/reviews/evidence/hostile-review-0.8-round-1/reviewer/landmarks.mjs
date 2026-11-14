// Tinderbox 1893 Exposition landmarks "from native Nautilus panels".
// 1. Copies each landmark's runtime import closure out of Tinderbox Git objects
//    (git show; the donor checkout is never touched) into donor/<commit>/.
// 2. Builds each landmark in Node with Nautilus's vendored three (r180), as the
//    actor-height intake did, and measures: mesh nodes, InstancedMesh batches,
//    drawn instances, triangles (instance-multiplied), geometries, materials,
//    shadow casters, build time (1 warm-up + 7 timed), and the exact share of
//    calls/time inside Nautilus code (packages/map-core/wall-runs.js).
// Usage: node artifacts/r08-1/landmarks.mjs
import fs from 'node:fs';
import path from 'node:path';
import {Session} from 'node:inspector/promises';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {sandbox, evidenceDir, donors, git, gitBuffer, writeResult, nodeRig, stats, mask} from './lib/common.mjs';

const TB = donors.tinderbox;
const targets = [
  {commit: '43337a33ddfe4dff6849654c827c56e1f24e1acc', branch: 'codex/administration-building-art', entry: 'assets/art/exposition-administration/index.js', factory: 'createAdministrationBuilding'},
  {commit: '988b4aca32343c9f2e566db74bb018c705820742', branch: 'codex/landmark-interiors-art', entry: 'assets/art/exposition-horticulture/index.js', factory: 'createHorticulturalBuilding'},
  {commit: 'f75499a3ef60d6446a3885d0eb5c21882f27466b', branch: 'codex/fisheries-building-art', entry: 'assets/art/exposition-fisheries/index.js', factory: 'createFisheriesBuilding'},
  {commit: 'a019fcf7254cebe24002441d7c7fdf77d6fc9812', branch: 'codex/horticultural-building-art', entry: 'assets/art/exposition-horticulture/index.js', factory: 'createHorticulturalBuilding'},
  {commit: '988b4aca32343c9f2e566db74bb018c705820742', branch: 'codex/landmark-interiors-art', entry: 'assets/art/exposition-administration/index.js', factory: 'createAdministrationBuilding'},
];
const nautilusWallRunsBlob = git(['rev-parse', 'HEAD:packages/map-core/wall-runs.js']).trim();

function closure(commit, entry) {
  const files = new Map(), queue = [entry];
  while (queue.length) {
    const file = queue.shift(); if (files.has(file)) continue;
    const bytes = gitBuffer(['show', commit + ':' + file], TB), blob = git(['rev-parse', commit + ':' + file], TB).trim();
    files.set(file, {bytes, blob});
    const text = bytes.toString('utf8');
    for (const m of text.matchAll(/(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
      const spec = m[1] || m[2]; queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)));
    }
  }
  return files;
}

const T = await import(pathToFileURL(path.join(sandbox, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
const session = new Session(); session.connect(); await session.post('Profiler.enable');
const out = [];
for (const target of targets) {
  const dir = path.join(evidenceDir, 'donor', 'tinderbox-' + target.commit.slice(0, 7));
  const files = closure(target.commit, target.entry);
  for (const [file, {bytes}] of files) { const p = path.join(dir, file); fs.mkdirSync(path.dirname(p), {recursive: true}); if (!fs.existsSync(p)) fs.writeFileSync(p, bytes); }
  const manifest = [...files].map(([file, {bytes, blob}]) => ({file, blob, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')}));
  const wallRuns = manifest.find((f) => f.file.endsWith('packages/map-core/wall-runs.js'));
  const entryURL = pathToFileURL(path.join(dir, target.entry)).href;
  const mod = await import(entryURL);
  const factory = mod[target.factory];
  // Census of one build.
  const t0 = performance.now(); const b = factory(T, {}); const firstMs = performance.now() - t0;
  b.root.updateMatrixWorld(true);
  let meshNodes = 0, instanced = 0, instances = 0, triangles = 0, castShadow = 0, transparent = 0, singletons = 0; const geoms = new Set(), mats = new Set(), slots = {};
  b.root.traverse((o) => {
    if (!o.isMesh) return; meshNodes++; geoms.add(o.geometry); mats.add(o.material); if (o.castShadow) castShadow++; if (o.material.transparent) transparent++;
    const g = o.geometry, tris = (g.index ? g.index.count : g.attributes.position.count) / 3, count = o.isInstancedMesh ? o.count : 1;
    triangles += tris * count; if (o.isInstancedMesh) { instanced++; instances += o.count; } else singletons++;
    const slot = o.userData.appearanceSlot || 'none'; slots[slot] = (slots[slot] || 0) + 1;
  });
  const diag = b.diagnostics?.();
  b.dispose();
  // Build time.
  factory(T, {}).dispose();
  const samples = [];
  for (let i = 0; i < 7; i++) { const s0 = performance.now(); const x = factory(T, {}); samples.push(performance.now() - s0); x.dispose(); }
  // Exact calls and sampled time inside Nautilus code.
  await session.post('Profiler.startPreciseCoverage', {callCount: true, detailed: false});
  factory(T, {}).dispose();
  const {result} = await session.post('Profiler.takePreciseCoverage'); await session.post('Profiler.stopPreciseCoverage');
  const callsByFile = {};
  for (const script of result) {
    if (!script.url.startsWith(pathToFileURL(dir).href) && !script.url.includes('three.')) continue;
    const short = script.url.includes('three.') ? 'nautilus vendored three (host)' : script.url.slice(pathToFileURL(dir).href.length + 1);
    callsByFile[short] = (callsByFile[short] || 0) + script.functions.reduce((n, f) => n + f.ranges[0].count, 0);
  }
  const wallRunsCalls = Object.entries(callsByFile).filter(([f]) => f.endsWith('wall-runs.js')).reduce((n, [, c]) => n + c, 0);
  const totalCalls = Object.values(callsByFile).reduce((n, c) => n + c, 0);
  await session.post('Profiler.setSamplingInterval', {interval: 100}); await session.post('Profiler.start');
  for (let i = 0; i < 5; i++) factory(T, {}).dispose();
  const {profile} = await session.post('Profiler.stop');
  const byId = new Map(profile.nodes.map((n) => [n.id, n])); let total = 0, inWallRuns = 0; const byFile = {};
  profile.samples.forEach((id, i) => { const us = profile.timeDeltas[i] || 0, url = byId.get(id).callFrame.url || '(native)'; total += us; if (url.endsWith('wall-runs.js')) inWallRuns += us; const short = url.startsWith('file:') ? url.split('/').slice(-2).join('/') : url; byFile[short] = (byFile[short] || 0) + us; });
  out.push({
    landmark: target.factory, entry: target.entry, commit: target.commit, branch: target.branch,
    closure: {files: manifest.length, bytes: manifest.reduce((n, f) => n + f.bytes, 0), manifest},
    nautilusWallRunsBlob: wallRuns?.blob, sameBlobAsNautilusMain: wallRuns?.blob === nautilusWallRunsBlob,
    census: {meshNodes, instancedMeshBatches: instanced, singletonMeshes: singletons, drawnInstances: instances, triangles, uniqueGeometries: geoms.size, uniqueMaterials: mats.size, castShadowNodes: castShadow, transparentNodes: transparent, appearanceSlotNodes: slots,
      drawCallsPerPassEstimate: meshNodes, note: 'Every node is a single-material Mesh or InstancedMesh: one draw call per visible node per pass; all cast shadows, so the sun shadow pass repeats them.'},
    diagnosticsKeys: diag ? Object.keys(diag) : null, diagnostics: diag ? Object.fromEntries(Object.entries(diag).filter(([, v]) => typeof v !== 'object' || v === null || Array.isArray(v) && v.length < 20)) : null,
    buildMs: {first: Math.round(firstMs), repeated: stats(samples)},
    nautilusShare: {exactCallsInWallRuns: wallRunsCalls, exactCallsTotalInstrumented: totalCalls, callShareCompiledJsPct: Math.round(wallRunsCalls / totalCalls * 10000) / 100,
      sampledTimeInWallRunsPct: Math.round(inWallRuns / total * 10000) / 100, sampledMs: Math.round(total / 1000),
      topFilesByTimePct: Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, us]) => ({file: f, pct: Math.round(us / total * 1000) / 10}))},
  });
  console.log(target.factory, target.commit.slice(0, 7), JSON.stringify({meshNodes, instanced, instances, triangles, geoms: geoms.size, mats: mats.size, build: stats(samples).median, wallRunsCalls, totalCalls, inWallRunsPct: Math.round(inWallRuns / total * 10000) / 100}));
}
session.disconnect();
writeResult('landmarks.json', {rig: nodeRig(), method: 'Closure copied from Tinderbox Git objects (git show) into artifacts/r08-1/donor/; built in Node with the Nautilus-vendored three r' + T.REVISION + ' and default (unbound) appearance slots. No DOM/WebGL: draw calls are a per-node estimate (validated for Nautilus paths in the browser census).', nautilusMainWallRunsBlob: nautilusWallRunsBlob, landmarks: out});
