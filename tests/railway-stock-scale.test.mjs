import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {
  createMapDocument, openDocument, createSave, parseSave, serializeSave, createRailwayTrain, createRailwayTraffic,
  railwayTrainsOf, requiredMapFeatures, assertMapCapabilities, RAILWAY_WORLD_STOCK_FEATURE, RAILWAY_STOCK_PROFILES,
  planRailwayRoute
} from '@nautilus-engine/map-core';
import {createRollingStockKit, createRailwayTrainView} from '@nautilus-engine/map-core/assets/three';
import * as T from '../packages/render-effects/three.js';

const placement = (stock, routeId = 'rail-1') => ({routeId, stock, departure: 'start', switchPosition: 'main', profile: 'world'});
const edit = (tool, options) => ({tool, options, start: {z: 0}});
const route = {id: 'rail-1', waypoints: [[20, 70], [100, 70], [100, 160]], radiusM: 16};
const close = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

function overlaps(a, b, halfWidth) {
  const axes = p => [[Math.sin(p.yaw), Math.cos(p.yaw)], [Math.cos(p.yaw), -Math.sin(p.yaw)]];
  const support = (p, axis) => {
    const [forward, side] = axes(p);
    return Math.abs(forward[0] * axis[0] + forward[1] * axis[1]) * p.lengthM / 2 +
      Math.abs(side[0] * axis[0] + side[1] * axis[1]) * halfWidth;
  };
  return [...axes(a), ...axes(b)].every(axis =>
    Math.abs((a.x - b.x) * axis[0] + (a.z - b.z) * axis[1]) < support(a, axis) + support(b, axis));
}

test('world-size cars clear one another around a 16m bend and reject miniature bends', () => {
  for (const stock of ['steam', 'electric']) {
    const train = createRailwayTrain(route, placement(stock));
    assert.throws(() => createRailwayTrain({...route, radiusM: 4}, placement(stock)), /16 m curves/);
    const plan = planRailwayRoute(route.waypoints, 16);
    close(plan.spans.find(span => span.kind === 'curve').radiusM, 16);
    for (let step = 0; step < 340; step++) {
      const state = train.advance(.5);
      assert.equal(state.profile, 'world');
      for (let i = 0; i < state.cars.length; i++) for (let j = i + 1; j < state.cars.length; j++) {
        assert.ok(!overlaps(state.cars[i], state.cars[j], RAILWAY_STOCK_PROFILES.world.halfWidthM),
          `${stock} cars ${i} and ${j} overlap at ${state.distanceM}m`);
      }
    }
    assert.ok(train.read().stopped);
  }
});

test('large train dimensions and renderer stay in world metres while originals remain available', () => {
  const kit = createRollingStockKit(T), mini = createRollingStockKit(T, {profile: 'miniature'});
  try {
    for (const id of ['steam-engine', 'coal-tender', 'steam-coach', 'electric-cab', 'electric-coach']) {
      const model = kit.create(id), small = mini.create(id);
      const box = new T.Box3().setFromObject(model.root), size = box.getSize(new T.Vector3());
      const smallSize = new T.Box3().setFromObject(small.root).getSize(new T.Vector3());
      assert.equal(model.root.userData.profile, 'world');
      assert.ok(size.z > smallSize.z * 2.5 && size.z > 5, id + ' must span several metre tiles');
      assert.ok(size.x > 2 && size.x < 2.6, id + ' body width');
      if (id.includes('coach') || id === 'electric-cab') assert.ok(box.max.y > 3.4 && box.max.y < 4.5, id + ' roof height');
      assert.equal(small.root.userData.profile, 'miniature');
      model.dispose(); small.dispose();
    }
    const source = fs.readFileSync(new URL('../packages/railway-visuals/miniature-stock.js', import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), 'b6990ccc93983cb2d318fa91a059001adb830bc1d128f8694d26e79c70591529');
    const train = createRailwayTrain(route, placement('electric'));
    const view = createRailwayTrainView(T, train.read());
    try {
      view.update(train.advance(60));
      assert.equal(view.root.userData.profile, 'world');
      assert.ok(view.root.getObjectByName('Train car 1'));
    } finally { view.dispose(); }
  } finally { kit.dispose(); mini.dispose(); }
});

test('larger consists hold the crossing until the full train clears, then the other train resumes', () => {
  const routes = [
    {id: 'east', waypoints: [[20, 100], [200, 100]], radiusM: 16},
    {id: 'north', waypoints: [[110, 20], [110, 200]], radiusM: 16}
  ];
  const traffic = createRailwayTraffic(routes, [placement('steam', 'east'), placement('electric', 'north')]);
  traffic.advance(55, ['steam']);
  const held = traffic.advance(100, ['electric']);
  const waiting = held.trains.find(train => train.stock === 'electric');
  assert.equal(waiting.waiting.kind, 'crossing');
  assert.ok(held.signals.every(signal => signal.sideOffsetM > RAILWAY_STOCK_PROFILES.world.halfWidthM));
  traffic.advance(30, ['steam']);
  assert.equal(traffic.read().trains.find(train => train.stock === 'electric').state.distanceM, waiting.state.distanceM);
  const finished = traffic.advance(300);
  assert.ok(finished.trains.every(train => train.state.stopped && !train.waiting));
});

test('explicit sizes survive save, reload and history without changing legacy miniature maps', () => {
  const doc = createMapDocument('World railway');
  assert.ok(doc.apply(edit('railway-route', route)).ok);
  const empty = doc.export();
  assert.ok(doc.apply(edit('railway-train', placement('steam'))).ok);
  const saved = doc.export();
  assert.equal(doc.map.railwayRoutes.version, 6);
  assert.equal(railwayTrainsOf(openDocument(saved).map)[0].profile, 'world');
  assert.deepEqual(parseSave(serializeSave(createSave(saved))).payload.data, doc.map);
  const required = requiredMapFeatures(doc.map);
  assert.ok(required.includes(RAILWAY_WORLD_STOCK_FEATURE));
  assert.throws(() => assertMapCapabilities(doc.map, required.filter(id => id !== RAILWAY_WORLD_STOCK_FEATURE)), /world-size railways/);
  assert.ok(doc.undo()); assert.equal(doc.export(), empty);
  assert.ok(doc.redo()); assert.equal(doc.export(), saved);
  const legacy = createMapDocument('Original railway');
  assert.ok(legacy.apply(edit('railway-route', {waypoints: route.waypoints})).ok);
  const {profile, ...small} = placement('steam');
  assert.ok(legacy.apply(edit('railway-train', small)).ok);
  const original = legacy.export();
  assert.equal(legacy.map.railwayRoutes.version, 4);
  const reopened = openDocument(original);
  assert.equal(reopened.export(), original);
  assert.equal(createRailwayTrain(reopened.map.railwayRoutes.routes[0], railwayTrainsOf(reopened.map)[0]).read().profile, 'miniature');
  const invalid = JSON.parse(saved); invalid.railwayRoutes.trains[0].profile = 'giant';
  assert.throws(() => openDocument(JSON.stringify(invalid)), /World size or Miniature/);
});
