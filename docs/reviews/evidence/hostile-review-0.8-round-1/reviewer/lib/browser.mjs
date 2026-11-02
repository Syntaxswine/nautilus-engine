// Task-owned headless Edge + loopback HTTP server, closed in a finally.
// Mirrors tools/art-review-browser.mjs (same Playwright resolution, same
// isolated launch), but keeps every receipt under artifacts/r08-1/.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {evidenceDir, loadPlaywright, mask} from './common.mjs';

const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.wasm': 'application/wasm'};

export async function withBrowser(root, callback, {angle = process.env.ANGLE || 'swiftshader', viewport = {width: 1600, height: 1100}, timeoutMs = 25 * 60 * 1000, mounts = {}} = {}) {
  const playwright = loadPlaywright();
  let server, browserServer, browser, expiry;
  const receipt = {angle, viewport, deviceScaleFactor: 1, startedAt: new Date().toISOString()};
  const errors = [], failedRequests = [];
  try {
    server = http.createServer((req, res) => {
      let file;
      try {
        let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (name.split('/').some((p) => p.startsWith('.'))) { res.writeHead(403).end(); return; }
        let base = root;
        for (const [prefix, dir] of Object.entries(mounts)) if (name.startsWith(prefix)) { base = dir; name = '/' + name.slice(prefix.length); break; }
        file = path.resolve(base, '.' + name);
        if (!file.startsWith(base + path.sep) && file !== base) { res.writeHead(403).end(); return; }
      } catch { res.writeHead(400).end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
      fs.createReadStream(file).pipe(res);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const args = angle === 'swiftshader' ? ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=' + angle, '--enable-gpu', '--ignore-gpu-blocklist'];
    browserServer = await playwright.chromium.launchServer({channel: 'msedge', headless: true, args});
    receipt.browserPid = browserServer.process().pid; receipt.port = server.address().port;
    expiry = setTimeout(() => { browser?.close().catch(() => {}); }, timeoutMs);
    browser = await playwright.chromium.connect(browserServer.wsEndpoint());
    receipt.browserVersion = browser.version();
    const context = await browser.newContext({viewport, deviceScaleFactor: 1});
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) failedRequests.push({url: r.url(), status: r.status()}); });
    const result = await callback({page, context, browser, baseURL: 'http://127.0.0.1:' + receipt.port, errors, failedRequests, receipt});
    return {result, errors, failedRequests, receipt};
  } finally {
    clearTimeout(expiry);
    try { await browser?.close(); } catch {}
    try { await browserServer?.close(); } catch {}
    if (server?.listening) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
    receipt.stoppedAt = new Date().toISOString();
    receipt.browserExited = browserServer ? browserServer.process().exitCode !== null || browserServer.process().signalCode !== null : null;
    receipt.httpClosed = server ? !server.listening : null;
    fs.appendFileSync(path.join(evidenceDir, 'results', 'browser-receipts.jsonl'), mask(JSON.stringify(receipt)) + '\n');
  }
}
