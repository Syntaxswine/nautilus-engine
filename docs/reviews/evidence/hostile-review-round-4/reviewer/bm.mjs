// Round 4 reviewer's browser runner: the author's browser-mut4.mjs logic (refuse a dirty tree, apply
// exact edits, build, run review:integration, restore in a finally, rebuild, compare the built
// app files with the commit), with the reviewer's mutant list and extra fields: the acceptance's
// total seconds, whether the failure is a Playwright timeout, and the output tail when no failure
// record was written. Usage: node bm.mjs <checkout> <ID> [<ID> ...]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {MUTANTS, E, H} from './mutants.mjs';
const root = path.resolve(process.argv[2]), ids = process.argv.slice(3);
const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'});
const statusBefore = git(['status', '--short']);
if (statusBefore) { console.error('Refusing a dirty tree:\n' + statusBefore); process.exit(2); }
const out = {head: git(['rev-parse', 'HEAD']).trim(), statusBefore, runs: []};
const node = (script, args = []) => { const t0 = Date.now(), r = spawnSync(process.execPath, [script, ...args], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000, windowsHide: true});
  const text = (r.stdout || '') + (r.stderr || ''); return {exit: r.status, signal: r.signal, seconds: Math.round((Date.now() - t0) / 100) / 10, text}; };
const OUT = path.join(root, 'artifacts/engine-integration');
for (const id of ids) {
  const [label, edits] = MUTANTS[id];
  const files = [...new Set(edits.map(x => x.file))], originals = new Map(files.map(f => [f, fs.readFileSync(path.join(root, f))]));
  const texts = new Map(files.map(f => [f, originals.get(f).toString('utf8')]));
  for (const x of edits) { const n = texts.get(x.file).split(x.find).length - 1; if (n !== 1) throw Error(id + ': needle x' + n + ' in ' + x.file); texts.set(x.file, texts.get(x.file).replace(x.find, x.replace)); }
  const run = {id, label};
  fs.rmSync(path.join(OUT, 'browser-failure.json'), {force: true}); fs.rmSync(path.join(OUT, 'acceptance.json'), {force: true});
  for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT).filter(n => n.endsWith('.png')) : []) fs.rmSync(path.join(OUT, f));
  try {
    for (const f of files) fs.writeFileSync(path.join(root, f), texts.get(f));
    const build = node('tools/build.mjs'); run.build = {exit: build.exit, seconds: build.seconds};
    if (build.exit === 0) {
      const acceptance = node('tools/review-engine-integration.mjs');
      const captures = [...acceptance.text.matchAll(/Capturing (\S+)/g)].map(m => m[1]);
      run.acceptance = {exit: acceptance.exit, signal: acceptance.signal, seconds: acceptance.seconds, captures: captures.length, lastCapture: captures.at(-1)};
      const failure = path.join(OUT, 'browser-failure.json');
      if (fs.existsSync(failure)) {
        const f = JSON.parse(fs.readFileSync(failure, 'utf8')), shots = fs.readdirSync(OUT).filter(n => n.endsWith('.png')).map(n => fs.statSync(path.join(OUT, n)).mtimeMs);
        run.acceptance.failure = f.message.split('\n').slice(0, 6).join(' / ').slice(0, 900);
        run.acceptance.playwrightTimeout = /Timeout \d+ms exceeded|has been closed|Target closed/i.test(f.message);
        run.acceptance.secondsAfterLastCapture = shots.length ? Math.round((fs.statSync(failure).mtimeMs - Math.max(...shots)) / 100) / 10 : null;
        run.acceptance.pageErrors = f.errors; run.acceptance.failedRequests = f.failedRequests;
      } else if (acceptance.exit === 0) {
        const record = JSON.parse(fs.readFileSync(path.join(OUT, 'acceptance.json'), 'utf8'));
        run.acceptance.host = record.host; run.acceptance.handoff = record.handoff; run.acceptance.errors = record.errors;
        run.acceptance.captureHashes = Object.fromEntries(record.captures.map(c => [c.file, c.sha256.slice(0, 12)]));
      } else run.acceptance.tail = acceptance.text.slice(-900);
    }
  } finally {
    for (const [f, bytes] of originals) fs.writeFileSync(path.join(root, f), bytes);
  }
  run.restored = files.every(f => fs.readFileSync(path.join(root, f)).equals(originals.get(f)));
  out.runs.push(run); console.error(JSON.stringify({id, exit: run.acceptance?.exit, s: run.acceptance?.seconds, after: run.acceptance?.secondsAfterLastCapture, failure: run.acceptance?.failure?.slice(0, 200)}));
}
const rebuild = node('tools/build.mjs'); out.rebuild = {exit: rebuild.exit, seconds: rebuild.seconds};
const committed = file => execFileSync('git', ['-C', root, 'show', 'HEAD:' + file], {encoding: 'utf8'}).replaceAll('../../vendor/', '../vendor/').replaceAll('../../packages/', '../packages/');
out.distMatchesCommitted = {editor: fs.readFileSync(path.join(root, 'dist/app/editor.js'), 'utf8') === committed(E), handoff: fs.readFileSync(path.join(root, 'dist/app/game-handoff.js'), 'utf8') === committed(H)};
out.status = git(['status', '--short']);
console.log(JSON.stringify(out, null, 1));
