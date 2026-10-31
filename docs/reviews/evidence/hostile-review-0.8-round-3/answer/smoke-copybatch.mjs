// Smoke: CopyBatch culls copies per camera (view and point-light faces) and draws group runs.
import * as T from '<author>/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {createPrefabProviders} from '<author>/apps/editor/prefab-providers.js';
import {PrefabLayer} from '<author>/apps/editor/prefab-scene.js';
import {createOriginalBuildingProvider} from '<author>/packages/prefab-core/provider-original.js';

const providers = createPrefabProviders(T, {original: createOriginalBuildingProvider(T, {loadTexture: async () => new T.Texture()})});
const scene = new T.Scene(), layer = new PrefabLayer(scene, {}, () => {}, e => {throw e;}, {providers});
const instances = [0, 1, 2].map(i => ({id: 'copy-' + i, asset: 'dockside-warehouse', x: 20 + i * 40, y: 20, turns: i % 4, clearance: 2}));
await layer.update({map: {buildingPrefabs: {instances}}}, {level: 0, showAllLevels: true, roofs: true, walls: true});
console.log('batches', layer.instanced.length, 'instances', layer.instanced.map(({mesh}) => mesh.instanceCount).join(','));
const {mesh} = layer.instanced.find(({mesh}) => mesh.visible);
console.log('groups', JSON.stringify(mesh.geometry.groups), 'sphere', mesh.boundingSphere.center.toArray().map(v => v.toFixed(1)), mesh.boundingSphere.radius.toFixed(1));
console.log('copy spheres', mesh.spheres.map(s => s.center.toArray().map(v => v.toFixed(1)).join('/') + ' r' + s.radius.toFixed(1)).join('  '));
// A camera looking down at copy 0 only.
const cam = new T.PerspectiveCamera(30, 1, 0.1, 500); const c0 = mesh.spheres[0].center;
cam.position.set(c0.x, 60, c0.z + 0.01); cam.lookAt(c0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
const group = mesh.geometry.groups[0];
mesh.onBeforeRender(null, scene, cam, mesh.geometry, mesh.material[0], group);
console.log('close view: draws', mesh._multiDrawCount, 'copies', [...mesh._indirectTexture.image.data.slice(0, mesh._multiDrawCount)], 'start', mesh._multiDrawStarts[0], 'count', mesh._multiDrawCounts[0], 'group', group.start, group.count);
// A wide camera: every copy, nearest first.
const far = new T.PerspectiveCamera(60, 1, 0.1, 2000); far.position.set(200, 80, 20); far.lookAt(60, 0, 25); far.updateMatrixWorld(); far.updateProjectionMatrix();
mesh.onBeforeRender(null, scene, far, mesh.geometry, mesh.material[0], group);
console.log('wide view: draws', mesh._multiDrawCount, 'order', [...mesh._indirectTexture.image.data.slice(0, mesh._multiDrawCount)]);
// A point light beside copy 2: each face sees only copies within its 30 m.
const lamp = new T.PointLight(0xffffff, 1, 30, 0); lamp.castShadow = true; lamp.shadow.camera.far = 30; lamp.shadow.camera.near = .08; lamp.shadow.camera.updateProjectionMatrix(); const c2 = mesh.spheres[2].center;
lamp.position.set(c2.x + 25, 2, c2.z); lamp.updateMatrixWorld();
const faces = [];
for (let vp = 0; vp < 6; vp++) {lamp.shadow.updateMatrices(lamp, vp); mesh.onBeforeShadow(null, mesh, cam, lamp.shadow.camera, mesh.geometry, null, group); faces.push([...mesh._indirectTexture.image.data.slice(0, mesh._multiDrawCount)].join('+') || '-');}
console.log('lamp faces', faces.join(' | '));
layer.dispose();
console.log('disposed; template geometry still has attributes:', !!mesh.geometry);
