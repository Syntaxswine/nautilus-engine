// Exact private patch proof over copied pinned public files. No shipped source edit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {root,moduleClosure} from './distribution.mjs';
export const BASE='2502646482218524fd5129641da769bb82462e4d',TASK_BASE='b850e20e2fdd85435d33f16327482b80380af728',ART='a536cfec20e609a6c507f000791d8d7e71ae6d18';
export const OWN='candidates/tile-stack/core/line-d4-provider-patch',FILE='packages/tile-visuals/prepare.js';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const run=(args,{cwd=root,input,records=[]}={})=>{const startedAt=new Date().toISOString(),p=spawnSync('git',args,{cwd,input,encoding:null,windowsHide:true,maxBuffer:32*1024*1024});records.push({owner:'Coder, Nautilus Engine',purpose:args.includes('apply')?'apply exact patch in disposable public copy':args[0],executable:'git',pid:p.pid??null,startedAt,endedAt:new Date().toISOString(),foreground:true,exitCode:p.status,exited:p.status!==null,endCondition:'synchronous foreground exit'});assert.equal(p.error,undefined,p.error?.message);assert.equal(p.status,0,p.stderr?.toString());return p.stdout;};
const object=(commit,file,records)=>run(['show',commit+':'+file],{records});
const read=name=>fs.readFileSync(path.join(root,OWN,name));
export function generatePatch(){
 const folder=path.join(root,OWN);fs.mkdirSync(folder,{recursive:true});
 const old=object(BASE,FILE),before=old.toString('utf8'),needle='startRad:start,sweepRad:sweep',replacement='startRad:Object.is(start,-0)?0:start,sweepRad:sweep';assert.equal(before.split(needle).length,2);const after=before.replace(needle,replacement),lines=before.split('\n'),i=lines.findIndex(l=>l.includes(needle)),from=i-3,to=i+4;
 const patch='diff --git a/'+FILE+' b/'+FILE+'\n--- a/'+FILE+'\n+++ b/'+FILE+'\n@@ -'+(from+1)+',7 +'+(from+1)+',7 @@\n'+lines.slice(from,to).map((line,n)=>n===3?'-'+line+'\n+'+line.replace(needle,replacement):' '+line).join('\n')+'\n';
 const witnessPath='docs/reviews/tile-stack/art/line-d4-refusal.json',witness=object(ART,witnessPath),files=moduleClosure(['packages/tiles-core/index.js','packages/tile-visuals/prepare.js','packages/tile-visuals/example.js','packages/tile-visuals/three.js']).map(file=>{const b=object(BASE,file);assert.equal(hash(b),hash(fs.readFileSync(path.join(root,file))),'Runtime drift '+file);return {path:file,bytes:b.length,sha256:hash(b)};});
 fs.writeFileSync(path.join(folder,'prepare.baseline.js.txt'),old);fs.writeFileSync(path.join(folder,'derived-start-zero.patch'),patch);fs.writeFileSync(path.join(folder,'original-artist-witness.json'),witness);
 const manifest={kind:'nautilus-private-provider-patch-proof',version:1,status:'private patch only; not public source registration',runtimeBaseCommit:BASE,taskBaseCommit:TASK_BASE,artistWitness:{commit:ART,path:witnessPath,sha256:hash(witness),copiedVerbatim:true},targetFile:FILE,sourcePreimageFile:'prepare.baseline.js.txt',patchFile:'derived-start-zero.patch',patchSha256:hash(patch),originalSha256:hash(old),patchedSha256:hash(after),scope:'Only canonicalize IEEE negative zero on the generated offset arc startRad immediately before actual core sampling. No authored data, validator, mesh, schema, dependency or retry change.',files};
 fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
export async function copiedPublicContext(){
 const manifest=JSON.parse(read('manifest.json')),patch=read(manifest.patchFile),witnessBytes=read('original-artist-witness.json'),records=[];assert.equal(manifest.runtimeBaseCommit,BASE);assert.equal(hash(patch),manifest.patchSha256);assert.equal(hash(witnessBytes),manifest.artistWitness.sha256);assert.equal(JSON.parse(witnessBytes).runtime,BASE);
 const preimage=read(manifest.sourcePreimageFile);assert.equal(hash(preimage),manifest.originalSha256);let checkedInProviderState;
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-line-d4-proof-')),a=path.join(scratch,'original'),b=path.join(scratch,'patched');let disposed=false;
 const cleanup=()=>{if(disposed)return null;const resolved=path.resolve(scratch);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('nautilus-line-d4-proof-'));assert.notEqual(resolved,path.resolve(os.tmpdir()));fs.rmSync(resolved,{recursive:true,force:true});assert.equal(fs.existsSync(resolved),false);disposed=true;const receipt={scratchPath:resolved,removed:true,allForegroundChildrenExited:records.every(r=>r.exited),backgroundHelpers:0,servers:0,ports:[],retainedHelpers:0};const output=path.join(root,'artifacts/tile-stack-core-line-d4');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'last-stage-cleanup.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;};
 try{
  for(const dir of [a,b]){fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'package.json'),'{"private":true,"type":"module"}\n');}
  for(const f of manifest.files){const current=fs.readFileSync(path.join(root,f.path));let bytes=current;if(f.path===FILE){const currentHash=hash(current);assert.ok([manifest.originalSha256,manifest.patchedSha256].includes(currentHash),'Unknown checked-in provider state');checkedInProviderState=currentHash===manifest.originalSha256?'original':'exact-declared-patch';bytes=preimage;}assert.equal(hash(bytes),f.sha256,'Public closure differs from pinned baseline '+f.path);for(const dir of [a,b]){const dest=path.join(dir,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);}}
  run(['-c','core.autocrlf=false','-c','core.eol=lf','apply','--check','--whitespace=error-all','-'],{cwd:b,input:patch,records});run(['-c','core.autocrlf=false','-c','core.eol=lf','apply','--whitespace=error-all','-'],{cwd:b,input:patch,records});
  for(const f of manifest.files){assert.equal(hash(fs.readFileSync(path.join(a,f.path))),f.sha256);assert.equal(hash(fs.readFileSync(path.join(b,f.path))),f.path===FILE?manifest.patchedSha256:f.sha256,'Unexpected copied patch delta '+f.path);}
  const load=async dir=>{const [core,art,examples]=await Promise.all(['packages/tiles-core/index.js','packages/tile-visuals/prepare.js','packages/tile-visuals/example.js'].map(f=>import(pathToFileURL(path.join(dir,f)).href)));return {core,art,examples};};
  const [original,patched]=await Promise.all([load(a),load(b)]);return {manifest,witness:JSON.parse(witnessBytes),checkedInProviderState,original,patched,records,cleanup};
 }catch(error){cleanup();throw error;}
}
const byteEqual=(a,b)=>Buffer.from(JSON.stringify(a)).equals(Buffer.from(JSON.stringify(b)));
const digest=v=>hash(JSON.stringify(v));
export function lineMatrix(ctx){
 const seed=ctx.witness.cases[0].sourceBundle,cases=[];
 for(let mirror=0;mirror<2;mirror++)for(let quarterTurns=0;quarterTurns<4;quarterTurns++)for(const detail of [0,1,2]){
  const transform={quarterTurns,mirrorX:Boolean(mirror)},bundle=structuredClone(seed);bundle.layout.instances[0].transform=transform;const before=digest(bundle);assert.equal(ctx.original.core.openTileBundle(bundle,{requireResolved:true}).ok,true);
  const expectedRefusal=quarterTurns===1&&!mirror||quarterTurns===3&&Boolean(mirror);let old,failed;
  try{old=ctx.original.art.prepareTileArt(ctx.original.core,bundle,{detail});}catch(e){failed=e;}
  assert.equal(digest(bundle),before);if(expectedRefusal){assert.equal(failed?.code,'INVALID_NUMBER');assert.equal(failed.path,'/startRad');}else assert.equal(failed,undefined,failed?.message);
  const next=ctx.patched.art.prepareTileArt(ctx.patched.core,bundle,{detail});assert.equal(digest(bundle),before);assert.deepEqual(next.bundle,bundle);
  if(!expectedRefusal){assert.deepEqual(next,old);assert.equal(byteEqual(next,old),true);}
  cases.push({transform,detail,publicSourceResolved:true,original:expectedRefusal?{ok:false,code:failed.code,path:failed.path}:{ok:true,projectionSha256:digest(old)},patched:{ok:true,projectionSha256:digest(next)},previouslyGoodDeepAndByteEqual:expectedRefusal?null:true,sourceBeforeSha256:before,sourceAfterSha256:digest(bundle)});
 }
 assert.equal(cases.length,24);assert.equal(cases.filter(c=>!c.original.ok).length,6);return cases;
}
export function exactWitnesses(ctx){
 return ctx.witness.cases.map(w=>{const bundle=structuredClone(w.sourceBundle),before=digest(bundle);assert.equal(before,w.beforeSourceSha256);assert.equal(ctx.original.core.openTileBundle(bundle,{requireResolved:true}).ok,true);assert.throws(()=>ctx.original.art.prepareTileArt(ctx.original.core,bundle,{detail:0}),e=>e.code===w.publicFailure.code&&e.path===w.publicFailure.path);
  const observed=[],spy={...ctx.original.core,sampleTileCurve(c,...args){if(Object.is(c.startRad,-0)){const bytes=new ArrayBuffer(8);new DataView(bytes).setFloat64(0,c.startRad,false);observed.push({id:c.id,isNegativeZero:true,ieee754:Buffer.from(bytes).toString('hex')});}return ctx.original.core.sampleTileCurve(c,...args);}};
  assert.throws(()=>ctx.original.art.prepareTileArt(spy,bundle,{detail:0}),e=>e.code==='INVALID_NUMBER'&&e.path==='/startRad');assert.equal(observed.length,1);assert.equal(observed[0].id,'art-offset-1');assert.equal(observed[0].ieee754,'8000000000000000');const fixed=ctx.patched.art.prepareTileArt(ctx.patched.core,bundle,{detail:0});assert.deepEqual(fixed.bundle,bundle);assert.equal(digest(bundle),before);
  return {placement:w.exactPlacement,originalFailure:w.publicFailure,diagnosticCallThroughOnly:true,observed,patchedDirectActualCoreSucceeded:true,sourceByteEqual:true};});
}
export function canonicalRegressions(ctx){
 return [0,1,2].map(detail=>{const bundle=ctx.original.examples.canonicalTileArtExample(ctx.original.core),before=digest(bundle),old=ctx.original.art.prepareTileArt(ctx.original.core,bundle,{detail}),next=ctx.patched.art.prepareTileArt(ctx.patched.core,bundle,{detail});assert.deepEqual(next,old);assert.equal(byteEqual(next,old),true);assert.equal(digest(bundle),before);return {detail,instances:bundle.layout.instances.length,originalAndPatchedDeepAndByteEqual:true,projectionSha256:digest(next),sourceByteEqual:true};});
}
export function authoredNegativeZero(ctx){
 const outcomes=[];for(const [label,p]of [['original',ctx.original],['patched',ctx.patched]]){
  const arc={kind:'arc',id:'authored.arc',center:[0,0],radius:1,startRad:-0,sweepRad:1,h0:0,h1:0};assert.throws(()=>p.core.sampleTileCurve(arc),e=>e.code==='INVALID_NUMBER'&&e.path==='/startRad');assert.equal(Object.is(arc.startRad,-0),true);
  const r=structuredClone(ctx.witness.cases[0].exactRecipe);r.shape.path.a[0]=-0;assert.throws(()=>p.core.compileTileRecipe(r),e=>e.code==='INVALID_NUMBER');assert.equal(Object.is(r.shape.path.a[0],-0),true);
  const bundle=structuredClone(ctx.witness.cases[0].sourceBundle);bundle.recipes[0].shape.path.a[0]=-0;assert.throws(()=>p.art.prepareTileArt(p.core,bundle,{detail:0}));assert.equal(Object.is(bundle.recipes[0].shape.path.a[0],-0),true);outcomes.push({namespace:label,authoredArcAndRecipeRejected:true,authoredProviderInputRejected:true,inputNegativeZeroRetained:true});
 }return outcomes;
}
export async function runProof(){const ctx=await copiedPublicContext();let report;try{report={schemaVersion:1,status:'private exact-patch proof; shipped public bytes unchanged',manifest:ctx.manifest,checkedInProviderState:ctx.checkedInProviderState,exactWitnesses:exactWitnesses(ctx),lineCases:lineMatrix(ctx),canonicalCases:canonicalRegressions(ctx),authoredNegativeZero:authoredNegativeZero(ctx),processes:ctx.records,cleanup:null};}finally{const cleanup=ctx.cleanup();if(report)report.cleanup=cleanup;const dir=path.join(root,'artifacts/tile-stack-core-line-d4');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'cleanup.json'),JSON.stringify(cleanup,null,2)+'\n');}const output=path.join(root,'artifacts/tile-stack-core-line-d4/report.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');return report;}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--generate')){const m=generatePatch();console.log(JSON.stringify({patchSha256:m.patchSha256,originalSha256:m.originalSha256,patchedSha256:m.patchedSha256,files:m.files.length}));}
 else{const r=await runProof();console.log(JSON.stringify({patchSha256:r.manifest.patchSha256,lineCases:r.lineCases.length,repaired:r.lineCases.filter(c=>!c.original.ok).length,unchangedGood:r.lineCases.filter(c=>c.previouslyGoodDeepAndByteEqual).length,canonicalRegressions:r.canonicalCases.length,cleanup:r.cleanup}));}
}
