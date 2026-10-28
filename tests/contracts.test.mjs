import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ENGINE_MANIFEST, engineManifest, FEATURE_IDS, createMapDocument, createBlockDocument,
  blueprintRequirements, negotiateCapabilities, assertBlueprintCompatible, createSave, parseSave,
  serializeSave, loadBlueprint, validateBlueprint, migrateBlueprint, CompatibilityError} from '../packages/map-core/index.js';

const flat = () => JSON.parse(createMapDocument('Contract yard').export());
const consumer = capabilities => ({id: 'bounded-consumer', contractVersion: 1, schemas: [{id: 'aft-map', versions: [2]}], capabilities});
test('manifest copies have stable schema/capability versions and cannot mutate the engine', () => {
  const first = engineManifest(); first.capabilities[0].versions.push(99);
  assert.deepEqual(ENGINE_MANIFEST.capabilities[0].versions, [1]);
  assert.equal(ENGINE_MANIFEST.contractVersion, 1);
});
test('negotiation distinguishes required features, optional features, schemas and version intervals', () => {
  const requirements = {schema: {id: 'aft-map', version: 2}, required: [{id: FEATURE_IDS.walls, minVersion: 1, maxVersion: 2}],
    optional: [{id: 'future-audio-notes', minVersion: 3, maxVersion: 5}]};
  const accepted = negotiateCapabilities(requirements, consumer([{id: FEATURE_IDS.walls, versions: [1, 2, 4]}]));
  assert.equal(accepted.ok, true); assert.equal(accepted.accepted[0].version, 2);
  assert.equal(accepted.warnings[0].code, 'UNSUPPORTED_OPTIONAL_FEATURE');
  const rejected = negotiateCapabilities(requirements, consumer([{id: FEATURE_IDS.walls, versions: [3]}]));
  assert.equal(rejected.ok, false); assert.equal(rejected.errors[0].feature, FEATURE_IDS.walls);
  assert.match(rejected.errors[0].action, /do not discard/);
  requirements.schema.version = 7;
  assert.equal(negotiateCapabilities(requirements, consumer([])).errors[0].code, 'UNSUPPORTED_SCHEMA');
});
test('invalid and duplicate manifests/requirements fail closed with paths', () => {
  const need = blueprintRequirements(flat()); need.required = [{id: 'x', minVersion: 2, maxVersion: 1}];
  assert.equal(negotiateCapabilities(need, consumer([])).errors[0].path, '/required/0');
  need.required = [{id: 'x', minVersion: 1, maxVersion: 1}]; need.optional = [...need.required];
  assert.equal(negotiateCapabilities(need).errors[0].code, 'DUPLICATE_FEATURE');
  assert.equal(negotiateCapabilities(blueprintRequirements(flat()), consumer([{id: 'x', versions: []}])).ok, false);
});
test('authored map capabilities are derived from geometry and cannot be bypassed by an empty adapter', () => {
  const map = flat(); map.wallRuns = {version: 1, segments: [{id: 'wall-1', a: [30,30], b: [40,30], z: 0, stories: 1, material: 'wood'}]};
  assert.throws(() => assertBlueprintCompatible(map, consumer([])), error => error instanceof CompatibilityError && error.diagnostics[0].code === 'UNSUPPORTED_REQUIRED_FEATURE');
  assert.equal(assertBlueprintCompatible(map, consumer([{id: FEATURE_IDS.walls, versions: [1]}])), map);
});
test('save/reload preserves unknown JSON, versions and source blueprint bytes semantically', () => {
  const map = flat(); map.metadata = {futureAuthorNote: {tags: ['keep', 3], enabled: false}};
  map.futureAnnotation = {original: ['uninterpreted']}; const before = structuredClone(map);
  const save = createSave(map, {metadata: {owner: 'fixture'}, optional: [{id: 'future-annotation-view', minVersion: 1, maxVersion: 1}]});
  save.futureEnvelopeNote = {keep: true}; save.payload.futureStamp = 'keep';
  const first = serializeSave(save), restored = parseSave(first);
  assert.deepEqual(restored.payload.data, before); assert.deepEqual(map, before);
  assert.equal(restored.futureEnvelopeNote.keep, true); assert.equal(restored.payload.futureStamp, 'keep');
  assert.equal(serializeSave(restored), first); assert.deepEqual(loadBlueprint(map), map);
});
test('tampered requirements, schema stamps, future saves and non-JSON values reject', () => {
  const map = flat(); map.wallRuns = {version: 1, segments: [{id:'wall-1', a:[30,30], b:[40,30], z:0, stories:1, material:'wood'}]};
  const save = createSave(map); save.requirements.required = [];
  assert.throws(() => parseSave(save), error => error.code === 'MISSING_REQUIRED_FEATURE');
  const next = createSave(flat()); next.payload.version = 3;
  assert.throws(() => parseSave(next), error => error.code === 'SCHEMA_MISMATCH');
  next.version = 2; assert.throws(() => parseSave(next), error => error.code === 'UNSUPPORTED_SAVE_SCHEMA');
  for (const bad of [NaN, Infinity, undefined, new Date(), new Set(['x'])]) {
    const broken = flat(); broken.metadata = {bad}; assert.throws(() => createSave(broken), /plain JSON/);
  }
});
test('legacy migration is explicit, one-way, nonmutating and refuses fields it cannot preserve', () => {
  const raw = {version: 1, width: 24, height: 24, name: 'Legacy yard', terrain: Array.from({length:24},()=>Array(24).fill('yard')),
    edges: {}, starts: [{x:3,y:4},{x:3,y:6},{x:2,y:5},{x:2,y:7}], guards: [], exits: [{x:3,y:5}], metadata: {note:'keep'}};
  assert.throws(() => loadBlueprint(raw), error => error.code === 'MIGRATION_REQUIRED');
  const before = structuredClone(raw), migration = migrateBlueprint(raw);
  assert.equal(migration.blueprint.version, 2); assert.equal(migration.blueprint.width, 240);
  assert.deepEqual(migration.blueprint.metadata, raw.metadata); assert.deepEqual(raw, before);
  assert.equal(migration.migrations[0].id, 'aft-map-1-to-2');
  assert.deepEqual(migrateBlueprint(migration.blueprint).migrations, []);
  assert.throws(() => migrateBlueprint({...raw, newGeometry: []}), error => error.code === 'UNSUPPORTED_MIGRATION_FIELD');
});
test('golden legacy block and stamped save keep their canonical serialized representation', () => {
  const root = new URL('./fixtures/persistence/', import.meta.url);
  const block = JSON.parse(fs.readFileSync(new URL('legacy-block-v1.json', root), 'utf8'));
  assert.equal(loadBlueprint(block).kind, 'red-shift-block');
  const text = fs.readFileSync(new URL('save-v1.json', root), 'utf8');
  assert.equal(serializeSave(parseSave(text)), text);
  assert.deepEqual(parseSave(text).payload.data, block);
  assert.deepEqual(validateBlueprint(block), []);
  assert.ok(validateBlueprint({...block, version: 99}).some(item => item.code === 'UNSUPPORTED_SCHEMA'));
});

test('save ranges cannot substitute a different feature encoding version and invalid blueprints reject',()=>{
 const map=flat();map.wallRuns={version:1,segments:[{id:'wall-1',a:[30,30],b:[40,30],z:0,stories:1,material:'wood'}]};
 const save=createSave(map);save.requirements.required[0].maxVersion=2;
 assert.throws(()=>parseSave(save,{consumer:consumer([{id:FEATURE_IDS.walls,versions:[2]}])}),error=>error instanceof CompatibilityError&&error.diagnostics[0].code==='UNSUPPORTED_REQUIRED_FEATURE');
 assert.throws(()=>assertBlueprintCompatible({version:2},consumer([])),error=>error instanceof CompatibilityError&&error.diagnostics[0].code==='INVALID_BLUEPRINT');
});

test('plain-data persistence rejects fields JSON would omit and never invokes getters',()=>{
 for(const make of [()=>({[Symbol('hidden')]:true}),()=>Object.defineProperty({},'hidden',{value:3}),()=>{const array=[];array.note='lost';return array;}]){const map=flat();map.metadata=make();assert.throws(()=>loadBlueprint(map),/plain JSON/);}
 let invoked=false;const map=flat();map.metadata=Object.defineProperty({},'getter',{enumerable:true,get(){invoked=true;return 3;}});
 assert.throws(()=>createSave(map),/plain JSON/);assert.equal(invoked,false);
});

test('public schema URLs resolve every registered document and absolute cross-schema reference',async()=>{
 const {schemaDocuments}=await import('../packages/map-core/index.js');const documents=schemaDocuments(),uris=new Set(documents.map(item=>item.uri));assert.equal(uris.size,documents.length);
 function refs(value){if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){if(key==='$ref'&&!child.startsWith('#'))assert.ok(uris.has(child),'Unregistered schema reference: '+child);else refs(child);}}
 for(const entry of documents){const schema=JSON.parse(fs.readFileSync(new URL(entry.url),'utf8'));assert.equal(schema.$id,entry.uri);refs(schema);}
});

test('public roof documents, stamps, persistence and capability diagnostics use the same composition',()=>{
 const document=createMapDocument('Public roof contract');const result=document.apply({tool:'sloped-roof',options:{exact:true,x:30,y:30,width:8,depth:6,eaves:1,style:'gable',axis:'x',direction:1,pitch:35,overhang:.25,material:'slate',seed:42}});assert.equal(result.ok,true,result.error);
 const map=JSON.parse(document.export());map.slopedRoofs.metadata={author:'Fixture'};map.slopedRoofs.roofs[0].metadata={source:{note:'Keep'}};
 const saved=createSave(map);assert.ok(saved.requirements.required.some(feature=>feature.id===FEATURE_IDS.slopedRoofs));assert.deepEqual(parseSave(serializeSave(saved)).payload.data,map);
 assert.throws(()=>assertBlueprintCompatible(map,consumer([])),error=>error instanceof CompatibilityError&&error.diagnostics.some(item=>item.feature===FEATURE_IDS.slopedRoofs));
 assert.throws(()=>loadBlueprint({...map,slopedRoofs:{version:2,roofs:[]}}));
});
