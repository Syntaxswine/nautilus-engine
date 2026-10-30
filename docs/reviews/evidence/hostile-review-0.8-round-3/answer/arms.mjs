// N arms (built trees) as pages of one Edge, assets-only frames timed in paired blocks
// (A B C … C B A), with GPU elapsed time (EXT_disjoint_timer_query_webgl2) per frame.
//   node arms.mjs --maps <dir> --scenes w0-blank,w1-32x-largest --arm a=<tree> --arm b=<tree> … [--frames 15] [--blocks 4] [--backend gpu] [--out f]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';

const args = process.argv.slice(2), opt = (n, d) => {const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1];};
const arms = args.flatMap((a, i) => a === '--arm' ? [args[i + 1].split('=')] : []).map(([id, dir]) => ({id, dir: path.resolve(dir)}));
const mapsDir = path.resolve(opt('maps')), scenes = opt('scenes').split(','), frames = Number(opt('frames', 15)), blocks = Number(opt('blocks', 4)), backend = opt('backend', 'gpu');
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const {chromium} = require('playwright');
const probe = fs.readFileSync('<author>/tools/bench/editor-probe.js', 'utf8');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.bin': 'application/octet-stream', '.gltf': 'model/gltf+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg'};
const roots = Object.fromEntries(arms.map(a => [a.id, path.join(a.dir, 'dist')]));
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://x').pathname).split('/').filter(Boolean), base = roots[parts.shift()];
  let f = base && path.join(base, ...parts);
  if (f && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f || !f.startsWith(base) || !fs.existsSync(f)) {res.writeHead(404).end(); return;}
  res.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const timing = async ([n, view]) => {
  const s = window.editor3d.scene, r = s.renderer, gl = r.getContext(), t = gl.getExtension('EXT_disjoint_timer_query_webgl2'), c = r.domElement, qs = [], wall = [];
  for (let i = 0; i < n + 2; i++) {
    const q = gl.createQuery(), a = performance.now(); gl.beginQuery(t.TIME_ELAPSED_EXT, q); s.draw(view, c.clientWidth, c.clientHeight); gl.endQuery(t.TIME_ELAPSED_EXT);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); if (i >= 2) {wall.push(performance.now() - a); qs.push(q);} else gl.deleteQuery(q);
  }
  for (let k = 0; k < 100 && !gl.getQueryParameter(qs.at(-1), gl.QUERY_RESULT_AVAILABLE); k++) await new Promise(res => setTimeout(res, 10));
  const disjoint = gl.getParameter(t.GPU_DISJOINT_EXT), gpu = qs.map(q => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); qs.forEach(q => gl.deleteQuery(q));
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
  return {wall: med(wall), gpu: med(gpu), disjoint};
};
const flags = {gpu: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], swiftshader: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}[backend];
const browser = await chromium.launch({channel: 'msedge', headless: true, args: flags}), result = {arms: arms.map(a => a.id), backend, frames, blocks, rows: []};
try {
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1}), pages = {}, errors = [];
  for (const a of arms) {
    const page = pages[a.id] = await context.newPage(); page.on('pageerror', e => errors.push(a.id + ': ' + e.message)); page.on('console', m => {if (m.type() === 'error') errors.push(a.id + ': ' + m.text());});
    await page.goto(`http://127.0.0.1:${server.address().port}/${a.id}/index.html`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.addScriptTag({content: probe});
  }
  for (const id of scenes) {
    const json = fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'), first = JSON.parse(json).buildingPrefabs?.instances[0];
    for (const a of arms) await pages[a.id].evaluate(j => window.nautilus.open(j), json);
    const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'}};
    for (const name of ['overview', 'close', 'cutaway']) {
      const view = name === 'close' ? views.close : views.overview;
      for (const a of arms) {await pages[a.id].evaluate(on => window.__bench.cutaway(on), name === 'cutaway'); await pages[a.id].evaluate(() => window.__bench.isolate('assets'));}
      const per = Object.fromEntries(arms.map(a => [a.id, []])), order = [...arms, ...[...arms].reverse()];
      for (let b = 0; b < blocks; b++) for (const a of (b % 2 ? [...order].reverse() : order)) per[a.id].push(await pages[a.id].evaluate(timing, [frames, view]));
      const counts = {};
      for (const a of arms) {counts[a.id] = await pages[a.id].evaluate(async v => (await window.__bench.frames(1, v, {warmup: 1})).counts, view); await pages[a.id].evaluate(() => window.__bench.isolate(null));}
      const med = x => [...x].sort((p, q) => p - q)[x.length >> 1], row = {map: id, view: name, counts};
      for (const a of arms) row[a.id] = {wall: med(per[a.id].map(x => x.wall)), gpu: med(per[a.id].map(x => x.gpu)), disjoint: per[a.id].some(x => x.disjoint)};
      result.rows.push(row);
      console.log(id.padEnd(30), name.padEnd(9), arms.map(a => `${a.id} ${row[a.id].wall.toFixed(2)}/${row[a.id].gpu.toFixed(2)} (${counts[a.id].calls}c ${(counts[a.id].triangles / 1e6).toFixed(2)}Mt)`).join('  '));
    }
  }
  if (errors.length) console.log('ERRORS', errors.slice(0, 5));
} finally {await browser.close(); server.close();}
if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify(result, null, 1));
