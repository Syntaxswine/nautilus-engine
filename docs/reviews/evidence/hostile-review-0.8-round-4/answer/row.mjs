import path from 'node:path';
import {pathToFileURL} from 'node:url';
const tree = process.argv[2], imp = p => import(pathToFileURL(path.join(tree, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {PrefabLayer} = await imp('apps/editor/prefab-scene.js'), {createPrefabProviders} = await imp('apps/editor/prefab-providers.js');
const {createOriginalBuildingProvider} = await imp('packages/prefab-core/provider-original.js');
for (const spacing of [20, 24, 25, 28, 30]) {
  const providers = createPrefabProviders(T, {original: createOriginalBuildingProvider(T, {loadTexture: async () => new T.Texture()})});
  const layer = new PrefabLayer(new T.Scene(), {}, () => {}, e => {throw e;}, {providers});
  await layer.update({map: {buildingPrefabs: {instances: [0, 1, 2].map(i => ({id: 'c' + i, asset: 'dockside-warehouse', x: 20 + i * spacing, y: 20, turns: i % 4, clearance: 2}))}}}, {level: 0, showAllLevels: true, roofs: true, walls: true});
  const b = layer.instanced[0]?.mesh;
  console.log(spacing, 'batches', layer.instanced.length, b ? 'copies ' + b.instanceCount + ' centers ' + b.spheres.map(s => s.center.toArray().map(v => v.toFixed(1)).join(',')).join(' | ') + ' r ' + b.spheres[0].radius.toFixed(1) : '');
  layer.dispose();
}
