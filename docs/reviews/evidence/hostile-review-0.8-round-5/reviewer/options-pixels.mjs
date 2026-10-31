// Round 5: are the editor-path survivors visible? Each built tree's editor opens a map, then the
// toolbar's options are set as the toolbar sets them (setOptions, then the prefab update it
// starts), and the overview is captured (SwiftShader, reduced motion, the bench's capture()) with
// the culled asset draws: the exterior (the control: no mutant touches it), Walls off, Roofs off.
//   node options-pixels.mjs <out.json> <arm>=<tree> ... -- <map>
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const argv = process.argv.slice(2), sep = argv.indexOf('--'), OUT = path.resolve(argv[0]), mapId = argv[sep + 1];
const arms = argv.slice(1, sep).map(a => {const [name, tree] = a.split('='); return {name, tree: path.resolve(tree)};});
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), mapsDir = process.env.MAPS ? path.resolve(process.env.MAPS) : path.join(here, 'artifacts/bench/maps');
const probe = fs.readFileSync(path.join(here, 'tools/bench/editor-probe.js'), 'utf8'), sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16);
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
const settings = {exterior: {showAllLevels: true, level: 0, roofs: true, walls: true}, wallsOff: {showAllLevels: true, level: 0, roofs: true, walls: false}, roofsOff: {showAllLevels: true, level: 0, roofs: false, walls: true}};
const result = {started: new Date().toISOString(), map: mapId, arms: arms.map(a => a.name), shots: {}, errors: []};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  const json = fs.readFileSync(path.join(mapsDir, mapId + '.json'), 'utf8'), view = {x: 119.5, y: 119.5, span: 250, preset: '0'}, px = {};
  for (const a of arms) {
    const page = await context.newPage();
    page.on('pageerror', e => result.errors.push(a.name + ': ' + e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/${a.name}/index.html`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.addScriptTag({content: probe});
    await page.evaluate(async j => {await window.nautilus.open(j); await window.editor3d.scene.prefabs.pending;}, json);
    result.shots[a.name] = {};
    for (const [name, options] of Object.entries(settings)) {
      await page.evaluate(async o => {const s = window.editor3d.scene; s.setOptions(o); await s.prefabs.pending;}, options);
      const c = await page.evaluate(v => window.__bench.capture(v), view), culled = await page.evaluate(v => window.__bench.culled(v, [1056, 916]), view);
      px[a.name + ':' + name] = Buffer.from(c.pixels, 'base64');
      result.shots[a.name][name] = {sha: sha(px[a.name + ':' + name]), culled};
    }
    await page.close();
  }
  const differ = (x, y) => {let n = 0; for (let i = 0; i < x.length; i += 4) if (x[i] !== y[i] || x[i + 1] !== y[i + 1] || x[i + 2] !== y[i + 2] || x[i + 3] !== y[i + 3]) n++; return n;};
  result.against = {};
  for (const a of arms.slice(1)) result.against[a.name] = Object.fromEntries(Object.keys(settings).map(k => [k, differ(px[arms[0].name + ':' + k], px[a.name + ':' + k])]));
  result.optionChanges = Object.fromEntries(arms.map(a => [a.name, {wallsOff: differ(px[a.name + ':exterior'], px[a.name + ':wallsOff']), roofsOff: differ(px[a.name + ':exterior'], px[a.name + ':roofsOff'])}]));
  console.log(JSON.stringify({shots: result.shots, against: result.against, optionChanges: result.optionChanges}, null, 1));
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
