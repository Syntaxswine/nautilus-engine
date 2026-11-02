import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url)),scanner=fileURLToPath(new URL('./helpers/headless-closure.mjs',import.meta.url));
function scan(directory=root,entries=[]) {return spawnSync(process.execPath,['--experimental-vm-modules',scanner,'--root',directory,...entries.flatMap(file=>['--entry',file])],{encoding:'utf8',windowsHide:true});}
function fixture(files,check){const temporaryRoot=fs.realpathSync(os.tmpdir()),directory=fs.mkdtempSync(path.join(temporaryRoot,'nautilus-headless-'));try{
  fs.writeFileSync(path.join(directory,'package.json'),'{}');for(const [file,source]of Object.entries(files)){const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);}check(directory);
}finally{if(path.dirname(directory)!==temporaryRoot||!path.basename(directory).startsWith('nautilus-headless-'))throw Error('Unexpected closure-test cleanup target.');fs.rmSync(directory,{recursive:true,force:true});}}

test('every public map/rules/items transitive import stays renderer, DOM and storage independent',()=>{
  const result=scan();assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);
  assert.ok(report.groups.map.modules>1);assert.ok(report.groups.rules.modules>1);assert.ok(report.groups.items.modules>0);assert.deepEqual(report.violations,[]);
  assert.ok(report.groups.rules.entries.includes('packages/rules-core/index.js'));assert.ok(report.groups.rules.entries.includes('packages/rules-core/dialogue.js'));assert.ok(report.groups.rules.entries.includes('packages/rules-core/aft-compat.js'));
});
test('the closure guard follows reexports and imports hidden behind harmless local modules',()=>{
  fixture({'entry.mjs':"export {x} from './bridge.mjs';",'bridge.mjs':"import {x} from './three.module.js'; export {x};",'three.module.js':'export const x=1;'},directory=>{
    const result=scan(directory,['entry.mjs']);assert.notEqual(result.status,0);assert.match(result.stderr,/Renderer\/browser.*entry\.mjs -> bridge\.mjs -> three\.module\.js/);
  });
  fixture({'entry.mjs':"/* import './missing.js'; */ const text=\"export * from './missing-too.js'\"; export {x} from /* static */ './data.mjs';",'data.mjs':'export const x=1;'},directory=>{
    const result=scan(directory,['entry.mjs']);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).combined.modules,2);
  });
});
test('the closure guard rejects lazy renderer imports, DOM work and storage without executing them',()=>{
  for(const source of ["export const load=()=>import /* hidden */ ('./three.module.js');","export const load=()=>`${import('./three.module.js')}`;","export const draw=()=>document.createElement('canvas');","export const save=()=>globalThis.localStorage.setItem('key','value');","export const draw=T=>new T.Scene();"]){
    fixture({'entry.mjs':source},directory=>{const result=scan(directory,['entry.mjs']);assert.notEqual(result.status,0);assert.match(result.stderr,/Dynamic import|DOM, storage/);});
  }
});
