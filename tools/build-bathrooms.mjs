import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {BATHROOM_MODULES, BATHROOM_LAYOUTS, BATHROOM_CONTRACT, bathroomPlan} from '../packages/bathrooms/index.js';
import {buildBathroomMesh} from '../packages/bathrooms/mesh.js';
import {createBathroomModel} from '../packages/bathrooms/three.js';
import {exportBathroomGltf} from './export-bathrooms-gltf.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), asset = path.join(root, 'assets/bathrooms'), art = path.join(root, 'art/bathrooms');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function write(file, data) {
  if (![asset, art].some(base => file.startsWith(base + path.sep))) throw Error('Bathroom export escaped owned folders.');
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) fs.writeFileSync(file, bytes);
  return {file: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes)};
}
for (const folder of [path.join(asset, 'models'), path.join(art, 'sculpts')]) fs.mkdirSync(folder, {recursive: true});
const records = [], modules = [];
for (const recipe of [...BATHROOM_MODULES, ...BATHROOM_LAYOUTS]) {
  const source = buildBathroomMesh(recipe.id, {lod: 'source'}), game = buildBathroomMesh(recipe.id);
  const model = createBathroomModel(T, recipe.id, {uvMode: 'atlas'}), gltf = exportBathroomGltf(model), id = recipe.id;
  const files = [
    write(path.join(art, 'sculpts', id + '.source-mesh.json.gz'), gzipSync(Buffer.from(JSON.stringify(source)), {level: 9})),
    write(path.join(asset, 'models', id + '.game-mesh.json.gz'), gzipSync(Buffer.from(JSON.stringify(game)), {level: 9})),
    write(path.join(asset, 'models', id + '.blueprint.json'), JSON.stringify(game.asset)),
    write(path.join(asset, 'models', id + '.gltf'), JSON.stringify(gltf.json)),
    write(path.join(asset, 'models', id + '.bin'), gltf.bin),
    write(path.join(asset, 'models', id + '-plan.svg'), bathroomPlan(game.asset))
  ];
  records.push({id, name: recipe.name, category: recipe.category, source: source.metrics, game: game.metrics,
    interchange: model.data.metrics, reduction: 1 - game.metrics.triangles / source.metrics.triangles,
    nominalFootprint: [recipe.width, recipe.depth], stallCells: game.asset.stallCells, bounds: game.bounds, motionBounds: game.motionBounds,
    hinges: game.hinges.map(({batches, ...descriptor}) => descriptor), files,
    animations: gltf.json.animations?.map(a => ({name: a.name, kind: a.extras.kind})) || []});
  modules.push({id, name: recipe.name, category: recipe.category, nominalFootprint: [recipe.width, recipe.depth],
    stallCells: game.asset.stallCells, scale: [1, 1, 1], bounds: game.bounds, reservedMotionBounds: game.motionBounds,
    posePolicy: 'Every door and toilet lid has an independent named 0–90 degree hinge. Reserve outward door swings in the aisle.',
    consumerSupport: game.asset.consumerSupport});
  model.dispose(); console.log(id, JSON.stringify({source: source.metrics.triangles, game: game.metrics.triangles, glTF: model.data.metrics.triangles}));
}
const dimensions = write(path.join(art, 'dimensions.json'), JSON.stringify({version: 1, artistFoundation: '65c06735396e14b8774ae1e7d5ad61969692963f', contract: BATHROOM_CONTRACT,
  sourceMeasurements: false, tileEvidence: 'packages/map-core/index.js MAP_CONTRACT.metresPerTile = 1',
  userConstraint: 'Each bathroom stall is exactly 1 × 2 tiles; same for left and right handed variants.', modules}, null, 2));
const inputFiles = ['packages/bathrooms/designs.js', 'packages/bathrooms/index.js', 'packages/bathrooms/geometry.js', 'packages/bathrooms/mesh.js', 'packages/bathrooms/three.js',
  'packages/fort-variants/geometry.js', 'tools/build-bathrooms.mjs', 'tools/export-bathrooms-gltf.mjs', 'art/bathrooms/material-prompt.json', 'art/bathrooms/NOTICE.md'];
write(path.join(asset, 'catalogue.json'), JSON.stringify({version: 1, collection: 'nautilus-bathrooms-v1', artistFoundation: '65c06735396e14b8774ae1e7d5ad61969692963f',
  status: 'Original artist kit, ready for review; shared editor/provider intake remains explicit.', contract: BATHROOM_CONTRACT,
  inputs: inputFiles.map(file => ({file, sha256: sha(fs.readFileSync(path.join(root, file)))})), dimensions,
  skin: {file: 'assets/bathrooms/painted-bathroom-materials-v1.png', sha256: sha(fs.readFileSync(path.join(asset, 'painted-bathroom-materials-v1.png')))}, assets: records}, null, 2));
