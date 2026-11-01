import test from 'node:test';
import assert from 'node:assert/strict';
import {readinessViewModel} from '../packages/functional-scene-ui/readiness.js';
import {createPlayerSessionController} from '../packages/functional-scene-ui/session-controller.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const handle=id=>({id,gated:true,disposed:0,activated:0,userPaused:true,activate(){this.activated++;},setGated(value){this.gated=value;},dispose(){this.disposed++;}});
const part=(classification='functional')=>({instanceId:'assembly-1',partId:'door-1',label:'Gate',classification,diagnostics:[]});
test('readiness distinctions are presentation-only and cannot silently grant missing behavior',()=>{
 const input={parts:[part(),part('decorative')]},before=JSON.stringify(input),ready=readinessViewModel(input);assert.equal(ready.canPlay,true);assert.equal(ready.counts.decorative,1);assert.equal(JSON.stringify(input),before);
 for(const classification of ['incomplete','unsupported','decorative'])assert.equal(readinessViewModel({parts:[part(classification)]}).canPlay,false);
 assert.equal(readinessViewModel({parts:[part('future-profile')]}).classification,'unsupported');assert.equal(readinessViewModel({parts:[]}).classification,'incomplete');
});
test('diagnostics preserve complete source IDs, paths, remedies and blocking errors',()=>{
 const input={parts:[{...part(),diagnostics:[{code:'LANDING_MISSING',path:'/instances/4/connections/0',reason:'Landing is missing.',remedy:'Connect the upper slab.'}]}]},result=readinessViewModel(input);
 assert.equal(result.canPlay,false);assert.deepEqual(result.diagnostics[0],{code:'LANDING_MISSING',severity:'error',instanceId:'assembly-1',partId:'door-1',path:'/instances/4/connections/0',reason:'Landing is missing.',remedy:'Connect the upper slab.'});
});
test('readiness accessors are refused without invocation or false success',()=>{
 let calls=0;const input={};Object.defineProperty(input,'parts',{get(){calls++;return [];}});
 assert.equal(readinessViewModel(input).classification,'unsupported');assert.equal(calls,0);
 const array=[part()];Object.defineProperty(array,'map',{get(){calls++;throw Error('Do not invoke');}});
 assert.equal(readinessViewModel({parts:array}).canPlay,true);assert.equal(calls,0);
});
test('successful session adoption retires only the previous owned handle',async()=>{
 const a=handle('a'),b=handle('b'),queue=[a,b],controller=createPlayerSessionController({prepare:async()=>queue.shift()});
 assert.equal((await controller.load({})).session,a);assert.equal(a.gated,false);assert.equal(a.userPaused,true);
 assert.equal((await controller.load({})).session,b);assert.equal(a.disposed,1);assert.equal(b.disposed,0);assert.equal(b.gated,false);
 await controller.dispose();await controller.dispose();assert.equal(b.disposed,1);
});
test('failed preparation and activation preserve the accepted session and restore its gate',async()=>{
 const a=handle('accepted'),bad=handle('bad');let fail=false;
 const controller=createPlayerSessionController({prepare:async()=>{if(fail)throw Error('Missing profile');return a;}});
 await controller.load({});fail=true;const result=await controller.load({});
 assert.equal(result.ok,false);assert.equal(controller.current,a);assert.equal(a.disposed,0);assert.equal(a.gated,false);
 await controller.dispose();
 const b=handle('old'),controller2=createPlayerSessionController({prepare:async({request})=>request==='bad'?bad:b});
 await controller2.load('old');bad.activate=()=>{throw Error('Art unavailable');};assert.equal((await controller2.load('bad')).ok,false);assert.equal(controller2.current,b);assert.equal(b.gated,false);assert.equal(bad.disposed,1);await controller2.dispose();
});
test('latest preparation wins; stale progress and late handles cannot replace the accepted scene',async()=>{
 const first=deferred(),a=handle('a'),b=handle('b');let oldProgress,oldSignal;
 const controller=createPlayerSessionController({prepare:({request,signal,progress})=>{if(request==='a'){oldProgress=progress;oldSignal=signal;return first.promise;}return Promise.resolve(b);}});
 const pending=controller.load('a');await controller.load('b');oldProgress({label:'Stale load',current:1,total:1});assert.equal(controller.state.progress,null);assert.equal(oldSignal.aborted,true);
 first.resolve(a);assert.equal((await pending).code,'UI_CANCELLED');assert.equal(controller.current,b);assert.equal(a.disposed,1);await controller.dispose();
});
test('return to title keeps the accepted session; cancellation and late disposal preserve borrowed state',async()=>{
 const a=handle('a'),late=handle('late'),wait=deferred(),controller=createPlayerSessionController({prepare:({request})=>request==='a'?Promise.resolve(a):wait.promise});
 await controller.load('a');const pending=controller.load('late');controller.returnToTitle();assert.equal(a.gated,true);assert.equal(controller.current,a);
 wait.resolve(late);await pending;assert.equal(late.disposed,1);assert.equal(controller.resume(),true);assert.equal(a.gated,false);assert.equal(a.userPaused,true);
 await controller.dispose();assert.equal(a.disposed,1);
});
test('disposal cancels pending acquisition and retires a subsequently returned handle exactly once',async()=>{
 const wait=deferred(),late=handle('late'),controller=createPlayerSessionController({prepare:()=>wait.promise});const pending=controller.load({});
 const disposal=controller.dispose();assert.equal(disposal,controller.dispose());await disposal;wait.resolve(late);await pending;await controller.settled();
 assert.equal(late.disposed,1);assert.equal(controller.current,null);assert.equal(controller.state.phase,'disposed');
});
test('reusing a live handle is refused without disposing it; cleanup failure is visible',async()=>{
 const a=handle('a'),controller=createPlayerSessionController({prepare:async()=>a});await controller.load({});assert.equal((await controller.load({})).ok,false);assert.equal(a.disposed,0);
 a.dispose=()=>{throw Error('Owned texture cleanup failed');};await controller.dispose();assert.equal(controller.state.cleanupErrors[0].code,'UI_SESSION_DISPOSAL_FAILED');
});
test('a replaced load cannot return the newer handle while its prior retirement is pending',async()=>{
 const wait=deferred(),a=handle('a'),b=handle('b'),c=handle('c');a.dispose=()=>wait.promise;
 const controller=createPlayerSessionController({prepare:async({request})=>({a,b,c})[request]});await controller.load('a');const pending=controller.load('b');
 await Promise.resolve();await Promise.resolve();await Promise.resolve();await controller.load('c');wait.resolve();const result=await pending;assert.equal(result.ok,false);assert.equal(controller.current,c);await controller.dispose();
});