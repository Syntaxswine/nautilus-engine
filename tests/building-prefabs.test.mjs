import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMapDocument,createBlockDocument,openDocument,validateMap,extractBlock,generateConnectedMap,assertMapCapabilities,blankMap,loadBlueprint,parseMap,requiredMapFeatures} from '../packages/map-core/index.js';
import {BUILDING_ASSETS,GROSS_BUILDING_ASSETS,buildingTransform,buildingLot,placeBuilding,generateBuildingLayout,PREFAB_FEATURE,prefabErrors,COMBINED_PREFAB_CATALOGUE} from '../packages/prefab-core/index.js';
import {placeBlock} from '../packages/map-core/prefab-blocks.js';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {createGrossHouse} from '../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/src/art/gross-housing.js';
import {batchPrefab} from '../apps/editor/prefab-batches.js';
import {PrefabLayer} from '../apps/editor/prefab-scene.js';

const catalogue=JSON.parse(fs.readFileSync(new URL('../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/assets/art/gross-housing-v1/houses.json',import.meta.url)));
const command=(asset='albany-cottage',x=40,y=40,turns=0)=>({tool:'building-prefab',start:{x,y,z:0},options:{asset,turns,clearance:2}});

test('every source house fits its recorded lot in all four orientations without scaling',()=>{
  assert.equal(BUILDING_ASSETS.length,61);assert.equal(GROSS_BUILDING_ASSETS.length,13);let levels=0;
  for(const asset of GROSS_BUILDING_ASSETS){const model=createGrossHouse(T,{catalogue,textures:{}},asset.id);levels+=model.levels.length;
    try {for(let turns=0;turns<4;turns++){
      const transform=buildingTransform({asset:asset.id,x:30,y:40,turns}),lot=buildingLot({asset:asset.id,x:30,y:40,turns});
      model.root.rotation.y=transform.angle;model.root.position.set(transform.x,0,transform.y);const bounds=new T.Box3().setFromObject(model.root);
      assert.ok(bounds.min.x>=lot.x-.50001&&bounds.min.z>=lot.y-.50001,asset.id+' minimum');
      assert.ok(bounds.max.x<=lot.x+lot.width-.49999&&bounds.max.z<=lot.y+lot.depth-.49999,asset.id+' maximum');
      model.root.traverse(node=>assert.deepEqual(node.scale.toArray(),[1,1,1]));
    }}finally{model.dispose();model.dispose();}
  }assert.equal(levels,29);
});
test('building placement, rotation, removal and JSON roundtrip use the same atomic document history',()=>{
  const doc=createMapDocument(),before=doc.export();assert.equal(doc.apply(command()).ok,true);const placed=doc.export();
  assert.deepEqual(validateMap(doc.map),[]);assert.deepEqual(openDocument(placed).map.buildingPrefabs,doc.map.buildingPrefabs);
  assert.equal(doc.undo(),true);assert.equal(doc.export(),before);assert.equal(doc.redo(),true);assert.equal(doc.export(),placed);
  const selection=doc.inspect(42,42,0);assert.equal(selection.type,'building');assert.equal(doc.rotate(selection).ok,true);
  assert.equal(doc.map.buildingPrefabs.instances[0].turns,1);const rotated=doc.export();
  assert.equal(doc.apply({tool:'building-remove',options:{id:selection.data.id}}).ok,true);assert.equal(doc.map.buildingPrefabs,undefined);
  doc.undo();assert.equal(doc.export(),rotated);
});
test('rejected overlaps, unsafe edits, unsupported blocks and asset revisions leave history and maps intact',()=>{
  const doc=createMapDocument();assert.equal(doc.apply(command()).ok,true);const before=doc.export(),depth=doc.editor.undo.length;
  for(const c of [command('grossdale-spire',42,42),command('missing',80,80),command('albany-cottage',0,0),{tool:'water',start:{x:42,y:42,z:0}},{tool:'guard',start:{x:42,y:42,z:0}},{tool:'floor',start:{x:42,y:42,z:1}}]){
    assert.equal(doc.apply(c).ok,false,JSON.stringify(c));assert.equal(doc.export(),before);assert.equal(doc.editor.undo.length,depth);
  }
  const bad=structuredClone(doc.map);bad.buildingPrefabs.catalogue='moving-branch';assert.throws(()=>openDocument(bad),/catalogue/);
  assert.throws(()=>doc.capture(1,1),/prefab/);assert.throws(()=>extractBlock(doc.map,1,1),/prefab/);
  const block=JSON.parse(createBlockDocument().export());assert.throws(()=>placeBlock(doc.map,block,1,1),/prefab/);
  block.buildingPrefabs=structuredClone(doc.map.buildingPrefabs);assert.throws(()=>openDocument(block),/full maps/);assert.throws(()=>generateConnectedMap([block],7),/legacy blocks/);
  assert.equal(createBlockDocument().apply(command()).ok,false);assert.equal(doc.export(),before);
});
test('clearance checks reserve real object footprints, foliage, upper floors, boundaries and markers',()=>{
  const clean=createMapDocument().map;
  for(const obstruction of [
    m=>m.props.push({kind:'crate-wood',x:40,y:40,z:0}),
    m=>{m.foliage={'39,39,0':[25,false,'woodland-v1']};},
    m=>{m.upper[0]['39,39']='floor';},
    m=>{m.edges['e:39:39']='wall';},
    m=>m.starts[0]={...m.starts[0],x:39,y:39,z:0},
    m=>{m.terrain[39][39]='water';}
  ]){const map=structuredClone(clean);obstruction(map);assert.throws(()=>placeBuilding(map,{asset:'albany-cottage',x:40,y:40,turns:0,clearance:2}),/clear|ground/);}
  const invalid=structuredClone(clean);invalid.buildingPrefabs=null;assert.ok(prefabErrors(invalid).length);
});
test('seeded building generation is repeatable, avoids existing work, is atomic and reports insufficient space',()=>{
  const doc=createMapDocument(),options={seed:'Catalogue district',count:6,area:{x:24,y:24,width:120,depth:96},clearance:2};
  const before=doc.export(),a=generateBuildingLayout(doc.map,options),b=generateBuildingLayout(doc.map,options);
  assert.deepEqual(a,b);assert.equal(doc.export(),before);assert.equal(a.instances.length,6);assert.deepEqual(validateMap(a.map),[]);
  assert.notDeepEqual(a.instances,generateBuildingLayout(doc.map,{...options,seed:'Another street'}).instances);
  assert.equal(doc.apply({tool:'building-generate',options}).ok,true);assert.equal(doc.editor.undo.length,1);doc.undo();assert.equal(doc.export(),before);
  assert.throws(()=>generateBuildingLayout(doc.map,{...options,area:{x:24,y:24,width:12,depth:12}}),/Only 0 of 6/);assert.equal(doc.export(),before);
  const obstructed=structuredClone(doc.map);obstructed.terrain=obstructed.terrain.map(row=>row.map(()=> 'water'));
  assert.throws(()=>generateBuildingLayout(obstructed,options),/Only 0 of 6/);
});
test('game handoff requires the explicit building capability and keeps legacy maps compatible',()=>{
  const map=placeBuilding(createMapDocument().map,{asset:'grossdale-hip',x:40,y:40,turns:2,clearance:2}).map;
  assert.throws(()=>assertMapCapabilities(map),/does not support building prefabs/);
  assert.equal(assertMapCapabilities(map,[PREFAB_FEATURE]),map);
  const legacy=createMapDocument().map;assert.equal(assertMapCapabilities(legacy),legacy);
});

test('render batches preserve native geometry and floor visibility while reducing submissions',()=>{
  for(const {id}of GROSS_BUILDING_ASSETS){
    const source=createGrossHouse(T,{catalogue,textures:{}},id),batch=batchPrefab(T,source);
    try {
      const raw=new T.Box3().setFromObject(source.root),packed=new T.Box3().setFromObject(batch.root);
      assert.ok(raw.min.distanceTo(packed.min)<1e-5&&raw.max.distanceTo(packed.max)<1e-5,id+' bounds');
      let rawTriangles=0,meshes=0;source.root.traverse(node=>{if(node.isMesh){meshes++;rawTriangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;}});
      const packedTriangles=batch.records.reduce((n,r)=>n+r.mesh.geometry.attributes.position.count/3,0);
      assert.equal(packedTriangles,rawTriangles);assert.ok(batch.records.length<meshes/4,id+' submission reduction');
      for(const record of batch.records){assert.ok(record.mesh.geometry.attributes.grossUV);assert.ok(record.mesh.geometry.attributes.normal);assert.ok(record.mesh.material.isMeshStandardMaterial);}
      source.setView({view:'cutaway',level:0,showFurniture:true});batch.sync();
      assert.ok(batch.records.some(r=>!r.mesh.visible));assert.ok(batch.records.some(r=>r.mesh.visible));
      assert.ok(batch.records.filter(r=>r.scope[0].name==='Removable roofs').every(r=>!r.mesh.visible));
      batch.sync({walls:false});assert.ok(batch.records.filter(r=>r.wall).every(r=>!r.mesh.visible));
    } finally {batch.dispose();source.dispose();}
  }
});

test('floor cutaways accept a fractional preview camera height and keep shared copies in sync',()=>{
  const source=createGrossHouse(T,{catalogue,textures:{}},'monroe-row'),batch=batchPrefab(T,source),nodes=[];batch.root.traverse(n=>nodes.push(n));
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},error=>{throw error;}),root=batch.root.clone(true),copies=[];root.traverse(n=>copies.push(n));
  const model={root:batch.root,setView(view,options){source.setView(view);batch.sync(options);},dispose(){batch.dispose();source.dispose();}};
  layer.templates.set('monroe-row',{model,nodes});layer.models.set('one',{root,nodes:copies,asset:'monroe-row'});layer.options={level:1.75,showAllLevels:true,roofs:true,walls:true};
  try {layer.setView({view:'cutaway',level:-1,showFurniture:true});
    assert.deepEqual(copies.map(n=>n.visible),nodes.map(n=>n.visible));assert.ok(copies.some(n=>!n.visible));
    layer.setView({view:'exterior',showFurniture:false});assert.deepEqual(copies.map(n=>n.visible),nodes.map(n=>n.visible));
  }finally{layer.dispose();}
});
test('imported maps keep the 32-building limit through every entry point and catalogue',()=>{
  // Only imports rely on the envelope check; placement and generation stop at 32 themselves. Each
  // 32-building layout is valid, so the 33rd building is the only reason the second map fails.
  const gross=placeBuilding(blankMap('Catalogue'),{asset:'albany-cottage',x:30,y:30,turns:0,clearance:1}).map.buildingPrefabs.catalogue,limit=/more than 32 buildings/;
  for(const catalogue of [gross,COMBINED_PREFAB_CATALOGUE]){
    const city=count=>{const map=blankMap('City of '+count);map.buildingPrefabs={version:1,catalogue,instances:[]};
      for(let i=0;i<count;i++)map.buildingPrefabs.instances.push({id:'b'+i,asset:'albany-cottage',x:20+i%6*34,y:20+Math.floor(i/6)*34,turns:0,clearance:1});
      return map;};
    const full=openDocument(city(32));assert.deepEqual(full.validate(),[]);assert.equal(full.map.buildingPrefabs.instances.length,32);
    assert.equal(loadBlueprint(city(32)).buildingPrefabs.instances.length,32);assert.equal(parseMap(JSON.stringify(city(32))).buildingPrefabs.instances.length,32);
    assert.deepEqual(validateMap(city(32)),[]);assert.deepEqual(prefabErrors(city(32)),[]);assert.deepEqual(requiredMapFeatures(city(32)),[PREFAB_FEATURE]);
    for(const [entry,load] of [['openDocument',openDocument],['loadBlueprint',loadBlueprint],['parseMap',map=>parseMap(JSON.stringify(map))],['requiredMapFeatures',requiredMapFeatures]])
      assert.throws(()=>load(city(33)),limit,entry+' under '+catalogue);
    for(const [entry,errors] of [['validateMap',validateMap],['prefabErrors',prefabErrors]])assert.match(errors(city(33)).join(' '),limit,entry+' under '+catalogue);
  }
});
