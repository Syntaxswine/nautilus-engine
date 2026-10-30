// M1 re-check on this tree: does the editor's Export of a map that needs Nautilus
// features still pass silently through AFT parseMap and Farmyard adaptAftSector?
// Consumers are copied from Git objects (AFT origin/main, Farmyard origin/main)
// and from the Nautilus-vendored AFT pin. Each consumer also gets a CONTROL that
// it must reject, so a probe that cannot see a rejection would be exposed.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {sandbox, donors, git, writeResult, nodeRig} from './lib/common.mjs';
import {extractClosure} from './lib/closure.mjs';

const imp = (p) => import(pathToFileURL(p).href);
const core = await imp(path.join(sandbox, 'packages/map-core/index.js'));
const {exampleYard} = await imp(path.join(sandbox, 'packages/map-core/example.js'));
const aftPin = await imp(path.join(sandbox, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js'));
const aftMainCommit = git(['rev-parse', 'origin/main'], donors.aft3d).trim();
const fyMainCommit = git(['rev-parse', 'origin/main'], donors.farmyard).trim();
const aftClosure = extractClosure(donors.aft3d, aftMainCommit, ['dist/tactics/core/maps.js'], 'aft3d');
const fyClosure = extractClosure(donors.farmyard, fyMainCommit, ['sites/tactical-animal/dist/aft-sector.js'], 'farmyard');
const aftMain = await imp(path.join(aftClosure.dir, 'dist/tactics/core/maps.js'));
const farmyard = await imp(path.join(fyClosure.dir, 'sites/tactical-animal/dist/aft-sector.js'));

// The probe map: example yard + a Gross house + an original house + a sloped roof + a 45-degree wall run.
let map = exampleYard();
map = core.placeBuilding(map, {asset: 'albany-cottage', x: 60, y: 60, turns: 0, clearance: 2}).map;
map = core.placeBuilding(map, {asset: 'violet-bay-house', x: 100, y: 60, turns: 1, clearance: 2}).map;
map.slopedRoofs = {version: 1, roofs: [{id: 'roof-1', x: 150, y: 150, width: 6, depth: 8, z: 1, style: 'gable', axis: 'x', pitch: 35, overhang: 0.3, material: 'slate', seed: 7}]};
map.wallRuns = {version: 1, segments: [{id: 'wall-1', a: [40, 120], b: [48, 128], z: 0, stories: 1, material: 'brick'}]};
const doc = core.openDocument(map), exported = doc.export(), parsed = JSON.parse(exported);
const out = {consumers: {aftPin: '781246a668c723d5a4c5463e70534cc04b6a5641 (vendored in Nautilus)', aftMain: aftMainCommit, farmyardMain: fyMainCommit},
  closures: {aft: aftClosure.manifest, farmyard: fyClosure.manifest}};
out.nautilusExport = {bytes: exported.length, validateErrors: doc.validate(), requiredFeatures: core.requiredMapFeatures(parsed), version: parsed.version,
  topLevelNautilusKeys: Object.keys(parsed).filter((k) => ['buildingPrefabs', 'slopedRoofs', 'wallRuns'].includes(k)), carriesRequirementStamp: /"requirements"|nautilus-save/.test(exported)};
const keep = (o) => ({buildingPrefabs: o?.buildingPrefabs?.instances?.length ?? null, slopedRoofs: o?.slopedRoofs?.roofs?.length ?? null, wallRuns: o?.wallRuns?.segments?.length ?? null});
function tryAft(label, aft, text) {
  try { const p = aft.parseMap(text, {allowDisconnected: true}); return {accepted: true, nautilusFieldsKeptAsInertData: keep(p)}; }
  catch (e) { return {accepted: false, error: e.message.slice(0, 160)}; }
}
out.aftPin = {probe: tryAft('pin', aftPin, exported), control_version3: tryAft('pin', aftPin, JSON.stringify({...parsed, version: 3})),
  control_unknownSpecies: tryAft('pin', aftPin, JSON.stringify({...parsed, guards: [{...parsed.guards[0], species: 'dragon'}]}))};
out.aftMain = {probe: tryAft('main', aftMain, exported), control_version3: tryAft('main', aftMain, JSON.stringify({...parsed, version: 3})),
  control_unknownSpecies: tryAft('main', aftMain, JSON.stringify({...parsed, guards: [{...parsed.guards[0], species: 'dragon'}]}))};
// Farmyard sees only flat yards: use a flat probe map (its own guard rejects upper floors).
let flat = core.blankMap('Flat yard with Nautilus features');
flat.starts = [{x: 9, y: 17}, {x: 10, y: 17}, {x: 9, y: 18}, {x: 10, y: 18}]; flat.exits = [{x: 19, y: 23}];
flat = core.placeBuilding(flat, {asset: 'albany-cottage', x: 60, y: 60, turns: 0, clearance: 2}).map;
flat.slopedRoofs = map.slopedRoofs; flat.wallRuns = map.wallRuns;
const flatExport = JSON.parse(core.openDocument(flat).export());
function tryFarmyard(source) {
  try { const a = farmyard.adaptAftSector(source), s = JSON.stringify(a); return {accepted: true, obstacles: a.obstacles.length, edges: Object.keys(a.edges).length, survives: {building: s.includes('albany-cottage'), roof: s.includes('roof-1'), wall: s.includes('wall-1')}}; }
  catch (e) { return {accepted: false, error: e.message.slice(0, 160)}; }
}
out.farmyardMain = {requiredFeatures: core.requiredMapFeatures(flatExport), probe: tryFarmyard(flatExport),
  control_stairs: tryFarmyard({...flatExport, stairs: [{x: 5, y: 5, z: 0, dir: 'n'}]}),
  control_badOwnExtension: tryFarmyard({...flatExport, farmyardWindows: {version: 9, instances: []}})};
out.verdict = {aftPinSilentlyAccepts: out.aftPin.probe.accepted && !out.aftPin.control_version3.accepted, aftMainSilentlyAccepts: out.aftMain.probe.accepted && !out.aftMain.control_version3.accepted,
  farmyardSilentlyDrops: out.farmyardMain.probe.accepted && !out.farmyardMain.probe.survives.building && !out.farmyardMain.control_stairs.accepted,
  exportStillPlainV2: out.nautilusExport.version === 2 && !out.nautilusExport.carriesRequirementStamp};
writeResult('m1-exchange.json', {rig: nodeRig(), ...out});
console.log(JSON.stringify({nautilusExport: out.nautilusExport, aftPin: out.aftPin, aftMain: out.aftMain, farmyardMain: out.farmyardMain, verdict: out.verdict}, null, 1));
