// Tables for the answer to round 3 from a bench result (editor mode): assets-only, whole-frame
// and GPU speedups per map and view (median and range over runs), culled asset triangles per
// arm, --expect checks and refusals, and the pixel rows when present.
//   node tables-r3.mjs <result.json>
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const VIEWS = ['overview', 'close', 'far', 'cutaway'], f2 = x => x == null ? '—' : x.toFixed(2), M = x => (x / 1e6).toFixed(2) + ' M';
const cell = v => v ? `×${f2(v.median)} (${f2(v.min)}–${f2(v.max)})` : '—';
const rows = r.summary || [], backend = rows[0]?.backend;
console.log(`Backend ${backend}; runs ${r.runs}; frames ${r.framesPerBlock} x ${r.blocks} blocks; trees a ${r.trees.a.head?.slice(0, 7)} b ${r.trees.b.head?.slice(0, 7)}; ${r.browsers.map(b => b.backend + ' ' + b.version + ' ' + b.gpu + ' ' + JSON.stringify(b.caps)).join('; ')}`);
for (const [title, key] of [['Assets only (direct)', ':assets'], ['Whole frame', '']]) {
  console.log(`\n### ${title}\n\n| map | ${VIEWS.join(' | ')} |\n|---|${VIEWS.map(() => '---').join('|')}|`);
  for (const row of rows) console.log(`| ${row.map} | ${VIEWS.map(v => cell(row.views[v + key]?.speedup)).join(' | ')} |`);
}
console.log(`\n### GPU time, assets only (A ms → B ms, speedup)\n\n| map | ${VIEWS.join(' | ')} |\n|---|${VIEWS.map(() => '---').join('|')}|`);
for (const row of rows) console.log(`| ${row.map} | ${VIEWS.map(v => {const g = row.views[v + ':assets']?.gpu; return g ? `${f2(g.ms.a)} → ${f2(g.ms.b)} (${cell(g.speedup)})` : '—';}).join(' | ')} |`);
console.log(`\n### Culled asset draws and triangles (A → B, first run)\n\n| map | ${VIEWS.join(' | ')} |\n|---|${VIEWS.map(() => '---').join('|')}|`);
for (const id of r.maps) {
  const s = r.samples.find(x => x.map === id && x.culled);
  if (s) console.log(`| ${id} | ${VIEWS.map(v => {const c = s.culled[v]; return c ? `${c.a.main + c.a.shadow} → ${c.b.main + c.b.shadow} draws, ${M(c.a.triangles)} → ${M(c.b.triangles)}` : '—';}).join(' | ')} |`);
}
console.log(`\n--expect: ${(r.expect || []).length} headless checks, ${(r.expectCulled || []).length} culled checks; refused: ${(r.refused || []).length}`);
for (const line of (r.refused || []).slice(0, 12)) console.log('  ' + line);
if (r.pixels) {
  console.log(`\n### Pixels (A → B, run 0; repeat = run 1 of A identical)\n\n| map | view | differ | max | ≤2 levels | strong ties | unexplained blobs (count, largest) | repeat |\n|---|---|---|---|---|---|---|---|`);
  for (const p of r.pixels) console.log(`| ${p.map} | ${p.view} | ${p.differing} | ${p.maxDelta} | ${p.withinTwoLevels} | ${p.strongTies} | ${p.unexplainedBlobs.count}, ${p.unexplainedBlobs.largest.join('/') || '—'} | ${p.repeatOfAIdentical} |`);
}
