// Round 3: the pristine adapter's PLAYER_CLEARANCE verdict against the pinned Tinderbox freePoint on
// seeded random maps (one extra axis-aligned run in either direction near a random in-region start),
// and, for each new survivor, how many of the same maps it gets wrong. Read-only on the given root,
// except sibling mutant copies of the adapter that are removed in a finally.
// Usage: node clear-random.mjs <pristine-root> [count]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), count = +(process.argv[3] || 3000);
const PIN = 'tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/';
const imp = rel => import(pathToFileURL(path.join(root, rel)));
const {blankMap} = await imp('packages/map-core/index.js');
const {compileModules} = await imp(PIN + 'content/exterior-kit.js');
const {freePoint} = await imp(PIN + 'simulation/geometry.js');
const {DEFAULT_CONFIG} = await imp(PIN + 'simulation/config.js');
const recipe = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/consumers/tinderbox/flat-yard-recipe.json'), 'utf8'));
function fixture() {
  const map = blankMap(recipe.name);
  map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)};
  map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value;
  return map;
}
let seed = 20261029; const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
const round = (v, step) => Math.round(v / step) * step;
const maps = [];
for (let i = 0; i < count; i++) {
  const map = fixture(), sx = 11 + Math.floor(rand() * 18), sy = 21 + Math.floor(rand() * 14);
  map.starts[0] = {x: sx, y: sy, z: 0};
  const vertical = rand() < 0.5, backward = rand() < 0.5, length = 0.5 + round(rand() * 6, 0.05);
  const cx = sx + 0.5 + round((rand() - 0.5) * 3, 0.01), cy = sy + 0.5 + round((rand() - 0.5) * 3, 0.01);
  let a = vertical ? [cx, cy - length / 2] : [cx - length / 2, cy], b = vertical ? [cx, cy + length / 2] : [cx + length / 2, cy];
  if (backward) [a, b] = [b, a];
  map.wallRuns.segments.push({id: 'r', a, b, z: 0, stories: 1, material: 'wood'});
  maps.push({map, label: {start: [sx, sy], a, b}});
}
const options = () => structuredClone(recipe.policy);
const verdict = (adapter, map) => { try { adapter.createTinderboxScene(map, options()); return 'accepted'; } catch (error) { return error.code === 'PLAYER_CLEARANCE' ? 'refused' : 'other'; } };
const pristine = await imp('packages/adapters/tinderbox/index.js');
function pinned(map) {
  const clear = structuredClone(map); clear.starts[0] = {x: 12, y: 33, z: 0};
  let scene; try { scene = pristine.createTinderboxScene(clear, options()).scenario; } catch { return 'other'; }
  const offset = scene.nautilus.coordinateOffset, spawn = {x: map.starts[0].x + offset.x, y: map.starts[0].y + offset.y};
  return freePoint(spawn, DEFAULT_CONFIG.player.radius, scene, compileModules(scene.modules, scene).obstacles) ? 'accepted' : 'refused';
}
const truth = maps.map(({map}) => pinned(map));
const usable = maps.map((m, i) => truth[i] !== 'other' && verdict(pristine, m.map) !== 'other');
const tally = v => ({accepted: v.filter((x, i) => usable[i] && x === 'accepted').length, refused: v.filter((x, i) => usable[i] && x === 'refused').length});
const pv = maps.map(({map}) => verdict(pristine, map));
const out = {count, usable: usable.filter(Boolean).length, pinned: tally(truth), pristineDisagreements: maps.filter((m, i) => usable[i] && pv[i] !== truth[i]).map(m => m.label).slice(0, 5), mutants: {}};
const text = fs.readFileSync(path.join(root, 'packages/adapters/tinderbox/index.js'), 'utf8');
const MUTANTS = [
  ['C19', 'Math.round(m.heading / (Math.PI / 2)) % 2;', 'Math.round(m.heading / (Math.PI / 2)) === 1;'],
  ['C20', 'Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2', '(m.x - player.x) - (swap ? m.depth : m.width) / 2'],
  ['C27', 'player.x > r.width - radius ||', 'player.x > r.height - radius ||'],
  ['C23', 'player.x > r.width - radius ||', 'player.x > r.width - radius - 1 ||'],
  ['C18', '< radius - 1e-10;', '< radius;']
];
for (const [id, find, replace] of MUTANTS) {
  const file = path.join(root, 'packages/adapters/tinderbox/index.R' + id + '.js'); let mod;
  try { fs.writeFileSync(file, text.replace(find, replace)); mod = await import(pathToFileURL(file).href + '?r' + id); } finally { fs.rmSync(file, {force: true}); }
  const wrong = maps.map((m, i) => usable[i] ? verdict(mod, m.map) : truth[i]).map((v, i) => usable[i] && v !== truth[i]);
  out.mutants[id] = {wrong: wrong.filter(Boolean).length, falseAccepts: wrong.filter((w, i) => w && truth[i] === 'refused').length, falseRefusals: wrong.filter((w, i) => w && truth[i] === 'accepted').length,
    example: maps.find((m, i) => wrong[i])?.label};
}
console.log(JSON.stringify(out, null, 1));
