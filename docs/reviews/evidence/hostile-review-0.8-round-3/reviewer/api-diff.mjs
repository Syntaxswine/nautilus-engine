// Round 3: the public APIs against main 0.10, differentially.
//   node api-diff.mjs <baseline tree> <candidate tree> <out.json>
// 1. ./assets/three loadBuildingAssets default (independent) vs main: every original
//    design (the Gross path is the vendored createGrossHouse, unchanged), every node (type, name, visible, matrix, user data, castShadow),
//    every attribute byte and the material settings (toJSON minus uuid), plus the
//    views each instance offers (exterior, every cutaway) and dispose behaviour.
// 2. ./roofs/three createRoofGroup vs main for 144 roofs x {palette, atlas, grey,
//    textures, materialMap}: geometry bytes, groups, material JSON.
// 3. Merged-roof selection bounds: Box3.setFromObject(model.root) with and without the
//    editor's merge (the shells are hidden while merged).
// Controls: a nudged attribute and a nudged material must be detected.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [A, B, out] = process.argv.slice(2).map(p => path.resolve(p));
const sha = b => createHash('sha256').update(b).digest('hex');
const three = tree => import(pathToFileURL(path.join(tree, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
const imp = (tree, p) => import(pathToFileURL(path.join(tree, p)).href);
const T = await three(B);
const materialJSON = m => {const j = m.toJSON(); delete j.uuid; delete j.metadata; if (j.map) j.map = 'map'; delete j.textures; delete j.images; return JSON.stringify(j);};
function describe(root) {
  const lines = []; root.updateMatrixWorld(true);
  root.traverse(n => {
    const line = [n.type, n.name, n.visible, n.matrix.elements.join(','), JSON.stringify(n.userData), n.castShadow, n.receiveShadow];
    if (n.isMesh) {for (const k of Object.keys(n.geometry.attributes).sort()) {const a = n.geometry.attributes[k].array; line.push(k + ':' + sha(Buffer.from(a.buffer, a.byteOffset, a.byteLength)));} line.push('index:' + (n.geometry.index ? sha(Buffer.from(n.geometry.index.array.buffer)) : '-'), JSON.stringify(n.geometry.groups), [].concat(n.material).map(materialJSON).join('+'));}
    lines.push(line.join(';'));
  });
  return lines;
}
const result = {script: 'api-diff.mjs', facade: {}, roofs: {}, roofSelection: {}, controls: {}};
// --- 1. facade default
{
  const loads = {};
  for (const [arm, tree] of [['a', A], ['b', B]]) {
    const {loadBuildingAssets} = await imp(tree, 'packages/assets/three.js');
    loads[arm] = await loadBuildingAssets(T, {providers: ['original'], loadTexture: async () => new T.Texture()});
  }
  const {ORIGINAL_BUILDING_ASSETS, GROSS_BUILDING_ASSETS} = await imp(B, 'packages/prefab-core/registry.js');
  let same = 0, differing = [], views = 0;
  try {
    for (const asset of ORIGINAL_BUILDING_ASSETS) {
      const ia = loads.a.create(asset.id), ib = loads.b.create(asset.id);
      try {
        const da = describe(ia.root), db = describe(ib.root);
        let ok = JSON.stringify(da) === JSON.stringify(db);
        const levels = asset.levels?.map(l => l.index) ?? [0];
        for (const view of [{view: 'exterior'}, ...levels.map(level => ({view: 'cutaway', level}))]) {
          ia.setView(view); ib.setView(view); views++;
          const va = [], vb = []; ia.root.traverse(n => va.push(n.visible)); ib.root.traverse(n => vb.push(n.visible));
          if (JSON.stringify(va) !== JSON.stringify(vb)) ok = false;
        }
        if (ok) same++; else differing.push(asset.id);
      } finally {ia.dispose(); ib.dispose();}
    }
  } catch (error) {result.facade.error = String(error.stack || error).slice(0, 500);}
  finally {loads.a.dispose(); loads.b.dispose();}
  result.facade = {...result.facade, designs: same + differing.length, identical: same, differing, viewsCompared: views};
}
// --- 2. roofs/three createRoofGroup
{
  const ra = await imp(A, 'packages/roof-core/three.js'), rb = await imp(B, 'packages/roof-core/three.js');
  const atlas = new T.Texture(), textures = {slate: new T.Texture(), clay: new T.Texture(), metal: new T.Texture(), fascia: new T.Texture(), soffit: new T.Texture()};
  const shared = {}; for (const id of Object.keys(rb.PAINTED_ROOF_MATERIALS)) shared[id] = new T.MeshStandardMaterial({name: 'host:' + id});
  const specs = []; for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) specs.push({id: 'roof-' + (r * 12 + c), x: 8 + c * 18, y: 8 + r * 18, width: 6 + (c % 5) * 2, depth: 6 + (r % 4) * 2, z: 1 + (r + c) % 3, style: ['gable', 'hip', 'shed'][(r + c) % 3], axis: (r + c) % 2 ? 'x' : 'y', pitch: 25 + (c % 4) * 5, overhang: 0.3, material: ['slate', 'clay', 'metal'][(r * 12 + c) % 3], seed: r * 12 + c, ...((r + c) % 3 === 2 ? {direction: 1} : {})});
  const variants = {palette: {}, atlas: {atlas}, grey: {grey: true}, textures: {textures}, materialMap: {materialMap: shared}};
  let same = 0, differing = [];
  for (const [name, options] of Object.entries(variants)) for (const spec of specs) {
    const ga = ra.createRoofGroup(T, spec, options), gb = rb.createRoofGroup(T, spec, options);
    try {if (JSON.stringify(describe(ga)) === JSON.stringify(describe(gb))) same++; else differing.push(name + ':' + spec.id);} finally {ga.dispose(); gb.dispose();}
  }
  result.roofs = {compared: same + differing.length, identical: same, differing: differing.slice(0, 10), createRoofMaterialExported: typeof rb.createRoofMaterial === 'function', createRoofMaterialInMain: typeof ra.createRoofMaterial === 'function'};
}
// --- 3. merged roof selection bounds
{
  const {RoofLayer} = await imp(B, 'apps/editor/roof-scene.js');
  const map = JSON.parse(fs.readFileSync(path.join(B, 'artifacts/bench/maps/w6-roofs-144.json'), 'utf8')), doc = {map};
  const s1 = new T.Scene(), s2 = new T.Scene(), merged = new RoofLayer(s1, {atlas: new T.Texture()}), plain = new RoofLayer(s2, {atlas: new T.Texture(), merge: false});
  try {
    merged.update(doc, {showAllLevels: true, roofs: true}); plain.update(doc, {showAllLevels: true, roofs: true});
    let same = 0, differing = [];
    for (const [id, model] of merged.models) {
      model.root.updateMatrixWorld(true); const other = plain.models.get(id); other.root.updateMatrixWorld(true);
      const a = new T.Box3().setFromObject(model.root), b = new T.Box3().setFromObject(other.root);
      if (a.equals(b)) same++; else differing.push(id);
    }
    result.roofSelection = {roofs: merged.models.size, merged: !!merged.merged, shellsHidden: [...merged.models.values()].every(m => !m.root.children[0].visible), identicalBounds: same, differing: differing.slice(0, 5)};
  } finally {merged.dispose(); plain.dispose();}
}
// --- controls: the comparison must see a one-ulp attribute change and a material change
{
  const {loadBuildingAssets} = await imp(B, 'packages/assets/three.js'), lib = await loadBuildingAssets(T, {providers: ['original'], loadTexture: async () => new T.Texture()});
  try {
    const x = lib.create('bramble-ranch'), y = lib.create('bramble-ranch'), base = JSON.stringify(describe(x.root));
    let mesh = null; y.root.traverse(n => {if (!mesh && n.isMesh) mesh = n;});
    const arr = mesh.geometry.attributes.position.array, f = new Float32Array([arr[0]]), u = new Uint32Array(f.buffer); u[0] += 1; arr[0] = f[0];
    result.controls.ulpDetected = JSON.stringify(describe(y.root)) !== base;
    const z = lib.create('bramble-ranch'); let m2 = null; z.root.traverse(n => {if (!m2 && n.isMesh) m2 = n;}); m2.material = m2.material.clone(); m2.material.roughness += 0.01;
    result.controls.materialDetected = JSON.stringify(describe(z.root)) !== base;
    x.dispose(); y.dispose(); z.dispose();
  } finally {lib.dispose();}
}
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
