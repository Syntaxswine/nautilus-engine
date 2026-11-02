import test from 'node:test';
import assert from 'node:assert/strict';
import {createRock,pickupRock,throwRock,stepRock,serializeRock,openRock} from '../packages/items-core/index.js';
const at=(a,b,f)=>({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,h:a.h+(b.h-a.h)*f});
function launched(target={x:8,y:0,h:.055}){let rock=createRock({id:'adapter-rock',position:{x:0,y:0,h:.055}});rock=pickupRock(rock,{commandId:'adapter-pick',rockId:rock.id,expectedRevision:0,actorId:'adapter-actor',actorPosition:{x:0,y:0,h:0},permitted:true,capacity:true}).rock;return throwRock(rock,{commandId:'adapter-throw-command',throwId:'adapter-throw',rockId:rock.id,expectedRevision:rock.revision,actorId:'adapter-actor',origin:{x:0,y:0,h:1.4},target,permitted:true}).rock;}
function contact(query,fraction=.5,kind='ground',surfaceId='surface'){
  const center=at(query.from,query.to,fraction),point={...center};if(kind==='ground')point.h-=query.radius;else point.x+=query.radius;
  return {fraction,point,surfaceId,kind};
}

test('invalid duration and adapters reject before consuming state or queued time',()=>{
  const rock=launched(),before=serializeRock(rock);let calls=0;
  for(const dt of [-1,NaN,Infinity,'0.1',null,1.001,1/37,1e-9]){
    const result=stepRock(rock,{dt,world:{sweepSphere(){calls++;return null;}}});assert.equal(result.ok,false);assert.equal(result.code,'invalid-dt');assert.equal(serializeRock(result.rock),before);assert.deepEqual(result.events,[]);assert.deepEqual(result.inventoryDelta,[]);
  }
  assert.equal(calls,0);assert.equal(stepRock(rock,{dt:1/90}).code,'world-adapter');
  const failed=stepRock(rock,{dt:1/60,world:{sweepSphere(){throw Error('world unavailable');}}});assert.equal(failed.ok,false);assert.equal(failed.code,'world-adapter');assert.equal(serializeRock(failed.rock),before);
  for(const dt of [0,1/30,1/60,1/90,1/120,1/144,.001,1]){const result=stepRock(rock,{dt,world:{sweepSphere(){return null;}}});assert.ok(result.ok,result.reason);const timing=result.timing;assert.equal(timing.simulatedUnits+timing.pendingUnits+timing.unspentUnits,timing.inputUnits);}
});

test('malformed/sparse contact batches roll back earlier valid substeps and never invoke contact accessors',()=>{
  const factories=[()=>undefined,()=>new Array(1),query=>[contact(query),undefined],query=>{const array=[contact(query)];array.extra=true;return array;},query=>{const value=contact(query);value.fraction=1.1;return value;},query=>{const value=contact(query);value.point.h=NaN;return value;},query=>{const value=contact(query);value.point.h-=1;return value;},query=>({...contact(query),normal:{x:0,y:0,h:1}}),query=>({...contact(query),kind:'lava'}),()=>Array(65).fill(null),()=>Promise.resolve(null)];
  for(const factory of factories){const rock=launched(),before=serializeRock(rock),trace=[];
    const result=stepRock(rock,{dt:1/30,world:{sweepSphere(query){trace.push(query.step);return query.step<2?null:factory(query);}}});
    assert.equal(result.ok,false);assert.equal(result.code,'invalid-contact');assert.deepEqual(trace,[0,1,2]);assert.equal(serializeRock(result.rock),before);assert.equal(serializeRock(rock),before);assert.deepEqual(result.events,[]);assert.deepEqual(result.inventoryDelta,[]);
  }
  let invoked=0;const result=stepRock(launched(),{dt:1/90,world:{sweepSphere(query){const hit=contact(query);Object.defineProperty(hit,'fraction',{get(){invoked++;return .5;},enumerable:true});return hit;}}});assert.equal(result.ok,false);assert.equal(invoked,0);
});

test('earliest actual contact wins independently of array ordering, including zero and low-speed impact',()=>{
  const source=launched(),world=reverse=>({sweepSphere(query){const hits=[contact(query,.8,'ground','far-support'),contact(query,.2,'ground','first-support')];return reverse?hits.reverse():hits;}});
  const a=stepRock(source,{dt:1/90,world:world(false)}),b=stepRock(source,{dt:1/90,world:world(true)});assert.ok(a.ok,a.reason);assert.deepEqual(a,b);assert.equal(a.events[0].surfaceId,'first-support');assert.equal(a.events[0].flightTime,.2/90);assert.notDeepEqual(a.events[0].position,source.flight.target);
  const zero=stepRock(source,{dt:1/90,world:{sweepSphere(query){return contact(query,0,'ground','touching-support');}}});assert.ok(zero.ok,zero.reason);assert.equal(zero.events.length,1);assert.equal(zero.events[0].flightTime,0);
  const straight=launched({x:0,y:0,h:1.4}),apex=straight.flight.velocity.h/straight.profile.gravity;let rock=straight,noise;
  for(let index=0;index<90&&rock.phase==='flying';index++){
    const result=stepRock(rock,{dt:1/90,world:{sweepSphere(query){if(query.t0<=apex&&query.t1>=apex)return contact(query,(apex-query.t0)/(query.t1-query.t0),'ground','explicit-apex-support');return null;}}});assert.ok(result.ok,result.reason);rock=result.rock;if(result.events.length)noise=result.events[0];
  }
  assert.ok(noise);assert.equal(noise.surfaceId,'explicit-apex-support');assert.ok(Math.abs(straight.flight.velocity.h-straight.profile.gravity*noise.flightTime)<1e-10);
});

test('invalid settling contacts roll back a newly staged first cue and retain exact pre-contact clock',()=>{
  const source=launched(),before=serializeRock(source);let calls=0;
  const failed=stepRock(source,{dt:1/90,world:{sweepSphere(query){calls++;return query.stage==='lob'?contact(query,.5,'wall','wall-first'):new Array(1);}}});
  assert.equal(calls,2);assert.equal(failed.ok,false);assert.equal(failed.code,'invalid-contact');assert.deepEqual(failed.events,[]);assert.equal(serializeRock(failed.rock),before);
  const success=stepRock(source,{dt:1/90,world:{sweepSphere(query){return query.stage==='lob'?contact(query,.5,'wall','wall-first'):null;}}});assert.ok(success.ok,success.reason);assert.equal(success.events.length,1);assert.ok(success.rock.flight.settling);assert.deepEqual(openRock(serializeRock(success.rock)),success.rock);
  const invalidSingle=stepRock(success.rock,{dt:1/90,world:{sweepSphere(query){return contact(query,0,'wall','wall-first');}}});assert.equal(invalidSingle.ok,false);assert.deepEqual(invalidSingle.events,[]);assert.deepEqual(invalidSingle.rock,success.rock);
});

test('ground support in a residual settling sweep conserves time and does not replace the first sound',()=>{
  const source=launched();const result=stepRock(source,{dt:1/90,world:{sweepSphere(query){return query.stage==='lob'?contact(query,.25,'wall','wall-first'):[contact(query,0,'wall','wall-tangent'),contact(query,.75,'ground','support-after-wall')];}}});
  assert.ok(result.ok,result.reason);assert.equal(result.rock.phase,'world');assert.equal(result.events.length,1);assert.equal(result.events[0].surfaceId,'wall-first');assert.equal(result.rock.lastImpact.surfaceId,'wall-first');
  assert.equal(result.timing.simulatedUnits,(.25+.75*.75)*1000);assert.equal(result.timing.simulatedUnits+result.timing.unspentUnits,1000);assert.deepEqual(openRock(serializeRock(result.rock)),result.rock);
});

test('absolute flight/settling limit rejects atomically without a timeout cue or guessed floor',()=>{
  let rock=launched();for(let index=0;index<9;index++){const result=stepRock(rock,{dt:1,world:{sweepSphere(){return null;}}});assert.ok(result.ok,result.reason);rock=result.rock;}
  const before=serializeRock(rock);let calls=0;const failed=stepRock(rock,{dt:1,world:{sweepSphere(){calls++;return null;}}});assert.equal(failed.ok,false);assert.equal(failed.code,'flight-limit');assert.equal(calls,90);assert.equal(serializeRock(failed.rock),before);assert.deepEqual(failed.events,[]);
  const collided=stepRock(rock,{dt:1/90,world:{sweepSphere(query){return query.stage==='lob'?contact(query,.5,'wall','late-wall'):null;}}});assert.ok(collided.ok,collided.reason);assert.equal(collided.events.length,1);rock=collided.rock;
  const quiet=stepRock(rock,{dt:89/90,world:{sweepSphere(){return null;}}});assert.equal(quiet.ok,false);assert.equal(quiet.code,'flight-limit');assert.deepEqual(quiet.events,[]);assert.deepEqual(quiet.rock,rock);
});

test('adapter mutation of query copies cannot corrupt the stored launch or current state',()=>{
  const source=launched(),before=serializeRock(source);const result=stepRock(source,{dt:1/90,world:{sweepSphere(query){query.from.x=999;query.to.h=999;query.sourceActorId='spoof';return null;}}});assert.ok(result.ok,result.reason);assert.equal(serializeRock(source),before);assert.equal(result.rock.flight.sourceActorId,'adapter-actor');assert.notEqual(result.rock.position.h,999);assert.equal(result.rock.flight.origin.x,0);
});
