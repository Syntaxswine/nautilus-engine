// What the game does with a spawn the C02 (Manhattan) mutant accepts: build the corner witness
// with the mutated adapter, then hand the scenario to the pinned Tinderbox simulation.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), file = path.join(root, 'packages/adapters/tinderbox/index.js'), original = fs.readFileSync(file);
let text = original.toString('utf8');
text = text.replace('return Math.hypot(Math.max(Math.abs(player.x', 'return (Math.max(Math.abs(player.x').replace('/ 2, 0), Math.max(Math.abs(player.y', '/ 2, 0) + Math.max(Math.abs(player.y');
const out = {};
try {
  fs.writeFileSync(file, text);
  const {blankMap} = await import(pathToFileURL(path.join(root, 'packages/map-core/index.js')));
  const {createTinderboxScene} = await import(pathToFileURL(path.join(root, 'packages/adapters/tinderbox/index.js')) + '?mutant');
  const {createSimulation} = await import(pathToFileURL(path.join(root, 'tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/index.js')));
  const recipe = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/consumers/tinderbox/flat-yard-recipe.json'), 'utf8'));
  const map = blankMap(recipe.name); map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: [...structuredClone(recipe.walls), {id: 'c', a: [20.6, 25.15], b: [20.6, 27.15], z: 0, stories: 1, material: 'wood'}]};
  map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value;
  const scene = createTinderboxScene(map, structuredClone(recipe.policy));
  out.mutantAdapter = 'accepted, player at ' + JSON.stringify(scene.scenario.player);
  try { const sim = createSimulation({scenario: scene.scenario, seed: scene.policy.seed}); out.pinnedTinderbox = 'accepted'; sim.dispose(); }
  catch (error) { out.pinnedTinderbox = error.constructor.name + ': ' + error.message + (error.code ? ' code ' + error.code : ''); }
} finally { fs.writeFileSync(file, original); }
out.restored = fs.readFileSync(file).equals(original);
console.log(JSON.stringify(out, null, 1));
