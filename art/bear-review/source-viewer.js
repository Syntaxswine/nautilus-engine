// Source-only artist bench. Never included in the deployed editor or package.
const prefix = '/artifacts/bear-review/source/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/';
const source = name => import(prefix + name);
const T = await source('vendor/three.module.js');
const {createBearWorker, BEAR_PROFILE} = await source('bear-worker.js');
const {createBearPaint} = await source('bear-paint.js');
const {createRedHatCap} = await source('red-hat-model.js');
const {createWeaponModel, WEAPON_MODELS} = await source('weapon-models.js');
const {createBattlePosture} = await source('battle-posture.js');
const {createCrawlMotion} = await source('crawl-motion.js');
const {createArmedIdle} = await source('armed-idle-motion.js');
const {createMammalMotion} = await source('animal-motion.js');
const {createWorkerLocomotion} = await source('worker-locomotion.js');
const data = await fetch(prefix + 'bear-10k-data.json').then(response => { if (!response.ok) throw Error('Pinned bear data unavailable'); return response.json(); });
const host = document.querySelector('#views'), loader = new T.TextureLoader();
const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.setClearColor(0x435548); host.append(renderer.domElement);
const scene = new T.Scene(), camera = new T.OrthographicCamera();
scene.add(new T.HemisphereLight(0xfff8e8, 0x737775, 2));
const sun = new T.DirectionalLight(0xfff2dd, 2.3); sun.position.set(3, 5, 4); scene.add(sun);
const grid = new T.GridHelper(10, 10, 0xa8ac84, 0x6f805b); grid.position.y = -.004; scene.add(grid);
const framePoints = [new T.Vector3(0, 0, -.5), new T.Vector3(0, 2, -.5), new T.Vector3(0, 2, .5), new T.Vector3(0, 0, .5)];
const frameGeometry = new T.BufferGeometry().setFromPoints(framePoints), frameMaterial = new T.LineBasicMaterial({color: 0xe5c78d});
const doorway = new T.Line(frameGeometry, frameMaterial); doorway.position.x = -.7; scene.add(doorway);
let actors = [], disposed = false;
let config = {weapon: 'rifle', pose: 'carry', time: 0, grey: false, view: 'three', turnaround: false};
function release(actor) {
  if (!actor) return;
  actor.motion?.dispose?.(); actor.posture?.resetTail(); actor.cap?.dispose(); actor.paint?.dispose();
  actor.worker.equipWeapon(); if (!actor.usesInternalRifle) actor.weapon.dispose(); actor.worker.root.removeFromParent(); actor.worker.dispose();
}
async function create(outfit) {
  const actor = {outfit, worker: createBearWorker(data), weapon: createWeaponModel(config.weapon)};
  try {
    actor.worker.equipWeapon(actor.weapon);
    actor.paint = createBearPaint(renderer, actor.worker, await loader.loadAsync(BEAR_PROFILE.outfitPaints[outfit]));
    if (outfit === 'red-hats') actor.cap = await createRedHatCap(renderer, actor.worker, BEAR_PROFILE, loader);
    if (config.pose === 'idle') actor.motion = createArmedIdle(actor.worker, BEAR_PROFILE, {weapon: actor.weapon});
    if (config.pose === 'crawl') actor.motion = createCrawlMotion(actor.worker, BEAR_PROFILE);
    if (config.pose === 'walk') actor.motion = createWorkerLocomotion(actor.worker, BEAR_PROFILE);
    if (config.pose === 'aim-fire') {
      if (config.weapon !== 'rifle') throw Error('This donor mammal reference family uses the internal rifle only; another weapon must not be relabelled as supported.');
      actor.worker.equipWeapon(); actor.weapon.dispose(); actor.weapon = actor.worker.rifle;
      actor.usesInternalRifle = true; actor.motion = createMammalMotion(actor.worker, BEAR_PROFILE);
    }
    if (['kneel', 'prone'].includes(config.pose)) actor.posture = createBattlePosture(actor.worker, BEAR_PROFILE);
    scene.add(actor.worker.root); return actor;
  } catch (error) { release(actor); throw error; }
}
function pose(actor) {
  const {worker, motion} = actor;
  if (config.pose === 'idle') actor.state = motion.at(config.time);
  else if (config.pose === 'crawl') actor.state = motion.at(motion.stride * config.time);
  else if (config.pose === 'walk') actor.state = motion.apply({heading: 0, distance: config.time, blend: 1, pose: {}});
  else if (config.pose === 'aim-fire') { motion.apply(config.time); actor.state = motion.diagnostics(); }
  else {
    worker.pose(config.pose === 'neutral' ? 'neutral' : 'carry');
    if (actor.posture) { actor.posture.apply({heading: 0, distance: 0, blend: 0, pose: {[config.pose]: 1}}); actor.posture.ground(); }
    actor.state = worker.diagnostics();
  }
  // This is an in-place presentation comparison, with no world movement.
  worker.root.position.x = worker.root.position.z = 0;
  worker.root.updateMatrixWorld(true); worker.skeleton.update();
  worker.setGrey(config.grey);
  if (!config.grey) for (const part of worker.parts) part.material = actor.paint.material;
  actor.cap?.setGrey(config.grey);
}
function draw() {
  if (disposed) return;
  const width = host.clientWidth, height = host.clientHeight;
  renderer.setSize(width, height, false); renderer.setScissorTest(true);
  actors.forEach(pose);
  const views = config.turnaround ? ['front', 'side', 'back', 'three'] : [config.view];
  const low = ['prone', 'crawl'].includes(config.pose), metres = config.metres ?? (low ? 3.5 : 2.65);
  doorway.visible = !config.turnaround && config.metres == null;
  for (let a = 0; a < actors.length; a++) for (let i = 0; i < views.length; i++) {
    const cols = config.turnaround ? 4 : 2, rows = config.turnaround ? 2 : 1;
    const col = config.turnaround ? i : a, row = config.turnaround ? a : 0;
    const x = Math.floor(width * col / cols), y = Math.floor(height * (rows - 1 - row) / rows), w = Math.floor(width / cols), h = Math.floor(height / rows);
    const azimuth = {front: Math.PI / 2, side: 0, back: -Math.PI / 2, three: Math.PI / 4}[views[i]];
    const elevation = views[i] === 'three' ? .16 : 0, focus = config.focus ? new T.Vector3(...config.focus) : new T.Vector3(low ? -.12 : .03, low ? .44 : .88, 0);
    camera.left = -metres * w / h / 2; camera.right = metres * w / h / 2; camera.top = metres / 2; camera.bottom = -metres / 2;
    camera.near = .1; camera.far = 30;
    camera.position.copy(focus).add(new T.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)).multiplyScalar(6));
    camera.lookAt(focus); camera.updateProjectionMatrix();
    actors.forEach((actor, j) => { actor.worker.root.visible = j === a; });
    renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.render(scene, camera);
  }
  actors.forEach(actor => { actor.worker.root.visible = true; }); renderer.setScissorTest(false);
  document.querySelector('.labels').innerHTML = config.turnaround
    ? '<span>Top: normal · Bottom: Red Hat · Columns: front / side / back / three-quarter</span>'
    : '<span>Normal painting</span><span>Red Hat painting and native fitted cap</span>';
  document.querySelector('#status').textContent = `${WEAPON_MODELS[config.weapon].label} · ${config.pose} · sample ${config.time} · ${data.triangles.toLocaleString()} body triangles · painted source reference`;
}
async function set(values) {
  const next = {...config, ...values};
  const rebuild = !actors.length || next.weapon !== config.weapon || next.pose !== config.pose;
  config = next;
  if (rebuild) {
    actors.forEach(release); actors = [];
    for (const outfit of ['normal', 'red-hats']) actors.push(await create(outfit));
  }
  draw(); return diagnostics();
}
function diagnostics() { return {config, nativeScale: actors.map(actor => actor.worker.root.scale.toArray()), actors: actors.map(actor => ({outfit: actor.outfit, state: actor.state, capTriangles: actor.cap?.triangles ?? 0})), renderer: {memory: {...renderer.info.memory}, render: {...renderer.info.render}}, threeRevision: T.REVISION}; }
function dispose() {
  if (disposed) return;
  disposed = true; actors.forEach(release); actors = []; grid.geometry.dispose(); grid.material.dispose(); frameGeometry.dispose(); frameMaterial.dispose();
  renderer.dispose(); renderer.forceContextLoss();
}
window.bearReference = {set, diagnostics, dispose, get ready() { return actors.length === 2; }};
window.addEventListener('pagehide', dispose, {once: true});
try { await set({}); } catch (error) { document.querySelector('#error').textContent = error.stack; throw error; }
