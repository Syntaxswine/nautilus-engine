import {MathUtils} from './shared-three.js';
import {aimShoulder} from './shoulder.js';
import {boreRotation, firingArm, quaternion, rotateWorld, setWorldPose, vector, weaponGrip, wrapAngle, yawRotation} from './rig.js';

const shoulderKick = {assault: .85, rifle: 1.38, smg: .48, shotgun: 1.55, sniper: 1.4, hmg: .96};
const smooth = MathUtils.smoothstep;
export const shotPoseSeconds = .280;

export function weaponAction(previous, weapon, aim, round, now, elapsed) {
  if (previous?.weapon !== weapon) previous = null;
  const age = round && now >= round.at ? (now - round.at) * 1000 : Infinity;
  const active = age < shotPoseSeconds * 1000;
  const desired = aim ? .18 + .82 * smooth(aim.progress, 0, .68) : 0;
  const damped = MathUtils.damp(previous?.weight ?? 0, desired, aim ? 24 : 19, elapsed);
  const weight = Math.max(damped, active ? 1 - smooth(age, 145, shotPoseSeconds * 1000) : 0);
  const target = active ? round.target : aim?.target ?? previous?.target;
  if (!target || weight < .008) return null;
  const phase = active ? (age < 100 ? 'discharge' : 'recover') : !aim ? 'recover' : weight < .87 ? 'ready' : 'aim';
  return {weapon, weight, target, age, phase, active, sequence: active ? round.sequence : null};
}

export function createPoseDriver(worker, profile, upperBody, bones) {
  const {root} = worker, left = firingArm(bones, -1), right = firingArm(bones, 1);

  function face(heading, weight, frame) {
    const turn = wrapAngle(-heading - frame.parentYaw - frame.baseYaw) * weight;
    const twist = MathUtils.clamp(turn * frame.blend, -.82, .82) * (1 - .68 * frame.prone);
    root.rotation.set(0, frame.baseYaw + turn - twist, 0);
    root.updateMatrixWorld(true);
    if (twist) rotateWorld(bones.spine, yawRotation(twist).multiply(bones.spine.getWorldQuaternion(quaternion())));
  }

  function braceFreeArm(arm, heading, frame, weight) {
    if (!frame.prone) return;
    const facing = yawRotation(-heading);
    const forward = vector(1, 0, 0).applyQuaternion(facing);
    const side = vector(0, 0, arm === left ? -1 : 1).applyQuaternion(facing);
    const shoulder = arm.upper.getWorldPosition(vector()), hand = arm.hand.getWorldPosition(vector());
    const support = shoulder.addScaledVector(forward, .15).addScaledVector(side, .10);
    support.y = frame.floorHeight + .105;
    arm.fit(hand.lerp(support, frame.prone * weight), arm.hand.getWorldQuaternion(quaternion()), vector(0, -1, 0).add(side), -.35, true);
  }

  function pistol(gun, frame, action) {
    const offhand = frame.weapon === 'pistol-offhand', arm = offhand ? left : right, side = offhand ? -1 : 1;
    const {origin, prone, parentYaw} = frame, weight = action?.weight ?? 0, target = action?.target;
    const heading = target ? Math.atan2(target.z - origin.z, target.x - origin.x) : -frame.baseYaw - parentYaw;
    face(heading, weight, frame);
    const facing = yawRotation(-heading), forward = vector(1, 0, 0).applyQuaternion(facing);
    const out = vector(0, 0, side).applyQuaternion(facing);
    const shoulder = arm.upper.getWorldPosition(vector());
    const kick = action?.active ? 1 - smooth(action.age, 0, 110) : 0;
    const ready = offhand
      ? shoulder.clone().addScaledVector(forward, .20).addScaledVector(out, .035).add(vector(0, -.18, 0))
      : arm.hand.getWorldPosition(vector());
    const distance = target?.distanceTo(shoulder) ?? 2;
    const reach = MathUtils.clamp((distance - .19) * .78, .12, arm.length * .87) - .04 * kick;
    const aim = shoulder.clone().addScaledVector(forward, reach).addScaledVector(out, -.035).add(vector(0, -.028 - .025 * prone, 0));
    const wrist = ready.lerp(aim, weight);
    const carry = offhand ? boreRotation(heading, -.24) : gun.root.getWorldQuaternion(quaternion());
    let rotation = boreRotation(heading, prone ? .045 : -.08), fitted = !target;
    if (target) {
      const hand = weaponGrip(gun, 'grip', quaternion());
      const bore = gun.anchors.muzzle.position.clone().sub(gun.anchors.grip.position).add(hand.palm.applyQuaternion(hand.rotation));
      const delta = target.clone().sub(wrist), along = Math.sqrt(delta.lengthSq() - bore.y ** 2 - bore.z ** 2);
      if (along > bore.x + .008) {
        const direction = delta.normalize();
        rotation = boreRotation(Math.atan2(direction.z, direction.x), Math.asin(MathUtils.clamp(direction.y, -1, 1)));
        const toTarget = vector(along, bore.y, bore.z).normalize().applyQuaternion(rotation);
        rotation.premultiply(quaternion().setFromUnitVectors(toTarget, direction));
        fitted = true;
      }
    }
    const lift = action?.active ? .25 * Math.sin(Math.PI * smooth(action.age, 0, 105)) * kick : 0;
    rotation = carry.slerp(rotation.multiply(boreRotation(0, lift)), weight);
    const grip = weaponGrip(gun, 'grip', rotation);
    arm.fit(wrist, grip.rotation, vector(-.16, -1, side * .55).applyQuaternion(facing), grip.curl, true);
    const position = arm.hand.localToWorld(grip.palm).sub(gun.anchors.grip.position.clone().applyQuaternion(rotation));
    setWorldPose(gun.root, position, rotation);
    braceFreeArm(offhand ? right : left, heading, frame, weight);
    const angularError = target ? vector(1, 0, 0).applyQuaternion(rotation)
      .angleTo(target.clone().sub(gun.anchors.muzzle.getWorldPosition(vector()))) : null;
    const supported = weight < .999 || fitted;
    return {supported, angularError, reason: supported ? null : 'endpoint-not-aligned'};
  }

  return function apply(frame, action) {
    const gun = worker.weapon;
    if (gun.id === 'pistol') return pistol(gun, frame, action);
    const {origin, floorHeight, parentYaw, baseYaw} = frame, heading = -baseYaw - parentYaw;
    const target = action?.target.clone() ?? vector(origin.x + 8 * Math.cos(heading), floorHeight + .85, origin.z + 8 * Math.sin(heading));
    const kick = action?.active ? 1 - smooth(action.age, 0, 145) : 0;
    // The bore starts aligned to the committed trace. Visible rise follows.
    const lift = action?.active ? .082 * Math.sin(Math.PI * smooth(action.age, 0, 110)) * kick : 0;
    target.y += Math.hypot(target.x - origin.x, target.z - origin.z) * lift;
    return aimShoulder(worker, profile, upperBody, [left, right], frame, target, action?.weight ?? 0, shoulderKick[gun.id] * kick);
  };
}
