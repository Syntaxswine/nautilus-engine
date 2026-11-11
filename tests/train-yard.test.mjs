import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrainYardHost} from '../examples/train-yard-host.js';
import {railwayEntrancesForTrain} from '../packages/train-core/index.js';

function walkTo(host, target) {
  // Follow the clear platform side, then approach the named entrance.
  for (const goal of [{x: host.actors[0].position.x, y: 36}, {x: target.x, y: 36}, target]) {
    for (let i = 0; i < 2000; i++) {
      const p = host.actors[0].position, dx = goal.x - p.x, dy = goal.y - p.y, distance = Math.hypot(dx, dy);
      if (distance < .02) break;
      const result = host.walk(dx, dy, Math.min(.05, distance / 5));
      assert.equal(result.ok, true, result.reason);
      if (i === 1999) throw Error('Platform walk did not complete.');
    }
  }
}
test('both native world fleets offer a real one-lap coach ride and a supported exit with retained resources', () => {
  let host = createTrainYardHost(), serial = 0;
  const resources = host.actors.map(({health, ap, stamina, inventory}) => ({health, ap, stamina, inventory}));
  for (const stock of ['steam', 'electric']) {
    const state = host.read().trains.find(train => train.stock === stock).state;
    const entrance = railwayEntrancesForTrain(state).find(e => e.mode === 'rider' && e.id.endsWith('right'));
    walkTo(host, {x: entrance.position.x + entrance.outward.x * .9, y: entrance.position.y + entrance.outward.y * .9});
    const action = host.connector.readForActor('player').actions.find(a => a.enabled && a.command.carId === entrance.carId && a.command.entranceId === entrance.id);
    assert.ok(action, stock + ' coach must offer Enter');
    assert.equal(host.connector.dispatch({...action.command, commandId: 'yard-test/' + ++serial}).ok, true);
    const rider = host.connector.readForActor('player');
    assert.equal(rider.mode, 'rider'); assert.equal(rider.train.driverId, 'operator/' + stock);
    assert.equal(host.walk(1, 0).code, 'ABOARD');
    assert.equal(host.connector.dispatch({type: 'drive', actorId: 'player', commandId: 'yard-test/' + ++serial,
      trainId: rider.trainId, expected: rider.expected, leaseId: 'passenger', direction: 'forward', power: 1, brake: 0}).code, 'NOT_DRIVER');
    for (let i = 0; i < 80; i++) assert.equal(host.advance(.05).ok, true);
    assert.ok(host.connector.readForActor('player').train.speedMps > 0);
    const saved = host.save(), actorBefore = host.actors[0], entryEffects = host.read().entryEffects;
    host.dispose(); host = createTrainYardHost(saved);
    assert.deepEqual(host.actors[0], actorBefore); assert.equal(host.read().entryEffects, entryEffects);
    assert.equal(host.read().services[stock].status, 'paused');
    for (let i = 0; i < 100; i++) assert.equal(host.advance(.05).ok, true);
    assert.equal(host.connector.readForActor('player').train.stopped, true);
    assert.equal(host.resumeRide().ok, true);
    let docked = false;
    for (let i = 0; i < 3000; i++) {
      assert.equal(host.advance(.05).ok, true);
      if (host.read().services[stock].status === 'docked') { docked = true; break; }
    }
    assert.equal(docked, true, stock + ' service must complete its lap');
    const live = host.read().trains.find(train => train.stock === stock).state;
    assert.ok(Math.abs(live.distanceM - live.circuitLengthM) < .75);
    const exit = host.connector.readForActor('player').actions[0]; assert.equal(exit.enabled, true, exit.reason);
    assert.equal(host.connector.dispatch({...exit.command, commandId: 'yard-test/' + ++serial}).ok, true);
    assert.equal(host.connector.readForActor('player').walkingAllowed, true);
    assert.deepEqual(host.actors.map(({health, ap, stamina, inventory}) => ({health, ap, stamina, inventory})), resources);
  }
  host.dispose();
});

test('both retained cab workflows allow manual forward, brake, stop, reverse and safe Exit on their circuit', () => {
  const host = createTrainYardHost(); let serial = 0;
  for (const stock of ['steam', 'electric']) {
    const entrance = railwayEntrancesForTrain(host.read().trains.find(train => train.stock === stock).state)
      .find(e => e.mode === 'driver' && e.carIndex === 0 && e.id.endsWith('right'));
    walkTo(host, {x: entrance.position.x + entrance.outward.x * .9, y: entrance.position.y + entrance.outward.y * .9});
    const action = host.connector.readForActor('player').actions.find(a => a.enabled && a.command.entranceId === entrance.id);
    assert.equal(host.connector.dispatch({...action.command, commandId: 'manual/' + ++serial}).ok, true);
    const drive = (direction, power, brake) => {
      const s = host.connector.readForActor('player');
      return host.connector.dispatch({type: 'drive', actorId: 'player', commandId: 'manual/' + ++serial, trainId: s.trainId,
        expected: s.expected, leaseId: 'manual/' + stock, direction, power, brake});
    };
    drive('forward', 1, 0); for (let i = 0; i < 60; i++) host.advance(.05);
    assert.ok(host.connector.readForActor('player').train.signedSpeedMps > 0);
    assert.equal(drive('reverse', 1, 0).code, 'STOP_BEFORE_REVERSE');
    drive('neutral', 0, 1); for (let i = 0; i < 60; i++) host.advance(.05);
    assert.equal(host.connector.readForActor('player').train.stopped, true);
    drive('reverse', 1, 0); for (let i = 0; i < 30; i++) host.advance(.05);
    assert.ok(host.connector.readForActor('player').train.signedSpeedMps < 0);
    drive('neutral', 0, 1); for (let i = 0; i < 60; i++) host.advance(.05);
    const exit = host.connector.readForActor('player').actions[0]; assert.equal(exit.enabled, true, exit.reason);
    assert.equal(host.connector.dispatch({...exit.command, commandId: 'manual/' + ++serial}).ok, true);
  }
  host.dispose();
});

test('leaving a restored paused coach retires its operator authority rather than stranding an occupied cab', () => {
  let host = createTrainYardHost();
  const entrance = railwayEntrancesForTrain(host.read().trains[0].state).find(e => e.mode === 'rider' && e.id.endsWith('right'));
  walkTo(host, {x: entrance.position.x + entrance.outward.x * .9, y: entrance.position.y + entrance.outward.y * .9});
  const enter = host.connector.readForActor('player').actions.find(a => a.enabled && a.command.carId === entrance.carId);
  host.connector.dispatch({...enter.command, commandId: 'paused/enter'});
  for (let i = 0; i < 80; i++) host.advance(.05);
  const save = host.save(); host.dispose(); host = createTrainYardHost(save);
  for (let i = 0; i < 100; i++) host.advance(.05);
  const exit = host.connector.readForActor('player').actions[0]; assert.equal(exit.enabled, true);
  assert.equal(host.connector.dispatch({...exit.command, commandId: 'paused/exit'}).ok, true);
  assert.equal(host.read().controls.find(train => train.stock === 'steam').driverId, null);
  assert.equal(host.read().services.steam, undefined);
  assert.equal(host.actors.find(actor => actor.id === 'operator/steam').mode, 'on-foot');
  host.dispose();
});
