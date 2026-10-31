// Injected by tools/bench-asset-rendering.mjs --editor into the built editor
// (dist/index.html). It measures the shipped scene chain (roof -> prefab ->
// wall -> inherited AFT scene) as the editor draws it. renderer.info is read
// with autoReset off and reset per frame, so a frame's count covers the shadow
// pass, the main pass and the composite (the editor renders into an offscreen
// target first; with autoReset on, info keeps only the last pass).
window.__bench = (() => {
  const scene = () => window.editor3d.scene, now = () => performance.now();
  const sync = gl => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  const size = () => {const c = scene().renderer.domElement; return [c.clientWidth, c.clientHeight];};
  // Each frame is also timed on the GPU when the browser offers EXT_disjoint_timer_query_webgl2:
  // the GPU's elapsed time from the frame's first command to its last (idle gaps included), so a
  // change that moves work from the CPU to the GPU shows. WebGL releases query results only
  // after the page yields, so frames() resolves once they are in.
  // draw(view, w, h) sizes the camera and the drawing buffer from w and h, so a fixed size
  // makes the counts independent of the page layout.
  async function frames(n, view, {warmup = 3, fixed = null} = {}) {
    const s = scene(), r = s.renderer, gl = r.getContext(), sm = r.shadowMap, [w, h] = fixed || size(), timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const shadowRender = sm.render, render = r.render; let shadow = 0, passes = 0;
    sm.render = function (...args) {const c = r.info.render.calls, out = shadowRender.apply(this, args); shadow += r.info.render.calls - c; return out;};
    r.render = function (...args) {passes++; return render.apply(this, args);};
    r.info.autoReset = false;
    const cpu = [], total = [], queries = [];let last = null;
    try {
      for (let i = 0; i < warmup + n; i++) {
        r.info.reset(); shadow = 0; passes = 0;
        const query = timer && i >= warmup ? gl.createQuery() : null; if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        const a = now(); s.draw(view, w, h); const b = now(); if (query) {gl.endQuery(timer.TIME_ELAPSED_EXT); queries.push(query);} sync(gl); const c = now();
        const counts = {calls: r.info.render.calls, shadowCalls: shadow, triangles: r.info.render.triangles, passes};
        if (last && i >= warmup && JSON.stringify(counts) !== JSON.stringify(last)) throw Error('Draw counts changed between frames: ' + JSON.stringify([last, counts]));
        last = counts; if (i >= warmup) {cpu.push(b - a); total.push(c - a);}
      }
    } finally {sm.render = shadowRender; r.render = render; r.info.autoReset = true;}
    let gpu = null;
    if (queries.length) {
      for (let k = 0; k < 200 && !gl.getQueryParameter(queries.at(-1), gl.QUERY_RESULT_AVAILABLE); k++) await new Promise(resolve => setTimeout(resolve, 5));
      const ready = gl.getQueryParameter(queries.at(-1), gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(timer.GPU_DISJOINT_EXT);
      if (ready) gpu = queries.map(q => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      for (const q of queries) gl.deleteQuery(q);
    }
    return {canvas: [w, h], pixelRatio: r.getPixelRatio(), cpu, total, gpu, counts: last, programs: r.info.programs.length, geometries: r.info.memory.geometries, textures: r.info.memory.textures};
  }
  // Full frame plus the same frame with a strict depth test (< instead of the default <=),
  // and their difference: the pixels where draw order decides between surfaces at equal depth.
  function capture(view) {
    const s = scene(), r = s.renderer, gl = r.getContext(), [w, h] = size(), W = r.domElement.width, H = r.domElement.height;
    const read = () => {const p = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p); return p;};
    s.draw(view, w, h); s.draw(view, w, h); const lastWins = read(), materials = new Set();
    s.scene.traverse(node => {for (const m of [].concat(node.material || [])) materials.add(m);});
    const saved = [...materials].map(m => [m, m.depthFunc]);
    for (const [m] of saved) m.depthFunc = 2; // THREE.LessDepth (1 would be AlwaysDepth)
    try {s.draw(view, w, h);} finally {for (const [m, f] of saved) m.depthFunc = f;}
    const firstWins = read(), mask = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) for (let c = 0; c < 4; c++) if (lastWins[p * 4 + c] !== firstWins[p * 4 + c]) {mask[p] = 1; break;}
    const b64 = bytes => {let out = ''; for (let i = 0; i < bytes.length; i += 32768) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return btoa(out);};
    return {width: W, height: H, pixels: b64(lastWins), strict: b64(firstWins), ties: b64(mask)};
  }
  // Through the editor's own path: setOptions rebuilds every layer (the prefab layer
  // without awaiting its update), so wait for the update that rebuild started. A tree
  // whose prefab layer keeps no pending update (main 0.10, the A arm) is updated again,
  // as the benchmark did before.
  async function cutaway(on) {
    const s = scene(); s.setOptions({showAllLevels: !on, level: 0});
    if ('pending' in s.prefabs) await s.prefabs.pending; else await s.prefabs.update(window.editor3d.document, s.options);
  }
  // --assets-only (round 2's direct method): while a frame renders, every mesh outside
  // the asset layers is hidden, so the frame times the asset layers alone plus the
  // frame's fixed passes and per-frame scene work. The asset layers are the placed
  // prefab copies and their batches, the wall group, and the roof models and their
  // merge. 'none' hides every mesh (the fixed passes alone); null restores. The list is
  // taken per call, so call it after the view's last rebuild.
  let isolation = null;
  function assetRoots() {
    const s = scene(), roots = new Set();
    for (const model of s.prefabs?.models?.values() || []) roots.add(model.root);
    for (const {mesh} of s.prefabs?.instanced || []) roots.add(mesh);
    if (s.wallGroup) roots.add(s.wallGroup);
    for (const model of s.slopedRoofs?.models?.values() || []) roots.add(model.root);
    if (s.slopedRoofs?.merged) roots.add(s.slopedRoofs.merged.mesh);
    return roots;
  }
  function isolate(mode) {
    const s = scene();
    if (isolation) {if (isolation.own) s.lights.render = isolation.render; else delete s.lights.render; isolation = null;}
    if (!mode) return null;
    const roots = assetRoots(), hide = [], under = node => {for (let n = node; n; n = n.parent) if (roots.has(n)) return true; return false;};
    s.scene.traverse(node => {if ((node.isMesh || node.isLine || node.isPoints || node.isSprite) && (mode === 'none' || !under(node))) hide.push(node);});
    const render = s.lights.render;
    isolation = {render, own: Object.hasOwn(s.lights, 'render')};
    s.lights.render = function (...args) {
      const hidden = []; for (const node of hide) if (node.visible) {node.visible = false; hidden.push(node);}
      try {return render.apply(this, args);} finally {for (const node of hidden) node.visible = true;}
    };
    return {hidden: hide.length, roots: roots.size};
  }
  // The asset layers' own draws in a view: the frame with only them, minus the frame with
  // no mesh at all, in the main and shadow passes.
  async function assetCounts(view, fixed) {
    try {
      isolate('assets'); const assets = (await frames(1, view, {warmup: 1, fixed})).counts;
      isolate('none'); const none = (await frames(1, view, {warmup: 1, fixed})).counts;
      return {main: (assets.calls - assets.shadowCalls) - (none.calls - none.shadowCalls), shadow: assets.shadowCalls - none.shadowCalls, triangles: assets.triangles - none.triangles};
    } finally {isolate(null);}
  }
  // As the frame draws them, culled by every camera (the view, the sun, each lamp face).
  const culled = (view, fixed) => assetCounts(view, fixed);
  // --expect: the asset layers' draws with frustum culling off (in the main and shadow
  // passes), which is what the headless count states for a view's level options; a
  // camera that clips a building's edge cannot change it. A batch of copies also stops
  // culling its copies one by one.
  async function unculled(view, fixed) {
    const saved = [];
    for (const root of assetRoots()) root.traverse(node => {if (node.isMesh && (node.frustumCulled || node.perObjectFrustumCulled)) {saved.push([node, node.frustumCulled, node.perObjectFrustumCulled]); node.frustumCulled = false; if (node.isBatchedMesh) node.perObjectFrustumCulled = false;}});
    try {return await assetCounts(view, fixed);} finally {for (const [node, frustumCulled, perObject] of saved) {node.frustumCulled = frustumCulled; if (node.isBatchedMesh) node.perObjectFrustumCulled = perObject;}}
  }
  // --counts-only: the renderer still culls and submits every draw, and renderer.info counts
  // each one in JavaScript, but the WebGL draw entry points are no-ops: nothing rasterises.
  let stubs = null;
  function stubDraws(on) {
    if (stubs) {for (const [target, name, fn] of stubs) target[name] = fn; stubs = null;}
    if (!on) return 0;
    const gl = scene().renderer.getContext(), multi = gl.getExtension('WEBGL_multi_draw'); stubs = [];
    for (const [target, names] of [[gl, ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']], [multi, ['multiDrawArraysWEBGL', 'multiDrawElementsWEBGL', 'multiDrawArraysInstancedWEBGL', 'multiDrawElementsInstancedWEBGL']]])
      if (target) for (const name of names) if (typeof target[name] === 'function') {stubs.push([target, name, target[name]]); target[name] = () => {};}
    return stubs.length;
  }
  function gpu() {const gl = scene().renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);}
  // What decides the counts beyond the map: the canvas (each camera's aspect), one call per
  // multi-draw only with WEBGL_multi_draw, and the light renderer's passes from the texture
  // units (light-renderer.js lightPasses).
  function caps() {const r = scene().renderer, c = r.capabilities, gl = r.getContext(); return {canvas: size(), multiDraw: !!gl.getExtension('WEBGL_multi_draw'), gpuTimer: !!gl.getExtension('EXT_disjoint_timer_query_webgl2'), maxTextures: c.maxTextures, maxCombinedTextures: c.maxCombinedTextures, maxVertexTextures: c.maxVertexTextures};}
  return {frames, capture, cutaway, isolate, culled, unculled, stubDraws, gpu, caps};
})();
