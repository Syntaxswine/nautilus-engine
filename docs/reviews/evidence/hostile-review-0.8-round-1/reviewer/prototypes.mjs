// In-page prototypes that ESTIMATE the gain of candidate speedups on the real
// built editor scene, without changing repository code. Each prototype records
// draw calls, frame time (D3D11 or SwiftShader, see rig) and a full-canvas pixel
// comparison against the unmodified frame (identical pixels or not).
//   inst   : w1 - one InstancedMesh per template mesh instead of 32 clones
//   share  : w2 - share identical materials across the 32 distinct templates
//   walls  : w5b - one InstancedMesh per material for cut panels (unit geometry
//            scaled per instance: NOT identical UVs; an upper bound only)
//   noshad : w3 - building meshes excluded from the sun shadow pass (NOT identical)
//   admin  : the Tinderbox Administration Building added to a blank editor scene
//   rebuild: scene.rebuild() latency per workload (edit / view-change cost)
// Usage: ANGLE=d3d11 node artifacts/r08-1/prototypes.mjs
import fs from 'node:fs';
import path from 'node:path';
import {sandbox, evidenceDir, writeResult, nodeRig, stats, mask} from './lib/common.mjs';
import {withBrowser} from './lib/browser.mjs';

const maps = (id) => fs.readFileSync(path.join(evidenceDir, 'maps', id + '.json'), 'utf8');
const THREE_URL = '/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
const FRAMES = Number(process.env.FRAMES || 22), WARM = 2;
const helpers = () => {
  window.__p = {
    frames(n, view) {
      const s = window.editor3d.scene, r = s.renderer, gl = r.getContext(), px = new Uint8Array(4);
      r.info.autoReset = false; const samples = []; let calls = 0, tris = 0;
      const w = r.domElement.clientWidth, h = r.domElement.clientHeight;
      for (let i = 0; i < n; i++) { r.info.reset(); const t0 = performance.now(); s.draw(view, w, h); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); samples.push(performance.now() - t0); calls = r.info.render.calls; tris = r.info.render.triangles; }
      r.info.autoReset = true; return {samples, calls, triangles: tris, programs: r.info.programs.length};
    },
    pixels(view) {
      const s = window.editor3d.scene, r = s.renderer, gl = r.getContext(), w = r.domElement.clientWidth, h = r.domElement.clientHeight;
      s.draw(view, w, h); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px;
    },
    diff(a, b) { let n = 0, max = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) { n++; max = Math.max(max, d); } } return {differingPixels: n, totalPixels: a.length / 4, maxChannelDelta: max}; },
  };
};
const overview = {x: 119.5, y: 119.5, span: 250, preset: '0'};
const sum = (f) => ({calls: f.calls, triangles: f.triangles, programs: f.programs, ms: stats(f.samples.slice(WARM))});

const out = {};
const run = await withBrowser(path.join(sandbox, 'dist'), async ({page, baseURL, receipt}) => {
  const fresh = async (mapId) => {
    await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.evaluate(helpers);
    if (mapId) await page.evaluate((j) => window.nautilus.open(j), maps(mapId));
    receipt.gpu ??= await page.evaluate(() => { const gl = window.editor3d.scene.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
  };
  const measure = async (label, mutate) => {
    const before = sum(await page.evaluate(([n, v]) => window.__p.frames(n, v), [FRAMES, overview]));
    await page.evaluate((v) => { window.__p.ref = window.__p.pixels(v); }, overview);
    const detail = await page.evaluate(mutate, THREE_URL);
    const after = sum(await page.evaluate(([n, v]) => window.__p.frames(n, v), [FRAMES, overview]));
    const pixels = await page.evaluate((v) => window.__p.diff(window.__p.ref, window.__p.pixels(v)), overview);
    out[label] = {before, after, detail, pixels, drawCallReductionPct: Math.round((1 - after.calls / before.calls) * 1000) / 10, frameMsReductionPct: Math.round((1 - after.ms.median / before.ms.median) * 1000) / 10};
    console.log(label, JSON.stringify({calls: [before.calls, after.calls], ms: [before.ms.median, after.ms.median], pixels}));
  };

  await fresh('w1-32x-largest');
  await measure('inst-w1', async (url) => {
    const T = await import(url), sc = window.editor3d.scene, added = [];
    for (const [id, template] of sc.prefabs.templates) {
      const models = [...sc.prefabs.models.values()].filter((m) => m.asset === id); template.model.root.updateMatrixWorld(true);
      const inv = template.model.root.matrixWorld.clone().invert(); const meshes = []; template.model.root.traverse((o) => { if (o.isMesh) meshes.push(o); });
      for (const mesh of meshes) {
        if (!mesh.visible) continue;
        const local = new T.Matrix4().multiplyMatrices(inv, mesh.matrixWorld), inst = new T.InstancedMesh(mesh.geometry, mesh.material, models.length);
        models.forEach((m, i) => { m.root.updateMatrixWorld(true); inst.setMatrixAt(i, new T.Matrix4().multiplyMatrices(m.root.matrixWorld, local)); });
        inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); inst.castShadow = inst.receiveShadow = true; sc.scene.add(inst); added.push(inst);
      }
      for (const m of models) m.root.visible = false;
    }
    return {instancedMeshes: added.length};
  });

  await fresh('w2-32-distinct-most-meshes');
  await measure('share-w2', async () => {
    const sc = window.editor3d.scene, canon = new Map(); let before = new Set(), after = new Set();
    for (const m of sc.prefabs.models.values()) m.root.traverse((o) => {
      if (!o.isMesh) return; const mat = o.material; before.add(mat);
      const key = [mat.type, mat.color.getHex(), mat.map?.uuid, mat.transparent, mat.opacity, mat.side, mat.roughness, mat.metalness, mat.polygonOffset, mat.polygonOffsetFactor, mat.polygonOffsetUnits, mat.customProgramCacheKey()].join('|');
      if (!canon.has(key)) canon.set(key, mat); o.material = canon.get(key); after.add(o.material);
    });
    return {prefabMaterialsBefore: before.size, prefabMaterialsAfter: after.size};
  });

  await fresh('w5b-walls-free-angle');
  await measure('walls-w5b', async (url) => {
    const T = await import(url), sc = window.editor3d.scene, byMat = new Map(), m4 = new T.Matrix4(), s4 = new T.Matrix4();
    for (const mesh of sc.wallGroup.children) { if (!mesh.isInstancedMesh) continue; const width = mesh.geometry.parameters.width; if (!byMat.has(mesh.material)) byMat.set(mesh.material, []); for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m4); byMat.get(mesh.material).push(m4.clone().multiply(s4.makeScale(width, 1, 1))); } mesh.visible = false; }
    const unit = new T.BoxGeometry(1, 2, .16); let n = 0;
    for (const [mat, ms] of byMat) { const inst = new T.InstancedMesh(unit, mat, ms.length); ms.forEach((m, i) => inst.setMatrixAt(i, m)); inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); sc.scene.add(inst); n++; }
    return {mergedInstancedMeshes: n, note: 'Unit geometry scaled per instance: UVs stretch, so pixels are NOT identical; draw-call/frame-time upper bound only.'};
  });

  await fresh('w3-32-distinct-most-triangles');
  await measure('noshadow-w3', async () => {
    const sc = window.editor3d.scene; let n = 0;
    for (const m of sc.prefabs.models.values()) m.root.traverse((o) => { if (o.isMesh) { o.userData.noShadow = true; o.castShadow = false; n++; } });
    return {meshesExcludedFromShadow: n, note: 'Removes building shadows: NOT identical. Upper bound of the shadow-pass share.'};
  });

  // The Tinderbox Administration Building rendered by the editor's renderer.
  await fresh('w0-blank');
  await measure('admin-in-editor', async (url) => {
    const T = await import(url), {createAdministrationBuilding} = await import('/r08-donor/tinderbox-43337a3/assets/art/exposition-administration/index.js');
    const t0 = performance.now(), b = createAdministrationBuilding(T, {position: [120, 0, 100]}), buildMs = performance.now() - t0;
    window.editor3d.scene.scene.add(b.root); window.__admin = b;
    let nodes = 0, inst = 0; b.root.traverse((o) => { if (o.isMesh) { nodes++; if (o.isInstancedMesh) inst++; } });
    return {buildMs: Math.round(buildMs), meshNodes: nodes, instancedBatches: inst};
  });

  // Public facade (packages/assets/three.js) vs the editor's batched Gross houses.
  await fresh('w0-blank');
  out.facadeGross = await page.evaluate(async (url) => {
    const T = await import(url), {loadBuildingAssets} = await import('/packages/assets/three.js'), {GROSS_BUILDING_ASSETS} = await import('/packages/prefab-core/index.js');
    const lib = await loadBuildingAssets(T, {renderer: window.editor3d.scene.renderer, providers: ['gross']}), rows = [];
    for (const a of GROSS_BUILDING_ASSETS) { const t0 = performance.now(), x = lib.create(a.id), ms = performance.now() - t0; let meshes = 0, tris = 0; x.root.traverse((o) => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); rows.push({id: a.id, rawMeshes: meshes, triangles: tris, createMs: Math.round(ms)}); x.dispose(); }
    lib.dispose(); return rows;
  }, THREE_URL);
  console.log('facadeGross', JSON.stringify(out.facadeGross.map((r) => r.rawMeshes)));

  // Edit / view-change latency: InspectionScene.rebuild() (sync part) per workload.
  out.rebuild = {};
  for (const id of ['w0-blank', 'w2-32-distinct-most-meshes', 'w4-32-gross', 'w5a-walls-axis', 'w5b-walls-free-angle', 'w6-roofs-144']) {
    await fresh(id);
    const r = await page.evaluate(() => { const sc = window.editor3d.scene, a = [], walls = []; for (let i = 0; i < 7; i++) { let t0 = performance.now(); sc.rebuild(); a.push(performance.now() - t0); t0 = performance.now(); sc.rebuildWalls(); walls.push(performance.now() - t0); } return {a, walls}; });
    out.rebuild[id] = {rebuildMs: stats(r.a.slice(1)), rebuildWallsMs: stats(r.walls.slice(1))};
    console.log('rebuild', id, JSON.stringify(out.rebuild[id]));
  }
}, {mounts: {'/r08-donor/': path.join(evidenceDir, 'donor')}});
writeResult('prototypes-' + (process.env.ANGLE || 'swiftshader') + '.json', {rig: {...nodeRig(), browser: run.receipt.browserVersion, angle: run.receipt.angle, gpuString: run.receipt.gpu, viewport: run.receipt.viewport, deviceScaleFactor: 1},
  method: 'Built editor from dist/; each prototype mutates only the live page scene after open. Frames: ' + FRAMES + ' (first ' + WARM + ' discarded). Pixels: full-canvas readPixels before/after the change. These are ESTIMATES of a candidate optimisation, not implementations.',
  results: out, browserErrors: run.errors, failedRequests: run.failedRequests});
console.log(mask('done'));
