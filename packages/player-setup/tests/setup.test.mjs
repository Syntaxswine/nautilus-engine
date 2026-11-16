import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createSetupConfiguration,validatePlayerSetup,flatYardContent,createDefaultWorld,SETUP_PORTS,output,bindSetupProvider} from '../index.js';
import {createFrameClock,createRetainedFrameSource} from '../clock.js';
import {nativeActor} from '../../native-actors/index.js';
import {createNativeBody} from '../../native-actors/body.js';
import {prepareNativeActor} from '../../native-actors/three.js';
const content=flatYardContent({sourcePin:'290926270b04c739e78efb427f330db9483ec847'}),configuration=()=>createSetupConfiguration({content:content.identity});

test('automatic defaults compile a complete strict runtime closure and exact recipe roundtrip without DOM',()=>{
  assert.equal(typeof document,'undefined');const result=validatePlayerSetup(configuration(),{content});assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.deepEqual(Object.keys(result.compiled).sort(),['bindings','hosts','modules','selected','version']);
  assert.deepEqual(new Set(result.plan.order),new Set(['setup.world','setup.surface','setup.clock','setup.camera','setup.actor','setup.shell','setup.runtime']));
  assert.deepEqual(validatePlayerSetup(JSON.stringify(result.configuration),{content}).configuration,result.configuration);
  assert.equal(result.configuration.engine.sourcePin,'7f50cb2a48aef87a16fc0465997549be9ed88dc2');
});
test('semantic defaults distinguish missing/ambiguous/incompatible endpoints and preserve explicit overrides',()=>{
  const c=configuration();c.components.push({id:'player.trains',version:1,settings:{steamProfile:'classic',muted:false}});assert.ok(validatePlayerSetup(c,{content}).errors.some(e=>e.code==='MISSING_PORT'&&e.action));
  const provider={descriptor:{id:'retained.world',version:1,ports:[output(SETUP_PORTS.world)]},services:{}};
  assert.ok(validatePlayerSetup(configuration(),{content,providers:[provider]}).errors.some(e=>e.code==='AMBIGUOUS_PORT'));
  const bound=bindSetupProvider(configuration(),provider);assert.equal(validatePlayerSetup(bound,{content,providers:[provider]}).configuration.bindings[SETUP_PORTS.world.id],'retained.world');
  provider.descriptor.ports[0].units='pixels';assert.ok(validatePlayerSetup(bound,{content,providers:[provider]}).errors.some(e=>e.code==='INCOMPATIBLE_PORT'));
  provider.descriptor.ports[0].units='metres';provider.descriptor.ports[0].role='request';assert.ok(validatePlayerSetup(bound,{content,providers:[provider]}).errors.some(e=>e.code==='INCOMPATIBLE_PORT'));
  provider.descriptor.ports[0].role='committed-event';assert.ok(validatePlayerSetup(bound,{content,providers:[provider]}).errors.some(e=>e.code==='INCOMPATIBLE_PORT'));
});

test('native startup rejects another renderer namespace before fetching assets',async()=>{
  let fetched=false;await assert.rejects(prepareNativeActor({renderer:{isWebGLRenderer:true},actorId:'player',fetchResource(){fetched=true;}}),/shared Three renderer/);assert.equal(fetched,false);
});
test('unknown gameplay modules/settings, engine changes and executable configuration refuse before allocation',()=>{
  const c=configuration();c.components.push({id:'combat',version:1,settings:{}});assert.equal(validatePlayerSetup(c,{content}).ok,false);
  const bad=configuration();bad.engine.sourcePin='0'.repeat(40);assert.equal(validatePlayerSetup(bad,{content}).ok,false);
  let accessed=false;const evil=configuration();Object.defineProperty(evil,'actorId',{enumerable:true,get(){accessed=true;return 'player';}});assert.equal(validatePlayerSetup(evil,{content}).ok,false);assert.equal(accessed,false);
  assert.throws(()=>nativeActor('hen'),/unavailable/);assert.throws(()=>nativeActor('goat',['throw']),/idle\/walk/);
});
test('default world uses retained movement/query transactions and preserves injured/spent resources on reopen',()=>{
  const world=createDefaultWorld(content,{actorId:'player'}),start=world.read();
  const result=world.walking.request({version:1,actorId:'player',vector:{x:1,y:0},seconds:.1});assert.equal(result.committed,true);
  assert.ok(world.readPose().position.x>start.actor.position.x);assert.deepEqual(world.read().resources,start.resources);
  const saved=world.checkpoint();saved.resources.player.health=4;saved.resources.player.ap=0;saved.resources.player.inventory=[];
  const restored=createDefaultWorld(content,{actorId:'player',checkpoint:saved});assert.deepEqual(restored.read().resources,saved.resources.player);assert.deepEqual(restored.readPose(),world.readPose());
  const blocked=world.walking.request({version:1,actorId:'player',vector:{x:1,y:0},seconds:2});assert.equal(blocked.ok,false);
  restored.dispose();world.dispose();
});
test('owned clock releases only its pause owners and rechecks pause acquired during input before world advancement',()=>{
  let advances=0,frames=0,stops=0;const clock=createFrameClock({world:{advance(){advances++;}},window:{requestAnimationFrame(){frames++;return frames;},cancelAnimationFrame(){stops++;}},auto:true});
  const gate=clock.pause.acquire('menu'),second=clock.pause.acquire('other');let once=true;
  clock.subscribe(event=>{if(event.phase==='before'&&once){once=false;gate.setBlocked(true);}});clock.activate();clock.tick(.05);assert.equal(advances,0);
  second.setBlocked(true);gate.dispose();clock.tick(.05);assert.equal(advances,0);second.dispose();clock.tick(.05);assert.equal(advances,1);
  clock.dispose();assert.ok(stops);assert.throws(()=>clock.tick(.05),/retired/);
  const retained=createRetainedFrameSource(),events=[];const off=retained.subscribe(event=>events.push(event.phase));retained.beforeStep(.05);retained.afterStep(.05);off();retained.afterStep(.05);assert.deepEqual(events,['before','after']);
});
test('real native models walk in their canonical IK frame at off-origin world positions; only confirmed poses animate',()=>{
  for(const model of ['goat','donkey']){const data=JSON.parse(fs.readFileSync(new URL('../../../'+nativeActor(model).data.path,import.meta.url)));const body=createNativeBody({model,actorId:'player',data});
    try{body.update({actorId:'player',revision:0,mode:'on-foot',position:{x:60,y:30,h:2.12}});
      const initial=body.checkpoint();for(let i=1;i<=120;i++)body.update({actorId:'player',revision:i,mode:'on-foot',position:{x:60+i*.02,y:30+i*.01,h:2.12}});
      assert.ok(body.checkpoint().distanceM>initial.distanceM);assert.equal(body.root.scale.x,1);assert.equal(body.worker.root.scale.x,1);assert.equal(body.root.position.y,2.12);
      assert.ok(body.worker.bones.every(b=>[b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w].every(Number.isFinite)));
      const saved=body.checkpoint(),quaternions=body.worker.bones.map(b=>b.quaternion.toArray());const restored=createNativeBody({model,actorId:'player',data,checkpoint:saved});
      try{restored.update(saved.last);assert.deepEqual(restored.checkpoint(),saved);assert.deepEqual(restored.worker.bones.map(b=>b.quaternion.toArray()),quaternions);}finally{restored.dispose();}
      assert.throws(()=>body.update({...saved.last,revision:1}),/monotonic/);assert.equal(body.checkpoint().distanceM,saved.distanceM);
      body.update(saved.last,{settle:true});assert.equal(body.checkpoint().blend,0);
    }finally{body.dispose();body.dispose();}}
});
