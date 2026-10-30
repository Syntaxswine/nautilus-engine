// How close the bridge tests come to their 20 s bound. The full suite runs quiet, then under N busy
// loops (killed by their own handles in a finally); the tap reporter's duration_ms for each test in
// tests/editor-host-bridge.test.mjs is recorded. Usage: node bound-stress.mjs <checkout> <out.json> [N]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn, spawnSync} from 'node:child_process';
const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]), loops = +(process.argv[4] || 16);
const suite = () => {
  const start = Date.now(), r = spawnSync('node --test --test-reporter=tap tests/*.test.mjs', {cwd: root, shell: true, encoding: 'utf8', maxBuffer: 256 << 20, timeout: 900000});
  const out = r.stdout || '', tests = {};
  // A tap test line, then its YAML block with duration_ms.
  const re = /^\s*(ok|not ok) \d+ - (.*)\n\s*---\n\s*duration_ms: ([\d.]+)/gm;
  for (const m of out.matchAll(re)) tests[m[2]] = {ok: m[1] === 'ok', ms: +m[3]};
  const bridge = Object.fromEntries(Object.entries(tests).filter(([name]) => /page bridge|Send buttons|sendToGame sends|nautilus\.open loads|Example yard button|deployed Send click|page double records/.test(name)));
  const slowest = Object.entries(tests).filter(([name]) => !name.endsWith('.test.mjs')).sort((a, b) => b[1].ms - a[1].ms).slice(0, 5).map(([name, v]) => ({name: name.slice(0, 90), ms: Math.round(v.ms)}));
  return {status: r.status, seconds: (Date.now() - start) / 1000, cancelled: +(out.match(/^# cancelled (\d+)$/m)?.[1] ?? NaN), bridge, slowest};
};
const record = {cores: os.cpus().length, loops, quiet: suite()};
const spinners = Array.from({length: loops}, () => spawn(process.execPath, ['-e', 'for(;;){}'], {stdio: 'ignore'}));
try { record.stressed = suite(); } finally { for (const child of spinners) child.kill(); }
fs.writeFileSync(outFile, JSON.stringify(record, null, 1));
console.log(JSON.stringify({quiet: Object.values(record.quiet.bridge).map(v => Math.round(v.ms)), stressed: Object.values(record.stressed.bridge).map(v => Math.round(v.ms)), quietSeconds: record.quiet.seconds, stressedSeconds: record.stressed.seconds, cancelled: [record.quiet.cancelled, record.stressed.cancelled]}));
