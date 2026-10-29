// Runs the exact packaged guide block as an ordinary installed consumer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {THREE as T} from '@nautilus-engine/map-core/actors/bear/three';
import {engineManifest} from '@nautilus-engine/map-core/contracts';
import {openAppearance} from '@nautilus-engine/map-core/appearance';
import {fakeRenderer,jsonLoader,textureLoader} from './renderer-fixture.mjs';

export async function runBearHandoffExample(){
  const guide=fs.readFileSync(new URL('./node_modules/@nautilus-engine/map-core/docs/bear-handoff.md',import.meta.url),'utf8');
  const snippet=guide.match(/<!-- example:bear-view -->\s*```js\s*([\s\S]*?)```/)?.[1];assert.ok(snippet,'Installed usage card contains the complete public-import example.');
  fs.writeFileSync(new URL('./handoff-view-example.mjs',import.meta.url),snippet);
  const {bindBearViews}=await import('./handoff-view-example.mjs'),golden=JSON.parse(fs.readFileSync('golden-block.json','utf8'));
  const scene=new T.Scene(),retained=new T.Group(),renderer=fakeRenderer(),consumer=engineManifest(),textures=[];scene.add(retained);let rendererDisposals=0,validFloor=true,validTransform=true,loads=0;
  renderer.dispose=()=>rendererDisposals++;
  const host={renderer,scene,consumer,loadJSON:async(...args)=>{loads++;return jsonLoader(...args);},loadTexture:async(...args)=>{const texture=await textureLoader()(...args),record={disposals:0};texture.addEventListener('dispose',()=>record.disposals++);textures.push(record);return texture;},placement:record=>{
    if(!validFloor)throw Error('Unknown authored floor '+record.z+'; bind its actual elevation before preparing the view.');
    return {position:[record.x,validTransform?0:NaN,record.y],yawRadians:record.heading*Math.PI/180};
  }};
  assert.throws(()=>bindBearViews({...host,placement:undefined}),/bind placement/);
  assert.throws(()=>bindBearViews({...host,renderer:null}),/borrowed host Three renderer/);
  const binding=bindBearViews(host);let first;
  try{
    first=await binding.prepare(golden);assert.equal(scene.children.length,1,'Preparation does not mutate the retained scene.');first.frame(.7);first.attach();first.attach();assert.equal(scene.children.length,2,'Repeated attachment cannot duplicate the group.');assert.equal(first.group.parent,scene);assert.equal(first.group.children[0].name,golden.actors[0].id);assert.deepEqual(first.group.children[0].position.toArray(),[12,0,12]);assert.deepEqual(openAppearance(first.save()),golden);
    const before=JSON.stringify(first.group.children[0].matrixWorld.elements);first.frame(.7);first.frame(.7);assert.equal(JSON.stringify(first.group.children[0].matrixWorld.elements),before);assert.throws(()=>first.frame(NaN),/nonnegative seconds/);
    const capabilities=consumer.capabilities;consumer.capabilities=capabilities.filter(row=>row.id!=='nautilus-bear-appearance-v1');const beforeLoads=loads;await assert.rejects(binding.prepare(golden),error=>error.diagnostics.some(item=>item.code==='UNSUPPORTED_REQUIRED_FEATURE'));consumer.capabilities=capabilities;assert.equal(loads,beforeLoads);assert.equal(first.group.parent,scene);
    validFloor=false;await assert.rejects(binding.prepare(golden),/Unknown authored floor 0/);validFloor=true;validTransform=false;await assert.rejects(binding.prepare(golden),/finite metres and yaw radians/);validTransform=true;assert.equal(loads,beforeLoads);assert.equal(first.group.parent,scene);
    const controller=new AbortController(),cancelled=binding.prepare(golden,{signal:controller.signal});controller.abort();await assert.rejects(cancelled,error=>error.name==='AbortError');assert.equal(scene.children.length,2);first.frame(.9);
    const staged=await binding.prepare(golden);staged.frame(.9);assert.equal(scene.children.length,2);staged.dispose();assert.equal(first.group.parent,scene);
    const replacement=await binding.prepare(first.save());replacement.frame(.9);replacement.attach();first.dispose();assert.equal(scene.children.length,2);assert.equal(replacement.group.parent,scene);assert.deepEqual(openAppearance(replacement.save()),golden);
  }finally{await binding.dispose();}
  assert.equal(scene.children.length,1);assert.equal(scene.children[0],retained);assert.equal(rendererDisposals,0);assert.ok(textures.length>0&&textures.every(record=>record.disposals===1));assert.throws(()=>first.frame(1),/live view/);await assert.rejects(binding.prepare(golden),/new binding/);await binding.dispose();

  // Closing during an ignored-cancellation texture load must await the exact
  // example's pending preparation and release the late transferred texture.
  let finish,lateTexture;const late=bindBearViews({...host,loadTexture:()=>new Promise(resolve=>finish=resolve)}),loading=late.prepare(golden);
  while(!finish)await new Promise(resolve=>setImmediate(resolve));const closing=late.dispose();lateTexture=await textureLoader()();let lateDisposals=0;lateTexture.addEventListener('dispose',()=>lateDisposals++);finish(lateTexture);await assert.rejects(loading,error=>error.name==='AbortError');await closing;assert.equal(lateDisposals,1);assert.equal(scene.children.length,1);assert.equal(rendererDisposals,0);
  return {guide:'docs/bear-handoff.md',publicImports:true,retainedScene:true,bindingsOnce:true,saveRestore:true,unsupportedCapabilityBeforeLoading:true,invalidFloorBeforeLoading:true,cancelRetry:true,lateClose:true,rendererDisposed:false,ownedRawTexturesDisposedOnce:true};
}
