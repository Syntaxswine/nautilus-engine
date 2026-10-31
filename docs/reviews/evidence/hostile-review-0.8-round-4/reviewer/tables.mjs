// Tabulates a bench JSON (tools/bench-asset-rendering.mjs --editor): per map and view the
// assets-only and whole-frame ratios (median of runs, range), the GPU elapsed time of the
// isolated frames (A -> B ms), and each arm's CPU submit time beside its GPU elapsed time
// (when GPU elapsed tracks the CPU submit time, the timer measures the command feed).
//   node tables.mjs <bench.json>
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), f = x => x === undefined ? '-' : x.toFixed(2), rg = s => s ? `×${f(s.median)} (${f(s.min)}–${f(s.max)})` : '-';
const V = ['overview', 'close', 'far', 'cutaway'];
console.log(`trees a ${r.trees.a.commit || JSON.stringify(r.trees.a).slice(0, 80)} b ${r.trees.b.commit || JSON.stringify(r.trees.b).slice(0, 80)}; runs ${r.runs}; ${r.browsers.map(b => b.gpu).join(' | ')}`);
for (const [title, key] of [['Assets only', ':assets'], ['Whole frame', '']]) {
  console.log(`\n### ${title}\n| map | ${V.join(' | ')} |\n|---|${V.map(() => '---').join('|')}|`);
  for (const row of r.summary) console.log(`| ${row.map} | ${V.map(v => rg(row.views[v + key]?.speedup)).join(' | ')} |`);
}
console.log(`\n### GPU elapsed, assets only (A ms -> B ms)\n| map | ${V.join(' | ')} |\n|---|${V.map(() => '---').join('|')}|`);
for (const row of r.summary) console.log(`| ${row.map} | ${V.map(v => {const g = row.views[v + ':assets']?.gpu; return g ? `${f(g.ms.a)} → ${f(g.ms.b)} (${rg(g.speedup)})` : '-';}).join(' | ')} |`);
console.log(`\n### CPU submit vs GPU elapsed, assets only, ms (A cpu/gpu; B cpu/gpu)\n| map | ${V.join(' | ')} |\n|---|${V.map(() => '---').join('|')}|`);
for (const row of r.summary) console.log(`| ${row.map} | ${V.map(v => {const x = row.views[v + ':assets']; return x?.gpu ? `${f(x.cpuMs.a)}/${f(x.gpu.ms.a)}; ${f(x.cpuMs.b)}/${f(x.gpu.ms.b)}` : '-';}).join(' | ')} |`);
console.log('\nrefused: ' + (r.refused ? r.refused.length + '\n  ' + r.refused.slice(0, 8).join('\n  ') : 0) + '; --expect headless ' + (r.expect?.length ?? 0) + ', culled ' + (r.expectCulled?.length ?? 0));
