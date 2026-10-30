// Tables for the answer to round 4 from a bench result (editor mode): assets-only, whole-frame
// and GPU speedups per map and view (median and range over runs); the GPU span against the
// CPU submit time per arm (own: the span exceeds the submit time, so it is the GPU's own);
// culled asset draws and triangles per arm with the triangle change; how many changed views
// reach x2 by median and by their whole range; --expect checks and refusals; pixel rows.
//   node tables-r4.mjs <result.json> [--changed id,id,...]
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), args = process.argv.slice(3);
const VIEWS = ['overview', 'close', 'far', 'cutaway'], f2 = x => x == null ? '—' : x.toFixed(2), M = x => (x / 1e6).toFixed(2) + ' M';
const cell = v => v ? `×${f2(v.median)} (${f2(v.min)}–${f2(v.max)})` : '—';
const rows = r.summary || [], backend = rows[0]?.backend;
console.log(`Backend ${backend}; runs ${r.runs}; frames ${r.framesPerBlock} x ${r.blocks} blocks; trees a ${r.trees.a.head?.slice(0, 7)} [${r.trees.a.status}] b ${r.trees.b.head?.slice(0, 7)} [${r.trees.b.status}]; ${r.browsers.map(b => b.backend + ' ' + b.version + ' ' + b.gpu + ' ' + JSON.stringify(b.caps)).join('; ')}`);
for (const [title, key] of [['Assets only (direct)', ':assets'], ['Whole frame', '']]) {
  console.log(`\n### ${title}\n\n| map | ${VIEWS.join(' | ')} |\n|---|${VIEWS.map(() => '---').join('|')}|`);
  for (const row of rows) console.log(`| ${row.map} | ${VIEWS.map(v => cell(row.views[v + key]?.speedup)).join(' | ')} |`);
}
console.log(`\n### Assets only, ms per frame (A → B)\n\n| map | ${VIEWS.join(' | ')} |\n|---|${VIEWS.map(() => '---').join('|')}|`);
for (const row of rows) console.log(`| ${row.map} | ${VIEWS.map(v => {const x = row.views[v + ':assets']; return x ? `${f2(x.totalMs.a)} → ${f2(x.totalMs.b)}` : '—';}).join(' | ')} |`);
console.log(`\n### GPU span, assets only: A cpu/gpu → B cpu/gpu ms (* where the span exceeds the submit time: the GPU's own)\n\n| map | ${VIEWS.join(' | ')} |\n|---|${VIEWS.map(() => '---').join('|')}|`);
for (const row of rows) console.log(`| ${row.map} | ${VIEWS.map(v => {const x = row.views[v + ':assets'], g = x?.gpu; return g ? `${f2(x.cpuMs.a)}/${f2(g.ms.a)}${g.own?.a ? '*' : ''} → ${f2(x.cpuMs.b)}/${f2(g.ms.b)}${g.own?.b ? '*' : ''}` : '—';}).join(' | ')} |`);
console.log(`\n### Culled asset draws and triangles (A → B, first run; triangle change)\n\n| map | ${VIEWS.join(' | ')} |\n|---|${VIEWS.map(() => '---').join('|')}|`);
for (const id of r.maps) {
  const s = r.samples.find(x => x.map === id && x.culled);
  if (s) console.log(`| ${id} | ${VIEWS.map(v => {const c = s.culled[v]; if (!c) return '—'; const d = c.a.triangles ? ((c.b.triangles / c.a.triangles - 1) * 100) : null; return `${c.a.main + c.a.shadow} → ${c.b.main + c.b.shadow} draws, ${M(c.a.triangles)} → ${M(c.b.triangles)}${d == null ? '' : ' (' + (d >= 0 ? '+' : '') + d.toFixed(1) + ' %)'}`;}).join(' | ')} |`);
}
// N1: the views reaching x2, by median and by the whole range (min), over the maps named changed.
const changed = args.includes('--changed') ? args[args.indexOf('--changed') + 1].split(',') : null;
if (changed) {
  let views = 0, median = 0, range = 0; const misses = [];
  for (const row of rows.filter(x => changed.includes(x.map))) for (const v of VIEWS) {
    // A view counts where either arm draws an asset in it (its culled asset draws).
    const x = row.views[v + ':assets'], c = r.samples.find(s => s.map === row.map && s.culled)?.culled[v];
    if (!x || !c || !(c.a.main + c.a.shadow + c.b.main + c.b.shadow)) continue;
    views++; if (x.speedup.median >= 2) median++; else misses.push(row.map + ' ' + v + ' ' + cell(x.speedup)); if (x.speedup.min >= 2) range++;
  }
  console.log(`\nAt least x2, assets only: ${median} of ${views} views by median, ${range} by their whole range. Misses: ${misses.join('; ') || 'none'}`);
}
console.log(`\n--expect: ${(r.expect || []).length} headless checks, ${(r.expectCulled || []).length} culled checks; refused: ${(r.refused || []).length}`);
for (const line of (r.refused || []).slice(0, 12)) console.log('  ' + line);
if (r.pixels) {
  console.log(`\n### Pixels (A → B, run 0; repeat = run 1 of A identical)\n\n| map | view | differ | max | ≤2 levels | strong ties | unexplained blobs (count, largest) | repeat |\n|---|---|---|---|---|---|---|---|`);
  for (const p of r.pixels) console.log(`| ${p.map} | ${p.view} | ${p.differing} | ${p.maxDelta} | ${p.withinTwoLevels} | ${p.strongTies} | ${p.unexplainedBlobs.count}, ${p.unexplainedBlobs.largest.join('/') || '—'} | ${p.repeatOfAIdentical} |`);
}
