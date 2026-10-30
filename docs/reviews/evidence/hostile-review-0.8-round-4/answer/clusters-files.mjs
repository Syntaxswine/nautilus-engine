// Which copies the hybrid batches on each benchmark map (headless, the editor's PrefabLayer).
//   node clusters.mjs <engine tree>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const tree = path.resolve(process.argv[2]), imp = p => import(pathToFileURL(path.join(tree, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {PrefabLayer} = await imp('apps/editor/prefab-scene.js'), {createPrefabProviders} = await imp('apps/editor/prefab-providers.js');
const {createOriginalBuildingProvider} = await imp('packages/prefab-core/provider-original.js'), {buildWorkloads} = await imp('tools/bench/workloads.mjs');
const catalogue = JSON.parse(fs.readFileSync(path.join(tree, 'vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/assets/art/gross-housing-v1/houses.json')));
const rows = [];
for (const file of process.argv.slice(3)) { const w = {id: path.basename(file), json: fs.readFileSync(file, "utf8")}; w.buildings = JSON.parse(w.json).buildingPrefabs?.instances?.length || 0;
  if (!w.buildings) continue;
  const providers = createPrefabProviders(T, {original: createOriginalBuildingProvider(T, {loadTexture: async () => new T.Texture()})});
  providers.set('gross', {...providers.get('gross'), load: async () => ({catalogue, textures: {}, dispose() {}})});
  const layer = new PrefabLayer(new T.Scene(), {}, () => {}, e => {throw e;}, {providers});
  try {
    await layer.update({map: JSON.parse(w.json)}, {level: 0, showAllLevels: true, roofs: true, walls: true});
    const sets = new Map();
    for (const {mesh, copies} of layer.instanced) {const key = copies[0].parent?.parent?.uuid + ':' + mesh.instanceCount; sets.set(copies.map(c => c.uuid).join(), mesh.instanceCount);}
    const designs = new Map(); for (const m of layer.models.values()) designs.set(m.asset, (designs.get(m.asset) || 0) + 1);
    const batchedCopies = new Set(); for (const {copies} of layer.instanced) for (const c of copies) {let r = c; while (r.parent && r.parent.type !== 'Scene') r = r.parent; batchedCopies.add(r.uuid);}
    const sizes = {}; for (const {mesh} of layer.instanced) sizes[mesh.instanceCount] = (sizes[mesh.instanceCount] || 0) + 1;
    rows.push({id: w.id, buildings: w.buildings, designs: designs.size, maxCopies: Math.max(...designs.values()), batches: layer.instanced.length, batchedCopies: batchedCopies.size, perCopy: w.buildings - batchedCopies.size, batchSizes: sizes});
  } finally {layer.dispose();}
}
console.log(JSON.stringify(rows, null, 1));
