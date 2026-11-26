// Generate the representative massive-structure maps used by the browser census.
// Writes artifacts/r08-1/maps/<id>.json plus results/workloads.json (manifest).
// Every map is produced through the public headless APIs and validated by
// openDocument(); a workload that cannot be built is reported, not skipped.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {sandbox, evidenceDir, writeResult, nodeRig} from './lib/common.mjs';

const imp = (p) => import(pathToFileURL(path.join(sandbox, p)).href);
const core = await imp('packages/map-core/index.js');
const prefab = await imp('packages/prefab-core/index.js');
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {createBuildingModel} = await imp('packages/building-catalog/three.js');
const outDir = path.join(evidenceDir, 'maps');
fs.mkdirSync(outDir, {recursive: true});

// Rank originals by game-LOD triangles and mesh count (exact, headless).
const atlas = new T.Texture();
const originals = prefab.ORIGINAL_BUILDING_ASSETS.map((a) => {
  const m = createBuildingModel(T, a.id, {atlas, lod: 'game'});
  let meshes = 0; m.root.traverse((o) => { if (o.isMesh) meshes++; });
  const row = {id: a.id, triangles: m.triangles, meshes};
  m.dispose(); return row;
});
const byTriangles = [...originals].sort((a, b) => b.triangles - a.triangles);
const byMeshes = [...originals].sort((a, b) => b.meshes - a.meshes);
const gross = prefab.GROSS_BUILDING_ASSETS.map((a) => a.id);

function base(name) {
  const map = core.blankMap(name);
  // Six declared layers (the maximum) so wall runs can use every layer.
  map.levels = 6; map.upper = [...map.upper, ...Array.from({length: 3}, () => structuredClone(map.upper[0]))];
  map.starts = [{x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}, {x: 2, y: 2}];
  map.exits = [{x: 3, y: 3}];
  return map;
}
// Shelf packing with placeBuilding validation; clearance 1 m (the minimum).
function pack(name, assets) {
  let map = base(name), x = 6, y = 6, row = 0;
  const placed = [], rejected = [];
  for (const asset of assets) {
    let done = false;
    for (const turns of [0, 1]) {
      const t = prefab.buildingTransform({asset, turns, x: 0, y: 0});
      if (x + t.width + 1 > 238) { x = 6; y += row + 3; row = 0; }
      if (y + t.depth + 1 > 238) break;
      try {
        map = prefab.placeBuilding(map, {asset, x, y, turns, clearance: 1}).map;
        placed.push(asset); x += t.width + 3; row = Math.max(row, t.depth); done = true; break;
      } catch (error) { if (turns === 1) rejected.push({asset, error: error.message.slice(0, 120)}); }
    }
    if (!done && !rejected.find((r) => r.asset === asset)) rejected.push({asset, error: 'No space left in the 240 m map with 1 m clearance.'});
  }
  return {map, placed, rejected};
}
const workloads = [];
function save(id, description, map, extra = {}) {
  const doc = core.openDocument(map), json = doc.export();
  fs.writeFileSync(path.join(outDir, id + '.json'), json);
  const parsed = JSON.parse(json);
  workloads.push({id, description, bytes: Buffer.byteLength(json), buildings: parsed.buildingPrefabs?.instances.length || 0,
    distinctBuildings: new Set(parsed.buildingPrefabs?.instances.map((i) => i.asset) || []).size,
    wallRuns: parsed.wallRuns?.segments.length || 0, roofs: parsed.slopedRoofs?.roofs.length || 0,
    validateErrors: doc.validate().slice(0, 3), requiredFeatures: core.requiredMapFeatures(parsed), ...extra});
}

save('w0-blank', 'Blank 240 m map (renderer baseline)', base('Blank'));
{
  const r = pack('32 x largest design', Array(40).fill(byTriangles[0].id));
  save('w1-32x-largest', `Up to 32 copies of the largest game-LOD design (${byTriangles[0].id}, ${byTriangles[0].triangles} triangles): one shared template`, r.map, {packed: r.placed.length, rejected: r.rejected.length});
}
{
  const r = pack('32 distinct most meshes', byMeshes.map((d) => d.id));
  save('w2-32-distinct-most-meshes', '32 distinct original designs with the most meshes (the 32-building map limit)', r.map, {packed: r.placed.length, rejected: r.rejected.slice(0, 3)});
}
{
  const r = pack('32 distinct most triangles', byTriangles.map((d) => d.id));
  save('w3-32-distinct-most-triangles', '32 distinct original designs with the most game-LOD triangles', r.map, {packed: r.placed.length, rejected: r.rejected.slice(0, 3)});
}
{
  const ids = Array.from({length: 40}, (_, i) => gross[i % gross.length]);
  const r = pack('32 Gross houses', ids);
  save('w4-32-gross', '32 Tinderbox Gross houses (13 designs, cycled; editor batches each design)', r.map, {packed: r.placed.length, rejected: r.rejected.slice(0, 3)});
}
// Dense wall runs on every layer. (a) axis-aligned integer lengths: every panel
// is a full 1 m panel. (b) free angles with fractional lengths: every run ends
// in a uniquely cut panel.
{
  const map = base('Dense axis-aligned walls'), segments = [];
  for (let i = 0; i < 100; i++) {
    const y = 10 + i * 2, a = [20, y], b = [84, y];
    segments.push({id: 'ax-' + i + '-low', a, b, z: 0, stories: 5, material: ['wood', 'brick', 'concrete'][i % 3]});
    segments.push({id: 'ax-' + i + '-top', a, b, z: 5, stories: 1, material: ['wood', 'brick', 'concrete'][i % 3]});
  }
  map.wallRuns = {version: 1, segments};
  save('w5a-walls-axis', '200 axis-aligned 64 m runs on all 6 layers (38,400 full panels)', map, {panels: segments.reduce((n, s) => n + Math.ceil(Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])) * s.stories, 0)});
}
{
  const map = base('Dense free-angle walls'), segments = [];
  let panels = 0, i = 0;
  // A deterministic field of parallel, non-collinear 37-degree runs.
  const ux = Math.cos(37 * Math.PI / 180), uy = Math.sin(37 * Math.PI / 180);
  for (let row = 0; row < 60 && segments.length < 4000; row++) for (let col = 0; col < 40 && segments.length < 4000; col++) {
    const len = 3 + ((row * 40 + col) * 0.6180339887) % 6, x0 = 10 + col * 5.5 + row * 0.07, y0 = 6 + row * 3.7;
    const a = [Math.round(x0 * 1e6) / 1e6, Math.round(y0 * 1e6) / 1e6], b = [Math.round((x0 + ux * len) * 1e6) / 1e6, Math.round((y0 + uy * len) * 1e6) / 1e6];
    if (b[0] > 238 || b[1] > 238) continue;
    const z = i % 6, stories = Math.min(6 - z, 1 + (i % 3)); i++;
    const add = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])) * stories;
    if (panels + add > 50000) continue;
    panels += add;
    segments.push({id: 'fa-' + row + '-' + col, a, b, z, stories, material: ['wood', 'brick', 'concrete'][(row + col) % 3]});
  }
  map.wallRuns = {version: 1, segments};
  save('w5b-walls-free-angle', `${segments.length} free-angle runs on all 6 layers, fractional lengths (each run ends in a unique cut panel)`, map, {panels});
}
// Sloped roofs at a representative density.
{
  const map = base('Many sloped roofs'), roofs = [];
  for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) roofs.push({id: 'roof-' + (r * 12 + c), x: 8 + c * 18, y: 8 + r * 18, width: 12, depth: 8, z: 1, style: ['gable', 'hip', 'shed'][(r + c) % 3], axis: 'x', pitch: 35, overhang: 0.3, material: ['slate', 'clay', 'metal'][(r * 12 + c) % 3], seed: 7, ...((r + c) % 3 === 2 ? {direction: 1} : {})});
  map.slopedRoofs = {version: 1, roofs};
  try { save('w6-roofs-144', '144 procedural sloped roofs (12 x 12)', map); } catch (error) { workloads.push({id: 'w6-roofs-144', error: error.message}); }
}
{
  const r = pack('Mixed massive', [...byTriangles.slice(0, 19).map((d) => d.id), ...gross]);
  save('w7-mixed-13-gross-19-largest', 'All 13 Gross designs plus the 19 largest originals', r.map, {packed: r.placed.length, rejected: r.rejected.slice(0, 3)});
}
const file = writeResult('workloads.json', {rig: nodeRig(), rankedOriginalsByTriangles: byTriangles.slice(0, 32), rankedOriginalsByMeshes: byMeshes.slice(0, 32), workloads});
console.log(JSON.stringify(workloads, null, 1));
