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
test('original instances share one template per design, keep independent views and release it with the last instance',async()=>{
 const atlas=new THREE.Texture(),library=await loadBuildingAssets(THREE,{providers:['original'],loadTexture:async()=>atlas});
 const meshes=root=>{const out=[];root.traverse(node=>{if(node.isMesh)out.push(node);});return out;},visible=root=>{const out=[];root.traverse(node=>out.push(node.visible));return out;};
 const copies=Array.from({length:32},()=>library.create('building:dockside-warehouse')),geometries=new Set(copies.flatMap(copy=>meshes(copy.root).map(mesh=>mesh.geometry)));
 assert.equal(geometries.size,meshes(copies[0].root).length,'32 copies draw from one template');
 assert.notEqual(copies[0].root,copies[1].root);
 // A control first: a cutaway hides nodes; then views stay per instance.
 const exterior=visible(copies[1].root);copies[0].setView({view:'cutaway',level:0});
 assert.ok(visible(copies[0].root).some(v=>!v));assert.deepEqual(visible(copies[1].root),exterior,'another instance keeps its view');
 const late=library.create('dockside-warehouse');assert.deepEqual(visible(late.root),exterior,'a new instance starts in the default view');
 let released=0;for(const geometry of geometries)geometry.addEventListener('dispose',()=>released++);
 for(const copy of copies)copy.dispose();assert.equal(released,0,'the template outlives all but the last instance');
 late.dispose();assert.equal(released,geometries.size,'the last instance releases each template geometry once');
 const again=library.create('dockside-warehouse');assert.ok(meshes(again.root).every(mesh=>!geometries.has(mesh.geometry)),'a released template is rebuilt');
 library.dispose();assert.throws(()=>again.setView(),/disposed/);
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
