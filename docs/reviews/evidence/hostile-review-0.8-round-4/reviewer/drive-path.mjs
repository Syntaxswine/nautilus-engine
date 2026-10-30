// Round 4: the editor's own drive path for a level view. The bench's cutaway() and the
// headless count both call prefabs.update() themselves after setOptions(); the editor's UI
// relies on setOptions() -> rebuild() alone. Here each arm switches to the level-0 cutaway
// through setOptions() only, waits for the prefab layer to settle, and counts its culled
// asset draws (draws stubbed) and the prefab batches' drawn groups; then the bench's way.
//   node drive-path.mjs <out.json> <arm>=<tree> ... -- <map>
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const argv = process.argv.slice(2), sep = argv.indexOf('--'), OUT = path.resolve(argv[0]);
const arms = argv.slice(1, sep).map(a => {const [name, tree] = a.split('='); return {name, tree: path.resolve(tree)};}), map = argv[sep + 1];
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
const result = {started: new Date().toISOString(), map, arms: {}};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  for (const a of arms) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/${a.name}/index.html`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.addScriptTag({content: probe});
    await page.evaluate(j => window.nautilus.open(j), fs.readFileSync(path.join(mapsDir, map + '.json'), 'utf8'));
    const view = {x: 119.5, y: 119.5, span: 250, preset: '0'};
    const measure = () => page.evaluate(async v => {
      const s = window.editor3d.scene, groups = s.prefabs.instanced.reduce((n, {mesh}) => n + (mesh.visible ? mesh.geometry.groups.length : 0), 0);
      window.__bench.stubDraws(true); try {return {prefabOptions: {showAllLevels: s.prefabs.options.showAllLevels, level: s.prefabs.options.level}, batchGroups: groups, culled: await window.__bench.culled(v, [1056, 916])};} finally {window.__bench.stubDraws(false);}
    }, view);
    const rows = {exterior: await measure()};
    // The editor's own path: setOptions() alone (its rebuild() starts the prefab update).
    await page.evaluate(() => window.editor3d.scene.setOptions({showAllLevels: false, level: 0}));
    await page.waitForTimeout(3000);
    rows.cutawayBySetOptions = await measure();
    // The bench's path: setOptions() and then prefabs.update() itself.
    await page.evaluate(async () => {const s = window.editor3d.scene; s.setOptions({showAllLevels: false, level: 0}); await s.prefabs.update(window.editor3d.document, s.options);});
    rows.cutawayAsTheBench = await measure();
    result.arms[a.name] = rows;
    for (const [k, v] of Object.entries(rows)) console.log(a.name, k, JSON.stringify(v));
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
