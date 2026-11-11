import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blankMap, createMapDocument, createBlockDocument, openDocument, validateMap, parseMap,
  createSave, parseSave, serializeSave, engineManifest, requiredMapFeatures, describeBlueprint,
  validateBlock, extractBlock, placeBlock, openBlock, rotateSceneryBlock, generateConnectedMap,
  planRailwayRoute, planRailwayTurnout, railwayStationAt, snapRailwayWaypoint, railwayCrossingsOf,
  RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_CROSSING_FEATURE
} from '@nautilus-engine/map-core';
import {sendMapToGame} from '../apps/editor/game-handoff.js';
import {createTinderboxScene} from '../packages/adapters/tinderbox/index.js';

const waypoints = [[12, 12], [24, 12], [32, 20], [32, 30], [43, 30]];
const envelope = (points = waypoints) => ({version: 1, routes: [{id: 'rail-1', waypoints: points}]});
const command = (points = waypoints, z = 0) => ({tool: 'railway-route', start: {z}, options: {waypoints: points}});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, a + ' vs ' + b);

test('heading snap fits cardinal and diagonal straights and tangent 45° and 90° arcs in either direction', () => {
  assert.deepEqual(snapRailwayWaypoint([10, 10], [19, 11]), [19, 10]);
  assert.deepEqual(snapRailwayWaypoint([10, 10], [4, 15]), [4, 16]);
  const plan = planRailwayRoute(waypoints);
  assert.deepEqual(plan.spans.map(span => span.kind), ['straight', 'curve', 'straight', 'curve', 'straight', 'curve', 'straight']);
  const curves = plan.spans.filter(span => span.kind === 'curve');
  assert.deepEqual(curves.map(span => Math.round(span.turn * 180 / Math.PI)), [45, 45, -90]);
  for (const span of curves) {
    const mid = railwayStationAt(plan, span.startM + span.lengthM / 2);
    for (const point of [span.a, [mid.x, mid.z], span.b]) {
      close(Math.hypot(point[0] - span.center[0], point[1] - span.center[1]), 4);
    }
  }
  for (let i = 1; i < plan.spans.length; i++) {
    const from = plan.spans[i - 1], to = plan.spans[i];
    assert.deepEqual(from.b, to.a);
    assert.deepEqual(from.outgoing, to.incoming);
    const join = railwayStationAt(plan, to.startM);
    close(join.x, to.a[0]);
    close(join.z, to.a[1]);
    close(join.s, to.incoming[0]);
    close(join.c, to.incoming[1]);
  }
  assert.equal(planRailwayRoute([[10, 10], [14, 10], [14, 14]]).spans.length, 1,
    'A 4 m by 4 m quarter turn fits exactly, as in the original kit.');
  assert.deepEqual(planRailwayRoute([...waypoints].reverse()).spans.map(span => span.lengthM.toFixed(8)),
    plan.spans.map(span => span.lengthM.toFixed(8)).reverse());
});

test('route refusals identify a bad heading, a short approach, a sharp turn, or a self crossing', () => {
  assert.throws(() => planRailwayRoute([[10, 10], [14, 12]]), /cardinal or 45°/);
  assert.throws(() => planRailwayRoute([[10, 10], [13, 10], [13, 15]]), /needs 4\.00 m/);
  assert.throws(() => planRailwayRoute([[10, 10], [18, 10], [12, 16]]), /too sharp/);
  assert.throws(() => planRailwayRoute([[20, 20], [40, 20], [40, 40], [20, 40], [20, 10]]), /crosses or doubles back/);
});

test('history, preview, export, save and inspection preserve only the versioned route source', () => {
  const doc = createMapDocument(), initial = doc.export();
  assert.ok(doc.preview(command()).railwayPreview.plan.stations.length);
  assert.equal(doc.export(), initial);
  assert.equal(doc.editor.undo.length, 0);
  assert.equal(doc.apply(command()).ok, true);
  assert.deepEqual(doc.map.railwayRoutes, envelope());
  assert.equal(doc.editor.undo.length, 1);
  assert.equal(doc.inspect(16, 12).type, 'railway-route');
  assert.notEqual(doc.inspect(16, 12, 1).type, 'railway-route');
  const authored = doc.export();
  assert.ok(doc.undo());
  assert.equal(doc.export(), initial);
  assert.ok(doc.redo());
  assert.equal(doc.export(), authored);
  assert.equal(openDocument(authored).export(), authored);
  assert.equal(describeBlueprint(authored).railwayRoutes, 1);
  assert.deepEqual(requiredMapFeatures(doc.map), [RAILWAY_ROUTE_FEATURE]);
  assert.deepEqual(parseSave(serializeSave(createSave(authored))).payload.data.railwayRoutes, envelope());
  assert.equal(doc.apply({tool: 'erase-railway-route', start: {z: 0}, options: {id: 'rail-1'}}).ok, true);
  assert.equal(doc.export(), initial);
  assert.ok(doc.undo());
  assert.equal(doc.export(), authored);
});

test('ballast clearance protects ground, existing geometry and the exact history before mutations', () => {
  const doc = createMapDocument();
  for (const [input, message] of [
    [command(waypoints, 1), /ground layer/],
    [command([[0, 12], [8, 12]]), /outside the map/],
    [command([[2, 6], [16, 6]]), /a character, marker/]
  ]) assert.match(doc.apply(input).error, message);
  assert.equal(doc.editor.undo.length, 0);
  assert.equal(doc.apply(command()).ok, true);
  const authored = doc.export(), before = doc.editor.undo.length;
  assert.match(doc.apply(command([[12, 14], [20, 14]])).error, /too close to rail-1/);
  assert.match(doc.apply(command([[17, 8], [17, 12]])).error, /Extend both straight approaches/);
  assert.match(doc.apply({tool:'water', start:{x:17, y:13, z:0}, options:{}}).error, /water/);
  const obstructed = JSON.parse(authored);
  obstructed.edges['e:17:12'] = 'wall';
  assert.match(validateMap(obstructed)[0], /wall, fence or door/);
  assert.throws(() => doc.open(JSON.stringify(obstructed)), /wall, fence or door/);
  assert.throws(() => doc.replace(blankMap('Generator replacement')), /does not support railway routes/);
  assert.equal(doc.export(), authored);
  assert.equal(doc.editor.undo.length, before);
});

test('old maps retain their shape and unsupported block, generation and consumer paths refuse before loss', () => {
  const blank = blankMap(), doc = createMapDocument();
  assert.deepEqual(requiredMapFeatures(blank), []);
  assert.equal(describeBlueprint(blank).railwayRoutes, undefined);
  assert.equal(createBlockDocument().apply(command()).ok, false);
  const block = extractBlock(blank);
  const unsupported = {...block, railwayRoutes: envelope()};
  assert.throws(() => openDocument(unsupported), /block format/);
  assert.throws(() => validateBlock(unsupported), /block format/);
  assert.throws(() => openBlock(unsupported), /block format/);
  assert.throws(() => rotateSceneryBlock(unsupported), /Block rotation/);
  assert.throws(() => placeBlock(blank, unsupported, 0, 0), /block format/);
  assert.throws(() => generateConnectedMap([unsupported]), /Connected map generation/);
  assert.throws(() => parseMap(JSON.stringify({version: 1, railwayRoutes: envelope()})), /legacy map format/);

  doc.apply(command());
  const {map} = doc, json = doc.export();
  assert.throws(() => extractBlock(map), /Block capture/);
  assert.throws(() => doc.capture(), /Block capture/);
  assert.throws(() => doc.place(block, 0, 0), /Block replacement/);
  const unsupportedManifest = engineManifest();
  unsupportedManifest.capabilities = unsupportedManifest.capabilities.filter(item => item.id !== RAILWAY_ROUTE_FEATURE);
  const neverOpen = () => assert.fail('Unsupported receiver was invoked.');
  assert.throws(() => sendMapToGame(json, {features: [], openMap: neverOpen}), /nautilus-railway-routes-v1/);
  assert.throws(() => sendMapToGame(json, {manifest: unsupportedManifest, openMap: neverOpen}), /nautilus-railway-routes-v1/);
  assert.throws(() => parseSave(createSave(json), {consumer: unsupportedManifest}), /nautilus-railway-routes-v1/);
  assert.throws(() => createTinderboxScene(json), error =>
    error.code === 'UNSUPPORTED_CAPABILITY' && /nautilus-railway-routes-v1/.test(error.message));
  const opened = sendMapToGame(json, {features: [RAILWAY_ROUTE_FEATURE], openMap: payload => JSON.parse(payload.json)});
  assert.deepEqual(opened.railwayRoutes, envelope());
});

test('a split leaves the main line intact, mirrors in either direction, and needs enough straight track', () => {
  const plan = planRailwayRoute([[50, 65], [78, 65]]);
  for (const [end, sign, forward] of [[[72, 75], 1, 1], [[72, 55], -1, 1], [[52, 75], -1, -1]]) {
    const split = planRailwayTurnout(plan, {at: [62, 65], end});
    const {spans, stations} = split.plan;
    assert.deepEqual(split.incoming.map(n => n || 0), [forward, 0]);
    close(spans[0].turn, sign * Math.PI / 4);
    close(stations[0].z, 65);
    close(stations[0].s, forward);
    close(stations[0].c, 0);
    assert.deepEqual([stations.at(-1).x, stations.at(-1).z], end);
  }
  assert.throws(() => planRailwayTurnout(plan, {at: [51, 65], end: [61, 75]}), /straight track behind/);
  assert.throws(() => planRailwayTurnout(plan, {at: [62, 65], end: [62, 75]}), /leaves the main line at 45°/);
});

test('a split is one undoable save change with its own capability and respects other tracks', () => {
  const doc = createMapDocument();
  const points = [[50, 65], [78, 65]], turnout = {at: [62, 65], end: [72, 75]};
  assert.ok(doc.apply(command(points)).ok);
  const plain = doc.export();
  assert.deepEqual(JSON.parse(plain).railwayRoutes, envelope(points));
  const split = {tool: 'railway-turnout', start: {z: 0}, options: {id: 'rail-1', turnout}};
  assert.ok(doc.apply(command([[62, 72], [82, 72]])).ok);
  const before = doc.export(), history = doc.editor.undo.length;
  assert.match(doc.apply(split).error, /crosses or is too close/);
  assert.equal(doc.export(), before);
  assert.equal(doc.editor.undo.length, history);
  assert.ok(doc.undo());

  const preview = doc.preview(split);
  assert.equal(preview.railwayPreview.replaces, 'rail-1');
  assert.equal(doc.export(), plain);
  assert.ok(doc.apply(split).ok);
  const saved = doc.export();
  const data = {version: 2, routes: [{id: 'rail-1', waypoints: points, turnout}]};
  assert.deepEqual(doc.map.railwayRoutes, data);
  assert.deepEqual(openDocument(saved).map.railwayRoutes, data);
  assert.deepEqual(parseSave(serializeSave(createSave(saved))).payload.data.railwayRoutes, data);
  assert.equal(doc.inspect(71, 74).data.id, 'rail-1');
  assert.deepEqual(requiredMapFeatures(doc.map), [RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE]);
  assert.throws(() => sendMapToGame(saved, {
    features: [RAILWAY_ROUTE_FEATURE], openMap: () => assert.fail('Old railway host accepted a split.')
  }), /nautilus-railway-turnouts-v1/);
  assert.ok(doc.undo());
  assert.equal(doc.export(), plain);
  assert.ok(doc.redo());
  assert.equal(doc.export(), saved);
  assert.ok(doc.apply({tool: 'erase-railway-turnout', start: {z: 0}, options: {id: 'rail-1'}}).ok);
  assert.equal(doc.export(), plain);
});

test('a crossing fits automatically and saves both original routes without linking them', () => {
  const doc = createMapDocument();
  const main = [[45, 50], [75, 50]], diagonal = [[52, 42], [69, 59]];
  assert.ok(doc.apply(command(main)).ok);
  const original = doc.export(), history = doc.editor.undo.length;
  const draft = doc.preview(command(diagonal));
  assert.equal(draft.ok, true);
  assert.deepEqual(draft.railwayPreview.crossings.map(c => [c.point, c.angleDeg]), [[[60, 50], 45]]);
  assert.equal(doc.export(), original);
  assert.equal(doc.editor.undo.length, history);
  assert.ok(doc.apply(command(diagonal)).ok);
  const saved = doc.export();
  assert.deepEqual(doc.map.railwayRoutes, {version: 3, routes: [
    {id: 'rail-1', waypoints: main}, {id: 'rail-2', waypoints: diagonal}
  ]});
  assert.deepEqual(railwayCrossingsOf(openDocument(saved).map), draft.railwayPreview.crossings);
  assert.equal(doc.inspect(61, 51).data.id, 'rail-2', 'Pick the nearer centreline inside the overlapping ballast.');
  assert.equal(doc.inspect(61, 50).data.id, 'rail-1');
  assert.deepEqual(requiredMapFeatures(doc.map), [RAILWAY_ROUTE_FEATURE, RAILWAY_CROSSING_FEATURE]);
  assert.throws(() => sendMapToGame(saved, {
    features: [RAILWAY_ROUTE_FEATURE], openMap: () => assert.fail('A plain railway host accepted a crossing.')
  }), /nautilus-railway-crossings-v1/);
  assert.equal(doc.editor.undo.length, history + 1);
  assert.ok(doc.undo());
  assert.equal(doc.export(), original);
  assert.ok(doc.redo());
  assert.equal(doc.export(), saved);
  assert.deepEqual(parseSave(serializeSave(createSave(saved))).payload.data, doc.map);

  const downgraded = JSON.parse(saved);
  downgraded.railwayRoutes.version = 1;
  assert.throws(() => openDocument(downgraded), /crosses or is too close/);
  assert.ok(doc.apply({tool: 'railway-turnout', start: {z: 0},
    options: {id: 'rail-1', turnout: {at: [68, 50], end: [78, 60]}}}).ok);
  assert.deepEqual(requiredMapFeatures(doc.map), [RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_CROSSING_FEATURE]);
  assert.ok(doc.apply({tool: 'erase-railway-route', start: {z: 0}, options: {id: 'rail-2'}}).ok);
  assert.equal(doc.map.railwayRoutes.version, 2);
  assert.deepEqual(doc.map.railwayRoutes.routes[0].waypoints, main);
  assert.deepEqual(railwayCrossingsOf(doc.map), []);
});

test('crossings use the true half-metre intersection and only waive clearance on the two approaches', () => {
  const angled = createMapDocument();
  for (const points of [[[46, 46], [74, 74]], [[74, 45], [45, 74]]]) assert.ok(angled.apply(command(points)).ok);
  assert.deepEqual(railwayCrossingsOf(angled.map).map(c => [c.point, c.angleDeg]), [[[59.5, 59.5], 90]]);
  const reversed = structuredClone(angled.map);
  reversed.railwayRoutes.routes.reverse();
  assert.deepEqual(railwayCrossingsOf(reversed), railwayCrossingsOf(angled.map));

  const doc = createMapDocument();
  assert.ok(doc.apply(command([[45, 50], [75, 50]])).ok);
  assert.match(doc.apply(command([[55, 41], [55, 61], [72, 61], [72, 51]])).error, /crosses or is too close/,
    'A valid crossing must not exempt a near miss elsewhere between the same routes.');
  assert.ok(doc.apply(command([[60, 35], [60, 70]])).ok);
  assert.deepEqual(railwayCrossingsOf(doc.map).map(c => [c.point, c.angleDeg]), [[[60, 50], 90]]);
  const before = doc.export(), history = doc.editor.undo.length;
  assert.match(doc.apply(command([[52, 42], [69, 59]])).error, /separate approaches/);
  assert.equal(doc.export(), before);
  assert.equal(doc.editor.undo.length, history);
});
