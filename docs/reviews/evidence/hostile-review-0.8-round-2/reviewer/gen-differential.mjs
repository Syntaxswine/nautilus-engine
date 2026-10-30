// Differential test of the rewritten building generator against the reviewed one.
//   node gen-differential.mjs <sandbox tree> <baseline tree> [calls] [variants]
// 1. Unit level: copies of both three.js files (each with `export {Surfaces}`
//    appended) receive identical random quad/tri/box/cylinder calls, including
//    near-threshold, non-planar, flipped and fractional-phase cases and channel
//    re-entry; every batch's float32 bits are compared.
// 2. Model level: random recipe variants (not the 48 shipped designs) are built
//    by both renderers and compared with an independent digest that also covers
//    materials, setView visibility for every view and the door swing.
// A negative control proves each comparison can fail.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL, fileURLToPath} from 'node:url';

const [SANDBOX, BASELINE] = process.argv.slice(2, 4).map(p => path.resolve(p));
const CALLS = Number(process.argv[4] || 20000), VARIANTS = Number(process.argv[5] || 240);
const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.join(here, 'gen-diff');
const T = await import(pathToFileURL(path.join(SANDBOX, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
const sha = b => createHash('sha256').update(b).digest('hex');

function copyTree(name, tree) {
  const dir = path.join(work, name);
  fs.mkdirSync(dir, {recursive: true});
  for (const f of ['index.js', 'designs.js']) fs.copyFileSync(path.join(tree, 'packages/building-catalog', f), path.join(dir, f));
  const src = fs.readFileSync(path.join(tree, 'packages/building-catalog/three.js'), 'utf8');
  fs.writeFileSync(path.join(dir, 'three.js'), src + '\nexport {Surfaces};\n');
  return {dir, sourceSha: sha(src)};
}
const oldCopy = copyTree('old', BASELINE), newCopy = copyTree('new', SANDBOX);
const OLD = await import(pathToFileURL(path.join(oldCopy.dir, 'three.js')).href);
const NEW = await import(pathToFileURL(path.join(newCopy.dir, 'three.js')).href);
const {DESIGNS, MATERIALS, compileBuilding} = await import(pathToFileURL(path.join(SANDBOX, 'packages/building-catalog/index.js')).href);

// Deterministic generator (mulberry32).
function rng(seed) {return () => {seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;};}
const R = rng(20261030);
const pick = list => list[Math.floor(R() * list.length)];
const num = () => {const k = R();
  if (k < .25) return Math.round((R() * 40 - 20) * 2) / 2;          // half-metre grid
  if (k < .5) return Math.round(R() * 40 - 20);                     // integers
  if (k < .55) return (R() < .5 ? -1 : 1) * R() * 1e-7;             // near zero
  if (k < .6) return -0;                                            // signed zero
  return R() * 40 - 20;};                                           // arbitrary
const vec = () => [num(), num(), num()];
const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]), mul = (a, n) => a.map(v => v * n);
const mats = [...MATERIALS.map(m => m.id), 'floor', 'interior', 'glass', 'metal', 'not-a-material'];
const kinds = ['exterior', 'interior', 'floor', 'trim', 'roof', 'details', 'glazing', 'tower', 'door-leaf'];

function bits(values) {const f = Float32Array.from(values, v => v); return Buffer.from(f.buffer);} // old arrays hold doubles; Float32BufferAttribute rounded them
function batchesOf(s, isNew) {
  const out = [];
  for (const [key, b] of s.batches) {
    const take = list => isNew ? Buffer.from(list.values().slice().buffer) : bits(list);
    out.push({key, material: b.material, kind: b.kind, level: b.level, p: take(b.positions), n: take(b.normals), u: take(b.uvs)});
  }
  return out;
}
function compareBatches(a, b) {
  if (a.length !== b.length) return 'batch count ' + a.length + ' vs ' + b.length;
  for (let i = 0; i < a.length; i++) {
    for (const k of ['key', 'material', 'kind', 'level']) if (a[i][k] !== b[i][k]) return 'batch ' + i + ' ' + k + ' ' + a[i][k] + ' vs ' + b[i][k];
    for (const k of ['p', 'n', 'u']) if (!a[i][k].equals(b[i][k])) {
      const x = new Uint32Array(a[i][k].buffer, a[i][k].byteOffset, a[i][k].length / 4), y = new Uint32Array(b[i][k].buffer, b[i][k].byteOffset, b[i][k].length / 4);
      let at = 0; while (at < Math.min(x.length, y.length) && x[at] === y[at]) at++;
      return 'batch ' + a[i].key + ' ' + k + ' differs at float ' + at + ' (lengths ' + x.length + '/' + y.length + ')';
    }
  }
  return null;
}

// ---------- 1. unit level ----------
function randomCall() {
  const op = R(), mat = pick(mats), seed = Math.floor(R() * 2 ** 31);
  if (op < .6) {
    // Parallelogram most of the time; sometimes non-planar or degenerate.
    const a = vec(), e1 = R() < .1 ? mul(vec(), 1e-7) : vec(), e2 = R() < .1 ? mul(vec(), 1e-7) : vec(), b = add(a, e1), c = add(b, e2);
    let d = add(a, e2); if (R() < .15) d = add(d, mul(vec(), R() < .5 ? 1e-7 : .3));
    const n0 = sub(b, a), normal = R() < .2 ? null : R() < .5 ? vec() : mul([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], R() < .5 ? 1 : -1);
    const phase = () => {const k = R(); return k < .4 ? 0 : k < .6 ? Math.round(R() * 6 - 3) : k < .8 ? R() * 6 - 3 : Math.round((R() * 6 - 3) * 2) / 2;};
    return {op: 'quad', args: [a, b, c, d, mat, normal, phase(), phase()], n0, seed};
  }
  if (op < .8) return {op: 'tri', args: [vec(), vec(), vec(), mat, R() < .5 ? null : [[R() * 3, R() * 3], [R() * 3, R() * 3], [R() * 3, R() * 3]]]};
  if (op < .95) return {op: 'box', args: [vec(), [Math.abs(num()) + .01, Math.abs(num()) + .01, R() < .2 ? .03 : Math.abs(num()) + .01], mat, R() < .3 ? 0 : R() * 7 - 3.5, R() < .5]};
  return {op: 'cylinder', args: [vec(), Math.abs(num()) + .05, Math.abs(num()) + .05, mat]};
}
const unit = {calls: CALLS, sessions: 0, identical: 0, different: [], threw: 0, threwMismatch: [], triangles: 0};
const SESSION = 25;
for (let start = 0; start < CALLS; start += SESSION) {
  const lod = R() < .5 ? 'game' : 'authoring', so = new OLD.Surfaces(T, lod), sn = new NEW.Surfaces(T, lod), log = [];
  for (let i = 0; i < SESSION; i++) {
    if (R() < .3) {const k = pick(kinds), l = Math.floor(R() * 4); so.channel(k, l); sn.channel(k, l); log.push(['channel', k, l]);}
    const call = randomCall(); log.push([call.op, call.args]);
    let eo = null, en = null;
    try {so[call.op](...structuredClone(call.args));} catch (e) {eo = e.message;}
    try {sn[call.op](...structuredClone(call.args));} catch (e) {en = e.message;}
    if (eo || en) {unit.threw++; if (eo !== en) unit.threwMismatch.push({eo, en, call});}
  }
  unit.sessions++;
  const diff = compareBatches(batchesOf(so, false), batchesOf(sn, true));
  if (diff) {if (unit.different.length < 10) unit.different.push({diff, lod, log: JSON.stringify(log).slice(0, 4000)});} else unit.identical++;
  for (const b of sn.batches.values()) unit.triangles += b.positions.length / 9;
}
// Negative control: one ulp in one emitted float must be seen.
{
  const so = new OLD.Surfaces(T, 'game'), sn = new NEW.Surfaces(T, 'game');
  for (const s of [so, sn]) s.quad([0, 0, 0], [3.3, 0, 0], [3.3, 2.1, 0], [0, 2.1, 0], 'brick', [0, 0, 1], .25, .5);
  const nb = [...sn.batches.values()][0].positions.array; const u = new Uint32Array(nb.buffer); u[4] += 1;
  unit.negativeControl = compareBatches(batchesOf(so, false), batchesOf(sn, true)) ? 'detected' : 'MISSED';
}

// ---------- 2. model level ----------
function strongDigest(model) {
  const lines = [], root = model.root;
  const matLine = m => [m.type, m.name, m.color?.getHexString(), m.roughness, m.metalness, m.transparent, m.opacity, m.side, !!m.map, m.depthWrite, m.polygonOffset].join('|');
  root.updateMatrixWorld(true);
  root.traverse(node => {
    const line = [node.type, node.name, node.visible, Buffer.from(Float64Array.from(node.matrix.elements).buffer).toString('hex'), JSON.stringify(node.userData), node.castShadow, node.receiveShadow];
    if (node.isMesh) {
      const g = node.geometry;
      for (const name of Object.keys(g.attributes).sort()) {const a = g.attributes[name]; line.push(name + ':' + a.itemSize + ':' + a.normalized + ':' + sha(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength)));}
      line.push('index:' + (g.index ? sha(Buffer.from(g.index.array.buffer, g.index.array.byteOffset, g.index.array.byteLength)) : '-'), 'groups:' + JSON.stringify(g.groups), 'range:' + JSON.stringify(g.drawRange), 'mat:' + [].concat(node.material).map(matLine).join(','));
    }
    lines.push(line.join(';'));
  });
  lines.push('triangles:' + model.triangles, 'bounds:' + JSON.stringify(model.bounds), 'keys:' + Object.keys(model).sort().join(','), 'doors:' + model.doorRoots.length);
  // Behaviour: visibility under every view, and the door swing.
  const levels = [...new Set(root.children.map(c => c.userData.level ?? 0))];
  for (const view of [{}, {roof: false}, ...levels.flatMap(l => [{cutaway: true, maxLevel: l}, {roof: false, maxLevel: l}])]) {model.setView(view); lines.push('view ' + JSON.stringify(view) + ':' + root.children.map(c => +c.visible).join(''));}
  model.setView();
  model.setDoorsOpen(true); lines.push('open:' + model.doorRoots.map(p => Buffer.from(Float64Array.from(p.matrixWorld.elements).buffer).toString('hex')).join(','));
  model.setDoorsOpen(false); lines.push('closed:' + model.doorRoots.map(p => Buffer.from(Float64Array.from(p.matrixWorld.elements).buffer).toString('hex')).join(','));
  lines.push('materials:' + [...model.materials.entries()].map(([k, m]) => k + '=' + matLine(m)).join(','));
  return sha(lines.join('\n'));
}
const ROOFS = ['gable', 'hip', 'flat', 'shed', 'butterfly', 'gambrel', 'saltbox', 'mansard', 'pyramid', 'sawtooth', 'unknown-profile'];
const half = () => Math.round((R() * 8 - 2) * 2) / 2;
function variant(i) {
  const base = structuredClone(pick(DESIGNS)), b = {...base, id: 'fuzz-' + i};
  b.parts = base.parts.map(p => ({...p, x: p.x + half(), z: p.z + half(), w: Math.max(2, p.w + half()), d: Math.max(2, p.d + half()), stories: 1 + Math.floor(R() * 4), roof: R() < .6 ? pick(ROOFS) : p.roof, axis: pick(['auto', 'x', 'z', p.axis])}));
  b.pitch = R() < .5 ? b.pitch : .1 + R() * .8;
  for (const k of ['balcony', 'awning', 'loadingDock', 'waterwheel', 'belfry', 'cupola', 'dome', 'glazed']) if (R() < .25) b[k] = !b[k];
  if (R() < .4) b.chimneys = Math.floor(R() * 4);
  if (R() < .4) b.dormers = Math.floor(R() * 4);
  if (R() < .3) b.porch = {x: R() * 6, z: -1 - R() * 2, w: 2 + R() * 5, d: 1 + R() * 2};
  if (R() < .2) b.tower = R() < .5 ? {x: b.parts[0].x + R() * 3, z: b.parts[0].z + R() * 3, r: .8 + R() * 1.7, stories: 1 + Math.floor(R() * 4)} : {x: b.parts[0].x + half(), z: b.parts[0].z + half(), w: 2 + R() * 2, d: 2 + R() * 2, stories: 1 + Math.floor(R() * 4)};
  if (R() < .2) b.tint = [.7 + R() * .3, .7 + R() * .3, .7 + R() * .3];
  return b;
}
const model = {variants: VARIANTS, built: 0, compileRejected: 0, identical: 0, different: [], threwBoth: 0, threwMismatch: [], triangles: 0};
for (let i = 0; i < VARIANTS; i++) {
  const recipe = variant(i);
  let compiled; try {compiled = compileBuilding(recipe);} catch {model.compileRejected++; continue;}
  const lod = i % 3 === 2 ? 'authoring' : 'game', grey = i % 7 === 3, atlas = i % 5 === 1 ? new T.Texture() : null;
  let mo, mn, eo = null, en = null;
  try {mo = OLD.createBuildingModel(T, structuredClone(compiled), {lod, grey, atlas});} catch (e) {eo = e.message;}
  try {mn = NEW.createBuildingModel(T, structuredClone(compiled), {lod, grey, atlas});} catch (e) {en = e.message;}
  if (eo || en) {if (eo === en) model.threwBoth++; else model.threwMismatch.push({i, eo, en}); continue;}
  model.built++; model.triangles += mn.triangles;
  const dOld = strongDigest(mo), dNew = strongDigest(mn);
  if (dOld === dNew) model.identical++; else if (model.different.length < 10) model.different.push({i, lod, recipe});
  mo.dispose(); mn.dispose();
}
// Negative control: the strong digest sees a material change the shipped digest ignores.
{
  const a = NEW.createBuildingModel(T, 'bramble-ranch'), b = NEW.createBuildingModel(T, 'bramble-ranch');
  b.materials.get('glass').opacity = .9;
  const {buildingDigest} = await import(pathToFileURL(path.join(SANDBOX, 'tools/building-geometry.mjs')).href);
  model.negativeControl = {strongDigestSeesGlassOpacity: strongDigest(a) !== strongDigest(b), shippedDigestSeesGlassOpacity: buildingDigest(a) !== buildingDigest(b)};
  const c = NEW.createBuildingModel(T, 'bramble-ranch'), d = NEW.createBuildingModel(T, 'bramble-ranch');
  // (round-2 fix: the first run hid 'stairs', which a one-storey ranch has none of, so that control was vacuous)
  const orig = d.setView; d.setView = (v = {}) => {orig(v); for (const ch of d.root.children) if (ch.userData.kind === 'floor' && v.cutaway) ch.visible = false;};
  model.negativeControl.strongDigestSeesSetViewRule = strongDigest(c) !== strongDigest(d);
  model.negativeControl.shippedDigestSeesSetViewRule = buildingDigest(c) !== buildingDigest(d);
  for (const m of [a, b, c, d]) m.dispose();
}
const result = {script: 'gen-differential.mjs', node: process.version, sandboxThreeSha: newCopy.sourceSha, baselineThreeSha: oldCopy.sourceSha, unit, model};
fs.writeFileSync(path.join(here, 'gen-differential.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify({unit: {...unit, different: unit.different.length, threwMismatch: unit.threwMismatch.length}, model: {...model, different: model.different.length, threwMismatch: model.threwMismatch.length}}, null, 1));
