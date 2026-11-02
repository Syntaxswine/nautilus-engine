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
 const put=(file,bytes)=>{const target=path.resolve(temporary,file);assert.ok(target.startsWith(temporary+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);};
 try{
  for(const row of [...source.files,...Object.values(source.overrides)])put(row.path,row.expectedBuffer);
  for(const row of source.borrowedFiles)put(row.path,fs.readFileSync(path.join(root,row.path)));
  const inspect=()=>tileAuthoringC2EditorSources({object,projectRoot:temporary});
  assert.equal(inspect().files.length,source.files.length);
  const owner='apps/editor/tile-authoring/c2/builtin-prefix/owner.mjs',ownerBytes=fs.readFileSync(path.join(temporary,owner));
  const changed=ownerBytes.toString().replace('ownedEncodedBytes:67108864','ownedEncodedBytes:671088640');assert.notEqual(changed,ownerBytes.toString());put(owner,changed);
  assert.throws(inspect,/Changed exact C2 contribution/);put(owner,ownerBytes);
  const manifest='apps/editor/tile-authoring/c2/core/source.json',original=fs.readFileSync(path.join(temporary,manifest)),forged=JSON.parse(original);forged.transformation='Accept caller-supplied code paths';put(manifest,JSON.stringify(forged,null,2)+'\n');
  assert.throws(inspect,/Unreviewed Core relocation manifest/);put(manifest,original);
  const unknown='apps/editor/tile-authoring/c2/foreign-runtime.js';put(unknown,'export const bypass = true;\n');assert.throws(inspect,/Only the exact reviewed C2 files/);fs.unlinkSync(path.join(temporary,unknown));
  assert.equal(inspect().files.length,source.files.length);
 }finally{
  const resolved=fs.realpathSync(temporary),expectedParent=fs.realpathSync(os.tmpdir());assert.equal(path.dirname(resolved),expectedParent);assert.ok(path.basename(resolved).startsWith('nautilus-c2-source-'));fs.rmSync(resolved,{recursive:true,force:true});
 }
});
