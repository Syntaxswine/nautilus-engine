// Round 5: the densest batched cluster the editor allows (MAX_BUILDINGS = 32), unlit and under
// the night lamps round 4 found hardest, built as tools/bench/workloads.mjs builds its maps
// (placeBuilding, openDocument, lamps on free tiles nearest lane points, each validated by
// openDocument), each lamp-lit map with its own blank (the blank map with the same props and time).
//   g1-gross-grid-32      : 32 copies of one Gross design (grossdale-hip) in an 8 x 4 grid of
//                           12 x 19 m lots: every sphere overlaps its neighbours, one cluster
//   n1-gross-grid-32-night: the same with 12 electric lamps (streetlights / floor lamps) at 22:00
//                           ringing the block; n1-blank its blank
//   node massive-maps.mjs <out dir>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), out = path.resolve(process.argv[2]);
const imp = p => import(pathToFileURL(path.join(here, p)).href);
const core = await imp('packages/map-core/index.js'), prefab = await imp('packages/prefab-core/index.js');
const maps = path.join(here, 'artifacts/bench/maps'), read = id => JSON.parse(fs.readFileSync(path.join(maps, id + '.json'), 'utf8'));
fs.mkdirSync(out, {recursive: true});
const blank = read('w0-blank'), rows = [];
function save(id, map) {
  let n = 0; const json = core.openDocument(map).export().replace(/"char_[0-9a-f-]{36}"/g, () => '"char_bench-' + String(n++).padStart(4, '0') + '"');
  const parsed = JSON.parse(json);
  if ((parsed.props || []).length !== (map.props || []).length) throw Error(id + ': props lost');
  fs.writeFileSync(path.join(out, id + '.json'), json);
  rows.push({id, buildings: parsed.buildingPrefabs?.instances.length || 0, props: (parsed.props || []).length, time: parsed.time ?? null});
}
// The grid: placeBuilding with 1 m clearance, as the bench packs.
let map = structuredClone(blank); map.name = 'Gross grid of 32';
const asset = 'grossdale-hip', t = prefab.buildingTransform({asset, turns: 0, x: 0, y: 0}), px = t.width + 3, py = t.depth + 4, x0 = 40, y0 = 60;
for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) map = prefab.placeBuilding(map, {asset, x: x0 + c * px, y: y0 + r * py, turns: 0, clearance: 1}).map;
save('g1-gross-grid-32', map);
// Lamps on free tiles nearest the points (outside every lot and its clearance, plus one tile).
function light(source, points, kindOf, extra = {}) {
  const taken = new Set(), lamps = [];
  for (const instance of source.buildingPrefabs?.instances || []) {
    const tr = prefab.buildingTransform(instance), c = (instance.clearance ?? 1) + 1;
    for (let x = instance.x - c; x < instance.x + tr.width + c; x++) for (let y = instance.y - c; y < instance.y + tr.depth + c; y++) taken.add(x + ',' + y);
  }
  for (const [i, [tx, ty]] of points.entries()) {
    let lamp = null;
    for (let r = 0; r < 30 && !lamp; r++) for (let dx = -r; dx <= r && !lamp; dx++) for (let dy = -r; dy <= r && !lamp; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || taken.has((tx + dx) + ',' + (ty + dy))) continue;
      const trial = {kind: kindOf(i), x: tx + dx, y: ty + dy, z: 0, ...extra};
      try {core.openDocument({...source, props: [...(source.props || []), ...lamps, trial]}); lamp = trial;} catch {}
    }
    if (!lamp) throw Error('no free tile near ' + tx + ',' + ty);
    lamps.push(lamp);
  }
  return lamps;
}
// The lanes inside the grid are too narrow for a free tile (lots plus clearance plus one), and
// lanes wide enough would part the rows' spheres; so the lamps ring the block: four above it,
// four below, two on each side (the block spans x 40-136, y 60-136).
const xs = [x0 + 6, x0 + 30, x0 + 54, x0 + 78], x1 = x0 + 8 * px, y1 = y0 + 4 * py;
const points = [...xs.map(x => [x, y0 - 4]), ...xs.map(x => [x, y1 + 3]), [x0 - 4, y0 + 19], [x0 - 4, y0 + 57], [x1 + 3, y0 + 19], [x1 + 3, y0 + 57]];
const lamps = light(map, points, i => i % 2 ? 'floor-lamp' : 'streetlight', {});
const night = m => ({...structuredClone(m), props: [...(m.props || []), ...structuredClone(lamps)], time: {startMinutes: 22 * 60}});
save('n1-gross-grid-32-night', night(map));
save('n1-blank', night(blank));
fs.copyFileSync(path.join(maps, 'w0-blank.json'), path.join(out, 'w0-blank.json'));
console.log(JSON.stringify({asset, footprint: [t.width, t.depth], pitch: [px, py], lamps: lamps.map(l => [l.kind, l.x, l.y]), rows}));
