// Copy into the fresh offline consumer and run with Node, using only public exports.
import assert from 'node:assert/strict';
import {DEFAULT_WALK_SPEED_MPS,createInteractionActor,openInteractionActor,serializeInteractionActor} from '@nautilus-engine/map-core/interactions';
import {flatYardContent,createDefaultWorld} from '@nautilus-engine/map-core/player-setup';
for(const name of ['window','document','localStorage'])assert.equal(typeof globalThis[name],'undefined');
assert.equal(DEFAULT_WALK_SPEED_MPS,7.2);assert.equal(createInteractionActor({id:'external',floorId:'floor-0',position:{x:1,y:1,h:0}}).speedMps,7.2);
assert.equal(flatYardContent({sourcePin:'external-pace-proof'}).actors[0].speedMps,7.2);
for(const speedMps of [2,3,4.5,7.2]){const content=flatYardContent({sourcePin:'external-pace-proof'});content.actors[0].speedMps=speedMps;content.resources.player={health:9,ap:0,stamina:2.25,inventory:[{id:'yard-key',count:1}]};const h=createDefaultWorld(content,{actorId:'player'});assert.ok(h.walking.request({version:1,actorId:'player',vector:{x:1,y:1},seconds:.1}).ok);const saved=h.checkpoint();assert.ok(Math.abs(Math.hypot(saved.actors[0].position.x-6,saved.actors[0].position.y-5)-speedMps*.1)<1e-8);assert.deepEqual(openInteractionActor(serializeInteractionActor(saved.actors[0])),saved.actors[0]);h.dispose();const r=createDefaultWorld(flatYardContent({sourcePin:'external-pace-proof'}),{actorId:'player',checkpoint:saved});assert.deepEqual(r.checkpoint(),saved);r.dispose();}
console.log(JSON.stringify({status:'passed',freshDefaultMps:7.2,explicitAndSavedSpeeds:[2,3,4.5,7.2],diagonalNormalized:true,resourcesPreserved:true,publicImportsOnly:true,headless:true}));
