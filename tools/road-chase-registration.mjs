// Authenticate this bounded follow-up before handing exact accepted PR58 bytes
// to the existing vehicle/player/artwork guards. No old ledger is rewritten.
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export const ROAD_CHASE_BASE='7234f1c963099046a405183591bd161c1a410797';
export const ROAD_CHASE_REGISTRATION='docs/reviews/road-chase-steering/registration.json';
const manifestSHA='cb04c3e0eb6caeef50e3d0b52341e89d68edf59b039a55dfe2c541996753fffb',sha=b=>createHash('sha256').update(b).digest('hex');
export function checkRoadChaseRegistration(ports){
 const {read,object,indexed=()=>{},distribution}=ports,raw=read(ROAD_CHASE_REGISTRATION);assert.equal(sha(raw),manifestSHA,'Road chase registration metadata changed.');const m=JSON.parse(raw);assert.equal(m.base,ROAD_CHASE_BASE);indexed(ROAD_CHASE_REGISTRATION,raw);indexed('tools/road-chase-registration.mjs',read('tools/road-chase-registration.mjs'));
 const before={},actual={};for(const row of m.files){const bytes=read(row.path);assert.equal(bytes.length,row.bytes,'Road chase source changed: '+row.path);assert.equal(sha(bytes),row.sha256,'Road chase source changed: '+row.path);indexed(row.path,bytes);if(row.beforeSha256){const old=object(ROAD_CHASE_BASE,row.path);assert.equal(sha(old),row.beforeSha256,'Accepted road chase preimage changed: '+row.path);before[row.path]=old;actual[row.path]=bytes;}}
 for(const [profile,expected]of Object.entries(m.profiles)){const current=distribution(profile);assert.equal(current.name,expected.name);assert.deepEqual(current.exports,expected.exports,'Unreviewed vehicle profile exports / road chase: '+profile);assert.deepEqual(current.files,expected.files,'Unreviewed vehicle profile files / road chase: '+profile);}
 return {historicalPorts:{...ports,read:file=>before[file]||read(file),indexed(file,bytes){if(before[file]){assert.ok(bytes.equals(before[file]),'Road chase historical assertion must use exact PR58 bytes: '+file);indexed(file,actual[file]);}else indexed(file,bytes);}},report:{status:'authenticated-road-chase-follow-up',base:ROAD_CHASE_BASE,files:m.files.length,actualBytesPassedToIndexedPort:true,requiredGitCommits:[ROAD_CHASE_BASE]}};
}
