import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {assetDrawCounts,ASSET_DRAW_COUNTS,submissions,editorScene,checkDaylightRule} from '../tools/asset-draw-counts.mjs';
import {InspectionScene as WallScene} from '../apps/editor/wall-scene.js';

test('the count model refuses what it does not model',()=>{
  // A transparent double-sided material draws twice; none is left in the asset layers.
  const glass=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({transparent:true,side:T.DoubleSide}));
  try{assert.throws(()=>submissions([glass]),/draws twice/);glass.material.forceSinglePass=true;assert.equal(submissions([glass]).main,1);}finally{glass.geometry.dispose();glass.material.dispose();}
  // A scene chain no longer based on the AFT scene: the headless stand-in would not stand in.
  const base=Object.getPrototypeOf(WallScene);Object.setPrototypeOf(WallScene,class Other {});
  try{assert.throws(()=>editorScene(),/no longer extends the AFT scene/);}finally{Object.setPrototypeOf(WallScene,base);}
  // A daylight rig that no longer sets castShadow by the lit-material rule.
  const rig=fs.readFileSync(new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/daylight-rig.js',import.meta.url),'utf8');
  checkDaylightRule(rig);assert.throws(()=>checkDaylightRule(rig.replace('object.castShadow=!object.userData.noShadow;','object.castShadow=true;')),/no longer states its shadow rule/);
});

test('the editor asset layers issue exactly the pinned draws for every benchmark workload and view',async()=>{
  const pinned=JSON.parse(fs.readFileSync(ASSET_DRAW_COUNTS,'utf8')),counts=await assetDrawCounts();
  assert.deepEqual(counts.views,pinned.views);
  for(const id of Object.keys({...pinned.workloads,...counts.workloads}))
    assert.deepEqual(counts.workloads[id],pinned.workloads[id],id+' changed: re-pin with node tools/asset-draw-counts.mjs --write only as part of a reviewed change');
});
