// Round-2 mutation harness for the answer's new code, re-run on the answer to round 2.
// Adapted: the display batches moved to packages/prefab-core/display-batches.js, and the
// wall shadow materials now come from wallShadowMaterials(), so W2/W3 are re-expressed
// with the same intent and W2b/W3b cover the new distance material. Everything else is
// round 2's harness unchanged.
//   node mutate.mjs <tree> [--only id,id] [--confirm]
// Refuses a dirty tree; every needle must occur exactly once; every touched file
// is restored byte for byte in a finally and its hash verified; HEAD and status
// are recorded before and after. Phase 1 runs the module's test files (plus
// tools/check.mjs where the mutant concerns provenance). --confirm re-runs each
// phase-1 survivor against the whole suite and the repository check.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TREE = path.resolve(process.argv[2]);
const args = process.argv.slice(3), only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null, confirm = args.includes('--confirm');
const git = (...a) => execFileSync('git', ['-C', TREE, ...a], {encoding: 'utf8'}).trim();
const sha = b => createHash('sha256').update(b).digest('hex');
const status0 = git('status', '--porcelain'), head0 = git('rev-parse', 'HEAD');
if (status0) throw Error('Refusing a dirty tree:\n' + status0);

const BATCH_TESTS = ['tests/prefab-display-batches.test.mjs', 'tests/building-prefabs.test.mjs', 'tests/prefab-providers.test.mjs', 'tests/editor-roof-paint.test.mjs', 'tests/building-library-lifecycle.test.mjs'];
const WALL_TESTS = ['tests/editor-wall-scene.test.mjs'];
const FACADE_TESTS = ['tests/shared-assets.test.mjs'];
const GEN_TESTS = ['tests/building-geometry.test.mjs', 'tests/building-catalog.test.mjs', 'tests/prefab-registry.test.mjs', 'tests/prefab-display-batches.test.mjs', 'tests/shared-assets.test.mjs'];
const PB = 'packages/prefab-core/display-batches.js', PP = 'apps/editor/prefab-providers.js', WS = 'apps/editor/wall-scene.js', FA = 'packages/assets/three.js', GE = 'packages/building-catalog/three.js', DG = 'tools/building-geometry.mjs', PV = 'tools/prefab-original-catalog.mjs';
const FIXTURE = 'tests/fixtures/original-building-geometry.json', CATALOGUE = 'assets/buildings/catalogue.json', REGISTRY = 'packages/prefab-core/original-catalogue.js';
const e = (file, needle, replace) => ({file, needle, replace});

// hooks: 'catalogue-sha' (record the mutated renderer's hash in catalogue.json, as
// build:buildings would), 'fixture' (re-record the geometry fixture), 'registry'
// (prefab-original-catalog --write). Together they are the documented refresh.
const MUTANTS = [
  // --- display batches (8ed66db)
  {id: 'B1-order-ignores-class', edits: [e(PB, 'list.sort((a,b)=>compare(a.key,b.key)||a.order-b.order);', 'list.sort((a,b)=>a.order-b.order);')], tests: BATCH_TESTS},
  {id: 'B2-class-order-reversed', expect: 'equivalent for run counts (a reversed sequence keeps every contiguous range contiguous); changes only buffer order', edits: [e(PB, 'list.sort((a,b)=>compare(a.key,b.key)||a.order-b.order);', 'list.sort((a,b)=>compare(b.key,a.key)||a.order-b.order);')], tests: BATCH_TESTS},
  {id: 'B3-C2-ascending', edits: [e(PB, 'return from===null?[bare?2:3]:bare?[1,from]:[0,-from];', 'return from===null?[bare?2:3]:bare?[1,from]:[0,from];')], tests: BATCH_TESTS},
  {id: 'B4-gross-key-swap', edits: [e(PB, 'inCut?[1,0]:[2,0];', 'inCut?[2,0]:[1,0];')], tests: BATCH_TESTS},
  {id: 'B5-runs-never-merge', edits: [e(PB, 'else if(run)run.count+=range.count;', 'else if(false)run.count+=range.count;')], tests: BATCH_TESTS},
  {id: 'B6-hidden-piece-keeps-run', edits: [e(PB, 'if(!range.piece.visible(options))run=null;', 'if(!range.piece.visible(options)){}')], tests: BATCH_TESTS},
  {id: 'B7-no-release', edits: [e(PB, 'const released=new T.BufferGeometry();for(const piece of pieces){piece.mesh.geometry.dispose();piece.mesh.geometry=released;}', '')], tests: BATCH_TESTS},
  {id: 'B8-dispose-leaks-batches', edits: [e(PB, 'function release(root,records){root.removeFromParent();for(const {mesh}of records)mesh.geometry.dispose();root.clear();}', 'function release(root,records){root.removeFromParent();root.clear();}')], tests: BATCH_TESTS},
  {id: 'B9-glass-merged', edits: [e(PB, 'if(mesh.material.transparent){if(mesh!==top)', 'if(false){if(mesh!==top)')], tests: BATCH_TESTS},
  {id: 'B10-glass-always-visible', edits: [e(PB, 'for(const {top,mesh}of glass)mesh.visible=top.visible;}', 'for(const {top,mesh}of glass)mesh.visible=true;}')], tests: BATCH_TESTS},
  {id: 'B11-never-exact', expect: 'bakes identity transforms: -0 becomes +0 and normals are renormalised', edits: [e(PB, 'exact:mesh===top&&mesh.matrixWorld.equals(IDENTITY)', 'exact:false')], tests: BATCH_TESTS},
  {id: 'B12-uv-swapped', edits: [e(PB, 'arrays[name][o*2]=a?.getX(v)||0;arrays[name][o*2+1]=a?.getY(v)||0;', 'arrays[name][o*2]=a?.getY(v)||0;arrays[name][o*2+1]=a?.getX(v)||0;')], tests: BATCH_TESTS},
  {id: 'B13-normals-not-rotated', edits: [e(PB, 'n.fromBufferAttribute(attributes.normal,v).applyNormalMatrix(normalMatrix);', 'n.fromBufferAttribute(attributes.normal,v);')], tests: BATCH_TESTS},
  {id: 'B14-exact-uv-dropped', edits: [e(PB, "arrays[name].set(source.array.subarray(piece.start*size,piece.end*size),at*size);}}", "if(name!=='uv')arrays[name].set(source.array.subarray(piece.start*size,piece.end*size),at*size);}}")], tests: BATCH_TESTS},
  {id: 'P1-view-not-forwarded', edits: [e(PP, 'setView(view,options){source.setView(view,options);batch.sync(options);}', 'setView(view,options){batch.sync(options);}')], tests: BATCH_TESTS},
  // --- walls (af06303, aaa77e4)
  {id: 'W1-shader-no-width', edits: [e(WS, 'transformed.x *= wallWidth;', 'transformed.x *= 1.0;')], tests: WALL_TESTS},
  {id: 'W2-no-depth-material', edits: [e(WS, 'mesh.customDepthMaterial=this.wallShadows.depth;', '')], tests: WALL_TESTS},
  {id: 'W2b-no-distance-material', edits: [e(WS, 'mesh.customDistanceMaterial=this.wallShadows.distance;', '')], tests: WALL_TESTS},
  {id: 'W3-depth-material-unpatched', edits: [e(WS, "depth:patchWallWidth(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}),'nautilus-wall-width-depth-v1')", 'depth:new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking})')], tests: WALL_TESTS},
  {id: 'W3b-distance-material-unpatched', edits: [e(WS, "distance:patchWallWidth(new T.MeshDistanceMaterial(),'nautilus-wall-width-distance-v1')", 'distance:new T.MeshDistanceMaterial()')], tests: WALL_TESTS},
  {id: 'W4-bounds-quarter', edits: [e(WS, 'const geometry=unitWallGeometry(widest);', 'const geometry=unitWallGeometry(widest/4);')], tests: WALL_TESTS},
  {id: 'W5-scaleU-inverted', edits: [e(WS, 'scaleU[i]=face<2?0:1;', 'scaleU[i]=face<2?1:0;')], tests: WALL_TESTS},
  {id: 'W6-widths-all-one', edits: [e(WS, 'widths[i]=panels[i].size[0];', 'widths[i]=1;')], tests: WALL_TESTS},
  {id: 'W7-matrices-slot-zero', edits: [e(WS, '.toArray(array,i*16);', '.toArray(array,0);')], tests: WALL_TESTS},
  {id: 'W8-geometry-not-disposed', edits: [e(WS, '{mesh.dispose();mesh.geometry.dispose();}', '{mesh.dispose();}')], tests: WALL_TESTS},
  {id: 'W9-no-program-key', edits: [e(WS, 'material.customProgramCacheKey=()=>key;', '')], tests: WALL_TESTS},
  {id: 'W10-uv-unscaled', edits: [e(WS, 'wallScaleU > 0.5 ? uv.x * wallWidth : uv.x', 'uv.x')], tests: WALL_TESTS},
  // --- facade (e6ae2a4)
  {id: 'F1-never-release', edits: [e(FA, 'if(--template.users===0)template.release();', 'if(--template.users<0)template.release();')], tests: FACADE_TESTS},
  {id: 'F2-no-refcount', edits: [e(FA, '});template.users++;', '});')], tests: FACADE_TESTS},
  {id: 'F3-inherits-current-view', edits: [e(FA, 'nodes.forEach((node,i)=>{node.visible=template.initial[i];});', '')], tests: FACADE_TESTS},
  {id: 'F4-stale-template-kept', edits: [e(FA, 'release(){templates.delete(key);model.dispose();}', 'release(){model.dispose();}')], tests: FACADE_TESTS},
  {id: 'F5-views-shared', edits: [e(FA, 'nodes.forEach((node,i)=>{node.visible=template.nodes[i].visible;});}', 'for(const n of nodes)n.visible=true;}')], tests: FACADE_TESTS},
  // --- generator (a68cefd)
  {id: 'G1-channel-keeps-open-batches', edits: [e(GE, 'channel(kind,level=0){this.current={kind,level};this.open=new Map();return this;}', 'channel(kind,level=0){this.current={kind,level};return this;}')], tests: GEN_TESTS},
  {id: 'G2-normals-not-grown', edits: [e(GE, 'if(P.length+9>P.array.length){P.grow(9);N.grow(9);}', 'if(P.length+9>P.array.length){P.grow(9);}')], tests: GEN_TESTS},
  {id: 'G3-flip-without-zero-start', expect: 'equivalent: only the sign test <0 reads the sum, and -0<0 is false', edits: [e(GE, 'const flip=normal&&((0+(aby*acz-abz*acy)*normal[0])', 'const flip=normal&&(((aby*acz-abz*acy)*normal[0])')], tests: GEN_TESTS},
  {id: 'G4-normal-sqrt-not-hypot', edits: [e(GE, 'if(len<1e-10)return;const inv=1/(len||1),x=nx*inv', 'if(len<1e-10)return;const inv=1/Math.sqrt(nx*nx+ny*ny+nz*nz),x=nx*inv')], tests: GEN_TESTS},
  {id: 'G5-glass-opacity-rebuilt', note: 'materials are outside the geometry digest; npm run build:buildings run as check-building-catalog instructs', edits: [e(GE, "opacity:id==='glass'?(grey?.08:.58):1", "opacity:id==='glass'?(grey?.08:.9):1")], hooks: ['exports'], tests: GEN_TESTS, check: true},
  {id: 'G5b-glass-opacity-hash-only', note: 'renderer hash line updated by hand, exports not rebuilt', edits: [e(GE, "opacity:id==='glass'?(grey?.08:.58):1", "opacity:id==='glass'?(grey?.08:.9):1")], hooks: ['catalogue-sha'], tests: GEN_TESTS, check: true},
  {id: 'G6-roughness-rebuilt', note: 'materials are outside the geometry digest', edits: [e(GE, "roughness:id==='glass'?.28:1", "roughness:id==='glass'?.28:.6")], hooks: ['exports'], tests: GEN_TESTS, check: true},
  {id: 'G7-cutaway-shows-trim-rebuilt', note: 'setView rules are outside the digest and the exports', edits: [e(GE, "(!cutaway||!['exterior','glazing','trim','tower'].includes(kind))", "(!cutaway||!['exterior','glazing','tower'].includes(kind))")], hooks: ['exports'], tests: GEN_TESTS, check: true},
  {id: 'G8-door-swing-rebuilt', note: 'the open-door envelope is regenerated into the registry', edits: [e(GE, '(open?Math.PI*.44:0)', '(open?Math.PI*.5:0)')], hooks: ['exports', 'registry'], tests: GEN_TESTS, check: true},
  {id: 'G5c-glass-opacity-hash-and-registry', note: 'hash line and registry refreshed, exports not rebuilt', edits: [e(GE, "opacity:id==='glass'?(grey?.08:.58):1", "opacity:id==='glass'?(grey?.08:.9):1")], hooks: ['catalogue-sha', 'registry'], tests: GEN_TESTS, check: true},
  {id: 'G7c-cutaway-shows-trim-rebuilt-and-registry', note: 'the documented refresh: build:buildings, then the registry', edits: [e(GE, "(!cutaway||!['exterior','glazing','trim','tower'].includes(kind))", "(!cutaway||!['exterior','glazing','tower'].includes(kind))")], hooks: ['exports', 'registry'], tests: GEN_TESTS, check: true},
  {id: 'G8b-door-swing-rebuilt-no-registry', edits: [e(GE, '(open?Math.PI*.44:0)', '(open?Math.PI*.5:0)')], hooks: ['exports'], tests: GEN_TESTS, check: true},
  {id: 'G9-stairs-refreshed-no-exports', note: 'geometry change, then renderer hash, fixture and registry refreshed; exports left stale', edits: [e(GE, 'const n=14;', 'const n=13;')], hooks: ['catalogue-sha', 'fixture', 'registry'], tests: GEN_TESTS, check: true},
  {id: 'G9b-stairs-refreshed-rebuilt', note: 'the same with npm run build:buildings', edits: [e(GE, 'const n=14;', 'const n=13;')], hooks: ['exports', 'fixture', 'registry'], tests: GEN_TESTS, check: true},
  {id: 'G10-stairs-raw', edits: [e(GE, 'const n=14;', 'const n=13;')], hooks: ['catalogue-sha'], tests: GEN_TESTS, check: true},
  // --- digest function (a68cefd)
  {id: 'D1-digest-ignores-bytes-refreshed', edits: [e(DG, "line.push(name+':'+a.itemSize+':'+sha256(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)));", "line.push(name+':'+a.itemSize);")], hooks: ['fixture'], tests: GEN_TESTS},
  {id: 'D2-digest-ignores-matrices-refreshed', edits: [e(DG, "const line=[node.type,node.name,node.visible,node.matrix.elements.join(','),JSON.stringify(node.userData)];", 'const line=[node.type,node.name,node.visible,JSON.stringify(node.userData)];')], hooks: ['fixture'], tests: GEN_TESTS},
  {id: 'D3-digest-ignores-userdata-refreshed', edits: [e(DG, "const line=[node.type,node.name,node.visible,node.matrix.elements.join(','),JSON.stringify(node.userData)];", "const line=[node.type,node.name,node.visible,node.matrix.elements.join(',')];")], hooks: ['fixture'], tests: GEN_TESTS},
  {id: 'D4-digest-sorted-lines-refreshed', edits: [e(DG, "return sha256(lines.join('\\n'));", "return sha256(lines.sort().join('\\n'));")], hooks: ['fixture'], tests: GEN_TESTS},
  // --- provenance pin (a68cefd)
  {id: 'V1-check-skips-geometry', expect: 'redundant with tests/building-geometry.test.mjs on its own', edits: [e(PV, "if(buildingDigest(model)!==REVIEWED_GEOMETRY.digests['game:'+entry.id])throw", 'if(false)throw')], tests: ['tests/prefab-registry.test.mjs'], check: true},
  {id: 'V2-catalogue-content-edited', edits: [e(CATALOGUE, '"style": "Contemporary ranch",', '"style": "Contemporary ranch!",')], tests: ['tests/prefab-registry.test.mjs'], check: true},
  {id: 'V3-catalogue-content-edited-pin-off', edits: [e(CATALOGUE, '"style": "Contemporary ranch",', '"style": "Contemporary ranch!",'), e(PV, ".digest('hex')!==REVIEWED_CATALOGUE_CONTENT)throw", ".digest('hex')!==REVIEWED_CATALOGUE_CONTENT&&false)throw")], hooks: ['registry'], tests: ['tests/prefab-registry.test.mjs'], check: true}
];
const MODELS = 'assets/buildings/models';

function run(cmd, argv, timeout) {
  const t0 = Date.now(), r = spawnSync(cmd, argv, {cwd: TREE, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024, windowsHide: true});
  const text = (r.stdout || '') + (r.stderr || ''), grab = k => {const m = text.match(new RegExp('\\u2139 ' + k + ' (\\d+)')); return m ? Number(m[1]) : null;};
  const failing = [...text.matchAll(/^not ok \d+ - (.*)$/gm)].map(m => m[1]).slice(0, 6);
  return {cmd: [path.basename(cmd), ...argv.map(a => a.startsWith(TREE) ? '<sandbox>' + a.slice(TREE.length) : a)].join(' '), exit: r.status, signal: r.signal, timedOut: r.error?.code === 'ETIMEDOUT', ms: Date.now() - t0,
    pass: grab('pass'), fail: grab('fail'), cancelled: grab('cancelled'), failing, tail: text.split('\n').filter(l => /Error|throw|differs|mismatch|Stale/.test(l)).slice(0, 4).map(l => l.slice(0, 300))};
}
function hook(name) {
  if (name === 'catalogue-sha') {
    const file = path.join(TREE, CATALOGUE), text = fs.readFileSync(file, 'utf8'), current = sha(fs.readFileSync(path.join(TREE, GE)));
    const re = /("file": "packages\/building-catalog\/three\.js",\s*"sha256": ")([0-9a-f]{64})(")/;
    if (!re.test(text)) throw Error('catalogue renderer line not found');
    fs.writeFileSync(file, text.replace(re, (_, a, _old, c) => a + current + c));
    return {hook: name, ok: true};
  }
  if (name === 'exports') {const r = spawnSync(process.execPath, ['tools/build-building-assets.mjs'], {cwd: TREE, encoding: 'utf8', windowsHide: true}); return {hook: name, ok: r.status === 0, out: (r.stdout + r.stderr).trim().slice(0, 300)};}
  if (name === 'fixture') {const r = spawnSync(process.execPath, [path.join(here, 'regen-fixture.mjs'), TREE], {encoding: 'utf8'}); return {hook: name, ok: r.status === 0, out: (r.stdout + r.stderr).trim().slice(0, 300)};}
  if (name === 'registry') {const r = spawnSync(process.execPath, ['tools/prefab-original-catalog.mjs', '--write'], {cwd: TREE, encoding: 'utf8'}); return {hook: name, ok: r.status === 0, out: (r.stdout + r.stderr).trim().slice(0, 300)};}
  throw Error('unknown hook ' + name);
}
const touched = m => [...new Set([...m.edits.map(x => x.file), ...(m.hooks || []).flatMap(h => h === 'catalogue-sha' ? [CATALOGUE] : h === 'fixture' ? [FIXTURE] : h === 'registry' ? [REGISTRY] : h === 'exports' ? [CATALOGUE, ...fs.readdirSync(path.join(TREE, MODELS)).map(f => MODELS + '/' + f)] : [])])];

function mutate(m, commands) {
  const files = touched(m), originals = new Map(files.map(f => [f, fs.readFileSync(path.join(TREE, f))]));
  const record = {id: m.id, files, expect: m.expect, note: m.note, hooks: [], runs: []};
  try {
    const texts = new Map();
    for (const x of m.edits) {
      const text = texts.get(x.file) ?? originals.get(x.file).toString('utf8'), count = text.split(x.needle).length - 1;
      if (count !== 1) {record.invalid = 'needle occurs ' + count + ' times in ' + x.file + ': ' + x.needle.slice(0, 80); return record;}
      texts.set(x.file, text.replace(x.needle, () => x.replace));
    }
    for (const [file, text] of texts) fs.writeFileSync(path.join(TREE, file), text);
    for (const h of m.hooks || []) record.hooks.push(hook(h));
    for (const c of commands(m)) record.runs.push(run(...c));
    record.killed = record.runs.some(r => r.exit !== 0);
  } finally {
    for (const [file, bytes] of originals) fs.writeFileSync(path.join(TREE, file), bytes);
    if ((m.hooks || []).includes('exports')) for (const f of fs.readdirSync(path.join(TREE, MODELS))) if (!originals.has(MODELS + '/' + f)) {fs.rmSync(path.join(TREE, MODELS, f)); record.removedNewExport = (record.removedNewExport || 0) + 1;}
    record.restored = files.every(f => sha(fs.readFileSync(path.join(TREE, f))) === sha(originals.get(f)));
    record.statusAfterRestore = git('status', '--porcelain') || '(clean)';
  }
  if (!record.restored) throw Error('Restore failed for ' + m.id);
  if (record.statusAfterRestore !== '(clean)') throw Error('Tree not clean after ' + m.id + ':\n' + record.statusAfterRestore);
  return record;
}
const out = path.join(here, confirm ? 'mutation-confirm.json' : only ? 'mutation-extra.json' : 'mutation-results.json');
const result = {script: 'mutate.mjs', started: new Date().toISOString(), node: process.version, head: head0, statusBefore: status0 || '(clean)', mutants: []};
const list = MUTANTS.filter(m => !only || only.has(m.id));
try {
  for (const m of list) {
    const commands = confirm
      ? () => [[process.execPath, ['--test', '--test-timeout=300000', ...fs.readdirSync(path.join(TREE, 'tests')).filter(f => f.endsWith('.test.mjs')).sort().map(f => 'tests/' + f)], 1800000], [process.execPath, ['tools/check.mjs'], 600000]]
      : x => [[process.execPath, ['--test', '--test-timeout=240000', ...x.tests], 900000], ...(x.check ? [[process.execPath, ['tools/check.mjs'], 600000]] : [])];
    const r = mutate(m, commands);
    result.mutants.push(r);
    process.stdout.write(`${m.id}: ${r.invalid ? 'INVALID ' + r.invalid : r.killed ? 'killed' : 'SURVIVED'} ${r.runs.map(x => `[${x.cmd.split(' ').slice(0, 2).join(' ')} exit ${x.exit} pass ${x.pass} fail ${x.fail} cancelled ${x.cancelled}]`).join(' ')}\n`);
    fs.writeFileSync(out, JSON.stringify(result, null, 1));
  }
} finally {
  result.finished = new Date().toISOString();
  result.headAfter = git('rev-parse', 'HEAD'); result.statusAfter = git('status', '--porcelain') || '(clean)';
  result.summary = {total: result.mutants.length, killed: result.mutants.filter(m => m.killed).map(m => m.id), survived: result.mutants.filter(m => !m.invalid && !m.killed).map(m => m.id), invalid: result.mutants.filter(m => m.invalid).map(m => m.id)};
  fs.writeFileSync(out, JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result.summary, null, 1));
}
