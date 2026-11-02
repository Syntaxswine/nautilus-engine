// Fixed B1 host promotion only. Expected bytes come from immutable Git objects,
// never from current runtime files. Importing or constructing the model writes nothing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const TILE_STACK_EDITOR_SOURCE='4b0499cc776fcd85fdd415fa7344982b75fbf8fb';
export const TILE_STACK_EDITOR_BASE='2502646482218524fd5129641da769bb82462e4d';
export const TILE_STACK_EDITOR_HISTORICAL_SOURCE='9e996f96b69ba4867e643b558e9fdfeaf752d19e';
export const TILE_STACK_EDITOR_METADATA='docs/reviews/tile-stack/architect/b1-sources.json';
const historicalPath='docs/reviews/smart-tile-editor/integration-sources.json';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const row=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes),gitBlob:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')});
const common=['checkpoint','authority','storage','session'];
const approved=[
  ['apps/editor/smart-tile/checkpoint.js',21438,'f8b9f9c92c604a45635d97d2b789e53932a4d006e43ffc2e1f0b92bf1bc42538','2402c19763e3f531e0d4dcf6ea6d0ea4dc7511f9'],
  ['apps/editor/smart-tile/authority.js',3349,'28e9fa2250c21919abe6f9b9cf0790886014cf2ef90fd24d77bf9cee6d86db91','c74807bcdbbca2a43cf706f0194d6b14f6d1d380'],
  ['apps/editor/smart-tile/storage.js',1598,'23b9bbc2bd8a8e857a233fd58f7ff1f3b2cb822ab5674d17efcd66a1c091fdcc','51b39844a261ff50009575e659b829c334eee4b0'],
  ['apps/editor/smart-tile/session.js',22401,'eac73ec6ad84b404d4d84c22b69b56ea3a908e46ab7e7658fc95217546e375a9','00d216531377a2389497e30896f7c9c9b608a83d'],
  ['apps/editor/tile-stack/checkpoint.js',5874,'b6cbfe1766857fc2889bcdf55037d85546b08e5efc3157a34acf824418bbdef1','916e253eef48af838cffe00d45de2f8ea13f1989'],
  ['apps/editor/tile-stack/profile.js',8003,'b4fc35ead479927f1f1f22037e86fb93daeda694b3c17c23954b6b5fdd0bc198','d420bec092f7aa97303f712b0ec705739b63d8d2'],
  ['apps/editor/tile-stack/seed.js',1178,'f8d9ba2baea50ac8b31539e962400aa9d3e60c650ebabb6fde58e3eae9c41d6f','0c5a2c75d3ef5c9212574fdc5e33156f1d1b6c9b'],
  ['apps/editor/tile-stack/session.js',534,'9dc1d5652a64c0b4ad3dcefd1de0d5b4ae4d4e7d999399db47801b0352b5f3b8','80d59afe3764d219dd8b40657e11cde194562ab3'],
  ['candidates/tile-stack/editor/contract.js',3648,'16f73e84554dac475b93c52fa2df77484433bfe4b6ce8687aaffd80053ef0c56','64ff38c6c035c0d790a71880645dfd6b33d0dd76'],
  ['candidates/tile-stack/editor/floors.js',5505,'33d6d47d1e421757ac79d03b43aaaf43803f255a5a83d408d1b140ab49467b5e','112f90424e1e19d6879a9ba12fb254a84186f2f9'],
  ['candidates/tile-stack/editor/policy.js',9384,'656386083877aae26ba21a0994ed2f22f8fd43ea4444355b88c6723610e016a8','b6f5e8230722778a94fce19e2edcbc078fd58617'],
  ['candidates/tile-stack/editor/planner-seam.js',5057,'c797268433ceb155ccff487c0ed08ecfbc2840ae41903faae9c082c9cab7088e','901c2d9f818e2dc92ca868559084206404c2c28c'],
  ['candidates/tile-stack/editor/finish-menu.js',1794,'937e3d264b303f8dcc144d805e0b778a3a4c1e4d1a4c050276f280bd870bb948','b960da24117b52de687b2586fc29d12820a4516c']
];
const editor=name=>['../../../candidates/tile-stack/editor/'+name+'.js','./'+name+'.js'];
const shared=name=>['../../../apps/editor/smart-tile/'+name+'.js','../smart-tile/'+name+'.js'];
const rewrites={
  'apps/editor/tile-stack/checkpoint.js':[editor('policy'),['../../../candidates/tile-stack/core/contracts.js','../../../packages/tile-stack-core/contracts.js']],
  'apps/editor/tile-stack/profile.js':[editor('contract'),editor('planner-seam'),editor('finish-menu'),['../../../candidates/tile-stack/core/index.js','../../../packages/tile-stack-core/index.js']],
  'apps/editor/tile-stack/seed.js':[editor('floors')],
  'candidates/tile-stack/editor/contract.js':[shared('contract'),shared('checkpoint')],
  'candidates/tile-stack/editor/floors.js':[shared('checkpoint')],
  'candidates/tile-stack/editor/policy.js':[shared('checkpoint')],
  'candidates/tile-stack/editor/planner-seam.js':[shared('checkpoint')],
  'candidates/tile-stack/editor/finish-menu.js':[shared('checkpoint')]
};
const gitObject=(commit,file)=>execFileSync('git',['-c','safe.directory='+project.replaceAll('\\','/'),'-C',project,'show',commit+':'+file],{windowsHide:true,timeout:30000,maxBuffer:24*1024*1024});

// files: [{path, expected:Buffer, source:{commit,path,bytes,sha256,gitBlob},
//          current:{path,bytes,sha256,gitBlob}, adaptations, role, originalRow?}]
// metadata.expected is the sole authoring-CLI output. No runtime is copied here.
export function tileStackEditorSourceModel({object=gitObject}={}){
  assert.equal(typeof object,'function');
  const historicalBytes=object(TILE_STACK_EDITOR_BASE,historicalPath);assert.ok(Buffer.isBuffer(historicalBytes));
  assert.equal(sha(historicalBytes),'66fd89ec315e766994885e08c0bd260a9668be98182abc765157cfc61afa2d62','Historical host manifest changed.');
  const historical=JSON.parse(historicalBytes);assert.equal(historical.version,1);assert.equal(historical.sourceCommit,TILE_STACK_EDITOR_HISTORICAL_SOURCE);assert.equal(historical.files.length,15);
  const files=approved.map(([sourcePath,bytes,sha256,gitBlob])=>{
    const raw=object(TILE_STACK_EDITOR_SOURCE,sourcePath);assert.ok(Buffer.isBuffer(raw));assert.deepEqual(row(sourcePath,raw),{path:sourcePath,bytes,sha256,gitBlob},'Fixed B1 source differs: '+sourcePath);
    let text=raw.toString('utf8');assert.ok(Buffer.from(text,'utf8').equals(raw),'B1 sources must be exact UTF-8.');
    const adaptations=[];
    for(const [from,to]of rewrites[sourcePath]??[]){
      const before="from '"+from+"'",after="from '"+to+"'";assert.equal(text.split(before).length-1,1,'Literal import must occur exactly once: '+sourcePath+' '+from);
      assert.equal([...text.matchAll(/\bfrom\s+(['"])([^'"]+)\1/g)].filter(match=>match[2]===from).length,1);
      text=text.replace(before,after);adaptations.push({kind:'literal-import-specifier',from,to,occurrences:1});
    }
    assert.equal(text.includes('../../../candidates/tile-stack/'),false,'Promoted host must use the registered planner and local policy.');
    const target=sourcePath.replace(/^candidates\/tile-stack\/editor\//,'apps/editor/tile-stack/'),expected=Buffer.from(text,'utf8'),isCommon=common.some(name=>target==='apps/editor/smart-tile/'+name+'.js');
    const value={path:target,expected,source:{commit:TILE_STACK_EDITOR_SOURCE,...row(sourcePath,raw)},current:row(target,expected),adaptations,role:isCommon?'historical-common-host-override':'new-stack-host'};
    if(isCommon){const original=object(TILE_STACK_EDITOR_BASE,target);assert.ok(Buffer.isBuffer(original));value.originalRow=row(target,original);assert.deepEqual(historical.files.filter(record=>record.path===target),[value.originalRow],'Original historical host row differs: '+target);assert.equal(adaptations.length,0);assert.ok(expected.equals(raw));}
    return value;
  });
  assert.equal(files.length,13);assert.equal(new Set(files.map(file=>file.path)).size,13);assert.equal(files.filter(file=>file.role==='historical-common-host-override').length,4);assert.equal(files.filter(file=>file.role==='new-stack-host').length,9);
  const metadata={kind:'nautilus-tile-stack-editor-b1-source-record',version:1,sourceCommit:TILE_STACK_EDITOR_SOURCE,integrationBase:TILE_STACK_EDITOR_BASE,historicalSourceCommit:TILE_STACK_EDITOR_HISTORICAL_SOURCE,historicalManifest:row(historicalPath,historicalBytes),scope:'Reviewed headless B1 shared codec/session plus local document/planner policies only. Future B2 input, Artist/presentation and browser integration are not authorized by this record.',historicalHostFiles:15,commonHostOverrides:4,newStackHostFiles:9,privatePlannerRuntimeCopied:false,newPublicExports:false,plannerDependencies:[{path:'packages/tile-stack-core/index.js',entry:'./tiles/stack',role:'actual registered stack planner'},{path:'packages/tile-stack-core/contracts.js',role:'explicit engine-app internal dependency; no new public export'}],files:files.map(({expected,...record})=>record)};
  const metadataBytes=Buffer.from(JSON.stringify(metadata,null,2)+'\n');
  return {sourceCommit:TILE_STACK_EDITOR_SOURCE,historicalSourceCommit:TILE_STACK_EDITOR_HISTORICAL_SOURCE,files,commonOverrides:Object.fromEntries(files.filter(file=>file.role==='historical-common-host-override').map(file=>[file.path,file])),newFiles:files.filter(file=>file.role==='new-stack-host'),historicalManifest:{path:historicalPath,expected:historicalBytes,record:metadata.historicalManifest},metadata:{path:TILE_STACK_EDITOR_METADATA,expected:metadataBytes,current:row(TILE_STACK_EDITOR_METADATA,metadataBytes)},requiredGitCommits:[TILE_STACK_EDITOR_SOURCE,TILE_STACK_EDITOR_BASE]};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  assert.ok(process.argv.slice(2).every(value=>value==='--write'),'Only explicit --write metadata authoring is supported.');
  const model=tileStackEditorSourceModel();
  if(process.argv.includes('--write')){const target=path.join(project,model.metadata.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,model.metadata.expected);}
  console.log(JSON.stringify({sourceCommit:model.sourceCommit,historicalSourceCommit:model.historicalSourceCommit,runtimeFiles:model.files.length,newStackHostFiles:model.newFiles.length,metadata:model.metadata.current,written:process.argv.includes('--write')},null,2));
}
