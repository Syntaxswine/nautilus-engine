// M7 and M8 (the phase-1 survivors on the building extent) against the new extent test, in the
// working tree: each needle must occur once; the file is restored byte for byte in a finally.
//   node recheck-m7-m8.mjs <tree>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const tree = path.resolve(process.argv[2]), file = path.join(tree, 'apps/editor/prefab-scene.js'), original = fs.readFileSync(file);
const mutants = {
  M7: ['sphere.union(node.geometry.boundingSphere.clone().applyMatrix4(matrix.multiplyMatrices(inverse,node.matrixWorld)));', 'sphere.union(node.geometry.boundingSphere.clone());'],
  M8: ['for(const node of template.nodes)if(node.isMesh){', 'for(const node of template.nodes)if(node.isMesh&&Array.isArray(node.material)){']
};
const out = {};
for (const [id, [needle, replace]] of Object.entries(mutants)) {
  const text = original.toString('utf8'), n = text.split(needle).length - 1;
  if (n !== 1) {out[id] = 'needle occurs ' + n + ' times'; continue;}
  try {
    fs.writeFileSync(file, text.replace(needle, () => replace));
    const r = spawnSync(process.execPath, ['--test', '--test-timeout=240000', 'tests/editor-copy-batch.test.mjs'], {cwd: tree, encoding: 'utf8', maxBuffer: 1 << 28});
    const text2 = (r.stdout || '') + (r.stderr || ''), grab = k => (text2.match(new RegExp('\\u2139 ' + k + ' (\\d+)')) || [])[1];
    out[id] = {exit: r.status, tests: grab('tests'), pass: grab('pass'), fail: grab('fail'), failing: [...text2.matchAll(/^✖ (.*?)(?: \(\d+(?:\.\d+)?m?s\))?$/gm)].map(m => m[1]).slice(0, 3)};
  } finally {fs.writeFileSync(file, original);}
}
out.restored = fs.readFileSync(file).equals(original);
console.log(JSON.stringify(out, null, 1));
