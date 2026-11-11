import * as T from '../packages/render-effects/three.js';
import {createRailwayKit} from '../packages/railway-visuals/three.js';
import {createRailwayTrainView} from '../packages/railway-visuals/train-view.js';
import {createTrainYardHost} from './train-yard-host.js';
import {mountTrainControls} from '../packages/train-ui/public.js';
import {ANIMAL_MOTION_CATALOG} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/animal-motion-catalog.js';
import {createAnimalPaint} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/animal-motion-paint.js';

const $ = id => document.getElementById(id), canvas = $('yard');
const renderer = new T.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = T.SRGBColorSpace;
renderer.shadowMap.enabled = true;
const scene = new T.Scene(); scene.background = new T.Color(0x8eafac); scene.fog = new T.Fog(0x8eafac, 160, 390);
scene.add(new T.HemisphereLight(0xe8f1dc, 0x354a32, 2));
const sun = new T.DirectionalLight(0xffdeb0, 3); sun.position.set(80, 110, -30); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -150, right: 150, top: 150, bottom: -150, far: 400});
scene.add(sun);
const groundGeometry = new T.PlaneGeometry(280, 220), groundMaterial = new T.MeshStandardMaterial({color: 0x75815a, roughness: 1});
const ground = new T.Mesh(groundGeometry, groundMaterial); ground.rotation.x = -Math.PI / 2; ground.position.set(120, -.015, 85); ground.receiveShadow = true; scene.add(ground);
const platformGeometry = new T.BoxGeometry(76, .05, 4), platformMaterial = new T.MeshStandardMaterial({color: 0xc3af83, roughness: .9});
for (const x of [64, 176]) { const platform = new T.Mesh(platformGeometry, platformMaterial); platform.position.set(x, -.02, 35.5); platform.receiveShadow = true; scene.add(platform); }
const camera = new T.PerspectiveCamera(45, 1, .1, 700), kit = createRailwayKit(T);
let host = createTrainYardHost(), overview = false, distance = 34, retired = false, frame = 0, previous = 0, sequence = 0, controls = null, walkingEnabled = true, lastMode = null, ready = false, stickPointer = null;
const mountId = globalThis.crypto.randomUUID(), keys = new Set(), walks = new Map(), views = new Map(), nativeActors = new Map(), disposers = [];
for (const route of host.routes) scene.add(kit.createCircuit(route.waypoints, route.radiusM).root);
for (const train of host.read().trains) { const view = createRailwayTrainView(T, train.state); views.set(train.stock, view); scene.add(view.root); }
function listen(node, type, fn, options) { node.addEventListener(type, fn, options); disposers.push(() => node.removeEventListener(type, fn, options)); }
function id(kind = 'command') { return mountId + '/' + kind + '/' + ++sequence; }
function message(result) { if (result && !result.ok) $('feedback').textContent = result.reason; }
function releaseWalking() {
  keys.clear(); walks.clear(); stickPointer = null;
  $('walk-thumb').style.transform = 'translate(0px, 0px)';
}
function releaseAll() { releaseWalking(); controls?.releaseInput('host-release'); }
function mountControls(muted = false) {
  controls = mountTrainControls($('movement-slot'), {
    session: host.connector, actorId: 'player', walkingElement: $('walking'), newId: id,
    steamProfile: $('steam-profile').value, muted,
    setWalkingEnabled(enabled) { walkingEnabled = enabled; if (!enabled) releaseWalking(); },
    focusWalking() { canvas.focus(); },
    onError(error) { $('feedback').textContent = error.message; }
  });
  controls.setBlocked(!ready);
}
function renderControls() {
  const current = host.connector.readForActor('player');
  document.body.dataset.playerMode = current.mode;
  $('mode').textContent = current.mode === 'on-foot' ? 'On foot' : current.mode === 'driver' ? 'Driving ' + current.train.stock : 'Riding ' + current.train.stock;
  $('speed').textContent = current.train ? (current.train.speedMps * 3.6).toFixed(1) + ' km/h · ' + current.carId.split('/').slice(-2).join(' ') : 'Walk beside the platform to a named entrance';
  const notched = current.train?.stock === 'steam' && $('steam-profile').value === 'compact-notched';
  $('feedback').textContent = current.train?.hold?.reason ?? (current.mode === 'rider' ? 'Your operator drives one lap and stops at this platform.' : current.mode === 'driver' ? notched ? 'Slide into gear; it stays engaged. N coasts. Pull the chain to brake.' : 'Choose Forward or Reverse, then hold power. Release to brake.' : 'Use WASD, arrow keys or the walking joystick.');
  $('resume').hidden = current.mode !== 'rider' || host.read().services[current.train.stock]?.status !== 'paused';
  if (lastMode !== current.mode && current.mode === 'driver') queueMicrotask(() => {
    if (!retired && host.connector.readForActor('player').mode === 'driver') {
      const target = notched ? [...controls.element.querySelectorAll('[role="slider"]')].find(node => node.getClientRects().length) : controls.element.querySelector('[data-part="driver"]');
      target?.focus();
    }
  });
  lastMode = current.mode;
}
let unsubscribe = host.connector.subscribe(renderControls);
mountControls();
listen($('steam-profile'), 'change', () => {
  const muted = controls.state.feedback.muted;
  releaseAll(); controls.dispose(); lastMode = null; mountControls(muted); renderControls();
  if (host.connector.readForActor('player').mode === 'on-foot') canvas.focus();
});
for (const button of document.querySelectorAll('[data-walk]')) {
  listen(button, 'pointerdown', event => { if (event.button !== 0) return; button.setPointerCapture(event.pointerId); walks.set(event.pointerId, button.dataset.walk.split(',').map(Number)); event.preventDefault(); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, type, event => walks.delete(event.pointerId));
}
const stick = $('walk-stick');
function steer(event) {
  if (stickPointer !== event.pointerId || !walkingEnabled) return;
  const bounds = stick.getBoundingClientRect(), radius = bounds.width / 2 - 19;
  let x = (event.clientX - bounds.left - bounds.width / 2) / radius;
  let y = (event.clientY - bounds.top - bounds.height / 2) / radius;
  const magnitude = Math.hypot(x, y), scale = Math.max(1, magnitude);
  x = magnitude < .13 ? 0 : x / scale; y = magnitude < .13 ? 0 : y / scale;
  walks.set(event.pointerId, [x, y]);
  $('walk-thumb').style.transform = 'translate(' + x * radius + 'px, ' + y * radius + 'px)';
}
listen(stick, 'pointerdown', event => {
  if (event.button !== 0 || !walkingEnabled || stickPointer !== null) return;
  stickPointer = event.pointerId; stick.setPointerCapture(event.pointerId); steer(event); event.preventDefault();
});
listen(stick, 'pointermove', steer);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(stick, type, event => {
  if (stickPointer === event.pointerId) { walks.delete(event.pointerId); stickPointer = null; $('walk-thumb').style.transform = 'translate(0px, 0px)'; }
});
listen(window, 'keydown', event => { if (!walkingEnabled || /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(event.target.tagName)) return;
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); keys.add(event.key); } });
listen(window, 'keyup', event => keys.delete(event.key)); listen(window, 'blur', releaseAll);
listen(document, 'visibilitychange', () => { if (document.hidden) releaseAll(); });
listen($('overview'), 'click', () => { overview = true; }); listen($('follow'), 'click', () => { overview = false; });
listen(canvas, 'wheel', event => { distance = Math.max(18, Math.min(120, distance + event.deltaY * .035)); event.preventDefault(); }, {passive: false});
const saveKey = 'nautilus/two-circuit-yard/v1';
listen($('save'), 'click', () => { localStorage.setItem(saveKey, host.save()); $('load').disabled = false; $('feedback').textContent = 'Saved actors, resources, moving cars and authority.'; });
$('load').disabled = !localStorage.getItem(saveKey);
listen($('load'), 'click', () => { try { const candidate = createTrainYardHost(localStorage.getItem(saveKey));
  const muted = controls.state.feedback.muted;
  releaseAll(); controls.dispose(); unsubscribe(); host.dispose(); host = candidate; lastMode = null; unsubscribe = host.connector.subscribe(renderControls); mountControls(muted); renderControls();
  $('feedback').textContent = 'Restored the same car and resources. Held input is released; the train brakes.';
} catch (error) { $('feedback').textContent = error.message; } });
listen($('resume'), 'click', () => { message(host.resumeRide()); renderControls(); });

const donor = new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/', import.meta.url);
const profile = ANIMAL_MOTION_CATALOG.find(profile => profile.id === 'goat');
try {
  const response = await fetch(new URL(profile.file, donor)); if (!response.ok) throw Error('Native goat data is missing.');
  const data = await response.json(), loader = new T.TextureLoader();
  for (const actor of host.actors) {
    const worker = profile.create(data), paint = await createAnimalPaint(renderer, worker, profile,
      {loadAsync: url => loader.loadAsync(new URL(url, donor).href)}, 'normal', true);
    worker.parts.forEach(part => { part.material = paint.material; part.castShadow = true; });
    worker.pose('neutral', 0); scene.add(worker.root); nativeActors.set(actor.id, {worker, paint});
  }
} catch (error) { $('feedback').textContent = error.message; throw error; }
function draw() {
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== Math.round(rect.width * renderer.getPixelRatio()) || canvas.height !== Math.round(rect.height * renderer.getPixelRatio())) {
    renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
  }
  const snapshot = host.read(), player = snapshot.actors[0];
  for (const train of snapshot.trains) views.get(train.stock).update(train.state);
  for (const actor of snapshot.actors) {
    const model = nativeActors.get(actor.id); model.worker.root.visible = actor.mode === 'on-foot';
    model.worker.root.position.set(actor.position.x, actor.position.h, actor.position.y);
    model.worker.root.updateMatrixWorld(true); model.worker.skeleton.update();
  }
  if (overview) { camera.position.set(120, 220, 220); camera.lookAt(120, 0, 86); }
  else { camera.position.set(player.position.x + distance * .5, distance * .8, player.position.y + distance * .85); camera.lookAt(player.position.x, player.position.h + 1, player.position.y); }
  if (rect.width < 700) {
    const top = $('readout').getBoundingClientRect().bottom + 10;
    const bottom = $('movement-slot').getBoundingClientRect().top - 12;
    const centre = top + Math.max(70, bottom - top) / 2;
    camera.setViewOffset(rect.width, rect.height, 0, rect.height / 2 - centre, rect.width, rect.height);
  } else camera.clearViewOffset();
  camera.updateMatrixWorld(); renderer.render(scene, camera);
  const p = new T.Vector3(player.position.x, player.position.h + (player.mode === 'on-foot' ? 1.8 : 4.2), player.position.y).project(camera);
  $('marker').style.left = (p.x + 1) * rect.width / 2 + 'px'; $('marker').style.top = (1 - p.y) * rect.height / 2 + 'px';
}
function tick(now) {
  if (retired) return;
  const seconds = Math.min(.05, (now - (previous || now)) / 1000); previous = now;
  if (!document.hidden) {
    if (walkingEnabled && host.connector.readForActor('player').walkingAllowed) {
      let x = Number(keys.has('d') || keys.has('ArrowRight')) - Number(keys.has('a') || keys.has('ArrowLeft'));
      let y = Number(keys.has('s') || keys.has('ArrowDown')) - Number(keys.has('w') || keys.has('ArrowUp'));
      for (const value of walks.values()) { x += value[0]; y += value[1]; }
      if (x || y) message(host.walk(x, y, seconds));
    }
    message(host.advance(seconds));
  }
  draw(); frame = requestAnimationFrame(tick);
}
function dispose() {
  if (retired) return; releaseAll(); retired = true; cancelAnimationFrame(frame); controls.dispose(); unsubscribe();
  disposers.splice(0).forEach(remove => remove()); host.dispose(); views.forEach(view => view.dispose()); kit.dispose();
  nativeActors.forEach(({worker, paint}) => { paint.dispose(); worker.skeleton.dispose(); worker.dispose(); });
  groundGeometry.dispose(); groundMaterial.dispose(); platformGeometry.dispose(); platformMaterial.dispose(); renderer.dispose();
}
listen(window, 'pagehide', dispose);
window.trainYard = {get host() { return host; }, get renderer() { return renderer; }, get views() { return views; }, get camera() { return camera; }, get controls() { return controls; },
  read: () => host.read(), readForActor: () => host.connector.readForActor('player'),
  setOverview(value) { overview = value; }, render: () => { draw(); renderControls(); }, dispose};
ready = true; controls.setBlocked(false); renderControls(); draw(); frame = requestAnimationFrame(tick);
