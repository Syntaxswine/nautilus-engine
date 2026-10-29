// Optional development audit. Pinned tools/source are cached only in ignored artifacts/.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
import {SILO_ASSETS,siloHeightReference} from '../packages/silo/index.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'artifacts/silo'),review=path.join(root,'docs/reviews/silo');
const require=createRequire(import.meta.url),validator=require(path.join(out,'audit-runtime/node_modules/gltf-validator')),hash=b=>createHash('sha256').update(b).digest('hex');
const reports=[];
for(const asset of SILO_ASSETS){const filename=asset.id+'.gltf',folder=path.join(root,'assets/silo/models');
 const r=await validator.validateBytes(new Uint8Array(fs.readFileSync(path.join(folder,filename))),{uri:filename,maxIssues:100,externalResourceFunction:async uri=>{
  const target=path.resolve(folder,decodeURIComponent(uri));assert.ok(target.startsWith(path.join(root,'assets/silo')+path.sep));return new Uint8Array(fs.readFileSync(target));}});
 reports.push({id:asset.id,issues:r.issues,info:r.info});console.log(asset.id+': '+r.issues.numErrors+' errors, '+r.issues.numWarnings+' warnings');
 assert.equal(r.issues.numErrors,0);assert.equal(r.issues.numWarnings,0);
}
const pin='fbb57293805ecae34569ab3dd9f689ffea53beb0',closure=path.join(out,'world-reference',pin),sources=[];fs.mkdirSync(closure,{recursive:true});
for(const name of ['state.js','validation.js']){
 const p='packages/world-core/'+name,bytes=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show',pin+':'+p],{windowsHide:true});
 fs.writeFileSync(path.join(closure,name),bytes);sources.push({path:p,commit:pin,bytes:bytes.length,sha256:hash(bytes),use:'Audit only; immutable Git object, no runtime import or vendor change.'});
}
const world=await import(pathToFileURL(path.join(closure,'state.js'))),height=siloHeightReference();assert.deepEqual(world.validateWorld(height),[]);
assert.deepEqual(JSON.parse(world.serializeWorld(height)),height);
const lock=JSON.parse(fs.readFileSync(path.join(out,'audit-runtime/package-lock.json'))),tools=Object.entries(lock.packages).filter(([p])=>p.startsWith('node_modules/')).map(([p,v])=>({package:p.slice(13),version:v.version,integrity:v.integrity,license:v.license}));
const report={schemaVersion:1,validator:validator.version(),tools,sourceReference:sources,height:{kind:height.kind,floors:height.floors.length,validation:[],roundtrip:true,geometry:'Height datums only; empty surfaces/entities/links are intentional and are not a playable silo.'},gltf:reports};
fs.writeFileSync(path.join(review,'export-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log('Height reference passed immutable world-core validation and round trip; no runtime/core imports.');
