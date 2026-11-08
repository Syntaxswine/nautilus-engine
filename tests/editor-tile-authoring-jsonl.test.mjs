import test from 'node:test';
import assert from 'node:assert/strict';
import {readAuthoringJSON,createTileAuthoringJSONL} from '../apps/editor/tile-authoring/jsonl.js';

test('C1 JSONL refuses duplicate decoded keys, noncanonical numbers and hostile objects before host access',async()=>{
  let calls=0,getters=0;const service=Object.fromEntries(['describe','snapshot','query','prepare','apply','cancel','recover'].map(name=>[name,()=>{calls++;return {name};}]));
  const port=createTileAuthoringJSONL(service,{isAuthorized:()=>true});
  const accessor={action:'prepare'};Object.defineProperty(accessor,'command',{enumerable:true,get(){getters++;return {};}});
  const cycle={action:'prepare'};cycle.command=cycle;
  for(const value of ['{"action":"snapshot","action":"describe"}','{"action":"prepare","command":{"x":1,"\\u0078":2}}','{"action":"query","query":{"x":-0}}','{"action":"query","query":{"x":1e999}}','{"action":"snapshot","extra":true}','{"action":"toString"}',accessor,cycle]){
    const result=await port.dispatch(value);assert.equal(result.ok,false);assert.equal(result.targetDocument,null);
  }
  assert.equal(calls,0);assert.equal(getters,0);
  assert.throws(()=>readAuthoringJSON(' '.repeat(1_000_001)));assert.throws(()=>readAuthoringJSON('['.repeat(42)+'0'+']'.repeat(42)));
  assert.throws(()=>readAuthoringJSON({n:-0}));
});

test('C1 JSONL forwards exact canonical packets to the borrowed live service and checks authorization per request',async()=>{
  const calls=[];let authorized=true;
  const service=Object.fromEntries(['describe','snapshot','query','prepare','apply','cancel','recover'].map(name=>[name,(arg)=>{calls.push({name,arg});return {name,arg:arg??null};}]));
  const port=createTileAuthoringJSONL(service,{isAuthorized:()=>authorized});
  const packets=[{action:'describe'},{action:'snapshot'},{action:'query',query:{kind:'requirements.inspect',subject:{id:'a'}}},{action:'prepare',command:{requestId:'original-id'}},{action:'apply',request:{requestId:'original-id',reviewToken:'opaque',expectedTargetDigest:'target'}},{action:'cancel',reviewToken:'opaque'},{action:'recover',requestId:'original-id'}];
  for(const packet of packets){const response=await port.dispatch(JSON.stringify(packet));assert.equal(response.name,packet.action);}
  assert.deepEqual(calls.map(c=>c.name),packets.map(p=>p.action));assert.deepEqual(calls[3].arg,packets[3].command);assert.deepEqual(calls[4].arg,packets[4].request);assert.equal(calls[6].arg,'original-id');
  authorized=false;assert.equal((await port.dispatch('{"action":"snapshot"}')).ok,false);assert.equal(calls.length,7);
});
