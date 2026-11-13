// Authenticate this bounded correction before exposing exact accepted PR60 bytes.
import {checkWalkingPaceRegistration} from './walking-pace-registration.mjs';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export const DOOR_OPENING_BASE='09efd6580023ab4bca263fb9d7538858b0eaac1e';
export const DOOR_OPENING_REGISTRATION='docs/reviews/door-opening/registration.json';
const manifestSHA='35c38162f9cf68ca65d7c73b1e97e4bd0e2aa6971b9806d64ef64153c67db583',sha=b=>createHash('sha256').update(b).digest('hex');
export function checkDoorOpeningRegistration(ports){const pace=checkWalkingPaceRegistration(ports),accepted=checkAcceptedDoorOpeningRegistration(pace.historicalPorts);return {...accepted,report:{...accepted.report,walkingPace:pace.report}};}
function checkAcceptedDoorOpeningRegistration(ports){
 const {read,object,indexed=()=>{},distribution}=ports,raw=read(DOOR_OPENING_REGISTRATION);assert.equal(sha(raw),manifestSHA,'Door opening registration metadata changed.');const m=JSON.parse(raw);assert.equal(m.base,DOOR_OPENING_BASE);indexed(DOOR_OPENING_REGISTRATION,raw);indexed('tools/door-opening-registration.mjs',read('tools/door-opening-registration.mjs'));
 const before={},actual={};for(const row of m.files){const b=read(row.path);assert.equal(b.length,row.bytes,'Door opening source changed / Traversal source changed / root bytes changed: '+row.path);assert.equal(sha(b),row.sha256,'Door opening source changed / Traversal source changed / root bytes changed: '+row.path);indexed(row.path,b);if(row.beforeSha256){const old=object(DOOR_OPENING_BASE,row.path);assert.equal(sha(old),row.beforeSha256,'Door opening accepted preimage changed: '+row.path);before[row.path]=old;actual[row.path]=b;}}
 for(const [profile,expected]of Object.entries(m.profiles)){const d=distribution(profile);assert.equal(d.name,expected.name);assert.deepEqual(d.exports,expected.exports,'Unreviewed vehicle profile exports / Door opening profile exports changed: '+profile);assert.deepEqual(d.files,expected.files,'Door opening profile files changed: '+profile);}
 return {historicalPorts:{...ports,read:f=>before[f]||read(f),indexed(f,b){if(before[f]){assert.ok(b.equals(before[f]),'Door opening historical assertion requires exact PR60 bytes: '+f);indexed(f,actual[f]);}else indexed(f,b);}},report:{status:'authenticated-door-opening-correction',base:DOOR_OPENING_BASE,files:m.files.length,actualBytesPassedToIndexedPort:true,requiredGitCommits:[DOOR_OPENING_BASE]}};
}
