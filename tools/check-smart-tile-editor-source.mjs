import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {tileSurfaceCorrection,TILE_SURFACE_CORRECTION_BASE} from './tile-surface-corrections.mjs';
import {tileStackEditorSourceModel} from './tile-stack-editor-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function checkSmartTileEditorSource(project=root,{tracked=null}={}){
  const objects=new Map(),object=(commit,file)=>{const key=commit+':'+file;if(!objects.has(key))objects.set(key,execFileSync('git',['-c','safe.directory='+path.resolve(project).replaceAll('\\','/'),'-C',project,'show',key],{windowsHide:true,timeout:30000,maxBuffer:24*1024*1024}));return objects.get(key);};
  const surfaceCorrection=tileSurfaceCorrection({object}),stackEditor=tileStackEditorSourceModel({object});
  const indexed=(file,expected)=>{if(!tracked)return;assert.ok(tracked.has(file),'Untracked Smart Tile source: '+file);assert.ok(object('',file).equals(expected),'The index changes reviewed Smart Tile bytes: '+file);};
  const historical=file=>{const bytes=fs.readFileSync(path.join(project,file));assert.ok(bytes.equals(object(TILE_SURFACE_CORRECTION_BASE,file)),'Historical Smart Tile manifest changed: '+file);indexed(file,bytes);return JSON.parse(bytes);};
  const record=historical('docs/reviews/smart-tile-editor/sources.json');
  assert.equal(record.version,1);assert.equal(record.runtime.commit,'0fbc5c3630e257dfcd7a6ea82027634dfe6989b6');assert.equal(record.ui.commit,'e4196e43da9f7c480817b9ae22e237451d3c7a86');assert.equal(record.foundation,'8aac00de19c80c1143945b4dd4f2a88e59e86013');
  const integrationPath='docs/reviews/smart-tile-editor/integration-sources.json',integration=historical(integrationPath);
  assert.equal(integration.version,1);assert.equal(integration.sourceCommit,'9e996f96b69ba4867e643b558e9fdfeaf752d19e');assert.equal(integration.files.length,15);
  for(const [file,override]of Object.entries(surfaceCorrection.overrides))assert.deepEqual(record.runtime.files.filter(row=>row.path===file),[override.originalRow],'Original Smart Tile runtime row changed: '+file);
  for(const [file,override]of Object.entries(stackEditor.commonOverrides))assert.deepEqual(integration.files.filter(row=>row.path===file),[override.originalRow],'Original historical host row changed: '+file);
  if(tracked)for(const file of ['docs/reviews/smart-tile-editor/sources.json',integrationPath])assert.ok(tracked.has(file),'Untracked Smart Tile source record: '+file);
  for(const group of [record.runtime,record.ui,integration])for(const row of group.files){
    if(tracked)assert.ok(tracked.has(row.path),'Untracked Smart Tile source: '+row.path);
    assert.equal(path.posix.normalize(row.path),row.path);assert.ok(!row.path.startsWith('/')&&!row.path.includes('\\')&&!row.path.split('/').includes('..'));const file=path.join(project,row.path);assert.equal(fs.lstatSync(file).isSymbolicLink(),false);
    const bytes=fs.readFileSync(file),override=group===record.runtime?surfaceCorrection.overrides[row.path]:group===integration?stackEditor.commonOverrides[row.path]:null;
    if(override)assert.ok(bytes.equals(override.expected),'Only the exact reviewed provider/B1 override may replace the historical source row: '+row.path);
    else {assert.equal(bytes.length,row.bytes,'Changed fixed source: '+row.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,'Changed fixed source: '+row.path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlob,'Changed Git-object source: '+row.path);}
    indexed(row.path,bytes);
  }
  function stackRuntime(directory='apps/editor/tile-stack'){
    return fs.readdirSync(path.join(project,directory),{withFileTypes:true}).flatMap(entry=>{const file=directory+'/'+entry.name;assert.equal(entry.isSymbolicLink(),false,'Stack host source must not be a symlink: '+file);return entry.isDirectory()?stackRuntime(file):/\.m?js$/.test(entry.name)?[file]:[];}).sort();
  }
  assert.deepEqual(stackRuntime(),stackEditor.newFiles.map(file=>file.path).sort(),'B1 permits exactly nine promoted stack-host runtime files; future B2 needs a separate reviewed record.');
  for(const source of [...stackEditor.newFiles,stackEditor.metadata]){
    const file=path.join(project,source.path);assert.equal(fs.lstatSync(file).isSymbolicLink(),false,'Stack source must be a regular file: '+source.path);const bytes=fs.readFileSync(file);assert.ok(bytes.equals(source.expected),'Stack source must match the immutable B1 model and literal import adaptations: '+source.path);indexed(source.path,source.expected);
  }
  const runtimeOverrides=Object.entries(surfaceCorrection.overrides).map(([file,override])=>({path:file,original:override.originalRow,current:{bytes:override.expected.length,sha256:createHash('sha256').update(override.expected).digest('hex')}}));
  const hostOverrides=Object.values(stackEditor.commonOverrides).map(({expected,...source})=>source),newStackSources=stackEditor.newFiles.map(({expected,...source})=>source);
  assert.equal(record.ui.files.length,10);assert.ok(record.runtime.files.length>20);return {runtimeFiles:record.runtime.files.length,uiFiles:record.ui.files.length,hostFiles:integration.files.length,historicalHostFiles:integration.files.length,newStackHostFiles:stackEditor.newFiles.length,sourceCommit:stackEditor.sourceCommit,historicalSourceCommit:integration.sourceCommit,foundation:record.foundation,hostOverrides,newStackSources,stackSourceMetadata:stackEditor.metadata.current,runtimeCorrections:[surfaceCorrection.correction],runtimeOverrides,requiredGitCommits:[...new Set([...surfaceCorrection.requiredGitCommits,...stackEditor.requiredGitCommits])]};
}
