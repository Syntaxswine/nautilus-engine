// Original native-scale rock visual. Hosts supply their existing Three namespace.
// The origin is the collision-sphere centre; absolute ground contact is at -radius.
const unit = (seed, index) => {
  let n = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

export function createRockModel(THREE, {radius = .055, seed = 0, color = 0x7c7a71} = {}) {
  if (!THREE?.Group || !THREE.BufferGeometry || !THREE.Float32BufferAttribute ||
      !THREE.Mesh || !THREE.MeshStandardMaterial || !THREE.Color || !THREE.Box3) {
    throw new TypeError('Supply the host Three namespace.');
  }
  if (!Number.isFinite(radius) || radius < .005 || radius > .5) throw new RangeError('Rock radius must be .005–.5 metres.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('Rock seed must be an unsigned 32-bit integer.');
  if (!Number.isInteger(color) || color < 0 || color > 0xffffff) throw new RangeError('Rock colour must be a 24-bit RGB value.');

  const rings = [], sides = 9;
  for (let row = 0; row < 3; row++) {
    const ring = [], height = [-.42, 0, .45][row] * radius;
    for (let side = 0; side < sides; side++) {
      const angle = (side + (row % 2) * .24) * Math.PI * 2 / sides;
      const extent = radius * (.73 + .15 * unit(seed, row * sides + side));
      ring.push([Math.cos(angle) * extent, height, Math.sin(angle) * extent]);
    }
    rings.push(ring);
  }
  const positions = [], colors = [], base = new THREE.Color(color);
  let face = 0;
  function triangle(a, b, c) {
    positions.push(...a, ...b, ...c);
    const shade = .82 + .18 * unit(seed, 100 + face++);
    for (let vertex = 0; vertex < 3; vertex++) colors.push(base.r * shade, base.g * shade, base.b * shade);
  }
  for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides;
    triangle([0, -radius, 0], rings[0][side], rings[0][next]);
    for (let row = 0; row < 2; row++) {
      const low = rings[row], high = rings[row + 1];
      triangle(low[side], high[side], low[next]);
      triangle(low[next], high[side], high[next]);
    }
    triangle([0, radius, 0], rings[2][next], rings[2][side]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({color: 0xffffff, vertexColors: true, roughness: 1, metalness: 0, flatShading: true});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Throwable rock';
  mesh.castShadow = mesh.receiveShadow = true;
  const root = new THREE.Group();
  root.name = 'item:rock';
  root.userData = {itemId: 'item:rock', metresPerUnit: 1, radius, seed};
  root.add(mesh);
  let disposed = false;
  return {
    root, mesh, radius, seed,
    metrics: Object.freeze({triangles: face, drawCalls: 1, textures: 0}),
    getBounds() {
      if (disposed) throw new Error('Rock model is disposed.');
      root.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(root);
      return {min: box.min.toArray(), max: box.max.toArray()};
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      geometry.dispose();
      material.dispose();
    }
  };
}
