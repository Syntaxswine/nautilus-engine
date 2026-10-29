import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ENGINE_VERSION, MAP_CONTRACT, openDocument, describeBlueprint, engineManifest, createMapDocument, placeBuilding, requiredMapFeatures,
  FEATURE_IDS, ROOF_FEATURE, CompatibilityError} from '../packages/map-core/index.js';
import {exampleYard} from '../packages/map-core/example.js';
import {createGameHandoff} from '../apps/editor/game-handoff.js';

// Execute the real page bridge with DOM and editor doubles, as building-library-lifecycle.test.mjs
// executes buildings.js, so the page's own glue runs under test: the default export, the refresh,
// the getter and every member of window.nautilus. The browser acceptance repeats the sends on the
// real editor.
const BRIDGE_IMPORTS = {ENGINE_VERSION, MAP_CONTRACT, openDocument, describeBlueprint, engineManifest, exampleYard, createGameHandoff};
const LIBRARIES = ['installAssetLibrary', 'installBuildingLibrary'];
const source = await readFile(new URL('../apps/editor/editor.js', import.meta.url), 'utf8');
const imports = source.match(/^import .*;/gm), named = [...source.matchAll(/^import \{([^}]*)\} from /gm)];
const imported = named.flatMap(match => match[1].split(',').map(name => name.trim()));
const runBridge = new Function('d', `'use strict';const {${[...Object.keys(BRIDGE_IMPORTS), ...LIBRARIES, 'document', 'window', 'MutationObserver', 'confirm'].join(', ')}} = d;\n${source.replace(/^import .*;\r?\n/gm, '')}`);

// The page as the bridge finds it: in the real editor the tools, the Send buttons and the settings
// heading already exist when app/editor.js runs (measured in the browser).
function page() {
  const nodes = new Map(), observers = [], installed = [];
  class Element {
    constructor(tag, id) {this.tagName = tag.toUpperCase(); this.children = []; this.textContent = ''; this.title = ''; this.disabled = false; if (id) {this.id = id; nodes.set(id, this);}}
    append(...children) {for (const child of children) {this.children.push(child); if (child.id) nodes.set(child.id, child);}}
    setAttribute() {} addEventListener() {} showModal() {}
  }
  class MutationObserver {
    constructor(callback) {this.callback = callback; this.targets = []; observers.push(this);}
    observe(target) {this.targets.push(target);} disconnect() {this.targets = [];}
  }
  const body = new Element('body'), heading = new Element('div'), properties = new Element('section');
  for (const id of ['status', 'playtest', 'quick-playtest', 'nautilus-options', 'nautilus-example', 'nautilus-help']) new Element(id === 'status' ? 'p' : 'button', id);
  const document = {body, getElementById: id => nodes.get(id), createElement: tag => new Element(tag), addEventListener() {},
    querySelector: selector => ({'#editor-settings .settings-heading': heading, '.properties': properties})[selector]};
  const window = {};
  runBridge({...BRIDGE_IMPORTS, ...Object.fromEntries(LIBRARIES.map(name => [name, () => installed.push(name)])), document, window, MutationObserver, confirm: () => true});
  const send = nodes.get('playtest'), quick = nodes.get('quick-playtest');
  // The editor's own sync sets the Send button's disabled state; the bridge observes it and reapplies its rule.
  const editorSync = disabled => {send.disabled = disabled; for (const observer of observers) if (observer.targets.includes(send)) observer.callback([]);};
  return {N: window.nautilus, window, nodes, observers, body, installed, send, quick, editorSync};
}

const editorMap = name => JSON.parse(createMapDocument(name).export());
// A map that needs all four authored features, written so that its validated export differs from it.
function featureMap() {
  const map = placeBuilding(editorMap('Bridge yard'), {asset: 'violet-bay-house', x: 100, y: 60, turns: 1, clearance: 2}).map;
  map.wallRuns = {version: 1, segments: [{id: 'wall-1', a: [40, 40], b: [46, 40], z: 0, stories: 1, material: 'brick'}]};
  map.slopedRoofs = {version: 1, roofs: [{id: 'roof-1', x: 150, y: 150, width: 6, depth: 8, z: 1, style: 'gable', axis: 'x', pitch: 35, overhang: 0.3, material: 'slate', seed: 7}]};
  return JSON.stringify(map);
}
const host = declaration => {
  const calls = [], adapter = {...declaration, openMap(handoff) { calls.push({handoff, self: this}); return 'opened'; }};
  return {calls, adapter};
};
const roofless = () => {const manifest = engineManifest(); manifest.id = 'host-without-roofs'; manifest.capabilities = manifest.capabilities.filter(feature => feature.id !== ROOF_FEATURE); return manifest;};
const SEND = 'Send a validated copy; keep the blueprint here.', EXPORT = 'Export JSON for a game, or connect a game adapter.';

test('the page bridge installs both libraries and exposes the engine before any host connects', () => {
  assert.equal(named.length, imports.length, 'Every import of the bridge is a named import');
  assert.deepEqual(imported.sort(), [...Object.keys(BRIDGE_IMPORTS), ...LIBRARIES].sort(), 'The doubles cover every import of the bridge');
  const ui = page(), {N} = ui;
  assert.deepEqual(ui.installed, LIBRARIES);
  assert.equal(N.version, ENGINE_VERSION); assert.equal(N.contract, MAP_CONTRACT); assert.deepEqual(N.manifest, engineManifest());
  assert.equal(N.document, undefined); assert.equal(N.hasGameAdapter, false);
  assert.throws(() => N.export(), {message: 'The editor is still loading.'});
  assert.equal(ui.send.disabled, true); assert.equal(ui.send.title, EXPORT);
  assert.deepEqual([ui.quick.disabled, ui.quick.title], [true, EXPORT], 'The quick Send button mirrors Send');
  const status = ui.nodes.get('status'), feedback = ui.nodes.get('nautilus-settings-feedback');
  assert.deepEqual([feedback.textContent, feedback.hidden], ['', true], 'An empty status hides the settings feedback');
  status.textContent = 'Map sent.'; for (const observer of ui.observers.filter(observer => observer.targets.includes(status))) observer.callback([]);
  assert.deepEqual([feedback.textContent, feedback.hidden], ['Map sent.', false], 'Settings show the status');
  // The first change to the page refreshes once more, then the bridge stops observing the body.
  for (const observer of ui.observers.filter(observer => observer.targets.includes(ui.body))) observer.callback([]);
  assert.equal(ui.observers.some(observer => observer.targets.includes(ui.body)), false, 'The bridge stops observing the body once Send exists');
});

test('the Send buttons follow the connected host, and each refresh sees the new state', () => {
  const ui = page(), {N} = ui, json = featureMap();
  ui.window.editor3d = {document: {block: false, export: () => json}};
  const disconnect = N.connectGame(host({manifest: engineManifest()}).adapter);
  assert.equal(N.hasGameAdapter, true);
  assert.deepEqual([ui.send.disabled, ui.send.title, ui.quick.disabled, ui.quick.title], [false, SEND, false, SEND], 'Connecting enables Send');
  ui.editorSync(true); assert.equal(ui.send.disabled, false, 'The bridge reapplies its rule after the editor sync');
  ui.window.editor3d.document.block = true; ui.editorSync(false);
  assert.equal(ui.send.disabled, true, 'A block cannot be sent, even with a host connected');
  ui.window.editor3d.document.block = false; ui.editorSync(true);
  disconnect();
  assert.equal(N.hasGameAdapter, false);
  assert.deepEqual([ui.send.disabled, ui.send.title, ui.quick.disabled, ui.quick.title], [true, EXPORT, true, EXPORT], 'Disconnecting disables Send');
  ui.editorSync(false); assert.equal(ui.send.disabled, true, 'With no host the bridge keeps Send disabled');
});

test('window.nautilus.sendToGame sends the current validated export, or the map it is given, and never reaches an incapable host', () => {
  const ui = page(), {N} = ui, json = featureMap(), validated = openDocument(json).export();
  const other = JSON.parse(json); other.name = 'Explicit yard'; const otherJson = JSON.stringify(other);
  assert.notEqual(json, validated, 'Precondition: the editor export differs from its validated copy');
  ui.window.editor3d = {document: {block: false, export: () => json}};
  assert.equal(N.export(), json); assert.equal(N.document, ui.window.editor3d.document);
  assert.throws(() => N.sendToGame(), {message: 'Connect a game adapter first.'});
  const lacking = [[{manifest: roofless()}, ROOF_FEATURE], [{features: [FEATURE_IDS.walls, FEATURE_IDS.prefabs, FEATURE_IDS.slopedRoofs]}, FEATURE_IDS.originalBuildings], [{}, FEATURE_IDS.walls]];
  for (const [declaration, feature] of lacking) {
    assert.ok(requiredMapFeatures(JSON.parse(json)).includes(feature), 'Precondition: the map needs ' + feature);
    const incapable = host(declaration), disconnect = N.connectGame(incapable.adapter);
    for (const args of [[], [otherJson]]) assert.throws(() => N.sendToGame(...args), error => error.message.includes(feature), 'sendToGame(' + (args.length ? 'json' : '') + ') refuses a host without ' + feature);
    if (declaration.manifest) assert.throws(() => N.sendToGame(), error => error instanceof CompatibilityError && error.diagnostics.some(item => item.code === 'UNSUPPORTED_REQUIRED_FEATURE' && item.feature === feature));
    assert.equal(incapable.calls.length, 0, 'A host without ' + feature + ' is never called'); disconnect();
  }
  const capable = host({manifest: engineManifest()}), disconnect = N.connectGame(capable.adapter);
  assert.equal(N.sendToGame(), 'opened');
  assert.equal(N.sendToGame(otherJson), 'opened');
  assert.deepEqual(capable.calls.map(call => [call.handoff.json, call.handoff.contract, call.self]), [[validated, MAP_CONTRACT, capable.adapter], [openDocument(otherJson).export(), MAP_CONTRACT, capable.adapter]],
    'sendToGame() sends the validated current export; sendToGame(json) sends that map');
  delete ui.window.editor3d;
  assert.throws(() => N.sendToGame(), {message: 'The editor is still loading.'}); assert.equal(capable.calls.length, 2);
  disconnect(); assert.throws(() => N.sendToGame(otherJson), {message: 'Connect a game adapter first.'}); assert.equal(capable.calls.length, 2);
});

test('window.nautilus.open loads a validated document into the editor and describes it', async () => {
  const ui = page(), json = featureMap(), opened = [];
  ui.window.editor3d = {async open(document) {opened.push(document);}};
  assert.deepEqual(await ui.N.open(json), describeBlueprint(openDocument(json).export()));
  assert.equal(opened.length, 1); assert.equal(opened[0].export(), openDocument(json).export());
  await assert.rejects(ui.N.open('{'), SyntaxError); assert.equal(opened.length, 1, 'Malformed JSON never reaches the editor');
});
