import {Quaternion, Vector3} from '../packages/render-effects/three.js';
import {solveLimb} from '../packages/firearm-feedback/rig.js';
import {createLightHorse} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-light-model.js';
import {createWeaponModel} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/weapon-models.js';

export const horseData = new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-10k-data.json', import.meta.url);
export const horseProfile = {
  headPitch: -.8562, headYaw: 27.734, headPitchSlope: 1.459,
  proneAim: {stock: [.025, .03, .065], torsoFollow: .9}
};

// The reference host supplies the lower body. These three static base frames
// use the donor horse's stance offsets and the existing native worker/equipment.
export function createReferenceRig(data, parent) {
  const worker = createLightHorse(data), {root} = worker;
  const bones = Object.fromEntries(worker.bones.map(bone => [bone.name, bone]));
  const {hips, spine, head} = bones, restHeight = hips.position.y;
  const restFeet = new Map([-1, 1].map(side => [side, bones['hoof' + side].getWorldPosition(new Vector3())]));
  let gun, stance, weapon;
  parent?.add(root);

  function lowerBody(next) {
    if (next === 'stand') return;
    const prone = next === 'prone', before = spine.matrixWorld.clone();
    hips.position.y = prone ? .27 : restHeight - .3706;
    if (prone) {
      hips.rotation.z = -Math.PI / 2;
      spine.rotation.z += .15;
      head.rotation.z += 1.35;
    }
    root.updateMatrixWorld(true);
    for (const side of [-1, 1]) {
      const thigh = bones['thigh' + side], shin = bones['shin' + side], foot = bones['hoof' + side];
      const baseFoot = restFeet.get(side), hip = thigh.getWorldPosition(new Vector3());
      const position = prone
        ? new Vector3(hip.x - .54, .104, hip.z + side * .18)
        : new Vector3(baseFoot.x + (side === 1 ? .26 : -.28), .12, baseFoot.z);
      const reach = shin.position.length() + foot.position.length();
      position.sub(hip).clampLength(.06, reach - .001).add(hip);
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), prone ? -1.2 : 0);
      solveLimb(thigh, shin, foot, position, rotation, new Vector3(prone ? -.60 : 1, -.15, side * .45));
    }
    gun.root.applyMatrix4(spine.matrixWorld.clone().multiply(before.invert()));
    root.updateMatrixWorld(true);
    worker.skeleton.update();
    let bottom = Infinity;
    const vertex = new Vector3();
    for (const part of worker.parts) {
      for (let i = 0; i < part.geometry.attributes.position.count; i++) {
        bottom = Math.min(bottom, part.getVertexPosition(i, vertex).applyMatrix4(part.matrixWorld).y);
      }
    }
    root.position.y += .012 - bottom;
    root.updateMatrixWorld(true);
    worker.skeleton.update();
  }

  return {
    worker,
    prepare(nextWeapon, nextStance) {
      if (nextWeapon === weapon && nextStance === stance) return;
      if (nextWeapon !== weapon) {
        const next = createWeaponModel(nextWeapon);
        worker.equipWeapon(next);
        gun?.dispose();
        gun = next;
      }
      root.position.y = 0;
      worker.pose('carry');
      lowerBody(nextStance);
      weapon = nextWeapon;
      stance = nextStance;
    },
    dispose() {
      root.removeFromParent();
      gun?.dispose();
      worker.dispose();
      worker.skeleton.dispose();
    }
  };
}
