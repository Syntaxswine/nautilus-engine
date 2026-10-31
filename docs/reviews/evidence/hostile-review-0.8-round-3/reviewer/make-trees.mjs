// Round 3: built copies of the candidate with one mutant each, for browser checks that
// the node suite cannot make (does --expect, the isolation check or a pixel probe see it?).
//   node make-trees.mjs <sandbox> <scratch dir> [id,id,...]
// Each tree is `git archive HEAD` of the clean sandbox, one needle replaced (exactly
// once), a .bench-tree.json stamp, then `node tools/build.mjs`. Exit codes are recorded.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
const [sandbox, scratch] = process.argv.slice(2, 4).map(p => path.resolve(p)), wanted = process.argv[4]?.split(',');
const git = (...a) => execFileSync('git', ['-C', sandbox, ...a], {encoding: 'utf8'}).trim();
if (git('status', '--porcelain')) throw Error('Refusing a dirty sandbox');
const head = git('rev-parse', 'HEAD');
const MUTANTS = {
  'I1-instance-bounds-template-only': ['apps/editor/prefab-scene.js', 'mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();', 'mesh.instanceMatrix.needsUpdate=true;mesh.boundingSphere=node.geometry.boundingSphere.clone();'],
  'R1-merged-bounds-first-roof': ['apps/editor/roof-scene.js', 'geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();', 'geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.boundingSphere=shells[0].geometry.boundingSphere.clone();'],
  'E1-editor-never-instances': ['apps/editor/prefab-scene.js', "this.prefabs=new PrefabLayer(this.scene,this.renderer,()=>this.changed(),error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});", "this.prefabs=new PrefabLayer(this.scene,this.renderer,()=>this.changed(),error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();},{instancing:false});"],
  // A control for the pixel classes: a real 1 cm placement error on one copy.
  'I10-copy-1-offset-1cm': ['apps/editor/prefab-scene.js', 'models.forEach((model,k)=>mesh.setMatrixAt(k,matrix.multiplyMatrices(model.root.matrixWorld,local)));', 'models.forEach((model,k)=>{matrix.multiplyMatrices(model.root.matrixWorld,local);if(k===1)matrix.elements[12]+=0.01;mesh.setMatrixAt(k,matrix);});'],
  'E2-editor-never-merges-roofs': ['apps/editor/roof-scene.js', 'this.slopedRoofs=new RoofLayer(this.scene);', 'this.slopedRoofs=new RoofLayer(this.scene,{merge:false});']
};
fs.mkdirSync(scratch, {recursive: true});
const log = [];
for (const [id, [file, needle, replace]] of Object.entries(MUTANTS)) {
  if (wanted && !wanted.includes(id)) continue;
  const dir = path.join(scratch, 'tree-' + id);
  fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
  const tar = path.join(scratch, id + '.tar');
  execFileSync('git', ['-C', sandbox, 'archive', '--format=tar', '-o', tar, 'HEAD']);
  execFileSync(process.env.SystemRoot ? path.join(process.env.SystemRoot, 'System32', 'tar.exe') : 'tar', ['-xf', tar, '-C', dir]); fs.rmSync(tar);
  const target = path.join(dir, file), text = fs.readFileSync(target, 'utf8'), n = text.split(needle).length - 1;
  if (n !== 1) throw Error(id + ': needle occurs ' + n + ' times');
  fs.writeFileSync(target, text.replace(needle, () => replace));
  fs.writeFileSync(path.join(dir, '.bench-tree.json'), JSON.stringify({commit: head, method: 'git archive + mutant ' + id}));
  const t0 = Date.now(), r = spawnSync(process.execPath, ['tools/build.mjs'], {cwd: dir, encoding: 'utf8', maxBuffer: 1 << 28});
  log.push({id, file, exit: r.status, ms: Date.now() - t0, tail: ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-2).join(' | ').slice(0, 300)});
  console.log(JSON.stringify(log.at(-1)));
}
fs.writeFileSync(path.join(scratch, 'make-trees.json'), JSON.stringify({head, log}, null, 1));
