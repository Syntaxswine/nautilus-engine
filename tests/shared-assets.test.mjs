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
test('by default every building instance is independent: its own geometry, materials and view',async()=>{
 const atlas=new THREE.Texture(),library=await loadBuildingAssets(THREE,{providers:['original'],loadTexture:async()=>atlas});
 const meshes=root=>{const out=[];root.traverse(node=>{if(node.isMesh)out.push(node);});return out;};
 try{
  const a=library.create('dockside-warehouse'),b=library.create('dockside-warehouse'),ma=meshes(a.root),mb=meshes(b.root);
  assert.ok(ma.every(mesh=>!mb.some(other=>other.geometry===mesh.geometry||other.material===mesh.material)),'no shared geometry or material');
  // A host may tint or dispose one instance without touching the other.
  let disposed=0;for(const mesh of mb)mesh.geometry.addEventListener('dispose',()=>disposed++);
  ma[0].material.color.setRGB(1,0,0);assert.notEqual(mb[0].material.color.getHex(),0xff0000);
  a.root.traverse(node=>{if(node.isMesh)node.geometry.dispose();});assert.equal(disposed,0);
  const visible=root=>{const out=[];root.traverse(node=>out.push(node.visible));return out;};
  const before=visible(b.root);a.setView({view:'cutaway',level:0});assert.deepEqual(visible(b.root),before,'views are per instance');
 }finally{library.dispose();}
});
test('shared instances draw one design from display batches, share its view and release it with the last copy',async()=>{
 const atlas=new THREE.Texture(),library=await loadBuildingAssets(THREE,{providers:['original'],loadTexture:async()=>atlas,shared:true});
 const meshes=root=>{const out=[];root.traverse(node=>{if(node.isMesh)out.push(node);});return out;};
 const independent=await loadBuildingAssets(THREE,{providers:['original'],loadTexture:async()=>atlas});
 try{
  const copies=Array.from({length:32},()=>library.create('building:dockside-warehouse')),geometries=new Set(copies.flatMap(copy=>meshes(copy.root).map(mesh=>mesh.geometry)));
  const plain=meshes(independent.create('dockside-warehouse').root).length;
  assert.equal(geometries.size,new Set(meshes(copies[0].root).map(mesh=>mesh.geometry)).size,'32 copies draw from one design');
  assert.ok(meshes(copies[0].root).length*2<plain,'display batches: '+meshes(copies[0].root).length+' meshes against '+plain);
  // One view per design: a cutaway on one copy is the cutaway of every copy.
  const visible=root=>{const out=[];root.traverse(node=>out.push(node.visible));return out;};
  const groups=()=>meshes(copies[0].root).map(mesh=>JSON.stringify(mesh.geometry.groups)).join('|'),exterior=groups();
  copies[3].setView({view:'cutaway',level:0});assert.notEqual(groups(),exterior);assert.deepEqual(visible(copies[0].root),visible(copies[31].root));
  let released=0;for(const geometry of geometries)geometry.addEventListener('dispose',()=>released++);
  for(const copy of copies.slice(1))copy.dispose();assert.equal(released,0,'the design outlives all but the last copy');
  copies[0].dispose();assert.equal(released,geometries.size,'the last copy releases each batch geometry once');
  const again=library.create('dockside-warehouse');assert.ok(meshes(again.root).every(mesh=>!geometries.has(mesh.geometry)),'a released design is rebuilt');
  library.dispose();assert.throws(()=>again.setView(),/disposed/);
  await assert.rejects(()=>loadBuildingAssets(THREE,{providers:['original'],loadTexture:async()=>atlas,shared:'yes'}),/shared must be true or false/);
 }finally{library.dispose();independent.dispose();}
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
