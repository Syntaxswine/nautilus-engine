// Follow-up prototypes (estimates) on the built editor, RTX 3080 D3D11 or SwiftShader.
//   inst-opaque-w1 : instance only opaque template meshes (glass clones kept) to
//                    attribute the pixel differences of full instancing
//   doors-w2       : instance door leaves with byte-identical geometry inside and
//                    across the 32 distinct designs (one InstancedMesh per
//                    identical leaf geometry x material); clones' leaves hidden
// Each records draw calls, frame time and a full-canvas pixel comparison.
// Usage: ANGLE=d3d11 node artifacts/r08-1/prototypes2.mjs
import fs from 'node:fs';
import path from 'node:path';
import {sandbox, evidenceDir, writeResult, nodeRig, stats} from './lib/common.mjs';
import {withBrowser} from './lib/browser.mjs';

const maps = (id) => fs.readFileSync(path.join(evidenceDir, 'maps', id + '.json'), 'utf8');
const THREE_URL = '/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
const FRAMES = Number(process.env.FRAMES || 22), WARM = 2, overview = {x: 119.5, y: 119.5, span: 250, preset: '0'};
const helpers = () => {
  window.__p = {
    frames(n, view) { const s = window.editor3d.scene, r = s.renderer, gl = r.getContext(), px = new Uint8Array(4); r.info.autoReset = false; const samples = []; let calls = 0; const w = r.domElement.clientWidth, h = r.domElement.clientHeight; for (let i = 0; i < n; i++) { r.info.reset(); const t0 = performance.now(); s.draw(view, w, h); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); samples.push(performance.now() - t0); calls = r.info.render.calls; } r.info.autoReset = true; return {samples, calls}; },
    pixels(view) { const s = window.editor3d.scene, r = s.renderer, gl = r.getContext(); s.draw(view, r.domElement.clientWidth, r.domElement.clientHeight); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; },
    diff(a, b) { let n = 0, max = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) { n++; max = Math.max(max, d); } } return {differingPixels: n, totalPixels: a.length / 4, maxChannelDelta: max}; },
  };
};
const sum = (f) => ({calls: f.calls, ms: stats(f.samples.slice(WARM))});
const out = {};
const run = await withBrowser(path.join(sandbox, 'dist'), async ({page, baseURL, receipt}) => {
  const fresh = async (id) => { await page.goto(baseURL + '/', {waitUntil: 'networkidle'}); await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000}); await page.evaluate(helpers); await page.evaluate((j) => window.nautilus.open(j), maps(id)); receipt.gpu ??= await page.evaluate(() => { const gl = window.editor3d.scene.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; }); };
  const measure = async (label, mutate, arg) => {
    const before = sum(await page.evaluate(([n, v]) => window.__p.frames(n, v), [FRAMES, overview]));
    await page.evaluate((v) => { window.__p.ref = window.__p.pixels(v); }, overview);
    const detail = await page.evaluate(mutate, arg);
    const after = sum(await page.evaluate(([n, v]) => window.__p.frames(n, v), [FRAMES, overview]));
    const pixels = await page.evaluate((v) => window.__p.diff(window.__p.ref, window.__p.pixels(v)), overview);
    out[label] = {before, after, detail, pixels, drawCallReductionPct: Math.round((1 - after.calls / before.calls) * 1000) / 10, frameMsReductionPct: Math.round((1 - after.ms.median / before.ms.median) * 1000) / 10};
    console.log(label, JSON.stringify({calls: [before.calls, after.calls], ms: [before.ms.median, after.ms.median], pixels, detail}));
  };
  // Control: re-measure the unmodified scene (pixels must be identical, calls equal).
  await fresh('w1-32x-largest');
  await measure('control-no-change-w1', async () => ({changed: 0}));
  await fresh('w1-32x-largest');
  await measure('inst-opaque-w1', async (url) => {
    const T = await import(url), sc = window.editor3d.scene; let instanced = 0, keptGlass = 0;
    for (const [id, template] of sc.prefabs.templates) {
      const models = [...sc.prefabs.models.values()].filter((m) => m.asset === id); template.model.root.updateMatrixWorld(true);
      const inv = template.model.root.matrixWorld.clone().invert(), meshes = []; template.model.root.traverse((o) => { if (o.isMesh) meshes.push(o); });
      meshes.forEach((mesh, index) => {
        if (!mesh.visible) return; if (mesh.material.transparent) { keptGlass++; return; }
        const local = new T.Matrix4().multiplyMatrices(inv, mesh.matrixWorld), inst = new T.InstancedMesh(mesh.geometry, mesh.material, models.length);
        models.forEach((m, i) => { m.root.updateMatrixWorld(true); inst.setMatrixAt(i, new T.Matrix4().multiplyMatrices(m.root.matrixWorld, local)); });
        inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); inst.castShadow = inst.receiveShadow = true; sc.scene.add(inst); instanced++;
        for (const m of models) { const nodes = []; m.root.traverse((o) => { if (o.isMesh) nodes.push(o); }); nodes[index].visible = false; nodes[index].userData.r08Hidden = true; }
      });
    }
    // PrefabLayer.setView copies template visibility to clones; keep our hidden flags.
    return {instancedOpaqueMeshes: instanced, glassMeshesLeftAsClones: keptGlass};
  }, THREE_URL);
  await fresh('w2-32-distinct-most-meshes');
  await measure('doors-w2', async (url) => {
    const T = await import(url), sc = window.editor3d.scene, groups = new Map(); let leaves = 0, mismatched = 0;
    const same = (a, b) => { for (const name of ['position', 'normal', 'uv']) { const x = a.attributes[name].array, y = b.attributes[name].array; if (x.length !== y.length) return false; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; } return true; };
    for (const model of sc.prefabs.models.values()) {
      model.root.updateMatrixWorld(true);
      model.root.traverse((o) => {
        if (!o.isMesh || o.userData.kind !== 'door-leaf') return; leaves++;
        let group = null;
        for (const g of groups.get(o.material) || []) if (same(g.geometry, o.geometry)) { group = g; break; }
        if (!group) { group = {geometry: o.geometry, material: o.material, matrices: []}; if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(group); }
        group.matrices.push(o.matrixWorld.clone()); o.visible = false;
      });
    }
    let n = 0;
    for (const list of groups.values()) for (const g of list) { const inst = new T.InstancedMesh(g.geometry, g.material, g.matrices.length); g.matrices.forEach((m, i) => inst.setMatrixAt(i, m)); inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); inst.castShadow = inst.receiveShadow = true; sc.scene.add(inst); n++; }
    return {doorLeafMeshes: leaves, instancedMeshes: n, mismatched};
  }, THREE_URL);
});
writeResult('prototypes2-' + (process.env.ANGLE || 'swiftshader') + '.json', {rig: {...nodeRig(), browser: run.receipt.browserVersion, angle: run.receipt.angle, gpuString: run.receipt.gpu, viewport: run.receipt.viewport, deviceScaleFactor: 1}, method: 'As prototypes.mjs; ESTIMATES only. Note: PrefabLayer.setView is not re-run during these measurements.', results: out, browserErrors: run.errors});
