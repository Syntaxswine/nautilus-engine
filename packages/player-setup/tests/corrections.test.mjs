import test from 'node:test';import assert from 'node:assert/strict';
import {createSetupConfiguration,validatePlayerSetup,createDefaultWorld} from '../index.js';
import {reviewContent} from './review-fixtures.mjs';

test('imported component records return actionable diagnostics before any component dereference',()=>{
  const content=reviewContent();
  for(const entry of [null,false,1,'player.shell',[],{}, {id:'player.shell',version:1}]){
    const config=createSetupConfiguration({content:content.identity});config.components=[entry];const original=JSON.stringify(config);
    for(const input of [config,original]){let result;assert.doesNotThrow(()=>{result=validatePlayerSetup(input,{content});});assert.equal(result.ok,false);assert.equal(result.configuration,null);assert.ok(result.errors.some(e=>e.code==='INVALID_COMPONENT'&&e.path==='/components/0'&&e.action));}
    assert.equal(JSON.stringify(config),original);
  }
});

test('a retired world refuses a previously eligible door offer and walking without changing its checkpoint',()=>{
  const world=createDefaultWorld(reviewContent(),{actorId:'player'}),offer=world.actions.read();assert.equal(offer.actions.find(a=>a.id==='yard-gate').enabled,true);
  const before=world.checkpoint();world.dispose();world.dispose();const result=world.actions.request('yard-gate',offer.context);
  assert.equal(result.ok,false);assert.equal(result.committed,false);assert.equal(result.code,'WORLD_RETIRED');assert.deepEqual(world.checkpoint(),before);
  const walk=world.walking.request({version:1,actorId:'player',vector:{x:1,y:0},seconds:.05});assert.equal(walk.committed,false);assert.deepEqual(world.checkpoint(),before);
});

test('retirement fences advancement of a real in-progress stair traversal',()=>{
  const content=reviewContent();content.actors[0].position={...content.interactions.stairs[0].from.position};
  const world=createDefaultWorld(content,{actorId:'player'}),offer=world.actions.read();assert.equal(world.actions.request('deck-stairs',offer.context).committed,true);
  world.advance(.05);assert.ok(world.checkpoint().actors[0].traversal.distanceM>0);const before=world.checkpoint();world.dispose();
  assert.throws(()=>world.advance(.05),error=>error.code==='WORLD_RETIRED');assert.deepEqual(world.checkpoint(),before);
});
