// Mutation sweep for Nautilus guards. Each mutant edits one tracked file, runs the named
// checks, and restores the original bytes in a finally. The pristine baseline runs first and
// must be green before any verdict is reported. CAUGHT = a check's own failure summary;
// CRASH = non-zero exit without an assertion summary (reported separately, never as caught).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const only = process.argv.slice(2);
const CMD = {
  test: ['node', ['--test', '--test-force-exit', ...fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.test.mjs')).map(f => 'tests/' + f)]],
  check: ['node', ['tools/check.mjs']],
  upstream: ['node', ['tools/test-upstream.mjs']],
  build: ['node', ['tools/build.mjs']],
};
function run(name) {
  const [exe, args] = CMD[name];
  const t0 = Date.now(), r = spawnSync(exe, args, {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000, windowsHide: true});
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = /ℹ pass (\d+)/.exec(out)?.[1], fail = /ℹ fail (\d+)/.exec(out)?.[1];
  const failing = [...out.matchAll(/^✖ (.+?) \(\d/mg)].map(m => m[1]).filter(n => !/^tests\//.test(n)).slice(0, 4);
  const error = (/^(?:Error|TypeError|SyntaxError)[^\n]*/m.exec(out) || [''])[0].slice(0, 160);
  let verdict;
  if (r.status === 0) verdict = 'PASS';
  else if (fail !== undefined && Number(fail) > 0) verdict = 'CAUGHT';
  else if (name !== 'test' && /Error: /.test(out) && !/SyntaxError|Cannot find module|ERR_MODULE_NOT_FOUND/.test(out)) verdict = 'CAUGHT';
  else verdict = 'CRASH';
  return {name, status: r.status, verdict, pass, fail, failing, error: verdict === 'PASS' ? '' : error, seconds: Math.round((Date.now() - t0) / 1000)};
}
const V = 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics';
const MUTANTS = [
  {id: 'M01-vendor-byte', file: V + '/core/connections.js', append: '\n// mutant\n', checks: ['check']},
  {id: 'M02-adapter-map-key-whitelist', file: 'packages/adapters/tinderbox/index.js', find: "  keys(source, MAP_KEYS, 'map', 'UNSUPPORTED_MAP_FIELD');\n", replace: '\n', checks: ['test']},
  {id: 'M03-adapter-cropped-terrain', file: 'packages/adapters/tinderbox/index.js', find: "if (terrain !== 'yard') fail('CROPPED_CONTENT'", replace: "if (false) fail('CROPPED_CONTENT'", checks: ['test']},
  {id: 'M04-adapter-scenario-mismatch', file: 'packages/adapters/tinderbox/index.js', find: 'if (canonical(save.scenario) !== canonical(expected.scenario)) fail(', replace: 'if (false) fail(', checks: ['test']},
  {id: 'M05-adapter-player-clearance', file: 'packages/adapters/tinderbox/index.js', find: '< radius - 1e-10', replace: '< -1', checks: ['test']},
  {id: 'M06-prefab-catalogue-identity', file: 'packages/prefab-core/index.js', find: 'if(!catalogueHasAsset(data.catalogue,instance?.asset))fail(', replace: 'if(false)fail(', checks: ['test']},
  {id: 'M07-prefab-roof-lot-overlap', file: 'packages/prefab-core/index.js', find: 'if(roofs.some(roof=>roof.x<lot.x+lot.width-1e-6', replace: 'if(false&&roofs.some(roof=>roof.x<lot.x+lot.width-1e-6', checks: ['test']},
  {id: 'M08-prefab-wall-intersects-lot', file: 'packages/prefab-core/index.js', find: 'function wallIntersectsLot(run,lot) {\n', replace: 'function wallIntersectsLot(run,lot) {return false;\n', checks: ['test']},
  {id: 'M09-prefab-lots-overlap', file: 'packages/prefab-core/index.js', find: 'export const lotsOverlap = (a,b) => ', replace: 'export const lotsOverlap = (a,b) => false && ', checks: ['test']},
  {id: 'M10-prefab-flat-clear-ground', file: 'packages/prefab-core/index.js', find: "if(!floorTerrain(terrain) || /woodland|wetland|bog/.test(terrain) || occupied.has(x+','+y))return", replace: 'if(false)return', checks: ['test']},
  {id: 'M11-roof-capability-handoff', file: 'packages/map-core/roof-maps.js', find: 'if(roofsOf(map).length&&!features.includes(ROOF_FEATURE))throw', replace: 'if(false)throw', checks: ['test']},
  {id: 'M12-roof-same-layer-overlap', file: 'packages/map-core/roof-data.js', find: 'if(other.z===roof.z&&intersects(', replace: 'if(false&&other.z===roof.z&&intersects(', checks: ['test']},
  {id: 'M13-negotiate-version-range', file: 'packages/map-core/capabilities.js', find: 'version >= feature.minVersion && version <= feature.maxVersion', replace: 'true', checks: ['test']},
  {id: 'M14-persistence-keeps-raw', file: 'packages/map-core/persistence.js', find: '    return raw;\n', replace: '    return JSON.parse(document.export());\n', checks: ['test']},
  {id: 'M15-headless-renderer-import', file: 'packages/map-core/inspection.js', prepend: "import '../../" + V + "/vendor/three.module.js';\n", checks: ['test', 'check']},
  {id: 'M16-editor-sendToGame-capabilities', file: 'apps/editor/editor.js', find: '    if (gameAdapter.manifest) assertBlueprintCompatible(document.map, gameAdapter.manifest);\n    else assertMapCapabilities(document.map,gameAdapter.features||[]);\n', replace: '\n', checks: ['test', 'check', 'build']},
  {id: 'M17-building-design-dimension', file: 'packages/building-catalog/designs.js', find: "p(0,0,11,10,1,'hip')", replace: "p(0,0,11,10.5,1,'hip')", checks: ['check']},
  {id: 'M18-prefab-max-buildings', file: 'packages/prefab-core/index.js', find: 'data.instances.length>MAX_BUILDINGS', replace: 'data.instances.length>MAX_BUILDINGS*100', checks: ['test']},
];
const results = {baseline: {}, mutants: []};
const needed = new Set(MUTANTS.filter(m => !only.length || only.includes(m.id)).flatMap(m => m.checks));
for (const name of needed) { results.baseline[name] = run(name); console.error('baseline', name, results.baseline[name].verdict, results.baseline[name].pass ?? '', results.baseline[name].seconds + 's'); }
if (Object.values(results.baseline).some(r => r.verdict !== 'PASS')) { console.log(JSON.stringify(results, null, 2)); throw Error('Sandbox baseline is not green; refusing to judge mutants.'); }
const touched = new Set();
for (const m of MUTANTS) {
  if (only.length && !only.includes(m.id)) continue;
  const file = path.join(root, m.file), original = fs.readFileSync(file);
  touched.add(m.file);
  const text = original.toString('utf8');
  let mutated;
  if (m.append) mutated = text + m.append;
  else if (m.prepend) mutated = m.prepend + text;
  else {
    const count = text.split(m.find).length - 1;
    if (count !== 1) { results.mutants.push({id: m.id, verdict: 'NEEDLE-' + count}); continue; }
    mutated = text.replace(m.find, m.replace);
  }
  const record = {id: m.id, file: m.file, runs: []};
  try {
    fs.writeFileSync(file, mutated);
    for (const name of m.checks) { const r = run(name); record.runs.push(r); console.error(m.id, name, r.verdict, r.fail ?? '', r.failing.join(' | ').slice(0, 160), r.error); }
  } finally {
    fs.writeFileSync(file, original);
  }
  results.mutants.push(record);
}
execFileSync('git', ['-C', root, 'checkout', '--', ...touched]);
results.statusAfter = execFileSync('git', ['-C', root, 'status', '--short', '--untracked-files=no'], {encoding: 'utf8'});
fs.writeFileSync(path.join(root, 'artifacts/exp/mutation-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.mutants.map(m => ({id: m.id, verdict: m.verdict, runs: m.runs?.map(r => r.name + ':' + r.verdict + (r.fail ? '(' + r.fail + ' failed)' : '') + (r.failing?.length ? ' [' + r.failing.join(' | ').slice(0, 200) + ']' : '') + (r.error ? ' {' + r.error + '}' : ''))})), null, 2));
console.log('status after:', JSON.stringify(results.statusAfter));
