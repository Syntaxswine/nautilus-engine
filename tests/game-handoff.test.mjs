import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapDocument, createBlockDocument, openDocument, placeBuilding, engineManifest, requiredMapFeatures,
  MAP_CONTRACT, FEATURE_IDS, ROOF_FEATURE, CompatibilityError} from '../packages/map-core/index.js';
import {checkGameAdapter, sendMapToGame, createGameHandoff} from '../apps/editor/game-handoff.js';

const editorMap = name => JSON.parse(createMapDocument(name).export());
const wallRuns = () => ({version: 1, segments: [{id: 'wall-1', a: [40, 40], b: [46, 40], z: 0, stories: 1, material: 'brick'}]});
const slopedRoofs = () => ({version: 1, roofs: [{id: 'roof-1', x: 150, y: 150, width: 6, depth: 8, z: 1, style: 'gable', axis: 'x', pitch: 35, overhang: 0.3, material: 'slate', seed: 7}]});
// A map that needs all four authored features: wall runs, prefab buildings, original buildings and sloped roofs.
function featureMap() {
  const map = placeBuilding(editorMap('Handoff yard'), {asset: 'violet-bay-house', x: 100, y: 60, turns: 1, clearance: 2}).map;
  map.wallRuns = wallRuns(); map.slopedRoofs = slopedRoofs();
  return JSON.stringify(map);
}
// Maps that need exactly one feature each, so a host that declares nothing must be refused for that feature.
const singleFeatureMaps = () => ({
  [FEATURE_IDS.walls]: {...editorMap('Walls only'), wallRuns: wallRuns()},
  [FEATURE_IDS.prefabs]: placeBuilding(editorMap('Prefab only'), {asset: 'albany-cottage', x: 100, y: 60, turns: 0, clearance: 2}).map,
  [FEATURE_IDS.slopedRoofs]: {...editorMap('Roofs only'), slopedRoofs: slopedRoofs()}
});
// A map that opens but fails validation: its exit is ringed by water.
function unreachableMap() {
  const map = editorMap('Unreachable'); map.exits = [{x: 30, y: 30, z: 0}];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) map.terrain[30 + dy][30 + dx] = 'water';
  return JSON.stringify(map);
}
// A stub host that records every handoff it receives and the `this` it was called with.
const host = declaration => {
  const calls = [], adapter = {...declaration, openMap(handoff) { calls.push({handoff, self: this}); return 'opened'; }};
  return {calls, adapter};
};

test('the game handoff never calls a host that lacks an authored feature', () => {
  const json = featureMap();
  assert.deepEqual(requiredMapFeatures(JSON.parse(json)), [FEATURE_IDS.walls, FEATURE_IDS.prefabs, FEATURE_IDS.originalBuildings, FEATURE_IDS.slopedRoofs], 'Precondition: the map needs all four features');
  const manifest = engineManifest(); manifest.id = 'host-without-roofs'; manifest.capabilities = manifest.capabilities.filter(feature => feature.id !== ROOF_FEATURE);
  const versioned = host({manifest});
  assert.throws(() => sendMapToGame(json, versioned.adapter), error => error instanceof CompatibilityError && error.diagnostics.some(item => item.code === 'UNSUPPORTED_REQUIRED_FEATURE' && item.feature === ROOF_FEATURE));
  assert.equal(versioned.calls.length, 0, 'A versioned host without roofs is never called');
  const listed = host({features: [FEATURE_IDS.walls, FEATURE_IDS.prefabs, FEATURE_IDS.slopedRoofs]});
  assert.throws(() => sendMapToGame(json, listed.adapter), error => error.message.includes(FEATURE_IDS.originalBuildings));
  assert.equal(listed.calls.length, 0, 'A feature-list host without original buildings is never called');
  for (const [feature, map] of Object.entries(singleFeatureMaps())) {
    assert.deepEqual(requiredMapFeatures(map), [feature], 'Precondition: the map needs only ' + feature);
    const silent = host({});
    assert.throws(() => sendMapToGame(JSON.stringify(map), silent.adapter), error => error.message.includes(feature), 'A host that declares nothing is refused for ' + feature);
    assert.equal(silent.calls.length, 0, 'A host that declares nothing is never called for ' + feature);
  }
});

test('a map that fails validation reaches no host, however capable', () => {
  const json = unreachableMap();
  for (const declaration of [{manifest: engineManifest()}, {features: Object.values(FEATURE_IDS)}]) {
    const capable = host(declaration);
    assert.throws(() => sendMapToGame(json, capable.adapter), /Unreachable start, marker or patrol waypoint at 30,30/);
    assert.equal(capable.calls.length, 0);
  }
});

test('a host that declares every authored feature receives exactly one validated copy', () => {
  const json = featureMap(), validated = openDocument(json).export();
  assert.notEqual(json, validated, 'Precondition: the raw input differs from the validated export');
  for (const declaration of [{manifest: engineManifest()}, {features: requiredMapFeatures(JSON.parse(json))}]) {
    const accepting = host(declaration);
    assert.equal(sendMapToGame(json, accepting.adapter), 'opened');
    assert.equal(accepting.calls.length, 1);
    const [{handoff, self}] = accepting.calls;
    assert.equal(self, accepting.adapter, 'openMap is called on its host');
    assert.equal(handoff.json, validated, 'The host receives the validated export, not the raw input');
    assert.deepEqual(JSON.parse(handoff.json), JSON.parse(json), 'The export carries the authored map');
    assert.equal(handoff.contract, MAP_CONTRACT);
  }
});

test('the handoff refuses a missing host, a block and a malformed adapter before any call', () => {
  assert.throws(() => sendMapToGame(featureMap(), null), /Connect a game adapter first/);
  const blockHost = host({manifest: engineManifest()});
  assert.throws(() => sendMapToGame(createBlockDocument('Handoff block').export(), blockHost.adapter), /Place this block in a full map first/);
  assert.equal(blockHost.calls.length, 0);
  for (const malformed of [null, undefined, {}, {features: []}, {openMap: 'not a function'}])
    assert.throws(() => checkGameAdapter(malformed), {name: 'TypeError', message: 'A game adapter needs openMap({json, contract}).'});
  const adapter = {openMap() {}}; assert.equal(checkGameAdapter(adapter), adapter);
});

test('the editor handoff state sends the current export by default, and only its own disconnect clears it', () => {
  const json = featureMap(), features = requiredMapFeatures(JSON.parse(json));
  let current = json, exports = 0, changes = 0;
  const handoff = createGameHandoff({exportMap: () => { exports++; return current; }, onChange: () => changes++});
  assert.equal(handoff.hasGameAdapter, false);
  assert.throws(() => handoff.sendToGame(), /Connect a game adapter first/);
  assert.throws(() => handoff.connectGame({}), TypeError);
  assert.equal(handoff.hasGameAdapter, false); assert.equal(changes, 0, 'A refused adapter changes nothing');
  const first = host({features}), disconnectFirst = handoff.connectGame(first.adapter);
  assert.equal(handoff.hasGameAdapter, true); assert.equal(changes, 1);
  // With no argument the current export is sent; with one, that map is sent and nothing is exported.
  exports = 0; assert.equal(handoff.sendToGame(), 'opened'); assert.equal(exports, 1);
  const named = JSON.parse(json); named.name = 'Explicit map'; current = '{"not": "this map"}'; exports = 0;
  assert.equal(handoff.sendToGame(JSON.stringify(named)), 'opened'); assert.equal(exports, 0, 'An explicit map skips the export');
  assert.equal(JSON.parse(first.calls[1].handoff.json).name, 'Explicit map');
  // A newer host replaces the first. The first host's disconnect is then stale and keeps the newer one.
  const second = host({manifest: engineManifest()}), disconnectSecond = handoff.connectGame(second.adapter);
  disconnectFirst(); assert.equal(handoff.hasGameAdapter, true); assert.equal(changes, 2, 'A stale disconnect changes nothing');
  current = json; handoff.sendToGame(); assert.equal(second.calls.length, 1); assert.equal(first.calls.length, 2);
  disconnectSecond(); assert.equal(handoff.hasGameAdapter, false); assert.equal(changes, 3);
  disconnectSecond(); assert.equal(changes, 3, 'A second disconnect is a no-op');
  assert.throws(() => handoff.sendToGame(), /Connect a game adapter first/);
  // Sends through this state still meet the capability checks.
  const roofless = engineManifest(); roofless.id = 'host-without-roofs'; roofless.capabilities = roofless.capabilities.filter(feature => feature.id !== ROOF_FEATURE);
  const refused = host({manifest: roofless}); handoff.connectGame(refused.adapter);
  assert.throws(() => handoff.sendToGame(), CompatibilityError); assert.equal(refused.calls.length, 0, 'An incapable host connected here is never called');
});
