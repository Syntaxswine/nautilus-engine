// Paired A/B of the public facade: 32 copies of the largest original design via
// loadBuildingAssets, main tree vs this tree, alternating A B B A in one process.
//   node facade-copies.mjs <tree a> <tree b> [rounds]
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const [a, b, rounds = '4'] = process.argv.slice(2), trees = {a, b};
const head = dir => {try {return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();} catch {return 'extracted tree';}};
const engine = async dir => ({
  THREE: await import(pathToFileURL(path.join(dir, 'packages/render-effects/three.js')).href),
  load: (await import(pathToFileURL(path.join(dir, 'packages/assets/three.js')).href)).loadBuildingAssets});
const engines = {a: await engine(a), b: await engine(b)}, samples = {a: [], b: []}, geometries = {};
for (let r = 0; r < Number(rounds); r++) for (const arm of [0, 3].includes(r % 4) ? ['a', 'b'] : ['b', 'a']) {
  const {THREE, load} = engines[arm], library = await load(THREE, {providers: ['original'], loadTexture: async () => new THREE.Texture()});
  const t = performance.now(), copies = Array.from({length: 32}, () => library.create('dockside-warehouse')), ms = performance.now() - t;
  const set = new Set(); for (const copy of copies) copy.root.traverse(node => {if (node.isMesh) set.add(node.geometry);});
  samples[arm].push(ms); geometries[arm] = set.size; library.dispose();
}
const median = v => {const s = [...v].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
console.log(JSON.stringify({node: process.version, trees: {a: head(a), b: head(b)}, design: 'dockside-warehouse', copies: 32, rounds: Number(rounds),
  ms: {a: samples.a.map(v => +v.toFixed(1)), b: samples.b.map(v => +v.toFixed(1))}, medianMs: {a: +median(samples.a).toFixed(1), b: +median(samples.b).toFixed(1)}, speedup: +(median(samples.a) / median(samples.b)).toFixed(1), distinctGeometries: geometries}, null, 1));
