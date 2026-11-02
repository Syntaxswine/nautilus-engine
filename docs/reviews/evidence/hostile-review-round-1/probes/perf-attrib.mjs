import {performance} from 'node:perf_hooks';
import {openDocument, blankMap, generateBuildingLayout, DEFAULT_RESIDENTIAL_ASSETS, placeBuilding} from '../../packages/map-core/index.js';
import * as aft from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {validateMap as wallLayer} from '../../packages/map-core/maps.js';
import {validateMap as prefabLayer} from '../../packages/map-core/prefab-maps.js';
import {validateMap as roofLayer} from '../../packages/map-core/roof-maps.js';
let m = blankMap('Busy'); m.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; m.exits = [{x: 8, y: 8}];
m = generateBuildingLayout(m, {seed: 'probe', count: 24, assets: [...DEFAULT_RESIDENTIAL_ASSETS], area: {x: 20, y: 20, width: 210, depth: 210}, clearance: 2}).map;
m.wallRuns = {version: 1, segments: Array.from({length: 40}, (_, i) => ({id: 'w' + i, a: [2 + i * 0.25, 230], b: [2 + i * 0.25 + 0.1, 236], z: 0, stories: 1, material: 'brick'}))};
const t = (f, n = 8) => { f(); const s = performance.now(); for (let i = 0; i < n; i++) f(); return +((performance.now() - s) / n).toFixed(1); };
const out = {
  aftLegacyValidateMs: t(() => aft.validateMap(m, {connectivity: false})),
  wallLayerMs: t(() => wallLayer(m, {connectivity: false})),
  prefabLayerMs: t(() => prefabLayer(m, {connectivity: false})),
  roofLayerMs: t(() => roofLayer(m, {connectivity: false})),
  aftLegacyWithConnectivityMs: t(() => aft.validateMap(m), 3),
  fullChainWithConnectivityMs: t(() => roofLayer(m), 3),
};
// Round-trip idempotence of the editor export.
const e1 = openDocument(m).export(), e2 = openDocument(e1).export(), e3 = openDocument(e2).export();
out.roundTrip = {firstEqualsSecond: e1 === e2, secondEqualsThird: e2 === e3, bytes: e1.length};
console.log(JSON.stringify(out, null, 1));
