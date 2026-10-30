// CPU profile of the editor's frames (CDP Profiler), self time aggregated per function.
//   node profile-frames.mjs <tree> <map.json> <view: overview|close|cutaway> [--assets] [--frames 30] [--backend gpu|swiftshader] [--out file]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const [tree, mapFile, viewName] = process.argv.slice(2);
const args = process.argv.slice(2), opt = (n, d) => {const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1];};
const frames = Number(opt('frames', 30)), assets = args.includes('--assets'), backend = opt('backend', 'gpu');
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const {chromium} = require('playwright');
// Round 4 copy of the answer's profile-frames.mjs: only the probe's path changed (the sandbox's own).
const root = path.join(path.resolve(tree), 'dist'), probe = fs.readFileSync(fileURLToPath(new URL('../../tools/bench/editor-probe.js', import.meta.url)), 'utf8');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.bin': 'application/octet-stream', '.gltf': 'model/gltf+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg'};
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(root, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(root) || !fs.existsSync(f)) {res.writeHead(404).end(); return;}
  res.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'}).end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const flags = {gpu: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], swiftshader: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}[backend];
const browser = await chromium.launch({channel: 'msedge', headless: true, args: flags});
try {
  const page = await (await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1})).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
  await page.addScriptTag({content: probe});
  const json = fs.readFileSync(mapFile, 'utf8'), first = JSON.parse(json).buildingPrefabs?.instances[0];
  await page.evaluate(j => window.nautilus.open(j), json);
  const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'}};
  const view = viewName === 'close' ? views.close : views.overview;
  if (viewName === 'cutaway') await page.evaluate(() => window.__bench.cutaway(true));
  if (assets) await page.evaluate(() => window.__bench.isolate('assets'));
  if (opt('eval')) console.error('eval:', JSON.stringify(await page.evaluate(opt('eval'))));
  const warm = await page.evaluate(v => window.__bench.frames(5, v), view);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {interval: 100}); await cdp.send('Profiler.start');
  const timed = await page.evaluate(([n, v]) => window.__bench.frames(n, v, {warmup: 0}), [frames, view]);
  const {profile} = await cdp.send('Profiler.stop');
  // Self time per function (sample counts x interval), top 25.
  const byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map(), dt = profile.timeDeltas, total = dt.reduce((a, b) => a + b, 0) / 1000;
  profile.samples.forEach((id, i) => {const n = byId.get(id), f = n.callFrame, key = (f.functionName || '(anon)') + ' ' + (f.url.split('/').pop() || '') + ':' + f.lineNumber; self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000);});
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, ms]) => ({fn: k, ms: +ms.toFixed(1), perFrame: +(ms / frames).toFixed(2)}));
  const median = a => {const s = [...a].sort((x, y) => x - y); return s[s.length >> 1];};
  const out = {tree: path.basename(tree), map: path.basename(mapFile), view: viewName, assets, backend, frames, frameMs: median(timed.total), cpuMs: median(timed.cpu), counts: timed.counts, profiledMs: +total.toFixed(1), top, errors};
  if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({...out, top: out.top.slice(0, 18)}, null, 1));
} finally {await browser.close(); server.close();}
