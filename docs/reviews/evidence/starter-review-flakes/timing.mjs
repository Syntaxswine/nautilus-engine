// Timing of the first phone capture in one probe run: split by whether it failed, and the
// two groups of arms the counts fall into. node timing.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2], rows = [];
for (const folder of fs.readdirSync(dir)) {const base = path.join(dir, folder); if (!fs.statSync(base).isDirectory()) continue; for (const file of fs.readdirSync(base)) if (/^result-.*\.jsonl$/.test(file)) for (const line of fs.readFileSync(path.join(base, file), 'utf8').trim().split('\n')) if (line) rows.push(JSON.parse(line));}
const q = (v, p) => {if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))];};
const show = (name, v) => console.log(name.padEnd(46), 'n', String(v.length).padStart(3), ' min', q(v, 0), ' p25', q(v, .25), ' med', q(v, .5), ' p75', q(v, .75), ' max', q(v, .999));
const risky = new Set(['old', 'front', 'state', 'viewport']);
const fails = rows.filter(r => r.outcome === 'capture').map(r => r.failure).filter(Boolean);
const passes = rows.filter(r => risky.has(r.arm) && r.timing).map(r => r.timing);
show('since load, failed capture', fails.map(f => f.sinceLoad));
show('since load, passed capture (same arms)', passes.map(t => t.sinceLoad));
show('capture ms, failed', fails.map(f => f.captureMs));
show('capture ms, passed (same arms)', passes.map(t => t.captureMs));
show('page age at the check after failure', fails.map(f => Math.round(f.page?.now ?? 0)));
show('first retry ms', fails.map(f => f.retries[0]?.ms ?? 0));
for (const arm of ['close', 'paint', 'main', 'delay']) show('capture ms, ' + arm, rows.filter(r => r.arm === arm && r.timing).map(r => r.timing.captureMs));
const group = names => {const s = rows.filter(r => names.has(r.arm)); return s.filter(r => r.outcome === 'capture').length + ' of ' + s.length;};
console.log('arms that still fail:', group(risky), ' arms that do not:', group(new Set(['close', 'paint', 'main', 'delay'])));
const starts = rows.filter(r => r.outcome === 'other');
console.log('Start key failure (line 19):', starts.length, 'of', rows.length, ' by arm:', Object.entries(starts.reduce((m, r) => {m[r.arm] = (m[r.arm] || 0) + 1; return m;}, {})).map(x => x.join(' ')).join(', '));
console.log('by job:', Object.entries(starts.reduce((m, r) => {m[r.job] = (m[r.job] || 0) + 1; return m;}, {})).map(x => x.join(': ')).join('  '));
