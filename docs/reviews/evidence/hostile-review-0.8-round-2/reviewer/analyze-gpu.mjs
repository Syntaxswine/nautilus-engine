// Summarise an editor-mode benchmark result: whole-frame A/B per run, and the
// "assets' own share" (map minus blank, per arm) computed per run, so its spread
// is visible, plus the sensitivity of that ratio to the blank map's own spread.
//   node analyze-gpu.mjs <result.json> [<out.json>]
import fs from 'node:fs';
const [file, outFile] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const median = v => {const s = [...v].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
const runs = [...new Set(r.samples.map(s => s.run))].sort((a, b) => a - b), maps = [...new Set(r.samples.map(s => s.map))];
const per = (map, run, view, arm) => {const s = r.samples.find(x => x.map === map && x.run === run && x.backend === 'gpu'); return median(s.views[view][arm].map(b => median(b.total)));};
const rows = [];
for (const map of maps) for (const view of ['overview', 'close', 'cutaway']) {
  const whole = runs.map(k => per(map, k, view, 'a') / per(map, k, view, 'b'));
  const A = runs.map(k => per(map, k, view, 'a')), B = runs.map(k => per(map, k, view, 'b'));
  const blankA = runs.map(k => per('w0-blank', k, view, 'a')), blankB = runs.map(k => per('w0-blank', k, view, 'b'));
  const assets = runs.map((k, i) => (A[i] - blankA[i]) / (B[i] - blankB[i]));
  const s0 = r.samples.find(x => x.map === map && x.backend === 'gpu'), counts = {a: s0.views[view].a[0].counts, b: s0.views[view].b[0].counts};
  // Sensitivity: the candidate's asset time is B - blankB; shift blankB across its observed range.
  const bAssets = median(B) - median(blankB), lo = median(B) - Math.max(...blankB), hi = median(B) - Math.min(...blankB);
  rows.push({map, view, calls: counts.a.calls + ' -> ' + counts.b.calls, shadow: counts.a.shadowCalls + ' -> ' + counts.b.shadowCalls,
    aMs: +median(A).toFixed(2), bMs: +median(B).toFixed(2), whole: {median: +median(whole).toFixed(2), min: +Math.min(...whole).toFixed(2), max: +Math.max(...whole).toFixed(2)},
    assets: map === 'w0-blank' ? null : {perRunMedian: +median(assets).toFixed(2), min: +Math.min(...assets).toFixed(2), max: +Math.max(...assets).toFixed(2), fromMedians: +((median(A) - median(blankA)) / bAssets).toFixed(2),
      candidateAssetMs: +bAssets.toFixed(2), candidateAssetMsRange: [+lo.toFixed(2), +hi.toFixed(2)], blankBRange: [+Math.min(...blankB).toFixed(2), +Math.max(...blankB).toFixed(2)]}});
}
const opens = maps.map(map => {const s = r.samples.filter(x => x.map === map); const ratio = s.map(x => median(x.openMs.a) / median(x.openMs.b)); return {map, aMs: Math.round(median(s.map(x => median(x.openMs.a)))), bMs: Math.round(median(s.map(x => median(x.openMs.b)))), ratio: +median(ratio).toFixed(2), min: +Math.min(...ratio).toFixed(2), max: +Math.max(...ratio).toFixed(2)};});
const out = {source: file.split(/[\\/]/).pop(), runs: runs.length, rig: r.rig, browsers: r.browsers, trees: r.trees, served: {a: r.served_a, b: r.served_b}, rows, opens};
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const x of rows) console.log(`${x.map.padEnd(30)} ${x.view.padEnd(9)} ${x.calls.padEnd(13)} ${String(x.aMs).padStart(6)} -> ${String(x.bMs).padStart(6)} ms  whole x${x.whole.median} (${x.whole.min}-${x.whole.max})` + (x.assets ? `  assets x${x.assets.perRunMedian} (${x.assets.min}-${x.assets.max}) cand ${x.assets.candidateAssetMs} ms [${x.assets.candidateAssetMsRange}]` : ''));
for (const o of opens) console.log(`open ${o.map.padEnd(30)} ${o.aMs} -> ${o.bMs} ms x${o.ratio} (${o.min}-${o.max})`);
