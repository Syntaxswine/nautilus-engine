// Round 5: does anything regress where copies are placed, moved, turned, deleted, undone, or
// while a library loads? The editor's own scene classes on the count tool's headless drive
// (tools/asset-draw-counts.mjs driven + prepare), driven as the editor drives them (open,
// setOptions, update, and the building library's setView override). After every step an
// audit checks, for every copy and every node of its template:
//   draws  - the node is drawn exactly as often as the template's node would be (0 or 1):
//            by the copy's own node (visible with all its ancestors) plus by a visible
//            CopyBatch that lists it, never both, never neither when the template shows it;
//   matrix - each CopyBatch copy's matrix is the copy's world matrix times the node's place
//            in its template, and its culling sphere is the node's sphere there;
//   stale  - no CopyBatch lists a removed copy, and none is left in the scene unlisted.
// Controls (each must FAIL the audit): one batched copy's own node shown as well (a double
// draw); one CopyBatch matrix moved by 1 m; a CopyBatch left in the scene after release.
//   node layer-invariants.mjs [out.json]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const S = path.resolve(import.meta.dirname, '../..'), imp = p => import(pathToFileURL(path.join(S, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {driven, prepare, release, VIEWS} = await imp('tools/asset-draw-counts.mjs');
const {GROSS_BUILDING_ASSETS} = await imp('packages/prefab-core/registry.js');
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : null;
const instanceable = node => node.isMesh && Array.isArray(node.material);
const shown = (node, stop) => {for (let n = node; n; n = n.parent) {if (!n.visible) return false; if (n === stop) return true;} return true;};

function audit(s) {
  const layer = s.prefabs, problems = [], listed = new Map();
  for (const entry of layer.instanced) entry.copies.forEach((copy, k) => listed.set(copy, {entry, k}));
  let copies = 0, batched = 0;
  for (const [id, model] of layer.models) {
    const template = layer.templates.get(model.asset); if (!template) {problems.push(id + ': no template'); continue;}
    copies++; template.model.root.updateMatrixWorld(true); model.root.updateMatrixWorld(true);
    template.nodes.forEach((tnode, i) => {
      if (!tnode.isMesh) return;
      const own = model.nodes[i], expected = shown(tnode, template.model.root) && model.root.parent === s.scene ? 1 : 0;
      const self = shown(own, null) && model.root.parent === s.scene ? 1 : 0, via = listed.get(own), byBatch = via && via.entry.mesh.visible && via.entry.mesh.parent === s.scene ? 1 : 0;
      if (via) batched++;
      if (self + byBatch !== expected) problems.push(`${id} node ${i} (${tnode.name || tnode.type}${instanceable(tnode) ? ', batch mesh' : ''}): drawn ${self} by itself + ${byBatch} by a CopyBatch, the template ${expected}`);
      if (via) {
        const local = new T.Matrix4().copy(template.model.root.matrixWorld).invert().multiply(tnode.matrixWorld), want = new T.Matrix4().multiplyMatrices(model.root.matrixWorld, local), got = new T.Matrix4();
        via.entry.mesh.getMatrixAt(via.k, got);
        const err = Math.max(...got.elements.map((v, j) => Math.abs(v - want.elements[j])));
        if (err > 1e-5) problems.push(`${id} node ${i}: CopyBatch matrix off by ${err}`);
        const sphere = tnode.geometry.boundingSphere.clone().applyMatrix4(want), mine = via.entry.mesh.spheres[via.k];
        if (mine.center.distanceTo(sphere.center) > 1e-5 || Math.abs(mine.radius - sphere.radius) > 1e-5) problems.push(`${id} node ${i}: CopyBatch sphere off`);
      }
    });
  }
  const present = new Set([...layer.models.values()].flatMap(m => m.nodes));
  for (const entry of layer.instanced) for (const copy of entry.copies) if (!present.has(copy)) problems.push('a CopyBatch lists a removed copy');
  const ours = new Set(layer.instanced.map(e => e.mesh));
  s.scene.traverse(node => {if (node.isBatchedMesh && !ours.has(node)) problems.push('an unlisted CopyBatch is in the scene');});
  return {copies, batchedNodes: batched, copyBatches: layer.instanced.length, sizes: [...new Set(layer.instanced.map(e => e.mesh.instanceCount))], problems};
}

const steps = [];
const at = (id, x, y, turns = 0, asset = 'dockside-warehouse') => ({id, asset, x, y, turns, clearance: 1});
const doc = instances => ({map: {buildingPrefabs: {version: 1, instances}}});
const row = n => Array.from({length: n}, (_, k) => at('n' + k, 20 + k * 20, 20));
let gate = null;
await driven(async s => {
  prepare(s);
  const gross = s.prefabs.providers.get('gross');
  const record = async (label, act, wait = true) => {await act(); if (wait) await s.prefabs.pending; const a = audit(s); steps.push({label, ...a}); console.log(`${label}: ${a.copies} copies, ${a.copyBatches} CopyBatches (sizes ${a.sizes.join('/') || '-'}), ${a.problems.length} problems${a.problems.length ? ': ' + a.problems.slice(0, 3).join(' | ') : ''}`);};
  try {
    let instances = [...row(8), at('far', 20, 200)];
    await record('open: a row of eight neighbours and one far copy', () => s.open(doc(instances)));
    await record('setOptions: level-0 cutaway', () => s.setOptions(VIEWS.cutaway));
    await record('setOptions: level-1 cutaway', () => s.setOptions(VIEWS.upper));
    instances = instances.map(p => p.id === 'n0' ? {...p, y: 140} : p);
    await record('move n0 away (the cluster drops to seven)', () => s.update(doc(instances)));
    instances = instances.map(p => p.id === 'n0' ? {...p, y: 20} : p);
    await record('move n0 back (eight again)', () => s.update(doc(instances)));
    const removed = instances.find(p => p.id === 'n3'); instances = instances.filter(p => p.id !== 'n3');
    await record('delete n3 (the row splits three and four)', () => s.update(doc(instances)));
    instances = [...instances.slice(0, 3), removed, ...instances.slice(3)];
    await record('undo the delete (n3 back, same id and place)', () => s.update(doc(instances)));
    instances = instances.map(p => p.id === 'n5' ? {...p, turns: 1} : p);
    await record('turn n5 a quarter', () => s.update(doc(instances)));
    instances = instances.map(p => p.id === 'n5' ? {...p, turns: 2} : p);
    await record('turn n5 a half', () => s.update(doc(instances)));
    const twoA = instances.map(p => p.id === 'n7' ? {...p, x: p.x + 1} : p), twoB = instances;
    await record('two edits, the first not awaited', async () => {s.update(doc(twoA)); await s.update(doc(twoB));});
    await record('setOptions: exterior', () => s.setOptions(VIEWS.exterior));
    // A Gross house whose library loads behind a gate: while it is pending the copies draw themselves.
    let open; gate = new Promise(r => {open = r;});
    s.prefabs.providers.set('gross', {...gross, load: (...a) => gate.then(() => gross.load(...a))});
    const withHouse = [...instances, at('house', 120, 120, 0, GROSS_BUILDING_ASSETS[0].id)];
    const pending = s.update(doc(withHouse));
    await new Promise(r => setTimeout(r, 20));
    {const a = audit(s); steps.push({label: 'while the Gross library loads', ...a}); console.log(`while the Gross library loads: ${a.copies} copies, ${a.copyBatches} CopyBatches, ${a.problems.length} problems${a.problems.length ? ': ' + a.problems.slice(0, 3).join(' | ') : ''}`);}
    await record('a view change while it is still pending', () => {s.setOptions(VIEWS.cutaway); return new Promise(r => setTimeout(r, 20));}, false);
    open(); await pending;
    await record('the library loaded (and the cutaway set while it was pending)', async () => {});
    await record('setOptions: exterior again', () => s.setOptions(VIEWS.exterior));
    // The building library's floor control (apps/editor/buildings.js) overrides the view.
    await record('setView override: cutaway level 0 with furniture', async () => {s.prefabs.setView({view: 'cutaway', level: 0, showFurniture: true});});
    await record('an edit under the override', () => s.update(doc(withHouse.map(p => p.id === 'n2' ? {...p, x: p.x + 1} : p))));
    await record('override cleared, exterior', async () => {s.prefabs.override = null; s.setOptions(VIEWS.exterior);});
    // Controls: each must fail the audit.
    const controls = [];
    {const entry = s.prefabs.instanced[0], copy = entry.copies[0]; copy.visible = true; const a = audit(s); controls.push({control: 'a batched copy also draws itself', fails: a.problems.length > 0, problems: a.problems.slice(0, 2)}); copy.visible = false;}
    {const entry = s.prefabs.instanced[0], m = new T.Matrix4(); entry.mesh.getMatrixAt(2, m); const moved = m.clone(); moved.elements[12] += 1; entry.mesh.setMatrixAt(2, moved); const a = audit(s); controls.push({control: 'a CopyBatch matrix moved by 1 m', fails: a.problems.length > 0, problems: a.problems.slice(0, 2)}); entry.mesh.setMatrixAt(2, m);}
    {const stray = new (s.prefabs.instanced[0].mesh.constructor)(s.prefabs.instanced[0].node, [new T.Matrix4()]); s.scene.add(stray); const a = audit(s); controls.push({control: 'a CopyBatch left in the scene', fails: a.problems.length > 0, problems: a.problems.slice(0, 2)}); stray.removeFromParent(); stray.dispose();}
    {const a = audit(s); controls.push({control: 'restored (must pass)', fails: a.problems.length > 0, problems: a.problems.slice(0, 2)});}
    for (const c of controls) console.log('control ' + c.control + ': ' + (c.fails ? 'FAILS the audit' : 'passes') + (c.problems.length ? ' (' + c.problems[0] + ')' : ''));
    steps.push({controls});
  } finally {release(s);}
});
const failed = steps.filter(x => x.problems?.length).length;
console.log(failed ? failed + ' steps with problems' : 'every step passed the audit');
if (OUT) fs.writeFileSync(OUT, JSON.stringify({steps}, null, 1));
