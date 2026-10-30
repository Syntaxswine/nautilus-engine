import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ENGINE_VERSION, MAP_CONTRACT, openDocument, describeBlueprint, engineManifest, createMapDocument, placeBuilding, requiredMapFeatures,
  FEATURE_IDS, ROOF_FEATURE, CompatibilityError} from '../packages/map-core/index.js';
import {exampleYard} from '../packages/map-core/example.js';
import {createGameHandoff} from '../apps/editor/game-handoff.js';
import {adaptWallEditor} from '../tools/editor-wall-adapter.mjs';
import {LAUNCH_PLAYTEST, SEND_CLICK} from '../tools/editor-game-handoff.mjs';

// Execute the real page bridge with DOM and editor doubles, as building-library-lifecycle.test.mjs
// executes buildings.js, so the page's own glue runs under test: the default export, the refresh,
// the getter, the observers and every member of window.nautilus. The browser acceptance repeats the
// sends on the real editor.
const BRIDGE_IMPORTS = {ENGINE_VERSION, MAP_CONTRACT, openDocument, describeBlueprint, engineManifest, exampleYard, createGameHandoff};
const LIBRARIES = ['installAssetLibrary', 'installBuildingLibrary'];
const FLOOR_IMPORTS = ['installEditorFloorNavigation'];
const bridgeURL = new URL('../apps/editor/editor.js', import.meta.url);
const source = await readFile(bridgeURL, 'utf8');
const imports = source.match(/^import .*;/gm), named = [...source.matchAll(/^import \{([^}]*)\} from /gm)];
const imported = named.flatMap(match => match[1].split(',').map(name => name.trim()));
// The composed bridge also resolves its help link against its actual module URL.
const bridgeBody = source.replace(/^import .*;\r?\n/gm, '').replaceAll('import.meta.url', JSON.stringify(bridgeURL.href));
const runBridge = new Function('d', `'use strict';const {${[...Object.keys(BRIDGE_IMPORTS), ...LIBRARIES, ...FLOOR_IMPORTS, 'document', 'window', 'MutationObserver', 'confirm'].join(', ')}} = d;\n${bridgeBody}`);

// The page as the bridge finds it: in the real editor the tools, the Send buttons and the settings
// heading already exist when app/editor.js runs (measured in the browser). The double keeps what the
// bridge's observers rely on, as the DOM defines it:
// - Writing textContent or innerHTML, or appending, queues a childList record when a node is added or
//   removed, and writing a text node's data queues a characterData record. Setting an attribute queues
//   an attributes record even when its value is unchanged; removing one queues a record only when it
//   was present. disabled, hidden and title reflect their attributes.
// - An observer receives only what its options select: its target, or a descendant under subtree,
//   for a type it observes and an attribute its filter names.
// - Records are delivered after the step, in a microtask, to the observers that had records pending
//   when it ran. Each record counts the deliveries that led to it, and the LOOP-th delivery from one
//   write fails the test. An observer that re-triggers itself never settles and freezes the browser;
//   a finite cascade of LOOP or more deliveries, which a browser would settle, fails here too.
const LOOP = 10, pages = new Set();
// Each test is bounded, so a fault that leaves the test waiting on a promise ends that test as
// cancelled instead of holding the suite open. The slowest test took 7.8 s in a quiet full-suite run
// and 19.6 s under 16 busy loops (round 5 of the review); the bound is six times that.
const BOUND = {timeout: 120000};
test.afterEach(async () => {const open = [...pages]; pages.clear(); for (const ui of open) await ui.settle();});
async function page() {
  const observers = [], errors = [], installed = [], floorCalls = [];
  const floorBinding = Object.freeze({kind: 'test-floor-binding'});
  let queued = false, depth = 0;
  const describe = item => (item.target.tagName ? '#' + (item.target.id || item.target.tagName.toLowerCase()) : 'a text node') + ' ' + item.type + (item.attributeName ? ' (' + item.attributeName + ')' : '');
  function record(target, type, attributeName = null) {
    const interested = new Set();
    for (let node = target; node; node = node.parentNode) for (const observer of observers) {
      const options = observer.registrations.get(node);
      if (!options || (node !== target && !options.subtree) || !options[type]) continue;
      if (type === 'attributes' && options.attributeFilter && !options.attributeFilter.includes(attributeName)) continue;
      interested.add(observer);
    }
    for (const observer of interested) observer.records.push({type, target, attributeName, depth: depth + 1});
    if (interested.size && !queued) {queued = true; queueMicrotask(notify);}
  }
  // As the DOM does, notify the observers that had records pending when the microtask ran, in creation
  // order. An observer that first receives a record during the pass waits for the next microtask.
  function notify() {
    queued = false;
    for (const observer of observers.filter(observer => observer.records.length)) {
      const records = observer.records.splice(0);
      if (!records.length) continue;
      const deepest = Math.max(...records.map(item => item.depth));
      if (deepest >= LOOP) {errors.push(Error(`A page observer exceeded the test's cascade bound and may be self-retriggering: one write was delivered ${LOOP} times, last as ${describe(records.at(-1))}.`)); continue;}
      depth = deepest;
      try {observer.callback(records, observer);} catch (error) {errors.push(error);} finally {depth = 0;}
    }
  }
  class MutationObserver {
    constructor(callback) {this.callback = callback; this.registrations = new Map(); this.records = []; observers.push(this);}
    // observe()'s option rules: an old value or a filter implies its type, at least one type must be
    // observed, and an option for a type set to false is refused.
    observe(target, options = {}) {
      const selected = {...options};
      if ((selected.attributeOldValue !== undefined || selected.attributeFilter !== undefined) && selected.attributes === undefined) selected.attributes = true;
      if (selected.characterDataOldValue !== undefined && selected.characterData === undefined) selected.characterData = true;
      if (!selected.childList && !selected.attributes && !selected.characterData) throw new TypeError('MutationObserver.observe needs childList, attributes or characterData.');
      if ((selected.attributeOldValue || selected.attributeFilter !== undefined) && !selected.attributes) throw new TypeError('An attribute option needs attributes.');
      if (selected.characterDataOldValue && !selected.characterData) throw new TypeError('characterDataOldValue needs characterData.');
      this.registrations.set(target, selected);
    }
    disconnect() {this.registrations.clear(); this.records = [];}
  }
  // Writing a text node's data queues a characterData record on it.
  class Text {constructor(data) {this.value = data; this.parentNode = null;} get data() {return this.value;} set data(value) {this.value = String(value); record(this, 'characterData');} get textContent() {return this.value;}}
  class Element {
    constructor(tag, id) {this.tagName = tag.toUpperCase(); this.childNodes = []; this.parentNode = null; this.attributes = new Map(); this.classes = new Set(); if (id) this.attributes.set('id', id);}
    get children() {return this.childNodes.filter(node => node instanceof Element);}
    getAttribute(name) {return this.attributes.get(name) ?? null;}
    setAttribute(name, value) {this.attributes.set(name, String(value)); record(this, 'attributes', name);}
    removeAttribute(name) {if (this.attributes.delete(name)) record(this, 'attributes', name);}
    get id() {return this.getAttribute('id') ?? '';} set id(value) {this.setAttribute('id', value);}
    get title() {return this.getAttribute('title') ?? '';} set title(value) {this.setAttribute('title', value);}
    get disabled() {return this.attributes.has('disabled');} set disabled(value) {if (value) this.setAttribute('disabled', ''); else this.removeAttribute('disabled');}
    get hidden() {return this.attributes.has('hidden');} set hidden(value) {if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden');}
    get classList() {
      const classes = this.classes;
      return {contains: name => classes.has(name), toggle: (name, force = !classes.has(name)) => {
        if (force !== classes.has(name)) {if (force) classes.add(name); else classes.delete(name); this.setAttribute('class', [...classes].join(' '));}
        return force;
      }};
    }
    get textContent() {return this.childNodes.map(node => node.textContent).join('');}
    set textContent(value) {this.replaceChildren(...(value === null || value === '' ? [] : [new Text(String(value))]));}
    // Markup is kept unparsed: nothing reads inside the About dialog.
    set innerHTML(value) {this.replaceChildren(...(value ? [new Text(String(value))] : []));}
    replaceChildren(...nodes) {
      const removed = this.childNodes.splice(0);
      for (const node of removed) node.parentNode = null;
      for (const node of nodes) {node.parentNode = this; this.childNodes.push(node);}
      if (removed.length || nodes.length) record(this, 'childList');
    }
    append(...nodes) {
      for (const node of nodes.map(node => typeof node === 'string' ? new Text(node) : node)) {node.parentNode?.removeChild(node); node.parentNode = this; this.childNodes.push(node);}
      if (nodes.length) record(this, 'childList');
    }
    removeChild(node) {this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; record(this, 'childList');}
    addEventListener() {} showModal() {}
  }
  const root = new Element('html'), body = new Element('body'), nav = new Element('nav'), settings = new Element('dialog', 'editor-settings'), heading = new Element('div');
  const properties = new Element('section'), send = new Element('button', 'playtest'), quick = new Element('button', 'quick-playtest'), status = new Element('p', 'status');
  const bottom = new Element('footer', 'editor-bottom'), altitude = new Element('div'), floor = new Element('select', 'floor');
  for (const id of ['nautilus-example', 'nautilus-options', 'nautilus-help']) nav.append(new Element('button', id));
  settings.append(heading); properties.append(send); body.append(nav, settings, quick, properties, status); root.append(body);
  const find = (node, id) => {for (const child of node.children) {if (child.id === id) return child; const found = find(child, id); if (found) return found;} return null;};
  const count = (node, id) => node.children.reduce((sum, child) => sum + (child.id === id ? 1 : 0) + count(child, id), 0);
  const selectors = {'#editor-settings .settings-heading': heading, '#editor-bottom .altitude': null, '.properties': properties};
  const document = {body, getElementById: id => find(root, id), createElement: tag => new Element(tag), addEventListener() {},
    querySelector: selector => {if (!Object.hasOwn(selectors, selector)) throw Error('The page double has no ' + selector); return selectors[selector];}};
  const window = {};
  const confirms = [], confirm = message => {confirms.push(message); return ui.answer;};
  const installEditorFloorNavigation = options => {floorCalls.push(options); return floorBinding;};
  runBridge({...BRIDGE_IMPORTS, ...Object.fromEntries(LIBRARIES.map(name => [name, () => installed.push(name)])), installEditorFloorNavigation, document, window, MutationObserver, confirm});
  const settle = async () => {await new Promise(setImmediate); const [error] = errors.splice(0); if (error) throw error;};
  const ui = {N: window.nautilus, window, document, MutationObserver, observers, body, settings, heading, installed, send, quick, status, settle, confirms, answer: true, floorCalls, floorBinding,
    installAltitude: () => {selectors['#editor-bottom .altitude'] = altitude; bottom.append(altitude); body.append(bottom);},
    installFloorSelect: () => altitude.append(floor),
    feedback: () => document.getElementById('nautilus-settings-feedback'), feedbacks: () => count(root, 'nautilus-settings-feedback'),
    // The editor's own sync writes the Send button's disabled state; the bridge observes it and reapplies its rule.
    editorSync: async disabled => {send.disabled = disabled; await settle();}};
  pages.add(ui); await settle();
  return ui;
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
const EXAMPLE = 'Example yard · edit freely, save a copy, or export JSON.', EDITOR_READY = 'Select a build tool to edit. Right-drag or WASD pans.';
const SENDING = 'Sending map to the connected game…', SENT = 'Map sent to the connected game. Your blueprint and undo history stay here.';

test('the page bridge installs both libraries and exposes the engine before any host connects', BOUND, async () => {
  assert.equal(named.length, imports.length, 'Every import of the bridge is a named import');
  assert.deepEqual(imported.sort(), [...Object.keys(BRIDGE_IMPORTS), ...LIBRARIES, ...FLOOR_IMPORTS].sort(), 'The doubles cover every import of the bridge');
  const ui = await page(), {N} = ui;
  assert.deepEqual(ui.installed, LIBRARIES);
  assert.equal(N.version, ENGINE_VERSION); assert.equal(N.contract, MAP_CONTRACT); assert.deepEqual(N.manifest, engineManifest());
  assert.equal(N.document, undefined); assert.equal(N.hasGameAdapter, false);
  assert.throws(() => N.export(), {message: 'The editor is still loading.'});
  assert.equal(ui.send.disabled, true); assert.equal(ui.send.title, EXPORT);
  assert.deepEqual([ui.quick.disabled, ui.quick.title], [true, EXPORT], 'The quick Send button mirrors Send');
  const feedback = ui.feedback();
  assert.equal(ui.feedbacks(), 1, 'The settings feedback is installed once');
  assert.equal(feedback.parentNode, ui.heading, 'The feedback is inside the intended Settings heading');
  assert.equal(ui.heading.parentNode, ui.settings, 'The feedback heading belongs to the Settings dialog');
  assert.deepEqual([feedback.textContent, feedback.hidden], ['', true], 'An empty status hides the settings feedback');
  ui.status.textContent = 'Map sent.'; await ui.settle();
  assert.deepEqual([feedback.textContent, feedback.hidden], ['Map sent.', false], 'Settings show the status');
  ui.status.textContent = ''; await ui.settle();
  assert.deepEqual([feedback.textContent, feedback.hidden], ['', true], 'Settings hide the feedback when the status clears');
  // Send exists, but current main also waits for the floor binding before retiring this observer.
  assert.equal(N.floorNavigation, null);
  assert.equal(ui.floorCalls.length, 0);
  assert.equal(ui.observers.some(observer => observer.registrations.has(ui.body)), true, 'The bridge keeps watching until the floor controls are ready');
});

test('the floor binding waits for scene and controls, installs once and retires the body observer', BOUND, async () => {
  const ui = await page(), {N} = ui;
  assert.equal(N.floorNavigation, null); assert.equal(ui.floorCalls.length, 0);
  ui.window.editor3d = {scene: {id: 'test-scene'}, document: {block: false}};
  ui.body.append(ui.document.createElement('aside')); await ui.settle();
  assert.equal(ui.floorCalls.length, 0, 'A scene without the altitude control is not ready');
  ui.installAltitude(); await ui.settle();
  assert.equal(ui.floorCalls.length, 0, 'The altitude container without its floor selector is not ready');
  assert.equal(ui.observers.some(observer => observer.registrations.has(ui.body)), true);
  ui.installFloorSelect(); await ui.settle();
  assert.equal(ui.floorCalls.length, 1); assert.equal(N.floorNavigation, ui.floorBinding);
  const options = ui.floorCalls[0];
  assert.equal(options.editor, ui.window.editor3d, 'The binding borrows the current editor');
  assert.equal(options.getLabel({value: '9'}), '10'); assert.equal(options.getHeight('1'), 2.12);
  assert.equal(ui.observers.some(observer => observer.registrations.has(ui.body)), false, 'Send and the installed floor binding retire the setup observer');
  const disconnect = N.connectGame(host({manifest: engineManifest()}).adapter); await ui.settle();
  await ui.editorSync(true); disconnect(); await ui.settle();
  assert.equal(ui.floorCalls.length, 1, 'Handoff and editor refreshes do not install another floor binding');
  assert.equal(N.floorNavigation, ui.floorBinding); assert.equal(ui.feedbacks(), 1);
});

test('the Send buttons follow the connected host, and each refresh sees the new state', BOUND, async () => {
  const ui = await page(), {N} = ui, json = featureMap(), buttons = () => [ui.send.disabled, ui.send.title, ui.quick.disabled, ui.quick.title];
  ui.window.editor3d = {document: {block: false, export: () => json}};
  const disconnect = N.connectGame(host({manifest: engineManifest()}).adapter); await ui.settle();
  assert.equal(N.hasGameAdapter, true);
  assert.deepEqual(buttons(), [false, SEND, false, SEND], 'Connecting enables Send');
  await ui.editorSync(true); assert.deepEqual(buttons(), [false, SEND, false, SEND], 'The bridge reapplies its rule after the editor sync');
  // The editor's own rule disables Send for a block; the bridge keeps it disabled and mirrors it.
  ui.window.editor3d.document.block = true; await ui.editorSync(true);
  assert.deepEqual(buttons(), [true, SEND, true, SEND], 'A block cannot be sent, even with a host connected');
  ui.window.editor3d.document.block = false; await ui.editorSync(false);
  assert.deepEqual(buttons(), [false, SEND, false, SEND], 'A full map can be sent again');
  disconnect(); await ui.settle();
  assert.equal(N.hasGameAdapter, false);
  assert.deepEqual(buttons(), [true, EXPORT, true, EXPORT], 'Disconnecting disables Send');
  await ui.editorSync(false); assert.deepEqual(buttons(), [true, EXPORT, true, EXPORT], 'With no host the bridge keeps Send disabled');
  // A host that connects while a block is open: no editor write, so only the bridge's rule decides.
  ui.window.editor3d.document.block = true; const again = N.connectGame(host({manifest: engineManifest()}).adapter); await ui.settle();
  assert.deepEqual(buttons(), [true, SEND, true, SEND], 'Connecting while a block is open keeps Send disabled');
  again(); await ui.settle();
  assert.equal(ui.feedbacks(), 1, 'Every refresh keeps one settings feedback');
});

test('window.nautilus.sendToGame sends the current validated export, or the map it is given, and never reaches an incapable host', BOUND, async () => {
  const ui = await page(), {N} = ui, json = featureMap(), validated = openDocument(json).export();
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

test('window.nautilus.open loads a validated document, waits for the editor to load it, and passes on a failure', BOUND, async () => {
  // As in editor-3d.js, the editor's open() resolves only once the scene has loaded.
  const ui = await page(), json = featureMap(), opened = [], loads = [];
  ui.window.editor3d = {open(document) {opened.push(document); return new Promise((resolve, reject) => loads.push({resolve, reject}));}};
  let settled = false; const opening = ui.N.open(json).finally(() => {settled = true;});
  await ui.settle();
  assert.equal(opened.length, 1); assert.equal(opened[0].export(), openDocument(json).export());
  assert.equal(settled, false, 'open() waits while the editor loads the map');
  loads[0].resolve(); assert.deepEqual(await opening, describeBlueprint(openDocument(json).export()));
  const failing = ui.N.open(json); loads[1].reject(Error('The scene could not load.'));
  await assert.rejects(failing, {message: 'The scene could not load.'}, 'A load failure reaches the caller');
  await assert.rejects(ui.N.open('{'), SyntaxError); assert.equal(opened.length, 2, 'Malformed JSON never reaches the editor');
});

test('the Example yard button announces the yard only after the editor has loaded it', BOUND, async () => {
  // The editor writes its own status when the scene has loaded, so an early announcement would be replaced.
  const ui = await page(), opened = [], loads = [], example = ui.document.getElementById('nautilus-example');
  ui.window.editor3d = {loading: false, document: {changed: false}, open(document) {opened.push(document); return new Promise((resolve, reject) => loads.push({ready() {ui.status.textContent = EDITOR_READY; resolve();}, reject}));}};
  // Each click is awaited only after its assertions, so a fault that starts a load it should not fails
  // here instead of waiting on a load that is never released.
  const clicked = example.onclick(); await ui.settle();
  assert.equal(opened.length, 1); assert.equal(opened[0].map.name, exampleYard().name, 'The button opens the example yard');
  assert.notEqual(ui.status.textContent, EXAMPLE, 'The yard is not announced while it loads');
  loads[0].ready(); await clicked; await ui.settle();
  assert.deepEqual([ui.status.textContent, ui.feedback().textContent], [EXAMPLE, EXAMPLE], 'The yard is announced after the editor has loaded it');
  const failing = example.onclick(); loads[1].reject(Error('The yard could not load.')); await failing;
  assert.equal(ui.status.textContent, 'The yard could not load.', 'A load failure is reported, not announced as the yard');
  ui.window.editor3d.loading = true; const waiting = example.onclick(); await ui.settle();
  assert.deepEqual([ui.status.textContent, opened.length], ['Wait for the current map to finish loading.', 2], 'A click while a map loads waits'); await waiting;
  ui.window.editor3d.loading = false; ui.window.editor3d.document.changed = true; ui.answer = false; const cancelled = example.onclick(); await ui.settle();
  assert.deepEqual([ui.confirms.length, opened.length], [1, 2], 'Edited work is replaced only if the user confirms'); await cancelled;
  ui.answer = true; const confirmed = example.onclick(); loads[2].ready(); await confirmed;
  assert.deepEqual([ui.confirms.length, opened.length, ui.status.textContent], [2, 3, EXAMPLE]);
});

// The deployed Send click: the pinned tools' click handler as adaptWallEditor replaces it, and the
// playtest module that build.mjs writes in place of the pinned one, on the page double's window.
const upstream = JSON.parse(await readFile(new URL('../upstream.json', import.meta.url), 'utf8'));
const tactics = new URL('../' + upstream.aft.root + '/dist/tactics/', import.meta.url);
const {parseMap} = await import(new URL('core/maps.js', tactics));
function deployedSendClick(ui, getDocument) {
  assert.deepEqual(LAUNCH_PLAYTEST.match(/^import .*;$/gm), ["import {parseMap} from './core/maps.js';"], 'The playtest module imports only the pinned parseMap');
  const launchPlaytest = new Function('parseMap', 'window', LAUNCH_PLAYTEST.replace(/^import .*;\n/m, '').replace('export function', 'function') + 'return launchPlaytest;')(parseMap, ui.window);
  new Function('$', 'isLoading', 'status', 'getDocument', 'validate', 'launchPlaytest', 'let busy = false;\n' + SEND_CLICK)(
    id => ui.document.getElementById(id), () => false, text => {ui.status.textContent = text;}, getDocument, () => [], launchPlaytest);
  return () => ui.send.onclick();
}

test('the deployed Send click waits for the connected game and reports its answer', BOUND, async () => {
  // build.mjs's once: the needle must be present, and its first occurrence is replaced.
  const once = (text, needle, replacement) => {assert.ok(text.includes(needle), needle); return text.replace(needle, replacement);};
  const tools = adaptWallEditor('/editor-3d-tools.js', await readFile(new URL('editor-3d-tools.js', tactics), 'utf8'), once);
  assert.equal(tools.split(SEND_CLICK).length, 2, 'The editor adapter deploys this click handler');
  const ui = await page(), json = featureMap(), editing = {block: false, export: () => json}, sent = [], answers = [];
  ui.window.editor3d = {document: editing};
  const click = deployedSendClick(ui, () => editing), shown = () => [ui.status.textContent, ui.feedback().textContent];
  const disconnect = ui.N.connectGame({manifest: engineManifest(), openMap(handoff) {sent.push(handoff.json); return new Promise((resolve, reject) => answers.push({resolve, reject}));}});
  const sending = click(); await ui.settle();
  assert.equal(answers.length, 1, 'The click reaches the host');
  assert.deepEqual(shown(), [SENDING, SENDING], 'While the host works, the status says the map is being sent');
  const second = click(); await ui.settle();
  assert.equal(ui.status.textContent, 'Wait for the current operation to finish.', 'A second click waits for the first'); assert.equal(answers.length, 1); await second;
  answers[0].resolve(); await sending; await ui.settle();
  assert.deepEqual(shown(), [SENT, SENT], 'The status reports the send once the host has answered');
  const refusing = click(); await ui.settle();
  assert.deepEqual(shown(), [SENDING, SENDING]);
  answers[1].reject(Error('The game refused this map.')); await refusing; await ui.settle();
  assert.deepEqual(shown(), ['The game refused this map.', 'The game refused this map.'], 'A host that rejects has its message shown');
  assert.deepEqual(sent, [openDocument(json).export(), openDocument(json).export()], 'Each click sends the validated current export');
  editing.block = true; await click(); assert.equal(ui.status.textContent, 'Place the block in a full map to send it to a game.'); editing.block = false;
  disconnect(); await click(); assert.equal(ui.status.textContent, 'Connect a game adapter, or export this map as JSON.');
  assert.equal(sent.length, 2, 'Neither a block nor a click without a host reaches a game');
});

test('the page double records writes as the DOM does, and fails an observer that re-triggers itself', BOUND, async () => {
  const ui = await page(), button = ui.document.createElement('button'), seen = [], text = [];
  ui.body.append(button);
  const watch = new ui.MutationObserver(records => seen.push(...records.map(item => item.attributeName)));
  watch.observe(button, {attributeFilter: ['disabled']});
  button.disabled = false; button.title = 'Not in the filter'; await ui.settle();
  assert.deepEqual(seen, [], 'Removing an absent attribute records nothing, and the filter excludes the title');
  button.disabled = true; await ui.settle(); button.disabled = true; await ui.settle(); button.disabled = false; await ui.settle();
  assert.deepEqual(seen, ['disabled', 'disabled', 'disabled'], 'Setting records even an unchanged value; removing records a present one');
  new ui.MutationObserver(records => text.push(...records.map(item => item.type))).observe(button, {characterData: true, subtree: true});
  button.textContent = 'Send'; await ui.settle();
  assert.deepEqual(text, [], 'Writing textContent replaces the children, which characterData does not see');
  button.childNodes[0].data = 'Send now'; await ui.settle();
  assert.deepEqual([text, button.textContent], [['characterData'], 'Send now'], 'Writing a text node\'s data is a characterData record');
  const old = [];
  new ui.MutationObserver(records => old.push(...records.map(item => item.attributeName))).observe(button, {attributeOldValue: true});
  button.title = 'Recorded'; await ui.settle();
  assert.deepEqual(old, ['title'], 'An old-value option implies its type, as in the DOM');
  assert.throws(() => new ui.MutationObserver(() => {}).observe(button, {subtree: true}), TypeError, 'An observer must observe a type');
  const loop = new ui.MutationObserver(() => {button.disabled = true;});
  loop.observe(button, {attributeFilter: ['disabled']}); button.disabled = true;
  await assert.rejects(ui.settle(), /exceeded the test's cascade bound and may be self-retriggering/, 'An observer that writes what it observes fails');
  loop.disconnect(); watch.disconnect();
});
