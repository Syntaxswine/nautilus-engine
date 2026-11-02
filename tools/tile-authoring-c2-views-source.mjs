// Exact shared manager correction, independent of native admission or live wiring.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const source='8b4f810727f8feb4d2913619f2471f2d7fa04fce',base='648cad33c3e0e1f36b4313b1492b1a750492ece4';
const file='apps/editor/smart-tile/views.js',metadata='docs/reviews/tile-authoring/architect/c2-views-retirement-source.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function tileAuthoringC2ViewsSource({object,projectRoot}){
 const recordBytes=fs.readFileSync(path.join(projectRoot,metadata));
 assert.equal(sha(recordBytes),'6c8e3d37fef9af2570e89b30073871afa575d8aea372c21b714e7e57f42c0c5a','Unreviewed shared views correction record');
 const record=JSON.parse(recordBytes),before=object(base,file),expectedBuffer=object(source,file);
 assert.equal(record.path,file);assert.equal(record.baseCommit,base);assert.equal(record.sourceCommit,source);
 assert.equal(sha(before),record.baseSha256);assert.equal(sha(expectedBuffer),record.sha256);assert.equal(expectedBuffer.length,record.bytes);
 assert.ok(fs.readFileSync(path.join(projectRoot,file)).equals(expectedBuffer),'Changed reviewed shared views retirement body');
 return {file,metadata:{path:metadata,expectedBuffer:recordBytes,bytes:recordBytes.length,sha256:sha(recordBytes),role:'Exact separate Root shared-view correction record'},override:{path:file,before,expectedBuffer,sha256:record.sha256,baseCommit:base,baseSha256:record.baseSha256,sourceCommit:source,sourcePath:file,role:'Reviewed closure-private same-record retirement continuation; default manager API unchanged'},requiredGitCommits:[base,source]};
}
