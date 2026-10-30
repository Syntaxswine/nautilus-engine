import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {assetDrawCounts,ASSET_DRAW_COUNTS,submissions,editorScene,checkDaylightRule,checkDrivePath,driven,prepare,release,VIEWS} from '../tools/asset-draw-counts.mjs';
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
  // An AFT scene whose setOptions, open or update no longer drive the layers as the stand-in does.
  const aft=fs.readFileSync(new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-scene.js',import.meta.url),'utf8');
  checkDrivePath(aft);
  assert.throws(()=>checkDrivePath(aft.replace('setOptions(options){Object.assign(this.options,options);this.rebuild();}','setOptions(options){Object.assign(this.options,options);}')),/setOptions no longer/);
  assert.throws(()=>checkDrivePath(aft.replace('this.world=buildWorld(document.map);this.diagnostics.push(...this.world.diagnostics.map(d=>d.message+\': \'+d.kind));this.rebuild();','this.world=buildWorld(document.map);')),/open\(document\)\{ no longer/);
});

test('the count drives the editor as the editor drives itself: it opens, a view is set, an edit keeps the view',async()=>{
  // Eight neighbouring copies (one batched cluster) and one more far off (drawn per copy).
  const map={buildingPrefabs:{version:1,instances:[...Array.from({length:8},(_,i)=>({id:'copy-'+i,asset:'dockside-warehouse',x:20+i*20,y:20,turns:0,clearance:1})),{id:'apart',asset:'dockside-warehouse',x:20,y:180,turns:0,clearance:1}]}},document={map};
  await driven(async s=>{
    prepare(s);
    const prefabs=()=>submissions([...[...s.prefabs.models.values()].map(model=>model.root),...s.prefabs.instanced.map(({mesh})=>mesh)]);
    try{
      await s.open(document);await s.prefabs.pending;const exterior=prefabs();
      assert.ok(s.prefabs.instanced.length>0&&s.prefabs.instanced.every(({mesh})=>mesh.instanceCount===8),'the eight neighbours are one batched cluster, the ninth draws itself');
      s.setOptions(VIEWS.cutaway);await s.prefabs.pending;const cut=prefabs();
      assert.ok(cut.mainTriangles<exterior.mainTriangles,'setOptions cuts the buildings: '+JSON.stringify([exterior,cut]));
      await s.update(document);await s.prefabs.pending;
      assert.deepEqual(prefabs(),cut,'an edit (update) keeps the cutaway');
      s.setOptions(VIEWS.exterior);await s.prefabs.pending;assert.deepEqual(prefabs(),exterior,'and setOptions restores the exterior');
    }finally{release(s);}
  });
});

test('the editor asset layers issue exactly the pinned draws for every benchmark workload and view',async()=>{
  const pinned=JSON.parse(fs.readFileSync(ASSET_DRAW_COUNTS,'utf8')),counts=await assetDrawCounts();
  assert.deepEqual(counts.views,pinned.views);
  for(const id of Object.keys({...pinned.workloads,...counts.workloads}))
    assert.deepEqual(counts.workloads[id],pinned.workloads[id],id+' changed: re-pin with node tools/asset-draw-counts.mjs --write only as part of a reviewed change');
});
