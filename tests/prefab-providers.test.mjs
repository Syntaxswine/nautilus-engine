import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {PrefabLayer} from '../apps/editor/prefab-scene.js';
import {createOriginalBuildingProvider} from '../packages/prefab-core/provider-original.js';
import {ORIGINAL_BUILDING_ASSETS,BUILDING_ASSETS} from '../packages/prefab-core/registry.js';
import {buildingTransform} from '../packages/prefab-core/index.js';
import {LIBRARY_BUILDINGS,BUILDING_POOLS,findBuildings,seedAssetIds,assertBuildingAuthoringSupport} from '../apps/editor/building-library-data.js';
const options={level:0,showAllLevels:true,roofs:true,walls:true};
const doc=(asset='albany-cottage',id='one')=>({map:{buildingPrefabs:{instances:[{id,asset,x:40,y:40,turns:0,clearance:2}]}}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fakeProvider(load) {
  let creates=0,disposals=0;
  return {load,create(){creates++;const root=new T.Group();root.add(new T.Group());return {root,setView(){root.children[0].visible=true;},dispose(){disposals++;root.clear();}};},counts:()=>({creates,disposals})};
}
test('a failed provider load can retry on the next selection',async()=>{
  let loads=0,released=0;const errors=[],provider=fakeProvider(async()=>{if(++loads===1)throw Error('paint unavailable');return {dispose(){released++;}};});
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},e=>errors.push(e.message),{providers:new Map([['gross',provider]])});
  await layer.update(doc(),options);assert.deepEqual(errors,['paint unavailable']);assert.equal(layer.models.size,0);
  await layer.update(doc(),options);assert.equal(loads,2);assert.equal(layer.models.size,1);layer.dispose();assert.equal(released,1);
});
test('rapid collection changes discard the stale load and keep only the final model',async()=>{
  const gross=deferred(),original=deferred();let grossReleased=0,originalReleased=0;
  const g=fakeProvider(()=>gross.promise),o=fakeProvider(()=>original.promise),errors=[];
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},e=>errors.push(e.message),{providers:new Map([['gross',g],['original',o]])});
  const first=layer.update(doc(),options);await Promise.resolve();const last=layer.update(doc('bramble-ranch'),options);await Promise.resolve();
  original.resolve({dispose(){originalReleased++;}});await last;assert.equal(layer.models.get('one').asset,'bramble-ranch');
  gross.resolve({dispose(){grossReleased++;}});await first;assert.equal(grossReleased,1);assert.equal(g.counts().creates,0);assert.equal(layer.models.get('one').asset,'bramble-ranch');assert.deepEqual(errors,[]);
  layer.dispose();assert.equal(originalReleased,1);assert.equal(o.counts().disposals,1);
});
test('closing a scene during a load disposes late resources without creating geometry',async()=>{
  const pending=deferred();let released=0;const provider=fakeProvider(()=>pending.promise),errors=[];
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},e=>errors.push(e.message),{providers:new Map([['gross',provider]])});
  const opening=layer.update(doc(),options);await Promise.resolve();layer.dispose();layer.dispose();pending.resolve({dispose(){released++;}});await opening;
  assert.equal(released,1);assert.equal(provider.counts().creates,0);assert.equal(layer.models.size,0);assert.deepEqual(errors,[]);
});
test('rapid selections in one collection reuse the pending paint load',async()=>{
  const pending=deferred();let loads=0,released=0;const provider=fakeProvider(()=>{loads++;return pending.promise;});
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},error=>{throw error;},{providers:new Map([['gross',provider]])});
  const first=layer.update(doc(),options),last=layer.update(doc('grossdale-hip'),options);pending.resolve({dispose(){released++;}});await Promise.all([first,last]);
  assert.equal(loads,1);assert.equal(provider.counts().creates,1);assert.equal(layer.models.get('one').asset,'grossdale-hip');layer.dispose();assert.equal(released,1);
});
test('original models use the borrowed atlas, native scale, per-floor cutaways and recorded envelopes',async()=>{
  const atlas=new T.Texture();let atlasDisposals=0;atlas.addEventListener('dispose',()=>atlasDisposals++);
  const provider=createOriginalBuildingProvider(T,{loadTexture:async()=>atlas}),library=await provider.load({renderer:{capabilities:{getMaxAnisotropy:()=>4}}});
  assert.equal(atlas.colorSpace,T.SRGBColorSpace);assert.equal(atlas.wrapS,T.ClampToEdgeWrapping);
  for(const asset of ORIGINAL_BUILDING_ASSETS){const model=provider.create(library,asset.id);try{
    const native=new T.Box3().setFromObject(model.root);assert.ok(native.min.x>=asset.bounds[0]-1e-5&&native.min.z>=asset.bounds[1]-1e-5);assert.ok(native.max.x<=asset.bounds[2]+1e-5&&native.max.z<=asset.bounds[3]+1e-5);
    model.root.traverse(node=>{assert.deepEqual(node.scale.toArray(),[1,1,1]);if(node.isMesh&&node.material.map)assert.equal(node.material.map,atlas);});
    for(const floor of model.root.children.filter(n=>n.userData.kind==='floor'))assert.equal(floor.material.polygonOffset,true);
    for(let turns=0;turns<4;turns++){const p={asset:asset.id,x:40,y:40,turns},t=buildingTransform(p);model.root.position.set(t.x,0,t.y);model.root.rotation.y=t.angle;const b=new T.Box3().setFromObject(model.root);assert.ok(b.min.x>=39.4999&&b.min.z>=39.4999&&b.max.x<=39.5001+t.width&&b.max.z<=39.5001+t.depth,asset.id+' lot');}
    model.setView({view:'cutaway',level:0},options);assert.ok(model.root.children.filter(n=>n.userData.kind==='roof').every(n=>!n.visible));assert.ok(model.root.children.some(n=>n.visible));
    model.setView({view:'exterior'},options);assert.ok(model.root.children.every(n=>n.visible));
  }finally{model.dispose();model.dispose();assert.equal(atlasDisposals,0);}}
  library.dispose();library.dispose();assert.equal(atlasDisposals,1);
});
test('all 61 whole buildings and three stamps are discoverable and seed pools expose every original',()=>{
  assert.equal(LIBRARY_BUILDINGS.length,64);assert.equal(findBuildings('','original').length,48);assert.equal(findBuildings('','gross').length,13);assert.equal(findBuildings('','aft').length,3);
  assert.equal(findBuildings('warehouse','original')[0].id,'dockside-warehouse');assert.equal(findBuildings('missing nonsense').length,0);
  assert.equal(seedAssetIds('all').length,61);assert.equal(seedAssetIds('original').length,48);assert.equal(seedAssetIds('original-homes').length,24);
  for(const asset of BUILDING_ASSETS)assert.deepEqual(seedAssetIds('selected',asset.id),[asset.id]);assert.throws(()=>seedAssetIds('selected','shed'),/stamps/);
  assert.equal(BUILDING_POOLS[0].id,'residential');
  assert.throws(()=>assertBuildingAuthoringSupport(['bramble-ranch'],{optionalFeatures:['nautilus-building-prefabs-v1']}),/needs original-building/);
  assert.doesNotThrow(()=>assertBuildingAuthoringSupport(['bramble-ranch'],{optionalFeatures:['nautilus-building-prefabs-v1','nautilus-original-buildings-v1']}));
  assert.doesNotThrow(()=>assertBuildingAuthoringSupport(['albany-cottage'],{optionalFeatures:['nautilus-building-prefabs-v1']}));
});
