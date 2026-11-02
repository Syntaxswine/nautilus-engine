import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {render, decodeWav} from '../modules/audio/index.js';
import {BABBLE_ROOT} from './check-babble-lab.mjs';
import {withArtReview} from './art-review-browser.mjs';

const source = process.argv.includes('--source'), mode = source ? 'source' : 'built', prefix = source ? '' : '/artifacts/audio-dist';
const checks = [];
await withArtReview('Babble Lab sound intake: original workbench and public Web Audio', async ({page, baseURL, out}) => {
  page.setDefaultTimeout(15000);
  // The original pages have no favicon. Keep browser chrome from requesting a
  // nonexistent /favicon.ico; all real application requests remain checked.
  await page.addInitScript(() => {
    const install = () => {const icon = document.createElement('link'); icon.rel = 'icon'; icon.href = 'data:,'; document.head.append(icon);};
    if (document.head) install(); else document.addEventListener('DOMContentLoaded', install, {once: true});
  });
  page.on('console', message => {if (message.type() === 'error') console.error('AUDIO REVIEW LOCATION ' + JSON.stringify(message.location()));});
  await page.goto(baseURL + prefix + '/' + BABBLE_ROOT + '/index.html');
  await page.locator('#preset option[value="hen-radio"]').waitFor({state: 'attached'});
  await page.locator('#auto').uncheck();
  await page.locator('#preset').selectOption('hen-radio');
  await page.locator('#line').fill('Who goes there?');
  await page.locator('#speak').click();
  await page.waitForFunction(() => document.querySelector('#shown').textContent.length > 0);
  await page.locator('#stop').click();
  assert.equal(await page.locator('#shown').textContent(), 'Who goes there?');
  checks.push({name: 'Original source workbench: preset, text, playback, reveals and stop', passed: true});

  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#wav').click()]);
  await download.saveAs(path.join(out, 'workbench.wav'));
  const decoded = decodeWav(fs.readFileSync(path.join(out, 'workbench.wav')));
  assert.ok(decoded.samples.some(value => Math.abs(value) > 0.01));
  const [cuesDownload] = await Promise.all([page.waitForEvent('download'), page.locator('#cues').click()]);
  await cuesDownload.saveAs(path.join(out, 'workbench-cues.json'));
  const cues = JSON.parse(fs.readFileSync(path.join(out, 'workbench-cues.json')));
  checks.push({name: 'Original WAV and game-cue export', passed: true, sampleRate: decoded.sampleRate, samples: decoded.samples.length, cueKeys: Object.keys(cues)});

  await page.locator('#castName').fill('Nautilus intake');
  await page.locator('#castSave').click();
  assert.match(await page.locator('#cast').textContent(), /Nautilus intake/);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#cast').textContent.includes('Nautilus intake'));
  checks.push({name: 'Original cast save survives reload in isolated browser storage', passed: true});

  await page.evaluate(prefix => {
    document.querySelector('#speak').addEventListener('click', () => {
      window.__nautilusAudioProof = (async () => {
        const {render} = await import(prefix + '/modules/audio/index.js');
        const {createSpeaker} = await import(prefix + '/modules/audio/runtime.js');
        const clip = render('Hello!', 'hen-radio', {seed: 17, sampleRate: 22050, timing: {duration: 1}});
        const digest = await crypto.subtle.digest('SHA-256', clip.samples);
        const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
        const context = new AudioContext({sampleRate: 44100});
        let result;
        try {
          await context.resume();
          const bus = context.createGain(); bus.gain.value = 0; bus.connect(context.destination);
          const speaker = createSpeaker(context, {destination: bus, maxCached: 2});
          const reveals = [], mouths = [];
          const line = speaker.say('Hello!', 'hen', {timing: {duration: 0.5}, onReveal: count => reveals.push(count), onMouth: open => mouths.push(open)});
          const ended = await line.done;
          const first = speaker.say('Hello!', 'hen', {overlap: true});
          const second = speaker.say('Welcome!', 'hen-radio', {overlap: true});
          speaker.stop();
          const stopped = await Promise.all([first.done, second.done]);
          speaker.clearCache();
          result = {hash, ended, stopped, speaking: speaker.speaking, contextStateAfterStop: context.state, reveals, mouths, sampleRate: context.sampleRate};
          bus.disconnect();
        } finally { await context.close(); }
        return {...result, contextStateAfterHostClose: context.state};
      })();
    }, {once: true});
  }, prefix);
  await page.locator('#speak').click();
  const runtime = await page.evaluate(() => window.__nautilusAudioProof);
  const node = render('Hello!', 'hen-radio', {seed: 17, sampleRate: 22050, timing: {duration: 1}});
  const expected = createHash('sha256').update(new Uint8Array(node.samples.buffer, node.samples.byteOffset, node.samples.byteLength)).digest('hex');
  assert.equal(runtime.hash, expected);
  assert.equal(runtime.ended, 'ended'); assert.deepEqual(runtime.stopped, ['stopped', 'stopped']);
  assert.equal(runtime.speaking, false); assert.equal(runtime.contextStateAfterStop, 'running');
  assert.equal(runtime.contextStateAfterHostClose, 'closed');
  assert.ok(runtime.reveals.some(value => value > 0)); assert.ok(runtime.mouths.some(value => value > 0));
  checks.push({name: 'Public browser imports, exact Node/browser PCM, real audio clock/cues and borrowed-context cleanup', passed: true, ...runtime});
  await page.locator('#stop').click();
  await page.screenshot({path: path.join(out, 'desktop.png'), fullPage: true});
  await page.setViewportSize({width: 390, height: 844});
  await page.screenshot({path: path.join(out, 'phone.png'), fullPage: true});
  const phone = await page.evaluate(() => ({documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth}));
  assert.ok(phone.documentWidth <= phone.viewportWidth, 'The reviewed phone layout must fit the viewport.');
  checks.push({name: 'Original phone layout reviewed', passed: true, viewport: {width: 390, height: 844}, ...phone});

  await page.goto(baseURL + prefix + '/' + BABBLE_ROOT + '/dist/babble-lab.html');
  await page.locator('#line').fill('Hello!');
  await page.locator('#speak').click();
  await page.waitForFunction(() => document.querySelector('#shown').textContent.length > 0);
  await page.locator('#stop').click();
  checks.push({name: 'Original standalone HTML workbench runs at its preserved built URL', passed: true});
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({mode, browser: 'isolated headless Edge', checks, perceivedAudioQuality: 'Not assessed; human audition required'}, null, 2) + '\n');
  console.log(JSON.stringify({mode, checks: checks.map(({name, passed}) => ({name, passed}))}));
}, {source: true, owner: process.env.CODEX_THREAD_ID || '01a19e7c-9f2e-7511-b8e1-134f5d1d666c', output: 'audio-browser-' + mode, timeoutMs: 180000});
