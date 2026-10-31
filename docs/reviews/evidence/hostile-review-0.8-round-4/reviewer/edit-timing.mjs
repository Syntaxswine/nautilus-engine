// Round 4: the other path CopyBatch touches, paired. Two pages of one headless Edge (GPU),
// each arm opens the map; then blocks A B B A of N edits (one copy moved by a tile and back,
// through scene.update, as an edit or an undo takes it) and N view toggles (cutaway on/off
// through setOptions + the prefab update), each followed by one drawn frame. Reports the
// median ms per edit and per toggle (update + first frame) per arm and block.
//   node edit-timing.mjs <out.json> <arm>=<tree> <arm>=<tree> -- <map> [N]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const argv = process.argv.slice(2), sep = argv.indexOf('--'), OUT = path.resolve(argv[0]);
const arms = argv.slice(1, sep).map(a => {const [name, tree] = a.split('='); return {name, tree: path.resolve(tree)};}), map = argv[sep + 1], N = Number(argv[sep + 2] || 10);
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
const median = v => {const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;};
const result = {started: new Date().toISOString(), map, N, blocks: []};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'}), pages = {};
  for (const a of arms) {
    const page = pages[a.name] = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/${a.name}/index.html`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.addScriptTag({content: probe});
    await page.evaluate(j => window.nautilus.open(j), fs.readFileSync(path.join(mapsDir, map + '.json'), 'utf8'));
  }
  const order = [arms[0].name, arms[1].name, arms[1].name, arms[0].name, arms[0].name, arms[1].name, arms[1].name, arms[0].name];
  for (const [k, name] of order.entries()) {
    const t = await pages[name].evaluate(async n => {
      const s = window.editor3d.scene, doc = window.editor3d.document, view = {x: 119.5, y: 119.5, span: 250, preset: '0'}, c = s.renderer.domElement, gl = s.renderer.getContext(), px = new Uint8Array(4);
      const frame = () => {s.draw(view, c.clientWidth, c.clientHeight); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);};
      const edits = [], toggles = [];
      for (let i = 0; i < n; i++) {
        const next = structuredClone(doc); next.map.buildingPrefabs.instances[0].y += (i % 2 ? 0 : 1);
        const t0 = performance.now(); await s.update(next); frame(); edits.push(performance.now() - t0);
      }
      await s.update(doc); frame();
      for (let i = 0; i < n; i++) {const t0 = performance.now(); s.setOptions({showAllLevels: i % 2 === 1, level: 0}); await s.prefabs.update(doc, s.options); frame(); toggles.push(performance.now() - t0);}
      s.setOptions({showAllLevels: true, level: 0}); await s.prefabs.update(doc, s.options); frame();
      return {edits, toggles};
    }, N);
    result.blocks.push({block: k, arm: name, editMs: median(t.edits), toggleMs: median(t.toggles)});
    console.log(`block ${k} ${name}: edit ${median(t.edits).toFixed(1)} ms, toggle ${median(t.toggles).toFixed(1)} ms`);
  }
  for (const a of arms) {const b = result.blocks.filter(x => x.arm === a.name); result[a.name] = {editMs: median(b.map(x => x.editMs)), toggleMs: median(b.map(x => x.toggleMs))};}
  console.log(JSON.stringify(Object.fromEntries(arms.map(a => [a.name, result[a.name]]))));
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
