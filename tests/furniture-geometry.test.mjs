import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from '../packages/render-effects/three.js';
import {listFurnitureAssets} from '@nautilus-engine/map-core/furniture';
import {loadFurnitureAssets} from '@nautilus-engine/map-core/furniture/three';

// Execute byte-preserved source with only its original static Three imports
// resolved to the engine's existing host. No source code or donor file changes.
const sourceRoot=new URL('../vendor/farmyard-furniture/fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b/',import.meta.url).href;
const hostThree=new URL('../packages/render-effects/three.js',import.meta.url).href;
const hook=registerHooks({resolve(specifier,context,next){if(context.parentURL?.startsWith(sourceRoot)&&specifier.endsWith('/vendor/three.module.js'))return {url:hostThree,shortCircuit:true};return next(specifier,context);}});
let native;
try{native=await import(sourceRoot+'sites/tactical-animal/dist/art/library/furniture.js');}finally{hook.deregister();}
const inputs=()=>({atlas:new T.Texture(),cargo:new T.Texture(),bookSkins:new T.Texture()});
const disposeInputs=textures=>Object.values(textures).forEach(texture=>texture.dispose());
const close=(actual,expected,epsilon=1e-6)=>assert.ok(Math.abs(actual-expected)<epsilon,`${actual} != ${expected}`);
function triangles(root){let count=0;root.traverse(mesh=>{if(mesh.isMesh)count+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);});return count;}
function solids(model){return model.solidParts().map(part=>{const mesh=new T.Mesh(part.geometry);mesh.matrixAutoUpdate=false;mesh.matrix.copy(part.matrixWorld);mesh.updateMatrixWorld(true);return mesh;});}
function ray(meshes,origin,direction,distance=6){return new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,distance).intersectObjects(meshes).length;}

test('all 384 variants/rotations preserve actual raw-source geometry, UVs, parts, matrices and bounds',async()=>{
  const textures=inputs(),library=await loadFurnitureAssets(T,{textures}),original=native.createLibraryFurniture(textures),checked=new Set();
  try{for(const asset of listFurnitureAssets())for(const rotation of [0,90,180,270]){
    const model=library.create(asset.id,{rotation}),source=original.build(asset.form,asset.finish,asset.contents,{rotation});
    try{
      assert.ok(model.root instanceof T.Group);assert.deepEqual(model.getBounds().min.toArray(),source.bounds.min.toArray());assert.deepEqual(model.bounds.max.toArray(),source.bounds.max.toArray());
      assert.equal(model.root.children.length,source.root.children.length);assert.ok(model.root.children.every(mesh=>mesh instanceof T.InstancedMesh));
      for(let i=0;i<source.root.children.length;i++){
        const actual=model.root.children[i],expected=source.root.children[i];assert.equal(actual.count,expected.count);assert.equal(actual.material.name,expected.material.name);assert.deepEqual(actual.instanceMatrix.array,expected.instanceMatrix.array);
        const key=actual.geometry.uuid+expected.geometry.uuid;
        if(!checked.has(key)){checked.add(key);assert.deepEqual(actual.geometry.index?.array,expected.geometry.index?.array);for(const field of ['position','normal','uv'])assert.deepEqual(actual.geometry.attributes[field].array,expected.geometry.attributes[field].array);}
        if(expected.material.map){assert.deepEqual(actual.material.map.offset.toArray(),expected.material.map.offset.toArray());assert.deepEqual(actual.material.map.repeat.toArray(),expected.material.map.repeat.toArray());}
      }
      const actual=model.solidParts(),expected=source.solidParts();assert.equal(actual.length,expected.length);
      for(let i=0;i<expected.length;i++){assert.equal(actual[i].role,expected[i].role);assert.deepEqual(actual[i].matrixWorld.toArray(),expected[i].matrixWorld.toArray());}
    }finally{model.dispose();source.dispose();}
  }}finally{library.dispose();original.dispose();disposeInputs(textures);}
});

test('actual visual bounds and geometry counts remain separate from the conservative declared body',async()=>{
  const textures=inputs(),library=await loadFurnitureAssets(T,{textures});
  const expected={'bookcase-tall':[252,9],'bookcase-wide':[312,9],'bookcase-low':[216,8],'bookcase-double':[528,9],'bookcase-double-thick':[600,9],'bookcase-double-ornate':[1560,9],'library-table':[2568,12],'library-table-large':[4572,12]};
  try{for(const [form,[count,batches]]of Object.entries(expected)){
    const model=library.create(`furniture:library.${form}.oak.books`),size=model.getBounds().getSize(new T.Vector3());
    assert.equal(triangles(model.root),count);assert.equal(model.root.children.length,batches);
    if(form.startsWith('library-table')){close(size.y,1.16);assert.equal(model.spec.size[1],1.18);}
    else if(form==='bookcase-double'){close(size.z,.895);assert.equal(model.spec.size[2],.88);}
    else if(form==='bookcase-double-thick'||form==='bookcase-double-ornate'){close(size.x,.995);close(size.z,1.98);assert.equal(model.spec.size[0],.98);assert.equal(model.spec.sourceFrontAxis,'+X');}
    else{close(size.z,.4675);assert.equal(model.spec.size[2],.46);}
    const first=model.getBounds();first.min.set(999,999,999);assert.ok(model.getBounds().min.x<0);model.dispose();
  }}finally{library.dispose();disposeInputs(textures);}
});

test('solid parts and visual bounds follow current root and ancestor transforms with detached returned matrices',async()=>{
  const textures=inputs(),library=await loadFurnitureAssets(T,{textures}),model=library.create('furniture:library.library-table.oak.books'),parent=new T.Group();
  try{
    parent.add(model.root);const before=model.solidParts(),bounds=model.getBounds();parent.position.set(10,2,20);parent.rotation.y=Math.PI/2;model.root.position.set(3,1,4);model.root.rotation.y=Math.PI;
    const after=model.solidParts(),transformed=model.getBounds();assert.notDeepEqual(transformed.min.toArray(),bounds.min.toArray());
    const world=parent.matrixWorld.clone().multiply(model.root.matrix);
    for(let i=0;i<before.length;i++){
      const expected=world.clone().multiply(before[i].matrixWorld);assert.ok(expected.elements.every((value,index)=>Math.abs(value-after[i].matrixWorld.elements[index])<1e-10));
      assert.equal(after[i].geometry,before[i].geometry);
    }
    const original=after[0].matrixWorld.toArray();after[0].matrixWorld.identity();assert.deepEqual(model.solidParts()[0].matrixWorld.toArray(),original);
  }finally{library.dispose();disposeInputs(textures);}
});

test('table rays preserve under-top gaps while both full-tile cabinet faces retain physical book rows',async()=>{
  const textures=inputs(),library=await loadFurnitureAssets(T,{textures});
  try{
    for(const contents of ['empty','books']){
      const model=library.create('furniture:library.library-table.ivory.'+contents);model.root.position.set(10,0,20);const meshes=solids(model);
      assert.equal(ray(meshes,[10,.5,23],[0,0,-1]),0);assert.ok(ray(meshes,[10.1,.80,23],[0,0,-1])>0);model.dispose();
    }
    for(const form of ['bookcase-double-thick','bookcase-double-ornate'])for(const rotation of [0,90,180,270]){
      const model=library.create(`furniture:library.${form}.walnut.books`,{rotation});
      const rows=model.solidParts().filter(part=>part.role==='book-row');assert.equal(rows.length,16);
      const toWorld=(point,direction)=>{model.root.updateWorldMatrix(true,true);return direction?new T.Vector3(...point).transformDirection(model.root.matrixWorld).toArray():new T.Vector3(...point).applyMatrix4(model.root.matrixWorld).toArray();};
      const meshes=solids(model);for(const side of [-1,1])assert.ok(ray(meshes,toWorld([side*2,1.12,.45]),toWorld([-side,0,0],true),4)>0);
      assert.ok(model.solidParts().every(part=>!['blank-label','label-holder','frieze-relief','spine-label','spine-band','page-line','shelf-lip','front-edge'].includes(part.role)));model.dispose();
    }
  }finally{library.dispose();disposeInputs(textures);}
});
