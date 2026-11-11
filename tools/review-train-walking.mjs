import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';

await withArtReview('Review native touch walking and narrow train control layouts', async ({browser, baseURL, out, errors, failedRequests}) => {
  const checks = [];
  for (const width of [390, 320]) {
    const context = await browser.newContext({viewport: {width, height: 844}, hasTouch: true, isMobile: true});
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) failedRequests.push({url: response.url(), status: response.status()}); });
      await page.goto(baseURL + '/examples/train-yard.html');
      await page.waitForFunction(() => window.trainYard);
      await page.locator('#steam-profile').selectOption('classic');
      const original = await page.evaluate(() => window.trainYard.readForActor().position);
      const stick = await page.locator('#walk-stick').boundingBox();
      const centre = {x: stick.x + stick.width / 2, y: stick.y + stick.height / 2};
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [centre]});
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: centre.x + 35, y: centre.y}]});
      await page.waitForFunction(x => window.trainYard.readForActor().position.x > x + .25, original.x);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []});
      const stopped = await page.evaluate(() => window.trainYard.readForActor().position);
      await page.waitForTimeout(250);
      assert.deepEqual(await page.evaluate(() => window.trainYard.readForActor().position), stopped);
      assert.equal(await page.locator('#walk-thumb').evaluate(node => node.style.transform), 'translate(0px, 0px)');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('[data-train-action=enter]:enabled').filter({hasText: 'Enter steam cab'}).first().tap();
      assert.equal(await page.evaluate(() => window.trainYard.readForActor().mode), 'driver');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const panel = await page.locator('[data-part=driver]').boundingBox();
      assert.ok(panel.x >= -1 && panel.x + panel.width <= width + 1 && panel.y >= 0 && panel.y + panel.height <= 845,
        'Driver panel must fit the narrow viewport: ' + JSON.stringify(panel));
      await page.screenshot({path: path.join(out, 'phone-' + width + '.png')});
      await page.getByRole('button', {name: 'Exit train', exact: true}).tap();
      assert.equal(await page.locator('#walk-stick').isVisible(), true);
      checks.push({width, joystickMoved: true, cancellationStopped: true, driverPanelFits: true, walkingRestored: true});
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({checks, hardwarePhoneMeasured: false}, null, 2));
}, {source: false, owner: '01a18107-b4af-78c0-850f-0235d4df307f', output: 'train-walking-review', timeoutMs: 180000});
