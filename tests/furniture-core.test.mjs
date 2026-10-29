import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {listFurnitureAssets,furnitureAsset} from '@nautilus-engine/map-core/furniture';
import {furnitureTextureURLs} from '@nautilus-engine/map-core/furniture/three';
import {FORMS,SKINS,CONTENTS,specification} from '../vendor/farmyard-furniture/fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b/sites/tactical-animal/dist/art/library/catalog.js';
import {distribution,moduleClosure} from '../tools/distribution.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const id='furniture:library.bookcase-double-thick.oak.books';
test('furniture IDs, exact filters, support notes and copies preserve the 8 x 6 x 2 catalogue',()=>{
  const assets=listFurnitureAssets();assert.equal(assets.length,96);assert.equal(new Set(assets.map(asset=>asset.id)).size,96);
  assert.equal(new Set(assets.map(asset=>asset.form)).size,8);assert.equal(new Set(assets.map(asset=>asset.finish)).size,6);
  assert.equal(listFurnitureAssets({form:'bookcase-double-thick',finish:'oak',contents:'books'}).length,1);
  assert.equal(listFurnitureAssets({contents:'empty'}).length,48);
  for(const asset of assets){assert.equal(asset.availability,'visual-only');assert.equal(asset.mapPlacement,false);assert.equal(asset.units,'metres');assert.equal(asset.gameplay.supported,false);assert.equal(asset.halo.supported,false);assert.match(asset.halo.reason,/InstancedMesh/);assert.equal(asset.source.commit,'fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b');}
  const a=furnitureAsset(id);a.tiles[0]=99;a.navigationFootprint[0]=99;a.placementOffset[0]=99;a.source.commit='moving';a.halo.supported=true;
  assert.deepEqual(furnitureAsset(id),listFurnitureAssets({form:'bookcase-double-thick',finish:'oak',contents:'books'})[0]);
  assets[0].source.id='changed';assert.notEqual(listFurnitureAssets()[0].source.id,'changed');
  for(const filters of [null,[],{form:'missing'},{finish:'missing'},{contents:'half'},{skin:'oak'},{form:undefined}])assert.throws(()=>listFurnitureAssets(filters),/Unsupported/);
  for(const badId of ['library.bookcase-double-thick.oak.books','furniture:library.missing.oak.books',null,{},42])assert.throws(()=>furnitureAsset(badId),/ID/);
  for(const rotation of [1,45,-90,360,NaN,Infinity,'90',null,undefined])assert.throws(()=>furnitureAsset(id,{rotation}),/rotation/);
  assert.throws(()=>furnitureAsset(id,{turns:1}),/options/);
});

test('all 384 declared variants/rotations retain source bodies, reservations, offsets and front axes',()=>{
  for(const form of FORMS)for(const finish of SKINS)for(const contents of CONTENTS)for(const rotation of [0,90,180,270]){
    const source=specification(form.id,finish.id,contents,rotation),spec=furnitureAsset('furniture:'+source.id,{rotation});
    for(const key of ['size','tiles','navigationFootprint','placementOffset'])assert.deepEqual(spec[key],source[key]);
    assert.equal(spec.source.version,'library-furniture/3');assert.equal(spec.rotation,rotation);
    const vector=form.frontAxis==='+X'?[1,0]:[0,1],angle=rotation*Math.PI/180;
    const expected=[vector[0]*Math.cos(angle)+vector[1]*Math.sin(angle),-vector[0]*Math.sin(angle)+vector[1]*Math.cos(angle)];
    const axes={'+X':[1,0],'-X':[-1,0],'+Z':[0,1],'-Z':[0,-1]};
    assert.ok(expected.every((value,index)=>Math.abs(value-axes[spec.frontAxis][index])<1e-10));
  }
  assert.deepEqual(furnitureAsset(id).tiles,[1,2]);assert.deepEqual(furnitureAsset(id).placementOffset,[0,.5]);
  assert.deepEqual(furnitureAsset(id,{rotation:90}).tiles,[2,1]);assert.deepEqual(furnitureAsset(id,{rotation:90}).placementOffset,[.5,0]);
});

test('headless furniture imports with browser globals sealed and its static closure excludes renderer machinery',()=>{
  const closure=moduleClosure(['packages/furniture-core/index.js']);assert.equal(closure.length,2);assert.ok(closure.every(name=>!name.includes('three')));
  const code=`for(const key of ['document','window','navigator','localStorage','sessionStorage','indexedDB','THREE'])Object.defineProperty(globalThis,key,{get(){throw Error('Forbidden '+key);}});const core=await import('@nautilus-engine/map-core/furniture');if(core.listFurnitureAssets().length!==96)throw Error('Missing variants');`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr);
  const scan=spawnSync(process.execPath,['--experimental-vm-modules','tests/helpers/headless-closure.mjs','--entry','packages/furniture-core/index.js'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(scan.status,0,scan.stderr);assert.deepEqual(JSON.parse(scan.stdout).violations,[]);
});

test('renderer closure uses host Three and every package-relative paint URL resolves to the pinned bytes',()=>{
  const closure=moduleClosure(['packages/furniture-core/three.js']);assert.ok(!closure.some(name=>/three\.(module|core)\.js$/.test(name)));
  assert.ok(!closure.some(name=>name.endsWith('/painted-furniture.js')||name.endsWith('/painted-environment-scene.js')||name.endsWith('/art/library/furniture.js')));
  const manifest=JSON.parse(fs.readFileSync(new URL('../vendor/farmyard-furniture/fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b/provenance.json',import.meta.url)));
  const urls=furnitureTextureURLs(),renderer=distribution('renderer'),compatibility=distribution(),core=distribution('core');
  assert.equal(core.exports['./furniture'],'./packages/furniture-core/index.js');assert.equal(core.exports['./furniture/three'],undefined);
  for(const resource of manifest.runtimeResources){const bytes=fs.readFileSync(new URL(urls[resource.key]));assert.equal(createHash('sha256').update(bytes).digest('hex'),resource.sha256);assert.ok(renderer.files.includes(resource.enginePath));assert.ok(compatibility.files.includes(resource.enginePath));assert.ok(!core.files.includes(resource.enginePath));}
  urls.atlas='changed';assert.notEqual(furnitureTextureURLs().atlas,'changed');
});
