// Round 5 mutation harness (round 4's mutate-r4.mjs, its rules unchanged): mutants of the answer's
// new code that its own harness (mutate-a4.mjs) did not try - the clusters and the extent, the
// layer's release and view, the drive object, the editor paths the drive does not set (roofs
// off, walls off, the library's view override), and the bench's `own` flag and waits - plus two
// controls that must die.
//   node mutate-r5.mjs <tree> <out.json> [--only id,id] [--confirm] [--dry]
// Rules: refuses a dirty tree; every needle occurs exactly once; every touched file is restored
// byte for byte in a finally and its hash verified; HEAD and status are recorded before and
// after each mutant. Children are spawned with streamed output (no buffer limit); a null exit
// (timeout, signal, the memory watchdog) is an ERROR, never a kill or a pass; node:test's
// cancelled count is reported, and a kill by cancellation alone is flagged. The watchdog polls
// free memory every 2 s and, below 12 GB, stops the child's process tree (only processes this
// harness started). Phase 1 runs each mutant's module tests; --confirm runs the whole suite and
// tools/check.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const TREE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const args = process.argv.slice(4), only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null, confirm = args.includes('--confirm');
const git = (...a) => execFileSync('git', ['-C', TREE, '--no-optional-locks', ...a], {encoding: 'utf8'}).trim();
const sha = b => createHash('sha256').update(b).digest('hex');
const status0 = git('status', '--porcelain'), head0 = git('rev-parse', 'HEAD');
if (status0) throw Error('Refusing a dirty tree:\n' + status0);

const CB = 'apps/editor/copy-batch.js', PS = 'apps/editor/prefab-scene.js', PO = 'packages/prefab-core/provider-original.js', CT = 'tools/asset-draw-counts.mjs';
const BR = 'tools/bench-asset-rendering.mjs', EP = 'tools/bench/editor-probe.js';
const LAYER = ['tests/editor-copy-batch.test.mjs', 'tests/prefab-display-batches.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/prefab-providers.test.mjs', 'tests/building-library-lifecycle.test.mjs', 'tests/asset-draw-counts.test.mjs', 'tests/editor-roofs.test.mjs', 'tests/editor-roof-paint.test.mjs'];
const COUNT = ['tests/asset-draw-counts.test.mjs'], NONE = [];
const e = (file, needle, replace) => ({file, needle, replace});
const MUTANTS = [
  // Controls: the answer's own falsifiers, which must still die here
  {id: 'K0a-control-editor-never-batches', why: 'control (round 3 E1 / the answer\'s P1, Q0a): must be killed', edits: [e(PS, "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});}", "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();},{instancing:false});}")], tests: LAYER},
  {id: 'K0b-control-no-per-copy-culling', why: 'control (K3, Q0b): must be killed', edits: [e(CB, 'if(this.perObjectFrustumCulled&&!frustum.intersectsSphere(this.spheres[k])){counts[k]=0;continue;}', '')], tests: LAYER},
  // The answer's SF-F claim, reproduced: round 4's Q5 and its edit- and open-path analogues die by the count tests
  {id: 'R-Q5-editor-rebuild-never-cuts-prefabs', why: 'round 4 Q5 (the answer\'s claim: now killed)', edits: [e(PS, 'rebuild() {super.rebuild();this.prefabs?.update(this.document,this.options);}', 'rebuild() {super.rebuild();this.prefabs?.update(this.document,{...this.options,showAllLevels:true});}')], tests: COUNT},
  {id: 'R-Q5b-editor-edit-never-cuts-prefabs', why: 'the answer\'s Q5b', edits: [e(PS, 'async update(document) {await super.update(document);await this.prefabs.update(document,this.options);}', 'async update(document) {await super.update(document);await this.prefabs.update(document,{...this.options,showAllLevels:true});}')], tests: COUNT},
  {id: 'R-Q5c-editor-open-cuts-prefabs', why: 'the answer\'s Q5c', edits: [e(PS, 'async open(document) {await super.open(document);await this.prefabs.update(document,this.options);}', 'async open(document) {await super.open(document);await this.prefabs.update(document,{...this.options,showAllLevels:false});}')], tests: COUNT},
  // Clusters, the extent and the layer
  {id: 'C1-extent-ignores-template-root', why: 'the extent taken in the template\'s world frame, not its root\'s (equal while a provider\'s root sits at the origin)', edits: [e(PS, 'inverse=new T.Matrix4().copy(template.model.root.matrixWorld).invert()', 'inverse=new T.Matrix4()')], tests: LAYER},
  {id: 'C2-copy-matrices-stale', why: 'the copies\' world matrices not refreshed before clustering and batching (a moved copy is batched where it was)', edits: [e(PS, 'template.model.root.updateMatrixWorld(true);for(const model of models)model.root.updateMatrixWorld(true);', 'template.model.root.updateMatrixWorld(true);')], tests: LAYER},
  {id: 'C3-exactly-eight-not-batched', why: 'a cluster of exactly BATCHED copies drawn per copy', edits: [e(PS, '        if(cluster.length<this.batched)continue;\n', '        if(cluster.length<=this.batched)continue;\n')], tests: LAYER},
  {id: 'C4-union-links-a-node-not-its-root', why: 'union-find links the node, not its root: chains break', edits: [e(PS, 'parent[root(order[i])]=root(order[j]);', 'parent[order[i]]=root(order[j]);')], tests: LAYER},
  {id: 'C5-release-shows-every-copy-node', why: 'released copies show every node, whatever the view (the pending-load window)', edits: [e(PS, 'for(const copy of copies)copy.visible=node.visible;}this.instanced=[];}', 'for(const copy of copies)copy.visible=true;}this.instanced=[];}')], tests: LAYER},
  {id: 'C6-glass-batched-too', why: 'glass (one material) batched as well: it no longer sorts back to front per copy', edits: [e(PS, 'const instanceable=node=>node.isMesh&&Array.isArray(node.material);', 'const instanceable=node=>node.isMesh;')], tests: LAYER},
  {id: 'C7-cluster-spheres-unturned', why: 'each copy\'s sphere moved to the copy but not turned with it', edits: [e(PS, 'neighbourhoods(models.map(model=>sphere.clone().applyMatrix4(model.root.matrixWorld)))', 'neighbourhoods(models.map(model=>sphere.clone().translate(model.root.position)))')], tests: LAYER},
  // The drive object (the headless count's stand-in for the AFT scene)
  {id: 'D6-drive-open-no-rebuild', why: 'the stand-in\'s open sets the document without rebuilding (walls and roofs are rebuilt only there)', edits: [e(CT, 'async open(document) {this.document = document; this.rebuild();},', 'async open(document) {this.document = document;},')], tests: COUNT},
  {id: 'D7-drive-update-no-rebuild', why: 'the stand-in\'s update sets the document without rebuilding', edits: [e(CT, 'async update(document) {this.document = document; this.rebuild();},', 'async update(document) {this.document = document;},')], tests: COUNT},
  {id: 'D10-roof-atlas-not-marked-loaded', why: 'the count no longer marks the roof atlas loaded: open() waits for a texture Node cannot load', edits: [e(CT, ' s.roofPaintReady = Promise.resolve();', '')], tests: COUNT},
  // Editor paths the drive never sets (roofs and walls stay on in every counted view)
  {id: 'F1-roofs-off-no-cut', why: 'unticking Roofs no longer shows the buildings\' cutaway', edits: [e(PS, 'cut=!this.options.showAllLevels||!this.options.roofs;', 'cut=!this.options.showAllLevels;')], tests: LAYER},
  {id: 'F2-walls-off-ignored', why: 'unticking Walls no longer hides original buildings\' walls', edits: [e(PO, "if(options.walls===false)for(const child of source.root.children)if(['exterior','interior','glazing','trim','door'].includes(child.userData.kind))child.visible=false;", '')], tests: LAYER},
  {id: 'F3-rebuild-walls-always-on', why: 'the editor\'s rebuild tells the prefab layer walls are on (Q5\'s analogue for the Walls option)', edits: [e(PS, 'rebuild() {super.rebuild();this.prefabs?.update(this.document,this.options);}', 'rebuild() {super.rebuild();this.prefabs?.update(this.document,{...this.options,walls:true});}')], tests: LAYER},
  {id: 'F4-library-override-ignored', why: 'the building library\'s floor control (setView override) no longer changes the view', edits: [e(PS, 'template.model.setView(override||{view:cut', 'template.model.setView({view:cut')], tests: LAYER},
  // The bench: the GPU flag and the waits for the editor's own prefab update
  {id: 'B1-own-flag-always-true', why: 'every GPU span reported as the GPU\'s own time', edits: [e(BR, 'own: {a: ms.a > row.views[view].cpuMs.a, b: ms.b > row.views[view].cpuMs.b}', 'own: {a: true, b: true}')], tests: NONE},
  {id: 'B2-open-wait-dropped', why: 'the bench stops waiting for the update the floor control starts after open', edits: [e(BR, 'await window.nautilus.open(t); await window.editor3d.scene.prefabs?.pending;}', 'await window.nautilus.open(t);}')], tests: NONE},
  {id: 'B3-cutaway-no-wait', why: 'the bench\'s cutaway stops waiting for the update setOptions starts', edits: [e(EP, "if ('pending' in s.prefabs) await s.prefabs.pending; else", "if ('pending' in s.prefabs) {} else")], tests: NONE}
];

function run(cmd, argv, timeout) {
  return new Promise(resolve => {
    const t0 = Date.now(), child = spawn(cmd, argv, {cwd: TREE, windowsHide: true}); let out = '', stopped = null, minFree = os.freemem();
    child.stdout.on('data', d => {out += d;}); child.stderr.on('data', d => {out += d;});
    const stop = why => {if (stopped) return; stopped = why; try {execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {stdio: 'ignore'});} catch {}};
    const timer = setTimeout(() => stop('timeout'), timeout), watch = setInterval(() => {const free = os.freemem(); minFree = Math.min(minFree, free); if (free < 12 * 2 ** 30) stop('memory');}, 2000);
    child.on('close', (code, signal) => {
      clearTimeout(timer); clearInterval(watch);
      const grab = k => {const m = out.match(new RegExp('\\u2139 ' + k + ' (\\d+)')); return m ? Number(m[1]) : null;};
      resolve({cmd: [path.basename(cmd), ...argv].join(' ').slice(0, 200), exit: stopped ? null : code, signal, stopped, ms: Date.now() - t0, minFreeGB: +(minFree / 2 ** 30).toFixed(1),
        tests: grab('tests'), pass: grab('pass'), fail: grab('fail'), cancelled: grab('cancelled'),
        failing: [...out.matchAll(/^\s*✖ (.*?)(?: \(\d+(?:\.\d+)?m?s\))?$/gm)].map(m => m[1].slice(0, 160)).slice(0, 4), tail: out.split('\n').filter(l => /Error|differs|changed|AssertionError|Refused|refused/.test(l)).slice(0, 3).map(l => l.slice(0, 240))});
    });
  });
}
async function mutate(m, commands) {
  const files = [...new Set(m.edits.map(x => x.file))], originals = new Map(files.map(f => [f, fs.readFileSync(path.join(TREE, f))]));
  const record = {id: m.id, files, why: m.why, headBefore: git('rev-parse', 'HEAD'), statusBefore: git('status', '--porcelain') || '(clean)', runs: []};
  try {
    const texts = new Map();
    for (const x of m.edits) {
      const text = texts.get(x.file) ?? originals.get(x.file).toString('utf8'), count = text.split(x.needle).length - 1;
      if (count !== 1) {record.invalid = 'needle occurs ' + count + ' times in ' + x.file + ': ' + x.needle.slice(0, 80); return record;}
      texts.set(x.file, text.replace(x.needle, () => x.replace));
    }
    for (const [file, text] of texts) fs.writeFileSync(path.join(TREE, file), text);
    for (const c of commands(m)) record.runs.push(await run(...c));
    record.error = record.runs.some(r => r.exit === null);
    record.killed = !record.error && record.runs.some(r => r.exit !== 0);
    record.killedByCancelOnly = record.killed && record.runs.every(r => r.exit === 0 || ((r.fail ?? 0) > 0 && (r.fail ?? 0) === (r.cancelled ?? 0)));
  } finally {
    for (const [file, bytes] of originals) fs.writeFileSync(path.join(TREE, file), bytes);
    record.restored = files.every(f => sha(fs.readFileSync(path.join(TREE, f))) === sha(originals.get(f)));
    record.statusAfterRestore = git('status', '--porcelain') || '(clean)';
    record.headAfter = git('rev-parse', 'HEAD');
  }
  if (!record.restored) throw Error('Restore failed for ' + m.id);
  if (record.statusAfterRestore !== '(clean)') throw Error('Tree not clean after ' + m.id + ':\n' + record.statusAfterRestore);
  return record;
}
const allTests = () => fs.readdirSync(path.join(TREE, 'tests')).filter(f => f.endsWith('.test.mjs')).sort().map(f => 'tests/' + f);
if (args.includes('--dry')) {
  let bad = 0; for (const m of MUTANTS) {const texts = new Map(); for (const x of m.edits) {const t = texts.get(x.file) ?? fs.readFileSync(path.join(TREE, x.file), 'utf8'), n = t.split(x.needle).length - 1; if (n !== 1) {bad++; console.log('BAD', m.id, x.file, n);} else texts.set(x.file, t.replace(x.needle, () => x.replace));}}
  for (const m of MUTANTS) for (const t of m.tests) if (!fs.existsSync(path.join(TREE, t))) {bad++; console.log('NO TEST', m.id, t);}
  console.log('dry run: ' + MUTANTS.length + ' mutants, ' + bad + ' problems'); process.exit(bad ? 1 : 0);
}
const result = {script: 'mutate-r5.mjs', phase: confirm ? 'confirm: whole suite + tools/check.mjs' : 'phase 1: module tests', started: new Date().toISOString(), node: process.version, head: head0, statusBefore: status0 || '(clean)', mutants: []};
const list = MUTANTS.filter(m => !only || only.has(m.id)).filter(m => confirm || m.tests.length);
try {
  for (const m of list) {
    const commands = confirm
      ? () => [[process.execPath, ['--test', '--test-timeout=300000', ...allTests()], 1800000], [process.execPath, ['tools/check.mjs'], 600000]]
      : x => [[process.execPath, ['--test', '--test-timeout=240000', ...x.tests], 900000]];
    const r = await mutate(m, commands);
    result.mutants.push(r);
    process.stdout.write(`${new Date().toTimeString().slice(0, 8)} ${m.id}: ${r.invalid ? 'INVALID ' + r.invalid : r.error ? 'ERROR ' + r.runs.map(x => x.stopped).join(',') : r.killed ? 'killed' + (r.killedByCancelOnly ? ' (by cancellation only)' : '') : 'SURVIVED'} ${r.runs.map(x => `[exit ${x.exit} ${x.pass}/${x.tests} cancelled ${x.cancelled} ${Math.round(x.ms / 1000)}s free>=${x.minFreeGB}G ${x.failing[0] || ''}]`).join(' ').slice(0, 300)}\n`);
    fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  }
} finally {
  result.finished = new Date().toISOString();
  result.headAfter = git('rev-parse', 'HEAD'); result.statusAfter = git('status', '--porcelain') || '(clean)';
  result.summary = {total: result.mutants.length, killed: result.mutants.filter(m => m.killed).map(m => m.id), survived: result.mutants.filter(m => !m.invalid && !m.error && !m.killed).map(m => m.id), errors: result.mutants.filter(m => m.error).map(m => m.id), invalid: result.mutants.filter(m => m.invalid).map(m => m.id)};
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result.summary, null, 1));
}
