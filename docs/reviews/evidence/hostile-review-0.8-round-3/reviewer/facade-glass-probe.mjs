// Round 3: what a facade host without the AFT daylight rig gets from shared:true
// glass halves, and what three.js would draw for them in a shadow pass.
//   node facade-glass-probe.mjs <tree> <out.json>
// The editor's daylight rig turns userData.noShadow into castShadow=false on every
// frame. A host's own lighting does not; the halves' castShadow is copied from the
// source mesh by clone(). This counts, per design, the glass meshes that cast in
// such a host, against the independent (default) model's one caster per pane.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [tree, out] = process.argv.slice(2).map(p => path.resolve(p));
const T = await import(pathToFileURL(path.join(tree, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
const {loadBuildingAssets} = await import(pathToFileURL(path.join(tree, 'packages/assets/three.js')).href);
const {ORIGINAL_BUILDING_ASSETS} = await import(pathToFileURL(path.join(tree, 'packages/prefab-core/registry.js')).href);
const atlas = new T.Texture();
const shared = await loadBuildingAssets(T, {providers: ['original'], loadTexture: async () => atlas, shared: true});
const plain = await loadBuildingAssets(T, {providers: ['original'], loadTexture: async () => atlas});
const glassOf = root => {const out = []; root.traverse(n => {if (n.isMesh && !Array.isArray(n.material) && n.material.transparent) out.push(n);}); return out;};
// What WebGLShadowMap draws: a visible caster with castShadow (frustum aside), each once per shadow map.
const casters = list => list.filter(m => m.castShadow && m.visible);
const rows = [];
try {
  for (const asset of ORIGINAL_BUILDING_ASSETS) {
    const s = shared.create(asset.id), p = plain.create(asset.id);
    try {
      const sg = glassOf(s.root), pg = glassOf(p.root);
      rows.push({id: asset.id, panes: pg.length, sharedGlassMeshes: sg.length, sharedCastersWithoutRig: casters(sg).length, sharedNoShadowFlagged: sg.filter(m => m.userData.noShadow).length, plainCasters: casters(pg).length,
        sides: [...new Set(sg.map(m => m.material.side + '/' + m.material.shadowSide))]});
    } finally {s.dispose(); p.dispose();}
  }
} finally {shared.dispose(); plain.dispose();}
const total = k => rows.reduce((n, r) => n + r[k], 0);
const summary = {designs: rows.length, panes: total('panes'), sharedGlassMeshes: total('sharedGlassMeshes'), sharedCastersWithoutRig: total('sharedCastersWithoutRig'), plainCasters: total('plainCasters'), sharedNoShadowFlagged: total('sharedNoShadowFlagged')};
fs.writeFileSync(out, JSON.stringify({script: 'facade-glass-probe.mjs', summary, rows}, null, 1));
console.log(JSON.stringify(summary));
