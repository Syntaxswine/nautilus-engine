// Round 3: a triangle-bound proxy. Both trees' built editors as two pages of one
// headless Edge on SwiftShader (a CPU rasteriser: vertex and fragment work dominate,
// draw calls are comparatively cheap). Not a phone; it shows the direction of a
// change on a renderer that pays per triangle. Frames are timed with the answer's own
// probe (tools/bench/editor-probe.js frames(): draw, then a 1-pixel readPixels sync).
// Blocks alternate A B B A per map and view. Reduced motion (fire does not flicker).
//   node swift-timing.mjs --a <tree> --b <tree> --maps <file,file,...> --out <json> [--frames 3] [--blocks 4]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const args = process.argv.slice(2), option = (n, f) => {const i = args.indexOf('--' + n); return i < 0 ? f : args[i + 1];};
const trees = {a: path.resolve(option('a')), b: path.resolve(option('b'))}, out = path.resolve(option('out'));
const maps = option('maps').split(',').map(p => path.resolve(p)), frames = Number(option('frames', 3)), blocks = Number(option('blocks', 4));
const probe = fs.readFileSync(path.join(trees.b, 'tools/bench/editor-probe.js'), 'utf8');
const git = (dir, ...rest) => {try {return execFileSync('git', ['-C', dir, ...rest], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();} catch {return null;}};
const median = v => {const s = [...v].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
const modules = process.env.NAUTILUS_ART_NODE_MODULES || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const pw = createRequire(path.join(modules, 'playwright/package.json'))('playwright');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.bin': 'application/octet-stream', '.gltf': 'model/gltf+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const roots = {a: path.join(trees.a, 'dist'), b: path.join(trees.b, 'dist')};
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1'), parts = decodeURIComponent(url.pathname).split('/').filter(Boolean), arm = parts.shift(), base = roots[arm];
    if (!base || parts.some(p => p.startsWith('.') || p.includes('\\'))) {res.writeHead(404).end(); return;}
    let file = path.resolve(base, ...parts);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end(); return;}
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(file));
  } catch {res.writeHead(400).end();}
});
const result = {script: 'swift-timing.mjs', started: new Date().toISOString(), rig: {cpu: os.cpus()[0]?.model, threads: os.cpus().length, node: process.version}, trees: {a: {dir: '<baseline>', head: git(trees.a, 'rev-parse', 'HEAD')}, b: {dir: '<sandbox>', head: git(trees.b, 'rev-parse', 'HEAD')}}, frames, blocks, rows: []};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  result.browser = browser.version();
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'}), pages = {}, errors = [];
  for (const arm of ['a', 'b']) {
    const page = pages[arm] = await context.newPage();
    page.on('pageerror', e => errors.push(arm + ': ' + e.message));
    await page.goto('http://127.0.0.1:' + port + '/' + arm + '/index.html', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 180000});
    await page.addScriptTag({content: probe});
  }
  for (const file of maps) {
    const json = fs.readFileSync(file, 'utf8'), first = JSON.parse(json).buildingPrefabs?.instances[0];
    for (const arm of ['a', 'b']) await pages[arm].evaluate(j => window.nautilus.open(j), json);
    const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'}};
    const measure = async (name, view) => {
      const rec = {a: [], b: []};
      for (let k = 0; k < blocks; k++) for (const arm of [0, 3].includes(k % 4) ? ['a', 'b'] : ['b', 'a']) rec[arm].push(await pages[arm].evaluate(([n, v]) => window.__bench.frames(n, v, {warmup: 1}), [frames, view]));
      const t = arm => median(rec[arm].map(b => median(b.total))), ratios = rec.a.map((b, i) => median(b.total) / median(rec.b[i].total));
      const row = {map: path.basename(file, '.json'), dir: path.basename(path.dirname(file)), view: name, aMs: t('a'), bMs: t('b'), ratio: t('a') / t('b'), blockRatios: ratios, counts: {a: rec.a[0].counts, b: rec.b[0].counts}, cpuMs: {a: median(rec.a.map(b => median(b.cpu))), b: median(rec.b.map(b => median(b.cpu)))}};
      result.rows.push(row);
      console.log(`${row.dir}/${row.map} ${name}: ${row.aMs.toFixed(1)} -> ${row.bMs.toFixed(1)} ms, x${row.ratio.toFixed(2)} (blocks ${ratios.map(r => r.toFixed(2)).join(' ')}), tri ${(row.counts.a.triangles / 1e6).toFixed(1)}M -> ${(row.counts.b.triangles / 1e6).toFixed(1)}M, calls ${row.counts.a.calls} -> ${row.counts.b.calls}`);
      fs.writeFileSync(out, JSON.stringify(result, null, 1));
    };
    for (const [name, view] of Object.entries(views)) await measure(name, view);
    for (const arm of ['a', 'b']) await pages[arm].evaluate(() => window.__bench.cutaway(true));
    await measure('cutaway', views.overview);
    for (const arm of ['a', 'b']) await pages[arm].evaluate(() => window.__bench.cutaway(false));
  }
  if (errors.length) result.pageErrors = errors;
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
}
result.finished = new Date().toISOString();
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log('Wrote ' + out);
