import test from 'node:test';
import assert from 'node:assert/strict';
import {createRock,pickupRock,throwRock,stepRock,openRock,serializeRock} from '../packages/items-core/index.js';
const close=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
function launched(){let rock=createRock({id:'flight-rock',position:{x:0,y:0,h:.055}});rock=pickupRock(rock,{commandId:'pick-flight',rockId:rock.id,expectedRevision:rock.revision,actorId:'actor-flight',actorPosition:{x:0,y:0,h:0},permitted:true,capacity:true}).rock;return throwRock(rock,{commandId:'throw-flight-command',throwId:'throw-flight',rockId:rock.id,expectedRevision:rock.revision,actorId:'actor-flight',origin:{x:0,y:0,h:1.4},target:{x:8,y:0,h:.055},permitted:true}).rock;}
const at=(from,to,fraction)=>({x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction,h:from.h+(to.h-from.h)*fraction});
function environment({wall=3.25,ceiling=null,floor=0,supportKind='ground',trace=[]}={}){return {sweepSphere(query){
  trace.push(structuredClone(query));const {from,to,radius,stage}=query,contacts=[];
  if(wall!==null){const edge=wall-radius;if(stage==='lob'&&from.x<=edge&&to.x>=edge&&to.x>from.x){const fraction=(edge-from.x)/(to.x-from.x),center=at(from,to,fraction);contacts.push({fraction,point:{...center,x:wall},surfaceId:'high-wall',kind:'wall'});}else if(stage==='settling'&&Math.abs(from.x-edge)<1e-8)contacts.push({fraction:0,point:{...from,x:wall},surfaceId:'high-wall',kind:'wall'});}
  if(ceiling!==null){const edge=ceiling-radius;if(stage==='lob'&&from.h<=edge&&to.h>=edge&&to.h>from.h){const fraction=(edge-from.h)/(to.h-from.h),center=at(from,to,fraction);contacts.push({fraction,point:{...center,h:ceiling},surfaceId:'ceiling',kind:'ceiling'});}else if(stage==='settling'&&Math.abs(from.h-edge)<1e-8)contacts.push({fraction:0,point:{...from,h:ceiling},surfaceId:'ceiling',kind:'ceiling'});}
  const support=floor+radius;if(from.h>=support&&to.h<=support&&to.h<from.h){const fraction=(support-from.h)/(to.h-from.h),center=at(from,to,fraction);contacts.push({fraction,point:{...center,h:floor},surfaceId:floor===0?'floor':'object-top',kind:supportKind});}
  return contacts.reverse();
}};}
function run(rock,world,dt=1/60,{saveAfterImpact=false}={}){let events=[],first=null;for(let frame=0;frame<Math.ceil(10/dt)&&rock.phase==='flying';frame++){
  const result=stepRock(rock,{dt,world});assert.ok(result.ok,result.reason);rock=result.rock;events.push(...result.events);
  if(result.events.length&&!first){first=structuredClone(rock);if(saveAfterImpact)rock=openRock(serializeRock(rock));}
}assert.equal(rock.phase,'world');return {rock,events,first};}

test('a high wall emits once then quietly falls at zero horizontal speed to actual support',()=>{
  const trace=[],result=run(launched(),environment({trace}),1/60,{saveAfterImpact:true});
  assert.equal(result.events.length,1);const noise=result.events[0],first=result.first;assert.equal(noise.kind,'wall');assert.equal(noise.surfaceId,'high-wall');close(noise.position.x,3.25);
  assert.equal(first.phase,'flying');assert.ok(first.flight.settling);const anchor=first.flight.settling;assert.equal(anchor.time,noise.flightTime);close(anchor.center.x,3.25-.055);assert.ok(first.position.h>1);
  const elapsed=first.flight.ticks/first.profile.stepHz-anchor.time;close(first.position.h,anchor.center.h-.5*first.profile.gravity*elapsed*elapsed);assert.ok(elapsed>=0);
  assert.equal(result.rock.flight,null);close(result.rock.position.x,anchor.center.x);close(result.rock.position.h,.055);assert.deepEqual(result.rock.lastImpact,noise);assert.deepEqual(openRock(serializeRock(result.rock)),result.rock);
  assert.ok(trace.some(query=>query.stage==='settling'&&query.t0===noise.flightTime&&query.t1>query.t0));
  assert.deepEqual(stepRock(result.rock,{dt:1}).events,[]);
});

test('quiet settling preserves supported frame partitions and immediate post-impact save/reload',()=>{
  const expected=run(launched(),environment(),1/90);
  for(const dt of [1/30,1/60,1/120,1/144,1/1000]){const actual=run(launched(),environment(),dt,{saveAfterImpact:true});assert.deepEqual(actual.rock,expected.rock);assert.deepEqual(actual.events,expected.events);}
  const original=launched(),first=stepRock(original,{dt:1/144,world:environment({wall:null})});assert.ok(first.ok,first.reason);assert.equal(first.rock.flight.pendingUnits,625);assert.equal(first.rock.revision,original.revision);assert.notEqual(serializeRock(first.rock),first.expected);
  let a=original,b=original;
  for(let index=0;index<90;index++){const result=stepRock(a,{dt:1/90,world:environment({wall:null})});assert.ok(result.ok,result.reason);a=result.rock;}
  for(let index=0;index<144;index++){const result=stepRock(b,{dt:1/144,world:environment({wall:null})});assert.ok(result.ok,result.reason);b=index===7?openRock(serializeRock(result.rock)):result.rock;}
  assert.deepEqual(a,b);
});

test('ceiling undersides fall away quietly and object top faces explicitly tagged ground support the rock',()=>{
  const ceiling=run(launched(),environment({wall:null,ceiling:1.6}));assert.equal(ceiling.events.length,1);assert.equal(ceiling.events[0].kind,'ceiling');close(ceiling.events[0].position.h,1.6);close(ceiling.rock.position.h,.055);assert.ok(ceiling.first.flight.settling);
  const table=run(launched(),environment({wall:null,floor:.8}));assert.equal(table.events.length,1);assert.equal(table.events[0].surfaceId,'object-top');assert.equal(table.events[0].kind,'ground');close(table.rock.position.h,.855);
  let rock=launched(),rejected;
  for(let frame=0;frame<200;frame++){const result=stepRock(rock,{dt:1/60,world:environment({wall:null,floor:.8,supportKind:'object'})});if(!result.ok){rejected={before:rock,result};break;}rock=result.rock;}
  assert.ok(rejected);assert.equal(rejected.result.code,'invalid-contact');assert.deepEqual(rejected.result.rock,rejected.before);assert.deepEqual(rejected.result.events,[]);
});

test('saved quiet state requires matching original receipt, centre, clock, actor and current fall position',()=>{
  const first=run(launched(),environment()).first;assert.ok(first.flight.settling);
  for(const change of [rock=>{delete rock.flight.settling;},rock=>{rock.flight.settling.center.x+=.01;},rock=>{rock.flight.settling.time+=.001;},rock=>{rock.flight.settling=null;},rock=>{rock.lastImpact.sourceActorId='another-actor';},rock=>{rock.lastImpact.kind='ground';},rock=>{rock.position.h+=.0001;},rock=>{rock.phase='world';}]){const invalid=structuredClone(first);change(invalid);assert.throws(()=>openRock(invalid));}
  const landed=run(first,environment()).rock;assert.deepEqual(openRock(serializeRock(landed)),landed);assert.ok(landed.position.h<landed.lastImpact.position.h-1);
  const impossible=structuredClone(landed);impossible.position.h=-1000000;assert.throws(()=>openRock(impossible),/maximum quiet fall/);
  const remaining=landed.profile.maxFlightSeconds-landed.lastImpact.flightTime,lower=landed.lastImpact.position.h-landed.profile.radius-.5*landed.profile.gravity*remaining**2-landed.profile.gravity/(8*landed.profile.stepHz**2)-1e-6;
  const below=structuredClone(landed);below.position.h=lower-.0001;assert.throws(()=>openRock(below),/maximum quiet fall/);
  const picking={commandId:'repick-after-wall',rockId:landed.id,expectedRevision:landed.revision,actorId:'actor-reuse',actorPosition:{...landed.position},permitted:true,capacity:true},carried=pickupRock(landed,picking);assert.ok(carried.ok,carried.reason);
  const command={commandId:'rethrow-after-wall',rockId:landed.id,expectedRevision:carried.rock.revision,actorId:'actor-reuse',throwId:landed.lastImpact.throwId,origin:{...landed.position,h:1.4},target:{x:4,y:0,h:.055},permitted:true};
  const reused=throwRock(carried.rock,command);assert.equal(reused.ok,false);assert.equal(reused.code,'reused-throw');const fresh=throwRock(carried.rock,{...command,throwId:'fresh-reuse-throw'});assert.ok(fresh.ok,fresh.reason);assert.deepEqual(openRock(serializeRock(fresh.rock)),fresh.rock);
});

test('irregular supported frame partitions preserve traces/time and per-call sweeps stay bounded',()=>{
  const source=launched(),fullTrace=[],single=stepRock(source,{dt:1,world:environment({trace:fullTrace})});assert.ok(single.ok,single.reason);assert.ok(fullTrace.length<=91);assert.equal(fullTrace.length,91);
  const splitTrace=[],world=environment({trace:splitTrace});let split=source,events=[];
  for(const units of [1,999,1234,8766,45000,34000]){const result=stepRock(split,{dt:units/90000,world});assert.ok(result.ok,result.reason);assert.equal(result.timing.simulatedUnits+result.timing.pendingUnits+result.timing.unspentUnits,split.flight.pendingUnits+units);split=openRock(serializeRock(result.rock));events.push(...result.events);}
  assert.deepEqual(split,single.rock);assert.deepEqual(events,single.events);assert.deepEqual(splitTrace,fullTrace);
});

test('release/ground heights remain native metres on an elevated platform',()=>{
  let rock=createRock({id:'elevated-rock',position:{x:0,y:0,h:2.175}});rock=pickupRock(rock,{commandId:'elevated-pick',rockId:rock.id,expectedRevision:0,actorId:'elevated-actor',actorPosition:{x:0,y:0,h:2.12},permitted:true,capacity:true}).rock;
  rock=throwRock(rock,{commandId:'elevated-throw-command',throwId:'elevated-throw',rockId:rock.id,expectedRevision:rock.revision,actorId:'elevated-actor',origin:{x:0,y:0,h:3.52},target:{x:8,y:0,h:2.175},permitted:true}).rock;
  const result=run(rock,environment({wall:null,floor:2.12}));close(result.events[0].position.h,2.12);close(result.rock.position.h,2.175);assert.equal(result.events[0].kind,'ground');
});

test('a physically reachable deep support remains loadable under the conservative total-fall bound',()=>{
  const result=run(launched(),environment({wall:null,ceiling:1.6,floor:-450}),1/60,{saveAfterImpact:true});assert.equal(result.events.length,1);assert.equal(result.events[0].kind,'ceiling');close(result.rock.position.h,-450+.055,1e-8);assert.deepEqual(openRock(serializeRock(result.rock)),result.rock);
});
