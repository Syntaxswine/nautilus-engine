import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {tileSurfaceCorrection,TILE_SURFACE_CORRECTION_BASE} from './tile-surface-corrections.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function checkSmartTileEditorSource(project=root,{tracked=null}={}){
  const objects=new Map(),object=(commit,file)=>{const key=commit+':'+file;if(!objects.has(key))objects.set(key,execFileSync('git',['-c','safe.directory='+path.resolve(project).replaceAll('\\','/'),'-C',project,'show',key],{windowsHide:true,timeout:30000,maxBuffer:24*1024*1024}));return objects.get(key);};
  const surfaceCorrection=tileSurfaceCorrection({object});
  const historical=file=>{const bytes=fs.readFileSync(path.join(project,file));assert.ok(bytes.equals(object(TILE_SURFACE_CORRECTION_BASE,file)),'Historical Smart Tile manifest changed: '+file);return JSON.parse(bytes);};
  const record=historical('docs/reviews/smart-tile-editor/sources.json');
  assert.equal(record.version,1);assert.equal(record.runtime.commit,'0fbc5c3630e257dfcd7a6ea82027634dfe6989b6');assert.equal(record.ui.commit,'e4196e43da9f7c480817b9ae22e237451d3c7a86');assert.equal(record.foundation,'8aac00de19c80c1143945b4dd4f2a88e59e86013');
  const integrationPath='docs/reviews/smart-tile-editor/integration-sources.json',integration=historical(integrationPath);
  assert.equal(integration.version,1);assert.equal(integration.sourceCommit,'9e996f96b69ba4867e643b558e9fdfeaf752d19e');assert.equal(integration.files.length,15);
  for(const [file,override]of Object.entries(surfaceCorrection.overrides))assert.deepEqual(record.runtime.files.filter(row=>row.path===file),[override.originalRow],'Original Smart Tile runtime row changed: '+file);
  if(tracked)for(const file of ['docs/reviews/smart-tile-editor/sources.json',integrationPath])assert.ok(tracked.has(file),'Untracked Smart Tile source record: '+file);
  for(const group of [record.runtime,record.ui,integration])for(const row of group.files){
    if(tracked)assert.ok(tracked.has(row.path),'Untracked Smart Tile source: '+row.path);
    assert.equal(path.posix.normalize(row.path),row.path);assert.ok(!row.path.startsWith('/')&&!row.path.includes('\\')&&!row.path.split('/').includes('..'));const file=path.join(project,row.path);assert.equal(fs.lstatSync(file).isSymbolicLink(),false);
    const bytes=fs.readFileSync(file),override=group===record.runtime?surfaceCorrection.overrides[row.path]:null;
    if(override)assert.ok(bytes.equals(override.expected),'Only the reviewed provider correction may override the historical runtime row: '+row.path);
    else {assert.equal(bytes.length,row.bytes,'Changed fixed source: '+row.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,'Changed fixed source: '+row.path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlob,'Changed Git-object source: '+row.path);}
  }
  const runtimeOverrides=Object.entries(surfaceCorrection.overrides).map(([file,override])=>({path:file,original:override.originalRow,current:{bytes:override.expected.length,sha256:createHash('sha256').update(override.expected).digest('hex')}}));
  assert.equal(record.ui.files.length,10);assert.ok(record.runtime.files.length>20);return {runtimeFiles:record.runtime.files.length,uiFiles:record.ui.files.length,hostFiles:integration.files.length,sourceCommit:integration.sourceCommit,foundation:record.foundation,runtimeCorrections:[surfaceCorrection.correction],runtimeOverrides,requiredGitCommits:surfaceCorrection.requiredGitCommits};
}
