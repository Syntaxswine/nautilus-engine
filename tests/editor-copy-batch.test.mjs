import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {createPrefabProviders} from '../apps/editor/prefab-providers.js';
import {PrefabLayer} from '../apps/editor/prefab-scene.js';
import {CopyBatch} from '../apps/editor/copy-batch.js';
import {createOriginalBuildingProvider} from '../packages/prefab-core/provider-original.js';
import {GROSS_BUILDING_ASSETS} from '../packages/prefab-core/registry.js';

// Three copies of one design, 40 m apart along x; each is about 25 m across.
async function row(turns=i=>i%4) {
  const providers=createPrefabProviders(T,{original:createOriginalBuildingProvider(T,{loadTexture:async()=>new T.Texture()})});
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},error=>{throw error;},{providers});
  const instances=[0,1,2].map(i=>({id:'copy-'+i,asset:'dockside-warehouse',x:20+i*40,y:20,turns:turns(i),clearance:2}));
  await layer.update({map:{buildingPrefabs:{instances}}},{level:0,showAllLevels:true,roofs:true,walls:true});
  return layer;
}
// What one draw of a group submits: sub-draw k is copy k, and a copy in view draws the
// group's own range; a culled copy draws no vertices, and no empty sub-draw trails.
function draws(batch,group) {
  const copies=[];
  for(let k=0;k<batch._multiDrawCount;k++){
    assert.equal(batch._multiDrawStarts[k],group.start);
    if(batch._multiDrawCounts[k]){assert.equal(batch._multiDrawCounts[k],group.count,'copy '+k+' draws the group\'s own range');copies.push(k);}
  }
  assert.ok(!batch._multiDrawCount||batch._multiDrawCounts[batch._multiDrawCount-1]>0,'no trailing empty sub-draw');
  return copies;
}
const view=(batch,camera,group)=>{batch.onBeforeRender(null,new T.Scene(),camera,batch.geometry,batch.material[group.materialIndex],group);return draws(batch,group);};
const shadow=(batch,camera,group)=>{batch.onBeforeShadow(null,batch,null,camera,batch.geometry,null,group);return draws(batch,group);};
function looking(camera,from,at){camera.position.copy(from);camera.lookAt(at);camera.updateMatrixWorld();camera.updateProjectionMatrix();return camera;}

test('every camera culls a CopyBatch copy by copy: the view, each face of a lamp, the sun',async()=>{
  const layer=await row();
  try{
    const {mesh:batch}=layer.instanced.find(({mesh})=>mesh.visible),group=batch.geometry.groups[0],[c0,,c2]=batch.spheres.map(s=>s.center);
    assert.ok(group&&batch.geometry.groups.length===1,'one run in the exterior');
    // A close view of copy 0 draws copy 0 alone, as one sub-draw; a close view of copy 2
    // keeps copies 0 and 1 as empty sub-draws; a wide view draws all three in placement
    // order; a view of nothing draws nothing.
    const close=at=>looking(new T.PerspectiveCamera(30,1,.1,500),new T.Vector3(at.x,60,at.z+.01),at);
    assert.deepEqual(view(batch,close(c0),group),[0]);assert.equal(batch._multiDrawCount,1);
    assert.deepEqual(view(batch,close(c2),group),[2]);assert.equal(batch._multiDrawCount,3);
    assert.deepEqual(view(batch,looking(new T.PerspectiveCamera(60,1,.1,2000),new T.Vector3(200,80,20),new T.Vector3(60,0,25)),group),[0,1,2]);
    assert.deepEqual(view(batch,looking(new T.PerspectiveCamera(30,1,.1,500),new T.Vector3(c0.x,60,c0.z),new T.Vector3(c0.x+500,60,c0.z)),group),[]);assert.equal(batch._multiDrawCount,0);
    // A lamp 25 m beyond copy 2 (30 m range, as the editor's lamps): its faces draw copy 2
    // and nothing else, although every face that sees copy 2 also sees the set's own sphere,
    // so a set culled as a whole would draw all three copies there.
    const lamp=new T.PointLight(0xffffff,1,30,0);lamp.castShadow=true;lamp.shadow.camera.near=.08;lamp.shadow.camera.far=30;lamp.shadow.camera.updateProjectionMatrix();
    lamp.position.set(c2.x+25,2,c2.z);lamp.updateMatrixWorld();
    const faces=[];
    for(let face=0;face<6;face++){
      lamp.shadow.updateMatrices(lamp,face);const copies=shadow(batch,lamp.shadow.camera,group);faces.push(copies);
      if(copies.length)assert.ok(lamp.shadow.getFrustum().intersectsSphere(batch.boundingSphere.clone().applyMatrix4(batch.matrixWorld)),'the whole set is in that face too');
    }
    assert.deepEqual([...new Set(faces.flat())],[2],'the lamp\'s faces draw only the copy within its range');
    assert.ok(faces.some(copies=>!copies.length),'and a face that sees no copy draws none');
    // The sun's shadow camera over the district draws every copy.
    const sun=new T.DirectionalLight();sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-150,right:150,top:150,bottom:-150,near:.5,far:400});sun.shadow.camera.updateProjectionMatrix();
    sun.position.set(60,150,100);sun.target.position.set(60,0,25);sun.updateMatrixWorld();sun.target.updateMatrixWorld();sun.shadow.updateMatrices(sun);
    assert.deepEqual(shadow(batch,sun.shadow.camera,group),[0,1,2]);
    // The copy table is the identity, written once: no camera rewrites it (on Direct3D a
    // rewrite between draws that read it stalled the frame).
    assert.deepEqual([...batch._indirectTexture.image.data.slice(0,3)],[0,1,2]);assert.equal(batch._indirectTexture.version,1,'the copy table was rewritten');
    // In a cutaway a run is part of a batch's geometry: a shadow camera draws that run alone.
    layer.options={...layer.options,showAllLevels:false};layer.setView();
    const cut=layer.instanced.map(({mesh})=>mesh).find(b=>b.visible&&b.geometry.groups.some(g=>g.start>0||g.count<b.geometry.attributes.position.count));
    assert.ok(cut,'a cutaway leaves part of some batch geometry');
    for(const run of cut.geometry.groups)assert.deepEqual(shadow(cut,sun.shadow.camera,run),[0,1,2],'the cutaway run '+JSON.stringify(run));
    // With per-copy culling off (the benchmark's --expect), every camera draws every copy.
    batch.perObjectFrustumCulled=false;lamp.shadow.updateMatrices(lamp,0);
    assert.deepEqual(shadow(batch,lamp.shadow.camera,group),[0,1,2]);
  }finally{layer.dispose();}
});

test('with WEBGL_multi_draw, each run of consecutive copies in view is one instanced sub-draw at its first copy',()=>{
  // Five copies of a box along x, at 0, 10, 200, 20 and 30 m.
  const geometry=new T.BoxGeometry(2,2,2).toNonIndexed();geometry.addGroup(0,geometry.attributes.position.count,0);geometry.computeBoundingSphere();geometry.computeBoundingBox();
  const node=new T.Mesh(geometry,[new T.MeshStandardMaterial()]),batch=new CopyBatch(node,[0,10,200,20,30].map(x=>new T.Matrix4().makeTranslation(x,0,0)));
  const group=geometry.groups[0],count=group.count,multi={extensions:{has:name=>name==='WEBGL_multi_draw'}};
  const draw=(renderer,camera)=>{batch.onBeforeRender(renderer,new T.Scene(),camera,geometry,node.material[0],group);const n=batch._multiDrawCount;return {n,counts:[...batch._multiDrawCounts.slice(0,n)],instances:batch._multiDrawInstances&&[...batch._multiDrawInstances.slice(0,n)]};};
  try{
    // A view of x 0-30 m: copies 0-1 are a run, 2 is out, 3-4 a run, placed at copies 0 and 3.
    const near=looking(new T.PerspectiveCamera(60,1,.1,100),new T.Vector3(15,40,.01),new T.Vector3(15,0,0));
    assert.deepEqual(draw(multi,near),{n:4,counts:[count,0,0,count],instances:[2,0,0,2]});
    // A view of all five: one sub-draw of five instances, as an InstancedMesh would draw them.
    assert.deepEqual(draw(multi,looking(new T.PerspectiveCamera(60,1,.1,2000),new T.Vector3(100,400,.01),new T.Vector3(100,0,0))),{n:1,counts:[count],instances:[5]});
    // Without the extension three loops over plain sub-draws: one per copy in view.
    assert.deepEqual(draw(null,near),{n:5,counts:[count,count,0,count,count],instances:null});
    assert.equal(draw({extensions:{has:()=>false}},near).instances,null);
  }finally{batch.dispose();geometry.dispose();node.material[0].dispose();}
});

test('a CopyBatch bounds each copy by the sphere its own mesh would have, and the set by all of them',async()=>{
  const layer=await row(),point=new T.Vector3();
  try{
    assert.ok(layer.instanced.length>0);
    for(const {mesh:batch,node,copies}of layer.instanced){
      copies.forEach((copy,k)=>{
        copy.updateMatrixWorld(true);
        assert.deepEqual(batch.spheres[k],node.geometry.boundingSphere.clone().applyMatrix4(copy.matrixWorld),'copy '+k+': the sphere its own mesh would be culled by');
        // Every vertex the copy draws lies in its own sphere and in the set's.
        const position=node.geometry.attributes.position;let outside=0;
        for(let v=0;v<position.count;v++){point.fromBufferAttribute(position,v).applyMatrix4(copy.matrixWorld);if(batch.spheres[k].distanceToPoint(point)>1e-9||batch.boundingSphere.distanceToPoint(point)>1e-9||!batch.boundingBox.clone().expandByScalar(1e-9).containsPoint(point))outside++;}
        assert.equal(outside,0,'copy '+k+' of '+batch.name+': vertices outside its bounds');
      });
    }
  }finally{layer.dispose();}
});

test('each copy sits where its own node would, also when a provider nests the batch meshes',async()=>{
  // The standard providers put batch meshes straight under the root; this one nests them
  // in a moved and turned group, so a node's place in its template is not the identity.
  const providers=createPrefabProviders(T,{original:createOriginalBuildingProvider(T,{loadTexture:async()=>new T.Texture()})}),original=providers.get('original');
  providers.set('original',{load:original.load,create(library,id){const model=original.create(library,id),root=new T.Group();model.root.position.set(1.5,.25,-2);model.root.rotation.y=.3;root.add(model.root);return {root,setView:(view,options)=>model.setView(view,options),dispose:()=>model.dispose()};}});
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},error=>{throw error;},{providers}),at=new T.Matrix4();
  try{
    await layer.update({map:{buildingPrefabs:{instances:[0,1].map(i=>({id:'copy-'+i,asset:'dockside-warehouse',x:20+i*40,y:20,turns:i,clearance:2}))}}},{level:0,showAllLevels:true,roofs:true,walls:true});
    assert.ok(layer.instanced.length>0);
    for(const {mesh:batch,copies}of layer.instanced)copies.forEach((copy,k)=>{
      copy.updateWorldMatrix(true,false);assert.ok(!copy.matrixWorld.equals(copy.parent.parent.matrixWorld),'the node is not at its copy root');
      assert.deepEqual(new Float32Array(batch.getMatrixAt(k,at).elements),new Float32Array(copy.matrixWorld.elements),'copy '+k+' of '+batch.name);
    });
  }finally{layer.dispose();}
});

test('while a building library loads, removed copies are gone and the rest draw themselves',async()=>{
  const providers=createPrefabProviders(T,{original:createOriginalBuildingProvider(T,{loadTexture:async()=>new T.Texture()})}),gross=providers.get('gross');
  const catalogue=JSON.parse(fs.readFileSync(new URL('../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/assets/art/gross-housing-v1/houses.json',import.meta.url)));
  // The layer starts a load in a microtask: the gate exists first, so release() always opens it.
  let release;const gate=new Promise(resolve=>{release=resolve;});providers.set('gross',{...gross,load:()=>gate.then(()=>({catalogue,textures:{},dispose(){}}))});
  const layer=new PrefabLayer(new T.Scene(),{},()=>{},error=>{throw error;},{providers}),options={level:0,showAllLevels:true,roofs:true,walls:true};
  const copies=[0,1,2].map(i=>({id:'copy-'+i,asset:'dockside-warehouse',x:20+i*40,y:20,turns:0,clearance:2}));
  try{
    await layer.update({map:{buildingPrefabs:{instances:copies}}},options);assert.ok(layer.instanced.length>0);
    const removed=layer.models.get('copy-2').root,template=layer.templates.get('dockside-warehouse');
    // Drop one copy and add a Gross house, whose library is not loaded yet.
    const pending=layer.update({map:{buildingPrefabs:{instances:[...copies.slice(0,2),{id:'house',asset:GROSS_BUILDING_ASSETS[0].id,x:20,y:120,turns:0,clearance:2}]}}},options);
    assert.equal(layer.instanced.length,0,'no batch draws the old copies while the load is pending');
    assert.ok(removed.parent===null,'the dropped copy is gone at once');
    for(const id of ['copy-0','copy-1'])assert.deepEqual(layer.models.get(id).nodes.map(node=>node.visible),template.nodes.map(node=>node.visible),id+' draws itself meanwhile');
    release();await pending;
    assert.ok(layer.instanced.length>0&&layer.instanced.every(({mesh})=>mesh.instanceCount===2),'batched again once loaded, without the dropped copy');
  }finally{release();layer.dispose();}
});

test('a CopyBatch draws through the template geometry and adds no raycast hits of its own',async()=>{
  const layer=await row();
  try{
    const {mesh:batch,node}=layer.instanced[0];
    assert.ok(batch.geometry===node.geometry,'batch.geometry is node.geometry');assert.equal(batch.colorTexture,null,'see the renderer contract below');
    const hits=[];batch.raycast(new T.Raycaster(new T.Vector3(0,100,0),new T.Vector3(0,-1,0)),hits);assert.deepEqual(hits,[]);
    let disposed=0;node.geometry.addEventListener('dispose',()=>disposed++);batch.dispose();
    assert.equal(disposed,0,'disposing a batch leaves the template geometry to the template');
    assert.equal(batch._matricesTexture,null,'and releases its own textures');
  }finally{layer.dispose();}
});

// CopyBatch relies on these lines of the vendored renderer: a group's shadow draw passes
// the group; a BatchedMesh draws its _multiDraw lists, instanced when it has instance
// counts (deprecated since r174, removed in r184), with triangles counted per instance;
// the colour-texture test that re-derives the program unless colorTexture is null; and the
// batching chunks it patches to read the copy table at gl_DrawID + gl_InstanceID.
test('the vendored renderer still draws a BatchedMesh the way CopyBatch relies on',()=>{
  const source=fs.readFileSync(new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js',import.meta.url),'utf8');
  for(const line of ['object.onBeforeShadow( renderer, object, camera, shadowCamera, geometry, depthMaterial, group );','renderer.renderMultiDraw( object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount );','uniforms.setValue( _gl, \'_gl_DrawID\', i );','object.isBatchedMesh && materialProperties.batchingColor === false && object.colorTexture !== null',
    'renderer.renderMultiDrawInstances( object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount, object._multiDrawInstances );','extension.multiDrawArraysInstancedWEBGL( mode, starts, 0, counts, 0, primcount, 0, drawCount );','elementCount += counts[ i ] * primcount[ i ];',
    'mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );'])
    assert.ok(source.includes(line),'renderer line changed: '+line);
  assert.ok(T.ShaderChunk.batching_vertex.includes('getBatchingMatrix( getIndirectIndex( gl_DrawID + gl_InstanceID ) )'),'the batching chunk reads the copy table per instance');
});
