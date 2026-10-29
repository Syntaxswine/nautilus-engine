// Feed a Nautilus-authored flat map (yard + building prefab + sloped roof + angled wall run)
// to Farmyard origin/main 60aeeed's own AFT importer and see what survives.
import {openDocument, placeBuilding, blankMap} from '../../packages/map-core/index.js';
import {adaptAftSector} from './fymain/sites/tactical-animal/dist/aft-sector.js';

let map = blankMap('Flat yard with a house');
map.starts = [{x: 9, y: 17}, {x: 10, y: 17}, {x: 9, y: 18}, {x: 10, y: 18}]; map.exits = [{x: 19, y: 23}];
map = placeBuilding(map, {asset: 'albany-cottage', x: 60, y: 60, turns: 0, clearance: 2}).map;
map.slopedRoofs = {version: 1, roofs: [{id: 'roof-1', x: 150, y: 150, width: 6, depth: 8, z: 1, style: 'gable', axis: 'x', pitch: 35, overhang: 0.3, material: 'slate', seed: 7}]};
map.wallRuns = {version: 1, segments: [{id: 'wall-1', a: [40, 120], b: [48, 128], z: 0, stories: 1, material: 'brick'}]};
const exported = JSON.parse(openDocument(map).export());
const result = {};
try {
  const adapted = adaptAftSector(exported);
  result.farmyardAccepted = true;
  result.adaptedKeys = Object.keys(adapted);
  result.survives = {buildingPrefabs: JSON.stringify(adapted).includes('albany-cottage'), slopedRoofs: JSON.stringify(adapted).includes('roof-1'), wallRuns: JSON.stringify(adapted).includes('wall-1')};
  result.obstacles = adapted.obstacles.length; result.edges = Object.keys(adapted.edges).length;
} catch (error) { result.farmyardAccepted = false; result.error = error.message; }
console.log(JSON.stringify(result, null, 2));
