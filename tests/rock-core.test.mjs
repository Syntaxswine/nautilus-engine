import test from 'node:test';
import assert from 'node:assert/strict';
import {createRock,openRock,serializeRock,pickupRock,previewRockThrow,throwRock,stepRock,evaluateRockNoise} from '../packages/items-core/index.js';
const actorId='actor-1';
const create=()=>createRock({id:'rock-1',position:{x:0,y:0,h:.055}});
const pickup=rock=>({commandId:'pickup-1',rockId:rock.id,expectedRevision:rock.revision,actorId,actorPosition:{x:0,y:0,h:0},permitted:true,capacity:true});
const aim=rock=>({commandId:'throw-command-1',throwId:'throw-1',rockId:rock.id,expectedRevision:rock.revision,actorId,origin:{x:0,y:0,h:1.4},target:{x:6,y:0,h:.055},permitted:true});
const ground={sweepSphere({from,to,radius}){if(from.h>radius&&to.h<=radius){const fraction=(from.h-radius)/(from.h-to.h);return {fraction,point:{x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction,h:0},surfaceId:'ground',kind:'ground'};}return null;}};
test('candidate pickup/throw is copied, permission checked and staged with exact instance deltas',()=>{
  const original=create(),snapshot=serializeRock(original),picked=pickupRock(original,pickup(original));assert.ok(picked.ok,picked.reason);assert.equal(serializeRock(original),snapshot);assert.equal(picked.rock.phase,'carried');assert.equal(picked.inventoryDelta[0].quantity,1);
  const preview=previewRockThrow(picked.rock,aim(picked.rock));assert.ok(preview.ok,preview.reason);assert.deepEqual(preview.events,[]);assert.deepEqual(preview.inventoryDelta,[]);assert.equal(preview.rock.phase,'carried');
  const thrown=throwRock(picked.rock,aim(picked.rock));assert.ok(thrown.ok,thrown.reason);assert.equal(thrown.rock.phase,'flying');assert.equal(thrown.inventoryDelta[0].quantity,-1);assert.ok(thrown.events.every(event=>event.type!=='rock-impact-noise'));
  for(const change of [{permitted:false},{capacity:false},{actorPosition:{x:10,y:0,h:0}}]){const result=pickupRock(original,{...pickup(original),...change});assert.equal(result.ok,false);assert.equal(serializeRock(result.rock),snapshot);assert.deepEqual(result.events,[]);assert.deepEqual(result.inventoryDelta,[]);}
});
test('candidate flight emits once at actual ground contact and landed rocks can be picked up again',()=>{
  let rock=pickupRock(create(),pickup(create())).rock;rock=throwRock(rock,aim(rock)).rock;let events=[];
  for(let index=0;index<180&&rock.phase==='flying';index++){const result=stepRock(rock,{dt:1/60,world:ground});assert.ok(result.ok,result.reason);rock=result.rock;events.push(...result.events);}
  assert.equal(rock.phase,'world');assert.equal(events.length,1);assert.equal(events[0].type,'rock-impact-noise');assert.equal(events[0].position.h,0);assert.equal(events[0].sourceActorId,actorId);assert.equal(rock.position.h,.055);
  assert.deepEqual(openRock(serializeRock(rock)),rock);assert.deepEqual(stepRock(rock,{dt:1}).events,[]);
  const again=pickupRock(rock,{...pickup(rock),commandId:'pickup-again',actorPosition:{...rock.position}});assert.ok(again.ok,again.reason);
  const hearing=evaluateRockNoise(events[0],[{id:'guard-1',position:{...events[0].position},hearingEnabled:true,audible:true,permitted:true,behavior:'patrol',confirmedThreat:false,incapacitated:false}]);assert.ok(hearing.ok,hearing.reason);assert.equal(hearing.requests.length,1);assert.deepEqual(hearing.requests[0].position,events[0].position);
});
