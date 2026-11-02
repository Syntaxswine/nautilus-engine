import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,moduleClosure,distribution} from './distribution.mjs';
import {TILE_STACK_REGISTRATION_BASE} from './tile-stack-registration.mjs';
import {checkTileAuthoringRegistration} from './tile-authoring-registration.mjs';
import {tileSurfaceCorrection,TILE_SURFACE_CORRECTION_SOURCE,TILE_SURFACE_CORRECTION_BASE,TILE_SURFACE_PREPARE_PATH,TILE_SURFACE_METADATA_PATH} from './tile-surface-corrections.mjs';

export const TILE_FINISHES_ACCEPTED_ARTIST='6df9c11fc6cf7fabf0e7a7d0e8acc4ee753e6c03';
export const TILE_FINISHES_SOURCE_SHA256='a01866a7380fa15e56a10d8f72e5c0100aeebc633d495e801623282236751dd1';
export const TILE_FINISHES_CATALOGUE=Object.freeze({id:'nautilus-tile-finish-library',version:1,digest:'5b4c25105568a1f99569dbb6bd2d6308c067bbb41763c4bd6bfddfa3552bc0e1'});
export const TILE_FINISHES_PRIVATE_CATALOGUE=Object.freeze({id:'nautilus-tile-finish-catalogue',version:1,digest:'4da6c7e85b9819aa6c6d847b0447d5baa80db77a824a04e24579209ccc0c381b',preserved:true});
// These public hashes are the fixed Root-reviewed promotion, not hashes read
// back from the mutable working tree or an unreviewed promotion ledger.
const publicHashes=Object.freeze({
  'catalogue.js':'f5ab5f15757537309a68d5d68c869004a044ad5bfff37089e928d35f09a4e73c',
  'data.js':'3eab4dbc81ff0ce2b36c713aa4d4087ce8d4e5bfbbcff3ecdb4eff0ef7cde0a3',
  'finishes.js':'fe2a2d16c09ed4598c8d724ee682d850a5077069803b4bdefc8978e258000dab'
});
const sourceRoot='candidates/tile-stack/art',runtimeRoot='packages/tile-finishes';
const runtimeFiles=Object.keys(publicHashes).map(name=>runtimeRoot+'/'+name);
const sourceFile=runtimeRoot+'/source.json',guideFile=runtimeRoot+'/README.md',workspaceGuide='docs/stacked-tiles.md';
const support=[guideFile,sourceFile,workspaceGuide];
const entries={'./tiles/finishes':'./packages/tile-finishes/catalogue.js','./tiles/finishes/three':'./packages/tile-finishes/finishes.js'};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const row=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes)});
const image=file=>/\.(?:png|jpe?g|gif|webp|avif|bmp|tiff?|svg|ktx2?|dds)$/i.test(file);
const relative=file=>typeof file==='string'&&file&&!path.posix.isAbsolute(file)&&!file.includes('\\')&&!file.includes('%')&&!/[\x00-\x1f\x7f?#]/.test(file)&&path.posix.normalize(file)===file&&!file.split('/').some(part=>!part||part==='.'||part==='..');

// Synchronous read-only inspection. Finish/candidate modules and native geometry
// are never evaluated. The tools-only closure parser uses finite foreground Node
// children; this function writes no report, package, metadata, browser or server.
export function checkTileFinishesSource(projectRoot=root,{tracked=null}={}){
  assert.equal(path.resolve(projectRoot),root,'Use this checkout and its owning distribution module.');
  assert.ok(tracked===null||tracked instanceof Set,'Supply the owning tracked path set or null.');
  const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,maxBuffer:24*1024*1024});
  const objects=new Map();
  const object=(commit,file)=>{assert.ok(relative(file),'Unsafe immutable source path: '+file);const key=commit+':'+file;if(!objects.has(key))objects.set(key,git('show',key));return objects.get(key);};
  const read=file=>{
    assert.ok(relative(file),'Unsafe source inventory path: '+file);let target=root;
    for(const part of file.split('/')){target=path.join(target,part);assert.equal(fs.lstatSync(target).isSymbolicLink(),false,'Symlink in source inventory: '+file);}
    assert.equal(fs.statSync(target).isFile(),true,'Expected a regular source file: '+file);return fs.readFileSync(target);
  };
  const indexed=(file,expected)=>{if(!tracked)return;assert.ok(tracked.has(file),'Required tile-finish file is not tracked: '+file);assert.ok(git('show',':'+file).equals(expected),'Git index changes reviewed bytes: '+file);};
  const listed=(commit,...folders)=>git('ls-tree','-r','--name-only',commit,'--',...folders).toString('utf8').trim().split('\n').filter(Boolean).sort();
  function walk(folder){return fs.readdirSync(path.join(root,folder),{withFileTypes:true}).flatMap(entry=>{const file=folder+'/'+entry.name;assert.ok(relative(file));assert.equal(entry.isSymbolicLink(),false,'Symlink in finish inventory: '+file);return entry.isDirectory()?walk(file):[file];}).sort();}
  const fixed=(file,commit)=>{const expected=object(commit,file);assert.ok(read(file).equals(expected),'Fixed dependency changed: '+file);indexed(file,expected);return row(file,expected);};

  // Authenticate the Root-reviewed declaration before interpreting any paths,
  // source identities or literal transformations stored in that declaration.
  const metadataBytes=read(sourceFile);assert.equal(sha(metadataBytes),TILE_FINISHES_SOURCE_SHA256,'The Root-reviewed promotion metadata changed.');indexed(sourceFile,metadataBytes);
  const source=JSON.parse(metadataBytes);
  assert.equal(source.schemaVersion,1);assert.equal(source.id,'nautilus.optional-tile-finishes');assert.equal(source.availability,'registered-optional');
  assert.equal(source.acceptedArtist,TILE_FINISHES_ACCEPTED_ARTIST);assert.equal(source.artistSourceRoot,sourceRoot);
  assert.deepEqual(source.entries,entries);assert.deepEqual(source.catalogue,TILE_FINISHES_CATALOGUE);assert.deepEqual(source.privateCatalogue,TILE_FINISHES_PRIVATE_CATALOGUE);
  assert.notEqual(source.catalogue.id,source.privateCatalogue.id);assert.notEqual(source.catalogue.digest,source.privateCatalogue.digest);
  assert.equal(source.guide,guideFile);assert.match(source.scope,/cosmetic/i);assert.match(source.scope,/unbound/i);
  assert.deepEqual(source.runtime.map(r=>r.path),runtimeFiles);assert.deepEqual(source.adaptations.map(a=>a.path),runtimeFiles);
  const originals=[],runtime=[];
  for(const [name,digest]of Object.entries(publicHashes)){
    const file=runtimeRoot+'/'+name,sourcePath=sourceRoot+'/'+name,r=source.runtime.find(r=>r.path===file),adaptation=source.adaptations.find(a=>a.path===file);
    assert.equal(r.sourceCommit,TILE_FINISHES_ACCEPTED_ARTIST);assert.equal(r.sourcePath,sourcePath);assert.equal(r.sha256,digest);
    const original=object(TILE_FINISHES_ACCEPTED_ARTIST,sourcePath);assert.equal(original.length,r.sourceBytes);assert.equal(sha(original),r.sourceSha256,'Artist source record differs from its immutable object: '+sourcePath);
    const sourceGitBlob=git('rev-parse',TILE_FINISHES_ACCEPTED_ARTIST+':'+sourcePath).toString('utf8').trim();assert.match(sourceGitBlob,/^[a-f0-9]{40}$/);
    originals.push({...row(sourcePath,original),gitBlob:sourceGitBlob});
    let text=original.toString('utf8');assert.ok(Buffer.from(text,'utf8').equals(original),'Replay only exact UTF-8 source.');
    assert.equal(adaptation.steps.length,name==='catalogue.js'?11:1,'Only the reviewed literal metadata/comment adaptations are allowed.');
    for(const step of adaptation.steps){
      assert.deepEqual(Object.keys(step).sort(),['from','occurrences','to']);assert.equal(step.occurrences,1);assert.equal(typeof step.from,'string');assert.ok(step.from.length>0);assert.equal(typeof step.to,'string');
      assert.equal(text.split(step.from).length-1,1,'Replay each authenticated literal adaptation exactly once: '+file);text=text.replace(step.from,step.to);
    }
    const expected=Buffer.from(text,'utf8');assert.equal(sha(expected),digest,'Replayed Root promotion differs from its reviewed public hash: '+file);assert.equal(expected.length,r.bytes);
    assert.ok(read(file).equals(expected),'Only the reviewed Artist bytes and authenticated literal promotion are allowed: '+file);indexed(file,expected);runtime.push({...row(file,expected),sourcePath,sourceGitBlob});
  }
  assert.deepEqual(walk(runtimeRoot),[...runtimeFiles,guideFile,sourceFile].sort(),'The finish folder contains only the reviewed three modules, builder guide and provenance.');
  const closure=moduleClosure(Object.values(entries)),headless=moduleClosure([entries['./tiles/finishes']]),rendered=moduleClosure([entries['./tiles/finishes/three']]);
  assert.deepEqual(closure,runtimeFiles);assert.deepEqual(headless,[runtimeRoot+'/catalogue.js']);assert.deepEqual(rendered,runtimeFiles,'The native appearance adapter borrows core/Three; it must not bundle either.');

  // Verify both catalogue pins without evaluating a native or candidate module.
  // Whole-object digest recomputation/frozen choice semantics are covered by
  // the separate catalogue-only registration test.
  const publicCatalogue=read(runtimeRoot+'/catalogue.js').toString('utf8'),privateCatalogue=object(TILE_FINISHES_ACCEPTED_ARTIST,sourceRoot+'/catalogue.js').toString('utf8');
  assert.ok(publicCatalogue.includes("export const TILE_FINISH_CONTENT_DIGEST='"+TILE_FINISHES_CATALOGUE.digest+"';"));
  assert.ok(publicCatalogue.includes("id:'"+TILE_FINISHES_CATALOGUE.id+"',version:1,digest:TILE_FINISH_CONTENT_DIGEST"));
  assert.ok(publicCatalogue.includes("catalogueId:'"+TILE_FINISHES_CATALOGUE.id+"',catalogueVersion:1"));
  assert.ok(privateCatalogue.includes("export const TILE_FINISH_CONTENT_DIGEST='"+TILE_FINISHES_PRIVATE_CATALOGUE.digest+"';"));
  assert.ok(privateCatalogue.includes("id:'"+TILE_FINISHES_PRIVATE_CATALOGUE.id+"',version:1,digest:TILE_FINISH_CONTENT_DIGEST"));

  const correction=tileSurfaceCorrection({object});assert.equal(TILE_SURFACE_CORRECTION_SOURCE,'93a94778779b800227f3886b1ca63fae1abc2543');
  const expectedCorrection=correction.correction;
  for(const [key,want]of Object.entries({status:'pass',sourceCommit:expectedCorrection.sourceCommit,patchPath:expectedCorrection.patch.path,patchSha256:expectedCorrection.patch.sha256,file:TILE_SURFACE_PREPARE_PATH,beforeSha256:expectedCorrection.originalSha256,afterSha256:expectedCorrection.patchedSha256}))assert.equal(source.providerCorrection[key],want,'Finish/provider correction '+key);
  for(const file of [TILE_SURFACE_PREPARE_PATH,TILE_SURFACE_METADATA_PATH]){const expected=correction.overrides[file].expected;assert.ok(read(file).equals(expected),'The actual public provider must carry the separately authenticated correction: '+file);indexed(file,expected);}
  assert.ok(publicCatalogue.includes('const providerRefusals=[];'),'The two corrected historical line poses must not remain advertised refusals.');

  const atlas=source.atlas,atlasBytes=read(atlas.path),originalAtlas=object(TILE_FINISHES_ACCEPTED_ARTIST,atlas.path);
  assert.equal(atlas.path,'assets/buildings/painted-materials-v2.png');assert.equal(atlas.bytes,2558637);assert.equal(atlas.sha256,'bbe33709a63362a13e509131c11f358d286b3d55ffcb86ca0ca1def4934ccdb2');
  assert.equal(atlasBytes.length,atlas.bytes);assert.equal(sha(atlasBytes),atlas.sha256);assert.ok(atlasBytes.equals(originalAtlas),'Reuse the old atlas without any bitmap change.');indexed(atlas.path,originalAtlas);

  // Preserve authored numeric/source/physical contracts; the only provider
  // change is the generated startRad expression authenticated above.
  const golden=JSON.parse(object(TILE_SURFACE_CORRECTION_BASE,'tests/fixtures/procedural-tiles/v2-golden-v1.json'));assert.equal(golden.files.length,18);
  const publicCore=golden.files.map(r=>{const expected=object(TILE_SURFACE_CORRECTION_BASE,r.file);assert.equal(sha(expected),r.sha256);assert.ok(read(r.file).equals(expected),'Public v1 source/schema contract changed: '+r.file);indexed(r.file,expected);return row(r.file,expected);});
  const protectedRoot=['upstream.json','packages/map-core/contract-manifest.js','packages/map-core/capabilities.js'].map(file=>fixed(file,TILE_STACK_REGISTRATION_BASE));
  for(const file of [guideFile,workspaceGuide]){const bytes=read(file);assert.ok(bytes.length>0,'Required Root builder guide is empty: '+file);indexed(file,bytes);}
  const registration=checkTileAuthoringRegistration({object,read,indexed,moduleClosure,distribution});
  const baselineImages=new Set(listed(TILE_STACK_REGISTRATION_BASE).filter(image)),profiles={};
  for(const name of ['core','renderer','assets','compatibility']){
    const d=distribution(name),hasHeadless=name==='core'||name==='compatibility',hasRenderer=name==='renderer'||name==='compatibility';
    assert.equal(d.exports['./tiles/finishes'],hasHeadless?entries['./tiles/finishes']:undefined,name+' headless finish entry');
    assert.equal(d.exports['./tiles/finishes/three'],hasRenderer?entries['./tiles/finishes/three']:undefined,name+' native finish entry');
    const wantedRuntime=name==='core'?headless:name==='renderer'||name==='compatibility'?runtimeFiles:[],wantedSupport=name==='assets'?[]:[guideFile,sourceFile];
    assert.deepEqual(d.files.filter(file=>file.startsWith(runtimeRoot+'/')).sort(),[...wantedRuntime,...wantedSupport].sort(),name+' exact finish runtime/support footprint');
    if(name!=='assets')assert.ok(d.files.includes(workspaceGuide),name+' workspace guide');
    if(hasRenderer||name==='assets')assert.ok(d.files.includes(atlas.path),name+' old atlas');
    for(const file of d.files){
      assert.equal(file.startsWith('candidates/')||file.startsWith('tests/')||file.startsWith('docs/reviews/tile-stack/')||file.startsWith('tools/tile-stack-'),false,'Private candidate/proof source leaked into '+name+': '+file);
      if(image(file))assert.ok(baselineImages.has(file),'A new image entered '+name+': '+file);
    }
    profiles[name]={files:d.files.length,headlessExport:hasHeadless,rendererExport:hasRenderer,runtime:[...wantedRuntime],support:[...wantedSupport]};
  }
  return {
    status:'pass',registered:true,id:source.id,acceptedArtist:TILE_FINISHES_ACCEPTED_ARTIST,catalogue:{...TILE_FINISHES_CATALOGUE},privateCatalogue:{...TILE_FINISHES_PRIVATE_CATALOGUE},
    originals,runtime,sourceRecord:row(sourceFile,metadataBytes),entries:{...entries},closure,headless,rendered,atlas:{...atlas},providerCorrection:expectedCorrection,
    publicCoreFiles:publicCore.length,frozenRootFiles:protectedRoot.length,packageSupport:[...support],profiles,registration,
    newImages:0,bundledCoreOrThree:false,newSchemaOrCapability:false,editorAdopted:false,gameAdopted:false,
    requiredGitCommits:[...new Set([TILE_FINISHES_ACCEPTED_ARTIST,TILE_STACK_REGISTRATION_BASE,...correction.requiredGitCommits,...registration.requiredGitCommits])]
  };
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);assert.ok(args.length===0||args.length===1&&args[0]==='--check','This CLI performs read-only checking only.');
  console.log(JSON.stringify(checkTileFinishesSource(),null,2));
}
