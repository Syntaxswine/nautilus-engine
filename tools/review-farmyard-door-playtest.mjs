import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createMapDocument} from '../packages/map-core/index.js';
import {FARMYARD_PLAYTEST_PROFILE} from '../packages/adapters/farmyard/playtest/index.js';
import {doorPlaytestDocument} from '../tests/fixtures/farmyard-playtest/door-start.mjs';
import {projectRoot, withArtReview} from './art-review-browser.mjs';

const proofRoot = '/_farmyard-door-proof/';
const production = FARMYARD_PLAYTEST_PROFILE.productionCommit;
const snapshot = path.join(projectRoot, 'vendor/farmyard-playtest', production);
const manifest = JSON.parse(fs.readFileSync(path.join(snapshot, 'provenance.json'), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const dist = path.join(projectRoot, 'dist');
const bindingPath = 'examples/farmyard-door-playtest.js';
const channel = process.env.NAUTILUS_REVIEW_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
assert.equal(manifest.commit, production);
assert.equal(fs.existsSync(path.join(dist, 'vendor/farmyard-playtest')), false);
assert.equal(fs.existsSync(path.join(dist, 'tests/fixtures/farmyard-playtest')), false);
assert.deepEqual(fs.readFileSync(path.join(dist, bindingPath)), fs.readFileSync(path.join(projectRoot, bindingPath)));
const provenance = fs.readFileSync(path.join(dist, 'build-provenance.json'));
const sourceCommit = execFileSync('git', ['-c', 'core.longpaths=true', 'rev-parse', 'HEAD'], {
  cwd: projectRoot, encoding: 'utf8', windowsHide: true
}).trim();

const modules = new Map();
const served = new Set();
const refused = [];
const prefix = 'sites/tactical-animal/dist/';
for (const file of manifest.files) {
  const bytes = fs.readFileSync(path.join(snapshot, file.snapshotPath ?? file.path));
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(sha256(bytes), file.sha256, file.path);
  assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), file.gitBlob, file.path);
  if (file.path.startsWith(prefix) && file.path.endsWith('.js')) {
    modules.set(file.path.slice(prefix.length), bytes);
  }
}
const originalApp = modules.get('app.js');
const ids = [...new Set([
  ...Array.from(originalApp.toString('utf8').matchAll(/\$\('([\w-]+)'\)/g), match => match[1]),
  'stance-cycle', 'stance-icon', 'stance-label', 'movement-cycle', 'movement-icon', 'movement-label'
])];
const appExports = Buffer.from('\nexport {start as startProof, renderBattle as refreshProof};\n' +
  'export function inspectProofApp() { return {state, view}; }\n');
modules.set('app.js', Buffer.concat([originalApp, appExports]));
const testView = [
  'export class FieldView {',
  '  constructor(_element, options) { this.options = options; this.follow = true; }',
  '  setGame() { this.options.onLoading(false); }',
  '  interactionAnchor() { return {x: 0, y: 0, visible: true}; }',
  '  route() {}',
  '  dispose() { this.disposed = true; }',
  '}',
  'export function drawMinimap() {}'
].join('\n');
const hostHTML = [
  '<!doctype html><html lang="en"><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<link rel="icon" href="data:,"><title>Farmyard door proof</title>',
  '<style>body{font:14px system-ui;margin:12px;background:#18231c;color:#f5edda}h1{font-size:18px}',
  'ul{margin:8px 0 12px;padding-left:20px}button{padding:6px;margin-bottom:3px}',
  'output{display:block;margin-top:8px}dialog{max-width:88%;max-height:80%;overflow:auto}</style>',
  '<body><script>window.farmyardReady=import("./browser-host.mjs").then(module=>',
  'module.initializeFarmyardProof(' + JSON.stringify(ids) + '));</script></body></html>'
].join('');
const browserHost = fs.readFileSync(path.join(projectRoot, 'tests/fixtures/farmyard-playtest/browser-host.mjs'));
const proofFiles = new Map([
  ['host.html', hostHTML],
  ['browser-host.mjs', browserHost],
  ['field-view.js', testView],
  ['original-art.js', 'export function weaponArtwork() { return document.createElement("span"); }'],
  ['assets/ui/industrial-switches/symbols.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>']
]);
for (const name of proofFiles.keys()) assert.equal(modules.has(name), false, name);

const yard = doorPlaytestDocument(createMapDocument);
const map = structuredClone(yard.map);
delete map.edges['e:20:25'];
yard.replace(map);
assert.deepEqual(yard.validate(), []);

async function aimAt(page, center, points) {
  const positions = await page.evaluate(async ({center, points}) => {
    const {scene, view} = window.editor3d;
    Object.assign(view, {x: center[0], y: center[1], span: 18, preset: 'top', topTurn: 0});
    scene.changed();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = document.getElementById('scene').getBoundingClientRect();
    return points.map(([x, y]) => {
      const projected = scene.camera.position.clone().set(x, 0, y).project(scene.camera);
      const localX = (projected.x + 1) * rect.width / 2;
      const localY = (1 - projected.y) * rect.height / 2;
      const picked = scene.pick(localX, localY, rect.width, rect.height);
      return {x: rect.left + localX, y: rect.top + localY, picked};
    });
  }, {center, points});
  for (const [index, {picked}] of positions.entries()) {
    assert.ok(picked?.z === 0 && Math.hypot(picked.x - points[index][0], picked.y - points[index][1]) < 0.01);
  }
  return positions;
}

const timeout = 20000;
const desktop = {width: 1280, height: 900};
const narrow = {width: 390, height: 844};
await withArtReview('Built Map Workshop to Farmyard door playtest', async ({page, context, baseURL, out, browser}) => {
  page.setDefaultTimeout(timeout);
  page.on('requestfailed', request => console.error('REQUEST FAILED: ' + request.url() + ' ' + request.failure()?.errorText));
  await context.route(baseURL + proofRoot + '**', async route => {
    const name = new URL(route.request().url()).pathname.slice(proofRoot.length);
    const body = proofFiles.get(name) ?? modules.get(name);
    if (body === undefined) {
      refused.push(name);
      await route.abort();
      return;
    }
    served.add(name);
    const contentType = name.endsWith('.html') ? 'text/html' : name.endsWith('.svg') ? 'image/svg+xml' : 'text/javascript';
    await route.fulfill({status: 200, body, contentType});
  });
  await page.setViewportSize(desktop);
  await page.goto(baseURL + '/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 30000});
  const settings = page.locator('#editor-settings');
  const feedback = page.locator('#nautilus-settings-feedback');
  const send = page.locator('#playtest');
  assert.equal(await send.isDisabled(), true);
  await page.locator('#settings-button').click();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), settings.locator('label.file').click()]);
  await chooser.setFiles({name: 'farmyard-door-yard.json', mimeType: 'application/json', buffer: Buffer.from(yard.export())});
  await page.waitForFunction(() => !window.editor3d.loading &&
    window.editor3d.document.map.name === 'Farmyard door playtest');
  if (await settings.isVisible()) await page.locator('#close-settings').click();

  const snapshotEditor = () => page.evaluate(() => {
    const document = window.editor3d.document;
    return {json: document.export(), revision: document.revision, undo: document.editor.undo.length, redo: document.editor.redo.length};
  });
  assert.equal(Object.hasOwn(JSON.parse((await snapshotEditor()).json).edges, 'e:20:25'), false);
  await page.locator('#tool-palette [data-group="walls"]').click();
  if (!await page.locator('#tool-mode').isVisible()) await page.locator('#nautilus-options').click();
  await page.locator('#tool-mode').selectOption('wall');
  await page.locator('#edge-kind').selectOption('door-wood-closed');
  const [doorPoint] = await aimAt(page, [20, 25], [[20.3, 25]]);
  await page.mouse.click(doorPoint.x, doorPoint.y);
  await page.waitForFunction(() => !window.editor3d.loading &&
    window.editor3d.document.map.edges['e:20:25'] === 'door-wood-closed' &&
    document.getElementById('status').textContent === 'Edit applied.');
  const authoredDoor = await snapshotEditor();
  assert.equal(authoredDoor.undo, 1);
  await page.screenshot({path: path.join(out, 'workshop-door.png')});

  try {
    await page.evaluate(async ({proofRoot, bindingPath}) => {
      const [{bindFarmyardDoorPlaytest}, {prepareBrowserFarmyardHost}] = await Promise.all([
        import('/' + bindingPath),
        import(proofRoot + 'browser-host.mjs')
      ]);
      const proof = {prepared: 0, retired: [], firstSession: null, cleanupErrors: []};
      proof.binding = bindFarmyardDoorPlaytest(window.nautilus, input => {
        proof.prepared++;
        return prepareBrowserFarmyardHost(input, proof.retired);
      });
      proof.binding.events.addEventListener('open', ({detail: {session, cleanupError}}) => {
        if (cleanupError) proof.cleanupErrors.push(cleanupError.message);
        if (proof.binding.activeSession !== session) return;
        proof.firstSession ??= session;
        session.host.proof.present(session.markers);
        session.host.frame.hidden = false;
      });
      window.doorPlaytestProof = proof;
    }, {proofRoot, bindingPath});
    await page.locator('#settings-button').click();
    assert.equal(await send.isEnabled(), true);
    await send.click();
    await page.waitForFunction(() => document.getElementById('nautilus-settings-feedback').textContent.startsWith('Map sent'));
    const success = await feedback.innerText();
    assert.deepEqual(await snapshotEditor(), authoredDoor);
    const adoption = await page.evaluate(json => {
      const {firstSession, binding, prepared} = window.doorPlaytestProof;
      return {prepared, sameSession: binding.activeSession === firstSession, sourceMatches: firstSession.sourceJSON === json,
        markers: firstSession.markers};
    }, authoredDoor.json);
    assert.equal(adoption.prepared, 1);
    assert.equal(adoption.sameSession, true);
    assert.equal(adoption.sourceMatches, true);
    assert.deepEqual(adoption.markers.map(marker => marker.role), [
      'solo-spawn', 'retained-squad-marker', 'retained-squad-marker', 'retained-squad-marker', 'retained-travel-marker'
    ]);
    await page.locator('#close-settings').click();

    const host = page.frameLocator('iframe[title="Farmyard door proof"]');
    const inspect = () => page.evaluate(() => window.doorPlaytestProof.binding.activeSession.host.proof.inspect());
    const hand = host.locator('#interaction-hand');
    const initial = await inspect();
    assert.equal(initial.actorCount, 1);
    assert.deepEqual([initial.actor.x, initial.actor.y, initial.actor.heading], [20, 25, 270]);
    assert.deepEqual([initial.door.edge, initial.door.x, initial.door.y], ['e:20:25', 20.5, 25]);
    assert.equal(initial.authoredMapMatches, true);
    assert.deepEqual([initial.door.open, initial.walk, initial.sight], [false, false, false]);
    const markerLabels = await host.locator('#markers li').allTextContents();
    assert.deepEqual(markerLabels, [
      'Solo start · 20, 25', 'Squad marker (retained) · 19, 25', 'Squad marker (retained) · 19, 26',
      'Squad marker (retained) · 21, 25', 'Travel marker (retained) · 20, 26'
    ]);
    await host.getByRole('button', {name: 'Select door'}).click();
    await hand.click();
    const opened = await inspect();
    assert.deepEqual([opened.door.open, opened.walk, opened.sight], [true, true, true]);
    assert.equal(opened.actor.ap, initial.actor.ap);
    await page.screenshot({path: path.join(out, 'farmyard-door-open.png')});

    const combatAt = (x, y) => page.evaluate(([x, y]) =>
      window.doorPlaytestProof.binding.activeSession.host.proof.combatAt(x, y), [x, y]);
    assert.ok(await combatAt(20.5, 25) > 0);
    const occupied = await inspect();
    assert.deepEqual([occupied.actor.x, occupied.actor.y, occupied.actor.ap], [20.5, 25, 8]);
    await hand.click();
    const occupiedMessage = await host.locator('#toast').innerText();
    assert.match(occupiedMessage, /Someone is in the doorway/);
    assert.deepEqual(await inspect(), occupied);

    assert.ok(await combatAt(20, 25) > 0);
    assert.equal(await host.locator('#interaction-cost').innerText(), '1 AP');
    const beforeClose = await inspect();
    await hand.click();
    const closed = await inspect();
    assert.deepEqual([closed.door.open, closed.walk, closed.sight], [false, false, false]);
    assert.equal(beforeClose.actor.ap - closed.actor.ap, 1);
    const savedText = await page.evaluate(() => window.doorPlaytestProof.binding.activeSession.host.proof.saved());
    assert.ok(savedText?.length > 0);
    await host.getByRole('button', {name: 'Field menu'}).click();
    await host.getByRole('button', {name: 'Choose operation, animal & loadout', exact: true}).click();
    await host.locator('#resume').click();
    const resumed = await inspect();
    assert.notEqual(resumed.stateId, closed.stateId);
    assert.deepEqual(resumed.actor, closed.actor);
    assert.deepEqual(resumed.door, closed.door);
    assert.deepEqual([resumed.walk, resumed.sight, resumed.authoredMapMatches], [false, false, true]);

    // Return to authoring while keeping the same game session alive.
    await page.evaluate(() => { window.doorPlaytestProof.binding.activeSession.host.frame.hidden = true; });
    await page.locator('#tool-palette [data-group="foliage"]').click();
    if (!await page.locator('#foliage-shape').isVisible()) await page.locator('#nautilus-options').click();
    await page.locator('#foliage-shape').selectOption('rectangle');
    const [start, end] = await aimAt(page, [38.5, 37.5], [[36, 36], [41, 39]]);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, {steps: 6});
    await page.mouse.up();
    await page.waitForFunction(() => !window.editor3d.loading &&
      Object.keys(window.editor3d.document.map.foliage ?? {}).length === 24 &&
      document.getElementById('status').textContent === 'Edit applied.');
    const foliage = await snapshotEditor();
    assert.equal(foliage.undo, authoredDoor.undo + 1);
    await page.setViewportSize(narrow);
    await page.locator('#settings-button').click();
    assert.equal(await send.isEnabled(), true);
    await send.click();
    await page.waitForFunction(() =>
      document.getElementById('nautilus-settings-feedback').textContent.includes('Clear the painted foliage'));
    assert.equal(await feedback.isVisible(), true);
    const refusal = await feedback.innerText();
    assert.equal(refusal, 'Painted foliage needs a Farmyard binding (24 cells). Clear the painted foliage in the Workshop and send again.');
    assert.deepEqual(await snapshotEditor(), foliage);
    assert.deepEqual(await inspect(), resumed);
    const retention = await page.evaluate(() => {
      const {binding, firstSession, prepared, retired} = window.doorPlaytestProof;
      return {sameSession: binding.activeSession === firstSession, prepared, retired: retired.length};
    });
    assert.deepEqual(retention, {sameSession: true, prepared: 1, retired: 0});
    const layout = await settings.evaluate(element => {
      const {left, right, top, bottom} = element.getBoundingClientRect();
      return {left, right, top, bottom, pageWidth: document.documentElement.scrollWidth, width: innerWidth, height: innerHeight};
    });
    assert.ok(layout.left >= -1 && layout.right <= layout.width + 1 && layout.top >= -1 &&
      layout.bottom <= layout.height + 1 && layout.pageWidth <= layout.width + 1, JSON.stringify(layout));
    await page.screenshot({path: path.join(out, 'workshop-foliage-refusal-390.png')});

    await page.locator('#close-settings').click();
    await page.locator('#undo').click();
    await page.waitForFunction(() => !window.editor3d.loading && !Object.keys(window.editor3d.document.map.foliage ?? {}).length);
    assert.equal((await snapshotEditor()).json, authoredDoor.json);
    await page.locator('#redo').click();
    await page.waitForFunction(() => !window.editor3d.loading && Object.keys(window.editor3d.document.map.foliage ?? {}).length === 24);
    assert.equal((await snapshotEditor()).json, foliage.json);

    const detached = await page.evaluate(async () => {
      const {binding, retired, cleanupErrors} = window.doorPlaytestProof;
      const result = await binding.dispose();
      return {connected: window.nautilus.hasGameAdapter, active: !!binding.activeSession,
        retired, cleanupErrors, disposalError: result?.message ?? null};
    });
    assert.deepEqual(detached, {connected: false, active: false, retired: [true], cleanupErrors: [], disposalError: null});
    assert.equal(await page.locator('iframe[title="Farmyard door proof"]').count(), 0);
    assert.equal(await send.isDisabled(), true);
    assert.deepEqual(refused, []);
    for (const name of ['app.js', 'solo-game.js', 'interactions.js', 'mobile-controls.js', 'operation-storage.js']) {
      assert.ok(served.has(name), 'Missing production browser module ' + name);
    }
    fs.writeFileSync(path.join(out, 'browser-report.json'), JSON.stringify({
      sourceCommit, buildSha256: sha256(provenance), bindingSha256: sha256(fs.readFileSync(path.join(dist, bindingPath))),
      reviewDriverSha256: sha256(fs.readFileSync(new URL(import.meta.url))), browserHostSha256: sha256(browserHost),
      browser: {channel, version: browser.version(), desktop, narrow},
      production: {commit: production, filesVerified: manifest.files.length, appSha256: sha256(originalApp),
        instrumentation: 'Only appended start, refresh and inspection exports to the original application module.',
        view: 'Lightweight iframe view, artwork placeholders and real DOM controls. Explicit Core.travel and phase setup, no 3D Farmyard renderer or frame-driven movement.',
        requested: [...served].sort(), refused},
      workshop: {imported: true, door: 'e:20:25', doorTool: 'Walls / Wall with closed wood door', success,
        sentSourceSha256: sha256(authoredDoor.json), markers: adoption.markers, markerLabels,
        foliageCells: 24, refusal, layout, historyPreserved: true, undoRedoRoundTrip: true},
      farmyard: {initial, opened, occupied, occupiedMessage, closed, resumed,
        nativeSaveSha256: sha256(savedText), sameHostAfterRefusal: true, prepared: retention.prepared, detached}
    }, null, 2) + '\n');
  } finally {
    await page.evaluate(() => window.doorPlaytestProof?.binding.dispose()).catch(() => {});
  }
}, {output: 'farmyard-door-playtest-editor', timeoutMs: 240000});
