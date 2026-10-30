// Mutation harness for the answer to round 4 (clustered batching, the editor's own drive
// path in the count gate, the digest beyond Material.toJSON, the CopyBatch branches round 4
// found untested), with round 4's own Q mutants re-aimed where the code moved. Round 3's
// rules, as its reviewers' harnesses state them:
//   node mutate-a4.mjs <tree> <out.json> [--only id,id] [--confirm] [--dry]
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
if (status0 && !args.includes('--dry')) throw Error('Refusing a dirty tree:\n' + status0);

const CB = 'apps/editor/copy-batch.js', PS = 'apps/editor/prefab-scene.js', CT = 'tools/asset-draw-counts.mjs', BG = 'tools/building-geometry.mjs', BC = 'packages/building-catalog/three.js', WL = 'tools/bench/workloads.mjs';
const COPY = ['tests/editor-copy-batch.test.mjs', 'tests/prefab-display-batches.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/prefab-providers.test.mjs', 'tests/building-library-lifecycle.test.mjs', 'tests/asset-draw-counts.test.mjs'];
const COUNT = ['tests/asset-draw-counts.test.mjs'], DIGEST = ['tests/building-geometry.test.mjs', 'tests/building-catalog.test.mjs'];
const e = (file, needle, replace) => ({file, needle, replace});
const MUTANTS = [
  // --- controls: earlier rounds' falsifiers, which must still die
  {id: 'Q0a-control-editor-never-batches', why: 'round 3 E1 / the answer\'s P1: the 32 copies drawn per copy', edits: [e(PS, "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});}", "error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();},{instancing:false});}")], tests: COPY},
  {id: 'Q0b-control-no-per-copy-culling', why: 'round 3 MF-B / K3', edits: [e(CB, 'if(this.perObjectFrustumCulled&&!frustum.intersectsSphere(this.spheres[k])){counts[k]=0;continue;}', '')], tests: COPY},
  // --- round 4's Q mutants
  {id: 'Q1-shadow-culled-by-view-camera', why: 'round 4 Q1; N7: now an assertion, not a TypeError', edits: [e(CB, 'this.onBeforeRender(renderer,null,shadowCamera,geometry,depthMaterial,group);', 'this.onBeforeRender(renderer,null,camera,geometry,depthMaterial,group);')], tests: COPY},
  {id: 'Q2-draw-range-ignored', why: 'round 4 Q2 (N2)', edits: [e(CB, 'first=Math.max(range.start,group?group.start:0)', 'first=(group?group.start:0)'), e(CB, 'Math.min(range.start+range.count,group?group.start+group.count:Infinity,vertices)', 'Math.min(group?group.start+group.count:Infinity,vertices)')], tests: COPY},
  {id: 'Q3-index-offset-in-elements', why: 'round 4 Q3 (N2)', edits: [e(CB, 'start=first*(geometry.index?geometry.index.array.BYTES_PER_ELEMENT:1);', 'start=first;')], tests: COPY},
  {id: 'Q4-frustum-ignores-batch-transform', why: 'round 4 Q4 (N2)', edits: [e(CB, '.multiply(this.matrixWorld),camera.coordinateSystem', ',camera.coordinateSystem')], tests: COPY},
  {id: 'Q5-editor-rebuild-never-cuts-prefabs', why: 'round 4 Q5 (SF-F): every setOptions asks the prefab layer for all levels', edits: [e(PS, 'rebuild() {super.rebuild();this.prefabs?.update(this.document,this.options);}', 'rebuild() {super.rebuild();this.prefabs?.update(this.document,{...this.options,showAllLevels:true});}')], tests: COUNT},
  {id: 'Q5b-editor-edit-never-cuts-prefabs', why: 'the edit path (update) asks for all levels', edits: [e(PS, 'async update(document) {await super.update(document);await this.prefabs.update(document,this.options);}', 'async update(document) {await super.update(document);await this.prefabs.update(document,{...this.options,showAllLevels:true});}')], tests: COUNT},
  {id: 'Q5c-editor-open-cuts-prefabs', why: 'opening a map asks for the cutaway', edits: [e(PS, 'async open(document) {await super.open(document);await this.prefabs.update(document,this.options);}', 'async open(document) {await super.open(document);await this.prefabs.update(document,{...this.options,showAllLevels:false});}')], tests: COUNT},
  {id: 'Q7-shader-patch-darkens-every-material', why: 'round 4 Q7 (SF-G)', edits: [e(BC, 'result.set(id,material);}return result;}', "material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\\n\\tgl_FragColor.rgb*=0.5;');};result.set(id,material);}return result;}")], tests: DIGEST},
  {id: 'Q8-clipping-plane-on-every-material', why: 'round 4 Q8 (SF-G)', edits: [e(BC, 'result.set(id,material);}return result;}', 'material.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),3)];result.set(id,material);}return result;}')], tests: DIGEST},
  {id: 'Q10-render-order', why: 'round 4 Q10 (SF-G)', edits: [e(BC, 'mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);', 'mesh.castShadow=mesh.receiveShadow=true;mesh.renderOrder=b.material===\'glass\'?-1:0;root.add(mesh);')], tests: DIGEST},
  // --- clusters (MF-C)
  {id: 'M1-never-linked', why: 'every copy its own cluster: nothing batched', edits: [e(PS, 'if(a.center.distanceTo(b.center)<=a.radius+b.radius)parent[root(order[i])]=root(order[j]);', '')], tests: COPY},
  {id: 'M2-always-linked', why: 'every copy of a design one cluster, however far apart (the round 3 behaviour)', edits: [e(PS, 'if(a.center.distanceTo(b.center)<=a.radius+b.radius)parent[root(order[i])]=root(order[j]);', 'parent[root(order[i])]=root(order[j]);'), e(PS, 'if(b.center.x-a.center.x>a.radius+widest)break;', '')], tests: COPY},
  {id: 'M3-sweep-stops-at-own-radius', why: 'the sweep ends by the next sphere\'s radius, missing a wider one further on', edits: [e(PS, 'if(b.center.x-a.center.x>a.radius+widest)break;', 'if(b.center.x-a.center.x>a.radius+b.radius)break;')], tests: COPY},
  {id: 'M4-strict-overlap', why: 'touching spheres not linked', edits: [e(PS, 'if(a.center.distanceTo(b.center)<=a.radius+b.radius)', 'if(a.center.distanceTo(b.center)<a.radius+b.radius)')], tests: COPY},
  {id: 'M5-small-clusters-batched', why: 'any cluster batched, however small', edits: [e(PS, '        if(cluster.length<this.batched)continue;\n', '')], tests: COPY},
  {id: 'M6-cluster-order-reversed', why: 'a cluster\'s copies not in placement order', edits: [e(PS, 'const members=cluster.map(k=>models[k]);', 'const members=cluster.map(k=>models[k]).reverse();')], tests: COPY},
  {id: 'M7-extent-without-node-transform', why: 'each mesh sphere taken in its own frame', edits: [e(PS, 'sphere.union(node.geometry.boundingSphere.clone().applyMatrix4(matrix.multiplyMatrices(inverse,node.matrixWorld)));', 'sphere.union(node.geometry.boundingSphere.clone());')], tests: COPY},
  {id: 'M8-extent-batch-meshes-only', why: 'the extent leaves out glass and other plain meshes', edits: [e(PS, 'for(const node of template.nodes)if(node.isMesh){', 'for(const node of template.nodes)if(node.isMesh&&Array.isArray(node.material)){')], tests: COPY},
  {id: 'M9-clusters-by-first-copy', why: 'every copy\'s sphere at the first copy', edits: [e(PS, 'neighbourhoods(models.map(model=>sphere.clone().applyMatrix4(model.root.matrixWorld)))', 'neighbourhoods(models.map(()=>sphere.clone().applyMatrix4(models[0].root.matrixWorld)))')], tests: COPY},
  {id: 'M10-threshold-three', why: 'the measured threshold lowered to the mechanism tests\' three', edits: [e(PS, 'export const BATCHED=8;', 'export const BATCHED=3;')], tests: COPY},
  // --- the drive path (SF-F)
  {id: 'D1-no-pending-update', why: 'the layer keeps no pending update: drivers stop waiting for it', edits: [e(PS, 'update(document,options) {return this.pending=this.apply(document,options);}', 'update(document,options) {return this.apply(document,options);}')], tests: COUNT},
  {id: 'D2-stand-in-setOptions-no-rebuild', why: 'the stand-in drives no layer on setOptions', edits: [e(CT, 'setOptions(options) {Object.assign(this.options, options); this.rebuild();},', 'setOptions(options) {Object.assign(this.options, options);},')], tests: COUNT},
  {id: 'D3-drive-check-setOptions-off', edits: [e(CT, "if (!source.includes('setOptions(options){Object.assign(this.options,options);this.rebuild();}')) throw Error", "if (false) throw Error")], tests: COUNT},
  {id: 'D4-drive-check-open-off', edits: [e(CT, "if (!body.includes('this.document=document') || !body.includes('this.rebuild();')) throw Error", "if (false) throw Error")], tests: COUNT},
  {id: 'D5-count-sets-options-directly', why: 'the count bypasses the editor: options set and the layer updated by the tool (the round 3 path)', edits: [e(CT, "if (view === 'exterior') await s.open(document); else s.setOptions(options);", "if (view === 'exterior') await s.open(document); else {s.options = {...options}; s.rebuildWalls(); await s.prefabs.update(document, s.options); s.slopedRoofs.update(document, s.options);}")], tests: COUNT, expect: 'equivalent on a correct editor; with Q5 it would survive (the point of SF-F)'},
  // --- the digest (SF-G)
  {id: 'G14-own-settings-dropped', why: 'the key keeps only the compiled shader', edits: [e(BG, '    data[key]=canonical(m[key],meta);\n', '')], tests: DIGEST},
  {id: 'G15-compiled-shader-dropped', edits: [e(BG, "m.onBeforeCompile(shader,null);data['compiled']=sha256(JSON.stringify(canonical(shader,meta)));", 'm.onBeforeCompile(shader,null);')], tests: DIGEST},
  {id: 'G16-program-key-dropped', edits: [e(BG, "if(programKey!==m.onBeforeCompile.toString())data['programKey']=programKey;", '')], tests: DIGEST},
  {id: 'G17-node-order-layers-culling-dropped', edits: [e(BG, ",'order:'+node.renderOrder,'layers:'+node.layers.mask,'culled:'+node.frustumCulled];", '];')], tests: DIGEST},
  {id: 'G18-draw-range-dropped', edits: [e(BG, ",'range:'+geometry.drawRange.start+','+geometry.drawRange.count,", ',')], tests: DIGEST},
  {id: 'G19-custom-depth-dropped', edits: [e(BG, "      line.push('depth:'+(node.customDepthMaterial?materialKey(node.customDepthMaterial):'-'),'distance:'+(node.customDistanceMaterial?materialKey(node.customDistanceMaterial):'-'));\n", '')], tests: DIGEST},
  {id: 'G20-material-hook-refusal-off', edits: [e(BG, "if(key!=='onBeforeCompile'&&key!=='customProgramCacheKey')throw Error(", "if(false)throw Error(")], tests: DIGEST},
  {id: 'G21-node-hook-refusal-off', edits: [e(BG, "for(const key of Object.keys(node))if(typeof node[key]==='function')throw Error(", "for(const key of Object.keys(node))if(false)throw Error(")], tests: DIGEST},
  {id: 'G22-textures-by-id', why: 'a texture keyed by its uuid: equal atlases differ', edits: [e(BG, 'if(value.isTexture){const {uuid,image,metadata,...settings}=value.toJSON(meta);return settings;}', 'if(value.isTexture)return value.uuid;')], tests: DIGEST},
  {id: 'G23-version-keyed', why: 'the material\'s update counter keyed: a needsUpdate changes the digest', edits: [e(BG, "if(key==='uuid'||key==='version')continue;", "if(key==='uuid')continue;")], tests: DIGEST, expect: 'equivalent unless a model sets needsUpdate after creation'},
  {id: 'G11-control-emissive-every-material', why: 'round 3 G11, the control', edits: [e(BC, 'material=new T.MeshStandardMaterial({color:grey?0xaaa99f:new T.Color(...tint),', 'material=new T.MeshStandardMaterial({emissive:0x202020,color:grey?0xaaa99f:new T.Color(...tint),')], tests: DIGEST},
  // --- the workloads (N6)
  {id: 'W1-lamp-kinds-check-off', edits: [e(WL, "if (kinds(JSON.parse(workloads.find(w => w.id === id).json).props) !== kinds(props)) throw Error", "if (false) throw Error")], tests: COUNT, expect: 'by design: it refuses lamps lost by openDocument'}
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
const result = {script: 'mutate-a4.mjs', phase: confirm ? 'confirm: whole suite + tools/check.mjs' : 'phase 1: module tests', started: new Date().toISOString(), node: process.version, head: head0, statusBefore: status0 || '(clean)', mutants: []};
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
