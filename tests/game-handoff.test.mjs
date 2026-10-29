import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapDocument, createBlockDocument, openDocument, placeBuilding, engineManifest, requiredMapFeatures,
  MAP_CONTRACT, FEATURE_IDS, ROOF_FEATURE, CompatibilityError} from '../packages/map-core/index.js';
import {checkGameAdapter, sendMapToGame} from '../apps/editor/game-handoff.js';

// A map that needs three authored features: prefab buildings, original buildings and sloped roofs.
function featureMap() {
  let map = JSON.parse(createMapDocument('Handoff yard').export());
  map = placeBuilding(map, {asset: 'violet-bay-house', x: 100, y: 60, turns: 1, clearance: 2}).map;
  map.slopedRoofs = {version: 1, roofs: [{id: 'roof-1', x: 150, y: 150, width: 6, depth: 8, z: 1, style: 'gable', axis: 'x', pitch: 35, overhang: 0.3, material: 'slate', seed: 7}]};
  return JSON.stringify(map);
}
// A stub host that records every handoff it receives.
const host = declaration => { const calls = []; return {calls, adapter: {...declaration, openMap(handoff) { calls.push(handoff); return 'opened'; }}}; };

test('the game handoff never calls a host that lacks an authored feature', () => {
  const json = featureMap();
  assert.deepEqual(requiredMapFeatures(JSON.parse(json)), [FEATURE_IDS.prefabs, FEATURE_IDS.originalBuildings, FEATURE_IDS.slopedRoofs], 'Precondition: the map needs three features');
  const manifest = engineManifest(); manifest.id = 'host-without-roofs'; manifest.capabilities = manifest.capabilities.filter(feature => feature.id !== ROOF_FEATURE);
  const versioned = host({manifest});
  assert.throws(() => sendMapToGame(json, versioned.adapter), error => error instanceof CompatibilityError && error.diagnostics.some(item => item.code === 'UNSUPPORTED_REQUIRED_FEATURE' && item.feature === ROOF_FEATURE));
  assert.equal(versioned.calls.length, 0, 'A versioned host without roofs is never called');
  const listed = host({features: [FEATURE_IDS.prefabs, FEATURE_IDS.slopedRoofs]});
  assert.throws(() => sendMapToGame(json, listed.adapter), /original building prefabs/);
  assert.equal(listed.calls.length, 0, 'A feature-list host without original buildings is never called');
  const silent = host({});
  assert.throws(() => sendMapToGame(json, silent.adapter), /does not support/);
  assert.equal(silent.calls.length, 0, 'A host that declares nothing is never called');
});

test('a host that declares every authored feature receives exactly one validated copy', () => {
  const json = featureMap();
  for (const declaration of [{manifest: engineManifest()}, {features: requiredMapFeatures(JSON.parse(json))}]) {
    const accepting = host(declaration);
    assert.equal(sendMapToGame(json, accepting.adapter), 'opened');
    assert.equal(accepting.calls.length, 1);
    assert.equal(accepting.calls[0].json, openDocument(json).export(), 'The host receives the validated export, not the raw input');
    assert.deepEqual(JSON.parse(accepting.calls[0].json), JSON.parse(json), 'The export carries the authored map');
    assert.equal(accepting.calls[0].contract, MAP_CONTRACT);
  }
});

test('the handoff refuses a missing host, a block and a malformed adapter before any call', () => {
  assert.throws(() => sendMapToGame(featureMap(), null), /Connect a game adapter first/);
  const blockHost = host({manifest: engineManifest()});
  assert.throws(() => sendMapToGame(createBlockDocument('Handoff block').export(), blockHost.adapter), /Place this block in a full map first/);
  assert.equal(blockHost.calls.length, 0);
  assert.throws(() => checkGameAdapter({features: []}), TypeError);
  const adapter = {openMap() {}}; assert.equal(checkGameAdapter(adapter), adapter);
});
