// Round 3's consequence-c19.mjs, re-pointed at C30 (the clearance epsilon widened from 1e-10 to 1 mm):
// a vertical run whose face is 0.5595 m east of the spawn, i.e. 0.5 mm inside the bear's radius,
// between the probe table's 5 mm faces. What do the pristine adapter, the mutant and the pinned game
// do with it? The mutated adapter is a sibling copy, removed in a finally.
// Usage: node consequence-c30.mjs <pristine-root>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {MUTANTS} from './mutants.mjs';
const root = path.resolve(process.argv[2]), real = path.join(root, 'packages/adapters/tinderbox/index.js'), file = path.join(root, 'packages/adapters/tinderbox/index.C30c.js');
const text = fs.readFileSync(real, 'utf8'), [, [edit]] = MUTANTS.C30;
if (text.split(edit.find).length !== 2) throw Error('needle');
const {blankMap} = await import(pathToFileURL(path.join(root, 'packages/map-core/index.js')));
const {createSimulation} = await import(pathToFileURL(path.join(root, 'tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/index.js')));
const pristine = await import(pathToFileURL(real));
let mutant;
try { fs.writeFileSync(file, text.replace(edit.find, edit.replace)); mutant = await import(pathToFileURL(file).href + '?c30'); }
finally { fs.rmSync(file, {force: true}); }
const recipe = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/consumers/tinderbox/flat-yard-recipe.json'), 'utf8'));
const out = {};
for (const x of [20.6395, 20.6399]) {
  const map = blankMap(recipe.name); map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: [...structuredClone(recipe.walls), {id: 'w1', a: [x, 24], b: [x, 26], z: 0, stories: 1, material: 'wood'}]};
  map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x2 = patch.x; x2 < patch.x + patch.width; x2++) map.terrain[y][x2] = patch.value;
  const row = out['wall at x ' + x + ' (face ' + (x - 20 - 0.08).toFixed(4) + ' m)'] = {};
  try { pristine.createTinderboxScene(map, structuredClone(recipe.policy)); row.pristineAdapter = 'accepted'; } catch (error) { row.pristineAdapter = 'refused ' + error.code + ' at ' + error.path; }
  let scene; try { scene = mutant.createTinderboxScene(map, structuredClone(recipe.policy)); row.mutantAdapter = 'accepted, player at ' + JSON.stringify(scene.scenario.player); } catch (error) { row.mutantAdapter = 'refused ' + error.code; }
  if (scene) { try { const sim = createSimulation({scenario: scene.scenario, seed: scene.policy.seed}); row.pinnedTinderbox = 'accepted'; sim.dispose?.(); }
    catch (error) { row.pinnedTinderbox = error.constructor.name + ': ' + error.message + (error.code ? ' code ' + error.code : ''); } }
}
out.siblingRemoved = !fs.existsSync(file);
console.log(JSON.stringify(out, null, 1));
