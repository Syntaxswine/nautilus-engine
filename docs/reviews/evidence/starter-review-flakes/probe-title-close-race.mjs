// Probe only (never merged): the review's own steps up to the Start key, looped on one
// page, three ways after Escape closes Credits: no wait (the review on main), a wait for
// focus to be back on Credits (the browser restores it inside close(), so this waits for
// nothing), and a wait for the dialog's close event itself.
//   node tools/probe-title-close-race.mjs <cycles>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';
const cycles = Number(process.argv[2] || 20), ARMS = ['none', 'active', 'event'];
let seed = 20261101;
const rand = n => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n);};
const shuffle = list => {const a = [...list]; for (let i = a.length - 1; i > 0; i--) {const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]];} return a;};
await withArtReview('Title close-event focus race', async ({page, baseURL, out}) => {
  page.setDefaultTimeout(10000);
  const url = baseURL + '/examples/game-starter.html', tally = Object.fromEntries(ARMS.map(a => [a, {started: 0, reopened: 0, other: 0}])), log = [], began = Date.now();
  const state = () => page.evaluate(() => ({active: document.activeElement.dataset.action || document.activeElement.textContent.slice(0, 24), dialogs: document.querySelectorAll('.ng-dialog[open]').length, gameHidden: document.querySelector('#game').hidden}));
  for (let cycle = 0; cycle < cycles; cycle++) {
    if (Date.now() - began > 540000) {console.log('budget reached at cycle ' + cycle); break;}
    for (const arm of shuffle(ARMS)) {
      await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
      await page.locator('[data-action=start]').waitFor({state: 'visible'}); await page.waitForFunction(() => !document.querySelector('[data-action=start]').disabled);
      await page.locator('[data-action=settings]').click(); await page.locator('#auto-walk').uncheck(); await page.getByRole('button', {name: 'Apply', exact: true}).click();
      await page.locator('[data-action=credits]').click(); assert.equal(await page.locator('.ng-dialog[open]').count(), 1);
      if (arm === 'event') await page.evaluate(() => {window.creditsClosed = false; document.querySelector('.ng-dialog[open]').addEventListener('close', () => {window.creditsClosed = true;}, {once: true});});
      await page.keyboard.press('Escape');
      if (arm === 'active') await page.waitForFunction(() => document.activeElement.dataset.action === 'credits');
      if (arm === 'event') await page.waitForFunction(() => window.creditsClosed);
      await page.locator('[data-action=start]').focus(); await page.keyboard.press('Enter');
      let outcome;
      try {await page.locator('#game').waitFor({state: 'visible', timeout: 1500}); outcome = 'started';} catch {const s = await state(); outcome = s.dialogs === 1 && s.active === 'Back' ? 'reopened' : 'other'; log.push({cycle, arm, ...s});}
      tally[arm][outcome]++;
    }
  }
  console.log(JSON.stringify(tally)); for (const row of log.slice(0, 12)) console.log(JSON.stringify(row));
  fs.writeFileSync(path.join(out, 'close-race.json'), JSON.stringify({tally, log}, null, 1));
}, {output: 'starter-probe', timeoutMs: 590000});
