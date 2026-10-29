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
