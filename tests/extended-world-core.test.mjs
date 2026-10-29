import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {WORLD_CONTRACT as C,createWorld,openWorld,validateWorld,serializeWorld,worldRequirements,assertWorldCompatible,compileWorld,reportLegacyMigration,reportLegacyRepresentability} from '../packages/world-core/index.js';
import {engineManifest} from '../packages/map-core/contract-manifest.js';
import {negotiateCapabilities} from '../packages/map-core/capabilities.js';
import {towerFixture,sparseFixture,floorPanel} from './fixtures/extended-world/build-fixtures.mjs';
const fixture=name=>fs.readFileSync(new URL('./fixtures/extended-world/'+name,import.meta.url),'utf8');
const tiny=()=>createWorld({id:'small',name:'Small world',widthM:32,depthM:32,floorCount:2,storyHeightM:3,groundHeightM:0,heightM:12});
const rejects=(world,change,code)=>{const candidate=structuredClone(world);change(candidate);const before=JSON.stringify(candidate);assert.throws(()=>openWorld(candidate),error=>error.code===code);assert.equal(JSON.stringify(candidate),before);};
const consumer=world=>({id:'contract-fixture-host',version:'test-v1',contractVersion:1,schemas:[{id:C.schemaId,versions:[1]}],capabilities:worldRequirements(world).required.map(item=>({id:item.id,versions:[1]}))});

test('fifteen-story and sparse 32-floor goldens save/reload with every identity, metre height and source unchanged',()=>{
  for(const [name,make] of [['fifteen-story-v1.json',towerFixture],['sparse-32-v1.json',sparseFixture]]){
    const original=fixture(name),state=openWorld(original),before=structuredClone(state);assert.deepEqual(state,make());assert.equal(JSON.stringify(state,null,2)+'\n',original);assert.deepEqual(openWorld(serializeWorld(state)),state);assert.deepEqual(state,before);assert.notEqual(openWorld(state),state);
  }
  const world=towerFixture();assert.equal(world.floors.length,16);assert.equal(world.floors[14].elevationM,42);assert.equal(world.floors[15].label,'R');assert.equal(world.entities[1].position.h,42.125);assert.equal(world.entities[1].yawRadians,Math.PI/2);
});

test('floor 9-to-10 indices and labels, two-digit IDs, roof access and confirmed traversal landings survive roundtrip',()=>{
  const world=openWorld(serializeWorld(towerFixture())),queries=compileWorld(world);
  assert.equal(queries.getFloor('floor-9').index,9);assert.equal(queries.getFloor('floor-10').elevationM,30);
  assert.equal(world.floors.find(f=>f.label==='9').elevationM,24);assert.equal(world.floors.find(f=>f.label==='10').elevationM,27);
  const crossing=queries.linksFrom('floor-9').find(link=>link.id==='stairs-9-10');assert.equal(crossing.from.position.h,27);assert.equal(crossing.to.position.h,30);assert.equal(crossing.to.surfaceId,'panel-10');
  assert.ok(queries.linksFrom('floor-10').some(link=>link.id===crossing.id));assert.equal(queries.linksFrom('floor-15')[0].kind,'ladder');
  const alternate=tiny();alternate.floors[0].id='ground:9';alternate.floors[0].label='G';alternate.floors[1].id='attic:10';alternate.floors[1].label='Attic';assert.equal(compileWorld(alternate).getFloor('attic:10').elevationM,3);
});

test('up to 32 floor positions require no dense cells or buckets for empty intermediate floors',()=>{
  const empty=createWorld({id:'empty',name:'Empty',widthM:4096,depthM:4096,floorCount:32,storyHeightM:3,groundHeightM:0,heightM:100});
  assert.deepEqual(compileWorld(empty).stats(),{floorCount:32,allocatedFloorBuckets:0,surfaces:0,entities:0,links:0,bvhNodes:0,serializedBytes:Buffer.byteLength(serializeWorld(empty)),denseCells:0});
  for(const count of [5,15,32]){const world=sparseFixture(count),queries=compileWorld(world),stats=queries.stats();assert.equal(stats.denseCells,0);assert.equal(stats.allocatedFloorBuckets,world.surfaces.length);assert.ok(stats.serializedBytes<5000);assert.ok(stats.bvhNodes<=stats.surfaces*2);}
  const queries=compileWorld(sparseFixture());assert.deepEqual(queries.recordsForFloor('floor-8'),{surfaces:[],entities:[],links:[]});assert.equal(queries.recordsForFloor('floor-31').surfaces[0].bounds.max.h,93);
});

test('upper support searches use native heights, explicit floor confirmations and independent low roofs',()=>{
  const world=towerFixture(),annexGround=floorPanel(world,0,20,2,8);annexGround.id='annex-ground';world.surfaces.push(annexGround);const queries=compileWorld(world);
  const roof=queries.findSupport({position:{x:4,y:4,h:47},maxDropM:5,requireFloor:true});assert.equal(roof.surfaceId,'tower-roof');assert.equal(roof.floorId,'floor-15');assert.equal(roof.point.h,45);assert.equal(roof.dropM,2);
  const upper=queries.findSupport({position:{x:4,y:4,h:44},maxDropM:3,requireFloor:true});assert.equal(upper.floorId,'floor-14');assert.equal(upper.point.h,42);
  assert.equal(queries.findSupport({position:{x:4,y:4,h:44},maxDropM:1,requireFloor:true}),null);
  const annex=queries.findSupport({position:{x:24,y:6,h:7},maxDropM:4,requireFloor:false});assert.equal(annex.point.h,5.5);assert.equal(annex.floorId,null);assert.equal(annex.anchorFloorId,'floor-1');
  assert.equal(queries.findSupport({position:{x:24,y:6,h:7},maxDropM:10,requireFloor:true}),null);
  assert.equal(queries.findSupport({position:{x:29,y:6,h:7},maxDropM:4,requireFloor:false}),null);
});

test('upper-floor line contacts return the real first hit, point and normal without layer-5 clamping',()=>{
  const queries=compileWorld(towerFixture());
  const wall=queries.traceSegment({from:{x:10,y:6,h:43.25},to:{x:15,y:6,h:43.25}});assert.equal(wall.surfaceId,'tower-upper-wall');assert.equal(wall.anchorFloorId,'floor-14');assert.equal(wall.fraction,.6);assert.deepEqual(wall.point,{x:13,y:6,h:43.25});assert.deepEqual(wall.normal,{x:-1,y:0,h:0});assert.equal(wall.startedInside,false);
  const downward=queries.traceSegment({from:{x:5,y:5,h:50},to:{x:5,y:5,h:0}});assert.equal(downward.surfaceId,'tower-roof');assert.equal(downward.point.h,45);assert.deepEqual(downward.normal,{x:0,y:0,h:1});
  const between=queries.traceSegment({from:{x:5,y:5,h:43},to:{x:5,y:5,h:40}});assert.equal(between.surfaceId,'panel-14');assert.equal(between.point.h,42);
  const rising=queries.traceSegment({from:{x:5,y:5,h:43},to:{x:5,y:5,h:47}});assert.equal(rising.surfaceId,'tower-roof');assert.deepEqual(rising.normal,{x:0,y:0,h:-1});
  assert.equal(queries.traceSegment({from:{x:100,y:100,h:50},to:{x:100,y:100,h:0}}),null);
});

test('axis-aligned contacts handle tangent/parallel/inside/zero-length segments and deterministic coincident surfaces',()=>{
  const world=tiny();world.surfaces.push(floorPanel(world,1));world.surfaces.push({...floorPanel(world,1),id:'aaa-panel'});let queries=compileWorld(world);
  const request={from:{x:5,y:5,h:5},to:{x:5,y:5,h:1}};assert.equal(queries.traceSegment(request).surfaceId,'aaa-panel');assert.equal(queries.findSupport({position:request.from,maxDropM:5,requireFloor:true}).surfaceId,'aaa-panel');
  world.surfaces.reverse();assert.deepEqual(compileWorld(world).traceSegment(request),queries.traceSegment(request));
  const point={x:5,y:5,h:3};const exact=queries.traceSegment({from:point,to:point});assert.equal(exact.fraction,0);assert.equal(exact.startedInside,true);assert.deepEqual(exact.normal,{x:0,y:0,h:0});
  assert.equal(queries.traceSegment({from:{x:1,y:2,h:3},to:{x:2,y:2,h:3}}).point.x,2);
  assert.equal(queries.traceSegment({from:{x:1,y:1,h:3},to:{x:1,y:14,h:3}}),null);
  assert.equal(queries.traceSegment({from:{x:5,y:5,h:3.000001},to:{x:6,y:5,h:3.000001}}),null);
  assert.throws(()=>queries.traceSegment({...request,radius:.1}),error=>error.code==='INVALID_FIELD');assert.equal(queries.sweepSphere,undefined);
});

test('spatial queries partition authored records rather than scanning a floor-by-cell allocation',()=>{
  const world=createWorld({id:'indexed',name:'Indexed',widthM:240,depthM:240,floorCount:32,storyHeightM:3,groundHeightM:0,heightM:100});
  for(let i=0;i<1024;i++){const index=i%32,panel=floorPanel(world,index,Math.floor(i/32)*6,(i%32)*6,2);panel.id='grid-'+i;world.surfaces.push(panel);}
  const queries=compileWorld(world),bounds={min:{x:5,y:5,h:0},max:{x:9,y:9,h:100}},result=queries.queryBounds(bounds);
  const expected=world.surfaces.filter(surface=>surface.bounds.min.x<=bounds.max.x&&surface.bounds.max.x>=bounds.min.x&&surface.bounds.min.y<=bounds.max.y&&surface.bounds.max.y>=bounds.min.y&&surface.bounds.min.h<=bounds.max.h&&surface.bounds.max.h>=bounds.min.h).map(s=>s.id).sort();
  assert.deepEqual(result.surfaces.map(s=>s.id),expected);assert.ok(result.examinedSurfaces<64);assert.ok(result.visitedNodes<100);assert.equal(queries.stats().denseCells,0);
  for(const index of [0,9,10,31]){const x=Math.floor(index/32)*6+1,y=(index%32)*6+1;const hit=queries.traceSegment({from:{x,y,h:100},to:{x,y,h:0}});assert.equal(hit.surfaceId,'grid-'+index);assert.equal(hit.point.h,index*3);}
});

test('compiled snapshots and returned records stay isolated from caller edits and presentation choices',()=>{
  const world=towerFixture(),queries=compileWorld(world),before=queries.snapshot(),request={from:{x:5,y:5,h:50},to:{x:5,y:5,h:0}},hit=queries.traceSegment(request);
  world.surfaces.length=0;queries.recordsForFloor('floor-14').surfaces.length=0;queries.snapshot().floors[15].elevationM=1;queries.getFloor('floor-14').label='Changed';hit.point.h=0;
  assert.deepEqual(queries.snapshot(),before);assert.equal(queries.traceSegment(request).point.h,45);assert.equal(queries.getFloor('floor-14').label,'15');assert.ok(Object.isFrozen(queries));
  assert.throws(()=>queries.traceSegment({...request,visibleFloor:'floor-1'}),error=>error.code==='INVALID_FIELD');
});

test('strict floor/height/bounds limits and cross-version/profile rejection never normalize input',()=>{
  const world=towerFixture();
  for(const [change,code] of [
    [w=>w.version=2,'UNSUPPORTED_SCHEMA'],[w=>w.kind='aft-map','UNSUPPORTED_SCHEMA'],[w=>w.profileId='basements-v1','UNSUPPORTED_PROFILE'],
    [w=>w.floors[0].elevationM=-3,'INVALID_NUMBER'],[w=>w.floors[10].index=9,'INVALID_FLOOR_ORDER'],[w=>w.floors[10].elevationM=27,'INVALID_HEIGHT_ORDER'],
    [w=>w.floors.push(...Array.from({length:17},()=>w.floors[0])),'INVALID_LIST'],[w=>w.bounds.widthM=4097,'INVALID_NUMBER'],[w=>w.bounds.heightM=2049,'INVALID_NUMBER'],
    [w=>w.surfaces[0].bounds.max.x=241,'OUTSIDE_WORLD'],[w=>w.surfaces[0].bounds.max.x=2,'INVALID_GEOMETRY'],[w=>w.surfaces[0].bounds.max.h=1,'INVALID_SUPPORT'],
    [w=>w.floors[0].id=w.surfaces[0].id,'DUPLICATE_ID'],[w=>w.floors=[],'MISSING_FLOORS'],[w=>w.surfaces[0].role='sloped-mesh','UNSUPPORTED_GEOMETRY']
  ])rejects(world,change,code);
  assert.equal(createWorld({id:'plinth',name:'Raised base',widthM:24,depthM:24,floorCount:15,storyHeightM:3.2,groundHeightM:.125,heightM:60}).floors[14].elevationM,44.925000000000004);
});

test('explicit sub-ground slab bounds preserve native 2.12m stories without enabling negative floors or basements',()=>{
  const world=createWorld({id:'editor-native-height',name:'Native scale semantic binding fixture',widthM:32,depthM:32,floorCount:16,storyHeightM:2.12,groundHeightM:0,minHeightM:-.12,heightM:40});
  // These are explicit authored decimal elevations; the loader never rounds or
  // guesses a model's heights. A binder reuses these values for its surfaces.
  world.floors.forEach((floor,index)=>floor.elevationM=Number((index*2.12).toFixed(2)));world.floors[15].label='Roof';
  for(let index=0;index<15;index++)world.surfaces.push(floorPanel(world,index));
  world.surfaces.push({id:'native-ground-slab',floorId:'floor-0',role:'solid',bounds:{min:{x:2,y:2,h:-.12},max:{x:14,y:14,h:0}},supports:true,supportFloorId:'floor-0'},
    {id:'native-roof-deck',floorId:'floor-14',role:'roof',bounds:{min:{x:2,y:2,h:31.8},max:{x:14,y:14,h:31.8}},supports:true,supportFloorId:'floor-15'},
    {id:'native-low-roof',floorId:'floor-1',role:'roof',bounds:{min:{x:20,y:2,h:4.24},max:{x:28,y:10,h:4.24}},supports:true,supportFloorId:'floor-2'});
  const wire=serializeWorld(world),restored=openWorld(wire),queries=compileWorld(restored);assert.equal(restored.bounds.minHeightM,-.12);assert.equal(restored.floors[14].elevationM,29.68);
  const deck=queries.traceSegment({from:{x:5,y:5,h:40},to:{x:5,y:5,h:-1}});assert.equal(deck.surfaceId,'native-roof-deck');assert.equal(deck.point.h,31.8);
  const underside=queries.traceSegment({from:{x:5,y:5,h:-1},to:{x:5,y:5,h:0}});assert.equal(underside.surfaceId,'native-ground-slab');assert.ok(Math.abs(underside.point.h+.12)<1e-12);assert.deepEqual(underside.normal,{x:0,y:0,h:-1});
  assert.equal(queries.findSupport({position:{x:24,y:6,h:5},maxDropM:2,requireFloor:true}).floorId,'floor-2');
  rejects(world,w=>w.floors[0].elevationM=-.12,'INVALID_NUMBER');rejects(world,w=>w.floors[0].index=-1,'INVALID_NUMBER');rejects(world,w=>w.bounds.minHeightM=0,'OUTSIDE_WORLD');rejects(world,w=>w.bounds.minHeightM=-2049,'INVALID_NUMBER');assert.deepEqual(openWorld(wire),restored);
});

test('missing landings, guessed actor floors and unsupported traversal semantics reject as a whole',()=>{
  const world=towerFixture();
  for(const [change,code] of [
    [w=>w.links[9].to.surfaceId='missing-panel','INVALID_LANDING'],[w=>w.links[9].to.position.h=30.1,'INVALID_LANDING'],[w=>w.links[9].to.position.x=20,'INVALID_LANDING'],
    [w=>w.links[9].to.floorId='missing-floor','MISSING_FLOOR'],[w=>w.links[9].kind='lift','UNSUPPORTED_TRAVERSAL'],[w=>w.entities[0].position.h=29.9,'INVALID_LANDING'],
    [w=>w.entities[0].supportSurfaceId=null,'INVALID_LANDING'],[w=>w.surfaces.find(s=>s.id==='tower-roof').supportFloorId='floor-14','INVALID_SUPPORT'],
    [w=>w.entities[0].content.version='','INVALID_TEXT'],[w=>w.entities[0].hp=50,'INVALID_FIELD']
  ])rejects(world,change,code);
});

test('malformed JSON, UTF-8 byte limits, nonfinite values and record budgets fail closed',()=>{
  assert.throws(()=>openWorld('{broken'),error=>error.code==='INVALID_JSON');assert.throws(()=>openWorld(' '.repeat(C.limits.bytes+1)),error=>error.code==='BYTE_LIMIT');
  assert.throws(()=>openWorld(JSON.stringify({text:'é'.repeat(C.limits.bytes/2)})),error=>error.code==='BYTE_LIMIT');
  const world=tiny();assert.throws(()=>openWorld({...world,name:NaN}),error=>error.code==='INVALID_JSON');assert.throws(()=>openWorld({...world,name:Infinity}),error=>error.code==='INVALID_JSON');
  for(const [group,limit] of [['surfaces',C.limits.surfaces],['entities',C.limits.entities],['links',C.limits.links]])assert.throws(()=>openWorld({...world,[group]:Array(limit+1).fill(null)}),error=>error.code==='INVALID_LIST');
  assert.ok(validateWorld({...world,extra:'future-field'})[0].path==='');assert.deepEqual(validateWorld(world),[]);
});

test('accessors, hidden/symbol fields, sparse arrays, prototype objects and cycles reject without executing getters',()=>{
  let reads=0;const accessor=tiny();Object.defineProperty(accessor.floors[0],'label',{enumerable:true,get(){reads++;throw Error('Getter executed');}});assert.throws(()=>openWorld(accessor),error=>error.code==='INVALID_JSON');assert.equal(reads,0);
  const hidden=tiny();Object.defineProperty(hidden,'secret',{value:1});assert.throws(()=>openWorld(hidden),error=>error.code==='INVALID_JSON');
  const symbol=tiny();symbol[Symbol('extra')]=1;assert.throws(()=>openWorld(symbol),error=>error.code==='INVALID_JSON');
  const sparse=tiny();delete sparse.floors[0];assert.throws(()=>openWorld(sparse),error=>error.code==='INVALID_JSON');
  const cycle=tiny();cycle.back=cycle;assert.throws(()=>openWorld(cycle),error=>error.code==='INVALID_JSON');assert.throws(()=>openWorld(new Date()),error=>error.code==='INVALID_JSON');
});

test('required schema/height/geometry/placement/traversal capabilities reject legacy and partial consumers before load',()=>{
  const world=towerFixture(),before=serializeWorld(world),requirements=worldRequirements(world),manifest=consumer(world);
  assert.equal(requirements.schema.id,'nautilus-extended-world');assert.equal(requirements.required.length,4);assert.deepEqual(assertWorldCompatible(world,manifest),world);assert.ok(negotiateCapabilities(requirements,manifest).ok);
  assert.throws(()=>assertWorldCompatible(world,engineManifest()),error=>error.code==='INCOMPATIBLE_WORLD'&&error.diagnostics.some(d=>d.code==='UNSUPPORTED_SCHEMA'));
  assert.equal(negotiateCapabilities(requirements,engineManifest()).ok,false);
  for(const [index,entry] of manifest.capabilities.entries()){const missing=structuredClone(manifest);missing.capabilities=missing.capabilities.filter(item=>item.id!==entry.id);assert.throws(()=>assertWorldCompatible(world,missing),error=>error.diagnostics.some(d=>d.message.includes(entry.id)&&d.path==='/required/'+index));}
  const future=structuredClone(manifest);future.capabilities[0].versions=[2];assert.throws(()=>assertWorldCompatible(world,future),error=>error.code==='INCOMPATIBLE_WORLD');assert.equal(serializeWorld(world),before);
  assert.equal(worldRequirements(tiny()).required.length,1);
});

test('consumer schema and capability version lists reject duplicates consistently with contract-v1 negotiation',()=>{
  const world=towerFixture();
  for(const group of ['schemas','capabilities']){
    const manifest=consumer(world);manifest[group][0].versions=[1,1];assert.equal(negotiateCapabilities(worldRequirements(world),manifest).ok,false);
    assert.throws(()=>assertWorldCompatible(world,manifest),error=>error.code==='INVALID_CONSUMER'&&error.diagnostics[0].path==='/consumer/'+group+'/0/versions/1');
    manifest[group][0].versions=[1,2];assert.deepEqual(assertWorldCompatible(world,manifest),world);assert.equal(negotiateCapabilities(worldRequirements(world),manifest).ok,true);
  }
});

test('world and schema identifiers reject LF, CRLF and other trailing characters at the true string end',()=>{
  const world=tiny(),queries=compileWorld(world),schema=JSON.parse(fs.readFileSync(new URL('../packages/world-core/extended-world-v1.schema.json',import.meta.url),'utf8')),pattern=new RegExp(schema.$defs.id.pattern);
  for(const suffix of ['\n','\r\n','\r','\u2028','\u2029',' ','/','é']){
    const id='stable-id'+suffix;assert.throws(()=>openWorld({...world,id}),error=>error.code==='INVALID_ID');assert.equal(pattern.test(id),false);assert.throws(()=>queries.getFloor('floor-0'+suffix),error=>error.code==='INVALID_ID');
    const manifest=consumer(world);manifest.id=id;assert.throws(()=>assertWorldCompatible(world,manifest),error=>error.code==='INVALID_ID');
  }
  assert.ok(pattern.test('stable-id_9.10:roof'));assert.deepEqual(openWorld({...world,id:'stable-id_9.10:roof'}).id,'stable-id_9.10:roof');
});

test('legacy migration reports preserve exact originals, unknown extensions and explicit divergent height mappings',()=>{
  const original=fs.readFileSync(new URL('./fixtures/persistence/legacy-block-v1.json',import.meta.url),'utf8'),copy=JSON.parse(original);copy.opaqueFutureField={actorFloor:'9:10',data:[1,2,3]};const text=JSON.stringify(copy,null,3)+'\n';
  for(const [sourceProfile,spacing] of [['aft-render-v1',2.12],['aft-tactical-v1',3]]){const report=reportLegacyMigration(text,{receiptId:'migration-review-'+sourceProfile,sourceProfile});assert.equal(report.ok,false);assert.equal(report.world,null);assert.equal(report.original.text,text);assert.deepEqual(JSON.parse(report.original.text),copy);assert.equal(report.receipt.floorSpacingM,spacing);assert.equal(report.receipt.sourceBytes,Buffer.byteLength(text));assert.equal(report.receipt.converted,false);assert.equal(report.receipt.sourceValidation,'not-performed');assert.ok(report.diagnostics.some(d=>d.path==='/opaqueFutureField'));}
  assert.throws(()=>reportLegacyMigration(text,{receiptId:'missing-profile',sourceProfile:'guess'}),error=>error.code==='SOURCE_PROFILE_REQUIRED');assert.equal(fs.readFileSync(new URL('./fixtures/persistence/legacy-block-v1.json',import.meta.url),'utf8'),original);
  assert.throws(()=>reportLegacyMigration({...copy,version:2},{receiptId:'future-source',sourceProfile:'aft-render-v1'}),error=>error.code==='UNSUPPORTED_LEGACY_SCHEMA');
});

test('legacy representability identifies high floors, exact mismatched heights and every unconverted stable record',()=>{
  const world=towerFixture(),report=reportLegacyRepresentability(world,{target:'aft-map-v2',sourceProfile:'aft-render-v1'});assert.equal(report.ok,false);assert.equal(report.legacy,null);assert.ok(report.diagnostics.some(d=>d.code==='UNREPRESENTABLE_FLOOR'&&d.path==='/floors/10'));assert.ok(report.diagnostics.some(d=>d.code==='UNREPRESENTABLE_HEIGHT'&&d.path==='/floors/1/elevationM'));
  for(const record of [...world.surfaces,...world.entities,...world.links])assert.ok(report.diagnostics.some(d=>d.message.includes(record.id)));
  const unbound=reportLegacyRepresentability(tiny(),{target:'aft-block-v1',sourceProfile:'aft-tactical-v1'});assert.equal(unbound.ok,false);assert.equal(unbound.diagnostics.length,1);
});

test('schema document agrees with contract identifiers, strict object fields and bounded collections',()=>{
  assert.equal(C.standardStoryHeightM,2+.12);assert.equal(towerFixture().floors[1].elevationM,3);
  const schema=JSON.parse(fs.readFileSync(new URL('../packages/world-core/extended-world-v1.schema.json',import.meta.url),'utf8'));assert.equal(schema.$id,C.schemaUri);assert.equal(schema.properties.kind.const,C.schemaId);assert.equal(schema.properties.profileId.const,C.profileId);assert.deepEqual([...schema.required].sort(),Object.keys(towerFixture()).sort());
  for(const key of ['floors','surfaces','entities','links'])assert.equal(schema.properties[key].maxItems,C.limits[key]);for(const entry of [schema,...Object.values(schema.$defs).filter(value=>value.type==='object')])assert.equal(entry.additionalProperties,false);
});

test('world imports, serialization and native-height queries work with browser globals, clocks and random sealed off',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url)),source=`for(const key of ['document','window','navigator','localStorage','sessionStorage','indexedDB','THREE'])Object.defineProperty(globalThis,key,{get(){throw Error('Forbidden '+key);}});Math.random=()=>{throw Error('Implicit RNG');};Date.now=()=>{throw Error('Implicit clock');};const core=await import('./packages/world-core/index.js');const {towerFixture}=await import('./tests/fixtures/extended-world/build-fixtures.mjs');const world=core.openWorld(core.serializeWorld(towerFixture()));const hit=core.compileWorld(world).traceSegment({from:{x:5,y:5,h:50},to:{x:5,y:5,h:0}});if(hit.point.h!==45)throw Error('Wrong upper-floor contact');`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr);
  const closure=spawnSync(process.execPath,['--experimental-vm-modules','tests/helpers/headless-closure.mjs','--entry','packages/world-core/index.js'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(closure.status,0,closure.stderr);const report=JSON.parse(closure.stdout);assert.deepEqual(report.violations,[]);assert.ok(report.files.every(file=>file.startsWith('packages/world-core/')));
});
