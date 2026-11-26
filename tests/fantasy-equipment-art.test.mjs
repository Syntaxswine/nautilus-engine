import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../packages/render-effects/three.js';
import {fantasyEquipmentArt,listFantasyEquipmentArt} from '../packages/fantasy-equipment-art/catalogue.js';
import {createFantasyEquipmentModel} from '../packages/fantasy-equipment-art/three.js';
import {buildEquipmentGeometry,equipmentGeometryBounds,PAINT_CELLS} from '../packages/fantasy-equipment-art/geometry.js';
const roster=['knife','short-sword','sword','axe','pick','blacksmith-hammer','mace','spear','halberd','bow','crossbow','round-wood-shield','emblem-metal-shield','tower-shield','riot-shield'];
const resources=root=>{const r=new Set();root.traverse(n=>{if(n.geometry)r.add(n.geometry);if(n.material){r.add(n.material);if(n.material.map)r.add(n.material.map);}});return r;};
const geometryState=root=>{const a=[];root.traverse(n=>{if(n.geometry)a.push({uuid:n.uuid,position:Array.from(n.geometry.attributes.position.array)});});return a;};

test('headless catalogue has exactly the canonical roster, independent copies and explicit host boundaries',()=>{
 assert.deepEqual(listFantasyEquipmentArt().map(x=>x.id),roster);for(const id of roster){const a=fantasyEquipmentArt(id);assert.equal(a.nativeScale,1);assert.equal(a.units,'metres');assert.equal(a.axes.front,'+Z');assert.deepEqual(a.grip.main.position,[0,0,0]);assert.equal(a.grip.main.socket,'grip.main');assert.equal(a.handoff.schema,'nautilus-fantasy-equipment-art-v1');assert.equal(a.appearanceOnly,true);assert(a.handoff.hostOwns.includes('collision and confirmed hits'));assert(a.resources.triangles<5000);assert(a.resources.meshBatches<=16);a.bounds.min[0]=-99;assert.notEqual(fantasyEquipmentArt(id).bounds.min[0],-99);}
 assert.throws(()=>fantasyEquipmentArt('not-a-weapon'),/EQUIPMENT_ID/);
});

for(const id of roster)test(id+': deterministic finite geometry, exact rest bounds, native sockets and resource budget',()=>{
 const spec=fantasyEquipmentArt(id),a=buildEquipmentGeometry(id),b=buildEquipmentGeometry(id);assert.deepEqual(a,b);let triangles=0;
 for(const batch of a.batches){assert.equal(batch.positions.length%9,0);assert.equal(batch.positions.length,batch.normals.length);assert.equal(batch.uvs.length,batch.positions.length/3*2);assert(batch.positions.every(Number.isFinite));assert(batch.normals.every(Number.isFinite));const cell=PAINT_CELLS[batch.material],x=cell%4,y=Math.floor(cell/4);for(let k=0;k<batch.uvs.length;k+=2){assert(batch.uvs[k]>=(x+.04)/4&&batch.uvs[k]<=(x+.96)/4);assert(batch.uvs[k+1]>=1-(y+.96)/2&&batch.uvs[k+1]<=1-(y+.04)/2);}triangles+=batch.positions.length/9;}
 assert.equal(triangles,spec.resources.triangles);assert.deepEqual(equipmentGeometryBounds(a,{includeHidden:false}),spec.restBounds);
 const model=createFantasyEquipmentModel(T,{id});assert(model.root instanceof T.Group);assert.equal(Object.getPrototypeOf(model.sockets),Object.prototype);assert.equal(model.root.scale.x,1);assert.deepEqual(Object.keys(model.sockets).sort(),spec.sockets.map(x=>x.id).sort());for(const s of spec.sockets){assert(model.sockets[s.id] instanceof T.Object3D);assert.deepEqual(model.sockets[s.id].position.toArray(),s.position);assert.deepEqual(model.sockets[s.id].quaternion.toArray(),s.quaternion);}
 const own=resources(model.root),textures=[...own].filter(r=>r.isTexture);assert.equal(textures.length,1);assert.equal(textures[0].image.width,512);assert.equal(textures[0].image.data.byteLength,1048576);assert.equal([...own].filter(x=>x.isBufferGeometry).length,spec.resources.meshBatches);assert.equal([...own].filter(x=>x.isMaterial).length,spec.resources.materials);model.dispose();model.dispose();assert.throws(()=>model.setArticulation({}),/EQUIPMENT_RETIRED/);
});

for(const id of ['bow','crossbow'])test(id+': real continuous draw bends limbs/string, translates projectile and preserves every node/resource',()=>{
 const model=createFantasyEquipmentModel(T,{id}),nodes=[],owned=resources(model.root);model.root.traverse(n=>nodes.push(n));const original=geometryState(model.root),restTip=model.sockets[id==='bow'?'limb.upper':'limb.right'].position.clone();let previousNock=model.sockets['string.nock'].position.z;
 for(let i=0;i<=20;i++){const draw=i/20;for(const loaded of [false,true]){assert.deepEqual(model.setArticulation({draw,loaded}),{draw,loaded});assert.equal(model.root.getObjectByName('projectile').visible,loaded);assert(model.sockets['string.nock'].position.z<=previousNock+1e-12);previousNock=model.sockets['string.nock'].position.z;assert.deepEqual(model.sockets['string.nock'].position.toArray(),model.sockets['projectile.nock'].position.toArray());const box=new T.Box3().setFromObject(model.root),bounds=fantasyEquipmentArt(id).bounds;for(let k=0;k<3;k++){assert(box.min.getComponent(k)>=bounds.min[k]-1e-6);assert(box.max.getComponent(k)<=bounds.max[k]+1e-6);}}}
 assert.notDeepEqual(geometryState(model.root),original);assert.notDeepEqual(model.sockets[id==='bow'?'limb.upper':'limb.right'].position,restTip);const after=[];model.root.traverse(n=>after.push(n));assert.deepEqual(after,nodes);assert.deepEqual(resources(model.root),owned);
 const before=geometryState(model.root);for(const pose of [{draw:NaN},{draw:Infinity},{draw:-.01},{draw:1.01},{draw:'1'},{loaded:1},{loaded:null},{speed:1},null,[],Object.create({draw:1})])assert.throws(()=>model.setArticulation(pose),/EQUIPMENT_/);assert.deepEqual(geometryState(model.root),before);
 assert.deepEqual(model.setArticulation({loaded:false}),{draw:1,loaded:false});assert.deepEqual(model.setArticulation({draw:.2}),{draw:.2,loaded:false});model.dispose();
});

test('static articulation and unknown model/finish/options refuse instead of assuming a mode',()=>{
 const model=createFantasyEquipmentModel(T,{id:'sword'});assert.deepEqual(model.setArticulation({}),{});for(const p of [{draw:0},{loaded:false},{impact:'slash'}])assert.throws(()=>model.setArticulation(p),/EQUIPMENT_POSE/);model.dispose();
 for(const options of [{id:'bad'},{id:'sword',finish:'red'},{id:'bow',finish:null},{id:'sword',damage:'made-up'},null])assert.throws(()=>createFantasyEquipmentModel(T,options),/EQUIPMENT_/);assert.throws(()=>createFantasyEquipmentModel({}, {id:'sword'}),/EQUIPMENT_THREE/);
});

test('declared finishes stay bounded and clear/opaque riot treatment retains an actual view band',()=>{
 for(const spec of listFantasyEquipmentArt())for(const finish of spec.finishes){const m=createFantasyEquipmentModel(T,{id:spec.id,finish});const r=resources(m.root);assert([...r].filter(x=>x.isMaterial).length<=7);assert([...r].filter(x=>x.isTexture).length===1);m.dispose();}
 const clear=buildEquipmentGeometry('riot-shield'),opaque=buildEquipmentGeometry('riot-shield',{finish:'opaque'});const c=clear.batches.find(x=>x.material==='glass'),o=opaque.batches.find(x=>x.material==='glass');assert(c.positions.length>o.positions.length);assert(Math.min(...o.positions.filter((_,i)=>i%3===1))>=.36-1e-6);assert(Math.max(...o.positions.filter((_,i)=>i%3===1))<=.52+1e-6);
});

test('two instances own distinct maps/geometries; retiring one leaves neighbour and borrowed replacements alive',()=>{
 const a=createFantasyEquipmentModel(T,{id:'bow'}),b=createFantasyEquipmentModel(T,{id:'bow'}),host=new T.Group();host.add(a.root,b.root);const ar=resources(a.root),br=resources(b.root),counts=new Map();for(const r of [...ar,...br]){counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));}assert([...ar].every(r=>!br.has(r)));const borrowedTexture=new T.Texture(),borrowedMaterial=new T.MeshStandardMaterial({map:borrowedTexture}),borrowedGeometry=new T.BoxGeometry(),borrowed=new T.Mesh(borrowedGeometry,borrowedMaterial);let borrowedDisposed=0;for(const r of [borrowedTexture,borrowedMaterial,borrowedGeometry])r.addEventListener('dispose',()=>borrowedDisposed++);a.root.add(borrowed);a.dispose();a.dispose();for(const r of ar)assert.equal(counts.get(r),1);for(const r of br)assert.equal(counts.get(r),0);assert.equal(borrowedDisposed,0);assert.equal(b.root.parent,host);b.setArticulation({draw:1,loaded:true});b.dispose();for(const r of br)assert.equal(counts.get(r),1);borrowedGeometry.dispose();borrowedMaterial.dispose();borrowedTexture.dispose();
});

test('actual Three dispose/removal observers drain once, preserve neighbours, and permit terminal reentry',()=>{
 const a=createFantasyEquipmentModel(T,{id:'round-wood-shield'}),b=createFantasyEquipmentModel(T,{id:'sword'}),scene=new T.Group();scene.add(a.root,b.root);const owned=resources(a.root);let early=0,late=0,removed=0;for(const r of owned){r.addEventListener('dispose',()=>{early++;a.dispose();throw Error('observer expected');});r.addEventListener('dispose',()=>late++);}a.root.addEventListener('removed',()=>{removed++;assert.equal(a.root.parent,null);assert.equal(a.root.visible,false);throw Error('removal expected');});assert.throws(()=>a.dispose(),e=>e instanceof AggregateError&&e.errors.length===owned.size+1);assert.equal(early,owned.size);assert.equal(late,owned.size);assert.equal(removed,1);assert.equal(b.root.parent,scene);a.dispose();b.dispose();
});

test('partial allocation failure rolls back every allocated native geometry/material/texture',()=>{
 const created=[];let released=0,attempt=0;const instrument=Base=>class extends Base{constructor(...args){super(...args);created.push(this);this.addEventListener('dispose',()=>released++);}};const namespace={...T,DataTexture:instrument(T.DataTexture),MeshStandardMaterial:instrument(T.MeshStandardMaterial),BufferGeometry:class extends T.BufferGeometry{constructor(){if(++attempt===3)throw Error('injected allocation failure');super();created.push(this);this.addEventListener('dispose',()=>released++);}}};assert.throws(()=>createFantasyEquipmentModel(namespace,{id:'sword'}),/injected allocation/);assert(created.length>=4);assert.equal(released,created.length);
});

test('retained original paint source and packed outputs match provenance hashes',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../assets/fantasy-equipment/provenance.json',import.meta.url)));for(const r of manifest.resources){const bytes=fs.readFileSync(new URL('../'+r.file,import.meta.url));assert.equal(bytes.length,r.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);}
});

test('ranged limb shells face outward and static construction leaves the real projectile path clear',()=>{
 for(const id of ['bow','crossbow'])for(const draw of [0,.5,1]){const data=buildEquipmentGeometry(id,{draw,loaded:true});for(const part of id==='bow'?['limb.upper','limb.lower']:['limb.left','limb.right']){let volume=0;for(const b of data.batches.filter(x=>x.part===part))for(let i=0;i<b.positions.length;i+=9){const a=b.positions.slice(i,i+3),bb=b.positions.slice(i+3,i+6),c=b.positions.slice(i+6,i+9);volume+=(a[0]*(bb[1]*c[2]-bb[2]*c[1])+a[1]*(bb[2]*c[0]-bb[0]*c[2])+a[2]*(bb[0]*c[1]-bb[1]*c[0]))/6;}assert(volume>0,'Closed limb must have outward winding.');}
  const model=createFantasyEquipmentModel(T,{id});model.root.updateMatrixWorld(true);const y=id==='bow'?.11:.18,start=id==='bow'?-.12:.15,end=id==='bow'?.13:.76;const ray=new T.Raycaster(new T.Vector3(0,y,start),new T.Vector3(0,0,1),0,end-start);assert.equal(ray.intersectObject(model.root.getObjectByName('static'),true).length,0,'Riser/rail/clamp must leave centre projectile path clear.');model.dispose();
 }
});
