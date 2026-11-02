// Behavioural diff of the editor's window.nautilus handoff before (f04ac30) and after (fb8b26a)
// the move. Each version's object literal is evaluated in its own vm context with the real
// map-core (and, for the new one, the real game-handoff module) of the pristine tree; DOM-only
// pieces are stubbed (refreshHandoff counts calls, window.editor3d supplies the document). The
// same script of calls runs against both; every outcome, host call, `this`, and every property
// read on the adapter (through a Proxy) is logged, and the two logs are compared line by line.
// Usage: node handoff-equiv.mjs <pristine-root> <old editor.js> <new editor.js>
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
const [root, oldFile, newFile] = process.argv.slice(2).map(p => path.resolve(p));
const core = await import(pathToFileURL(path.join(root, 'packages/map-core/index.js')));
const handoff = await import(pathToFileURL(path.join(root, 'apps/editor/game-handoff.js')));
const literal = file => { const text = fs.readFileSync(file, 'utf8'), start = text.indexOf('window.nautilus = {'), end = text.indexOf('\n};', start) + 3; return text.slice(start, end); };

// Fixtures: a map needing prefabs + original buildings + roofs, a block, an unreachable exit.
let feature = JSON.parse(core.createMapDocument('Equivalence yard').export());
feature = core.placeBuilding(feature, {asset: 'violet-bay-house', x: 100, y: 60, turns: 1, clearance: 2}).map;
feature.slopedRoofs = {version: 1, roofs: [{id: 'roof-1', x: 150, y: 150, width: 6, depth: 8, z: 1, style: 'gable', axis: 'x', pitch: 35, overhang: 0.3, material: 'slate', seed: 7}]};
const featureJson = JSON.stringify(feature);
const blockJson = core.createBlockDocument('Equivalence block').export();
const unreachable = JSON.parse(core.createMapDocument('Unreachable').export()); unreachable.exits = [{x: 30, y: 30, z: 0}];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) unreachable.terrain[30 + dy][30 + dx] = 'water';
const unreachableJson = JSON.stringify(unreachable);
const noRoofs = core.engineManifest(); noRoofs.capabilities = noRoofs.capabilities.filter(f => f.id !== core.ROOF_FEATURE);

function run(file, extra) {
  const log = [], reads = [];
  const context = vm.createContext({window: {}, __refresh: n => log.push('refresh:' + n), ...extra,
    ENGINE_VERSION: core.ENGINE_VERSION, MAP_CONTRACT: core.MAP_CONTRACT, openDocument: core.openDocument, describeBlueprint: core.describeBlueprint, engineManifest: core.engineManifest});
  vm.runInContext('let gameAdapter = null;\nfunction refreshHandoff() { __refresh(gameAdapter ? "connected" : "none"); }\n' + literal(file), context);
  const N = context.window.nautilus, outcome = value => typeof value === 'function' ? 'function' : JSON.stringify(value);
  const describe = error => [error?.constructor?.name, error?.message, error?.code, JSON.stringify(error?.diagnostics?.map(d => d.code + ':' + (d.feature || '')))].join(' | ');
  const step = (label, fn) => { try { log.push(label + ' => ' + outcome(fn())); } catch (error) { log.push(label + ' THROWS ' + describe(error)); } };
  const host = (name, declaration, result = name + '-result') => {
    const calls = [], target = {...declaration, openMap(handoff) { calls.push({json: handoff.json, contractIsMap: handoff.contract === core.MAP_CONTRACT, keys: Object.keys(handoff).join(','), thisIsHost: this === proxy}); return result; }};
    const proxy = new Proxy(target, {get(t, key, receiver) { if (typeof key === 'string') reads.push(name + '.' + key); return Reflect.get(t, key, receiver); }});
    return {proxy, calls};
  };
  const doc = json => ({export: () => json, block: false});
  // 1. Before any document exists.
  step('send() while loading, no host', () => N.sendToGame());
  step('send(json), no host', () => N.sendToGame(featureJson));
  step('hasGameAdapter', () => N.hasGameAdapter);
  // 2. Malformed adapters never connect and never refresh.
  for (const [label, value] of [['undefined', undefined], ['null', null], ['zero', 0], ['empty', {}], ['openMap string', {openMap: 'x'}], ['features only', {features: []}]])
    step('connect ' + label, () => N.connectGame(value));
  step('hasGameAdapter after malformed', () => N.hasGameAdapter);
  // 3. Hosts that lack a feature are never called.
  const cases = [['manifest-no-roofs', {manifest: noRoofs}], ['features-no-original', {features: [core.FEATURE_IDS.prefabs, core.FEATURE_IDS.slopedRoofs]}], ['silent', {}],
    ['full-manifest', {manifest: core.engineManifest()}], ['full-features', {features: core.requiredMapFeatures(feature)}]];
  for (const [name, declaration] of cases) {
    const h = host(name, declaration); let disconnect;
    step('connect ' + name, () => (disconnect = N.connectGame(h.proxy)));
    for (const [label, json] of [['feature map', featureJson], ['block', blockJson], ['unreachable map', unreachableJson], ['bad JSON', '{'], ['object input', feature]]) step(name + ' send ' + label, () => N.sendToGame(json));
    context.window.editor3d = {document: doc(featureJson)}; step(name + ' send() default', () => N.sendToGame()); delete context.window.editor3d;
    log.push(name + ' calls ' + JSON.stringify(h.calls.map(c => ({...c, json: c.json === core.openDocument(featureJson).export() ? 'export-of-feature' : typeof c.json + ':' + String(c.json).length}))));
    step('disconnect ' + name, () => disconnect()); step('disconnect again ' + name, () => disconnect());
  }
  // 4. Disconnect identity: a stale disconnect must not drop a newer host.
  const a = host('A', {features: core.requiredMapFeatures(feature)}), b = host('B', {features: core.requiredMapFeatures(feature)});
  let da, db; step('connect A', () => (da = N.connectGame(a.proxy))); step('connect B', () => (db = N.connectGame(b.proxy)));
  step('stale disconnect A', () => da()); step('hasGameAdapter after stale', () => N.hasGameAdapter);
  step('send after stale', () => N.sendToGame(featureJson)); log.push('A calls ' + a.calls.length + ', B calls ' + b.calls.length);
  step('disconnect B', () => db()); step('hasGameAdapter end', () => N.hasGameAdapter);
  return {log, reads};
}
// Both contexts get every binding either version imports, so any file can be on either side.
const bindings = {assertMapCapabilities: core.assertMapCapabilities, assertBlueprintCompatible: core.assertBlueprintCompatible, checkGameAdapter: handoff.checkGameAdapter, sendMapToGame: handoff.sendMapToGame};
const before = run(oldFile, bindings);
const after = run(newFile, bindings);
const differences = [];
for (let i = 0; i < Math.max(before.log.length, after.log.length); i++) if (before.log[i] !== after.log[i]) differences.push({i, before: before.log[i], after: after.log[i]});
const readsEqual = JSON.stringify(before.reads) === JSON.stringify(after.reads);
console.log(JSON.stringify({steps: before.log.length, differences, readsEqual, reads: before.reads.length, log: before.log}, null, 1));
