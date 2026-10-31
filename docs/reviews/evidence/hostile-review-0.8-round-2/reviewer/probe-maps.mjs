// Probe maps for the round-2 pixel checks (written to artifacts/r08-2/maps/).
//   node probe-maps.mjs <engine tree>
// p1: free-angle wall runs (cut panels) beside point lights (campfire, torches).
// p2: the same walls, no lamps (control: the cut panels without point shadows).
// p3: axis-aligned integer runs (full 1 m panels only) beside the same lamps
//     (control: a unit box equals every panel, so point shadows cannot differ).
// p4: one original building with a campfire inside its lot (doors, cutaway).
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
const tree = path.resolve(process.argv[2]);
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'maps');
fs.mkdirSync(out, {recursive: true});
const core = await import(pathToFileURL(path.join(tree, 'packages/map-core/index.js')).href);
const prefab = await import(pathToFileURL(path.join(tree, 'packages/prefab-core/index.js')).href);
function base(name) {
  const map = core.blankMap(name);
  map.levels = 6; map.upper = [...map.upper, ...Array.from({length: 3}, () => structuredClone(map.upper[0]))];
  map.starts = [{x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}, {x: 2, y: 2}]; map.exits = [{x: 3, y: 3}];
  return map;
}
const lamps = [{kind: 'campfire', x: 120, y: 120, z: 0}, {kind: 'standing-torch', x: 112, y: 126, z: 0}, {kind: 'standing-torch', x: 128, y: 114, z: 0}];
function freeAngle() {
  const segments = [];
  for (let k = 0; k < 10; k++) {
    const angle = (20 + k * 13) * Math.PI / 180, r0 = 2.2 + (k % 3) * .4, len = 2.37 + k * .61;
    const a0 = [120 + Math.cos(angle) * r0, 120 + Math.sin(angle) * r0];
    const a = a0.map(v => Math.round(v * 1e6) / 1e6), b = [Math.round((a0[0] + Math.cos(angle + 1.2) * len) * 1e6) / 1e6, Math.round((a0[1] + Math.sin(angle + 1.2) * len) * 1e6) / 1e6];
    segments.push({id: 'probe-fa-' + k, a, b, z: 0, stories: 1 + (k % 2), material: ['wood', 'brick', 'concrete'][k % 3]});
  }
  return {version: 1, segments};
}
function axis() {
  const segments = [];
  for (let k = 0; k < 6; k++) {const y = 116 + k * 2; segments.push({id: 'probe-ax-' + k, a: [114, y], b: [118 + (k % 3), y], z: 0, stories: 1 + (k % 2), material: ['wood', 'brick', 'concrete'][k % 3]});}
  return {version: 1, segments};
}
function save(id, map) {
  let n = 0; const json = core.openDocument(map).export().replace(/"char_[0-9a-f-]{36}"/g, () => '"char_probe-' + String(n++).padStart(4, '0') + '"');
  fs.writeFileSync(path.join(out, id + '.json'), json);
  const parsed = JSON.parse(json);
  return {id, props: parsed.props?.length || 0, wallRuns: parsed.wallRuns?.segments.length || 0, buildings: parsed.buildingPrefabs?.instances.length || 0};
}
const written = [];
{const m = base('Cut walls beside point lights'); m.props = [...(m.props || []), ...structuredClone(lamps)]; m.wallRuns = freeAngle(); written.push(save('p1-cut-walls-point-lights', m));}
{const m = base('Cut walls, no lamps'); m.wallRuns = freeAngle(); written.push(save('p2-cut-walls-no-lamps', m));}
{const m = base('Full panels beside point lights'); m.props = [...(m.props || []), ...structuredClone(lamps)]; m.wallRuns = axis(); written.push(save('p3-axis-walls-point-lights', m));}
{
  let m = base('Building beside a campfire');
  m = prefab.placeBuilding(m, {asset: 'dockside-warehouse', x: 110, y: 110, turns: 0, clearance: 1}).map;
  m.props = [...(m.props || []), {kind: 'campfire', x: 106, y: 112, z: 0}];
  written.push(save('p4-building-campfire', m));
}
console.log(JSON.stringify(written));
