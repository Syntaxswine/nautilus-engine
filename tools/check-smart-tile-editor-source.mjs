import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function checkSmartTileEditorSource(project=root,{tracked=null}={}){
  const record=JSON.parse(fs.readFileSync(path.join(project,'docs/reviews/smart-tile-editor/sources.json')));
  assert.equal(record.version,1);assert.equal(record.runtime.commit,'0fbc5c3630e257dfcd7a6ea82027634dfe6989b6');assert.equal(record.ui.commit,'e4196e43da9f7c480817b9ae22e237451d3c7a86');assert.equal(record.foundation,'8aac00de19c80c1143945b4dd4f2a88e59e86013');
  const integrationPath='docs/reviews/smart-tile-editor/integration-sources.json',integration=JSON.parse(fs.readFileSync(path.join(project,integrationPath)));
  assert.equal(integration.version,1);assert.equal(integration.sourceCommit,'9e996f96b69ba4867e643b558e9fdfeaf752d19e');assert.equal(integration.files.length,15);
  if(tracked)for(const file of ['docs/reviews/smart-tile-editor/sources.json',integrationPath])assert.ok(tracked.has(file),'Untracked Smart Tile source record: '+file);
  for(const group of [record.runtime,record.ui,integration])for(const row of group.files){
    if(tracked)assert.ok(tracked.has(row.path),'Untracked Smart Tile source: '+row.path);
    assert.equal(path.posix.normalize(row.path),row.path);assert.ok(!row.path.startsWith('/')&&!row.path.includes('\\')&&!row.path.split('/').includes('..'));const file=path.join(project,row.path);assert.equal(fs.lstatSync(file).isSymbolicLink(),false);
    const bytes=fs.readFileSync(file);assert.equal(bytes.length,row.bytes,'Changed fixed source: '+row.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,'Changed fixed source: '+row.path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlob,'Changed Git-object source: '+row.path);
  }
  assert.equal(record.ui.files.length,10);assert.ok(record.runtime.files.length>20);return {runtimeFiles:record.runtime.files.length,uiFiles:record.ui.files.length,hostFiles:integration.files.length,sourceCommit:integration.sourceCommit,foundation:record.foundation};
}
