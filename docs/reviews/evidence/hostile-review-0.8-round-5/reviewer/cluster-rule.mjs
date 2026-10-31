// Round 5: how the cluster rule (apps/editor/prefab-scene.js neighbourhoods + extent + BATCHED)
// responds to the structures people build: rows at a pitch just under and just over the spheres'
// reach, turned copies in a row, a grid whose lanes leave room for lamps, and one copy moved by a
// metre. Each case is placed through placeBuilding (the editor's own rule, 1 m clearance) and
// built by the editor's prefab layer headless (the count tool's providers); reported: the
// clusters, how many copies batch, and each CopyBatch's union sphere (what every camera tests).
//   node cluster-rule.mjs [out.json]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const S = path.resolve(import.meta.dirname, '../..'), imp = p => import(pathToFileURL(path.join(S, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {PrefabLayer, extent, neighbourhoods, BATCHED} = await imp('apps/editor/prefab-scene.js');
const {prepare, editorScene, release} = await imp('tools/asset-draw-counts.mjs');
const core = await imp('packages/map-core/index.js'), prefab = await imp('packages/prefab-core/index.js');
const asset = 'grossdale-hip', t = prefab.buildingTransform({asset, turns: 0, x: 0, y: 0});
function place(cells) {let map = core.blankMap('probe'); for (const [x, y, turns = 0] of cells) map = prefab.placeBuilding(map, {asset, x, y, turns, clearance: 1}).map; return map;}
const row = (n, pitch, y = 40, turns = () => 0) => Array.from({length: n}, (_, k) => [20 + k * pitch, y, turns(k)]);
const cases = [];
const add = (label, cells) => {try {cases.push({label, map: place(cells)});} catch (e) {cases.push({label, error: e.message});}};
// The hip is 9 x 15 m; its extent sphere's radius is about 10 m, so copies link up to about 20 m apart.
for (const pitch of [12, 18, 20, 21, 22]) add(`row of 8 along x, ${pitch} m apart (turns 0)`, row(8, pitch));
add('row of 8 along x, 18 m apart, every other copy turned half', row(8, 18, 40, k => k % 2 ? 2 : 0));
add('row of 8 along x, 20 m apart, every other copy turned half', row(8, 20, 40, k => k % 2 ? 2 : 0));
add('row of 8 along x, 20 m apart, every other copy turned a quarter', row(8, 20, 40, k => k % 2 ? 1 : 0));
add('grid 8 x 4, lots 12 x 19 m (lanes too narrow for a lamp)', [0, 1, 2, 3].flatMap(r => row(8, 12, 40 + r * 19)));
add('grid 8 x 4, lots 12 x 21 m (a lane wide enough for a lamp tile)', [0, 1, 2, 3].flatMap(r => row(8, 12, 40 + r * 21)));
add('row of 8, 20 m apart, the last copy moved 1 m further', [...row(7, 20), [20 + 7 * 20 + 1, 40]]);
add('row of 8, 20 m apart, the middle copy moved 1 m', [...row(8, 20).map(([x, y], k) => k === 4 ? [x + 1, y] : [x, y])]);
const out = [];
for (const c of cases) {
  if (c.error) {out.push({label: c.label, error: c.error}); console.log(c.label + ': not placeable: ' + c.error); continue;}
  const s = editorScene(); prepare(s);
  const layer = new PrefabLayer(new T.Scene(), {}, () => {}, e => {throw e;}, {providers: s.prefabs.providers});
  try {
    await layer.update({map: c.map}, {level: 0, showAllLevels: true, roofs: true, walls: true});
    const models = [...layer.models.values()], template = layer.templates.get(asset); template.model.root.updateMatrixWorld(true); for (const m of models) m.root.updateMatrixWorld(true);
    const sphere = extent(template), spheres = models.map(m => sphere.clone().applyMatrix4(m.root.matrixWorld)), clusters = neighbourhoods(spheres).map(k => k.length).sort((a, b) => b - a);
    const gaps = []; for (let i = 0; i < spheres.length; i++) for (let j = i + 1; j < spheres.length; j++) gaps.push(spheres[i].center.distanceTo(spheres[j].center) - spheres[i].radius - spheres[j].radius);
    const batched = layer.instanced.length ? Math.max(...layer.instanced.map(e => e.mesh.instanceCount)) : 0;
    const row = {label: c.label, copies: models.length, clusters, batchedCopies: layer.instanced.length ? clusters.filter(n => n >= BATCHED).reduce((a, b) => a + b, 0) : 0, copyBatches: layer.instanced.length, unionRadius: layer.instanced.length ? +Math.max(...layer.instanced.map(e => e.mesh.boundingSphere.radius)).toFixed(1) : null, nearestGap: +Math.min(...gaps).toFixed(2), sphereRadius: +sphere.radius.toFixed(2), largestBatch: batched};
    out.push(row); console.log(`${c.label}: clusters [${clusters.join(',')}], ${row.batchedCopies} of ${row.copies} batched${row.unionRadius ? ', union sphere ' + row.unionRadius + ' m' : ''} (nearest pair ${row.nearestGap >= 0 ? row.nearestGap + ' m apart' : 'overlapping by ' + (-row.nearestGap) + ' m'})`);
  } finally {layer.dispose(); release(s);}
}
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify({asset, footprint: [t.width, t.depth], BATCHED, cases: out}, null, 1));
