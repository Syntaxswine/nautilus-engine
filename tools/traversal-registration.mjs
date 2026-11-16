// Authenticate the bounded shared-traversal/Night Ledger delta before exposing
// accepted PR59 preimages to the existing chase, road, player and art guards.
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import fs from 'node:fs';
import {checkDoorOpeningRegistration} from './door-opening-registration.mjs';
import {historicalMountDoraBytes} from './mount-dora-registration.mjs';
export const TRAVERSAL_BASE='98064c34c7bb4fc3c1343f2e450d570ec38615f2';
export const TRAVERSAL_REGISTRATION='docs/reviews/slippery-edges/registration.json';
const manifestSHA='12c83fa56095ef73e88f69214cf2461d7f3b362baa49d6489db3faca5f18550b',sha=b=>createHash('sha256').update(b).digest('hex');
function checkAcceptedTraversalRegistration(ports){
 const {read,object,indexed=()=>{},distribution}=ports,raw=read(TRAVERSAL_REGISTRATION);assert.equal(sha(raw),manifestSHA,'Traversal registration metadata changed.');const m=JSON.parse(raw);assert.equal(m.base,TRAVERSAL_BASE);indexed(TRAVERSAL_REGISTRATION,raw);indexed('tools/traversal-registration.mjs',read('tools/traversal-registration.mjs'));
 const before={},actual={};for(const row of m.files){const bytes=read(row.path);assert.equal(bytes.length,row.bytes,'Traversal source changed / root bytes changed: '+row.path);assert.equal(sha(bytes),row.sha256,'Traversal source changed / root bytes changed: '+row.path);indexed(row.path,bytes);if(row.beforeSha256){const old=object(TRAVERSAL_BASE,row.path);assert.equal(sha(old),row.beforeSha256,'Traversal accepted preimage changed: '+row.path);before[row.path]=old;actual[row.path]=bytes;}}
 for(const [profile,expected]of Object.entries(m.profiles)){const current=distribution(profile);assert.equal(current.name,expected.name);assert.deepEqual(current.exports,expected.exports,'Traversal profile exports changed: '+profile);assert.deepEqual(current.files,expected.files,'Traversal profile files changed: '+profile);}
 const donor=JSON.parse(read(m.donorManifest)),names=new Set(donor.files.map(r=>r.source));assert.equal(donor.commit,'7cd3d56e62a8087133a9fdf2f521cf92d310d6fd');assert.equal(donor.runtimeImports.length,0);for(const e of donor.edges)assert.ok(names.has(e.from)&&names.has(e.to),'Incomplete original traversal reference closure.');for(const row of donor.files){const b=read(row.path);assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256,'Original traversal byte changed: '+row.path);}
 return {historicalPorts:{...ports,read:file=>before[file]||read(file),indexed(file,bytes){if(before[file]){assert.ok(bytes.equals(before[file]),'Traversal historical assertion must use exact PR59 bytes: '+file);indexed(file,actual[file]);}else indexed(file,bytes);},distribution:(profile='compatibility')=>structuredClone(m.baselineProfiles[profile])},report:{status:'authenticated-shared-contact-traversal',base:TRAVERSAL_BASE,files:m.files.length,donorFiles:donor.files.length,actualBytesPassedToIndexedPort:true,requiredGitCommits:[TRAVERSAL_BASE]}};
}
export function checkTraversalRegistration(ports){const door=checkDoorOpeningRegistration(ports),accepted=checkAcceptedTraversalRegistration(door.historicalPorts);return {...accepted,report:{...accepted.report,door:door.report}};}
export function historicalTraversalBytes(object,file,current){
 current=historicalMountDoraBytes(object,file,current);
 if(!['upstream.json','tools/build.mjs'].includes(file))return current;
 const raw=fs.readFileSync(new URL('../'+TRAVERSAL_REGISTRATION,import.meta.url));assert.equal(sha(raw),manifestSHA,'Traversal registration metadata changed.');const row=JSON.parse(raw).files.find(r=>r.path===file);if(!row||sha(current)!==row.sha256)return current;const before=object(TRAVERSAL_BASE,file);assert.equal(sha(before),row.beforeSha256);return before;
}
