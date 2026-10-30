// Candidate clearance probes near the shared threshold, radius - 1e-10, on the pinned Tinderbox and on
// the adapter's formula with several tolerances. Run: node threshold-probe.mjs <checkout>
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root = pathToFileURL(process.argv[2].replace(/\/?$/, '/'));
const at = p => new URL(p, root).href;
const {blankMap} = await import(at('packages/map-core/index.js'));
const {createTinderboxScene, TINDERBOX_ADAPTER} = await import(at('packages/adapters/tinderbox/index.js'));
const pin = 'tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/';
const {compileModules} = await import(at(pin + 'content/exterior-kit.js'));
const {freePoint} = await import(at(pin + 'simulation/geometry.js'));
const {DEFAULT_CONFIG} = await import(at(pin + 'simulation/config.js'));
const recipe = JSON.parse(await readFile(new URL('tests/fixtures/consumers/tinderbox/flat-yard-recipe.json', root), 'utf8'));
function fixture() {
  const map = blankMap(recipe.name);
  map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)};
  map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value;
  return map;
}
const radius = TINDERBOX_ADAPTER.playerRadius, rows = [];
for (const x of [20.6399, 20.6401, 20.63999999985, 20.63999999995, 20.64, 20.640000001, 20.639999999]) {
  const map = fixture(); map.wallRuns.segments.push({id: 'probe', a: [x, 24], b: [x, 26], z: 0, stories: 1, material: 'wood'});
  const clear = structuredClone(map); clear.starts[0] = {x: 12, y: 33, z: 0};
  const scene = createTinderboxScene(clear, structuredClone(recipe.policy)).scenario, offset = scene.nautilus.coordinateOffset;
  const spawn = {x: map.starts[0].x + offset.x, y: map.starts[0].y + offset.y};
  const obstacles = compileModules(scene.modules, scene).obstacles, wall = scene.modules.find(m => m.id === 'nautilus-wall:probe');
  const face = Math.abs(spawn.x - wall.x) - wall.depth / 2;
  const verdict = tolerance => !(face < radius - tolerance);
  let adapter; try { createTinderboxScene(map, structuredClone(recipe.policy)); adapter = true; } catch (error) { adapter = error.code; }
  rows.push({x, faceMinusRadius: face - radius, tinderbox: freePoint(spawn, DEFAULT_CONFIG.player.radius, scene, obstacles), adapter,
    formula: {pristine: verdict(1e-10), C18: verdict(0), t3e10: verdict(3e-10), t1e9: verdict(1e-9), t1e4: verdict(1e-4), C30: verdict(1e-3)}});
}
console.log(JSON.stringify({radius, eps: 1e-10, rows}, null, 1));
