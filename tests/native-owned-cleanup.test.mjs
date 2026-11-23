import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../packages/render-effects/three.js';import {createOwnedCleanup} from '../packages/native-actors/owned-cleanup.js';import {abortable,loadOwnedTexture} from '../packages/native-actors/loading.js';
import fs from 'node:fs';import {createNativeBody} from '../packages/native-actors/body.js';

for(const motion of ['native-gait','native-crawl-v1'])test('production '+motion+' body drains resources after throwing skeleton/worker/removal observers',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/goat-10k-data.json',import.meta.url))),body=createNativeBody({model:'goat',actorId:'cleanup-body',data,motion,...(motion==='native-crawl-v1'?{crawl:{equipment:'rifle',surface:{kind:'flat-plane',floorId:'yard',heightM:0}}}:{})}),resources=new Set([body.worker.material,body.worker.grey]),counts=new Map(),parent=new T.Group(),borrowed=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());parent.add(borrowed,body.root);
  for(const root of [body.root,body.worker.rifle.root])root.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)resources.add(m);});
  const bone=new T.DataTexture(new Float32Array(16),4,1);body.worker.skeleton.boneTexture=bone;resources.add(bone);for(const resource of resources)resource.addEventListener('dispose',()=>{counts.set(resource,(counts.get(resource)||0)+1);body.dispose();throw Error('owned-observer');});
  body.worker.dispose=()=>{throw Error('worker-disposer');};body.worker.skeleton.dispose=()=>{throw Error('skeleton-disposer');};body.root.addEventListener('removed',()=>{body.dispose();throw Error('removal-observer');});
  let error;try{body.dispose();}catch(e){error=e;}assert(error instanceof AggregateError);const messages=e=>[e.message,...(e.errors||[]).flatMap(messages)];for(const message of ['worker-disposer','skeleton-disposer','removal-observer'])assert(messages(error).includes(message));assert.equal(counts.size,resources.size);assert([...counts.values()].every(n=>n===1));assert.equal(body.worker.skeleton.boneTexture,null);assert.equal(body.root.children.length,0);assert.deepEqual(parent.children,[borrowed]);body.dispose();assert([...counts.values()].every(n=>n===1));borrowed.geometry.dispose();borrowed.material.dispose();
});

test('owned disposal drains every observer and independent resource despite throws and reentry',()=>{
  const scope=createOwnedCleanup(),a=scope.own(new T.Texture()),b=scope.own(new T.MeshBasicMaterial()),calls=[];
  a.addEventListener('dispose',()=>{calls.push('throw');scope.dispose();a.dispose();throw Error('observer');});a.addEventListener('dispose',()=>calls.push('renderer'));b.addEventListener('dispose',()=>calls.push('material'));
  assert.throws(()=>scope.dispose(),e=>e instanceof AggregateError&&e.errors.some(x=>x.message==='observer'));assert.deepEqual(calls,['material','throw','renderer']);scope.dispose();a.dispose();b.dispose();assert.equal(calls.length,3);
});
test('nested depth disposal completes parent render-target cleanup before errors escape',()=>{
  const scope=createOwnedCleanup(),depth=scope.own(new T.DepthTexture(4,4)),target=scope.own(new T.WebGLRenderTarget(4,4,{depthTexture:depth})),calls=[];
  depth.addEventListener('dispose',()=>{calls.push('depth-observer');throw Error('depth');});depth.addEventListener('dispose',()=>calls.push('depth-renderer'));target.addEventListener('dispose',()=>{depth.dispose();calls.push('colour-framebuffer-renderer');});
  assert.throws(()=>scope.dispose(),AggregateError);assert.deepEqual(calls,['depth-observer','depth-renderer','colour-framebuffer-renderer']);
});
test('throwing disposer still dispatches terminal cleanup and later units drain',()=>{
  class Broken extends T.EventDispatcher{dispose(){throw Error('disposer');}}
  const scope=createOwnedCleanup(),resource=scope.own(new Broken()),calls=[];resource.addEventListener('dispose',()=>calls.push('terminal'));scope.defer(()=>{throw Error('separate');});
  assert.throws(()=>scope.dispose(),e=>e.errors.map(x=>x.message).join()==='separate,disposer');assert.deepEqual(calls,['terminal']);
});
test('owner journal survives mutable dispose replacement and leaves independent borrowers live',()=>{
  const scope=createOwnedCleanup(),owned=scope.own(new T.Texture()),borrowed=new T.Texture(),calls=[];owned.addEventListener('dispose',()=>calls.push('owned'));borrowed.addEventListener('dispose',()=>calls.push('borrowed'));owned.dispose=()=>{throw Error('replacement');};scope.dispose();assert.deepEqual(calls,['owned']);borrowed.dispose();assert.deepEqual(calls,['owned','borrowed']);
});
test('cancelled never-delivered image settles, retires its placeholder and ignores late success',async()=>{
  const scope=createOwnedCleanup(),controller=new AbortController(),texture=new T.Texture();let success,calls=0;texture.addEventListener('dispose',()=>calls++);const promise=loadOwnedTexture('owned',scope,controller.signal,{load(url,ready){success=ready;return texture;}});controller.abort();await assert.rejects(promise,e=>e.code==='PREPARATION_CANCELLED');scope.dispose();assert.equal(calls,1);success(texture);await Promise.resolve();assert.equal(calls,1);scope.dispose();
});
test('image errors and synchronous completion retain one owner and current contract',async()=>{
  const a=createOwnedCleanup(),texture=new T.Texture();let closed=0;texture.addEventListener('dispose',()=>closed++);assert.equal(await loadOwnedTexture('ready',a,null,{load(url,ready){ready(texture);return texture;}}),texture);a.dispose();assert.equal(closed,1);
  const b=createOwnedCleanup(),other=new T.Texture();const failed=loadOwnedTexture('failed',b,null,{load(url,ready,progress,error){error(Error('image-failed'));return other;}});await assert.rejects(failed,/image-failed/);b.dispose();
});
test('aborted acquisition settles without an ignored fetch callback and observes late rejection',async()=>{
  const controller=new AbortController();let fail;const pending=new Promise((resolve,reject)=>{fail=reject;}),request=abortable(pending,controller.signal);controller.abort();await assert.rejects(request,e=>e.code==='PREPARATION_CANCELLED');fail(Error('late-fetch'));await Promise.resolve();
});
