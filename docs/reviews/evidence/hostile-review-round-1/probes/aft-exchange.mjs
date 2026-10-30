// Exchange probe: Nautilus <-> AFT map format, both directions. Read-only use of engine code.
import {openDocument, placeBuilding, loadBlueprint, createSave, parseSave, requiredMapFeatures} from '../../packages/map-core/index.js';
import {exampleYard} from '../../packages/map-core/example.js';
import * as aftPin from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import * as aftMain from './aftmain/dist/tactics/core/maps.js';

const out = {};
// 1. A Nautilus-authored map: example yard + one Gross house + one original building + a sloped roof + an angled wall run.
let map = exampleYard();
map = placeBuilding(map, {asset: 'albany-cottage', x: 60, y: 60, turns: 0, clearance: 2}).map;
map = placeBuilding(map, {asset: 'violet-bay-house', x: 100, y: 60, turns: 1, clearance: 2}).map;
map.slopedRoofs = {version: 1, roofs: [{id: 'roof-1', x: 150, y: 150, width: 6, depth: 8, z: 1, style: 'gable', axis: 'x', pitch: 35, overhang: 0.3, material: 'slate', seed: 7}]};
map.wallRuns = {version: 1, segments: [{id: 'wall-1', a: [40, 120], b: [48, 128], z: 0, stories: 1, material: 'brick'}]};
const doc = openDocument(map);
const exported = doc.export();
out.nautilusExport = {bytes: exported.length, errors: doc.validate(), requiredFeatures: requiredMapFeatures(JSON.parse(exported)),
  topLevelKeys: Object.keys(JSON.parse(exported)).filter(k => ['buildingPrefabs', 'slopedRoofs', 'wallRuns', 'version'].includes(k)),
  version: JSON.parse(exported).version, carriesRequirementStamp: /requirements|nautilus-save/.test(exported.slice(0, 2000))};
for (const [label, aft] of [['aftPin781246a', aftPin], ['aftMain25d0e918', aftMain]]) {
  try {
    const parsed = aft.parseMap(exported, {allowDisconnected: true});
    out[label + '_readsNautilusExport'] = {accepted: true, keptFields: ['buildingPrefabs', 'slopedRoofs', 'wallRuns'].filter(k => parsed[k] !== undefined),
      buildingCount: parsed.buildingPrefabs?.instances?.length, roofCount: parsed.slopedRoofs?.roofs?.length, wallRunCount: parsed.wallRuns?.segments?.length};
  } catch (error) { out[label + '_readsNautilusExport'] = {accepted: false, error: error.message.slice(0, 200)}; }
}
// 2. An AFT-main-valid map using the species AFT added on 2026-10-28 (bull guard).
const aftMap = aftMain.blankMap('AFT main bull guard');
aftMap.guards = [{x: 30, y: 30, z: 0, species: 'bull', weapon: 'rifle'}];
const aftText = JSON.stringify(aftMap);
try { aftMain.parseMap(aftText); out.aftMainAcceptsBull = true; } catch (error) { out.aftMainAcceptsBull = 'REJECTED: ' + error.message.slice(0, 160); }
try { aftPin.parseMap(aftText); out.aftPinAcceptsBull = true; } catch (error) { out.aftPinAcceptsBull = 'REJECTED: ' + error.message.slice(0, 160); }
try { openDocument(aftText); out.nautilusOpenDocumentBull = 'accepted'; } catch (error) { out.nautilusOpenDocumentBull = 'REJECTED: ' + error.message.slice(0, 160); }
try { loadBlueprint(aftText); out.nautilusLoadBlueprintBull = 'accepted'; } catch (error) { out.nautilusLoadBlueprintBull = 'REJECTED ' + error.code + ': ' + error.message.slice(0, 160); }
out.aftSpecies = {pin: aftPin.SPECIES, main: aftMain.SPECIES};
// 3. Does a stamped save tell a consumer what it needs? (The editor's Export button writes plain JSON, not this envelope.)
const save = createSave(exported);
out.saveRequirements = save.requirements.required.map(r => r.id);
console.log(JSON.stringify(out, null, 2));
