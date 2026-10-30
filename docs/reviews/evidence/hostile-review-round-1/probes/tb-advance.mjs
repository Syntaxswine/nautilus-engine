import {readFileSync} from 'node:fs';
import {blankMap} from '../../packages/map-core/index.js';
import {createTinderboxScene} from '../../packages/adapters/tinderbox/index.js';
import * as pin from '../../tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/index.js';
import * as dev from './tbdev/src/simulation/index.js';
const recipe = JSON.parse(readFileSync(new URL('../../tests/fixtures/consumers/tinderbox/flat-yard-recipe.json', import.meta.url)));
const m = blankMap(recipe.name); m.starts = structuredClone(recipe.starts); m.exits = structuredClone(recipe.exits);
m.wallRuns = {version: 1, segments: structuredClone(recipe.walls)};
for (const p of recipe.terrain) for (let y = p.y; y < p.y + p.height; y++) for (let x = p.x; x < p.x + p.width; x++) m.terrain[y][x] = p.value;
const scene = createTinderboxScene(m, recipe.policy), out = {};
for (const [k, sim] of [['pinned', pin], ['dev', dev]]) {
  const g = sim.createSimulation({scenario: structuredClone(scene.scenario), seed: 1947});
  try { g.dispatch({type: 'move', x: 1, y: 0}); } catch (e) { out[k + 'Dispatch'] = e.message.slice(0, 80); }
  let s; for (let i = 0; i < 60; i++) s = g.advance(1 / 30);
  out[k] = {tick: s.tick, player: [+s.player.x.toFixed(3), +s.player.y.toFixed(3)], obstacles: s.world.obstacles.length, buildings: s.world.buildings?.length ?? '(n/a)'};
  g.dispose();
}
console.log(JSON.stringify(out));
