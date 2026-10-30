// Print the review's markdown tables from the result JSON files, so the numbers
// in review.md are transcribed by code, not by hand.
import fs from 'node:fs';
import path from 'node:path';
import {resultsDir} from './lib/common.mjs';

const read = (f) => { const p = path.join(resultsDir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const gpu = read('census-editor-d3d11.json'), sw = read('census-editor-swiftshader.json'), census = read('census-original.json'), lm = read('landmarks.json'), proto = read('prototypes-d3d11.json'), timing = read('time-original.json'), wv = read('world-view.json');
const f = (n) => (n === undefined || n === null ? '—' : typeof n === 'number' ? n.toLocaleString('en-US') : n);
const ms = (s) => s ? `${s.median} (${s.min}–${s.max})` : '—';
const out = [];
if (gpu && sw) {
  out.push('### Scene workloads in the built editor\n');
  out.push('| Workload | Draw calls / frame (shadow + main + composite) | Triangles / frame | Frame ms, RTX 3080 D3D11, shadows on | Frame ms, shadows off | Frame ms, SwiftShader | Cold open ms, D3D11 rig | Level-0 cutaway calls | Unique geometries / materials / programs |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const w of gpu.results) {
    const s = sw.results.find((x) => x.workload === w.workload), fo = w.framesOverview;
    out.push(`| ${w.workload} | ${f(fo.last.calls)} (${f(fo.split.shadowPass)} + ${f(fo.split.mainAndComposite - 1)} + 1) | ${f(fo.last.triangles)} | ${ms(fo.ms)} | ${ms(w.framesNoShadow.ms)} | ${ms(s?.framesOverview.ms)} | ${ms(w.openMs)} | ${f(w.cutaway.frames.last.calls)} | ${f(w.sceneStats.uniqueGeometries)} / ${f(w.sceneStats.uniqueMaterials)} / ${f(fo.programs)} |`);
  }
  out.push('\n### Where the meshes come from (overview view, all visible)\n');
  out.push('| Workload | Inherited AFT scene meshes | Prefab meshes (instances x template) | Template meshes (distinct) | Wall InstancedMeshes (instances) | Roof meshes (draw groups) |');
  out.push('| --- | --- | --- | --- | --- | --- |');
  for (const w of gpu.results) {
    const c = w.sceneStats.categories;
    out.push(`| ${w.workload} | ${f(c.other?.visibleDrawItems)} | ${f(c.prefabs?.visibleDrawItems)} | ${f(w.sceneStats.templateMeshTotal)} | ${c.walls ? f(c.walls.instancedMeshes) + ' (' + f(c.walls.instances) + ')' : '—'} | ${c.roofs ? f(c.roofs.visibleMeshes) + ' (' + f(c.roofs.visibleDrawItems) + ')' : '—'} |`);
  }
}
if (census) {
  out.push('\n### The 48 original designs (createBuildingModel, headless)\n');
  out.push('| LOD | Meshes | of which door-leaf meshes | Door pivots | Triangles | Vertices | Attribute MiB | Materials created | JS calls to build all 48 (exact) |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const lod of ['game', 'authoring']) { const t = census.totals[lod], doors = census.perDesign.reduce((n, d) => n + d[lod].doorLeafMeshes, 0); out.push(`| ${lod} | ${f(t.meshes)} | ${f(doors)} (${Math.round(doors / t.meshes * 100)}%) | ${f(t.doorPivots)} | ${f(t.triangles)} | ${f(t.vertices)} | ${t.attributeMiB} | ${f(t.materialsCreated)} | ${f(census.callCounts[lod].totalCalls)} |`); }
}
if (timing) {
  out.push('\n### Build time, headless Node (no inspector attached)\n');
  out.push(`Sum of per-design medians: compileBuilding ${f(timing.totals.compileWallMedianSum)} ms, game geometry ${f(timing.totals.gameWallMedianSum)} ms, authoring geometry ${f(timing.totals.authoringWallMedianSum)} ms.`);
  const fv = timing.facadeVsTemplate;
  out.push(`32 instances of ${fv.design}: public facade create() x32 ${ms(fv.facadeCreate32.wall)} ms, ${f(fv.facadeCreate32.uniqueGeometries)} geometries; editor-style template + 32 clones ${ms(fv.templatePlusClone32.wall)} ms, ${f(fv.templatePlusClone32.uniqueGeometries)} geometries.`);
}
if (lm) {
  out.push('\n### Tinderbox landmarks (Tinderbox renderer; Nautilus share)\n');
  out.push('| Landmark @ commit | Mesh nodes (draw calls per pass) | InstancedMesh batches | Drawn instances | Triangles | Geometries | Materials | Build ms (Node) | Calls inside Nautilus wall-runs.js | Sampled time in wall-runs.js |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const l of lm.landmarks) { const c = l.census; out.push(`| ${l.landmark} @ ${l.commit.slice(0, 7)} | ${f(c.meshNodes)} | ${f(c.instancedMeshBatches)} | ${f(c.drawnInstances)} | ${f(c.triangles)} | ${f(c.uniqueGeometries)} | ${f(c.uniqueMaterials)} | ${ms(l.buildMs.repeated)} | ${f(l.nautilusShare.exactCallsInWallRuns)} of ${f(l.nautilusShare.exactCallsTotalInstrumented)} | ${l.nautilusShare.sampledTimeInWallRunsPct}% |`); }
}
if (proto) {
  out.push('\n### In-page prototypes (estimates, RTX 3080 D3D11)\n');
  out.push('| Prototype | Draw calls before → after | Frame ms before → after | Pixels differing / total (max channel delta) | Detail |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const [k, v] of Object.entries(proto.results)) { if (!v?.before) continue; out.push(`| ${k} | ${f(v.before.calls)} → ${f(v.after.calls)} (−${v.drawCallReductionPct}%) | ${v.before.ms.median} → ${v.after.ms.median} (−${v.frameMsReductionPct}%) | ${f(v.pixels.differingPixels)} / ${f(v.pixels.totalPixels)} (${v.pixels.maxChannelDelta}) | ${JSON.stringify(v.detail).replaceAll('|', '/')} |`); }
  const proto2 = read('prototypes2-d3d11.json');
  if (proto2) for (const [k, v] of Object.entries(proto2.results)) out.push(`| ${k} | ${f(v.before.calls)} → ${f(v.after.calls)} (−${v.drawCallReductionPct}%) | ${v.before.ms.median} → ${v.after.ms.median} (−${v.frameMsReductionPct}%) | ${f(v.pixels.differingPixels)} / ${f(v.pixels.totalPixels)} (${v.pixels.maxChannelDelta}) | ${JSON.stringify(v.detail).replaceAll('|', '/')} |`);
  if (proto.results.rebuild) { out.push('\n| Workload | scene.rebuild() ms | rebuildWalls() ms |'); out.push('| --- | --- | --- |'); for (const [k, v] of Object.entries(proto.results.rebuild)) out.push(`| ${k} | ${ms(v.rebuildMs)} | ${ms(v.rebuildWallsMs)} |`); }
  if (proto.results.facadeGross) { const r = proto.results.facadeGross; out.push(`\nPublic facade Gross houses (unbatched): raw meshes per house ${Math.min(...r.map((x) => x.rawMeshes))}–${Math.max(...r.map((x) => x.rawMeshes))}, total ${f(r.reduce((n, x) => n + x.rawMeshes, 0))} for 13 designs.`); }
}
if (wv) {
  out.push('\n### Extended-world SVG view\n');
  out.push('| World | Surfaces | render() ms | Axon / plan SVG elements | Disclosure text |'); out.push('| --- | --- | --- | --- | --- |');
  for (const r of wv.rows) out.push(`| ${r.world} | ${f(r.surfaces)} | ${ms(r.ms)} | ${f(r.axonElements)} / ${f(r.planElements)} | ${r.countsText} |`);
}
console.log(out.join('\n'));
