import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {assembly,definition,DEFINITIONS,ACTOR_PROFILES,measuredParts,placedAssembly} from '../art/functional-parts-kit/kit.js';
import {boxGeometryData} from '../art/functional-parts-kit/geometry.js';
import {createKitLibrary} from '../art/functional-parts-kit/three.js';
const close=(a,b,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const read=name=>JSON.parse(fs.readFileSync(new URL('../docs/reviews/functional-parts-kit/'+name,import.meta.url)));
function hits(objects,origin,direction){for(const object of objects)object.updateWorldMatrix(true,false);return new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,100).intersectObjects(objects,false);}

test('native door aperture is physically empty, closed/open visual leaf and complete sweep agree',()=>{
 const library=createKitLibrary(T,{grey:true}),model=library.createModel({id:'native-door-test',parts:[{id:'door',definitionId:'native-door-bay',position:[0,0,0],quarterTurns:0,floor:'ground'}]});
 try{
  const frame=model.bindings.filter(binding=>binding.object.isMesh&&binding.object.userData.role.startsWith('static')).map(binding=>binding.object);
  assert.equal(hits(frame,[1,1,-2],[0,0,1]).length,0);
  assert.ok(hits(frame,[.2,1,-2],[0,0,1]).length>0);
  assert.ok(hits(frame,[1,1.95,-2],[0,0,1]).length>0);
  const leaf=model.bindings.find(binding=>binding.nodeId==='leaf').object;
  assert.ok(hits([leaf],[1,1,-2],[0,0,1]).length>0);
  model.setDoorOpen('door',true);
  assert.equal(hits([leaf],[1,1,-2],[0,0,1]).length,0);
  const def=definition('native-door-bay'),door=def.door,localCorners=[];
  for(const x of [0,1.18])for(const y of [0,1.88])for(const z of [-.025,.025])localCorners.push(new T.Vector3(x,y,z));
  for(let degrees=0;degrees<=90;degrees++){
   const angle=degrees*Math.PI/180,points=localCorners.map(point=>point.clone().applyAxisAngle(new T.Vector3(0,1,0),angle).add(new T.Vector3(...door.hinge))),box=new T.Box3().setFromPoints(points);
   for(const point of points)for(let axis=0;axis<3;axis++)assert.ok(point.getComponent(axis)>=door.motionBounds.min[axis]-1e-8&&point.getComponent(axis)<=door.motionBounds.max[axis]+1e-8);
   for(const node of def.nodes){const min=node.min,max=node.max;assert.ok(!(box.max.x>min[0]+1e-8&&box.min.x<max[0]-1e-8&&box.max.y>min[1]+1e-8&&box.min.y<max[1]-1e-8&&box.max.z>min[2]+1e-8&&box.min.z<max[2]-1e-8),'Leaf sweep clips '+node.id+' at '+degrees);}
  }
 }finally{model.dispose();library.dispose();}
});

test('both layouts have real 2 x 5 m upper slab voids, 70 m2 upper support and named full-footprint landings',()=>{
 for(const name of ['longhouse','cross-workshop']){
  const recipe=assembly(name),library=createKitLibrary(T,{grey:true}),model=library.createModel(recipe),parts=measuredParts(recipe);
  try{
   const upper=model.bindings.filter(binding=>binding.object.isMesh&&binding.object.userData.floorId==='upper'&&binding.object.userData.role==='slab').map(binding=>binding.object),hole=recipe.openings[0].bounds;
   for(let x=hole.min[0]+.1;x<hole.max[0];x+=.2)for(let z=hole.min[2]+.1;z<hole.max[2];z+=.2)assert.equal(hits(upper,[x,3,z],[0,-1,0]).length,0,'Actual mesh caps the shaft');
   const area=parts.filter(part=>part.floorId==='upper'&&part.support).reduce((sum,part)=>sum+(part.support.bounds.max[0]-part.support.bounds.min[0])*(part.support.bounds.max[2]-part.support.bounds.min[2]),0);close(area,70);
   const stair=parts.find(part=>part.stairs),profile=ACTOR_PROFILES[0];
   for(const connection of recipe.connections){const support=parts.find(part=>part.partId===connection.supportPartId).support.bounds,p=connection.port==='lower-landing'?stair.stairs.path[0]:stair.stairs.path.at(-1);assert.ok(p[0]-profile.radiusM>=support.min[0]&&p[0]+profile.radiusM<=support.max[0]&&p[2]-profile.radiusM>=support.min[2]&&p[2]+profile.radiusM<=support.max[2]);close(p[1],support.max[1]);}
  }finally{model.dispose();library.dispose();}
 }
});

test('structural ceiling clearance is 2 m along the authored centreline; stepped contacts and route approximation remain explicit',()=>{
 for(const layout of ['longhouse','cross-workshop']){
  const recipe=assembly(layout),library=createKitLibrary(T,{grey:true}),model=library.createModel(recipe),parts=measuredParts(recipe),stairs=parts.find(part=>part.stairs).stairs;
  try{
   const slabs=model.bindings.filter(binding=>binding.object.isMesh&&binding.object.userData.role==='slab').map(binding=>binding.object);let minimum=Infinity;
   for(let segment=1;segment<stairs.path.length;segment++)for(let i=0;i<=100;i++){
    const a=stairs.path[segment-1],b=stairs.path[segment],p=a.map((n,j)=>n+(b[j]-n)*i/100),above=hits(slabs,[p[0],p[1]+.001,p[2]],[0,1,0]);
    if(above.length)minimum=Math.min(minimum,above[0].point.y-p[1]);
   }
   close(minimum,2);assert.equal(stairs.contactSamples.length,14);close(stairs.maximumRampToTreadDifferenceM,2.12/14);
   assert.match(stairs.collisionBindingRequirement,/Await Coder ABI/);
  }finally{model.dispose();library.dispose();}
 }
});

test('quarter-turned instances retain actual render transforms, IDs, floor elevations and the same five definitions',()=>{
 const library=createKitLibrary(T,{grey:true});
 try{for(const layout of ['longhouse','cross-workshop'])for(let turn=0;turn<4;turn++){
  const source=assembly(layout),placed=placedAssembly(source,[20,0,14],turn,'transformed-copy-'+turn),model=library.createModel(placed),rotation=new T.Matrix4().makeRotationY(turn*Math.PI/2);rotation.setPosition(20,0,14);
  try{
   assert.notEqual(source.instanceId,placed.instanceId);assert.deepEqual(source.connections,placed.connections);
   assert.ok(model.bindings.every(binding=>binding.assemblyInstanceId===placed.instanceId));
   assert.equal(new Set(model.bindings.map(binding=>[binding.assemblyInstanceId,binding.partId,binding.nodeId].join('/'))).size,model.bindings.length);
   assert.equal(new Set(placed.parts.map(part=>part.id)).size,placed.parts.length);
   assert.ok(placed.parts.every(part=>placed.floorIds.includes(part.floor)),'Roof presentation must not invent an unregistered third floor.');
   assert.deepEqual([...new Set(placed.parts.map(part=>part.definitionId))].sort(),DEFINITIONS.map(def=>def.id).sort());
   for(let i=0;i<source.parts.length;i++){const expected=new T.Vector3(...source.parts[i].position).applyMatrix4(rotation),actual=model.root.children[i].position;close(actual.x,expected.x);close(actual.y,expected.y);close(actual.z,expected.z);}
   const measured=measuredParts(placed);
   for(const binding of model.bindings.filter(binding=>binding.object.isMesh)){
    const envelope=measured.find(part=>part.partId===binding.partId).bounds,box=new T.Box3().setFromObject(binding.object);
    for(let axis=0;axis<3;axis++){assert.ok(box.min.getComponent(axis)>=envelope.min[axis]-1e-5);assert.ok(box.max.getComponent(axis)<=envelope.max[axis]+1e-5);}
   }
  }finally{model.dispose();}
 }}finally{library.dispose();}
});

test('native source body and equipped envelopes justify fit and oversized refusal without actor scaling',()=>{
 const report=read('measurements.json'),bare=report.actors.find(actor=>actor.equipment==='hands'),loaded=report.actors.find(actor=>actor.equipment==='hmg'),profile=ACTOR_PROFILES[0];
 assert.deepEqual(bare.nativeScale,[1,1,1]);assert.deepEqual(loaded.nativeScale,[1,1,1]);
 assert.ok(bare.equipped.max[1]<=profile.heightM&&bare.requiredRootHalfExtentM<=profile.radiusM);
 assert.ok(loaded.requiredRootHalfExtentM>.6&&loaded.requiredRootHalfExtentM<=.64);
 assert.ok(1.7>1.65&&1.7<1.9&&profile.radiusM*2<1.2);
 assert.equal(report.actorFits.find(actor=>actor.id==='horse-hmg-clearance-case').newDoorFits,false);
 assert.equal(report.actorFits.find(actor=>actor.id==='bear-unarmed-provisional').provisional,true);
 const rowan=read('rowan-audit.json');assert.equal(rowan.id,'rowan-family');assert.equal(rowan.regularDoors.length,22);assert.ok(rowan.regularDoors.every(door=>door.heightM===1.65));
});

test('source/game reductions keep metre bounds and atlas coordinates while models borrow shared resources',()=>{
 let author=0,game=0;
 for(const def of DEFINITIONS)for(const node of [...def.nodes,...(def.door?[def.door.leaf,def.door.handle]:[])])for(const lod of ['authoring','game']){
  const data=boxGeometryData(node,{lod});if(lod==='authoring')author+=data.triangles;else game+=data.triangles;
  assert.ok(data.positions.every(Number.isFinite)&&data.normals.every(Number.isFinite));assert.ok(data.uvs.every(n=>n>=0&&n<=1));
  for(let axis=0;axis<3;axis++){const values=data.positions.filter((_,i)=>i%3===axis);close(Math.min(...values),node.min[axis]);close(Math.max(...values),node.max[axis]);}
 }
 assert.ok(author>game);
 const atlas=new T.Texture();let released=0;atlas.addEventListener('dispose',()=>released++);const library=createKitLibrary(T,{atlas}),a=library.createModel(assembly()),b=library.createModel(assembly('cross-workshop'));
 const before=library.diagnostics();assert.equal(before.models,2);a.dispose();assert.equal(released,0);b.dispose();library.dispose();library.dispose();assert.equal(released,0);atlas.dispose();assert.equal(released,1);
});

test('artist data/geometry preparation stays headless and does not load a renderer, DOM or host clock',()=>{
 const source=`for(const name of ['window','document','localStorage','fetch','WebGLRenderingContext','requestAnimationFrame','performance'])Object.defineProperty(globalThis,name,{get(){throw Error(name+' must not be used');}});const kit=await import('./art/functional-parts-kit/kit.js');const mesh=await import('./art/functional-parts-kit/geometry.js');const recipe=kit.assembly();if(kit.measuredParts(recipe).length!==97)throw Error('Recipe mismatch');mesh.boxGeometryData(kit.definition('native-wall-2m').nodes[0]);`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:new URL('..',import.meta.url),encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
});
