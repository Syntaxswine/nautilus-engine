// Round 4 (the answer to round 3): the build and the browser acceptance under editor-glue and
// handoff-state mutants. Round 3's browser-mut.mjs with G08 and G11 added, a refusal of a dirty
// tree, and HEAD recorded. Each mutant is a list of exact edits (each needle once), restored byte
// for byte in a finally; then the pristine build is re-run and the built app/editor.js and
// app/game-handoff.js are compared with the committed blobs.
// Records, per run: build exit, acceptance exit and seconds, the failure message, and how long
// after the last capture the failure was written (a 30 s gap is a timeout, ~1 s an assertion).
// Usage: node browser-mut4.mjs <checkout> <ID> [<ID> ...]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
const root = path.resolve(process.argv[2]), ids = process.argv.slice(3);
const E = 'apps/editor/editor.js', H = 'apps/editor/game-handoff.js';
const e = (file, find, replace) => ({file, find, replace});
const MUTANTS = {
  E01: ['E01 page wires a bypass (the author\'s mutant, verbatim)', [e(E, '  connectGame: handoff.connectGame,\n  sendToGame: handoff.sendToGame', '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json = this.export()) {return window.bypassHost.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT});}')]],
  E12: ['E12 page bypass for feature-list hosts only (reaches the second hardened wait)', [e(E, '  connectGame: handoff.connectGame,\n  sendToGame: handoff.sendToGame', '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json = this.export()) {return window.bypassHost.manifest ? handoff.sendToGame(json) : window.bypassHost.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT});}')]],
  E05: ['E05 exportMap closure drops its call', [e(E, 'exportMap: () => window.nautilus.export()', 'exportMap: () => window.nautilus.export')]],
  E06: ['E06 onChange not wired (connect does not refresh the page)', [e(E, ', onChange: () => refreshHandoff()});', '});')]],
  E07: ['E07 page hasGameAdapter getter always true', [e(E, 'get hasGameAdapter() { return handoff.hasGameAdapter; },', 'get hasGameAdapter() { return true; },')]],
  E09: ['E09 bypass only on the no-argument sendToGame()', [e(E, '  connectGame: handoff.connectGame,\n  sendToGame: handoff.sendToGame', '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json) {return json === undefined ? window.bypassHost.openMap({json: this.export(), contract: MAP_CONTRACT}) : handoff.sendToGame(json);}')]],
  E10: ['E10 page sendToGame ignores its argument', [e(E, '  sendToGame: handoff.sendToGame\n', '  sendToGame: json => handoff.sendToGame()\n')]],
  E11: ['E11 sendToGame assigned connectGame (swapped member)', [e(E, '  sendToGame: handoff.sendToGame\n', '  sendToGame: handoff.connectGame\n')]],
  G09: ['G09 connect refreshes before the host is set', [e(H, 'host = checkGameAdapter(adapter); onChange();', 'checkGameAdapter(adapter); onChange(); host = adapter;')]],
  G10: ['G10 disconnect refreshes before the host is cleared', [e(H, 'if (host === adapter) {host = null; onChange();}', 'if (host === adapter) {onChange(); host = null;}')]],
  G08: ['G08 a refused connect drops the current host', [e(H, 'host = checkGameAdapter(adapter); onChange();', 'host = null; host = checkGameAdapter(adapter); onChange();')]],
  G11: ['G11 connect checks only that openMap is truthy', [e(H, 'host = checkGameAdapter(adapter); onChange();', "if (!adapter?.openMap) throw new TypeError('Expected a game adapter.'); host = adapter; onChange();")]]
};
const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'});
const statusBefore = git(['status', '--short']);
if (statusBefore) { console.error('Refusing a dirty tree:\n' + statusBefore); process.exit(2); }
const out = {head: git(['rev-parse', 'HEAD']).trim(), statusBefore, runs: []};
const node = (script, args = []) => { const t0 = Date.now(), r = spawnSync(process.execPath, [script, ...args], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000, windowsHide: true});
  const text = (r.stdout || '') + (r.stderr || ''); return {exit: r.status, signal: r.signal, seconds: Math.round((Date.now() - t0) / 1000), text}; };
const OUT = path.join(root, 'artifacts/engine-integration');
for (const id of ids) {
  const [label, edits] = MUTANTS[id];
  const files = [...new Set(edits.map(x => x.file))], originals = new Map(files.map(f => [f, fs.readFileSync(path.join(root, f))]));
  const texts = new Map(files.map(f => [f, originals.get(f).toString('utf8')]));
  for (const x of edits) { const n = texts.get(x.file).split(x.find).length - 1; if (n !== 1) throw Error(id + ': needle x' + n + ' in ' + x.file); texts.set(x.file, texts.get(x.file).replace(x.find, x.replace)); }
  const run = {id, label};
  fs.rmSync(path.join(OUT, 'browser-failure.json'), {force: true});
  for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT).filter(n => n.endsWith('.png')) : []) fs.rmSync(path.join(OUT, f));
  try {
    for (const f of files) fs.writeFileSync(path.join(root, f), texts.get(f));
    const build = node('tools/build.mjs'); run.build = {exit: build.exit, seconds: build.seconds};
    if (build.exit === 0) {
      const t0 = Date.now(), acceptance = node('tools/review-engine-integration.mjs');
      run.acceptance = {exit: acceptance.exit, signal: acceptance.signal, seconds: acceptance.seconds, lastCapture: [...acceptance.text.matchAll(/Capturing (\S+)/g)].map(m => m[1]).at(-1)};
      const failure = path.join(OUT, 'browser-failure.json');
      if (fs.existsSync(failure)) {
        const f = JSON.parse(fs.readFileSync(failure, 'utf8')), shots = fs.readdirSync(OUT).filter(n => n.endsWith('.png')).map(n => fs.statSync(path.join(OUT, n)).mtimeMs);
        run.acceptance.failure = f.message.split('\n').slice(0, 6).join(' / ').slice(0, 900);
        run.acceptance.secondsAfterLastCapture = shots.length ? Math.round((fs.statSync(failure).mtimeMs - Math.max(...shots)) / 100) / 10 : null;
        run.acceptance.pageErrors = f.errors; run.acceptance.failedRequests = f.failedRequests;
      } else if (acceptance.exit === 0) {
        const record = JSON.parse(fs.readFileSync(path.join(OUT, 'acceptance.json'), 'utf8'));
        run.acceptance.host = record.host; run.acceptance.handoff = record.handoff; run.acceptance.errors = record.errors;
      }
    }
  } finally {
    for (const [f, bytes] of originals) fs.writeFileSync(path.join(root, f), bytes);
  }
  run.restored = files.every(f => fs.readFileSync(path.join(root, f)).equals(originals.get(f)));
  out.runs.push(run); console.error(JSON.stringify(run));
}
const rebuild = node('tools/build.mjs'); out.rebuild = {exit: rebuild.exit, seconds: rebuild.seconds};
const committed = file => execFileSync('git', ['-C', root, 'show', 'HEAD:' + file], {encoding: 'utf8'}).replaceAll('../../vendor/', '../vendor/').replaceAll('../../packages/', '../packages/');
out.distMatchesCommitted = {editor: fs.readFileSync(path.join(root, 'dist/app/editor.js'), 'utf8') === committed(E), handoff: fs.readFileSync(path.join(root, 'dist/app/game-handoff.js'), 'utf8') === committed(H)};
out.status = execFileSync('git', ['-C', root, 'status', '--short'], {encoding: 'utf8'});
console.log(JSON.stringify(out, null, 1));
