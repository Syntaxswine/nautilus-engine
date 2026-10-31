// Round 5: delete, undo and redo through the editor's own UI path (window.editor3d.apply for the
// removal, the toolbar's Undo and Redo buttons), on the rows of eight: removing one copy of a
// batched cluster of eight leaves seven, which draw per copy; undo must bring back exactly the
// first frame (pixels and culled asset draws), redo exactly the second. SwiftShader, reduced
// motion, the bench's capture() and culled(). Control: the frame after the removal must differ.
//   node undo-check.mjs <out.json> <tree> [map] [view]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const [outArg, treeArg, mapArg = 'w8-gross-rows-of-8', viewArg = 'overview'] = process.argv.slice(2), OUT = path.resolve(outArg), TREE = path.resolve(treeArg);
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), mapsDir = process.env.MAPS ? path.resolve(process.env.MAPS) : path.join(here, 'artifacts/bench/maps');
const probe = fs.readFileSync(path.join(here, 'tools/bench/editor-probe.js'), 'utf8'), sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16);
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
const result = {started: new Date().toISOString(), tree: '<tree>', map: mapArg, view: viewArg, steps: [], errors: []};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'}), page = await context.newPage();
  page.on('pageerror', e => result.errors.push('pageerror: ' + e.message)); page.on('console', m => {if (m.type() === 'error' || m.type() === 'warning') result.errors.push(m.type() + ': ' + m.text().slice(0, 300));});
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
  await page.addScriptTag({content: probe});
  const json = fs.readFileSync(path.join(mapsDir, mapArg + '.json'), 'utf8'), doc = JSON.parse(json), first = doc.buildingPrefabs.instances[0], last = doc.buildingPrefabs.instances.at(-1);
  const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'}, far: {x: last.x + 10, y: last.y + 10, span: 40, preset: '0'}}, cam = views[viewArg];
  const settle = () => page.waitForFunction(() => !window.editor3d.loading, null, {timeout: 120000}).then(() => page.evaluate(async () => {await new Promise(r => setTimeout(r, 50)); await window.editor3d.scene.prefabs.pending;}));
  const shot = async label => {
    const c = await page.evaluate(v => window.__bench.capture(v), cam), culled = await page.evaluate(v => window.__bench.culled(v, [1056, 916]), cam);
    const layer = await page.evaluate(() => {const p = window.editor3d.scene.prefabs; return {copies: p.models.size, copyBatches: p.instanced.length, batched: [...new Set(p.instanced.map(e => e.mesh.instanceCount))]};});
    const step = {label, sha: sha(Buffer.from(c.pixels, 'base64')), strictSha: sha(Buffer.from(c.strict, 'base64')), culled, layer, undoDisabled: await page.evaluate(() => document.getElementById('undo').disabled)};
    result.steps.push(step); console.log(label + ': ' + step.sha + ' ' + JSON.stringify(culled) + ' ' + JSON.stringify(layer)); return step;
  };
  await page.evaluate(j => window.nautilus.open(j), json); await settle();
  const a = await shot('opened');
  const removed = await page.evaluate(async id => (await window.editor3d.apply({tool: 'building-remove', options: {id}})), first.id); await settle();
  result.removed = {id: first.id, asset: first.asset, ok: removed?.ok, error: removed?.error};
  const b = await shot('one copy removed');
  await page.evaluate(() => document.getElementById('undo').click()); await settle();
  const c = await shot('undo');
  await page.evaluate(() => document.getElementById('redo').click()); await settle();
  const d = await shot('redo');
  await page.evaluate(() => document.getElementById('undo').click()); await settle();
  const e = await shot('undo again');
  result.verdict = {controlDiffers: a.sha !== b.sha, undoRestores: a.sha === c.sha && JSON.stringify(a.culled) === JSON.stringify(c.culled), redoRepeats: b.sha === d.sha && JSON.stringify(b.culled) === JSON.stringify(d.culled), undoAgain: a.sha === e.sha && JSON.stringify(a.culled) === JSON.stringify(e.culled)};
  console.log(JSON.stringify(result.verdict));
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
