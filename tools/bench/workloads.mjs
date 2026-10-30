// Massive-structure workload maps for the asset-rendering benchmark's editor
// mode. The nine definitions are round 1's (docs/reviews/2026-10-29-hostile-
// review-0.8-round-1.md, census workloads w0-w7) so results stay comparable.
// Every map is built through the public headless APIs and opened by
// openDocument(); a workload that cannot be built throws rather than shrinking.
//   node tools/bench/workloads.mjs [--tree <engine tree>] [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), option = (name, fallback) => {const i = args.indexOf('--' + name); return i < 0 ? fallback : args[i + 1];};
const tree = path.resolve(option('tree', here)), outDir = path.resolve(option('out', path.join(here, 'artifacts/bench/maps')));
const imp = p => import(pathToFileURL(path.join(tree, p)).href);
const core = await imp('packages/map-core/index.js'), prefab = await imp('packages/prefab-core/index.js');
fs.mkdirSync(outDir, {recursive: true});

// Rank originals by recorded game triangles and by meshes (catalogue facts).
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {createBuildingModel} = await imp('packages/building-catalog/three.js');
const originals = prefab.ORIGINAL_BUILDING_ASSETS.map(asset => {
  const model = createBuildingModel(T, asset.id, {atlas: new T.Texture(), lod: 'game'});
  let meshes = 0; model.root.traverse(node => {if (node.isMesh) meshes++;});
  const row = {id: asset.id, triangles: model.triangles, meshes}; model.dispose(); return row;
});
const byTriangles = [...originals].sort((a, b) => b.triangles - a.triangles), byMeshes = [...originals].sort((a, b) => b.meshes - a.meshes);
const gross = prefab.GROSS_BUILDING_ASSETS.map(asset => asset.id);

function base(name) {
  const map = core.blankMap(name);
  // Six declared layers (the maximum) so wall runs can use every layer.
  map.levels = 6; map.upper = [...map.upper, ...Array.from({length: 3}, () => structuredClone(map.upper[0]))];
  map.starts = [{x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}, {x: 2, y: 2}]; map.exits = [{x: 3, y: 3}];
  return map;
}
// Shelf packing through placeBuilding (1 m clearance, the minimum).
function pack(name, assets, limit = 32) {
  let map = base(name), x = 6, y = 6, row = 0, placed = 0;
  for (const asset of assets) {
    if (placed === limit) break;
    for (const turns of [0, 1]) {
      const t = prefab.buildingTransform({asset, turns, x: 0, y: 0});
      if (x + t.width + 1 > 238) {x = 6; y += row + 3; row = 0;}
      if (y + t.depth + 1 > 238) break;
      try {map = prefab.placeBuilding(map, {asset, x, y, turns, clearance: 1}).map; placed++; x += t.width + 3; row = Math.max(row, t.depth); break;} catch {}
    }
  }
  if (placed < Math.min(limit, assets.length)) throw Error(name + ': placed ' + placed + ' of ' + Math.min(limit, assets.length));
  return map;
}
const written = [];
function save(id, description, map) {
  // openDocument mints random character ids for starts; fix them so the files are reproducible.
  let n = 0; const json = core.openDocument(map).export().replace(/"char_[0-9a-f-]{36}"/g, () => '"char_bench-' + String(n++).padStart(4, '0') + '"');
  fs.writeFileSync(path.join(outDir, id + '.json'), json);
  const parsed = JSON.parse(json);
  written.push({id, description, buildings: parsed.buildingPrefabs?.instances.length || 0, distinct: new Set(parsed.buildingPrefabs?.instances.map(i => i.asset) || []).size, wallRuns: parsed.wallRuns?.segments.length || 0, roofs: parsed.slopedRoofs?.roofs.length || 0});
}

save('w0-blank', 'Blank 240 m map: the inherited scene alone', base('Blank'));
save('w1-32x-largest', '32 copies of the largest design (' + byTriangles[0].id + ')', pack('32 x largest design', Array(40).fill(byTriangles[0].id)));
save('w2-32-distinct-most-meshes', '32 distinct originals with the most meshes', pack('32 distinct most meshes', byMeshes.map(d => d.id)));
save('w3-32-distinct-most-triangles', '32 distinct originals with the most triangles', pack('32 distinct most triangles', byTriangles.map(d => d.id)));
save('w4-32-gross', '32 Gross houses (13 designs, cycled)', pack('32 Gross houses', Array.from({length: 40}, (_, i) => gross[i % gross.length])));
{
  const map = base('Dense axis-aligned walls'), segments = [];
  for (let i = 0; i < 100; i++) {
    const y = 10 + i * 2, a = [20, y], b = [84, y], material = ['wood', 'brick', 'concrete'][i % 3];
    segments.push({id: 'ax-' + i + '-low', a, b, z: 0, stories: 5, material}, {id: 'ax-' + i + '-top', a, b, z: 5, stories: 1, material});
  }
  map.wallRuns = {version: 1, segments};
  save('w5a-walls-axis', '200 axis-aligned 64 m runs on all six layers (38,400 full panels)', map);
}
{
  // Parallel 37-degree runs with fractional lengths: each run ends in a uniquely cut panel.
  const map = base('Dense free-angle walls'), segments = [], ux = Math.cos(37 * Math.PI / 180), uy = Math.sin(37 * Math.PI / 180);
  let panels = 0, i = 0;
  for (let row = 0; row < 60 && segments.length < 4000; row++) for (let col = 0; col < 40 && segments.length < 4000; col++) {
    const len = 3 + ((row * 40 + col) * 0.6180339887) % 6, x0 = 10 + col * 5.5 + row * 0.07, y0 = 6 + row * 3.7;
    const a = [Math.round(x0 * 1e6) / 1e6, Math.round(y0 * 1e6) / 1e6], b = [Math.round((x0 + ux * len) * 1e6) / 1e6, Math.round((y0 + uy * len) * 1e6) / 1e6];
    if (b[0] > 238 || b[1] > 238) continue;
    const z = i % 6, stories = Math.min(6 - z, 1 + (i % 3)); i++;
    const add = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])) * stories;
    if (panels + add > 50000) continue;
    panels += add; segments.push({id: 'fa-' + row + '-' + col, a, b, z, stories, material: ['wood', 'brick', 'concrete'][(row + col) % 3]});
  }
  map.wallRuns = {version: 1, segments};
  save('w5b-walls-free-angle', segments.length + ' free-angle runs on all six layers (' + panels + ' panels)', map);
}
{
  const map = base('Many sloped roofs'), roofs = [];
  for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) roofs.push({id: 'roof-' + (r * 12 + c), x: 8 + c * 18, y: 8 + r * 18, width: 12, depth: 8, z: 1, style: ['gable', 'hip', 'shed'][(r + c) % 3], axis: 'x', pitch: 35, overhang: 0.3, material: ['slate', 'clay', 'metal'][(r * 12 + c) % 3], seed: 7, ...((r + c) % 3 === 2 ? {direction: 1} : {})});
  map.slopedRoofs = {version: 1, roofs};
  save('w6-roofs-144', '144 procedural sloped roofs (12 x 12)', map);
}
save('w7-mixed-13-gross-19-largest', 'All 13 Gross designs plus the 19 largest originals', pack('Mixed massive', [...byTriangles.slice(0, 19).map(d => d.id), ...gross]));
console.log(JSON.stringify(written, null, 1));
