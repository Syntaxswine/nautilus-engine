// (1) C18: the four natural exact-radius faces, and whether a coordinate like 20.639999999998 is
// accepted by the map and splits C18 from the pinned freePoint. (2) E16: describe(input) vs
// describe(open(input).export()) on several inputs.
import fs from 'node:fs';
import {blankMap, describeBlueprint, openDocument, createMapDocument, createBlockDocument} from '../../packages/map-core/index.js';
import {exampleYard} from '../../packages/map-core/example.js';
import {createTinderboxScene} from '../../packages/adapters/tinderbox/index.js';
import {compileModules} from '../../tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/content/exterior-kit.js';
import {freePoint} from '../../tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/geometry.js';
import {DEFAULT_CONFIG} from '../../tests/fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/config.js';
const recipe = JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/consumers/tinderbox/flat-yard-recipe.json', import.meta.url), 'utf8'));
function fixture() { const map = blankMap(recipe.name); map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)}; map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value; return map; }
const options = () => structuredClone(recipe.policy);
const out = {c18: [], e16: []};
for (const [label, wall] of [['x 20.64', [[20.64, 24], [20.64, 26]]], ['x 19.36', [[19.36, 24], [19.36, 26]]], ['y 25.64', [[19, 25.64], [21, 25.64]]], ['y 24.36', [[19, 24.36], [21, 24.36]]], ['x 20.639999999998', [[20.639999999998, 24], [20.639999999998, 26]]], ['x 20.6399999999', [[20.6399999999, 24], [20.6399999999, 26]]]]) {
  const map = fixture(); map.wallRuns.segments.push({id: 'probe', a: wall[0], b: wall[1], z: 0, stories: 1, material: 'wood'});
  const clear = structuredClone(map); clear.starts[0] = {x: 12, y: 33, z: 0};
  let scene; try { scene = createTinderboxScene(clear, options()).scenario; } catch (e) { out.c18.push({label, mapRefused: e.code}); continue; }
  const o = scene.nautilus.coordinateOffset, spawn = {x: map.starts[0].x + o.x, y: map.starts[0].y + o.y}, m = scene.modules.find(m => m.id === 'nautilus-wall:probe');
  const swap = Math.round(m.heading / (Math.PI / 2)) % 2, d = Math.hypot(Math.max(Math.abs(spawn.x - m.x) - (swap ? m.depth : m.width) / 2, 0), Math.max(Math.abs(spawn.y - m.y) - (swap ? m.width : m.depth) / 2, 0));
  let adapter; try { createTinderboxScene(map, options()); adapter = 'accepted'; } catch (e) { adapter = e.code; }
  out.c18.push({label, distance: d, pinned: freePoint(spawn, DEFAULT_CONFIG.player.radius, scene, compileModules(scene.modules, scene).obstacles) ? 'free' : 'blocked', adapter, c18Verdict: d < 0.56 ? 'refused' : 'accepted'});
}
const inputs = {exampleYard: exampleYard(), blank: blankMap('blank'), editorExport: createMapDocument('e').export(), block: createBlockDocument('b').export()};
for (const [name, input] of Object.entries(inputs)) {
  let a, b; try { a = JSON.stringify(describeBlueprint(input)); } catch (e) { a = 'throws ' + e.message; } try { b = JSON.stringify(describeBlueprint(openDocument(input).export())); } catch (e) { b = 'throws ' + e.message; }
  out.e16.push({name, equal: a === b});
}
console.log(JSON.stringify(out, null, 1));
