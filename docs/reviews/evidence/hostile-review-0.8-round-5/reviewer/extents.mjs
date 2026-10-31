// Round 5: each design's footprint (buildingTransform) and the extent sphere the clusters use
// (apps/editor/prefab-scene.js extent()), built headless as tools/asset-draw-counts.mjs builds them.
//   node artifacts/r08-5/extents.mjs [design ...]
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const S = path.resolve(import.meta.dirname, '../..'), imp = p => import(pathToFileURL(path.join(S, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {PrefabLayer, extent} = await imp('apps/editor/prefab-scene.js');
const {prepare, editorScene, release} = await imp('tools/asset-draw-counts.mjs');
const prefab = await imp('packages/prefab-core/index.js');
const s = editorScene(); prepare(s);
const layer = new PrefabLayer(new T.Scene(), {}, () => {}, e => {throw e;}, {providers: s.prefabs.providers});
const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...prefab.GROSS_BUILDING_ASSETS.map(a => a.id), ...prefab.ORIGINAL_BUILDING_ASSETS.slice(0, 4).map(a => a.id)];
const rows = [];
try {
  await layer.update({map: {buildingPrefabs: {instances: ids.map((asset, i) => ({id: 'd' + i, asset, x: 10 + i * 60, y: 10, turns: 0, clearance: 1}))}}}, {level: 0, showAllLevels: true, roofs: true, walls: true});
  for (const id of ids) {
    const t = prefab.buildingTransform({asset: id, x: 0, y: 0, turns: 0}), template = layer.templates.get(id);
    template.model.root.updateMatrixWorld(true);
    const sphere = extent(template);
    rows.push({id, width: t.width, depth: t.depth, radius: +sphere.radius.toFixed(2), centre: sphere.center.toArray().map(v => +v.toFixed(2))});
  }
} finally {layer.dispose(); release(s);}
console.log(JSON.stringify(rows, null, 1));
