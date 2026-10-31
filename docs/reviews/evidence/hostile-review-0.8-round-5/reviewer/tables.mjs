// Round 5 (round 4's tables.mjs, extended): per map and view of a bench JSON
// (tools/bench-asset-rendering.mjs --editor), the assets-only and whole-frame ratios (median of
// runs, range), the assets-only ms per frame (A -> B), the `own` flag and spans, and the culled
// asset draws and triangles of both arms (run 0; every run repeats them: frames() refuses a change).
//   node tables.mjs <bench.json>
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), f = x => x === undefined || x === null ? '-' : x.toFixed(2), rg = s => s ? `×${f(s.median)} (${f(s.min)}–${f(s.max)})` : '-';
const V = ['overview', 'close', 'far', 'cutaway'];
const id = t => (t.head || '').slice(0, 7) + ' [' + (t.status || '') + ']';
console.log(`trees a ${id(r.trees.a)} b ${id(r.trees.b)}; runs ${r.runs}; frames ${r.framesPerBlock} x ${r.blocks} blocks; ${[...new Set(r.browsers.map(b => b.gpu))].join(' | ')}`);
for (const [title, key] of [['Assets only (direct)', ':assets'], ['Whole frame', '']]) {
  console.log(`\n### ${title}\n\n| map | ${V.join(' | ')} |\n|---|${V.map(() => '---').join('|')}|`);
  for (const row of r.summary) console.log(`| ${row.map} | ${V.map(v => rg(row.views[v + key]?.speedup)).join(' | ')} |`);
}
console.log(`\n### Assets only, ms per frame (A → B, medians)\n\n| map | ${V.join(' | ')} |\n|---|${V.map(() => '---').join('|')}|`);
for (const row of r.summary) console.log(`| ${row.map} | ${V.map(v => {const x = row.views[v + ':assets']; return x ? `${f(x.totalMs.a)} → ${f(x.totalMs.b)}` : '-';}).join(' | ')} |`);
console.log(`\n### GPU span, assets only: A cpu/gpu → B cpu/gpu ms (* own: the span exceeds the submit time)\n\n| map | ${V.join(' | ')} |\n|---|${V.map(() => '---').join('|')}|`);
for (const row of r.summary) console.log(`| ${row.map} | ${V.map(v => {const x = row.views[v + ':assets']; return x?.gpu ? `${f(x.cpuMs.a)}/${f(x.gpu.ms.a)}${x.gpu.own?.a ? '*' : ''} → ${f(x.cpuMs.b)}/${f(x.gpu.ms.b)}${x.gpu.own?.b ? '*' : ''}` : '-';}).join(' | ')} |`);
console.log(`\n### Culled asset draws (main + shadow) and triangles, A → B (run 0)\n\n| map | ${V.join(' | ')} |\n|---|${V.map(() => '---').join('|')}|`);
for (const row of r.summary) {
  const s = r.samples.find(x => x.map === row.map && x.run === 0);
  console.log(`| ${row.map} | ${V.map(v => {const c = s?.culled?.[v]; if (!c?.a || !c?.b) return '-'; const g = c.a.triangles ? ((c.b.triangles / c.a.triangles - 1) * 100) : 0; return `${c.a.main + c.a.shadow} → ${c.b.main + c.b.shadow}; ${(c.a.triangles / 1e6).toFixed(2)} → ${(c.b.triangles / 1e6).toFixed(2)} Mt (${g >= 0 ? '+' : ''}${g.toFixed(1)} %)`;}).join(' | ')} |`);
}
console.log('\nrefused: ' + (r.refused ? r.refused.length + '\n  ' + r.refused.slice(0, 8).join('\n  ') : 0) + '; --expect headless ' + (r.expect?.length ?? 0) + ', culled ' + (r.expectCulled?.length ?? 0));
