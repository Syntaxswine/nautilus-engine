import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DESIGNS, compileBuilding} from '../packages/building-catalog/index.js';
import {withArtReview} from './art-review-browser.mjs';

await withArtReview('Original building catalogue visual and interaction review', async ({page, context, baseURL, out, browser, errors, failedRequests}) => {
  fs.mkdirSync(path.join(out, 'previews'), {recursive: true});
  await page.goto(baseURL + '/buildings/index.html', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.buildingReview?.ready);
  const records = [], plans = [];
  for (const design of DESIGNS) {
    const stats = await page.evaluate(id => window.buildingReview.set({id, lod: 'game', finish: 'painted', view: 'exterior', azimuth: 225, elevation: 30}), design.id);
    if (!Number.isFinite(stats.triangles) || stats.triangles < 100 || stats.bounds.min.some(n => !Number.isFinite(n))) throw Error('Invalid visible model: ' + design.id);
    await page.locator('.stage').screenshot({path: path.join(out, 'previews', design.id + '.png')});
    records.push(stats);
  }
  for (const design of DESIGNS) {
    const building = compileBuilding(design);
    for (const floor of building.floors) {
      await page.evaluate(({id, floor}) => window.buildingReview.set({id, view: 'plan', floor}), {id: design.id, floor: floor.level});
      const svg = page.locator('#plan svg');
      if (!await svg.isVisible() || !(await svg.textContent()).includes('Floor ' + (floor.level + 1))) throw Error('Missing floor plan: ' + design.id);
      const text = await svg.textContent();
      for (const room of floor.rooms) if (!text.includes(room.name)) throw Error('Missing room label: ' + design.id + '/' + room.id);
      plans.push({id: design.id, level: floor.level, rooms: floor.rooms.length});
    }
  }
  const inspection = ['bramble-ranch', 'juniper-suite', 'violet-bay-house', 'greywell-chapel', 'northlight-works', 'red-crest-barn', 'marlow-courtyard-flats', 'millrace-workhouse'];
  for (const id of inspection) {
    await page.evaluate(id => window.buildingReview.set({id, view: 'exterior', azimuth: 45, elevation: 30, ppu: 58}), id);
    await page.locator('.stage').screenshot({path: path.join(out, id + '-native-back.png')});
    await page.evaluate(() => window.buildingReview.set({view: 'cutaway', floor: 0, azimuth: 35, elevation: 65}));
    await page.locator('.stage').screenshot({path: path.join(out, id + '-cutaway.png')});
  }
  await page.evaluate(() => window.buildingReview.set({id: 'violet-bay-house', lod: 'authoring', finish: 'grey', view: 'exterior', azimuth: 225, elevation: 35, ppu: 42}));
  await page.locator('.stage').screenshot({path: path.join(out, 'source-grey.png')});
  await page.evaluate(() => window.buildingReview.set({lod: 'game'}));
  await page.locator('.stage').screenshot({path: path.join(out, 'game-grey.png')});
  await page.evaluate(() => window.buildingReview.set({id: 'rowan-family', lod: 'game', finish: 'painted', view: 'plan', floor: 1}));
  await page.locator('.stage').screenshot({path: path.join(out, 'floor-plan.png')});
  await page.locator('#doors').click();
  if (await page.locator('#doors').getAttribute('aria-pressed') !== 'true') throw Error('Door control did not update.');
  await page.locator('#view').selectOption('exterior');
  await page.locator('#opposite').click();
  await page.locator('#fit').click();
  await page.locator('.stage').screenshot({path: path.join(out, 'open-doors.png')});
  for (const extension of ['gltf', 'bin', 'blueprint.json']) {
    const download = await context.request.get(baseURL + '/assets/buildings/models/bramble-ranch.' + extension);
    if (!download.ok()) throw Error('Model download failed: ' + extension);
  }
  await page.setViewportSize({width: 390, height: 844});
  await page.locator('#search').fill('barn');
  await page.locator('#fit').click();
  if (await page.locator('#catalogue button').count() < 1) throw Error('Mobile search found no barn.');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw Error('Mobile library has horizontal overflow.');
  await page.screenshot({path: path.join(out, 'mobile.png'), fullPage: true});
  await page.setViewportSize({width: 1536, height: 1920});
  const sheet = await page.evaluate(() => window.buildingReview.sheet());
  if (sheet.ids.length !== 48 || new Set(sheet.ids).size !== 48) throw Error('Incomplete catalogue sheet.');
  await page.screenshot({path: path.join(out, 'catalogue-sheet.png'), fullPage: true});
  const captures = fs.readdirSync(out).filter(n => n.endsWith('.png')).map(file => ({file, sha256: createHash('sha256').update(fs.readFileSync(path.join(out, file))).digest('hex')}));
  fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify({browser: browser.version(), renderer: 'Software WebGL for correctness; no frame-time benchmark', models: records, floorPlans: plans, sourceGameComparison: 'violet-bay-house at matched 42 px/m camera', desktop: {width: 1600, height: 1100}, mobile: {width: 390, height: 844, horizontalOverflow: false}, modelDownloads: true, errors, failedRequests, captures}, null, 2));
  console.log(JSON.stringify({models: records.length, floorPlans: plans.length, captures: captures.length, mobileOverflow: false, errors, failedRequests}));
});
