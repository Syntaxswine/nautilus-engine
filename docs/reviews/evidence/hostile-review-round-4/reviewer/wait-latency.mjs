// How much of the acceptance's new 10 s Send wait does a real send use? Loads the acceptance's own
// round-trip map into the built editor, connects the acceptance's three hosts in turn, and for each
// Send click (Playwright click, as the acceptance does) measures, in the page, the time from the
// click event to the last status change, and in Node the time until the acceptance's own wait
// condition holds. Optional CPU stress: STRESS=<n> busy-loop processes during the measurement.
// Usage: node wait-latency.mjs <root> <map.json> [rounds]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const root = path.resolve(process.argv[2]), mapJson = fs.readFileSync(process.argv[3], 'utf8'), rounds = +(process.argv[4] || 10);
const stress = +(process.env.STRESS || 0), burners = [];
for (let i = 0; i < stress; i++) burners.push(spawn(process.execPath, ['-e', 'for(;;){}'], {stdio: 'ignore', windowsHide: true}));
const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href);
try {
  await withArtReview('Round 4 reviewer: Send wait latency', async ({page, baseURL}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading);
    await page.evaluate(async json => { await window.nautilus.open(json); }, mapJson);
    await page.waitForFunction(() => !window.editor3d.loading);
    await page.evaluate(() => {
      window.lat = {click: 0, last: 0, changes: 0};
      document.getElementById('playtest').addEventListener('click', () => { window.lat.click = performance.now(); window.lat.changes = 0; }, true);
      new MutationObserver(() => { window.lat.last = performance.now(); window.lat.changes++; }).observe(document.getElementById('status'), {childList: true, subtree: true, characterData: true});
    });
    const hosts = {
      versioned: () => { window.currentDisconnect?.(); return import('/packages/map-core/index.js').then(core => { const m = core.engineManifest(); m.id = 'latency-versioned-host'; m.capabilities = m.capabilities.filter(f => f.id !== core.ROOF_FEATURE); window.currentDisconnect = window.nautilus.connectGame({manifest: m, openMap() {}}); }); },
      listed: () => { window.currentDisconnect?.(); window.currentDisconnect = window.nautilus.connectGame({features: ['nautilus-wall-runs-v1', 'nautilus-building-prefabs-v1', 'nautilus-sloped-roofs-v1'], openMap() {}}); },
      capable: () => { window.currentDisconnect?.(); window.currentDisconnect = window.nautilus.connectGame({features: ['nautilus-wall-runs-v1', 'nautilus-building-prefabs-v1', 'nautilus-original-buildings-v1', 'nautilus-sloped-roofs-v1'], async openMap() { await Promise.resolve(); }}); }
    };
    await page.locator('#settings-button').click();
    const samples = [];
    for (let i = 0; i < rounds; i++) for (const [name, connect] of Object.entries(hosts)) {
      await page.evaluate(`(${connect.toString()})()`);
      const before = await page.evaluate(() => document.getElementById('status').textContent);
      const t0 = Date.now();
      await page.locator('#playtest').click();
      await page.waitForFunction(previous => { const text = document.getElementById('status').textContent; return text !== previous && !text.startsWith('Sending map'); }, before, {timeout: 10000});
      const nodeMs = Date.now() - t0, lat = await page.evaluate(() => window.lat), status = await page.evaluate(() => document.getElementById('status').textContent);
      samples.push({host: name, nodeMs, pageMs: Math.round((lat.last - lat.click) * 10) / 10, changes: lat.changes, status: status.slice(0, 60)});
    }
    const stats = name => { const s = samples.filter(x => x.host === name), n = s.map(x => x.nodeMs).sort((a, b) => a - b), p = s.map(x => x.pageMs).sort((a, b) => a - b);
      return {n: s.length, nodeMsMedian: n[n.length >> 1], nodeMsMax: n.at(-1), pageMsMedian: p[p.length >> 1], pageMsMax: p.at(-1), budgetUsedMax: Math.round(n.at(-1) / 100) + '%'}; };
    console.log(JSON.stringify({stress, rounds, summary: {versioned: stats('versioned'), listed: stats('listed'), capable: stats('capable')}, samples}, null, 1));
  }, {output: 'r4-latency', timeoutMs: 600000});
} finally { for (const b of burners) b.kill(); }
