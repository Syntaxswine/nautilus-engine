// Read-only historical Smart Tile/B1/B2 plus fixed C1 source authentication.
// Integrity is read-only. Source quality/browser acceptance is a separate review.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {tileSurfaceCorrection,TILE_SURFACE_CORRECTION_BASE} from './tile-surface-corrections.mjs';
import {tileAuthoringEditorSourceModel} from './tile-authoring-editor-source.mjs';
import {sharedArtworkBuildBytes,SHARED_ARTWORK_BASE} from './shared-artwork-registration.mjs';
import {tileAuthoringC2EditorSources} from './tile-authoring-c2-editor-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const compact=file=>{const {expected,expectedBuffer,...record}=file;return record;};

export function checkSmartTileEditorSource(project=root,{tracked=null}={}){
  const objects=new Map(),object=(commit,file)=>{const key=commit+':'+file;if(!objects.has(key))objects.set(key,execFileSync('git',['-c','safe.directory='+path.resolve(project).replaceAll('\\','/'),'-C',project,'show',key],{windowsHide:true,timeout:30000,maxBuffer:24*1024*1024}));return objects.get(key);};
  const indexed=(file,expected)=>{if(!tracked)return;assert.ok(tracked.has(file),'Untracked reviewed Editor source: '+file);assert.ok(object('',file).equals(expected),'Index changes reviewed Editor bytes: '+file);};
  const c2=tileAuthoringC2EditorSources({object,projectRoot:project,indexed});
  const surface=tileSurfaceCorrection({object}),c1=tileAuthoringEditorSourceModel({object,projectRoot:project}),b2=c1.b2,b1=b2.b1;
  const artworkBuild=sharedArtworkBuildBytes({object});assert.ok(artworkBuild.before.equals(c1.buildAdaptation.expectedBuffer),'Artwork build preimage must be the accepted C1 build');
  function current(file,expected){
    const override=c2.overrides[file];
    if(override){assert.ok(expected.equals(override.before),'C2 override must start at the exact authenticated C1 body: '+file);expected=override.expectedBuffer;}
    assert.equal(path.posix.normalize(file),file);assert.ok(!file.startsWith('/')&&!file.includes('\\')&&!file.split('/').includes('..'));
    const absolute=path.join(project,file);assert.equal(fs.lstatSync(absolute).isSymbolicLink(),false,'Reviewed source is a symlink: '+file);const bytes=fs.readFileSync(absolute);assert.ok(bytes.equals(expected),'Source differs from fixed historical/B1/B2/C1 model: '+file);indexed(file,expected);return bytes;
  }
  const historical=new Map(b2.historical.map(file=>[file.path,current(file.path,file.expectedBuffer)]));
  for(const file of c1.modelInputs)current(file.path,file.expectedBuffer);
  const sourcePath='docs/reviews/smart-tile-editor/sources.json',integrationPath='docs/reviews/smart-tile-editor/integration-sources.json';
  const record=JSON.parse(historical.get(sourcePath)),integration=JSON.parse(historical.get(integrationPath));
  assert.equal(record.version,1);assert.equal(record.runtime.commit,'0fbc5c3630e257dfcd7a6ea82027634dfe6989b6');assert.equal(record.ui.commit,'e4196e43da9f7c480817b9ae22e237451d3c7a86');assert.equal(record.foundation,'8aac00de19c80c1143945b4dd4f2a88e59e86013');
  assert.equal(integration.version,1);assert.equal(integration.sourceCommit,'9e996f96b69ba4867e643b558e9fdfeaf752d19e');assert.equal(integration.files.length,15);
  for(const [file,override]of Object.entries(surface.overrides))assert.deepEqual(record.runtime.files.filter(row=>row.path===file),[override.originalRow],'Original runtime provenance row changed.');
  for(const [file,override]of Object.entries(b1.commonOverrides))assert.deepEqual(integration.files.filter(row=>row.path===file),[override.originalRow],'Original B1 host provenance row changed.');
  // Input was one of the unchanged historical hosts; session already had the
  // explicitly preserved B1 replacement. Do not rewrite either old row.
  const input=b2.sharedOverrides['apps/editor/smart-tile/input.js'],{commit:inputBase,...inputRow}=input.preB2Row;
  assert.equal(inputBase,'d0ecfdfb35110616fbd4c03ad41775acf6a2d163');assert.deepEqual(integration.files.filter(row=>row.path===input.path),[inputRow]);
  const hostOverrides={...b1.commonOverrides,...b2.sharedOverrides,...c1.sharedOverrides};
  for(const group of [record.runtime,record.ui,integration])for(const row of group.files){
    const override=group===record.runtime?surface.overrides[row.path]:group===integration?hostOverrides[row.path]:null;
    if(override)current(row.path,override.expectedBuffer??override.expected);
    else if(c2.overrides[row.path]){
      const before=c2.overrides[row.path].before;assert.equal(before.length,row.bytes,'Changed historical preimage length: '+row.path);assert.equal(sha(before),row.sha256,'Changed historical preimage: '+row.path);assert.equal(createHash('sha1').update('blob '+before.length+'\0').update(before).digest('hex'),row.gitBlob);current(row.path,before);
    }else{
      assert.equal(path.posix.normalize(row.path),row.path);assert.ok(!row.path.startsWith('/')&&!row.path.includes('\\')&&!row.path.split('/').includes('..'));const absolute=path.join(project,row.path);assert.equal(fs.lstatSync(absolute).isSymbolicLink(),false);
      const bytes=fs.readFileSync(absolute);assert.equal(bytes.length,row.bytes,'Changed historical source: '+row.path);assert.equal(sha(bytes),row.sha256,'Changed historical source: '+row.path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlob);indexed(row.path,bytes);
    }
  }
  function namespace(directory='apps/editor/tile-stack'){
    return fs.readdirSync(path.join(project,directory),{withFileTypes:true}).flatMap(entry=>{const file=directory+'/'+entry.name;assert.equal(entry.isSymbolicLink(),false,'Stack source namespace symlink: '+file);return entry.isDirectory()?namespace(file):/\.(?:m?js|css)$/.test(entry.name)?[file]:[];}).sort();
  }
  assert.deepEqual(namespace(),b2.stackFiles.map(file=>file.path).sort(),'Only the explicit fixed recursive B2 JS/CSS namespace is authorized.');
  for(const file of [...b2.files,b2.metadata])current(file.path,file.path==='tools/build.mjs'?artworkBuild.expected:(c1.currentOverrides[file.path]??file).expectedBuffer);
  assert.deepEqual(namespace('apps/editor/tile-authoring'),[...c1.namespaceFiles,...c2.namespaceFiles].map(file=>file.path).sort(),'Only the explicit fixed C1 and authenticated C2 namespaces are authorized.');
  for(const file of [...c1.files,...c1.coreFiles,...c1.dependencyEvidenceFiles,...c1.helperFiles,...c1.oracleDependencies,c1.metadata])current(file.path,file.path==='tools/build.mjs'?artworkBuild.expected:file.expectedBuffer);
  for(const file of c2.files)current(file.path,file.expectedBuffer);
  const runtimeOverrides=Object.entries(surface.overrides).map(([file,override])=>({path:file,original:override.originalRow,current:{bytes:override.expected.length,sha256:sha(override.expected)}}));
  assert.equal(record.runtime.files.length,131);assert.equal(record.ui.files.length,10);
  return {status:'pass',sourceModelStatus:c1.status,sourceCommit:c1.sourceCommit,runtimeCheckpoint:c1.runtimeCheckpoint,codeCheckpoint:c1.codeCheckpoint,sourceSourceHash:c1.sourceSourceRow.sha256,scopedCorrectnessAccepted:true,finalWorkflowAccepted:false,tailPerformanceAccepted:false,visualCleanupAccepted:false,b2SourceCommit:b2.sourceCommit,coreSourceCommit:c1.coreSource,coreEvidenceCommit:c1.coreEvidence,authoringUIOrigin:c1.uiOrigin,b1SourceCommit:b2.b1SourceCommit,historicalSourceCommit:integration.sourceCommit,foundation:record.foundation,runtimeFiles:131,uiFiles:10,historicalHostFiles:15,hostFiles:15,hostOverrides:Object.values(hostOverrides).map(compact),b1StackHostFiles:9,changedB1StackFiles:3,stackNamespaceFiles:b2.stackFiles.length,newStackHostFiles:8,stackUIOrigin:b2.uiOrigin,stackUIFiles:3,exampleFiles:2,buildAdaptations:1,historicalMetadata:b2.historical.map(file=>file.sourceRow),b1SourceMetadata:b1.metadata.current,b2SourceMetadata:b2.metadata.expectedRow,authoringSourceMetadata:c1.metadata.expectedRow,authoringHostFiles:7,authoringNamespaceFiles:10,authoringCurrentNamespaceFiles:c1.namespaceFiles.length+c2.namespaceFiles.length,authoringUIFiles:3,authoringUIOriginFiles:9,authoringExamples:2,authoringCoreFiles:13,authoringCoreEvidenceFiles:1,authoringHelperInputFiles:3,authoringOwnedFiles:39,authoringEditorMetadataFiles:9,authoringUIMetadataFiles:4,authoringArchivedEditorProofInputs:8,authoringCurrentEditorProofInputs:8,authoringSuccessorEvidenceFiles:2,authoringNamedNodeOracle:c1.successorImport.testTooling,authoringSharedRuntimeFiles:c1.sharedRuntimeFiles,authoringSharedRuntimeOverrides:2,authoringBuildAdaptations:1,runtimeCorrections:[surface.correction],c2EditorContributionAuthentication:{enabled:c2.enabled,status:c2.status??'not-present',scope:'Exact imported files and explicit UI body only; actual overlay authoring is separately gated',files:c2.files.map(compact),overrides:Object.values(c2.overrides).map(file=>({path:file.path,sha256:file.sha256,baseCommit:file.baseCommit,baseSha256:file.baseSha256,role:file.role}))},sharedArtworkBuildAdaptation:{base:SHARED_ARTWORK_BASE,beforeSha256:sha(artworkBuild.before),sha256:sha(artworkBuild.expected),scope:artworkBuild.scope},runtimeOverrides,requiredGitCommits:[...new Set([SHARED_ARTWORK_BASE,...surface.requiredGitCommits,...c1.requiredGitCommits,...c2.requiredGitCommits])],scope:'Final fixed f9/fd C1 source authentication: codec1e8, UI8053 and current eight Node proof inputs. Historical191/188 and all old B1/B2 records remain exact; only two shared runtime overrides and one build line are authorized. Final workflow/visual/performance/browser acceptance remains separately gated.'};
}
