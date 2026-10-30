// S3 re-measured one call up: apply E01 (window.nautilus.sendToGame calls the host directly,
// skipping the tested module), then run check --tracked, the suite, build and the browser
// acceptance; record each exit code, duration and the browser's failure message. The editor file
// is restored in a finally and the build is re-run on the pristine source, then the restored
// dist/app/editor.js is compared with the committed blob. Usage: node browser-e01.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
const root = path.resolve(process.argv[2]), which = process.argv[3] || 'E01', file = path.join(root, 'apps/editor/editor.js'), original = fs.readFileSync(file);
const MUTANTS = {
  E01: ['E01 sendToGame bypasses the checks', '  sendToGame(json = this.export()) {return sendMapToGame(json, gameAdapter);}', "  sendToGame(json = this.export()) {if (!gameAdapter) throw Error('Connect a game adapter first.');return gameAdapter.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT});}"],
  E03: ['E03 sendToGame ignores its argument', '{return sendMapToGame(json, gameAdapter);}', '{return sendMapToGame(this.export(), gameAdapter);}'],
};
const [label0, find, replace] = MUTANTS[which];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(label, args) {
  const t0 = Date.now(), r = spawnSync(npm, args, {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000, windowsHide: true, shell: true});
  const text = (r.stdout || '') + (r.stderr || '');
  return {label, exit: r.status, seconds: Math.round((Date.now() - t0) / 1000), pass: /ℹ pass (\d+)/.exec(text)?.[1], fail: /ℹ fail (\d+)/.exec(text)?.[1],
    lastLines: text.trim().split('\n').slice(-4).map(line => line.slice(0, 300))};
}
const out = {mutant: label0, runs: []};
const text = original.toString('utf8');
if (text.split(find).length !== 2) throw Error('needle');
fs.rmSync(path.join(root, 'artifacts/engine-integration/browser-failure.json'), {force: true});
try {
  fs.writeFileSync(file, text.replace(find, replace));
  const gates = [['check --tracked', ['run', 'check', '--', '--tracked']], ['test', ['test']], ['build', ['run', 'build']], ['review:integration', ['run', 'review:integration']]];
  // E03's headless verdict is in the sweep; only the build and the browser are new information.
  for (const [label, args] of which === 'E03' ? gates.slice(2) : gates) {
    const r = run(label, args); out.runs.push(r); console.error(label, r.exit, r.seconds + 's', r.pass ?? '', r.fail ?? '');
  }
  const failure = path.join(root, 'artifacts/engine-integration/browser-failure.json');
  if (fs.existsSync(failure)) out.browserFailure = JSON.parse(fs.readFileSync(failure, 'utf8'));
} finally {
  fs.writeFileSync(file, original);
}
out.restored = fs.readFileSync(file).equals(original);
out.rebuild = run('build (pristine)', ['run', 'build']);
const committed = execFileSync('git', ['-C', root, 'show', 'HEAD:apps/editor/editor.js'], {encoding: 'utf8'}).replaceAll('../../vendor/', '../vendor/').replaceAll('../../packages/', '../packages/');
out.distEditorMatchesCommitted = fs.readFileSync(path.join(root, 'dist/app/editor.js'), 'utf8') === committed;
out.status = execFileSync('git', ['-C', root, 'status', '--short'], {encoding: 'utf8'});
fs.writeFileSync(path.join(root, 'artifacts/r2/browser-' + which + '.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
