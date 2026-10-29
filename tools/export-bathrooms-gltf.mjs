import {BATHROOM_MATERIALS} from '../packages/bathrooms/geometry.js';
export function exportBathroomGltf(model) {
  const chunks = [], bufferViews = [], accessors = [], nodes = [], meshes = [], materials = [], materialIds = new Map(), hinges = [];
  let bytes = 0;
  function accessor(array, type, count, componentType = 5126, bounds = false) {
    const raw = Buffer.from(array.buffer, array.byteOffset, array.byteLength), view = bufferViews.length;
    bufferViews.push({buffer: 0, byteOffset: bytes, byteLength: raw.length}); chunks.push(raw); bytes += raw.length;
    const a = {bufferView: view, componentType, type, count};
    if (bounds) { a.min = [Infinity, Infinity, Infinity]; a.max = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < array.length; i++) { a.min[i % 3] = Math.min(a.min[i % 3], array[i]); a.max[i % 3] = Math.max(a.max[i % 3], array[i]); } }
    accessors.push(a); return accessors.length - 1;
  }
  for (const [id, m] of model.materials) {
    materialIds.set(m.uuid, materials.length); materials.push({name: id, pbrMetallicRoughness: {baseColorFactor: [...m.color.toArray(), 1], roughnessFactor: m.roughness,
      metallicFactor: m.metalness, ...(BATHROOM_MATERIALS[id].tile === null ? {} : {baseColorTexture: {index: 0}})}});
  }
  function node(object) {
    object.updateMatrix(); const index = nodes.length, n = {name: object.name, matrix: object.matrix.toArray(), extras: object.userData}; nodes.push(n);
    if (Array.isArray(object.userData.axis)) {
      delete n.matrix; n.translation = object.position.toArray(); n.rotation = object.quaternion.toArray(); n.scale = [1, 1, 1]; hinges.push({index, object});
    }
    if (object.isMesh) {
      const g = object.geometry, p = g.attributes.position, normal = g.attributes.normal, uv = g.attributes.uv;
      const unique = new Map(), positions = [], normals = [], uvs = [], indices = [];
      for (let i = 0; i < p.count; i++) {
        const values = [p.getX(i), p.getY(i), p.getZ(i), normal.getX(i), normal.getY(i), normal.getZ(i), uv.getX(i), uv.getY(i)], key = values.join(',');
        let j = unique.get(key); if (j === undefined) { j = positions.length / 3; unique.set(key, j); positions.push(...values.slice(0, 3)); normals.push(...values.slice(3, 6)); uvs.push(values[6], 1 - values[7]); } indices.push(j);
      }
      n.mesh = meshes.length; meshes.push({name: object.name, primitives: [{attributes: {
        POSITION: accessor(new Float32Array(positions), 'VEC3', positions.length / 3, 5126, true), NORMAL: accessor(new Float32Array(normals), 'VEC3', normals.length / 3),
        TEXCOORD_0: accessor(new Float32Array(uvs), 'VEC2', uvs.length / 2)}, indices: accessor(new Uint32Array(indices), 'SCALAR', indices.length, 5125), material: materialIds.get(object.material.uuid), mode: 4}]});
    }
    if (object.children.length) n.children = object.children.map(node); return index;
  }
  const root = node(model.root), animations = [];
  for (const {index, object} of hinges) {
    const base = object.quaternion.clone(), axis = object.userData.axis, angle = object.userData.swingSign * Math.PI / 2;
    const rotation = base.clone();
    // Quaternion product base * local-axis rotation; works for X lids and Y doors in rotated layouts.
    const [x, y, z] = axis.map(v => v * Math.sin(angle / 2)), w = Math.cos(angle / 2), [a, b, c, d] = base.toArray();
    rotation.set(d*x+a*w+b*z-c*y, d*y-a*z+b*w+c*x, d*z+a*y-b*x+c*w, d*w-a*x-b*y-c*z);
    const time = accessor(new Float32Array([0, 1]), 'SCALAR', 2); accessors[time].min = [0]; accessors[time].max = [1];
    const output = accessor(new Float32Array([...base.toArray(), ...rotation.toArray()]), 'VEC4', 2);
    animations.push({name: object.name + ':open', samplers: [{input: time, output, interpolation: 'LINEAR'}], channels: [{sampler: 0, target: {node: index, path: 'rotation'}}],
      extras: {hingeId: object.name, kind: object.userData.kind, durationSeconds: 1, meaning: 'Closed to open; reverse time to close. Each hinge has a separate clip.'}});
  }
  const json = {asset: {version: '2.0', generator: 'Nautilus original bathrooms v1; 1 × 2 tile stalls'}, scene: 0, scenes: [{nodes: [root]}], nodes, meshes, materials,
    buffers: [{uri: model.asset.id + '.bin', byteLength: bytes}], bufferViews, accessors,
    images: [{uri: '../painted-bathroom-materials-v1.png'}], textures: [{source: 0, sampler: 0}], samplers: [{magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071}],
    extras: {collection: model.asset.collection, assetId: model.asset.id, contract: model.asset.contract, consumerIntegrated: false, motionBounds: model.motionBounds}};
  if (animations.length) json.animations = animations;
  return {json, bin: Buffer.concat(chunks)};
}
