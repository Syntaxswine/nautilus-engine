// Public facade (assets/three) in both trees: draw structure per instance, sharing,
// view independence, release, and the behaviour a host can observe.
//   node facade-probe.mjs <baseline> <sandbox>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
const [A, B] = process.argv.slice(2).map(p => path.resolve(p));
const here = path.dirname(fileURLToPath(import.meta.url));
const load = async tree => ({
  T: await import(pathToFileURL(path.join(tree, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href),
  facade: await import(pathToFileURL(path.join(tree, 'packages/assets/three.js')).href)
});
const meshes = root => {const out = []; root.traverse(n => {if (n.isMesh) out.push(n);}); return out;};
async function probe(tree, label) {
  const {T, facade} = await load(tree), atlas = new T.Texture();
  const library = await facade.loadBuildingAssets(T, {providers: ['original'], loadTexture: async () => atlas});
  const id = 'dockside-warehouse', copies = Array.from({length: 32}, () => library.create(id));
  const all = copies.flatMap(c => meshes(c.root));
  const r = {tree: label, design: id, instances: copies.length, meshesPerInstance: meshes(copies[0].root).length, drawsPerPassFor32: all.filter(m => m.visible).length,
    uniqueGeometries: new Set(all.map(m => m.geometry)).size, uniqueMaterials: new Set(all.map(m => m.material)).size};
  // A host tints one instance (a common selection highlight).
  const target = meshes(copies[0].root).find(m => m.material.color), other = meshes(copies[1].root)[meshes(copies[0].root).indexOf(target)];
  const before = other.material.color.getHex(); target.material.color.setHex(0xff00ff);
  r.tintOneInstanceChangesAnother = other.material.color.getHex() !== before;
  // A host's generic cleanup of one removed instance (traverse + geometry.dispose()).
  let disposedElsewhere = 0; for (const m of meshes(copies[2].root)) m.geometry.addEventListener('dispose', () => disposedElsewhere++);
  for (const m of meshes(copies[3].root)) m.geometry.dispose();
  r.genericCleanupOfOneInstanceDisposesGeometryOfAnother = disposedElsewhere > 0;
  // Views stay per instance.
  const vis = c => meshes(c.root).map(m => m.visible).join('');
  const v1 = vis(copies[5]); copies[4].setView({view: 'cutaway', level: 0}); r.viewIndependent = vis(copies[5]) === v1 && vis(copies[4]) !== v1;
  for (const c of copies) c.dispose();
  library.dispose();
  return r;
}
const result = {script: 'facade-probe.mjs', node: process.version, a: await probe(A, '<baseline>'), b: await probe(B, '<sandbox>')};
fs.writeFileSync(path.join(here, 'facade-probe.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
