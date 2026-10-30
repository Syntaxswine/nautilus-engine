// Round 4: lamp workloads the record did not measure, built like tools/bench/workloads.mjs
// builds its lamp-lit maps (free tiles nearest lane points, each lamp validated by
// openDocument), each with its own blank (the blank map with the same props) as the
// bench requires. Maps (from w4, 32 Gross houses, and w1, 32 copies):
//   x18-gross / x18-copies : 18 fires (three lanes of six), point lights, always lit
//   n12-gross              : 12 electric lamps (streetlights / floor lamps) at 22:00
//   s6-gross               : 6 spot lights (searchlights, lightMode on)
//   node beyond-maps.mjs <out dir>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), out = path.resolve(process.argv[2]);
const imp = p => import(pathToFileURL(path.join(here, p)).href);
const core = await imp('packages/map-core/index.js'), prefab = await imp('packages/prefab-core/index.js');
const maps = path.join(here, 'artifacts/bench/maps'), read = id => JSON.parse(fs.readFileSync(path.join(maps, id + '.json'), 'utf8'));
fs.mkdirSync(out, {recursive: true});
function light(source, points, kindOf, extra = {}) {
  const map = structuredClone(source), taken = new Set(), lamps = [];
  for (const instance of map.buildingPrefabs?.instances || []) {
    const t = prefab.buildingTransform(instance), c = (instance.clearance ?? 1) + 1;
    for (let x = instance.x - c; x < instance.x + t.width + c; x++) for (let y = instance.y - c; y < instance.y + t.depth + c; y++) taken.add(x + ',' + y);
  }
  for (const [i, [tx, ty]] of points.entries()) {
    let lamp = null;
    for (let r = 0; r < 30 && !lamp; r++) for (let dx = -r; dx <= r && !lamp; dx++) for (let dy = -r; dy <= r && !lamp; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || taken.has((tx + dx) + ',' + (ty + dy))) continue;
      const trial = {kind: kindOf(i), x: tx + dx, y: ty + dy, z: 0, ...extra};
      try {core.openDocument({...map, props: [...(map.props || []), ...lamps, trial]}); lamp = trial;} catch {}
    }
    if (!lamp) throw Error('no free tile near ' + tx + ',' + ty);
    lamps.push(lamp);
  }
  return lamps;
}
const lane = y => [23, 61, 99, 137, 175, 213].map(x => [x, y]);
const blank = read('w0-blank'), rows = [];
function save(id, source, lamps, time) {
  const lit = m => ({...m, props: [...(m.props || []), ...structuredClone(lamps)], ...(time ? {time} : {})});
  for (const [name, m] of [[id, lit(source)], [id + '-blank', lit(blank)]]) {
    const opened = core.openDocument(m); if ((opened.map?.props || m.props).length !== m.props.length) throw Error(name + ': props lost');
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(m)); rows.push({name, props: m.props.length, kinds: [...new Set(m.props.map(p => p.kind))], time: m.time || null});
  }
}
const fire = i => i % 2 ? 'standing-torch' : 'campfire';
const g = read('w4-32-gross'), c = read('w1-32x-largest');
const three = [...lane(30), ...lane(110), ...lane(190)];
save('x18-gross', g, light(g, three, fire));
save('x18-copies', c, light(c, three, fire));
save('n12-gross', g, light(g, [...lane(30), ...lane(150)], i => i % 2 ? 'floor-lamp' : 'streetlight'), {startMinutes: 22 * 60});
save('s6-gross', g, light(g, lane(70), () => 'spotlight', {lightMode: 'on'}));
console.log(JSON.stringify(rows));
