export function createRailwaySignalView(T, signals) {
  const root = new T.Group();
  root.name = 'Railway signals';
  const metal = new T.MeshStandardMaterial({color: 0x4b5757, roughness: .76});
  const housing = new T.MeshStandardMaterial({color: 0x212726, roughness: .88});
  const light = new T.MeshBasicMaterial({color: 0xffffff});
  const posts = new T.InstancedMesh(new T.BoxGeometry(.07, 1.18, .07), metal, signals.length);
  const heads = new T.InstancedMesh(new T.BoxGeometry(.34, .49, .24), housing, signals.length);
  const lamps = new T.InstancedMesh(new T.SphereGeometry(.101, 8, 6), light, 2 * signals.length);
  posts.name = 'Signal posts';
  heads.name = 'Signal heads';
  lamps.name = 'Signal lights';
  root.add(posts, heads, lamps);

  const transform = new T.Object3D();
  function place(mesh, index, x, y, z, yaw) {
    transform.position.set(x, y, z);
    transform.rotation.y = yaw;
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  }
  for (const [index, {x, z, yaw}] of signals.entries()) {
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    const sideX = x + dz * 1.21, sideZ = z - dx * 1.21;
    place(posts, index, sideX, .59, sideZ, yaw);
    place(heads, index, sideX, 1.12, sideZ, yaw);
    place(lamps, index * 2, sideX - dx * .12, 1.23, sideZ - dz * .12, yaw);
    place(lamps, index * 2 + 1, sideX - dx * .12, 1.01, sideZ - dz * .12, yaw);
  }

  const colour = new T.Color(), aspects = [];
  let disposed = false;
  function update(next) {
    if (disposed) throw new Error('The railway signal view has been disposed.');
    if (next.length !== signals.length || next.some((signal, index) => signal.id !== signals[index].id)) {
      throw new Error('Use the same signal layout when updating the lights.');
    }
    let changed = false;
    for (const [index, {aspect}] of next.entries()) {
      if (aspects[index] === aspect) continue;
      aspects[index] = aspect;
      lamps.setColorAt(index * 2, colour.setHex(aspect === 'stop' ? 0xff4936 : 0x48221e));
      lamps.setColorAt(index * 2 + 1, colour.setHex(aspect === 'clear' ? 0x48f195 : 0x17372a));
      changed = true;
    }
    if (changed) lamps.instanceColor.needsUpdate = true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    for (const mesh of [posts, heads, lamps]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose();
    }
    root.clear();
  }
  update(signals);
  return {root, update, dispose};
}
