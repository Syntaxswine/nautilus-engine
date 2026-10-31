// Round 4 mutation harness: mutants of the answer's new code aimed at what its own harness
// (mutate-a3.mjs) did not try, plus probes of what the gates can see.
//   node mutate-r4.mjs <tree> <out.json> [--only id,id] [--confirm] [--dry]
// Rules (round 3's): refuses a dirty tree; every needle occurs exactly once; every touched
// file is restored byte for byte in a finally and its hash verified; HEAD and status are
// recorded before and after each mutant. A child's null exit (timeout, signal, the memory
// watchdog) is an ERROR, never a kill or a pass; node:test's cancelled count is reported.
// The watchdog polls free memory every 2 s and, below 12 GB, stops the child's process tree
// (only processes this harness started). Phase 1 runs the module tests; --confirm runs the
// whole suite and tools/check.mjs.
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

const CB = 'apps/editor/copy-batch.js', PS = 'apps/editor/prefab-scene.js', BC = 'packages/building-catalog/three.js';
const COPY = ['tests/editor-copy-batch.test.mjs', 'tests/prefab-display-batches.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/prefab-providers.test.mjs', 'tests/building-library-lifecycle.test.mjs', 'tests/asset-draw-counts.test.mjs'];
const DIGEST = ['tests/building-geometry.test.mjs', 'tests/building-catalog.test.mjs', 'tests/shared-assets.test.mjs', 'tests/prefab-display-batches.test.mjs'];
const e = (file, needle, replace) => ({file, needle, replace});
const MUTANTS = [
  // Controls: the answer's own falsifiers, which must still die here
  {id: 'Q0a-control-editor-never-batches', why: 'control (the answer\'s P1, round 3\'s E1): must be killed', edits: [e(PS, "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});}", "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();},{instancing:false});}")], tests: COPY},
  {id: 'Q0b-control-no-per-copy-culling', why: 'control (the answer\'s K3): must be killed', edits: [e(CB, 'if(this.perObjectFrustumCulled&&!frustum.intersectsSphere(this.spheres[k])){run=-1;continue;}', '')], tests: COPY},
  // CopyBatch: branches and frames the editor's providers never reach
  {id: 'Q1-shadow-culled-by-view-camera', why: 'a shadow camera culls copies by the view camera instead of its own frustum', edits: [e(CB, 'this.onBeforeRender(renderer,null,shadowCamera,geometry,depthMaterial,group);', 'this.onBeforeRender(renderer,null,camera,geometry,depthMaterial,group);')], tests: COPY},
  {id: 'Q2-draw-range-ignored', why: 'a sub-draw ignores geometry.drawRange (the renderer clips a group to it)', edits: [e(CB, 'first=Math.max(range.start,group?group.start:0)', 'first=(group?group.start:0)'), e(CB, 'Math.min(range.start+range.count,group?group.start+group.count:Infinity,vertices)', 'Math.min(group?group.start+group.count:Infinity,vertices)')], tests: COPY},
  {id: 'Q3-index-offset-in-elements', why: 'an indexed geometry\'s sub-draw start in elements, not bytes', edits: [e(CB, 'start=first*(geometry.index?geometry.index.array.BYTES_PER_ELEMENT:1);', 'start=first;')], tests: COPY},
  {id: 'Q4-frustum-ignores-batch-transform', why: 'copies culled in world space whatever the batch\'s own transform', edits: [e(CB, '.multiply(this.matrixWorld),camera.coordinateSystem', ',camera.coordinateSystem')], tests: COPY},
  // The editor's drive path: the layers are driven by its rebuild(), not only by the gate
  {id: 'Q5-editor-rebuild-never-cuts-prefabs', why: 'the editor\'s own rebuild (every setOptions) asks the prefab layer for all levels', edits: [e(PS, 'rebuild() {super.rebuild();this.prefabs?.update(this.document,this.options);}', 'rebuild() {super.rebuild();this.prefabs?.update(this.document,{...this.options,showAllLevels:true});}')], tests: COPY},
  {id: 'Q6-editor-local-clipping-off', why: 'pre-existing line, a probe of the gates: Gross cutaways stop clipping their walls', edits: [e(PS, 'this.renderer.localClippingEnabled=true;this.prefabs=new PrefabLayer(', 'this.renderer.localClippingEnabled=false;this.prefabs=new PrefabLayer(')], tests: COPY},
  // SF-E: what Material.toJSON and the node line do not serialize
  {id: 'Q7-shader-patch-darkens-every-material', why: 'onBeforeCompile is not serialized: every original building drawn at half brightness', edits: [e(BC, 'result.set(id,material);}return result;}', "material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\\n\\tgl_FragColor.rgb*=0.5;');};result.set(id,material);}return result;}")], tests: DIGEST},
  {id: 'Q8-clipping-plane-on-every-material', why: 'clippingPlanes are not serialized: every original building cut 3 m up where local clipping is on (the editor)', edits: [e(BC, 'result.set(id,material);}return result;}', 'material.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),3)];result.set(id,material);}return result;}')], tests: DIGEST},
  {id: 'Q9-draw-range-one-triangle', why: 'geometry.drawRange is not in the node line: every batch draws one triangle', edits: [e(BC, 'g.computeBoundingBox();g.computeBoundingSphere();const mesh=new this.T.Mesh(g,materials.get(b.material));', 'g.computeBoundingBox();g.computeBoundingSphere();g.setDrawRange(0,3);const mesh=new this.T.Mesh(g,materials.get(b.material));')], tests: DIGEST},
  {id: 'Q10-render-order', why: 'renderOrder is not in the node line: glass and opaque batches re-sorted', edits: [e(BC, 'mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);', 'mesh.castShadow=mesh.receiveShadow=true;mesh.renderOrder=b.material===\'glass\'?-1:0;root.add(mesh);')], tests: DIGEST}
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
        failing: [...out.matchAll(/^\s*✖ (.*?)(?: \(\d+(?:\.\d+)?m?s\))?$/gm)].map(m => m[1].slice(0, 160)).slice(0, 4), tail: out.split('\n').filter(l => /Error|differs|changed|AssertionError/.test(l)).slice(0, 3).map(l => l.slice(0, 240))});
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
const result = {script: 'mutate-r4.mjs', phase: confirm ? 'confirm: whole suite + tools/check.mjs' : 'phase 1: module tests', started: new Date().toISOString(), node: process.version, head: head0, statusBefore: status0 || '(clean)', mutants: []};
const list = MUTANTS.filter(m => !only || only.has(m.id));
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
