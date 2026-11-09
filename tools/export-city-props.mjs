import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import * as THREE from '../packages/render-effects/three.js';
import {CITY_PROPS, CITY_PROP_ATLAS, CITY_TRIM_ATLAS, CITY_PROP_CONTRACT} from '../packages/city-props/index.js';
import {sculptCityProp} from '../packages/city-props/three.js';
import {paintCityTrim, TRIM_WIDTH, TRIM_HEIGHT} from '../packages/city-props/trim-paint.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const assetRoot = path.join(root, 'assets/city-props');
const models = path.join(assetRoot, 'models');
const hash = data => createHash('sha256').update(data).digest('hex');
const atlas = fs.readFileSync(path.join(root, CITY_PROP_ATLAS));
const pngSize = [atlas.readUInt32BE(16), atlas.readUInt32BE(20)];
const check = process.argv.includes('--check');

const finishes = {
  paint: {pbrMetallicRoughness: {baseColorTexture: {index: 0}, metallicFactor: 0, roughnessFactor: .75}},
  trim: {pbrMetallicRoughness: {baseColorTexture: {index: 1}, metallicFactor: 0, roughnessFactor: .77}},
  'store-glass': {pbrMetallicRoughness: {baseColorFactor: [.33, .48, .46, .23], metallicFactor: 0, roughnessFactor: .25},
    alphaMode: 'BLEND', doubleSided: true},
  glass: {pbrMetallicRoughness: {baseColorFactor: [.47, .58, .50, .27], metallicFactor: 0, roughnessFactor: .25},
    alphaMode: 'BLEND', doubleSided: true},
  amber: {pbrMetallicRoughness: {baseColorFactor: [.88, .55, .18, .28], metallicFactor: 0, roughnessFactor: .25},
    alphaMode: 'BLEND', doubleSided: true},
  mirror: {pbrMetallicRoughness: {baseColorFactor: [.26, .33, .34, 1], metallicFactor: .38, roughnessFactor: .26}},
  flame: {pbrMetallicRoughness: {baseColorFactor: [1, .52, .09, 1], metallicFactor: 0, roughnessFactor: .60},
    emissiveFactor: [1, .52, .09], extensions: {KHR_materials_unlit: {}}}
};

const text = data => Buffer.from(JSON.stringify(data) + '\n');
function publish(file, bytes) {
  if (check) {
    if (!fs.readFileSync(file).equals(bytes)) throw new Error('City prop export is stale: ' + path.relative(root, file));
  } else fs.writeFileSync(file, bytes);
}
function triangleCount(parts) {
  return [...parts.values()].reduce((sum, geometry) => sum + geometry.index.count / 3, 0);
}
function encode(prop) {
  const geometry = sculptCityProp(THREE, prop.id);
  const source = sculptCityProp(THREE, prop.id, 'sculpt');
  const triangles = triangleCount(geometry), sculptTriangles = triangleCount(source);
  for (const part of source.values()) part.dispose();
  if (triangles > sculptTriangles || (triangles === sculptTriangles && prop.family !== 'Storefront & trim')) throw new Error('Missing reduced mesh for ' + prop.id);

  const buffers = [], bufferViews = [], accessors = [], materials = [], primitives = [];
  let byteLength = 0;
  function accessor(typed, type, componentType, count, target, limits = {}) {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const view = bufferViews.length;
    bufferViews.push({buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target});
    buffers.push(bytes);
    const padding = (4 - bytes.length % 4) % 4;
    if (padding) buffers.push(Buffer.alloc(padding));
    byteLength += bytes.length + padding;
    return accessors.push({bufferView: view, componentType, count, type, ...limits}) - 1;
  }
  const bounds = new THREE.Box3();
  for (const [finish, g] of geometry) {
    bounds.union(g.boundingBox);
    const attr = g.attributes;
    const attributes = {
      POSITION: accessor(attr.position.array, 'VEC3', 5126, attr.position.count, 34962,
        {min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray()}),
      NORMAL: accessor(attr.normal.array, 'VEC3', 5126, attr.normal.count, 34962)
    };
    if (finish === 'paint' || finish === 'trim') {
      const uv = new Float32Array(attr.uv.array);
      for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i]; // glTF's image coordinates start at the top.
      attributes.TEXCOORD_0 = accessor(uv, 'VEC2', 5126, attr.uv.count, 34962);
      attributes.COLOR_0 = accessor(attr.color.array, 'VEC3', 5126, attr.color.count, 34962);
    }
    const indices = accessor(g.index.array, 'SCALAR', g.index.array instanceof Uint32Array ? 5125 : 5123, g.index.count, 34963);
    const material = materials.push({name: finish, ...finishes[finish]}) - 1;
    primitives.push({attributes, indices, material});
    g.dispose();
  }
  const bin = Buffer.concat(buffers);
  const images = [{uri: '../painted-city-materials-v1.png'}];
  if (geometry.has('trim')) images.push({uri: '../painted-city-trim-v1.png'});
  const gltf = {
    asset: {version: '2.0', generator: 'Nautilus City Prop Sculpt'},
    ...(prop.lit ? {extensionsUsed: ['KHR_materials_unlit']} : {}),
    scene: 0, scenes: [{nodes: [0]}],
    nodes: [{name: prop.name, mesh: 0, extras: {
      id: prop.id, cells: prop.cells, mounting: prop.mounting, lit: prop.lit, lightAnchor: prop.light
    }}],
    meshes: [{primitives}], materials,
    images, textures: images.map((_, source) => ({source, sampler: 0})),
    samplers: [{magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071}],
    buffers: [{uri: prop.id + '.bin', byteLength}], bufferViews, accessors
  };
  const json = text(gltf);
  publish(path.join(models, prop.id + '.gltf'), json);
  publish(path.join(models, prop.id + '.bin'), bin);
  return {...prop, boundsM: [bounds.min.toArray(), bounds.max.toArray()],
    sculptTriangles, triangles, files: {gltf: {bytes: json.length, sha256: hash(json)}, bin: {bytes: bin.length, sha256: hash(bin)}}};
}

function pngChunk(name, bytes) {
  const type = Buffer.from(name);
  let crc = -1;
  for (const data of [type, bytes]) for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const chunk = Buffer.alloc(bytes.length + 12);
  chunk.writeUInt32BE(bytes.length);
  type.copy(chunk, 4);
  bytes.copy(chunk, 8);
  chunk.writeUInt32BE((crc ^ -1) >>> 0, bytes.length + 8);
  return chunk;
}

function bakeTrimPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(TRIM_WIDTH);
  header.writeUInt32BE(TRIM_HEIGHT, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = paintCityTrim();
  const rowSize = TRIM_WIDTH * 4;
  const scans = Buffer.alloc((rowSize + 1) * TRIM_HEIGHT);
  for (let row = 0; row < TRIM_HEIGHT; row++) {
    scans.set(pixels.subarray(row * rowSize, (row + 1) * rowSize), row * (rowSize + 1) + 1);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scans)), pngChunk('IEND', Buffer.alloc(0))]);
}

if (!check) fs.mkdirSync(models, {recursive: true});
const trim = bakeTrimPng();
publish(path.join(root, CITY_TRIM_ATLAS), trim);
const props = CITY_PROPS.map(encode);
publish(path.join(assetRoot, 'catalogue.json'), Buffer.from(JSON.stringify({
  ...CITY_PROP_CONTRACT, atlas: {path: 'painted-city-materials-v1.png', bytes: atlas.length, sha256: hash(atlas), size: pngSize},
  trimAtlas: {path: 'painted-city-trim-v1.png', bytes: trim.length, sha256: hash(trim), size: [TRIM_WIDTH, TRIM_HEIGHT]}, props
}, null, 2) + '\n'));
const total = props.reduce((sum, p) => sum + p.triangles, 0);
console.log(`${check ? 'Verified' : 'Exported'} ${props.length} city props with ${total.toLocaleString('en-US')} total map triangles.`);
