// Round-4 mutation sweep (the answer to round 3), built on round 2's instrument and round 3's: the
// pristine baseline must pass first, every mutant is a list of exact edits (each needle must occur
// once), restored byte-for-byte in a finally, and verdicts come from node:test's own summary:
// KILLED = a failing test; SURVIVED = clean pass; CRASH = non-zero exit without a failing count;
// TIMEOUT = the per-run limit fired. Each mutant runs the touched test files first; a survivor there
// is re-run on the full suite, so every SURVIVED below is a full-suite survivor.
// It refuses a dirty tree (round 3's N3) unless --allow-dirty, and records HEAD and git status.
// Mutants: the author's 53 (round3-mut.mjs), round 3's 19 (r3-mut.mjs), and new E13-E23.
// Usage: node round4-mut.mjs <root> [--only=ID,ID] [--allow-dirty]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';

const root = path.resolve(process.argv[2]), flags = process.argv.slice(3);
const only = flags.find(f => f.startsWith('--only='))?.slice(7).split(','), allowDirty = flags.includes('--allow-dirty');
const T = 'packages/adapters/tinderbox/index.js', P = 'packages/map-core/persistence.js',
  B = 'packages/prefab-core/index.js', D = 'packages/map-core/prefab-document.js',
  H = 'apps/editor/game-handoff.js', E = 'apps/editor/editor.js';
const LINE157 = 'return Math.hypot(Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0)) < radius - 1e-10;';
const L157 = 'Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2';
const e = (file, find, replace) => ({file, find, replace});
const MUTANTS = [
  // Rung 1's ten, verbatim.
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
  // Round 2's clearance, persistence, limit and handoff mutants, verbatim.
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
  {id: 'P00 neutral: deep copy of raw', edits: [e(P, '    return raw;\n', '    return JSON.parse(JSON.stringify(raw));\n')]},
  {id: 'P01 parseSave returns editor export', edits: [e(P, '  save.payload.data = data; return save;', '  save.payload.data = JSON.parse(new EditingDocument().open(JSON.stringify(data)).export()); return save;')]},
  {id: 'P02 createSave stores editor export', edits: [e(P, '  const data = loadBlueprint(input), requirements = blueprintRequirements(data);', '  const data = JSON.parse(new EditingDocument().open(JSON.stringify(loadBlueprint(input))).export()), requirements = blueprintRequirements(data);')]},
  {id: 'P03 load drops opaque metadata', edits: [e(P, '    return raw;\n', '    const {metadata, ...rest} = raw; return rest;\n')]},
  {id: 'P04 load returns the document map', edits: [e(P, '    return raw;\n', '    return structuredClone(document.map);\n')]},
  {id: 'B01 limit > 33 (off by one up)', edits: [e(B, 'data.instances.length>MAX_BUILDINGS', 'data.instances.length>MAX_BUILDINGS+1')]},
  {id: 'B02 MAX_BUILDINGS = 33', edits: [e(B, 'export const MAX_BUILDINGS = 32;', 'export const MAX_BUILDINGS = 33;')]},
  {id: 'B03 limit counts distinct assets', edits: [e(B, 'data.instances.length>MAX_BUILDINGS', 'new Set(data.instances.map(p=>p?.asset)).size>MAX_BUILDINGS')]},
  {id: 'B04 limit only for the Gross catalogue', edits: [e(B, '||data.instances.length>MAX_BUILDINGS)fail(', '||data.catalogue===PREFAB_CATALOGUE&&data.instances.length>MAX_BUILDINGS)fail(')]},
  {id: 'B05 limit only at document open', edits: [e(B, '||data.instances.length>MAX_BUILDINGS)fail(', ')fail('),
    e(D, "    const raw=JSON.parse(text),errors=prefabErrors(raw);if(errors.length)throw Error(errors.join(' '));", "    const raw=JSON.parse(text),errors=prefabErrors(raw);if(errors.length)throw Error(errors.join(' '));if(raw?.buildingPrefabs?.instances?.length>32)throw Error('Unsupported building prefab catalogue/version, or more than 32 buildings.');")]},
  {id: 'H00 neutral: check the parsed input', edits: [e(H, 'assertBlueprintCompatible(document.map, adapter.manifest)', 'assertBlueprintCompatible(JSON.parse(document.export()), adapter.manifest)')]},
  {id: 'H01 validation errors ignored', edits: [e(H, "  if (errors.length) throw Error(errors.join(' '));\n", '\n')]},
  {id: 'H02 openMap called without its host', edits: [e(H, '  return adapter.openMap({json: document.export(), contract: MAP_CONTRACT});', '  const open = adapter.openMap; return open({json: document.export(), contract: MAP_CONTRACT});')]},
  {id: 'H03 silent host defaults to wall runs', edits: [e(H, 'adapter.features || []', "adapter.features || ['nautilus-wall-runs-v1']")]},
  {id: 'H04 silent host defaults to prefabs', edits: [e(H, 'adapter.features || []', "adapter.features || ['nautilus-building-prefabs-v1']")]},
  {id: 'H05 null adapter not checked', edits: [e(H, "if (!adapter || typeof adapter.openMap !== 'function')", "if (typeof adapter.openMap !== 'function')")]},
  {id: 'H06 block check removed', edits: [e(H, "  if (document.block) throw Error('Place this block in a full map first.');\n", '\n')]},
  {id: 'H07 missing-host check removed', edits: [e(H, "  if (!adapter) throw Error('Connect a game adapter first.');\n", '\n')]},
  // The connect/send state that moved out of editor.js (round 2's E01-E04, now in the module).
  {id: 'G01 default export dropped (E04)', edits: [e(H, 'sendToGame(json = exportMap())', 'sendToGame(json)')]},
  {id: 'G02 argument ignored (E03)', edits: [e(H, '{ return sendMapToGame(json, host); }', '{ return sendMapToGame(exportMap(), host); }')]},
  {id: 'G03 connect skips checkGameAdapter (E02)', edits: [e(H, 'host = checkGameAdapter(adapter); onChange();', 'host = adapter; onChange();')]},
  {id: 'G04 stale disconnect clears the newer host', edits: [e(H, 'if (host === adapter) {host = null; onChange();}', '{host = null; onChange();}')]},
  {id: 'G05 connect does not refresh', edits: [e(H, 'host = checkGameAdapter(adapter); onChange();', 'host = checkGameAdapter(adapter);')]},
  {id: 'G06 hasGameAdapter always true', edits: [e(H, 'get hasGameAdapter() { return !!host; }', 'get hasGameAdapter() { return true; }')]},
  {id: 'G07 send bypasses the checks', edits: [e(H, '{ return sendMapToGame(json, host); }', '{ return host.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT}); }')]},
  // The page wiring. Round 2's answer left it to the browser; the bridge test now runs it headlessly.
  {id: 'E01 page wires a bypass (browser-only)', edits: [e(E, '  connectGame: handoff.connectGame,\n  sendToGame: handoff.sendToGame', '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json = this.export()) {return window.bypassHost.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT});}')]},
  // Round 3's 19, verbatim (r3-mut.mjs).
  // Clearance: one neutral control, two positive controls the table must kill, six new mutants.
  {id: 'C00 neutral: hypot as sqrt of squares', edits: [e(T, 'return Math.hypot(Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0)) < radius - 1e-10;',
    'const ax = Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), ay = Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0); return Math.sqrt(ax * ax + ay * ay) < radius - 1e-10;')]},
  {id: 'C21 control: y term signed (m.y - player.y)', edits: [e(T, 'Math.abs(player.y - m.y)', '(m.y - player.y)')]},
  {id: 'C22 control: x term signed (player.x - m.x)', edits: [e(T, L157, '(player.x - m.x) - (swap ? m.depth : m.width) / 2')]},
  {id: 'C18 epsilon dropped (< radius)', edits: [e(T, '< radius - 1e-10;', '< radius;')]},
  {id: 'C19 swap only for heading pi/2 (walls drawn upwards misread)', edits: [e(T, 'Math.round(m.heading / (Math.PI / 2)) % 2;', 'Math.round(m.heading / (Math.PI / 2)) === 1;')]},
  {id: 'C20 x term signed (m.x - player.x)', edits: [e(T, L157, '(m.x - player.x) - (swap ? m.depth : m.width) / 2')]},
  {id: 'C23 right bound padded by a tile', edits: [e(T, 'player.x > r.width - radius ||', 'player.x > r.width - radius - 1 ||')]},
  {id: 'C24 bottom bound padded by a tile', edits: [e(T, 'player.y > r.height - radius ||', 'player.y > r.height - radius - 1 ||')]},
  {id: 'C27 right bound compared with the height', edits: [e(T, 'player.x > r.width - radius ||', 'player.x > r.height - radius ||')]},
  // The moved handoff state.
  {id: 'G08 a refused connect drops the current host', edits: [e(H, 'host = checkGameAdapter(adapter); onChange();', 'host = null; host = checkGameAdapter(adapter); onChange();')]},
  {id: 'G09 connect refreshes before the host is set', edits: [e(H, 'host = checkGameAdapter(adapter); onChange();', 'checkGameAdapter(adapter); onChange(); host = adapter;')]},
  {id: 'G10 disconnect refreshes before the host is cleared', edits: [e(H, 'if (host === adapter) {host = null; onChange();}', 'if (host === adapter) {onChange(); host = null;}')]},
  {id: 'G11 connect checks only that openMap is truthy', edits: [e(H, 'host = checkGameAdapter(adapter); onChange();', "if (!adapter?.openMap) throw new TypeError('Expected a game adapter.'); host = adapter; onChange();")]},
  // The page glue that is left in editor.js.
  {id: 'E05 exportMap closure drops its call', edits: [e(E, 'exportMap: () => window.nautilus.export()', 'exportMap: () => window.nautilus.export')]},
  {id: 'E06 onChange not wired', edits: [e(E, ', onChange: () => refreshHandoff()});', '});')]},
  {id: 'E07 page hasGameAdapter getter always true', edits: [e(E, 'get hasGameAdapter() { return handoff.hasGameAdapter; },', 'get hasGameAdapter() { return true; },')]},
  {id: 'E09 bypass only on the no-argument sendToGame()', edits: [e(E, '  connectGame: handoff.connectGame,\n  sendToGame: handoff.sendToGame', '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json) {return json === undefined ? window.bypassHost.openMap({json: this.export(), contract: MAP_CONTRACT}) : handoff.sendToGame(json);}')]},
  {id: 'E10 page sendToGame ignores its argument', edits: [e(E, '  sendToGame: handoff.sendToGame\n', '  sendToGame: json => handoff.sendToGame()\n')]},
  {id: 'E11 sendToGame assigned connectGame', edits: [e(E, '  sendToGame: handoff.sendToGame\n', '  sendToGame: handoff.connectGame\n')]},
  // Round 4: mutants of the page bridge that only the new bridge test can see (author's own).
  {id: 'E13 quick Send no longer mirrors Send', edits: [e(E, 'if (quick && button) {quick.disabled = button.disabled;quick.title = button.title;}', '')]},
  {id: 'E14 refresh ignores a block', edits: [e(E, 'const disabled = !handoff.hasGameAdapter || !!window.editor3d?.document?.block;', 'const disabled = !handoff.hasGameAdapter;')]},
  {id: 'E15 export() skips the loading check', edits: [e(E, "if (!this.document) throw Error('The editor is still loading.');", '')]},
  {id: 'E16 open() describes the raw input', edits: [e(E, 'return describeBlueprint(document.export());', 'return describeBlueprint(input);')]},
  {id: 'E17 the editor sync is not observed', edits: [e(E, "if (originalHandoff) handoffState.observe(originalHandoff, {attributes: true, attributeFilter: ['disabled']});", '')]},
  {id: 'E18 the body observer never disconnects', edits: [e(E, "if (document.getElementById('playtest')) observer.disconnect();", '')]},
  {id: 'E20 Send titles swapped', edits: [e(E, "'Send a validated copy; keep the blueprint here.' : 'Export JSON for a game, or connect a game adapter.'", "'Export JSON for a game, or connect a game adapter.' : 'Send a validated copy; keep the blueprint here.'")]},
  {id: 'E21 open() skips the editor', edits: [e(E, 'await window.editor3d.open(document);', '')]},
  {id: 'E22 a namespace import the doubles would hide', edits: [e(E, "import {installAssetLibrary} from './assets.js';", "import * as assets from './assets.js';")]},
  {id: 'E23 settings feedback stops mirroring the status', edits: [e(E, 'const reflect = () => {feedback.textContent = source.textContent;feedback.hidden = !feedback.textContent;};', 'const reflect = () => {feedback.hidden = !feedback.textContent;};')]}
];

const all = fs.readdirSync(path.join(root, 'tests')).filter(n => n.endsWith('.test.mjs')).map(n => 'tests/' + n);
const touched = ['tests/tinderbox-adapter.test.mjs', 'tests/contracts.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/game-handoff.test.mjs', 'tests/editor-host-bridge.test.mjs'];
function suite(files) {
  const t0 = Date.now();
  const run = spawnSync(process.execPath, ['--test', ...files], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000, windowsHide: true});
  const text = (run.stdout || '') + (run.stderr || ''), num = key => { const m = new RegExp('ℹ ' + key + ' (\\d+)').exec(text); return m ? +m[1] : null; };
  const failed = [...new Set([...text.matchAll(/^✖ (.+?)(?: \(\d[\d.]*ms\))?$/gm)].map(m => m[1]).filter(n => n !== 'failing tests:' && !n.startsWith('tests')))];
  const fail = num('fail');
  let verdict;
  if (run.error?.code === 'ETIMEDOUT' || run.signal) verdict = 'TIMEOUT';
  else if (run.status === 0 && fail === 0) verdict = 'SURVIVED';
  else if (fail > 0) verdict = 'KILLED';
  else verdict = 'CRASH';
  return {verdict, tests: num('tests'), pass: num('pass'), fail, failed, seconds: Math.round((Date.now() - t0) / 1000), tail: verdict === 'CRASH' || verdict === 'TIMEOUT' ? text.slice(-600) : undefined};
}
const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'});
const statusBefore = git(['status', '--short']);
if (statusBefore && !allowDirty) { console.error('Refusing a dirty tree:\n' + statusBefore); process.exit(2); }
const out = {node: process.version, head: git(['rev-parse', 'HEAD']).trim(), statusBefore, only, baseline: suite(all), mutants: []};
console.error('baseline', out.baseline.verdict, out.baseline.pass + '/' + out.baseline.tests, out.baseline.seconds + 's');
if (out.baseline.verdict !== 'SURVIVED') { console.log(JSON.stringify(out, null, 2)); process.exit(1); }
for (const m of MUTANTS.filter(m => !only || only.includes(m.id.split(' ')[0]))) {
  const files = [...new Set(m.edits.map(x => x.file))], originals = new Map(files.map(f => [f, fs.readFileSync(path.join(root, f))]));
  const texts = new Map(files.map(f => [f, originals.get(f).toString('utf8')]));
  const bad = m.edits.map(x => [x, texts.get(x.file).split(x.find).length - 1]).filter(([, n]) => n !== 1);
  if (bad.length) { out.mutants.push({id: m.id, verdict: 'NEEDLE', detail: bad.map(([x, n]) => x.file + ' x' + n)}); console.error(m.id, 'NEEDLE'); continue; }
  for (const x of m.edits) texts.set(x.file, texts.get(x.file).replace(x.find, x.replace));
  let r, scope = 'touched';
  try {
    for (const f of files) fs.writeFileSync(path.join(root, f), texts.get(f));
    r = suite(touched);
    if (r.verdict === 'SURVIVED') { r = suite(all); scope = 'full'; }
  } finally {
    for (const [f, bytes] of originals) fs.writeFileSync(path.join(root, f), bytes);
  }
  const restored = files.every(f => fs.readFileSync(path.join(root, f)).equals(originals.get(f)));
  out.mutants.push({id: m.id, scope, ...r, restored});
  console.error(m.id, '|', r.verdict, scope, '|', r.failed.join(' || ').slice(0, 200), '|', r.seconds + 's', restored ? '' : 'NOT RESTORED');
}
out.statusAfter = execFileSync('git', ['-C', root, 'status', '--short'], {encoding: 'utf8'});
console.log(JSON.stringify(out, null, 1));
