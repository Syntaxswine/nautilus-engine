// Round-2 pixel probe: both trees' built editors as two pages of one headless
// Edge on SwiftShader, one origin (/a/ baseline, /b/ candidate).
//   node pixel-probe.mjs --a <baseline> --b <candidate> --cases <cases.json> --out <result.json>
// Each case is {map, view: overview|close|{x,y,span,preset}, cutaway}. For every
// differing pixel it reports two oracles:
//   weak   (the answer's): the pixel is a depth tie in either arm (<= vs < differ)
//   strong: one arm's <= pixel equals the other arm's < pixel, i.e. the
//           difference is exactly a reversed tie resolution
// Browser and server are closed in a finally. PNGs of differing cases are written.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), option = (n, f) => {const i = args.indexOf('--' + n); return i < 0 ? f : args[i + 1];};
const trees = {a: path.resolve(option('a')), b: path.resolve(option('b'))};
const cases = JSON.parse(fs.readFileSync(path.resolve(option('cases')), 'utf8').replace(/^﻿/, ''));
const out = path.resolve(option('out', path.join(here, 'pixel-probe.json')));
const pngDir = out.replace(/\.json$/, '') + '-png';
const sha = d => createHash('sha256').update(d).digest('hex');
const git = (dir, ...rest) => {try {return execFileSync('git', ['-C', dir, ...rest], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();} catch {return null;}};

function playwright() {
  const require = createRequire(import.meta.url);
  const modules = process.env.NAUTILUS_ART_NODE_MODULES || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  return createRequire(path.join(modules, 'playwright/package.json'))('playwright');
}
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.bin': 'application/octet-stream', '.gltf': 'model/gltf+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const served = {a: new Map(), b: new Map()};
const roots = {a: path.join(trees.a, 'dist'), b: path.join(trees.b, 'dist')};
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1'), parts = decodeURIComponent(url.pathname).split('/').filter(Boolean), arm = parts.shift(), base = roots[arm];
    if (!base || parts.some(p => p.startsWith('.') || p.includes('\\'))) {res.writeHead(404).end(); return;}
    let file = path.resolve(base, ...parts);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end(); return;}
    const data = fs.readFileSync(file); served[arm].set(parts.join('/'), sha(data));
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
  } catch {res.writeHead(400).end();}
});

// Minimal PNG writer (RGBA, rows flipped from GL order).
const crcTable = Array.from({length: 256}, (_, n) => {let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;});
const crc = buf => {let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;};
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, (h - 1 - y) * w * 4, (h - y) * w * 4);}
  const chunk = (type, data) => {const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]);};
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const result = {script: 'pixel-probe.mjs', started: new Date().toISOString(), rig: {node: process.version, platform: process.platform + ' ' + os.release(), cpu: os.cpus()[0]?.model},
  trees: {a: {dir: '<baseline>', head: git(trees.a, 'rev-parse', 'HEAD'), status: git(trees.a, 'status', '--short')}, b: {dir: '<candidate>', head: git(trees.b, 'rev-parse', 'HEAD'), status: git(trees.b, 'status', '--short')}}, cases: []};
const probe = fs.readFileSync(path.join(here, 'pixel-probe-page.js'), 'utf8');
let browser;
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port, pw = playwright();
  browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  result.browser = browser.version();
  // --reduced-motion: the editor then passes no clock to its lights, so fire does not flicker between frames.
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, ...(args.includes('--reduced-motion') ? {reducedMotion: 'reduce'} : {})}), pages = {}, errors = [];
  result.reducedMotion = args.includes('--reduced-motion');
  for (const arm of ['a', 'b']) {
    const page = pages[arm] = await context.newPage();
    page.on('pageerror', e => errors.push(arm + ': ' + e.message)); page.on('console', m => {if (m.type() === 'error') errors.push(arm + ': ' + m.text());});
    await page.goto('http://127.0.0.1:' + port + '/' + arm + '/index.html', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
    await page.addScriptTag({content: probe});
  }
  let openMap = null;
  for (const c of cases) {
    const json = fs.readFileSync(path.resolve(here, c.map), 'utf8'), first = JSON.parse(json).buildingPrefabs?.instances[0];
    if (openMap !== c.map) {for (const arm of ['a', 'b']) await pages[arm].evaluate(j => window.nautilus.open(j), json); openMap = c.map; for (const arm of ['a', 'b']) await pages[arm].waitForTimeout(150);}
    const view = typeof c.view === 'object' ? c.view : c.view === 'overview' ? {x: 119.5, y: 119.5, span: 250, preset: '0'} : first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'};
    const cap = {};
    let noDoors = null;
    for (const arm of ['a', 'b']) {
      await pages[arm].evaluate(([on, level]) => window.__probe.cutaway(on, level), [!!c.cutaway, c.level || 0]);
      cap[arm] = await pages[arm].evaluate(v => window.__probe.capture(v), view);
      cap[arm].info = await pages[arm].evaluate(() => window.__probe.info());
      if (arm === 'a' && c.doors) noDoors = await pages.a.evaluate(v => window.__probe.withoutDoors(v), view);
      await pages[arm].evaluate(() => window.__probe.cutaway(false));
    }
    const W = cap.a.width, H = cap.a.height, A = Buffer.from(cap.a.le, 'base64'), B = Buffer.from(cap.b.le, 'base64'), Al = Buffer.from(cap.a.lt, 'base64'), Bl = Buffer.from(cap.b.lt, 'base64');
    const px = (buf, p) => buf.readUInt32LE(p * 4);
    let differing = 0, weak = 0, strong = 0, ties = 0, maxDelta = 0, maxUnexplainedStrong = 0, unexplainedStrong = 0, unexplainedWeak = 0, weakNotStrong = 0;
    let box = null; const mask = Buffer.alloc(W * H * 4);
    for (let p = 0; p < W * H; p++) {
      const tie = px(A, p) !== px(Al, p) || px(B, p) !== px(Bl, p); if (tie) ties++;
      if (px(A, p) === px(B, p)) {mask[p * 4] = A[p * 4] >> 2; mask[p * 4 + 1] = A[p * 4 + 1] >> 2; mask[p * 4 + 2] = A[p * 4 + 2] >> 2; mask[p * 4 + 3] = 255; continue;}
      differing++; let d = 0; for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A[p * 4 + k] - B[p * 4 + k])); maxDelta = Math.max(maxDelta, d);
      const s = px(B, p) === px(Al, p) || px(A, p) === px(Bl, p);
      if (tie) weak++; else unexplainedWeak++;
      if (s) strong++; else {unexplainedStrong++; maxUnexplainedStrong = Math.max(maxUnexplainedStrong, d);}
      if (tie && !s) weakNotStrong++;
      const x = p % W, y = H - 1 - Math.floor(p / W);
      box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
      mask[p * 4] = s ? 0 : 255; mask[p * 4 + 1] = s ? 255 : tie ? 160 : 0; mask[p * 4 + 2] = 0; mask[p * 4 + 3] = 255;
    }
    // Round 3: the answer's classes (tie by the strong oracle; edge = a colour step above
    // 24 levels to a 4-neighbour in either arm; shading = delta <= 2; else neither), plus
    // 8-connected components of the differing pixels. Rounding scatters single pixels;
    // a real defect (a misplaced or missing part) makes a blob.
    const r3 = (() => {
      const step = (buf, p, q) => {let d = 0; for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(buf[p * 4 + k] - buf[q * 4 + k])); return d;};
      const diff = new Uint8Array(W * H); const cls = {tie: 0, edge: 0, shading: 0, neither: 0}, maxBy = {tie: 0, edge: 0, shading: 0, neither: 0};
      for (let p = 0; p < W * H; p++) {
        if (px(A, p) === px(B, p)) continue; diff[p] = 1;
        let d = 0; for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A[p * 4 + k] - B[p * 4 + k]));
        const x = p % W, y = Math.floor(p / W);
        const strongTie = px(B, p) === px(Al, p) || px(A, p) === px(Bl, p);
        let edge = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (step(A, p, q) > 24 || step(B, p, q) > 24) {edge = true; break;}}
        const k = strongTie ? 'tie' : edge ? 'edge' : d <= 2 ? 'shading' : 'neither'; cls[k]++; maxBy[k] = Math.max(maxBy[k], d);
      }
      let edgePixels = 0; for (let p = 0; p < W * H; p++) {const x = p % W, y = Math.floor(p / W); for (const [dx, dy] of [[1, 0], [0, 1]]) {const X = x + dx, Y = y + dy; if (X >= W || Y >= H) continue; if (step(A, p, Y * W + X) > 24) {edgePixels++; break;}}}
      const seen = new Uint8Array(W * H), sizes = [];
      for (let p = 0; p < W * H; p++) if (diff[p] && !seen[p]) {
        let n = 0; const stack = [p]; seen[p] = 1;
        while (stack.length) {const q = stack.pop(); n++; const x = q % W, y = Math.floor(q / W); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const r = Y * W + X; if (diff[r] && !seen[r]) {seen[r] = 1; stack.push(r);}}}
        sizes.push(n);
      }
      sizes.sort((a, b) => b - a);
      return {classes: cls, maxDeltaByClass: maxBy, edgePixelShareOfFrame: edgePixels / (W * H), components: sizes.length, largestComponents: sizes.slice(0, 5), pixelsInComponentsOf4OrMore: sizes.filter(s => s >= 4).reduce((n, s) => n + s, 0)};
    })();
    // Door attribution: how many differing pixels lie where hiding the baseline's door pivots changes the frame (3x3 neighbourhood).
    let doorRow = null;
    if (noDoors) {
      const D = Buffer.from(noDoors.frame, 'base64'), doorPx = p => px(A, p) !== px(D, p);
      let coverage = 0, inMask = 0, near = 0, total = 0;
      for (let p = 0; p < W * H; p++) {
        if (doorPx(p)) coverage++;
        if (px(A, p) === px(B, p)) continue; total++;
        if (doorPx(p)) {inMask++; near++; continue;}
        const x = p % W, y = Math.floor(p / W); let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1 && !hit; dx++) {const q = (y + dy) * W + x + dx; if (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H && doorPx(q)) hit = true;}
        if (hit) near++;
      }
      doorRow = {doorPivotsHidden: noDoors.doors, doorCoveragePixels: coverage, doorCoverageShare: coverage / (W * H), differingOnDoorPixels: inMask, differingWithinOnePixelOfDoors: near, differing: total};
    }
    const row = {name: c.name, map: path.basename(c.map), view, cutaway: !!c.cutaway, pixels: W * H, differing, maxDelta, r3, doors: doorRow, weakExplained: weak, strongExplained: strong, unexplainedWeak, unexplainedStrong, weakButNotStrong: weakNotStrong, maxDeltaUnexplainedStrong: maxUnexplainedStrong,
      tiePixels: ties, tieShare: ties / (W * H), boundingBox: box, repeatIdentical: {a: cap.a.repeatIdentical, b: cap.b.repeatIdentical}, counts: {a: cap.a.counts, b: cap.b.counts}, info: {a: cap.a.info, b: cap.b.info}, sha: {a: sha(A), b: sha(B)}};
    if (differing && c.png !== false) {
      fs.mkdirSync(pngDir, {recursive: true});
      const stem = c.name.replace(/[^a-z0-9-]+/gi, '_');
      fs.writeFileSync(path.join(pngDir, stem + '-a.png'), png(W, H, A)); fs.writeFileSync(path.join(pngDir, stem + '-b.png'), png(W, H, B)); fs.writeFileSync(path.join(pngDir, stem + '-diff.png'), png(W, H, mask));
      row.png = stem;
    }
    result.cases.push(row);
    process.stdout.write(`${c.name}: ${differing} differ (max ${maxDelta}); classes ${JSON.stringify(r3.classes)} components ${r3.components} largest ${r3.largestComponents.join('/')}; weak ${weak}, strong ${strong}, unexplained strong ${unexplainedStrong} (max ${maxUnexplainedStrong}); ties ${(ties / (W * H) * 100).toFixed(2)}% of frame; calls ${cap.a.counts.calls}/${cap.b.counts.calls}; repeat ${cap.a.repeatIdentical}/${cap.b.repeatIdentical}\n`);
  }
  if (errors.length) result.pageErrors = errors;
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
}
for (const arm of ['a', 'b']) result['served_' + arm] = {files: served[arm].size, digest: sha([...served[arm]].sort().map(([f, h]) => f + ' ' + h).join('\n'))};
result.finished = new Date().toISOString();
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log('Wrote ' + out);
