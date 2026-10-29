import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const manifest = JSON.parse(fs.readFileSync(new URL('./source-manifest.json', import.meta.url)));
const sourceRoot = path.join(root, manifest.cache);
for (const file of manifest.files) {
  const bytes = fs.readFileSync(path.join(sourceRoot, file.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
const source = name => import(pathToFileURL(path.join(sourceRoot, 'dist/tactics', name)));
const T = await source('vendor/three.module.js');
const {createBearWorker, BEAR_PROFILE} = await source('bear-worker.js');
const {createPigForeman} = await source('pig-foreman.js');
const {fitRedHatGeometry} = await source('red-hat-model.js');
const {WEAPON_MODELS, createWeaponModel} = await source('weapon-models.js');
const {createArmedIdle} = await source('armed-idle-motion.js');
const {createBattlePosture} = await source('battle-posture.js');
const {createCrawlMotion} = await source('crawl-motion.js');
const read = name => JSON.parse(fs.readFileSync(path.join(sourceRoot, 'dist/tactics', name)));
const data = read('bear-10k-data.json'), author = read('bear-author-data.json');
const capDonor = createPigForeman(read('pig-foreman-10k-data.json'));
const capSource = capDonor.parts.find(part => part.name.includes('service cap'));
const visible = object => { for (let at = object; at; at = at.parent) if (!at.visible) return false; return true; };
const rounded = value => Math.round(value * 1e6) / 1e6;
const bounds = meshes => {
  const box = new T.Box3(), point = new T.Vector3(); let triangles = 0, vertices = 0;
  for (const mesh of meshes) {
    if (!visible(mesh)) continue;
    const geometry = mesh.geometry, index = geometry.index;
    triangles += (index?.count ?? geometry.attributes.position.count) / 3;
    const indices = index ? new Set(index.array) : Array.from({length: geometry.attributes.position.count}, (_, i) => i);
    for (const i of indices) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      assert.ok(point.toArray().every(Number.isFinite), 'Finite live vertex ' + mesh.name);
      box.expandByPoint(point); vertices++;
    }
  }
  return {min: box.min.toArray().map(rounded), max: box.max.toArray().map(rounded), size: box.getSize(point).toArray().map(rounded), triangles, vertices};
};
const hasAncestor = (object, ancestors) => { for (let at = object; at; at = at.parent) if (ancestors.includes(at)) return true; return false; };
function inspect(worker, weapon, cap, label, diagnostics = null) {
  worker.root.updateMatrixWorld(true); worker.skeleton.update();
  const meshes = []; worker.root.traverse(object => { if (object.isMesh) meshes.push(object); });
  const equipmentRoots = [weapon.root, weapon.mount, weapon.hose].filter(Boolean);
  const visualMeshes = meshes.filter(mesh => !hasAncestor(mesh, equipmentRoots));
  const body = bounds(visualMeshes.filter(mesh => mesh !== cap));
  const visual = bounds(visualMeshes), equipped = bounds(meshes);
  const feet = worker.parts.filter(part => /foot|hoof|boot/.test(part.name)).map(part => ({name: part.name, ...bounds([part])}));
  const contacts = diagnostics?.contacts ?? worker.diagnostics().contacts;
  const maxContactError = Math.max(0, ...contacts.map(contact => contact.error ?? 0), diagnostics?.grip?.error ?? 0);
  return {label, body, visual, equipped, feet, contacts, maxContactError, rootPosition: worker.root.position.toArray().map(rounded), rootScale: worker.root.scale.toArray(),
    clearanceEstimate: {method: 'Conservative whole visible equipped AABB; not collision or traversal acceptance.', doorWidthM: 1, doorHeightM: 2, kitIntervalM: 2.12, lateralMarginM: rounded(1 - equipped.size[2]), headroomFromFloorM: rounded(2 - equipped.max[1])}};
}
const samples = [], failures = [];
try {
  for (const outfit of ['normal', 'red-hats']) for (const id of Object.keys(WEAPON_MODELS)) {
    const worker = createBearWorker(data), weapon = createWeaponModel(id), borrowedCarry = weapon.carry;
    worker.equipWeapon(weapon);
    let cap, capMaterial, idle, crawl;
    try {
      if (outfit === 'red-hats') {
        const head = worker.bones.find(bone => bone.name === 'head');
        capMaterial = new T.MeshBasicMaterial();
        cap = new T.Mesh(fitRedHatGeometry(capSource.geometry, head, BEAR_PROFILE.redHatFit), capMaterial);
        cap.name = 'fitted Red Hat cap'; head.add(cap);
      }
      const add = (label, state) => {
        const result = inspect(worker, weapon, cap, label, state);
        samples.push({outfit, weapon: id, ...result});
        if (result.maxContactError > .001) failures.push({outfit, weapon: id, label, maxContactError: result.maxContactError});
      };
      worker.pose('carry'); add('carry');
      idle = createArmedIdle(worker, BEAR_PROFILE, {weapon});
      for (const time of [0, 2.1, 4.2]) add('idle:' + time, idle.at(time));
      const replay = JSON.stringify(idle.at(2.1)); idle.at(4.2); assert.equal(JSON.stringify(idle.at(2.1)), replay);
      idle.dispose(); idle = null;
      // A fresh worker per stance prevents irreversible donor posture fitting
      // from contaminating the carry reference or another equipment choice.
      for (const stance of ['kneel', 'prone']) {
        const stateWorker = createBearWorker(data), stateWeapon = createWeaponModel(id);
        let stateCap, posture;
        try {
          stateWorker.equipWeapon(stateWeapon);
          if (cap) {
            const head = stateWorker.bones.find(bone => bone.name === 'head');
            stateCap = new T.Mesh(fitRedHatGeometry(capSource.geometry, head, BEAR_PROFILE.redHatFit), capMaterial);
            head.add(stateCap);
          }
          posture = createBattlePosture(stateWorker, BEAR_PROFILE);
          stateWorker.pose('carry'); posture.apply({heading: 0, distance: 0, blend: 0, pose: {[stance]: 1}}); posture.ground();
          const sample = inspect(stateWorker, stateWeapon, stateCap, stance);
          samples.push({outfit, weapon: id, ...sample});
          if (sample.maxContactError > .001) failures.push({outfit, weapon: id, label: stance, maxContactError: sample.maxContactError});
        } finally { posture?.resetTail(); stateCap?.geometry.dispose(); stateCap?.removeFromParent(); stateWorker.equipWeapon(); stateWeapon.dispose(); stateWorker.dispose(); }
      }
      crawl = createCrawlMotion(worker, BEAR_PROFILE);
      for (const phase of [0, .25, .5, .75]) add('crawl:' + phase, crawl.at(crawl.stride * phase));
      crawl.dispose(); crawl = null;
    } catch (error) { failures.push({outfit, weapon: id, error: error.message}); }
    finally {
      idle?.dispose(); crawl?.dispose(); cap?.removeFromParent(); cap?.geometry.dispose(); capMaterial?.dispose();
      worker.equipWeapon(); assert.equal(weapon.carry, borrowedCarry, 'Borrowed carry restored for ' + id);
      weapon.dispose(); worker.dispose();
    }
  }
} finally { capDonor.dispose(); }
const result = {
  schemaVersion: 1, sourceCommit: manifest.sourceCommit, engineBaseline: manifest.engineBaseline,
  status: 'Pinned-source reference measurements; integrated Nautilus candidate not supplied yet.',
  runtime: process.version, threeRevision: T.REVISION, bodyTriangles: data.triangles, authorTriangles: author.triangles,
  nativeScale: [1, 1, 1], kitIntervalM: 2.12,
  method: 'Indexed live vertices after skinning, visible hierarchy respected. Body excludes equipment/cap, visual adds fitted cap, equipped adds carried props. Fixed deterministic samples; no device performance or collision claims.',
  weapons: Object.keys(WEAPON_MODELS), outfits: ['normal', 'red-hats'], samples, failures,
  maxContactErrorM: Math.max(...samples.map(sample => sample.maxContactError)),
  pending: ['Integrated provider/editor checkpoint', 'Motion families beyond idle, posture and crawl', 'Independent painted browser captures', 'Swept doorway/ceiling/prone gameplay clearance']
};
fs.writeFileSync(new URL('./source-measurements.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({samples: samples.length, bodyTriangles: data.triangles, authorTriangles: author.triangles, maxContactErrorM: result.maxContactErrorM, failures}));
