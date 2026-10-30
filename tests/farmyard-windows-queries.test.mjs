import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as windows from '../packages/windows-core/index.js';
import {FARMYARD_WINDOW_CATALOGUE as catalogue,FARMYARD_WINDOW_DEFINITIONS as definitions,farmyardWindowDefinition,farmyardStoreysToMetres} from '../packages/adapters/farmyard/windows.js';
import {windowSystem,windowDefinition} from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/window-catalogue.js';
import {windowToWorld,legacyWallSpan} from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/window-system.js';
import {sourceWindowProbe} from '../tools/farmyard-window-contract-fixture.mjs';
import {moduleClosure} from '../tools/distribution.mjs';
import {windowGeometrySchema} from '../tools/farmyard-window-geometry-schema.mjs';
const clone=value=>structuredClone(value),fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/farmyard-windows-contract/proposal.json',import.meta.url)));
const compact=spec=>({sourceCommit:fixture.sourceCommit,version:spec.raw.version,id:spec.id,joins:spec.raw.joins,dimensions:spec.raw.dimensions??null,width:spec.width,height:spec.height,bounds:spec.bounds,panes:spec.panes.map(({id,min,max})=>({id,min,max})),solids:spec.solids});
function preparation(placements=fixture.placements,grid=fixture.grid){
  const document={kind:'nautilus-window-placement-document',version:1,id:'window-yard',profileId:fixture.profileProposal,queryRevision:0,placements:clone(placements),bindings:placements.map((p,i)=>({placementId:p.id,engineInstanceId:'window-'+(i+1)})),observedBroken:{}};
  const records=windowSystem.compile({windows:clone(placements)}),edgeFacts=records.flatMap(r=>r.edges.map(edge=>({edge,semantic:'wall',locked:false,sourceKind:'brick-wall'})));
  return {document,options:{definitions,world:{id:'yard-world',floorId:'ground',grid:clone(grid)},edgeFacts}};
}
function compile(prep=preparation()){return windows.compileWindowPlacements(prep.document,prep.options);}
const query=(compiled,ray,purpose='projectile')=>windows.queryWindowSegment(compiled,{purpose,floorId:'ground',...ray});
const refused=(action,code)=>assert.throws(action,e=>e.code===code&&e.diagnostics?.[0]?.path!==undefined,code);
function comparedHit(hit){return hit?{placementId:hit.placementId,partId:hit.partId,paneId:hit.paneId,kind:hit.kind,role:hit.role,t:hit.tEnter,sourceOrder:hit.sourceOrder}:null;}

test('native provider preserves all 39 presets, every join and the approved definition digests',()=>{
  assert.deepEqual(catalogue.presets.map(p=>p.id),fixture.catalogue.ids);assert.equal(catalogue.templateId,fixture.catalogue.customTemplate);
  for(const preset of catalogue.presets)for(const left of [false,true])for(const right of [false,true]){
    const joins={left,right},actual=farmyardWindowDefinition({id:preset.id,joins}),expected=compact(windowDefinition(preset.id,joins));assert.deepEqual(actual,JSON.parse(JSON.stringify(expected)),preset.id);
    assert.equal(createHash('sha256').update(JSON.stringify(actual)).digest('hex'),createHash('sha256').update(JSON.stringify(expected)).digest('hex'));
  }
  const compiled=windows.inspectWindowGeometry(compile());assert.deepEqual(compiled.content,fixture.content);assert.equal(compiled.contentDigest,fixture.identityContract.scope.contentDigest);
});

test('every preset and join at every quarter turn retains exact source member bounds and ordering',()=>{
  for(const preset of catalogue.presets)for(const left of [false,true])for(const right of [false,true])for(const rotation of [0,90,180,270]){
    const center=preset.width%2?40:39.5,horizontal=rotation%180===0,p={id:'native',definitionId:preset.id,x:horizontal?center:40.5,y:horizontal?40.5:center,rotation,joins:{left,right}},prep=preparation([p],{width:80,height:80}),actual=windows.inspectWindowGeometry(compile(prep)),expected=windowSystem.boxes({windows:[p]});
    assert.deepEqual(actual.content[0].coveredEdges,windowSystem.compile({windows:[p]})[0].edges);
    assert.deepEqual(actual.members.map(m=>({...m.bounds,kind:m.kind,windowId:m.placementId,partId:m.partId,role:m.role,paneId:m.paneId})),expected.map(({x0,x1,y0,y1,z0,height,kind,windowId,partId,role,paneId})=>({x0,x1,y0,y1,z0,height,kind,windowId,partId,role:role??null,paneId:paneId??null})));
  }
});

test('template metres and explicit source storey rounding preserve tall one-pane sheets at all rotations',()=>{
  assert.equal(farmyardStoreysToMetres(5),10.6);assert.equal(farmyardWindowDefinition({id:catalogue.templateId,dimensions:{width:20,height:5}}).height,5);
  for(const record of fixture.rotations){const inspection=windows.inspectWindowGeometry(compile(preparation([record.placement],fixture.grid)));assert.deepEqual(inspection.content[0].coveredEdges,record.coveredEdges);assert.equal(inspection.members[1].bounds.height,10.6);assert.equal(inspection.members[1].paneId,'r0c0');}
  const tall=farmyardWindowDefinition({id:catalogue.templateId,dimensions:{width:1,height:1000000}});assert.equal(tall.height,1000000,'No invented storey cap.');
  for(const height of [0,-1,1e-50,1e38,Infinity])assert.throws(()=>farmyardWindowDefinition({id:catalogue.templateId,dimensions:{width:1,height}}));
  refused(()=>farmyardWindowDefinition({id:catalogue.templateId}),'MISSING_DIMENSIONS');refused(()=>farmyardWindowDefinition({id:'window.full.clear.1m',dimensions:{width:1,height:2}}),'UNSUPPORTED_DIMENSIONS');
});

test('queries match isolated source glass/sill/mullion/lower wall and footprint walking vectors without writes',()=>{
  const compiled=compile(),before=windows.serializeWindowGeometry(compiled);
  for(const vector of fixture.queryVectors){const actual=query(compiled,vector.ray,vector.purpose);assert.deepEqual(comparedHit(actual.nearest),vector.expected,vector.id);assert.equal(actual.geometryDigest,compiled.geometryDigest);assert.match(actual.scope,/host must compose/);if(actual.nearest){assert.ok(actual.nearest.tExit>=actual.nearest.tEnter);assert.equal(Object.values(actual.nearest.normal).filter(n=>n!==0).length,1);}}
  assert.equal(windows.serializeWindowGeometry(compiled),before);
});

test('source-exact sloping and near-parallel segments expose intervals and keep source order on ties',()=>{
  const p={id:'grid',definitionId:'window.waist.grid-3x2.3m',x:10.5,y:10,rotation:90},compiled=compile(preparation([p]));
  for(const local of [[-.6,.2,3,.5,1.5,-3],[0,1.5,3,0,.2,-3],[-.6,1.15,3,-.6,1.15,-3],[-.6,2.5,3,-.6,2.5,-3]]){
    const ray={from:windowToWorld(p,local.slice(0,3)),to:windowToWorld(p,local.slice(3))};for(const purpose of ['projectile','flame','sight','walk'])assert.deepEqual(query(compiled,ray,purpose).hits.map(comparedHit),sourceWindowProbe({windows:[p]},ray,purpose));
  }
  const ray={from:{x:8,y:9,h:1.1},to:{x:8+1e-9,y:12,h:1.1}};assert.deepEqual(query(compiled,ray).hits.map(comparedHit),sourceWindowProbe({windows:[p]},ray));
});

test('observed broken masks remove only the named pane and always retain the walking reservation',()=>{
  const prep=preparation();prep.document.observedBroken=clone(fixture.sourceLifecycle.saved.windowBreaks);prep.document.queryRevision=3;const compiled=compile(prep),inspection=windows.inspectWindowGeometry(compiled),source={windows:clone(prep.document.placements),windowBreaks:clone(prep.document.observedBroken)};
  for(const v of fixture.queryVectors)assert.deepEqual(query(compiled,v.ray,v.purpose).hits.map(comparedHit),sourceWindowProbe(source,v.ray,v.purpose));
  assert.equal(query(compiled,fixture.queryVectors[0].ray).nearest.placementId,'clear-b');assert.equal(inspection.members.some(m=>m.placementId==='sheet-tall-a'&&m.kind==='glass'),false);assert.equal(inspection.members.some(m=>m.placementId==='sheet-tall-a'&&m.role==='window-passage'),true);assert.equal(inspection.members.filter(m=>m.placementId==='sheet-tall-b'&&m.kind==='glass').length,1);
  assert.equal(compiled.contentDigest,compile().contentDigest);assert.notEqual(compiled.geometryDigest,compile().geometryDigest);
});

test('native IDs that match ordinary object properties retain independent observed masks',()=>{
  const prep=preparation([{id:'constructor',definitionId:'window.full.borderless.1m',x:10,y:10.5},{id:'prototype',definitionId:'window.full.borderless.1m',x:12,y:10.5}]);prep.document.observedBroken={constructor:['r0c0'],prototype:['r0c0']};
  const compiled=compile(prep),inspection=windows.inspectWindowGeometry(compiled);assert.equal(inspection.members.length,2);assert.ok(inspection.members.every(member=>member.role==='window-passage'));assert.equal(windows.serializeWindowGeometry(windows.openWindowGeometry(windows.serializeWindowGeometry(compiled),{definitions})),windows.serializeWindowGeometry(compiled));
});

test('mutating caller documents, provider loans, inspections or query outputs cannot change a compiled snapshot',()=>{
  const prep=preparation(),compiled=compile(prep),before=windows.serializeWindowGeometry(compiled),inspection=windows.inspectWindowGeometry(compiled),hit=query(compiled,fixture.queryVectors[0].ray);
  prep.document.placements[0].x=1;prep.document.observedBroken['clear-a']=['r0c0'];prep.options.world.grid.width=1;prep.options.edgeFacts[0].locked=true;inspection.members[0].bounds.height=999;inspection.document.placements[0].id='changed';hit.nearest.bounds.height=99;hit.hits[0].point.h=99;
  assert.equal(windows.serializeWindowGeometry(compiled),before);assert.equal(query(compiled,fixture.queryVectors[0].ray).nearest.point.h,1.1);assert.equal(Object.isFrozen(compiled),true);
  const loan=farmyardWindowDefinition({id:'window.full.clear.1m'}),single=preparation([{id:'a',definitionId:loan.id,x:10,y:10.5}]);single.options.definitions={...definitions,resolve(request){request.id='changed';return loan;}};const owned=compile(single),saved=windows.serializeWindowGeometry(owned);loan.panes[0].min[0]=999;assert.equal(windows.serializeWindowGeometry(owned),saved);
});

test('geometry-only snapshots round trip exact masks/tokens and reject changed or partial prospective data',()=>{
  const prep=preparation();prep.document.observedBroken={'clear-a':['r0c0']};prep.document.queryRevision=77;const compiled=compile(prep),text=windows.serializeWindowGeometry(compiled),restored=windows.openWindowGeometry(text,{definitions});assert.equal(windows.serializeWindowGeometry(restored),text);assert.deepEqual(query(restored,fixture.queryVectors[0].ray),query(compiled,fixture.queryVectors[0].ray));
  for(const mutate of [s=>s.document.placements[0].x+=1,s=>s.document.observedBroken={},s=>s.document.queryRevision++,s=>s.world.id='different-world',s=>s.resolvedDefinitions[0].panes[0].max[0]-=.1,s=>s.contentDigest='0'.repeat(64),s=>s.geometryDigest='f'.repeat(64)]){const s=JSON.parse(text);mutate(s);assert.throws(()=>windows.openWindowGeometry(s,{definitions}));assert.equal(windows.serializeWindowGeometry(compiled),text);}
  const partial=JSON.parse(text);delete partial.document.observedBroken;refused(()=>windows.openWindowGeometry(partial,{definitions}),'MISSING_FIELD');
});

test('semantic conflicts cover every door spelling, locks and retained underlays before any accepted scene changes',()=>{
  const accepted=compile(),before=windows.serializeWindowGeometry(accepted);
  for(const sourceKind of ['door-closed','door-open','jail-door-closed','jail-door-open','door.double.leaf','other-custom-family'])for(const underlay of [false,true]){const prep=preparation();const door={semantic:'door',locked:false,sourceKind};if(underlay)prep.options.edgeFacts[0].underlay=door;else Object.assign(prep.options.edgeFacts[0],door);refused(()=>compile(prep),'WINDOW_DOOR_CONFLICT');}
  for(const underlay of [false,true]){const prep=preparation();if(underlay)prep.options.edgeFacts[0].underlay={semantic:'wall',locked:true};else prep.options.edgeFacts[0].locked=true;refused(()=>compile(prep),'WINDOW_DOOR_CONFLICT');}
  const missing=preparation();missing.options.edgeFacts.shift();refused(()=>compile(missing),'MISSING_EDGE_FACT');assert.equal(windows.serializeWindowGeometry(accepted),before);
});

test('legacy clipping removes covered edges and clips only actual adjacent 1.12 m legacy overhang',()=>{
  const compiled=compile(),covered=new Set(fixture.content.flatMap(c=>c.coveredEdges));
  for(const edge of ['s:6:12','s:7:12','s:9:12','s:10:12','s:4:12']){const [axis,x,y]=edge.split(':'),n=Number(x),wall={provider:'farmyard-legacy-wall-v1',edge,floorId:'ground',bounds:{x0:n-.56,x1:n+.56,y0:Number(y)+.42,y1:Number(y)+.58,z0:0,height:2}},copy=clone(wall),expected=legacyWallSpan(edge,covered),actual=windows.clipWindowLegacyWall(compiled,wall);assert.deepEqual(wall,copy);if(!expected)assert.equal(actual,null);else{assert.equal(actual.bounds.x0,expected.min);assert.equal(actual.bounds.x1,expected.max);}}
  const wall={provider:'native-curved-wall',edge:'s:6:12',floorId:'ground',bounds:{x0:5.44,x1:6.56,y0:12.42,y1:12.58,z0:0,height:2}};refused(()=>windows.clipWindowLegacyWall(compiled,wall),'UNSUPPORTED_LEGACY_WALL');wall.provider='farmyard-legacy-wall-v1';wall.bounds.x0=5;refused(()=>windows.clipWindowLegacyWall(compiled,wall),'UNSUPPORTED_LEGACY_WALL');
  const p={id:'turned',definitionId:'window.full.clear.3m',x:12.5,y:8,rotation:90},turned=compile(preparation([p]));const result=windows.clipWindowLegacyWall(turned,{provider:'farmyard-legacy-wall-v1',edge:'e:12:6',floorId:'ground',bounds:{x0:12.42,x1:12.58,y0:5.44,y1:6.56,z0:0,height:2}});assert.equal(result.bounds.y1,6.5);
});

test('malformed content and unsupported geometry fail explicitly, without silently normalizing source IDs or scale',()=>{
  const cases=[['DUPLICATE_PLACEMENT',p=>p.document.placements.push(clone(p.document.placements[0]))],['UNSUPPORTED_ROTATION',p=>p.document.placements[0].rotation=45],['UNSUPPORTED_FLOOR',p=>p.document.placements[0].z=1],['UNSUPPORTED_FLOOR',p=>p.options.world.floorId='upper'],['UNALIGNED_WINDOW',p=>p.document.placements[0].x+=.125],['MISSING_BINDING',p=>p.document.bindings.shift()],['UNKNOWN_PANE',p=>p.document.observedBroken={'clear-a':['r0c9']}],['UNKNOWN_PANE',p=>p.document.observedBroken={'clear-a':['r0c0','r0c0']}],['UNKNOWN_PLACEMENT',p=>p.document.observedBroken={unknown:[]}],['UNKNOWN_FIELD',p=>p.document.placements[0].scale=2],['MISSING_FIELD',p=>delete p.document.observedBroken],['WINDOW_OUTSIDE_WORLD',p=>p.options.world.grid.width=10],['UNKNOWN_WINDOW_DEFINITION',p=>p.document.placements[0].definitionId='window.decorative-bay'],['INVALID_INTEGER',p=>p.document.placements[3].dimensions.width=20.5]];
  for(const [code,change]of cases){const p=preparation();change(p);refused(()=>compile(p),code);}
  const p=preparation();p.document.bindings[0].engineInstanceId=p.document.placements.at(-1).id;refused(()=>compile(p),'INVALID_ID');
  const overlap=preparation();overlap.document.placements[1].y=overlap.document.placements[0].y;refused(()=>compile(overlap),'OVERLAPPING_WINDOWS');
});

test('descriptor-safe parsing refuses getters, hidden/symbol properties, sparse/cyclic/exotic data and budgets',()=>{
  let calls=0;for(const alter of [p=>Object.defineProperty(p.document,'extra',{enumerable:true,get(){calls++;throw Error('getter');}}),p=>Object.defineProperty(p.document,'hidden',{value:1}),p=>p.document[Symbol('x')]=1,p=>p.document.placements=new Array(2),p=>p.document.loop=p.document,p=>p.document.observedBroken=new Map(),p=>p.document.queryRevision=-0,p=>p.document.extra='x'.repeat(8000001),p=>{let v={};for(let i=0;i<30;i++)v={v};p.document.extra=v;}]){const p=preparation();alter(p);assert.throws(()=>compile(p));}assert.equal(calls,0);
  const p=preparation();Object.defineProperty(p.options,'definitions',{enumerable:true,get(){calls++;return definitions;}});refused(()=>compile(p),'INVALID_OPTIONS');assert.equal(calls,0);
  const provider=preparation();provider.options.definitions={...definitions,resolve:()=>({get sourceCommit(){calls++;return fixture.sourceCommit;}})};refused(()=>compile(provider),'INVALID_DATA');assert.equal(calls,0);
});

test('projectile/flame embedded origins refuse explicitly; unsupported queries and forged compiled handles fail',()=>{
  const compiled=compile(),ray={from:{x:8,y:12.5,h:1.1},to:{x:8,y:5,h:1.1}};for(const purpose of ['projectile','flame'])refused(()=>query(compiled,ray,purpose),'EMBEDDED_PROJECTILE_ORIGIN');assert.equal(query(compiled,ray,'sight').nearest,null);
  refused(()=>query({...compiled},fixture.queryVectors[0].ray),'INVALID_COMPILED_GEOMETRY');refused(()=>query(compiled,fixture.queryVectors[0].ray,'blast'),'UNSUPPORTED_QUERY_PURPOSE');refused(()=>windows.queryWindowSegment(compiled,{purpose:'walk',floorId:'upper',...ray}),'UNSUPPORTED_FLOOR');
});

test('candidate closure stays engine-only/headless as explicit authority/state APIs are added',()=>{
  const closure=moduleClosure(['packages/windows-core/index.js','packages/adapters/farmyard/windows.js']);assert.ok(closure.every(f=>f.startsWith('packages/')));assert.ok(closure.every(f=>!/vendor|three|rules-core|world-core|doors|renderer/.test(f)));assert.ok(closure.filter(f=>f.includes('/map-core/')).every(f=>['packages/map-core/requirements.js','packages/map-core/contract-manifest.js'].includes(f)));
  for(const name of ['createWindowState','stageConfirmedWindowImpact','openWindowState','serializeWindowState','windowRequirements'])assert.equal(typeof windows[name],'function');
  const child=spawnSync(process.execPath,['--input-type=module','-e',`for(const key of ['window','document','navigator','THREE','fetch','localStorage','performance'])Object.defineProperty(globalThis,key,{get(){throw Error(key)}});Math.random=()=>{throw Error('RNG')};Date.now=()=>{throw Error('clock')};const m=await import('./packages/adapters/farmyard/windows.js');await import('./packages/windows-core/index.js');if(m.farmyardWindowDefinition({id:'window.full.clear.3m'}).width!==3)throw Error('definition');`],{encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(child.status,0,child.stderr);
});

test('maximum source population remains within the declared aggregate geometry snapshot budget',()=>{
  const placements=Array.from({length:1024},(_,i)=>({id:'max-'+i,definitionId:'window.waist.grid-3x2.1m',x:1+(i%32)*2,y:1.5+Math.floor(i/32)*2})),prep=preparation(placements,{width:128,height:128}),compiled=compile(prep),snapshot=windows.serializeWindowGeometry(compiled);
  assert.equal(windows.inspectWindowGeometry(compiled).members.length,15360);assert.ok(new TextEncoder().encode(snapshot).length<8000000);assert.equal(windows.serializeWindowGeometry(windows.openWindowGeometry(snapshot,{definitions})),snapshot);
  prep.document.placements.push({...placements[0],id:'overflow'});refused(()=>compile(prep),'INVALID_LIST');
});

test('geometry-only structural schema remains reproducible and root release metadata stays unregistered',()=>{
  const file=new URL('../packages/windows-core/window-geometry-v1.schema.json',import.meta.url);assert.equal(fs.readFileSync(file,'utf8'),JSON.stringify(windowGeometrySchema(),null,2)+'\n');
  const root=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.equal(root.version,'0.10.0');assert.equal(root.exports['./windows'],undefined);assert.equal(root.exports['./adapters/farmyard/windows'],undefined);
  const bad=preparation();bad.document.placements[0].rotation=null;refused(()=>compile(bad),'UNSUPPORTED_ROTATION');const ground=preparation();ground.document.placements[0].z=null;refused(()=>compile(ground),'UNSUPPORTED_FLOOR');refused(()=>farmyardWindowDefinition({id:'window.full.clear.1m',joins:null}),'INVALID_RECORD');
  let calls=0;refused(()=>windows.openWindowGeometry(windows.serializeWindowGeometry(compile()),{get definitions(){calls++;return definitions;}}),'INVALID_OPTIONS');assert.equal(calls,0);
});
