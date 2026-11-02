// Witness maps for the clearance mutants: each one is a map the pinned adapter refuses (or,
// for a false-refusal mutant, accepts), so a mutant that flips its verdict is a real fault and
// not an equivalent mutant. Usage: node witness.mjs <tree-root>  (run on the pristine copy, then
// on copies holding one mutant each). Prints code/path or "accepted" per witness.
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]);
const {blankMap} = await import(pathToFileURL(path.join(root, 'packages/map-core/index.js')));
const {createTinderboxScene} = await import(pathToFileURL(path.join(root, 'packages/adapters/tinderbox/index.js')));
const recipe = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/consumers/tinderbox/flat-yard-recipe.json'), 'utf8'));
function fixture() {
  const map = blankMap(recipe.name);
  map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)};
  map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value;
  return map;
}
const wall = (id, a, b, first = false) => map => { const run = {id, a, b, z: 0, stories: 1, material: 'wood'}; first ? map.wallRuns.segments.unshift(run) : map.wallRuns.segments.push(run); };
const start = (x, y) => map => { map.starts[0] = {x, y, z: 0}; };
const W = {
  'test 20.6 (refused)': wall('t', [20.6, 24], [20.6, 26]),
  'test 20.7 (accepted)': wall('t', [20.7, 24], [20.7, 26]),
  // Corners: the face is 0.52 m to the side and the wall's end 0.15 / 0.25 m past the spawn.
  'W-corner 0.52/0.15 (Euclid 0.541)': wall('c', [20.6, 25.15], [20.6, 27.15]),
  'W-corner 0.52/0.25 (Euclid 0.577)': wall('c', [20.6, 25.25], [20.6, 27.25]),
  'W-beside vertical, 1 m inside its length': wall('v', [20.6, 24], [20.6, 34]),
  'W-beside horizontal, off-centre': wall('h', [18, 24.4], [28, 24.4]),
  'W-beside horizontal, centred': wall('h', [16, 24.4], [24, 24.4]),
  'W-reversed horizontal, off-centre': wall('r', [23, 24.4], [19, 24.4]),
  'W-near wall listed first': wall('f', [20.6, 24], [20.6, 26], true),
  'W-face 0.545 m': wall('d', [20.625, 24], [20.625, 26]),
  'W-face 0.58 m': wall('d', [20.66, 24], [20.66, 26]),
  'W-top row of region': start(20, 20),
  'W-right column of region': start(29, 25),
  'W-bottom row of region': start(20, 35),
};
const out = {};
for (const [name, change] of Object.entries(W)) {
  const map = fixture(); change(map);
  try { createTinderboxScene(map, structuredClone(recipe.policy)); out[name] = 'accepted'; }
  catch (error) { out[name] = (error.code || error.name) + ' ' + (error.path || '') + (error.code === 'INVALID_MAP' ? ' :: ' + error.message.slice(0, 120) : ''); }
}
console.log(JSON.stringify(out, null, 1));
