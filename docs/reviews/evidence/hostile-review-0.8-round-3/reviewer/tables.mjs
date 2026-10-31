// Summarise a bench result (tools/bench-asset-rendering.mjs --editor): per map and
// view, the whole-frame and assets-only medians, per-run ratio median and range,
// the draw counts, and the --expect and isolation outcome.
//   node tables.mjs <result.json> [more.json ...]
import fs from 'node:fs';
const median = v => {const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('\n# ' + file.split(/[\\/]/).pop() + ' — ' + r.rig.cpu + ', ' + (r.browsers || []).map(b => b.backend + ' ' + b.version + ' ' + (b.gpu || '')).join('; ') + ', runs ' + r.runs + ', frames ' + r.framesPerBlock + ' x ' + r.blocks + ' blocks');
  console.log('trees: A ' + r.trees.a.head?.slice(0, 7) + ' [' + (r.trees.a.status || '').trim() + '] B ' + r.trees.b.head?.slice(0, 7) + ' [' + (r.trees.b.status || '').trim() + '], loadavg ' + JSON.stringify(r.rig.loadavg));
  for (const row of r.summary) {
    for (const [view, v] of Object.entries(row.views)) {
      const ca = v.counts.a[0], cb = v.counts.b[0];
      console.log([row.map.padEnd(30), view.padEnd(16), (v.totalMs.a.toFixed(2) + ' -> ' + v.totalMs.b.toFixed(2) + ' ms').padEnd(20), ('x' + v.speedup.median.toFixed(2) + ' (' + v.speedup.min.toFixed(2) + '-' + v.speedup.max.toFixed(2) + ')').padEnd(20),
        'cpu ' + v.cpuMs.a.toFixed(2) + '->' + v.cpuMs.b.toFixed(2), 'calls ' + ca.calls + '->' + cb.calls + ' (shadow ' + ca.shadowCalls + '->' + cb.shadowCalls + ')', 'tri ' + (ca.triangles / 1e6).toFixed(2) + 'M->' + (cb.triangles / 1e6).toFixed(2) + 'M', v.counts.a.length > 1 || v.counts.b.length > 1 ? 'COUNTS VARY' : ''].join('  '));
    }
  }
  if (r.expect) {const bad = r.expect.filter(x => JSON.stringify(x.measured) !== JSON.stringify(x.expected)); console.log('expect: ' + (r.expect.length - bad.length) + ' of ' + r.expect.length + ' equal' + (bad.length ? ' — ' + JSON.stringify(bad.slice(0, 3)) : ''));}
  console.log('refused: ' + (r.refused ? r.refused.length + ' — ' + r.refused.slice(0, 4).join(' | ') : 'none'));
}
