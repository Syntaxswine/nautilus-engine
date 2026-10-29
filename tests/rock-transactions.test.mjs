import test from 'node:test';
import assert from 'node:assert/strict';
import {createRock,openRock,serializeRock,pickupRock,previewRockThrow,throwRock,stepRock} from '../packages/items-core/index.js';
const initial=()=>createRock({id:'unique-host-rock',position:{x:0,y:0,h:.055}});
const pickup=(rock,actorId='actor-a',commandId='pickup-a')=>({commandId,rockId:rock.id,expectedRevision:rock.revision,actorId,actorPosition:{x:0,y:0,h:0},permitted:true,capacity:true});
const throwing=rock=>({commandId:'throw-a',throwId:'host-throw-a',rockId:rock.id,expectedRevision:rock.revision,actorId:'actor-a',origin:{x:0,y:0,h:1.4},target:{x:6,y:0,h:.055},permitted:true});
function hostState(){return {rocks:new Map(),inventory:new Map([['actor-a',new Set()],['actor-b',new Set()]]),ap:new Map([['actor-a',2],['actor-b',2]]),capacity:1,commands:new Map(),noiseIds:new Set(),published:[],random:{seed:12345}};}
function addRock(host,rock){if(host.rocks.has(rock.id))return false;host.rocks.set(rock.id,openRock(rock));return true;}
// Bounded synchronous host reference, deliberately outside the engine. A real
// host puts the same compare/ledger/inventory/cost/outbox writes in its database
// or game transaction and performs authenticated permission rechecks there.
function commit(host,key,payload,result,cost=0){
  const wire=JSON.stringify(payload),previous=host.commands.get(key);
  if(previous)return previous.wire===wire?previous.receipt:{ok:false,reason:'command-payload-conflict'};
  if(!result.ok||!result.rock||payload.rockId!==result.rock.id)return {ok:false,reason:'rejected-stage'};
  const current=host.rocks.get(result.rock.id);if(!current||serializeRock(current)!==result.expected)return {ok:false,reason:'stale-source'};
  const inventory=new Map([...host.inventory].map(([actor,instances])=>[actor,new Set(instances)])),ap=new Map(host.ap);
  if(cost){if((ap.get(payload.actorId)||0)<cost)return {ok:false,reason:'action-budget'};ap.set(payload.actorId,ap.get(payload.actorId)-cost);}
  for(const delta of result.inventoryDelta){
    const set=inventory.get(delta.actorId);if(!set||delta.itemId!=='item:rock'||delta.instanceId!==current.id||![1,-1].includes(delta.quantity))return {ok:false,reason:'invalid-inventory-delta'};
    if(delta.quantity===1){if(set.has(delta.instanceId)||set.size>=host.capacity)return {ok:false,reason:'capacity'};set.add(delta.instanceId);}
    else{if(!set.has(delta.instanceId)||current.ownerId!==delta.actorId)return {ok:false,reason:'missing-owned-instance'};set.delete(delta.instanceId);}
  }
  const next=openRock(result.rock);host.rocks.set(next.id,next);host.inventory=inventory;host.ap=ap;
  for(const event of result.events){if(event.type==='rock-impact-noise'){if(host.noiseIds.has(event.id))continue;host.noiseIds.add(event.id);}host.published.push(structuredClone(event));}
  const receipt={ok:true,rockId:next.id,revision:next.revision};host.commands.set(key,{wire,receipt});return receipt;
}
const state=host=>({rocks:[...host.rocks].map(([id,rock])=>[id,serializeRock(rock)]),inventory:[...host.inventory].map(([id,set])=>[id,[...set]]),ap:[...host.ap],commands:[...host.commands],noise:[...host.noiseIds],published:structuredClone(host.published),random:structuredClone(host.random)});

test('two actors racing one instance commit only one pickup; command replay/payload changes cannot duplicate it',()=>{
  const host=hostState(),rock=initial();assert.ok(addRock(host,rock));assert.equal(addRock(host,initial()),false);
  const a=pickup(rock),b=pickup(rock,'actor-b','pickup-b'),stagedA=pickupRock(rock,a),stagedB=pickupRock(rock,b);assert.ok(stagedA.ok);assert.ok(stagedB.ok);
  assert.ok(commit(host,a.commandId,a,stagedA).ok);const after=state(host);
  assert.equal(commit(host,b.commandId,b,stagedB).ok,false);assert.deepEqual(state(host),after);assert.equal(host.inventory.get('actor-a').size,1);assert.equal(host.inventory.get('actor-b').size,0);
  assert.ok(commit(host,a.commandId,a,stagedA).ok);assert.deepEqual(state(host),after);
  assert.equal(commit(host,a.commandId,{...a,rockId:'another-instance'},stagedA).ok,false);assert.deepEqual(state(host),after);assert.deepEqual(host.random,{seed:12345});
});

test('preview and rejected permission/capacity/action costs preserve count/resources/RNG; one accepted throw removes one',()=>{
  const host=hostState(),rock=initial();addRock(host,rock);
  for(const change of [{permitted:false},{capacity:false},{actorPosition:{x:8,y:0,h:0}}]){const command={...pickup(rock),...change},before=state(host);assert.equal(commit(host,command.commandId,command,pickupRock(rock,command)).ok,false);assert.deepEqual(state(host),before);}
  const picking=pickup(rock);assert.ok(commit(host,picking.commandId,picking,pickupRock(rock,picking)).ok);
  const carried=host.rocks.get(rock.id),command=throwing(carried),before=state(host),preview=previewRockThrow(carried,command);assert.ok(preview.ok);assert.deepEqual(state(host),before);assert.deepEqual(preview.inventoryDelta,[]);
  const denied={...command,commandId:'throw-denied',permitted:false};assert.equal(commit(host,denied.commandId,denied,throwRock(carried,denied)).ok,false);assert.deepEqual(state(host),before);
  const other={...command,commandId:'throw-other-actor',actorId:'actor-b'};assert.equal(commit(host,other.commandId,other,throwRock(carried,other)).ok,false);assert.deepEqual(state(host),before);
  const stage=throwRock(carried,command);assert.ok(stage.ok);assert.equal(stage.inventoryDelta.length,1);assert.equal(stage.inventoryDelta[0].quantity,-1);
  host.ap.set('actor-a',0);const emptyBudget=state(host);assert.equal(commit(host,command.commandId,command,stage,1).ok,false);assert.deepEqual(state(host),emptyBudget);
  host.ap.set('actor-a',2);assert.ok(commit(host,command.commandId,command,stage,1).ok);assert.equal(host.inventory.get('actor-a').size,0);assert.equal(host.ap.get('actor-a'),1);const accepted=state(host);
  assert.ok(commit(host,command.commandId,command,stage,1).ok);assert.deepEqual(state(host),accepted);assert.deepEqual(host.random,{seed:12345});
});

test('stale/concurrent impact updates and older-flight replay dispatch the same noise receipt once',()=>{
  const host=hostState(),rock=initial();addRock(host,rock);const picking=pickup(rock);commit(host,picking.commandId,picking,pickupRock(rock,picking));const command=throwing(host.rocks.get(rock.id));commit(host,command.commandId,command,throwRock(host.rocks.get(rock.id),command));
  const airborne=host.rocks.get(rock.id),saved=serializeRock(airborne),world={sweepSphere({from,to,radius}){const fraction=.5;return {fraction,point:{x:(from.x+to.x)/2,y:(from.y+to.y)/2,h:(from.h+to.h)/2-radius},surfaceId:'explicit-support',kind:'ground'};}};
  const first=stepRock(airborne,{dt:1/90,world}),second=stepRock(airborne,{dt:1/90,world});assert.ok(first.ok);assert.deepEqual(first,second);
  const frame={rockId:rock.id,dt:1/90};assert.ok(commit(host,'frame-a',frame,first).ok);const after=state(host);assert.equal(commit(host,'frame-b',frame,second).ok,false);assert.deepEqual(state(host),after);assert.equal(host.noiseIds.size,1);
  const landed=host.rocks.get(rock.id),noop=stepRock(landed,{dt:1});assert.deepEqual(noop.events,[]);assert.ok(commit(host,'landed-frame',{rockId:rock.id,dt:1},noop).ok);
  host.rocks.set(rock.id,openRock(saved));const replay=stepRock(host.rocks.get(rock.id),{dt:1/90,world});assert.ok(commit(host,'restored-frame',frame,replay).ok);
  assert.equal(host.published.filter(event=>event.type==='rock-impact-noise').length,1);assert.equal(host.noiseIds.size,1);assert.equal(host.inventory.get('actor-a').size,0);
});

test('full-source compare protects queued sub-tick time even when the action revision does not change',()=>{
  const host=hostState(),rock=initial();addRock(host,rock);const picking=pickup(rock);commit(host,picking.commandId,picking,pickupRock(rock,picking));const command=throwing(host.rocks.get(rock.id));commit(host,command.commandId,command,throwRock(host.rocks.get(rock.id),command));
  const before=host.rocks.get(rock.id),world={sweepSphere(){return null;}},a=stepRock(before,{dt:1/144,world}),b=stepRock(before,{dt:1/120,world});assert.ok(a.ok);assert.ok(b.ok);assert.equal(a.rock.revision,b.rock.revision);
  assert.ok(commit(host,'subframe-a',{rockId:rock.id,dt:1/144},a).ok);assert.equal(commit(host,'subframe-b',{rockId:rock.id,dt:1/120},b).ok,false);assert.equal(host.rocks.get(rock.id).flight.pendingUnits,625);
});
