// Pilot maps for the batching threshold: 32 Gross houses placed N of a design side by side
// (N = 8, 16), packed and lit (six fires on the lane points) as tools/bench/workloads.mjs
// builds w8 and l8, each lit map with its own blank. Writes into <out>, beside copies of
// the benchmark maps the pilot also needs.
//   node rows-maps.mjs <engine tree> <out dir>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [tree, out] = process.argv.slice(2).map(p => path.resolve(p)), imp = p => import(pathToFileURL(path.join(tree, p)).href);
const core = await imp('packages/map-core/index.js'), prefab = await imp('packages/prefab-core/index.js');
const gross = prefab.GROSS_BUILDING_ASSETS.map(a => a.id);
function base(name) {
  const map = core.blankMap(name);
  map.levels = 6; map.upper = [...map.upper, ...Array.from({length: 3}, () => structuredClone(map.upper[0]))];
  map.starts = [{x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}, {x: 2, y: 2}]; map.exits = [{x: 3, y: 3}];
  return map;
}
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
  if (placed < limit) throw Error(name + ': placed ' + placed);
  return map;
}
function lamps(map) {
  const taken = new Set(), list = [];
  for (const instance of map.buildingPrefabs?.instances || []) {
    const t = prefab.buildingTransform(instance), c = (instance.clearance ?? 1) + 1;
    for (let x = instance.x - c; x < instance.x + t.width + c; x++) for (let y = instance.y - c; y < instance.y + t.depth + c; y++) taken.add(x + ',' + y);
  }
  for (const [i, [tx, ty]] of [[23, 30], [61, 30], [99, 30], [137, 30], [175, 30], [213, 30]].entries()) {
    let lamp = null;
    for (let r = 0; r < 30 && !lamp; r++) for (let dx = -r; dx <= r && !lamp; dx++) for (let dy = -r; dy <= r && !lamp; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || taken.has((tx + dx) + ',' + (ty + dy))) continue;
      const trial = {kind: i % 2 ? 'standing-torch' : 'campfire', x: tx + dx, y: ty + dy, z: 0};
      try {core.openDocument({...map, props: [...(map.props || []), ...list, trial]}); lamp = trial;} catch {}
    }
    if (!lamp) throw Error('no free tile near ' + tx + ',' + ty);
    list.push(lamp);
  }
  return list;
}
const save = (id, map) => {let n = 0; const json = core.openDocument(map).export().replace(/"char_[0-9a-f-]{36}"/g, () => '"char_bench-' + String(n++).padStart(4, '0') + '"'); fs.writeFileSync(path.join(out, id + '.json'), json); return JSON.parse(json);};
fs.mkdirSync(out, {recursive: true});
const blank = JSON.parse(fs.readFileSync(path.join(tree, 'artifacts/bench/maps/w0-blank.json'), 'utf8'));
for (const n of [8, 16]) {
  const map = save('r' + n + '-gross-rows-of-' + n, pack('Gross rows of ' + n, Array.from({length: 40}, (_, i) => gross[Math.floor(i / n) % gross.length])));
  const lit = lamps(map), with_ = m => ({...m, props: [...(m.props || []), ...structuredClone(lit)]});
  save('q' + n + '-gross-rows-of-' + n + '-lamps', with_(map)); save('q' + n + '-blank', with_(blank));
}
for (const id of ['w0-blank']) fs.copyFileSync(path.join(tree, 'artifacts/bench/maps', id + '.json'), path.join(out, id + '.json'));
console.log(fs.readdirSync(out).join(' '));
