// Round 4: reconcile the headless count's level-1 cutaway ('upper', pinned in
// tests/fixtures/asset-draw-counts.json but never checked in a browser) with the real
// editor, as --expect reconciles the exterior and the level-0 cutaway (the control).
// SwiftShader, draws stubbed (the --counts-only method), culling off on the asset meshes.
//   node upper-check.mjs <out.json> <tree> [<map>,...]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const [outArg, treeArg, mapsArg] = process.argv.slice(2), OUT = path.resolve(outArg), tree = path.resolve(treeArg);
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), mapsDir = path.join(here, 'artifacts/bench/maps'), probe = fs.readFileSync(path.join(here, 'tools/bench/editor-probe.js'), 'utf8');
const pinned = JSON.parse(fs.readFileSync(path.join(tree, 'tests/fixtures/asset-draw-counts.json'), 'utf8')).workloads;
const maps = mapsArg ? mapsArg.split(',') : Object.keys(pinned);
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')), pw = require('playwright');
const base = path.join(tree, 'dist');
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).split('/').filter(Boolean); parts.shift();
  if (parts.some(p => p.startsWith('.'))) {res.writeHead(404).end(); return;}
  let file = path.resolve(base, ...parts); if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) {res.writeHead(404).end(); return;}
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(file));
});
const all = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)), parsed = Object.fromEntries(all.map(id => [id, JSON.parse(fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'))]));
const blank = id => all.find(b => !(parsed[b].buildingPrefabs?.instances?.length || parsed[b].wallRuns?.segments?.length || parsed[b].slopedRoofs?.roofs?.length) && JSON.stringify(parsed[b].props || []) === JSON.stringify(parsed[id].props || []));
const result = {started: new Date().toISOString(), tree: '<tree>', rows: []};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'}), page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/t/index.html`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
  await page.addScriptTag({content: probe});
  const view = {x: 119.5, y: 119.5, span: 250, preset: '0'};
  for (const id of maps) {
    await page.evaluate(b => window.nautilus.open(b), fs.readFileSync(path.join(mapsDir, blank(id) + '.json'), 'utf8'));
    await page.evaluate(j => window.nautilus.open(j), fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'));
    await page.evaluate(() => window.__bench.stubDraws(true));
    try {
      for (const [state, options] of [['exterior', {showAllLevels: true, level: 0}], ['cutaway', {showAllLevels: false, level: 0}], ['upper', {showAllLevels: false, level: 1}]]) {
        const measured = await page.evaluate(async ([o, v]) => {const s = window.editor3d.scene; s.setOptions(o); await s.prefabs.update(window.editor3d.document, s.options); return window.__bench.unculled(v, [1056, 916]);}, [options, view]);
        const layers = pinned[id][state], sum = k => Object.values(layers).reduce((t, l) => t + l[k], 0), expected = {main: sum('main'), shadow: sum('shadow'), triangles: sum('mainTriangles') + sum('shadowTriangles')};
        const row = {map: id, state, measured, expected, equal: JSON.stringify(measured) === JSON.stringify(expected)}; result.rows.push(row);
        console.log(`${id} ${state}: ${row.equal ? 'equal' : 'DIFFER'} measured ${JSON.stringify(measured)} pinned ${JSON.stringify(expected)}`);
      }
    } finally {await page.evaluate(() => {window.__bench.stubDraws(false); window.editor3d.scene.setOptions({showAllLevels: true, level: 0});});}
  }
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
