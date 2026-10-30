// Independent cross-check of the "assets' own share": instead of subtracting the
// blank map's frame, render each workload with every non-asset mesh hidden at
// render time (same frame structure: shadow pass, main pass, composite) and time
// both arms. Two pages of one headless Edge (ANGLE D3D11), blocks A B B A per
// map and view, fresh browser per run; draw counts must not vary.
//   node assets-only.mjs --a <baseline> --b <candidate> --maps <dir> --scenes a,b --runs 2 --out <file>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), option = (n, f) => {const i = args.indexOf('--' + n); return i < 0 ? f : args[i + 1];};
const trees = {a: path.resolve(option('a')), b: path.resolve(option('b'))}, mapsDir = path.resolve(option('maps')), scenes = option('scenes').split(',');
const runs = Number(option('runs', 2)), frames = Number(option('frames', 60)), blocks = Number(option('blocks', 4)), out = path.resolve(option('out'));
const sha = d => createHash('sha256').update(d).digest('hex'), median = v => {const s = [...v].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
const modules = process.env.NAUTILUS_ART_NODE_MODULES || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const pw = createRequire(path.join(modules, 'playwright/package.json'))('playwright');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.bin': 'application/octet-stream', '.gltf': 'model/gltf+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const served = {a: new Map(), b: new Map()}, roots = {a: path.join(trees.a, 'dist'), b: path.join(trees.b, 'dist')};
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1'), parts = decodeURIComponent(url.pathname).split('/').filter(Boolean), arm = parts.shift(), base = roots[arm];
    if (!base || parts.some(p => p.startsWith('.') || p.includes('\\'))) {res.writeHead(404).end(); return;}
    let file = path.resolve(base, ...parts); if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end(); return;}
    const data = fs.readFileSync(file); served[arm].set(parts.join('/'), sha(data));
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
  } catch {res.writeHead(400).end();}
});
const probe = fs.readFileSync(path.join(here, 'assets-only-page.js'), 'utf8');
const result = {script: 'assets-only.mjs', started: new Date().toISOString(), rig: {node: process.version, platform: process.platform + ' ' + os.release(), cpu: os.cpus()[0]?.model, loadavg: os.loadavg()}, runs, frames, blocks, samples: []};
const order = k => [0, 3].includes(k % 4) ? ['a', 'b'] : ['b', 'a'];
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  for (let run = 0; run < runs; run++) {
    const browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']}), errors = [], pages = {};
    try {
      const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1});
      for (const arm of order(run)) {
        const page = pages[arm] = await context.newPage();
        page.on('pageerror', e => errors.push(arm + ': ' + e.message));
        await page.goto('http://127.0.0.1:' + port + '/' + arm + '/index.html', {waitUntil: 'networkidle'});
        await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
        await page.addScriptTag({content: probe});
      }
      result.browser = browser.version();
      for (const id of scenes) {
        const json = fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'), first = JSON.parse(json).buildingPrefabs?.instances[0];
        for (const arm of ['a', 'b']) {await pages[arm].evaluate(j => window.nautilus.open(j), json); await pages[arm].waitForTimeout(150);}
        const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'}};
        const sample = {run, map: id, views: {}, hidden: {}};
        for (const [mode, cut, name, view] of [['assets', false, 'overview', views.overview], ['assets', false, 'close', views.close], ['assets', true, 'cutaway', views.overview], ['whole', false, 'overview', views.overview]]) {
          for (const arm of ['a', 'b']) {await pages[arm].evaluate(on => window.__assets.cutaway(on), cut); sample.hidden[arm + ':' + mode + ':' + name] = await pages[arm].evaluate(on => window.__assets.isolate(on), mode === 'assets');}
          const rec = sample.views[mode + ':' + name] = {a: [], b: []};
          for (let k = 0; k < blocks; k++) for (const arm of [0, 3].includes(k % 4) ? order(run) : [...order(run)].reverse()) rec[arm].push(await pages[arm].evaluate(([n, v]) => window.__assets.frames(n, v), [frames, view]));
          for (const arm of ['a', 'b']) {await pages[arm].evaluate(() => window.__assets.isolate(false)); await pages[arm].evaluate(() => window.__assets.cutaway(false));}
        }
        result.samples.push(sample);
        process.stdout.write(`run ${run} ${id}: ` + Object.entries(sample.views).map(([k, v]) => `${k} ${median(v.a.map(b => median(b.total))).toFixed(2)}/${median(v.b.map(b => median(b.total))).toFixed(2)} ms ${v.a[0].counts.calls}/${v.b[0].counts.calls}`).join(', ') + '\n');
      }
      if (errors.length) result.pageErrors = errors;
    } finally {await browser.close();}
  }
} finally {await new Promise(r => server.close(r));}
for (const arm of ['a', 'b']) result['served_' + arm] = {files: served[arm].size, digest: sha([...served[arm]].sort().map(([f, h]) => f + ' ' + h).join('\n'))};
result.summary = [];
for (const id of scenes) for (const key of Object.keys(result.samples[0].views)) {
  const list = result.samples.filter(s => s.map === id), arm = a => list.map(s => median(s.views[key][a].map(b => median(b.total))));
  const ratio = arm('a').map((v, i) => v / arm('b')[i]);
  result.summary.push({map: id, view: key, calls: list[0].views[key].a[0].counts.calls + ' -> ' + list[0].views[key].b[0].counts.calls, aMs: +median(arm('a')).toFixed(2), bMs: +median(arm('b')).toFixed(2), speedup: +median(ratio).toFixed(2), min: +Math.min(...ratio).toFixed(2), max: +Math.max(...ratio).toFixed(2)});
}
result.finished = new Date().toISOString();
fs.writeFileSync(out, JSON.stringify(result, null, 1));
for (const s of result.summary) console.log(`${s.map.padEnd(30)} ${s.view.padEnd(18)} ${s.calls.padEnd(13)} ${s.aMs} -> ${s.bMs} ms x${s.speedup} (${s.min}-${s.max})`);
