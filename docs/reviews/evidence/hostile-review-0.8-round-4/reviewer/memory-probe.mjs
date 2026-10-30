// Round 4 memory probe: each arm's editor (GPU, headless Edge) opens a map, then applies
// N edits (one copy moved by a tile and back, through scene.update, as an edit or an undo
// would) and N view toggles (cutaway on/off), drawing a frame after each. Reported before
// and after: renderer.info.memory (GPU geometries, textures), programs, the JS heap after a
// forced GC (CDP), and the prefab layer's batch count.
//   node memory-probe.mjs <out.json> <arm>=<tree> ... -- <map> [N]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const argv = process.argv.slice(2), sep = argv.indexOf('--'), OUT = path.resolve(argv[0]);
const arms = argv.slice(1, sep).map(a => {const [name, tree] = a.split('='); return {name, tree: path.resolve(tree)};}), map = argv[sep + 1], N = Number(argv[sep + 2] || 40);
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), mapsDir = path.join(here, 'artifacts/bench/maps'), probe = fs.readFileSync(path.join(here, 'tools/bench/editor-probe.js'), 'utf8');
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')), pw = require('playwright');
const roots = Object.fromEntries(arms.map(a => [a.name, path.join(a.tree, 'dist')]));
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).split('/').filter(Boolean), base = roots[parts.shift()];
  if (!base || parts.some(p => p.startsWith('.'))) {res.writeHead(404).end(); return;}
  let file = path.resolve(base, ...parts); if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) {res.writeHead(404).end(); return;}
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(file));
});
const result = {started: new Date().toISOString(), map, N, arms: {}};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  for (const a of arms) {
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await page.goto(`http://127.0.0.1:${port}/${a.name}/index.html`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.addScriptTag({content: probe});
    await page.evaluate(j => window.nautilus.open(j), fs.readFileSync(path.join(mapsDir, map + '.json'), 'utf8'));
    const state = async label => {
      await cdp.send('HeapProfiler.collectGarbage'); const heap = await cdp.send('Runtime.getHeapUsage');
      const s = await page.evaluate(async () => {const s = window.editor3d.scene, r = s.renderer; await window.__bench.frames(1, {x: 119.5, y: 119.5, span: 250, preset: '0'}, {warmup: 1}); return {geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs?.length ?? null, batches: s.prefabs.instanced?.length ?? 0, models: s.prefabs.models.size, sceneChildren: s.scene.children.length};});
      return {label, heapMB: +(heap.usedSize / 2 ** 20).toFixed(1), ...s};
    };
    const rows = [await state('open')];
    const t0 = Date.now();
    await page.evaluate(async n => {
      const s = window.editor3d.scene, doc = window.editor3d.document, view = {x: 119.5, y: 119.5, span: 250, preset: '0'}, c = s.renderer.domElement;
      for (let i = 0; i < n; i++) {
        const next = structuredClone(doc); next.map.buildingPrefabs.instances[0].y += (i % 2 ? 0 : 1);
        await s.update(next); s.draw(view, c.clientWidth, c.clientHeight);
      }
      await s.update(doc); s.draw(view, c.clientWidth, c.clientHeight);
    }, N);
    rows.push({...(await state('after ' + N + ' edits')), ms: Date.now() - t0});
    const t1 = Date.now();
    await page.evaluate(async n => {
      const s = window.editor3d.scene, view = {x: 119.5, y: 119.5, span: 250, preset: '0'}, c = s.renderer.domElement;
      for (let i = 0; i < 2 * n; i++) {s.setOptions({showAllLevels: i % 2 === 1, level: 0}); await s.prefabs.update(window.editor3d.document, s.options); s.draw(view, c.clientWidth, c.clientHeight);}
    }, N);
    rows.push({...(await state('after ' + 2 * N + ' view toggles')), ms: Date.now() - t1});
    result.arms[a.name] = rows;
    for (const row of rows) console.log(a.name, JSON.stringify(row));
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
