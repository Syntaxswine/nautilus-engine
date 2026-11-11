import {Bone, Object3D, Skeleton} from './shared-three.js';
import {createPoseDriver, shotPoseSeconds, weaponAction} from './pose.js';
import {restore, snapshot, vector} from './rig.js';

export {createFirearmAudio} from './audio.js';

export const FARMYARD_FIREARM_CUES = Object.freeze({
  pistol: 'tt33', 'pistol-offhand': 'tt33', rifle: 'mosin-m38', sniper: 'mosin-m38',
  assault: 'ak47-shot', smg: 'ak47-shot', hmg: 'ak47-shot', shotgun: 'shotgun-fire'
});
export const FIREARM_FEEDBACK_PROFILE = Object.freeze({
  id: 'farmyard-realtime-firearm-feedback-1', version: 1, shotPoseSeconds, shotgunPumpSeconds: .35
});

const upperNames = ['spine', 'head', ...[-1, 1].flatMap(side =>
  ['upperArm', 'forearm', 'hand', 'fingers'].map(name => name + side))];
const borrowedRoots = new WeakSet();
const degrees = Math.PI / 180;

function number(value, label, minimum = -Infinity, maximum = Infinity) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) throw TypeError('Invalid ' + label + '.');
  return value;
}

function identity(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw TypeError('Supply a nonempty ' + label + '.');
  return value;
}

function sequenceNumber(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw TypeError('Supply a nonnegative safe-integer sequence.');
  return value;
}

function point(value, label) {
  return {x: number(value?.x, label + '.x'), y: number(value?.y, label + '.y'), h: number(value?.h, label + '.h')};
}

const worldVector = ({x, y, h}) => vector(x, h, y);
const mapPoint = ({x, y, z}) => ({x, y: z, h: y});

function firearm(weapon) {
  if (typeof weapon !== 'string' || !Object.hasOwn(FARMYARD_FIREARM_CUES, weapon)) {
    throw TypeError('Unsupported firearm: ' + String(weapon));
  }
  return weapon;
}

function stanceFrame(input) {
  const {now, weapon, aim, floorHeight = 0, blend = 0, pose = {}} = input;
  const prone = number(pose?.prone ?? 0, 'pose.prone', 0, 1);
  const kneel = number(pose?.kneel ?? 0, 'pose.kneel', 0, 1);
  if (prone + kneel > 1 + 1e-8) throw TypeError('Stance weights must sum to at most one.');
  return {
    now: number(now, 'now', 0), weapon: weapon === null ? null : firearm(weapon),
    floorHeight: number(floorHeight, 'floorHeight'), blend: number(blend, 'blend', 0, 1),
    prone, kneel, aim: aim == null ? null : {
      progress: number(aim.progress, 'aim.progress', 0, 1), target: worldVector(point(aim.target, 'aim.target'))
    }
  };
}

function rigProfile(profile) {
  function offset(value, label) {
    if (!Array.isArray(value) || value.length !== 3) throw TypeError('Supply three numbers for ' + label + '.');
    return value.map(component => number(component, label));
  }
  return {
    shoulderYaw: -number(profile.bodyYaw ?? 35, 'profile.bodyYaw') * degrees,
    headPitch: number(profile.headPitch ?? -.9, 'profile.headPitch'),
    headPitchSlope: number(profile.headPitchSlope ?? 1.5, 'profile.headPitchSlope'),
    headYaw: number(profile.headYaw ?? 25, 'profile.headYaw') * degrees,
    stockOffset: offset(profile.stockOffset ?? [-.045, .070, -.035], 'profile.stockOffset'),
    proneAim: profile.proneAim ? {
      stock: offset(profile.proneAim.stock, 'profile.proneAim.stock'),
      torsoFollow: number(profile.proneAim.torsoFollow ?? 0, 'profile.proneAim.torsoFollow'),
      headOffset: number(profile.proneAim.headOffset ?? 0, 'profile.proneAim.headOffset')
    } : null
  };
}

function namedRig(worker) {
  if (!(worker?.root instanceof Object3D) || !(worker.skeleton instanceof Skeleton) || !Array.isArray(worker.bones)) {
    throw TypeError('Supply a native worker root, bones and skeleton from the shared Three instance.');
  }
  const bones = Object.fromEntries(worker.bones.map(bone => [bone.name, bone]));
  const upperBody = upperNames.map(name => {
    const bone = bones[name];
    if (!(bone instanceof Bone) || !worker.root.getObjectById(bone.id) || !bone.matrixAutoUpdate) {
      throw TypeError('Missing compatible firearm bone: ' + name);
    }
    return bone;
  });
  for (const side of [-1, 1]) {
    const upper = bones['upperArm' + side], forearm = bones['forearm' + side], hand = bones['hand' + side];
    if (forearm.parent !== upper || hand.parent !== forearm || bones['fingers' + side].parent !== hand ||
        forearm.position.length() < .005 || hand.position.length() < .005) {
      throw TypeError('Firearm rig requires a native upper arm, forearm, hand and fingers chain.');
    }
  }
  return {bones, upperBody};
}

function gunFor(worker, weapon) {
  const gun = worker.weapon, model = weapon === 'pistol-offhand' ? 'pistol' : weapon;
  const names = model === 'pistol' ? ['grip', 'muzzle'] : ['grip', 'support', 'stock', 'muzzle'];
  if (gun?.id !== model || !(gun.root instanceof Object3D) || gun.root.parent !== worker.root ||
      !gun.root.matrixAutoUpdate || !gun.carry || !names.every(name =>
        gun.anchors?.[name] instanceof Object3D && gun.anchors[name].parent === gun.root)) {
    throw TypeError('Equip the matching native ' + model + ' with its firearm anchors before posing.');
  }
  return gun;
}

function updateRig(worker) {
  worker.root.updateWorldMatrix(true, false);
  worker.root.updateMatrixWorld(true);
  worker.skeleton.update();
}

function nativeFrame(root) {
  const scale = root.getWorldScale(vector()), parentScale = root.parent?.getWorldScale(vector());
  const up = vector(0, 1, 0).transformDirection(root.matrixWorld);
  const localUp = vector(0, 1, 0).applyQuaternion(root.quaternion);
  if (!root.matrixAutoUpdate || scale.distanceToSquared(vector(1, 1, 1)) > 1e-12 ||
      parentScale?.distanceToSquared(vector(1, 1, 1)) > 1e-12 || up.distanceToSquared(vector(0, 1, 0)) > 1e-12 ||
      localUp.distanceToSquared(vector(0, 1, 0)) > 1e-12) {
    throw TypeError('Firearm feedback requires an upright, native-unit rig and parent frame.');
  }
  const forward = root.parent ? vector(1, 0, 0).transformDirection(root.parent.matrixWorld) : vector(1, 0, 0);
  const localForward = vector(1, 0, 0).applyQuaternion(root.quaternion);
  return {
    parentYaw: Math.atan2(-forward.z, forward.x), baseYaw: Math.atan2(-localForward.z, localForward.x),
    origin: root.getWorldPosition(vector())
  };
}

/**
 * One presentation consumer per committed-round stream. Its sequence is a
 * cursor over a host journal. Aim samples do not deliver sound or write to it.
 */
export function createFirearmFeedback({afterSequence = 0, playCue} = {}) {
  let sequence = sequenceNumber(afterSequence), disposed = false, insideCallback = false;
  const actors = new Map();
  if (playCue !== undefined && typeof playCue !== 'function') throw TypeError('playCue must be a function.');

  function available() {
    if (disposed) throw Error('Firearm feedback has been disposed.');
    if (insideCallback) throw Error('Firearm feedback callbacks must not reenter the presenter.');
  }

  function invoke(callback, value) {
    insideCallback = true;
    try { return callback(value); } finally { insideCallback = false; }
  }

  function commitRound(input) {
    available();
    const next = sequenceNumber(input?.sequence);
    if (next <= sequence) return {status: 'stale', sequence: next, cues: []};
    const actorId = identity(input.actorId, 'actorId'), weapon = firearm(input.weapon);
    const at = number(input.at, 'round.at', 0), target = worldVector(point(input.target, 'round.target'));
    const origin = Object.freeze(point(input.origin, 'round.origin'));
    const binding = actors.get(actorId);
    // Commit the presentation cursor before any audio callback can fail.
    sequence = next;
    if (binding) binding.round = {sequence: next, weapon, at, target};
    const cues = [];
    function deliver(cueId, delaySeconds, range, priority) {
      const request = Object.freeze({cueId, sequence: next, actorId, weapon, origin, delaySeconds, range, priority});
      try {
        const delivered = playCue && invoke(playCue, request) !== false;
        cues.push({cueId, status: delivered ? 'delivered' : 'skipped'});
      } catch (error) {
        cues.push({cueId, status: 'failed', error});
      }
    }
    deliver(FARMYARD_FIREARM_CUES[weapon], 0, 48, 1);
    if (weapon === 'shotgun') deliver('shotgun-pump', FIREARM_FEEDBACK_PROFILE.shotgunPumpSeconds, 18, .5);
    return {status: 'accepted', sequence: next, cues};
  }

  function bindActor({actorId, worker, profile = {}}) {
    available();
    identity(actorId, 'actorId');
    if (actors.has(actorId)) throw Error('Actor already has a firearm binding: ' + actorId);
    const {bones, upperBody} = namedRig(worker);
    if (borrowedRoots.has(worker.root)) throw Error('The firearm rig already has a presentation owner.');
    const applyPose = createPoseDriver(worker, rigProfile(profile), upperBody, bones);
    const binding = {round: null, release};
    let previous = null, previousNow = null, base = null, released = false;
    actors.set(actorId, binding);
    borrowedRoots.add(worker.root);

    function restoreBase() {
      if (!base) return;
      const rows = base;
      base = null;
      restore(rows);
      updateRig(worker);
    }

    function release() {
      if (released) return;
      released = true;
      actors.delete(actorId);
      borrowedRoots.delete(worker.root);
      restoreBase();
    }

    return Object.freeze({
      sample(input, prepareBase) {
        available();
        if (released) throw Error('The firearm actor binding has been released.');
        if (prepareBase !== undefined && typeof prepareBase !== 'function') throw TypeError('prepareBase must be a function.');
        const frame = stanceFrame(input);
        if (previousNow !== null && frame.now < previousNow) throw RangeError('Actor presentation time must be nondecreasing.');
        restoreBase();
        if (prepareBase) invoke(prepareBase, input);
        if (binding.round && (binding.round.weapon !== frame.weapon || frame.now >= binding.round.at + shotPoseSeconds)) {
          binding.round = null;
        }
        const elapsed = previousNow === null ? 1 / 60 : Math.min(frame.now - previousNow, 1);
        previousNow = frame.now;
        if (frame.weapon === null) {
          previous = null;
          return null;
        }
        const gun = gunFor(worker, frame.weapon);
        const action = weaponAction(previous, frame.weapon, frame.aim, binding.round, frame.now, elapsed);
        if (!action && frame.weapon !== 'pistol-offhand' && !(frame.prone && gun.id !== 'pistol')) {
          previous = null;
          return null;
        }
        Object.assign(frame, nativeFrame(worker.root));
        base = snapshot([worker.root, ...upperBody, gun.root]);
        try {
          const result = applyPose(frame, action);
          updateRig(worker);
          previous = action;
          return {
            phase: action?.phase ?? 'held', sequence: action?.sequence ?? null, weight: action?.weight ?? 0,
            ...result, muzzle: mapPoint(gun.anchors.muzzle.getWorldPosition(vector())),
            bore: mapPoint(vector(1, 0, 0).transformDirection((gun.barrel ?? gun.root).matrixWorld))
          };
        } catch (error) {
          restoreBase();
          throw error;
        }
      },
      dispose() {
        if (!released) { available(); release(); }
      }
    });
  }

  return Object.freeze({
    get sequence() { return sequence; },
    commitRound, bindActor,
    dispose() {
      if (disposed) return;
      available();
      disposed = true;
      const errors = [];
      for (const actor of actors.values()) {
        try { actor.release(); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, 'Failed to restore one or more borrowed firearm rigs.');
    }
  });
}
