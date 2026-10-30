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
  function frames(n, view, {warmup = 3} = {}) {
    const s = scene(), r = s.renderer, gl = r.getContext(), sm = r.shadowMap, [w, h] = size();
    const shadowRender = sm.render, render = r.render; let shadow = 0, passes = 0;
    sm.render = function (...args) {const c = r.info.render.calls, out = shadowRender.apply(this, args); shadow += r.info.render.calls - c; return out;};
    r.render = function (...args) {passes++; return render.apply(this, args);};
    r.info.autoReset = false;
    const cpu = [], total = [];let last = null;
    try {
      for (let i = 0; i < warmup + n; i++) {
        r.info.reset(); shadow = 0; passes = 0;
        const a = now(); s.draw(view, w, h); const b = now(); sync(gl); const c = now();
        const counts = {calls: r.info.render.calls, shadowCalls: shadow, triangles: r.info.render.triangles, passes};
        if (last && i >= warmup && JSON.stringify(counts) !== JSON.stringify(last)) throw Error('Draw counts changed between frames: ' + JSON.stringify([last, counts]));
        last = counts; if (i >= warmup) {cpu.push(b - a); total.push(c - a);}
      }
    } finally {sm.render = shadowRender; r.render = render; r.info.autoReset = true;}
    return {canvas: [w, h], pixelRatio: r.getPixelRatio(), cpu, total, counts: last, programs: r.info.programs.length, geometries: r.info.memory.geometries, textures: r.info.memory.textures};
  }
  // Full frame plus its depth-tie mask (default <= test against strict <): the
  // pixels where draw order decides between surfaces at equal depth.
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
    return {width: W, height: H, pixels: b64(lastWins), ties: b64(mask)};
  }
  async function cutaway(on) {
    const s = scene(); s.setOptions({showAllLevels: !on, level: 0}); await s.prefabs.update(window.editor3d.document, s.options);
  }
  // --assets-only (round 2's direct method): while a frame renders, every mesh outside
  // the asset layers is hidden, so the frame times the asset layers alone plus the
  // frame's fixed passes. The asset layers are the placed prefab copies and their
  // instances, the wall group, and the roof models and their merge. 'none' hides
  // every mesh (the fixed passes alone); null restores. The list is taken per call,
  // so call it after the view's last rebuild.
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
  function gpu() {const gl = scene().renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);}
  return {frames, capture, cutaway, isolate, gpu};
})();
