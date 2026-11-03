import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {tileAuthoringC2EditorSources} from '../tools/tile-authoring-c2-editor-source.mjs';

test('exact C2 source authentication rejects ownership, SDK, index, manifest and unknown-runtime drift',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),objects=new Map();
 const object=(commit,file)=>{const key=commit+':'+file;if(!objects.has(key))objects.set(key,execFileSync('git',['show',key],{cwd:root,windowsHide:true,timeout:30000,maxBuffer:4*1024*1024}));return objects.get(key);};
 const source=tileAuthoringC2EditorSources({object,projectRoot:root});assert.equal(source.enabled,true);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-c2-source-'));
 const owned=new Set([fs.realpathSync(temporary)]);
 const putAt=(base,file,bytes)=>{const target=path.resolve(base,file);assert.ok(target.startsWith(base+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);};
 const put=(file,bytes)=>putAt(temporary,file,bytes);
 const removeTemporary=folder=>{assert.equal(fs.lstatSync(folder).isSymbolicLink(),false);const resolved=fs.realpathSync(folder),expectedParent=fs.realpathSync(os.tmpdir());assert.ok(owned.has(resolved),'Only this test-created directory may be removed');assert.equal(path.dirname(resolved),expectedParent);assert.ok(path.basename(resolved).startsWith('nautilus-c2-source-'));const checked=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){assert.equal(entry.isSymbolicLink(),false,'Refuse recursive cleanup through any symlink');if(entry.isDirectory())checked(path.join(dir,entry.name));}};checked(resolved);fs.rmSync(resolved,{recursive:true,force:true});owned.delete(resolved);assert.equal(fs.existsSync(resolved),false);};
 try{
  for(const row of [...source.files,...Object.values(source.overrides)])put(row.path,row.expectedBuffer);
  for(const row of source.borrowedFiles)put(row.path,fs.readFileSync(path.join(root,row.path)));
  const inspect=()=>tileAuthoringC2EditorSources({object,projectRoot:temporary});
  assert.equal(inspect().files.length,source.files.length);
  const indexedBytes=new Map([...source.files,...Object.values(source.overrides)].map(row=>[row.path,Buffer.from(row.expectedBuffer)])),indexedPaths=new Set();
  const inspectIndex=()=>tileAuthoringC2EditorSources({object,projectRoot:temporary,indexed:(file,actual)=>{indexedPaths.add(file);assert.ok(indexedBytes.has(file)&&indexedBytes.get(file).equals(actual),'Index differs from actual authenticated bytes: '+file);}});
  inspectIndex();
  const checkpoint='apps/editor/smart-tile/checkpoint.js',checkpointIndex=indexedBytes.get(checkpoint);
  assert.ok(indexedPaths.has(checkpoint));assert.ok(indexedPaths.has('apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/retained-command.js'));
  indexedBytes.set(checkpoint,object('e4d798cd30857e4a77c8875817f9f333286eb32c',checkpoint));
  assert.throws(inspectIndex,/Index differs from actual authenticated bytes: apps\/editor\/smart-tile\/checkpoint\.js/);indexedBytes.set(checkpoint,checkpointIndex);
  const retainedIndex='apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/retained-command.js',retainedIndexBytes=indexedBytes.get(retainedIndex);
  indexedBytes.delete(retainedIndex);assert.throws(inspectIndex,/Index differs from actual authenticated bytes: .*retained-command/);indexedBytes.set(retainedIndex,retainedIndexBytes);
  const owner='apps/editor/tile-authoring/c2/builtin-prefix/owner.mjs',ownerBytes=fs.readFileSync(path.join(temporary,owner));
  const changed=ownerBytes.toString().replace('ownedEncodedBytes:67108864','ownedEncodedBytes:671088640');assert.notEqual(changed,ownerBytes.toString());put(owner,changed);
  // The read-pairing guard authenticates this borrowed owner before the final
  // contribution pass; require that exact rejection rather than its old order.
  assert.throws(inspect,{message:'Changed borrowed UI dependency: '+owner});put(owner,ownerBytes);
  const sampler='apps/editor/tile-authoring/c2/art/browser-owner/sampler-state.mjs',samplerBytes=fs.readFileSync(path.join(temporary,sampler));
  put(sampler,Buffer.concat([samplerBytes,Buffer.from('\n// unauthenticated ownership change\n')]));assert.throws(inspect,/Changed exact C2 contribution/);put(sampler,samplerBytes);
  const atlas='assets/buildings/painted-materials-v2.png',atlasBytes=fs.readFileSync(path.join(temporary,atlas)),badAtlas=Buffer.from(atlasBytes);badAtlas[badAtlas.length-1]^=1;
  put(atlas,badAtlas);assert.throws(inspect,/Changed original renderer asset/);put(atlas,atlasBytes);
  const manifest='apps/editor/tile-authoring/c2/core/source.json',original=fs.readFileSync(path.join(temporary,manifest)),forged=JSON.parse(original);forged.transformation='Accept caller-supplied code paths';put(manifest,JSON.stringify(forged,null,2)+'\n');
  assert.throws(inspect,/Unreviewed Core relocation manifest/);put(manifest,original);
  const missingComponent=(prefix,expectedError)=>{
   const shadow=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-c2-source-'));
   owned.add(fs.realpathSync(shadow));
   try{
    for(const row of [...source.files,...Object.values(source.overrides)])if(!row.path.startsWith(prefix+'/'))putAt(shadow,row.path,row.expectedBuffer);
    for(const row of source.borrowedFiles)if(!row.path.startsWith(prefix+'/'))putAt(shadow,row.path,fs.readFileSync(path.join(root,row.path)));
    assert.throws(()=>tileAuthoringC2EditorSources({object,projectRoot:shadow}),expectedError);
   }finally{removeTemporary(shadow);}
  };
  missingComponent('apps/editor/tile-authoring/c2/art',/pinned renderer manifest is required/);
  missingComponent('apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1',/ENOENT|exact private Core SDK/);
  missingComponent('apps/editor/tile-authoring/c2',/registered C2 source profile requires its complete directory/);
  const retained='apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/retained-command.js',retainedBytes=fs.readFileSync(path.join(temporary,retained));
  put(retained,Buffer.concat([retainedBytes,Buffer.from('\n// unauthenticated retained-command ownership\n')]));assert.throws(inspect,/Changed exact private Core SDK contribution/);put(retained,retainedBytes);
  for(const file of ['apps/editor/smart-tile/checkpoint.js','apps/editor/smart-tile/session.js','apps/editor/tile-authoring/checkpoint.js','apps/editor/tile-authoring/profile.js']){const bytes=fs.readFileSync(path.join(temporary,file));put(file,Buffer.concat([bytes,Buffer.from('\n// unreviewed shared semantic body\n')]));assert.throws(inspect,/Changed exact private Core SDK contribution/);put(file,bytes);}
  const integrationRecord='docs/reviews/tile-authoring/architect/c2-core-integration-source.json',integrationBytes=fs.readFileSync(path.join(temporary,integrationRecord)),badIntegration=JSON.parse(integrationBytes);badIntegration.publicActivation=true;put(integrationRecord,JSON.stringify(badIntegration,null,2)+'\n');assert.throws(inspect,/Unreviewed private Core integration metadata/);put(integrationRecord,integrationBytes);
  const unknown='apps/editor/tile-authoring/c2/foreign-runtime.js';put(unknown,'export const bypass = true;\n');assert.throws(inspect,/Only the exact reviewed C2 files/);fs.unlinkSync(path.join(temporary,unknown));
  const unknownSDK='apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/foreign-runtime.js';put(unknownSDK,'export const bypass = true;\n');assert.throws(inspect,/Only the exact reviewed C2 files/);fs.unlinkSync(path.join(temporary,unknownSDK));
  assert.equal(inspect().files.length,source.files.length);
 }finally{
  removeTemporary(temporary);
 }
});
