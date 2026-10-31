// Falsifiers for the draw-count gate: each mutant must fail tests/asset-draw-counts.test.mjs.
// B4 is round 2's survivor (Gross class order swapped: one more run in the level-0
// cutaway). The others change draws in the walls, roofs and instancing. Restores in a finally.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const mutants = [
  ['B4 gross key swap', 'packages/prefab-core/display-batches.js', 'inCut?[1,0]:[2,0];', 'inCut?[2,0]:[1,0];'],
  ['C1 no prefab instancing', 'apps/editor/prefab-scene.js', 'if(!template||models.length<2)continue;', 'continue;'],
  ['C2 roofs never merge', 'apps/editor/roof-scene.js', 'if(models.length<2)return;', 'return;'],
  ['C3 walls stop casting', 'apps/editor/wall-scene.js', 'mesh.computeBoundingSphere();this.wallGroup.add(mesh', 'mesh.userData.noShadow=true;mesh.computeBoundingSphere();this.wallGroup.add(mesh'],
  ['C4 glass single pass', 'packages/prefab-core/display-batches.js', "const copy=mesh.clone();copy.visible=top.visible;", "const copy=mesh.clone();copy.material=mesh.material.clone();copy.material.forceSinglePass=true;copy.visible=top.visible;"]
];
const only = process.argv.slice(2), results = [], originals = new Map();
try {
  for (const [name, file, from, to] of mutants.filter(([name]) => !only.length || only.includes(name.split(' ')[0]))) {
    const text = originals.get(file) ?? fs.readFileSync(file, 'utf8'); originals.set(file, text);
    if (text.split(from).length !== 2) {results.push(name + ': ANCHOR NOT FOUND'); continue;}
    fs.writeFileSync(file, text.replace(from, () => to));
    const run = spawnSync(process.execPath, ['--test', 'tests/asset-draw-counts.test.mjs'], {encoding: 'utf8', maxBuffer: 1 << 30});
    const changed = [...new Set((run.stdout.match(/(w\d[a-z]?-[\w-]+) changed/g) || []))];
    results.push(`${name}: ${run.status !== 0 ? 'KILLED' : 'SURVIVED'}${changed.length ? ' — ' + changed.join(', ') : ''}`);
    fs.writeFileSync(file, text);
  }
} finally {
  for (const [file, text] of originals) fs.writeFileSync(file, text);
}
console.log(results.join('\n'));
console.log('restored:', [...originals].every(([file, text]) => fs.readFileSync(file, 'utf8') === text));
