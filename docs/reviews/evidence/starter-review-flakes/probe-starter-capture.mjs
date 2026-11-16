// Probe, not a gate (never merged): run the real starter review in a loop, arm by arm in a
// fresh shuffled order each cycle, and count how each arm ends. An arm is a set of switches
// over main's capture correction (tools/review-game-starter.mjs reads PROBE_ARM). The old
// arm must fail at about CI's rate, or the probe cannot resolve anything.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync, execSync} from 'node:child_process';
const out = path.resolve('artifacts/starter-probe'), starterOut = path.resolve('artifacts/game-starter');
fs.mkdirSync(path.join(out, 'failures'), {recursive: true});
const ARMS = JSON.parse(process.env.PROBE_ARMS || '{"old":"","main":"close,front,visible,paint,state"}');
const job = Number(process.env.PROBE_JOB || 1), cycles = Number(process.env.PROBE_CYCLES || 2), budget = Number(process.env.PROBE_BUDGET_MINUTES || 45) * 60000, start = Date.now();
let seed = Math.imul(job, 2654435761) >>> 0;
const rand = n => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n);};
const shuffle = list => {const a = [...list]; for (let i = a.length - 1; i > 0; i--) {const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]];} return a;};
const sh = command => {try {return execSync(command, {encoding: 'utf8'}).trim();} catch (error) {return 'failed: ' + error.message;}};
fs.writeFileSync(path.join(out, 'machine-' + job + '.json'), JSON.stringify({job, arms: ARMS, cpu: sh("lscpu | grep -E 'Model name|^CPU\\(s\\)|Thread|MHz'"), memory: sh('free -m'), kernel: sh('uname -r'), node: process.version}, null, 2));
const read = name => {try {return JSON.parse(fs.readFileSync(path.join(starterOut, name), 'utf8'));} catch {return null;}};
const tally = {};
let n = 0, done = 0;
for (let cycle = 0; cycle < cycles; cycle++) {
  if (Date.now() - start > budget) break;
  for (const arm of shuffle(Object.keys(ARMS))) {
    n++;
    for (const name of ['capture-failure.json', 'capture-timing.json', 'start-failure.json']) fs.rmSync(path.join(starterOut, name), {force: true});
    const t = Date.now();
    const run = spawnSync(process.execPath, ['tools/review-game-starter.mjs'], {encoding: 'utf8', maxBuffer: 1 << 28, timeout: 200000, env: {...process.env, PROBE_ARM: ARMS[arm], DEBUG: 'pw:browser'}});
    const ms = Date.now() - t, text = (run.stdout || '') + '\n' + (run.stderr || '');
    const passed = run.status === 0 && /Standard game starter browser acceptance passed\./.test(run.stdout || '');
    const capture = /Unable to capture screenshot/.test(text);
    const outcome = passed ? 'pass' : capture ? 'capture' : run.status === null ? 'killed' : 'other';
    const where = (text.match(/review-game-starter\.mjs:(\d+):/) || [])[1] ?? null;
    fs.appendFileSync(path.join(out, 'result-' + job + '.jsonl'), JSON.stringify({job, cycle, n, arm, outcome, where, status: run.status, signal: run.signal, ms, at: new Date(t).toISOString(), load: os.loadavg()[0], timing: read('capture-timing.json'), failure: read('capture-failure.json'), start: read('start-failure.json')}) + '\n');
    if (!passed) fs.writeFileSync(path.join(out, 'failures', 'job' + job + '-n' + n + '-' + arm + '.log'), text.slice(-200000));
    (tally[arm] ??= {pass: 0, capture: 0, other: 0, killed: 0})[outcome]++;
    console.log(n + ' cycle ' + cycle + ' ' + arm + ' ' + outcome + ' ' + ms + ' ms' + (where && !passed ? ' at :' + where : ''));
  }
  done = cycle + 1;
}
console.log('job ' + job + ': ' + done + ' of ' + cycles + ' cycles in ' + ((Date.now() - start) / 60000).toFixed(1) + ' min');
for (const [arm, t] of Object.entries(tally)) console.log(arm.padEnd(10) + JSON.stringify(t));
