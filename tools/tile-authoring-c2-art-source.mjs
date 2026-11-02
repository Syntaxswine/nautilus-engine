// Authenticate the fixed private renderer relocation, independently of live readiness.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {tileAuthoringC2ViewsSource} from './tile-authoring-c2-views-source.mjs';

const source='e74df31fa9a4fdabd16ff9c5c018138bdc286ea5';
const metadataPath='apps/editor/tile-authoring/c2/art/source.json';
const metadataSha='46ae2ab734fd4c0a20c84710a3fb23d6c94d7d4e9cf6d644ce48a63b9ab9c511';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');

export function tileAuthoringC2ArtSources({object,projectRoot}){
 assert.ok(fs.existsSync(path.join(projectRoot,metadataPath)),'The pinned renderer manifest is required by the registered C2 source profile');
 const metadata=fs.readFileSync(path.join(projectRoot,metadataPath));
 assert.equal(sha(metadata),metadataSha,'Unreviewed private renderer relocation manifest');
 const record=JSON.parse(metadata);
 assert.equal(record.sourceCommit,source);assert.equal(record.runtimeModules,29);
 assert.equal(record.sharedViewManager,'apps/editor/smart-tile/views.js');
 assert.equal(record.sharedThreeEntry,'packages/render-effects/three.js');
 assert.equal(record.publicRegistration,false);assert.equal(record.workflowAcceptance,false);
 const files=[],borrowedFiles=[];
 const original=row=>{
  const bytes=object(row.commit,row.path);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);assert.equal(blob(bytes),row.gitBlob);return bytes;
 };
 for(const row of [...record.runtime,...record.support]){
  let bytes=original(row.source);
  if(row.rewrites.length){let text=bytes.toString('utf8');for(const edit of row.rewrites){assert.equal(text.split(edit.from).length-1,edit.occurrences);text=text.replace(edit.from,edit.to);}bytes=Buffer.from(text);}
  assert.equal(bytes.length,row.expected.bytes);assert.equal(sha(bytes),row.expected.sha256);
  files.push({path:row.path,expectedBuffer:bytes,bytes:bytes.length,sha256:sha(bytes),sourceCommit:row.source.commit,sourcePath:row.source.path,rewrites:row.rewrites,role:row.role});
 }
 files.push({path:metadataPath,expectedBuffer:metadata,bytes:metadata.length,sha256:metadataSha,role:'Exact reviewed renderer relocation record'});
 assert.equal(files.length,44);assert.equal(new Set(files.map(row=>row.path)).size,44);
 const views=tileAuthoringC2ViewsSource({object,projectRoot});
 for(const row of record.borrowed){
  original(row.source);
  const bytes=fs.readFileSync(path.join(projectRoot,row.path));
  let expected=row.expected;
  if(row.path===views.file){assert.equal(row.expected.bytes,views.override.before.length);assert.equal(row.expected.sha256,views.override.baseSha256);expected={bytes:views.override.expectedBuffer.length,sha256:views.override.sha256};}
  assert.equal(bytes.length,expected.bytes,'Changed borrowed renderer dependency: '+row.path);assert.equal(sha(bytes),expected.sha256,'Changed borrowed renderer dependency: '+row.path);
  borrowedFiles.push({path:row.path,bytes:bytes.length,sha256:sha(bytes),gitBlob:blob(bytes)});
 }
 for(const row of record.existingAssets){
  const bytes=original(row.source);assert.ok(fs.readFileSync(path.join(projectRoot,row.path)).equals(bytes),'Changed original renderer asset: '+row.path);
  borrowedFiles.push({path:row.path,bytes:bytes.length,sha256:sha(bytes),gitBlob:blob(bytes)});
 }
 for(const row of record.publicMetadata){
  let text=original(row.source).toString('utf8');for(const edit of row.rewrites){assert.equal(text.split(edit.from).length-1,edit.occurrences);text=text.replace(edit.from,edit.to);}
  const bytes=Buffer.from(text);assert.equal(bytes.length,row.expected.bytes);assert.equal(sha(bytes),row.expected.sha256);
  assert.ok(fs.readFileSync(path.join(projectRoot,row.path)).equals(bytes),'Changed borrowed renderer metadata: '+row.path);
  borrowedFiles.push({path:row.path,bytes:bytes.length,sha256:sha(bytes),gitBlob:blob(bytes)});
 }
 return {files,borrowedFiles,requiredGitCommits:[...record.requiredGitCommits,...views.requiredGitCommits]};
}
