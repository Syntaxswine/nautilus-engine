import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';

const waypoints = [[12, 12], [24, 12], [32, 20], [32, 30], [43, 30]];
const feature = 'nautilus-railway-routes-v1';
await withArtReview('Lay and reopen a connected railway in the built Map Workshop', async ({page, baseURL, out, browser}) => {
  page.setDefaultTimeout(20000);
  await page.setViewportSize({width: 1440, height: 960});
  await page.goto(baseURL + '/');
  const ready = () => page.waitForFunction(() => window.editor3d?.scene.railwayModels && !window.editor3d.loading);
  await ready();
  const frame = (x, y, span) => page.evaluate(async ({x, y, span}) => {
    Object.assign(window.editor3d.view, {x, y, span, preset: '0'});
    window.editor3d.scene.changed();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, {x, y, span});
  const frameRoute = () => frame(27.5, 21, 29);
  await page.evaluate(async () => {
    const {blankMap} = await import('/packages/map-core/index.js');
    await window.nautilus.open(blankMap('Railway route review'));
  });
  await frameRoute();
  await page.locator('#nautilus-assets').click();
  await page.locator('#asset-category').selectOption('Railway');
  await page.locator('[data-asset="Railway:track-quarter-curve"]').click();
  await page.locator('#asset-use').click();
  assert.equal(await page.locator('#edit-tool').inputValue(), 'railway-route');
  assert.ok(await page.locator('#railway-options').isVisible());

  const portable = () => page.evaluate(() => window.nautilus.export());
  const history = () => page.evaluate(() => window.editor3d.document.editor.undo.length);
  const spot = async ([x, y]) => page.evaluate(async ([x, y]) => {
    const {Vector3} = await import('/packages/render-effects/three.js');
    const canvas = document.getElementById('scene'), rect = canvas.getBoundingClientRect();
    const v = new Vector3(x, 0, y).project(window.editor3d.scene.camera);
    const screen = [rect.left + (v.x + 1) * rect.width / 2, rect.top + (1 - v.y) * rect.height / 2];
    if (document.elementFromPoint(...screen) !== canvas) throw Error('Route waypoint outside unobstructed canvas: ' + screen.join(', '));
    return screen;
  }, [x, y]);
  const tap = async point => page.mouse.click(...await spot(point));
  const draft = page.locator('#railway-draft');
  const initial = await portable();
  await tap([12, 12]);
  await page.keyboard.press('r');
  assert.match(await page.locator('#status').textContent(), /heading follows the waypoints/);
  await tap([15, 12]);
  await tap([15, 19]);
  assert.match(await draft.textContent(), /needs 4\.00 m/);
  assert.equal(await portable(), initial);
  assert.equal(await history(), 0);
  await page.locator('#railway-cancel').click();
  assert.match(await draft.textContent(), /first waypoint/);
  assert.ok(await page.locator('#railway-place').isDisabled());
  assert.equal(await page.evaluate(() => window.editor3d.scene.railwayGhost), null);

  await tap(waypoints[0]);
  await page.mouse.move(...await spot(waypoints[1]));
  await page.waitForFunction(() => window.editor3d.scene.railwayGhost?.model.root.children.length === 5);
  assert.equal(await portable(), initial);
  for (const point of waypoints.slice(1)) await tap(point);
  assert.match(await draft.textContent(), /5 waypoints accepted/);
  await page.locator('#railway-place').click();
  await page.waitForFunction(() => !window.editor3d.loading && window.editor3d.scene.railwayModels.size === 1);
  assert.equal(await history(), 1);
  const committed = await portable(), data = JSON.parse(committed).railwayRoutes;
  assert.deepEqual(data, {version: 1, routes: [{id: 'rail-1', waypoints}]});

  // Inspect the actual Three buffers installed in the built Workshop. All six
  // tangent rings must carry the gravel, both rails and through-triangles.
  const geometry = () => page.evaluate(async () => {
    const {planRailwayRoute} = await import('/packages/map-core/index.js');
    const [{id, waypoints}] = window.editor3d.document.map.railwayRoutes.routes;
    const root = window.editor3d.scene.railwayModels.get(id).model.root;
    const {stations, spans, lengthM} = planRailwayRoute(waypoints);
    const joins = spans.slice(1).map(span => stations.findIndex(site => Math.abs(site.distanceM - span.startM) < 1e-8));
    const [bed, left, right] = root.children;
    const lateral = (mesh, i) => {
      const p = mesh.geometry.attributes.position, {x, z, c, s} = stations[i];
      return (p.getX(2 * i) - x) * c - (p.getZ(2 * i) - z) * s;
    };
    const offsets = joins.map(i => ({
      outerM: Number(lateral(bed, i).toFixed(5)),
      railGaugeM: Number((lateral(right, i) - lateral(left, i)).toFixed(5)),
      gravelUV: Math.abs(bed.geometry.attributes.uv.getY(2 * i) - stations[i].distanceM * 2) < 1e-5,
      allConnected: [bed, left, right].every(mesh => {
        const v = 2 * i, at = 6 * (i - 1);
        return [...mesh.geometry.index.array.slice(at, at + 12)].join() ===
          [v - 2, v, v - 1, v - 1, v, v + 1, v, v + 2, v + 1, v + 1, v + 2, v + 3].join();
      })
    }));
    const digest = async array => {
      const bytes = await crypto.subtle.digest('SHA-256', array);
      return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
    };
    const meshes = [];
    root.traverse(node => { if (node.isMesh) meshes.push(node); });
    const models = await Promise.all(meshes.map(async mesh => ({
      name: mesh.name, instances: mesh.count ?? null,
      vertices: await digest(mesh.geometry.attributes.position.array),
      indices: await digest(mesh.geometry.index.array),
      instanceMatrix: mesh.isInstancedMesh ? await digest(mesh.instanceMatrix.array) : null
    })));
    return {models, offsets, lengthM, visible: root.visible, turns: spans.filter(s => s.turn).map(s => Math.round(s.turn * 180 / Math.PI))};
  });
  const built = await geometry();
  assert.ok(built.visible);
  assert.equal(built.models.length, 5);
  assert.equal(built.models[3].instances, Math.round(built.lengthM / .5));
  assert.deepEqual(built.turns, [45, 45, -90]);
  assert.equal(built.offsets.length, 6);
  assert.ok(built.offsets.every(join => join.outerM === -1 && join.railGaugeM === .9 && join.gravelUV && join.allConnected));

  await page.locator('#undo').click();
  await page.waitForFunction(() => !window.editor3d.loading && !window.editor3d.scene.railwayModels.size);
  assert.equal(await portable(), initial);
  await page.locator('#redo').click();
  await page.waitForFunction(() => !window.editor3d.loading && window.editor3d.scene.railwayModels.size === 1);
  assert.equal(await portable(), committed);
  assert.deepEqual(await geometry(), built);

  await page.evaluate(async feature => {
    const {engineManifest} = await import('/packages/map-core/index.js');
    const manifest = engineManifest();
    manifest.capabilities = manifest.capabilities.filter(capability => capability.id !== feature);
    window.railwayHostCalls = 0;
    window.disconnectRailwayHost = window.nautilus.connectGame({manifest, openMap() { window.railwayHostCalls++; }});
  }, feature);
  await page.locator('#settings-button').click();
  await page.locator('#playtest').click();
  await page.waitForFunction(feature => document.getElementById('nautilus-settings-feedback')?.textContent.includes(feature), feature);
  const api = await page.evaluate(async () => {
    try { await window.nautilus.sendToGame(); return null; }
    catch (error) { return error.message; }
  });
  assert.ok(api?.includes(feature));
  assert.equal(await page.evaluate(() => window.railwayHostCalls), 0);
  await page.evaluate(() => window.disconnectRailwayHost());

  await page.locator('#save-map').click();
  await page.waitForFunction(() => document.getElementById('nautilus-settings-feedback')?.textContent.includes('Saved in this browser'));
  const savedId = await page.locator('#saved-designs').inputValue();
  assert.ok(savedId);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
  const file = path.join(out, 'railway-roundtrip.json');
  await download.saveAs(file);
  assert.equal(fs.readFileSync(file, 'utf8'), committed);
  await page.locator('#close-settings').click();
  await page.reload();
  await ready();
  await page.locator('#settings-button').click();
  await page.locator('#saved-designs').selectOption(savedId);
  await page.locator('#load-map').click();
  await page.waitForFunction(() => !window.editor3d.loading && window.editor3d.scene.railwayModels.size === 1);
  assert.equal(await portable(), committed);
  assert.deepEqual(await geometry(), built);

  await page.evaluate(async () => {
    const {blankMap} = await import('/packages/map-core/index.js');
    await window.nautilus.open(blankMap('Empty before railway import'));
  });
  assert.equal(await page.evaluate(() => window.editor3d.scene.railwayModels.size), 0);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('label.file').click()]);
  await chooser.setFiles(file);
  await page.waitForFunction(() => !window.editor3d.loading && window.editor3d.scene.railwayModels.size === 1);
  assert.equal(await portable(), committed);
  assert.deepEqual(await geometry(), built);
  await page.locator('#close-settings').click();
  await page.locator('[data-group="railway"]').click();
  await frameRoute();
  await page.screenshot({path: path.join(out, 'railway-route-desktop.png')});
  const split = {at: [18, 12], end: [26, 4]};
  const mode = page.locator('#railway-mode');
  const withSplit = () => page.waitForFunction(() => !window.editor3d.loading &&
    window.editor3d.scene.railwayModels.get('rail-1')?.model.root.getObjectByName('railway:branch'));
  const trunkOnly = () => page.waitForFunction(() => {
    const root = window.editor3d.scene.railwayModels.get('rail-1')?.model.root;
    return !window.editor3d.loading && root?.visible && !root.getObjectByName('railway:branch');
  });
  await frame(21, 10, 22);
  await mode.selectOption('turnout');
  const beforeSplit = await history();
  await tap(split.at);
  await tap([20, 12]);
  assert.match(await draft.textContent(), /at least 4 m/);
  assert.equal(await portable(), committed);
  await page.mouse.move(...await spot(split.end));
  await page.waitForFunction(() => {
    const {railwayModels, railwayGhost} = window.editor3d.scene;
    return railwayGhost?.model.root.getObjectByName('railway:branch') && !railwayModels.get('rail-1').model.root.visible;
  });
  await page.locator('#railway-cancel').click();
  await trunkOnly();
  assert.equal(await portable(), committed);
  await tap(split.at);
  await tap(split.end);
  await page.locator('#railway-place').click();
  await withSplit();
  assert.equal(await history(), beforeSplit + 1);
  const splitMap = await portable();
  assert.deepEqual(JSON.parse(splitMap).railwayRoutes, {version: 2, routes: [{id: 'rail-1', waypoints, turnout: split}]});
  const joined = await geometry();
  assert.ok(joined.visible);
  assert.ok(joined.models.some(mesh => mesh.name === 'Turnout crossing plate'));
  assert.notEqual(joined.models[3].instanceMatrix, built.models[3].instanceMatrix, 'Switch ties should extend toward the branch.');
  await page.locator('#undo').click();
  await trunkOnly();
  assert.equal(await portable(), committed);
  await page.locator('#redo').click();
  await withSplit();
  assert.equal(await portable(), splitMap);
  await page.evaluate(json => window.nautilus.open(json), splitMap);
  await withSplit();
  assert.deepEqual(await geometry(), joined);
  assert.equal(await portable(), splitMap);
  await frame(20.8, 9.6, 12);
  await page.screenshot({path: path.join(out, 'railway-turnout-desktop.png')});
  await mode.selectOption('turnout');
  await tap(split.at);
  await page.locator('#railway-remove-split').click();
  await trunkOnly();
  assert.equal(await portable(), committed);
  const report = {browser: browser.version(), route: data, geometry: built, previewNonmutating: true,
    invalidApproachRefused: true, cancellation: true, undoRedo: true, namedSave: true, fileImport: true,
    unsupportedSendButtonAndAPI: true, geometryParity: true,
    turnout: {data: split, cancellation: true, undoRedo: true, geometryParity: true, removed: true}};
  fs.writeFileSync(path.join(out, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({browser: report.browser, metres: built.lengthM, joins: built.offsets.length, route: data}));
}, {owner: 'nautilus-railway-turnout-review', output: 'railway-route-review', timeoutMs: 225000});
