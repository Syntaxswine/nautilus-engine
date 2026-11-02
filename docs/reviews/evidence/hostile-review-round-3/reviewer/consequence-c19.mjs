// What the pinned game does with the spawn C19 accepts (W1: a vertical wall run drawn upwards, face
// 0.52 m east of the spawn). The mutated adapter is a sibling copy, removed in a finally.
// Usage: node consequence-c19.mjs <pristine-root>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), real = path.join(root, 'packages/adapters/tinderbox/index.js'), file = path.join(root, 'packages/adapters/tinderbox/index.C19c.js');
const text = fs.readFileSync(real, 'utf8'), find = 'Math.round(m.heading / (Math.PI / 2)) % 2;';
if (text.split(find).length !== 2) throw Error('needle');
const {blankMap} = await import(pathToFileURL(path.join(root, 'packages/map-core/index.js')));
const {createSimulation} = await import(pathToFileURL(path.join(root, 'tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/index.js')));
const pristine = await import(pathToFileURL(real));
let mutant;
try { fs.writeFileSync(file, text.replace(find, 'Math.round(m.heading / (Math.PI / 2)) === 1;')); mutant = await import(pathToFileURL(file).href + '?c19'); }
finally { fs.rmSync(file, {force: true}); }
const recipe = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/consumers/tinderbox/flat-yard-recipe.json'), 'utf8'));
const map = blankMap(recipe.name); map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
map.wallRuns = {version: 1, segments: [...structuredClone(recipe.walls), {id: 'w1', a: [20.6, 30], b: [20.6, 24], z: 0, stories: 1, material: 'wood'}]};
map.metadata = structuredClone(recipe.metadata);
for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value;
const out = {};
try { pristine.createTinderboxScene(map, structuredClone(recipe.policy)); out.pristineAdapter = 'accepted'; } catch (error) { out.pristineAdapter = 'refused ' + error.code + ' at ' + error.path; }
const scene = mutant.createTinderboxScene(map, structuredClone(recipe.policy));
out.mutantAdapter = 'accepted, player at ' + JSON.stringify(scene.scenario.player);
try { const sim = createSimulation({scenario: scene.scenario, seed: scene.policy.seed}); out.pinnedTinderbox = 'accepted'; sim.dispose?.(); }
catch (error) { out.pinnedTinderbox = error.constructor.name + ': ' + error.message + (error.code ? ' code ' + error.code : ''); }
out.siblingRemoved = !fs.existsSync(file);
console.log(JSON.stringify(out, null, 1));
