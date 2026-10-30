// Print the round-3 results needed for review.md in one pass.
//   node digest-results.mjs
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const j = f => {try {return JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));} catch {return null;}};
const line = (...a) => console.log(a.join('  '));
for (const f of ['mutation/r3-phase1.json', 'mutation/r3-confirm.json', 'mutation/r2rerun-phase1.json', 'mutation/r2rerun-confirm.json']) {
  const r = j(f); if (!r) {line(f, 'missing'); continue;}
  line('\n## ' + f, 'head ' + (r.head || '').slice(0, 7), 'status ' + (r.statusBefore || '') + ' -> ' + (r.statusAfter || ''), r.phase || '');
  for (const m of r.mutants) line(m.id.padEnd(46), m.invalid ? 'INVALID ' + m.invalid : m.error ? 'ERROR' : m.killed ? 'killed' : 'SURVIVED', m.runs.map(x => `[exit ${x.exit} tests ${x.tests ?? ''} pass ${x.pass} fail ${x.fail} cancelled ${x.cancelled} ${Math.round(x.ms / 1000)}s${x.failing?.length ? ' :: ' + x.failing.slice(0, 2).join(' | ').slice(0, 160) : ''}]`).join(' '), m.restored === false ? 'NOT RESTORED' : '');
  line('summary', JSON.stringify(r.summary));
}
for (const f of ['browser/bench-I1-instance-bounds-template-only.json', 'browser/bench-E1-editor-never-instances.json', 'browser/bench-R1-merged-bounds-first-roof.json', 'browser/bench-E2-editor-never-merges-roofs.json']) {
  const r = j(f); if (!r) {line(f, 'missing'); continue;}
  line('\n## ' + f, 'refused: ' + (r.refused ? r.refused.length + ' :: ' + r.refused.slice(0, 3).join(' | ').slice(0, 400) : 'none'), 'expect equal ' + (r.expect || []).filter(x => JSON.stringify(x.measured) === JSON.stringify(x.expected)).length + '/' + (r.expect || []).length);
  for (const row of r.summary) for (const [v, x] of Object.entries(row.views)) line(row.map, v, 'calls ' + x.counts.a[0].calls + '/' + x.counts.b[0].calls, 'tri ' + x.counts.a[0].triangles + '/' + x.counts.b[0].triangles);
}
const g = path.join(here, 'gates/summary.txt'); if (fs.existsSync(g)) {console.log('\n## gates'); console.log(fs.readFileSync(g, 'utf8'));}
const s = j('swift-timing.json'); if (s) {console.log('\n## swift timing ' + s.browser); for (const r of s.rows) line(r.dir + '/' + r.map, r.view, r.aMs.toFixed(1) + ' -> ' + r.bMs.toFixed(1) + ' ms', 'x' + r.ratio.toFixed(2), 'blocks ' + r.blockRatios.map(x => x.toFixed(2)).join(' '), 'tri ' + (r.counts.a.triangles / 1e6).toFixed(1) + 'M -> ' + (r.counts.b.triangles / 1e6).toFixed(1) + 'M', 'calls ' + r.counts.a.calls + ' -> ' + r.counts.b.calls);}
