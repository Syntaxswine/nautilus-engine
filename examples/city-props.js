import * as T from '../packages/render-effects/three.js';
import {CITY_PROPS, cityProp, cityPropURLs} from '../packages/city-props/index.js';
import {CITY_PAINT_URL, createCityPropLibrary} from '../packages/city-props/three.js';

const canvas = document.querySelector('canvas');
const renderer = new T.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.19;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
const camera = new T.OrthographicCamera();
const daylight = new T.HemisphereLight(0xf8f2df, 0x796c61, 2.09);
const sun = new T.DirectionalLight(0xffe6bc, 2.55);
sun.position.set(-4, 8, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -7, right: 7, top: 7, bottom: -7, far: 27});
sun.shadow.bias = -.00038;
sun.shadow.normalBias = .017;
const fill = new T.DirectionalLight(0xc5dce7, 1.25);
fill.position.set(5, 4, -4);
scene.add(daylight, sun, fill);
const group = new T.Group();
scene.add(group);
const ground = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({color: 0xb3a48a, roughness: .96}));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -.054;
ground.receiveShadow = true;
scene.add(ground);
const atlas = await new T.TextureLoader().loadAsync(CITY_PAINT_URL);
atlas.colorSpace = T.SRGBColorSpace;
atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const library = createCityPropLibrary(T, atlas);
const props = [], stageObjects = [];
let mode = 'front', angle = .46, target = new T.Vector3(), size = 7.8, eyeRise = 8.7, drag = null;
const field = id => document.getElementById(id);
const modeData = {
  front: ['Storefront', 'Tall glazing and transoms, a recessed door, and a projecting cornice with painted dentils. Inspect the individual bays the hanging trade signs, and the room cornice below.', CITY_PROPS.filter(p => p.family === 'Storefront & trim')],
  street: ['Shops & rooms', 'A row of shop bays, a glazed counter, and a furnished parlor. The downloadable map adds a second shop and a bedroom.', CITY_PROPS],
  furniture: ['Eastlake furniture', 'Angular walnut and ebonized cherry frames, incised fans, turned spindles, patterned wool, and marble.', CITY_PROPS.filter(p => p.family === 'Eastlake furniture')],
  shop: ['Shop fixtures', 'One-metre sales counters and wall bays, a corner, glass case, cloth rack, bins, and scale.', CITY_PROPS.filter(p => p.family === 'Shop fixtures')],
  lamps: ['Oil lighting', 'Table, reflector, pendant, hand, and entry lamps in paired lit and unlit states. The lit examples include a wick glow.', CITY_PROPS.filter(p => p.family === 'Oil lighting')]
};

function box([x, y, z], [w, h, d], color) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({color, roughness: .89}));
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.castShadow = h > .09;
  group.add(mesh);
  stageObjects.push(mesh);
}
function place(name, x, z, turn = 0, {showLight = false} = {}) {
  const id = 'city1880-' + name, spec = cityProp(id);
  const instance = library.build(id);
  instance.root.position.set(x, 0, z);
  instance.root.rotation.y = turn;
  group.add(instance.root);
  props.push(instance);
  if (showLight && spec.lit) {
    const anchor = new T.Vector3(...spec.light).applyAxisAngle(new T.Vector3(0, 1, 0), turn);
    const light = new T.PointLight(0xffa94a, 4.5, 2.8, 2);
    light.position.copy(anchor).add(instance.root.position);
    group.add(light);
    stageObjects.push(light);
  }
}
function planks(x, z, w, d) {
  const count = Math.ceil(w / .33), step = w / count;
  for (let i = 0; i < count; i++) box([x - w / 2 + step * (i + .5), -.028, z],
    [step - .007, .053, d], [0x856449, 0x967653, 0x8a6d51, 0x7d5d42, 0x9b7d5f][i % 5]);
  box([x, -.061, z], [w, .035, d + .04], 0x534335);
}
function mount(spec, x, z) {
  if (spec.form.startsWith('room-cornice') || spec.form.startsWith('hanging-sign')) {
    box([x, 1.052, z - .542], [1.027, 2.104, .105], 0x788176);
    if (spec.form.endsWith('-corner')) box([x - .541, 1.052, z], [.105, 2.104, 1.02], 0x899284);
  } else if (spec.mounting === 'wall') {
    box([x, .92, z - .545], [.64, 1.84, .096], 0x746450);
  }
  if (spec.mounting === 'ceiling') {
    for (const dx of [-.36, .36]) box([x + dx, 1.055, z - .31], [.075, 2.11, .075], 0x534539);
    box([x, 2.147, z], [.82, .054, .67], 0x655441);
  }
}
function paintedPlane(paint, size, at) {
  const map = new T.CanvasTexture(paint);
  map.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(new T.PlaneGeometry(...size), new T.MeshStandardMaterial({map, roughness: .88}));
  mesh.position.set(...at);
  mesh.receiveShadow = true;
  group.add(mesh);
  stageObjects.push(mesh);
}
function parlorPaint() {
  const paint = document.createElement('canvas');
  paint.width = 1024;
  paint.height = 440;
  const context = paint.getContext('2d');
  context.fillStyle = '#b5a384';
  context.fillRect(0, 0, paint.width, paint.height);
  context.fillStyle = '#826954';
  context.fillRect(0, 278, paint.width, 162);
  for (let x = 21; x < 1004; x += 163) {
    context.strokeStyle = '#594632';
    context.lineWidth = 5;
    context.strokeRect(x, 302, 146, 119);
    context.strokeStyle = '#a7896a';
    context.lineWidth = 3;
    context.strokeRect(x + 5, 307, 136, 109);
  }
  context.fillStyle = '#6b5644';
  context.fillRect(0, 272, paint.width, 9);
  context.fillRect(0, 430, paint.width, 10);
  paintedPlane(paint, [4.9, 2.115], [2.45, 1.06, -2.654]);
}
function storefront() {
  planks(-.024, -1.455, 5.08, 3.04);
  box([.02, -.058, .82], [5.76, .116, 1.77], 0x887b68);
  for (const x of [-2.4, -1.45, -.48, .49, 1.46, 2.42]) box([x, .002, .83], [.926, .021, 1.63], 0xb0a38a);
  box([-2.59, 1.06, -.036], [.174, 2.12, .234], 0x775b4a);
  box([-.017, 1.052, -2.79], [5.06, 2.104, .144], 0x738072);
  for (const [id, x] of [['shop-window', -2], ['shop-window', -1], ['shop-entry', 0], ['shop-window', 1], ['shop-corner', 2]]) {
    place(id, x, 0);
  }
  place('shop-window', 2, -1, Math.PI / 2);
  place('shop-window', 2, -2, Math.PI / 2);
  place('shelf-stocked', -1.97, -2.218);
  place('apothecary', -.97, -2.218);
  place('bolt-rack', 1.165, -1.873);
  place('glass-case', -1.63, -1.09);
  place('scale-counter', -.63, -1.09);
  place('shop-pendant-lit', .82, -1.34, 0, {showLight: true});
  place('hanging-sign-goods', -2.59, .578);
}
function sample() {
  planks(0, .07, 9.8, 5.85);
  box([-2.45, 1.06, -2.74], [4.9, 2.12, .17], 0x7b806a);
  box([2.45, 1.06, -2.74], [4.9, 2.12, .17], 0xb5a384);
  box([0, 1.06, -1.655], [.14, 2.12, 2], 0x8c8271);
  place('room-cornice-corner', .56, -2.165);
  for (const x of [1.56, 2.56, 3.56, 4.56]) place('room-cornice', x, -2.165);
  place('room-cornice', .56, -1.165, Math.PI / 2);
  parlorPaint();
  box([-2.53, 2.165, -1.24], [.092, .09, 2.97], 0x5c4d3b);
  place('shelf-stocked', -4.09, -2.165);
  place('apothecary', -3.09, -2.165);
  place('shelf-empty', -2.09, -2.165);
  place('bolt-rack', -.88, -2.17, -.12);
  place('scale-counter', -4.04, -.46);
  place('counter', -3.04, -.46);
  place('glass-case', -2.04, -.46);
  place('corner-counter', -1.04, -.46);
  place('counter', -1.04, -1.46, -Math.PI / 2);
  place('dry-bin', -3.98, 1.64, .18);
  place('shop-pendant-lit', -2.53, .19, 0, {showLight: true});
  place('hand-lantern-lit', -.91, 1.61, 0, {showLight: true});
  place('settee', 2.13, -2.04);
  place('dresser', 4.05, -2.04);
  place('reflector-sconce-lit', 3.26, -2.16, 0, {showLight: true});
  place('table-lamp-lit', 3.45, -.67, 0, {showLight: true});
  place('armchair', 1.0, .33, .56);
  place('dining-table', 2.36, .49, .10);
  place('side-chair', 2.05, 1.44, Math.PI - .13);
  place('rocker', 4.08, 1.41, -.67);
}
function lineup(items, lamps) {
  if (lamps) {
    planks(0, 0, 8.8, 3.78);
    for (const [i, spec] of items.entries()) {
      const x = (Math.floor(i / 2) - 2) * 1.61;
      const z = i % 2 === 0 ? -.98 : 1.04;
      mount(spec, x, z);
      place(spec.id.slice(9), x, z, 0, {showLight: true});
    }
    return;
  }
  planks(0, 0, 8, 6.1);
  const order = mode === 'furniture' ? [3, 8, 7, 4, 6, 5, 0, 1, 2] : [3, 4, 5, 0, 1, 2, 6, 7, 8];
  for (const [i, slot] of order.entries()) {
    const spec = items[slot], x = (i % 3 - 1) * 2.48, z = (Math.floor(i / 3) - 1) * 1.99;
    place(spec.id.slice(9), x, z, i % 2 ? .09 : -.18);
  }
}
function clear() {
  for (const prop of props.splice(0)) prop.dispose();
  for (const object of stageObjects.splice(0)) {
    object.removeFromParent();
    object.geometry?.dispose();
    object.material?.map?.dispose();
    object.material?.dispose();
  }
}
function draw() {
  const {clientWidth: w, clientHeight: h} = canvas;
  if (w < 2 || h < 2) return;
  renderer.setSize(w, h, false);
  const aspect = w / h, span = size * Math.max(1, 1.36 / aspect);
  Object.assign(camera, {left: -span * aspect / 2, right: span * aspect / 2, top: span / 2, bottom: -span / 2, near: .05, far: 120});
  camera.position.set(target.x + 12 * Math.sin(angle), target.y + eyeRise, target.z + 12 * Math.cos(angle));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}
function links(spec) {
  const list = field('assets');
  list.replaceChildren();
  if (!spec) return;
  const urls = cityPropURLs(spec.id);
  for (const [name, href] of [['Model (.gltf)', urls.model], ['Mesh buffer (.bin)', urls.buffer],
    ['Shared paint atlas', urls.atlas], ['Panel and dentil skin', urls.trim]]) {
    const li = document.createElement('li'), a = document.createElement('a');
    a.textContent = name; a.href = href; a.download = ''; li.append(a); list.append(li);
  }
}
function view(id = '') {
  clear();
  const [title, description, items] = modeData[mode], spec = id ? cityProp(id) : null;
  field('title').textContent = spec?.name ?? title;
  field('description').textContent = spec ? spec.note || spec.family + ' · ' + spec.cells.join(' × ') + ' tile footprint.' : description;
  links(spec);
  const dark = mode === 'lamps';
  const corniceDetail = spec?.form.startsWith('room-cornice');
  const signDetail = spec?.form.startsWith('hanging-sign');
  eyeRise = corniceDetail ? 2.9 : mode === 'front' ? 5.35 : 8.7;
  scene.background = new T.Color(dark ? 0x343d43 : 0xded3be);
  scene.fog = new T.FogExp2(scene.background, .017);
  daylight.intensity = dark ? .76 : 2.09;
  sun.intensity = dark ? .76 : 2.55;
  fill.intensity = dark ? 1.18 : 1.25;
  ground.material.color.set(dark ? 0x4f5557 : 0xb3a48a);
  if (spec) {
    planks(0, 0, Math.max(1.8, spec.cells[0] + .55), Math.max(1.58, spec.cells[1] + .45));
    mount(spec, 0, 0);
    place(spec.id.slice(9), 0, 0, 0, {showLight: true});
    size = spec.cells[0] === 2 ? 3.22 : 2.67;
    const architectural = spec.family === 'Storefront & trim';
    if (architectural) size = 3.25;
    target.set(0, architectural || spec.mounting === 'ceiling' ? 1.08 : spec.mounting === 'wall' ? .9 : .54, 0);
    if (corniceDetail) {
      size = 1.53;
      target.set(-.07, 1.79, -.16);
    }
    if (signDetail) {
      size = 1.57;
      angle = .98;
      target.set(0, 1.66, .04);
    }
  } else {
    if (mode === 'front') storefront();
    else if (mode === 'street') sample();
    else lineup(items, dark);
    size = mode === 'front' ? 5.38 : mode === 'street' ? 8.05 : dark ? 5.55 : 7.12;
    target.set(0, mode === 'front' ? 1.10 : .63, mode === 'front' ? -.65 : 0);
  }
  draw();
}
function collection(next) {
  mode = next; angle = next === 'front' ? .51 : next === 'lamps' ? .24 : .43;
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === next));
  field('specimen').replaceChildren(new Option('All in this collection', ''),
    ...modeData[next][2].map(p => new Option(p.name, p.id)));
  view();
}
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => collection(button.dataset.mode));
field('specimen').addEventListener('change', () => view(field('specimen').value));
field('turn-left').addEventListener('click', () => { angle -= Math.PI / 4; draw(); });
field('turn-right').addEventListener('click', () => { angle += Math.PI / 4; draw(); });
canvas.addEventListener('pointerdown', e => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (drag === null) return; angle += (drag - e.clientX) * .008; drag = e.clientX; draw(); });
canvas.addEventListener('lostpointercapture', () => { drag = null; });
const resize = new ResizeObserver(draw);
resize.observe(canvas);
window.addEventListener('pagehide', e => {
  if (e.persisted) return;
  resize.disconnect();
  clear(); library.dispose(); atlas.dispose();
  ground.geometry.dispose(); ground.material.dispose(); renderer.dispose();
}, {once: true});
collection('front');
field('status').textContent = CITY_PROPS.length + ' pieces and lighting variants';
document.documentElement.dataset.cityPropsReady = 'true';
