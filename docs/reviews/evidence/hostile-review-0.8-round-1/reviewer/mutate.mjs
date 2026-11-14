// Targeted mutation harness for the 0.6-0.8 surface.
//  - refuses a dirty tree; records HEAD and `git status --short` before/after
//  - asserts each needle occurs exactly once in its file
//  - applies one mutant at a time and restores the original bytes in a finally,
//    then verifies the restored SHA-256
//  - runs the mutant's targeted test files first; a survivor is re-run against
//    the FULL suite (tests/*.test.mjs) before it is reported as a survivor
//  - node:test timeouts are reported separately (cancelled != failed); no
//    --test-force-exit, so a hang shows up as a timeout, not a pass
// Usage: node artifacts/r08-1/mutate.mjs [mutantId ...]
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {sandbox, treeState, writeResult, nodeRig, mask} from './lib/common.mjs';

const T = (f) => 'tests/' + f + '.test.mjs';
const world = [T('extended-world-core'), T('extended-world-fixture'), T('extended-world-editor'), T('modular-headless')];
const MUTANTS = [
  // world-core: validation of floors, supports, links, entities, requirements
  {id: 'W1', file: 'packages/world-core/state.js', claim: 'Floor elevations must strictly increase', needle: 'if(floor.elevationM<=previous)fail(', replace: 'if(floor.elevationM<previous)fail(', tests: world},
  {id: 'W2', file: 'packages/world-core/state.js', claim: 'A confirmed support floor must match the supporting top height exactly', needle: 'if(!surface.supports||supportFloor.elevationM!==surface.bounds.max.h)fail(', replace: 'if(!surface.supports)fail(', tests: world},
  {id: 'W3', file: 'packages/world-core/state.js', claim: 'Same-floor links reject', needle: "if(link.from.floorId===link.to.floorId)fail('INVALID_TRAVERSAL'", replace: "if(false)fail('INVALID_TRAVERSAL'", tests: world},
  {id: 'W4', file: 'packages/world-core/state.js', claim: 'Actor anchors require a supporting landing', needle: "else if(entity.kind==='actor')fail(", replace: 'else if(false)fail(', tests: world},
  {id: 'W5', file: 'packages/world-core/state.js', claim: 'Links add nautilus-world-traversal-links-v1', needle: 'if(state.links.length)ids.push(WORLD_CONTRACT.traversalCapability);', replace: '', tests: world},
  {id: 'W6', file: 'packages/world-core/state.js', claim: 'Landing at exact floor elevation', needle: '||value.position.h!==floor.elevationM||', replace: '||', tests: world},
  // world-core queries
  {id: 'Q1', file: 'packages/world-core/queries.js', claim: 'requireFloor:true never tunnels to a floor below an unconfirmed support', needle: 'if(requireFloor&&surface?.supportFloorId===null)return null;', replace: '', tests: world},
  {id: 'Q2', file: 'packages/world-core/queries.js', claim: 'traceSegment equal-distance ties use lexicographic surface ID', needle: 'hit.fraction===best.fraction&&surface.id<best.surfaceId', replace: 'hit.fraction===best.fraction&&surface.id>best.surfaceId', tests: world},
  {id: 'Q3', file: 'packages/world-core/queries.js', claim: 'Equal-height support ties by ascending surface ID', needle: '.sort((a,b)=>b.bounds.max.h-a.bounds.max.h||compare(a,b))[0]', replace: '.sort((a,b)=>b.bounds.max.h-a.bounds.max.h||compare(b,a))[0]', tests: world},
  {id: 'Q4', file: 'packages/world-core/queries.js', claim: 'linksFrom respects direction', needle: '.filter(link=>link.from.floorId===id||link.bidirectional)', replace: '.filter(link=>true)', tests: world},
  // runtime lifecycle
  {id: 'L1', file: 'packages/runtime-core/lifecycle.js', claim: 'Rollback visits dependent owners before providers', needle: 'for(const item of [...records].reverse()){', replace: 'for(const item of [...records]){', tests: [T('runtime-modules'), T('modular-headless')]},
  {id: 'L2', file: 'packages/runtime-core/lifecycle.js', claim: 'A module whose start threw is still stopped', needle: 'record.startAttempted=true;await record.hooks.start?.call(record.handle,record.context);', replace: 'await record.hooks.start?.call(record.handle,record.context);record.startAttempted=true;', tests: [T('runtime-modules'), T('modular-headless')]},
  {id: 'L3', file: 'packages/runtime-core/lifecycle.js', claim: 'Undeclared service exports reject', needle: "for(const key of Object.keys(provided))if(!allowed.has(key))throw new TypeError('Undeclared service export: '+key);", replace: '', tests: [T('runtime-modules'), T('modular-headless')]},
  {id: 'L4', file: 'packages/runtime-core/lifecycle.js', claim: 'stop() is idempotent (one cleanup)', needle: 'if(!stopPromise){state=', replace: 'if(true){state=', tests: [T('runtime-modules'), T('modular-headless')]},
  // floor navigation
  {id: 'F1', file: 'packages/floor-navigation/index.js', claim: 'One continuous wheel gesture produces at most one step', needle: 'latched=true;return total<0?1:-1;', replace: 'return total<0?1:-1;', tests: [T('floor-navigation'), T('modular-headless')]},
  {id: 'F2', file: 'packages/floor-navigation/index.js', claim: '180 ms idle boundary starts a new gesture', needle: 'if(time-previous>=idleMs){total=0;latched=false;}', replace: 'if(time-previous>idleMs){total=0;latched=false;}', tests: [T('floor-navigation'), T('modular-headless')]},
  {id: 'F3', file: 'packages/floor-navigation/index.js', claim: 'Floor change cancels the legacy editor preview', needle: 'if(cancelPreview(event)===false||onFloorChange(event)===false)return false;', replace: 'if(onFloorChange(event)===false)return false;', tests: [T('floor-navigation'), T('modular-headless')]},
  {id: 'F4', file: 'packages/floor-navigation/index.js', claim: 'Five visible labels at the top of the tower', needle: 'const start=Math.max(0,Math.min(index-2,floors.length-5));', replace: 'const start=Math.max(0,index-2);', tests: [T('floor-navigation'), T('modular-headless')]},
  {id: 'F5', file: 'packages/floor-navigation/index.js', claim: 'Key auto-repeat does not step floors', needle: 'if(repeat||defaultPrevented||composing||modified||blocked)return 0;', replace: 'if(defaultPrevented||composing||modified||blocked)return 0;', tests: [T('floor-navigation'), T('modular-headless')]},
  // progression constants (does a test spell the documented numbers out?)
  {id: 'P1', file: 'packages/rules-core/progression.js', claim: '15 assignable stat points per level', needle: 'pointsPerLevel:15,', replace: 'pointsPerLevel:14,', tests: [T('basic-progression-core'), T('basic-progression-validation'), T('progression-public-contract')]},
  {id: 'P2', file: 'packages/rules-core/progression.js', claim: 'Increasing XP requirement: 100 x level', needle: 'xpPerLevelFactor:100,', replace: 'xpPerLevelFactor:101,', tests: [T('basic-progression-core'), T('basic-progression-validation'), T('progression-public-contract')]},
  {id: 'P3', file: 'packages/rules-core/progression.js', claim: 'Slower practice: base threshold 1000', needle: 'practiceThresholdBase:1000,', replace: 'practiceThresholdBase:999,', tests: [T('basic-progression-core'), T('basic-progression-validation'), T('progression-public-contract')]},
  // rock hearing
  {id: 'R1', file: 'packages/items-core/noise.js', claim: 'Combat/confirmed/incapacitated guards keep priority', needle: 'if(heard&&!protectedBehavior)requests.push(', replace: 'if(heard)requests.push(', tests: [T('rock-hearing'), T('rock-core'), T('rock-public-contract'), T('rock-adapters')]},
  {id: 'R2', file: 'packages/items-core/noise.js', claim: 'Incapacitated listeners are protected', needle: "listener.confirmedThreat||listener.incapacitated;", replace: 'listener.confirmedThreat;', tests: [T('rock-hearing'), T('rock-core'), T('rock-public-contract'), T('rock-adapters')]},
  {id: 'R3', file: 'packages/items-core/noise.js', claim: 'A listener exactly at the radius hears', needle: "listener.permitted&&range<=noise.radius+1e-9;", replace: 'listener.permitted&&range<noise.radius-1e-9;', tests: [T('rock-hearing'), T('rock-core'), T('rock-public-contract'), T('rock-adapters')]},
  // extended-world authoring history
  {id: 'X1', file: 'apps/editor/extended-world-document.js', claim: 'History entries are bounded by maxHistoryEntries', needle: 'past.length+future.length>maxHistoryEntries||', replace: 'past.length+future.length>maxHistoryEntries+1||', tests: [T('extended-world-editor')]},
  {id: 'X2', file: 'apps/editor/extended-world-document.js', claim: 'The oldest undo is evicted first', needle: 'if(past.length)past.shift();else future.shift();', replace: 'if(past.length)past.pop();else future.shift();', tests: [T('extended-world-editor')]},
];
const selected = process.argv.slice(2).length ? MUTANTS.filter((m) => process.argv.slice(2).includes(m.id)) : MUTANTS;
const allTests = fs.readdirSync(path.join(sandbox, 'tests')).filter((f) => f.endsWith('.test.mjs')).map((f) => 'tests/' + f).sort();

const before = treeState();
if (before.statusShort.length) throw Error('Refusing to mutate a dirty tree: ' + before.statusShort.join('; '));
for (const m of selected) {
  const text = fs.readFileSync(path.join(sandbox, m.file), 'utf8');
  const count = text.split(m.needle).length - 1;
  if (count !== 1) throw Error(`Mutant ${m.id}: needle occurs ${count} times in ${m.file}`);
}
function runTests(files, label) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['--test', ...files], {cwd: sandbox, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 15 * 60 * 1000, windowsHide: true});
  const out = (r.stdout || '') + (r.stderr || '');
  const num = (k) => Number(out.match(new RegExp('^ℹ ' + k + ' (\\d+)$', 'm'))?.[1] ?? NaN);
  const failing = [...out.matchAll(/^✖ (.+?) \(\d/gm)].map((x) => x[1]).filter((n) => !/^(tests|failing tests)/.test(n)).slice(0, 4);
  return {label, exitCode: r.status, signal: r.signal, timedOut: r.error?.code === 'ETIMEDOUT', ms: Date.now() - t0, tests: num('tests'), pass: num('pass'), fail: num('fail'), cancelled: num('cancelled'), failing};
}
const targeted = [...new Set(selected.flatMap((m) => m.tests))];
const baseline = runTests(targeted, 'baseline targeted');
if (baseline.exitCode !== 0) throw Error('Baseline is red: ' + JSON.stringify(baseline));
const results = [];
for (const m of selected) {
  const file = path.join(sandbox, m.file), original = fs.readFileSync(file), digest = createHash('sha256').update(original).digest('hex');
  let first, full = null;
  try {
    fs.writeFileSync(file, original.toString('utf8').replace(m.needle, m.replace));
    first = runTests(m.tests, 'targeted');
    if (first.exitCode === 0) full = runTests(allTests, 'full suite');
  } finally {
    fs.writeFileSync(file, original);
    if (createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== digest) throw Error('Restore failed for ' + m.file);
  }
  const killed = first.exitCode !== 0 || (full && full.exitCode !== 0);
  const row = {id: m.id, file: m.file, claim: m.claim, needle: m.needle, replace: m.replace, verdict: killed ? (first.fail > 0 || full?.fail > 0 ? 'killed' : 'killed-by-timeout-or-cancel') : 'SURVIVED', targeted: first, full};
  results.push(row);
  console.log(m.id, row.verdict, JSON.stringify({t: [first.pass, first.fail, first.cancelled], full: full && [full.pass, full.fail, full.cancelled]}));
}
const after = treeState();
writeResult('mutation-results.json', {rig: nodeRig(), treeBefore: before, treeAfter: after, restoredClean: after.statusShort.length === 0, baseline, summary: {total: results.length, killed: results.filter((r) => r.verdict !== 'SURVIVED').length, survived: results.filter((r) => r.verdict === 'SURVIVED').map((r) => r.id)}, results});
console.log(mask(JSON.stringify({restoredClean: after.statusShort.length === 0, survived: results.filter((r) => r.verdict === 'SURVIVED').map((r) => r.id + ' ' + r.claim)}, null, 1)));
