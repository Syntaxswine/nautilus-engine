// Recount from the committed results alone, which it only reads: capture failures by CPU
// model in each probe, and the exact paired test (two-sided McNemar) for the two paired Start
// key experiments. A pair is one cycle of one runner, or one cycle of one seed, because every
// arm ran in each cycle.
//   node recount.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const read = file => fs.readFileSync(path.join(dir, file), 'utf8');
const probe = name => [1, 2, 3, 4, 5, 6].map(job => ({
  job,
  cpu: JSON.parse(read(`${name}/machine-${job}.json`)).cpu.match(/Model name:\s*(.*)/)[1].trim(),
  rows: read(`${name}/result-${job}.jsonl`).trim().split('\n').map(line => JSON.parse(line)),
}));
const failed = rows => rows.filter(r => r.outcome === 'capture').length;
const choose = (n, k) => {let c = 1; for (let i = 1; i <= k; i++) c = c * (n - k + i) / i; return c;};
const paired = (a, b) => {const n = a + b; let tail = 0; for (let i = 0; i <= Math.min(a, b); i++) tail += choose(n, i); return Math.min(1, 2 * tail / 2 ** n);};
const report = (name, a, b, pairs) => console.log(name.padEnd(30), 'pairs', String(pairs).padStart(4), ' first arm only failed', String(a).padStart(3), ' second only', b, ' p =', paired(a, b));
for (const name of ['probe-1', 'probe-2']) {
  const jobs = probe(name), models = [...new Set(jobs.map(j => j.cpu))].sort();
  console.log(name + ':', jobs.reduce((n, j) => n + j.rows.length, 0), 'reviews, capture failures by model');
  for (const cpu of models) {
    const own = jobs.filter(j => j.cpu === cpu), rows = own.flatMap(j => j.rows), old = rows.filter(r => r.arm === 'old');
    console.log(' ', cpu.padEnd(34), 'jobs', own.map(j => j.job).join(','), ' ', failed(rows) + ' of ' + rows.length, ...(old.length ? [' old arm', failed(old) + ' of ' + old.length] : []));
  }
}
const cycles = new Map();
for (const {job, rows} of probe('probe-2')) for (const r of rows) (cycles.get(job + ':' + r.cycle) ?? cycles.set(job + ':' + r.cycle, {}).get(job + ':' + r.cycle))[r.arm] = r.outcome;
const pairs = [...cycles.values()];
if (!pairs.every(p => p.main && p.fixed)) throw Error('A probe 2 cycle lacks an arm');
console.log('\nexact paired test');
report('probe 2: no wait, event wait', pairs.filter(p => p.main !== 'pass' && p.fixed === 'pass').length, pairs.filter(p => p.main === 'pass' && p.fixed !== 'pass').length, pairs.length);
const merged = ['close-race-merged-1.json', 'close-race-merged-2.json'].map(file => JSON.parse(read(file)));
const lost = merged.flatMap(m => m.log.map(l => m.seed + ':' + l.cycle + ':' + l.arm));
if (new Set(lost).size !== lost.length || !lost.every(l => l.endsWith(':old'))) throw Error('A merged failure is not one old cycle');
if (merged.some(m => m.tally.title.started !== m.cycles || m.tally.both.started !== m.cycles)) throw Error('A repaired arm did not start every cycle');
report('merged tree: old, title', lost.length, 0, merged.reduce((n, m) => n + m.cycles, 0));
