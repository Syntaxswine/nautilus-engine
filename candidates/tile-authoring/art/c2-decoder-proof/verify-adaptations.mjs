// Check the exact pinned closure and reproduce each mechanical adaptation in memory.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url)),project=path.resolve(root,'../../../..'),input=JSON.parse(fs.readFileSync(path.join(root,'inputs.json'))),adaptations=JSON.parse(fs.readFileSync(path.join(root,'adaptations.json'))),sha=b=>createHash('sha256').update(b).digest('hex');
for(const r of input.raw){const bytes=fs.readFileSync(path.join(project,r.local));assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),r.gitBlob);}
for(const r of input.art){const bytes=fs.readFileSync(path.join(project,r.path));assert.equal(sha(bytes),r.sha256);}
for(const r of input.raw.filter(r=>r.path.endsWith('.js'))){const before=fs.readFileSync(path.join(project,r.local),'utf8'),edits=[];let out=before;
 out=out.replace(/new (Uint8Array|Uint16Array|Uint32Array|Int32Array)\(/g,(text,type,offset)=>{const line=before.slice(0,offset).split('\n').length,fn={Uint8Array:'u8',Uint16Array:'u16',Uint32Array:'u32',Int32Array:'i32'}[type],site=r.path+':'+line;edits.push({kind:'typed-allocation',site,from:text,to:'quota.'+fn});return 'quota.'+fn+'('+JSON.stringify(site)+',';});
 out=out.replace(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.set\(/g,(text,dst)=>{const site=r.path+':set:'+edits.length;edits.push({kind:'copy-set',site,from:text});return 'quota.set('+JSON.stringify(site)+','+dst+',';});
 out=out.replace(/for \(;;\) \{/g,text=>{const site=r.path+':loop:'+edits.length;edits.push({kind:'work-tick',site,from:text});return text+' quota.tick(1,'+JSON.stringify(site)+');';});
 out=out.replace(/do \{/g,text=>{const site=r.path+':do:'+edits.length;edits.push({kind:'work-tick',site,from:text});return text+' quota.tick(1,'+JSON.stringify(site)+');';});
 out='// ALTERED ARTIFACT SPIKE:allocation/copy/work instrumentation only; NOT original Pako.\n'+out;
 const record=adaptations.records.find(v=>v.source===r.path),bytes=fs.readFileSync(path.join(root,record.adapted));assert.equal(record.sourceSha256,r.sha256);assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);assert.equal(bytes.toString('utf8'),out);assert.deepEqual(record.edits,edits);
}
console.log(JSON.stringify({status:'pass',rawFiles:input.raw.length,adaptedFiles:adaptations.records.length,textualEdits:adaptations.records.reduce((n,r)=>n+r.edits.length,0),originalPNGs:input.art.length,pakoCommit:input.pako.commit}));
