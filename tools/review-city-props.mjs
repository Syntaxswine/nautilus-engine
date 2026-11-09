import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {CITY_PROPS} from '../packages/city-props/index.js';
import {withArtReview, projectRoot} from './art-review-browser.mjs';

const owner = '01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3';
const sample = path.join(projectRoot, 'assets/city-props/workshop-sample.json');
const sampleCount = JSON.parse(fs.readFileSync(sample)).props.length;
const {aft} = JSON.parse(fs.readFileSync(path.join(projectRoot, 'upstream.json')));
const sceneryRoot = aft.root + '/dist/tactics/';
for (const name of ['scenery-catalog.js', 'scenery-scene.js']) {
  const original = fs.readFileSync(path.join(projectRoot, sceneryRoot, name));
  const built = fs.readFileSync(path.join(projectRoot, 'dist', sceneryRoot, name));
  assert.ok(built.equals(original), 'A standalone editor scenery input changed: ' + name);
}
const catalogueURL = '/' + sceneryRoot + 'scenery-catalog.js';
const recognisesCity = (page) => page.evaluate(async url =>
  (await import(url)).isScenery({kind: 'city1880-hanging-sign-goods'}), catalogueURL);
const output = 'city-props-frontage-review-' + new Date().toISOString().replace(/[^0-9]/g, '');
await withArtReview('1880s art and native Workshop placement', async ({page, baseURL, out, browser, errors, failedRequests}) => {
  const capture = (file, selector) => selector
    ? page.locator(selector).screenshot({path: path.join(out, file), animations: 'disabled'})
    : page.screenshot({path: path.join(out, file), animations: 'disabled'});
  const waitEditor = () => page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading);
  const state = () => page.evaluate(() => window.editor3d.export());
  page.on('dialog', dialog => dialog.accept());
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto(baseURL + '/examples/city-props.html');
  await page.waitForFunction(() => document.documentElement.dataset.cityPropsReady === 'true');
  assert.equal(await recognisesCity(page), false, 'The gallery sees the standalone registry.');
  await capture('storefront.png', 'canvas');
  await page.locator('#specimen').selectOption('city1880-hanging-sign-goods');
  await capture('hanging-sign.png', 'canvas');
  await page.locator('[data-mode="front"]').click();
  await page.locator('#specimen').selectOption('city1880-room-cornice-corner');
  await capture('dentil-corner.png', 'canvas');
  await page.locator('[data-mode="street"]').click();
  await capture('bell-and-alder.png', 'canvas');
  for (const [mode, file] of [['furniture','eastlake.png'],['shop','shop-fixtures.png'],['lamps','oil-lighting.png']]) {
    await page.locator('[data-mode="' + mode + '"]').click();
    await capture(file, 'canvas');
  }
  await page.locator('#specimen').selectOption('city1880-reflector-sconce-lit');
  assert.equal(await page.locator('#assets a').count(), 4);
  for (const link of await page.locator('#assets a').all()) {
    const response = await page.request.get(await link.getAttribute('href'));
    assert.ok(response.ok(), 'Individual model files must resolve.');
  }
  await capture('oil-reflector-detail.png', 'canvas');
  await page.setViewportSize({width: 390, height: 840});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Gallery overflows a 390 px viewport.');
  await capture('gallery-phone.png');

  await page.setViewportSize({width: 1440, height: 900});
  await page.goto(baseURL + '/');
  await waitEditor();
  assert.equal(await recognisesCity(page), true, 'The Workshop import map loads the extended registry.');
  await page.evaluate(async () => {
    const {blankMap} = await import('/packages/map-core/index.js');
    await window.nautilus.open(blankMap('Bell & Alder placement review'));
    Object.assign(window.editor3d.view, {x: 9, y: 9, span: 13, preset: '0'});
    window.editor3d.scene.changed();
  });
  await page.locator('#nautilus-assets').click();
  await page.locator('#asset-category').selectOption('1880s City');
  assert.equal(await page.locator('#asset-results button[data-asset]').count(), CITY_PROPS.length);
  await page.locator('#asset-search').fill('Eastlake dining');
  assert.equal(await page.locator('#asset-results button[data-asset]').count(), 1);
  await page.locator('#asset-results button[data-asset]').click();
  await page.waitForFunction(() => !document.getElementById('asset-use').disabled);
  await capture('asset-library.png');
  await page.locator('#asset-use').click();
  await page.locator('#asset-library').waitFor({state: 'hidden'});
  assert.equal(await page.locator('#prop-kind').inputValue(), 'city1880-dining-table');
  await page.keyboard.press('r');
  assert.equal(await page.locator('#scenery-rotation').inputValue(), '90');

  const clickPoint = await page.evaluate(async () => {
    const T = await import('/packages/render-effects/three.js');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const {camera} = window.editor3d.scene;
    const rect = document.getElementById('scene').getBoundingClientRect();
    const p = new T.Vector3(8, 0, 9).project(camera);
    return [rect.left + (p.x + 1) * rect.width / 2, rect.top + (1 - p.y) * rect.height / 2];
  });
  await page.mouse.click(...clickPoint);
  await page.waitForFunction(() => window.editor3d.document.map.props.some(p => p.kind === 'city1880-dining-table'));
  const placed = await state();
  const placement = JSON.parse(placed).props.find(p => p.kind === 'city1880-dining-table');
  assert.deepEqual([placement.x, placement.y, placement.z || 0, placement.rotation], [8, 9, 0, 90]);
  await page.locator('#undo').click();
  await page.waitForFunction(() => !window.editor3d.document.map.props.length);
  await page.locator('#redo').click();
  await page.waitForFunction(() => window.editor3d.document.map.props.length === 1 && !window.editor3d.loading);
  assert.equal(await state(), placed, 'Undo and redo should retain the orientation and identity.');
  const block = await page.evaluate(async () => {
    const {rotateSceneryBlock} = await import('/packages/map-core/prefab-rotation.js');
    const doc = window.editor3d.document;
    const captured = doc.capture(0, 0);
    const turned = rotateSceneryBlock(captured);
    return {original: captured.props[0], turned: turned.props[0]};
  });
  assert.equal(block.turned.kind, placement.kind);
  assert.equal(block.turned.rotation, 180);

  await page.locator('#settings-button').click();
  await page.locator('#save-map').click();
  await page.waitForFunction(() => document.getElementById('nautilus-settings-feedback')?.textContent.includes('Saved in this browser'));
  const savedId = await page.locator('#saved-designs').inputValue();
  assert.ok(savedId);
  await page.locator('#load-map').click();
  await waitEditor();
  assert.equal(await state(), placed);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
  const exported = path.join(out, 'placement-roundtrip.json');
  await download.saveAs(exported);
  assert.equal(fs.readFileSync(exported, 'utf8'), placed);
  if (!await page.locator('#editor-settings').evaluate(el => el.open)) await page.locator('#settings-button').click();
  const importFile = async file => {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('label.file').click()]);
    await chooser.setFiles(file);
    await waitEditor();
  };
  await importFile(exported);
  assert.equal(await state(), placed, 'File import should retain the city prop record.');
  if (!await page.locator('#editor-settings').evaluate(el => el.open)) await page.locator('#settings-button').click();
  await importFile(sample);
  await page.waitForFunction(count => window.editor3d.document.map.props.length === count && !window.editor3d.loading, sampleCount);
  if (await page.locator('#editor-settings').evaluate(el => el.open)) await page.locator('#close-settings').click();
  await page.waitForFunction(count => window.editor3d.scene.sceneryAssets.items.size === count, sampleCount);
  await page.evaluate(() => {
    Object.assign(window.editor3d.view, {x: 14.4, y: 11.3, span: 22, preset: '0'});
    window.editor3d.scene.changed();
  });
  await capture('workshop-map.png');
  const review = await page.evaluate(() => {
    let calls = 0, refusal = '';
    const disconnect = window.nautilus.connectGame({openMap() { calls++; }});
    try { window.nautilus.sendToGame(); } catch (error) { refusal = error.message; }
    finally { disconnect(); }
    const doc = window.editor3d.document, scene = window.editor3d.scene;
    return {placements: doc.map.props.length, models: scene.sceneryAssets.items.size, calls, refusal,
      validation: doc.validate(), diagnostics: scene.diagnostics};
  });
  assert.equal(review.calls, 0);
  assert.match(review.refusal, /no 1880s city prop binding/);
  assert.deepEqual(review.validation, []);
  assert.deepEqual(review.diagnostics, []);
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({status: 'pass', browser: browser.version(),
    galleryCollections: 5, phoneWidth: 390, placement, rotatedBlock: block.turned, undoRedo: true, saveReload: true,
    fileRoundtrip: true, workshopSceneryIsolation: true, review, errors, failedRequests}, null, 2) + '\n');
  console.log(JSON.stringify({status: 'pass', placements: review.placements, models: review.models, out}));
}, {owner, output, timeoutMs: 210000});
