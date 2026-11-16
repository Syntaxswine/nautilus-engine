// Reachability of the mutation survivors: each probe states a documented claim,
// passes on the clean tree, and FAILS when its mutant is applied (the mutant is
// applied in a child process; the file is restored in a finally). A survivor
// whose probe also passes under the mutant is reported as an equivalent mutant.
// Same safety as mutate.mjs: clean tree required, unique needle, restore + hash.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sandbox, treeState, writeResult, nodeRig} from './lib/common.mjs';

const MUTANTS = {
  W3: {file: 'packages/world-core/state.js', needle: "if(link.from.floorId===link.to.floorId)fail('INVALID_TRAVERSAL'", replace: "if(false)fail('INVALID_TRAVERSAL'"},
  W6: {file: 'packages/world-core/state.js', needle: '||value.position.h!==floor.elevationM||', replace: '||'},
  Q4: {file: 'packages/world-core/queries.js', needle: '.filter(link=>link.from.floorId===id||link.bidirectional)', replace: '.filter(link=>true)'},
  L3: {file: 'packages/runtime-core/lifecycle.js', needle: "for(const key of Object.keys(provided))if(!allowed.has(key))throw new TypeError('Undeclared service export: '+key);", replace: ''},
  X1: {file: 'apps/editor/extended-world-document.js', needle: 'past.length+future.length>maxHistoryEntries||', replace: 'past.length+future.length>maxHistoryEntries+1||'},
};
// Child mode: run the probes against whatever is on disk and print JSON.
if (process.argv[2] === '--probe') {
  const {pathToFileURL} = await import('node:url');
  const wc = await import(pathToFileURL(path.join(sandbox, 'packages/world-core/index.js')).href);
  const base = wc.openWorld(fs.readFileSync(path.join(sandbox, 'examples/native-fifteen-story.world.json'), 'utf8'));
  const res = {};
  // W3: a link whose two landings name the same floor must reject (docs/extended-world-core.md: "same-floor links reject").
  {
    const w = structuredClone(base), link = structuredClone(w.links[0]); link.id = 'probe-same-floor'; link.to = structuredClone(link.from);
    w.links.push(link);
    try { wc.openWorld(w); res.W3 = {claimHolds: false, observed: 'accepted'}; } catch (e) { res.W3 = {claimHolds: e.code === 'INVALID_WORLD' || /INVALID_TRAVERSAL/.test(JSON.stringify(e.diagnostics || e.code)), observed: e.code + ' ' + JSON.stringify(e.diagnostics?.[0]?.code)}; }
  }
  // W6: a landing whose height differs from its floor elevation must reject.
  {
    const w = structuredClone(base), link = w.links[0]; link.from.position.h += 0.5;
    try { wc.openWorld(w); res.W6 = {claimHolds: false, observed: 'accepted'}; } catch (e) { res.W6 = {claimHolds: true, observed: e.diagnostics?.[0]?.code}; }
  }
  // Q4: linksFrom respects direction: a one-way link is not returned from its destination floor.
  {
    const w = structuredClone(base), link = w.links[0]; link.bidirectional = false;
    const q = wc.compileWorld(w), from = q.linksFrom(link.from.floorId).some((l) => l.id === link.id), to = q.linksFrom(link.to.floorId).some((l) => l.id === link.id);
    res.Q4 = {claimHolds: from && !to, observed: {fromOrigin: from, fromDestination: to}};
  }
  // L3: "Handles may export only their declared services" (docs/runtime-modules.md).
  {
    const rt = await import(pathToFileURL(path.join(sandbox, 'packages/runtime-core/index.js')).href);
    const request = {version: 1, modules: [{id: 'rules', version: 1, provides: [{id: 'stat.math', version: 1}], requires: []}], selected: ['rules']};
    try {
      const runtime = await rt.startModules(request, {factories: {rules: () => ({services: {'stat.math': {}, 'secret.extra': {}}})}});
      res.L3 = {claimHolds: false, observed: 'started with an undeclared export'}; await runtime.stop();
    } catch (e) { res.L3 = {claimHolds: /Undeclared service export/.test(e.message), observed: e.name + ': ' + e.message.slice(0, 90)}; }
  }
  // X1: the entry bound alone (large byte budget) keeps at most maxHistoryEntries.
  {
    const {createExtendedWorldDocument} = await import(pathToFileURL(path.join(sandbox, 'apps/editor/extended-world-document.js')).href);
    const {makeFifteenStoryWorld} = await import(pathToFileURL(path.join(sandbox, 'tools/fixtures/fifteen-story.mjs')).href);
    const box = (id, h = 21.2) => ({type: 'put-surface', surface: {id, floorId: 'floor:10', role: 'solid', bounds: {min: {x: 13, y: 7, h}, max: {x: 14, y: 7.16, h: h + 2}}, supports: false, supportFloorId: null}});
    const doc = createExtendedWorldDocument(makeFifteenStoryWorld(), {maxHistoryEntries: 2, maxHistoryBytes: 16_000_000});
    for (const id of ['a:1', 'a:2', 'a:3', 'a:4']) doc.apply(box(id));
    res.X1 = {claimHolds: doc.history.undo + doc.history.redo <= 2, observed: {undo: doc.history.undo, redo: doc.history.redo, maxHistoryEntries: doc.history.maxHistoryEntries}};
  }
  console.log(JSON.stringify(res));
  process.exit(0);
}
const before = treeState();
if (before.statusShort.length) throw Error('Refusing a dirty tree: ' + before.statusShort.join('; '));
const self = fileURLToPath(import.meta.url);
const probe = () => JSON.parse(spawnSync(process.execPath, [self, '--probe'], {cwd: sandbox, encoding: 'utf8'}).stdout.trim().split('\n').at(-1));
const clean = probe();
const rows = {};
for (const [id, m] of Object.entries(MUTANTS)) {
  const file = path.join(sandbox, m.file), original = fs.readFileSync(file), digest = createHash('sha256').update(original).digest('hex');
  if (original.toString('utf8').split(m.needle).length !== 2) throw Error('Needle not unique: ' + id);
  let mutated;
  try { fs.writeFileSync(file, original.toString('utf8').replace(m.needle, m.replace)); mutated = probe(); }
  finally { fs.writeFileSync(file, original); if (createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== digest) throw Error('Restore failed: ' + m.file); }
  rows[id] = {cleanTree: clean[id], underMutant: mutated[id], verdict: clean[id].claimHolds && !mutated[id].claimHolds ? 'REAL SURVIVOR: claim holds on the clean tree, breaks under the mutant, and no test notices' : clean[id].claimHolds && mutated[id].claimHolds ? 'EQUIVALENT MUTANT: the claim is still enforced elsewhere' : 'PROBE INVALID on clean tree'};
}
const after = treeState();
writeResult('survivor-probes.json', {rig: nodeRig(), treeBefore: before, treeAfter: after, rows});
console.log(JSON.stringify(rows, null, 1));
