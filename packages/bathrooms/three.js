import {buildBathroomMesh, BATHROOM_MATERIALS} from './mesh.js';
export function createBathroomModel(T, input, {atlas = null, lod = 'game', uvMode = 'metres', grey = false} = {}) {
  if (!T?.Group || !T?.BufferGeometry || !T?.MeshStandardMaterial) throw Error('Supply the host Three instance.');
  if (atlas !== null && !atlas?.isTexture) throw Error('Supply a borrowed texture or null.');
  if (atlas && !grey && uvMode === 'metres' && !T.ShaderChunk.map_fragment.includes('texture2D( map, vMapUv )')) throw Error('Unsupported host atlas shader.');
  const data = input?.schema === 'nautilus-bathroom-mesh' ? structuredClone(input) : buildBathroomMesh(input, {lod, uvMode});
  uvMode = data.uvMode;
  const root = new T.Group(), materials = new Map(), geometries = new Set(), pivots = [];
  root.name = data.asset.id; root.userData = {assetId: data.asset.id, collection: data.asset.collection, metresPerUnit: 1, consumerIntegrated: false};
  for (const [id, spec] of Object.entries(BATHROOM_MATERIALS)) {
    const material = new T.MeshStandardMaterial({name: id, color: grey ? 0xaeb0a6 : new T.Color(...spec.color),
      roughness: spec.roughness, metalness: spec.metalness || 0, map: !grey && spec.tile !== null ? atlas : null});
    if (!grey && atlas && spec.tile !== null && uvMode === 'metres') {
      const col = spec.tile % 3, row = 1 - Math.floor(spec.tile / 3), offset = [(col + .018) / 3, (row + .018) / 2], scale = [.964 / 3, .964 / 2];
      material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', T.ShaderChunk.map_fragment.replace(
        'texture2D( map, vMapUv )', `textureGrad( map, vec2(${offset.join(',')}) + fract(vMapUv) * vec2(${scale.join(',')}), dFdx(vMapUv) * vec2(${scale.join(',')}), dFdy(vMapUv) * vec2(${scale.join(',')}) )`)); };
      material.customProgramCacheKey = () => 'bathroom-atlas-v1:' + spec.tile;
    }
    materials.set(id, material);
  }
  function mesh(batch, parent) {
    const geometry = new T.BufferGeometry();
    for (const [id, values, size] of [['position', batch.positions, 3], ['normal', batch.normals, 3], ['uv', batch.uvs, 2]]) geometry.setAttribute(id, new T.Float32BufferAttribute(values, size));
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometries.add(geometry);
    const object = new T.Mesh(geometry, materials.get(batch.material)); object.name = batch.kind + '-' + batch.material;
    object.userData = {kind: batch.kind, level: batch.level, materialId: batch.material}; object.castShadow = object.receiveShadow = true; parent.add(object);
  }
  for (const batch of data.batches) mesh(batch, root);
  for (const h of data.hinges) {
    const pivot = new T.Group(), {batches, ...descriptor} = h; pivot.name = h.id; pivot.position.fromArray(h.pivot);
    pivot.rotation.y = h.yaw; pivot.userData = {kind: 'hinge', ...descriptor}; for (const batch of batches) mesh(batch, pivot);
    root.add(pivot); pivots.push(pivot);
  }
  let disposed = false;
  function setHingePose(id, degrees) {
    if (disposed) throw Error('Model is disposed.');
    if (!Number.isFinite(degrees) || degrees < 0 || degrees > 90) throw Error('Use a 0–90 degree hinge angle.');
    const p = pivots.find(p => p.name === id); if (!p) throw Error('Unknown bathroom hinge.');
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(...p.userData.axis), degrees * p.userData.swingSign * Math.PI / 180);
    const base = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), p.userData.yaw);
    p.quaternion.copy(base.multiply(q)); p.userData.angle = degrees; root.updateMatrixWorld(true);
  }
  function setKind(kind, open) { if (disposed) throw Error('Model is disposed.'); for (const p of pivots) if (p.userData.kind === kind) setHingePose(p.name, open ? 90 : 0); }
  root.updateMatrixWorld(true);
  return {root, data, asset: data.asset, materials, pivots, bounds: data.bounds, motionBounds: data.motionBounds, triangles: data.metrics.triangles,
    setHingePose, setDoorsOpen: open => setKind('door', open), setLidsOpen: open => setKind('lid', open),
    setView({roof = true, cutaway = false} = {}) {
      if (disposed) throw Error('Model is disposed.');
      for (const child of root.children) child.visible = (roof || !['roof', 'gable'].includes(child.userData.kind)) && (!cutaway || child.userData.kind !== 'exterior');
    },
    dispose() { if (disposed) return; disposed = true; for (const g of geometries) g.dispose(); for (const m of materials.values()) m.dispose(); root.removeFromParent(); }
  };
}
