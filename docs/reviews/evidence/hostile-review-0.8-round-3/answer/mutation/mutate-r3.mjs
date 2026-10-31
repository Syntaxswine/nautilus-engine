// Round-3 mutation harness for the answer to round 2 (instancing, roof merge,
// glass halves, the count gate, the facade switch, and the editor's wiring of them).
//   node mutate-r3.mjs <tree> <out.json> [--only id,id] [--confirm]
// Rules: refuses a dirty tree; every needle must occur exactly once; every touched
// file is restored byte for byte in a finally and its hash verified; HEAD and status
// are recorded before and after each mutant. spawnSync gets a 256 MB buffer; a null
// exit status (timeout, signal, buffer overflow) is an ERROR, never a kill or a pass.
// A node:test timeout shows as 'cancelled' and is reported apart from assertion
// failures. Phase 1 runs the module's own test files; --confirm runs the whole suite
// (every tests/*.test.mjs) and tools/check.mjs.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const TREE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const args = process.argv.slice(4), only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null, confirm = args.includes('--confirm');
const git = (...a) => execFileSync('git', ['-C', TREE, ...a], {encoding: 'utf8'}).trim();
const sha = b => createHash('sha256').update(b).digest('hex');
const status0 = git('status', '--porcelain'), head0 = git('rev-parse', 'HEAD');
if (status0) throw Error('Refusing a dirty tree:\n' + status0);

const PS = 'apps/editor/prefab-scene.js', RS = 'apps/editor/roof-scene.js', DB = 'packages/prefab-core/display-batches.js', CT = 'tools/asset-draw-counts.mjs', FA = 'packages/assets/three.js', RC = 'packages/roof-core/three.js', WL = 'tools/bench/workloads.mjs';
const INST = ['tests/prefab-display-batches.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/prefab-providers.test.mjs', 'tests/building-library-lifecycle.test.mjs', 'tests/asset-draw-counts.test.mjs'];
const ROOF = ['tests/editor-roofs.test.mjs', 'tests/editor-roof-paint.test.mjs', 'tests/roof-core.test.mjs', 'tests/asset-draw-counts.test.mjs'];
const GLASS = ['tests/prefab-display-batches.test.mjs', 'tests/shared-assets.test.mjs', 'tests/asset-draw-counts.test.mjs'];
const COUNT = ['tests/asset-draw-counts.test.mjs'];
const FACADE = ['tests/shared-assets.test.mjs'];
const e = (file, needle, replace) => ({file, needle, replace});
const MUTANTS = [
  // --- instancing (1cd55da)
  {id: 'I1-instance-bounds-template-only', why: 'each instance set culled by the template node sphere (at the origin), not the union of its copies: copies far from the origin vanish', edits: [e(PS, 'mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();', 'mesh.instanceMatrix.needsUpdate=true;mesh.boundingSphere=node.geometry.boundingSphere.clone();')], tests: INST},
  {id: 'I2-instance-matrix-root-only', edits: [e(PS, 'mesh.setMatrixAt(k,matrix.multiplyMatrices(model.root.matrixWorld,local))', 'mesh.setMatrixAt(k,matrix.copy(model.root.matrixWorld))')], tests: INST},
  {id: 'I3-instance-threshold-3', edits: [e(PS, 'if(!template||models.length<2)continue;', 'if(!template||models.length<3)continue;')], tests: INST},
  {id: 'I4-copies-draw-too', edits: [e(PS, 'mesh.visible=node.visible;for(const copy of copies)copy.visible=false;', 'mesh.visible=node.visible;')], tests: INST},
  {id: 'I5-instanced-always-visible', edits: [e(PS, 'mesh.visible=node.visible;for(const copy of copies)copy.visible=false;', 'mesh.visible=true;for(const copy of copies)copy.visible=false;')], tests: INST},
  {id: 'I6-no-early-release', expect: 'nearly equivalent: instance() releases again; only a pending load keeps the old sets', edits: [e(PS, '    this.releaseInstances();\n    const wanted', '    const wanted')], tests: INST},
  {id: 'I7-release-leaves-copies-hidden', expect: 'nearly equivalent: setView() restores copy visibility after every update; only a pending load shows nothing', edits: [e(PS, 'mesh.removeFromParent();mesh.dispose();for(const copy of copies)copy.visible=node.visible;', 'mesh.removeFromParent();mesh.dispose();')], tests: INST},
  {id: 'I8-instanced-mesh-never-disposed', why: 'each update leaks every instance set\'s instanceMatrix buffer on the GPU', edits: [e(PS, 'mesh.removeFromParent();mesh.dispose();for(const copy of copies)copy.visible=node.visible;', 'mesh.removeFromParent();for(const copy of copies)copy.visible=node.visible;')], tests: INST},
  {id: 'I9-glass-instanced', edits: [e(PS, 'const instanceable=node=>node.isMesh&&Array.isArray(node.material);', 'const instanceable=node=>node.isMesh;')], tests: INST},
  {id: 'E1-editor-never-instances', why: 'the editor builds its layer with instancing off; the gate builds its own layer', edits: [e(PS, "this.prefabs=new PrefabLayer(this.scene,this.renderer,()=>this.changed(),error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});", "this.prefabs=new PrefabLayer(this.scene,this.renderer,()=>this.changed(),error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();},{instancing:false});")], tests: INST},
  // --- roof merge (7212242)
  {id: 'R1-merged-bounds-first-roof', why: 'the merged mesh is culled by its first roof\'s sphere: every other roof vanishes when that roof leaves the view', edits: [e(RS, 'geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();', 'geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.boundingSphere=shells[0].geometry.boundingSphere.clone();')], tests: ROOF},
  {id: 'R2-sort-ignores-level', edits: [e(RS, '.sort((a,b)=>a.roof.z-b.roof.z||order.get(a.roof.id)-order.get(b.roof.id))', '.sort((a,b)=>order.get(a.roof.id)-order.get(b.roof.id))')], tests: ROOF},
  {id: 'R3-shells-never-restored', edits: [e(RS, 'for(const shell of shells)shell.visible=true;this.merged=null;}', 'this.merged=null;}')], tests: ROOF},
  {id: 'R4-mergeable-ignores-matrix', edits: [e(RS, 'if(!root.matrix.equals(AT_OFFSET)||!mesh.matrix.equals(IDENTITY))return false;', '')], tests: ROOF},
  {id: 'R5-merged-geometry-leaks', edits: [e(RS, 'mesh.removeFromParent();mesh.geometry.dispose();for(const shell of shells)shell.visible=true;', 'mesh.removeFromParent();for(const shell of shells)shell.visible=true;')], tests: ROOF},
  {id: 'R6-foreign-materials-merge', edits: [e(RS, 'return geometry.groups.length>0&&geometry.groups.every(group=>shared.has(mesh.material[group.materialIndex]));', 'return geometry.groups.length>0;')], tests: ROOF},
  {id: 'R7-merged-ignores-visibility', edits: [e(RS, 'if(!range.model.root.visible)run=null;else if(run)', 'if(false)run=null;else if(run)')], tests: ROOF},
  {id: 'R8-merged-casts-nothing', expect: 'equivalent in the editor (the daylight rig sets castShadow every frame); the tests read the flags', edits: [e(RS, "mesh.name='sloped roofs';mesh.castShadow=mesh.receiveShadow=true;", "mesh.name='sloped roofs';")], tests: ROOF},
  {id: 'R9-reorder-keeps-merge', edits: [e(RS, 'if(changed||this.merged&&this.merged.order!==roofs.map(roof=>roof.id).join(\'\\n\'))this.remerge(order);', 'if(changed)this.remerge(order);')], tests: ROOF},
  {id: 'E2-editor-never-merges-roofs', why: 'the editor builds its roof layer with merge off; the gate builds its own layer', edits: [e(RS, 'this.slopedRoofs=new RoofLayer(this.scene);', 'this.slopedRoofs=new RoofLayer(this.scene,{merge:false});')], tests: ROOF},
  {id: 'RC1-slot-material-unnamed', expect: 'names are new in this answer; the merge keys by identity', edits: [e(RC, 'material.name = `roof:${id}`;', '')], tests: ROOF},
  // --- glass halves (bd27cb5)
  {id: 'H1-back-half-casts', edits: [e(DB, 'if(!i)copy.userData={...copy.userData,noShadow:true};', '')], tests: GLASS},
  {id: 'H2-front-shadow-one-sided', edits: [e(DB, 'pair[1].shadowSide=T.DoubleSide;cache.set(source,pair);', 'cache.set(source,pair);')], tests: GLASS},
  {id: 'H3-pair-cache-lost', edits: [e(DB, 'let pair=cache.get(source);', 'let pair=null;')], tests: GLASS},
  {id: 'H4-front-half-first', edits: [e(DB, 'pair=[T.BackSide,T.FrontSide].map(side=>', 'pair=[T.FrontSide,T.BackSide].map(side=>')], tests: GLASS},
  // --- the count gate (4b85d8e)
  {id: 'C1-one-pass-always', expect: 'dead since bd27cb5: no transparent double-sided material is left in the asset layers', edits: [e(CT, 'const passes = material => material.transparent && material.side === T.DoubleSide && !material.forceSinglePass ? 2 : 1;', 'const passes = material => 1;')], tests: COUNT},
  {id: 'C2-casts-ignores-noShadow', edits: [e(CT, 'const casts = mesh => !mesh.userData.noShadow && ', 'const casts = mesh => ')], tests: COUNT},
  {id: 'C3-counts-hidden-nodes', edits: [e(CT, 'for (const object of objects) object.traverseVisible(mesh => {', 'for (const object of objects) object.traverse(mesh => {')], tests: COUNT},
  {id: 'C4-instances-counted-once', edits: [e(CT, 'copies = mesh.isInstancedMesh ? mesh.count : 1', 'copies = 1')], tests: COUNT},
  {id: 'C5-rig-rule-check-off', expect: 'by design: it guards a vendored file that does not change', edits: [e(CT, "if (!daylight.includes(rule)) throw Error", "if (false) throw Error")], tests: COUNT},
  {id: 'C6-workload-one-copy-fewer', edits: [e(WL, "pack('32 x largest design', Array(40).fill(byTriangles[0].id))", "pack('32 x largest design', Array(40).fill(byTriangles[0].id), 31)")], tests: COUNT},
  // --- facade (17d2d00)
  {id: 'F6-shared-by-default', edits: [e(FA, 'loadTexture,shared=false}={})', 'loadTexture,shared=true}={})')], tests: FACADE},
  {id: 'F7-shared-view-not-mirrored', edits: [e(FA, 'batch.sync();for(const copy of entry.copies())copy.forEach((node,i)=>{node.visible=nodes[i].visible;});', 'batch.sync();')], tests: FACADE}
];

function run(cmd, argv, timeout) {
  const t0 = Date.now(), r = spawnSync(cmd, argv, {cwd: TREE, encoding: 'utf8', timeout, maxBuffer: 256 * 1024 * 1024, windowsHide: true});
  const text = (r.stdout || '') + (r.stderr || ''), grab = k => {const m = text.match(new RegExp('\\u2139 ' + k + ' (\\d+)')); return m ? Number(m[1]) : null;};
  const failing = [...text.matchAll(/^not ok \d+ - (.*)$/gm)].map(m => m[1]).slice(0, 6);
  return {cmd: [path.basename(cmd), ...argv].join(' ').slice(0, 200), exit: r.status, signal: r.signal, error: r.error ? String(r.error.code || r.error.message) : null, ms: Date.now() - t0,
    tests: grab('tests'), pass: grab('pass'), fail: grab('fail'), cancelled: grab('cancelled'), failing, tail: text.split('\n').filter(l => /Error|throw|differs|mismatch|changed|AssertionError|expected/.test(l)).slice(0, 4).map(l => l.slice(0, 300))};
}
function mutate(m, commands) {
  const files = [...new Set(m.edits.map(x => x.file))], originals = new Map(files.map(f => [f, fs.readFileSync(path.join(TREE, f))]));
  const record = {id: m.id, files, why: m.why, expect: m.expect, headBefore: git('rev-parse', 'HEAD'), runs: []};
  try {
    const texts = new Map();
    for (const x of m.edits) {
      const text = texts.get(x.file) ?? originals.get(x.file).toString('utf8'), count = text.split(x.needle).length - 1;
      if (count !== 1) {record.invalid = 'needle occurs ' + count + ' times in ' + x.file + ': ' + x.needle.slice(0, 80); return record;}
      texts.set(x.file, text.replace(x.needle, () => x.replace));
    }
    for (const [file, text] of texts) fs.writeFileSync(path.join(TREE, file), text);
    for (const c of commands(m)) record.runs.push(run(...c));
    // Verdict: any null status is an error; else killed when any run exits non-zero.
    record.error = record.runs.some(r => r.exit === null);
    record.killed = !record.error && record.runs.some(r => r.exit !== 0);
    record.killedByTimeoutOnly = record.killed && record.runs.every(r => r.exit === 0 || (r.fail ?? 0) === (r.cancelled ?? 0));
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
  for (const m of MUTANTS) for (const x of m.edits) {const n = fs.readFileSync(path.join(TREE, x.file), 'utf8').split(x.needle).length - 1; if (n !== 1) console.log('BAD', m.id, x.file, n);}
  console.log('dry run: ' + MUTANTS.length + ' mutants checked'); process.exit(0);
}
const result = {script: 'mutate-r3.mjs', phase: confirm ? 'confirm: whole suite + tools/check.mjs' : 'phase 1: module tests', started: new Date().toISOString(), node: process.version, head: head0, statusBefore: status0 || '(clean)', mutants: []};
const list = MUTANTS.filter(m => !only || only.has(m.id));
try {
  for (const m of list) {
    const commands = confirm
      ? () => [[process.execPath, ['--test', '--test-timeout=300000', ...allTests()], 1800000], [process.execPath, ['tools/check.mjs'], 600000]]
      : x => [[process.execPath, ['--test', '--test-timeout=240000', ...x.tests], 900000]];
    const r = mutate(m, commands);
    result.mutants.push(r);
    process.stdout.write(`${m.id}: ${r.invalid ? 'INVALID ' + r.invalid : r.error ? 'ERROR' : r.killed ? 'killed' + (r.killedByTimeoutOnly ? ' (by timeout only)' : '') : 'SURVIVED'} ${r.runs.map(x => `[${x.cmd.split(' ').slice(0, 2).join(' ')} exit ${x.exit} tests ${x.tests} pass ${x.pass} fail ${x.fail} cancelled ${x.cancelled} ${(x.ms / 1000).toFixed(0)}s]`).join(' ')}\n`);
    fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  }
} finally {
  result.finished = new Date().toISOString();
  result.headAfter = git('rev-parse', 'HEAD'); result.statusAfter = git('status', '--porcelain') || '(clean)';
  result.summary = {total: result.mutants.length, killed: result.mutants.filter(m => m.killed).map(m => m.id), survived: result.mutants.filter(m => !m.invalid && !m.error && !m.killed).map(m => m.id), errors: result.mutants.filter(m => m.error).map(m => m.id), invalid: result.mutants.filter(m => m.invalid).map(m => m.id)};
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result.summary, null, 1));
}
