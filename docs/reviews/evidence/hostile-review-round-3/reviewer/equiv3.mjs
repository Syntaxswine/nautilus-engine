// Round 3: behavioural diff of two window.nautilus literals, built on round 2's handoff-equiv.mjs.
// The first 81 steps are round 2's, unchanged. The prelude is now read from each file: the old
// editor's `let gameAdapter = null;` or the new editor's `const handoff = createGameHandoff(...)`.
// The refresh stub logs what the page's own refreshHandoff would read at that moment
// (`handoff.hasGameAdapter` in the new editor, `gameAdapter` in the old one).
// Extra steps (after the 81) probe what round 2 did not: a detached or re-bound sendToGame, a
// refused connect while a host is connected, the same host connected twice, and the property
// descriptors of window.nautilus.
// Usage: node equiv3.mjs <pristine-root> <old editor.js> <new editor.js> [out.json]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
const [root, oldFile, newFile, outFile, newHandoff] = process.argv.slice(2).map(p => p && path.resolve(p));
const core = await import(pathToFileURL(path.join(root, 'packages/map-core/index.js')));
const handoffModule = await import(pathToFileURL(path.join(root, 'apps/editor/game-handoff.js')));
function source(file) {
  const text = fs.readFileSync(file, 'utf8'), start = text.indexOf('window.nautilus = {'), end = text.indexOf('\n};', start) + 3;
  const prelude = /^const handoff = createGameHandoff\(.*$/m.exec(text)?.[0] ?? /^let gameAdapter = null;$/m.exec(text)?.[0];
  if (start < 0 || !prelude) throw Error('Cannot find the literal or its prelude in ' + file);
  return prelude + '\n' + 'function refreshHandoff() { __refresh(typeof handoff !== "undefined" ? (handoff.hasGameAdapter ? "connected" : "none") : (gameAdapter ? "connected" : "none")); }\n' + text.slice(start, end);
}

let feature = JSON.parse(core.createMapDocument('Equivalence yard').export());
feature = core.placeBuilding(feature, {asset: 'violet-bay-house', x: 100, y: 60, turns: 1, clearance: 2}).map;
feature.slopedRoofs = {version: 1, roofs: [{id: 'roof-1', x: 150, y: 150, width: 6, depth: 8, z: 1, style: 'gable', axis: 'x', pitch: 35, overhang: 0.3, material: 'slate', seed: 7}]};
const featureJson = JSON.stringify(feature);
const otherJson = (() => { const m = JSON.parse(featureJson); m.name = 'Other yard'; return JSON.stringify(m); })();
const blockJson = core.createBlockDocument('Equivalence block').export();
const unreachable = JSON.parse(core.createMapDocument('Unreachable').export()); unreachable.exits = [{x: 30, y: 30, z: 0}];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) unreachable.terrain[30 + dy][30 + dx] = 'water';
const unreachableJson = JSON.stringify(unreachable);
const noRoofs = core.engineManifest(); noRoofs.capabilities = noRoofs.capabilities.filter(f => f.id !== core.ROOF_FEATURE);

function run(file, extra) {
  const log = [], reads = [];
  const context = vm.createContext({window: {}, __refresh: n => log.push('refresh:' + n), ...extra,
    ENGINE_VERSION: core.ENGINE_VERSION, MAP_CONTRACT: core.MAP_CONTRACT, openDocument: core.openDocument, describeBlueprint: core.describeBlueprint, engineManifest: core.engineManifest});
  vm.runInContext(source(file), context);
  const N = context.window.nautilus, outcome = value => typeof value === 'function' ? 'function' : JSON.stringify(value);
  const describe = error => [error?.constructor?.name, error?.message, error?.code, JSON.stringify(error?.diagnostics?.map(d => d.code + ':' + (d.feature || '')))].join(' | ');
  const step = (label, fn) => { try { log.push(label + ' => ' + outcome(fn())); } catch (error) { log.push(label + ' THROWS ' + describe(error)); } };
  const host = (name, declaration, result = name + '-result') => {
    const calls = [], target = {...declaration, openMap(handoff) { calls.push({json: handoff.json, contractIsMap: handoff.contract === core.MAP_CONTRACT, keys: Object.keys(handoff).join(','), thisIsHost: this === proxy}); return result; }};
    const proxy = new Proxy(target, {get(t, key, receiver) { if (typeof key === 'string') reads.push(name + '.' + key); return Reflect.get(t, key, receiver); }});
    return {proxy, calls};
  };
  const doc = json => ({export: () => json, block: false});
  const named = json => json === core.openDocument(featureJson).export() ? 'export-of-feature' : json === core.openDocument(otherJson).export() ? 'export-of-other' : typeof json + ':' + String(json).length;
  // ---- Round 2's 81 steps, unchanged. ----
  step('send() while loading, no host', () => N.sendToGame());
  step('send(json), no host', () => N.sendToGame(featureJson));
  step('hasGameAdapter', () => N.hasGameAdapter);
  for (const [label, value] of [['undefined', undefined], ['null', null], ['zero', 0], ['empty', {}], ['openMap string', {openMap: 'x'}], ['features only', {features: []}]])
    step('connect ' + label, () => N.connectGame(value));
  step('hasGameAdapter after malformed', () => N.hasGameAdapter);
  const cases = [['manifest-no-roofs', {manifest: noRoofs}], ['features-no-original', {features: [core.FEATURE_IDS.prefabs, core.FEATURE_IDS.slopedRoofs]}], ['silent', {}],
    ['full-manifest', {manifest: core.engineManifest()}], ['full-features', {features: core.requiredMapFeatures(feature)}]];
  for (const [name, declaration] of cases) {
    const h = host(name, declaration); let disconnect;
    step('connect ' + name, () => (disconnect = N.connectGame(h.proxy)));
    for (const [label, json] of [['feature map', featureJson], ['block', blockJson], ['unreachable map', unreachableJson], ['bad JSON', '{'], ['object input', feature]]) step(name + ' send ' + label, () => N.sendToGame(json));
    context.window.editor3d = {document: doc(featureJson)}; step(name + ' send() default', () => N.sendToGame()); delete context.window.editor3d;
    log.push(name + ' calls ' + JSON.stringify(h.calls.map(c => ({...c, json: named(c.json)}))));
    step('disconnect ' + name, () => disconnect()); step('disconnect again ' + name, () => disconnect());
  }
  const a = host('A', {features: core.requiredMapFeatures(feature)}), b = host('B', {features: core.requiredMapFeatures(feature)});
  let da, db; step('connect A', () => (da = N.connectGame(a.proxy))); step('connect B', () => (db = N.connectGame(b.proxy)));
  step('stale disconnect A', () => da()); step('hasGameAdapter after stale', () => N.hasGameAdapter);
  step('send after stale', () => N.sendToGame(featureJson)); log.push('A calls ' + a.calls.length + ', B calls ' + b.calls.length);
  step('disconnect B', () => db()); step('hasGameAdapter end', () => N.hasGameAdapter);
  const core81 = log.length, readsCore = reads.length;
  // ---- Extra steps (round 3). ----
  const c = host('C', {features: core.requiredMapFeatures(feature)});
  let dc; step('x: connect C', () => (dc = N.connectGame(c.proxy)));
  step('x: refused connect while C is connected', () => N.connectGame({features: []}));
  step('x: hasGameAdapter after refused connect', () => N.hasGameAdapter);
  step('x: send after refused connect', () => N.sendToGame(featureJson)); log.push('x: C calls ' + c.calls.length);
  context.window.editor3d = {document: doc(featureJson)};
  const detached = N.sendToGame; step('x: detached sendToGame()', () => detached());
  step('x: sendToGame.call(other object with export)', () => N.sendToGame.call({export: () => otherJson}));
  step('x: sendToGame.call(null)', () => N.sendToGame.call(null));
  const copy = {...N}; context.window.editor3d = {document: doc(otherJson)};
  step('x: spread copy sendToGame() after the document changed', () => copy.sendToGame());
  step('x: sendToGame(undefined) uses the default', () => N.sendToGame(undefined));
  step('x: sendToGame(null)', () => N.sendToGame(null));
  delete context.window.editor3d;
  log.push('x: C call jsons ' + JSON.stringify(c.calls.map(call => named(call.json))));
  const detachedConnect = N.connectGame, d = host('D', {features: core.requiredMapFeatures(feature)});
  let dd1, dd2; step('x: detached connectGame(D)', () => (dd1 = detachedConnect(d.proxy)));
  step('x: connect D again', () => (dd2 = N.connectGame(d.proxy)));
  step('x: first D disconnect (same host connected twice)', () => dd1()); step('x: hasGameAdapter after first D disconnect', () => N.hasGameAdapter);
  step('x: second D disconnect', () => dd2());
  step('x: stale C disconnect after D', () => dc()); step('x: hasGameAdapter final', () => N.hasGameAdapter);
  step('x: typeof hasGameAdapter', () => typeof N.hasGameAdapter);
  log.push('x: descriptors ' + JSON.stringify(Object.entries(Object.getOwnPropertyDescriptors(N)).map(([k, v]) => k + ':' + ('get' in v ? 'get' : typeof v.value) + (v.enumerable ? '' : ':hidden') + (v.writable === false ? ':ro' : ''))));
  log.push('x: names ' + JSON.stringify([N.connectGame.name, N.sendToGame.name, N.connectGame.length, N.sendToGame.length]));
  return {log, reads, core81, readsCore};
}
const bindings = {assertMapCapabilities: core.assertMapCapabilities, assertBlueprintCompatible: core.assertBlueprintCompatible, checkGameAdapter: handoffModule.checkGameAdapter,
  sendMapToGame: handoffModule.sendMapToGame, createGameHandoff: handoffModule.createGameHandoff};
// Optional 5th argument: a different game-handoff module for the new side only (a mutant of the module).
const newModule = newHandoff ? await import(pathToFileURL(newHandoff).href + '?new') : handoffModule;
const newBindings = {...bindings, checkGameAdapter: newModule.checkGameAdapter, sendMapToGame: newModule.sendMapToGame, createGameHandoff: newModule.createGameHandoff};
const before = run(oldFile, bindings), after = run(newFile, newBindings);
const differences = [];
for (let i = 0; i < Math.max(before.log.length, after.log.length); i++) if (before.log[i] !== after.log[i]) differences.push({i, part: i < before.core81 ? 'round-2 steps' : 'extra', before: before.log[i], after: after.log[i]});
const result = {old: path.basename(oldFile), new: path.basename(newFile), steps: before.log.length, round2Steps: before.core81, round2StepsAfter: after.core81,
  differencesInRound2Steps: differences.filter(x => x.part === 'round-2 steps').length, differencesInExtra: differences.filter(x => x.part === 'extra').length,
  differences, readsEqual: JSON.stringify(before.reads) === JSON.stringify(after.reads), reads: [before.reads.length, after.reads.length], round2ReadsEqual: JSON.stringify(before.reads.slice(0, before.readsCore)) === JSON.stringify(after.reads.slice(0, after.readsCore)), round2Reads: [before.readsCore, after.readsCore], logOld: before.log, logNew: after.log};
if (outFile) fs.writeFileSync(outFile, JSON.stringify(result, null, 1));
console.log(JSON.stringify({old: result.old, new: result.new, steps: result.steps, round2Steps: result.round2Steps, differencesInRound2Steps: result.differencesInRound2Steps, differencesInExtra: result.differencesInExtra, readsEqual: result.readsEqual, reads: result.reads, round2ReadsEqual: result.round2ReadsEqual, round2Reads: result.round2Reads, differences}, null, 1));
