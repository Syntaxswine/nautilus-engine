import test from 'node:test';
import assert from 'node:assert/strict';
import {startArtReviewLifetime} from '../tools/art-review-browser.mjs';

// No real timers/browser/processes. Every clock read advances by 1ms, exposing
// separate timestamp reads; the actual producer/arming path runs unchanged.
function advancingClock(){
 const epoch=Date.UTC(2026,0,1);let current=epoch-1,reads=0;const timers=[];
 return {epoch,get reads(){return reads;},get current(){return current;},
  now(){reads++;return ++current;},
  setTimer(callback,delay){const timer={callback,delay,due:current+delay,fired:false};timers.push(timer);return timer;},
  advance(ms){current+=ms;for(const timer of timers)if(!timer.fired&&timer.due<=current){timer.fired=true;timer.callback();}},
  timers
 };
}
const fields={owner:'deadline-regression-owner',purpose:'finite deadline regression',project:'Nautilus Engine',process:{pid:12,creationTicks:'100',executable:'fixture-node'},browser:{pid:13,creationTicks:'101',executable:'fixture-browser'},port:12345};
function produce(clock,timeoutMs,{identityMs=0,metadataMs=0}={}){
 const events=[];let published,closed=0;
 const lifetime=startArtReviewLifetime(timeoutMs,()=>{events.push('capture');clock.advance(identityMs);return fields;},record=>{events.push('publish');published=record;clock.advance(metadataMs);},()=>{closed++;},{now:()=>clock.now(),setTimer:(callback,delay)=>{events.push('arm');return clock.setTimer(callback,delay);}});
 assert.strictEqual(lifetime.record,published);assert.deepEqual(events,['capture','publish','arm']);
 for(const key of ['owner','purpose','project','process','browser','port'])assert.deepEqual(published[key],fields[key]);
 return {lifetime,published,get closed(){return closed;}};
}

test('recorded ten-minute lifetime uses one captured time and arms its exact deadline after setup',()=>{
 const clock=advancingClock(),r=produce(clock,600000,{identityMs:5,metadataMs:71});
 assert.equal(r.published.startedAt,'2026-01-01T00:00:00.000Z');assert.equal(r.published.expiresAt,'2026-01-01T00:10:00.000Z');
 assert.equal(Date.parse(r.published.expiresAt)-Date.parse(r.published.startedAt),600000);
 assert.equal(clock.reads,2,'One start read, then one remaining-budget read.');assert.equal(r.lifetime.expiry.delay,599923);
 assert.equal(r.lifetime.expiry.due,clock.epoch+600000);assert.equal(clock.timers.length,1);
 clock.advance(599922);assert.equal(r.closed,0);clock.advance(1);assert.equal(r.closed,1);clock.advance(1000);assert.equal(r.closed,1);
});
test('identity and metadata work near expiry leave only the original remaining millisecond',()=>{
 const clock=advancingClock(),r=produce(clock,1000,{identityMs:300,metadataMs:698});
 assert.equal(r.published.startedAt,'2026-01-01T00:00:00.000Z');assert.equal(r.published.expiresAt,'2026-01-01T00:00:01.000Z');
 assert.equal(r.lifetime.expiry.delay,1);assert.equal(r.lifetime.expiry.due,clock.epoch+1000);assert.equal(r.closed,0);
 clock.advance(1);assert.equal(r.closed,1);
});
test('setup that consumes the deadline schedules immediate expiry instead of a fresh timeout',()=>{
 const clock=advancingClock(),r=produce(clock,1000,{identityMs:400,metadataMs:600});
 assert.equal(r.lifetime.expiry.delay,0);assert.equal(r.published.expiresAt,'2026-01-01T00:00:01.000Z');assert.equal(r.closed,0);
 clock.advance(0);assert.equal(r.closed,1);
});
test('setup failures propagate without arming an unowned timer',()=>{
 for(const phase of ['capture','publish']){
  const clock=advancingClock(),failure=Error('failed '+phase);
  assert.throws(()=>startArtReviewLifetime(1000,()=>{if(phase==='capture')throw failure;return fields;},()=>{if(phase==='publish')throw failure;},()=>{throw Error('Unexpected expiry');},{now:()=>clock.now(),setTimer:(...args)=>clock.setTimer(...args)}),e=>e===failure);
  assert.equal(clock.timers.length,0);
 }
});
