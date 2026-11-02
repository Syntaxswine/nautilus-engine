// Whether the bridge test's 20 s bound and its loop guard stop an observer loop that goes through a
// microtask. The test file runs in one process (node tests/editor-host-bridge.test.mjs), killed by its
// own PID after a deadline. Three runs: pristine; N01 alone (a synchronous loop: the guard sees it); and
// N01 with Send's observer deferring its refresh by one microtask (two edits). Each edit's needle must
// occur once; the file is restored byte for byte in a finally. Refuses a dirty tree; records git status.
// Usage: node hang-probe.mjs <checkout> <out.json> [deadlineSeconds]
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]), deadline = (+process.argv[4] || 60) * 1000;
const git = (...args) => spawnSync('git', ['-C', root, ...args], {encoding: 'utf8'}).stdout.trim();
const E = path.join(root, 'apps/editor/editor.js');
const N01 = ['if (button.disabled !== disabled) button.disabled = disabled;', 'button.disabled = disabled;'];
const DEFER = ['const handoffState = new MutationObserver(refreshHandoff);', 'const handoffState = new MutationObserver(() => queueMicrotask(refreshHandoff));'];
const runFile = () => new Promise(resolve => {
  const start = Date.now(), child = spawn(process.execPath, ['tests/editor-host-bridge.test.mjs'], {cwd: root, windowsHide: true}); let out = '';
  child.stdout.on('data', chunk => {out += chunk;}); child.stderr.on('data', chunk => {out += chunk;});
  let killed = false; const timer = setTimeout(() => {killed = true; child.kill();}, deadline);
  child.on('close', (code, signal) => {clearTimeout(timer); resolve({pid: child.pid, code, signal, killedAtDeadline: killed, seconds: (Date.now() - start) / 1000,
    pass: +(out.match(/ℹ pass (\d+)/)?.[1] ?? NaN), fail: +(out.match(/ℹ fail (\d+)/)?.[1] ?? NaN), cancelled: +(out.match(/ℹ cancelled (\d+)/)?.[1] ?? NaN),
    lastLines: out.trim().split('\n').slice(-3).map(l => l.slice(0, 160))});});
});
const record = {head: git('rev-parse', 'HEAD'), statusBefore: git('status', '--short'), deadlineSeconds: deadline / 1000, runs: []};
if (record.statusBefore) throw Error('Refusing a dirty tree:\n' + record.statusBefore);
const original = fs.readFileSync(E), text = original.toString('utf8');
for (const [find] of [N01, DEFER]) if (text.split(find).length !== 2) throw Error('Needle must occur once: ' + find);
try {
  record.runs.push({id: 'pristine', ...(await runFile())});
  fs.writeFileSync(E, text.replace(N01[0], () => N01[1])); record.runs.push({id: 'N01 alone', ...(await runFile())});
  fs.writeFileSync(E, text.replace(N01[0], () => N01[1]).replace(DEFER[0], () => DEFER[1])); record.runs.push({id: 'N01 + Send observer defers its refresh one microtask', ...(await runFile())});
} finally { fs.writeFileSync(E, original); if (!fs.readFileSync(E).equals(original)) throw Error('restore failed'); }
record.statusAfter = git('status', '--short');
fs.writeFileSync(outFile, JSON.stringify(record, null, 1));
for (const run of record.runs) console.log(JSON.stringify(run));
