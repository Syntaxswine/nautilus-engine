// Round-2 mutation sweep. The pristine baseline must pass first; every mutant is a list of
// exact edits (each needle must occur once), applied together and restored byte-for-byte in a
// finally. Verdicts come from node:test's own summary, never from the exit code alone:
// KILLED = at least one failing test; SURVIVED = clean pass; CRASH = non-zero exit without a
// failing-test count; TIMEOUT = the per-run limit fired (never reported as a kill).
// Usage: node artifacts/r2/mut.mjs <root> [id-prefix ...]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';

const root = path.resolve(process.argv[2]);
const only = process.argv.slice(3);
const T = 'packages/adapters/tinderbox/index.js', P = 'packages/map-core/persistence.js',
  B = 'packages/prefab-core/index.js', D = 'packages/map-core/prefab-document.js',
  H = 'apps/editor/game-handoff.js', E = 'apps/editor/editor.js';
const LINE157 = 'return Math.hypot(Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0)) < radius - 1e-10;';
const e = (file, find, replace) => ({file, find, replace});
const MUTANTS = [
  // The author's ten, verbatim from rung1-mutants.mjs.
  {id: 'A-M05 clearance disabled (< -1)', edits: [e(T, '< radius - 1e-10', '< -1')]},
  {id: 'A-M05b clearance tightened (< r+0.1)', edits: [e(T, '< radius - 1e-10', '< radius + 0.1')]},
  {id: 'A-M14 load returns editor export', edits: [e(P, '    return raw;\n', '    return JSON.parse(document.export());\n')]},
  {id: 'A-M18 limit x100', edits: [e(B, 'data.instances.length>MAX_BUILDINGS', 'data.instances.length>MAX_BUILDINGS*100')]},
  {id: 'A-M18b limit >=', edits: [e(B, 'data.instances.length>MAX_BUILDINGS', 'data.instances.length>=MAX_BUILDINGS')]},
  {id: 'A-M16 both capability checks removed', edits: [e(H, '  if (adapter.manifest) assertBlueprintCompatible(document.map, adapter.manifest);\n  else assertMapCapabilities(document.map, adapter.features || []);\n', '\n')]},
  {id: 'A-M16a manifest check removed', edits: [e(H, 'if (adapter.manifest) assertBlueprintCompatible(document.map, adapter.manifest);', 'if (adapter.manifest) {}')]},
  {id: 'A-M16b feature-list check removed', edits: [e(H, 'else assertMapCapabilities(document.map, adapter.features || []);', 'else {}')]},
  {id: 'A-M16c silent host gets all features', edits: [e(H, 'adapter.features || []', "adapter.features || ['nautilus-building-prefabs-v1', 'nautilus-original-buildings-v1', 'nautilus-sloped-roofs-v1']")]},
  {id: 'A-M16d raw input handed over', edits: [e(H, '{json: document.export(), contract: MAP_CONTRACT}', '{json, contract: MAP_CONTRACT}')]},

  // Clearance: the wall branch (line 157) and its siblings in the same `if` (155) and constant (8).
  {id: 'C01 hypot -> max (Chebyshev corners)', edits: [e(T, 'return Math.hypot(Math.max(Math.abs(player.x', 'return Math.max(Math.max(Math.abs(player.x')]},
  {id: 'C02 hypot -> sum (Manhattan corners)', edits: [e(T, 'return Math.hypot(Math.max(Math.abs(player.x', 'return (Math.max(Math.abs(player.x'), e(T, '/ 2, 0), Math.max(Math.abs(player.y', '/ 2, 0) + Math.max(Math.abs(player.y')]},
  {id: 'C03 vertical wall length -> thickness (y extent)', edits: [e(T, '(swap ? m.width : m.depth) / 2, 0)) < radius', '(swap ? m.depth : m.depth) / 2, 0)) < radius')]},
  {id: 'C04 horizontal wall length -> thickness (x extent)', edits: [e(T, '(swap ? m.depth : m.width) / 2, 0), Math.max(', '(swap ? m.depth : m.depth) / 2, 0), Math.max(')]},
  {id: 'C05 y extent copies x extent (axis paste)', edits: [e(T, '(swap ? m.width : m.depth) / 2, 0)) < radius', '(swap ? m.depth : m.width) / 2, 0)) < radius')]},
  {id: 'C06 swap = quarter % 4 (reversed walls)', edits: [e(T, 'Math.round(m.heading / (Math.PI / 2)) % 2;', 'Math.round(m.heading / (Math.PI / 2)) % 4;')]},
  {id: 'C07 x-term clamp dropped', edits: [e(T, 'return Math.hypot(Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), ', 'return Math.hypot(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, ')]},
  {id: 'C08 y-term clamp dropped', edits: [e(T, 'Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0)) < radius', '(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2)) < radius')]},
  {id: 'C09 playerRadius 0.56 -> 0.60', edits: [e(T, 'playerRadius: 0.56,', 'playerRadius: 0.6,')]},
  {id: 'C10 playerRadius 0.56 -> 0.53', edits: [e(T, 'playerRadius: 0.56,', 'playerRadius: 0.53,')]},
  {id: 'C11 centre distance, no box', edits: [e(T, LINE157, 'return Math.hypot(player.x - m.x, player.y - m.y) < radius - 1e-10;')]},
  {id: 'C12 full thickness, not half', edits: [e(T, '(swap ? m.depth : m.width) / 2, 0), Math.max(', '(swap ? m.depth : m.width), 0), Math.max(')]},
  {id: 'C13 first wall module skipped', edits: [e(T, 'modules.some(m => {', 'modules.slice(1).some(m => {')]},
  {id: 'C14 bounds: top edge dropped', edits: [e(T, 'player.y < radius || ', '')]},
  {id: 'C15 bounds: right edge dropped', edits: [e(T, 'player.x > r.width - radius || ', '')]},
  {id: 'C16 bounds: bottom edge dropped', edits: [e(T, 'player.y > r.height - radius || ', '')]},
  {id: 'C17 bounds: bottom edge uses width', edits: [e(T, 'player.y > r.height - radius', 'player.y > r.width - radius')]},

  // Persistence: line 51 and the other exits of the same "return the authored JSON" rule.
  {id: 'P00 neutral: deep copy of raw', edits: [e(P, '    return raw;\n', '    return JSON.parse(JSON.stringify(raw));\n')]},
  {id: 'P01 parseSave returns editor export', edits: [e(P, '  save.payload.data = data; return save;', '  save.payload.data = JSON.parse(new EditingDocument().open(JSON.stringify(data)).export()); return save;')]},
  {id: 'P02 createSave stores editor export', edits: [e(P, '  const data = loadBlueprint(input), requirements = blueprintRequirements(data);', '  const data = JSON.parse(new EditingDocument().open(JSON.stringify(loadBlueprint(input))).export()), requirements = blueprintRequirements(data);')]},
  {id: 'P03 load drops opaque metadata', edits: [e(P, '    return raw;\n', '    const {metadata, ...rest} = raw; return rest;\n')]},
  {id: 'P04 load returns the document map', edits: [e(P, '    return raw;\n', '    return structuredClone(document.map);\n')]},

  // The 32-building limit (line 39), its constant, and where it is enforced.
  {id: 'B01 limit > 33 (off by one up)', edits: [e(B, 'data.instances.length>MAX_BUILDINGS', 'data.instances.length>MAX_BUILDINGS+1')]},
  {id: 'B02 MAX_BUILDINGS = 33', edits: [e(B, 'export const MAX_BUILDINGS = 32;', 'export const MAX_BUILDINGS = 33;')]},
  {id: 'B03 limit counts distinct assets', edits: [e(B, 'data.instances.length>MAX_BUILDINGS', 'new Set(data.instances.map(p=>p?.asset)).size>MAX_BUILDINGS')]},
  {id: 'B04 limit only for the Gross catalogue', edits: [e(B, '||data.instances.length>MAX_BUILDINGS)fail(', '||data.catalogue===PREFAB_CATALOGUE&&data.instances.length>MAX_BUILDINGS)fail(')]},
  {id: 'B05 limit only at document open', edits: [e(B, '||data.instances.length>MAX_BUILDINGS)fail(', ')fail('),
    e(D, "    const raw=JSON.parse(text),errors=prefabErrors(raw);if(errors.length)throw Error(errors.join(' '));", "    const raw=JSON.parse(text),errors=prefabErrors(raw);if(errors.length)throw Error(errors.join(' '));if(raw?.buildingPrefabs?.instances?.length>32)throw Error('Unsupported building prefab catalogue/version, or more than 32 buildings.');")]},

  // The handoff module.
  {id: 'H00 neutral: check the parsed input', edits: [e(H, 'assertBlueprintCompatible(document.map, adapter.manifest)', 'assertBlueprintCompatible(JSON.parse(document.export()), adapter.manifest)')]},
  {id: 'H01 validation errors ignored', edits: [e(H, "  if (errors.length) throw Error(errors.join(' '));\n", '\n')]},
  {id: 'H02 openMap called without its host', edits: [e(H, '  return adapter.openMap({json: document.export(), contract: MAP_CONTRACT});', '  const open = adapter.openMap; return open({json: document.export(), contract: MAP_CONTRACT});')]},
  {id: 'H03 silent host defaults to wall runs', edits: [e(H, 'adapter.features || []', "adapter.features || ['nautilus-wall-runs-v1']")]},
  {id: 'H04 silent host defaults to prefabs', edits: [e(H, 'adapter.features || []', "adapter.features || ['nautilus-building-prefabs-v1']")]},
  {id: 'H05 null adapter not checked', edits: [e(H, "if (!adapter || typeof adapter.openMap !== 'function')", "if (typeof adapter.openMap !== 'function')")]},
  {id: 'H06 block check removed', edits: [e(H, "  if (document.block) throw Error('Place this block in a full map first.');\n", '\n')]},
  {id: 'H07 missing-host check removed', edits: [e(H, "  if (!adapter) throw Error('Connect a game adapter first.');\n", '\n')]},

  // The editor glue that still decides whether the tested module is used at all.
  {id: 'E01 sendToGame bypasses the checks', edits: [e(E, '  sendToGame(json = this.export()) {return sendMapToGame(json, gameAdapter);}', "  sendToGame(json = this.export()) {if (!gameAdapter) throw Error('Connect a game adapter first.');return gameAdapter.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT});}")]},
  {id: 'E02 connectGame skips checkGameAdapter', edits: [e(E, 'gameAdapter = checkGameAdapter(adapter);', 'gameAdapter = adapter;')]},
  {id: 'E03 sendToGame ignores its argument', edits: [e(E, '{return sendMapToGame(json, gameAdapter);}', '{return sendMapToGame(this.export(), gameAdapter);}')]},
  {id: 'E04 sendToGame default dropped', edits: [e(E, 'sendToGame(json = this.export())', 'sendToGame(json)')]},
];

const testFiles = fs.readdirSync(path.join(root, 'tests')).filter(n => n.endsWith('.test.mjs')).map(n => 'tests/' + n);
function suite() {
  const t0 = Date.now();
  const run = spawnSync(process.execPath, ['--test', ...testFiles], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000, windowsHide: true});
  const text = (run.stdout || '') + (run.stderr || ''), num = key => { const m = new RegExp('ℹ ' + key + ' (\\d+)').exec(text); return m ? +m[1] : null; };
  const failed = [...new Set([...text.matchAll(/^✖ (.+?)(?: \(\d[\d.]*ms\))?$/gm)].map(m => m[1]).filter(n => n !== 'failing tests:' && !n.startsWith('tests')))];
  const fail = num('fail');
  let verdict;
  if (run.error?.code === 'ETIMEDOUT' || run.signal) verdict = 'TIMEOUT';
  else if (run.status === 0 && fail === 0) verdict = 'SURVIVED';
  else if (fail > 0) verdict = 'KILLED';
  else verdict = 'CRASH';
  return {verdict, exit: run.status, tests: num('tests'), pass: num('pass'), fail, failed, seconds: Math.round((Date.now() - t0) / 1000),
    tail: verdict === 'CRASH' || verdict === 'TIMEOUT' ? text.slice(-600) : undefined};
}
const out = {root, node: process.version, baseline: suite(), mutants: []};
console.error('baseline', out.baseline.verdict, out.baseline.pass + '/' + out.baseline.tests, out.baseline.seconds + 's');
if (out.baseline.verdict !== 'SURVIVED') { console.log(JSON.stringify(out, null, 2)); process.exit(1); }
const backups = path.join(root, 'artifacts/r2/backup');
fs.mkdirSync(backups, {recursive: true});
for (const m of MUTANTS) {
  if (only.length && !only.some(prefix => m.id.startsWith(prefix))) continue;
  const files = [...new Set(m.edits.map(x => x.file))], originals = new Map(files.map(f => [f, fs.readFileSync(path.join(root, f))]));
  for (const [f, bytes] of originals) fs.writeFileSync(path.join(backups, f.replaceAll('/', '__')), bytes);
  const texts = new Map(files.map(f => [f, originals.get(f).toString('utf8')]));
  const bad = m.edits.map(x => [x, texts.get(x.file).split(x.find).length - 1]).filter(([, n]) => n !== 1);
  if (bad.length) { out.mutants.push({id: m.id, verdict: 'NEEDLE', detail: bad.map(([x, n]) => x.file + ' x' + n)}); console.error(m.id, 'NEEDLE'); continue; }
  for (const x of m.edits) texts.set(x.file, texts.get(x.file).replace(x.find, x.replace));
  let r;
  try {
    for (const f of files) fs.writeFileSync(path.join(root, f), texts.get(f));
    r = suite();
  } finally {
    for (const [f, bytes] of originals) fs.writeFileSync(path.join(root, f), bytes);
  }
  const restored = files.every(f => fs.readFileSync(path.join(root, f)).equals(originals.get(f)));
  out.mutants.push({id: m.id, files, ...r, restored});
  console.error(m.id, '|', r.verdict, r.fail ?? '', '|', r.failed.join(' || ').slice(0, 220), '|', r.seconds + 's', restored ? '' : 'NOT RESTORED');
}
out.statusAfter = execFileSync('git', ['-C', root, 'status', '--short'], {encoding: 'utf8'});
const name = only.length ? 'mutants-' + only.join('_').replace(/[^A-Za-z0-9_-]/g, '') + '.json' : 'mutants.json';
fs.writeFileSync(path.join(root, 'artifacts/r2', name), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.mutants.map(m => ({id: m.id, verdict: m.verdict, fail: m.fail, failed: m.failed})), null, 1));
console.log('status after:', JSON.stringify(out.statusAfter));
