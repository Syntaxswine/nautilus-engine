import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createTrainSession, TRAIN_SESSION_CONTRACT} from '@nautilus-engine/map-core/trains';
import {mountTrainControls, TRAIN_CONTROLS_CARD} from '@nautilus-engine/map-core/trains/ui';
import {moduleClosure, distribution, root} from '../tools/distribution.mjs';
import {authenticatedTrainImages, trainVisualResourcePaths} from '../tools/train-registration.mjs';
import {tileAuthoringReviewInputModel} from '../tools/tile-authoring-editor-review-inputs.mjs';

test('optional train entries retain a headless runtime and keep UI/reference artifacts out of core packages', () => {
  assert.equal(typeof createTrainSession, 'function');
  assert.equal(typeof mountTrainControls, 'function');
  assert.equal(TRAIN_CONTROLS_CARD.connector, TRAIN_SESSION_CONTRACT.id);
  assert.deepEqual(TRAIN_CONTROLS_CARD.steamProfiles, ['classic', 'compact-notched']);
  assert.equal(TRAIN_CONTROLS_CARD.defaultSteamProfile, 'classic');
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
    for (const file of trainVisualResourcePaths()) assert.equal(pkg.files.includes(file), profile === 'compatibility');
    if (profile === 'compatibility') for (const name of ['compact-input.js', 'compact-model.js', 'compact.css']) assert.ok(pkg.files.includes('packages/train-ui/' + name));
  }
});

test('the actual CI tile-authoring preflight accepts the registered train build without weakening its lineage', async () => {
  const model = await tileAuthoringReviewInputModel({projectRoot: root});
  assert.equal(model.status, 'fixed-source-workflow-candidate');
  assert.equal(model.lineage.editor, 'f9ea6ce0ad5600ce07f4be634a29b699d61790f8');
  assert.equal(model.normalProfiles.core.exports['./trains'], './packages/train-core/index.js');
  assert.ok(model.verificationInputs.some(row => row.file === 'tools/train-registration.mjs'));
});

test('the integrated HUD retains the exact reviewed input and view implementation', () => {
  const pin = 'd99fcf85256c90474cf570185159669caaed8070';
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const runtime = moduleClosure(['packages/train-ui/public.js']).filter(file => file.startsWith('packages/train-ui/') && !file.endsWith('/public.js'));
  const support = ['index.d.ts', 'style.css', 'art/steam-cab-surface.svg', 'art/references.json', 'compact.css', 'compact-source.json'].map(name => 'packages/train-ui/' + name);
  for (const file of new Set([...runtime, ...support])) {
    assert.equal(digest(fs.readFileSync(file)), digest(execFileSync('git', ['-c', 'core.longpaths=true', 'show', pin + ':' + file])));
  }
  const read = file => fs.readFileSync(file);
  const wood = trainVisualResourcePaths().find(file => file.endsWith('.png'));
  assert.deepEqual(authenticatedTrainImages('compatibility', {read}), ['packages/train-ui/art/steam-cab-surface.svg', wood]);
  assert.deepEqual(authenticatedTrainImages('core', {read}), []);
  assert.throws(() => authenticatedTrainImages('compatibility', {read: file => Buffer.concat([read(file), Buffer.from('changed')])}), /Unreviewed train panel artwork/);
  assert.throws(() => authenticatedTrainImages('compatibility', {read: file => file === wood ? Buffer.concat([read(file), Buffer.from('changed')]) : read(file)}), /Unreviewed train panel artwork/);
});
