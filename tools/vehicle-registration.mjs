// Authenticate the complete additive vehicle delta BEFORE exposing exact old
// player/artwork/railway preimages. Old hashes, source ledgers and tests stay put.
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import fs from 'node:fs';
export const VEHICLE_REGISTRATION='docs/reviews/road-driving/registration.json';
const manifestSHA='e5e6f6b8de3bf4f55a6bc04ddf79a6c75220de3cb76051d5f308864672a18cde',sha=b=>createHash('sha256').update(b).digest('hex');
export function authenticatedVehicleImages(profile,{read,indexed=()=>{}}){if(!['renderer','compatibility'].includes(profile))return [];const raw=read(VEHICLE_REGISTRATION);assert.equal(sha(raw),manifestSHA,'Vehicle registration metadata changed.');const m=JSON.parse(raw),rows=m.files.filter(r=>r.path.endsWith('.png')&&(r.path.startsWith('packages/vehicle-visuals/skins/game/')||r.path.startsWith('vendor/nautilus-road-vehicles/'+m.art+'/packages/vehicle-visuals/skins/')));assert.equal(rows.length,18,'Authenticate exactly nine full and nine derived skins.');for(const r of rows){const bytes=read(r.path);assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256,'Unreviewed vehicle skin: '+r.path);indexed(r.path,bytes);}return rows.map(r=>r.path);}
export function historicalVehicleBytes(object,file,current){
 const base='579706bf415a9664e4541db9ec6b5fe6adb334d7';
 // The complete checker already authenticates all current adapted bytes. This
 // direct historic path is used by the older railway root-byte comparator too.
 if(!['upstream.json','tools/build.mjs'].includes(file))return current;
 const raw=fs.readFileSync(new URL('../'+VEHICLE_REGISTRATION,import.meta.url));assert.equal(sha(raw),manifestSHA,'Vehicle registration metadata changed.');const manifest=JSON.parse(raw),row=manifest.adapted.find(r=>r.path===file);
 if(row&&sha(current)===row.sha256)return object(base,file);return current;
}
export function checkVehicleRegistration(ports){
 const {object,read,indexed=()=>{},distribution}=ports,raw=read(VEHICLE_REGISTRATION);assert.equal(sha(raw),manifestSHA,'Vehicle registration metadata changed.');const m=JSON.parse(raw);assert.equal(m.base,'579706bf415a9664e4541db9ec6b5fe6adb334d7');
 indexed(VEHICLE_REGISTRATION,raw);const preimages={},actual={};
 for(const row of [...m.files,...m.adapted]){const bytes=read(row.path);assert.equal(bytes.length,row.bytes,'Reviewed player bytes changed / vehicle root bytes changed: '+row.path);assert.equal(sha(bytes),row.sha256,'Reviewed player bytes changed / vehicle root bytes changed: '+row.path);indexed(row.path,bytes);}
 for(const row of m.adapted){const before=object(m.base,row.path);assert.equal(sha(before),row.beforeSha256,'Vehicle preimage identity changed: '+row.path);preimages[row.path]=before;actual[row.path]=read(row.path);}
 for(const [profile,expected]of Object.entries(m.profiles)){const current=distribution(profile);assert.equal(current.name,expected.name);assert.deepEqual(current.exports,expected.exports,'Unreviewed vehicle profile exports: '+profile);assert.deepEqual(current.files,expected.files,'Unreviewed vehicle profile files: '+profile);}
 return {historicalPorts:{...ports,read:file=>preimages[file]||read(file),indexed(file,bytes){if(preimages[file]){assert.ok(bytes.equals(preimages[file]),'Vehicle historical assertion must use the exact preimage: '+file);indexed(file,actual[file]);}else indexed(file,bytes);},distribution:(profile='compatibility')=>structuredClone(m.baselineProfiles[profile])},report:{status:'authenticated-road-vehicle-candidate',base:m.base,art:m.art,adaptedFiles:m.adapted.length,sourceFiles:m.files.length,actualBytesPassedToIndexedPort:true,releaseStamped:false}};
}
