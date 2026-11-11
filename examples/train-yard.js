import * as T from '../packages/render-effects/three.js';
import {createRailwayKit} from '../packages/railway-visuals/three.js';
import {createRailwayTrainView} from '../packages/railway-visuals/train-view.js';
import {createTrainYardHost} from './train-yard-host.js';
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
let host = createTrainYardHost(), overview = false, distance = 34, retired = false, frame = 0, previous = 0, sequence = 0, driveLease = null;
const mountId = globalThis.crypto.randomUUID(), keys = new Set(), walks = new Map(), views = new Map(), nativeActors = new Map(), disposers = [];
for (const route of host.routes) scene.add(kit.createCircuit(route.waypoints, route.radiusM).root);
for (const train of host.read().trains) { const view = createRailwayTrainView(T, train.state); views.set(train.stock, view); scene.add(view.root); }
function listen(node, type, fn, options) { node.addEventListener(type, fn, options); disposers.push(() => node.removeEventListener(type, fn, options)); }
function id() { return mountId + '/' + ++sequence; }
function message(result) { if (result && !result.ok) $('feedback').textContent = result.reason; }
function releaseDrive() {
  const lease = driveLease; driveLease = null;
  if (lease) host.connector.dispatch({type: 'release', actorId: 'player', commandId: id(), leaseId: lease});
}
function releaseAll() { keys.clear(); walks.clear(); releaseDrive(); }
function drive(direction) {
  releaseDrive();
  const current = host.connector.readForActor('player');
  if (current.mode !== 'driver') return;
  const leaseId = id();
  const result = host.connector.dispatch({type: 'drive', actorId: 'player', commandId: id(), trainId: current.trainId,
    expected: current.expected, leaseId, direction, power: direction === 'neutral' ? 0 : 1, brake: direction === 'neutral' ? 1 : 0});
  if (result.ok) driveLease = leaseId;
  message(result);
}
function renderControls() {
  const current = host.connector.readForActor('player');
  $('mode').textContent = current.mode === 'on-foot' ? 'On foot' : current.mode === 'driver' ? 'Driving ' + current.train.stock : 'Riding ' + current.train.stock;
  $('speed').textContent = current.train ? (current.train.speedMps * 3.6).toFixed(1) + ' km/h · ' + current.carId.split('/').slice(-2).join(' ') : 'Walk beside the platform to a named entrance';
  $('walking').hidden = current.mode !== 'on-foot'; $('reference-drive').hidden = current.mode !== 'driver'; $('riding').hidden = current.mode !== 'rider';
  $('feedback').textContent = current.train?.hold?.reason ?? (current.mode === 'rider' ? 'The station operator drives one lap, brakes and stops at the platform.' : current.mode === 'driver' ? 'Hold Forward or Reverse. Release to brake. Stop before changing direction.' : 'WASD or arrows to walk. Cab and coach entrances offer Enter.');
  const actions = current.actions.filter(action => action.enabled || action.code !== 'OUT_OF_REACH');
  const signature = JSON.stringify(actions.map(a => [a.id, a.label, a.enabled, a.reason]));
  if ($('actions').dataset.signature !== signature) {
    $('actions').dataset.signature = signature; $('actions').replaceChildren();
    for (const action of actions) {
      const button = document.createElement('button'); button.textContent = action.label; button.disabled = !action.enabled;
      button.title = action.reason ?? action.label; button.dataset.actionId = action.id;
      button.addEventListener('click', () => {
        const live = host.connector.readForActor('player').actions.find(item => item.id === action.id);
        if (live) { releaseAll(); message(host.connector.dispatch({...live.command, commandId: id()})); }
        renderControls();
      });
      $('actions').append(button);
    }
    if (!actions.length) { const hint = document.createElement('small'); hint.textContent = 'No entrance in reach.'; $('actions').append(hint); }
  }
  $('resume').hidden = current.mode !== 'rider' || host.read().services[current.train.stock]?.status !== 'paused';
}
let unsubscribe = host.connector.subscribe(renderControls);
for (const button of document.querySelectorAll('[data-walk]')) {
  listen(button, 'pointerdown', event => { if (event.button !== 0) return; button.setPointerCapture(event.pointerId); walks.set(event.pointerId, button.dataset.walk.split(',').map(Number)); event.preventDefault(); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, type, event => walks.delete(event.pointerId));
}
for (const button of document.querySelectorAll('[data-drive]')) {
  listen(button, 'pointerdown', event => { if (event.button !== 0) return; button.setPointerCapture(event.pointerId); drive(button.dataset.drive); event.preventDefault(); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, type, releaseDrive);
  listen(button, 'keydown', event => { if ([' ', 'Enter'].includes(event.key) && !event.repeat) { event.preventDefault(); drive(button.dataset.drive); } });
  listen(button, 'keyup', event => { if ([' ', 'Enter'].includes(event.key)) releaseDrive(); });
}
listen(window, 'keydown', event => { if (/^(INPUT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); keys.add(event.key); } });
listen(window, 'keyup', event => keys.delete(event.key)); listen(window, 'blur', releaseAll);
listen(document, 'visibilitychange', () => { if (document.hidden) releaseAll(); });
listen($('overview'), 'click', () => { overview = true; }); listen($('follow'), 'click', () => { overview = false; });
listen(canvas, 'wheel', event => { distance = Math.max(18, Math.min(120, distance + event.deltaY * .035)); event.preventDefault(); }, {passive: false});
const saveKey = 'nautilus/two-circuit-yard/v1';
listen($('save'), 'click', () => { localStorage.setItem(saveKey, host.save()); $('load').disabled = false; $('feedback').textContent = 'Saved actors, resources, moving cars and authority.'; });
$('load').disabled = !localStorage.getItem(saveKey);
listen($('load'), 'click', () => { try { const candidate = createTrainYardHost(localStorage.getItem(saveKey));
  releaseAll(); unsubscribe(); host.dispose(); host = candidate; unsubscribe = host.connector.subscribe(renderControls); renderControls();
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
  camera.updateMatrixWorld(); renderer.render(scene, camera);
  const p = new T.Vector3(player.position.x, player.position.h + (player.mode === 'on-foot' ? 1.8 : 4.2), player.position.y).project(camera);
  $('marker').style.left = (p.x + 1) * rect.width / 2 + 'px'; $('marker').style.top = (1 - p.y) * rect.height / 2 + 'px';
}
function tick(now) {
  if (retired) return;
  const seconds = Math.min(.05, (now - (previous || now)) / 1000); previous = now;
  if (!document.hidden) {
    if (host.connector.readForActor('player').walkingAllowed) {
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
  if (retired) return; releaseAll(); retired = true; cancelAnimationFrame(frame); unsubscribe();
  disposers.splice(0).forEach(remove => remove()); host.dispose(); views.forEach(view => view.dispose()); kit.dispose();
  nativeActors.forEach(({worker, paint}) => { paint.dispose(); worker.skeleton.dispose(); worker.dispose(); });
  groundGeometry.dispose(); groundMaterial.dispose(); platformGeometry.dispose(); platformMaterial.dispose(); renderer.dispose();
}
listen(window, 'pagehide', dispose);
window.trainYard = {get host() { return host; }, get renderer() { return renderer; }, get views() { return views; }, get camera() { return camera; },
  read: () => host.read(), readForActor: () => host.connector.readForActor('player'),
  setOverview(value) { overview = value; }, render: () => { draw(); renderControls(); }, dispose};
renderControls(); draw(); frame = requestAnimationFrame(tick);
