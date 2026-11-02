import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {distribution,root} from './distribution.mjs';
export function grenadeReviewInputFingerprint(){
 const files=[...new Set([...distribution('compatibility').files,'package.json',
  ...['grenade-reference.html','grenade-reference.css','grenade-reference.js','grenade-reference-host.js','grenade-reference-view.js'].map(name=>'examples/'+name),
  ...fs.readdirSync(path.join(root,'tools')).filter(name=>/\.(?:mjs|py)$/.test(name)).map(name=>'tools/'+name)])].sort();
 const inputs=files.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]);
 return createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}
export function assertGrenadeReviewReport(report,mode,inputSha256){
 assert.equal(report?.mode,mode,'Unexpected browser proof mode.');
 assert.match(report.inputSha256,/^[a-f0-9]{64}$/,'Missing input fingerprint.');
 assert.equal(report.inputSha256,inputSha256,'Browser proof uses different inputs.');
 assert.match(report.projectionSha256,/^[a-f0-9]{64}$/,'Missing final projection digest.');
 assert.ok(Array.isArray(report.results)&&report.results.length===10,'Expected all ten browser behavior groups.');
 const names=new Set();
 for(const result of report.results){assert.ok(typeof result?.name==='string'&&result.name.trim());assert.equal(result.status,'pass');assert.ok(!names.has(result.name),'Duplicate browser behavior group.');names.add(result.name);}
 for(const key of ['errors','failedRequests'])assert.ok(Array.isArray(report[key])&&report[key].length===0,'Unexpected or absent browser error record.');
 assert.ok(Number.isInteger(report.resourceCount)&&report.resourceCount>0,'Missing native resource proof.');
 assert.ok(Array.isArray(report.captures)&&report.captures.length>=12,'Missing native phase captures.');
}
