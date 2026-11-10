import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,moduleClosure,distribution} from './distribution.mjs';
import {historicalSolidTileBytes,SOLID_TILE_SCHEMA} from './solid-tile-registration.mjs';
import {TILE_STACK_REGISTRATION_BASE} from './tile-stack-registration.mjs';
import {checkTileAuthoringRegistration} from './tile-authoring-registration.mjs';

export const TILE_STACK_ACCEPTED_SOURCE='45ecaef16bb39424c8b885d53acb4371654b4fa0';
export const TILE_STACK_SOURCE_ROOT='candidates/tile-stack/core';
export const TILE_STACK_RUNTIME_ROOT='packages/tile-stack-core';
export const TILE_STACK_ENTRY='./tiles/stack';
export const TILE_STACK_ENTRY_FILE='./packages/tile-stack-core/index.js';
const names=['budget.js','contracts.js','geometry.js','ids.js','index.js'];
const runtimeFiles=names.map(name=>TILE_STACK_RUNTIME_ROOT+'/'+name);
const typesFile=TILE_STACK_RUNTIME_ROOT+'/api.d.ts';
const sourceFile=TILE_STACK_RUNTIME_ROOT+'/source.json';
const guideFile=TILE_STACK_RUNTIME_ROOT+'/README.md';
const support=[typesFile,guideFile,sourceFile];
const adaptation=Object.freeze({
  path:TILE_STACK_RUNTIME_ROOT+'/index.js',sourcePath:TILE_STACK_SOURCE_ROOT+'/index.js',kind:'comment-only',
  from:'// Private Gate A host planner. No public registration, matching, CAS or history.',
  to:'// Optional headless stack planner. Public core owns matching and repair; host owns commits.',occurrences:1
});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const relative=file=>typeof file==='string'&&file&&!path.posix.isAbsolute(file)&&!file.includes('\\')&&!file.includes('%')&&!/[\x00-\x1f\x7f?#]/.test(file)&&path.posix.normalize(file)===file&&!file.split('/').some(part=>!part||part==='.'||part==='..');
const record=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes)});

function ports(projectRoot){
  assert.equal(path.resolve(projectRoot),root,'Use this checkout with its owning distribution module.');
  const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,maxBuffer:24*1024*1024});
  const objects=new Map();
  const object=(commit,file)=>{
    assert.ok(relative(file),'Unsafe immutable source path: '+file);
    const key=commit+':'+file;if(!objects.has(key))objects.set(key,git('show',key));return objects.get(key);
  };
  const read=file=>{
    assert.ok(relative(file),'Unsafe source inventory path: '+file);
    let target=root;for(const part of file.split('/')){target=path.join(target,part);assert.equal(fs.lstatSync(target).isSymbolicLink(),false,'Symlink in source inventory: '+file);}
    assert.equal(fs.statSync(target).isFile(),true,'Expected a regular source file: '+file);return fs.readFileSync(target);
  };
  const listed=(commit,...folders)=>git('ls-tree','-r','--name-only',commit,'--',...folders).toString('utf8').trim().split('\n').filter(Boolean).sort();
  const blob=(commit,file)=>{
    const value=git('rev-parse',commit+':'+file).toString('utf8').trim();assert.match(value,/^[a-f0-9]{40}$/,'Expected the immutable Git blob identity: '+file);return value;
  };
  function walk(folder){
    const absolute=path.join(root,folder);assert.equal(fs.lstatSync(absolute).isSymbolicLink(),false,'Symlink in inventory directory: '+folder);
    return fs.readdirSync(absolute,{withFileTypes:true}).flatMap(entry=>{
      const file=folder+'/'+entry.name;assert.ok(relative(file),'Unsafe inventory member: '+file);assert.equal(entry.isSymbolicLink(),false,'Symlink in inventory: '+file);
      return entry.isDirectory()?walk(file):[file];
    }).sort();
  }
  return {git,object,read,listed,blob,walk};
}

// Expected provenance is derived exclusively from the immutable reviewed Git
// objects and the one literal comment adaptation. Working files never certify
// their own review, and this function performs no writes or package operations.
function expectedModel(projectRoot){
  const io=ports(projectRoot),{object,listed,blob}=io;
  const originalFiles=listed(TILE_STACK_ACCEPTED_SOURCE,TILE_STACK_SOURCE_ROOT);
  assert.deepEqual(originalFiles.filter(file=>file.endsWith('.js')),names.map(name=>TILE_STACK_SOURCE_ROOT+'/'+name),'The accepted runtime must be the fixed five-module inventory.');
  assert.ok(originalFiles.includes(TILE_STACK_SOURCE_ROOT+'/api.d.ts'),'The reviewed API declaration is required.');
  const acceptedRuntime=[],runtime=[],expectedBytes=new Map();
  for(const name of names){
    const sourcePath=TILE_STACK_SOURCE_ROOT+'/'+name,file=TILE_STACK_RUNTIME_ROOT+'/'+name,original=object(TILE_STACK_ACCEPTED_SOURCE,sourcePath),sourceGitBlob=blob(TILE_STACK_ACCEPTED_SOURCE,sourcePath);
    acceptedRuntime.push({...record(sourcePath,original),gitBlob:sourceGitBlob});
    let expected=original;
    if(file===adaptation.path){
      const text=original.toString('utf8');assert.ok(Buffer.from(text,'utf8').equals(original),'Accepted entry must retain exact UTF-8 bytes.');
      assert.equal(text.split(adaptation.from).length-1,1,'The sole comment adaptation must occur once.');
      assert.ok(text.startsWith(adaptation.from+'\n'),'Adapt only the accepted entry header comment.');
      expected=Buffer.from(text.replace(adaptation.from,adaptation.to),'utf8');
    }
    expectedBytes.set(file,expected);runtime.push({...record(file,expected),sourcePath,sourceGitBlob});
  }
  const originalTypes=object(TILE_STACK_ACCEPTED_SOURCE,TILE_STACK_SOURCE_ROOT+'/api.d.ts');
  expectedBytes.set(typesFile,originalTypes);
  const types={...record(typesFile,originalTypes),sourcePath:TILE_STACK_SOURCE_ROOT+'/api.d.ts',sourceGitBlob:blob(TILE_STACK_ACCEPTED_SOURCE,TILE_STACK_SOURCE_ROOT+'/api.d.ts')};
  const contracts=object(TILE_STACK_ACCEPTED_SOURCE,TILE_STACK_SOURCE_ROOT+'/contracts.js').toString('utf8');
  const profiles=[...contracts.matchAll(/export const STACK_PROFILE='([^']+)';/g)];assert.equal(profiles.length,1);
  const profile=profiles[0][1];assert.equal(profile,'nautilus-rectangle-stack-intent-v1','Keep the fixed data profile; this is not a new engine capability.');
  const acceptedPackage=JSON.parse(object(TILE_STACK_ACCEPTED_SOURCE,'package.json'));
  assert.equal(acceptedPackage.exports['./tiles'],'./packages/tiles-core/index.js','The accepted planner borrows the actual public v1 core.');
  const metadata={
    schemaVersion:1,id:profile,availability:'registered-optional',acceptedSource:TILE_STACK_ACCEPTED_SOURCE,
    sourceRoot:TILE_STACK_SOURCE_ROOT,runtimeRoot:TILE_STACK_RUNTIME_ROOT,integrationBase:TILE_STACK_REGISTRATION_BASE,
    entries:{[TILE_STACK_ENTRY]:TILE_STACK_ENTRY_FILE},acceptedRuntime,runtime,types,metadataAdaptations:[{...adaptation}],
    publicCore:{entry:'./tiles',file:acceptedPackage.exports['./tiles'],authority:'matching-and-repair'},
    guide:guideFile,
    scope:'Optional headless rectangle-stack intent planning over public v1 source. The public tile core owns matching and repair; the host owns atomic bundle-plus-constraints commits, history and recovery. Presentation, support, navigation and game adoption remain unbound.',
    statuses:{planning:'bounded-public-v1-request',preparation:'actual-public-core-required',commits:'host-owned',history:'host-owned',recovery:'host-owned',presentation:'unbound',support:'unbound',navigation:'unbound',game:'unbound'},
    newSchemaOrCapability:false,hostAdopted:false,gameAdopted:false
  };
  return {...io,metadata,expectedBytes,runtime,types,profile};
}

export function expectedTileStackSource(projectRoot=root){return expectedModel(projectRoot).metadata;}

// Explicit Root authoring only. The integrity check below never invokes this.
// wx prevents overwriting an existing record, symlink or another task's work.
export function authorTileStackSource(projectRoot=root){
  const metadata=expectedTileStackSource(projectRoot),folder=path.join(root,TILE_STACK_RUNTIME_ROOT);
  for(const parent of ['packages',TILE_STACK_RUNTIME_ROOT]){const stat=fs.lstatSync(path.join(root,parent));assert.equal(stat.isSymbolicLink(),false,'Refuse a symlinked metadata destination.');assert.equal(stat.isDirectory(),true);}
  assert.equal(path.dirname(path.join(root,sourceFile)),folder);
  fs.writeFileSync(path.join(root,sourceFile),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});return metadata;
}

// Callable read-only integrity inspection. No report writes, evaluation of the
// planner/candidate, builds, installs, network, browser or server. The existing
// module-closure parser uses short-lived foreground read-only Node children.
export function checkTileStackSource(projectRoot=root,{tracked=null}={}){
  assert.ok(tracked===null||tracked instanceof Set,'Supply the owning tracked Git path set or null.');
  const model=expectedModel(projectRoot),{git,object,read,listed,walk,metadata,expectedBytes,runtime,types,profile}=model;
  const indexed=(file,expected)=>{
    if(!tracked)return;assert.ok(tracked.has(file),'Required tile-stack file is not tracked: '+file);
    assert.ok(git('show',':'+file).equals(expected),'Git index changes expected source bytes: '+file);
  };
  const fixed=(file,commit=TILE_STACK_REGISTRATION_BASE)=>{
    const expected=object(commit,file),actual=read(file);assert.ok(historicalSolidTileBytes(object,file,actual).equals(expected),'Immutable dependency changed: '+file);indexed(file,actual);return record(file,expected);
  };
  for(const [file,expected]of expectedBytes){assert.ok(read(file).equals(expected),'Only fixed reviewed bytes and the single header adaptation are allowed: '+file);indexed(file,expected);}
  assert.deepEqual(walk(TILE_STACK_RUNTIME_ROOT),[...runtimeFiles,...support].sort(),'The public stack folder contains only five runtime files, reviewed types, guide and provenance.');
  const sourceBytes=read(sourceFile);assert.deepEqual(JSON.parse(sourceBytes),metadata,'Source record must derive from fixed Git objects, never current edited runtime.');indexed(sourceFile,sourceBytes);
  const guide=read(guideFile);assert.ok(guide.length>0,'The Root builder guide must be present.');indexed(guideFile,guide);
  const closure=moduleClosure([TILE_STACK_ENTRY_FILE]);assert.deepEqual(closure,runtimeFiles,'The planner closure is exactly five local headless modules, with no bundled core, renderer or candidate.');

  // Keep the actual public matching/repair authority independent and byte-fixed.
  // These eighteen accepted records are fourteen runtime files and four v1
  // schemas, including the shared original SHA-256 implementation.
  const golden=JSON.parse(object(TILE_STACK_ACCEPTED_SOURCE,'tests/fixtures/procedural-tiles/v2-golden-v1.json'));
  assert.equal(golden.files.length,18);
  const publicCore=golden.files.map(item=>{
    const expected=object(TILE_STACK_ACCEPTED_SOURCE,item.file);assert.equal(sha(expected),item.sha256,'Immutable public-v1 proof record differs: '+item.file);
    assert.ok(read(item.file).equals(expected),'Registered v1 matching/schema bytes changed: '+item.file);indexed(item.file,expected);return record(item.file,expected);
  });
  assert.deepEqual(moduleClosure(['packages/tiles-core/index.js']),golden.files.filter(item=>item.file.endsWith('.js')).map(item=>item.file).sort(),'The actual public v1 core retains its fourteen-module authority.');
  const protectedRoot=['upstream.json','packages/map-core/contract-manifest.js','packages/map-core/capabilities.js'].map(file=>fixed(file));
  const registration=checkTileAuthoringRegistration({object,read,indexed,moduleClosure,distribution});
  const authoringSchemaSupport=registration.authoringRegistration.support.filter(file=>file.endsWith('.schema.json'));
  assert.deepEqual(authoringSchemaSupport,['packages/tile-authoring-core/contract.schema.json'],'Only the separately authenticated authoring contract schema is added.');
  const schemaFiles=listed(TILE_STACK_REGISTRATION_BASE,'packages','schemas').filter(file=>file.endsWith('.schema.json'));
  const currentSchemas=[...walk('packages'),...walk('schemas')].filter(file=>file.endsWith('.schema.json')).sort();
  assert.deepEqual(currentSchemas,[...schemaFiles,...authoringSchemaSupport,SOLID_TILE_SCHEMA].sort(),'Keep every historical schema plus the authenticated authoring and solid tile additions.');
  // The Root C2a fence separately owns the newer accepted private v2 schema
  // bytes. This registration preserves the public schema inventory/content;
  // it must not roll private schemas back to an older public-package baseline.
  const baselinePackage=JSON.parse(object(TILE_STACK_REGISTRATION_BASE,'package.json'));
  const publicSchemaFiles=schemaFiles.filter(file=>baselinePackage.files.includes(file));
  const privateSchemaFiles=new Set(schemaFiles.filter(file=>!baselinePackage.files.includes(file)));
  const schemas=publicSchemaFiles.map(file=>fixed(file));

  const packageBytes=read('package.json'),pkg=JSON.parse(packageBytes);
  assert.equal(pkg.exports[TILE_STACK_ENTRY],TILE_STACK_ENTRY_FILE,'The actual optional ./tiles/stack export is required; no private fallback.');
  const profiles={};
  for(const name of ['core','renderer','assets','compatibility']){
    const d=distribution(name),included=name==='core'||name==='compatibility';
    assert.equal(d.exports[TILE_STACK_ENTRY],included?TILE_STACK_ENTRY_FILE:undefined,name+' optional stack export');
    const wanted=included?[...runtimeFiles,...support].sort():[];
    assert.deepEqual(d.files.filter(file=>file.startsWith(TILE_STACK_RUNTIME_ROOT+'/')).sort(),wanted,name+' exact stack runtime/types/support');
    if(included){assert.equal(d.exports['./tiles'],'./packages/tiles-core/index.js',name+' actual public matching/repair authority');for(const file of publicCore)assert.ok(d.files.includes(file.path),name+' public v1 dependency '+file.path);}
    for(const file of d.files){
      assert.equal(file.startsWith('candidates/')||file.startsWith('tests/')||file.startsWith('docs/reviews/tile-stack/'),false,'Private candidate/proof inputs leaked into '+name+': '+file);
      assert.equal(file.startsWith('tools/tile-stack-'),false,'Private stack proof tooling leaked into '+name+': '+file);
      assert.equal(privateSchemaFiles.has(file),false,'Private schema entered '+name+': '+file);
    }
    profiles[name]={registered:included,runtime:included?[...runtimeFiles]:[],support:included?[...support]:[]};
  }
  assert.deepEqual(pkg.files,distribution().files,'The exact Root whitelist must equal the registered normal distribution.');
  return {
    status:'pass',registered:true,id:profile,acceptedSource:TILE_STACK_ACCEPTED_SOURCE,integrationBase:TILE_STACK_REGISTRATION_BASE,
    entries:{[TILE_STACK_ENTRY]:TILE_STACK_ENTRY_FILE},runtime,types,closure,packageSupport:[...support],metadataAdaptations:[{...adaptation}],
    sourceRecord:record(sourceFile,sourceBytes),publicCore:{entry:'./tiles',runtimeFiles:14,preservedFiles:publicCore.length},
    frozenRootFiles:protectedRoot.length,frozenSchemas:schemas.length,packagedAuthoringSchemaSupport:authoringSchemaSupport,profiles,registration,
    headless:true,bundledCoreOrRenderer:false,newSchemaOrCapability:false,pinsChanged:false,versionChanged:false,hostAdopted:false,gameAdopted:false,
    requiredGitCommits:[...new Set([TILE_STACK_ACCEPTED_SOURCE,TILE_STACK_REGISTRATION_BASE,...registration.requiredGitCommits])]
  };
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);assert.ok(args.length===0||args.length===1&&['--check','--write-source'].includes(args[0]),'Use --check (read-only) or the explicit one-time --write-source authoring command.');
  if(args[0]==='--write-source')console.log(JSON.stringify(authorTileStackSource(),null,2));
  else console.log(JSON.stringify(checkTileStackSource(),null,2));
}
