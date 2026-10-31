// Paired A/B of a wall edit as the author sees it: rebuildWalls() followed by
// one synchronous frame (draw + 1-pixel readPixels), so buffer uploads of the
// new instance sets are included. Two pages of one GPU Edge, blocks A B B A.
//   node wall-edit.mjs <tree a> <tree b> <maps dir> <out.json>
import {createRequire} from 'node:module';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const [a, b, mapsDir, outFile] = process.argv.slice(2);
const require = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const pw = require('playwright'), roots = {a: path.join(a, 'dist'), b: path.join(b, 'dist')};
const types = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://x').pathname).split('/').filter(Boolean), base = roots[parts.shift()];
  if (!base || parts.some(p => p.startsWith('.'))) return res.writeHead(404).end();
  let file = path.join(base, ...parts); if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(fs.readFileSync(file));
});
const median = v => {const s = v.flat().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
let browser; const result = {script: 'wall-edit.mjs', started: new Date().toISOString(), maps: {}};
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']}); result.browser = browser.version();
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
      record[arm].push(await pages[arm].evaluate(() => {
        const s = window.editor3d.scene, r = s.renderer, gl = r.getContext(), c = r.domElement, view = {x: 119.5, y: 119.5, span: 250, preset: '0'}, out = [];
        s.draw(view, c.clientWidth, c.clientHeight); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        for (let i = 0; i < 5; i++) {const t = performance.now(); s.rebuildWalls(); s.draw(view, c.clientWidth, c.clientHeight); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); out.push(performance.now() - t);}
        return out;
      }));
    result.maps[id] = {editPlusFrameMs: {a: +median(record.a).toFixed(2), b: +median(record.b).toFixed(2)}, speedup: +(median(record.a) / median(record.b)).toFixed(2), samples: record.a.flat().length};
  }
} finally {if (browser) await browser.close(); server.close();}
result.finished = new Date().toISOString();
fs.writeFileSync(outFile, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
