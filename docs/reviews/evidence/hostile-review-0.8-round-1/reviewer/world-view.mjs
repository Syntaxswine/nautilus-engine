// Cost of apps/editor/extended-world-view.js (event-driven SVG projection of the
// authored AABBs, drawing limit 1600) for the native fifteen-story example and
// synthetic worlds of increasing size. Each render() is timed with a forced
// layout; 1 warm-up + 7 timed renders. Also measures the preview path, which
// JSON-compares every surface. Usage: node artifacts/r08-1/world-view.mjs
import fs from 'node:fs';
import path from 'node:path';
import {sandbox, writeResult, nodeRig, stats} from './lib/common.mjs';
import {withBrowser} from './lib/browser.mjs';

const fixture = fs.readFileSync(path.join(sandbox, 'examples/native-fifteen-story.world.json'), 'utf8');
const run = await withBrowser(path.join(sandbox, 'dist'), async ({page, baseURL}) => {
  await page.goto(baseURL + '/examples/extended-world.html', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.nautilusExtendedWorld);
  return page.evaluate(async (fixtureText) => {
    const {createExtendedWorldView} = await import('/app/extended-world-view.js');
    const {openWorld} = await import('/packages/world-core/index.js');
    const NS = 'http://www.w3.org/2000/svg', host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:800px;'; document.body.append(host);
    const axon = document.createElementNS(NS, 'svg'), plan = document.createElementNS(NS, 'svg'), counts = document.createElement('p');
    for (const s of [axon, plan]) { s.setAttribute('width', '600'); s.setAttribute('height', '400'); host.append(s); } host.append(counts);
    const view = createExtendedWorldView({axon, plan, counts});
    const synthetic = (n) => {
      const w = openWorld(fixtureText), floors = w.floors, per = Math.ceil(n / floors.length), side = Math.ceil(Math.sqrt(per));
      const surfaces = [];
      for (const f of floors) for (let i = 0; i < per && surfaces.length < n; i++) {
        const x = (i % side) * (w.bounds.widthM / side), y = Math.floor(i / side) * (w.bounds.depthM / side), s = Math.min(w.bounds.widthM, w.bounds.depthM) / side * .8;
        surfaces.push({id: 'syn-' + f.id + '-' + i, floorId: f.id, role: 'solid', bounds: {min: {x, y, h: f.elevationM}, max: {x: x + s, y: y + s, h: Math.min(w.bounds.heightM, f.elevationM + 2)}}, supports: false, supportFloorId: null});
      }
      return openWorld({...w, surfaces, entities: [], links: []});
    };
    const time = (world, floorId, preview = null) => {
      const samples = [];
      for (let i = 0; i < 8; i++) { const t0 = performance.now(); view.render({world, floorId, preview}); plan.getBoundingClientRect(); axon.getBBox(); samples.push(performance.now() - t0); }
      return {samples: samples.slice(1), axonElements: axon.querySelectorAll('*').length, planElements: plan.querySelectorAll('*').length, countsText: counts.textContent};
    };
    const out = [];
    const native = openWorld(fixtureText);
    out.push({world: 'native-fifteen-story.world.json', surfaces: native.surfaces.length, floors: native.floors.length, ...time(native, native.floors[9].id)});
    for (const n of [1600, 6400, 25600]) {
      const w = synthetic(n);
      out.push({world: 'synthetic-' + n, surfaces: w.surfaces.length, floors: w.floors.length, ...time(w, w.floors[0].id)});
      const preview = structuredClone(w); preview.surfaces[0].bounds.max.x -= .01;
      out.push({world: 'synthetic-' + n + ' with preview', surfaces: w.surfaces.length, ...time(w, w.floors[0].id, preview)});
    }
    view.dispose(); host.remove();
    return out;
  }, fixture);
});
const rows = run.result.map((r) => ({...r, ms: stats(r.samples), samples: undefined}));
writeResult('world-view.json', {rig: {...nodeRig(), browser: run.receipt.browserVersion, angle: run.receipt.angle, viewport: run.receipt.viewport}, method: 'dist/examples/extended-world.html; createExtendedWorldView on detached SVGs (600x400), render() + forced layout, 1 warm-up + 7 timed.', rows, browserErrors: run.errors});
console.log(JSON.stringify(rows.map((r) => [r.world, r.surfaces, r.ms.median, r.axonElements, r.planElements, r.countsText]), null, 1));
