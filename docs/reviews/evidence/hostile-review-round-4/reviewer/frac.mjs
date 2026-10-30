// Can a squad start be fractional? (decides whether sub-tile bound mutants are reachable)
import fs from 'node:fs';
import {blankMap} from '../../packages/map-core/index.js';
import {createTinderboxScene} from '../../packages/adapters/tinderbox/index.js';
const recipe = JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/consumers/tinderbox/flat-yard-recipe.json', import.meta.url), 'utf8'));
function fixture() {
  const map = blankMap(recipe.name);
  map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)};
  map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value;
  return map;
}
for (const start of [{x: 20, y: 25, z: 0}, {x: 20.3, y: 25, z: 0}, {x: 28.9, y: 25, z: 0}, {x: 10.1, y: 25, z: 0}]) {
  const map = fixture(); map.starts[0] = start;
  try { const s = createTinderboxScene(map, structuredClone(recipe.policy)); console.log(JSON.stringify(start), 'ACCEPTED', JSON.stringify(s.scenario.player)); }
  catch (error) { console.log(JSON.stringify(start), 'REFUSED', error.code, (error.message || '').slice(0, 160)); }
}
