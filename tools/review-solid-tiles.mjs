import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';
import {SOLID_TILE_SKINS, SOLID_TILE_FEATURE} from '../packages/map-core/index.js';

const output = 'solid-tile-review';
await withArtReview('Solid block placement and save in the built Nautilus Map Workshop', async ({page, baseURL, out, browser}) => {
  page.on('dialog', dialog => dialog.accept());
  page.setDefaultTimeout(20000);
  await page.setViewportSize({width: 1440, height: 960});
  await page.goto(baseURL + '/');
  await page.waitForFunction(() => window.editor3d?.scene.solidTiles && !window.editor3d.loading);
  await page.evaluate(async () => {
    const {blankMap} = await import('/packages/map-core/index.js');
    await window.nautilus.open(blankMap('Solid block review'));
    Object.assign(window.editor3d.view, {x: 11, y: 11.5, span: 8, preset: '0'});
    window.editor3d.scene.changed();
  });
  await page.locator('[data-group="land"]').click();
  await page.locator('#tool-mode').selectOption('solid-block');
  assert.deepEqual(await page.locator('#ground-kind option').evaluateAll(options => options.map(o => o.value)), SOLID_TILE_SKINS);
  assert.deepEqual(await page.locator('#solid-steps option').evaluateAll(options => options.map(o => o.textContent)),
    ['1/8 · 0.265 m', '2/8 · 0.530 m', '3/8 · 0.795 m', '4/8 · 1.060 m', '5/8 · 1.325 m', '6/8 · 1.590 m', '7/8 · 1.855 m', '8/8 · 2.120 m']);

  const spot = async (x, y, h = 0) => page.evaluate(async ({x, y, h}) => {
    const T = await import('/packages/render-effects/three.js');
    const camera = window.editor3d.scene.camera, rect = document.getElementById('scene').getBoundingClientRect();
    const v = new T.Vector3(x, h, y).project(camera);
    return [rect.left + (v.x + 1) * rect.width / 2, rect.top + (1 - v.y) * rect.height / 2];
  }, {x, y, h});
  const portable = () => page.evaluate(() => window.nautilus.export());
  const visible = () => page.evaluate(() => {
    const scene = window.editor3d.scene, parts = [];
    for (const mesh of scene.solidTiles.children) {
      const surface = mesh.geometry === scene.solidTop ? 'top' : 'side';
      for (let i = 0; i < mesh.count; i++) {
        const matrix = mesh.instanceMatrix.array.subarray(i * 16, i * 16 + 16);
        parts.push({surface, material: mesh.material.name, matrix: Array.from(matrix)});
      }
    }
    return parts.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  });
  const place = async ({x, y, height, skin}, screenshot) => {
    await page.locator('#solid-steps').selectOption(String(height));
    await page.locator('#ground-kind').selectOption(skin);
    const before = await portable();
    const coordinates = await spot(x, y);
    await page.mouse.move(...coordinates);
    await page.waitForFunction(({x, y, height, skin}) => {
      const candidate = window.editor3d.scene.solidPreview?.map?.solidTiles?.cells[`${x},${y}`];
      return candidate?.[0] === height && candidate[1] === skin;
    }, {x, y, height, skin});
    assert.equal(await portable(), before, 'The preview must leave the committed map unchanged.');
    if (screenshot) await page.screenshot({path: path.join(out, screenshot)});
    await page.mouse.click(...coordinates);
    await page.waitForFunction(({x, y, height, skin}) => {
      const {document, loading, scene} = window.editor3d, cell = document.map.solidTiles?.cells[`${x},${y}`];
      return !loading && !scene.solidPreview && cell?.[0] === height && cell[1] === skin;
    }, {x, y, height, skin});
  };
  await place({x: 10, y: 11, height: 1, skin: 'road-diagonal-concrete-nw-border'});
  await place({x: 11, y: 11, height: 2, skin: 'ground-biome-snow'});
  await page.waitForFunction(() => window.editor3d.scene.solidTiles.children.some(mesh => mesh.material.name.startsWith('ground:snow:')));
  await place({x: 13, y: 9, height: 8, skin: 'ground-wood-planks'}, 'solid-preview.png');
  const completed = await portable(), sceneBefore = await visible();
  assert.equal(sceneBefore.filter(p => p.surface === 'top').length, 3);
  assert.equal(sceneBefore.filter(p => p.surface === 'side').length, 11);
  const paintProof = await page.evaluate(async () => {
    const T = await import('/packages/render-effects/three.js');
    const {createSolidTileMaterial} = await import('/app/solid-tile-paint.js');
    const workshop = window.editor3d.scene, renderer = workshop.renderer, tops = [], sides = [];
    for (const mesh of workshop.solidTiles.children) {
      const top = mesh.geometry === workshop.solidTop;
      for (let i = 0; i < mesh.count; i++) {
        const m = mesh.instanceMatrix.array.subarray(i * 16, i * 16 + 16);
        (top ? tops : sides).push({x: m[12], z: m[14], h: m[13] + (top ? 0 : Math.hypot(m[4], m[5], m[6]) / 2), material: mesh.material});
      }
    }
    const matchedSides = sides.filter(side => tops.some(top => Math.abs(side.h - top.h) < 1e-6 &&
      Math.abs(side.x - top.x) + Math.abs(side.z - top.z) === .5 && side.material === top.material && !!top.material.map)).length;

    // Read real WebGL texels from a full-height face. Distinct source rows
    // reveal a stretched, restarted, reversed or one-axis-only projection.
    const data = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < 256; i++) data.set([32 + 12 * Math.floor(i / 16), 0, 0, 255], i * 4);
    const atlas = new T.DataTexture(data, 16, 16);
    atlas.wrapS = atlas.wrapT = T.RepeatWrapping;
    atlas.needsUpdate = true;
    const nativePaint = new T.MeshBasicMaterial({map: atlas, toneMapped: false});
    const wrappedPaint = createSolidTileMaterial(nativePaint);
    const topGeometry = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const sideGeometry = new T.PlaneGeometry(1, 1);
    const top = new T.InstancedMesh(topGeometry, wrappedPaint, 1);
    const side = new T.InstancedMesh(sideGeometry, wrappedPaint, 1);
    top.setMatrixAt(0, new T.Matrix4().makeTranslation(0, 2.12, 0));
    side.setMatrixAt(0, new T.Matrix4().makeScale(1, 2.12, 1).setPosition(0, 1.06, .5));
    const front = new T.OrthographicCamera(-.5, .5, 2.12, 0, .1, 10);
    front.position.set(0, 0, 5); front.lookAt(0, 0, 0);
    const overhead = new T.OrthographicCamera(-.5, .5, .5, -.5, .1, 10);
    overhead.position.set(0, 5, 0); overhead.up.set(0, 0, -1); overhead.lookAt(0, 2.12, 0);
    const scene = new T.Scene(), prior = renderer.getRenderTarget(), target = new T.WebGLRenderTarget(32, 256);
    const rgba = new Uint8Array(4);
    const readRed = y => { renderer.readRenderTargetPixels(target, 20, y, 1, 1, rgba); return rgba[0]; };
    try {
      renderer.setRenderTarget(target);
      scene.add(side); renderer.clear(); renderer.render(scene, front);
      const sideRed = [.02, .26, .73, 1.27, 1.74, 2.02].map(depth => readRed(Math.floor((2.12 - depth) / 2.12 * 256)));
      scene.remove(side); scene.add(top); renderer.clear(); renderer.render(scene, overhead);
      return {matchedSides, sideRed, topEdgeRed: readRed(0)};
    } finally {
      renderer.setRenderTarget(prior);
      top.dispose(); side.dispose(); topGeometry.dispose(); sideGeometry.dispose();
      atlas.dispose(); nativePaint.dispose(); wrappedPaint.dispose(); target.dispose();
      workshop.changed();
    }
  });
  assert.deepEqual(paintProof, {matchedSides: 11, sideRed: [116, 68, 176, 176, 68, 116], topEdgeRed: 116});
  await page.locator('#undo').click();
  await page.waitForFunction(() => !window.editor3d.loading && !window.editor3d.document.map.solidTiles?.cells['13,9']);
  await page.locator('#redo').click();
  await page.waitForFunction(() => !window.editor3d.loading && !!window.editor3d.document.map.solidTiles?.cells['13,9']);
  assert.equal(await portable(), completed);

  // Inspect the top of the 2.12 m column where a ground-plane pick would miss.
  await page.locator('[data-group="inspect"]').click();
  await page.mouse.click(...await spot(13, 9, 2.12));
  await page.waitForFunction(() => document.getElementById('selected').textContent.includes('Solid block · 8/8'));

  await page.locator('#settings-button').click();
  await page.locator('#save-map').click();
  await page.waitForFunction(() => document.getElementById('nautilus-settings-feedback')?.textContent.includes('Saved in this browser'));
  const id = await page.locator('#saved-designs').inputValue();
  assert.ok(id);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
  const filename = path.join(out, 'solid-tiles-roundtrip.json');
  await download.saveAs(filename);
  assert.equal(fs.readFileSync(filename, 'utf8'), completed);
  await page.locator('#close-settings').click();
  await page.locator('#delete-selected').click();
  await page.waitForFunction(() => !window.editor3d.loading && !window.editor3d.document.map.solidTiles?.cells['13,9']);
  await page.locator('#settings-button').click();
  await page.locator('#saved-designs').selectOption(id);
  await page.locator('#load-map').click();
  await page.waitForFunction(() => !window.editor3d.loading && !!window.editor3d.document.map.solidTiles?.cells['13,9']);
  assert.equal(await portable(), completed, 'The named save changed exported bytes.');

  await page.evaluate(async () => {
    const {blankMap} = await import('/packages/map-core/index.js');
    await window.nautilus.open(blankMap('Empty before file import'));
  });
  if (!await page.locator('#editor-settings').evaluate(el => el.open)) await page.locator('#settings-button').click();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('label.file').click()]);
  await chooser.setFiles(filename);
  await page.waitForFunction(() => !window.editor3d.loading && !!window.editor3d.document.map.solidTiles?.cells['13,9']);
  assert.equal(await portable(), completed, 'File import changed exported bytes.');
  assert.deepEqual(await visible(), sceneBefore, 'Reload changed actual scene transforms or material identity.');
  if (await page.locator('#editor-settings').evaluate(el => el.open)) await page.locator('#close-settings').click();
  await page.evaluate(() => {
    Object.assign(window.editor3d.view, {x: 11.5, y: 10.5, span: 7, preset: '0'});
    window.editor3d.scene.changed();
  });
  await page.locator('[data-group="land"]').click();
  await page.locator('#tool-mode').selectOption('solid-block');
  await page.screenshot({path: path.join(out, 'solid-tiles-desktop.png')});
  await page.setViewportSize({width: 390, height: 844});
  await page.locator('#nautilus-options').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({path: path.join(out, 'solid-tiles-phone.png')});
  const requirements = await page.evaluate(async () => {
    const {blueprintRequirements} = await import('/packages/map-core/index.js');
    return blueprintRequirements(JSON.parse(window.nautilus.export())).required.map(feature => feature.id);
  });
  assert.ok(requirements.includes(SOLID_TILE_FEATURE));
  const report = {browser: browser.version(), palette: SOLID_TILE_SKINS.length, committed: JSON.parse(completed).solidTiles,
    namedSave: true, fileImport: true, previewNonmutating: true, undoRedo: true, raisedPicking: true, sceneParity: true,
    topFaces: 3, sideFaces: 11, paintProof, requirements};
  fs.writeFileSync(path.join(out, 'acceptance.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}, {owner: 'nautilus-solid-tile-builder', output, timeoutMs: 150000});
