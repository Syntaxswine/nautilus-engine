// Round 3: new mutants, with the author's round3-mut.mjs verdict logic unchanged (KILLED = a
// failing test; SURVIVED = clean pass; CRASH = non-zero exit without a failing count; TIMEOUT).
// The pristine baseline must pass first. Each mutant is a list of exact edits (each needle once),
// restored byte for byte in a finally; the touched test files run first, and a survivor there is
// re-run on the full suite, so every SURVIVED is a full-suite survivor.
// Usage: node r3-mut.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
const root = path.resolve(process.argv[2]);
const T = 'packages/adapters/tinderbox/index.js', H = 'apps/editor/game-handoff.js', E = 'apps/editor/editor.js';
const L157 = 'Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2';
const e = (file, find, replace) => ({file, find, replace});
const MUTANTS = [
  // Clearance: one neutral control, two positive controls the table must kill, six new mutants.
  {id: 'C00 neutral: hypot as sqrt of squares', edits: [e(T, 'return Math.hypot(Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0)) < radius - 1e-10;',
    'const ax = Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), ay = Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0); return Math.sqrt(ax * ax + ay * ay) < radius - 1e-10;')]},
  {id: 'C21 control: y term signed (m.y - player.y)', edits: [e(T, 'Math.abs(player.y - m.y)', '(m.y - player.y)')]},
  {id: 'C22 control: x term signed (player.x - m.x)', edits: [e(T, L157, '(player.x - m.x) - (swap ? m.depth : m.width) / 2')]},
  {id: 'C18 epsilon dropped (< radius)', edits: [e(T, '< radius - 1e-10;', '< radius;')]},
  {id: 'C19 swap only for heading pi/2 (walls drawn upwards misread)', edits: [e(T, 'Math.round(m.heading / (Math.PI / 2)) % 2;', 'Math.round(m.heading / (Math.PI / 2)) === 1;')]},
  {id: 'C20 x term signed (m.x - player.x)', edits: [e(T, L157, '(m.x - player.x) - (swap ? m.depth : m.width) / 2')]},
  {id: 'C23 right bound padded by a tile', edits: [e(T, 'player.x > r.width - radius ||', 'player.x > r.width - radius - 1 ||')]},
  {id: 'C24 bottom bound padded by a tile', edits: [e(T, 'player.y > r.height - radius ||', 'player.y > r.height - radius - 1 ||')]},
  {id: 'C27 right bound compared with the height', edits: [e(T, 'player.x > r.width - radius ||', 'player.x > r.height - radius ||')]},
  // The moved handoff state.
  {id: 'G08 a refused connect drops the current host', edits: [e(H, 'host = checkGameAdapter(adapter); onChange();', 'host = null; host = checkGameAdapter(adapter); onChange();')]},
  {id: 'G09 connect refreshes before the host is set', edits: [e(H, 'host = checkGameAdapter(adapter); onChange();', 'checkGameAdapter(adapter); onChange(); host = adapter;')]},
  {id: 'G10 disconnect refreshes before the host is cleared', edits: [e(H, 'if (host === adapter) {host = null; onChange();}', 'if (host === adapter) {onChange(); host = null;}')]},
  {id: 'G11 connect checks only that openMap is truthy', edits: [e(H, 'host = checkGameAdapter(adapter); onChange();', "if (!adapter?.openMap) throw new TypeError('Expected a game adapter.'); host = adapter; onChange();")]},
  // The page glue that is left in editor.js.
  {id: 'E05 exportMap closure drops its call', edits: [e(E, 'exportMap: () => window.nautilus.export()', 'exportMap: () => window.nautilus.export')]},
  {id: 'E06 onChange not wired', edits: [e(E, ', onChange: () => refreshHandoff()});', '});')]},
  {id: 'E07 page hasGameAdapter getter always true', edits: [e(E, 'get hasGameAdapter() { return handoff.hasGameAdapter; },', 'get hasGameAdapter() { return true; },')]},
  {id: 'E09 bypass only on the no-argument sendToGame()', edits: [e(E, '  connectGame: handoff.connectGame,\n  sendToGame: handoff.sendToGame', '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json) {return json === undefined ? window.bypassHost.openMap({json: this.export(), contract: MAP_CONTRACT}) : handoff.sendToGame(json);}')]},
  {id: 'E10 page sendToGame ignores its argument', edits: [e(E, '  sendToGame: handoff.sendToGame\n', '  sendToGame: json => handoff.sendToGame()\n')]},
  {id: 'E11 sendToGame assigned connectGame', edits: [e(E, '  sendToGame: handoff.sendToGame\n', '  sendToGame: handoff.connectGame\n')]}
];
const all = fs.readdirSync(path.join(root, 'tests')).filter(n => n.endsWith('.test.mjs')).map(n => 'tests/' + n);
const touched = ['tests/tinderbox-adapter.test.mjs', 'tests/contracts.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/game-handoff.test.mjs'];
function suite(files) {
  const t0 = Date.now();
  const run = spawnSync(process.execPath, ['--test', ...files], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000, windowsHide: true});
  const text = (run.stdout || '') + (run.stderr || ''), num = key => { const m = new RegExp('ℹ ' + key + ' (\\d+)').exec(text); return m ? +m[1] : null; };
  const failed = [...new Set([...text.matchAll(/^✖ (.+?)(?: \(\d[\d.]*ms\))?$/gm)].map(m => m[1]).filter(n => n !== 'failing tests:' && !n.startsWith('tests')))];
  const fail = num('fail');
  let verdict;
  if (run.error?.code === 'ETIMEDOUT' || run.signal) verdict = 'TIMEOUT';
  else if (run.status === 0 && fail === 0) verdict = 'SURVIVED';
  else if (fail > 0) verdict = 'KILLED';
  else verdict = 'CRASH';
  return {verdict, tests: num('tests'), pass: num('pass'), fail, failed, seconds: Math.round((Date.now() - t0) / 1000), tail: verdict === 'CRASH' || verdict === 'TIMEOUT' ? text.slice(-600) : undefined};
}
const out = {node: process.version, head: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), statusBefore: execFileSync('git', ['-C', root, 'status', '--short'], {encoding: 'utf8'}), baseline: suite(all), mutants: []};
console.error('baseline', out.baseline.verdict, out.baseline.pass + '/' + out.baseline.tests, out.baseline.seconds + 's');
if (out.baseline.verdict !== 'SURVIVED') { console.log(JSON.stringify(out, null, 2)); process.exit(1); }
for (const m of MUTANTS) {
  const files = [...new Set(m.edits.map(x => x.file))], originals = new Map(files.map(f => [f, fs.readFileSync(path.join(root, f))]));
  const texts = new Map(files.map(f => [f, originals.get(f).toString('utf8')]));
  const bad = m.edits.map(x => [x, texts.get(x.file).split(x.find).length - 1]).filter(([, n]) => n !== 1);
  if (bad.length) { out.mutants.push({id: m.id, verdict: 'NEEDLE', detail: bad.map(([x, n]) => x.file + ' x' + n)}); console.error(m.id, 'NEEDLE'); continue; }
  for (const x of m.edits) texts.set(x.file, texts.get(x.file).replace(x.find, x.replace));
  let r, scope = 'touched';
  try {
    for (const f of files) fs.writeFileSync(path.join(root, f), texts.get(f));
    r = suite(touched);
    if (r.verdict === 'SURVIVED') { r = suite(all); scope = 'full'; }
  } finally {
    for (const [f, bytes] of originals) fs.writeFileSync(path.join(root, f), bytes);
  }
  const restored = files.every(f => fs.readFileSync(path.join(root, f)).equals(originals.get(f)));
  out.mutants.push({id: m.id, scope, ...r, restored});
  console.error(m.id, '|', r.verdict, scope, r.pass + '/' + r.tests, '|', r.failed.join(' || ').slice(0, 200), '|', r.seconds + 's', restored ? '' : 'NOT RESTORED');
}
out.statusAfter = execFileSync('git', ['-C', root, 'status', '--short'], {encoding: 'utf8'});
console.log(JSON.stringify(out, null, 1));
