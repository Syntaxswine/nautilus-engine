import test from 'node:test';import assert from 'node:assert/strict';
import {createGroundHost} from './host.js';
test('Night Ledger fresh stock player uses shared 7.2 m/s with normalized diagonal travel',()=>{
 const h=createGroundHost();try{const a=h.read();assert.equal(a.actor.speedMps,7.2);assert.ok(h.walk('player',{x:1,y:1},.1).ok);const b=h.read();assert.ok(Math.abs(Math.hypot(b.actor.position.x-a.actor.position.x,b.actor.position.y-a.actor.position.y)-.72)<1e-8);assert.deepEqual(b.resources,a.resources);}finally{h.dispose();}
});
test('old explicit and alternative Night Ledger speeds reload exact pose, traversal observations and spent resources',()=>{
 for(const speedMps of [2,3,4.5]){const initial=createGroundHost(),checkpoint=initial.read();initial.dispose();checkpoint.actor.speedMps=speedMps;checkpoint.resources.health=9;checkpoint.resources.ap=0;checkpoint.resources.stamina=2.25;const h=createGroundHost({checkpoint});assert.ok(h.walk('player',{x:1,y:0},.1).ok);const saved=h.save();h.dispose();const restored=createGroundHost({checkpoint:JSON.parse(saved)});try{assert.equal(restored.save(),saved);const a=restored.read();restored.advance(.05);assert.deepEqual(restored.read().actor,a.actor);assert.deepEqual(restored.read().resources,a.resources);assert.deepEqual(restored.read().traversal.walkDistanceM,a.traversal.walkDistanceM);assert.ok(restored.walk('player',{x:1,y:0},.1).ok);assert.ok(Math.abs(restored.read().actor.position.x-a.actor.position.x-speedMps*.1)<1e-8);assert.deepEqual(restored.read().resources,a.resources);}finally{restored.dispose();}}
});
