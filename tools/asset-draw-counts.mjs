// Exact draw submissions of the editor's asset layers (building prefabs, wall
// runs, sloped roofs) for every benchmark workload, in the editor's two views:
// all levels, and the level-0 cutaway. One submission is one draw the renderer
// issues: a visible mesh with a material array draws each of its groups, any
// other visible mesh draws once, whatever its instance count, and a transparent
// double-sided material draws twice in the main pass (back faces, then front).
// Shadow casters are counted again for the shadow pass, per shadow map; triangles
// are counted per draw, as renderer.info counts them. Culling is ignored: these
// are the counts with the whole map in view, which the benchmark's overview and
// cutaway frames reproduce (frame minus the blank map). The counts are
// deterministic, so tests/asset-draw-counts.test.mjs pins them exactly; a
// batching change that adds one run fails it.
//   node tools/asset-draw-counts.mjs           compare with the pinned fixture
//   node tools/asset-draw-counts.mjs --write   re-pin after a reviewed change
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {InspectionScene as LegacyScene} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-scene.js';
import {InspectionScene as WallScene} from '../apps/editor/wall-scene.js';
import {PrefabLayer} from '../apps/editor/prefab-scene.js';
import {RoofLayer} from '../apps/editor/roof-scene.js';
import {createPrefabProviders} from '../apps/editor/prefab-providers.js';
import {createOriginalBuildingProvider} from '../packages/prefab-core/provider-original.js';
import {buildWorkloads} from './bench/workloads.mjs';

export const ASSET_DRAW_COUNTS = new URL('../tests/fixtures/asset-draw-counts.json', import.meta.url);
// The editor's default options, and its cutaway as the benchmark sets it.
export const VIEWS = {exterior: {level: 0, showAllLevels: true, roofs: true, walls: true}, cutaway: {level: 0, showAllLevels: false, roofs: true, walls: true}};
const grossCatalogue = JSON.parse(fs.readFileSync(new URL('../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/assets/art/gross-housing-v1/houses.json', import.meta.url)));
// On every update the editor's daylight rig sets each lit mesh to cast and receive
// shadows unless userData.noShadow, whatever its layer set. Count casters by that rule,
// and refuse to count if the pinned rig no longer states it.
const daylight = fs.readFileSync(new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/daylight-rig.js', import.meta.url), 'utf8');
for (const rule of ['materials.some(m=>m?.isMeshStandardMaterial||m?.isMeshPhongMaterial||m?.isMeshLambertMaterial)', 'object.castShadow=!object.userData.noShadow;'])
  if (!daylight.includes(rule)) throw Error('The daylight rig no longer states its shadow rule; update tools/asset-draw-counts.mjs: ' + rule);
const casts = mesh => !mesh.userData.noShadow && [].concat(mesh.material).some(m => m?.isMeshStandardMaterial || m?.isMeshPhongMaterial || m?.isMeshLambertMaterial);

const passes = material => material.transparent && material.side === T.DoubleSide && !material.forceSinglePass ? 2 : 1;

function submissions(objects) {
  const out = {main: 0, shadow: 0, mainTriangles: 0, shadowTriangles: 0};
  for (const object of objects) object.traverseVisible(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, copies = mesh.isInstancedMesh ? mesh.count : 1, whole = geometry.index ? geometry.index.count : geometry.attributes.position.count;
    const draws = Array.isArray(mesh.material) ? geometry.groups.filter(group => mesh.material[group.materialIndex]?.visible).map(group => [group.count, mesh.material[group.materialIndex]])
      : mesh.material.visible ? [[whole, mesh.material]] : [];
    for (const [count, material] of draws) {
      const triangles = count / 3 * copies;
      out.main += passes(material); out.mainTriangles += triangles * passes(material);
      if (casts(mesh)) {out.shadow++; out.shadowTriangles += triangles;}
    }
  });
  return out;
}

// The asset layers as the editor builds them, headless: placed prefabs (copies and
// their instances), the wall group and the roof layer (models and their merge).
async function countWorkload(map) {
  const scene = new T.Scene(), document = {map};
  const providers = createPrefabProviders(T, {original: createOriginalBuildingProvider(T, {loadTexture: async () => new T.Texture()})});
  providers.set('gross', {...providers.get('gross'), load: async () => ({catalogue: grossCatalogue, textures: {}, dispose() {}})});
  const prefabs = new PrefabLayer(scene, {}, () => {}, error => {throw error;}, {providers}), roofs = new RoofLayer(scene, {atlas: new T.Texture()});
  const walls = {wallGroup: new T.Group(), wallMaterials: new Map(), dimMaterials: new Map(), document, changed() {}};
  const visibleLevel = Object.getOwnPropertyDescriptor(LegacyScene.prototype, 'visibleLevel').get;
  Object.defineProperty(walls, 'visibleLevel', {get: () => visibleLevel.call(walls)});
  walls.wallMaterial = (...args) => WallScene.prototype.wallMaterial.call(walls, ...args); walls.dim = (...args) => LegacyScene.prototype.dim.call(walls, ...args);
  scene.add(walls.wallGroup);
  const counts = {};
  try {
    for (const [view, options] of Object.entries(VIEWS)) {
      walls.options = {...options}; WallScene.prototype.rebuildWalls.call(walls);
      await prefabs.update(document, options); roofs.update(document, options);
      counts[view] = {
        prefabs: submissions([...[...prefabs.models.values()].map(model => model.root), ...prefabs.instanced.map(({mesh}) => mesh)]),
        walls: submissions([walls.wallGroup]),
        roofs: submissions([...[...roofs.models.values()].map(model => model.root), ...(roofs.merged ? [roofs.merged.mesh] : [])])
      };
    }
  } finally {
    prefabs.dispose(); roofs.dispose();
    for (const mesh of walls.wallGroup.children) {mesh.geometry.dispose(); mesh.dispose();}
    for (const material of walls.wallMaterials.values()) {material.map.dispose(); material.dispose();}
    walls.wallShadows?.depth.dispose(); walls.wallShadows?.distance.dispose();
  }
  return counts;
}

export async function assetDrawCounts() {
  const workloads = {};
  for (const workload of await buildWorkloads()) workloads[workload.id] = await countWorkload(JSON.parse(workload.json));
  return {note: 'Exact draw submissions of the editor asset layers per benchmark workload; see tools/asset-draw-counts.mjs.', views: VIEWS, workloads};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const counts = await assetDrawCounts();
  if (process.argv.includes('--write')) {fs.writeFileSync(ASSET_DRAW_COUNTS, JSON.stringify(counts, null, 1) + '\n'); console.log('Pinned asset draw counts for ' + Object.keys(counts.workloads).length + ' workloads.');}
  else {
    const pinned = JSON.parse(fs.readFileSync(ASSET_DRAW_COUNTS, 'utf8'));
    const changed = Object.keys({...pinned.workloads, ...counts.workloads}).filter(id => JSON.stringify(pinned.workloads[id]) !== JSON.stringify(counts.workloads[id]));
    for (const id of changed) console.log(id + '\n  pinned ' + JSON.stringify(pinned.workloads[id]) + '\n  now    ' + JSON.stringify(counts.workloads[id]));
    if (changed.length) process.exit(1);
    console.log('Asset draw counts match the pinned fixture.');
  }
}
