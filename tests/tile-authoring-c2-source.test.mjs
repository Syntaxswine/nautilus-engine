import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {tileAuthoringC2EditorSources} from '../tools/tile-authoring-c2-editor-source.mjs';

test('exact C2 source authentication rejects modified ownership code, manifest rewrites and unknown runtime files',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),objects=new Map();
 const object=(commit,file)=>{const key=commit+':'+file;if(!objects.has(key))objects.set(key,execFileSync('git',['show',key],{cwd:root,windowsHide:true,timeout:30000,maxBuffer:4*1024*1024}));return objects.get(key);};
 const source=tileAuthoringC2EditorSources({object,projectRoot:root});assert.equal(source.enabled,true);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-c2-source-'));
 const putAt=(base,file,bytes)=>{const target=path.resolve(base,file);assert.ok(target.startsWith(base+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);};
 const put=(file,bytes)=>putAt(temporary,file,bytes);
 const removeTemporary=folder=>{const resolved=fs.realpathSync(folder),expectedParent=fs.realpathSync(os.tmpdir());assert.equal(path.dirname(resolved),expectedParent);assert.ok(path.basename(resolved).startsWith('nautilus-c2-source-'));fs.rmSync(resolved,{recursive:true,force:true});};
 try{
  for(const row of [...source.files,...Object.values(source.overrides)])put(row.path,row.expectedBuffer);
  for(const row of source.borrowedFiles)put(row.path,fs.readFileSync(path.join(root,row.path)));
  const inspect=()=>tileAuthoringC2EditorSources({object,projectRoot:temporary});
  assert.equal(inspect().files.length,source.files.length);
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
   try{
    for(const row of [...source.files,...Object.values(source.overrides)])if(!row.path.startsWith(prefix+'/'))putAt(shadow,row.path,row.expectedBuffer);
    for(const row of source.borrowedFiles)if(!row.path.startsWith(prefix+'/'))putAt(shadow,row.path,fs.readFileSync(path.join(root,row.path)));
    assert.throws(()=>tileAuthoringC2EditorSources({object,projectRoot:shadow}),expectedError);
   }finally{removeTemporary(shadow);}
  };
  missingComponent('apps/editor/tile-authoring/c2/art',/pinned renderer manifest is required/);
  missingComponent('apps/editor/tile-authoring/c2',/registered C2 source profile requires its complete directory/);
  const unknown='apps/editor/tile-authoring/c2/foreign-runtime.js';put(unknown,'export const bypass = true;\n');assert.throws(inspect,/Only the exact reviewed C2 files/);fs.unlinkSync(path.join(temporary,unknown));
  assert.equal(inspect().files.length,source.files.length);
 }finally{
  removeTemporary(temporary);
 }
});
