// Round 4 reviewer's headless sweep. Verdict logic follows the author's round4-mut.mjs: the pristine
// baseline must pass first; KILLED = node:test reports a failing test; SURVIVED = clean pass;
// CRASH = non-zero exit with no failing count; TIMEOUT = the run limit fired. Each mutant runs the
// five touched test files first; a survivor there is re-run on the full suite, and a full-suite
// survivor is also run through `check --tracked`. Every edit is restored byte for byte in a finally.
// Usage: node hm.mjs <root> ID [ID ...]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MUTANTS} from './mutants.mjs';
const root = path.resolve(process.argv[2]), ids = process.argv.slice(3), unknown = ids.filter(id => !MUTANTS[id]);
if (unknown.length) { console.error('Unknown mutants: ' + unknown.join(' ')); process.exit(2); }
const LOG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'headless-' + Date.now() + '.jsonl');
const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'});
const statusBefore = git(['status', '--short']);
if (statusBefore) { console.error('Refusing a dirty tree:\n' + statusBefore); process.exit(2); }
const all = fs.readdirSync(path.join(root, 'tests')).filter(n => n.endsWith('.test.mjs')).map(n => 'tests/' + n);
const touched = ['tests/tinderbox-adapter.test.mjs', 'tests/contracts.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/game-handoff.test.mjs', 'tests/editor-host-bridge.test.mjs'];
function suite(files) {
  const t0 = Date.now();
  const run = spawnSync(process.execPath, ['--test', ...files], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000, windowsHide: true});
  const text = (run.stdout || '') + (run.stderr || ''), num = key => { const m = new RegExp('ℹ ' + key + ' (\\d+)').exec(text); return m ? +m[1] : null; };
  const failed = [...new Set([...text.matchAll(/^✖ (.+?)(?: \(\d[\d.]*ms\))?$/gm)].map(m => m[1]).filter(n => n !== 'failing tests:' && !n.startsWith('tests')))];
  const fail = num('fail');
  let verdict;
  if (run.error?.code === 'ETIMEDOUT' || run.signal) verdict = 'TIMEOUT';
  else if (run.status === 0 && fail === 0) verdict = 'SURVIVED';
  else if (fail > 0) verdict = 'KILLED';
  else verdict = 'CRASH';
  const firstError = (/^\s+(?:AssertionError|TypeError|Error|SyntaxError|ReferenceError)[^\n]*\n?[^\n]*/m.exec(text) || [''])[0].trim().slice(0, 300);
  return {verdict, tests: num('tests'), pass: num('pass'), fail, failed, firstError, seconds: Math.round((Date.now() - t0) / 1000), tail: verdict === 'CRASH' || verdict === 'TIMEOUT' ? text.slice(-600) : undefined};
}
function check() {
  const r = spawnSync(process.execPath, ['tools/check.mjs', '--tracked'], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000, windowsHide: true});
  return {exit: r.status, tail: ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-2).join(' / ').slice(0, 300)};
}
const out = {node: process.version, head: git(['rev-parse', 'HEAD']).trim(), statusBefore, baseline: suite(all), mutants: []};
console.error('baseline', out.baseline.verdict, out.baseline.pass + '/' + out.baseline.tests, out.baseline.seconds + 's');
if (out.baseline.verdict !== 'SURVIVED') { console.log(JSON.stringify(out, null, 1)); process.exit(1); }
for (const id of ids) {
  const [label, edits] = MUTANTS[id];
  const files = [...new Set(edits.map(x => x.file))], originals = new Map(files.map(f => [f, fs.readFileSync(path.join(root, f))]));
  const texts = new Map(files.map(f => [f, originals.get(f).toString('utf8')]));
  const bad = edits.map(x => [x, texts.get(x.file).split(x.find).length - 1]).filter(([, n]) => n !== 1);
  if (bad.length) { out.mutants.push({id, label, verdict: 'NEEDLE', detail: bad.map(([x, n]) => x.file + ' x' + n)}); console.error(id, 'NEEDLE'); continue; }
  for (const x of edits) texts.set(x.file, texts.get(x.file).replace(x.find, x.replace));
  let r, scope = 'touched', gate;
  try {
    for (const f of files) fs.writeFileSync(path.join(root, f), texts.get(f));
    r = suite(touched);
    if (r.verdict === 'SURVIVED') { r = suite(all); scope = 'full'; if (r.verdict === 'SURVIVED') gate = check(); }
  } finally {
    for (const [f, bytes] of originals) fs.writeFileSync(path.join(root, f), bytes);
  }
  const restored = files.every(f => fs.readFileSync(path.join(root, f)).equals(originals.get(f)));
  out.mutants.push({id, label, scope, ...r, check: gate, restored}); fs.appendFileSync(LOG, JSON.stringify(out.mutants.at(-1)) + '\n');
  console.error(id, '|', r.verdict, scope, '|', r.failed.join(' || ').slice(0, 160), '|', r.seconds + 's', gate ? 'check exit ' + gate.exit : '', restored ? '' : 'NOT RESTORED');
}
out.statusAfter = git(['status', '--short']);
console.log(JSON.stringify(out, null, 1));
