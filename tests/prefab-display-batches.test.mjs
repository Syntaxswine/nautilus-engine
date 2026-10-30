import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {batchOriginal,batchPrefab} from '../apps/editor/prefab-batches.js';
import {createPrefabProviders} from '../apps/editor/prefab-providers.js';
import {PrefabLayer} from '../apps/editor/prefab-scene.js';
import {createOriginalBuildingProvider} from '../packages/prefab-core/provider-original.js';
import {ORIGINAL_BUILDING_ASSETS,GROSS_BUILDING_ASSETS} from '../packages/prefab-core/registry.js';
import {createGrossHouse} from '../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/src/art/gross-housing.js';
const catalogue=JSON.parse(fs.readFileSync(new URL('../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/assets/art/gross-housing-v1/houses.json',import.meta.url)));

// Triangles as drawn: each corner's float32 position, normal and UV sets in the
// batch root's space, keyed by material. Exact equality of the sorted lists is the oracle.
const point=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3();
function triangles(mesh,start,end,matrix,key,out,uvs=['uv']){
  const geometry=mesh.geometry,attributes=geometry.attributes,index=geometry.index;if(matrix)normalMatrix.getNormalMatrix(matrix);
  for(let i=start;i<end;i+=3){const corners=[];
    for(let k=0;k<3;k++){const v=index?index.getX(i+k):i+k;point.fromBufferAttribute(attributes.position,v);normal.fromBufferAttribute(attributes.normal,v);if(matrix){point.applyMatrix4(matrix);normal.applyNormalMatrix(normalMatrix);}
      corners.push([point.x,point.y,point.z,normal.x,normal.y,normal.z].map(Math.fround).join(','),...uvs.map(name=>[attributes[name]?.getX(v)||0,attributes[name]?.getY(v)||0].map(Math.fround).join(',')));}
    out.push(key+' '+corners.join('|'));}
  return out;
}
// Gross pieces and both arms of a gross check share material objects: key by identity.
// Original buildings compare two models of one design: key by catalogue material and
// whether it is the provider's depth-biased floor copy.
const catalogueKey=mesh=>mesh.userData.materialId+(mesh.material.polygonOffset?'+floor-offset':'');
function drawn(batch,key=record=>record.material.uuid,uvs=['uv']){
  const out=[];
  for(const record of batch.records)if(record.mesh.visible)for(const group of record.mesh.geometry.groups)triangles(record.mesh,group.start,group.start+group.count,null,key(record),out,uvs);
  for(const {mesh}of batch.glass||[])if(mesh.visible)triangles(mesh,0,mesh.geometry.attributes.position.count,null,catalogueKey(mesh),out,uvs);
  return out.sort();
}
const GROSS_UVS=['uv','grossUV'];
const originalKey=record=>catalogueKey(record.ranges[0].piece.mesh);
const identity=new T.Matrix4();
const atlas=()=>createOriginalBuildingProvider(T,{loadTexture:async()=>new T.Texture()});

test('original display batches draw exactly the source-visible triangles in every editor view, one run per material',async()=>{
  const provider=atlas(),library=await provider.load({});let views=0,sourceTotal=0,runTotal=0;
  for(const asset of ORIGINAL_BUILDING_ASSETS){
    // The batch releases its source's opaque arrays, so an untouched model of the same
    // (deterministic, digest-pinned) design supplies the expected triangles.
    const reference=provider.create(library,asset.id),source=provider.create(library,asset.id),batch=batchOriginal(T,source);
    try{
      reference.root.updateMatrixWorld(true);
      const expectedFor=(view,walls)=>{reference.setView(view,{walls});const out=[];for(const top of reference.root.children)if(top.visible)top.traverse(mesh=>{if(mesh.isMesh)triangles(mesh,0,mesh.geometry.attributes.position.count,mesh.matrixWorld.equals(identity)?null:mesh.matrixWorld,catalogueKey(mesh),out);});return out.sort();};
      // A control: the batches must change what is drawn when the view changes.
      const all=drawn(batch,originalKey);source.setView({view:'cutaway',level:0},{walls:true});batch.sync();assert.ok(drawn(batch,originalKey).length<all.length,asset.id+' cutaway draws less');
      const floors=[...new Set(reference.root.children.map(node=>node.userData.level??0))];
      for(const walls of [true,false])for(const view of [{view:'exterior'},...floors.map(level=>({view:'cutaway',level}))]){
        source.setView(view,{walls});batch.sync({walls});views++;
        assert.deepEqual(drawn(batch,originalKey),expectedFor(view,walls),asset.id+' '+JSON.stringify(view)+' walls '+walls);
        for(const record of batch.records)assert.ok(record.mesh.geometry.groups.length<=1,asset.id+' one run per material');
      }
      // Glass stays separate (it sorts back to front); door leaves join the batches.
      const sourceMeshes=[];source.root.traverse(node=>{if(node.isMesh)sourceMeshes.push(node);});
      assert.equal(batch.glass.length,sourceMeshes.filter(mesh=>mesh.material.transparent).length);
      assert.ok(batch.records.every(record=>!record.material.transparent));
      assert.ok(sourceMeshes.filter(mesh=>!mesh.material.transparent).every(mesh=>!mesh.geometry.attributes.position),asset.id+' releases the merged source arrays');
      source.setView({view:'exterior'},{walls:true});batch.sync();assert.ok(batch.runs()<sourceMeshes.length,asset.id+' fewer submissions');
      sourceTotal+=sourceMeshes.length;runTotal+=batch.runs();
    }finally{batch.dispose();source.dispose();reference.dispose();}
  }
  // Measured at f6caeef + batching: 1,981 meshes become 473 exterior submissions.
  assert.ok(views>=250);assert.ok(runTotal*4<=sourceTotal,'catalogue submissions '+runTotal+' of '+sourceTotal);
});

test('gross display batches draw exactly the native-visible triangles for floors, furniture and walls',()=>{
  for(const asset of GROSS_BUILDING_ASSETS){
    const source=createGrossHouse(T,{catalogue,textures:{}},asset.id),batch=batchPrefab(T,source);
    try{
      let native=0,meshes=0;source.root.traverse(node=>{if(node.isMesh){meshes++;native+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;}});
      assert.equal(batch.records.reduce((n,record)=>n+record.mesh.geometry.attributes.position.count/3,0),native,asset.id+' triangle count');
      const raw=new T.Box3().setFromObject(source.root),packed=new T.Box3().setFromObject(batch.root);
      assert.ok(raw.min.distanceTo(packed.min)<1e-5&&raw.max.distanceTo(packed.max)<1e-5,asset.id+' bounds');
      for(const record of batch.records){assert.ok(record.mesh.geometry.attributes.grossUV);assert.ok(record.mesh.geometry.attributes.normal);assert.ok(record.material.isMeshStandardMaterial);}
      for(const walls of [true,false])for(const view of [{view:'exterior',showFurniture:false},{view:'exterior',showFurniture:true},...asset.levels.flatMap(level=>[{view:'cutaway',level:level.index,showFurniture:true},{view:'cutaway',level:level.index,showFurniture:false}])]){
        source.setView(view);batch.sync({walls});
        const expected=[];for(const piece of batch.pieces)if(piece.scope.every(node=>node.visible)&&(walls||!piece.wall))triangles(piece.mesh,piece.start,piece.end,piece.mesh.matrixWorld,piece.material.uuid,expected,GROSS_UVS);
        assert.deepEqual(drawn(batch,undefined,GROSS_UVS),expected.sort(),asset.id+' '+JSON.stringify(view)+' walls '+walls);
        for(const record of batch.records)assert.ok(record.mesh.geometry.groups.length<=2,asset.id+' at most two runs');
      }
      source.setView({view:'cutaway',level:0,showFurniture:true});batch.sync();
      assert.ok(batch.pieces.filter(piece=>piece.scope[0].name==='Removable roofs').length>0);
      assert.ok(drawn(batch).length<native,asset.id+' cutaway hides geometry');
      source.setView();batch.sync();assert.ok(batch.runs()<meshes/4,asset.id+' submission reduction');
    }finally{batch.dispose();source.dispose();}
  }
});

test('placed copies share batch geometry and follow their template through views and disposal',async()=>{
  const providers=createPrefabProviders(T,{original:atlas()});
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},error=>{throw error;},{providers});
  const instances=[0,1,2].map(i=>({id:'copy-'+i,asset:'dockside-warehouse',x:20+i*40,y:20,turns:i%4,clearance:2}));
  try{
    await layer.update({map:{buildingPrefabs:{instances}}},{level:0,showAllLevels:true,roofs:true,walls:true});
    assert.equal(layer.templates.size,1);assert.equal(layer.models.size,3);
    const template=layer.templates.get('dockside-warehouse'),groups=()=>template.nodes.filter(n=>n.isMesh).map(n=>JSON.stringify(n.geometry.groups));
    const exterior=groups();layer.options={...layer.options,showAllLevels:false};layer.setView();
    assert.notDeepEqual(groups(),exterior);
    for(const model of layer.models.values()){
      assert.deepEqual(model.nodes.map(n=>n.visible),template.nodes.map(n=>n.visible));
      model.nodes.forEach((node,i)=>{if(node.isMesh)assert.equal(node.geometry,template.nodes[i].geometry);});
    }
  }finally{layer.dispose();}
  assert.equal(layer.templates.size,0);assert.equal(layer.models.size,0);
});

test('releasing a batch disposes every merged geometry exactly once, for both collections',async()=>{
  const provider=atlas(),library=await provider.load({});
  const watch=batch=>{const counts=new Map(batch.records.map(record=>[record.mesh.geometry,0]));for(const geometry of counts.keys())geometry.addEventListener('dispose',()=>counts.set(geometry,counts.get(geometry)+1));return counts;};
  for(const make of [()=>{const source=provider.create(library,'marlow-courtyard-flats');return {source,batch:batchOriginal(T,source)};},()=>{const source=createGrossHouse(T,{catalogue,textures:{}},'monroe-row');return {source,batch:batchPrefab(T,source)};}]){
    const {source,batch}=make(),counts=watch(batch);
    assert.ok(counts.size>3);batch.dispose();source.dispose();
    assert.deepEqual([...counts.values()],[...counts.values()].map(()=>1),'each merged geometry disposed once');
  }
});

test('a building that cannot be batched releases its source model and reports why',()=>{
  // Glass inside a door pivot cannot join a batch (it must sort on its own).
  let disposed=0;const door=new T.Group(),glass=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({transparent:true}));
  glass.geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));door.add(glass);
  const original={load:async()=>({dispose(){}}),create(){const root=new T.Group();root.add(door);return {root,setView(){},dispose(){disposed++;}};}};
  const provider=createPrefabProviders(T,{original}).get('original');
  assert.throws(()=>provider.create({},'any'),/Transparent door parts are not batched/);
  assert.equal(disposed,1);
});
