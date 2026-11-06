import {MathUtils, Matrix4, Quaternion, Vector3} from './shared-three.js';

export const vector = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
export const quaternion = () => new Quaternion();
export const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export const yawRotation = yaw => quaternion().setFromAxisAngle(vector(0, 1, 0), yaw);
export const boreRotation = (heading, pitch = 0) =>
  yawRotation(-heading).multiply(quaternion().setFromAxisAngle(vector(0, 0, 1), pitch));

const triggerHand = quaternion().setFromUnitVectors(vector(0, -1, 0), vector(1, 0, 0));

export const snapshot = objects => objects.map(object => ({
  object, position: object.position.clone(), rotation: object.quaternion.clone(), scale: object.scale.clone()
}));

export function restore(rows) {
  for (const {object, position, rotation, scale} of rows) {
    object.position.copy(position);
    object.quaternion.copy(rotation);
    object.scale.copy(scale);
  }
}

export function rotateWorld(bone, rotation) {
  bone.quaternion.copy(bone.parent.getWorldQuaternion(quaternion()).invert().multiply(rotation));
  bone.updateWorldMatrix(false, true);
}

export function setWorldPose(object, position, rotation) {
  object.position.copy(object.parent.worldToLocal(position.clone()));
  rotateWorld(object, rotation);
}

function basis(axis, normal) {
  const x = axis.clone().normalize(), z = normal.clone().normalize();
  return new Matrix4().makeBasis(x, z.clone().cross(x).normalize(), z);
}

// Farmyard idle-rig two-bone solve, retaining limb lengths and bend-plane twist.
export function solveLimb(upper, lower, end, target, endRotation, pole) {
  const shoulder = upper.getWorldPosition(vector()), elbow = lower.getWorldPosition(vector());
  const upperVector = elbow.clone().sub(shoulder), lowerVector = end.getWorldPosition(vector()).sub(elbow);
  const upperLength = upperVector.length(), lowerLength = lowerVector.length();
  const axis = target.clone().sub(shoulder), distance = axis.length();
  if (distance === 0 || distance > upperLength + lowerLength + 1e-6 ||
      distance < Math.abs(upperLength - lowerLength) - 1e-6) {
    throw Error('Firearm limb outside native reach: ' + upper.name);
  }
  axis.normalize();
  const bend = pole.clone().addScaledVector(axis, -pole.dot(axis));
  if (bend.lengthSq() < 1e-10) {
    bend.copy(Math.abs(axis.x) > .9 ? vector(0, 1, 0) : vector(1, 0, 0));
    bend.addScaledVector(axis, -bend.dot(axis));
  }
  bend.normalize();
  const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
  const toElbow = axis.clone().multiplyScalar(along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)));
  const toHand = target.clone().sub(shoulder).sub(toElbow);
  const oldNormal = upperVector.clone().cross(lowerVector);
  if (oldNormal.lengthSq() < 1e-12) oldNormal.crossVectors(upperVector, bend);
  if (oldNormal.lengthSq() < 1e-12) oldNormal.crossVectors(upperVector, axis);
  const normal = toElbow.clone().cross(toHand);
  if (normal.lengthSq() < 1e-12) normal.crossVectors(axis, bend);
  const mapRotation = (from, to) =>
    quaternion().setFromRotationMatrix(basis(to, normal).multiply(basis(from, oldNormal).invert()));
  const upperRotation = mapRotation(upperVector, toElbow).multiply(upper.getWorldQuaternion(quaternion()));
  const lowerRotation = mapRotation(lowerVector, toHand).multiply(lower.getWorldQuaternion(quaternion()));
  rotateWorld(upper, upperRotation);
  rotateWorld(lower, lowerRotation);
  rotateWorld(end, endRotation);
}

export function firingArm(bones, side) {
  const upper = bones['upperArm' + side], forearm = bones['forearm' + side];
  const hand = bones['hand' + side], fingers = bones['fingers' + side];
  const length = forearm.position.length() + hand.position.length();
  const minimum = Math.abs(forearm.position.length() - hand.position.length());
  return {
    upper, hand, length,
    fit(target, rotation, pole, curl, limit = false) {
      const shoulder = upper.getWorldPosition(vector()), offset = target.clone().sub(shoulder);
      const distance = offset.length();
      if (distance > length - 1e-5 || distance < minimum + 1e-5) {
        if (!limit || !distance) return false;
        target = shoulder.add(offset.multiplyScalar(MathUtils.clamp(distance, minimum + .002, length - .002) / distance));
      }
      solveLimb(upper, forearm, hand, target, rotation, pole);
      fingers.rotation.z = curl;
      return true;
    }
  };
}

export function weaponGrip(gun, name, rotation) {
  const fit = gun.carry.handPoses?.[name];
  return {
    palm: fit?.palm ? vector(...fit.palm) : vector(.052, -.010, 0),
    rotation: rotation.clone().multiply(fit?.quaternion ? quaternion().fromArray(fit.quaternion) : triggerHand),
    curl: fit?.fingerCurl ?? -.9
  };
}
