// Markdown tables for the round-2 answer from the formal run's editor results.
//   node tables-r2.mjs <editor-gpu.json> [editor-swiftshader.json]
import fs from 'node:fs';
const [gpuFile, swiftFile] = process.argv.slice(2);
const gpu = JSON.parse(fs.readFileSync(gpuFile, 'utf8'));
const names = {'w0-blank': 'Blank map (null control)', 'w1-32x-largest': '32 copies of the largest design', 'w2-32-distinct-most-meshes': '32 distinct originals, most meshes', 'w3-32-distinct-most-triangles': '32 distinct originals, most triangles', 'w4-32-gross': '32 Gross houses', 'w5a-walls-axis': '200 axis-aligned wall runs', 'w5b-walls-free-angle': '2,400 free-angle wall runs', 'w6-roofs-144': '144 sloped roofs', 'w7-mixed-13-gross-19-largest': '13 Gross + 19 largest originals'};
const x = r => '×' + r.median.toFixed(2) + ' (' + r.min.toFixed(2) + '–' + r.max.toFixed(2) + ')';
const ms = v => v.toFixed(2);
const rows = gpu.summary.filter(r => r.backend === 'gpu');
console.log('**Whole frame** (ms, main 0.10 → this; speedup per run, median and range)\n');
console.log('| Workload | Overview | Close | Cutaway |\n| --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${names[r.map] || r.map} | ${['overview', 'close', 'cutaway'].map(v => `${ms(r.views[v].totalMs.a)} → ${ms(r.views[v].totalMs.b)}, ${x(r.views[v].speedup)}`).join(' | ')} |`);
console.log('\n**Assets only, measured directly** (every other mesh hidden while the frame renders; a lower bound on the assets\' own speedup)\n');
console.log('| Workload | Overview | Close | Cutaway |\n| --- | --- | --- | --- |');
for (const r of rows) if (r.views['overview:assets']) console.log(`| ${names[r.map] || r.map} | ${['overview', 'close', 'cutaway'].map(v => {const a = r.views[v + ':assets']; return `${ms(a.totalMs.a)} → ${ms(a.totalMs.b)}, ${x(a.speedup)}`;}).join(' | ')} |`);
console.log('\n**Subtraction estimate** (frame minus the same run\'s blank map; overview and cutaway only)\n');
console.log('| Workload | Overview | Cutaway |\n| --- | --- | --- |');
for (const r of rows) if (r.map !== 'w0-blank') console.log(`| ${names[r.map] || r.map} | ${['overview', 'cutaway'].map(v => {const e = r.views[v].estimateBySubtraction; return e ? `${ms(e.ms.a)} → ${ms(e.ms.b)} ms, ${x(e.speedup)}` : '—';}).join(' | ')} |`);
console.log('\n**Draw calls per frame** (main 0.10 → this; shadow pass in brackets)\n');
console.log('| Workload | Overview | Close | Cutaway |\n| --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${names[r.map] || r.map} | ${['overview', 'close', 'cutaway'].map(v => {const c = r.views[v].counts; return `${c.a[0].calls.toLocaleString('en')} (${c.a[0].shadowCalls.toLocaleString('en')}) → ${c.b[0].calls.toLocaleString('en')} (${c.b[0].shadowCalls.toLocaleString('en')})`;}).join(' | ')} |`);
console.log('\n**Open time** (blank first, then the workload)\n');
console.log('| Workload | ms (main → this) | Speedup |\n| --- | --- | --- |');
for (const r of rows) console.log(`| ${names[r.map] || r.map} | ${r.openMs.a.toFixed(0)} → ${r.openMs.b.toFixed(0)} | ${x(r.openMs.speedup)} |`);
const expect = (gpu.expect || []), unequal = expect.filter(e => JSON.stringify(e.measured) !== JSON.stringify(e.expected));
console.log(`\n--expect: ${expect.length - unequal.length} of ${expect.length} equal; refused: ${JSON.stringify(gpu.refused || [])}`);
const first = gpu.samples.filter(s => s.run === 0 && s.backend === 'gpu');
console.log('\n**Unculled asset draws** (main + shadow, culling off; triangles are the same in both trees)\n');
console.log('| Workload | Main 0.10 | This | Triangles |\n| --- | --- | --- | --- |');
for (const s of first) if (s.unculled) {const a = s.unculled.exterior.a, b = s.unculled.exterior.b; console.log(`| ${names[s.map] || s.map} | ${a.main.toLocaleString('en')} + ${a.shadow.toLocaleString('en')} | ${b.main.toLocaleString('en')} + ${b.shadow.toLocaleString('en')} | ${a.triangles === b.triangles ? b.triangles.toLocaleString('en') : a.triangles + ' → ' + b.triangles} |`);}
if (swiftFile) {
  const sw = JSON.parse(fs.readFileSync(swiftFile, 'utf8'));
  console.log('\n**Pixels against main 0.10** (SwiftShader, run 0; ties from the capture\'s own mask)\n');
  console.log('| Workload | Overview | Close | Cutaway |\n| --- | --- | --- | --- |');
  for (const id of [...new Set(sw.pixels.map(p => p.map))]) console.log(`| ${names[id] || id} | ${['overview', 'close', 'cutaway'].map(v => {const p = sw.pixels.find(q => q.map === id && q.view === v); return p ? (p.differing ? `${p.differing} (max ${p.maxDelta}), ${p.explainedByTies} ties` : '0') : '—';}).join(' | ')} |`);
  console.log(`\nSwiftShader --expect: ${JSON.stringify(sw.refused || 'no refusal')}`);
}
