import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview, projectRoot as root} from './art-review-browser.mjs';
import {packProfile} from './distribution.mjs';
import {packFirearmFeedback, packageName, rendererEntry, rendererName, peerBridge, runNpm} from './pack-firearm-feedback.mjs';

const output = 'firearm-feedback-installed', artifacts = path.join(root, 'artifacts');
const out = path.join(artifacts, output);
fs.mkdirSync(out, {recursive: true});
const stage = fs.mkdtempSync(path.join(artifacts, 'firearm-feedback-stage-'));
const entry = 'examples/firearm-feedback.html';
const prefix = '/artifacts/' + path.basename(stage) + '/';
const firearmPrefix = 'node_modules/' + packageName + '/';
const rendererPrefix = 'node_modules/' + rendererName + '/';
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const node = (args, cwd) => execFileSync(process.execPath, args, {
  cwd, windowsHide: true, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024
});
process.env.npm_config_cache = path.join(stage, 'npm-cache');
let report;

try {
  const rendererArchive = packProfile('renderer'), archive = packFirearmFeedback();
  fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({name: 'installed-firearm-proof', private: true, type: 'module'}));
  runNpm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', rendererArchive.file, archive.file], stage);
  const packageRoot = path.join(stage, firearmPrefix), rendererRoot = path.join(stage, rendererPrefix);
  const installed = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json')));
  const renderer = JSON.parse(fs.readFileSync(path.join(rendererRoot, 'package.json')));
  const actual = installed.exports['.'].slice(2), sharedThree = renderer.exports['./render-effects/three'].slice(2);
  assert.equal(installed.name, packageName);
  assert.equal(actual, 'three.js');
  assert.equal(renderer.name, rendererName);
  assert.equal(renderer.version, rendererArchive.version);
  assert.equal(installed.peerDependencies[rendererName], '^0.10.0');
  assert.ok(!fs.lstatSync(packageRoot).isSymbolicLink());
  assert.ok(!fs.lstatSync(rendererRoot).isSymbolicLink());
  assert.ok(installed.files.every(file => !/\.(?:wav|mp3|ogg|flac)$/i.test(file) && !file.includes('/')));
  const source = JSON.parse(fs.readFileSync(path.join(packageRoot, 'source.json')));
  const notice = source.files.find(file => file.path.endsWith('/THREE-LICENSE.txt'));
  const installedHashes = Object.fromEntries(archive.files.map(file => [file, sha(path.join(packageRoot, file))]));
  assert.equal(installedHashes['THREE-LICENSE.txt'], notice.sha256);
  assert.equal(fs.readFileSync(path.join(packageRoot, 'shared-three.js'), 'utf8'), peerBridge);
  for (const file of installed.files.filter(file => !['THREE-LICENSE.txt', 'shared-three.js'].includes(file))) {
    assert.equal(installedHashes[file], sha(path.join(root, 'packages/firearm-feedback', file)), file);
  }
  const nodeProof = node(['--input-type=module', '-e',
    `import {createFirearmFeedback} from '${packageName}'; import {Vector3} from '${rendererEntry}';
     const entry = import.meta.resolve('${packageName}'), shared = await import(new URL('shared-three.js', entry));
     console.log(JSON.stringify({entry, sequence:createFirearmFeedback().sequence, sameThree:shared.Vector3 === Vector3}));`], stage);
  const resolved = JSON.parse(nodeProof);
  assert.equal(resolved.sequence, 0);
  assert.equal(resolved.sameThree, true);
  assert.ok(resolved.entry.endsWith('/' + firearmPrefix + actual));

  // Only fixture import paths are rebased. The real public entries and every
  // Three dependency resolve from the two physically installed tarballs.
  const aft = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json'))).aft.root;
  const tactics = aft + '/dist/tactics/';
  const weaponModel = tactics + 'weapon-models.js', weaponFixture = 'fixtures/weapon-models.js';
  const oneHanded = tactics + 'one-handed.js', handFixture = 'fixtures/one-handed.js';
  const originalWeaponModel = path.join(root, weaponModel);
  const aftSource = JSON.parse(fs.readFileSync(path.join(root, aft, 'provenance.json')));
  for (const input of [weaponModel, oneHanded]) {
    assert.equal(sha(path.join(root, input)), aftSource.files.find(file => aft + '/' + file.path === input).sha256);
  }
  for (const file of ['horse-10k-data.json', 'horse-light-model.js', 'grenade-model.js', 'horse-rifle.js', 'vendor/three.module.js']) {
    assert.ok(renderer.files.includes(tactics + file), 'Renderer peer is missing the native reference input ' + file);
  }
  const redirect = (text, from, to) => {
    assert.ok(text.includes(from), 'Reference import path drift: ' + from);
    return text.replaceAll(from, to);
  };
  const fixturePaths = [entry, 'examples/firearm-feedback.js', 'examples/firearm-feedback-rig.js'];
  fs.mkdirSync(path.join(stage, 'examples'));
  fs.mkdirSync(path.join(stage, 'fixtures'));
  const html = fs.readFileSync(path.join(root, entry), 'utf8');
  fs.writeFileSync(path.join(stage, entry), redirect(redirect(html,
    '../packages/firearm-feedback/three.js', prefix + firearmPrefix + actual),
    '../packages/render-effects/three.js', prefix + rendererPrefix + sharedThree));
  fs.copyFileSync(path.join(root, fixturePaths[1]), path.join(stage, fixturePaths[1]));
  const rig = fs.readFileSync(path.join(root, fixturePaths[2]), 'utf8');
  fs.writeFileSync(path.join(stage, fixturePaths[2]), redirect(redirect(redirect(redirect(rig,
    '../packages/firearm-feedback/rig.js', prefix + firearmPrefix + 'rig.js'),
    '../packages/render-effects/three.js', prefix + rendererPrefix + sharedThree),
    '../' + weaponModel, prefix + weaponFixture),
    '../' + tactics, prefix + rendererPrefix + tactics));
  const weaponSource = redirect(fs.readFileSync(originalWeaponModel, 'utf8'), "./one-handed.js", prefix + handFixture);
  fs.writeFileSync(path.join(stage, weaponFixture), redirect(weaponSource, " from './", " from '" + prefix + rendererPrefix + tactics));
  fs.copyFileSync(path.join(root, oneHanded), path.join(stage, handFixture));
  const sourceInputs = Object.fromEntries([...fixturePaths, weaponModel, oneHanded, 'tools/review-firearm-feedback.mjs', 'tools/pack-firearm-feedback.mjs']
    .map(file => [file, sha(path.join(root, file))]));

  report = await withArtReview('Installed Farmyard firearm feedback desktop and phone proof', async ({
    page, browser, baseURL, errors, failedRequests
  }) => {
    const requests = new Set();
    async function open(reviewPage) {
      await reviewPage.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== baseURL || !url.pathname.startsWith(prefix)) {
          errors.push('Reference request outside the installed renderer: ' + url.href);
          return route.abort();
        }
        requests.add(url.pathname.slice(prefix.length));
        return route.continue();
      });
      await reviewPage.goto(baseURL + prefix + entry);
      await reviewPage.waitForFunction(() => !document.querySelector('#controls').disabled);
    }
    const phase = (reviewPage, name) => reviewPage.waitForFunction(
      value => document.querySelector('#scene').dataset.phase === value, name
    );
    const fit = reviewPage => reviewPage.locator('#scene').evaluate(canvas => ({
      phase: canvas.dataset.phase, supported: canvas.dataset.supported, boreHeight: Number(canvas.dataset.boreHeight)
    }));
    const desktop = {width: 1280, height: 900};
    await page.setViewportSize(desktop);
    await open(page);
    await page.locator('#aim').click();
    await phase(page, 'aim');
    const rifle = await fit(page);
    assert.equal(rifle.supported, 'true');
    await page.locator('#burst').click();
    await page.waitForFunction(() => document.querySelector('#status').value === 'Round 3 · miss · ak47-shot');
    assert.equal(await page.locator('#scene').getAttribute('data-cue-count'), '3');
    assert.equal(await page.locator('#scene').getAttribute('data-pose-round'), '3');
    await phase(page, 'aim');
    await page.screenshot({path: path.join(out, 'standing-assault.png')});
    await page.locator('#stance').selectOption('prone');
    await page.locator('#weapon').selectOption('pistol');
    await phase(page, 'aim');
    const pistol = await fit(page);
    assert.equal(pistol.supported, 'true');
    await page.locator('#single').click();
    await page.waitForFunction(() => document.querySelector('#status').value === 'Round 4 · miss · tt33');
    assert.equal(await page.locator('#scene').getAttribute('data-cue-count'), '4');
    assert.equal(await page.locator('#scene').getAttribute('data-pose-round'), '4');
    await phase(page, 'aim');
    await page.screenshot({path: path.join(out, 'prone-pistol.png')});

    // Exercise the actual browser audio graph separately from autoplay and
    // speaker state. The first nonzero samples witness both exact start times.
    const offline = await page.evaluate(async modulePath => {
      const {createFirearmAudio, createFirearmFeedback} = await import(modulePath);
      const sampleRate = 16000, context = new OfflineAudioContext(1, sampleRate, sampleRate);
      const clip = context.createBuffer(1, 32, sampleRate);
      clip.getChannelData(0).fill(.5);
      const audio = createFirearmAudio({context, getClip: () => clip});
      const feedback = createFirearmFeedback({playCue: audio.playCue});
      const round = {sequence: 1, actorId: 'offline', weapon: 'shotgun', at: 0,
        origin: {x: 0, y: 0, h: 1}, target: {x: 3, y: 0, h: 1}};
      const accepted = feedback.commitRound(round);
      const replay = feedback.commitRound(round);
      const samples = (await context.startRendering()).getChannelData(0);
      const starts = [];
      for (let i = 0; i < samples.length; i++) {
        if (samples[i] > .01 && !(samples[i - 1] > .01)) starts.push(i);
      }
      feedback.dispose();
      audio.dispose();
      return {starts, sampleRate, statuses: accepted.cues.map(cue => cue.status), replay: replay.status};
    }, prefix + firearmPrefix + actual);
    assert.deepEqual(offline, {starts: [0, 5600], sampleRate: 16000, statuses: ['delivered', 'delivered'], replay: 'stale'});

    const phone = {width: 390, height: 844};
    const mobileContext = await browser.newContext({viewport: phone, isMobile: true, hasTouch: true, deviceScaleFactor: 1});
    try {
      const mobile = await mobileContext.newPage();
      mobile.on('pageerror', error => errors.push(error.message));
      mobile.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      mobile.on('response', response => { if (response.status() >= 400) failedRequests.push(response.url()); });
      await open(mobile);
      await mobile.locator('#stance').selectOption('kneel');
      await mobile.locator('#weapon').selectOption('shotgun');
      await mobile.locator('#aim').tap();
      await phase(mobile, 'aim');
      assert.equal((await fit(mobile)).supported, 'true');
      await mobile.locator('#single').tap();
      await mobile.waitForFunction(() => document.querySelector('#status').value === 'Round 1 · miss · shotgun-fire + shotgun-pump');
      assert.equal(await mobile.locator('#scene').getAttribute('data-cue-count'), '2');
      assert.equal(await mobile.locator('#scene').getAttribute('data-pose-round'), '1');
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), phone.width);
      await phase(mobile, 'aim');
      await mobile.screenshot({path: path.join(out, 'kneeling-shotgun-phone.png')});
    } finally {
      await mobileContext.close();
    }
    assert.ok(requests.has(firearmPrefix + actual));
    assert.ok(requests.has(rendererPrefix + sharedThree));
    assert.equal([...requests].filter(file => file.endsWith('/three.module.js')).length, 1);
    return {
      status: 'pass', entry: packageName, version: archive.version, archiveSha256: sha(archive.file),
      rendererPeer: {entry: rendererEntry, version: renderer.version, archiveSha256: sha(rendererArchive.file), sameThree: resolved.sameThree},
      installedRequests: [...requests].sort(), installedHashes, sourceInputs, donorCommit: source.commit,
      browser: browser.version(), node: process.version, desktop, phone,
      practice: {assaultBurstMisses: 3, pistolMisses: 1, shotgunMisses: 1, rifle, pistol},
      offline, captures: ['standing-assault.png', 'prone-pistol.png', 'kneeling-shotgun-phone.png']
    };
  }, {source: true, owner: process.env.CODEX_THREAD_ID ?? 'nautilus-firearm-feedback', output, timeoutMs: 90000});
} finally {
  const target = fs.realpathSync(stage);
  if (path.dirname(target) !== fs.realpathSync(artifacts) || !path.basename(target).startsWith('firearm-feedback-stage-')) {
    throw Error('Unsafe temporary firearm consumer cleanup target.');
  }
  fs.rmSync(target, {recursive: true, force: true});
  assert.ok(!fs.existsSync(target));
}

const receipt = JSON.parse(fs.readFileSync(path.join(out, 'cleanup-receipt.json')));
assert.equal(receipt.httpClosed, true);
assert.equal(receipt.browserClosed, true);
report.cleanup = {installationRemoved: true, httpClosed: receipt.httpClosed, browserClosed: receipt.browserClosed};
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({status: report.status, package: report.entry, offline: report.offline, evidence: out, cleanup: report.cleanup}));
