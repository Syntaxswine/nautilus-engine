// The capture failure's base rate: only runs whose commit carries the starter review and
// whose CI ran it (the failure cannot occur otherwise), split by event and by whether the
// commit holds b8dd25d. Run by `node rate.mjs <census.tsv>` from the worktree's folder.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const [file, repo] = process.argv.slice(2);
const git = (...args) => {try {return execFileSync('git', ['-C', repo, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});} catch {return null;}};
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').filter(l => l !== 'DONE').map(l => {const [id, at, sha, event, concl, has, branch, sig] = l.split('\t'); return {id, at, sha, event, concl, has, branch, sig: sig || ''};});
const carries = new Map();
const ranStep = sha => {
  if (carries.has(sha)) return carries.get(sha);
  const yml = git('show', sha + ':.github/workflows/check.yml');
  const ok = yml != null && /review:starter/.test(yml);
  carries.set(sha, ok); return ok;
};
const usable = rows.filter(r => (r.concl === 'success' || r.concl === 'failure') && ranStep(r.sha));
const missing = rows.filter(r => git('cat-file', '-t', r.sha) == null).length;
console.log('listed', rows.length, 'commits missing here', missing, 'usable (CI ran review:starter)', usable.length);
const cap = r => /Unable to capture screenshot/.test(r.sig);
const line = (name, s) => console.log(name.padEnd(40), 'runs', String(s.length).padStart(3), 'capture failures', String(s.filter(cap).length).padStart(3), ((100 * s.filter(cap).length / Math.max(1, s.length)).toFixed(1) + ' %').padStart(8), ' other failures', s.filter(r => r.concl === 'failure' && !cap(r)).length);
line('all', usable);
for (const event of ['push', 'pull_request']) line(event, usable.filter(r => r.event === event));
line('without b8dd25d', usable.filter(r => r.has === 'no'));
for (const event of ['push', 'pull_request']) line('without b8dd25d, ' + event, usable.filter(r => r.has === 'no' && r.event === event));
line('with b8dd25d', usable.filter(r => r.has === 'yes'));
const days = {}; for (const r of usable.filter(r => r.has === 'no')) (days[r.at.slice(0, 10)] ??= []).push(r);
for (const [day, s] of Object.entries(days).sort()) line(day, s);
const first = usable.filter(cap).at(-1); console.log('first capture failure', first?.at, first?.sha);
// Same commit in both events: did the two runs agree?
const pairs = {}; for (const r of usable) (pairs[r.sha] ??= {})[r.event] = r;
let both = 0, pf = 0, rf = 0, ff = 0; for (const p of Object.values(pairs)) if (p.push && p.pull_request) {both++; const a = cap(p.push), b = cap(p.pull_request); if (a && b) ff++; else if (a) pf++; else if (b) rf++;}
console.log('commits with both events', both, 'push only failed', pf, 'PR only failed', rf, 'both failed', ff);
