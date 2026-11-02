// Root-owned PREPARATION importer. This file never writes to the live project.
// Root may consume the returned immutable plan only after independent approval.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export const KERNEL='4ade3ea02084472b30d036e8a0561e473aa84f3f';
export const ORIGINAL_ROOT='0e7d0f40de790631c6421de2236b9df1c11c0b86';
export const MAIN='1e6a97b67c57917160db89db34cbae9e4e46f90c';
export const PREFIX='candidates/tile-authoring/editor/c2-shared-runtime-prototype/';
export const HELPER='packages/authoring-runtime/observation.js';
const originalPaths=['packages/windows-authoring/journal.js','apps/editor/smart-tile/checkpoint.js','apps/editor/smart-tile/session.js','apps/editor/smart-tile/authority.js','apps/editor/smart-tile/storage.js','apps/editor/tile-authoring/checkpoint.js','apps/editor/tile-authoring/jsonl.js'];
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const record=(file,b)=>({path:file,bytes:b.length,sha256:sha(b),gitBlob:blob(b)});
const valid=file=>{assert.equal(typeof file,'string');assert.equal(path.posix.normalize(file),file);assert.ok(file&&!file.startsWith('/')&&!file.includes('\\')&&!file.split('/').includes('..'));return file;};
const asBuffer=v=>{assert.ok(Buffer.isBuffer(v),'Fixed Git reader must return bytes, never checkout text');return v;};
export function kernelPromotionSources({object}){
 assert.equal(typeof object,'function');const read=(commit,file)=>asBuffer(object(commit,valid(file))),manifest=JSON.parse(read(KERNEL,PREFIX+'source.json'));
 assert.equal(manifest.base,ORIGINAL_ROOT);assert.equal(manifest.declared,false);assert.equal(manifest.publicActivation,false);assert.equal(manifest.files.length,8);
 const sourceToTarget=new Map(originalPaths.map(file=>[PREFIX+'runtime/'+file,file]));sourceToTarget.set(PREFIX+'runtime/observation.js',HELPER);
 assert.deepEqual([...sourceToTarget.keys()].sort(),manifest.files.map(r=>PREFIX+r.path).sort());
 const rows=[],rawOriginals=[];
 for(const [sourcePath,targetPath]of sourceToTarget){
  const original=read(KERNEL,sourcePath),declared=manifest.files.find(r=>PREFIX+r.path===sourcePath);assert.equal(original.length,declared.bytes,'Fixed Kernel source bytes: '+sourcePath);assert.equal(sha(original),declared.sha256,'Fixed Kernel source bytes: '+sourcePath);
  let text=original.toString('utf8');assert.deepEqual(Buffer.from(text),original);const rewrites=[],imports=[];
  const matches=[...text.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)(['"])([^'"\r\n]+)\1/g)];
  for(const match of matches){
   const [quote,specifier]=[match[1],match[2]];assert.ok(specifier.startsWith('.'),'No bare or network runtime dependency may appear');
   const sourceDependency=path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath),specifier));
   const own=sourceToTarget.get(sourceDependency),targetDependency=own??valid(sourceDependency);
   if(!own){const dependency=manifest.dependencies.find(r=>r.path===sourceDependency);assert.ok(dependency,'Only exact recorded baseline dependencies: '+sourceDependency);const bytes=read(ORIGINAL_ROOT,sourceDependency);assert.equal(bytes.length,dependency.bytes);assert.equal(sha(bytes),dependency.sha256);assert.deepEqual(read(MAIN,sourceDependency),bytes);}
   if(targetPath.startsWith('packages/'))assert.ok(targetDependency.startsWith('packages/'),'Headless package must never import apps or a candidate');
   let next=path.posix.relative(path.posix.dirname(targetPath),targetDependency);if(!next.startsWith('.'))next='./'+next;
   imports.push({fromSpecifier:specifier,toSpecifier:next,sourceDependency,targetDependency,ownership:own?'same fixed Kernel':'unchanged fixed Root dependency'});
   if(next!==specifier){const from=quote+specifier+quote,to=quote+next+quote;assert.equal(text.split(from).length,2,'One exact import literal');text=text.replace(from,to);rewrites.push({from,to,occurrences:1});}
  }
  let reverse=text;for(const change of [...rewrites].reverse()){assert.equal(reverse.split(change.to).length,2);reverse=reverse.replace(change.to,change.from);}assert.deepEqual(Buffer.from(reverse),original,'No body or header edit outside exact import literals');
  const expectedBuffer=Buffer.from(text),before=targetPath===HELPER?null:read(ORIGINAL_ROOT,targetPath);if(before)assert.deepEqual(read(MAIN,targetPath),before,'Root0e7 and Main1e must agree: '+targetPath);
  rows.push({path:targetPath,sourceCommit:KERNEL,sourcePath,source:record(sourcePath,original),beforeCommit:before?MAIN:null,before:before?record(targetPath,before):null,beforeBuffer:before,expected:record(targetPath,expectedBuffer),expectedBuffer,rewrites,imports,header:'Byte-exact Kernel header retained; provenance records origin separately.',role:targetPath===HELPER?'new internal headless observation helper':'explicit shared source override'});
  rawOriginals.push({path:'raw/kernel-4ade/'+sourcePath,sourceCommit:KERNEL,sourcePath,bytes:original});
 }
 assert.equal(rows.length,8);assert.equal(rows.reduce((n,row)=>n+row.rewrites.length,0),11);assert.equal(rows.find(r=>r.path===HELPER).imports.length,0);
 for(const file of [...originalPaths,'NOTICE.md'])rawOriginals.push({path:'raw/root-0e7/'+file,sourceCommit:ORIGINAL_ROOT,sourcePath:file,bytes:read(ORIGINAL_ROOT,file)});
 rawOriginals.push({path:'raw/main-1e6/NOTICE.md',sourceCommit:MAIN,sourcePath:'NOTICE.md',bytes:read(MAIN,'NOTICE.md')});
 const beforePackage=read(MAIN,'package.json'),pkg=JSON.parse(beforePackage),needle='    "packages/building-catalog/designs.js",';assert.equal(beforePackage.toString().split(needle).length,2);assert.ok(!pkg.files.includes(HELPER));
 const from=needle,to='    "'+HELPER+'",\n'+needle,expectedPackage=Buffer.from(beforePackage.toString().replace(from,to)),next=JSON.parse(expectedPackage);assert.deepEqual(next,{...pkg,files:[...pkg.files,HELPER].sort()});
 return {kind:'nautilus-root-c2-kernel-promotion-plan',version:1,kernel:KERNEL,originalRoot:ORIGINAL_ROOT,main:MAIN,status:'PREPARATION ONLY; Native review and Root composition/admission remain required',rows,rawOriginals,packageWhitelist:{path:'package.json',beforeCommit:MAIN,before:record('package.json',beforePackage),beforeBuffer:beforePackage,expected:record('package.json',expectedPackage),expectedBuffer:expectedPackage,rewrites:[{from,to,occurrences:1}],onlyAddedFile:HELPER,newExports:[],versionChanged:false},requiredGitCommits:[KERNEL,ORIGINAL_ROOT,MAIN]};
}
// Pure preimage test seam. read/exists belong to Root's filesystem adapter;
// numeric/JSON flags cannot grant import authority or choose a different pin.
export function assertPreimageBuffers(plan,{read,exists}){
 assert.equal(plan.kernel,KERNEL);assert.equal(plan.main,MAIN);assert.equal(plan.rows.length,8);
 for(const row of plan.rows){if(row.beforeBuffer)assert.deepEqual(asBuffer(read(row.path)),row.beforeBuffer,'Changed Root preimage: '+row.path);else assert.equal(exists(row.path),false,'New helper already exists: '+row.path);}
 assert.deepEqual(asBuffer(read('package.json')),plan.packageWhitelist.beforeBuffer,'Changed Root package preimage');return true;
}
export function verifyRootPreimages(projectRoot,plan){
 const base=path.resolve(projectRoot),absolute=file=>{const value=path.resolve(base,valid(file));assert.ok(value.startsWith(base+path.sep));return value;};
 return assertPreimageBuffers(plan,{read(file){const value=absolute(file);assert.equal(fs.lstatSync(value).isSymbolicLink(),false,'Root preimage cannot be a symlink');return fs.readFileSync(value);},exists:file=>fs.existsSync(absolute(file))});
}
export function serializablePlan(plan){
 const rows=plan.rows.map(({beforeBuffer,expectedBuffer,...row})=>row),rawOriginals=plan.rawOriginals.map(r=>({path:r.path,sourceCommit:r.sourceCommit,sourcePath:r.sourcePath,...record(r.path,r.bytes)})),{beforeBuffer,expectedBuffer,...packageWhitelist}=plan.packageWhitelist;
 return {...plan,rows,rawOriginals,packageWhitelist};
}
