// Run the adapter's own golden scene through (a) the pinned Tinderbox 8a84056 conformance closure and
// (b) Tinderbox's current development line 0891c55 (extracted with git archive into ./tbdev).
import {readFileSync} from 'node:fs';
import {blankMap} from '../../packages/map-core/index.js';
import {createTinderboxScene} from '../../packages/adapters/tinderbox/index.js';
import * as pinSim from '../../tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/index.js';
import * as pinFix from '../../tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/fixtures.js';
import * as devSim from './tbdev/src/simulation/index.js';
import * as devFix from './tbdev/src/simulation/fixtures.js';
const recipe = JSON.parse(readFileSync(new URL('../../tests/fixtures/consumers/tinderbox/flat-yard-recipe.json', import.meta.url)));
const map = blankMap(recipe.name);
map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)}; map.metadata = structuredClone(recipe.metadata);
for (const p of recipe.terrain) for (let y = p.y; y < p.y + p.height; y++) for (let x = p.x; x < p.x + p.width; x++) map.terrain[y][x] = p.value;
const scene = createTinderboxScene(map, recipe.policy);
const out = {};
for (const [label, sim, fix] of [['pinned8a84056', pinSim, pinFix], ['dev0891c55', devSim, devFix]]) {
  try {
    const def = fix.scenarioDefinition(structuredClone(scene.scenario));
    const game = sim.createSimulation({scenario: structuredClone(scene.scenario), seed: scene.policy.seed});
    let snap; for (let i = 0; i < 30; i++) snap = game.update ? game.update(1 / 30, {move: {x: 1, y: 0}}) : game.step?.(1 / 30);
    out[label] = {obstacles: def.obstacles.length, modules: def.modules.length, buildings: def.buildings?.length ?? '(none)', snapshotKeys: snap ? Object.keys(snap).slice(0, 8) : 'no update()', api: Object.keys(game)};
    game.dispose();
  } catch (e) { out[label] = 'FAILED: ' + e.message.slice(0, 200); }
}
console.log(JSON.stringify(out, null, 2));
