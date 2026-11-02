// Follow-up probes: (A) a start that really sits inside the 0.56 m bear clearance of a wall;
// (D) preview cost attribution; (E) unknown-field policy per extension; (F) 33-building import;
// (G) what loadBlueprint's `return raw` protects.
import {performance} from 'node:perf_hooks';
import {readFileSync} from 'node:fs';
import {openDocument, blankMap, generateBuildingLayout, DEFAULT_RESIDENTIAL_ASSETS, placeBuilding, loadBlueprint, createSave, prefabErrors, validateMap} from '../../packages/map-core/index.js';
import {createTinderboxScene} from '../../packages/adapters/tinderbox/index.js';
const out = {};
const code = fn => { try { const r = fn(); return r === undefined ? 'accepted' : r; } catch (e) { return (e.code || e.name) + ': ' + e.message.slice(0, 150); } };
const recipe = JSON.parse(readFileSync(new URL('../../tests/fixtures/consumers/tinderbox/flat-yard-recipe.json', import.meta.url)));
function fixture() {
  const map = blankMap(recipe.name);
  map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)}; map.metadata = structuredClone(recipe.metadata);
  for (const p of recipe.terrain) for (let y = p.y; y < p.y + p.height; y++) for (let x = p.x; x < p.x + p.width; x++) map.terrain[y][x] = p.value;
  return map;
}
// A. start (20,25). Wall at x = 20.55..20.70: face gap 0.55-0.08 = 0.47 .. 0.62 m. 0.56 m is the bear radius.
for (const wx of [20.55, 20.6, 20.64, 20.7]) {
  const m = fixture(); m.wallRuns.segments.push({id: 'near', a: [wx, 24], b: [wx, 26], z: 0, stories: 1, material: 'wood'});
  out['A_wallAt_' + wx + '_gap_' + (wx - 20 - 0.08).toFixed(2)] = code(() => { createTinderboxScene(m, recipe.policy); });
}
// D. Preview cost attribution: bare map vs settled map; commands placed away from all markers.
function settled() {
  let m = blankMap('Busy'); m.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; m.exits = [{x: 8, y: 8}];
  m = generateBuildingLayout(m, {seed: 'probe', count: 24, assets: [...DEFAULT_RESIDENTIAL_ASSETS], area: {x: 20, y: 20, width: 210, depth: 210}, clearance: 2}).map;
  m.wallRuns = {version: 1, segments: Array.from({length: 40}, (_, i) => ({id: 'w' + i, a: [2 + i * 0.25, 230], b: [2 + i * 0.25 + 0.1, 236], z: 0, stories: 1, material: 'brick'}))};
  return m;
}
function timePreviews(doc) {
  const t = [];
  for (let i = 0; i < 12; i++) { const s = performance.now(); const r = doc.preview({tool: 'wall-run', start: {x: 12, y: 2 + i, z: 0}, end: {x: 16, y: 2 + i, z: 0}, options: {exact: true}}); t.push(performance.now() - s); if (!r.ok) return 'error: ' + r.error; }
  t.sort((a, b) => a - b); return {medianMs: +t[6].toFixed(1), maxMs: +t[11].toFixed(1)};
}
const bare = blankMap('Bare'); bare.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; bare.exits = [{x: 8, y: 8}];
out.D_bareMapWallPreview = timePreviews(openDocument(bare));
const busy = settled();
out.D_settledMapWallPreview = timePreviews(openDocument(busy));
{ const s = performance.now(); for (let i = 0; i < 10; i++) prefabErrors(busy); out.D_prefabErrorsMs = +((performance.now() - s) / 10).toFixed(1); }
{ const s = performance.now(); for (let i = 0; i < 5; i++) validateMap(busy, {connectivity: false}); out.D_validateMapNoConnectivityMs = +((performance.now() - s) / 5).toFixed(1); }
// E. Unknown-field policy per extension.
{
  const m = blankMap('Fields'); m.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; m.exits = [{x: 8, y: 8}];
  const withHouse = placeBuilding(m, {asset: 'albany-cottage', x: 60, y: 60, turns: 0, clearance: 2}).map;
  const a = structuredClone(withHouse); a.buildingPrefabs.instances[0].scale = 2; a.buildingPrefabs.instances[0].mirror = true;
  out.E_prefabInstanceWithScaleAndMirror = code(() => { const d = openDocument(a); return 'accepted; exported scale=' + JSON.parse(d.export()).buildingPrefabs.instances[0].scale; });
  const b = structuredClone(withHouse); b.buildingPrefabs.lots = [{x: 1}];
  out.E_prefabEnvelopeUnknownKey = code(() => { openDocument(b); });
  const c = structuredClone(m); c.wallRuns = {version: 1, segments: [{id: 'w', a: [30, 30], b: [36, 30], z: 0, stories: 1, material: 'brick', height: 9, door: {at: 2}}]};
  out.E_wallSegmentWithHeightAndDoor = code(() => { const d = openDocument(c); return 'accepted; exported height=' + JSON.parse(d.export()).wallRuns.segments[0].height; });
  const e = structuredClone(m); e.slopedRoofs = {version: 1, roofs: [{id: 'r', x: 100, y: 100, width: 6, depth: 6, z: 1, style: 'gable', axis: 'x', pitch: 30, overhang: 0.2, material: 'slate', seed: 1, scale: 2}]};
  out.E_roofSpecWithScale = code(() => { openDocument(e); });
  // F. 33 whole buildings imported from JSON (the authoring tools stop at 32).
  const f = structuredClone(m); f.buildingPrefabs = {version: 1, catalogue: withHouse.buildingPrefabs.catalogue, instances: []};
  for (let i = 0; i < 33; i++) f.buildingPrefabs.instances.push({id: 'b' + i, asset: 'albany-cottage', x: 20 + (i % 6) * 34, y: 20 + Math.floor(i / 6) * 34, turns: 0, clearance: 1});
  const f32 = structuredClone(f); f32.buildingPrefabs.instances.pop();
  out.F_import32 = code(() => { openDocument(f32); });
  out.F_import33 = code(() => { openDocument(f); });
  // G. What does `return raw` protect? A legal map whose squad starts carry no character identities.
  const g = blankMap('Raw'); g.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; g.exits = [{x: 8, y: 8}]; g.guards = [{x: 30, y: 30, z: 0, species: 'goat', weapon: 'rifle'}];
  const raw = loadBlueprint(g), viaDoc = JSON.parse(openDocument(g).export()), viaDoc2 = JSON.parse(openDocument(g).export());
  out.G_rawGuardHasCharacter = !!raw.guards[0].character;
  out.G_documentExportGuardHasCharacter = !!viaDoc.guards[0].character;
  out.G_documentExportCharacterIdsStableAcrossOpens = viaDoc.guards[0].character?.id === viaDoc2.guards[0].character?.id;
  out.G_exampleIds = [viaDoc.guards[0].character?.id, viaDoc2.guards[0].character?.id];
  const s1 = JSON.stringify(createSave(g)), s2 = JSON.stringify(createSave(g));
  out.G_createSaveDeterministic = s1 === s2;
}
console.log(JSON.stringify(out, null, 2));
