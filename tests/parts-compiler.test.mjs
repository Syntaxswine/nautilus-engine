import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {partsConformanceFixture} from '../packages/parts-core/fixtures.js';
import {compileParts,openPartDefinition,openPartsDocument,serializePartsDocument,partsRequirements,assertPartsCompatible,exportPartsLegacy,pieceIdentity,decodePieceIdentity} from '../packages/parts-core/index.js';
import {sha256} from '../packages/parts-core/hash.js';
import {leafBounds,leafMotionBounds} from '../packages/parts-core/geometry.js';
import {compileWorld} from '../packages/world-core/index.js';
import {moduleClosure} from '../tools/distribution.mjs';
const fixture=variant=>partsConformanceFixture({variant:variant||'single'}),compile=f=>compileParts(f.document,{definitions:f.definitions,bodyProfile:f.bodyProfile}),accepted=f=>{const result=compile(f);assert.ok(result.ok,JSON.stringify(result.diagnostics));return result.scene;},child=(f,id)=>f.document.instances.flatMap(root=>root.children).find(value=>value.id===id),definition=(f,id)=>f.definitions.find(value=>value.id==='conformance:'+id);

test('portable SHA-256 matches independent standard implementation on empty, Unicode and multi-block inputs',()=>{for(const input of ['','abc','Nautilus 𝌆\u0000','a'.repeat(100000)])assert.equal(sha256(input),createHash('sha256').update(input).digest('hex'));});
test('the same settled recipes produce deterministic scenes and all world/render/source identities agree',()=>{
  const f=fixture(),before=structuredClone(f),scene=accepted(f),again=accepted(f);assert.deepEqual(scene,again);assert.deepEqual(f,before);assert.ok(Object.isFrozen(scene.world.surfaces));assert.equal(scene.interactions.doors.length,1);assert.equal(scene.interactions.stairs.length,1);assert.equal(scene.world.links[0].id,scene.interactions.stairs[0].id);
  for(const binding of scene.renderBindings){assert.ok(scene.sourceMap.some(source=>source.id===binding.id&&source.instanceId===binding.instanceId&&source.partId===binding.partId));if(binding.type==='box')assert.deepEqual(binding.bounds,scene.world.surfaces.find(surface=>surface.id===binding.surfaceId).bounds);}
  const leaf=scene.renderBindings.find(binding=>binding.type==='door-leaf'),door=scene.interactions.doors[0];assert.equal(leaf.doorId,door.id);assert.deepEqual(leaf.hinge,{x:4.03,y:3,h:0});assert.deepEqual(door.closedBounds,{min:{x:4.03,y:2.98,h:0},max:{x:4.970000000000001,y:3.02,h:1.85}});assert.equal(scene.portals.find(portal=>portal.id===leaf.portalId).doorId,door.id);assert.equal(scene.floorBindings.find(binding=>binding.instanceId==='a-upper').floorId,'floor-1');
  const reordered=structuredClone(f);reordered.definitions.reverse();reordered.document.connections.reverse();reordered.document.instances[0].children.reverse();const equivalent=accepted(reordered);assert.equal(equivalent.id,scene.id);assert.deepEqual(equivalent.world,scene.world);assert.deepEqual(equivalent.renderBindings,scene.renderBindings);
});
test('quarter turns and a second wider layout use the same definitions/compiler, with real slab holes and landings',()=>{
  const f=fixture('second-layout'),scene=accepted(f),world=compileWorld(scene.world);assert.equal(scene.interactions.doors.length,3);assert.equal(scene.interactions.stairs.length,3);
  const upperB=scene.renderBindings.filter(binding=>binding.instanceId==='b-upper'),extreme=(end,axis)=>Math[end==='min'?'min':'max'](...upperB.map(binding=>binding.bounds[end][axis]));assert.equal(extreme('min','x'),16);assert.equal(extreme('max','x'),22);assert.equal(extreme('min','y'),5);assert.equal(extreme('max','y'),13);
  for(const [instanceId,position]of [['a-upper',{x:7,y:6,h:2.05}],['b-upper',{x:19,y:9,h:2.05}]]){const hit=world.queryBounds({min:position,max:position}).surfaces.filter(surface=>scene.sourceMap.find(source=>source.id===surface.id)?.instanceId===instanceId);assert.equal(hit.length,0,instanceId+' actual hole');}
  const bStair=scene.interactions.stairs.find(stair=>scene.sourceMap.find(source=>source.id===stair.id).instanceId==='b-stairs');assert.deepEqual(bStair.from.position,{x:19,y:7,h:0});assert.deepEqual(bStair.to.position,{x:19,y:12.1,h:2.12});assert.ok(scene.renderBindings.some(binding=>binding.instanceId==='c-g-front'));
});
test('native leaf motion envelopes enclose independent sampled arcs at every cardinal pose and signed swing',()=>{
  const hinge={x:3,y:4,h:2.12},leaf={widthM:.94,heightM:1.85,thicknessM:.04,offsetM:.01,bottomM:.02};
  for(let turn=0;turn<4;turn++)for(const sign of [-1,1]){const start=turn*Math.PI/2,bounds=leafMotionBounds(hinge,start,start+sign*Math.PI/2,leaf);for(let step=0;step<=128;step++){const angle=start+sign*Math.PI/2*step/128;for(const u of [leaf.offsetM,leaf.offsetM+leaf.widthM])for(const v of [-leaf.thicknessM/2,leaf.thicknessM/2]){const point={x:hinge.x+u*Math.cos(angle)-v*Math.sin(angle),y:hinge.y+u*Math.sin(angle)+v*Math.cos(angle)};for(const axis of ['x','y'])assert.ok(point[axis]>=bounds.min[axis]-1e-12&&point[axis]<=bounds.max[axis]+1e-12);}}assert.ok(leafBounds(hinge,start,leaf).max.h<=bounds.max.h);}
  const id=pieceIdentity('a'.repeat(24),'attachment','b'.repeat(32),32767);assert.ok(id.length<=96);assert.equal(decodePieceIdentity(id).index,32767);assert.throws(()=>decodePieceIdentity(id.replace(/:[^:]+$/,':00')));
});
test('readiness rejects missing references, misaligned doors, blocked slab holes and oversized bodies with source paths',()=>{
  const cases=[
    ['MISSING_PART_CONNECTION',f=>f.document.connections[0].to=null],
    ['PART_CONNECTION_MISALIGNED',f=>child(f,'a-door').transform.x++],
    ['BLOCKED',f=>child(f,'a-upper').parameters.stairHole=false],
    ['BODY_TOO_LARGE',f=>definition(f,'stairs').parts[0].clearanceM=1.6],
    ['APERTURE_BODY_TOO_TALL',f=>{definition(f,'wall').parts[0].openings[0].heightM=1.65;definition(f,'door').parts[0].leaf.heightM=1.65;}],
    ['APERTURE_BODY_TOO_WIDE',f=>f.bodyProfile.radiusM=.6]
  ];for(const [code,mutate]of cases){const f=fixture();mutate(f);const before=structuredClone(f),result=compile(f);assert.equal(result.ok,false);assert.equal(result.diagnostics[0].code,code,JSON.stringify(result));assert.ok(result.diagnostics[0].instanceId);assert.ok(result.diagnostics[0].path.startsWith('/'));assert.ok(result.diagnostics[0].action);assert.deepEqual(f,before);}
});
test('strict new envelopes preserve incomplete connections and reject unknown transformations/data before invocation',()=>{
  const f=fixture();f.document.connections[0].to=null;assert.deepEqual(openPartsDocument(serializePartsDocument(f.document)),f.document);assert.throws(()=>exportPartsLegacy(f.document),error=>error.code==='PARTS_LEGACY_EXPORT_REFUSED');
  for(const transform of [{scale:2},{mirror:true},{quarterTurns:4},{yawRadians:.4}]){const next=fixture();Object.assign(next.document.instances[0].transform,transform);const result=compile(next);assert.equal(result.status,'unsupported');assert.equal(result.diagnostics[0].code,'UNSUPPORTED_PART_TRANSFORM');}
  let calls=0;const bad=fixture().document;Object.defineProperty(bad,'revision',{enumerable:true,get(){calls++;return 0;}});assert.equal(compileParts(bad,{}).ok,false);assert.equal(calls,0);const hidden=fixture().definitions[0];Object.defineProperty(hidden,'toJSON',{value:()=>{calls++;return {};}});assert.throws(()=>openPartDefinition(hidden));assert.equal(calls,0);
});
test('authored initial locks stay separate, decorative mode emits no collision/interaction and requirements cannot be emptied',()=>{
  const f=fixture();child(f,'a-door').initial=[{partId:'leaf',locked:true}];const scene=accepted(f);assert.equal(scene.interactions.doors[0].locked,true);assert.throws(()=>{scene.interactions.doors[0].locked=false;});const requirements=partsRequirements(scene),consumer={id:'parts-consumer',contractVersion:1,schemas:[{id:requirements.schema.id,versions:[1]}],capabilities:requirements.required.map(feature=>({id:feature.id,versions:[1]}))};assert.equal(assertPartsCompatible(scene,consumer),scene);requirements.required=[];assert.throws(()=>assertPartsCompatible(scene,{...consumer,capabilities:[]}),error=>error.diagnostics.some(item=>item.code==='UNSUPPORTED_REQUIRED_FEATURE'));
  const decorative=fixture();decorative.document.instances[0].mode='decorative';const result=compile(decorative);assert.ok(result.ok,JSON.stringify(result));assert.equal(result.status,'decorative');assert.equal(result.scene.world.surfaces.length,1);assert.equal(result.scene.interactions.doors.length,0);assert.equal(result.scene.interactions.stairs.length,0);assert.ok(result.scene.renderBindings.length>0);
  decorative.document.connections.find(connection=>connection.kind==='stair-from').to.partId='absent';assert.equal(compile(decorative).diagnostics[0].code,'MISSING_PART_SUPPORT');
});
test('parts discovery/compile runs with DOM, renderer, storage, network, clock and RNG sealed off',()=>{
  const files=moduleClosure(['packages/parts-core/index.js','packages/parts-core/fixtures.js']);assert.ok(files.every(file=>file.startsWith('packages/')&&!file.includes('/roof-')&&!file.includes('/prefab-')&&!file.endsWith('/capabilities.js')),JSON.stringify(files));
  const script=`for(const key of ['window','document','navigator','THREE','fetch','localStorage','sessionStorage','indexedDB'])Object.defineProperty(globalThis,key,{get(){throw Error('Forbidden '+key);}});Math.random=()=>{throw Error('RNG')};Date.now=()=>{throw Error('Clock')};const {partsConformanceFixture}=await import('./packages/parts-core/fixtures.js');const {compileParts,discoverPartDefinitions}=await import('./packages/parts-core/index.js');const f=partsConformanceFixture();if(discoverPartDefinitions(f.definitions).length!==6)throw Error('Discovery');const result=compileParts(f.document,{definitions:f.definitions,bodyProfile:f.bodyProfile});if(!result.ok)throw Error(JSON.stringify(result));`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
});
