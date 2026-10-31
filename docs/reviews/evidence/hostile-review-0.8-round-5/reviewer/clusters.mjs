// Round 5: how the editor's prefab layer clusters a map's copies (headless, the count tool's
// providers): per design, the copies, the clusters' sizes, which batch, and each batched
// cluster's union sphere (what a camera tests before CopyBatch's per-copy loop runs).
//   node clusters.mjs <map.json> [...]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const S = path.resolve(import.meta.dirname, '../..'), imp = p => import(pathToFileURL(path.join(S, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {PrefabLayer, extent, neighbourhoods, BATCHED} = await imp('apps/editor/prefab-scene.js');
const {prepare, editorScene, release} = await imp('tools/asset-draw-counts.mjs');
const out = [];
for (const file of process.argv.slice(2)) {
  const map = JSON.parse(fs.readFileSync(file, 'utf8')), s = editorScene(); prepare(s);
  const layer = new PrefabLayer(new T.Scene(), {}, () => {}, e => {throw e;}, {providers: s.prefabs.providers});
  try {
    await layer.update({map}, {level: 0, showAllLevels: true, roofs: true, walls: true});
    const byAsset = new Map(); for (const model of layer.models.values()) {if (!byAsset.has(model.asset)) byAsset.set(model.asset, []); byAsset.get(model.asset).push(model);}
    const designs = [];
    for (const [asset, models] of byAsset) {
      const template = layer.templates.get(asset); template.model.root.updateMatrixWorld(true); for (const m of models) m.root.updateMatrixWorld(true);
      const sphere = extent(template), clusters = neighbourhoods(models.map(m => sphere.clone().applyMatrix4(m.root.matrixWorld)));
      designs.push({asset, copies: models.length, radius: +sphere.radius.toFixed(2), clusters: clusters.map(c => c.length).sort((a, b) => b - a)});
    }
    const batches = layer.instanced.map(({mesh}) => ({copies: mesh.instanceCount, unionRadius: +mesh.boundingSphere.radius.toFixed(1)}));
    const row = {map: path.basename(file), buildings: layer.models.size, batchedCopies: new Set(layer.instanced.flatMap(({copies}) => copies.map(c => {let n = c; while (n.parent?.parent) n = n.parent; return n.uuid;}))).size,
      copyBatches: batches.length, unionRadii: [...new Set(batches.map(b => b.unionRadius))], designs};
    out.push(row);
    console.log(row.map + ': ' + row.buildings + ' buildings, ' + row.batchedCopies + ' batched in ' + row.copyBatches + ' CopyBatches (union radii ' + row.unionRadii.join('/') + ' m); ' + designs.map(d => d.asset + ' ' + d.copies + ' -> [' + d.clusters.join(',') + ']').join('; '));
  } finally {layer.dispose(); release(s);}
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({BATCHED, maps: out}, null, 1));
