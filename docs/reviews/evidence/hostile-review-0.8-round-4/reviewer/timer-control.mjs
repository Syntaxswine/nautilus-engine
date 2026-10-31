// Round 4 control for the bench's GPU time (EXT_disjoint_timer_query_webgl2 TIME_ELAPSED):
// the same frames, the same GPU work, with the page's CPU throttled (CDP
// Emulation.setCPUThrottlingRate). If the GPU elapsed time follows the throttle, it is
// measuring the command feed (idle gaps included), not the GPU's own work.
//   node timer-control.mjs <out.json> <arm>=<tree> ... -- <map> [rates, default 1,3]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const argv = process.argv.slice(2), sep = argv.indexOf('--'), OUT = path.resolve(argv[0]);
const arms = argv.slice(1, sep).map(a => {const [name, tree] = a.split('='); return {name, tree: path.resolve(tree)};}), map = argv[sep + 1], rates = (argv[sep + 2] || '1,3').split(',').map(Number);
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
const result = {started: new Date().toISOString(), map, rates, rows: []};
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  const pages = {};
  for (const a of arms) {
    const page = pages[a.name] = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/${a.name}/index.html`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.addScriptTag({content: probe});
    await page.evaluate(j => window.nautilus.open(j), fs.readFileSync(path.join(mapsDir, map + '.json'), 'utf8'));
    pages[a.name].cdp = await context.newCDPSession(page);
  }
  const view = {x: 119.5, y: 119.5, span: 250, preset: '0'};
  // Blocks: rates in A B B A order per arm pair, repeated.
  for (let rep = 0; rep < 3; rep++) for (const rate of rep % 2 ? [...rates].reverse() : rates) for (const a of rep % 2 ? [...arms].reverse() : arms) {
    const page = pages[a.name];
    await page.cdp.send('Emulation.setCPUThrottlingRate', {rate});
    try {
      for (const mode of ['assets', null]) {
        await page.evaluate(m => window.__bench.isolate(m), mode);
        try {
          const f = await page.evaluate(v => window.__bench.frames(20, v), view);
          result.rows.push({rep, rate, arm: a.name, mode: mode || 'whole', cpu: median(f.cpu), total: median(f.total), gpu: f.gpu ? median(f.gpu) : null, calls: f.counts.calls});
          const r = result.rows.at(-1); console.log(`rep ${rep} rate ${rate} ${a.name} ${r.mode}: cpu ${r.cpu.toFixed(2)} total ${r.total.toFixed(2)} gpu ${r.gpu?.toFixed(2)} ms, ${r.calls} calls`);
        } finally {await page.evaluate(() => window.__bench.isolate(null));}
      }
    } finally {await page.cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});}
  }
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  result.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
