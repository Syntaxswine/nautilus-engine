import {RAILWAY_COUPLER_HEIGHT_M} from '../map-core/railway-train.js';
import {createRollingStockKit} from './rolling-stock.js';
import {railwayCarEntrances} from './entrances.js';

export function createRailwayTrainView(T, initialState) {
  const kit = createRollingStockKit(T, {profile: initialState.profile ?? 'miniature'});
  const root = new T.Group();
  root.name = 'Railway train';
  root.userData = {routeId: initialState.routeId, stock: initialState.stock, profile: initialState.profile ?? 'miniature'};
  const cars = [], couplers = [];
  const geometry = new T.BoxGeometry(.063, 1, .063);
  const material = new T.MeshStandardMaterial({color: 0x272625, roughness: .78, metalness: .32});
  const a = new T.Vector3(), b = new T.Vector3(), axis = new T.Vector3(), up = new T.Vector3(0, 1, 0);
  let disposed = false;

  function endpoint(out, pose, sign) {
    const offset = sign * pose.lengthM / 2;
    out.set(pose.x + Math.sin(pose.yaw) * offset, initialState.couplerHeightM ?? RAILWAY_COUPLER_HEIGHT_M,
      pose.z + Math.cos(pose.yaw) * offset);
  }

  function update(state) {
    if (disposed) throw new Error('The train view has been disposed.');
    if (state.stock !== initialState.stock || state.routeId !== initialState.routeId ||
        state.profile !== initialState.profile ||
        state.cars.length !== cars.length || state.cars.some((pose, i) =>
          pose.id !== cars[i].id || ![pose.x, pose.z, pose.yaw, pose.lengthM].every(Number.isFinite))) {
      throw new Error('Use a pose from the train this view was created for.');
    }
    for (const [index, pose] of state.cars.entries()) {
      const frame = cars[index].frame;
      frame.position.set(pose.x, 0, pose.z);
      frame.rotation.y = pose.yaw;
      if (cars[index].model.setWheelContacts) {
        const yaw = pose.yaw + (pose.reverse ? Math.PI : 0), c = Math.cos(yaw), s = Math.sin(yaw);
        const local = point => ({x: (point.x - pose.x) * c - (point.z - pose.z) * s,
          z: (point.x - pose.x) * s + (point.z - pose.z) * c, yaw: point.yaw - yaw});
        cars[index].model.setWheelContacts({front: local(pose.reverse ? pose.rear : pose.front),
          rear: local(pose.reverse ? pose.front : pose.rear)});
      }
      if (index === 0) continue;
      const link = couplers[index - 1];
      endpoint(a, state.cars[index - 1], -1);
      endpoint(b, pose, 1);
      link.position.copy(a).lerp(b, .5);
      axis.subVectors(b, a);
      link.scale.y = axis.length();
      link.quaternion.setFromUnitVectors(up, axis.normalize());
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    try { kit.dispose(); }
    finally {
      geometry.dispose();
      material.dispose();
      root.clear();
    }
  }

  try {
    for (const [index, pose] of initialState.cars.entries()) {
      const model = kit.create(pose.id);
      for (const entrance of railwayCarEntrances(initialState.profile ?? 'miniature', pose.id)) {
        const anchor = new T.Group();
        anchor.name = 'Entrance ' + entrance.id;
        anchor.position.set(entrance.local.x, entrance.local.h, entrance.local.y);
        anchor.userData = {entranceId: entrance.id, mode: entrance.mode, widthM: entrance.widthM,
          clearanceM: entrance.clearanceM, carId: 'train/' + initialState.stock + '/car/' + index};
        model.root.add(anchor);
      }
      const frame = new T.Group();
      frame.name = 'Train car ' + (index + 1);
      frame.userData.carId = pose.id;
      if (pose.reverse) model.root.rotation.y = Math.PI;
      frame.add(model.root);
      root.add(frame);
      cars.push({id: pose.id, frame, model});
      if (index > 0) {
        const coupler = new T.Mesh(geometry, material);
        coupler.name = 'Train coupler';
        coupler.castShadow = true;
        root.add(coupler);
        couplers.push(coupler);
      }
    }
    update(initialState);
  } catch (error) {
    dispose();
    throw error;
  }
  return {root, update, dispose};
}
