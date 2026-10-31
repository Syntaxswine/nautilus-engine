// Can the CI asset-count check fail? Build the candidate with one mutant at a time in a clean
// worktree and run `--counts-only --expect` on it (the bench from the author's checkout).
// Rules as the mutation harness: clean tree, unique needles, restore in a finally, hash check.
//   node ci-falsifiers.mjs <worktree> <bench checkout> <maps dir> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [TREE, BENCH, MAPS, OUT] = process.argv.slice(2).map(p => path.resolve(p));
const git = (...a) => execFileSync('git', ['-C', TREE, '--no-optional-locks', ...a], {encoding: 'utf8'}).trim(), sha = b => createHash('sha256').update(b).digest('hex');
if (git('status', '--porcelain')) throw Error('Refusing a dirty tree');
const MUTANTS = [
  {id: 'K3-no-per-copy-culling', file: 'apps/editor/copy-batch.js', needle: 'const seen=!this.perObjectFrustumCulled||frustum.intersectsSphere(this.spheres[k]);', replace: 'const seen=true;'},
  {id: 'K2-set-sphere-first-copy', file: 'apps/editor/copy-batch.js', needle: 'for(const sphere of this.spheres)this.boundingSphere.union(sphere);', replace: 'this.boundingSphere.union(this.spheres[0]);'},
  {id: 'P1-editor-never-batches-copies', file: 'apps/editor/prefab-scene.js', needle: "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});}", replace: "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();},{instancing:false});}"},
  {id: 'R1-merged-bounds-first-roof', file: 'apps/editor/roof-scene.js', needle: 'geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();', replace: 'geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.boundingSphere=shells[0].geometry.boundingSphere.clone();'},
  {id: 'none (control: the unmutated build passes)', file: null}
];
const results = {head: git('rev-parse', 'HEAD'), runs: []};
for (const m of MUTANTS) {
  const original = m.file && fs.readFileSync(path.join(TREE, m.file)), record = {id: m.id};
  try {
    if (m.file) {const text = original.toString('utf8'); if (text.split(m.needle).length !== 2) throw Error('needle not unique: ' + m.id); fs.writeFileSync(path.join(TREE, m.file), text.replace(m.needle, () => m.replace));}
    const build = spawnSync(process.execPath, ['tools/build.mjs'], {cwd: TREE, encoding: 'utf8', maxBuffer: 1 << 28});
    if (build.status !== 0) throw Error('build failed: ' + (build.stderr || '').slice(0, 300));
    const out = path.join(path.dirname(OUT), 'ci-falsifier-' + m.id.split(' ')[0] + '.json');
    const run = spawnSync(process.execPath, [path.join(BENCH, 'tools/bench-asset-rendering.mjs'), '--editor', '--counts-only', '--backend', 'swiftshader', '--expect', '--b', TREE, '--maps', MAPS, '--out', out], {cwd: BENCH, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 1800000});
    const r = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
    Object.assign(record, {exit: run.status, refused: r?.refused?.length ?? null, first: (r?.refused || []).slice(0, 3)});
  } finally {
    if (m.file) {fs.writeFileSync(path.join(TREE, m.file), original); record.restored = sha(fs.readFileSync(path.join(TREE, m.file))) === sha(original);}
    record.status = git('status', '--porcelain') || '(clean)';
  }
  results.runs.push(record); console.log(JSON.stringify(record).slice(0, 400));
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
}
// Leave the worktree's dist as the unmutated build (the control ran last).
