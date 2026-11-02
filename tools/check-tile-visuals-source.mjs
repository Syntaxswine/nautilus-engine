import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,moduleClosure,distribution} from './distribution.mjs';
import {withoutTileStackRegistration} from './tile-stack-registration.mjs';
import {checkTileAuthoringRegistration} from './tile-authoring-registration.mjs';
import {tileSurfaceCorrection,TILE_SURFACE_PREPARE_PATH,TILE_SURFACE_METADATA_PATH} from './tile-surface-corrections.mjs';

export const TILE_ART_ACCEPTED_SOURCE='ca285aa76a49b74df6067caab661d7bed39bd523';
export const TILE_ART_ROOT_BASE='3e583378bee99dc8e275f1b97591af9a0406ca04';
export const TILE_ART_PRESERVED_STUDIES='7d7b1ccee54b1eba05b2f60563d4ab5ab4d002ab';
const historicalCore='708ed1c14e69699e4baa4483cbc5a50901d5be4e';
const id='nautilus.native-tile-surfaces',policy='canonical-surface-v1-cuts16-interior8-16-32';
const entries={'./tiles/art':'./packages/tile-visuals/prepare.js','./tiles/art/example':'./packages/tile-visuals/example.js','./tiles/art/three':'./packages/tile-visuals/three.js'};
const support=['packages/tile-visuals/README.md','packages/tile-visuals/NOTICE.md','packages/tile-visuals/source.json'];
const adaptation={path:'packages/tile-visuals/prepare.js',from:'candidate; optional registration pending',to:id,occurrences:1};
const proofInputs=['tests/tile-visuals.test.mjs','tests/tile-visuals-lifecycle.test.mjs','tests/fixtures/tile-visuals/boundary-material-proof.mjs','tests/fixtures/tile-visuals/input-grade-proof.mjs','tests/fixtures/tile-visuals/lifecycle-proof.mjs'];
// Explicit changed-file inventory from the reviewed study checkpoint. Do not
// infer it from a parent diff: CI deliberately fetches immutable shallow tips.
const artPaths=['art/curve-tiles/catalogue.json','art/curve-tiles/source.json','docs/reviews/curve-tiles/README.md','docs/reviews/curve-tiles/acceptance.json','docs/reviews/curve-tiles/contract-proposal.json','docs/reviews/curve-tiles/previews/concave.png','docs/reviews/curve-tiles/previews/detail-32.png','docs/reviews/curve-tiles/previews/detail-8.png','docs/reviews/curve-tiles/previews/drive.png','docs/reviews/curve-tiles/previews/heights.png','docs/reviews/curve-tiles/previews/junction.png','docs/reviews/curve-tiles/previews/layers.png','docs/reviews/curve-tiles/previews/phone.png','docs/reviews/curve-tiles/previews/profiles.png','docs/reviews/curve-tiles/previews/s-bend.png','docs/reviews/curve-tiles/previews/sheet.png','docs/reviews/curve-tiles/previews/wall.png','docs/reviews/curve-tiles/registration-request.json','examples/curve-tile-art.html','examples/curve-tile-art.js','packages/curve-tiles/README.md','packages/curve-tiles/catalogue.js','packages/curve-tiles/families/edges.js','packages/curve-tiles/families/heights.js','packages/curve-tiles/families/surfaces.js','packages/curve-tiles/families/sweeps.js','packages/curve-tiles/families/water.js','packages/curve-tiles/field.js','packages/curve-tiles/index.js','packages/curve-tiles/three.js','tests/curve-tile-art.test.mjs','tests/fixtures/curve-tiles/package-proof.mjs','tools/build-curve-tile-art.mjs','tools/collect-curve-tile-art-review.mjs','tools/review-curve-tile-art.mjs','tools/test-curve-tile-art-package.mjs','tools/verify-curve-tile-art.mjs'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// Callable integrity check: importing or calling it does not write reports,
// build packages, contact a donor, or create a browser/server/helper.
export function checkTileVisualsSource(projectRoot=root,{tracked=null}={}){
  assert.equal(path.resolve(projectRoot),root,'Use this checkout and its owning distribution module.');
  const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,maxBuffer:24*1024*1024});
  const object=(commit,file)=>git('show',commit+':'+file);
  const read=file=>fs.readFileSync(path.join(root,file));
  const json=file=>JSON.parse(read(file));
  const record=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes)});
  const indexed=(file,expected)=>{
    if(!tracked)return;
    assert.ok(tracked.has(file),'Required tile file is not tracked: '+file);
    assert.ok(git('show',':'+file).equals(expected),'The index changes reviewed bytes: '+file);
  };
  const unchanged=(file,commit)=>{
    const expected=object(commit,file);assert.ok(read(file).equals(expected),'Reviewed bytes changed: '+file);indexed(file,expected);return record(file,expected);
  };
  const approvedRuntime=git('ls-tree','-r','--name-only',TILE_ART_ACCEPTED_SOURCE,'packages/tile-visuals').toString().trim().split('\n').filter(file=>file.endsWith('.js')).sort();
  assert.equal(approvedRuntime.length,6);
  const surfaceCorrection=tileSurfaceCorrection({object}),runtimeCorrections=[surfaceCorrection.correction];
  const acceptedRuntime=[],runtime=[];
  for(const file of approvedRuntime){
    const original=object(TILE_ART_ACCEPTED_SOURCE,file);acceptedRuntime.push(record(file,original));
    let expected=original;
    if(file===adaptation.path){
      const text=original.toString('utf8');assert.equal(text.split(adaptation.from).length-1,1,'The sole registered-identity adaptation must be unambiguous.');
      expected=Buffer.from(text.replace(adaptation.from,adaptation.to),'utf8');
    }
    if(file===TILE_SURFACE_PREPARE_PATH){
      const correction=surfaceCorrection.overrides[file];assert.ok(expected.equals(correction.original),'Registered provider correction preimage differs.');expected=correction.expected;
    }
    assert.ok(read(file).equals(expected),'Only the exact registered identity and reviewed generated-angle correction are permitted: '+file);indexed(file,expected);runtime.push(record(file,expected));
  }
  const closure=moduleClosure(Object.values(entries));
  assert.deepEqual(closure,approvedRuntime,'Provider closure must be the six local modules, without bundled core, Three, donor or lab modules.');

  // Preserve the exact registered v1 runtime/schema identity, including its
  // shared hash helper. Later private v2/C1 files are not compared to old708.
  const golden=JSON.parse(object(TILE_ART_ROOT_BASE,'tests/fixtures/procedural-tiles/v2-golden-v1.json')).files;
  assert.equal(golden.length,18);
  const coreFiles=golden.map(item=>{
    const expected=object(TILE_ART_ROOT_BASE,item.file);assert.equal(sha(expected),item.sha256);
    assert.ok(expected.equals(object(TILE_ART_ACCEPTED_SOURCE,item.file)),'Accepted provider/root v1 identity differs: '+item.file);
    assert.ok(read(item.file).equals(expected),'Registered v1 bytes changed: '+item.file);indexed(item.file,expected);return record(item.file,expected);
  });
  unchanged('packages/tiles-core/NOTICE.md',TILE_ART_ROOT_BASE);
  unchanged('packages/map-core/contract-manifest.js',TILE_ART_ROOT_BASE);
  const currentUpstream=json('upstream.json'),baseUpstream=JSON.parse(object(TILE_ART_ROOT_BASE,'upstream.json'));
  assert.deepEqual(currentUpstream,baseUpstream,'This registration adds no donor/game pin.');
  const optionalRegistration=checkTileAuthoringRegistration({object,read,indexed,moduleClosure,distribution});
  const basePackage=JSON.parse(object(TILE_ART_ROOT_BASE,'package.json')),pkg=json('package.json'),priorExports=withoutTileStackRegistration(optionalRegistration.historicalView.exports);
  for(const [entry,target]of Object.entries(entries)){assert.equal(priorExports[entry],target,'Missing actual tile-art export: '+entry);delete priorExports[entry];}
  assert.deepEqual(priorExports,basePackage.exports,'Existing public exports must remain unchanged.');
  assert.equal(pkg.version,basePackage.version,'Registration does not decide a release version.');

  // Original294 studies and their source notices remain immutable research,
  // including the original previews/tools; none becomes a runtime authority.
  assert.equal(artPaths.length,37);
  for(const file of artPaths)unchanged(file,TILE_ART_PRESERVED_STUDIES);
  const studies=json('art/curve-tiles/catalogue.json');assert.equal(studies.studies.length,294);
  const design=json('art/curve-tiles/source.json');
  for(const source of [...design.runtime,...design.designReferences]){
    const bytes=read(source.path);assert.equal(bytes.length,source.bytes);assert.equal(sha(bytes),source.sha256);indexed(source.path,bytes);
  }
  const atlas=unchanged('assets/buildings/painted-materials-v2.png',TILE_ART_ROOT_BASE);
  assert.equal(atlas.bytes,design.paint.bytes);assert.equal(atlas.sha256,design.paint.sha256);
  const threeNotice=unchanged(baseUpstream.aft.root+'/dist/tactics/vendor/THREE-LICENSE.txt',TILE_ART_ROOT_BASE);
  const immutableProofs=proofInputs.map(file=>unchanged(file,TILE_ART_ACCEPTED_SOURCE));

  const expectedMetadata=surfaceCorrection.overrides[TILE_SURFACE_METADATA_PATH].expected;
  assert.ok(read(TILE_SURFACE_METADATA_PATH).equals(expectedMetadata),'Provider metadata must preserve the fixed base with only the reviewed runtime correction.');indexed(TILE_SURFACE_METADATA_PATH,expectedMetadata);
  const source=json(TILE_SURFACE_METADATA_PATH);
  for(const [key,value]of Object.entries({schemaVersion:1,id,availability:'registered-optional',acceptedProvider:TILE_ART_ACCEPTED_SOURCE,integrationBase:TILE_ART_ROOT_BASE,preservedArtCheckpoint:TILE_ART_PRESERVED_STUDIES,policy,guide:support[0],notice:support[1]}))assert.equal(source[key],value,'Source metadata '+key);
  assert.deepEqual(source.entries,entries);assert.deepEqual(source.acceptedRuntime,acceptedRuntime);assert.deepEqual(source.runtime,runtime);assert.deepEqual(source.atlas,atlas);assert.deepEqual(source.metadataAdaptations,[adaptation]);assert.deepEqual(source.runtimeCorrections,runtimeCorrections);
  assert.match(source.scope,/surface/i);assert.match(source.scope,/unbound/i);
  if(source.canonicalCoreCheckpoint!==undefined)assert.equal(source.canonicalCoreCheckpoint,historicalCore);
  const headless=moduleClosure([entries['./tiles/art'],entries['./tiles/art/example']]),rendered=moduleClosure([entries['./tiles/art/three']]);
  assert.equal(headless.length,3);assert.equal(rendered.length,5);
  const profiles={};
  for(const profile of ['core','renderer','assets','compatibility']){
    const d=distribution(profile),wanted=profile==='core'?headless:profile==='renderer'?rendered:profile==='compatibility'?approvedRuntime:[];
    for(const [entry,target]of Object.entries(entries))assert.equal(d.exports[entry],profile==='compatibility'||profile==='core'&&!entry.endsWith('/three')||profile==='renderer'&&entry.endsWith('/three')?target:undefined,profile+' export '+entry);
    assert.deepEqual(d.files.filter(file=>file.startsWith('packages/tile-visuals/')&&file.endsWith('.js')),wanted,profile+' exact provider closure');
    if(profile!=='assets')for(const file of support)assert.ok(d.files.includes(file),profile+' support '+file);
    if(profile==='renderer'||profile==='compatibility')assert.ok(d.files.includes(atlas.path),profile+' shared atlas');
    assert.ok(d.files.includes(threeNotice.path),profile+' original Three notice');
    for(const file of d.files){
      assert.equal(file.startsWith('tests/')||file.startsWith('art/curve-tiles/')||file.startsWith('packages/curve-tiles/'),false,'Lab/proof authority leaked into '+profile+': '+file);
      assert.equal(file.startsWith('vendor/farmyard-grenades/')||file.startsWith('vendor/farmyard-grenade-visuals/'),false,'Raw donor gameplay leaked into '+profile+': '+file);
      assert.equal(file.startsWith('docs/reviews/tile-visuals/previews/')||file.startsWith('docs/reviews/curve-tiles/previews/'),false,'Review imagery leaked into '+profile+': '+file);
      assert.equal(file.startsWith('packages/tiles-core/')&&(/-v2\.schema\.json$/.test(file)||['candidate-v2.js','render-model.js','render-plan.js','v2-records.js','v2-shapes.js','zero-exposure.js'].some(name=>file.endsWith('/'+name))||file.includes('/planar-')),false,'Private v2/C1 leaked into '+profile+': '+file);
    }
    profiles[profile]={files:d.files.length,providerFiles:wanted};
  }
  assert.deepEqual(pkg.files,distribution().files,'Root whitelist must match the exact computed distribution.');
  const families=Object.values(Object.groupBy(studies.studies,study=>study.family)).map(list=>({id:list[0].family,count:list.length}));
  return {status:'pass',registered:true,id,policy,acceptedProvider:TILE_ART_ACCEPTED_SOURCE,integrationBase:TILE_ART_ROOT_BASE,preservedArtCheckpoint:TILE_ART_PRESERVED_STUDIES,canonicalCoreCheckpoint:historicalCore,acceptedRuntime,runtime,metadataAdaptations:[adaptation],runtimeCorrections,coreFiles,packageSupport:[...support],entries,atlas,threeNotice,immutableProofs,preservedArtFiles:artPaths.length,studies:294,families,profiles,optionalRegistration,publicExportsChanged:true,publicWhitelistChanged:true,newSchemaOrCapability:false,editorAdopted:false,gameAdopted:false,requiredGitCommits:[...new Set([TILE_ART_ACCEPTED_SOURCE,TILE_ART_ROOT_BASE,TILE_ART_PRESERVED_STUDIES,optionalRegistration.base,...optionalRegistration.requiredGitCommits,...surfaceCorrection.requiredGitCommits])]};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const report=checkTileVisualsSource(),out=path.join(root,'artifacts/tile-visuals');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'registered-source-audit.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
