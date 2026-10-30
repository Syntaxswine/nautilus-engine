import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {DESIGNS} from '../packages/building-catalog/index.js';
import {createBuildingModel} from '../packages/building-catalog/three.js';
import {buildingDigest,buildingDigests} from '../tools/building-geometry.mjs';
const reviewed=JSON.parse(fs.readFileSync(new URL('./fixtures/original-building-geometry.json',import.meta.url)));

test('every original building matches the reviewed renderer byte for byte at game and authoring detail',()=>{
  assert.equal(reviewed.recordedFrom.commit,'ee7c18ecdc2669168247b94a82156634b2c4ffe5');
  const digests=buildingDigests(T,createBuildingModel,DESIGNS.map(d=>d.id));
  assert.equal(Object.keys(digests).length,96);assert.deepEqual(digests,reviewed.digests);
});

test('the geometry digest sees a one-ulp vertex change, a reordered mesh and a renamed mesh',()=>{
  const id='bramble-ranch',fresh=()=>createBuildingModel(T,id),expected=reviewed.digests['game:'+id];
  const nudged=fresh(),position=nudged.root.children[0].geometry.attributes.position;
  position.array[4]=new Float32Array(new Uint32Array([new Uint32Array(new Float32Array([position.array[4]]).buffer)[0]+1]).buffer)[0];
  assert.notEqual(buildingDigest(nudged),expected);nudged.dispose();
  const reordered=fresh(),[first,second]=reordered.root.children;reordered.root.children[0]=second;reordered.root.children[1]=first;
  assert.notEqual(buildingDigest(reordered),expected);reordered.dispose();
  const renamed=fresh();renamed.root.children[0].name+='!';assert.notEqual(buildingDigest(renamed),expected);renamed.dispose();
  const control=fresh();assert.equal(buildingDigest(control),expected);assert.equal(buildingDigest(control),expected,'the digest leaves the model as it found it');control.dispose();
});

test('the geometry digest sees transforms, user data, material settings, view rules and the door swing',()=>{
  const id='bramble-ranch',fresh=()=>createBuildingModel(T,id),expected=reviewed.digests['game:'+id],differs=(change,label)=>{const model=fresh();try{change(model);assert.notEqual(buildingDigest(model),expected,label);}finally{model.dispose();}};
  differs(model=>{const pivot=model.doorRoots[0];pivot.position.x+=1e-6;pivot.updateMatrix();},'a door pivot moved by a micrometre');
  differs(model=>{model.root.children[0].userData.level+=1;},'user data');
  differs(model=>{const glass=model.materials.get('glass');glass.opacity+=.01;},'glass opacity');
  // Settings a hand-picked key missed (round 3's G11 brightened every material unseen).
  const material=model=>model.materials.get('interior');
  differs(model=>{for(const m of model.materials.values())m.emissive.setHex(0x202020);},'an emissive term on every material');
  differs(model=>{material(model).emissiveIntensity=2;},'emissive intensity');
  differs(model=>{material(model).vertexColors=true;},'vertex colours');
  differs(model=>{material(model).flatShading=true;},'flat shading');
  differs(model=>{material(model).alphaTest=.5;},'alpha test');
  differs(model=>{material(model).blending=T.AdditiveBlending;},'blending');
  differs(model=>{material(model).shadowSide=T.BackSide;},'shadow side');
  // Textures enter by their settings, not their ids: equal atlases digest alike, and a
  // texture transform changes the digest.
  const textured=()=>createBuildingModel(T,id,{atlas:new T.Texture()}),a=textured(),b=textured();
  try{
    assert.equal(buildingDigest(a),buildingDigest(b),'two equal atlases');
    material(b).map.repeat.set(2,1);assert.notEqual(buildingDigest(a),buildingDigest(b),'a texture transform');
  }finally{a.dispose();b.dispose();}
  differs(model=>{const setView=model.setView;model.setView=view=>{setView(view);model.root.children.at(-1).visible=false;};},'a view rule');
  differs(model=>{const setDoorsOpen=model.setDoorsOpen;model.setDoorsOpen=open=>{setDoorsOpen(open);if(open)for(const pivot of model.doorRoots)pivot.rotation.y+=.01;};},'the door swing');
});
