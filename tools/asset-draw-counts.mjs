// Exact draw submissions of the editor's asset layers (building prefabs, wall
// runs, sloped roofs) for every benchmark workload, in three of the editor's views:
// all levels, the level-0 cutaway, and the level-1 cutaway (a higher floor's runs). The layers are the editor's own: its scene
// classes (roofs -> prefabs -> walls) are constructed on a headless stand-in for
// the inherited AFT scene, so the counts follow how the editor builds each layer.
// One submission is one draw the renderer issues: a visible mesh with a material
// array draws each of its groups, any other visible mesh draws once, whatever its
// instance or copy count. Shadow casters are counted again, once, for the sun's
// shadow map; triangles are counted per draw, as renderer.info counts them. Culling
// is ignored: these are the counts with the whole map in view, which the benchmark
// reproduces with culling off (--expect). Lamps add shadow maps and light passes;
// the benchmark pins those counts, culled, in the browser. The counts are
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
import {InspectionScene as EditorScene} from '../apps/editor/roof-scene.js';
import {createPrefabProviders} from '../apps/editor/prefab-providers.js';
import {createOriginalBuildingProvider} from '../packages/prefab-core/provider-original.js';
import {buildWorkloads} from './bench/workloads.mjs';

export const ASSET_DRAW_COUNTS = new URL('../tests/fixtures/asset-draw-counts.json', import.meta.url);
// The editor's default options, its cutaway as the benchmark sets it, and the cutaway one
// floor up (the benchmark checks the first two in the browser).
export const VIEWS = {exterior: {level: 0, showAllLevels: true, roofs: true, walls: true}, cutaway: {level: 0, showAllLevels: false, roofs: true, walls: true}, upper: {level: 1, showAllLevels: false, roofs: true, walls: true}};
const grossCatalogue = JSON.parse(fs.readFileSync(new URL('../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/assets/art/gross-housing-v1/houses.json', import.meta.url)));
// On every update the editor's daylight rig sets each lit mesh to cast and receive
// shadows unless userData.noShadow, whatever its layer set. Count casters by that rule,
// and refuse to count if the pinned rig no longer states it.
export function checkDaylightRule(source) {
  for (const rule of ['materials.some(m=>m?.isMeshStandardMaterial||m?.isMeshPhongMaterial||m?.isMeshLambertMaterial)', 'object.castShadow=!object.userData.noShadow;'])
    if (!source.includes(rule)) throw Error('The daylight rig no longer states its shadow rule; update tools/asset-draw-counts.mjs: ' + rule);
}
checkDaylightRule(fs.readFileSync(new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/daylight-rig.js', import.meta.url), 'utf8'));
const casts = mesh => !mesh.userData.noShadow && [].concat(mesh.material).some(m => m?.isMeshStandardMaterial || m?.isMeshPhongMaterial || m?.isMeshLambertMaterial);

// A transparent double-sided material draws twice (back faces, then front); since the
// glass halves (bd27cb5) the asset layers hold none, so the model refuses one.
const single = material => {if (material.transparent && material.side === T.DoubleSide && !material.forceSinglePass) throw Error('A transparent double-sided asset material draws twice; extend tools/asset-draw-counts.mjs: ' + material.name); return material;};

export function submissions(objects) {
  const out = {main: 0, shadow: 0, mainTriangles: 0, shadowTriangles: 0};
  for (const object of objects) object.traverseVisible(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, copies = mesh.isInstancedMesh ? mesh.count : mesh.isBatchedMesh ? mesh.instanceCount : 1, whole = geometry.index ? geometry.index.count : geometry.attributes.position.count;
    const draws = Array.isArray(mesh.material) ? geometry.groups.filter(group => mesh.material[group.materialIndex]?.visible).map(group => [group.count, mesh.material[group.materialIndex]])
      : mesh.material.visible ? [[whole, mesh.material]] : [];
    for (const [count, material] of draws) {
      const triangles = count / 3 * copies; single(material);
      out.main++; out.mainTriangles += triangles;
      if (casts(mesh)) {out.shadow++; out.shadowTriangles += triangles;}
    }
  });
  return out;
}

// The inherited AFT scene's place in the editor's chain, headless: the fields that the
// asset layers' constructors and the wall rebuild read. While the editor's scene is
// constructed, the wall scene (the chain's base) extends this instead; afterwards the
// instance keeps the AFT scene's own helpers (dim, visibleLevel).
class HeadlessAft {
  constructor(canvas, changed = () => {}) {Object.assign(this, {changed, scene: new T.Scene(), renderer: {capabilities: {getMaxAnisotropy: () => 1}}, diagnostics: [], dimMaterials: new Map(), options: {...VIEWS.exterior}});}
}
export function editorScene() {
  const base = [Object.getPrototypeOf(WallScene), Object.getPrototypeOf(WallScene.prototype)];
  if (base[0] !== LegacyScene) throw Error('The wall scene no longer extends the AFT scene; update tools/asset-draw-counts.mjs.');
  Object.setPrototypeOf(WallScene, HeadlessAft); Object.setPrototypeOf(WallScene.prototype, HeadlessAft.prototype);
  try {return new EditorScene(null, () => {});} finally {Object.setPrototypeOf(WallScene, base[0]); Object.setPrototypeOf(WallScene.prototype, base[1]);}
}

// The asset layers as the editor builds them: placed prefabs (copies and their batches),
// the wall group and the roof layer (models and their merge). Only texture loading is
// replaced (the building providers and the roof atlas the editor fetches).
async function countWorkload(map) {
  const s = editorScene(), document = {map};
  const providers = createPrefabProviders(T, {original: createOriginalBuildingProvider(T, {loadTexture: async () => new T.Texture()})});
  providers.set('gross', {...providers.get('gross'), load: async () => ({catalogue: grossCatalogue, textures: {}, dispose() {}})});
  s.prefabs.providers = providers; s.slopedRoofs.setAtlas(new T.Texture()); s.document = document;
  const counts = {};
  try {
    for (const [view, options] of Object.entries(VIEWS)) {
      s.options = {...options}; s.rebuildWalls();
      await s.prefabs.update(document, s.options); s.slopedRoofs.update(document, s.options);
      counts[view] = {
        prefabs: submissions([...[...s.prefabs.models.values()].map(model => model.root), ...s.prefabs.instanced.map(({mesh}) => mesh)]),
        walls: submissions([s.wallGroup]),
        roofs: submissions([...[...s.slopedRoofs.models.values()].map(model => model.root), ...(s.slopedRoofs.merged ? [s.slopedRoofs.merged.mesh] : [])])
      };
    }
  } finally {
    s.prefabs.dispose(); s.slopedRoofs.dispose(); s.roofPreview.dispose();
    for (const mesh of s.wallGroup.children) {mesh.geometry.dispose(); mesh.dispose();}
    for (const material of s.wallMaterials.values()) {material.map.dispose(); material.dispose();}
    s.wallShadows?.depth.dispose(); s.wallShadows?.distance.dispose(); s.anchorGeometry.dispose(); s.anchorMaterial.dispose();
  }
  return counts;
}

export async function assetDrawCounts() {
  const workloads = {};
  // Lamp-lit maps add light passes and shadow maps; the benchmark pins their draws, culled, in the browser.
  for (const workload of await buildWorkloads()) if (!workload.lamps) workloads[workload.id] = await countWorkload(JSON.parse(workload.json));
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
