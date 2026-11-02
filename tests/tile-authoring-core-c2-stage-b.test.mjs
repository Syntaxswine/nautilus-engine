import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {C,T,cp,pack,token,source,captureInput,save,originalEntries,stageFixture,preparedCapture} from '../tools/tile-authoring-core-c2-stage-b-fixtures.mjs';
import {sha256Bytes} from '../candidates/tile-authoring/core/c2/byte-hash.js';
import {Budget,shape} from '../candidates/tile-authoring/core/c2/data.js';

const current=source(),input=captureInput(current.document),captured=C.captureTilePreset(T,input),saved=save(current.document,captured.preset);
const exportInput=()=>({document:saved.document,query:{kind:'content.export',presetRefs:[captured.pin],includeAllDependencies:true},manifestId:'library.c2-portable-thirty',entries:originalEntries()});
const portable=C.exportTileContentPack(T,exportInput());
const hash=b=>createHash('sha256').update(b).digest('hex');
const code=(fn,wanted)=>assert.throws(fn,e=>wanted?e.code===wanted:typeof e.code==='string');
test('actual current placement capture retains all30 original graphics and explicit template remaps',()=>{
 assert.equal(captured.preset.body.defaultMarks.length,30);assert.equal(captured.preset.body.defaultLayers.length,1);
 assert.deepEqual(captured.preset.body.definition,current.document.authoring.ownerPins[0].definition);
 const old=current.document.authoring.decorations.chunks.flatMap(c=>c.marks);
 for(let i=0;i<30;i++){const mark=captured.preset.body.defaultMarks[i];assert.equal(mark.id,input.markRemaps[i].templateMarkId);assert.equal(mark.layerId,input.layerRemaps[0].templateLayerId);assert.deepEqual(mark.graphic,old[i].graphic);}
 assert.ok(captured.work.unitsCharged<1000000);shape(T,'presetRecord',captured.preset,new Budget());
});
test('capture never changes source instance/world pose; local defaults are pose independent',()=>{
 const before=JSON.stringify(current.document),different=cp(input),owner=different.document.tileBundle.layout.instances.find(x=>x.id===input.ownerId);owner.origin=[40,10,0];owner.transform={quarterTurns:3,mirrorX:true};
 const other=C.captureTilePreset(T,different);assert.deepEqual(other.preset,captured.preset);assert.equal(JSON.stringify(current.document),before);
});
test('preset.save appends only immutable library data and preserves every placed mark/owner/geometry',()=>{
 assert.equal(saved.document.contentRevision,current.document.contentRevision+1);
 assert.deepEqual(saved.document.tileBundle,current.document.tileBundle);assert.deepEqual(saved.document.authoring.decorations,current.document.authoring.decorations);assert.deepEqual(saved.document.authoring.ownerPins,current.document.authoring.ownerPins);assert.deepEqual(saved.document.resourceRefs,current.document.resourceRefs);
 assert.deepEqual(saved.document.authoring.library.presets.at(-1),captured.preset);assert.equal(saved.bound.committable,false);assert.equal(saved.plan.version,2);assert.equal(saved.plan.request,null);
 assert.ok(saved.bound.costBounds.planning.unitsCharged<1000000);assert.equal(saved.bound.costBounds.atlasPagesAllViews,4);
 assert.ok(saved.capture.sampledSharing.length===2,'Explicit source native allocation sharing observations, not inferred page hashes.');
});
test('source/capacity/preparation/final-bind meter stays cumulative with an explicit remaining constructor budget',()=>{
 const remaining=1000000-captured.work.unitsCharged,x=stageFixture([{kind:'preset.save',body:{preset:captured.preset}}],{document:current.document,limits:{plannerUnits:remaining}});
 const p=C.planTileAuthoring(T,x.input);assert.equal(p.ok,true,JSON.stringify(p));const r=C.bindTileAuthoringTarget(T,{before:current.document,plan:p,prepared:null,appearanceCapture:preparedCapture(p,{reuseExistingArtwork:true})});
 assert.equal(r.ok,true,JSON.stringify(r));assert.ok(captured.work.unitsCharged+r.costBounds.planning.unitsCharged<=1000000);assert.equal(p.limits.plannerUnits,remaining);
});
test('capture selection/template identity, source owner/layer and revision failures are explicit',()=>{
 for(const mutate of [x=>x.markRemaps.push(cp(x.markRemaps[0])),x=>x.layerRemaps=[],x=>x.markRemaps[0].markId='absent.mark',x=>x.layerRemaps[0].layerId='absent.layer',x=>x.ownerId='absent.owner',x=>x.identity.revision=2,x=>x.markRemaps[1].templateMarkId=x.markRemaps[0].templateMarkId]){
  const bad=cp(input);mutate(bad);code(()=>C.captureTilePreset(T,bad));
 }
 code(()=>C.captureTilePreset(T,{...input,unexpected:true}),'UNKNOWN_FIELD');code(()=>C.captureTilePreset(T,{...input,limits:{plannerUnits:10}}),'AUTHORING_WORK_LIMIT');
 code(()=>C.captureTilePreset(T,{...input,document:null}),'SCHEMA_TYPE');code(()=>C.captureTilePreset(T,{...input,limits:{owners:1}}),'REFERENCE_MAP_LIMIT');
});
test('source notice/required-profile closure survives selected capture without replacement or normalization',()=>{
 const needed=new Map();const def=current.document.authoring.library.definitions.find(x=>x.id===captured.preset.body.definition.id&&x.revision===captured.preset.body.definition.revision);
 for(const r of [def,...pack.manifest.artwork])for(const n of r.body.notices)needed.set(n.id,n);
 assert.deepEqual(captured.preset.body.notices,[...needed.values()]);
 const required=[...new Set([def,...pack.manifest.artwork].flatMap(r=>r.body.requires))].sort();assert.deepEqual(captured.preset.body.requires,required);
});
test('raw byte SHA-256 agrees with independent Node crypto for non-text bytes and both full original PNGs',()=>{
 for(const bytes of [new Uint8Array(),new Uint8Array([0,255,128,10,13]),...originalEntries().map(x=>x.bytes)])assert.equal(sha256Bytes(bytes),hash(bytes));
});
test('portable export carries original30 records, exact definition/preset closure and both real complete pages',()=>{
 assert.equal(portable.pack.manifest.definitions.length,1);assert.equal(portable.pack.manifest.presets.length,1);assert.equal(portable.pack.manifest.artwork.length,30);assert.equal(portable.entries.length,2);
 assert.deepEqual(portable.pack.manifest.artwork,[...pack.manifest.artwork].sort((a,z)=>a.id<z.id?-1:1));assert.deepEqual(portable.pack.manifest.presets,[captured.preset]);
 const originals=new Map(originalEntries().map(x=>[x.entry,x.bytes]));for(const entry of portable.entries){assert.deepEqual(entry.bytes,originals.get(entry.entry));assert.equal(hash(entry.bytes),entry.entry.slice(6,-4));}
 assert.equal(portable.entries.reduce((n,x)=>n+x.bytes.length,0),2560200);assert.ok(portable.work.unitsCharged<1000000);assert.ok(portable.work.inputBytes<6000000);assert.ok(portable.work.outputBytes<4000000);
});
test('portable import validates actual bytes afresh and gives independent owned byte copies with exact notices/pins',()=>{
 const reopened=C.importTileContentPack(T,{pack:portable.pack,entries:portable.entries});assert.deepEqual(reopened.pack,portable.pack);for(let i=0;i<2;i++){assert.notEqual(reopened.entries[i].bytes,portable.entries[i].bytes);assert.deepEqual(reopened.entries[i].bytes,portable.entries[i].bytes);}
 const changed=cp(reopened.entries);changed[0].bytes[0]^=255;code(()=>C.importTileContentPack(T,{pack:reopened.pack,entries:changed}),'PACK_BYTE_HASH');assert.equal(portable.entries[0].bytes[0],137);
});
test('export/import rejects absent/corrupt/truncated/extra/aliased bytes and descriptors rather than claiming readiness',()=>{
 for(const mutate of [x=>x.entries.pop(),x=>x.entries[0].bytes[3]^=1,x=>x.entries[0].bytes=x.entries[0].bytes.slice(1),x=>x.entries.push(cp(x.entries[0])),x=>x.entries[0].entry='../escape.png',x=>x.entries[0].bytes='path/to/file.png',x=>x.pack.blobEntries.pop()]){
  const x={pack:cp(portable.pack),entries:originalEntries()};mutate(x);code(()=>C.importTileContentPack(T,x));
 }
 code(()=>C.exportTileContentPack(T,{...exportInput(),query:{kind:'requirements.inspect',subject:captured.pin}}),'CONTENT_EXPORT_QUERY_REQUIRED');
 code(()=>C.exportTileContentPack(T,{...exportInput(),query:{kind:'content.export',presetRefs:[{...captured.pin,contentDigest:'0'.repeat(64)}],includeAllDependencies:true}}),'MISSING_EXACT_REFERENCE');
});
test('portable typed byte reads avoid user getters; shared buffers and exotic/accessor containers refuse',()=>{
 let calls=0;const entries=originalEntries();Object.defineProperty(entries[0].bytes,'byteLength',{get(){calls++;throw Error('getter invoked');}});
 assert.doesNotThrow(()=>C.importTileContentPack(T,{pack:portable.pack,entries}));assert.equal(calls,0);
 const bad={pack:portable.pack};Object.defineProperty(bad,'entries',{enumerable:true,get(){calls++;return entries;}});code(()=>C.importTileContentPack(T,bad),'INVALID_DATA');assert.equal(calls,0);
 const rows=originalEntries();Object.defineProperty(rows[0],'extra',{get(){calls++;return true;},enumerable:true});code(()=>C.importTileContentPack(T,{pack:portable.pack,entries:rows}));assert.equal(calls,0);
 if(typeof SharedArrayBuffer!=='undefined'){const shared=originalEntries();shared[0].bytes=new Uint8Array(new SharedArrayBuffer(shared[0].bytes.length));code(()=>C.importTileContentPack(T,{pack:portable.pack,entries:shared}),'PACK_BYTES_REQUIRED');}
});
test('missing dependency, malformed template IDs and stale authored-grid default masks refuse before save/import',()=>{
 const bad=cp(portable.pack);bad.manifest.artwork.pop();code(()=>C.importTileContentPack(T,{pack:bad,entries:originalEntries()}),'MISSING_EXACT_REFERENCE');
 const raw=cp(captured.preset);delete raw.contentDigest;raw.body.defaultMarks[1].id=raw.body.defaultMarks[0].id;const duplicate=C.sealTileContentRecord(T,raw).record;
 const q=stageFixture([{kind:'preset.save',body:{preset:duplicate}}],{document:current.document});assert.equal(C.planTileAuthoring(T,q.input).ok,false);
 const mask=cp(captured.preset);delete mask.contentDigest;mask.body.defaultMarks[0].graphic.mask={kind:'grid-spans',grid:{id:'wrong.grid',version:1,digest:token('wrong grid')},rows:[{j:0,spans:[{i0:0,count:1}]}]};const stale=C.sealTileContentRecord(T,mask).record;
 assert.equal(C.planTileAuthoring(T,stageFixture([{kind:'preset.save',body:{preset:stale}}],{document:current.document}).input).ok,false);
});
test('frozen canonical content.import accepts the reopened self-contained pack without geometry or placement',()=>{
 const reopened=C.importTileContentPack(T,{pack:portable.pack,entries:portable.entries}),x=stageFixture([{kind:'content.import',body:{pack:reopened.pack,conflict:'refuse-different-content'}}]),p=C.planTileAuthoring(T,x.input);
 assert.equal(p.ok,true,JSON.stringify(p));assert.deepEqual(p.targetDocument.tileBundle,x.input.document.tileBundle);assert.deepEqual(p.targetDocument.authoring.library.presets.at(-1),captured.preset);assert.equal(p.targetDocument.authoring.decorations.chunks.length,0);assert.equal(p.preparationNeed,'encoded-only-retain-appearance');
 assert.equal(C.bindTileAuthoringTarget(T,{before:x.input.document,plan:p,prepared:null,appearanceCapture:preparedCapture(p)}).ok,true);
});
test('binary+metadata input/output and deterministic work limits stay fixed and tighten only',()=>{
 code(()=>C.importTileContentPack(T,{pack:portable.pack,entries:portable.entries,limits:{inputBytes:1000000}}),'AUTHORING_INPUT_LIMIT');
 code(()=>C.importTileContentPack(T,{pack:portable.pack,entries:portable.entries,limits:{outputBytes:1000000}}),'AUTHORING_OUTPUT_LIMIT');
 code(()=>C.exportTileContentPack(T,{...exportInput(),limits:{plannerUnits:1000}}),'AUTHORING_WORK_LIMIT');
 code(()=>C.exportTileContentPack(T,{...exportInput(),document:null}),'SCHEMA_TYPE');code(()=>C.exportTileContentPack(T,{...exportInput(),limits:{owners:1}}),'REFERENCE_MAP_LIMIT');
 code(()=>C.importTileContentPack(T,{pack:portable.pack,entries:portable.entries,limits:{plannerUnits:1000001}}),'INVALID_LIMIT');
});
test('placement with default marks explicitly requires the unimplemented combined route; no Plan2 widening',()=>{
 const f=stageFixture().f,placement={...f.operations[4].body.placements[0],ownerId:'new.owner',freshMarkIds:captured.preset.body.defaultMarks.map(m=>({templateId:m.id,markId:'fresh.'+m.id})),freshLayerIds:captured.preset.body.defaultLayers.map(x=>({templateId:x.layer.id,layerId:'fresh.'+x.layer.id}))};
 const x=stageFixture([{kind:'preset.place',body:{preset:captured.pin,placements:[placement],defaults:'copy-explicit'}}],{document:saved.document}),p=C.planTileAuthoring(T,x.input);assert.equal(p.ok,false);assert.equal(p.diagnostics[0].code,'C2_COMBINED_ROUTE_REQUIRED');assert.equal(C.tileAuthoringDiscovery().combinedPlacement,false);
});
test('golden captured preset, complete save and portable pack metadata retain exact JSON bytes/data',()=>{
 for(const [name,actual]of [['stage-b-golden-preset.json',captured.preset],['stage-b-golden-save.json',saved.document],['stage-b-golden-pack.json',portable.pack]]){
  const expected=JSON.parse(fs.readFileSync(new URL('../candidates/tile-authoring/core/c2/fixtures/'+name,import.meta.url),'utf8'));assert.deepEqual(actual,expected);assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);
 }
});
