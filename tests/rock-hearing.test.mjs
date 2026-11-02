import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateRockNoise} from '../packages/items-core/index.js';
const noise=(throwId='hearing-throw')=>({version:1,type:'rock-impact-noise',id:'noise:'+throwId+':impact',itemId:'item:rock',rockId:'hearing-rock',throwId,commandId:'hearing-command',sourceActorId:'actual-thrower',position:{x:4,y:2,h:.3},radius:8,surfaceId:'wall-surface',kind:'wall',flightTime:1.2});
const guard=(id,changes={})=>({id,position:{x:5,y:2,h:.3},hearingEnabled:true,audible:true,permitted:true,behavior:'patrol',confirmedThreat:false,incapacitated:false,...changes});

test('hearing uses finite native 3D distance and explicit host hearing/audibility/eligibility',()=>{
  const event=noise(),listeners=[guard('near'),guard('edge',{position:{x:12,y:2,h:.3}}),guard('high',{position:{x:4,y:2,h:8.3001}}),guard('far',{position:{x:12.001,y:2,h:.3}}),guard('deaf',{hearingEnabled:false}),guard('occluded',{audible:false}),guard('host-denied',{permitted:false})];
  const before=structuredClone({event,listeners}),result=evaluateRockNoise(event,listeners);assert.ok(result.ok,result.reason);assert.deepEqual(result.requests.map(request=>request.listenerId),['near','edge']);assert.deepEqual({event,listeners},before);assert.deepEqual(result.events,[]);assert.deepEqual(result.inventoryDelta,[]);
  for(const request of result.requests){assert.deepEqual(request.position,event.position);assert.equal(request.priority,'distraction');for(const key of ['origin','target','playerPosition','sourceActorId'])assert.equal(Object.hasOwn(request,key),false);}
  assert.equal(result.decisions.find(item=>item.listenerId==='high').reason,'out-of-radius');assert.equal(result.decisions.find(item=>item.listenerId==='occluded').reason,'inaudible');
  const zero=evaluateRockNoise({...event,radius:0},[guard('exact',{position:{...event.position}}),guard('apart',{position:{...event.position,h:event.position.h+.0001}})]);assert.deepEqual(zero.requests.map(request=>request.listenerId),['exact']);
});

test('combat, confirmed-threat and incapacitated guards never abandon their higher-priority behavior',()=>{
  const listeners=[guard('combat',{behavior:'combat',currentTarget:'confirmed-enemy'}),guard('threat',{confirmedThreat:true}),guard('incapacitated',{incapacitated:true}),guard('investigating',{behavior:'investigating'})];
  // The core accepts only the projected listener contract; cast/target data
  // remains in the host rather than being normalized or mutated by hearing.
  const cast=structuredClone(listeners),projection=listeners.map(({currentTarget,...listener})=>listener),result=evaluateRockNoise(noise(),projection);
  assert.ok(result.ok,result.reason);assert.deepEqual(result.requests.map(request=>request.listenerId),['investigating']);assert.deepEqual(listeners,cast);assert.equal(listeners[0].currentTarget,'confirmed-enemy');assert.ok(result.decisions.slice(0,3).every(item=>item.reason==='higher-priority-behavior'));
});

test('length-prefixed investigation tuples cannot collide for colon-permitted throw/listener IDs',()=>{
  const first=evaluateRockNoise(noise('a'),[guard('b:impact:c')]),second=evaluateRockNoise(noise('a:impact:b'),[guard('c')]);assert.ok(first.ok);assert.ok(second.ok);assert.notEqual(first.requests[0].id,second.requests[0].id);
  const ids=new Set();for(const throwId of ['a','a:b','a:impact:b','b:impact:c'])for(const listenerId of ['c','b:impact:c','noise:a:impact','1:2:3']){const result=evaluateRockNoise(noise(throwId),[guard(listenerId)]);assert.ok(result.ok,result.reason);assert.ok(!ids.has(result.requests[0].id));ids.add(result.requests[0].id);}assert.equal(ids.size,16);
  const replay=evaluateRockNoise(noise('a'),[guard('b:impact:c')]);assert.deepEqual(replay,first);
});

test('malformed events/listeners reject the entire hearing batch without partial investigation',()=>{
  const event=noise();for(const changed of [{version:2},{type:'actor-footstep'},{itemId:'item:grenade'},{id:'fake-noise'},{position:{x:0,y:0,z:1}},{radius:Infinity},{sourceActorId:null},{future:true}]){const result=evaluateRockNoise({...event,...changed},[guard('valid')]);assert.equal(result.ok,false);assert.deepEqual(result.requests,[]);}
  for(const listeners of [new Array(1),[guard('valid'),undefined],[guard('same'),guard('same')],[guard('valid'),guard('invalid',{position:{x:0,y:0,h:NaN}})],[guard('valid'),guard('invalid',{behavior:'unknown'})],[guard('valid'),guard('invalid',{permitted:undefined})],Array(257).fill(guard('many'))]){const result=evaluateRockNoise(event,listeners);assert.equal(result.ok,false);assert.deepEqual(result.requests,[]);assert.deepEqual(result.decisions,[]);}
  let invoked=0;const invalid=guard('accessor');Object.defineProperty(invalid,'audible',{get(){invoked++;return true;},enumerable:true});assert.equal(evaluateRockNoise(event,[invalid]).ok,false);assert.equal(invoked,0);
});
