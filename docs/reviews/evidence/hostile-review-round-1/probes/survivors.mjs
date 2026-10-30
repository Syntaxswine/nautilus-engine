// Independent re-run of the review's three surviving mutants (S2). A survivor is
// reported only if the baseline suite passes first and the mutated suite also passes.
// Every mutated file is restored byte-for-byte in a finally.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = process.argv[2];
const mutants = [
  // probe: the reviewer's spawn-near-wall scene; it must print PLAYER_CLEARANCE on baseline.
  {id: 'M05 tinderbox PLAYER_CLEARANCE wall branch', file: 'packages/adapters/tinderbox/index.js', find: '< radius - 1e-10', replace: '< -1', probe: 'artifacts/exp/clearance-probe.mjs'},
  {id: 'M14 persistence keeps raw', file: 'packages/map-core/persistence.js', find: '    return raw;\n', replace: '    return JSON.parse(document.export());\n'},
  {id: 'M18 prefab 32-building limit', file: 'packages/prefab-core/index.js', find: 'data.instances.length>MAX_BUILDINGS', replace: 'data.instances.length>MAX_BUILDINGS*100'},
];
function suite() {
  const run = spawnSync('npm', ['test'], {cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 << 20});
  const text = run.stdout + run.stderr, num = key => +(new RegExp('ℹ ' + key + ' (\\d+)').exec(text)?.[1] ?? NaN);
  return {exit: run.status, tests: num('tests'), pass: num('pass'), fail: num('fail')};
}
const out = {baseline: suite()};
if (out.baseline.exit !== 0) { console.log(JSON.stringify(out, null, 2)); process.exit(1); }
for (const m of mutants) {
  const file = path.join(root, m.file), original = fs.readFileSync(file);
  const text = original.toString('utf8'), hits = text.split(m.find).length - 1;
  if (hits !== 1) { out[m.id] = 'SKIPPED: find string occurs ' + hits + ' times'; continue; }
  const probe = () => spawnSync(process.execPath, [m.probe], {cwd: root, encoding: 'utf8'}).stdout.trim();
  const probeBaseline = m.probe ? probe() : undefined;
  try {
    fs.writeFileSync(file, text.replace(m.find, m.replace));
    const r = suite();
    out[m.id] = {...r, verdict: r.exit === 0 ? 'SURVIVED (suite still green)' : 'KILLED',
      ...(m.probe ? {probeBaseline, probeMutant: probe()} : {})};
  } finally { fs.writeFileSync(file, original); }
}
out.gitStatusAfter = spawnSync('git', ['-C', root, 'status', '--short'], {encoding: 'utf8'}).stdout.trim() || '(clean)';
console.log(JSON.stringify(out, null, 2));
