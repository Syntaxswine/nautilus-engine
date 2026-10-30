// Round-2 gates on the answer's tree, one after another: exit code, duration,
// node:test summary; logs masked; HEAD and status recorded before and after.
//   node gates.mjs <tree> [gate ...]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const tree = path.resolve(process.argv[2]);
const all = {
  build: ['npm', ['run', 'build']],
  'check-tracked': ['npm', ['run', 'check', '--', '--tracked']],
  test: ['npm', ['test']],
  'test-upstream': ['npm', ['run', 'test:upstream']],
  'test-package': ['npm', ['run', 'test:package']],
  'check-buildings': ['npm', ['run', 'check:buildings']],
  'review-integration': ['npm', ['run', 'review:integration']]
};
const wanted = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(all);
const logDir = path.join(here, 'gates'); fs.mkdirSync(logDir, {recursive: true});
const user = os.userInfo().username;
const mask = t => t.split(tree).join('<sandbox>').split(tree.replaceAll('\\', '/')).join('<sandbox>').split(os.tmpdir()).join('<scratch>').replaceAll(user, '<user>');
const git = (...a) => {try {return execFileSync('git', ['-C', tree, ...a], {encoding: 'utf8'}).trim();} catch (e) {return 'git error: ' + e.message;}};
const result = {script: 'gates.mjs', started: new Date().toISOString(), node: process.version, platform: process.platform + ' ' + os.release(), head: git('rev-parse', 'HEAD'), statusBefore: git('status', '--porcelain') || '(clean)', results: []};
for (const name of wanted) {
  const [cmd, args] = all[name], t0 = Date.now();
  const run = spawnSync(cmd, args, {cwd: tree, shell: true, encoding: 'utf8', maxBuffer: 1 << 28, windowsHide: true, timeout: 40 * 60 * 1000});
  const ms = Date.now() - t0, text = (run.stdout || '') + '\n--- stderr ---\n' + (run.stderr || ''), summary = {};
  for (const key of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {const m = [...text.matchAll(new RegExp('^(?:#|\\u2139) ' + key + ' (\\d+)$', 'gm'))]; if (m.length) summary[key] = Number(m.at(-1)[1]);}
  fs.writeFileSync(path.join(logDir, name + '.log'), mask(text) + '\nEXIT_CODE=' + run.status + ' SIGNAL=' + run.signal + ' MS=' + ms + '\n');
  result.results.push({gate: name, command: [cmd, ...args].join(' '), exitCode: run.status, signal: run.signal, ms, nodeTestSummary: summary});
  console.log(name, run.status, ms, JSON.stringify(summary));
}
result.statusAfter = git('status', '--porcelain') || '(clean)'; result.finished = new Date().toISOString();
fs.writeFileSync(path.join(here, 'gates.json'), JSON.stringify(result, null, 1));
