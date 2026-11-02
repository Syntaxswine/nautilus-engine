import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import * as C from '../candidates/tile-authoring/core/c2/index.js';
import {T,cp,originalEntries} from '../tools/tile-authoring-core-c2-stage-b-fixtures.mjs';
const pack=JSON.parse(fs.readFileSync(new URL('../candidates/tile-authoring/core/c2/fixtures/stage-b-golden-pack.json',import.meta.url),'utf8'));
const saved=JSON.parse(fs.readFileSync(new URL('../candidates/tile-authoring/core/c2/fixtures/stage-b-golden-save.json',import.meta.url),'utf8'));
const preset=pack.manifest.presets[0],pin={id:preset.id,revision:preset.revision,contentDigest:preset.contentDigest};
const importArgs=()=>({pack,entries:originalEntries()});
const exportArgs=()=>({document:saved,query:{kind:'content.export',presetRefs:[pin],includeAllDependencies:true},manifestId:pack.manifest.id,entries:originalEntries()});
const size=result=>Buffer.byteLength(JSON.stringify({pack:result.pack,entries:result.entries.map(x=>({entry:x.entry,byteLength:x.bytes.byteLength})),work:result.work}),'utf8')+result.entries.reduce((n,x)=>n+x.bytes.byteLength,0);
const digest=b=>createHash('sha256').update(b).digest('hex');
test('original Architect failed-positive evidence remains exact and records both returned B blockers',()=>{
 const folder=new URL('../candidates/tile-authoring/core/c2/vendor/architect-review/f09e56d/',import.meta.url),inventory=JSON.parse(fs.readFileSync(new URL('inventory.json',folder),'utf8'));
 for(const r of inventory.files){const raw=fs.readFileSync(new URL(r.path,folder));assert.equal(digest(raw),r.sha256);}
 const prior=JSON.parse(fs.readFileSync(new URL('portable-results.json',folder),'utf8'));assert.equal(prior.fixed,'f09e56dfcb5d72f0721b9a283883410361b26916');assert.equal(prior.findings.length,2);assert.equal(prior.rows[1].excess,6);assert.equal(prior.rows[2].accepted,true);
});
for(const [name,run,args]of [['import',C.importTileContentPack,importArgs],['export',C.exportTileContentPack,exportArgs]])test(name+' accounts exact final returned work metadata plus original byte payload at boundary and one below',()=>{
 const original=run(T,args());assert.equal(original.work.outputBytes,size(original));assert.ok(original.work.unitsCharged<1000000);
 const exact=run(T,{...args(),limits:{outputBytes:original.work.outputBytes}});assert.equal(exact.work.outputBytes,size(exact));assert.equal(size(exact),original.work.outputBytes);
 assert.throws(()=>run(T,{...args(),limits:{outputBytes:original.work.outputBytes-1}}),e=>e.code==='AUTHORING_OUTPUT_LIMIT');
 assert.deepEqual(exact.pack,original.pack);
 for(let i=0;i<exact.entries.length;i++){assert.deepEqual(exact.entries[i].bytes,original.entries[i].bytes);assert.notEqual(exact.entries[i].bytes,original.entries[i].bytes);}
});
test('small no-payload pack reconciles self-referential work digits without an output undercount',()=>{
 const empty={kind:'nautilus-tile-content-pack',version:1,manifest:{kind:'nautilus-tile-content',version:1,id:'pack.empty',definitions:[],presets:[],artwork:[]},blobEntries:[],requires:[]};
 const first=C.importTileContentPack(T,{pack:empty,entries:[]});assert.equal(size(first),first.work.outputBytes);
 const exact=C.importTileContentPack(T,{pack:empty,entries:[],limits:{outputBytes:first.work.outputBytes}});assert.equal(size(exact),exact.work.outputBytes);
 assert.throws(()=>C.importTileContentPack(T,{pack:empty,entries:[],limits:{outputBytes:size(exact)-1}}),e=>e.code==='AUTHORING_OUTPUT_LIMIT');
});
test('genuine cross-realm shared backing is rejected for both original PNGs before copying or hashing',()=>{
 const shared=originalEntries().map(e=>{const bytes=vm.runInNewContext('new Uint8Array(new SharedArrayBuffer(length))',{length:e.bytes.length});bytes.set(e.bytes);return {entry:e.entry,bytes};});
 const sharedLength=Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype,'byteLength').get;
 for(const row of shared){assert.equal(sharedLength.call(row.bytes.buffer),row.bytes.length);assert.equal(row.bytes.buffer instanceof SharedArrayBuffer,false);}
 assert.throws(()=>C.importTileContentPack(T,{pack,entries:shared}),e=>e.code==='PACK_BYTES_REQUIRED');
 assert.throws(()=>C.exportTileContentPack(T,{...exportArgs(),entries:shared}),e=>e.code==='PACK_BYTES_REQUIRED');
});
test('spoofed shared prototypes and buffer/length getters cannot disguise the real shared storage brand',()=>{
 let calls=0;const shared=originalEntries().map(e=>{
  const bytes=vm.runInNewContext('new Uint8Array(new SharedArrayBuffer(length))',{length:e.bytes.length});bytes.set(e.bytes);
  const backing=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype),'buffer').get.call(bytes);
  Object.setPrototypeOf(backing,ArrayBuffer.prototype);Object.setPrototypeOf(bytes,Uint8Array.prototype);
  Object.defineProperty(bytes,'buffer',{get(){calls++;return new ArrayBuffer(1);}});
  Object.defineProperty(bytes,'byteLength',{get(){calls++;return e.bytes.length;}});
  Object.defineProperty(bytes,Symbol.toStringTag,{get(){calls++;return 'Uint8Array';}});
  return {entry:e.entry,bytes};
 });
 assert.throws(()=>C.importTileContentPack(T,{pack,entries:shared}),e=>e.code==='PACK_BYTES_REQUIRED');assert.equal(calls,0);
});
test('real cross-realm unshared backing remains supported with fresh owned copies and untouched source bytes/notices',()=>{
 let calls=0;const entries=originalEntries(),foreign=entries.map(e=>{
  const bytes=vm.runInNewContext('new Uint8Array(new ArrayBuffer(length))',{length:e.bytes.length});bytes.set(e.bytes);
  Object.defineProperty(bytes,'buffer',{get(){calls++;throw Error('caller buffer getter');}});Object.defineProperty(bytes,'byteLength',{get(){calls++;throw Error('caller length getter');}});
  return {entry:e.entry,bytes};
 });
 const imported=C.importTileContentPack(T,{pack,entries:foreign});assert.equal(calls,0);assert.deepEqual(imported.pack,pack);assert.equal(size(imported),imported.work.outputBytes);
 for(let i=0;i<entries.length;i++){assert.deepEqual(imported.entries[i].bytes,entries[i].bytes);assert.equal(digest(imported.entries[i].bytes),pack.blobEntries[i].sha256);assert.notEqual(imported.entries[i].bytes,foreign[i].bytes);}
});
test('prototype-only typed-array or buffer disguises reject without invoking user properties',()=>{
 let calls=0;const bad=originalEntries(),fake=Object.create(Uint8Array.prototype);for(const key of ['byteLength','buffer'])Object.defineProperty(fake,key,{get(){calls++;throw Error('fake getter');}});
 bad[0]={entry:bad[0].entry,bytes:fake};assert.throws(()=>C.importTileContentPack(T,{pack,entries:bad}),e=>e.code==='PACK_BYTES_REQUIRED');assert.equal(calls,0);
});
