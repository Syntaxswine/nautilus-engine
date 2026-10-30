// Headless timing (and optional profile) of InspectionScene.prototype.rebuildWalls
// for main's and this tree's wall-scene.js on a workload map's wall runs.
//   node wall-rebuild-node.mjs <tree a> <tree b> <map.json> [--profile b]
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {Session} from 'node:inspector/promises';
const [a, b, mapFile, flag, profileArm] = process.argv.slice(2), map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
async function load(dir) {
  const T = await import(pathToFileURL(path.join(dir, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
  const {InspectionScene} = await import(pathToFileURL(path.join(dir, 'apps/editor/wall-scene.js')).href);
  const methods = InspectionScene.prototype;
  const scene = {wallGroup: new T.Group(), wallGeometries: new Map(), wallMaterials: new Map(), visibleLevel: 5, options: {walls: true, level: 0, showAllLevels: true}, dim: m => m, changed() {}, document: {map}};
  scene.wallMaterial = (...args) => methods.wallMaterial.call(scene, ...args);
  return () => methods.rebuildWalls.call(scene);
}
const arms = {a: await load(a), b: await load(b)}, samples = {a: [], b: []};
for (const arm of ['a', 'b']) for (let i = 0; i < 3; i++) arms[arm](); // warm
let session;
if (flag === '--profile') {session = new Session(); session.connect(); await session.post('Profiler.enable'); await session.post('Profiler.setSamplingInterval', {interval: 50}); await session.post('Profiler.start');}
for (let r = 0; r < 8; r++) for (const arm of [0, 3].includes(r % 4) ? ['a', 'b'] : ['b', 'a']) {
  if (session && arm !== profileArm) continue;
  for (let i = 0; i < 5; i++) {const t = performance.now(); arms[arm](); samples[arm].push(performance.now() - t);}
}
const median = v => {const s = [...v].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
console.log(JSON.stringify({a: samples.a.length ? +median(samples.a).toFixed(2) : null, b: samples.b.length ? +median(samples.b).toFixed(2) : null}));
if (session) {
  const {profile} = await session.post('Profiler.stop'), self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
  profile.samples.forEach((id, i) => {const f = byId.get(id).callFrame, k = (f.functionName || '(anon)') + ' ' + f.url.split('/').slice(-1)[0] + ':' + (f.lineNumber + 1); self.set(k, (self.get(k) || 0) + (profile.timeDeltas[i] || 0));});
  const total = [...self.values()].reduce((n, v) => n + v, 0);
  for (const [k, v] of [...self].sort((x, y) => y[1] - x[1]).slice(0, 14)) console.log((v / total * 100).toFixed(1).padStart(5) + '% ' + k);
}
