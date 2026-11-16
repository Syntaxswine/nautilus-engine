// Probe only (never merged): the re-measure after main's 4ed97f2 repaired the title's close
// handler. The loop of probe-title-close-race.mjs on the merged tree, three ways:
//   old    the old handler, no wait: the review before either fix, the arm that must fail
//   title  the repaired handler, no wait: does the title's repair hold alone?
//   both   the repaired handler and the wait for the close event: the review as merged
// Every arm's module goes through one route, so the arms differ only in the handler's body.
// A forced order first proves the arms differ where the handler does. The review's browser
// lifetime is capped at ten minutes, so this runs once per seed.
//   node probe-title-close-race-merged.mjs <repo> <output-name> <seed>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [root, output, seedText] = process.argv.slice(2);
const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href);
const ARMS = ['old', 'title', 'both'];
const NEEDLE = 'if(!active||active===doc.body||active===doc.documentElement||dialog.contains(active))opener.focus();';
let seed = Number(seedText);
const rand = n => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n);};
const shuffle = list => {const a = [...list]; for (let i = a.length - 1; i > 0; i--) {const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]];} return a;};
await withArtReview('Title close-event focus race, merged tree', async ({page, baseURL, out}) => {
  page.setDefaultTimeout(10000);
  const url = baseURL + '/examples/game-starter.html', tally = Object.fromEntries(ARMS.map(a => [a, {started: 0, reopened: 0, other: 0}])), log = [], began = Date.now();
  let arm = 'title', served = 0;
  await page.route('**/packages/game-ui/title.js', async route => {
    const response = await route.fetch(), text = await response.text();
    if (text.split(NEEDLE).length !== 2) throw Error('Handler needle not found exactly once');
    served++;
    await route.fulfill({response, body: arm === 'old' ? text.replace(NEEDLE, 'opener.focus();') : text});
  });
  const load = async () => {
    await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.locator('[data-action=start]').waitFor({state: 'visible'}); await page.waitForFunction(() => !document.querySelector('[data-action=start]').disabled);
  };
  const forced = async name => {
    arm = name; await load();
    await page.locator('[data-action=credits]').click();
    await page.evaluate(() => {window.forcedClosed = false; const dialog = document.querySelector('.ng-dialog[open]'); dialog.addEventListener('close', () => {window.forcedClosed = true;}, {once: true}); dialog.close(); document.querySelector('[data-action=start]').focus();});
    await page.waitForFunction(() => window.forcedClosed);
    return page.evaluate(() => document.activeElement.dataset.action);
  };
  const preflight = {old: await forced('old'), title: await forced('title')};
  assert.deepEqual(preflight, {old: 'credits', title: 'start'}, 'The arms must differ where the handler does.');
  const state = () => page.evaluate(() => ({active: document.activeElement.dataset.action || document.activeElement.textContent.slice(0, 24), dialogs: document.querySelectorAll('.ng-dialog[open]').length, gameHidden: document.querySelector('#game').hidden}));
  let cycle = 0;
  for (; ; cycle++) {
    if (Date.now() - began > 540000) break;
    for (const name of shuffle(ARMS)) {
      arm = name; await load();
      await page.locator('[data-action=settings]').click(); await page.locator('#auto-walk').uncheck(); await page.getByRole('button', {name: 'Apply', exact: true}).click();
      await page.locator('[data-action=credits]').click(); assert.equal(await page.locator('.ng-dialog[open]').count(), 1);
      if (name === 'both') await page.evaluate(() => {window.creditsClosed = false; document.querySelector('.ng-dialog[open]').addEventListener('close', () => {window.creditsClosed = true;}, {once: true});});
      await page.keyboard.press('Escape');
      if (name === 'both') await page.waitForFunction(() => window.creditsClosed);
      await page.locator('[data-action=start]').focus(); await page.keyboard.press('Enter');
      let outcome;
      try {await page.locator('#game').waitFor({state: 'visible', timeout: 1500}); outcome = 'started';} catch {const s = await state(); outcome = s.dialogs === 1 && s.active === 'Back' ? 'reopened' : 'other'; log.push({cycle, arm: name, ...s});}
      tally[name][outcome]++;
    }
  }
  const result = {seed: Number(seedText), cycles: cycle, seconds: Math.round((Date.now() - began) / 1000), modulesServed: served, preflight, tally, log};
  console.log(JSON.stringify({...result, log: log.slice(0, 12)}));
  fs.writeFileSync(path.join(out, 'close-race-merged.json'), JSON.stringify(result, null, 1));
}, {output, timeoutMs: 590000});
