// Hostile/edge probes against the public engine API at the sandbox commit. Read-only use.
import {performance} from 'node:perf_hooks';
import {openDocument, blankMap, placeBuilding, generateBuildingLayout, DEFAULT_RESIDENTIAL_ASSETS, BUILDING_ASSETS} from '../../packages/map-core/index.js';
import {createTinderboxScene, TINDERBOX_ADAPTER} from '../../packages/adapters/tinderbox/index.js';
import {readFileSync} from 'node:fs';
const out = {};
const recipe = JSON.parse(readFileSync(new URL('../../tests/fixtures/consumers/tinderbox/flat-yard-recipe.json', import.meta.url)));
function fixture() {
  const map = blankMap(recipe.name);
  map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)}; map.metadata = structuredClone(recipe.metadata);
  for (const p of recipe.terrain) for (let y = p.y; y < p.y + p.height; y++) for (let x = p.x; x < p.x + p.width; x++) map.terrain[y][x] = p.value;
  return map;
}
const code = fn => { try { fn(); return 'accepted'; } catch (e) { return (e.code || e.name) + ': ' + e.message.slice(0, 140); } };

// A. The wall-proximity half of PLAYER_CLEARANCE. The suite's own "clearance" case puts the start ON the wall,
// which the map validator rejects first (INVALID_MAP), so the clearance branch never runs.
const onWall = fixture(); onWall.starts[0] = {x: 25, y: 25, z: 0};
out.A_suiteClearanceCase = code(() => createTinderboxScene(onWall, recipe.policy));
const nearWall = fixture(); nearWall.wallRuns.segments.push({id: 'near', a: [21.6, 24], b: [21.6, 26], z: 0, stories: 1, material: 'wood'});
out.A_startWithin056mOfWall = code(() => createTinderboxScene(nearWall, recipe.policy));
out.A_note = 'start (20,25) -> Tinderbox (10.5,5.5); wall at x=21.6 -> 12.1, face at 12.02; gap 0.52 m < 0.56 m';

// B. Drift from AFT upstream: duplicateCharacter refuses layers above 2 although maps declare up to 6 layers.
{
  const m = blankMap('Upper guard'); m.levels = 6; m.upper = Array.from({length: 5}, () => ({}));
  for (let y = 40; y < 44; y++) for (let x = 40; x < 44; x++) { m.upper[2][x + ',' + y] = 'floor'; m.upper[0][x + ',' + y] = 'floor'; }
  m.guards = [{x: 41, y: 41, z: 3, species: 'goat', weapon: 'rifle'}];
  try {
    const d = openDocument(m), id = JSON.parse(d.export()).guards[0].character.id;
    out.B_duplicateOnLayer3 = code(() => d.duplicateCharacter(id, {x: 42, y: 42, z: 3}));
    out.B_duplicateOnLayer1 = code(() => d.duplicateCharacter(id, {x: 42, y: 42, z: 1}));
  } catch (e) { out.B_setup = 'setup failed: ' + e.message.slice(0, 200); }
}

// C. Agent-built structures are not placeable: no catalogue identity or provider exists for them.
const yard = blankMap('Structures');
yard.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; yard.exits = [{x: 8, y: 8}];
for (const asset of ['ellis-hospital-two', 'boott-mill-four', 'quincy-market-hall', 'alder-court', 'mercer-courts', 'albany-cottage', 'violet-bay-house'])
  out['C_place_' + asset] = code(() => placeBuilding(yard, {asset, x: 30, y: 30, turns: 0, clearance: 2}));
out.C_registryCount = BUILDING_ASSETS.length;

// D. Cost of one editor preview (the editor previews on pointer drags) on a settled map.
{
  let m = blankMap('Busy'); m.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; m.exits = [{x: 8, y: 8}];
  m = generateBuildingLayout(m, {seed: 'probe', count: 24, assets: [...DEFAULT_RESIDENTIAL_ASSETS], area: {x: 20, y: 20, width: 210, depth: 210}, clearance: 2}).map;
  m.wallRuns = {version: 1, segments: Array.from({length: 40}, (_, i) => ({id: 'w' + i, a: [2 + i * 0.25, 230], b: [2 + i * 0.25 + 0.1, 236], z: 0, stories: 1, material: 'brick'}))};
  let t = performance.now(); const d = openDocument(m); out.D_openDocumentMs = Math.round(performance.now() - t);
  const times = [];
  for (let i = 0; i < 10; i++) { t = performance.now(); const r = d.preview({tool: 'wall-run', start: {x: 3, y: 3 + i, z: 0}, end: {x: 6, y: 3 + i, z: 0}, options: {exact: true}}); times.push(performance.now() - t); if (!r.ok) out.D_previewError = r.error; }
  times.sort((a, b) => a - b); out.D_wallPreviewMs = {median: Math.round(times[5]), max: Math.round(times[9])};
  t = performance.now(); d.validate(); out.D_fullValidateMs = Math.round(performance.now() - t);
  t = performance.now(); const json = d.export(); out.D_exportMs = Math.round(performance.now() - t); out.D_exportBytes = json.length;
  t = performance.now(); openDocument(json); out.D_reopenMs = Math.round(performance.now() - t);
}
console.log(JSON.stringify(out, null, 2));
