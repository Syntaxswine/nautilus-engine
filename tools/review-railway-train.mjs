import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';

await withArtReview('Run the steam and electric trains through the built Workshop railway', async ({page, baseURL, out, browser}) => {
  await page.setViewportSize({width: 1440, height: 960});
  page.setDefaultTimeout(25000);
  await page.goto(baseURL + '/');
  const ready = () => page.waitForFunction(() => window.editor3d?.scene.railwayTrain && !window.editor3d.loading);
  await ready();
  await page.evaluate(async () => {
    const {createMapDocument} = await import('/packages/map-core/index.js');
    const doc = createMapDocument('Railway train review');
    const edit = (tool, options) => {
      const result = doc.apply({tool, options, start: {z: 0}});
      if (!result.ok) throw new Error(result.error);
    };
    edit('railway-route', {waypoints: [[30, 50], [86, 50]]});
    edit('railway-route', {waypoints: [[41, 43], [57, 59]]});
    edit('railway-turnout', {id: 'rail-1', turnout: {at: [65, 50], end: [77, 62]}});
    await window.nautilus.open(doc.export());
  });
  await ready();
  const frame = (x, y, span) => page.evaluate(async ({x, y, span}) => {
    Object.assign(window.editor3d.view, {x, y, span, preset: '0'});
    window.editor3d.scene.changed();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, {x, y, span});
  const tap = async (x, y) => {
    const screen = await page.evaluate(async ({x, y}) => {
      const {Vector3} = await import('/packages/render-effects/three.js');
      const canvas = document.getElementById('scene'), rect = canvas.getBoundingClientRect();
      const v = new Vector3(x, 0, y).project(window.editor3d.scene.camera);
      const point = [rect.left + (v.x + 1) * rect.width / 2, rect.top + (1 - v.y) * rect.height / 2];
      if (document.elementFromPoint(...point) !== canvas) throw new Error('Departure point is outside the visible map.');
      return point;
    }, {x, y});
    await page.mouse.click(...screen);
  };
  const read = () => page.evaluate(() => window.editor3d.scene.railwayTrain.read());
  const portable = () => page.evaluate(() => window.nautilus.export());
  const run = page.locator('#railway-train-run');
  const reset = page.locator('#railway-train-reset');
  const stock = page.locator('#railway-train-stock');
  const turnout = page.locator('#railway-train-switch');
  const waitSetting = setting => page.waitForFunction(value =>
    !window.editor3d.loading && window.editor3d.document.map.railwayRoutes.train?.switchPosition === value, setting);
  const waitMotion = async (phase, condition) => {
    try { return await page.waitForFunction(condition, undefined, {polling: 100, timeout: 60000}); }
    catch (error) {
      const live = await page.evaluate(() => ({
        ...window.editor3d.scene.railwayTrain.read(),
        setting: window.editor3d.document.map.railwayRoutes.train?.switchPosition,
        status: document.getElementById('railway-train-status')?.textContent
      }));
      fs.writeFileSync(path.join(out, 'motion-failure.json'), JSON.stringify({phase, ...live}, null, 2) + '\n');
      throw new Error(phase + ' did not complete. ' + JSON.stringify(live), {cause: error});
    }
  };
  const waitStopped = phase => waitMotion(phase, () => window.editor3d.scene.railwayTrain.read().state?.stopped);
  const waitStock = type => page.waitForFunction(value =>
    !window.editor3d.loading && window.editor3d.scene.railwayTrain.read().state?.stock === value, type);

  await page.locator('[data-group="railway"]').click();
  await page.locator('#railway-mode').selectOption('train');
  await page.locator('#railway-train-profile').selectOption('miniature');
  await frame(57, 50, 65);
  await tap(31, 50);
  await waitStock('steam');
  const original = JSON.parse(await portable()).railwayRoutes.train;
  assert.deepEqual(original, {routeId: 'rail-1', stock: 'steam', departure: 'start', switchPosition: 'main'});
  assert.equal((await read()).state.cars.length, 4);
  await run.click();
  await waitMotion('Steam crossing', () => {
    const {state, playing} = window.editor3d.scene.railwayTrain.read();
    return playing && state.cars[0].front.x > 48;
  });
  const diamond = (await read()).state;
  assert.equal(diamond.track, 'main');
  assert.equal(diamond.routeId, 'rail-1');
  assert.equal(diamond.cars[0].front.z, 50);
  assert.equal(diamond.turnoutTaken, null);
  await turnout.selectOption('branch');
  await waitSetting('branch');
  await waitMotion('Steam turning onto the branch', () => {
    const {state} = window.editor3d.scene.railwayTrain.read();
    return state.track === 'branch' && state.cars[0].front.track === 'branch' && state.cars.at(-1).rear.track === 'main';
  });
  await run.click();
  assert.equal((await read()).playing, false);
  await frame(63, 52, 20);
  await page.screenshot({path: path.join(out, 'railway-steam-turnout.png')});
  await turnout.selectOption('main');
  await waitSetting('main');
  assert.equal((await read()).state.turnoutTaken, 'branch');
  assert.match(await page.locator('#railway-train-status').textContent(), /next run/);
  await run.click();
  await waitStopped('Steam stopping on the branch');
  const branch = (await read()).state;
  assert.equal(branch.track, 'branch');
  assert.ok(branch.cars.every(car => car.front.track === 'branch' && car.rear.track === 'branch'));
  assert.ok(branch.cars[0].front.z > 61);
  await reset.click();
  assert.equal((await read()).state.distanceM, 0);

  await page.locator('#railway-train-remove').click();
  await page.waitForFunction(() => !window.editor3d.loading && !window.editor3d.scene.railwayTrain.read().state);
  await stock.selectOption('electric');
  await frame(57, 50, 65);
  await tap(31, 50);
  await waitStock('electric');
  assert.equal((await read()).state.cars.length, 3);
  assert.ok((await read()).state.cars.at(-1).reverse);
  const saved = await portable();
  await run.click();
  await waitMotion('Electric crossing', () => window.editor3d.scene.railwayTrain.read().state.cars[0].front.x > 50);
  await run.click();
  await frame(46, 50, 17);
  await page.screenshot({path: path.join(out, 'railway-electric-crossing.png')});
  await run.click();
  await waitStopped('Electric stopping on the main line');
  const main = (await read()).state;
  assert.equal(main.turnoutTaken, 'main');
  assert.equal(main.track, 'main');
  assert.equal(main.cars[0].front.z, 50);
  assert.ok(main.cars[0].front.x > 85);
  assert.equal(await portable(), saved, 'Running the train must leave the design unchanged.');

  await page.evaluate(json => window.nautilus.open(json), saved);
  await waitStock('electric');
  assert.equal((await read()).state.distanceM, 0);
  await page.locator('#railway-train-remove').click();
  await page.waitForFunction(() => !window.editor3d.loading && !window.editor3d.scene.railwayTrain.read().state);
  assert.equal(JSON.parse(await portable()).railwayRoutes.version, 3);
  await page.locator('#undo').click();
  await waitStock('electric');
  assert.equal(await portable(), saved);
  const evidence = {browser: browser.version(), stayedOnOwnRoute: true, switchChangedWhileRunning: true,
    sameSwitchForAllCars: true, steamAtBranchEnd: branch.cars[0].front, electricAtMainEnd: main.cars[0].front,
    paused: true, reset: true, portableReload: true, removalUndo: true};
  fs.writeFileSync(path.join(out, 'acceptance.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
}, {owner: 'nautilus-railway-train-review', output: 'railway-train-review', timeoutMs: 300000});
