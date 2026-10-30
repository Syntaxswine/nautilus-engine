// Mutation test for the roof merge: each mutant must make tests/editor-roofs.test.mjs
// (or the roof adapter tests) fail. Restores every file in a finally.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const scene = 'apps/editor/roof-scene.js', adapter = 'packages/roof-core/three.js';
const mutants = [
  ['M1 sort ignores level', scene, 'a.roof.z-b.roof.z||order.get', '0||order.get'],
  ['M2 shells stay visible', scene, 'for(const shell of shells)shell.visible=false;', ''],
  ['M3 no index offset', scene, 'index[at++]=source[j]+bases[i]', 'index[at++]=source[j]'],
  ['M4 attribute offset per vertex not per float', scene, 'arrays[name].set(shell.geometry.attributes[name].array,start*size)', 'arrays[name].set(shell.geometry.attributes[name].array,start)'],
  ['M5 always 16-bit indices', scene, 'new (vertices>65535?Uint32Array:Uint16Array)', 'new (Uint16Array)'],
  ['M6 release keeps shells hidden', scene, 'for(const shell of shells)shell.visible=true;this.merged=null;', 'this.merged=null;'],
  ['M7 retired slots never disposed', scene, 'if(retired)for(const material of retired.materials.values())material.dispose();', ''],
  ['M8 merge ignores visibility', scene, 'if(!range.model.root.visible)run=null;else ', ''],
  ['M9 reorder keeps the merge', scene, '||this.merged&&this.merged.order!==roofs.map(roof=>roof.id).join(\'\\n\')', ''],
  ['M10 any materials merge', scene, '&&geometry.groups.every(group=>shared.has(mesh.material[group.materialIndex]))', ''],
  ['M11 any root transform merges', scene, 'if(!root.matrix.equals(AT_OFFSET)||!mesh.matrix.equals(IDENTITY))return false;', ''],
  ['M12 merged mesh not at the offset', scene, 'mesh.position.set(ROOF_MAP_OFFSET,0,ROOF_MAP_OFFSET);', ''],
  ['M13 merged geometry never disposed', scene, 'mesh.removeFromParent();mesh.geometry.dispose();', 'mesh.removeFromParent();'],
  ['M14 slot materials leak on dispose', scene, 'for(const material of this.slots?.materials.values()||[])material.dispose();', ''],
  ['M15 merge with one roof', scene, 'if(models.length<2)return;', 'if(!models.length)return;'],
  ['M16 shared material ignores atlas', adapter, 'const material = !grey && !texture && atlas ? atlasMaterial(T, atlas, id)', 'const material = false ? atlasMaterial(T, atlas, id)'],
  ['M17 no shadows from the merge', scene, "mesh.name='sloped roofs';mesh.castShadow=mesh.receiveShadow=true;", "mesh.name='sloped roofs';"]
];
const originals = new Map([scene, adapter].map(file => [file, fs.readFileSync(file, 'utf8')]));
const results = [];
try {
  const only = process.argv.slice(2);
  for (const [name, file, from, to] of mutants.filter(([name]) => !only.length || only.includes(name.split(' ')[0]))) {
    const text = originals.get(file);
    if (text.split(from).length !== 2) {results.push(name + ': ANCHOR NOT FOUND'); continue;}
    fs.writeFileSync(file, text.replace(from, () => to));
    const run = spawnSync(process.execPath, ['--test', 'tests/editor-roofs.test.mjs', 'tests/editor-roof-paint.test.mjs', 'tests/roof-core.test.mjs'], {encoding: 'utf8', maxBuffer: 1 << 30});
    const failed = (run.stdout.match(/^✖ (.*?) \(/gm) || []).filter(line => !line.startsWith('✖ failing tests')).map(line => line.slice(2, 70));
    results.push(`${name}: ${run.status !== 0 ? 'KILLED' : 'SURVIVED'}${run.error ? ' (' + run.error.code + ')' : ''}${failed.length ? ' — ' + [...new Set(failed)].slice(0, 2).join(' | ') : ''}`);
    fs.writeFileSync(file, text);
  }
} finally {
  for (const [file, text] of originals) fs.writeFileSync(file, text);
}
console.log(results.join('\n'));
console.log('restored:', [...originals].every(([file, text]) => fs.readFileSync(file, 'utf8') === text));
