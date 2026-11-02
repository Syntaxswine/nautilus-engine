// Does the adapter's PLAYER_CLEARANCE verdict agree with the pinned Tinderbox's own spawn check
// (freePoint on the compiled obstacles, with DEFAULT_CONFIG.player.radius)? The modules are taken
// from a scene whose selected start is moved far from every witness wall, so they are exactly the
// modules the refused map would have produced. Usage: node consumer-agree.mjs <tree-root>
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), pin = path.join(root, 'tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src');
const imp = rel => import(pathToFileURL(path.join(root, rel)));
const {blankMap} = await imp('packages/map-core/index.js');
const {createTinderboxScene, TINDERBOX_ADAPTER} = await imp('packages/adapters/tinderbox/index.js');
const {compileModules} = await import(pathToFileURL(path.join(pin, 'content/exterior-kit.js')));
const {freePoint} = await import(pathToFileURL(path.join(pin, 'simulation/geometry.js')));
const {DEFAULT_CONFIG} = await import(pathToFileURL(path.join(pin, 'simulation/config.js')));
const recipe = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/consumers/tinderbox/flat-yard-recipe.json'), 'utf8'));
function fixture() {
  const map = blankMap(recipe.name);
  map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)};
  map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value;
  return map;
}
const walls = {
  'test 20.6': [[20.6, 24], [20.6, 26]], 'test 20.7': [[20.7, 24], [20.7, 26]],
  'corner 0.52/0.15': [[20.6, 25.15], [20.6, 27.15]], 'corner 0.52/0.25': [[20.6, 25.25], [20.6, 27.25]],
  'beside vertical': [[20.6, 24], [20.6, 34]], 'beside horizontal off-centre': [[18, 24.4], [28, 24.4]],
  'beside horizontal centred': [[16, 24.4], [24, 24.4]], 'reversed horizontal': [[23, 24.4], [19, 24.4]],
  'face 0.545': [[20.625, 24], [20.625, 26]], 'face 0.58': [[20.66, 24], [20.66, 26]],
  'face 0.555': [[20.635, 24], [20.635, 26]], 'face 0.565': [[20.645, 24], [20.645, 26]],
};
const rows = {}, policy = structuredClone(recipe.policy);
const verdict = map => { try { createTinderboxScene(map, policy); return 'accept'; } catch (error) { return error.code; } };
for (const [name, [a, b]] of Object.entries(walls)) {
  const map = fixture(); map.wallRuns.segments.push({id: 'w', a, b, z: 0, stories: 1, material: 'wood'});
  const far = structuredClone(map); far.starts[0] = {x: 12, y: 33, z: 0};
  const scene = createTinderboxScene(far, policy).scenario, obstacles = compileModules(scene.modules, scene).obstacles;
  const probe = {x: map.starts[0].x - policy.region.x + 0.5, y: map.starts[0].y - policy.region.y + 0.5};
  rows[name] = {adapter: verdict(map), consumer: freePoint(probe, DEFAULT_CONFIG.player.radius, scene, obstacles) ? 'accept' : 'refuse'};
}
for (const [name, start] of Object.entries({'top row': [20, 20], 'right column': [29, 25], 'bottom row': [20, 35], 'left column (rim)': [10, 25]})) {
  const map = fixture(); map.starts[0] = {x: start[0], y: start[1], z: 0};
  const far = structuredClone(map); far.starts[0] = {x: 12, y: 33, z: 0};
  const scene = createTinderboxScene(far, policy).scenario, obstacles = compileModules(scene.modules, scene).obstacles;
  rows[name] = {adapter: verdict(map), consumer: freePoint({x: start[0] - policy.region.x + 0.5, y: start[1] - policy.region.y + 0.5}, DEFAULT_CONFIG.player.radius, scene, obstacles) ? 'accept' : 'refuse'};
}
const agree = Object.values(rows).every(r => (r.adapter === 'accept') === (r.consumer === 'accept'));
console.log(JSON.stringify({adapterRadius: TINDERBOX_ADAPTER.playerRadius, consumerRadius: DEFAULT_CONFIG.player.radius, agree, rows}, null, 1));
