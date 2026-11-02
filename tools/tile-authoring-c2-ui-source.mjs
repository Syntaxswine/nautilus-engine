// Private reviewed DATA-stage UI continuation; live binding is a separate proof.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const source='938ea1f78d305d86c163f9e4e84033236916e897',metadata='apps/editor/tile-authoring/c2/read-pairing/source.json';
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function tileAuthoringC2UISources({object,projectRoot}){
 const bytes=fs.readFileSync(path.join(projectRoot,metadata));assert.equal(sha(bytes),'f35e259772cacb0b623696c419d8192101749be21b0937a01195be4b9588206e','Unreviewed UI read-pairing relocation record');
 const record=JSON.parse(bytes);assert.equal(record.sourceCommit,source);assert.equal(record.runtimeModules,7);assert.equal(record.workflowAcceptance,false);assert.equal(record.publicRegistration,false);
 const original=r=>{const b=object(r.commit,r.path);assert.equal(b.length,r.bytes);assert.equal(sha(b),r.sha256);assert.equal(blob(b),r.gitBlob);return b;},files=[],borrowedFiles=[];
 for(const row of record.files){let text=original(row.source).toString('utf8');for(const edit of row.rewrites){assert.equal(text.split(edit.from).length-1,edit.occurrences);text=text.split(edit.from).join(edit.to);}const b=Buffer.from(text);assert.equal(b.length,row.expected.bytes);assert.equal(sha(b),row.expected.sha256);files.push({path:row.path,expectedBuffer:b,bytes:b.length,sha256:sha(b),sourceCommit:row.source.commit,sourcePath:row.source.path,rewrites:row.rewrites,role:row.role});}
 for(const derivation of record.derivations){let text=original(derivation.source).toString('utf8');for(const edit of derivation.changes){assert.equal(text.split(edit.from).length,2);text=text.replace(edit.from,edit.to);}assert.ok(Buffer.from(derivation.prefix+text).equals(original(derivation.output)),'Changed reviewed UI source derivation');}
 for(const row of record.borrowed){const b=original(row.source);assert.ok(fs.readFileSync(path.join(projectRoot,row.path)).equals(b),'Changed borrowed UI dependency: '+row.path);borrowedFiles.push({path:row.path,bytes:b.length,sha256:sha(b),gitBlob:blob(b)});}
 const readmePath='candidates/tile-authoring/ui/c2-read-pairing/README.md',readme=object(source,readmePath);
 files.push({path:'docs/reviews/tile-authoring/read-pairing/README.component.md',expectedBuffer:readme,bytes:readme.length,sha256:sha(readme),sourceCommit:source,sourcePath:readmePath,role:'Original component usage and proof boundary'});
 files.push({path:metadata,expectedBuffer:bytes,bytes:bytes.length,sha256:sha(bytes),role:'Exact reviewed UI relocation record'});assert.equal(files.length,9);
 return {files,borrowedFiles,requiredGitCommits:record.requiredGitCommits};
}
