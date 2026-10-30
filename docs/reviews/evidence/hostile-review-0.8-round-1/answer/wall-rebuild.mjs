// Paired A/B of the editor's wall rebuild (it runs on every edit): both built
// editors as two pages of one GPU Edge, the wall workloads opened, then
// scene.rebuildWalls() timed in alternating blocks.
//   node wall-rebuild.mjs <tree a> <tree b> <maps dir>
import {createRequire} from 'node:module';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const [a, b, mapsDir] = process.argv.slice(2);
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const pw = require('playwright'), roots = {a: path.join(a, 'dist'), b: path.join(b, 'dist')};
const types = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream'};
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://x').pathname).split('/').filter(Boolean), base = roots[parts.shift()];
  if (!base) return res.writeHead(404).end();
  let file = path.join(base, ...parts); if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']}), result = {browser: browser.version(), maps: {}};
try {
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1}), pages = {};
  for (const arm of ['a', 'b']) {
    pages[arm] = await context.newPage();
    await pages[arm].goto('http://127.0.0.1:' + server.address().port + '/' + arm + '/index.html', {waitUntil: 'networkidle'});
    await pages[arm].waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
  }
  for (const id of ['w5a-walls-axis', 'w5b-walls-free-angle']) {
    const json = fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'), record = {a: [], b: []};
    for (const arm of ['a', 'b']) await pages[arm].evaluate(j => window.nautilus.open(j), json);
    for (let k = 0; k < 8; k++) for (const arm of [0, 3].includes(k % 4) ? ['a', 'b'] : ['b', 'a'])
      record[arm].push(await pages[arm].evaluate(() => {const s = window.editor3d.scene, out = []; for (let i = 0; i < 5; i++) {const t = performance.now(); s.rebuildWalls(); out.push(performance.now() - t);} return out;}));
    const median = v => {const s = v.flat().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
    const meshes = await Promise.all(['a', 'b'].map(arm => pages[arm].evaluate(() => window.editor3d.scene.wallGroup.children.filter(m => m.isInstancedMesh).length)));
    result.maps[id] = {rebuildMs: {a: +median(record.a).toFixed(2), b: +median(record.b).toFixed(2)}, speedup: +(median(record.a) / median(record.b)).toFixed(2), instancedMeshes: {a: meshes[0], b: meshes[1]}, samples: 40};
  }
} finally {await browser.close(); server.close();}
console.log(JSON.stringify(result, null, 1));
