// Is 2x reachable on the 32-distinct-designs scene (w2) with the two levers that
// do not depend on repeated designs? Applies (1) door-leaf instancing (pixel-
// identical in prototypes2) and then (2) excludes building meshes from the sun
// shadow pass (an UPPER BOUND for a shadow-proxy approach; not identical), and
// measures each step plus an unmodified control. Estimates only.
// Usage: ANGLE=d3d11 node artifacts/r08-1/prototype-combined.mjs
import fs from 'node:fs';
import path from 'node:path';
import {sandbox, evidenceDir, writeResult, nodeRig, stats} from './lib/common.mjs';
import {withBrowser} from './lib/browser.mjs';

const json = fs.readFileSync(path.join(evidenceDir, 'maps', 'w2-32-distinct-most-meshes.json'), 'utf8');
const THREE_URL = '/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
const FRAMES = 32, WARM = 2, overview = {x: 119.5, y: 119.5, span: 250, preset: '0'};
const run = await withBrowser(path.join(sandbox, 'dist'), async ({page, baseURL, receipt}) => {
  await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
  await page.evaluate((j) => window.nautilus.open(j), json);
  receipt.gpu = await page.evaluate(() => { const gl = window.editor3d.scene.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; });
  return page.evaluate(async ([url, view, n]) => {
    const T = await import(url), s = window.editor3d.scene, r = s.renderer, gl = r.getContext(), px = new Uint8Array(4);
    const frames = () => { r.info.autoReset = false; const samples = []; let calls = 0; for (let i = 0; i < n; i++) { r.info.reset(); const t0 = performance.now(); s.draw(view, r.domElement.clientWidth, r.domElement.clientHeight); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); samples.push(performance.now() - t0); calls = r.info.render.calls; } r.info.autoReset = true; return {calls, samples}; };
    const steps = {};
    steps.baseline = frames();
    steps.controlRepeat = frames();
    const groups = new Map();
    const same = (a, b) => ['position', 'normal', 'uv'].every((k) => { const x = a.attributes[k].array, y = b.attributes[k].array; if (x.length !== y.length) return false; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; return true; });
    for (const m of s.prefabs.models.values()) { m.root.updateMatrixWorld(true); m.root.traverse((o) => { if (!o.isMesh || o.userData.kind !== 'door-leaf') return; let g = (groups.get(o.material) || []).find((x) => same(x.geometry, o.geometry)); if (!g) { g = {geometry: o.geometry, material: o.material, matrices: []}; if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(g); } g.matrices.push(o.matrixWorld.clone()); o.visible = false; }); }
    const added = []; for (const list of groups.values()) for (const g of list) { const inst = new T.InstancedMesh(g.geometry, g.material, g.matrices.length); g.matrices.forEach((m, i) => inst.setMatrixAt(i, m)); inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); s.scene.add(inst); added.push(inst); }
    steps.doorsInstanced = frames();
    for (const m of s.prefabs.models.values()) m.root.traverse((o) => { if (o.isMesh) { o.userData.noShadow = true; o.castShadow = false; } });
    for (const inst of added) { inst.userData.noShadow = true; }
    steps.doorsPlusNoBuildingShadows = frames();
    return Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, {calls: v.calls, samples: v.samples}]));
  }, [THREE_URL, overview, FRAMES]);
});
const steps = Object.fromEntries(Object.entries(run.result).map(([k, v]) => [k, {calls: v.calls, ms: stats(v.samples.slice(WARM))}]));
writeResult('prototype-combined-' + (process.env.ANGLE || 'swiftshader') + '.json', {rig: {...nodeRig(), browser: run.receipt.browserVersion, angle: run.receipt.angle, gpuString: run.receipt.gpu, viewport: run.receipt.viewport, deviceScaleFactor: 1}, workload: 'w2-32-distinct-most-meshes', frames: FRAMES, warm: WARM, steps});
console.log(JSON.stringify(steps, null, 1));
