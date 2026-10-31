// Round 5: re-derive the record's numbers from a bench result (the answer's formal run, or mine):
//  - N1: views whose assets-alone speedup reaches x2 by median and in every run (blanks and the
//    axis walls out, a view drawing no assets out: its isolated frame is the fixed passes only);
//  - SF-H: where a GPU span exceeds the CPU submit time (`own`), per arm, whole frame and assets;
//  - SF-I: culled asset triangles, candidate against main, per map and view (run 0's culled counts,
//    which every run repeats: the bench refuses a count that changes).
//   node formal-check.mjs <result.json> [--changed-only]
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const parsedBlank = id => /blank$/.test(id), axis = id => /walls-axis/.test(id);
const views = ['overview', 'close', 'far', 'cutaway'];
const rows = [], own = [], tris = [];
for (const row of r.summary) {
  const id = row.map;
  for (const v of views) {
    const a = row.views[v + ':assets'], w = row.views[v];
    if (!a) continue;
    const s0 = r.samples.find(s => s.map === id && s.run === 0), culled = s0?.culled?.[v];
    if (culled?.a && culled?.b) tris.push({map: id, view: v, a: culled.a.triangles, b: culled.b.triangles, grow: culled.a.triangles ? culled.b.triangles / culled.a.triangles - 1 : null, drawsA: culled.a.main + culled.a.shadow, drawsB: culled.b.main + culled.b.shadow});
    const empty = culled && culled.a.main + culled.a.shadow === 0 && culled.b.main + culled.b.shadow === 0;
    if (!parsedBlank(id) && !axis(id) && !empty) rows.push({map: id, view: v, median: a.speedup.median, min: a.speedup.min, max: a.speedup.max});
    for (const [label, x] of [['whole', w], ['assets', a]]) if (x?.gpu?.own && (x.gpu.own.a || x.gpu.own.b)) own.push({map: id, view: v, frame: label, own: x.gpu.own, gpuMs: x.gpu.ms, cpuMs: x.cpuMs});
  }
}
const byMedian = rows.filter(x => x.median >= 2), everyRun = rows.filter(x => x.min >= 2);
console.log(`views: ${rows.length}; x2 by median ${byMedian.length}, in every run ${everyRun.length}`);
console.log('misses by median: ' + rows.filter(x => x.median < 2).map(x => `${x.map} ${x.view} x${x.median.toFixed(2)} (${x.min.toFixed(2)}-${x.max.toFixed(2)})`).join('; '));
console.log('misses in some run: ' + rows.filter(x => x.median >= 2 && x.min < 2).map(x => `${x.map} ${x.view} x${x.median.toFixed(2)} (${x.min.toFixed(3)}-${x.max.toFixed(2)})`).join('; '));
const lit = id => /^l/.test(id);
for (const [label, f] of [['unlit', x => !lit(x.map)], ['lit', x => lit(x.map)]]) console.log(`${label}: ${rows.filter(f).length} views, by median ${byMedian.filter(f).length}, every run ${everyRun.filter(f).length}`);
console.log('\nown (GPU span > CPU submit):');
for (const x of own) console.log(`  ${x.map} ${x.view} ${x.frame}: own a=${x.own.a} b=${x.own.b}; gpu ${x.gpuMs.a.toFixed(2)}/${x.gpuMs.b.toFixed(2)} ms, cpu ${x.cpuMs.a.toFixed(2)}/${x.cpuMs.b.toFixed(2)} ms`);
console.log('\nculled asset triangles, b against a (run 0):');
const groups = new Map(); for (const t of tris) {if (!groups.has(t.map)) groups.set(t.map, []); groups.get(t.map).push(t);}
for (const [id, list] of groups) console.log(`  ${id}: ` + list.map(t => `${t.view} ${t.grow === null ? '-' : (t.grow >= 0 ? '+' : '') + (100 * t.grow).toFixed(1) + '%'} (${(t.a / 1e6).toFixed(2)}M -> ${(t.b / 1e6).toFixed(2)}M, draws ${t.drawsA} -> ${t.drawsB})`).join(', '));
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({rows, own, tris}, null, 1));
