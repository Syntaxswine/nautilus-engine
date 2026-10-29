// SF4 at float resolution. A vertical wall run beside the selected spawn is moved one double at a time
// across the shared threshold (radius - 1e-10 m). For every x the adapter's verdict (createTinderboxScene)
// and the pinned game's (freePoint on the compiled obstacles) are recorded, with the face distance the
// adapter computes. It reports: whether the two ever disagree, the exact boundary pair, whether any x
// lands exactly on the threshold (where '<' and '<=' differ), the two committed probes' margins, and the
// tolerance window the probes leave alive. Usage: node threshold-r5.mjs <checkout> <out.json>
import fs from 'node:fs';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root = pathToFileURL(process.argv[2].replace(/[\\/]?$/, '/')), outFile = process.argv[3];
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
const f = new Float64Array(1), b = new BigInt64Array(f.buffer);
const step = (x, n) => {f[0] = x; b[0] += BigInt(n); return f[0];};
const radius = TINDERBOX_ADAPTER.playerRadius, threshold = radius - 1e-10;
function probe(x) {
  const map = fixture(); map.wallRuns.segments.push({id: 'probe', a: [x, 24], b: [x, 26], z: 0, stories: 1, material: 'wood'});
  const clear = structuredClone(map); clear.starts[0] = {x: 12, y: 33, z: 0};
  const scene = createTinderboxScene(clear, structuredClone(recipe.policy)).scenario, offset = scene.nautilus.coordinateOffset;
  const spawn = {x: map.starts[0].x + offset.x, y: map.starts[0].y + offset.y};
  const obstacles = compileModules(scene.modules, scene).obstacles, wall = scene.modules.find(m => m.id === 'nautilus-wall:probe');
  const obstacle = obstacles.find(o => o.moduleId === 'nautilus-wall:probe');
  // The adapter's own expression (packages/adapters/tinderbox/index.js:157) for this wall.
  const swap = Math.round(wall.heading / (Math.PI / 2)) % 2;
  const face = Math.hypot(Math.max(Math.abs(spawn.x - wall.x) - (swap ? wall.depth : wall.width) / 2, 0), Math.max(Math.abs(spawn.y - wall.y) - (swap ? wall.width : wall.depth) / 2, 0));
  const gameFace = Math.hypot(Math.max(Math.abs(spawn.x - obstacle.x) - obstacle.width / 2, 0), Math.max(Math.abs(spawn.y - obstacle.y) - obstacle.depth / 2, 0));
  let adapter; try { createTinderboxScene(map, structuredClone(recipe.policy)); adapter = true; } catch (error) { adapter = error.code === 'PLAYER_CLEARANCE' ? false : error.code; }
  return {x, face, gameFace, adapter, game: freePoint(spawn, DEFAULT_CONFIG.player.radius, scene, obstacles)};
}
// Find the boundary by bisection on x, then walk doubles around it.
let lo = 20.63999999985, hi = 20.63999999995;
if (probe(lo).adapter !== false || probe(hi).adapter !== true) throw Error('The committed probes do not bracket the threshold');
for (let i = 0; i < 200 && step(lo, 1) < hi; i++) { const mid = (lo + hi) / 2; if (mid === lo || mid === hi) break; if (probe(mid).adapter) hi = mid; else lo = mid; }
const window = [];
for (let n = -300; n <= 300; n++) window.push(probe(step(lo, n)));
let lastRefused = null, firstAccepted = null;
for (const row of window) { if (row.adapter === false) lastRefused = row; else if (!firstAccepted && row.adapter === true && lastRefused) firstAccepted = row; }
const disagreements = window.filter(row => row.adapter !== row.game || row.face !== row.gameFace);
const onThreshold = window.filter(row => row.face === threshold);
const faces = [...new Set(window.map(row => row.face))].sort((a, c) => a - c);
const gaps = faces.slice(1).map((v, i) => v - faces[i]);
const committed = [20.63999999985, 20.63999999995].map(x => {const row = probe(x); return {x, adapter: row.adapter, game: row.game, deficitFromRadius: radius - row.face, marginToThreshold: row.face - threshold};});
// The tolerances t for which both committed probes keep their verdicts: refused iff face < radius - t.
const face1 = probe(20.63999999985).face, face2 = probe(20.63999999995).face;
const survives = t => face1 < radius - t && !(face2 < radius - t);
const tolerances = [0, 1e-14, 4e-11, 5e-11, 5.000001e-11, 6e-11, 8e-11, 1e-10, 1.2e-10, 1.49e-10, 1.4999999e-10, 1.5e-10, 1.6e-10, 3e-10, 1e-9];
const out = {radius, threshold, hypotOfZeroIsExact: Math.hypot(0.123456789, 0) === 0.123456789,
  sweep: {doubles: window.length, xFrom: window[0].x, xTo: window.at(-1).x, faceGrid: {min: Math.min(...gaps), max: Math.max(...gaps)}},
  disagreements: disagreements.length, lastRefused, firstAccepted, onThreshold: onThreshold.map(row => row.x),
  committed, tolerancesThatKeepBothVerdicts: tolerances.map(t => ({t, survives: survives(t)})),
  probes: [20.6399, 20.6401, 20.64].map(x => {const row = probe(x); return {x, faceMinusRadius: row.face - radius, adapter: row.adapter, game: row.game};})};
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
