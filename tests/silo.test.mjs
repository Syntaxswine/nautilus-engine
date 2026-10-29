import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {SILO_ASSETS,SILO_PLAN,levelY,createSiloBlueprint,serializeSiloBlueprint,siloHeightReference,exportSiloToLegacy} from '../packages/silo/index.js';
import {buildSiloMesh,annularWall,transformSiloRigPoint,siloMotionBounds} from '../packages/silo/mesh.js';
import {area,circle,rectangle,tileFloor,intersect,Surfaces} from '../packages/silo/geometry.js';import {createSiloModel} from '../packages/silo/three.js';
import {exportSiloGLTF} from '../tools/export-silo-gltf.mjs';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} differs from ${b}`),hash=b=>createHash('sha256').update(b).digest('hex');
const complex=buildSiloMesh();

test('silo keeps signed native heights, reversible world datums and explicit unsupported legacy export',()=>{
 assert.equal(globalThis.document,undefined);assert.equal(globalThis.window,undefined);
 const w=siloHeightReference();assert.equal(w.floors.length,23);assert.equal(levelY(0),-46.64);assert.equal(levelY(22),0);
 for(const [i,f] of w.floors.entries()){
  assert.deepEqual(Object.keys(f).sort(),['elevationM','id','index','label']);assert.equal(f.index,i);near(f.elevationM,levelY(i)+46.64);if(i)near(f.elevationM-w.floors[i-1].elevationM,2.12);
 }
 const b=createSiloBlueprint();assert.deepEqual(JSON.parse(serializeSiloBlueprint(b)),b);b.scale=[1,2,1];assert.throws(()=>serializeSiloBlueprint(b),/native scale/);
 assert.throws(exportSiloToLegacy,e=>e.code==='UNSUPPORTED_SILO_GEOMETRY');assert.equal(SILO_PLAN.shaft.outerRadius*2,17);assert.equal(SILO_PLAN.shaft.voidRadius*2,8);assert.equal(SILO_PLAN.capsule.outerRadius*2,12);
});

test('round floors retain intact metre cells and remove holes without losing boundary area',()=>{
 const outline=circle([0,0],7.5),hole=circle([0,0],4),cells=tileFloor(outline,[hole]);
 near(cells.reduce((s,c)=>s+c.area,0),area(outline)-area(hole),1e-7);assert.ok(cells.some(c=>c.full)&&cells.some(c=>!c.full));
 for(const c of cells)for(const p of c.polygons){assert.ok(area(p)>0);assert.ok(area(intersect(p,hole))<1e-7);for(const [x,z]of p){assert.ok(Math.abs(x-c.x)<=.500001&&Math.abs(z-c.z)<=.500001);}if(c.full)near(area(p),1);}
 // The entry tunnels and room plates share thresholds but never two coplanar decks.
 for(const index of [17,22]){const floors=complex.semantics.floors.filter(f=>f.index===index);for(let i=0;i<floors.length;i++)for(let j=0;j<i;j++){
  const a=floors[i],b=floors[j],cut=intersect(a.outline,b.outline);if(area(cut)<1e-7)continue;
  const bucket=new Map(b.cells.map(c=>[c.x+','+c.z,c]));for(const c of a.cells){const d=bucket.get(c.x+','+c.z);if(d)for(const p of c.polygons)for(const q of d.polygons)assert.ok(area(intersect(p,q))<1e-7,`overlap ${a.id}/${b.id}`);}
 }}
 const collar=complex.semantics.floors.find(f=>f.id==='surface-collar');assert.equal(collar.nativeTop,0);for(const c of collar.cells)for(const p of c.polygons)assert.ok(area(intersect(p,rectangle(SILO_PLAN.shaft.stair.hole)))<1e-7,'blocked upper stair');
});

test('every shaft, capsule and portal stair connects adjacent 2.12 m datums',()=>{
 assert.equal(complex.semantics.stairs.length,31);assert.equal(complex.semantics.floors.filter(f=>/^shaft-deck/.test(f.id)).length,8);
 for(const s of complex.semantics.stairs){near(s.toY-s.fromY,2.12);near(s.rise*12,2.12);near(s.midLandingY-s.fromY,1.06);assert.equal(s.treads,12);assert.deepEqual([s.footprint.width,s.footprint.depth],[4,3]);
  for(const [id,anchor]of [[s.fromFloorId,s.bottomAnchor],[s.toFloorId,s.topAnchor]])assert.ok(complex.semantics.landings.some(l=>l.floorId===id&&anchor[0]>=l.polygon[0][0]&&anchor[0]<=l.polygon[1][0]&&anchor[2]>=l.polygon[0][1]&&anchor[2]<=l.polygon[2][1]),s.id+' missing landing');
 }
 // Sample the actual horizontal tread geometry at lane centres, not its metadata.
 const stair=buildSiloMesh('silo-switchback'),tops=[];
 for(const b of stair.batches.filter(b=>b.kind==='stair'&&b.material==='steel'))for(let k=0;k<b.positions.length;k+=9){const p=b.positions.slice(k,k+9);if(b.normals[k+1]>.999){const y=p[1];if(y>0&&y<2.121)tops.push(y);}}
 for(let i=1;i<=12;i++)assert.ok(tops.some(y=>Math.abs(y-i*2.12/12)<1e-6),'missing tread '+i);
});

test('custom annular portal is an actual aperture and the circular approximation is under 5 mm',()=>{
 const s=new Surfaces();annularWall(s,{center:[0,0],inner:7.5,outer:8.5,bottom:0,height:4.24,openings:[{theta:0,width:3,bottom:0,height:3}]});
 const group=new T.Group();for(const b of s.batches.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));group.add(new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide})));}group.updateMatrixWorld(true);
 const ray=(z,y)=>new T.Raycaster(new T.Vector3(9,y,z),new T.Vector3(-1,0,0),0,2).intersectObject(group,true);
 assert.equal(ray(0,1).length,0);assert.ok(ray(2,1).length);assert.ok(ray(0,3.5).length);assert.ok(complex.metrics.maximumShaftChordErrorM<.005);
 group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

test('surface cover tracks and frame leave the upper stair midway landing clear',()=>{
 const m=createSiloModel(T,'silo-surface-cover');m.setCoverOpen(0);m.root.updateMatrixWorld(true);
 const hits=new T.Raycaster(new T.Vector3(111.75,-.96,23.5),new T.Vector3(0,1,0),0,1.9).intersectObject(m.root,true);assert.equal(hits.length,0);m.dispose();
});

test('all retained source/game meshes have finite attributes, outward normals and matching envelopes',()=>{
 for(const a of SILO_ASSETS){const game=a.kind==='complex'?complex:buildSiloMesh(a.id),source=buildSiloMesh(a.id,{lod:'source'});assert.ok(game.metrics.triangles<source.metrics.triangles,a.id);
  for(const axis of [0,1,2])for(const edge of ['min','max'])near(game.bounds[edge][axis],source.bounds[edge][axis],.025);
  for(const data of [game,source])for(const b of [...data.batches,...data.rigs.flatMap(r=>r.batches)]){
   assert.equal(b.positions.length,b.normals.length);assert.equal(b.uvs.length*3,b.positions.length*2);
   assert.ok(b.positions.every(Number.isFinite)&&b.uvs.every(Number.isFinite));
   for(let i=0;i<b.positions.length;i+=9){const p=b.positions.slice(i,i+9),u=[p[3]-p[0],p[4]-p[1],p[5]-p[2]],v=[p[6]-p[0],p[7]-p[1],p[8]-p[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert.ok(n.reduce((sum,x,k)=>sum+x*b.normals[i+k],0)>-1e-9,a.id+' inverted face');near(Math.hypot(...b.normals.slice(i,i+3)),1,1e-5);}
  }
 }
});

test('provider preserves borrowed resources, independent poses, transformed slice planes and idempotent disposal',()=>{
 const atlas=new T.Texture();let atlasDisposals=0;atlas.addEventListener('dispose',()=>atlasDisposals++);const m=createSiloModel(T,'silo-blast-lock',{atlas});
 let gd=0,md=0;for(const g of m.geometries)g.addEventListener('dispose',()=>gd++);for(const mat of m.materials.values())mat.addEventListener('dispose',()=>md++);const gn=m.geometries.size,mn=m.materials.size;
 m.setRigPose('blast-door-west',45);assert.equal(m.rigs.find(r=>r.descriptor.id==='blast-door-east').value,0);
 const rig=m.rigs[0],p=[1,1,.1],world=new T.Vector3(...p).applyMatrix4(rig.group.matrixWorld);transformSiloRigPoint(rig.descriptor,p,45).forEach((n,i)=>near(n,world.getComponent(i)));
 m.root.position.set(5,46.64,7);m.setView({floorIndex:17,band:0,cutaway:true});const planes=[...m.materials.values()][0].clippingPlanes;
 near(planes[0].distanceToPoint(new T.Vector3(5,levelY(17)+46.64,7)),.13);
 assert.throws(()=>m.setView({floorIndex:-1}),/declared/);assert.throws(()=>m.setRigPose('blast-door-west',91),/range/);m.root.scale.y=2;assert.throws(()=>m.setView(),/scaling/);m.root.scale.y=1;
 m.dispose();m.dispose();assert.equal(gd,gn);assert.equal(md,mn);assert.equal(atlasDisposals,0);assert.throws(()=>m.setView(),/disposed/);atlas.dispose();
});

test('standard glTF retains native bounds, valid ranges and independent animation channels',()=>{
 const data=buildSiloMesh('silo-heavy-door',{uvMode:'atlas'}),{gltf,bin}=exportSiloGLTF(data);assert.equal(gltf.buffers[0].byteLength,bin.length);
 for(const a of gltf.accessors){const b=gltf.bufferViews[a.bufferView];assert.equal(b.byteOffset%4,0);assert.ok(b.byteOffset+b.byteLength<=bin.length);assert.equal(a.componentType,5126);}
 assert.equal(gltf.animations.length,1);assert.equal(gltf.animations[0].channels[0].target.path,'rotation');assert.ok(gltf.images[0].uri.endsWith('painted-silo-materials-v1.png'));
 const motion=siloMotionBounds(data);for(const r of data.rigs)for(const angle of [0,13.3,45,89.9,90])for(const b of r.batches)for(let i=0;i<b.positions.length;i+=3){const p=transformSiloRigPoint(r,b.positions.slice(i,i+3),angle);p.forEach((v,k)=>assert.ok(v>=motion.min[k]&&v<=motion.max[k]));}
 const catalogue=JSON.parse(fs.readFileSync(new URL('../assets/silo/catalogue.json',import.meta.url)));assert.equal(catalogue.assets.length,15);
 for(const f of catalogue.inputs)assert.equal(hash(fs.readFileSync(new URL('../'+f.path,import.meta.url))),f.sha256,f.path);assert.equal(hash(fs.readFileSync(new URL('../assets/silo/'+catalogue.atlas.path,import.meta.url))),catalogue.atlas.sha256);
 for(const entry of catalogue.assets)for(const f of entry.files){const bytes=fs.readFileSync(new URL('../'+f.path,import.meta.url));assert.equal(hash(bytes),f.sha256,f.path);assert.equal(bytes.length,f.bytes);if(f.path.endsWith('.game-mesh.json.gz'))assert.equal(JSON.parse(gunzipSync(bytes)).asset.id,entry.id);}
});
