// Round 5: per frame, the CopyBatch setups that drew copies and those whose camera saw none (the
// view pass and the shadow passes: the sun and each lamp face), and their sub-draws, at the bench's
// cameras - the answer's exp-setups.js (evidence/hostile-review-0.8-round-4/answer/), driven by
// Playwright in headless Edge (ANGLE D3D11, the answer's rig) with the GL draw entry points made
// no-ops (the bench's stubDraws: three still culls, sets up and submits every draw), on the built
// candidate. Every open waits for the prefab update the floor control starts after open().
//   node setups.mjs <out.json> <tree> -- <map>[,<map>...]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const argv = process.argv.slice(2), sep = argv.indexOf('--'), OUT = path.resolve(argv[0]), TREE = path.resolve(argv[1]), maps = argv[sep + 1].split(',');
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), mapsDir = process.env.MAPS ? path.resolve(process.env.MAPS) : path.join(here, 'artifacts/bench/maps');
const probe = fs.readFileSync(path.join(here, 'tools/bench/editor-probe.js'), 'utf8');
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')), pw = require('playwright');
const base = path.join(TREE, 'dist');
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).split('/').filter(Boolean);
  if (parts.some(p => p.startsWith('.'))) {res.writeHead(404).end(); return;}
  let file = path.resolve(base, ...parts); if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) {res.writeHead(404).end(); return;}
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(file));
});
const result = {started: new Date().toISOString(), tree: '<tree>', maps, rows: {}};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'}), page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
  await page.addScriptTag({content: probe});
  for (const id of maps) {
    const json = fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8');
    result.rows[id] = await page.evaluate(async json => {
      const s = window.editor3d.scene, W = 1056, H = 916, doc = JSON.parse(json);
      const count = view => {
        const stats = {view: [0, 0], shadow: [0, 0], subDraws: 0}; let inShadow = false, on = false;
        const wrapped = s.prefabs.instanced.map(({mesh}) => {
          const render = mesh.onBeforeRender, shadow = mesh.onBeforeShadow;
          mesh.onBeforeRender = function (...a) {const r = render.apply(this, a); if (on) {stats[inShadow ? 'shadow' : 'view'][this._multiDrawCount ? 0 : 1]++; for (let i = 0; i < this._multiDrawCount; i++) if (this._multiDrawCounts[i]) stats.subDraws++;} return r;};
          mesh.onBeforeShadow = function (...a) {inShadow = true; try {return shadow.apply(this, a);} finally {inShadow = false;}};
          return [mesh, render, shadow];
        });
        try {s.draw(view, W, H); on = true; s.draw(view, W, H);} finally {for (const [mesh, render, shadow] of wrapped) {mesh.onBeforeRender = render; mesh.onBeforeShadow = shadow;}}
        return {batches: wrapped.length, viewDrew: stats.view[0], viewEmpty: stats.view[1], shadowDrew: stats.shadow[0], shadowEmpty: stats.shadow[1], subDraws: stats.subDraws, perDrawingSetup: +(stats.subDraws / Math.max(1, stats.view[0] + stats.shadow[0])).toFixed(2)};
      };
      await window.nautilus.open(json); await s.prefabs.pending;
      const placed = doc.buildingPrefabs?.instances || [], first = placed[0], last = placed.at(-1);
      const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'}, far: {x: last.x + 10, y: last.y + 10, span: 40, preset: '0'}};
      window.__bench.stubDraws(true);
      try {
        const row = {copies: s.prefabs.models.size};
        for (const [name, view] of Object.entries(views)) row[name] = count(view);
        s.setOptions({showAllLevels: false, level: 0}); await s.prefabs.pending;
        row.cutaway = count(views.overview);
        s.setOptions({showAllLevels: true, level: 0}); await s.prefabs.pending;
        return row;
      } finally {window.__bench.stubDraws(false);}
    }, json);
    console.log(id + ': ' + JSON.stringify(result.rows[id]));
  }
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
