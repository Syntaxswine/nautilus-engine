// Markdown tables from the benchmark's result JSON (editor GPU, editor SwiftShader, node).
import fs from 'node:fs';
const [editorGpu, editorSwift, node] = process.argv.slice(2).map(f => f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const ms = v => v.toFixed(v < 10 ? 2 : 1), x = v => '×' + v.toFixed(2);
if (editorGpu) {
  const blank = editorGpu.summary.find(r => r.map === 'w0-blank');
  console.log(`\n### Editor, ${editorGpu.browsers[0]?.gpu} (Edge ${editorGpu.browsers[0]?.version}), ${editorGpu.runs} runs × ${editorGpu.blocks} A/B blocks × ${editorGpu.framesPerBlock} frames\n`);
  for (const view of ['overview', 'close', 'cutaway']) {
    console.log(`\n**${view}**\n\n| Workload | Draw calls (main → this) | Frame ms (main → this) | Speedup (range over runs) | Assets' share ms (main → this) | Assets' speedup |\n| --- | --- | --- | --- | --- | --- |`);
    const b = blank.views[view].totalMs;
    for (const row of editorGpu.summary) {
      const v = row.views[view], ca = v.counts.a.map(c => c.calls).join('/'), cb = v.counts.b.map(c => c.calls).join('/');
      const shareA = v.totalMs.a - b.a, shareB = v.totalMs.b - b.b;
      const share = row.map === 'w0-blank' ? '—' : `${ms(shareA)} → ${ms(shareB)}`, shareX = row.map === 'w0-blank' || shareB <= 0 ? '—' : x(shareA / shareB);
      console.log(`| ${row.map} | ${ca} → ${cb} | ${ms(v.totalMs.a)} → ${ms(v.totalMs.b)} | ${x(v.speedup.median)} (${v.speedup.min.toFixed(2)}–${v.speedup.max.toFixed(2)}) | ${share} | ${shareX} |`);
    }
  }
  console.log(`\n**Open time** (blank first, then the workload)\n\n| Workload | ms (main → this) | Speedup (range) | Assets' share ms (main → this) |\n| --- | --- | --- | --- |`);
  for (const row of editorGpu.summary) {
    const sa = row.openMs.a - blank.openMs.a, sb = row.openMs.b - blank.openMs.b;
    console.log(`| ${row.map} | ${row.openMs.a.toFixed(0)} → ${row.openMs.b.toFixed(0)} | ${x(row.openMs.speedup.median)} (${row.openMs.speedup.min.toFixed(2)}–${row.openMs.speedup.max.toFixed(2)}) | ${row.map === 'w0-blank' ? '—' : sa.toFixed(0) + ' → ' + sb.toFixed(0)} |`);
  }
  console.log('\nserved a', JSON.stringify(editorGpu.served_a), 'served b', JSON.stringify(editorGpu.served_b), 'trees', JSON.stringify(editorGpu.trees));
}
if (editorSwift?.pixels) {
  console.log(`\n### Pixels, SwiftShader (Edge ${editorSwift.browsers[0]?.version}), editor captures\n\n| Workload | View | Differing pixels | Max delta | At depth ties | Tie pixels in frame | Repeat of main identical |\n| --- | --- | --- | --- | --- | --- | --- |`);
  for (const p of editorSwift.pixels) console.log(`| ${p.map} | ${p.view} | ${p.differing} of ${p.pixels} | ${p.maxDelta} | ${p.explainedByTies} | ${p.tiePixels} | ${p.repeatOfAIdentical} |`);
  console.log(`\n**Draw calls on SwiftShader** (must equal the GPU counts)\n`);
  for (const row of editorSwift.summary) console.log(row.map, Object.entries(row.views).map(([k, v]) => k + ' ' + v.counts.a.map(c => c.calls) + '→' + v.counts.b.map(c => c.calls)).join(', '));
}
if (node) {
  console.log(`\n### Generator, Node ${node.rig.node}, ${node.runs} alternating runs per arm\n\n| LOD | main ms (range) | this ms (range) | Speedup | Identical designs |\n| --- | --- | --- | --- | --- |`);
  for (const [lod, s] of Object.entries(node.summary)) console.log(`| ${lod} | ${s.aMedianMs.toFixed(0)} (${s.aRange.map(v => v.toFixed(0)).join('–')}) | ${s.bMedianMs.toFixed(0)} (${s.bRange.map(v => v.toFixed(0)).join('–')}) | ${x(s.speedup)} | ${s.identicalDesigns} |`);
}
