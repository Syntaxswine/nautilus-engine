import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {Group, Quaternion, Scene, Vector3} from '../packages/render-effects/three.js';
import {createFirearmAudio, createFirearmFeedback, FARMYARD_FIREARM_CUES, FIREARM_FEEDBACK_PROFILE} from '../packages/firearm-feedback/three.js';
import {weaponGrip} from '../packages/firearm-feedback/rig.js';
import {createReferenceRig, horseData, horseProfile} from '../examples/firearm-feedback-rig.js';

const gunshot = (sequence, weapon, at, overrides = {}) => ({
  sequence, weapon, at, actorId: 'horse', origin: {x: 0, y: 0, h: 1.22}, target: {x: 3.15, y: .55, h: 1.22},
  ...overrides
});
const newRig = parent => createReferenceRig(JSON.parse(fs.readFileSync(horseData)), parent);

test('commit cursor consumes each real round once, including a miss, a burst and audio failure', () => {
  const heard = [];
  const feedback = createFirearmFeedback({
    afterSequence: 7,
    playCue(request) {
      heard.push(request);
      if (request.cueId === 'shotgun-fire') throw Error('Speaker removed');
      return request.sequence !== 12;
    }
  });
  assert.equal(feedback.commitRound({sequence: 7}).status, 'stale');
  assert.throws(() => feedback.commitRound(gunshot(8, 'grenade', 1)), /Unsupported firearm/);
  assert.throws(() => feedback.commitRound(gunshot(8, 'pistol', 1, {target: {x: 3, y: 0}})), /target.h/);
  assert.equal(feedback.sequence, 7);
  const miss = gunshot(8, 'assault', 1, {hit: false});
  assert.equal(feedback.commitRound(miss).status, 'accepted');
  miss.origin.x = 999;
  assert.equal(heard[0].origin.x, 0);
  for (const [sequence, at] of [[9, 1.14], [10, 1.28]]) {
    feedback.commitRound(gunshot(sequence, 'assault', at));
  }
  assert.equal(feedback.commitRound(gunshot(9, 'assault', 1.14)).status, 'stale');
  const shotgun = feedback.commitRound(gunshot(11, 'shotgun', 2));
  assert.deepEqual(shotgun.cues.map(cue => [cue.cueId, cue.status]), [['shotgun-fire', 'failed'], ['shotgun-pump', 'delivered']]);
  assert.equal(shotgun.cues[0].error.message, 'Speaker removed');
  assert.equal(feedback.commitRound(gunshot(11, 'shotgun', 2)).status, 'stale');
  assert.equal(feedback.commitRound(gunshot(12, 'pistol', 3)).cues[0].status, 'skipped');
  assert.deepEqual(heard.map(cue => [cue.sequence, cue.cueId, cue.delaySeconds, cue.range, cue.priority]), [
    [8, 'ak47-shot', 0, 48, 1], [9, 'ak47-shot', 0, 48, 1], [10, 'ak47-shot', 0, 48, 1],
    [11, 'shotgun-fire', 0, 48, 1], [11, 'shotgun-pump', .35, 18, .5], [12, 'tt33', 0, 48, 1]
  ]);
  feedback.dispose();
  assert.throws(() => feedback.commitRound(gunshot(13, 'pistol', 4)), /disposed/);
});

test('all Farmyard firearm IDs fit the native horse at discharge in three host-supplied stances', () => {
  const rig = newRig(new Scene()), heard = [];
  const feedback = createFirearmFeedback({playCue: cue => heard.push(cue)});
  const actor = feedback.bindActor({actorId: 'horse', worker: rig.worker, profile: horseProfile});
  let sequence = 0;
  try {
    for (const [stance, height] of [['stand', 1.22], ['kneel', .98], ['prone', .44]]) {
      for (const weapon of Object.keys(FARMYARD_FIREARM_CUES)) {
        const now = ++sequence, label = stance + ' ' + weapon;
        const frame = {now, weapon, pose: {prone: +(stance === 'prone'), kneel: +(stance === 'kneel')}};
        const target = {x: 3.15, y: .55, h: height};
        feedback.commitRound(gunshot(sequence, weapon, now, {target}));
        const fit = actor.sample(frame, () => rig.prepare(weapon, stance));
        assert.equal(fit.sequence, sequence, label);
        assert.equal(fit.phase, 'discharge', label);
        assert.ok(fit.supported && fit.angularError < .0005, label + ' bore fit');
        const gun = rig.worker.weapon, gunRotation = gun.root.getWorldQuaternion(new Quaternion());
        const hands = weapon === 'pistol-offhand' ? [[-1, 'grip']] : weapon === 'pistol' ? [[1, 'grip']] : [[1, 'grip'], [-1, 'support']];
        for (const [side, name] of hands) {
          const hand = rig.worker.root.getObjectByName('hand' + side);
          const {palm} = weaponGrip(gun, name, gunRotation);
          assert.ok(hand.localToWorld(palm).distanceTo(gun.anchors[name].getWorldPosition(new Vector3())) < .0001, label + ' palm ' + side);
        }
        assert.deepEqual(actor.sample(frame), fit, label + ' repeated sampling');
        const recoil = actor.sample({...frame, now: now + .045});
        assert.ok(recoil.bore.h - fit.bore.h > .04, label + ' muzzle rise');
        assert.equal(actor.sample({...frame, now: now + .65})?.sequence ?? null, null, label + ' recoil retires');
      }
    }
    assert.equal(heard.length, 27);
  } finally {
    feedback.dispose();
    rig.dispose();
  }
});

test('translated and yawed borrowed rig keeps the burst endpoint and returns to the host base', () => {
  const scene = new Scene(), frameRoot = new Group(), rig = newRig(frameRoot);
  scene.add(frameRoot);
  const {worker} = rig, {root} = worker;
  rig.prepare('assault', 'stand');
  frameRoot.position.set(12, 2, -4);
  frameRoot.rotation.y = 1.14;
  root.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), 2.21);
  scene.updateMatrixWorld(true);
  const baseline = [root, worker.weapon.root, ...worker.bones].map(object => ({
    object, rotation: object.quaternion.clone(), position: object.position.clone()
  }));
  const heard = [], feedback = createFirearmFeedback({playCue: cue => heard.push(cue)});
  const actor = feedback.bindActor({actorId: 'horse', worker, profile: horseProfile});
  const target = {x: 16, y: -3.5, h: 3.16}, origin = {x: 12, y: -4, h: 3.16};
  const frame = {now: 1, weapon: 'assault', floorHeight: 2, blend: .45, aim: {target, progress: 1}};
  const rival = createFirearmFeedback();
  try {
    assert.throws(() => rival.bindActor({actorId: 'other', worker}), /already has a presentation owner/);
    assert.equal(actor.sample({...frame, now: .95}).phase, 'ready');
    assert.deepEqual(heard, []);
    for (const [sequence, at] of [[1, 1], [2, 1.14], [3, 1.28]]) {
      feedback.commitRound(gunshot(sequence, 'assault', at, {target, origin, hit: false}));
      const shot = actor.sample({...frame, now: at});
      assert.equal(shot.sequence, sequence);
      assert.equal(shot.phase, 'discharge');
      assert.ok(shot.supported && shot.angularError < .0005);
      const ray = new Vector3(shot.bore.x, shot.bore.h, shot.bore.y);
      assert.ok(ray.angleTo(new Vector3(target.x - shot.muzzle.x, target.h - shot.muzzle.h, target.y - shot.muzzle.y)) < .0005);
    }
    assert.equal(feedback.commitRound(gunshot(3, 'assault', 1.28)).status, 'stale');
    assert.deepEqual(heard.map(cue => cue.sequence), [1, 2, 3]);
    assert.throws(() => actor.sample({...frame, now: 1.10}), /nondecreasing/);
    assert.throws(() => actor.sample({...frame, now: 1.29}, () => feedback.dispose()), /reenter/);
    for (const {object, position, rotation} of baseline) {
      assert.ok(object.quaternion.angleTo(rotation) < 1e-7, object.name);
      assert.deepEqual(object.position, position, object.name);
    }
    actor.sample({...frame, now: 1.3});
    actor.dispose();
    actor.dispose();
    assert.equal(root.parent, frameRoot);
    for (const {object, position, rotation} of baseline) {
      assert.ok(object.quaternion.angleTo(rotation) < 1e-7, object.name);
      assert.deepEqual(object.position, position, object.name);
    }
    rival.bindActor({actorId: 'other', worker}).dispose();
  } finally {
    feedback.dispose();
    rival.dispose();
    rig.dispose();
  }
});

test('borrowed Web Audio sink bounds voices and retires delayed pump without closing the host context', () => {
  const nodes = [], gains = [], clip = {fixture: true};
  const context = {
    state: 'running', currentTime: 10, destination: {},
    createBufferSource() {
      const node = {
        connect(destination) { this.destination = destination; }, disconnect() { this.disconnected = true; },
        start(at) { this.at = at; }, stop() { this.stopped = true; }
      };
      nodes.push(node);
      return node;
    },
    createGain() {
      const gain = {gain: {}, connect(destination) { this.destination = destination; }, disconnect() { this.disconnected = true; }};
      gains.push(gain);
      return gain;
    },
    close() { assert.fail('borrowed context closed'); }
  };
  const audio = createFirearmAudio({context, getClip: id => id === 'tt33' ? undefined : clip});
  const feedback = createFirearmFeedback({playCue: audio.playCue});
  feedback.commitRound(gunshot(1, 'shotgun', 1));
  assert.deepEqual(nodes.map(node => node.at), [10, 10.35]);
  assert.equal(gains[1].gain.value, .45);
  nodes[0].onended();
  assert.equal(nodes[0].disconnected, true);
  assert.equal(nodes[0].stopped, undefined);
  assert.equal(feedback.commitRound(gunshot(2, 'pistol', 2)).cues[0].status, 'skipped');
  for (let i = 3; i <= 16; i++) feedback.commitRound(gunshot(i, 'assault', i));
  assert.equal(nodes[1].stopped, true);
  assert.equal(nodes[1].disconnected, true);
  assert.equal(nodes.filter(node => node.onended).length, 12);
  audio.dispose();
  audio.dispose();
  feedback.dispose();
  assert.ok(nodes.every(node => node.disconnected && (node === nodes[0] || node.stopped)));
  assert.ok(gains.every(node => node.disconnected));
  assert.equal(context.state, 'running');
});

test('the exact firearm reference sources and recording metadata are pinned without raw sound assets', async () => {
  const read = relative => fs.readFileSync(new URL('../' + relative, import.meta.url));
  const manifest = JSON.parse(read('packages/firearm-feedback/source.json'));
  const {root} = manifest;
  const hash = (algorithm, bytes) => createHash(algorithm).update(bytes).digest('hex');
  assert.equal(manifest.commit, '12cbb6881a344181f45519ca2275a20a7768f61b');
  assert.equal(manifest.repository, 'https://github.com/Syntaxswine/farmyard-commando-realtime');
  assert.equal(root, 'vendor/farmyard-firearm-feedback/' + manifest.commit);
  assert.match(manifest.tree, /^[\da-f]{40}$/);
  for (const file of manifest.files) {
    const bytes = read(root + '/' + (file.snapshotPath ?? file.path));
    assert.equal(bytes.length, file.bytes);
    assert.equal(hash('sha256', bytes), file.sha256);
    assert.equal(hash('sha1', Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])), file.gitBlob);
    assert.doesNotMatch(file.path, /\.(?:wav|mp3|ogg|flac)$/i);
  }
  const original = await import(new URL('../' + root + '/sites/tactical-animal/dist/designer/a20b343a0234/tactics/battle-sound-data.js', import.meta.url));
  assert.deepEqual(FARMYARD_FIREARM_CUES, original.GUN_SOUND);
  const originalFeedback = read(root + '/sites/tactical-animal/dist/weapon-feedback.js').toString();
  assert.match(originalFeedback, /'shotgun-pump',origin,state,\{delay:\.35,priority:\.5,range:18\}/);
  assert.equal(FIREARM_FEEDBACK_PROFILE.shotgunPumpSeconds, .35);
  assert.equal(FIREARM_FEEDBACK_PROFILE.shotPoseSeconds, .280);
  assert.deepEqual(manifest.audio.recordings.map(recording => recording.id), [
    ...new Set(Object.values(FARMYARD_FIREARM_CUES)), 'shotgun-pump'
  ]);
  for (const recording of manifest.audio.recordings) {
    assert.match(recording.gitBlob, /^[\da-f]{40}$/);
    assert.match(recording.sha256, /^[\da-f]{64}$/);
    assert.match(recording.sourceAsset.sha256, /^[\da-f]{64}$/);
    assert.equal(recording.license.url, 'https://sonniss.com/gdc-bundle-license/');
    assert.equal(recording.license.version, '2.0, effective 2026-08-27');
  }
  assert.match(manifest.audio.bank.note, /non-commercial/);
  const actualFiles = fs.readdirSync(new URL('../' + root + '/', import.meta.url), {recursive: true});
  assert.ok(actualFiles.every(file => !/\.(?:wav|mp3|ogg|flac)$/i.test(file)));
});
