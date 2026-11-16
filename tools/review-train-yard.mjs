import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';

await withArtReview('Review walking, boarding, driving, riding and reload on two closed railway circuits', async ({page, baseURL, out, browser}) => {
  await page.setViewportSize({width: 1440, height: 960});
  page.setDefaultTimeout(25000);
  const open = async target => { await target.goto(baseURL + '/examples/train-yard.html'); await target.waitForFunction(() => window.trainYard); };
  const read = target => target.evaluate(() => window.trainYard.readForActor());
  const enterCab = async target => { await target.getByRole('button', {name: 'Enter steam cab', exact: true}).click(); assert.equal((await read(target)).mode, 'driver'); };
  const brakeToStop = async target => target.waitForFunction(() => window.trainYard.readForActor().train?.stopped);
  await open(page);
  const before = await page.evaluate(() => window.trainYard.host.actors[0]);
  await page.screenshot({path: path.join(out, 'desktop-walk-up.png')});
  await enterCab(page);
  const forward = page.getByRole('button', {name: 'Forward', exact: true});
  const box = await forward.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.waitForFunction(() => window.trainYard.readForActor().train.speedMps > .7);
  const running = await read(page);
  assert.equal(running.train.controls.power, 1);
  await page.screenshot({path: path.join(out, 'desktop-driving.png')});
  // Save a moving train, then release the original input source.
  const movingSave = await page.evaluate(() => {
    const saved = window.trainYard.host.save();
    localStorage.setItem('nautilus/two-circuit-yard/v1', saved); document.getElementById('load').disabled = false;
    return JSON.parse(saved);
  });
  await page.mouse.up(); await brakeToStop(page);
  assert.equal((await read(page)).train.controls.brake, 1);
  await page.getByRole('button', {name: 'Reload', exact: true}).click();
  const restored = await read(page);
  assert.equal(restored.mode, 'driver'); assert.equal(restored.carId, movingSave.actors[0].attachment.carId);
  assert.equal(restored.train.controls.power, 0); assert.equal(restored.train.controls.brake, 1);
  assert.equal(await page.evaluate(() => window.trainYard.host.read().entryEffects), movingSave.entryEffects);
  await brakeToStop(page);
  const reverse = page.getByRole('button', {name: 'Reverse', exact: true});
  const rb = await reverse.boundingBox(); await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2); await page.mouse.down();
  await page.waitForFunction(() => window.trainYard.readForActor().train.signedSpeedMps < -.2);
  await page.mouse.up(); await brakeToStop(page);
  await page.getByRole('button', {name: 'Exit train', exact: true}).click();
  assert.equal((await read(page)).mode, 'on-foot');
  const after = await page.evaluate(() => window.trainYard.host.actors[0]);
  for (const key of ['health', 'ap', 'stamina', 'inventory']) assert.deepEqual(after[key], before[key]);
  await page.keyboard.down('a');
  await page.waitForFunction(x => window.trainYard.readForActor().position.x < x - 1, after.position.x);
  await page.keyboard.up('a');
  await page.getByRole('button', {name: 'Overview', exact: true}).click();
  await page.screenshot({path: path.join(out, 'two-closed-circuits.png')});
  // A fresh page keeps the station-service walk independent of the manual run.
  const rides = [];
  await open(page);
  for (const stock of ['steam', 'electric']) {
    const goal = await page.evaluate(async stock => {
      const {railwayEntrancesForTrain} = await import('/packages/train-core/index.js');
      const state = window.trainYard.host.read().trains.find(train => train.stock === stock).state;
      const entrance = railwayEntrancesForTrain(state).find(e => e.mode === 'rider' && e.id.endsWith('right'));
      return {x: entrance.position.x + entrance.outward.x * .9, y: entrance.position.y + entrance.outward.y * .9};
    }, stock);
    // Walk through retained collision/support services, never set actor poses.
    await page.evaluate(goal => {
      const host = window.trainYard.host;
      for (const target of [{x: host.actors[0].position.x, y: 36}, {x: goal.x, y: 36}, goal]) for (let i = 0; i < 2000; i++) {
        const p = host.actors[0].position, dx = target.x - p.x, dy = target.y - p.y, distance = Math.hypot(dx, dy);
        if (distance < .02) break;
        const result = host.walk(dx, dy, Math.min(.05, distance / 5));
        if (!result.ok) throw Error(result.reason);
      }
      window.trainYard.render();
    }, goal);
    await page.getByRole('button', {name: 'Enter ' + stock + ' coach', exact: true}).first().click();
    assert.equal((await read(page)).mode, 'rider');
    assert.equal(await page.locator('#reference-drive').isVisible(), false);
    await page.waitForFunction(() => window.trainYard.readForActor().train.speedMps > .4);
    await page.screenshot({path: path.join(out, stock + '-coach-riding.png')});
    const receipt = await page.evaluate(stock => {
      const host = window.trainYard.host;
      let steps = 0;
      while (host.read().services[stock].status !== 'docked' && steps++ < 3000) {
        const result = host.advance(.05); if (!result.ok) throw Error(result.reason);
      }
      if (steps >= 3000) throw Error('Passenger service failed to dock.');
      window.trainYard.render();
      return {stock, acceleratedHostSteps: steps, state: host.read().trains.find(train => train.stock === stock).state, actor: host.actors[0]};
    }, stock);
    await page.getByRole('button', {name: 'Exit train', exact: true}).click();
    assert.equal((await read(page)).mode, 'on-foot'); rides.push(receipt);
  }
  await page.evaluate(async () => {
    const {railwayEntrancesForTrain} = await import('/packages/train-core/index.js'), host = window.trainYard.host;
    const entrance = railwayEntrancesForTrain(host.read().trains.find(train => train.stock === 'electric').state)
      .find(e => e.mode === 'driver' && e.carIndex === 0 && e.id.endsWith('right'));
    const goal = {x: entrance.position.x + entrance.outward.x * .9, y: entrance.position.y + entrance.outward.y * .9};
    for (const target of [{x: host.actors[0].position.x, y: 36}, {x: goal.x, y: 36}, goal]) for (let i = 0; i < 2000; i++) {
      const p = host.actors[0].position, dx = target.x - p.x, dy = target.y - p.y, distance = Math.hypot(dx, dy);
      if (distance < .02) break;
      const result = host.walk(dx, dy, Math.min(.05, distance / 5)); if (!result.ok) throw Error(result.reason);
    }
    window.trainYard.render();
  });
  await page.getByRole('button', {name: 'Enter electric cab', exact: true}).first().click();
  const electricForward = await page.getByRole('button', {name: 'Forward', exact: true}).boundingBox();
  await page.mouse.move(electricForward.x + electricForward.width / 2, electricForward.y + electricForward.height / 2);
  await page.mouse.down(); await page.waitForFunction(() => window.trainYard.readForActor().train.signedSpeedMps > .3);
  await page.mouse.up(); await brakeToStop(page);
  const electricReverse = await page.getByRole('button', {name: 'Reverse', exact: true}).boundingBox();
  await page.mouse.move(electricReverse.x + electricReverse.width / 2, electricReverse.y + electricReverse.height / 2);
  await page.mouse.down(); await page.waitForFunction(() => window.trainYard.readForActor().train.signedSpeedMps < -.2);
  await page.mouse.up(); await brakeToStop(page);
  await page.screenshot({path: path.join(out, 'electric-cab-manual.png')});
  await page.getByRole('button', {name: 'Exit train', exact: true}).click();
  assert.equal((await read(page)).mode, 'on-foot');
  const touchContext = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  const touch = await touchContext.newPage(); await open(touch); await enterCab(touch);
  const cdp = await touchContext.newCDPSession(touch), fb = await touch.getByRole('button', {name: 'Forward', exact: true}).boundingBox();
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: fb.x + fb.width / 2, y: fb.y + fb.height / 2}]});
  await touch.waitForFunction(() => window.trainYard.readForActor().train.speedMps > .2);
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []}); await brakeToStop(touch);
  assert.equal((await read(touch)).train.controls.power, 0); assert.equal((await read(touch)).train.controls.brake, 1);
  await touch.screenshot({path: path.join(out, 'touch-driver-braked.png')});
  await touch.getByRole('button', {name: 'Exit train', exact: true}).tap();
  assert.equal((await read(touch)).mode, 'on-foot');
  assert.equal(await touch.locator('#walking').isVisible(), true);
  await touchContext.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({browser: browser.version(), sourceReview: true,
    desktop: 'keyboard walk, contextual cab entry, pointer-held forward, release/brake/stop, reverse, exit and resource preservation',
    touch: '390x844 actual touch hold/cancel, authoritative brake, exit and walking restoration',
    rides, note: 'Full passenger laps use recorded explicit host-clock steps after visible live departure; no reset/teleport or wall-clock performance claim.'}, null, 2));
}, {source: true, owner: '01a1810c-62da-7210-a1ca-b72b449ce024', output: 'train-driving-review', timeoutMs: 240000});
