import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapDocument,openDocument,placeBuilding,removeBuilding,generateBuildingLayout,prefabErrors,requiredMapFeatures,assertMapCapabilities,PREFAB_CATALOGUE,COMBINED_PREFAB_CATALOGUE,PREFAB_FEATURE,ORIGINAL_BUILDING_FEATURE,WALL_RUN_FEATURE,GROSS_BUILDING_ASSETS} from '../packages/map-core/index.js';

const place=(asset,x,y)=>({tool:'building-prefab',start:{x,y,z:0},options:{asset,turns:0,clearance:2}});
function grossDocument(){const doc=createMapDocument();assert.equal(doc.apply(place('albany-cottage',40,40)).ok,true);const map=structuredClone(doc.map);map.buildingPrefabs.notes={references:['old Gross save']};map.buildingPrefabs.instances[0].notes={door:'original entry'};doc.replace(map);return doc;}

test('Gross saves remain Gross and copied original placement uses only the accepted combined identity',()=>{
  const doc=grossDocument(),saved=doc.export(),map=structuredClone(doc.map),before=structuredClone(map);
  assert.equal(openDocument(saved).map.buildingPrefabs.catalogue,PREFAB_CATALOGUE);
  assert.equal(placeBuilding(map,{asset:'archer-worker',x:80,y:80,turns:1,clearance:2}).map.buildingPrefabs.catalogue,PREFAB_CATALOGUE);
  const mixed=placeBuilding(map,{asset:'bramble-ranch',x:80,y:80,turns:1,clearance:2}).map;
  assert.equal(mixed.buildingPrefabs.catalogue,COMBINED_PREFAB_CATALOGUE);assert.deepEqual(map,before);
  assert.deepEqual(mixed.buildingPrefabs.notes,map.buildingPrefabs.notes);assert.deepEqual(mixed.buildingPrefabs.instances[0],map.buildingPrefabs.instances[0]);
  assert.deepEqual(openDocument(mixed).map.buildingPrefabs,mixed.buildingPrefabs);
  for(const invalid of [{...structuredClone(mixed),buildingPrefabs:{...mixed.buildingPrefabs,catalogue:PREFAB_CATALOGUE}},{...mixed,buildingPrefabs:{...mixed.buildingPrefabs,version:99}}]){
    assert.ok(prefabErrors(invalid).length);assert.throws(()=>openDocument(invalid));assert.throws(()=>assertMapCapabilities(invalid,[PREFAB_FEATURE,ORIGINAL_BUILDING_FEATURE]));
  }
  assert.equal(doc.export(),saved);
});

test('mixed catalogue edits preserve metadata and complete undo/redo without downgrading identities',()=>{
  const doc=grossDocument(),gross=doc.export();assert.equal(doc.apply(place('bramble-ranch',80,80)).ok,true);const mixed=doc.export();
  assert.equal(doc.undo(),true);assert.equal(doc.export(),gross);assert.equal(doc.redo(),true);assert.equal(doc.export(),mixed);
  const original=doc.map.buildingPrefabs.instances.find(p=>p.asset==='bramble-ranch');
  assert.equal(doc.apply({tool:'building-remove',options:{id:original.id}}).ok,true);
  assert.equal(doc.map.buildingPrefabs.catalogue,COMBINED_PREFAB_CATALOGUE);assert.deepEqual(requiredMapFeatures(doc.map),[PREFAB_FEATURE]);
  assert.equal(doc.apply({tool:'building-remove',options:{id:'building-1'}}).ok,true);
  assert.equal(doc.map.buildingPrefabs.catalogue,COMBINED_PREFAB_CATALOGUE);assert.deepEqual(doc.map.buildingPrefabs.notes,{references:['old Gross save']});assert.deepEqual(doc.map.buildingPrefabs.instances,[]);
  assert.deepEqual(requiredMapFeatures(doc.map),[]);assert.deepEqual(openDocument(doc.export()).map.buildingPrefabs,doc.map.buildingPrefabs);
});

test('original capability is required before host acceptance and only geometry adds requirements',()=>{
  const doc=grossDocument();assert.equal(doc.apply({tool:'wall-run',start:{x:180,y:180,z:0},end:{x:183,y:182,z:0},options:{exact:true}}).ok,true);
  assert.equal(doc.apply(place('bramble-ranch',80,80)).ok,true);const before=doc.export();
  assert.deepEqual(requiredMapFeatures(doc.map),[WALL_RUN_FEATURE,PREFAB_FEATURE,ORIGINAL_BUILDING_FEATURE]);
  for(const features of [[],[PREFAB_FEATURE],[WALL_RUN_FEATURE,PREFAB_FEATURE],[WALL_RUN_FEATURE,ORIGINAL_BUILDING_FEATURE]])assert.throws(()=>assertMapCapabilities(doc.map,features),/support/);
  assert.equal(assertMapCapabilities(doc.map,[WALL_RUN_FEATURE,PREFAB_FEATURE,ORIGINAL_BUILDING_FEATURE]),doc.map);assert.equal(doc.export(),before);
  const empty={...doc.map,buildingPrefabs:{version:1,catalogue:COMBINED_PREFAB_CATALOGUE,instances:[],notes:{reference:'keep'}}};
  assert.deepEqual(requiredMapFeatures(empty),[WALL_RUN_FEATURE]);assert.doesNotThrow(()=>assertMapCapabilities(empty,[WALL_RUN_FEATURE]));
});

test('explicit original layouts replay with copied transitions while implicit Gross seed profiles stay stable',()=>{
  const doc=grossDocument(),input=structuredClone(doc.map),before=structuredClone(input);
  const options={seed:'mixed audit',count:2,assets:['bramble-ranch'],area:{x:72,y:72,width:96,depth:96},clearance:2};
  const a=generateBuildingLayout(input,options),b=generateBuildingLayout(input,options);
  assert.deepEqual(a,b);assert.deepEqual(input,before);assert.equal(a.map.buildingPrefabs.catalogue,COMBINED_PREFAB_CATALOGUE);
  assert.deepEqual(a.map.buildingPrefabs.notes,input.buildingPrefabs.notes);assert.deepEqual(a.instances.map(p=>p.asset),['bramble-ranch','bramble-ranch']);assert.deepEqual(prefabErrors(a.map),[]);
  const grossOptions={seed:'old pool',count:1,area:{x:72,y:72,width:96,depth:96},clearance:2};
  const implicit=generateBuildingLayout(input,grossOptions),explicit=generateBuildingLayout(input,{...grossOptions,assets:GROSS_BUILDING_ASSETS.map(p=>p.id)});
  assert.deepEqual(implicit,explicit);assert.equal(implicit.map.buildingPrefabs.catalogue,PREFAB_CATALOGUE);
  const forged=structuredClone(a.map);forged.buildingPrefabs.catalogue=PREFAB_CATALOGUE;assert.throws(()=>removeBuilding(forged,'building-1'));assert.deepEqual(input,before);
});
