import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMapDocument, openDocument, createSave, parseSave, serializeSave, createRailwayTrain, railwayTrainOf,
  requiredMapFeatures, assertMapCapabilities, RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE,
  RAILWAY_CROSSING_FEATURE, RAILWAY_TRAIN_FEATURE
} from '@nautilus-engine/map-core';

const trunk = {id: 'rail-1', waypoints: [[30, 50], [86, 50]], turnout: {at: [65, 50], end: [77, 62]}};
const diagonal = [[41, 43], [57, 59]];
const departure = {routeId: trunk.id, stock: 'steam', departure: 'start', switchPosition: 'main'};
const edit = (tool, options) => ({tool, start: {z: 0}, options});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} vs ${b}`);

function yard() {
  const doc = createMapDocument('Train yard');
  for (const waypoints of [trunk.waypoints, diagonal]) assert.ok(doc.apply(edit('railway-route', {waypoints})).ok);
  assert.ok(doc.apply(edit('railway-turnout', {id: trunk.id, turnout: trunk.turnout})).ok);
  return doc;
}

test('the locomotive stays on its own route across the diamond and the whole train takes the latched switch', () => {
  const doc = yard();
  const train = createRailwayTrain(doc.map.railwayRoutes.routes[0], departure);
  const initial = train.read();
  assert.deepEqual(initial.cars.map(car => car.id), ['steam-engine', 'coal-tender', 'steam-coach', 'steam-coach']);
  assert.ok(train.canTakeBranch);
  const atDiamond = train.advance(48 - initial.cars[0].front.x, 'main');
  close(atDiamond.cars[0].front.x, 48);
  close(atDiamond.cars[0].front.z, 50);
  assert.equal(atDiamond.routeId, trunk.id);
  assert.equal(atDiamond.track, 'main');
  assert.equal(atDiamond.turnoutTaken, null);

  const atSplit = train.advance(18, 'branch');
  assert.equal(atSplit.turnoutTaken, 'branch');
  assert.equal(atSplit.cars[0].front.track, 'branch');
  assert.equal(atSplit.cars.at(-1).rear.track, 'main', 'The rear carriage is still on the approach.');
  const stopped = train.advance(1000, 'main');
  assert.equal(stopped.turnoutTaken, 'branch');
  assert.equal(stopped.track, 'branch');
  assert.equal(stopped.stopped, true);
  assert.ok(stopped.cars.every(car => car.front.track === 'branch' && car.rear.track === 'branch'));
  close(stopped.cars[0].front.x + .5 * Math.SQRT1_2, 77);
  close(stopped.cars[0].front.z + .5 * Math.SQRT1_2, 62);
  assert.deepEqual(train.advance(1, 'main'), stopped);
  assert.throws(() => train.advance(-1), /finite and nonnegative/);
  assert.deepEqual(train.read(), stopped);
  assert.deepEqual(train.reset(), initial);
  const through = train.advance(1000, 'main');
  assert.equal(through.turnoutTaken, 'main');
  close(through.cars[0].front.x, 85.5);
  close(through.cars[0].front.z, 50);
});

test('a reversed turnout accepts its facing approach and a branch departure merges back onto the main line', () => {
  const reversed = {...trunk, turnout: {at: [62, 50], end: [50, 38]}};
  const cab = {...departure, stock: 'electric', departure: 'end', switchPosition: 'branch'};
  const train = createRailwayTrain(reversed, cab);
  assert.deepEqual(train.read().cars.map(car => [car.id, car.reverse]), [
    ['electric-cab', false], ['electric-coach', false], ['electric-cab', true]
  ]);
  close(train.read().cars[0].yaw, -Math.PI / 2);
  assert.equal(train.advance(1000).track, 'branch');
  assert.throws(() => createRailwayTrain(reversed, {...cab, departure: 'start'}), /facing turnout/);
  const returning = createRailwayTrain(reversed, {...cab, departure: 'branch', switchPosition: 'main'});
  assert.equal(returning.read().track, 'branch');
  assert.equal(returning.canTakeBranch, false);
  const through = returning.advance(1000);
  assert.equal(through.track, 'main');
  assert.ok(through.stopped);
  close(through.cars[0].yaw, Math.PI / 2);
  assert.throws(() => createRailwayTrain({id: trunk.id, waypoints: [[30, 50], [38, 50]]}, departure), /needs 11.2 m/);
});

test('the wheel contacts follow the existing 4 m tangent curve while each body faces along its wheelbase', () => {
  const train = createRailwayTrain({id: trunk.id, waypoints: [[20, 80], [40, 80], [40, 100]]}, departure);
  const distance = 38.5 - train.read().cars[0].front.x;
  const {front, rear, x, z, yaw} = train.advance(distance).cars[0];
  for (const point of [front, rear]) close(Math.hypot(point.x - 36, point.z - 84), 4);
  close(x, (front.x + rear.x) / 2);
  close(z, (front.z + rear.z) / 2);
  assert.ok(yaw > 0 && yaw < Math.PI / 2);
});

test('the map saves the departure and turnout setting and removes orphaned placements in the same edit', () => {
  const doc = yard(), rails = doc.export(), history = doc.editor.undo.length;
  const command = edit('railway-train', departure);
  assert.ok(doc.preview(command).ok);
  assert.equal(doc.export(), rails);
  assert.ok(doc.apply(command).ok);
  assert.equal(doc.editor.undo.length, history + 1);
  assert.deepEqual(railwayTrainOf(doc.map), departure);
  assert.ok(doc.apply(edit('railway-train-switch', {switchPosition: 'branch'})).ok);
  const portable = doc.export();
  assert.equal(doc.map.railwayRoutes.version, 4);
  assert.deepEqual(requiredMapFeatures(doc.map), [
    RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_CROSSING_FEATURE, RAILWAY_TRAIN_FEATURE
  ]);
  assert.throws(() => assertMapCapabilities(doc.map, requiredMapFeatures(doc.map).slice(0, 3)), /nautilus-railway-trains-v1/);
  assert.deepEqual(parseSave(serializeSave(createSave(portable))).payload.data, openDocument(portable).map);
  assert.ok(doc.undo());
  assert.equal(railwayTrainOf(doc.map).switchPosition, 'main');
  assert.ok(doc.redo());
  assert.equal(doc.export(), portable);
  assert.ok(doc.apply(edit('erase-railway-route', {id: trunk.id})).ok);
  assert.equal(railwayTrainOf(doc.map), null);
  assert.equal(doc.map.railwayRoutes.version, 1);
  assert.ok(doc.undo());
  assert.equal(doc.export(), portable);

  assert.ok(doc.apply(edit('railway-train', {...departure, stock: 'electric', departure: 'branch'})).ok);
  assert.ok(doc.apply(edit('erase-railway-turnout', {id: trunk.id})).ok);
  assert.deepEqual(railwayTrainOf(doc.map), departure);
  assert.equal(doc.map.railwayRoutes.version, 4);
  assert.ok(requiredMapFeatures(doc.map).includes(RAILWAY_CROSSING_FEATURE));
});
