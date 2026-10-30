// Extends the author's bridge-order.mjs: at the moment app/editor.js assigns window.nautilus, does
// the editor already have a document, and what is Send's state? Afterwards, how many times is
// Send's `disabled` attribute written (each write queues a mutation record, even when the value is
// unchanged), at load and around a connect and a disconnect?
// Usage: node bridge-order2.mjs <project root>
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]);
const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href);
await withArtReview('Round 4 reviewer: bridge load order 2', async ({page, baseURL, errors}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'nautilus', {configurable: true, set(value) {
      const send = document.getElementById('playtest');
      window.bridgeOrder = {editor: !!window.editor3d, editorDocument: !!window.editor3d?.document, editorLoading: window.editor3d?.loading ?? null,
        sendDisabled: send?.disabled ?? null, sendHasDisabledAttribute: send?.hasAttribute('disabled') ?? null, sendTitle: send?.title ?? null};
      window.disabledWrites = [];
      if (send) new MutationObserver(records => { for (const r of records) window.disabledWrites.push({t: Math.round(performance.now()), old: r.oldValue, now: send.getAttribute('disabled')}); })
        .observe(send, {attributes: true, attributeFilter: ['disabled'], attributeOldValue: true});
      Object.defineProperty(window, 'nautilus', {value, writable: true, configurable: true, enumerable: true});
    }});
  });
  await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading);
  const atLoad = await page.evaluate(() => ({bridge: window.bridgeOrder, writesAfterBridge: window.disabledWrites.length, writes: window.disabledWrites.slice(0, 12)}));
  const connect = await page.evaluate(async () => { const before = window.disabledWrites.length; const off = window.nautilus.connectGame({features: [], openMap() {}}); await new Promise(r => setTimeout(r, 200));
    const mid = window.disabledWrites.length; off(); await new Promise(r => setTimeout(r, 200)); return {writesOnConnect: mid - before, writesOnDisconnect: window.disabledWrites.length - mid, records: window.disabledWrites.slice(before)}; });
  console.log(JSON.stringify({atLoad, connect, errors}, null, 1));
}, {output: 'r4-bridge-order', timeoutMs: 120000});
