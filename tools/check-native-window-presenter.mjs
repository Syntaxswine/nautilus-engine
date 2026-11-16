import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,sourceCommit,vendorRoot,verifySnapshot} from './snapshot-native-window-presenter.mjs';
import {moduleClosure,distribution} from './distribution.mjs';
import {npmFilePatterns} from './npm-files.mjs';
import {withoutTileStackRegistration} from './tile-stack-registration.mjs';
import {checkTileAuthoringRegistration} from './tile-authoring-registration.mjs';
import {historicalRailwayCoreClosure, historicalRailwayRouteBytes} from './railway-route-registration.mjs';

const acceptedPresenter='5f027e039ba9307fd25719c6307d9760baf54e20';
const integrationBase='3f602272a3a2ecbe4ade0d33773a0e4f52da0706';
const privateC2aSource='87301172d7258223f89aa2e19fe391ac01b52f00';
const privateC2aSchemaUpdates=new Set(['packages/tiles-core/compiled-tiles-v2.schema.json','packages/tiles-core/tile-layout-v2.schema.json','packages/tiles-core/tile-bundle-v2.schema.json']);
const entry='./adapters/farmyard/windows/three',entryFile='./packages/native-window-presenter/three.js';
const support=['packages/native-window-presenter/README.md','packages/native-window-presenter/NOTICE.md','packages/native-window-presenter/source.json',vendorRoot+'/provenance.json',vendorRoot+'/sites/tactical-animal/dist/aft/tactics/vendor/THREE-LICENSE.txt.original'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// Importing this checker does not write an audit, pack a package or start a helper.
export function checkNativeWindowPresenter(projectRoot=root,{tracked=null}={}){
  assert.equal(path.resolve(projectRoot),root,'Use this checkout with its owning distribution module.');
  const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,maxBuffer:20*1024*1024});
  const object=(commit,file)=>git('show',commit+':'+file);
  const read=file=>fs.readFileSync(path.join(root,file));
  const json=file=>JSON.parse(read(file));
  const listed=(commit,...folders)=>git('ls-tree','-r','--name-only',commit,...folders).toString().trim().split('\n').filter(Boolean);
  const indexed=(file,expected)=>{
    if(!tracked)return;
    assert.ok(tracked.has(file),'Required native-window file is not tracked: '+file);
    assert.ok(git('show',':'+file).equals(expected),'Git index changes accepted bytes: '+file);
  };
  const originalAudit=JSON.parse(object(acceptedPresenter,'docs/reviews/native-window-presenter/source-audit.json'));
  const expectedRuntime=originalAudit.privateRuntime;
  assert.equal(expectedRuntime.length,6);
  const closure=moduleClosure([entryFile]);
  assert.deepEqual(closure,[...expectedRuntime.map(f=>f.path)].sort(),'Native presenter must contain only the six accepted local modules.');
  const runtime=expectedRuntime.map(expected=>{
    const bytes=read(expected.path);
    assert.equal(bytes.length,expected.bytes,expected.path);
    assert.equal(sha(bytes),expected.sha256,'Accepted native runtime changed: '+expected.path);
    indexed(expected.path,bytes);
    return {...expected};
  });

  const referenceManifest=vendorRoot+'/provenance.json',manifest=json(referenceManifest);
  assert.ok(read(referenceManifest).equals(object(acceptedPresenter,referenceManifest)),'Reference manifest must retain its accepted original bytes.');
  assert.equal(manifest.commit,sourceCommit);
  assert.equal(manifest.repository,'https://github.com/Syntaxswine/farmyard-commando');
  assert.equal(manifest.files.length,7);
  const artAudit=JSON.parse(object(acceptedPresenter,'docs/reviews/window-art/sources.json'));
  const logicalPaths=new Set(),storedPaths=new Set();
  for(const file of manifest.files){
    const expected=artAudit.files.find(f=>f.path===file.path);
    assert.ok(expected,'Reference was not in the reviewed art audit: '+file.path);
    for(const key of ['bytes','sha256','gitBlob'])assert.equal(file[key],expected[key],file.path+' '+key);
    assert.ok(!logicalPaths.has(file.path)&&!storedPaths.has(file.storedPath),'Duplicate reference object.');
    logicalPaths.add(file.path);storedPaths.add(file.storedPath);
    const relative=vendorRoot+'/'+file.storedPath,absolute=path.resolve(root,relative);
    assert.ok(absolute.startsWith(path.resolve(root,vendorRoot)+path.sep),'Reference escapes its immutable root.');
    const bytes=read(relative);
    assert.equal(bytes.length,file.bytes,file.path);
    assert.equal(sha(bytes),file.sha256,file.path);
    assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),file.gitBlob,file.path);
    indexed(relative,bytes);
  }
  indexed(referenceManifest,read(referenceManifest));
  const snapshot=verifySnapshot();

  // Freeze the promoted headless/window/authoring and schema contracts. The
  // public renderer entry and a reference-only pin grant no new authority.
  const headless=moduleClosure(['packages/map-core/index.js','packages/windows-core/index.js','packages/adapters/farmyard/windows.js','packages/windows-authoring/index.js']);
  const priorHeadless=historicalRailwayCoreClosure(headless);
  const frozen=[...new Set([...listed(integrationBase,'packages/map-core','packages/windows-core','packages/windows-authoring','packages/adapters/farmyard/windows','schemas'),'packages/adapters/farmyard/windows.js',...priorHeadless,...listed(integrationBase).filter(f=>f.endsWith('.schema.json'))])].sort();
  // The reviewed private C2a source updates precisely these three unregistered
  // schemas. Every other headless/window/authoring/schema byte stays at3f602.
  for(const file of frozen){const expected=object(privateC2aSchemaUpdates.has(file)?privateC2aSource:integrationBase,file),actual=read(file);assert.ok(historicalRailwayRouteBytes(object,file,actual).equals(expected),'Accepted headless/window/authoring/schema bytes changed: '+file);indexed(file,actual);}
  const before=JSON.parse(object(integrationBase,'upstream.json')),upstream=JSON.parse(historicalRailwayRouteBytes(object,'upstream.json',read('upstream.json'))),{farmyardWindowArt:pin,...existing}=upstream;
  assert.deepEqual(existing,before,'Pre-existing upstream pins must remain unchanged.');
  assert.ok(pin,'Register the explicit reference-only farmyardWindowArt pin.');
  for(const [key,value]of Object.entries({repository:manifest.repository,commit:sourceCommit,root:vendorRoot,manifest:referenceManifest}))assert.equal(pin[key],value,'farmyardWindowArt '+key);
  assert.match(pin.purpose,/reference/i,'The new pin must identify reference-only use.');
  const pkg=json('package.json'),basePackage=JSON.parse(object(integrationBase,'package.json'));
  assert.equal(pkg.exports[entry],entryFile,'Register the actual optional native renderer entry.');
  const optionalRegistration=checkTileAuthoringRegistration({object,read,indexed,moduleClosure,distribution});
  const priorExports=withoutTileStackRegistration(optionalRegistration.historicalView.exports);delete priorExports[entry];
  // Later reviewed optional tile-art registration adds only these three entries.
  const tileEntries={'./tiles/art':'./packages/tile-visuals/prepare.js','./tiles/art/example':'./packages/tile-visuals/example.js','./tiles/art/three':'./packages/tile-visuals/three.js'};
  for(const [name,target]of Object.entries(tileEntries))if(Object.hasOwn(priorExports,name)){assert.equal(priorExports[name],target,'Unexpected tile-art registration target: '+name);delete priorExports[name];}
  assert.deepEqual(priorExports,basePackage.exports,'Existing public exports must remain unchanged.');
  assert.equal(pkg.version,basePackage.version,'This registration does not decide a release version.');
  const request=json('docs/reviews/native-window-presenter/registration-request.json');
  assert.deepEqual([...request.explicitSupport].sort(),[...support].sort(),'Keep the exact five reviewed support files.');
  const referenceSupport=new Set(support.filter(f=>f.startsWith(vendorRoot+'/'))),profiles={};
  for(const profile of ['core','renderer','assets','compatibility']){
    const d=distribution(profile),rendered=profile==='renderer'||profile==='compatibility';
    if(rendered){assert.equal(d.exports[entry],entryFile);for(const file of [...closure,...support])assert.ok(d.files.includes(file),'Missing '+profile+' native support/runtime: '+file);}
    else{assert.equal(d.exports[entry],undefined);assert.equal(d.files.some(f=>f.startsWith('packages/native-window-presenter/')&&f.endsWith('.js')),false,'Headless/assets must not include native presenter JavaScript.');}
    for(const file of d.files){
      assert.equal(file.startsWith('tests/'),false,'Test-only inputs entered '+profile+': '+file);
      assert.equal(file.startsWith('vendor/farmyard-grenades/')||file.startsWith('vendor/farmyard-grenade-visuals/'),false,'Raw donor sources entered '+profile+': '+file);
      if(file.startsWith(vendorRoot+'/'))assert.ok(referenceSupport.has(file),'Reference geometry/Three copy entered '+profile+': '+file);
    }
    profiles[profile]={files:d.files.length,registered:rendered};
  }
  assert.deepEqual(pkg.files,npmFilePatterns(distribution().files),'Root package whitelist must match the exact distribution closure.');
  return {status:'pass',registered:true,sourceCommit,acceptedPresenter,integrationBase,snapshot,runtime,packageSupport:[...support],entry,entryFile,frozenFiles:frozen.length,profiles,coreOrThreeImports:false,newSchemaOrCapability:false,gameAdopted:false,optionalRegistration,requiredGitCommits:[...new Set([sourceCommit,acceptedPresenter,integrationBase,privateC2aSource,...optionalRegistration.requiredGitCommits])]};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const report=checkNativeWindowPresenter();
  const out=path.join(root,'artifacts/native-window-presenter');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'source-audit.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
