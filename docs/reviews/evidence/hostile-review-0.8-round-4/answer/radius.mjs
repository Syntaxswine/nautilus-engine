import path from 'node:path';
import {pathToFileURL} from 'node:url';
const tree = process.argv[2], imp = p => import(pathToFileURL(path.join(tree, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {PrefabLayer} = await imp('apps/editor/prefab-scene.js'), {createPrefabProviders} = await imp('apps/editor/prefab-providers.js');
const {createOriginalBuildingProvider} = await imp('packages/prefab-core/provider-original.js');
const providers = createPrefabProviders(T, {original: createOriginalBuildingProvider(T, {loadTexture: async () => new T.Texture()})});
const layer = new PrefabLayer(new T.Scene(), {}, () => {}, e => {throw e;}, {providers});
await layer.update({map: {buildingPrefabs: {instances: [{id: 'a', asset: 'dockside-warehouse', x: 20, y: 20, turns: 0, clearance: 2}]}}}, {level: 0, showAllLevels: true, roofs: true, walls: true});
const t = layer.templates.get('dockside-warehouse'), box = new T.Box3().setFromObject(t.model.root), s = new T.Sphere().makeEmpty();
for (const n of t.nodes) if (n.isMesh) {n.geometry.computeBoundingSphere(); if (!n.geometry.boundingSphere.isEmpty()) s.union(n.geometry.boundingSphere.clone().applyMatrix4(n.matrixWorld));}
console.log('box', box.min.toArray().map(v => v.toFixed(1)), box.max.toArray().map(v => v.toFixed(1)), 'sphere', s.center.toArray().map(v => v.toFixed(1)), s.radius.toFixed(2));
layer.dispose();
