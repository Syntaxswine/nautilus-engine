import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {H_PLAN_RECIPES,H_PLAN_CONTRACT,compileHPlan,hPlanRecipe,hPlanErrors,hPlanFloorSvg} from '../packages/h-plan-buildings/index.js';
import {buildHPlanMesh,H_PLAN_MATERIALS} from '../packages/h-plan-buildings/mesh.js';import {createHPlanModel} from '../packages/h-plan-buildings/three.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),buildings=H_PLAN_RECIPES.map(compileHPlan),meshes=buildings.map(b=>buildHPlanMesh(b));
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const allBatches=data=>[...data.batches,...data.doorLeaves.flatMap(d=>d.batches)];

test('three original H templates preserve native scale, source recipes, deterministic metadata and honest circulation',()=>{
  assert.equal(globalThis.document,undefined);assert.equal(H_PLAN_RECIPES.length,3);assert.deepEqual(buildings.map(b=>b.stories),[3,4,5]);assert.equal(H_PLAN_CONTRACT.floorSpacing,2.12);
  for(const recipe of H_PLAN_RECIPES){const before=JSON.stringify(recipe),a=compileHPlan(recipe),b=compileHPlan(hPlanRecipe(recipe.id));assert.deepEqual(a,b);assert.equal(JSON.stringify(recipe),before);assert.deepEqual(a,JSON.parse(JSON.stringify(a)));
    a.recipe.refs.push('local-note');assert.equal(JSON.stringify(recipe),before);assert.equal(a.floors[0].contour.length,12);assert.equal(a.courts.length,2);assert.ok(a.courts.every(c=>c.width>=6&&c.depth>=6));assert.equal(a.roof.style,'flat-parapet');assert.equal(a.consumerIntegrated,false);
    for(const f of a.floors)near(f.height,f.level*2.12);assert.equal(a.cores.length,recipe.cores==='central'?1:2);
  }
  for(const patch of [{version:2},{wing:NaN},{court:0},{depth:100},{stories:2},{cornice:'unknown'},{cores:'long-corridor'}])assert.ok(hPlanErrors({...H_PLAN_RECIPES[0],...patch}).length);
});

test('each apartment and every habitable room has an actual exterior window opening with a genuine outside/court sample',()=>{
  for(const b of buildings)for(const f of b.floors)for(const u of f.apartments){assert.ok(u.windowIds.length>=2,u.id);assert.equal(u.roomIds.reduce((n,id)=>n+f.rooms.find(r=>r.id===id).rects.reduce((s,r)=>s+r.width*r.depth,0),0),u.area);
    for(const id of u.windowIds){const win=b.windows.find(w=>w.id===id);assert.equal(win.unitId,u.id);assert.equal(win.level,f.level);assert.ok(win.u1>win.u0&&win.top>win.bottom);assert.equal(f.cells.some(c=>win.exteriorPoint[0]>=c.x&&win.exteriorPoint[0]<c.x+.5&&win.exteriorPoint[1]>=c.y&&win.exteriorPoint[1]<c.y+.5),false,'sample is outdoors');
      if(win.exposure.endsWith('court')){const court=b.courts.find(c=>c.id===win.exposure);assert.ok(court);assert.ok(win.exteriorPoint[0]>court.x&&win.exteriorPoint[0]<court.x+court.width);}
    }
    for(const id of u.roomIds){const room=f.rooms.find(r=>r.id===id);if(room.habitable)assert.ok(room.windowIds.length,id);}
  }
});

test('units have one landing entry, connected interior room openings and valid stair/landing/void associations',()=>{
  for(const b of buildings)for(const f of b.floors){const graph=new Map(f.rooms.map(r=>[r.id,new Set()]));for(const w of f.walls.filter(w=>w.interior))for(const o of w.openings){assert.ok(o.u0>=0&&o.u1<=w.length&&o.top<=2);for(const id of o.rooms)assert.ok(graph.has(id));graph.get(o.rooms[0]).add(o.rooms[1]);graph.get(o.rooms[1]).add(o.rooms[0]);}
    const reached=new Set([f.landing.id]),todo=[f.landing.id];while(todo.length)for(const next of graph.get(todo.pop()))if(!reached.has(next)){reached.add(next);todo.push(next);}for(const r of f.rooms)assert.ok(reached.has(r.id),r.id);
    for(const u of f.apartments){const entry=b.doors.filter(d=>d.level===f.level&&d.type==='unit-door'&&d.rooms.some(id=>u.roomIds.includes(id)));assert.equal(entry.length,1,u.id);assert.equal(entry[0].id,u.entryId);assert.ok(entry[0].rooms.includes(f.landing.id));for(const id of u.coreIds)assert.ok(b.cores.some(c=>c.id===id));}
    assert.equal(f.holes.length,f.level?b.cores.length:0);
    for(const hole of f.holes){const core=b.cores.find(c=>c.id===hole.coreId);assert.deepEqual([hole.x,hole.y,hole.width,hole.depth],[core.rect.x,core.rect.y,core.rect.width,core.rect.depth]);assert.ok(b.stairs.some(s=>s.coreId===core.id&&s.toFloor===f.level));}
  }
  for(const b of buildings){assert.equal(b.stairs.length,b.cores.length*(b.stories-1));for(const s of b.stairs){assert.equal(s.toFloor,s.fromFloor+1);near(s.rise,2.12);assert.equal(s.risers,14);assert.ok(s.run+s.midLandingDepth<=s.rect.depth);}}
});

test('the generated roof is one closed H prism with positive volume and no internal wing caps or buried duplicate faces',()=>{
  for(const data of meshes){const edges=new Map(),faces=new Set();let volume=0;
    for(const p of data.roofProof){const face=p.map(v=>v.map(n=>n.toFixed(7)).join(',')).sort().join('|');assert.equal(faces.has(face),false,'duplicate roof face');faces.add(face);
      for(let i=0;i<p.length;i++){const a=p[i].map(n=>n.toFixed(7)).join(','),b=p[(i+1)%p.length].map(n=>n.toFixed(7)).join(','),key=[a,b].sort().join('|'),e=edges.get(key)||{count:0,sign:0};e.count++;e.sign+=a<b?1:-1;edges.set(key,e);}
      for(let i=1;i<p.length-1;i++)volume+=dot(p[0],cross(p[i],p[i+1]))/6;
    }
    for(const e of edges.values()){assert.equal(e.count,2);assert.equal(e.sign,0);}
    const b=data.building,o=b.roof.overhang,w=b.recipe.wing,g=b.recipe.court,d=b.depth,c=b.recipe.connector;
    const area=2*(w+2*o)*(d+2*o)+(g-2*o)*(c+2*o);near(volume,area*.12,.00001);
  }
});

test('all three actual meshes leave both courts open through every floor/roof and cut genuine wall and stair apertures',()=>{
  for(const b of buildings){const model=createHPlanModel(T,b),objects=model.root.children.filter(o=>o.isMesh);model.root.updateMatrixWorld(true);
    for(const court of b.courts){for(const x of[court.x+.65,court.x+court.width/2,court.x+court.width-.65])for(const z of[court.y+.65,court.y+court.depth/2,court.y+court.depth-.65]){const ray=new T.Raycaster(new T.Vector3(x,b.roof.height+3,z),new T.Vector3(0,-1,0),0,b.roof.height+4);assert.equal(ray.intersectObjects(objects,false).length,0,b.id+' '+court.id);}}
    for(const f of b.floors){for(const hole of f.holes){const floor=objects.filter(o=>o.userData.kind==='floor'&&o.userData.level===f.level),ray=new T.Raycaster(new T.Vector3(hole.x+hole.width/2,f.height+.2,hole.y+hole.depth/2),new T.Vector3(0,-1,0),0,.5);assert.equal(ray.intersectObjects(floor,false).length,0,'actual stair hole');}
      for(const w of f.walls.filter(w=>!w.interior))for(const win of w.openings.filter(o=>o.type==='window')){const u=(win.u0+win.u1)/2,dx=(w.b[0]-w.a[0])/w.length,dz=(w.b[1]-w.a[1])/w.length,n=new T.Vector3(dz,0,-dx),p=new T.Vector3(w.a[0]+dx*u,f.height+(win.bottom+win.top)/2,w.a[1]+dz*u),ray=new T.Raycaster(p.clone().addScaledVector(n,.35),n.clone().negate(),0,.7),walls=objects.filter(o=>o.userData.kind==='exterior'&&o.userData.level===f.level);assert.equal(ray.intersectObjects(walls,false).length,0,'real exterior window');p.y=f.height+.25;ray.ray.origin.copy(p).addScaledVector(n,.35);assert.ok(ray.intersectObjects(walls,false).length,'masonry remains beneath window');}
    }model.dispose();
  }
});

test('paired entries use one rough aperture, two outer pivots, opposite swings and independently editable leaf poses',()=>{
  for(const b of buildings){const model=createHPlanModel(T,b),entry=b.doors.find(d=>d.type==='paired-entry'),pair=model.pivots.filter(p=>p.userData.paired),left=pair.find(p=>p.userData.side==='left'),right=pair.find(p=>p.userData.side==='right');assert.equal(pair.length,2);assert.equal(entry.roughDimensionsIncludeFrame,true);
    near(left.position.distanceTo(right.position),entry.u1-entry.u0-2*entry.frame.jamb);assert.equal(left.userData.sign,1);assert.equal(right.userData.sign,-1);const saved=pair.map(p=>p.position.toArray());
    for(const pose of[{left:0,right:0},{left:90,right:0},{left:0,right:90},{left:90,right:90}]){model.setEntryPose(pose);near(left.rotation.y-left.userData.yaw,pose.left*Math.PI/180);near(right.rotation.y-right.userData.yaw,-pose.right*Math.PI/180);assert.deepEqual(pair.map(p=>p.position.toArray()),saved);
      for(const pivot of pair){const descriptor=pivot.userData,p=new T.Vector3(descriptor.sign*descriptor.width/2,.8,0).applyAxisAngle(new T.Vector3(0,1,0),descriptor.yaw).add(pivot.position),normal=new T.Vector3(Math.sin(-descriptor.yaw),0,-Math.cos(descriptor.yaw)),ray=new T.Raycaster(p.clone().addScaledVector(normal,.3),normal.clone().negate(),0,.6);assert.equal(ray.intersectObjects(pair,true).length>0,pose[descriptor.side]===0,'one/both leaves actually clear their aperture halves');}
    }
    assert.throws(()=>model.setEntryPose({left:NaN,right:0}));model.dispose();
    const plan=hPlanFloorSvg(b,0);assert.ok(plan.includes('data-paired-leaf="left"'));assert.ok(plan.includes('data-paired-leaf="right"'));
  }
});

test('game meshes simplify the preserved detailed source at identical native bounds, with finite unit normals and metre UVs',()=>{
  for(const data of meshes){const source=buildHPlanMesh(data.building,{lod:'source'});assert.ok(data.metrics.triangles<source.metrics.triangles*.4);assert.deepEqual(source.bounds,data.bounds);
    for(const batch of allBatches(data)){assert.equal(batch.positions.length,batch.normals.length);assert.equal(batch.positions.length/3,batch.uvs.length/2);assert.ok(batch.positions.every(Number.isFinite));assert.ok(batch.uvs.every(Number.isFinite));
      for(let i=0;i<batch.positions.length;i+=9){const p=[0,3,6].map(o=>batch.positions.slice(i+o,i+o+3)),normal=cross(sub(p[1],p[0]),sub(p[2],p[0]));assert.ok(Math.hypot(...normal)>1e-10);for(let j=0;j<3;j++){const n=batch.normals.slice(i+j*3,i+j*3+3);near(Math.hypot(...n),1);assert.ok(dot(normal,n)>0);}
        for(const[a,b]of[[0,1],[1,2],[2,0]]){const uv0=batch.uvs.slice(i/3*2+a*2,i/3*2+a*2+2),uv1=batch.uvs.slice(i/3*2+b*2,i/3*2+b*2+2);near(Math.hypot(...sub(p[a],p[b])),Math.hypot(...sub(uv0,uv1))*(batch.material==='felt'?2:1),.00001);}}
    }
  }
});

test('H-plan model instances dispose their own geometry/materials once and preserve borrowed skins and other instances',()=>{
  const atlas=new T.Texture(),roofTexture=new T.Texture(),stoneTexture=new T.Texture();let borrowed=0,geometries=0,materials=0;for(const texture of[atlas,roofTexture,stoneTexture])texture.addEventListener('dispose',()=>borrowed++);
  const a=createHPlanModel(T,'alder-court',{atlas,roofTexture,stoneTexture}),b=createHPlanModel(T,'alder-court',{atlas,roofTexture,stoneTexture}),scene=new T.Scene();scene.add(a.root,b.root);
  a.root.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>geometries++);});for(const m of a.materials.values())m.addEventListener('dispose',()=>materials++);
  const expected=a.data.metrics.drawCalls;a.dispose();a.dispose();assert.equal(geometries,expected);assert.equal(materials,a.materials.size);assert.equal(borrowed,0);assert.equal(a.root.parent,null);assert.equal(b.root.parent,scene);b.setEntryPose({left:90,right:0});b.dispose();
  assert.throws(()=>a.setEntryPose({}));assert.throws(()=>createHPlanModel(T,'alder-court',{atlas:{}}));for(const texture of[atlas,roofTexture,stoneTexture])texture.dispose();
});

test('additive exports, preserved source sculpts, assemblies and all floor plans match their recorded hashes',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/h-plan-buildings/catalogue.json'))),sha=bytes=>createHash('sha256').update(bytes).digest('hex');assert.equal(manifest.buildings.length,3);
  for(const input of[...manifest.inputs,...manifest.skins])assert.equal(sha(fs.readFileSync(path.join(root,input.file))),input.sha256,input.file);
  for(const record of manifest.buildings){for(const file of record.files){const bytes=fs.readFileSync(path.join(root,file.file));assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256,file.file);}
    const b=JSON.parse(fs.readFileSync(path.join(root,'assets/h-plan-buildings/models/'+record.id+'.assembly.json')));assert.deepEqual(b,compileHPlan(record.id));for(let i=0;i<b.stories;i++)assert.equal(fs.readFileSync(path.join(root,'assets/h-plan-buildings/models/'+record.id+`-floor-${i+1}.svg`),'utf8'),hPlanFloorSvg(b,i));
    const source=JSON.parse(gunzipSync(fs.readFileSync(path.join(root,'art/h-plan-buildings/sculpts/'+record.id+'.source-mesh.json.gz'))));assert.equal(source.lod,'source');assert.equal(source.metrics.triangles,record.source.triangles);assert.deepEqual(source.building,b);
    const gltf=JSON.parse(fs.readFileSync(path.join(root,'assets/h-plan-buildings/models/'+record.id+'.gltf'))),bin=fs.readFileSync(path.join(root,'assets/h-plan-buildings/models/'+record.id+'.bin'));assert.equal(gltf.buffers[0].byteLength,bin.length);assert.ok(gltf.nodes.some(n=>n.name.endsWith(':left')));assert.ok(gltf.nodes.some(n=>n.name.endsWith(':right')));
    for(const material of gltf.materials)for(const value of material.pbrMetallicRoughness.baseColorFactor)assert.ok(value>=0&&value<=1,'legal glTF base-color factor');
    for(const view of gltf.bufferViews)assert.ok(view.byteOffset>=0&&view.byteOffset+view.byteLength<=bin.length);for(const mesh of gltf.meshes)for(const p of mesh.primitives){const position=gltf.accessors[p.attributes.POSITION],idx=gltf.accessors[p.indices],view=gltf.bufferViews[idx.bufferView];for(let i=0;i<idx.count;i++)assert.ok(bin.readUInt32LE(view.byteOffset+i*4)<position.count);
      const id=gltf.materials[p.material].name,tile=H_PLAN_MATERIALS[id].tile;if(tile!==null&&id!=='stone'){const a=gltf.accessors[p.attributes.TEXCOORD_0],v=gltf.bufferViews[a.bufferView],column=tile%4,row=Math.floor(tile/4);assert.equal(a.count,position.count);for(let i=0;i<a.count;i++){const u=bin.readFloatLE(v.byteOffset+i*8),t=bin.readFloatLE(v.byteOffset+i*8+4);assert.ok(u>column/4&&u<(column+1)/4);assert.ok(t>row/4&&t<(row+1)/4,'glTF upper-left UV origin selects the intended painted cell');}}
    }
  }
});
