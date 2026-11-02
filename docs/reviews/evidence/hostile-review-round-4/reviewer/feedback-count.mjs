// The pristine page's count of settings-feedback elements at load, after a connect and disconnect,
// and after one wall edit (the control for n04-growth.mjs). Usage: node feedback-count.mjs <root>
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), out = {};
const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href);
await withArtReview('Round 4 reviewer: feedback count control', async ({page, baseURL}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading);
  const count = () => page.evaluate(() => document.querySelectorAll('[id="nautilus-settings-feedback"]').length);
  out.atLoad = await count();
  await page.evaluate(() => { const off = window.nautilus.connectGame({features: [], openMap() {}}); off(); }); await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
  out.afterConnectAndDisconnect = await count();
  out.wall = await page.evaluate(async () => (await window.editor3d.apply({tool: 'wall-run', start: {x: 60, y: 60, z: 0}, end: {x: 66, y: 60, z: 0}, options: {exact: true, stories: 1, material: 'wood'}})).ok);
  await page.evaluate(() => new Promise(r => setTimeout(r, 500))); out.afterOneWallEdit = await count();
}, {output: 'r4-feedback-count', timeoutMs: 120000});
console.log(JSON.stringify(out));
