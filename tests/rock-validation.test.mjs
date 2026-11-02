import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ROCK_ITEM,ROCK_PROFILE,ROCK_CONTRACT,createRock,openRock,serializeRock,pickupRock,previewRockThrow,throwRock,stepRock,evaluateRockNoise} from '../packages/items-core/index.js';
import {lob} from '../packages/items-core/lob.js';
const make=()=>createRock({id:'rock-test',position:{x:0,y:0,h:.055}});
const pick=rock=>({commandId:'pick-test',rockId:rock.id,expectedRevision:rock.revision,actorId:'actor-test',actorPosition:{x:0,y:0,h:0},permitted:true,capacity:true});
const carried=()=>{const rock=make();return pickupRock(rock,pick(rock)).rock;};
const aim=rock=>({commandId:'throw-test-command',throwId:'throw-test',rockId:rock.id,expectedRevision:rock.revision,actorId:'actor-test',origin:{x:0,y:0,h:1.4},target:{x:8,y:2,h:.055},permitted:true});
const airborne=()=>{const rock=carried();return throwRock(rock,aim(rock)).rock;};
const snapshot=value=>structuredClone(value);

test('rock descriptor, explicit IDs and versioned profile are strict copied data',()=>{
  assert.equal(ROCK_ITEM.id,'item:rock');assert.equal(ROCK_PROFILE.radius,.055);assert.equal(ROCK_CONTRACT.id,'nautilus-rock-items-v1');assert.ok(Object.isFrozen(ROCK_ITEM));assert.ok(Object.isFrozen(ROCK_PROFILE));
  const rock=createRock({id:'unique-rock',position:{x:2,y:-3,h:4},profile:{noiseRadius:4,pickupReach:1,maxThrowRange:10}});
  assert.equal(rock.profile.noiseRadius,4);assert.equal(ROCK_PROFILE.noiseRadius,8);assert.equal(rock.position.h,4);
  const loaded=openRock(serializeRock(rock));assert.deepEqual(loaded,rock);loaded.position.x=99;loaded.profile.noiseRadius=0;assert.equal(rock.position.x,2);assert.equal(rock.profile.noiseRadius,4);
  for(const specification of [{position:{x:0,y:0,h:0}},{id:'',position:{x:0,y:0,h:0}},{id:'rock space',position:{x:0,y:0,h:0}},{id:'rock',position:{x:0,y:0,z:0}},{id:'rock',position:{x:0,y:0,h:NaN}},{id:'rock',position:{x:0,y:0,h:0},future:true}])assert.throws(()=>createRock(specification));
  for(const profile of [{gravity:9.8},{radius:.045},{stepHz:60},{id:'future'},{noiseRadius:51},{pickupReach:0},{maxThrowRange:31},{future:1}])assert.throws(()=>createRock({id:'bad-profile',position:{x:0,y:0,h:0},profile}));
});

test('malformed, cross-version and inconsistent sidecars reject without normalization or accessor invocation',()=>{
  const world=make(),carrying=carried(),flight=airborne();
  const changes=[rock=>{rock.version=2;},rock=>{rock.kind='another-item';},rock=>{rock.itemId='item:grenade';},rock=>{rock.revision=-1;},rock=>{rock.extra={};},rock=>{delete rock.profile;},rock=>{rock.profile.gravity=0;},rock=>{rock.position={x:0,y:0,h:Infinity};},rock=>{rock.ownerId='unearned-owner';},rock=>{rock.revision=1;}];
  for(const change of changes){const invalid=snapshot(world);change(invalid);const before=snapshot(invalid);assert.throws(()=>openRock(invalid));assert.throws(()=>serializeRock(invalid));assert.deepEqual(invalid,before);}
  for(const change of [rock=>{rock.position={x:0,y:0,h:0};},rock=>{rock.ownerId=null;},rock=>{rock.revision=0;}]){const invalid=snapshot(carrying);change(invalid);assert.throws(()=>openRock(invalid));}
  for(const change of [rock=>{rock.position.x+=1;},rock=>{rock.flight.ticks=1;},rock=>{rock.flight.pendingUnits=1000;},rock=>{rock.flight.velocity.h+=.01;},rock=>{rock.flight.aimTime=0;},rock=>{rock.flight.origin.h+=1;},rock=>{rock.flight.target={x:30,y:0,h:0};},rock=>{rock.flight.future=true;}]){const invalid=snapshot(flight);change(invalid);assert.throws(()=>openRock(invalid));}
  let invoked=0;const accessor=make();Object.defineProperty(accessor,'id',{get(){invoked++;return 'evil';},enumerable:true});assert.throws(()=>openRock(accessor));assert.equal(invoked,0);
  const symbol=make();symbol[Symbol('hidden')]=1;assert.throws(()=>openRock(symbol));
  const hidden=make();Object.defineProperty(hidden,'future',{value:1});assert.throws(()=>openRock(hidden));
  for(const input of [null,[],{},'{','null','x'.repeat(16001)])assert.throws(()=>openRock(input));
  const rejected=throwRock({...flight,version:99},aim(flight));assert.equal(rejected.ok,false);assert.equal(rejected.rock,null);assert.deepEqual(rejected.inventoryDelta,[]);assert.deepEqual(rejected.events,[]);
});

test('pickup and throw validate host authority, ownership, instance/revision, finite height and 3D bounds',()=>{
  const world=make(),carrying=carried(),randomState={seed:123,count:1};
  const pickupChanges=[{rockId:'another-rock'},{expectedRevision:1},{permitted:false},{capacity:false},{actorId:''},{actorPosition:{x:0,y:0,h:2}},{actorPosition:{x:0,y:0,z:0}},{actorPosition:{x:NaN,y:0,h:0}}];
  for(const change of pickupChanges){const before=snapshot(world),count=snapshot(randomState),result=pickupRock(world,{...pick(world),...change});assert.equal(result.ok,false);assert.deepEqual(world,before);assert.deepEqual(result.rock,before);assert.deepEqual(randomState,count);assert.deepEqual(result.events,[]);assert.deepEqual(result.inventoryDelta,[]);}
  const throwChanges=[{rockId:'another-rock'},{expectedRevision:0},{actorId:'different-actor'},{permitted:false},{throwId:''},{origin:{x:NaN,y:0,h:1}},{target:{x:0,y:0,h:Infinity}},{target:{x:0,y:0,h:30}},{target:{x:13,y:0,h:1.4}}];
  for(const change of throwChanges){const before=snapshot(carrying),command={...aim(carrying),...change};for(const operation of [previewRockThrow,throwRock]){const result=operation(carrying,command);assert.equal(result.ok,false);assert.deepEqual(result.rock,before);assert.deepEqual(result.events,[]);assert.deepEqual(result.inventoryDelta,[]);}assert.deepEqual(carrying,before);assert.deepEqual(randomState,{seed:123,count:1});}
  assert.equal(throwRock(world,aim(world)).ok,false);assert.equal(pickupRock(carrying,pick(carrying)).ok,false);
  const boundary={...aim(carrying),target:{x:12,y:0,h:1.4}};assert.ok(throwRock(carrying,boundary).ok);
  const changed=pickupRock(world,{...pick(world),actorPosition:{x:0,y:0,h:world.position.h+world.profile.pickupReach}});assert.ok(changed.ok,changed.reason);
});

test('only the pinned bounded grenade lob math is reused with native heights and source notices',()=>{
  const review=JSON.parse(fs.readFileSync(new URL('../docs/reviews/2026-10-29-rock-distraction.sources.json',import.meta.url))),bytes=fs.readFileSync(new URL('../'+review.source.preservedFile,import.meta.url));
  assert.equal(bytes.length,review.source.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),review.source.sha256);
  const text=bytes.toString('utf8'),start=text.indexOf('export function grenadeLob('),end=text.indexOf('const rounded=',start),source=text.slice(start,end).replaceAll('\r\n','\n');
  assert.equal(createHash('sha256').update(source).digest('hex'),review.source.functionNormalizedLfSha256);
  const native=vm.runInNewContext('const GRENADE={gravity:9.81};'+source.replace('export ','')+';grenadeLob',Object.create(null));
  for(const origin of [{x:0,y:0,h:1.4},{x:-2.5,y:4,h:8},{x:30,y:30,h:-1}])for(const target of [{x:0,y:0,h:0},{x:8,y:3,h:1},{x:1,y:1,h:10}]){const expected=native(origin,target),actual=lob(origin,target,9.81);assert.equal(actual.velocity.x,expected.x);assert.equal(actual.velocity.y,expected.y);assert.equal(actual.velocity.h,expected.h);assert.equal(actual.aimTime,expected.time);}
});

test('items core imports and executes without models, browser globals, random values or implicit clock',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url)),code=`for(const key of ['document','window','navigator','localStorage','sessionStorage','indexedDB','THREE'])Object.defineProperty(globalThis,key,{get(){throw Error('Forbidden '+key);}});Math.random=()=>{throw Error('Implicit RNG');};Date.now=()=>{throw Error('Implicit clock');};const core=await import('./packages/items-core/index.js');const rock=core.createRock({id:'node-rock',position:{x:0,y:0,h:.055}});const result=core.pickupRock(rock,{commandId:'node-pickup',rockId:rock.id,expectedRevision:0,actorId:'node-actor',actorPosition:{x:0,y:0,h:0},permitted:true,capacity:true});if(!result.ok)throw Error(result.reason);`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr);
  const scan=spawnSync(process.execPath,['--experimental-vm-modules','tests/helpers/headless-closure.mjs','--entry','packages/items-core/index.js'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(scan.status,0,scan.stderr);const report=JSON.parse(scan.stdout);assert.deepEqual(report.violations,[]);assert.ok(report.files.every(file=>file.startsWith('packages/items-core/')));
});
