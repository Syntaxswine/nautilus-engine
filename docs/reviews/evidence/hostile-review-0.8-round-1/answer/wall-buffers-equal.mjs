// Do two trees' rebuildWalls produce byte-identical instance buffers, widths and
// unit geometry for a map? (Rendering inputs equal => frames equal.)
//   node wall-buffers-equal.mjs <tree a> <tree b> <map.json>...
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const [a, b, ...maps] = process.argv.slice(2), sha = array => createHash('sha256').update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest('hex').slice(0, 16);
async function build(dir, map) {
  const T = await import(pathToFileURL(path.join(dir, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
  const {InspectionScene} = await import(pathToFileURL(path.join(dir, 'apps/editor/wall-scene.js')).href), methods = InspectionScene.prototype;
  const scene = {wallGroup: new T.Group(), wallMaterials: new Map(), visibleLevel: 5, options: {walls: true, level: 0, showAllLevels: true}, dim: m => m, changed() {}, document: {map}};
  scene.wallMaterial = (...args) => methods.wallMaterial.call(scene, ...args); methods.rebuildWalls.call(scene);
  return scene.wallGroup.children.filter(m => m.isInstancedMesh).map(m => ({material: [...scene.wallMaterials].find(([, v]) => v === m.material)?.[0], count: m.count,
    matrices: sha(m.instanceMatrix.array), widths: sha(m.geometry.attributes.wallWidth.array), position: sha(m.geometry.attributes.position.array), uv: sha(m.geometry.attributes.uv.array), normal: sha(m.geometry.attributes.normal.array), scaleU: sha(m.geometry.attributes.wallScaleU.array),
    sphere: m.boundingSphere.radius.toFixed(4)}));
}
for (const file of maps) {
  const map = JSON.parse(fs.readFileSync(file, 'utf8')), A = await build(a, map), B = await build(b, map);
  const same = JSON.stringify(A.map(({sphere, ...x}) => x)) === JSON.stringify(B.map(({sphere, ...x}) => x));
  console.log(path.basename(file), same ? 'IDENTICAL instance buffers, widths and unit geometry' : 'DIFFERENT', JSON.stringify({a: A.map(x => [x.material, x.count, x.matrices, x.sphere]), b: B.map(x => [x.material, x.count, x.matrices, x.sphere])}));
}
