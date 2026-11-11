import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrainSession, railwayEntrancesForTrain, railwayCarEntrances, planRailwayCircuit} from '../packages/train-core/index.js';
import {createRailwayTraffic} from '../packages/map-core/railway-traffic.js';
import {createRailwayCircuitTraffic} from '../packages/train-core/circuit-traffic.js';
import {retainedTrainFixture, placement} from './fixtures/trains/host.mjs';

const state = (traffic, stock = 'steam') => traffic.read().trains.find(train => train.stock === stock).state;
const drive = (f, extra = {}, actorId = 'player') => f.send('drive', {leaseId: 'lever/1', direction: 'forward', power: 1, brake: 0, ...extra}, actorId);
const advance = (f, seconds) => { for (let i = 0; i < seconds * 20; i++) assert.equal(f.session.advance(.05).ok, true); };
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test('walk-up preview, settled entry, acceleration, neutral, brake, stop, reverse and supported exit retain resources', () => {
  const f = retainedTrainFixture(), resources = f.actors.map(({health, inventory, ap, stamina}) => ({health, inventory, ap, stamina}));
  assert.equal(f.session.readForActor('player').walkingAllowed, true);
  assert.equal(f.enter().ok, true);
  assert.equal(f.session.readForActor('player').mode, 'driver');
  assert.equal(f.enter('other', action => action.command.type === 'enter').code, 'CAB_OCCUPIED');
  assert.equal(drive(f).ok, true); advance(f, 3);
  const running = f.session.readForActor('player');
  assert.ok(running.train.speedMps > 2);
  assert.equal(drive(f, {direction: 'reverse'}).code, 'STOP_BEFORE_REVERSE');
  const exit = running.actions[0]; assert.equal(exit.code, 'TRAIN_MOVING');
  assert.equal(drive(f, {direction: 'neutral', power: 0}).ok, true); advance(f, 1);
  assert.ok(f.session.readForActor('player').train.speedMps < running.train.speedMps);
  assert.equal(drive(f, {power: 0, brake: 1}).ok, true); advance(f, 3);
  assert.equal(f.session.readForActor('player').train.stopped, true);
  const beforeReverse = state(f.session).distanceM;
  assert.equal(drive(f, {direction: 'reverse'}).ok, true); advance(f, 1);
  assert.ok(state(f.session).distanceM < beforeReverse);
  assert.equal(drive(f, {direction: 'neutral', power: 0, brake: 1}).ok, true); advance(f, 2);
  const leave = f.session.readForActor('player').actions[0];
  f.block(); assert.equal(f.session.dispatch({...leave.command, commandId: 'blocked'}).code, 'LANDING_BLOCKED');
  assert.equal(f.session.readForActor('player').mode, 'driver');
  f.block(false); assert.equal(f.session.dispatch({...f.session.readForActor('player').actions[0].command, commandId: 'exit'}).ok, true);
  assert.equal(f.session.readForActor('player').walkingAllowed, true);
  assert.deepEqual(f.actors.map(({health, inventory, ap, stamina}) => ({health, inventory, ap, stamina})), resources);
});

test('contextual reach/access/fit and competing driver validation repeat at the click', () => {
  const f = retainedTrainFixture(), command = {...f.session.readForActor('player').actions.find(action => action.enabled).command, commandId: 'entry'};
  f.access(false); assert.equal(f.session.dispatch(command).code, 'ACCESS_DENIED');
  f.access(true); assert.equal(f.session.dispatch(command).code, 'ACCESS_DENIED', 'Refused command receipt is durable.');
  assert.equal(f.session.dispatch({...command, commandId: 'fresh'}).ok, true);
  assert.equal(f.enter('other', action => action.command.type === 'enter').code, 'CAB_OCCUPIED');
  assert.equal(railwayCarEntrances('world', 'coal-tender').length, 0);
  near(railwayCarEntrances('world', 'steam-coach')[0].widthM, .325 * 2.12);
  near(railwayCarEntrances('miniature', 'steam-coach')[0].clearanceM, .712);
  near(railwayCarEntrances('world', 'electric-cab')[0].widthM, .298 * 3);
  const miniature = retainedTrainFixture({routes: [{id: 'east', waypoints: [[20, 50], [100, 50]]}], placements: [placement('steam', 'east', 'miniature')]});
  assert.ok(miniature.session.readForActor('player').actions.every(action => !action.enabled));
  assert.ok(miniature.session.readForActor('player').actions.some(action => action.code === 'ENTRANCE_TOO_SMALL'));
});

test('command retries, stale revisions, detached reads and exact original-lease release cannot affect a new owner', () => {
  const f = retainedTrainFixture(), command = {...f.session.readForActor('player').actions.find(action => action.enabled).command, commandId: 'entry'};
  assert.equal(f.session.dispatch(command).ok, true); const commits = f.commits;
  assert.equal(f.session.dispatch(command).repeated, true); assert.equal(f.commits, commits);
  assert.equal(f.session.dispatch({...command, carId: 'other'}).code, 'COMMAND_ID_REUSED');
  const old = f.session.readForActor('player'); assert.equal(drive(f).ok, true);
  assert.equal(f.session.dispatch({type: 'drive', actorId: 'player', commandId: 'stale', trainId: old.trainId,
    expected: old.expected, leaseId: 'lever/1', direction: 'forward', power: 1, brake: 0}).code, 'STALE_ACTION');
  const copy = f.session.readForActor('player'); copy.train.controls.power = 0;
  assert.equal(f.session.readForActor('player').train.controls.power, 1);
  assert.equal(f.session.dispatch({type: 'release', actorId: 'other', commandId: 'wrong-owner', leaseId: 'lever/1'}).code, 'LEASE_CLOSED');
  assert.equal(f.session.dispatch({type: 'release', actorId: 'player', commandId: 'cancel', leaseId: 'lever/1'}).ok, true);
  assert.deepEqual(f.session.readForActor('player').train.controls, {direction: 'neutral', power: 0, brake: 1, leaseId: null});
  assert.equal(drive(f).code, 'LEASE_CLOSED');
  assert.equal(drive(f, {leaseId: 'lever/2'}).ok, true);
  assert.equal(f.session.dispatch({type: 'release', actorId: 'player', commandId: 'late', leaseId: 'lever/1'}).code, 'LEASE_CLOSED');
  assert.equal(f.session.readForActor('player').train.controls.leaseId, 'lever/2');
});

test('coach riders follow the selected car on a curve and cannot drive; electric rear cab reverses physical travel', () => {
  const routes = [{id: 'east', radiusM: 16, waypoints: [[20, 50], [100, 50], [100, 130]]}];
  const f = retainedTrainFixture({routes, placements: [placement('electric')]});
  const entrances = railwayEntrancesForTrain(state(f.session, 'electric'));
  const rear = entrances.find(entrance => entrance.carId.endsWith('/2'));
  f.place('player', rear);
  assert.equal(f.enter('player', action => action.command.carId === rear.carId && action.enabled).ok, true);
  assert.equal(f.session.readForActor('player').cabFacing, -1);
  assert.equal(drive(f, {direction: 'reverse'}).ok, true);
  const coach = entrances.find(entrance => entrance.mode === 'rider'); f.place('other', coach);
  assert.equal(f.enter('other', action => action.command.carId === coach.carId && action.enabled).ok, true);
  assert.equal(drive(f, {}, 'other').code, 'NOT_DRIVER');
  advance(f, 18);
  const live = railwayEntrancesForTrain(state(f.session, 'electric')).find(entrance => entrance.carId === coach.carId && entrance.id === coach.id);
  assert.deepEqual(f.session.readForActor('other').position, live.attachedPosition);
  assert.equal(f.session.readForActor('other').walkingAllowed, false);
  assert.ok(f.session.readForActor('player').train.signedSpeedMps > 0);
});

test('host movement commit failure rolls back all train motion and attachment; observer throws do not replay commits', () => {
  const f = retainedTrainFixture(); f.enter(); drive(f);
  const before = f.session.checkpoint(), actor = f.actors;
  f.reject(); assert.equal(f.session.advance(1).code, 'HOST_REJECTED');
  assert.deepEqual(f.session.checkpoint(), before); assert.deepEqual(f.actors, actor);
  f.reject(false); let seen = 0;
  f.session.subscribe(() => { seen++; throw Error('presentation failed'); });
  f.session.subscribe(() => assert.equal(f.send('release', {leaseId: 'lever/1'}).code, 'SESSION_BUSY'));
  const result = f.session.advance(1); assert.equal(result.ok, true); assert.equal(result.observerErrors, 1); assert.equal(seen, 1);
});

test('moving checkpoint restores exact car/actor positions, resources and receipts, with held input revoked', () => {
  const f = retainedTrainFixture(); const enter = {...f.session.readForActor('player').actions.find(action => action.enabled).command, commandId: 'entry'};
  f.session.dispatch(enter); drive(f); advance(f, 3);
  const checkpoint = f.session.checkpoint(), actors = f.actors, pose = state(f.session);
  const restored = retainedTrainFixture({actors, checkpoint});
  assert.deepEqual(state(restored.session), pose); assert.deepEqual(restored.actors, actors);
  assert.deepEqual(restored.session.readForActor('player').train.controls, {direction: 'neutral', power: 0, brake: 1, leaseId: null});
  assert.equal(restored.session.dispatch(enter).repeated, true); assert.equal(restored.commits, 0);
  assert.equal(drive(restored, {commandId: 'restore-drive'}).code, 'LEASE_CLOSED');
  advance(restored, 3); assert.equal(restored.session.readForActor('player').train.stopped, true);
  const invalid = structuredClone(checkpoint); invalid.version = 2;
  assert.throws(() => retainedTrainFixture({actors, checkpoint: invalid}), /Incompatible/);
  const wrong = structuredClone(actors); wrong[0].position.x++;
  assert.throws(() => retainedTrainFixture({actors: wrong, checkpoint}), /attachment/);
});

test('signed per-train motion preserves independent speeds, reverse diamond holds/resumption and route identity', () => {
  const routes = [{id: 'east', radiusM: 16, waypoints: [[20, 100], [220, 100]]},
    {id: 'north', radiusM: 16, waypoints: [[110, 20], [110, 220]]}];
  const traffic = createRailwayTraffic(routes, [placement(), placement('electric', 'north')]);
  traffic.advanceSigned([{stock: 'steam', distanceM: 70}]);
  const held = traffic.advanceSigned([{stock: 'electric', distanceM: 120}]);
  assert.equal(held.snapshot.trains[1].waiting.kind, 'crossing');
  const at = state(traffic, 'electric').distanceM;
  traffic.advanceSigned([{stock: 'steam', distanceM: -60}]);
  traffic.advanceSigned([{stock: 'electric', distanceM: 100}]);
  assert.ok(state(traffic, 'electric').distanceM > at);
  traffic.advanceSigned([{stock: 'steam', distanceM: 70}]);
  const reverseHeld = traffic.advanceSigned([{stock: 'electric', distanceM: -120}]);
  assert.equal(reverseHeld.snapshot.trains[1].waiting.kind, 'crossing');
  traffic.advanceSigned([{stock: 'steam', distanceM: 60}, {stock: 'electric', distanceM: -10}]);
  const resumed = traffic.advanceSigned([{stock: 'electric', distanceM: -20}]);
  assert.ok(resumed.moved.electric < 0);
  assert.ok(state(traffic, 'electric').cars.every(car => car.front.x === 110 && car.rear.x === 110));
  const checkpoint = traffic.checkpoint(), copy = createRailwayTraffic(routes, [placement(), placement('electric', 'north')]);
  copy.restore(checkpoint); assert.deepEqual(copy.read().trains.map(train => train.state), traffic.read().trains.map(train => train.state));
});

test('turnout route history stays latched through reverse until every carriage clears, with occupied-exit protection', () => {
  const route = {id: 'east', radiusM: 16, waypoints: [[20, 80], [220, 80]], turnout: {at: [120, 80], end: [205, 165]}};
  const traffic = createRailwayTraffic([route], [placement('steam', 'east', 'world', 'start', 'branch')]);
  traffic.advanceSigned([{stock: 'steam', distanceM: 90}]);
  assert.equal(state(traffic).turnoutTaken, 'branch');
  const checkpoint = traffic.checkpoint();
  assert.equal(traffic.setTurnout('east', 'main').code, 'TURNOUT_OCCUPIED');
  traffic.advanceSigned([{stock: 'steam', distanceM: -15}]);
  assert.equal(state(traffic).turnoutTaken, 'branch');
  traffic.advanceSigned([{stock: 'steam', distanceM: -75}]);
  assert.ok(state(traffic).cars.every(car => car.front.track === 'main' && car.rear.track === 'main'));
  assert.equal(traffic.setTurnout('east', 'main').ok, true);
  traffic.advanceSigned([{stock: 'steam', distanceM: 100}]); assert.equal(state(traffic).turnoutTaken, 'main');
  traffic.restore(checkpoint); assert.equal(state(traffic).turnoutTaken, 'branch');
});

test('two genuine rounded circuits cross their seam forward/reverse without any car or attached actor jump', () => {
  const routes = [{id: 'a', circuit: true, radiusM: 16, waypoints: [[20, 40], [108, 40], [108, 130], [20, 130]]},
    {id: 'b', circuit: true, radiusM: 16, waypoints: [[132, 40], [220, 40], [220, 130], [132, 130]]}];
  const traffic = createRailwayCircuitTraffic(routes, [placement('steam', 'a'), placement('electric', 'b')]);
  const length = planRailwayCircuit(routes[0].waypoints, 16).lengthM;
  const initial = traffic.read();
  traffic.advanceSigned([{stock: 'steam', distanceM: length}, {stock: 'electric', distanceM: -length}]);
  for (const [i, train] of traffic.read().trains.entries()) for (const [j, car] of train.state.cars.entries()) {
    near(car.x, initial.trains[i].state.cars[j].x); near(car.z, initial.trains[i].state.cars[j].z);
  }
  for (const direction of [1, -1]) {
    let previous = traffic.read();
    for (let i = 0; i < 1600; i++) {
      const now = traffic.advanceSigned([{stock: 'steam', distanceM: direction * .25}, {stock: 'electric', distanceM: direction * .125}]).snapshot;
      now.trains.forEach((train, index) => train.state.cars.forEach((car, n) =>
        assert.ok(Math.hypot(car.x - previous.trains[index].state.cars[n].x, car.z - previous.trains[index].state.cars[n].z) <= .251)));
      previous = now;
    }
  }
  const f = retainedTrainFixture({routes, placements: [placement('steam', 'a'), placement('electric', 'b')]});
  f.enter(); drive(f); advance(f, 50);
  const actor = f.session.readForActor('player'), entrance = railwayEntrancesForTrain(state(f.session)).find(e => e.carId === actor.carId && e.id === actor.entranceId);
  assert.deepEqual(actor.position, entrance.attachedPosition);
});

test('plain-data command rejection does not invoke accessors or mutate retained actors', () => {
  const f = retainedTrainFixture(), before = f.actors; let invoked = false;
  assert.equal(f.session.dispatch({get commandId() { invoked = true; return 'oops'; }}).code, 'INVALID_COMMAND');
  assert.equal(invoked, false); assert.deepEqual(f.actors, before);
  assert.equal(typeof globalThis.document, 'undefined'); assert.equal(typeof globalThis.window, 'undefined');
});

test('bounded journal reserves exact-owner release slots and remains checkpointable at its limit', () => {
  const f = retainedTrainFixture(); f.enter(); drive(f);
  const snapshot = f.session.readForActor('player');
  for (let i = 0; i < 4092; i++) assert.equal(f.session.dispatch({type: 'unknown', actorId: 'player', commandId: 'fill/' + i,
    trainId: snapshot.trainId, expected: snapshot.expected}).committed, false);
  assert.equal(f.session.dispatch({type: 'release', actorId: 'other', commandId: 'steal-reserve', leaseId: 'lever/1'}).code, 'JOURNAL_LIMIT');
  for (let i = 0; i < 2; i++) assert.equal(f.session.dispatch({type: 'release', actorId: 'player',
    commandId: 'malformed-reserve/' + i, leaseId: 'lever/1', unexpected: true}).code, 'JOURNAL_LIMIT');
  assert.equal(f.session.dispatch({type: 'release', actorId: 'player', commandId: 'safety', leaseId: 'lever/1'}).ok, true);
  assert.equal(f.session.readForActor('player').train.controls.brake, 1);
  assert.equal(f.session.checkpoint().receipts.length, 4095);
});

test('two owners reserve lease retirement capacity before acquisition and remain cancellable/checkpointable at the bound', () => {
  const routes = [{id: 'a', radiusM: 16, waypoints: [[20, 50], [220, 50]]},
    {id: 'b', radiusM: 16, waypoints: [[20, 100], [220, 100]]}];
  const placements = [placement('steam', 'a'), placement('electric', 'b')];
  const original = retainedTrainFixture({routes, placements});
  original.enter();
  const cab = railwayEntrancesForTrain(state(original.session, 'electric')).find(e => e.mode === 'driver');
  original.place('other', cab); original.enter('other');
  const checkpoint = original.session.checkpoint();
  checkpoint.closedLeases = Array.from({length: 8190}, (_, i) => 'old/' + i);
  const f = retainedTrainFixture({routes, placements, actors: original.actors, checkpoint});
  let serial = 0;
  const driveOwner = (actorId, leaseId, power = 1) => {
    const s = f.session.readForActor(actorId);
    return f.session.dispatch({type: 'drive', actorId, commandId: 'lease-bound/' + ++serial, trainId: s.trainId,
      expected: s.expected, leaseId, direction: power ? 'forward' : 'neutral', power, brake: power ? 0 : 1});
  };
  const releaseOwner = (actorId, leaseId) => f.session.dispatch({type: 'release', actorId, leaseId, commandId: 'lease-bound/' + ++serial});
  const assertRestorable = () => {
    const restored = retainedTrainFixture({routes, placements, actors: f.actors, checkpoint: f.session.checkpoint()});
    for (const train of restored.session.read().controls) assert.deepEqual(train.controls,
      {direction: 'neutral', power: 0, brake: 1, leaseId: null});
    assert.deepEqual(restored.actors, f.actors);
    const closed = restored.session.checkpoint().closedLeases;
    assert.ok(closed.length <= 8192);
    assert.doesNotThrow(() => retainedTrainFixture({routes, placements, actors: restored.actors, checkpoint: restored.session.checkpoint()}));
  };
  assert.equal(driveOwner('player', 'A').ok, true); assertRestorable();
  assert.equal(driveOwner('other', 'B').ok, true); assertRestorable();
  const overflow = f.session.checkpoint(); overflow.closedLeases.push('one-too-many');
  assert.throws(() => retainedTrainFixture({routes, placements, actors: f.actors, checkpoint: overflow}), /capacity/);
  assert.equal(releaseOwner('player', 'A').ok, true); assertRestorable();
  assert.equal(driveOwner('player', 'C').code, 'LEASE_LIMIT');
  assert.equal(f.session.readForActor('player').train.controls.brake, 1);
  assert.equal(f.session.readForActor('other').train.controls.power, 1);
  assert.equal(driveOwner('other', 'B', 0).ok, true, 'Existing input can still brake at full reserved capacity.');
  assert.equal(releaseOwner('other', 'B').ok, true); assertRestorable();
  assert.equal(f.session.checkpoint().closedLeases.length, 8192);
  assert.equal(releaseOwner('player', 'C').code, 'LEASE_CLOSED');
  assert.equal(driveOwner('player', 'fresh').code, 'LEASE_LIMIT');
  const exit = f.session.readForActor('player').actions[0];
  assert.equal(f.session.dispatch({...exit.command, commandId: 'lease-bound/exit'}).ok, true);
  assertRestorable();
});

test('one-train lease retirement can fill all closed slots and its no-input checkpoint restores repeatedly', () => {
  const original = retainedTrainFixture(); original.enter();
  const checkpoint = original.session.checkpoint();
  checkpoint.closedLeases = Array.from({length: 8191}, (_, i) => 'old/' + i);
  const f = retainedTrainFixture({actors: original.actors, checkpoint});
  assert.equal(drive(f, {commandId: 'single/acquire'}).ok, true);
  const active = f.session.checkpoint();
  const neutralized = retainedTrainFixture({actors: f.actors, checkpoint: active});
  assert.equal(neutralized.session.checkpoint().closedLeases.length, 8192);
  assert.doesNotThrow(() => retainedTrainFixture({actors: neutralized.actors, checkpoint: neutralized.session.checkpoint()}));
  assert.equal(f.session.dispatch({type: 'release', actorId: 'player', commandId: 'single/release', leaseId: 'lever/1'}).ok, true);
  assert.equal(f.session.checkpoint().closedLeases.length, 8192);
  const restored = retainedTrainFixture({actors: f.actors, checkpoint: f.session.checkpoint()});
  assert.deepEqual(restored.session.readForActor('player').train.controls, {direction: 'neutral', power: 0, brake: 1, leaseId: null});
  assert.equal(drive(restored, {commandId: 'single/exhausted', leaseId: 'fresh'}).code, 'LEASE_LIMIT');
});

test('Miniature preserves native dimensions and supports appropriately sized retained actors', () => {
  const f = retainedTrainFixture({routes: [{id: 'east', waypoints: [[20, 50], [100, 50]]}], placements: [placement('electric', 'east', 'miniature')]});
  const actors = f.actors.map(actor => ({...actor, radiusM: .09, heightM: .55}));
  const small = retainedTrainFixture({routes: [{id: 'east', waypoints: [[20, 50], [100, 50]]}], placements: [placement('electric', 'east', 'miniature')], actors});
  assert.equal(small.enter().ok, true); assert.equal(drive(small).ok, true); advance(small, 2);
  assert.ok(small.session.readForActor('player').train.speedMps > 0);
  assert.equal(small.session.readForActor('player').train.profile, 'miniature');
});

test('actual Three entrance anchors match headless car-local points for duplicate coaches and the reversed electric cab', async () => {
  const T = await import('../packages/render-effects/three.js');
  const {createRailwayTrainView} = await import('../packages/railway-visuals/train-view.js');
  for (const stock of ['steam', 'electric']) {
    const traffic = createRailwayTraffic([{id: 'east', radiusM: 16, waypoints: [[20, 50], [100, 50], [100, 130]]}], [placement(stock)]);
    traffic.advanceSigned([{stock, distanceM: 58}]);
    const pose = state(traffic, stock), view = createRailwayTrainView(T, pose);
    try {
      view.root.updateMatrixWorld(true);
      const expected = railwayEntrancesForTrain(pose), found = [];
      view.root.traverse(object => { if (object.userData.entranceId) found.push(object); });
      assert.equal(found.length, expected.length);
      for (const entrance of expected) {
        const group = found.find(group => group.userData.carId === entrance.carId && group.userData.entranceId === entrance.id);
        const p = group.getWorldPosition(new T.Vector3());
        near(p.x, entrance.position.x); near(p.z, entrance.position.y); near(p.y, entrance.position.h);
      }
    } finally { view.dispose(); }
  }
});

test('pure preview callbacks cannot re-enter authority, and signal-hold checkpoints round-trip unchanged', () => {
  const f = retainedTrainFixture(), intent = {...f.session.readForActor('player').actions.find(a => a.enabled).command, commandId: 'reentrant'};
  let refused;
  f.host.canEnter = () => { refused = f.session.dispatch(intent); return {ok: true}; };
  assert.equal(f.session.readForActor('player').mode, 'on-foot'); assert.equal(refused.code, 'SESSION_BUSY');
  assert.equal(f.commits, 0);
  const routes = [{id: 'east', radiusM: 16, waypoints: [[20, 100], [220, 100]]},
    {id: 'north', radiusM: 16, waypoints: [[110, 20], [110, 220]]}];
  const placements = [placement(), placement('electric', 'north')], traffic = createRailwayTraffic(routes, placements);
  traffic.advanceSigned([{stock: 'steam', distanceM: 70}]);
  traffic.advanceSigned([{stock: 'electric', distanceM: 120}]);
  assert.equal(traffic.read().trains[1].waiting.kind, 'crossing');
  const snapshot = traffic.read(), checkpoint = traffic.checkpoint();
  traffic.advanceSigned([{stock: 'steam', distanceM: 70}]); traffic.restore(checkpoint);
  assert.deepEqual(traffic.read(), snapshot);
});
