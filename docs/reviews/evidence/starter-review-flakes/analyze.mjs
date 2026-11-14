// Read one probe run's artifacts: outcome by arm with exact intervals, Fisher's exact test
// against the old arm, the rate by runner (is it the machine?), capture timing, what a
// retry after an empty capture does, and what the browser logged around each failure.
//   node analyze.mjs <dir with starter-probe-N folders> [reference arm]
import fs from 'node:fs';
import path from 'node:path';
const [dir, reference = 'old'] = process.argv.slice(2);
const rows = [], machines = {};
for (const folder of fs.readdirSync(dir)) {
  const base = path.join(dir, folder); if (!fs.statSync(base).isDirectory()) continue;
  for (const file of fs.readdirSync(base)) {
    if (/^result-.*\.jsonl$/.test(file)) for (const line of fs.readFileSync(path.join(base, file), 'utf8').trim().split('\n')) if (line) rows.push(JSON.parse(line));
    if (/^machine-.*\.json$/.test(file)) {const m = JSON.parse(fs.readFileSync(path.join(base, file), 'utf8')); machines[m.job] = (m.cpu.match(/Model name:\s*(.*)/) || [])[1] ?? m.cpu;}
  }
}
const logf = []; {let s = 0; for (let i = 0; i < 5000; i++) {logf[i] = s; s += Math.log(i + 1);}}
const choose = (n, k) => logf[n] - logf[k] - logf[n - k];
const binomCdf = (k, n, p) => {let s = 0; for (let i = 0; i <= k; i++) s += Math.exp(choose(n, i) + i * Math.log(p || 1e-300) + (n - i) * Math.log(1 - p || 1e-300)); return s;};
const upper = (k, n) => {if (k >= n) return 1; let lo = k / n, hi = 1; for (let i = 0; i < 60; i++) {const mid = (lo + hi) / 2; if (binomCdf(k, n, mid) > 0.025) lo = mid; else hi = mid;} return hi;};
const lower = (k, n) => {if (k === 0) return 0; let lo = 0, hi = k / n; for (let i = 0; i < 60; i++) {const mid = (lo + hi) / 2; if (1 - binomCdf(k - 1, n, mid) < 0.025) lo = mid; else hi = mid;} return lo;};
const fisher = (a, b, c, d) => {const hyper = x => Math.exp(choose(a + b, x) + choose(c + d, a + c - x) - choose(a + b + c + d, a + c)), p0 = hyper(a); let p = 0; for (let x = Math.max(0, a + c - (c + d)); x <= Math.min(a + b, a + c); x++) {const q = hyper(x); if (q <= p0 * (1 + 1e-9)) p += q;} return Math.min(1, p);};
const median = v => {if (!v.length) return null; const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
const arms = [...new Set(rows.map(r => r.arm))];
const counts = arm => {const s = rows.filter(r => r.arm === arm), k = s.filter(r => r.outcome === 'capture').length, other = s.filter(r => r.outcome !== 'capture' && r.outcome !== 'pass').length; return {s, n: s.length, k, other};};
const ref = counts(reference);
console.log('iterations', rows.length, 'jobs', Object.keys(machines).length);
console.log('arm'.padEnd(12), 'n'.padStart(4), 'capture'.padStart(8), 'other'.padStart(6), 'rate'.padStart(7), '95 % CI'.padStart(15), 'p vs ' + reference, '  median ms since load / capture');
for (const arm of arms) {
  const {s, n, k, other} = counts(arm), timed = s.map(r => r.timing ?? r.failure).filter(Boolean);
  const p = arm === reference ? '' : fisher(k, n - k, ref.k, ref.n - ref.k).toExponential(1);
  console.log(arm.padEnd(12), String(n).padStart(4), String(k).padStart(8), String(other).padStart(6), ((100 * k / n).toFixed(1) + ' %').padStart(7), ((100 * lower(k, n)).toFixed(1) + '-' + (100 * upper(k, n)).toFixed(1) + ' %').padStart(15), String(p).padEnd(9), median(timed.map(t => t.sinceLoad)), '/', median(timed.map(t => t.captureMs)));
}
console.log('\nby runner (capture failures / iterations, every arm; then the reference arm):');
for (const [job, cpu] of Object.entries(machines)) {const s = rows.filter(r => String(r.job) === job), o = s.filter(r => r.arm === reference); console.log(' job', job, cpu.padEnd(46), s.filter(r => r.outcome === 'capture').length + '/' + s.length, ' ', o.filter(r => r.outcome === 'capture').length + '/' + o.length);}
const failed = rows.filter(r => r.outcome === 'capture');
console.log('\nwhere the capture failed:', Object.entries(failed.reduce((m, r) => {m[r.where] = (m[r.where] || 0) + 1; return m;}, {})));
console.log('by cycle (does a failure follow a failure?):');
{let after = 0, pairs = 0; for (const job of Object.keys(machines)) {const s = rows.filter(r => String(r.job) === job).sort((a, b) => a.n - b.n); for (let i = 1; i < s.length; i++) if (s[i - 1].outcome === 'capture') {pairs++; if (s[i].outcome === 'capture') after++;}} console.log(' after a failure, next iteration failed', after, 'of', pairs);}
const retry = failed.map(r => r.failure).filter(Boolean);
console.log('\nretries after the first empty capture (' + retry.length + ' with a record):');
console.log(' first retry at once ok:', retry.filter(f => f.retries[0]?.ok).length, '; ok by the last:', retry.filter(f => f.retries.some(x => x.ok)).length, '; never:', retry.filter(f => !f.retries.some(x => x.ok)).length);
console.log(' first capture ms (failed):', median(retry.map(f => f.captureMs)), ' page after:', JSON.stringify(retry[0]?.page));
console.log(' visibility after failure:', Object.entries(retry.reduce((m, f) => {const v = (f.page?.visibility ?? 'n/a') + '/' + (f.page?.focused ?? 'n/a'); m[v] = (m[v] || 0) + 1; return m;}, {})));
for (const r of rows.filter(r => r.outcome === 'other' || r.outcome === 'killed').slice(0, 12)) console.log(' OTHER', r.arm, 'job', r.job, 'n', r.n, 'status', r.status, r.signal, 'at', r.where);
