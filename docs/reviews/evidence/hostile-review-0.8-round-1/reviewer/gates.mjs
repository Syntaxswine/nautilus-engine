// Run the repository gates on the reviewed tree, one after another, and record
// each exit code, duration and node:test summary. Logs are masked.
// Usage: node artifacts/r08-1/gates.mjs [gate ...]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {sandbox, evidenceDir, mask, treeState, nodeRig, writeResult} from './lib/common.mjs';

const all = {
  'check-tracked': ['npm', ['run', 'check', '--', '--tracked']],
  test: ['npm', ['test']],
  'test-upstream': ['npm', ['run', 'test:upstream']],
  build: ['npm', ['run', 'build']],
  'test-package': ['npm', ['run', 'test:package']],
  'review-integration': ['npm', ['run', 'review:integration']],
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(all);
const logDir = path.join(evidenceDir, 'gates');
fs.mkdirSync(logDir, {recursive: true});
const before = treeState();
const results = [];
for (const name of wanted) {
  const [cmd, args] = all[name];
  const started = Date.now();
  const run = spawnSync(cmd, args, {cwd: sandbox, shell: true, encoding: 'utf8', maxBuffer: 1 << 28, windowsHide: true, timeout: 40 * 60 * 1000});
  const ms = Date.now() - started;
  const text = (run.stdout || '') + '\n--- stderr ---\n' + (run.stderr || '');
  const summary = {};
  for (const key of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const m = [...text.matchAll(new RegExp('^# ' + key + ' (\\d+)$', 'gm'))];
    if (m.length) summary[key] = Number(m.at(-1)[1]);
  }
  fs.writeFileSync(path.join(logDir, name + '.log'), mask(text) + '\nEXIT_CODE=' + run.status + ' SIGNAL=' + run.signal + ' MS=' + ms + '\n');
  results.push({gate: name, command: [cmd, ...args].join(' '), exitCode: run.status, signal: run.signal, error: run.error?.message, ms, nodeTestSummary: summary});
  console.log(name, run.status, ms, JSON.stringify(summary));
}
writeResult('gates-' + wanted.join('+') + '.json', {rig: nodeRig(), treeBefore: before, results});
