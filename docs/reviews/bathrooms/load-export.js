// Independent review reader for this exporter subset, not a shared game importer.
export async function loadBathroomExport(T, id, baseURL, asset, record) {
  const url = new URL('../../../assets/bathrooms/models/' + id + '.gltf', baseURL), gltf = await (await fetch(url)).json();
  const buffer = await (await fetch(new URL(gltf.buffers[0].uri, url))).arrayBuffer(), textures = [], materials = [], geometries = [], objects = new Map();
  try {
    for (const spec of gltf.textures) {
      const texture = await new T.TextureLoader().loadAsync(new URL(gltf.images[spec.source].uri, url).href);
      texture.flipY = false; texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4;
      texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping; textures.push(texture);
    }
    for (const spec of gltf.materials) {
      const p = spec.pbrMetallicRoughness;
      materials.push(new T.MeshStandardMaterial({color: new T.Color(...p.baseColorFactor.slice(0, 3)), roughness: p.roughnessFactor,
        metalness: p.metallicFactor, map: p.baseColorTexture ? textures[p.baseColorTexture.index] : null}));
    }
    function attribute(index, size) {
      const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView], Type = a.componentType === 5125 ? Uint32Array : Float32Array;
      return new T.BufferAttribute(new Type(buffer, (view.byteOffset || 0) + (a.byteOffset || 0), a.count * size), size);
    }
    function node(index) {
      const n = gltf.nodes[index]; let object;
      if (n.mesh !== undefined) {
        const p = gltf.meshes[n.mesh].primitives[0], geometry = new T.BufferGeometry();
        geometry.setAttribute('position', attribute(p.attributes.POSITION, 3)); geometry.setAttribute('normal', attribute(p.attributes.NORMAL, 3));
        geometry.setAttribute('uv', attribute(p.attributes.TEXCOORD_0, 2)); geometry.setIndex(attribute(p.indices, 1)); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
        geometries.push(geometry); object = new T.Mesh(geometry, materials[p.material]); object.castShadow = object.receiveShadow = true;
      } else object = new T.Group();
      object.name = n.name; object.userData = n.extras || {};
      if (n.matrix) new T.Matrix4().fromArray(n.matrix).decompose(object.position, object.quaternion, object.scale);
      else { object.position.fromArray(n.translation || [0, 0, 0]); object.quaternion.fromArray(n.rotation || [0, 0, 0, 1]); object.scale.fromArray(n.scale || [1, 1, 1]); }
      objects.set(index, object); for (const child of n.children || []) object.add(node(child)); return object;
    }
    const root = node(gltf.scenes[gltf.scene].nodes[0]), pivots = [...objects.values()].filter(o => Array.isArray(o.userData.axis)); let disposed = false;
    function setHingePose(id, degrees) {
      const p = pivots.find(p => p.name === id); if (!p) throw Error('Missing exported hinge.');
      p.quaternion.setFromAxisAngle(new T.Vector3(...p.userData.axis), degrees * p.userData.swingSign * Math.PI / 180);
      p.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), p.userData.yaw)); root.updateMatrixWorld(true);
    }
    return {root, asset, pivots, data: {uvMode: 'atlas', metrics: record.interchange}, triangles: record.interchange.triangles, bounds: record.bounds, motionBounds: record.motionBounds,
      materials: new Map(gltf.materials.map((m, i) => [m.name, materials[i]])), setHingePose,
      setDoorsOpen(open) { for (const p of pivots) if (p.userData.kind === 'door') setHingePose(p.name, open ? 90 : 0); },
      setLidsOpen(open) { for (const p of pivots) if (p.userData.kind === 'lid') setHingePose(p.name, open ? 90 : 0); },
      setView({roof = true, cutaway = false} = {}) { for (const child of root.children) child.visible = (roof || !['roof', 'gable'].includes(child.userData.kind)) && (!cutaway || child.userData.kind !== 'exterior'); },
      applyOpenAnimation(time, kind = 'all') {
        if (time < 0 || time > 1) throw Error('Animation time must be 0–1.');
        for (const clip of gltf.animations || []) if (kind === 'all' || clip.extras.kind === kind) for (const channel of clip.channels) {
          const output = attribute(clip.samplers[channel.sampler].output, 4), q0 = new T.Quaternion().fromBufferAttribute(output, 0), q1 = new T.Quaternion().fromBufferAttribute(output, 1);
          objects.get(channel.target.node).quaternion.copy(q0).slerp(q1, time);
        }
        root.updateMatrixWorld(true);
      },
      dispose() { if (disposed) return; disposed = true; root.removeFromParent(); for (const item of [...geometries, ...materials, ...textures]) item.dispose(); }
    };
  } catch (error) { for (const item of [...geometries, ...materials, ...textures]) item.dispose(); throw error; }
}
