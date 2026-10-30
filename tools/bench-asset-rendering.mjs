// Asset-rendering benchmark: an A/B of two engine trees on one origin.
//
//   node tools/bench-asset-rendering.mjs --a <baseline tree> [--b <candidate tree>]
//        [--runs 4] [--backend gpu|swiftshader|both] [--scenes a,b] [--frames 60]
//        [--out artifacts/bench/result.json]
//   node tools/bench-asset-rendering.mjs --node --a <tree> [--b <tree>] [--runs 6]
//   node tools/bench-asset-rendering.mjs --editor --a <tree> [--assets-only] [--expect] …
//
// Browser mode serves /a/ and /b/ from the two trees and /bench/ from this
// checkout, so both arms run the same page (tools/bench/asset-rendering.js) on
// one origin. Each run is a fresh headless Edge with a fresh profile; arms
// alternate A B B A … so drift and order fall on both arms equally. Every
// response the page reads is hashed: the served-file digest names what each arm
// actually ran. Node mode times createBuildingModel per original design.
// Timings name their rig; compare arms only within one run of this tool.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = name => args.includes('--' + name);
const option = (name, fallback) => {const i = args.indexOf('--' + name); return i < 0 ? fallback : args[i + 1];};
const trees = {a: option('a'), b: option('b', here)};
if (!trees.a) throw Error('Name the baseline tree: --a <directory>.');
for (const [arm, dir] of Object.entries(trees)) {
  trees[arm] = path.resolve(dir);
  if (!fs.existsSync(path.join(trees[arm], 'packages/building-catalog/three.js'))) throw Error('Not an engine tree: ' + dir);
}
const runs = Number(option('runs', flag('node') ? 6 : 4)), frames = Number(option('frames', 60));
if (!Number.isInteger(runs) || runs < 2 || runs % 2) throw Error('Use an even number of runs (A/B counterbalance).');
const out = path.resolve(option('out', path.join(here, 'artifacts/bench', (flag('node') ? 'node' : 'browser') + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json')));
fs.mkdirSync(path.dirname(out), {recursive: true});

// A B B A A B B A …: each pair of runs has both orders.
const order = Array.from({length: runs}, (_, i) => [0, 3].includes(i % 4) ? ['a', 'b'] : ['b', 'a']);
const sha = data => createHash('sha256').update(data).digest('hex');
const median = values => {const s = [...values].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
function identity(dir) {
  const git = (...rest) => {try {return execFileSync('git', ['-C', dir, ...rest], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();} catch {return null;}};
  const stamp = path.join(dir, '.bench-tree.json');
  return {head: git('rev-parse', 'HEAD') ?? (fs.existsSync(stamp) ? JSON.parse(fs.readFileSync(stamp, 'utf8')).commit : null),
    status: git('status', '--short') ?? (fs.existsSync(stamp) ? 'extracted archive (' + JSON.parse(fs.readFileSync(stamp, 'utf8')).method + ')' : null)};
}
const rig = {node: process.version, platform: process.platform + ' ' + os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, loadavg: os.loadavg()};

async function nodeBench() {
  const load = async dir => ({
    T: await import(pathToFileURL(path.join(dir, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href),
    designs: (await import(pathToFileURL(path.join(dir, 'packages/building-catalog/index.js')).href)).DESIGNS,
    create: (await import(pathToFileURL(path.join(dir, 'packages/building-catalog/three.js')).href)).createBuildingModel});
  const engines = {a: await load(trees.a), b: await load(trees.b)};
  const ids = engines.a.designs.map(d => d.id);
  if (JSON.stringify(ids) !== JSON.stringify(engines.b.designs.map(d => d.id))) throw Error('The trees hold different designs.');
  const digest = model => {
    const parts = [];
    model.root.updateMatrixWorld(true);
    model.root.traverse(node => {
      const record = [node.type, node.name, node.visible, node.matrixWorld.elements.join(',')];
      if (node.isMesh) {
        for (const name of Object.keys(node.geometry.attributes).sort()) record.push(name + ':' + sha(Buffer.from(node.geometry.attributes[name].array.buffer)));
        record.push('index:' + (node.geometry.index ? sha(Buffer.from(node.geometry.index.array.buffer)) : '-'), node.material.name, node.castShadow, JSON.stringify(node.userData));
      }
      parts.push(record.join(';'));
    });
    return sha(parts.join('\n') + '\n' + model.triangles + '\n' + JSON.stringify(model.bounds));
  };
  const result = {mode: 'node', rig, trees: {a: {dir: '<a>', ...identity(trees.a)}, b: {dir: '<b>', ...identity(trees.b)}}, runs, order, lods: ['game', 'authoring'], designs: ids.length, samples: [], digests: {}};
  for (const lod of result.lods) {
    // Digests first (untimed): byte identity of every mesh, per design.
    for (const id of ids) {
      const da = engines.a.create(engines.a.T, id, {lod}), db = engines.b.create(engines.b.T, id, {lod});
      result.digests[lod + ':' + id] = {a: digest(da), b: digest(db), triangles: da.triangles};
      da.dispose(); db.dispose();
    }
    // Then timing: every design once per arm per run, arms alternating by run.
    for (let run = 0; run < runs; run++) for (const arm of order[run]) {
      const {T, create} = engines[arm], t0 = performance.now(), per = {};
      for (const id of ids) {const t = performance.now(); create(T, id, {lod}).dispose(); per[id] = performance.now() - t;}
      result.samples.push({lod, run, arm, totalMs: performance.now() - t0, perDesign: per});
    }
  }
  result.summary = Object.fromEntries(result.lods.map(lod => {
    const total = arm => result.samples.filter(s => s.lod === lod && s.arm === arm).map(s => s.totalMs);
    const a = median(total('a')), b = median(total('b'));
    const same = ids.filter(id => result.digests[lod + ':' + id].a === result.digests[lod + ':' + id].b).length;
    return [lod, {aMedianMs: a, bMedianMs: b, speedup: a / b, aRange: [Math.min(...total('a')), Math.max(...total('a'))], bRange: [Math.min(...total('b')), Math.max(...total('b'))], identicalDesigns: same + '/' + ids.length}];
  }));
  return result;
}

function playwright() {
  const require = createRequire(import.meta.url);
  try {return require('playwright');} catch {
    const modules = process.env.NAUTILUS_ART_NODE_MODULES || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    return createRequire(path.join(modules, 'playwright/package.json'))('playwright');
  }
}
// The launch flags of round 1's census, so the editor-mode numbers stay comparable.
const BACKENDS = {
  gpu: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
  swiftshader: ['--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
};

function staticServer(roots, served) {
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.bin': 'application/octet-stream', '.gltf': 'model/gltf+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1'), parts = decodeURIComponent(url.pathname).split('/').filter(Boolean);
      const arm = parts.shift(), base = roots[arm];
      if (!base) {res.writeHead(404).end(); return;}
      if (parts.some(p => p.startsWith('.') || p.includes('\\'))) {res.writeHead(403).end(); return;}
      let file = path.resolve(base, ...parts);
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end(); return;}
      const data = fs.readFileSync(file);
      served[arm].set(parts.join('/'), sha(data));
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
    } catch {res.writeHead(400).end();}
  });
}

// --editor: the built editor of each tree (dist/), the workload maps from
// tools/bench/workloads.mjs, timed on the GPU (ABBA, fresh browser per arm) and
// captured on SwiftShader for the pixel comparison with its depth-tie masks.
// Both arms run as two pages of one browser. Per map and view, frame blocks
// alternate A B B A (seconds apart), so machine drift falls on both arms; the
// blank map runs identical code in both and is the null control for the ratio.
async function editorBench() {
  for (const arm of ['a', 'b']) if (!fs.existsSync(path.join(trees[arm], 'dist/index.html'))) throw Error('Build the tree first (npm run build): ' + trees[arm]);
  const mapsDir = path.resolve(option('maps', path.join(here, 'artifacts/bench/maps'))), wanted = option('scenes') ? new Set(option('scenes').split(',')) : null;
  const maps = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort().filter(id => !wanted || wanted.has(id));
  const blank = fs.readFileSync(path.join(mapsDir, 'w0-blank.json'), 'utf8'), probe = fs.readFileSync(path.join(here, 'tools/bench/editor-probe.js'), 'utf8');
  const served = {a: new Map(), b: new Map()}, server = staticServer({a: path.join(trees.a, 'dist'), b: path.join(trees.b, 'dist')}, served);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port, pw = playwright(), backends = option('backend', 'both') === 'both' ? Object.keys(BACKENDS) : [option('backend')];
  const blocks = Number(option('blocks', 4)), opens = Number(option('opens', 3)), captureDir = out.replace(/\.json$/, '') + '-captures';
  const result = {mode: 'editor', rig, trees: {a: {dir: '<a>', ...identity(trees.a)}, b: {dir: '<b>', ...identity(trees.b)}}, runs, backends, maps, framesPerBlock: frames, blocks, opens, samples: [], browsers: []};
  try {
    for (let run = 0; run < runs; run++) for (const backend of backends) {
      const swift = backend === 'swiftshader', capture = swift && run < 2, n = swift ? 2 : frames, nBlocks = swift ? 2 : blocks;
      const browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: BACKENDS[backend]}), errors = [], pages = {};
      try {
        const context = await browser.newContext({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1});
        // Counterbalance which arm's page is created and loaded first.
        for (const arm of order[run]) {
          const page = pages[arm] = await context.newPage();
          page.on('pageerror', e => errors.push(arm + ': ' + e.message)); page.on('console', m => {if (m.type() === 'error') errors.push(arm + ': ' + m.text());});
          await page.goto('http://127.0.0.1:' + port + '/' + arm + '/index.html', {waitUntil: 'networkidle'});
          await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 120000});
          await page.addScriptTag({content: probe});
        }
        const gpu = await pages.a.evaluate(() => window.__bench.gpu());
        if (!result.browsers.some(b => b.backend === backend)) result.browsers.push({backend, version: browser.version(), gpu});
        for (const id of maps) {
          const json = fs.readFileSync(path.join(mapsDir, id + '.json'), 'utf8'), first = JSON.parse(json).buildingPrefabs?.instances[0];
          const sample = {run, backend, map: id, gpu, openMs: {a: [], b: []}, views: {}};
          const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'}};
          // Open time: blank first (releases templates and libraries), then the map; arms alternate.
          // The close view sits at this map's first building, so the first time the blank map
          // is open, its draws are counted at that same camera (the reference for --assets-only).
          for (let k = 0; k < opens; k++) for (const arm of k % 2 ? [...order[run]].reverse() : order[run]) {
            await pages[arm].evaluate(b => window.nautilus.open(b), blank);
            if (!k) (sample.blankAtClose ??= {})[arm] = await pages[arm].evaluate(v => window.__bench.frames(1, v, {warmup: 1}).counts, views.close);
            sample.openMs[arm].push(await pages[arm].evaluate(async j => {const t = performance.now(); await window.nautilus.open(j); return performance.now() - t;}, json));
          }
          for (const page of Object.values(pages)) await page.waitForTimeout(150);
          const measure = async (name, view) => {
            const record = sample.views[name] = {a: [], b: []};
            for (let k = 0; k < nBlocks; k++) for (const arm of [0, 3].includes(k % 4) ? order[run] : [...order[run]].reverse())
              record[arm].push(await pages[arm].evaluate(([count, v]) => window.__bench.frames(count, v), [n, view]));
          };
          // --assets-only: each view again with every non-asset mesh hidden while the
          // frame renders (round 2's direct method), plus one frame with every mesh
          // hidden (the fixed passes). The summary refuses the run unless isolated draws
          // minus that frame equal this frame minus the blank map's, exactly.
          const isolated = async (name, view) => {
            const none = {};
            for (const arm of ['a', 'b']) {await pages[arm].evaluate(() => window.__bench.isolate('none')); none[arm] = await pages[arm].evaluate(v => window.__bench.frames(1, v, {warmup: 1}).counts, view);}
            for (const arm of ['a', 'b']) await pages[arm].evaluate(() => window.__bench.isolate('assets'));
            try {await measure(name + ':assets', view);} finally {for (const arm of ['a', 'b']) await pages[arm].evaluate(() => window.__bench.isolate(null));}
            (sample.isolation ??= {})[name] = {none};
          };
          // --expect: both arms' asset draws with culling off, in each level state.
          const unculled = async state => {(sample.unculled ??= {})[state] = {}; for (const arm of ['a', 'b']) sample.unculled[state][arm] = await pages[arm].evaluate(v => window.__bench.unculled(v), views.overview);};
          for (const [name, view] of Object.entries(views)) {await measure(name, view); if (flag('assets-only')) await isolated(name, view);}
          if (flag('expect')) await unculled('exterior');
          for (const page of Object.values(pages)) await page.evaluate(() => window.__bench.cutaway(true));
          await measure('cutaway', views.overview);
          if (flag('assets-only')) await isolated('cutaway', views.overview);
          if (flag('expect')) await unculled('cutaway');
          if (capture) {
            fs.mkdirSync(captureDir, {recursive: true});
            for (const arm of ['a', 'b']) {
              fs.writeFileSync(path.join(captureDir, `${run}-${arm}-${id}-cutaway.json`), JSON.stringify(await pages[arm].evaluate(v => window.__bench.capture(v), views.overview)));
              await pages[arm].evaluate(() => window.__bench.cutaway(false));
              for (const [name, view] of Object.entries(views)) fs.writeFileSync(path.join(captureDir, `${run}-${arm}-${id}-${name}.json`), JSON.stringify(await pages[arm].evaluate(v => window.__bench.capture(v), view)));
            }
          } else for (const page of Object.values(pages)) await page.evaluate(() => window.__bench.cutaway(false));
          result.samples.push(sample);
          const show = (name, arm) => median(sample.views[name][arm].map(b => median(b.total))).toFixed(2);
          process.stdout.write(`run ${run} ${backend} ${id}: open ${median(sample.openMs.a).toFixed(0)}/${median(sample.openMs.b).toFixed(0)} ms, ` + Object.keys(sample.views).map(k => `${k} ${show(k, 'a')}/${show(k, 'b')} ms ${sample.views[k].a[0].counts.calls}/${sample.views[k].b[0].counts.calls} calls`).join(', ') + '\n');
        }
        if (errors.length) throw Error('Page errors: ' + errors.join(' | '));
      } finally {await browser.close();}
    }
  } finally {await new Promise(resolve => server.close(resolve));}
  for (const arm of ['a', 'b']) result['served_' + arm] = {files: served[arm].size, digest: sha([...served[arm]].sort().map(([f, h]) => f + ' ' + h).join('\n'))};
  // Per run and view: each arm's median block median, their ratio (A/B = speedup),
  // and across runs the median ratio with its range. Counts must not vary.
  result.summary = [];
  for (const backend of backends) for (const id of maps) {
    const list = result.samples.filter(s => s.backend === backend && s.map === id), row = {backend, map: id, views: {}};
    const ratios = values => ({median: median(values), min: Math.min(...values), max: Math.max(...values)});
    row.openMs = {a: median(list.map(s => median(s.openMs.a))), b: median(list.map(s => median(s.openMs.b))), speedup: ratios(list.map(s => median(s.openMs.a) / median(s.openMs.b)))};
    for (const view of Object.keys(list[0].views)) {
      const per = arm => list.map(s => median(s.views[view][arm].map(b => median(b.total))));
      const cpu = arm => list.map(s => median(s.views[view][arm].map(b => median(b.cpu))));
      const counts = arm => [...new Set(list.flatMap(s => s.views[view][arm].map(b => JSON.stringify(b.counts))))].map(t => JSON.parse(t));
      row.views[view] = {totalMs: {a: median(per('a')), b: median(per('b'))}, cpuMs: {a: median(cpu('a')), b: median(cpu('b'))},
        speedup: ratios(per('a').map((v, i) => v / per('b')[i])), counts: {a: counts('a'), b: counts('b')}};
      // The subtraction estimate of the assets' own time: this frame minus the same
      // run's blank-map frame, per run. Below the blank map's spread it means little.
      // Only where both use one camera: the close view sits at each map's first building.
      const blank = result.samples.filter(s => s.backend === backend && s.map === 'w0-blank'), own = arm => list.map(s => median(s.views[view][arm].map(b => median(b.total))) - median(blank.find(z => z.run === s.run).views[view][arm].map(b => median(b.total))));
      if (id !== 'w0-blank' && !view.startsWith('close') && blank.length && blank[0].views[view]) row.views[view].estimateBySubtraction = {ms: {a: median(own('a')), b: median(own('b'))}, speedup: ratios(own('a').map((v, i) => v / own('b')[i]))};
    }
    result.summary.push(row);
  }
  // Exactness of the isolation, per run, map, view and arm: asset draws counted two ways.
  const minus = (x, y) => ({calls: x.calls - y.calls, shadowCalls: x.shadowCalls - y.shadowCalls, triangles: x.triangles - y.triangles});
  const refusals = [];
  for (const s of result.samples) for (const [view, {none}] of Object.entries(s.isolation || {})) for (const arm of ['a', 'b']) {
    const blank = result.samples.find(z => z.backend === s.backend && z.run === s.run && z.map === 'w0-blank');
    if (!blank) {refusals.push('--assets-only needs w0-blank in the same run'); break;}
    const reference = view === 'close' ? s.blankAtClose?.[arm] : blank.views[view][arm][0].counts;
    if (!reference) {refusals.push(s.map + ' close: no blank-map count at its camera'); continue;}
    const isolatedDraws = minus(s.views[view + ':assets'][arm][0].counts, none[arm]), frameDraws = minus(s.views[view][arm][0].counts, reference);
    if (JSON.stringify(isolatedDraws) !== JSON.stringify(frameDraws)) refusals.push(`${s.map} ${view} ${arm} run ${s.run}: isolated ${JSON.stringify(isolatedDraws)} against frame minus blank ${JSON.stringify(frameDraws)}`);
  }
  // --expect: the candidate's asset draws with culling off, in each level state, must be
  // exactly the pinned headless counts (tests/fixtures/asset-draw-counts.json).
  if (flag('expect')) {
    const pinned = JSON.parse(fs.readFileSync(path.join(trees.b, 'tests/fixtures/asset-draw-counts.json'), 'utf8')).workloads;
    for (const s of result.samples) for (const [view, headless] of [['overview', 'exterior'], ['cutaway', 'cutaway']]) {
      const layers = pinned[s.map]?.[headless], measured = s.unculled?.[headless]?.b;
      if (!layers || !measured) {refusals.push('--expect needs a pinned and a measured count for ' + s.map + ' ' + headless); continue;}
      const sum = key => Object.values(layers).reduce((total, layer) => total + layer[key], 0);
      const expected = {main: sum('main'), shadow: sum('shadow'), triangles: sum('mainTriangles') + sum('shadowTriangles')};
      (result.expect ??= []).push({map: s.map, view, run: s.run, backend: s.backend, measured, expected});
      if (JSON.stringify(measured) !== JSON.stringify(expected)) refusals.push(`${s.map} ${view} run ${s.run}: candidate drew ${JSON.stringify(measured)}, pinned ${JSON.stringify(expected)}`);
    }
  }
  if (refusals.length) result.refused = refusals;
  // Pixel comparison of the SwiftShader captures (run 0), with run 1 as the repeat control.
  if (fs.existsSync(captureDir)) {
    result.pixels = [];
    const load = file => {const c = JSON.parse(fs.readFileSync(path.join(captureDir, file), 'utf8')); return {w: c.width, h: c.height, px: Buffer.from(c.pixels, 'base64'), ties: Buffer.from(c.ties, 'base64')};};
    for (const id of maps) for (const view of ['overview', 'close', 'cutaway']) {
      const file = (r, arm) => `${r}-${arm}-${id}-${view}.json`, has = f => fs.existsSync(path.join(captureDir, f));
      if (!has(file(0, 'a')) || !has(file(0, 'b'))) continue;
      const A = load(file(0, 'a')), B = load(file(0, 'b'));
      let differing = 0, explained = 0, maxDelta = 0, ties = 0;
      for (let p = 0; p < A.w * A.h; p++) {
        let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(A.px[p * 4 + c] - B.px[p * 4 + c]));
        if (A.ties[p] || B.ties[p]) ties++;
        if (d) {differing++; maxDelta = Math.max(maxDelta, d); if (A.ties[p] || B.ties[p]) explained++;}
      }
      const repeat = has(file(1, 'a')) ? load(file(1, 'a')).px.equals(A.px) : null;
      result.pixels.push({map: id, view, pixels: A.w * A.h, differing, maxDelta, explainedByTies: explained, tiePixels: ties, repeatOfAIdentical: repeat});
      process.stdout.write(`pixels ${id} ${view}: ${differing} differ (max ${maxDelta}), ${explained} at depth ties; repeat of A identical: ${repeat}\n`);
    }
  }
  return result;
}

async function scenes() {
  const {buildingTransform} = await import(pathToFileURL(path.join(trees.a, 'packages/prefab-core/index.js')).href);
  const {ORIGINAL_BUILDING_ASSETS, GROSS_BUILDING_ASSETS, catalogueForAssets} = await import(pathToFileURL(path.join(trees.a, 'packages/prefab-core/registry.js')).href);
  const largest = [...ORIGINAL_BUILDING_ASSETS].sort((x, y) => y.gameTriangles - x.gameTriangles || x.id.localeCompare(y.id)).map(asset => asset.id);
  const gross = GROSS_BUILDING_ASSETS.map(asset => asset.id);
  // Shelf-pack lots left to right with 4 m lanes, as a generated district would sit.
  const place = (ids, name) => {
    let x = 2, y = 2, row = 0;
    const instances = ids.map((asset, i) => {
      const probe = buildingTransform({asset, x: 0, y: 0, turns: 0});
      if (x + probe.width > 238) {x = 2; y += row + 4; row = 0;}
      const instance = {id: name + '-' + i, asset, x, y, turns: 0, clearance: 2};
      x += probe.width + 4; row = Math.max(row, probe.depth);
      return instance;
    });
    if (y + row > 238) throw Error('Scene does not fit the 240 m map: ' + name);
    return instances;
  };
  const views = [{name: 'district', framing: 'all'}, {name: 'close', framing: 'first'}, {name: 'cutaway', framing: 'first', cutaway: true}];
  const all = [
    {name: 'district-32-distinct', ids: largest.slice(0, 32)},
    {name: 'district-32-repeat', ids: Array.from({length: 32}, (_, i) => largest[i % 8])},
    {name: 'gross-32', ids: Array.from({length: 32}, (_, i) => gross[i % gross.length])},
    {name: 'single-largest', ids: largest.slice(0, 1)}
  ];
  const wanted = option('scenes') ? new Set(option('scenes').split(',')) : null;
  return all.filter(s => !wanted || wanted.has(s.name)).map(s => {
    const instances = place(s.ids, s.name), providers = [...new Set(s.ids.map(id => (ORIGINAL_BUILDING_ASSETS.some(a => a.id === id) ? 'original' : 'gross')))];
    return {name: s.name, instances, providers, catalogue: catalogueForAssets(s.ids), views, frames, warmup: 5, width: 1280, height: 800};
  });
}

async function browserBench() {
  const specs = await scenes(), served = {a: new Map(), b: new Map(), bench: new Map()};
  if (option('dump-scenes')) {fs.writeFileSync(path.resolve(option('dump-scenes')), JSON.stringify(specs, null, 1)); return {summary: specs.map(s => s.name)};}
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.bin': 'application/octet-stream'};
  const roots = {a: trees.a, b: trees.b, bench: path.join(here, 'tools/bench')};
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1'), parts = decodeURIComponent(url.pathname).split('/').filter(Boolean);
      const arm = parts.shift(), base = roots[arm];
      if (!base) {res.writeHead(404).end(); return;}
      if (parts.some(p => p.startsWith('.') || p.includes('\\'))) {res.writeHead(403).end(); return;}
      const file = path.resolve(base, ...parts);
      if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end(); return;}
      const data = fs.readFileSync(file);
      served[arm].set(parts.join('/'), sha(data));
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
    } catch {res.writeHead(400).end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port, pw = playwright(), backends = option('backend', 'both') === 'both' ? Object.keys(BACKENDS) : [option('backend')];
  if (backends.some(b => !BACKENDS[b])) throw Error('Unknown backend.');
  if (flag('diff')) {
    // --diff: both trees render each scene in one SwiftShader page; frames are compared byte for byte.
    const browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: BACKENDS.swiftshader}), errors = [], diff = {mode: 'diff', rig, trees: {a: {dir: '<a>', ...identity(trees.a)}, b: {dir: '<b>', ...identity(trees.b)}}, scenes: []};
    try {
      const page = await (await browser.newContext({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1})).newPage();
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
      await page.goto('http://127.0.0.1:' + port + '/bench/pixel-diff.html');
      await page.waitForFunction(() => window.diffReady === true, null, {timeout: 60000});
      diff.browser = browser.version();
      for (const spec of specs) {
        const result = await page.evaluate(s => window.runDiff(s), {...spec, images: flag('images'), explain: flag('explain')});
        for (const view of result.views) {
          if (view.image) {const file = out.replace(/\.json$/, '') + '-' + spec.name + '-' + view.name + '.png'; fs.writeFileSync(file, Buffer.from(view.image.split(',')[1], 'base64')); view.image = path.basename(file);}
          const ties = view.ties ? ` — order-dependent ties ${view.ties.explained}/${view.ties.checked} (control: ${(view.ties.controlTieShare * 100).toFixed(2)}% of ${view.ties.controlPixels} unchanged box pixels)` : '';
          process.stdout.write(`${spec.name} ${view.name}: ${view.differing} of ${view.pixels} pixels differ (max delta ${view.maxDelta})${ties}\n`);
        }
        diff.scenes.push(result);
      }
      if (errors.length) throw Error('Page errors: ' + errors.join(' | '));
    } finally {await browser.close(); await new Promise(resolve => server.close(resolve));}
    for (const arm of ['a', 'b', 'bench']) diff['served_' + arm] = {files: served[arm].size, digest: sha([...served[arm]].sort().map(([f, h]) => f + ' ' + h).join('\n'))};
    diff.summary = diff.scenes.map(s => ({scene: s.scene, views: s.views.map(v => v.name + ': ' + v.differing + ' px, max ' + v.maxDelta)}));
    return diff;
  }
  const result = {mode: 'browser', rig, trees: {a: {dir: '<a>', ...identity(trees.a)}, b: {dir: '<b>', ...identity(trees.b)}}, runs, order, backends, scenes: specs.map(s => ({name: s.name, instances: s.instances.length, providers: s.providers})), samples: [], browsers: [], profiles: []};
  try {
    for (let run = 0; run < runs; run++) for (const backend of backends) for (const arm of order[run]) {
      const browser = await pw.chromium.launch({channel: 'msedge', headless: true, args: BACKENDS[backend]});
      const pid = browser.process?.()?.pid ?? null, errors = [];
      try {
        const context = await browser.newContext({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1}), page = await context.newPage();
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
        if (flag('profile')) {
          // --profile: sample each timed phase with the V8 CPU profiler and keep the
          // top self-time functions. Profiling slows the code; use it to find, not to time.
          const cdp = await context.newCDPSession(page);
          await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {interval: 100});
          await page.exposeFunction('benchHook', async phase => {
            if (!phase.includes('-end')) {await cdp.send('Profiler.start'); return;}
            const {profile} = await cdp.send('Profiler.stop'), self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
            profile.samples.forEach((id, i) => {
              const f = byId.get(id).callFrame, key = (f.functionName || '(anonymous)') + ' ' + (f.url.split('/').slice(-2).join('/') || f.url) + ':' + (f.lineNumber + 1);
              self.set(key, (self.get(key) || 0) + (profile.timeDeltas[i] || 0) / 1000);
            });
            const total = [...self.values()].reduce((n, v) => n + v, 0);
            result.profiles.push({run, backend, arm, phase, totalMs: total, top: [...self].sort((x, y) => y[1] - x[1]).slice(0, 40).map(([fn, ms]) => ({fn, ms: +ms.toFixed(2), share: +(ms / total).toFixed(4)}))});
          });
        }
        await page.goto('http://127.0.0.1:' + port + '/bench/asset-rendering.html?tree=' + arm);
        await page.waitForFunction(() => window.benchReady === true, null, {timeout: 60000});
        if (!result.browsers.some(b => b.backend === backend)) result.browsers.push({backend, version: browser.version()});
        for (const spec of specs) {
          const sample = await page.evaluate(s => window.runBench(s), spec);
          result.samples.push({run, backend, arm, pid, ...sample});
          process.stdout.write(`run ${run} ${backend} ${arm} ${spec.name}: build ${sample.buildMs.toFixed(0)} ms, ` + sample.views.map(v => `${v.name} ${v.totalMedianMs.toFixed(2)} ms (cpu ${v.cpuMedianMs.toFixed(2)}) ${v.calls} calls`).join(', ') + '\n');
        }
        if (errors.length) throw Error('Page errors: ' + errors.join(' | '));
      } finally {await browser.close();}
    }
  } finally {await new Promise(resolve => server.close(resolve));}
  for (const arm of ['a', 'b', 'bench']) result['served_' + arm] = {files: served[arm].size, digest: sha([...served[arm]].sort().map(([f, h]) => f + ' ' + h).join('\n'))};
  // Summary: per backend/scene/view, the median over runs of each run's median.
  result.summary = [];
  for (const backend of backends) for (const spec of specs) {
    const pick = arm => result.samples.filter(s => s.backend === backend && s.scene === spec.name && s.arm === arm);
    const [sa, sb] = [pick('a'), pick('b')], row = {backend, scene: spec.name};
    for (const key of ['loadMs', 'buildMs']) row[key] = {a: median(sa.map(s => s[key])), b: median(sb.map(s => s[key]))};
    row.views = spec.views.map((view, i) => {
      const value = (list, key) => median(list.map(s => s.views[i][key]));
      const v = {name: view.name};
      for (const key of ['firstFrameMs', 'cpuMedianMs', 'totalMedianMs', 'totalP90Ms', 'calls', 'triangles']) v[key] = {a: value(sa, key), b: value(sb, key)};
      const pixels = arm => [...new Set((arm === 'a' ? sa : sb).map(s => s.views[i].pixels))];
      v.pixels = {a: pixels('a'), b: pixels('b'), identical: pixels('a').length === 1 && pixels('b').length === 1 && pixels('a')[0] === pixels('b')[0]};
      return v;
    });
    const digests = arm => [...new Set((arm === 'a' ? sa : sb).map(s => JSON.stringify(s.digest)))];
    row.digest = {a: digests('a'), b: digests('b'), identical: digests('a').length === 1 && digests('a')[0] === digests('b')[0]};
    result.summary.push(row);
  }
  return result;
}

const result = flag('node') ? await nodeBench() : flag('editor') ? await editorBench() : await browserBench();
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log('Wrote ' + path.relative(here, out));
console.log(JSON.stringify(result.summary, null, 1).slice(0, 6000));
if (result.refused) {console.error('Refused:\n' + result.refused.join('\n')); process.exit(1);}
