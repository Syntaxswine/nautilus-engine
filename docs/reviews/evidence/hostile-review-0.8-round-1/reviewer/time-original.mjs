// Clean build-time measurement (no inspector session attached, which would
// perturb V8 optimisation): createBuildingModel for all 48 designs at both LODs,
// split into compileBuilding (headless) and geometry generation, plus the public
// facade loadBuildingAssets().create() versus the editor's template+clone.
// 1 warm-up + 7 timed runs each; wall-clock and process CPU time.
// Usage: node artifacts/r08-1/time-original.mjs
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {sandbox, nodeRig, stats, writeResult} from './lib/common.mjs';

const imp = (p) => import(pathToFileURL(path.join(sandbox, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {createBuildingModel} = await imp('packages/building-catalog/three.js');
const {DESIGNS, compileBuilding} = await imp('packages/building-catalog/index.js');
const {loadBuildingAssets} = await imp('packages/assets/three.js');
const atlas = new T.Texture(), REPS = 7;
const cpu = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
function measure(fn) {
  fn();
  const wall = [], cpuMs = [];
  for (let i = 0; i < REPS; i++) { const c0 = cpu(), t0 = performance.now(); fn(); wall.push(performance.now() - t0); cpuMs.push(cpu() - c0); }
  return {wall: stats(wall), cpu: stats(cpuMs)};
}
const rows = [];
const totals = {compileWallMedianSum: 0, gameWallMedianSum: 0, authoringWallMedianSum: 0, gameCpuMedianSum: 0};
for (const d of DESIGNS) {
  const compiled = compileBuilding(d.id);
  const row = {id: d.id,
    compile: measure(() => compileBuilding(d.id)),
    game: measure(() => createBuildingModel(T, compiled, {atlas, lod: 'game'}).dispose()),
    authoring: measure(() => createBuildingModel(T, compiled, {atlas, lod: 'authoring'}).dispose())};
  totals.compileWallMedianSum += row.compile.wall.median; totals.gameWallMedianSum += row.game.wall.median; totals.authoringWallMedianSum += row.authoring.wall.median; totals.gameCpuMedianSum += row.game.cpu.median;
  rows.push(row);
}
for (const k of Object.keys(totals)) totals[k] = Math.round(totals[k]);
// Public facade vs template+clone for 32 instances of the largest design.
const id = 'dockside-warehouse';
const assets = await loadBuildingAssets(T, {providers: ['original'], loadTexture: async () => new T.Texture()});
const geometriesOf = (roots) => { const g = new Set(); for (const r of roots) r.traverse((o) => { if (o.isMesh) g.add(o.geometry); }); return g.size; };
let facadeGeoms = 0, cloneGeoms = 0;
const facade = measure(() => { const list = Array.from({length: 32}, () => assets.create(id)); facadeGeoms = geometriesOf(list.map((x) => x.root)); list.forEach((x) => x.dispose()); });
const templateClone = measure(() => { const m = createBuildingModel(T, id, {atlas, lod: 'game'}); const clones = Array.from({length: 32}, () => m.root.clone(true)); cloneGeoms = geometriesOf(clones); m.dispose(); });
assets.dispose();
writeResult('time-original.json', {rig: nodeRig(), method: 'No inspector attached. 1 warm-up + ' + REPS + ' timed runs; wall = performance.now(), cpu = process.cpuUsage() (user+system, all threads). createBuildingModel receives the precompiled blueprint so compile time is separate.',
  totals, facadeVsTemplate: {design: id, instances: 32, facadeCreate32: {...facade, uniqueGeometries: facadeGeoms}, templatePlusClone32: {...templateClone, uniqueGeometries: cloneGeoms}}, rows});
console.log(JSON.stringify({totals, facade: facade.wall, facadeGeoms, templateClone: templateClone.wall, cloneGeoms, slowest: [...rows].sort((a, b) => b.game.wall.median - a.game.wall.median).slice(0, 6).map((r) => [r.id, r.compile.wall.median, r.game.wall.median, r.game.wall.spreadPct])}, null, 1));
