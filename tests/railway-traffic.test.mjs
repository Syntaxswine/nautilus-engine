import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMapDocument, createRailwayTraffic, createSave, serializeSave, parseSave, openDocument, railwayTrainsOf,
  requiredMapFeatures, assertMapCapabilities, RAILWAY_SIGNAL_FEATURE
} from '@nautilus-engine/map-core';

const crossing = [
  {id: 'east', waypoints: [[28, 50], [78, 50]]},
  {id: 'north', waypoints: [[50, 24], [50, 77]]}
];
const trunk = {id: 'trunk', waypoints: [[30, 50], [89, 50]], turnout: {at: [65, 50], end: [82, 67]}};
const placement = (stock, routeId, departure = 'start', switchPosition = 'main') =>
  ({stock, routeId, departure, switchPosition});
const train = (snapshot, stock) => snapshot.trains.find(item => item.stock === stock);
const edit = (tool, options) => ({tool, options, start: {z: 0}});

test('a diamond signal holds until the last car clears and gives the waiting train its own track', () => {
  const traffic = createRailwayTraffic(crossing, [placement('steam', 'east'), placement('electric', 'north')]);
  assert.equal(traffic.read().signals.length, 4);
  assert.ok(traffic.read().signals.every(signal => signal.aspect === 'clear'));
  traffic.advance(11, ['steam']);
  const held = traffic.advance(40, ['electric']);
  const waiting = train(held, 'electric');
  assert.equal(waiting.waiting.kind, 'crossing');
  const entrance = held.signals.find(signal => signal.id === waiting.waiting.signalId);
  assert.equal(entrance.aspect, 'stop');
  assert.equal(entrance.occupiedBy, 'steam');
  assert.ok(waiting.state.cars[0].front.z < entrance.z);

  const stillHeld = traffic.advance(12);
  assert.ok(train(stillHeld, 'steam').state.cars[0].front.x > 60);
  assert.equal(train(stillHeld, 'electric').state.distanceM, waiting.state.distanceM);
  assert.equal(stillHeld.signals.find(signal => signal.id === entrance.id).occupiedBy, 'steam');
  const cleared = traffic.advance(1.5, ['steam']);
  assert.equal(cleared.signals.find(signal => signal.id === entrance.id).aspect, 'clear');
  const resumed = train(traffic.advance(1), 'electric');
  assert.ok(resumed.state.distanceM > waiting.state.distanceM);
  assert.equal(resumed.state.routeId, 'north');
  assert.ok(resumed.state.cars.every(car => car.front.x === 50 && car.rear.x === 50));
  assert.ok(traffic.advance(100).trains.every(item => item.state.stopped));
});

test('a turnout holds opposing requests, then releases the branch train after the through train clears', () => {
  const traffic = createRailwayTraffic([trunk], [
    placement('steam', trunk.id, 'start', 'branch'), placement('electric', trunk.id, 'branch')
  ]);
  const held = traffic.advance(100);
  assert.ok(held.trains.every(item => item.waiting?.kind === 'turnout'));
  assert.ok(held.signals.every(signal => signal.occupiedBy === null), 'Both trains are outside the turnout.');
  const departureM = train(held, 'electric').state.distanceM;
  traffic.setSwitch('steam', 'main');
  const entering = traffic.advance(.45);
  assert.equal(train(entering, 'steam').state.turnoutTaken, 'main');
  assert.equal(train(entering, 'electric').state.distanceM, departureM);
  assert.ok(entering.signals.every(signal => signal.occupiedBy === 'steam'));
  traffic.setSwitch('steam', 'branch');
  const finished = traffic.advance(100);
  assert.ok(finished.trains.every(item => item.state.stopped));
  assert.equal(train(finished, 'steam').state.track, 'main', 'A turnout cannot change under an approaching train.');
  const electric = train(finished, 'electric').state;
  assert.equal(electric.track, 'main');
  assert.ok(electric.cars[0].front.x < 31, 'The branch train merged onto the cleared approach.');
});

test('two trains on the same single track keep a gap when their routes have no passing path', () => {
  const traffic = createRailwayTraffic([crossing[0]], [
    placement('steam', 'east'), placement('electric', 'east', 'end')
  ]);
  const blocked = traffic.advance(100);
  assert.ok(blocked.trains.every(item => item.waiting?.kind === 'track'));
  const [steam, electric] = blocked.trains.map(item => item.state.cars[0].front.x);
  assert.ok(electric - steam > 1.2);
  assert.deepEqual(traffic.advance(1), blocked);
});

test('the second placement is a portable edit and overlapping departures are refused', () => {
  const doc = createMapDocument('Signal proof');
  for (const route of crossing) assert.ok(doc.apply(edit('railway-route', {waypoints: route.waypoints})).ok);
  const add = (stock, routeId, departure = 'start') => doc.apply(edit('railway-train', placement(stock, routeId, departure)));
  assert.ok(add('steam', 'rail-1').ok);
  const single = doc.export(), history = doc.editor.undo.length;
  assert.equal(doc.map.railwayRoutes.version, 4);
  assert.match(add('electric', 'rail-1').error, /overlap at their departures/);
  assert.equal(doc.export(), single);
  assert.equal(doc.editor.undo.length, history);
  assert.ok(add('electric', 'rail-2').ok);
  const saved = doc.export();
  assert.equal(doc.map.railwayRoutes.version, 5);
  assert.deepEqual(railwayTrainsOf(openDocument(saved).map).map(item => item.stock), ['steam', 'electric']);
  assert.deepEqual(parseSave(serializeSave(createSave(saved))).payload.data, doc.map);
  const required = requiredMapFeatures(doc.map);
  assert.ok(required.includes(RAILWAY_SIGNAL_FEATURE));
  assert.throws(() => assertMapCapabilities(doc.map, required.filter(id => id !== RAILWAY_SIGNAL_FEATURE)), /shared railway signals/);
  assert.ok(doc.undo());
  assert.equal(doc.export(), single);
  assert.ok(doc.redo());
  assert.equal(doc.export(), saved);
  assert.ok(doc.apply(edit('erase-railway-train', {stock: 'electric'})).ok);
  assert.equal(doc.export(), single);
});
