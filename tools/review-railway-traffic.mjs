import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';

await withArtReview('Run both trains through a crossing and a turnout in the built Workshop', async ({page, baseURL, out, browser}) => {
  await page.setViewportSize({width: 1440, height: 960});
  page.setDefaultTimeout(25000);
  await page.goto(baseURL + '/');
  const ready = () => page.waitForFunction(() => window.editor3d?.scene.railwayTrain && !window.editor3d.loading);
  await ready();
  const read = () => page.evaluate(() => window.editor3d.scene.railwayTrain.read());
  const portable = () => page.evaluate(() => window.nautilus.export());
  const steam = snapshot => snapshot.trains.find(train => train.stock === 'steam');
  const electric = snapshot => snapshot.trains.find(train => train.stock === 'electric');
  const awaitMotion = async (label, condition, arg) => {
    try { await page.waitForFunction(condition, arg, {polling: 100, timeout: 65000}); }
    catch (error) {
      const live = await read();
      fs.writeFileSync(path.join(out, 'motion-failure.json'), JSON.stringify({label, live}, null, 2) + '\n');
      throw new Error(label + ' did not complete.', {cause: error});
    }
  };
  const frame = (x, y, span) => page.evaluate(async ({x, y, span}) => {
    Object.assign(window.editor3d.view, {x, y, span, preset: '0'});
    window.editor3d.scene.changed();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, {x, y, span});
  async function clickTrack(x, y) {
    const screen = await page.evaluate(async ({x, y}) => {
      const {Vector3} = await import('/packages/render-effects/three.js');
      const canvas = document.getElementById('scene'), rect = canvas.getBoundingClientRect();
      const v = new Vector3(x, 0, y).project(window.editor3d.scene.camera);
      const point = [rect.left + (v.x + 1) * rect.width / 2, rect.top + (1 - v.y) * rect.height / 2];
      if (document.elementFromPoint(...point) !== canvas) throw new Error('Departure is outside the visible map.');
      return point;
    }, {x, y});
    await page.mouse.click(...screen);
  }

  const stock = page.locator('#railway-train-stock');
  const runBoth = page.locator('#railway-train-run-both');
  const status = page.locator('#railway-train-status');
  const waitForCount = n => page.waitForFunction(count =>
    !window.editor3d.loading && window.editor3d.scene.railwayTrain.read().trains.length === count, n);
  async function openYard(name, routes, turnout) {
    await page.evaluate(async ({name, routes, turnout}) => {
      const {createMapDocument} = await import('/packages/map-core/index.js');
      const doc = createMapDocument(name);
      const apply = (tool, options) => {
        const result = doc.apply({tool, options, start: {z: 0}});
        if (!result.ok) throw new Error(result.error);
      };
      for (const waypoints of routes) apply('railway-route', {waypoints});
      if (turnout) apply('railway-turnout', {id: 'rail-1', turnout});
      await window.nautilus.open(doc.export());
    }, {name, routes, turnout});
    await ready();
    await page.locator('[data-group="railway"]').click();
    await page.locator('#railway-mode').selectOption('train');
  }

  async function waitForRed(kind) {
    await awaitMotion('Electric waiting at ' + kind, expected => {
      const {trains, signals} = window.editor3d.scene.railwayTrain.read();
      const electric = trains.find(train => train.stock === 'electric');
      const signal = signals.find(item => item.id === electric?.waiting?.signalId);
      return electric?.playing && electric.waiting?.kind === expected &&
        signal?.aspect === 'stop' && signal.occupiedBy === 'steam';
    }, kind);
    const hold = await read(), waiting = electric(hold);
    assert.equal(waiting.waiting.kind, kind);
    assert.equal(hold.signals.find(signal => signal.id === waiting.waiting.signalId).occupiedBy, 'steam');
    assert.match(await status.textContent(), new RegExp('Waiting at the ' + kind + ' signal'));
    const lamp = await page.evaluate(async id => {
      const {Color} = await import('/packages/render-effects/three.js');
      const scene = window.editor3d.scene;
      const index = scene.railwayTrain.read().signals.findIndex(signal => signal.id === id);
      const mesh = scene.scene.getObjectByName('Railway signals').getObjectByName('Signal lights');
      const colour = new Color();
      mesh.getColorAt(index * 2, colour);
      return colour.getHex();
    }, waiting.waiting.signalId);
    assert.equal(lamp, 0xff4936);
    return waiting.state.distanceM;
  }

  await openYard('Two trains at the crossing', [[[30, 50], [77, 50]], [[50, 28], [50, 76]]]);
  await frame(49, 49, 58);
  await stock.selectOption('steam');
  await clickTrack(31, 50);
  await waitForCount(1);
  await stock.selectOption('electric');
  await clickTrack(50, 29);
  await waitForCount(2);
  assert.equal(JSON.parse(await portable()).railwayRoutes.version, 5);
  const saved = await portable();
  await frame(47, 47, 22);
  await runBoth.click();
  const diamondHold = await waitForRed('crossing');
  await page.screenshot({path: path.join(out, 'railway-crossing-signal.png')});
  await awaitMotion('Electric resuming through the diamond', hold => {
    const state = window.editor3d.scene.railwayTrain.read().trains.find(train => train.stock === 'electric');
    return state.playing && state.state.distanceM > hold + .75 && state.waiting === null;
  }, diamondHold);
  const crossed = await read();
  assert.equal(electric(crossed).state.routeId, 'rail-2');
  assert.ok(electric(crossed).state.cars.every(car => car.front.x === 50 && car.rear.x === 50));
  assert.equal(await portable(), saved);
  await page.evaluate(json => window.nautilus.open(json), saved);
  await waitForCount(2);
  assert.ok((await read()).trains.every(train => !train.playing && train.state.distanceM === 0));
  await stock.selectOption('electric');
  await page.locator('#railway-train-remove').click();
  await waitForCount(1);
  assert.equal(steam(await read()).state.stock, 'steam');
  assert.equal(JSON.parse(await portable()).railwayRoutes.version, 4);
  await page.locator('#undo').click();
  await waitForCount(2);
  assert.equal(await portable(), saved);

  await openYard('Two trains at the turnout', [[[30, 50], [89, 50]]], {at: [65, 50], end: [82, 67]});
  await frame(58, 55, 69);
  await stock.selectOption('steam');
  await clickTrack(31, 50);
  await waitForCount(1);
  await stock.selectOption('electric');
  await clickTrack(81, 66);
  await waitForCount(2);
  assert.equal(electric(await read()).state.departure, 'branch');
  await frame(64, 53, 25);
  await runBoth.click();
  const turnoutHold = await waitForRed('turnout');
  await page.screenshot({path: path.join(out, 'railway-turnout-signal.png')});
  await awaitMotion('Electric merging from the branch after the steam train clears', hold => {
    const state = window.editor3d.scene.railwayTrain.read().trains.find(train => train.stock === 'electric');
    return state.playing && state.state.distanceM > hold + .75 && state.state.track === 'main' && state.waiting === null;
  }, turnoutHold);
  assert.equal(steam(await read()).state.turnoutTaken, 'main');

  const evidence = {browser: browser.version(), bothTrainsPlaced: true, crossingWaitAndResume: true,
    turnoutWaitAndResume: true, renderedRedLamps: true, independentCrossingRoute: true,
    portableReload: true, removeOneAndUndo: true};
  fs.writeFileSync(path.join(out, 'acceptance.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
}, {owner: 'nautilus-railway-signal-review', output: 'railway-traffic-review', timeoutMs: 300000});
