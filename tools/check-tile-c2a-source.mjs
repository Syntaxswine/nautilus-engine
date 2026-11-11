import assert from 'node:assert/strict';
import {npmFilePatterns} from './npm-files.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,moduleClosure,distribution} from './distribution.mjs';
import {schemaDocuments} from '../packages/map-core/contract-manifest.js';
import {checkTileAuthoringRegistration} from './tile-authoring-registration.mjs';
import {historicalArtworkNotice} from './shared-artwork-registration.mjs';
import {historicalRailwayRouteBytes} from './railway-route-registration.mjs';

export const TILE_C2A_ACCEPTED_SOURCE='87301172d7258223f89aa2e19fe391ac01b52f00';
export const TILE_C2A_ROOT_BASE='32101fa97a8706296dcba4d9614d9d663d53a6dd';
const entry='packages/tiles-core/candidate-v2.js';
const requestFile='docs/reviews/procedural-tiles/v2-registration-request.json';
const goldenFile='tests/fixtures/procedural-tiles/v2-golden-v1.json';
const auditFile='docs/reviews/procedural-tiles/c2a-correction-source-audit.json';
const schemaFiles=['compiled-tiles-v2','tile-bundle-v2','tile-layout-v2','tile-recipe-v2'].map(name=>'packages/tiles-core/'+name+'.schema.json');
// Preserve the assertions, case builders, schemas and independent mathematics.
// Root's install/schema orchestration drivers may add complete-count/CI checks;
// they are not substitutes for this immutable accepted proof-input inventory.
const proofFiles=[
  'tests/procedural-tiles-v2.test.mjs','tests/procedural-tiles-c1.test.mjs','tests/procedural-tiles-c2a.test.mjs','tests/tile-v2-distribution.test.mjs',
  'tests/fixtures/procedural-tiles/catalogue.mjs','tests/fixtures/procedural-tiles/v2.mjs','tests/fixtures/procedural-tiles/c1.mjs','tests/fixtures/procedural-tiles/c2a.mjs',goldenFile,
  'tools/tile-schemas.mjs','tools/tile-v2-schemas.mjs','tools/tile-c1-schema.mjs','tools/tile-c2a-schema.mjs',
  'tools/measure-tile-v2.mjs','tools/measure-tile-c1.mjs','tools/measure-tile-c2a.mjs','tools/verify-tile-c1-oracle.py','tools/verify-tile-c2a-oracle.py'
];
const evidenceFiles=[
  'docs/reviews/procedural-tiles/c2a-checkpoint.md','docs/reviews/procedural-tiles/c2a-source-audit.json',
  'docs/reviews/procedural-tiles/c2a-correction-checkpoint.md',auditFile
];
const rootFiles=['NOTICE.md','upstream.json','packages/map-core/contract-manifest.js','packages/map-core/capabilities.js'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// Callable/CLI integrity inspection only: no report writes, candidate evaluation,
// install, network, browser, server or retained helper. Closure discovery reuses
// the existing short-lived tools-only module parser.
export function checkTileC2aSource(projectRoot=root,{tracked=null}={}){
  assert.equal(path.resolve(projectRoot),root,'Use this checkout with its owning distribution module.');
  const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,maxBuffer:24*1024*1024});
  const objects=new Map();
  const object=(commit,file)=>{const key=commit+':'+file;if(!objects.has(key))objects.set(key,git('show',key));return objects.get(key);};
  const read=file=>{
    assert.ok(file&&!file.includes('\\')&&!path.posix.isAbsolute(file)&&path.posix.normalize(file)===file&&!file.split('/').some(part=>!part||part==='.'||part==='..'),'Unsafe fixed inventory path: '+file);
    let target=root;for(const part of file.split('/')){target=path.join(target,part);assert.equal(fs.lstatSync(target).isSymbolicLink(),false,'Symlink in fixed source inventory: '+file);}
    assert.equal(fs.statSync(target).isFile(),true,'Expected a regular source file: '+file);return fs.readFileSync(target);
  };
  const indexed=(file,expected)=>{if(!tracked)return;assert.ok(tracked.has(file),'Required private C2a source is not tracked: '+file);assert.ok(git('show',':'+file).equals(expected),'Index changes reviewed C2a bytes: '+file);};
  const freezeFile=(file,commit=TILE_C2A_ACCEPTED_SOURCE)=>{
    const expected=object(commit,file),actual=read(file),historical=file==='NOTICE.md'?historicalArtworkNotice({object,current:actual}):historicalRailwayRouteBytes(object,file,actual);
    assert.ok(historical.equals(expected),'Fixed source changed: '+file);indexed(file,actual);return {file,bytes:expected.length,sha256:sha(expected)};
  };
  const audit=JSON.parse(object(TILE_C2A_ACCEPTED_SOURCE,auditFile)),request=JSON.parse(object(TILE_C2A_ACCEPTED_SOURCE,requestFile));
  assert.equal(audit.declared,false);assert.equal(audit.runtime.length,29);
  const runtimePaths=audit.runtime.map(item=>item.file).sort();assert.equal(new Set(runtimePaths).size,29);
  const runtime=runtimePaths.map(file=>{
    assert.ok(file.startsWith('packages/tiles-core/')||file==='packages/parts-core/hash.js','Unexpected accepted runtime dependency: '+file);
    const checked=freezeFile(file),record=audit.runtime.find(item=>item.file===file);assert.equal(checked.bytes,record.bytes);assert.equal(checked.sha256,record.sha256);return checked;
  });
  assert.deepEqual(moduleClosure([entry]),runtimePaths,'Private C2a must retain exactly its accepted 29-module closure.');
  assert.equal(runtime.reduce((sum,file)=>sum+file.bytes,0),audit.runtimeBytes);
  assert.deepEqual(request.candidateEntry,{'./tiles':'./packages/tiles-core/candidate-v2.js'});
  assert.equal(request.registeredV1EntryRemains,'./packages/tiles-core/index.js');
  assert.equal(request.engineCapability.id,null);assert.equal(request.engineCapability.version,null);
  assert.deepEqual(request.schemas.map(schema=>schema.file).sort(),schemaFiles);
  const privateSchemas=schemaFiles.map(file=>{
    const checked=freezeFile(file),schema=JSON.parse(read(file)),requested=request.schemas.find(item=>item.file===file);
    assert.equal(schema.$id,requested.uri);assert.equal(requested.version,2);
    assert.equal(schemaDocuments().some(document=>document.uri===schema.$id),false,'Private v2 schema entered the public registry: '+file);
    return {...checked,uri:schema.$id};
  });
  const proofInputs=proofFiles.map(file=>freezeFile(file));
  const historicalEvidence=evidenceFiles.map(file=>freezeFile(file));
  // Shared runtime/source notices are retained. The top-level notice is newer
  // Root provenance, so private packing must use it instead of the old archive.
  const support=request.supportFiles.map(file=>freezeFile(file,file==='NOTICE.md'?TILE_C2A_ROOT_BASE:TILE_C2A_ACCEPTED_SOURCE));
  const preservedRoot=rootFiles.map(file=>freezeFile(file,TILE_C2A_ROOT_BASE));
  const golden=JSON.parse(object(TILE_C2A_ROOT_BASE,goldenFile));assert.equal(golden.files.length,18);
  const unchangedV1=golden.files.map(item=>{
    const baseline=object(TILE_C2A_ROOT_BASE,item.file);assert.equal(sha(baseline),item.sha256);
    assert.ok(baseline.equals(object(TILE_C2A_ACCEPTED_SOURCE,item.file)),'Accepted C2a differs from Root v1: '+item.file);
    return freezeFile(item.file,TILE_C2A_ROOT_BASE);
  });
  const basePackage=JSON.parse(object(TILE_C2A_ROOT_BASE,'package.json')),packageBytes=read('package.json'),pkg=JSON.parse(packageBytes);
  for(const key of ['name','version','private','type'])assert.deepEqual(pkg[key],basePackage[key],'Private source integration must preserve public package '+key);
  indexed('package.json',packageBytes);
  const optionalRegistration=checkTileAuthoringRegistration({object,read,indexed,moduleClosure,distribution});
  const shared=new Set(golden.files.map(file=>file.file));
  const privateOnly=new Set([...runtimePaths.filter(file=>!shared.has(file)),...schemaFiles,...request.supportFiles.filter(file=>!basePackage.files.includes(file))]);
  for(const file of pkg.files)assert.equal(privateOnly.has(file),false,'Private C2a entered the root whitelist: '+file);
  const profiles={};
  for(const profile of ['core','renderer','assets','compatibility']){
    const plan=distribution(profile);assert.equal(plan.exports['./tiles'],profile==='core'||profile==='compatibility'?'./packages/tiles-core/index.js':undefined);
    for(const [name,target]of Object.entries(plan.exports))assert.equal(privateOnly.has(target.replace(/^\.\//,'')),false,'Private C2a export entered '+profile+': '+name);
    for(const file of plan.files)assert.equal(privateOnly.has(file),false,'Private C2a runtime/schema/support entered '+profile+': '+file);
    profiles[profile]={files:plan.files.length,privateFiles:0};
  }
  assert.deepEqual(pkg.files,npmFilePatterns(distribution().files),'Public whitelist must equal the exact registered distribution.');
  return {status:'pass',declared:false,acceptedSource:TILE_C2A_ACCEPTED_SOURCE,integrationBase:TILE_C2A_ROOT_BASE,runtime,runtimeBytes:audit.runtimeBytes,privateSchemas,proofInputs,historicalEvidence,support,preservedRoot,unchangedV1,profiles,optionalRegistration,publicExportsChanged:true,publicRegistryChanged:false,pinsChanged:false,versionChanged:false,publicWhitelistChanged:true,c2aPublicExportsChanged:false,c2aPublicWhitelistChanged:false,presenterAdopted:false,editorAdopted:false,gameAdopted:false,requiredGitCommits:[...new Set([TILE_C2A_ACCEPTED_SOURCE,TILE_C2A_ROOT_BASE,...optionalRegistration.requiredGitCommits])]};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const report=checkTileC2aSource();
  console.log(JSON.stringify(report,null,2));
}
