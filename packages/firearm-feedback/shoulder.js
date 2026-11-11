import {MathUtils} from './shared-three.js';
import {boreRotation, quaternion, restore, rotateWorld, setWorldPose, snapshot, vector, weaponGrip, wrapAngle, yawRotation} from './rig.js';

// Farmyard's rifle pose preserves the stock and both grip anchors. Its bore
// search starts each trial from the same host locomotion/posture frame.
export function aimShoulder(worker, profile, upperBody, arms, frame, target, weight, recoil) {
  const {root, weapon: gun} = worker;
  const [spine, head] = upperBody;
  const {prone, blend, parentYaw, baseYaw, floorHeight, origin} = frame;
  const base = snapshot([root, gun.root, ...upperBody]);
  const carry = spine.worldToLocal(gun.root.getWorldPosition(vector()));
  const carryRotation = spine.getWorldQuaternion(quaternion()).invert().multiply(gun.root.getWorldQuaternion(quaternion()));

  function reset() {
    restore(base);
    root.updateMatrixWorld(true);
  }

  function fit(heading, pitch) {
    reset();
    const readyYaw = baseYaw + wrapAngle(-heading - parentYaw + profile.shoulderYaw * Math.max(weight, prone * .63) - baseYaw)
      * Math.max(weight, prone);
    const twist = MathUtils.clamp(wrapAngle(readyYaw - baseYaw) * blend, -.85, .85) * (1 - .66 * prone);
    root.rotation.set(0, readyYaw - twist, 0);
    root.updateMatrixWorld(true);
    if (twist) rotateWorld(spine, yawRotation(twist).multiply(spine.getWorldQuaternion(quaternion())));
    spine.rotateX(.16 * weight);
    spine.rotateZ(-.02 * recoil + (profile.proneAim?.torsoFollow ?? 0) * pitch * prone * weight);
    head.rotateZ((pitch * profile.headPitchSlope + profile.headPitch + prone * (1 + (profile.proneAim?.headOffset ?? 0))) * weight);
    head.rotateY((profile.headYaw + .4 * pitch) * weight);
    root.updateMatrixWorld(true);

    const spineRotation = spine.getWorldQuaternion(quaternion()), aimRotation = boreRotation(heading, pitch);
    const stockOffset = vector(...profile.stockOffset);
    if (profile.proneAim) stockOffset.lerp(vector(...profile.proneAim.stock), prone);
    const stock = arms[1].upper.getWorldPosition(vector()).add(stockOffset.applyQuaternion(spineRotation));
    const axis = vector(1, 0, 0).applyQuaternion(aimRotation);
    if (gun.id === 'hmg') stock.addScaledVector(axis, -.045 * prone);
    const stockPosition = stock.clone().sub(gun.anchors.stock.position.clone().applyQuaternion(aimRotation));
    const lowRotation = boreRotation(heading - .20, Math.max(-.02, pitch) + .085);
    const lowPosition = stock.clone().add(vector(0, -.018, 0))
      .sub(gun.anchors.stock.position.clone().applyQuaternion(lowRotation));
    const rotation = spineRotation.multiply(carryRotation).slerp(lowRotation, prone).slerp(aimRotation, weight);
    const position = spine.localToWorld(carry.clone()).lerp(lowPosition, prone).lerp(stockPosition, weight)
      .addScaledVector(axis, -.038 * recoil);
    const contacts = arms.map((arm, index) => {
      const side = index === 0 ? -1 : 1, name = side === 1 ? 'grip' : 'support';
      const grip = weaponGrip(gun, name, rotation);
      const offset = gun.anchors[name].position.clone().applyQuaternion(rotation).sub(grip.palm.applyQuaternion(grip.rotation));
      const center = arm.upper.getWorldPosition(vector()).sub(offset);
      const pole = vector(-.12, -1, side * (.55 + .48 * prone)).applyQuaternion(yawRotation(-heading));
      return {arm, grip, offset, center, pole};
    });
    const seat = position.clone();
    for (let pass = 0; pass < 6; pass++) {
      for (const {arm, center} of contacts) {
        const delta = position.clone().sub(center), reach = arm.length - .009;
        if (delta.lengthSq() > reach * reach) position.copy(center).add(delta.setLength(reach));
      }
    }
    if (position.distanceTo(seat) > MathUtils.lerp(.24, .072, weight)) return false;
    setWorldPose(gun.root, position, rotation);
    return contacts.every(({arm, grip, offset, pole}) =>
      arm.fit(position.clone().add(offset), grip.rotation, pole, grip.curl));
  }

  const dx = target.x - origin.x, dz = target.z - origin.z;
  const heading = Math.atan2(dz, dx), pitch = Math.atan2(target.y - floorHeight - 1.3, Math.hypot(dx, dz));
  const muzzle = () => ({
    origin: gun.anchors.muzzle.getWorldPosition(vector()),
    direction: vector(1, 0, 0).transformDirection((gun.barrel ?? gun.root).matrixWorld)
  });
  function evaluate(h, p) {
    if (!Number.isFinite(h + p) || Math.abs(p) > Math.PI / 2 - .005 || !fit(h, p)) return null;
    const {origin: boreOrigin, direction} = muzzle(), delta = target.clone().sub(boreOrigin);
    const error = delta.lengthSq() < 1e-12 ? Math.PI : direction.angleTo(delta);
    const azimuth = wrapAngle(Math.atan2(delta.z, delta.x) - Math.atan2(direction.z, direction.x));
    const elevation = Math.atan2(delta.y, Math.hypot(delta.x, delta.z))
      - Math.atan2(direction.y, Math.hypot(direction.x, direction.z));
    return {h, p, error, azimuth, elevation};
  }

  let current = evaluate(heading, pitch);
  if (!current) {
    for (const p of [pitch * .5, 0, -.15, .15]) {
      current = evaluate(heading, p);
      if (current) break;
    }
  }
  if (weight >= .999 && current) {
    for (let i = 0; i < 14 && current.error > .0005; i++) {
      const epsilon = .0005, a = evaluate(current.h + epsilon, current.p), b = evaluate(current.h, current.p + epsilon);
      let dh = current.azimuth, dp = current.elevation;
      if (a && b) {
        const j00 = wrapAngle(a.azimuth - current.azimuth) / epsilon, j10 = (a.elevation - current.elevation) / epsilon;
        const j01 = wrapAngle(b.azimuth - current.azimuth) / epsilon, j11 = (b.elevation - current.elevation) / epsilon;
        const determinant = j00 * j11 - j01 * j10;
        if (Math.abs(determinant) > 1e-6) {
          dh = (-j11 * current.azimuth + j01 * current.elevation) / determinant;
          dp = (j10 * current.azimuth - j00 * current.elevation) / determinant;
        }
      }
      const limit = Math.min(1, .35 / Math.max(Math.abs(dh), Math.abs(dp), 1e-9));
      let next = null;
      for (let step = limit; step >= limit / 64; step /= 2) {
        const trial = evaluate(current.h + dh * step, current.p + dp * step);
        if (trial && trial.error < current.error - 1e-8) {
          next = trial;
          break;
        }
      }
      if (!next) break;
      current = next;
    }
  }
  const supported = !!current && (weight < .999 || current.error <= .0005);
  const held = supported ? current : (evaluate(heading, 0) ?? current);
  if (held) fit(held.h, held.p);
  else reset();
  return {supported, angularError: held?.error ?? null, reason: supported ? null : held ? 'endpoint-not-aligned' : 'grip-range'};
}
