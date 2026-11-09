import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createMapDocument, MAP_CONTRACT} from '@nautilus-engine/map-core';
import {createFarmyardPlaytestConnector, FARMYARD_PLAYTEST_PROFILE} from '../packages/adapters/farmyard/playtest/index.js';
import {createGameHandoff} from '../apps/editor/game-handoff.js';
import {doorPlaytestDocument} from './fixtures/farmyard-playtest/door-start.mjs';
import {preparePinnedFarmyardHost, verifyProductionDoor} from './fixtures/farmyard-playtest/production-proof.mjs';

const payload = json => ({json, contract: MAP_CONTRACT});
const doorJSON = () => doorPlaytestDocument(createMapDocument).export();
const edit = (json, change) => {
  const map = JSON.parse(json);
  change(map);
  return JSON.stringify(map);
};
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

test('fixed production source bytes and Git blob identities match the proof pin', () => {
  const pin = FARMYARD_PLAYTEST_PROFILE.productionCommit;
  const root = new URL('../vendor/farmyard-playtest/' + pin + '/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('provenance.json', root)));
  assert.equal(manifest.commit, pin);
  assert.equal(manifest.reviewedChange, '5cd3f22f40d3009e54405be25bb19c1a6451c06d');
  assert.ok(manifest.files.some(file => file.path === manifest.entry));
  const notice = 'sites/tactical-animal/dist/aft/tactics/vendor/THREE-LICENSE.txt';
  for (const file of manifest.files) {
    assert.match(file.path, /^sites\/tactical-animal\//);
    assert.ok(!file.path.split('/').includes('..'));
    assert.equal(file.snapshotPath, file.path === notice ? notice + '.original' : undefined);
    const bytes = fs.readFileSync(new URL(file.snapshotPath ?? file.path, root));
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), file.gitBlob, file.path);
  }
});

for (const axis of ['e', 's']) {
  test('Workshop handoff drives the pinned Farmyard hand, queries, AP and saves for a ' + axis + ' leaf', async () => {
    const document = doorPlaytestDocument(createMapDocument, axis);
    assert.deepEqual(document.validate(), []);
    const json = document.export();
    const handoff = createGameHandoff({exportMap: () => json});
    const connector = createFarmyardPlaytestConnector({prepareHost: preparePinnedFarmyardHost});
    const disconnect = handoff.connectGame(connector);
    let session;
    try {
      ({session} = await handoff.sendToGame());
      assert.equal(connector.activeSession, session);
      assert.equal(session.sourceJSON, json);
      assert.deepEqual(session.markers.map(marker => marker.role), [
        'solo-spawn', 'retained-squad-marker', 'retained-squad-marker', 'retained-squad-marker', 'retained-travel-marker'
      ]);
      verifyProductionDoor(session, axis);
    } finally {
      disconnect();
      assert.equal(await connector.dispose(), null);
    }
    assert.equal(session.host.application.view.disposed, true);
  });
}

test('valid Workshop export with 24 painted cells is refused before staging and the real host is retained', async () => {
  const document = doorPlaytestDocument(createMapDocument);
  let prepares = 0;
  const connector = createFarmyardPlaytestConnector({prepareHost(input) { prepares++; return preparePinnedFarmyardHost(input); }});
  const handoff = createGameHandoff({exportMap: () => document.export()});
  const disconnect = handoff.connectGame(connector);
  try {
    const {session} = await handoff.sendToGame();
    const paint = document.apply({
      tool: 'foliage-cover', start: {x: 36, y: 36, z: 0}, end: {x: 41, y: 39, z: 0}, options: {foliageDensity: 65}
    });
    assert.equal(paint.ok, true, paint.error);
    assert.deepEqual(document.validate(), []);
    assert.equal(Object.keys(JSON.parse(document.export()).foliage).length, 24);
    await assert.rejects(handoff.sendToGame(), {code: 'UNBOUND_FOLIAGE', path: '/foliage', details: {cells: 24}});
    assert.equal(prepares, 1);
    assert.equal(connector.activeSession, session);
    assert.equal(session.host.application.view.disposed, undefined);
  } finally {
    disconnect();
    await connector.dispose();
  }
});

test('full preflight refuses unbound and invalid content before the factory can run', async () => {
  const json = doorJSON();
  const connector = createFarmyardPlaytestConnector({prepareHost() { assert.fail('Preflight called the factory'); }});
  const invalid = [
    [map => { map.farmyardWindows = {version: 1, instances: [{}]}; }, 'UNBOUND_MAP_FIELD', '/farmyardWindows'],
    [map => { map.upper[0]['21,25'] = 'floor'; }, 'UNBOUND_UPPER_LEVEL', '/upper'],
    [map => { map.edges['s:20:25'] = 'window-brick'; }, 'UNBOUND_EDGE', '/edges/s:20:25'],
    [map => { map.edges['e:20:25:1'] = 'wall'; }, 'UNBOUND_EDGE', '/edges/e:20:25:1'],
    [map => { map.edgeLocks = {'e:20:25': 10}; }, 'UNBOUND_MAP_FIELD', '/edgeLocks'],
    [map => { map.props.push({kind: 'crate-wood', x: 21, y: 25, z: 0}); }, 'UNBOUND_MAP_FIELD', '/props'],
    [map => { map.guards.push({species: 'cow', weapon: 'rifle', x: 21, y: 24, z: 0}); }, 'UNBOUND_MAP_FIELD', '/guards'],
    [map => { map.starts[0].weapon = 'rifle'; }, 'UNBOUND_MARKER_PROPERTY', '/starts/0/weapon'],
    [map => { map.starts[1].heading = 90; }, 'UNBOUND_MARKER_PROPERTY', '/starts/1/heading'],
    [map => { map.starts[0].character.displayName = 'Scout'; }, 'UNBOUND_ACTOR_PROPERTY', '/starts/0/character/displayName'],
    [map => { map.terrain[239][239] = 'water'; }, 'UNBOUND_TERRAIN', '/terrain/239/239'],
    [map => { map.starts[1].x = map.starts[0].x; map.starts[1].y = map.starts[0].y; }, 'INVALID_MAP', '/json']
  ];
  for (const [change, code, path] of invalid) {
    await assert.rejects(connector.openMap(payload(edit(json, change))), {code, path});
  }
  await assert.rejects(connector.openMap(payload('{')), {code: 'INVALID_MAP_JSON'});
  await assert.rejects(connector.openMap(null), {code: 'INVALID_HANDOFF'});
  await assert.rejects(connector.openMap({json, contract: {...MAP_CONTRACT, metresPerTile: 2}}), {code: 'UNSUPPORTED_CONTRACT'});
  assert.equal(connector.activeSession, null);
  assert.equal(await connector.dispose(), null);
});

test('failed, cancelled and superseded opens retain the active host until a fresh candidate commits', async () => {
  const json = doorJSON();
  const hosts = new Map(), plans = new Map(), retired = [];
  function createHost(name) {
    const host = {name, dispose() { retired.push(name); }};
    hosts.set(name, host);
    return host;
  }
  const connector = createFarmyardPlaytestConnector({prepareHost({authoredMap, signal}) {
    const name = authoredMap.name;
    if (name === 'failure') throw Error('preparation failed');
    if (name === 'reuse') return hosts.get('initial');
    const plan = plans.get(name);
    if (!plan) return createHost(name);
    plan.started.resolve(signal);
    return plan.ready.promise;
  }});
  const open = name => connector.openMap(payload(edit(json, map => { map.name = name; })));
  function waitToPrepare(name) {
    const plan = {started: deferred(), ready: deferred()};
    plans.set(name, plan);
    return plan;
  }
  const {session: initial} = await open('initial');
  await assert.rejects(open('failure'), {code: 'HOST_PREPARE_FAILED'});
  await assert.rejects(open('reuse'), {code: 'HOST_REUSED'});
  assert.equal(connector.activeSession, initial);
  assert.deepEqual(retired, []);

  const cancelled = waitToPrepare('cancelled');
  const cancelledResult = assert.rejects(open('cancelled'), {code: 'CANCELLED'});
  const cancelSignal = await cancelled.started.promise;
  assert.equal(connector.cancelOpen(), true);
  assert.equal(connector.cancelOpen(), false);
  assert.equal(cancelSignal.aborted, true);
  cancelled.ready.resolve(createHost('cancelled'));
  await cancelledResult;
  assert.equal(connector.activeSession, initial);
  assert.deepEqual(retired, ['cancelled']);

  const stale = waitToPrepare('stale');
  const staleResult = assert.rejects(open('stale'), {code: 'STALE_OPEN'});
  const staleSignal = await stale.started.promise;
  await assert.rejects(connector.openMap(payload('{')), {code: 'INVALID_MAP_JSON'});
  assert.equal(staleSignal.aborted, false);
  const {session: latest} = await open('latest');
  assert.equal(staleSignal.aborted, true);
  assert.equal(connector.activeSession, latest);
  stale.ready.resolve(createHost('stale'));
  await staleResult;
  assert.equal(connector.activeSession, latest);
  assert.deepEqual(retired, ['cancelled', 'initial', 'stale']);

  const pending = waitToPrepare('shutdown');
  const disposedResult = assert.rejects(open('shutdown'), {code: 'DISPOSED'});
  await pending.started.promise;
  const shutdown = connector.dispose();
  assert.equal(connector.dispose(), shutdown);
  assert.equal(connector.activeSession, null);
  pending.ready.resolve(createHost('shutdown'));
  await disposedResult;
  assert.equal(await shutdown, null);
  await assert.rejects(open('after shutdown'), {code: 'DISPOSED'});
  assert.deepEqual(retired.sort(), ['cancelled', 'initial', 'latest', 'shutdown', 'stale']);
});

test('retirement errors report cleanup without undoing an adopted host', async () => {
  const json = doorJSON();
  let calls = 0;
  const connector = createFarmyardPlaytestConnector({prepareHost() {
    const index = ++calls;
    return {dispose() { if (index === 1) throw Error('old host cleanup'); }};
  }});
  await connector.openMap(payload(json));
  const {session, cleanupError} = await connector.openMap(payload(json));
  assert.equal(connector.activeSession, session);
  assert.equal(cleanupError.code, 'HOST_DISPOSAL_FAILED');
  assert.match(cleanupError.cause.message, /old host cleanup/);
  assert.equal(await connector.dispose(), null);
});
