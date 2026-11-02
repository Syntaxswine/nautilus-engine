// Round 3: new clearance mutants against the author's 15-probe table and against witness maps.
// For each mutant a mutated copy of the adapter is written beside the real one in a pristine copy
// (so its relative imports resolve), imported, and removed in a finally. Each probe's verdict is
// compared with the pinned Tinderbox freePoint on the compiled obstacles, exactly as the test does.
// Usage: node clear-probe.mjs <pristine-root> [out.json]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), outFile = process.argv[3];
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
const options = () => structuredClone(recipe.policy);
// The author's table, verbatim (tests/tinderbox-adapter.test.mjs:215-231).
const TABLE = [
  ['beside, 0.52 m', {wall: [[20.6, 24], [20.6, 26]]}, false],
  ['beside, 0.62 m', {wall: [[20.7, 24], [20.7, 26]]}, true],
  ['face 5 mm inside the radius', {wall: [[20.635, 24], [20.635, 26]]}, false],
  ['face 5 mm outside the radius', {wall: [[20.645, 24], [20.645, 26]]}, true],
  ['corner 0.15 m past the end, 0.541 m', {wall: [[20.6, 25.15], [20.6, 27.15]]}, false],
  ['corner 0.25 m past the end, 0.577 m', {wall: [[20.6, 25.25], [20.6, 27.25]]}, true],
  ['beside a long vertical run, off its centre', {wall: [[20.6, 24], [20.6, 34]]}, false],
  ['beside a horizontal run, off its centre', {wall: [[18, 24.4], [28, 24.4]]}, false],
  ['beside a horizontal run drawn backwards', {wall: [[23, 24.4], [19, 24.4]]}, false],
  ['the near run listed first', {wall: [[20.6, 24], [20.6, 26]], first: true}, false],
  ['top row', {start: {x: 20, y: 20, z: 0}}, false],
  ['bottom row', {start: {x: 20, y: 35, z: 0}}, false],
  ['left column', {start: {x: 10, y: 25, z: 0}}, false],
  ['right column', {start: {x: 29, y: 25, z: 0}}, false],
  ['open yard', {}, true]
];
// Witness maps for the new mutants. The expected verdict is not written down: it is the pinned freePoint.
const WITNESSES = [
  ['W1 vertical run drawn upwards (b above a), off its centre, face 0.52 m east', {wall: [[20.6, 30], [20.6, 24]]}],
  ['W2 vertical run drawn upwards, centred, face 0.52 m east', {wall: [[20.6, 26], [20.6, 24]]}],
  ['W3 vertical run 0.72 m west of the spawn', {wall: [[19.2, 23.5], [19.2, 25.5]]}],
  ['W4 vertical run 0.52 m west of the spawn', {wall: [[19.4, 23.5], [19.4, 25.5]]}],
  ['W5 start two tiles in from the right edge (x 17.5 of 20)', {start: {x: 27, y: 25, z: 0}}],
  ['W6 start one tile in from the right edge (x 18.5 of 20)', {start: {x: 28, y: 25, z: 0}}],
  ['W7 start one tile in from the bottom edge (y 14.5 of 16)', {start: {x: 20, y: 34, z: 0}}],
  ['W8 horizontal run 0.72 m south of the spawn', {wall: [[19, 25.7], [22, 25.7]]}]
];
// The EPS witness: a face whose computed distance lands within 1e-10 below the radius.
function epsWitness() {
  for (let k = -2000; k <= 2000; k++) {
    const X = 20.64 + k * 1e-15, px = 20 - 10 + 0.5, mx = (X + X) / 2 - 10 + 0.5, d = Math.abs(px - mx) - 0.16 / 2;
    if (d < 0.56 && d >= 0.56 - 1e-10) return {X, d};
  }
  return null;
}
const eps = epsWitness();
if (eps) WITNESSES.push(['W9 face ' + eps.d + ' m away (within 1e-10 below 0.56)', {wall: [[eps.X, 24], [eps.X, 26]]}]);

const ADAPTER = 'packages/adapters/tinderbox/index.js';
const L157 = 'Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2';
const MUTANTS = [
  ['C00 neutral: hypot written as sqrt of squares', 'return Math.hypot(Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0)) < radius - 1e-10;',
    'const ax = Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), ay = Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0); return Math.sqrt(ax * ax + ay * ay) < radius - 1e-10;'],
  ['C18 epsilon dropped (< radius)', '< radius - 1e-10;', '< radius;'],
  ['C19 swap only for heading pi/2 (=== 1)', 'Math.round(m.heading / (Math.PI / 2)) % 2;', 'Math.round(m.heading / (Math.PI / 2)) === 1;'],
  ['C20 x term signed (m.x - player.x)', L157, '(m.x - player.x) - (swap ? m.depth : m.width) / 2'],
  ['C21 y term signed (m.y - player.y)', 'Math.abs(player.y - m.y)', '(m.y - player.y)'],
  ['C22 x term signed (player.x - m.x)', L157, '(player.x - m.x) - (swap ? m.depth : m.width) / 2'],
  ['C23 right bound padded by a tile', 'player.x > r.width - radius ||', 'player.x > r.width - radius - 1 ||'],
  ['C24 bottom bound padded by a tile', 'player.y > r.height - radius ||', 'player.y > r.height - radius - 1 ||'],
  ['C27 right bound compared with the height', 'player.x > r.width - radius ||', 'player.x > r.height - radius ||']
];
const pristineText = fs.readFileSync(path.join(root, ADAPTER), 'utf8');
function mapFor({wall, first, start}) {
  const map = fixture();
  if (wall) map.wallRuns.segments[first ? 'unshift' : 'push']({id: 'probe', a: wall[0], b: wall[1], z: 0, stories: 1, material: 'wood'});
  if (start) map.starts[0] = start;
  return map;
}
function verdict(adapter, map) {
  try { adapter.createTinderboxScene(map, options()); return 'accepted'; }
  catch (error) { return error.code === 'PLAYER_CLEARANCE' ? 'refused' : 'other:' + error.code; }
}
function pinned(adapter, map) {
  const clear = structuredClone(map); clear.starts[0] = {x: 12, y: 33, z: 0};
  const scene = adapter.createTinderboxScene(clear, options()).scenario, offset = scene.nautilus.coordinateOffset;
  const spawn = {x: map.starts[0].x + offset.x, y: map.starts[0].y + offset.y};
  return freePoint(spawn, DEFAULT_CONFIG.player.radius, scene, compileModules(scene.modules, scene).obstacles) ? 'accepted' : 'refused';
}
const pristine = await imp(ADAPTER);
const out = {eps, pristine: {}, mutants: []};
for (const [name, spec] of WITNESSES) { const map = mapFor(spec); out.pristine[name] = {adapter: verdict(pristine, map), pinned: pinned(pristine, map)}; }
for (const [name, spec, free] of TABLE) { const map = mapFor(spec); const v = verdict(pristine, map); if (v !== (free ? 'accepted' : 'refused')) out.pristine['TABLE ' + name] = v; }
for (const [id, find, replace] of MUTANTS) {
  const n = pristineText.split(find).length - 1;
  if (n !== 1) { out.mutants.push({id, error: 'needle x' + n}); continue; }
  const file = path.join(root, 'packages/adapters/tinderbox/index.' + id.split(' ')[0] + '.js');
  let adapter;
  try { fs.writeFileSync(file, pristineText.replace(find, replace)); adapter = await import(pathToFileURL(file).href + '?' + id.split(' ')[0]); }
  finally { fs.rmSync(file, {force: true}); }
  const tableFlips = TABLE.filter(([, spec, free]) => verdict(adapter, mapFor(spec)) !== (free ? 'accepted' : 'refused')).map(([name]) => name);
  const witnessFlips = WITNESSES.map(([name, spec]) => { const map = mapFor(spec); return {name, pinned: pinned(pristine, map), mutant: verdict(adapter, map)}; }).filter(w => w.pinned !== w.mutant);
  out.mutants.push({id, tableFlips, witnessFlips});
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
