import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createTrainSession, TRAIN_SESSION_CONTRACT} from '@nautilus-engine/map-core/trains';
import {mountTrainControls, TRAIN_CONTROLS_CARD} from '@nautilus-engine/map-core/trains/ui';
import {moduleClosure, distribution} from '../tools/distribution.mjs';
import {authenticatedTrainImages} from '../tools/train-registration.mjs';

test('optional train entries retain a headless runtime and keep UI/reference artifacts out of core packages', () => {
  assert.equal(typeof createTrainSession, 'function');
  assert.equal(typeof mountTrainControls, 'function');
  assert.equal(TRAIN_CONTROLS_CARD.connector, TRAIN_SESSION_CONTRACT.id);
  assert.equal(fs.existsSync(TRAIN_CONTROLS_CARD.guide), true);
  const closure = moduleClosure(['packages/train-core/index.js']);
  assert.ok(closure.every(file => !/three|train-ui|vendor/.test(file)), closure.join('\n'));
  for (const profile of ['core', 'compatibility']) {
    const pkg = distribution(profile);
    assert.equal(pkg.exports['./trains'], './packages/train-core/index.js');
    assert.ok(pkg.files.includes('packages/train-core/index.d.ts'));
    assert.ok(pkg.files.every(file => !/^packages\/train-ui\/(fixture|tools|tests|evidence)\//.test(file)));
    assert.equal(Object.hasOwn(pkg.exports, './trains/ui'), profile === 'compatibility');
    if (profile === 'core') assert.ok(pkg.files.every(file => !file.startsWith('packages/train-ui/')));
  }
});

test('the integrated HUD retains the exact reviewed input and view implementation', () => {
  const pin = '5577773727b757c3142cb2ded0a10315e25cd41d';
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const name of ['index.js', 'index.d.ts', 'view.js', 'feedback.js', 'style.css', 'art/steam-cab-surface.svg', 'art/references.json']) {
    const file = 'packages/train-ui/' + name;
    assert.equal(digest(fs.readFileSync(file)), digest(execFileSync('git', ['show', pin + ':' + file])));
  }
  const read = file => fs.readFileSync(file);
  assert.deepEqual(authenticatedTrainImages('compatibility', {read}), ['packages/train-ui/art/steam-cab-surface.svg']);
  assert.deepEqual(authenticatedTrainImages('core', {read}), []);
  assert.throws(() => authenticatedTrainImages('compatibility', {read: file => Buffer.concat([read(file), Buffer.from('changed')])}), /Unreviewed train panel artwork/);
});
