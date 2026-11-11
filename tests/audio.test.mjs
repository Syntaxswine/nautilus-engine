import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {render, encodeWav, decodeWav, mouthCues, revealSchedule} from '../modules/audio/index.js';
import {createSpeaker} from '../modules/audio/runtime.js';
import {BABBLE_ROOT, checkBabbleLab, snapshotTree} from '../tools/check-babble-lab.mjs';
import {audioDistribution} from '../tools/audio-distribution.mjs';
import {distribution} from '../tools/distribution.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Babble import retains every original byte, mode and path of its exact commit', () => {
  const result = checkBabbleLab(root);
  assert.equal(result.files, 72);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, BABBLE_ROOT, 'provenance.json')));
  assert.notEqual(snapshotTree(manifest.files.slice(1)), result.tree);
  assert.notEqual(snapshotTree(manifest.files.map((entry, index) => index === 0 ? {...entry, mode: '100755'} : entry)), result.tree);
});
test('optional audio is headless, deterministic and preserves timing and WAV samples', () => {
  assert.equal(globalThis.window, undefined); assert.equal(globalThis.document, undefined);
  assert.equal(typeof createSpeaker, 'function');
  const settings = {seed: 17, sampleRate: 22050, timing: {duration: 1}};
  const first = render('Hello!', 'hen-radio', settings), second = render('Hello!', 'hen-radio', settings);
  assert.deepEqual(first.samples, second.samples);
  assert.ok(first.samples.some(value => Math.abs(value) > 0.01)); assert.ok(first.samples.every(Number.isFinite));
  const wav = decodeWav(encodeWav(first.samples, first.sampleRate));
  assert.equal(wav.sampleRate, first.sampleRate); assert.equal(wav.samples.length, first.samples.length);
  assert.ok(mouthCues(first.plan).length > 0); assert.ok(revealSchedule(first.plan).length > 0);
  assert.throws(() => render('Hello', {bank: 'missing'}), /not supplied/);
});
test('standalone sound package has its own complete closure and preserves root profiles', () => {
  const packed = audioDistribution();
  assert.equal(packed.name, '@nautilus-engine/audio');
  assert.equal(packed.exports['.'], './modules/audio/index.js');
  assert.equal(packed.exports['./runtime'], './modules/audio/runtime.js');
  for (const file of [BABBLE_ROOT + '/src/synth.mjs', 'modules/audio/README.md', 'modules/audio/NOTICE.md', BABBLE_ROOT + '/README.md']) assert.ok(packed.files.includes(file));
  assert.equal(packed.files.some(file => /^vendor\/babble-lab\/[^/]+\/(tools|test|dist|workbench)\//.test(file)), false);
  assert.ok(audioDistribution({browser: true}).files.includes(BABBLE_ROOT + '/dist/babble-lab.html'));
  for (const profile of ['core', 'compatibility', 'renderer', 'assets']) {
    const current = distribution(profile);
    assert.equal(Boolean(current.exports['./audio']), false);
    assert.equal(current.files.some(file => file.startsWith('modules/audio/') || file.startsWith(BABBLE_ROOT + '/')), false);
  }
});
