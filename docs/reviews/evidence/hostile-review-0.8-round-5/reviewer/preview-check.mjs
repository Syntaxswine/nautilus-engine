// Round 5: the building library's preview scene (apps/editor/prefab-preview.js, a second
// PrefabLayer with its own renderer and daylight rig, which the layout generator opens with a
// whole seeded layout) with a batched cluster: eight neighbouring copies of one design, drawn
// batched (the default) and per copy (instancing off), in the exterior and through the library's
// floor control (setView override: the level-0 cutaway with furniture). SwiftShader, the built
// candidate's own modules imported into its page. Reports draws, CopyBatches and whether the two
// arms' pixels are identical; console errors and warnings are collected.
//   node preview-check.mjs <out.json> <tree> [asset]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const [outArg, treeArg, asset = 'dockside-warehouse'] = process.argv.slice(2), OUT = path.resolve(outArg), base = path.join(path.resolve(treeArg), 'dist');
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')), pw = require('playwright');
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).split('/').filter(Boolean);
  if (parts.some(p => p.startsWith('.'))) {res.writeHead(404).end(); return;}
  let file = path.resolve(base, ...parts); if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) {res.writeHead(404).end(); return;}
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(file));
});
const result = {started: new Date().toISOString(), asset, errors: []};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'}), page = await context.newPage();
  page.on('pageerror', e => result.errors.push('pageerror: ' + e.message)); page.on('console', m => {if (m.type() === 'error' || m.type() === 'warning') result.errors.push(m.type() + ': ' + m.text().slice(0, 300));});
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
  result.scripts = scripts.map(s => new URL(s).pathname);
  Object.assign(result, await page.evaluate(async asset => {
    const appDir = [...document.scripts].map(s => s.src).find(s => /\/app\//.test(s))?.replace(/[^/]*$/, '') || new URL('./app/', location.href).href;
    const {BuildingPreviewScene} = await import(appDir + 'prefab-preview.js');
    const instances = Array.from({length: 8}, (_, k) => ({id: 'copy-' + k, asset, x: 20 + k * 20, y: 20, turns: 0, clearance: 1}));
    const doc = {map: {buildingPrefabs: {version: 1, instances}}, size: 240, units: [], block: false};
    const W = 800, H = 500, view = {x: 90, y: 30, span: 200, preset: '0'};
    const arm = async instancing => {
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; document.body.append(canvas);
      const scene = new BuildingPreviewScene(canvas); scene.prefabs.instancing = instancing;
      await scene.open(doc);
      const gl = scene.renderer.getContext(), read = () => {const p = new Uint8Array(scene.renderer.domElement.width * scene.renderer.domElement.height * 4); gl.readPixels(0, 0, scene.renderer.domElement.width, scene.renderer.domElement.height, gl.RGBA, gl.UNSIGNED_BYTE, p); return p;};
      const frame = () => {scene.renderer.info.autoReset = false; scene.renderer.info.reset(); scene.draw(view, W, H); scene.draw(view, W, H); const calls = scene.renderer.info.render.calls / 2, triangles = scene.renderer.info.render.triangles / 2; scene.renderer.info.autoReset = true; return {calls, triangles, pixels: read()};};
      const exterior = frame();
      scene.prefabs.setView({view: 'cutaway', level: 0, showFurniture: true});
      const cut = frame(), follows = scene.prefabs.instanced.every(({mesh, node}) => mesh.visible === node.visible);
      const out = {copyBatches: scene.prefabs.instanced.length, diagnostics: [...scene.diagnostics], exterior, cut, follows};
      scene.dispose(); canvas.remove(); return out;
    };
    const batched = await arm(true), perCopy = await arm(false);
    const differ = (a, b) => {let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n;};
    const summary = x => ({copyBatches: x.copyBatches, diagnostics: x.diagnostics, follows: x.follows, exterior: {calls: x.exterior.calls, triangles: x.exterior.triangles}, cut: {calls: x.cut.calls, triangles: x.cut.triangles}});
    return {batched: summary(batched), perCopy: summary(perCopy), pixelsDiffer: {exterior: differ(batched.exterior.pixels, perCopy.exterior.pixels), cut: differ(batched.cut.pixels, perCopy.cut.pixels), cutAgainstExterior: differ(batched.exterior.pixels, batched.cut.pixels)}, pixels: W * H};
  }, asset));
  console.log(JSON.stringify({batched: result.batched, perCopy: result.perCopy, pixelsDiffer: result.pixelsDiffer, errors: result.errors.slice(0, 5)}));
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
