// I6/I7 (round 3's near-equivalents) against the pending-load test; restore in a finally.
const fs = require('fs'), {spawnSync} = require('child_process'), file = 'apps/editor/prefab-scene.js';
const cases = [
  ['I6-no-early-release', '    this.releaseInstances();\n    const wanted', '    const wanted'],
  ['I7-release-leaves-copies-hidden', 'mesh.removeFromParent();mesh.dispose();for(const copy of copies)copy.visible=node.visible;', 'mesh.removeFromParent();mesh.dispose();']
];
for (const [id, from, to] of cases) {
  const original = fs.readFileSync(file, 'utf8');
  if (original.split(from).length !== 2) {console.log(id, 'needle not unique'); continue;}
  try {
    fs.writeFileSync(file, original.replace(from, to));
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-timeout=120000', 'tests/editor-copy-batch.test.mjs'], {encoding: 'utf8', maxBuffer: 1 << 28, timeout: 280000});
    const failing = [...(r.stdout || '').matchAll(/^not ok \d+ - (.*)$/gm)].map(m => m[1]);
    console.log(id, r.status === null ? 'ERROR (no exit)' : r.status === 0 ? 'SURVIVED' : 'killed: ' + failing.join('; '));
  } finally {fs.writeFileSync(file, original);}
  if (fs.readFileSync(file, 'utf8') !== original) throw Error('restore failed');
}
