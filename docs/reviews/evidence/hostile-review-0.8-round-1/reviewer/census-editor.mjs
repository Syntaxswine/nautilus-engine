// Browser census of the real built editor (dist/, the shipped InspectionScene
// chain: roof-scene -> prefab-scene -> wall-scene -> vendored AFT scene).
// For each workload map: cold open time (5 reps, alternating with a blank map so
// templates are rebuilt), scene-graph counts, and per-frame draw calls split
// into shadow pass / main pass / composite, with shadows on and off, at an
// overview and a close view, plus the level-0 cutaway. renderer.info is read
// with autoReset=false so all passes of one frame are counted (the shipped
// acceptance reads only the last pass: drawCalls 1). Optional CPU profiles.
// Usage: node artifacts/r08-1/census-editor.mjs [workload ...]   (ANGLE=d3d11 for hardware)
import fs from 'node:fs';
import path from 'node:path';
import {sandbox, evidenceDir, writeResult, nodeRig, stats, mask} from './lib/common.mjs';
import {withBrowser} from './lib/browser.mjs';

const mapsDir = path.join(evidenceDir, 'maps');
const all = fs.readdirSync(mapsDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : all;
const OPEN_REPS = Number(process.env.OPEN_REPS || 5), FRAMES = Number(process.env.FRAMES || 12), WARM = 2;
const PROFILE = new Set((process.env.PROFILE || 'w3-32-distinct-most-triangles,w4-32-gross,w5b-walls-free-angle').split(','));
const blank = fs.readFileSync(path.join(mapsDir, 'w0-blank.json'), 'utf8');

const pageHelpers = () => {
  const s = () => window.editor3d.scene;
  window.__r08 = {
    stats() {
      const scene = s(), r = scene.renderer;
      const prefabRoots = new Set([...scene.prefabs.models.values()].map((m) => m.root));
      const roofRoots = new Set([...scene.slopedRoofs.models.values()].map((m) => m.root));
      const category = (o) => { for (let n = o; n; n = n.parent) { if (prefabRoots.has(n)) return 'prefabs'; if (n === scene.wallGroup) return 'walls'; if (roofRoots.has(n)) return 'roofs'; } return 'other'; };
      const out = {}; const geoms = new Set(), mats = new Set();
      const bucket = (k) => (out[k] ??= {meshes: 0, visibleMeshes: 0, visibleDrawItems: 0, visibleShadowItems: 0, visibleTransparentItems: 0, visibleTriangles: 0, instancedMeshes: 0, instances: 0});
      let objects = 0;
      scene.scene.traverse((o) => { objects++; if (o.isMesh) { bucket(category(o)).meshes++; geoms.add(o.geometry); for (const m of [].concat(o.material)) mats.add(m); } });
      scene.scene.traverseVisible((o) => {
        if (!o.isMesh) return;
        const b = bucket(category(o)), g = o.geometry, count = o.isInstancedMesh ? o.count : 1;
        const tris = (g.index ? g.index.count : g.attributes.position?.count || 0) / 3;
        const items = Array.isArray(o.material) ? g.groups.filter((gr) => o.material[gr.materialIndex]?.visible !== false) : [{count: g.index ? g.index.count : g.attributes.position?.count || 0, m: o.material}];
        b.visibleMeshes++; b.visibleDrawItems += items.length; if (o.castShadow) b.visibleShadowItems += items.length;
        b.visibleTransparentItems += (Array.isArray(o.material) ? o.material : [o.material]).filter((m) => m.transparent).length;
        b.visibleTriangles += (Array.isArray(o.material) ? g.groups.reduce((n, gr) => n + gr.count / 3, 0) : tris) * count;
        if (o.isInstancedMesh) { b.instancedMeshes++; b.instances += o.count; }
      });
      // Instancing opportunity (estimate): template meshes x distinct designs.
      const templates = [...scene.prefabs.templates.entries()].map(([id, t]) => { let meshes = 0; t.model.root.traverse((o) => { if (o.isMesh) meshes++; }); return {id, meshes, instances: [...scene.prefabs.models.values()].filter((m) => m.asset === id).length}; });
      return {objects, categories: out, uniqueGeometries: geoms.size, uniqueMaterials: mats.size, programs: r.info.programs.length, memory: {...r.info.memory}, templates,
        templateMeshTotal: templates.reduce((n, t) => n + t.meshes, 0), instanceMeshTotal: templates.reduce((n, t) => n + t.meshes * t.instances, 0)};
    },
    frames(n, view, {shadows = true} = {}) {
      const scene = s(), r = scene.renderer, gl = r.getContext(), px = new Uint8Array(4), sm = r.shadowMap;
      const prior = sm.enabled; sm.enabled = shadows;
      r.info.autoReset = false;
      const origShadow = sm.render, origRender = r.render; let shadowCalls = 0, shadowTris = 0, passes = 0;
      sm.render = function (...a) { const c = r.info.render.calls, t = r.info.render.triangles; const out = origShadow.apply(this, a); shadowCalls += r.info.render.calls - c; shadowTris += r.info.render.triangles - t; return out; };
      r.render = function (...a) { passes++; return origRender.apply(this, a); };
      const canvas = r.domElement, w = canvas.clientWidth, h = canvas.clientHeight, samples = [], perFrame = [];
      try {
        for (let i = 0; i < n; i++) {
          r.info.reset(); shadowCalls = 0; shadowTris = 0; passes = 0;
          const t0 = performance.now(); scene.draw(view, w, h); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); samples.push(performance.now() - t0);
          perFrame.push({calls: r.info.render.calls, triangles: r.info.render.triangles, shadowCalls, shadowTris, renderPasses: passes});
        }
      } finally { sm.render = origShadow; r.render = origRender; r.info.autoReset = true; sm.enabled = prior; }
      const last = perFrame.at(-1);
      return {canvas: [w, h], pixelRatio: r.getPixelRatio(), samples, last, stableCounts: perFrame.slice(2).every((f) => f.calls === last.calls), programs: r.info.programs.length,
        split: {shadowPass: last.shadowCalls, mainAndComposite: last.calls - last.shadowCalls, renderPasses: last.renderPasses}};
    },
  };
};

function summarize(frames) { return {...frames, ms: stats(frames.samples.slice(WARM)), samples: undefined}; }
async function profileFrames(cdp, page, view) {
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {interval: 200}); await cdp.send('Profiler.start');
  await page.evaluate((v) => window.__r08.frames(10, v), view);
  const {profile} = await cdp.send('Profiler.stop');
  return aggregate(profile);
}
function aggregate(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n])), self = new Map(), byFile = new Map(); let total = 0;
  profile.samples.forEach((id, i) => { const us = profile.timeDeltas[i] || 0, cf = byId.get(id).callFrame, file = cf.url ? cf.url.replace(/^https?:\/\/[^/]+\//, '').split('?')[0] : '(native)'; const key = (cf.functionName || '(anonymous)') + ' ' + file.split('/').slice(-1)[0] + ':' + (cf.lineNumber + 1); self.set(key, (self.get(key) || 0) + us); const short = file.split('/').slice(-2).join('/'); byFile.set(short, (byFile.get(short) || 0) + us); total += us; });
  const pct = (us) => Math.round(us / total * 1000) / 10;
  return {sampledMs: Math.round(total / 1000), topSelf: [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([fn, us]) => ({fn, pct: pct(us)})), byFile: [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([file, us]) => ({file, pct: pct(us)}))};
}

const results = [];
const run = await withBrowser(path.join(sandbox, 'dist'), async ({page, baseURL, errors, receipt}) => {
  const cdp = await page.context().newCDPSession(page);
  for (const id of wanted) {
    const json = fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8');
    await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.evaluate(pageHelpers);
    const gpu = await page.evaluate(() => { const gl = window.editor3d.scene.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
    receipt.gpu = gpu;
    const openMs = [];
    let openProfile = null;
    for (let i = 0; i < OPEN_REPS; i++) {
      await page.evaluate((b) => window.nautilus.open(b), blank);
      const profiling = i === OPEN_REPS - 1 && PROFILE.has(id);
      if (profiling) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {interval: 500}); await cdp.send('Profiler.start'); }
      openMs.push(await page.evaluate(async (j) => { const t0 = performance.now(); await window.nautilus.open(j); return performance.now() - t0; }, json));
      if (profiling) openProfile = aggregate((await cdp.send('Profiler.stop')).profile);
    }
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
    const sceneStats = await page.evaluate(() => window.__r08.stats());
    const first = JSON.parse(json).buildingPrefabs?.instances[0];
    const overview = {x: 119.5, y: 119.5, span: 250, preset: '0'}, close = first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'};
    const framesOverview = summarize(await page.evaluate(([n, v]) => window.__r08.frames(n, v), [FRAMES, overview]));
    const framesNoShadow = summarize(await page.evaluate(([n, v]) => window.__r08.frames(n, v, {shadows: false}), [FRAMES, overview]));
    const framesClose = summarize(await page.evaluate(([n, v]) => window.__r08.frames(n, v), [FRAMES, close]));
    let frameProfile = null;
    if (PROFILE.has(id)) frameProfile = await profileFrames(cdp, page, overview);
    // Level-0 cutaway (one floor shown, roofs hidden by the original provider).
    await page.evaluate(async () => { const sc = window.editor3d.scene; sc.setOptions({showAllLevels: false, level: 0}); await sc.prefabs.update(window.editor3d.document, sc.options); });
    const cutStats = await page.evaluate(() => window.__r08.stats());
    const framesCut = summarize(await page.evaluate(([n, v]) => window.__r08.frames(n, v), [FRAMES, overview]));
    results.push({workload: id, gpu, openMs: stats(openMs), openSamplesMs: openMs.map((v) => Math.round(v)), openProfile, sceneStats, framesOverview, framesNoShadow, framesClose, frameProfile,
      cutaway: {categories: cutStats.categories, frames: framesCut}, pageErrors: errors.splice(0)});
    console.log(id, 'open', stats(openMs).median, 'calls', framesOverview.last.calls, 'shadow', framesOverview.split.shadowPass, 'noShadow', framesNoShadow.last.calls, 'ms', framesOverview.ms.median, 'cut calls', framesCut.last.calls);
  }
});
const file = writeResult('census-editor-' + (process.env.ANGLE || 'swiftshader') + (process.argv.length > 2 ? '-' + wanted.join('+') : '') + '.json', {
  rig: {...nodeRig(), browser: run.receipt.browserVersion, angle: run.receipt.angle, gpuString: run.receipt.gpu, viewport: run.receipt.viewport, deviceScaleFactor: 1, editorPixelRatio: 'min(devicePixelRatio,1.5) = 1'},
  method: 'Built editor (npm run build) served from dist/ on 127.0.0.1; Playwright-driven headless Edge. Open time: ' + OPEN_REPS + ' cold opens (a blank map between opens releases all templates). Frames: ' + FRAMES + ' synchronous scene.draw() calls each followed by a 1-pixel readPixels to complete GPU work; first ' + WARM + ' discarded. Draw calls from renderer.info with autoReset=false (all passes of the frame), shadow pass isolated by wrapping renderer.shadowMap.render.',
  results, browserErrors: run.errors, failedRequests: run.failedRequests,
});
console.log(mask(file));
