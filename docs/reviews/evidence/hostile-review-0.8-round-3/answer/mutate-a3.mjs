// Mutation harness for the answer to round 3 (CopyBatch, the gate through the editor's own
// layers, the roof guard, the material digest, the facade fixes). Round 3's rules, as its
// reviewer's mutate-r3.mjs states them:
//   node mutate-a3.mjs <tree> <out.json> [--only id,id] [--confirm] [--dry]
// Refuses a dirty tree; every needle must occur exactly once; every touched file is restored
// byte for byte in a finally and its hash verified; HEAD and status are recorded before and
// after each mutant. spawnSync gets a 256 MB buffer; a null exit status (timeout, signal,
// buffer overflow) is an ERROR, never a kill or a pass. Phase 1 runs the module's own test
// files; --confirm runs the whole suite and tools/check.mjs.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const TREE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const args = process.argv.slice(4), only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null, confirm = args.includes('--confirm');
const git = (...a) => execFileSync('git', ['-C', TREE, '--no-optional-locks', ...a], {encoding: 'utf8'}).trim();
const sha = b => createHash('sha256').update(b).digest('hex');
const status0 = git('status', '--porcelain'), head0 = git('rev-parse', 'HEAD');
if (status0) throw Error('Refusing a dirty tree:\n' + status0);

const CB = 'apps/editor/copy-batch.js', PS = 'apps/editor/prefab-scene.js', RS = 'apps/editor/roof-scene.js', CT = 'tools/asset-draw-counts.mjs', BG = 'tools/building-geometry.mjs', BC = 'packages/building-catalog/three.js', FA = 'packages/assets/three.js', DB = 'packages/prefab-core/display-batches.js', RC = 'packages/roof-core/three.js';
const COPY = ['tests/editor-copy-batch.test.mjs', 'tests/prefab-display-batches.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/prefab-providers.test.mjs', 'tests/building-library-lifecycle.test.mjs', 'tests/asset-draw-counts.test.mjs'];
const ROOF = ['tests/editor-roofs.test.mjs', 'tests/editor-roof-paint.test.mjs', 'tests/roof-core.test.mjs', 'tests/asset-draw-counts.test.mjs'];
const COUNT = ['tests/asset-draw-counts.test.mjs'], DIGEST = ['tests/building-geometry.test.mjs', 'tests/building-catalog.test.mjs'], FACADE = ['tests/shared-assets.test.mjs', 'tests/prefab-display-batches.test.mjs'];
const e = (file, needle, replace) => ({file, needle, replace});
const MUTANTS = [
  // --- CopyBatch (MF-B)
  {id: 'K1-copy-spheres-untransformed', why: 'every copy culled by the template sphere at the origin (round 3 I1, per copy)', edits: [e(CB, 'return node.geometry.boundingSphere.clone().applyMatrix4(m);', 'return node.geometry.boundingSphere.clone();')], tests: COPY},
  {id: 'K2-set-sphere-first-copy', why: 'the batch culled as a whole by its first copy (round 3 I1)', edits: [e(CB, 'for(const sphere of this.spheres)this.boundingSphere.union(sphere);', 'this.boundingSphere.union(this.spheres[0]);')], tests: COPY},
  {id: 'K3-no-per-copy-culling', why: 'every camera draws every copy: round 3 MF-B again', edits: [e(CB, 'if(this.perObjectFrustumCulled&&!frustum.intersectsSphere(this.spheres[k])){run=-1;continue;}', '')], tests: COPY},
  {id: 'K4-runs-draw-nothing', edits: [e(CB, 'if(run<0||!runs){run=k;counts[k]=count;}', 'if(run<0||!runs){run=k;}')], tests: COPY},
  {id: 'K5-table-rewritten-per-camera', why: 'the D3D11 stall: the copy table uploaded for every camera', edits: [e(CB, 'this._multiDrawCount=n;this._multiDrawInstances=', 'this._indirectTexture.needsUpdate=true;this._multiDrawCount=n;this._multiDrawInstances=')], tests: COPY},
  {id: 'K6-empty-sub-draws-trail', edits: [e(CB, 'instances[run]++;n=run+1;', 'instances[run]++;n=k+1;')], tests: COPY},
  {id: 'K13-runs-never-used', why: 'one sub-draw per copy even with WEBGL_multi_draw (the f98d4cc behaviour)', edits: [e(CB, "const runs=!!renderer?.extensions?.has('WEBGL_multi_draw')", 'const runs=false')], tests: COPY},
  {id: 'K14-run-spans-a-culled-copy', why: 'a gap does not end a run: the culled copy is drawn', edits: [e(CB, '{run=-1;continue;}', '{continue;}')], tests: COPY},
  {id: 'K15-shader-reads-draw-id-only', why: 'every instance of a run drawn at its first copy', edits: [e(CB, "T.ShaderChunk[name]=T.ShaderChunk[name].replaceAll(READ,'getIndirectIndex( gl_DrawID + gl_InstanceID )');", '')], tests: COPY},
  {id: 'K16-runs-without-the-extension', why: 'three\'s instanced fallback sets no draw id', edits: [e(CB, 'this._multiDrawInstances=runs?instances:null;', 'this._multiDrawInstances=instances;')], tests: COPY},
  {id: 'K7-shadow-ignores-run', why: 'a shadow draws the whole batch geometry, not the view\'s run (cutaway floors cast)', edits: [e(CB, 'this.onBeforeRender(renderer,null,shadowCamera,geometry,depthMaterial,group);', 'this.onBeforeRender(renderer,null,shadowCamera,geometry,depthMaterial,null);')], tests: COPY},
  {id: 'K8-program-rederived-per-draw', why: 'the r180 colorTexture test: every draw re-derives its program', edits: [e(CB, '    this.colorTexture=null;\n', '')], tests: COPY},
  {id: 'K9-dispose-takes-template-geometry', edits: [e(CB, 'this.disposed=true;this.geometry=new T.BufferGeometry();super.dispose();', 'this.disposed=true;super.dispose();')], tests: COPY},
  {id: 'K10-raycast-inherited', edits: [e(CB, '  raycast() {}\n', '')], tests: COPY},
  {id: 'K11-table-not-identity', why: 'every copy drawn at copy 0', edits: [e(CB, 'for(let k=0;k<matrices.length;k++)table[k]=k;', 'for(let k=0;k<matrices.length;k++)table[k]=0;')], tests: COPY},
  {id: 'K12-copy-matrix-not-set', edits: [e(CB, 'this.setMatrixAt(this.addInstance(0),m);', 'this.addInstance(0);')], tests: COPY},
  // --- the prefab layer's wiring
  {id: 'P1-editor-never-batches-copies', why: 'round 3 E1', edits: [e(PS, "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});}", "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();},{instancing:false});}")], tests: COPY},
  {id: 'P2-template-place-dropped', why: 'round 3 I2 / N6', edits: [e(PS, 'models.map(model=>new T.Matrix4().multiplyMatrices(model.root.matrixWorld,local))', 'models.map(model=>model.root.matrixWorld.clone())')], tests: COPY},
  {id: 'P3-batches-only-from-3', edits: [e(PS, 'if(!template||models.length<2)continue;', 'if(!template||models.length<3)continue;')], tests: COPY},
  {id: 'P4-copies-draw-too', edits: [e(PS, 'mesh.visible=node.visible;for(const copy of copies)copy.visible=false;', 'mesh.visible=node.visible;')], tests: COPY},
  {id: 'P5-released-batch-not-disposed', why: 'round 3 I8', edits: [e(PS, 'mesh.removeFromParent();mesh.dispose();for(const copy of copies)copy.visible=node.visible;', 'mesh.removeFromParent();for(const copy of copies)copy.visible=node.visible;')], tests: COPY},
  {id: 'P6-batch-always-visible', edits: [e(PS, 'mesh.visible=node.visible;for(const copy of copies)copy.visible=false;', 'mesh.visible=true;for(const copy of copies)copy.visible=false;')], tests: COPY},
  {id: 'P7-no-early-release', why: 'round 3 I6: old batches draw the old copies while a load is pending', edits: [e(PS, '    this.releaseInstances();\n    const wanted', '    const wanted')], tests: COPY},
  {id: 'P8-release-leaves-copies-hidden', why: 'round 3 I7: nothing draws the copies while a load is pending', edits: [e(PS, 'mesh.removeFromParent();mesh.dispose();for(const copy of copies)copy.visible=node.visible;', 'mesh.removeFromParent();mesh.dispose();')], tests: COPY},
  // --- the roof layer
  {id: 'R1-merged-bounds-first-roof', why: 'round 3 R1', edits: [e(RS, 'geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();', 'geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.boundingSphere=shells[0].geometry.boundingSphere.clone();')], tests: ROOF},
  {id: 'R10-editor-never-merges', why: 'round 3 E2', edits: [e(RS, 'this.slopedRoofs=new RoofLayer(this.scene);', 'this.slopedRoofs=new RoofLayer(this.scene,{merge:false});')], tests: ROOF},
  {id: 'R11-guard-ignores-hidden-shell', edits: [e(RS, '!mesh.receiveShadow||!mesh.visible||!plain(root)||!plain(mesh))return false;', '!mesh.receiveShadow||!plain(root)||!plain(mesh))return false;')], tests: ROOF},
  {id: 'R12-guard-ignores-order-and-layers', edits: [e(RS, '!mesh.receiveShadow||!mesh.visible||!plain(root)||!plain(mesh))return false;', '!mesh.receiveShadow||!mesh.visible)return false;')], tests: ROOF},
  {id: 'R13-guard-ignores-draw-range', edits: [e(RS, 'if(geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity||Object.keys(geometry.morphAttributes).length)return false;', 'if(Object.keys(geometry.morphAttributes).length)return false;')], tests: ROOF},
  {id: 'R14-guard-ignores-morphs', edits: [e(RS, 'if(geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity||Object.keys(geometry.morphAttributes).length)return false;', 'if(geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity)return false;')], tests: ROOF},
  {id: 'R15-guard-ignores-open-groups', edits: [e(RS, 'geometry.groups.every(group=>Number.isInteger(group.start)&&Number.isInteger(group.count)&&group.start>=0&&group.start+group.count<=geometry.index.count&&shared.has(', 'geometry.groups.every(group=>shared.has(')], tests: ROOF},
  {id: 'RC1-slot-material-unnamed', why: 'round 3 RC1 / N8', edits: [e(RC, 'material.name = `roof:${id}`;', '')], tests: ROOF},
  // --- the count tool
  {id: 'C4-copies-counted-once', edits: [e(CT, 'copies = mesh.isInstancedMesh ? mesh.count : mesh.isBatchedMesh ? mesh.instanceCount : 1', 'copies = mesh.isInstancedMesh ? mesh.count : 1')], tests: COUNT},
  {id: 'C5b-daylight-rule-refusal-off', why: 'round 3 C5, after the refusal moved into checkDaylightRule', edits: [e(CT, 'if (!source.includes(rule)) throw Error', 'if (false) throw Error')], tests: COUNT},
  {id: 'C7-headless-base-check-off', expect: 'by design: it refuses a changed scene chain', edits: [e(CT, "if (base[0] !== LegacyScene) throw Error", "if (false) throw Error")], tests: COUNT},
  {id: 'C8-two-pass-refusal-off', expect: 'by design: it refuses a material the model does not count', edits: [e(CT, 'if (material.transparent && material.side === T.DoubleSide && !material.forceSinglePass) throw Error', 'if (false) throw Error')], tests: COUNT},
  {id: 'C9-lamp-maps-counted-headless', why: 'lamp-lit maps enter the headless (lightless) fixture', edits: [e(CT, 'if (!workload.lamps) workloads[workload.id]', 'workloads[workload.id]')], tests: COUNT},
  // --- the material digest (SF-E)
  {id: 'G11-emissive-every-material', why: 'round 3 G11: brighter buildings, the source changed', edits: [e(BC, 'material=new T.MeshStandardMaterial({color:grey?0xaaa99f:new T.Color(...tint),', 'material=new T.MeshStandardMaterial({emissive:0x202020,color:grey?0xaaa99f:new T.Color(...tint),')], tests: DIGEST},
  {id: 'G12-key-back-to-a-list', edits: [e(BG, '  const meta={textures:{},images:{}},data=m.toJSON(meta);delete data.uuid;delete data.metadata;', '  return [m.type,m.name,m.color?.getHex(),!!m.map,m.transparent,m.opacity,m.side,m.roughness,m.metalness,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,m.depthWrite,m.depthTest,m.visible].join(\',\');\n  const meta={textures:{},images:{}},data=m.toJSON(meta);delete data.uuid;delete data.metadata;')], tests: DIGEST},
  {id: 'G13-texture-settings-dropped', edits: [e(BG, 'const {uuid,image,metadata,...settings}=meta.textures[value];data[key]=settings;', 'data[key]=true;')], tests: DIGEST},
  // --- the facade
  {id: 'F7-shared-view-not-mirrored', why: 'round 3 F7', edits: [e(FA, 'batch.sync();for(const copy of entry.copies())copy.forEach((node,i)=>{node.visible=nodes[i].visible;});', 'batch.sync();')], tests: FACADE},
  {id: 'N1-back-glass-casts-outside-the-editor', edits: [e(DB, 'copy.userData={...copy.userData,noShadow:true};copy.castShadow=false;}', 'copy.userData={...copy.userData,noShadow:true};}')], tests: FACADE}
];

function run(cmd, argv, timeout) {
  const t0 = Date.now(), r = spawnSync(cmd, argv, {cwd: TREE, encoding: 'utf8', timeout, maxBuffer: 256 * 1024 * 1024, windowsHide: true});
  const text = (r.stdout || '') + (r.stderr || ''), grab = k => {const m = text.match(new RegExp('\\u2139 ' + k + ' (\\d+)')); return m ? Number(m[1]) : null;};
  return {cmd: [path.basename(cmd), ...argv].join(' ').slice(0, 200), exit: r.status, signal: r.signal, error: r.error ? String(r.error.code || r.error.message) : null, ms: Date.now() - t0,
    tests: grab('tests'), pass: grab('pass'), fail: grab('fail'), cancelled: grab('cancelled'),
    failing: [...text.matchAll(/^✖ (.*?)(?: \(\d+(?:\.\d+)?m?s\))?$/gm)].map(m => m[1]).slice(0, 4), tail: text.split('\n').filter(l => /Error|differs|changed|AssertionError/.test(l)).slice(0, 3).map(l => l.slice(0, 240))};
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
  let bad = 0; for (const m of MUTANTS) for (const x of m.edits) {const n = fs.readFileSync(path.join(TREE, x.file), 'utf8').split(x.needle).length - 1; if (n !== 1) {bad++; console.log('BAD', m.id, x.file, n);}}
  for (const m of MUTANTS) for (const t of m.tests) if (!fs.existsSync(path.join(TREE, t))) {bad++; console.log('NO TEST', m.id, t);}
  console.log('dry run: ' + MUTANTS.length + ' mutants, ' + bad + ' problems'); process.exit(bad ? 1 : 0);
}
const result = {script: 'mutate-a3.mjs', phase: confirm ? 'confirm: whole suite + tools/check.mjs' : 'phase 1: module tests', started: new Date().toISOString(), node: process.version, head: head0, statusBefore: status0 || '(clean)', mutants: []};
const list = MUTANTS.filter(m => !only || only.has(m.id));
try {
  for (const m of list) {
    const commands = confirm
      ? () => [[process.execPath, ['--test', '--test-timeout=300000', ...allTests()], 1800000], [process.execPath, ['tools/check.mjs'], 600000]]
      : x => [[process.execPath, ['--test', '--test-timeout=240000', ...x.tests], 900000]];
    const r = mutate(m, commands);
    result.mutants.push(r);
    process.stdout.write(`${m.id}: ${r.invalid ? 'INVALID ' + r.invalid : r.error ? 'ERROR' : r.killed ? 'killed' + (r.killedByTimeoutOnly ? ' (by timeout only)' : '') : 'SURVIVED'} ${r.runs.map(x => `[exit ${x.exit} ${x.pass}/${x.tests} ${Math.round(x.ms / 1000)}s ${x.failing[0] || ''}]`).join(' ').slice(0, 220)}\n`);
    fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  }
} finally {
  result.finished = new Date().toISOString();
  result.headAfter = git('rev-parse', 'HEAD'); result.statusAfter = git('status', '--porcelain') || '(clean)';
  result.summary = {total: result.mutants.length, killed: result.mutants.filter(m => m.killed).map(m => m.id), survived: result.mutants.filter(m => !m.invalid && !m.error && !m.killed).map(m => m.id), errors: result.mutants.filter(m => m.error).map(m => m.id), invalid: result.mutants.filter(m => m.invalid).map(m => m.id)};
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result.summary, null, 1));
}
