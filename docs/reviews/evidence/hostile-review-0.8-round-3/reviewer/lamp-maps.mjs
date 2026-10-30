// Round-3 lamp workloads: the benchmark's own maps plus six fire lamps (always
// lit, point lights with shadows), so every asset caster is also drawn into each
// lamp's six cube faces. Per map, the lamps sit on the free tiles nearest six
// targets in the district (outside every lot and its clearance, plus one tile),
// and that map's folder holds the blank map with the SAME lamps under the bench's
// own id w0-blank: the null control and the --assets-only reference.
//   node lamp-maps.mjs <engine tree> <bench maps dir> <out dir>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [tree, mapsDir, outDir] = process.argv.slice(2).map(p => path.resolve(p));
const core = await import(pathToFileURL(path.join(tree, 'packages/map-core/index.js')).href);
const prefab = await import(pathToFileURL(path.join(tree, 'packages/prefab-core/index.js')).href);
const IDS = ['w1-32x-largest', 'w2-32-distinct-most-meshes', 'w4-32-gross', 'w5b-walls-free-angle', 'w6-roofs-144', 'w7-mixed-13-gross-19-largest'];
const read = id => JSON.parse(fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'));
const blank = read('w0-blank');
// Six targets in the lanes of w1's first two rows (copies step 19 m in x, 26 m in y).
const TARGETS = [[23, 30], [61, 30], [99, 30], [137, 30], [175, 30], [213, 30]];
const exportOf = map => {let n = 0; return core.openDocument(map).export().replace(/"char_[0-9a-f-]{36}"/g, () => '"char_lamps-' + String(n++).padStart(4, '0') + '"');};
const summary = [];
for (const id of IDS) {
  const map = read(id), taken = new Set();
  for (const inst of map.buildingPrefabs?.instances || []) {
    const t = prefab.buildingTransform(inst), c = (inst.clearance ?? 1) + 1;
    for (let x = inst.x - c; x < inst.x + t.width + c; x++) for (let y = inst.y - c; y < inst.y + t.depth + c; y++) taken.add(x + ',' + y);
  }
  const lamps = [];
  for (const [i, [tx, ty]] of TARGETS.entries()) {
    let placed = null;
    for (let r = 0; r < 30 && !placed; r++) for (let dx = -r; dx <= r && !placed; dx++) for (let dy = -r; dy <= r && !placed; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || taken.has((tx + dx) + ',' + (ty + dy))) continue;
      const lamp = {kind: i % 2 ? 'standing-torch' : 'campfire', x: tx + dx, y: ty + dy, z: 0}, trial = structuredClone(map);
      trial.props = [...(trial.props || []), ...lamps, lamp];
      try {exportOf(trial); placed = lamp;} catch {}
    }
    if (!placed) throw Error(id + ': no free tile near ' + tx + ',' + ty);
    lamps.push(placed);
  }
  const dir = path.join(outDir, id); fs.mkdirSync(dir, {recursive: true});
  for (const [file, source] of [[id, map], ['w0-blank', blank]]) {
    const copy = structuredClone(source); copy.props = [...(copy.props || []), ...structuredClone(lamps)];
    const json = exportOf(copy), parsed = JSON.parse(json);
    if ((parsed.props || []).filter(p => p.kind === 'campfire' || p.kind === 'standing-torch').length !== lamps.length) throw Error(file + ': the lamps did not survive openDocument');
    fs.writeFileSync(path.join(dir, file + '.json'), json);
  }
  summary.push({id, lamps: lamps.map(l => l.kind + '@' + l.x + ',' + l.y), maxShift: Math.max(...lamps.map((l, i) => Math.max(Math.abs(l.x - TARGETS[i][0]), Math.abs(l.y - TARGETS[i][1]))))});
}
console.log(JSON.stringify(summary, null, 1));
