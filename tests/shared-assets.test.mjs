import {distribution} from '../tools/distribution.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../packages/render-effects/three.js';
import {listSharedAssets,sharedAsset} from '../packages/assets/index.js';
import {loadBuildingAssets} from '../packages/assets/three.js';
import {checkSharedAssets} from '../tools/shared-assets.mjs';

test('shared asset discovery uses copied engine-owned IDs and matches reviewed registries',()=>{
 checkSharedAssets();const assets=listSharedAssets();assert.ok(assets.length>=405);assert.equal(new Set(assets.map(a=>a.id)).size,assets.length);
 const buildings=listSharedAssets({category:'Buildings'});assert.equal(buildings.length,61);
 const first=sharedAsset('building:bramble-ranch');first.source.project='changed';assert.equal(sharedAsset(first.id).source.project,'nautilus');
 assert.equal(first.availability,'shared-building-renderer');assert.throws(()=>sharedAsset('missing'),/Unknown shared asset/);
});
test('public building facade uses host Three at native scale and owns only loaded resources',async()=>{
 let textureDisposed=0,rendererDisposed=0;const atlas=new THREE.Texture();atlas.addEventListener('dispose',()=>textureDisposed++);
 const renderer={capabilities:{getMaxAnisotropy:()=>4},dispose:()=>rendererDisposed++};
 const library=await loadBuildingAssets(THREE,{renderer,providers:['original'],loadTexture:async()=>atlas});
 const building=library.create(sharedAsset('building:bramble-ranch').id);assert.ok(building.root instanceof THREE.Group);assert.deepEqual(building.root.scale.toArray(),[1,1,1]);
 building.setView({view:'cutaway',level:0});assert.throws(()=>library.create('albany-cottage'),/not loaded/);
 library.dispose();library.dispose();building.dispose();assert.equal(textureDisposed,1);assert.equal(rendererDisposed,0);
 assert.throws(()=>library.create('bramble-ranch'),/disposed/);assert.throws(()=>building.setView(),/disposed/);
});
test('public library disposes a successfully loaded provider if another provider fails',async()=>{
 const originalFetch=globalThis.fetch;let disposed=0;const atlas=new THREE.Texture();atlas.addEventListener('dispose',()=>disposed++);
 globalThis.fetch=async()=>{throw Error('Intentional unavailable source');};
 try{await assert.rejects(()=>loadBuildingAssets(THREE,{providers:['original','gross'],loadTexture:async()=>atlas}),/Intentional unavailable source/);assert.equal(disposed,1);}
 finally{globalThis.fetch=originalFetch;}
});

test('every distribution carrying Three preserves its complete original MIT license',()=>{
 for(const profile of ['renderer','compatibility']) {const files=distribution(profile).files;assert.ok(files.some(f=>f.endsWith('/three.module.js')));assert.ok(files.some(f=>f.endsWith('/THREE-LICENSE.txt')));}
});
