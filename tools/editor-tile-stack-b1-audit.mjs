// Finite scoped source audit only. No fence edits, registration or runtime work.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='ce3a1afa02f70a478356de45c64364bb460b9c25',planner='45ecaef16bb39424c8b885d53acb4371654b4fa0';
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,maxBuffer:16*1024*1024});
const sha=data=>createHash('sha256').update(data).digest('hex');
const object=(commit,file)=>git('show',commit+':'+file);
const read=file=>{const target=path.join(root,file);assert.equal(fs.lstatSync(target).isSymbolicLink(),false);return fs.readFileSync(target);};
const record=file=>{const data=read(file);return {file,bytes:data.length,sha256:sha(data)};};
const files=prefix=>fs.readdirSync(path.join(root,prefix),{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(prefix+'/'+d.name):[prefix+'/'+d.name]);
const allowed=['authority.js','checkpoint.js','session.js','storage.js'].map(f=>'apps/editor/smart-tile/'+f).sort();
const changes=git('diff','--name-only',base,'--','apps/editor/smart-tile').toString().trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changes,allowed,'Only the four necessary authorized host files should change in B1.');
const oldHost=JSON.parse(object(base,'docs/reviews/smart-tile-editor/integration-sources.json'));
const protectedHost=oldHost.files.map(row=>({...record(row.path),baselineSha256:row.sha256,changed:sha(read(row.path))!==row.sha256}));
assert.deepEqual(protectedHost.filter(v=>v.changed).map(v=>v.file).sort(),allowed);
const fencePaths=['docs/reviews/smart-tile-editor/sources.json','docs/reviews/smart-tile-editor/integration-sources.json','tools/check-smart-tile-editor-source.mjs','tools/check-tile-c2a-source.mjs','tools/check-tile-visuals-source.mjs','tools/distribution.mjs','tools/build.mjs','tools/verify-smart-tile-editor-review.mjs','.github/workflows/check.yml','package.json','upstream.json'];
const fences=fencePaths.map(file=>{assert.ok(object(base,file).equals(read(file)),'Root-owned fence/registration changed: '+file);return record(file);});
const publicSource=JSON.parse(object(base,'docs/reviews/smart-tile-editor/sources.json'));
for(const group of [publicSource.runtime,publicSource.ui])for(const row of group.files)assert.equal(sha(read(row.path)),row.sha256,'Fixed public/runtime/UI bytes changed: '+row.path);
const plannerFiles=git('ls-tree','-r','--name-only',planner,'--','candidates/tile-stack/core/').toString().trim().split('\n');
for(const file of plannerFiles)assert.ok(read(file).equals(object(planner,file)),'Accepted private planner bytes changed: '+file);
const frozenPaths=['packages/tiles-core','packages/tile-visuals','packages/windows-authoring/journal.js','packages/floor-navigation','vendor','.openai'];
assert.equal(git('diff','--name-only',base,'--',...frozenPaths).toString(),'');
assert.equal(git('ls-files','--others','--exclude-standard','--',...frozenPaths).toString(),'');
const inputs=[...allowed,...files('apps/editor/tile-stack'),...plannerFiles,'candidates/tile-stack/editor/floors.js','candidates/tile-stack/editor/policy.js','tests/editor-tile-stack-b1.test.mjs','tests/fixtures/tile-stack-editor/b1.mjs','tools/editor-tile-stack-inventory.mjs','tools/editor-tile-stack-b1-audit.mjs','tools/editor-tile-stack-b1-validation.mjs'].sort().map(record);
const report={kind:'nautilus-editor-tile-stack-b1-source-audit',version:1,status:'scope-pass',base,planner,
  protectedHost,unchangedFencesAndRegistration:fences,unchangedPublicRuntimeFiles:publicSource.runtime.files.length,unchangedPublicUIFiles:publicSource.ui.files.length,
  exactPrivatePlannerFiles:plannerFiles.length,unchangedPaths:frozenPaths,inputs,
  expectedGateFailure:{checker:'tools/check-smart-tile-editor-source.mjs',reason:'Root intentionally retains strict pre-refactor host hashes; no bypass or restamping.',paths:allowed},
  delivery:'Fixed local commit only until Root reviews and updates its provenance. No push of failing branch.',
  scope:'Headless B1 with resource-only presentation stand-in; native UI/art/browser/source-built-installed acceptance remains B2.',
  helpers:{kind:'finite-cli',background:[],ports:[]}};
const out=path.join(root,'docs/reviews/tile-stack/editor/gate-b/scope.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,changedProtectedHost:allowed.length,unchangedProtectedHost:protectedHost.length-allowed.length,unchangedFences:fences.length,publicRuntimeFiles:report.unchangedPublicRuntimeFiles,exactPrivatePlannerFiles:plannerFiles.length,sourceInputs:inputs.length}));
