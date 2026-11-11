import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';

const installed = process.argv.includes('--installed-ui');
const entry = installed ? '/artifacts/installed-train-controls/yard/train-yard.html' : '/examples/train-yard.html';
await withArtReview('Review Tinderbox notched controls against the live train yard', async ({page, browser, baseURL, out, errors, failedRequests}) => {
  const read = target => target.evaluate(() => window.trainYard.readForActor());
  const ui = target => target.evaluate(() => window.trainYard.controls.state);
  const open = async target => {
    await target.goto(baseURL + entry);
    await target.waitForFunction(() => window.trainYard);
    assert.equal(await target.locator('#steam-profile').inputValue(), 'compact-notched');
  };
  const enter = async (target, stock, mode) => {
    await target.locator('[data-train-action=enter]:enabled').filter({hasText: 'Enter ' + stock + ' ' + (mode === 'driver' ? 'cab' : 'coach')}).first().click();
    assert.equal((await read(target)).mode, mode);
    await target.evaluate(async () => { await document.fonts.ready; });
  };
  const stop = target => target.waitForFunction(() => window.trainYard.readForActor().train?.stopped);
  const chain = target => target.getByRole('button', {name: /pull.*brake.*chain/i});
  const approach = (target, stock, mode) => target.evaluate(async ({stock, mode}) => {
    const host = window.trainYard.host, {railwayEntrancesForTrain} = await import('/packages/train-core/index.js');
    const state = host.read().trains.find(train => train.stock === stock).state;
    const entrance = railwayEntrancesForTrain(state).find(e => e.mode === mode && e.id.endsWith('right') && (mode !== 'driver' || e.carIndex === 0));
    const goal = {x: entrance.position.x + entrance.outward.x * .9, y: entrance.position.y + entrance.outward.y * .9};
    for (const waypoint of [{x: host.actors[0].position.x, y: 36}, {x: goal.x, y: 36}, goal]) {
      let arrived = false;
      for (let i = 0; i < 2000; i++) {
        const p = host.actors[0].position, dx = waypoint.x - p.x, dy = waypoint.y - p.y, distance = Math.hypot(dx, dy);
        if (distance < .02) { arrived = true; break; }
        const result = host.walk(dx, dy, Math.min(.05, distance / 5)); if (!result.ok) throw Error(result.reason);
      }
      if (!arrived) throw Error('Retained walking did not reach the selected entrance.');
    }
    window.trainYard.render();
  }, {stock, mode});

  await page.setViewportSize({width: 1440, height: 960}); await open(page);
  const resources = await page.evaluate(() => window.trainYard.host.actors[0]);
  await enter(page, 'steam', 'driver');
  const fonts = await page.evaluate(() => [...document.fonts].filter(face => face.family.includes('NautilusCompact')).map(face => ({family: face.family, status: face.status})));
  assert.equal(fonts.length, 2); assert.ok(fonts.every(face => face.status === 'loaded'));
  assert.equal((await ui(page)).steamProfile, 'compact-notched');
  assert.equal((await ui(page)).notch, 2);
  const lever = page.getByRole('slider');
  await lever.press('ArrowUp');
  assert.equal((await ui(page)).notch, 1); assert.equal((await read(page)).train.controls.power, .5);
  await lever.press('End');
  assert.equal((await ui(page)).notch, 0); assert.equal((await read(page)).train.controls.power, 1);
  await page.waitForFunction(() => window.trainYard.readForActor().train.signedSpeedMps > .4);
  const latched = await read(page); await page.waitForTimeout(350);
  assert.equal((await read(page)).train.controls.leaseId, latched.train.controls.leaseId);
  assert.equal((await read(page)).train.controls.power, 1);
  await page.screenshot({path: path.join(out, 'steam-notched-driving.png')});
  await lever.press('ArrowDown'); await lever.press('ArrowDown');
  const coasting = await read(page);
  assert.equal((await ui(page)).notch, 2); assert.equal(coasting.train.controls.direction, 'neutral');
  assert.equal(coasting.train.controls.power, 0); assert.equal(coasting.train.controls.brake, 0); assert.ok(coasting.train.speedMps > 0);
  await lever.press('Home');
  assert.equal((await ui(page)).notch, 2); assert.equal((await read(page)).train.controls.direction, 'neutral');
  const refusal = page.locator('[data-part=driver] [data-part=request-status]');
  await refusal.waitFor({state: 'visible'});
  assert.equal(await refusal.innerText(), 'Brake to a complete stop before changing direction.');
  const brakeBox = await chain(page).boundingBox();
  await page.mouse.move(brakeBox.x + brakeBox.width / 2, brakeBox.y + brakeBox.height / 2); await page.mouse.down();
  assert.equal((await read(page)).train.controls.brake, 1); assert.equal((await read(page)).train.controls.direction, 'neutral');
  await page.mouse.move(brakeBox.x + brakeBox.width / 2, brakeBox.y + brakeBox.height / 2 + 18); await page.mouse.up(); await stop(page);
  assert.equal((await read(page)).train.controls.leaseId, null);
  await lever.press('Home'); await page.waitForFunction(() => window.trainYard.readForActor().train.signedSpeedMps < -.2);
  assert.equal((await ui(page)).notch, 3);
  const saved = await page.evaluate(() => {
    const text = window.trainYard.host.save(); localStorage.setItem('nautilus/two-circuit-yard/v1', text);
    document.getElementById('load').disabled = false; return JSON.parse(text);
  });
  await page.getByRole('button', {name: 'Reload', exact: true}).click();
  assert.equal((await read(page)).mode, 'driver'); assert.equal((await read(page)).carId, saved.actors[0].attachment.carId);
  assert.equal((await read(page)).train.controls.power, 0); assert.equal((await read(page)).train.controls.brake, 1);
  assert.equal((await ui(page)).notch, 2); assert.equal((await ui(page)).feedback.played, 0); await stop(page);
  await page.getByRole('slider').press('End'); await page.waitForFunction(() => window.trainYard.readForActor().train.speedMps > .2);
  await page.evaluate(() => window.trainYard.controls.setMuted(true));
  await page.locator('#steam-profile').selectOption('classic');
  assert.equal((await ui(page)).steamProfile, 'classic'); assert.equal((await ui(page)).feedback.muted, true);
  assert.equal((await read(page)).train.controls.power, 0); assert.equal((await read(page)).train.controls.brake, 1); await stop(page);
  await page.locator('#steam-profile').selectOption('compact-notched');
  assert.equal((await ui(page)).feedback.muted, true); assert.equal((await read(page)).train.controls.leaseId, null);
  await page.getByRole('button', {name: 'Exit train', exact: true}).click();
  assert.equal((await read(page)).mode, 'on-foot');
  const after = await page.evaluate(() => window.trainYard.host.actors[0]);
  for (const key of ['health', 'ap', 'stamina', 'inventory']) assert.deepEqual(after[key], resources[key]);

  const rides = [];
  for (const stock of ['steam', 'electric']) {
    await approach(page, stock, 'rider'); await enter(page, stock, 'rider');
    await page.waitForFunction(() => window.trainYard.readForActor().train.speedMps > .4);
    const steps = await page.evaluate(stock => {
      const host = window.trainYard.host; let steps = 0;
      while (host.read().services[stock].status !== 'docked' && steps++ < 3000) {
        const result = host.advance(.05); if (!result.ok) throw Error(result.reason);
      }
      if (steps >= 3000) throw Error('Passenger service did not dock.'); window.trainYard.render(); return steps;
    }, stock);
    await page.getByRole('button', {name: 'Exit train', exact: true}).click();
    assert.equal((await read(page)).mode, 'on-foot'); rides.push({stock, explicitHostSteps: steps});
  }

  const layouts = [];
  for (const viewport of [{width: 390, height: 844}, {width: 320, height: 568}, {width: 844, height: 390}]) {
    const context = await browser.newContext({viewport, hasTouch: true, isMobile: true});
    try {
      const phone = await context.newPage(); phone.on('pageerror', error => errors.push(error.message));
      phone.on('response', response => { if (response.status() >= 400) failedRequests.push({url: response.url(), status: response.status()}); });
      await open(phone); await enter(phone, 'steam', 'driver');
      assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const visibleLever = await phone.getByRole('slider').boundingBox(), visibleBrake = await chain(phone).boundingBox();
      for (const bounds of [visibleLever, visibleBrake]) assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1);
      if (viewport.width === 390) {
        const cdp = await context.newCDPSession(phone);
        const forwardTouch = {id: 0, x: visibleLever.x + visibleLever.width / 2, y: visibleLever.y + 6};
        const brakeTouch = {id: 1, x: visibleBrake.x + visibleBrake.width / 2, y: visibleBrake.y + visibleBrake.height / 2};
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [forwardTouch]});
        await phone.waitForFunction(() => window.trainYard.readForActor().train.speedMps > .2);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        assert.equal((await read(phone)).train.controls.power, 1);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [forwardTouch]});
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [forwardTouch, brakeTouch]});
        assert.equal((await read(phone)).train.controls.power, 0); assert.equal((await read(phone)).train.controls.brake, 1);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); await stop(phone);
        assert.equal((await read(phone)).train.controls.leaseId, null);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [forwardTouch]});
        await phone.waitForFunction(() => window.trainYard.readForActor().train.speedMps > .2);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []}); await stop(phone);
        assert.equal((await read(phone)).train.controls.power, 0); assert.equal((await read(phone)).train.controls.brake, 1);
      }
      await phone.screenshot({path: path.join(out, 'steam-' + viewport.width + 'x' + viewport.height + '.png')});
      await phone.getByRole('button', {name: 'Exit train', exact: true}).tap();
      assert.equal((await read(phone)).mode, 'on-foot'); assert.equal(await phone.locator('#walking').isVisible(), true);
      layouts.push({...viewport, controlsFit: true, exitRestoresWalking: true});
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({desktop: 'persistent notches, coast, refused moving reversal, chain stop, reverse, silent restore, safe profile switch and retained resources', fonts, rides, layouts,
    note: 'Passenger laps use explicit host-clock steps after live departure. Phone viewports do not establish physical-device performance.'}, null, 2));
}, {source: installed, owner: '01a18107-b4af-78c0-850f-0235d4df307f', output: installed ? 'tinderbox-train-installed' : 'tinderbox-train-playtest', timeoutMs: 600000});
