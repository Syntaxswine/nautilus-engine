// Round 2's facade probe (docs/reviews/evidence/hostile-review-0.8-round-2/reviewer/
// facade-probe.mjs), re-run on the answer to round 2 in both facade modes. One change
// to its measure: draws per pass count each group of a material-array mesh (a batch
// draws per group), not meshes. 32 copies of one design, then the behaviour a host
// can observe: tinting one instance, a generic cleanup of one instance, views.
//   node facade-probe-r2.mjs <baseline tree> <candidate tree> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [A, B, out] = process.argv.slice(2).map(p => path.resolve(p));
const meshes = root => {const list = []; root.traverse(n => {if (n.isMesh) list.push(n);}); return list;};
const draws = mesh => Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1;
const shown = node => {for (let n = node; n; n = n.parent) if (!n.visible) return false; return true;};
async function probe(tree, label, options) {
  const T = await import(pathToFileURL(path.join(tree, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
  const facade = await import(pathToFileURL(path.join(tree, 'packages/assets/three.js')).href), atlas = new T.Texture();
  const library = await facade.loadBuildingAssets(T, {providers: ['original'], loadTexture: async () => atlas, ...options});
  try {
    const id = 'dockside-warehouse', copies = Array.from({length: 32}, () => library.create(id)), all = copies.flatMap(c => meshes(c.root));
    const materials = new Set(all.flatMap(m => [].concat(m.material)));
    const r = {tree: label, options, design: id, instances: copies.length, meshesPerInstance: meshes(copies[0].root).length,
      drawsPerPassFor32: all.filter(shown).reduce((n, m) => n + draws(m), 0), uniqueGeometries: new Set(all.map(m => m.geometry)).size, uniqueMaterials: materials.size};
    const target = meshes(copies[0].root).find(m => [].concat(m.material)[0].color), other = meshes(copies[1].root)[meshes(copies[0].root).indexOf(target)];
    const before = [].concat(other.material)[0].color.getHex(); [].concat(target.material)[0].color.setHex(0xff00ff);
    r.tintOneInstanceChangesAnother = [].concat(other.material)[0].color.getHex() !== before;
    let disposedElsewhere = 0; for (const m of meshes(copies[2].root)) m.geometry.addEventListener('dispose', () => disposedElsewhere++);
    for (const m of meshes(copies[3].root)) m.geometry.dispose();
    r.genericCleanupOfOneInstanceDisposesGeometryOfAnother = disposedElsewhere > 0;
    const vis = c => meshes(c.root).map(m => m.visible + ':' + JSON.stringify(m.geometry.groups)).join('|');
    const v1 = vis(copies[5]); copies[4].setView({view: 'cutaway', level: 0}); r.viewIndependent = vis(copies[5]) === v1 && vis(copies[4]) !== v1;
    for (const c of copies) c.dispose();
    return r;
  } finally {library.dispose();}
}
const result = {script: 'facade-probe-r2.mjs', node: process.version,
  main: await probe(A, '<baseline>', {}), candidate: await probe(B, '<candidate>', {}), candidateShared: await probe(B, '<candidate>', {shared: true})};
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
