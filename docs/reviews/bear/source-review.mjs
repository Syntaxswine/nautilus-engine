import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {withArtReview, projectRoot} from '../../../tools/art-review-browser.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const captures = [], checks = [];
const output = 'bear-source-review';
const detailsOnly = process.argv.includes('--details-only');
const cuffsOnly = process.argv.includes('--cuffs-only');
const previous = detailsOnly || cuffsOnly ? JSON.parse(fs.readFileSync(path.join(directory, 'source-browser-review.json'))) : null;
await withArtReview('Independent pinned bear paintings, equipment and native-scale reference', async ({page, baseURL, errors, failedRequests}) => {
  await page.goto(baseURL + '/art/bear-review/source-viewer.html');
  await page.waitForFunction(() => window.bearReference?.ready, null, {timeout: 60000});
  if (process.argv.includes('--smoke-only')) {
    const state = await page.evaluate(() => window.bearReference.set({weapon:'rpg',pose:'carry'}));
    assert.ok(state.nativeScale.every(scale => JSON.stringify(scale) === '[1,1,1]'));
    await page.evaluate(() => window.bearReference.dispose());
    assert.deepEqual(errors, []); assert.deepEqual(failedRequests, []);
    console.log('Moved source-only bench loads both outfits and native RPG carry.');
    return;
  }
  const shot = async (name, values) => {
    const state = await page.evaluate(values => window.bearReference.set(values), values);
    assert.ok(state.nativeScale.every(scale => JSON.stringify(scale) === '[1,1,1]'));
    await page.screenshot({path: path.join(directory, name + '.jpg'), type: 'jpeg', quality: 85});
    captures.push(name + '.jpg'); checks.push({capture: name + '.jpg', ...state});
    console.log('Captured ' + name);
  };
  if (!detailsOnly && !cuffsOnly) {
  await shot('source-turnaround-painted', {pose: 'neutral', weapon: 'hands', turnaround: true});
  await shot('source-turnaround-grey', {grey: true});
  const weapons = ['hands', 'knife', 'pistol', 'rifle', 'assault', 'smg', 'hmg', 'shotgun', 'sniper', 'grenade', 'launcher', 'rpg', 'flamethrower'];
  for (const weapon of weapons) await shot('source-carry-' + weapon, {weapon, pose: 'carry', turnaround: false, grey: false, view: 'three', time: 0});
  for (const weapon of ['rifle', 'hmg', 'rpg', 'flamethrower']) {
    for (const pose of ['kneel', 'prone', 'idle']) await shot('source-' + pose + '-' + weapon, {weapon, pose, time: pose === 'idle' ? 4.2 : 0, view: 'three'});
  }
  for (const time of [0, .25, .5, .75]) await shot('source-crawl-hmg-' + String(time).replace('.', '-'), {weapon: 'hmg', pose: 'crawl', time, view: 'side'});
  for (const time of [.1, .3, .5]) await shot('source-walk-rifle-' + String(time).replace('.', '-'), {weapon: 'rifle', pose: 'walk', time, view: 'three'});
  for (const time of [3.8, 4.5, 5.3]) await shot('source-aim-rifle-' + String(time).replace('.', '-'), {weapon: 'rifle', pose: 'aim-fire', time, view: 'three'});
  }
  if (!cuffsOnly) {
  for (const time of [6.15, 6.62, 8.2]) await shot('source-aim-rifle-' + String(time).replace('.', '-'), {weapon: 'rifle', pose: 'aim-fire', time, view: 'three'});
  await shot('source-detail-face-cap', {weapon: 'hands', pose: 'neutral', time: 0, view: 'front', metres: .63, focus: [.03, 1.48, 0]});
  await shot('source-detail-tail', {metres: .46, focus: [-.22, .85, 0], view: 'back'});
  await shot('source-detail-hmg-contacts', {weapon: 'hmg', pose: 'carry', metres: .68, focus: [.3, 1.02, 0], view: 'three'});
  }
  await shot('source-detail-cuffs', {weapon: 'hands', pose: 'neutral', time: 0, metres: .56, focus: [.025, 1.02, .39], view: 'front'});
  await page.evaluate(() => window.bearReference.dispose());
  assert.deepEqual(errors, []); assert.deepEqual(failedRequests, []);
  fs.writeFileSync(path.join(directory, 'source-browser-review.json'), JSON.stringify({
    schemaVersion: 1, sourceCommit: '4f5f53917990ec03b2f14c65f067e4b99ec8fcaa',
    engineBaseline: '8c4670450cb2b38c1e1abd811d633c22de9e2b7c',
    role: 'Independent pinned donor reference, not integrated Nautilus acceptance',
    browser: await page.context().browser().version(), runtime: process.version,
    rendering: 'One source Three r180 namespace in an isolated bench. Software WebGL; draw counts are not device timing.',
    viewport: page.viewportSize(), captures: [...new Set([...(previous?.captures ?? []), ...captures])], checks: [...new Map([...(previous?.checks ?? []), ...checks].map(check => [check.capture, check])).values()], errors, failedRequests,
    pending: ['Fixed provider/editor checkpoint', 'Paired installed-provider comparison', 'Traversal/casualty/fire/chair/speaking coverage at the declared provider boundary', 'Real gameplay clearance']
  }, null, 2) + '\n');
}, {source: true, owner: '01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3', output, timeoutMs: 300000});
console.log(JSON.stringify({captures: captures.length, helperReceipts: path.join(projectRoot, 'artifacts', output)}));
