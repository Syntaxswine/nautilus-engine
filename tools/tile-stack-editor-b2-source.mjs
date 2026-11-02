// Reviewed B2 source model. Integrity reads fixed objects and never blesses runtime edits.
// Fixed rows may be updated only from another explicitly reviewed Git commit.
// No model/check path reads current runtime bytes as expected bytes or writes files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tileStackEditorSourceModel} from './tile-stack-editor-source.mjs';

export const TILE_STACK_EDITOR_B2_SOURCE='f754afcc9f46b196f258bf09e8091c962c9b31f8';
export const TILE_STACK_EDITOR_B2_RUNTIME_CHECKPOINT='f754afcc9f46b196f258bf09e8091c962c9b31f8';
export const TILE_STACK_EDITOR_B2_UI_COPY_CHECKPOINT='faf4454bc2760f91743039b0ea42bff15055c57c';
export const TILE_STACK_EDITOR_B2_BASE='d0ecfdfb35110616fbd4c03ad41775acf6a2d163';
export const TILE_STACK_EDITOR_B2_UI='8622c77234036d786474689f7e70671ecf01136b';
export const TILE_STACK_EDITOR_B2_STATUS='reviewed-integration-candidate';
export const TILE_STACK_EDITOR_B2_METADATA='docs/reviews/tile-stack/architect/b2-sources.json';
const base250='2502646482218524fd5129641da769bb82462e4d';
const b1Source='4b0499cc776fcd85fdd415fa7344982b75fbf8fb',historicalSource='9e996f96b69ba4867e643b558e9fdfeaf752d19e';
const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// [path,bytes,SHA256,Git blob] from the fixed source, not a working-tree scan.
const approved=[
  [
    "apps/editor/smart-tile/input.js",
    7909,
    "8daa46685e70de5914e151e1c8cecf9b457bbbc8ddb6c88a03cf7bda64d60e8a",
    "dfafbc196845205aa995082f1d9e9c34c8e6c910"
  ],
  [
    "apps/editor/smart-tile/session.js",
    23731,
    "8df2df36088315d86c8546de5a341896ee141c69f7c45a3b7c3fd21f622e8e03",
    "e117998b6848406606f6e1066694184e534db47d"
  ],
  [
    "apps/editor/tile-stack/checkpoint.js",
    6107,
    "e69f2b3bca27c09aae4619577255f52767e6f02caa2bda980c133918bee78987",
    "bd38c26a4522bf0acb4b733fd4e8fcda3504adc6"
  ],
  [
    "apps/editor/tile-stack/contract.js",
    3612,
    "073fdd63e219a36a180d787c67c9964f515c65e562adcc4987111988bf1ab732",
    "d529600b0a10f45cee996d922adc4a8ab4e3abab"
  ],
  [
    "apps/editor/tile-stack/finish-menu.js",
    1776,
    "d02278728f9354950987ebda793549447cc36498c77922eb8d7e4537498c31ee",
    "806f8ddb8b16d06cb775a41af37e4a08434e8074"
  ],
  [
    "apps/editor/tile-stack/floors.js",
    5487,
    "57e5f76f31a6c722a0effe8268bb2c4b96d115d8009fa4e9e6a3481b112e8527",
    "511434b6b4d0e98804df2abc44d91e163a68bc64"
  ],
  [
    "apps/editor/tile-stack/planner-seam.js",
    5039,
    "f487abe4793b21b41afe32830f33eaa2272f4e15aa2fcf3e5d0bd35b611226a7",
    "a70d68aada48276b9c26a2e3aed2be3c3df8d663"
  ],
  [
    "apps/editor/tile-stack/policy.js",
    9366,
    "f3b6f46c671a13797082c40cf5b9ab5bf1dc02944c074f74689f38125500aefe",
    "ad5dfeb1affb7d36612b97210b9afa691869d843"
  ],
  [
    "apps/editor/tile-stack/presentation.js",
    11513,
    "285414d6aea75149150dd58d1917d19e9026aafa329e4dba02a99e7b48c32f5f",
    "f7f308c337da17345213adbe08e36f97d18b634f"
  ],
  [
    "apps/editor/tile-stack/profile.js",
    9133,
    "97fe87cad9c55546e28abd6141b3d1c944f1afc8225b5b365309b10166ceab7e",
    "4df0b9b75ed49ef3297d885a0024656305ae1d04"
  ],
  [
    "apps/editor/tile-stack/seed.js",
    1142,
    "7c2ebb6039464959cae336bf3dc9534649e4da9e781e85dca201a74bfea9583a",
    "42c5cd7679d0e8c2ab51fc674f460dd9290c71a4"
  ],
  [
    "apps/editor/tile-stack/session.js",
    641,
    "cd1f134ad2e805ac95a3d96dd2a891c71a1816256302f6f21150f14249c73920",
    "2ec69c92418e4b5c34a6c4a50174d95e1293b2e2"
  ],
  [
    "apps/editor/tile-stack/source-panel.js",
    4537,
    "21ea438c8239fcf4c91cebfc0b334ce7b830a74558b7612e2613d7373eb12d02",
    "631bac332f4dda7d94e2a9ff9bf15ad2b085cbff"
  ],
  [
    "apps/editor/tile-stack/surface-binding.js",
    1928,
    "58fa8ec2bc73f8664d0b109c852a4b5a145a08a4b34151e36c78bb20b0a3d6f1",
    "d51210e66a4d69f35f00fcf4e71b9894dd7a187b"
  ],
  [
    "apps/editor/tile-stack/surface-guard.js",
    4390,
    "3be2dd09a3ff6d128880c7a6bac5ae481e09cb15d68d13bf86894a18738145bc",
    "d167e1dfae90f90021e2db9e67efc1f2172db0ee"
  ],
  [
    "apps/editor/tile-stack/surface-route.js",
    15480,
    "76197e7760ab7dcf5f7ab9e86665cf54e612eba89ae1dd03e63d8484d24aac8e",
    "7003c33565fadb77c233b92401361a89f80cb632"
  ],
  [
    "apps/editor/tile-stack/ui/contract.js",
    8952,
    "a70c51bf524a7efe1483d0397e22b55103c04a40a624c1bef95ab605f5da08e4",
    "00f56137ab34aac0a14fb49265e56cb2eab5774b"
  ],
  [
    "apps/editor/tile-stack/ui/panel.js",
    20799,
    "2d3df312e2d8c6b6c4ab5807d1557944fe4efc2993784bd8c721f6451471a8a5",
    "f6a3b4ca438635535c5f80cb93a7631c6440fe9a"
  ],
  [
    "apps/editor/tile-stack/ui/styles.css",
    3706,
    "7b3d5d520be6b4a2578d1f7e79696c54adf2074cbf34eab24dc606ed600f5553",
    "af7d6a9e4115d555e0872fefb8654f38cae5d294"
  ],
  [
    "examples/tile-stack-editor.html",
    4879,
    "7efc9bd8da15cda676a773e9925ab610951f8e06721b2540ab91cc05930fca0c",
    "7830529387daf243a280165b05e70319b65a4060"
  ],
  [
    "examples/tile-stack-editor.js",
    12378,
    "82f50522ad4c513b47f7bb20abf3b09d62597eb90930e60e9e2b6c7493addcda",
    "d45798426b279f111710bba23945bb9c45ae6a5b"
  ],
  [
    "docs/reviews/tile-stack/editor/b2/ui-source.json",
    1563,
    "96799027b970e92d5afdbfcdc70f3096b752284d9577433cf29c46d51a8d0d01",
    "872d8b847a58da4c328f09814bbf9a5941fc6316"
  ],
  [
    "tools/build.mjs",
    16597,
    "fe945dd58456b28f86ffb727c7ac2c3c7342d9579d3af137f8536082e5f9ccec",
    "bd6084160f44df27d9206ade5fb5b3ffe346666d"
  ]
];
const frozen=[
  [
    "docs/reviews/smart-tile-editor/sources.json",
    38252,
    "d1a1dba97e906e987e1315f9aad4bfa234895770468171b1da7d4e4747e6551f",
    "3004511d681f88643dda476f2f5aafdfa4b18ae1"
  ],
  [
    "docs/reviews/smart-tile-editor/integration-sources.json",
    3703,
    "66fd89ec315e766994885e08c0bd260a9668be98182abc765157cfc61afa2d62",
    "f4d65e754387e4a68e37ad8646845f530dd144e9"
  ],
  [
    "docs/reviews/tile-stack/architect/b1-sources.json",
    14036,
    "7d7bc978958a735bb6e565d385e3c2142e29916fe6c32b72cb949a2bc631e7d0",
    "c8ef09f94859ec60e703071d20940990bc105ae7"
  ],
  [
    "tools/build.mjs",
    16484,
    "4859b7f35f1b86812482fdf4fa3246f01fd831d5f8ef804a5daf7eb9fae1cd82",
    "0824193a2ccc2a5dd3e10a328490a52e76bf8b32"
  ]
];
const approvedUI=[
  [
    "candidates/tile-stack/ui/contract.js",
    8952,
    "a70c51bf524a7efe1483d0397e22b55103c04a40a624c1bef95ab605f5da08e4",
    "00f56137ab34aac0a14fb49265e56cb2eab5774b"
  ],
  [
    "candidates/tile-stack/ui/panel.js",
    19887,
    "4b3137b5922d7c6a1ca27d09ddfcbca0dc23bd0f5a7bb615fb8e9f9918bfe4ec",
    "b4fae63cecbf5b9f28d5eaacdd4c7bdf6fdac1a3"
  ],
  [
    "candidates/tile-stack/ui/styles.css",
    3422,
    "216f103c89547b8d986bd51cedceec3946a458b7e7401d410eeb0ee367bc4316",
    "e3a0908cb702645b88b7f0e4d021f8cbc2f3827b"
  ]
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const row=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes),gitBlob:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')});
const uiRelocations=[
  {before:'../../../packages/floor-navigation/dom.js',after:'../../../../packages/floor-navigation/dom.js'},
  {before:'../../../apps/editor/smart-tile/contract.js',after:'../../smart-tile/contract.js'}
];
const buildMarker="fs.cpSync(path.join(root,'apps/editor/smart-tile'),path.join(output,'apps/editor/smart-tile'),{recursive:true});";
export const TILE_STACK_EDITOR_B2_BUILD_LINE="fs.cpSync(path.join(root,'apps/editor/tile-stack'),path.join(output,'apps/editor/tile-stack'),{recursive:true});";
const expectedB1Changes=['apps/editor/tile-stack/checkpoint.js','apps/editor/tile-stack/profile.js','apps/editor/tile-stack/session.js'];
const expectedUICorrections=['apps/editor/tile-stack/ui/panel.js','apps/editor/tile-stack/ui/styles.css'];

export function tileStackEditorB2SourceModel({object:providedObject,projectRoot=defaultRoot}={}){
  const cache=new Map(),readObject=providedObject??((commit,file)=>execFileSync('git',['-c','safe.directory='+path.resolve(projectRoot).replaceAll('\\','/'),'-C',projectRoot,'show',commit+':'+file],{windowsHide:true,timeout:30000,maxBuffer:24*1024*1024}));
  const object=(commit,file)=>{const key=commit+':'+file;if(!cache.has(key))cache.set(key,readObject(commit,file));const bytes=cache.get(key);assert.ok(Buffer.isBuffer(bytes),'Supply exact immutable Git bytes: '+key);return bytes;};
  const authenticate=(commit,record)=>{const [file,bytes,sha256,gitBlob]=record,value=object(commit,file);assert.deepEqual(row(file,value),{path:file,bytes,sha256,gitBlob},'Unreviewed immutable source: '+commit+':'+file);return value;};
  const b1=tileStackEditorSourceModel({object});assert.equal(b1.sourceCommit,b1Source);assert.equal(b1.historicalSourceCommit,historicalSource);
  // The prior record itself and all 13 prior delivered bytes remain independently
  // bound to Root's B1 base; a later helper cannot silently redefine that history.
  for(const file of b1.files)assert.ok(file.expected.equals(object(TILE_STACK_EDITOR_B2_BASE,file.path)),'B1 baseline differs: '+file.path);
  const historical=frozen.filter(record=>record[0]!=='tools/build.mjs').map(record=>{
    const bytes=authenticate(TILE_STACK_EDITOR_B2_BASE,record);assert.ok(bytes.equals(object(TILE_STACK_EDITOR_B2_SOURCE,record[0])),'B2 rewrites historical provenance: '+record[0]);
    if(record[0].includes('/smart-tile-editor/'))assert.ok(bytes.equals(object(base250,record[0])),'Historical main250 source changed.');
    else assert.ok(bytes.equals(b1.metadata.expected),'Historical B1 snapshot metadata changed.');
    return {path:record[0],expectedBuffer:bytes,expected:bytes,sourceRow:{commit:TILE_STACK_EDITOR_B2_BASE,...row(record[0],bytes)}};
  });
  const files=approved.map(record=>{const bytes=authenticate(TILE_STACK_EDITOR_B2_SOURCE,record);return {path:record[0],expectedBuffer:bytes,expected:bytes,sourceRow:{commit:TILE_STACK_EDITOR_B2_SOURCE,...row(record[0],bytes)},expectedRow:row(record[0],bytes),adaptations:[]};});
  const byPath=Object.fromEntries(files.map(file=>[file.path,file]));
  assert.deepEqual(files.filter(file=>!file.expectedBuffer.equals(object(TILE_STACK_EDITOR_B2_UI_COPY_CHECKPOINT,file.path))).map(file=>file.path).sort(),expectedUICorrections,'Only the two reviewed UI files may differ from the historical native checkpoint.');
  const uiCorrections=[];
  const uiRows=approvedUI.map(record=>{
    const original=authenticate(TILE_STACK_EDITOR_B2_UI,record),target=record[0].replace('candidates/tile-stack/ui/','apps/editor/tile-stack/ui/'),adaptations=target.endsWith('/panel.js')?uiRelocations:[];
    let text=original.toString('utf8');assert.ok(Buffer.from(text).equals(original));
    for(const {before,after}of adaptations){const from="from '"+before+"'",to="from '"+after+"'";assert.equal(text.split(from).length-1,1,'UI import relocation must occur once.');text=text.replace(from,to);}
    const expected=Buffer.from(text);assert.ok(expected.equals(object(TILE_STACK_EDITOR_B2_UI_COPY_CHECKPOINT,target)),'Historical UI copy must equal fixed8622 plus its declared imports: '+target);
    const file=byPath[target],historicalUICopyRow={commit:TILE_STACK_EDITOR_B2_UI_COPY_CHECKPOINT,...row(target,expected)},literalAdaptations=adaptations.map(value=>({kind:'literal-import-specifier',...value,occurrences:1}));
    if(expectedUICorrections.includes(target)){
      assert.ok(!expected.equals(file.expectedBuffer),'The reviewed UI correction must retain its explicit before/after delta: '+target);
      const correction={kind:'reviewed-fixed-source-ui-correction',sourceCommit:TILE_STACK_EDITOR_B2_SOURCE,before:historicalUICopyRow,after:file.sourceRow};uiCorrections.push(correction);literalAdaptations.push(correction);
    }else assert.ok(expected.equals(file.expectedBuffer),'The unmodified UI contract must retain its original production copy: '+target);
    Object.assign(file,{originRow:{commit:TILE_STACK_EDITOR_B2_UI,...row(record[0],original)},historicalUICopyRow,adaptations:literalAdaptations});
    return {source:record[0],target,sourceBytes:original.length,sourceSha256:sha(original),bytes:expected.length,sha256:sha(expected),adaptations};
  });
  const uiSource=byPath['docs/reviews/tile-stack/editor/b2/ui-source.json'],uiMetadata={version:1,sourceCommit:TILE_STACK_EDITOR_B2_UI,productionOnly:true,fixtureAdapterCopied:false,files:uiRows};
  assert.ok(Buffer.from(JSON.stringify(uiMetadata,null,2)+'\n').equals(uiSource.expectedBuffer),'B2 UI origin/relocation record must be exact and closed.');
  const build=byPath['tools/build.mjs'],buildBase=frozen.find(record=>record[0]===build.path),before=authenticate(TILE_STACK_EDITOR_B2_BASE,buildBase).toString('utf8');
  assert.equal(before.split(buildMarker).length-1,1);assert.equal(before.includes(TILE_STACK_EDITOR_B2_BUILD_LINE),false);
  const expectedBuild=Buffer.from(before.replace(buildMarker,buildMarker+'\n'+TILE_STACK_EDITOR_B2_BUILD_LINE));assert.ok(expectedBuild.equals(build.expectedBuffer),'Build may add only the one authorized recursive cpSync line.');
  Object.assign(build,{originRow:{commit:TILE_STACK_EDITOR_B2_BASE,...row(build.path,object(TILE_STACK_EDITOR_B2_BASE,build.path))},adaptations:[{kind:'literal-build-line-insertion',after:buildMarker,line:TILE_STACK_EDITOR_B2_BUILD_LINE,occurrences:1}]});
  const sharedOverrides=Object.fromEntries(['input','session'].map(name=>{const file=byPath['apps/editor/smart-tile/'+name+'.js'];file.role='B2-shared-host-override';file.preB2Row={commit:TILE_STACK_EDITOR_B2_BASE,...row(file.path,object(TILE_STACK_EDITOR_B2_BASE,file.path))};return [file.path,file];}));
  const b1StackOverrides=Object.fromEntries(b1.newFiles.map(old=>{
    const file=byPath[old.path];assert.ok(file,'All nine B1 host modules must remain explicit.');file.role='B1-stack-host-current';file.b1Provenance={sourceRow:old.source,adaptations:old.adaptations,currentRow:old.current};file.preB2Row={commit:TILE_STACK_EDITOR_B2_BASE,...row(file.path,old.expected)};return [file.path,file];
  }));
  assert.deepEqual(Object.values(b1StackOverrides).filter(file=>file.expectedRow.sha256!==file.preB2Row.sha256).map(file=>file.path).sort(),expectedB1Changes);
  const stackFiles=files.filter(file=>file.path.startsWith('apps/editor/tile-stack/'));assert.equal(stackFiles.length,17);
  for(const file of files)file.role??=file.path.startsWith('apps/editor/tile-stack/ui/')?'borrowed-stack-ui':file.path.startsWith('apps/editor/tile-stack/')?'new-stack-host':file.path.startsWith('examples/')?'isolated-B2-example':file===build?'one-line-build-authorization':'UI-source-provenance';
  const runtimeFiles=files.filter(file=>file.path.startsWith('apps/')||file.path.startsWith('examples/')),newFiles=files.filter(file=>file.role==='new-stack-host'||file.role==='borrowed-stack-ui'||file.role==='isolated-B2-example'||file.role==='UI-source-provenance');
  const compact=file=>{const {expected,expectedBuffer,...record}=file;return record;};
  const metadata={kind:'nautilus-tile-stack-editor-b2-source-record',version:1,status:TILE_STACK_EDITOR_B2_STATUS,sourceCommit:TILE_STACK_EDITOR_B2_SOURCE,reviewedRuntimeCheckpoint:TILE_STACK_EDITOR_B2_RUNTIME_CHECKPOINT,integrationBase:TILE_STACK_EDITOR_B2_BASE,b1SourceCommit:b1Source,historicalSourceCommit:historicalSource,uiOrigin:TILE_STACK_EDITOR_B2_UI,historicalUICopyCheckpoint:TILE_STACK_EDITOR_B2_UI_COPY_CHECKPOINT,uiCorrections,scope:'Reviewed fixed-source authentication for the native B2 isolated host, including separately attributed UI corrections; not final browser or installed-proof acceptance, game adoption, or a public export/schema change.',historical:historical.map(file=>file.sourceRow),sharedOverrides:2,b1StackFiles:9,changedB1StackFiles:expectedB1Changes,newStackFiles:8,stackNamespaceFiles:17,exampleFiles:2,buildAdaptations:1,privatePlannerRuntimeCopied:false,UIFixtureAdapterCopied:false,files:files.map(compact)};
  const metadataBytes=Buffer.from(JSON.stringify(metadata,null,2)+'\n');
  return {status:TILE_STACK_EDITOR_B2_STATUS,sourceCommit:TILE_STACK_EDITOR_B2_SOURCE,b1SourceCommit:b1Source,historicalSourceCommit:historicalSource,uiOrigin:TILE_STACK_EDITOR_B2_UI,historicalUICopyCheckpoint:TILE_STACK_EDITOR_B2_UI_COPY_CHECKPOINT,uiCorrections,files,runtimeFiles,sharedOverrides,b1StackOverrides,stackFiles,newFiles,build,uiSource,historical,b1,metadata:{path:TILE_STACK_EDITOR_B2_METADATA,expectedBuffer:metadataBytes,expected:metadataBytes,expectedRow:row(TILE_STACK_EDITOR_B2_METADATA,metadataBytes)},requiredGitCommits:[...new Set([TILE_STACK_EDITOR_B2_SOURCE,TILE_STACK_EDITOR_B2_RUNTIME_CHECKPOINT,TILE_STACK_EDITOR_B2_UI_COPY_CHECKPOINT,TILE_STACK_EDITOR_B2_BASE,b1Source,base250,TILE_STACK_EDITOR_B2_UI])]};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);let projectRoot=defaultRoot,explicitRoot=false,write=false;
  for(let index=0;index<args.length;index++){
    if(args[index]==='--write'){assert.equal(write,false,'Duplicate --write.');write=true;}
    else if(args[index]==='--root'){assert.equal(explicitRoot,false,'Duplicate --root.');assert.ok(typeof args[index+1]==='string'&&!args[index+1].startsWith('--'),'Supply --root PROJECT.');projectRoot=path.resolve(args[++index]);explicitRoot=true;}
    else assert.fail('Use --root PROJECT and optional --write only.');
  }
  if(write)assert.ok(explicitRoot,'Metadata authoring requires an explicit --root PROJECT.');
  const model=tileStackEditorB2SourceModel({projectRoot});
  if(write){const file=path.join(projectRoot,model.metadata.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,model.metadata.expectedBuffer);}
  console.log(JSON.stringify({status:model.status,sourceCommit:model.sourceCommit,files:model.files.length,stackFiles:model.stackFiles.length,b1StackFiles:Object.keys(model.b1StackOverrides).length,sharedOverrides:Object.keys(model.sharedOverrides).length,metadata:model.metadata.expectedRow,written:write},null,2));
}
