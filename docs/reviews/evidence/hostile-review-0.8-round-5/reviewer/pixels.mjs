// Round 4 reviewer's pixels.mjs, reused in round 5 (MAPS=<dir> picks the maps). Round 4 pixel probe (SwiftShader, reduced motion), several built trees as pages of one
// headless Edge on one origin. Each page opens the map's reference blank, then the map,
// and captures every view with the bench's own capture() (frame + strict-depth frame).
//   node pixels.mjs <out.json> <arm>=<tree>[@nomd|@counts] ... -- <map>[,<map>...]
// '@nomd' hides WEBGL_multi_draw from that page (not ':': Git Bash rewrites 'path:word' as a path list) before the renderer starts (three then
// takes its per-sub-draw fallback). Views: overview, close (first building), far (last),
// cutaway (level 0), cut1 (level-1 cutaway), at the bench's own cameras.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const argv = process.argv.slice(2), sep = argv.indexOf('--'), OUT = path.resolve(argv[0]);
// '<tree>@nomd' hides WEBGL_multi_draw; '<tree>@counts' also measures that arm's culled asset
// draws from real (unstubbed) frames at the fixture's 1056 x 916 canvas, for the culled fixture.
const arms = argv.slice(1, sep).map(a => {const [name, rest] = a.split('='); let tree = rest; const flags = new Set(); for (const f of ['nomd', 'counts']) if (tree.endsWith('@' + f)) {flags.add(f); tree = tree.slice(0, -f.length - 1);} return {name, tree: path.resolve(tree), nomd: flags.has('nomd'), counts: flags.has('counts')};});
const maps = argv[sep + 1].split(','), viewsWanted = (argv[sep + 2] || 'overview,close,far,cutaway,cut1').split(',');
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mapsDir = process.env.MAPS ? path.resolve(process.env.MAPS) : path.join(here, 'artifacts/bench/maps'), probe = fs.readFileSync(path.join(here, 'tools/bench/editor-probe.js'), 'utf8');
const all = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const parsed = Object.fromEntries(all.map(id => [id, JSON.parse(fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'))]));
const blanks = all.filter(id => !(parsed[id].buildingPrefabs?.instances?.length || parsed[id].wallRuns?.segments?.length || parsed[id].slopedRoofs?.roofs?.length));
const reference = id => blanks.find(b => JSON.stringify(parsed[b].props || []) === JSON.stringify(parsed[id].props || []));
const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16);
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const pw = require('playwright');
const roots = Object.fromEntries(arms.map(a => [a.name, path.join(a.tree, 'dist')]));
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).split('/').filter(Boolean), base = roots[parts.shift()];
  if (!base || parts.some(p => p.startsWith('.'))) {res.writeHead(404).end(); return;}
  let file = path.resolve(base, ...parts); if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) {res.writeHead(404).end(); return;}
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(file));
});
const HIDE_MD = `(() => {const g = WebGL2RenderingContext.prototype.getExtension, s = WebGL2RenderingContext.prototype.getSupportedExtensions;
  WebGL2RenderingContext.prototype.getExtension = function (n) {return /multi_draw/i.test(n) ? null : g.call(this, n);};
  WebGL2RenderingContext.prototype.getSupportedExtensions = function () {return (s.call(this) || []).filter(n => !/multi_draw/i.test(n));};})();`;
const result = {started: new Date().toISOString(), arms: arms.map(a => ({name: a.name, tree: '<' + a.name + '>', nomd: a.nomd})), maps, views: viewsWanted, captures: {}, compare: []};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  const pages = {}, errors = [];
  for (const a of arms) {
    const page = pages[a.name] = await context.newPage();
    if (a.nomd) await page.addInitScript(HIDE_MD);
    page.on('pageerror', e => errors.push(a.name + ': ' + e.message)); page.on('console', m => {if (m.type() === 'error' || m.type() === 'warning') errors.push(a.name + ' ' + m.type() + ': ' + m.text().slice(0, 300));});
    await page.goto(`http://127.0.0.1:${port}/${a.name}/index.html`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.addScriptTag({content: probe});
    result.captures[a.name] = {multiDraw: await page.evaluate(() => !!window.editor3d.scene.renderer.extensions.has('WEBGL_multi_draw'))};
  }
  for (const id of maps) {
    const placed = parsed[id].buildingPrefabs?.instances || [], first = placed[0], last = placed.at(-1);
    const cams = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'},
      far: last ? {x: last.x + 10, y: last.y + 10, span: 40, preset: '0'} : {x: 190, y: 190, span: 40, preset: '0'}};
    for (const a of arms) {
      const page = pages[a.name], t0 = Date.now();
      await page.evaluate(b => window.nautilus.open(b), fs.readFileSync(path.join(mapsDir, reference(id) + '.json'), 'utf8'));
      await page.evaluate(j => window.nautilus.open(j), fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'));
      const shots = result.captures[a.name][id] = {};
      for (const v of viewsWanted) {
        const level = v === 'cutaway' ? 0 : v === 'cut1' ? 1 : null, cam = level === null ? cams[v] : cams.overview;
        await page.evaluate(async lv => {const s = window.editor3d.scene; s.setOptions(lv === null ? {showAllLevels: true, level: 0} : {showAllLevels: false, level: lv}); await s.prefabs.update(window.editor3d.document, s.options);}, level);
        const c = await page.evaluate(c => window.__bench.capture(c), cam), file = path.join(path.dirname(OUT), 'px', `${a.name}-${id}-${v}.json`);
        fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, JSON.stringify(c));
        const counts = await page.evaluate(async c => (await window.__bench.frames(1, c, {warmup: 1})).counts, cam);
        shots[v] = {file: path.basename(file), w: c.width, h: c.height, sha: sha(Buffer.from(c.pixels, 'base64')), counts};
        if (a.counts && v !== 'cut1') shots[v].culledReal = await page.evaluate(([c, z]) => window.__bench.culled(c, z), [cam, [1056, 916]]);
      }
      await page.evaluate(() => {const s = window.editor3d.scene; s.setOptions({showAllLevels: true, level: 0});});
      process.stdout.write(`${a.name} ${id}: ${((Date.now() - t0) / 1000).toFixed(0)} s ` + viewsWanted.map(v => v + ' ' + shots[v].sha.slice(0, 8) + ' ' + shots[v].counts.calls + 'c').join(', ') + '\n');
    }
  }
  result.errors = errors;
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
