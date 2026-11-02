// Does the editor's Send button exist when the page bridge (app/editor.js) assigns window.nautilus?
// A setter on window records the DOM at that moment. Usage: node bridge-order.mjs <project root>
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]);
const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href);
await withArtReview('Bridge load-order probe', async ({page, baseURL, errors}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'nautilus', {configurable: true, set(value) {
      window.bridgeOrder = {playtest: !!document.getElementById('playtest'), quick: !!document.getElementById('quick-playtest'),
        heading: !!document.querySelector('#editor-settings .settings-heading'), status: !!document.getElementById('status'), editor: !!window.editor3d};
      Object.defineProperty(window, 'nautilus', {value, writable: true, configurable: true, enumerable: true});
    }});
  });
  await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading);
  const result = await page.evaluate(() => ({atBridge: window.bridgeOrder, afterLoad: {playtest: !!document.getElementById('playtest'), disabled: document.getElementById('playtest')?.disabled,
    title: document.getElementById('playtest')?.title, feedback: !!document.getElementById('nautilus-settings-feedback'), hasGameAdapter: window.nautilus.hasGameAdapter}}));
  console.log(JSON.stringify({...result, errors}));
}, {output: 'bridge-order-probe', timeoutMs: 120000});
