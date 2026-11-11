import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';

const routeOnly = process.argv.includes('--route-only');
await withArtReview('Review world-size trains, character scale and shared signals in the built Workshop', async ({page, baseURL, out, browser}) => {
  await page.setViewportSize({width: 1600, height: 1050});
  page.setDefaultTimeout(30000);
  await page.goto(baseURL + '/');
  const ready = () => page.waitForFunction(() => window.editor3d?.scene.railwayTrain && !window.editor3d.loading);
  await ready();
  const read = () => page.evaluate(() => window.editor3d.scene.railwayTrain.read());
  const portable = () => page.evaluate(() => window.nautilus.export());
  const count = n => page.waitForFunction(n => !window.editor3d.loading && window.editor3d.scene.railwayTrain.read().trains.length === n, n);
  const motion = (condition, arg) => page.waitForFunction(condition, arg, {polling: 100, timeout: 75000});
  const frame = (x, y, span) => page.evaluate(async ({x, y, span}) => {
    Object.assign(window.editor3d.view, {x, y, span, preset: '0'});
    window.editor3d.scene.changed();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, {x, y, span});
  async function tap(x, y) {
    const screen = await page.evaluate(async ({x, y}) => {
      const {Vector3} = await import('/packages/render-effects/three.js');
      const canvas = document.getElementById('scene'), rect = canvas.getBoundingClientRect();
      const point = new Vector3(x, 0, y).project(window.editor3d.scene.camera);
      const screen = [rect.left + (point.x + 1) * rect.width / 2, rect.top + (1 - point.y) * rect.height / 2];
      if (document.elementFromPoint(...screen) !== canvas) throw new Error('Review point is outside the map canvas.');
      return screen;
    }, {x, y});
    await page.mouse.click(...screen);
  }
  const stock = page.locator('#railway-train-stock'), size = page.locator('#railway-train-profile');
  const run = page.locator('#railway-train-run');
  async function yard(turnout = false) {
    await page.evaluate(async turnout => {
      const {createMapDocument} = await import('/packages/map-core/index.js');
      const doc = createMapDocument('World-size railway review');
      doc.map.starts = doc.map.starts.map((start, i) => ({...start, x: 85 + 3 * i, y: 95}));
      const edit = (tool, options) => {
        const result = doc.apply({tool, options, start: {z: 0}});
        if (!result.ok) throw new Error(result.error);
      };
      edit('railway-route', {waypoints: [[20, 100], [210, 100]], radiusM: 16});
      if (turnout) edit('railway-turnout', {id: 'rail-1', turnout: {at: [135, 100], end: [198, 163]}});
      else edit('railway-route', {waypoints: [[110, 20], [110, 200]], radiusM: 16});
      await window.nautilus.open(doc.export());
    }, turnout);
    await ready();
    await page.locator('[data-group="railway"]').click();
    await page.locator('#railway-mode').selectOption('train');
    await frame(110, 110, 210);
    await stock.selectOption('steam'); await size.selectOption('world'); await tap(22, 100); await count(1);
    await stock.selectOption('electric'); await size.selectOption('world');
    await tap(turnout ? 197 : 110, turnout ? 162 : 22); await count(2);
  }
  async function waitThenResume(kind, steamLead) {
    await stock.selectOption('steam');
    await run.click();
    await motion(distance => window.editor3d.scene.railwayTrain.read('steam').state.distanceM > distance, steamLead);
    await run.click();
    await stock.selectOption('electric');
    await page.locator('#railway-train-run-both').click();
    await motion(kind => {
      const {trains, signals} = window.editor3d.scene.railwayTrain.read();
      const waiting = trains.find(train => train.stock === 'electric');
      return waiting?.playing && waiting.waiting?.kind === kind && signals.some(signal =>
        signal.id === waiting.waiting.signalId && signal.aspect === 'stop' && signal.occupiedBy === 'steam');
    }, kind);
    const held = await read(), distance = held.trains.find(train => train.stock === 'electric').state.distanceM;
    await page.screenshot({path: path.join(out, 'world-trains-' + kind + '.png')});
    if (kind === 'crossing') {
      // Compare both asset profiles beside the native character models.
      await page.locator('#railway-train-run-both').click();
      await page.evaluate(async () => {
        const T = await import('/packages/render-effects/three.js');
        const {createRollingStockKit} = await import('/packages/railway-visuals/rolling-stock.js');
        const kit = createRollingStockKit(T, {profile: 'miniature'}), model = kit.create('electric-cab');
        model.root.position.set(85, 0, 92); model.root.rotation.y = Math.PI / 2;
        window.editor3d.scene.scene.add(model.root);
        window.railwayScaleReviewKit = kit;
      });
      await frame(92, 98, 43);
      await page.screenshot({path: path.join(out, 'world-train-character-scale.png')});
      await page.evaluate(() => { window.railwayScaleReviewKit.dispose(); delete window.railwayScaleReviewKit; });
      await page.locator('#railway-train-run-both').click();
    }
    await motion(distance => {
      const train = window.editor3d.scene.railwayTrain.read('electric');
      return train.state.distanceM > distance + 1 && !train.waiting;
    }, distance);
  }

  await page.evaluate(async () => {
    const {createMapDocument} = await import('/packages/map-core/index.js');
    await window.nautilus.open(createMapDocument('World-size curve review').export());
  });
  await ready();
  await page.locator('[data-group="railway"]').click();
  await page.locator('#railway-mode').selectOption('route');
  assert.equal(await page.locator('#railway-radius').inputValue(), '16');
  await frame(80, 80, 95);
  for (const [x, y] of [[60, 60], [100, 60], [100, 100]]) await tap(x, y);
  await page.locator('#railway-place').click();
  await page.waitForFunction(() => !window.editor3d.loading && window.editor3d.document.map.railwayRoutes?.routes[0].radiusM === 16);
  const curveSave = await portable();
  await page.locator('#undo').click();
  await page.waitForFunction(() => !window.editor3d.loading && !window.editor3d.document.map.railwayRoutes);
  await page.locator('#redo').click();
  await page.waitForFunction(() => !window.editor3d.loading && window.editor3d.document.map.railwayRoutes?.version === 6);
  assert.equal(await portable(), curveSave);
  await page.locator('#railway-mode').selectOption('train');
  await stock.selectOption('steam'); await size.selectOption('world'); await tap(61, 60); await count(1);
  await run.click();
  await motion(() => window.editor3d.scene.railwayTrain.read('steam').state.distanceM > 25);
  await run.click();
  await frame(83, 70, 66);
  await page.screenshot({path: path.join(out, 'world-train-curve.png')});
  const curveTrainSave = await portable();
  await page.evaluate(json => window.nautilus.open(json), curveTrainSave); await count(1);
  assert.equal((await read()).state.distanceM, 0);
  if (routeOnly) {
    const evidence = {browser: browser.version(), authored16mBendInUI: true, routeUndoRedo: true,
      worldTrainRanThroughBend: true, saveReload: true};
    fs.writeFileSync(path.join(out, 'acceptance.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence));
    return;
  }
  await yard();
  const saved = await portable();
  assert.ok(JSON.parse(saved).railwayRoutes.trains.every(train => train.profile === 'world'));
  await frame(102, 99, 65);
  await waitThenResume('crossing', 14);
  assert.equal(await portable(), saved);
  const dimensions = await page.evaluate(async () => {
    const {Box3, Vector3} = await import('/packages/render-effects/three.js');
    const scene = window.editor3d.scene.scene;
    return scene.children.filter(root => root.name === 'Railway train').map(root => ({
      stock: root.userData.stock, profile: root.userData.profile,
      cars: root.children.filter(child => child.name.startsWith('Train car ')).map(frame => {
        const model = frame.children[0];
        model.updateMatrixWorld(true);
        const box = new Box3().setFromObject(model);
        return {id: model.userData.carId, lengthM: model.userData.lengthM, roofHeightM: box.max.y};
      })
    }));
  });
  assert.equal(dimensions.length, 2);
  assert.ok(dimensions.every(train => train.profile === 'world' && train.cars.every(car => car.lengthM >= 5.1)));
  await page.evaluate(json => window.nautilus.open(json), saved); await count(2);
  assert.ok((await read()).trains.every(train => train.state.distanceM === 0 && train.state.profile === 'world'));
  await stock.selectOption('electric'); await page.locator('#railway-train-remove').click(); await count(1);
  await page.locator('#undo').click(); await count(2); assert.equal(await portable(), saved);
  await yard(true); await frame(137, 107, 70);
  await waitThenResume('turnout', 45);

  const evidence = {browser: browser.version(), dimensions, crossingWaitResume: true, turnoutWaitResume: true,
    legacyModelsAvailable: true, reloadAndUndo: true, preservedDepartureDataWhileRunning: true};
  fs.writeFileSync(path.join(out, 'acceptance.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
}, {owner: 'nautilus-railway-scale-review', output: routeOnly ? 'railway-scale-route-review' : 'railway-scale-review', timeoutMs: 300000});
