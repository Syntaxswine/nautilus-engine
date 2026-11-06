import * as Three from '@nautilus-engine/renderer/render-effects/three';
import {createFirearmAudio, createFirearmFeedback, FARMYARD_FIREARM_CUES} from '@nautilus-engine/firearm-feedback';
import {createReferenceRig, horseData, horseProfile} from './firearm-feedback-rig.js';

const byId = id => document.getElementById(id);
const canvas = byId('scene'), status = byId('status'), controls = byId('controls');
const weaponInput = byId('weapon'), stanceInput = byId('stance'), aimButton = byId('aim');

// Independent synthetic test signals. These use no donor audio or waveforms.
function practiceClips(context) {
  const ids = [...new Set(Object.values(FARMYARD_FIREARM_CUES)), 'shotgun-pump'];
  return Object.fromEntries(ids.map((id, index) => {
    const pump = id === 'shotgun-pump', rate = 22050;
    const length = Math.ceil((pump ? .135 : .22) * rate);
    const buffer = context.createBuffer(1, length, rate), data = buffer.getChannelData(0);
    let seed = 1204 + index;
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      const decay = pump ? Math.exp(-70 * t) + (t > .062 ? .7 * Math.exp(-88 * (t - .062)) : 0)
        : Math.exp(-(28 - index * 2) * t);
      data[i] = decay * (.34 * noise + .25 * Math.sin(t * 2 * Math.PI * (pump ? 460 : 135 - index * 16)));
    }
    return [id, buffer];
  }));
}

async function start() {
  const response = await fetch(horseData);
  if (!response.ok) throw Error('The native reference rig could not load.');
  const data = await response.json();
  const renderer = new Three.WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new Three.Scene();
  scene.background = new Three.Color('#293833');
  scene.add(new Three.HemisphereLight(0xfff2d5, 0x567765, 2.2));
  const key = new Three.DirectionalLight(0xffe6b5, 2.4);
  key.position.set(2, 4, 4);
  scene.add(key);
  const floor = new Three.Mesh(new Three.PlaneGeometry(30, 30), new Three.MeshStandardMaterial({color: 0x556f59, roughness: .93}));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.013;
  const grid = new Three.GridHelper(16, 32, 0x344a3b, 0x485e49);
  grid.position.y = -.009;
  const marker = new Three.Mesh(new Three.CircleGeometry(.24, 48), new Three.MeshStandardMaterial({color: 0xd0a554, side: Three.DoubleSide}));
  scene.add(floor, grid, marker);
  const camera = new Three.PerspectiveCamera(35, 1, .1, 45);
  const rig = createReferenceRig(data, scene);
  let audio, context, pending = [], sequence = 0, animation, aimingSince = null, closed = false;
  let cueCount = 0, lastWidth = 0, lastHeight = 0;
  const feedback = createFirearmFeedback({
    playCue(request) {
      cueCount++;
      canvas.dataset.cueCount = cueCount;
      return audio?.playCue(request) ?? false;
    }
  });
  const actor = feedback.bindActor({actorId: 'practice', worker: rig.worker, profile: horseProfile});
  const target = {x: 3.15, y: .05, h: 1.22};
  const miss = {...target, y: .55};
  function showRound(result) {
    const cues = result.cues.map(cue => cue.cueId).join(' + ');
    status.value = 'Round ' + result.sequence + ' · miss · ' + cues;
  }

  function draw(milliseconds) {
    if (closed) return;
    try {
      const now = milliseconds / 1000, weapon = weaponInput.value, stance = stanceInput.value;
      const height = stance === 'prone' ? .44 : stance === 'kneel' ? .98 : 1.22;
      while (pending[0]?.at <= now) {
        const round = pending.shift();
        showRound(feedback.commitRound({...round, sequence: ++sequence, actorId: 'practice'}));
      }
      const result = actor.sample({
        now, weapon, pose: {kneel: +(stance === 'kneel'), prone: +(stance === 'prone')},
        aim: aimingSince === null ? null : {target: {...target, h: height}, progress: Three.MathUtils.clamp((now - aimingSince) / .34, 0, 1)}
      }, () => rig.prepare(weapon, stance));
      canvas.dataset.phase = result?.phase ?? 'carry';
      canvas.dataset.supported = String(result?.supported ?? false);
      canvas.dataset.poseRound = String(result?.sequence ?? '');
      canvas.dataset.boreHeight = String(result?.bore.h ?? '');
      marker.position.set(target.x, height, target.y);
      const {clientWidth: width, clientHeight: heightPx} = canvas;
      if (width && heightPx && (width !== lastWidth || heightPx !== lastHeight)) {
        lastWidth = width;
        lastHeight = heightPx;
        renderer.setSize(width, heightPx, false);
        camera.aspect = width / heightPx;
        camera.updateProjectionMatrix();
        const phone = camera.aspect < 1;
        camera.position.set(phone ? 1.45 : 2.65, phone ? 1.60 : 1.90, phone ? 3.0 : 3.25);
        camera.lookAt(phone ? .15 : .7, .72, 0);
        marker.quaternion.copy(camera.quaternion);
      }
      renderer.render(scene, camera);
      animation = requestAnimationFrame(draw);
    } catch (error) {
      status.value = error.message;
      dispose();
      throw error;
    }
  }

  function queue(count) {
    if (pending.length || closed) return;
    if (!context && globalThis.AudioContext) {
      context = new AudioContext();
      const clips = practiceClips(context);
      audio = createFirearmAudio({context, getClip: id => clips[id]});
    }
    if (context?.state === 'suspended') void context.resume().catch(() => {});
    const weapon = weaponInput.value, startAt = performance.now() / 1000;
    const h = stanceInput.value === 'prone' ? .44 : stanceInput.value === 'kneel' ? .98 : 1.22;
    pending = Array.from({length: count}, (_, index) => ({
      at: startAt + index * .14, weapon, origin: {x: 0, y: 0, h}, target: {...miss, h}
    }));
  }
  function toggleAim() {
    aimingSince = aimingSince === null ? performance.now() / 1000 : null;
    aimButton.setAttribute('aria-pressed', String(aimingSince !== null));
  }
  function dispose() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(animation);
    controls.disabled = true;
    feedback.dispose();
    audio?.dispose();
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    rig.dispose();
    for (const object of [floor, grid, marker]) {
      object.geometry.dispose();
      object.material.dispose();
    }
    renderer.dispose();
  }
  aimButton.addEventListener('click', toggleAim);
  byId('single').addEventListener('click', () => queue(1));
  byId('burst').addEventListener('click', () => queue(3));
  window.addEventListener('pagehide', dispose, {once: true});
  controls.disabled = false;
  status.value = 'Ready';
  animation = requestAnimationFrame(draw);
}

start().catch(error => {
  status.value = error.message;
  throw error;
});
