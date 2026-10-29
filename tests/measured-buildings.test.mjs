import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';
import * as T from'../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import{MEASURED_RECIPES,MEASURED_CONTRACT,measuredErrors,compileMeasured,measuredFloorSvg}from'../packages/measured-buildings/index.js';
import{buildMeasuredMesh}from'../packages/measured-buildings/mesh.js';import{createMeasuredModel}from'../packages/measured-buildings/three.js';
import{MEASURED_PARTS,buildMeasuredPart}from'../packages/measured-buildings/parts.js';import{MEASURED_MATERIALS}from'../packages/measured-buildings/geometry.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),buildings=MEASURED_RECIPES.map(r=>compileMeasured(r)),meshes=buildings.map(b=>buildMeasuredMesh(b)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function hits(batches,origin,direction,far=1){const ray=new T.Ray(new T.Vector3(...origin),new T.Vector3(...direction)),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),point=new T.Vector3();
 for(const batch of batches)for(let i=0;i<batch.positions.length;i+=9){a.fromArray(batch.positions,i);b.fromArray(batch.positions,i+3);c.fromArray(batch.positions,i+6);if(ray.intersectTriangle(a,b,c,false,point)&&point.distanceTo(ray.origin)<far)return true;}return false;}
test('measured recipes remain copied, deterministic, native and bounded',()=>{
 const before=JSON.stringify(MEASURED_RECIPES);for(const b of buildings){assert.deepEqual(measuredErrors(b.recipe),[]);assert.equal(b.contract.floorInterval,2.12);assert.deepEqual(b.contract.scale,[1,1,1]);assert.deepEqual(compileMeasured(b.id),b);assert.equal(b.consumerSupport.fire,false);}
 const changed=compileMeasured(buildings[0].id);changed.recipe.floors[0].rooms[0].name='Changed';assert.equal(JSON.stringify(MEASURED_RECIPES),before);
 const bad=structuredClone(MEASURED_RECIPES[0]);bad.floors[0].rooms[0].width+=.1;assert.ok(measuredErrors(bad).length);bad.levels=7;assert.ok(measuredErrors(bad).length);
 assert.equal(MEASURED_CONTRACT.wallHeight,2);assert.equal(MEASURED_CONTRACT.wallThickness,.16);assert.equal(MEASURED_CONTRACT.slabThickness,.12);
});
test('all descriptive rooms connect through real openings and standard stair cores',()=>{
 for(const b of buildings){const graph=new Map([['outside',[]],...b.floors.flatMap(f=>f.rooms.map(r=>[r.id,[]]))]),join=(a,c)=>{graph.get(a).push(c);graph.get(c).push(a);};
  for(const f of b.floors){near(f.height,f.level*2.12);for(const w of f.walls){assert.equal(w.wallHeight,2);assert.equal(w.thickness,.16);for(const o of w.openings){assert.ok(o.u0>=0&&o.u1<=w.length&&o.top<=2.12&&o.bottom>=0);if(o.type!=='window')join(...w.rooms);}}}
  for(const s of b.stairs){near(s.rise,2.12);near(s.base,s.fromLevel*2.12);assert.equal(s.toLevel,s.fromLevel+1);join('L'+s.fromLevel+':'+s.room,'L'+s.toLevel+':'+s.room);assert.ok(b.floors[s.toLevel].holes.some(h=>h.coreId===s.coreId));near(s.upperAttachment[1],s.toLevel*2.12);near(s.upperAttachment[2],s.rect.y+4);}
  const reached=new Set(['outside']),queue=['outside'];while(queue.length)for(const id of graph.get(queue.pop()))if(!reached.has(id)){reached.add(id);queue.push(id);}
  assert.deepEqual(b.floors.flatMap(f=>f.rooms.filter(r=>!r.omitSlab).map(r=>r.id)).filter(id=>!reached.has(id)),[],b.id+' has isolated rooms');
 }
});
test('every exterior window is a real wall aperture and every upper stair has a real slab hole',()=>{
 for(const [i,b]of buildings.entries()){const mesh=meshes[i];for(const f of b.floors){const wallBatches=mesh.batches.filter(v=>['exterior','datum-band'].includes(v.kind)&&v.level===f.level);
  for(const w of f.walls.filter(w=>!w.interior))for(const o of w.openings.filter(o=>o.type==='window')){const u=(o.u0+o.u1)/2,dx=(w.b[0]-w.a[0])/w.length,dy=(w.b[1]-w.a[1])/w.length,p=[w.a[0]+dx*u,f.height+(o.bottom+o.top)/2,w.a[1]+dy*u];
   assert.equal(hits(wallBatches,[p[0]+w.normal[0]*.3,p[1],p[2]+w.normal[1]*.3],[-w.normal[0],0,-w.normal[1]],.6),false,o.id+' is capped');}
  const floor=mesh.batches.filter(v=>v.kind==='floor'&&v.level===f.level);for(const h of f.holes){assert.equal(hits(floor,[h.x+h.width/2,f.height+.5,h.y+h.depth/2],[0,-1,0],1),false,h.id);assert.equal(hits(floor,[h.x+h.width/2,f.height+.5,h.y+h.depth+.5],[0,-1,0],1),true,'Missing upper landing');}
 }}
});
test('hospital light court is open through roofs and the paired public entry has two outer pivots',()=>{
 const b=buildings.find(b=>b.id==='ellis-hospital-two'),mesh=meshes.find(m=>m.building.id===b.id);assert.equal(hits(mesh.batches.filter(v=>v.kind==='roof'),[24,20,24],[0,-1,0],30),false);
 const model=createMeasuredModel(T,b),entry=model.pivots.filter(p=>p.userData.public&&p.userData.paired);assert.equal(entry.length,2);assert.deepEqual(entry.map(p=>p.userData.swingSign).sort(),[-1,1]);
 const caster=new T.Raycaster();caster.far=1;for(const open of[false,true]){model.setDoorsOpen(open);for(const x of[23.55,24.45]){caster.set(new T.Vector3(x,.8,-.35),new T.Vector3(0,0,1));assert.equal(caster.intersectObject(model.root,true).length>0,!open);}}
 model.setDoorsOpen(false);const left=entry.find(p=>p.userData.side==='left'),pivot=left.position.toArray();model.setDoorPose(left.name,90);assert.deepEqual(left.position.toArray(),pivot);
 for(const[x,closed]of[[23.55,false],[24.45,true]]){caster.set(new T.Vector3(x,.8,-.35),new T.Vector3(0,0,1));assert.equal(caster.intersectObject(model.root,true).length>0,closed);}
 const svg=measuredFloorSvg(b,0);assert.ok(svg.includes('data-door-leaf="left"')&&svg.includes('data-door-leaf="right"'));model.dispose();
});
test('detailed sources reduce without changing complete bounds, normals or material scale',()=>{
 for(const [i,b]of buildings.entries()){const game=meshes[i],source=buildMeasuredMesh(b,{lod:'source'});assert.deepEqual(source.bounds,game.bounds);assert.ok(source.metrics.triangles>game.metrics.triangles*1.4);assert.ok(game.bounds.max[0]-game.bounds.min[0]<240&&game.bounds.max[2]-game.bounds.min[2]<240);near(game.bounds.min[1],-.12);
  for(const batch of[...game.batches,...game.doorLeaves.flatMap(l=>l.batches)]){assert.equal(batch.positions.length,batch.normals.length);assert.equal(batch.uvs.length,batch.positions.length/3*2);assert.ok([...batch.positions,...batch.normals,...batch.uvs].every(Number.isFinite));for(let j=0;j<batch.normals.length;j+=3)near(Math.hypot(...batch.normals.slice(j,j+3)),1);}
 }
});
test('tall apertures cross datum bands, omitted slabs stay open and no continuation appears above a loading door',()=>{
 const b=buildings.find(b=>b.id==='boott-mill-four'),mesh=meshes.find(m=>m.building.id===b.id);
 for(const f of b.floors)for(const w of f.walls)for(const o of w.openings.filter(o=>o.continuation))assert.ok(b.floors[o.baseLevel].walls.some(q=>q.openings.some(p=>p.id===o.id&&!p.continuation)));
 assert.equal(hits(mesh.batches.filter(q=>['exterior','datum-band'].includes(q.kind)),[1.5,2.06,-.3],[0,0,1],.6),false,'Native datum band caps the tall window');
 assert.equal(hits(mesh.batches.filter(q=>q.kind==='exterior'),[25.5,2.7,-.3],[0,0,1],.6),true,'Orphan upper aperture above loading door');
 for(const level of[1,3]){const f=b.floors[level],floor=mesh.batches.filter(q=>q.kind==='floor'&&q.level===level);assert.equal(hits(floor,[20,f.height+.5,7.5],[0,-1,0],1),false);for(const w of f.walls.filter(w=>w.interior&&w.rooms.includes('L'+level+':work')))assert.equal(w.openings.some(o=>o.type!=='window'),false,'Door opens into missing factory floor');}
 for(const b of buildings)for(const f of b.floors)for(const w of f.walls)for(const o of w.openings.filter(o=>o.type==='doorway')){const m=meshes.find(m=>m.building.id===b.id);assert.equal([...m.doorLeaves,...m.fixedLeaves].some(l=>l.openingId===o.id),false);}
});
test('hip, gable and flat roof shells have paired manifold edges and positive volume, with no internal mill cap',()=>{
 for(const mesh of meshes)for(const proof of mesh.roofProofs){const type=mesh.building.roofs.find(r=>r.id===proof.id).type;if(type==='dome')continue;const edges=new Map(),faces=new Set();let volume=0;
  const key=p=>p.map(n=>Math.round(n*1e6)).join(',');
  for(const polygon of proof.faces){const faceKey=polygon.map(key).sort().join('|');assert.equal(faces.has(faceKey),false,'Duplicate roof face');faces.add(faceKey);
   for(let i=0;i<polygon.length;i++){const a=key(polygon[i]),b=key(polygon[(i+1)%polygon.length]),k=[a,b].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}
   for(let i=1;i<polygon.length-1;i++){const a=new T.Vector3(...polygon[0]),b=new T.Vector3(...polygon[i]),c=new T.Vector3(...polygon[i+1]);volume+=a.dot(b.cross(c))/6;}
  }
  assert.ok(volume>0,proof.id+' has no positive enclosed volume');assert.ok([...edges.values()].every(n=>n===2),proof.id+' has unpaired roof edges');
 }
 const mill=meshes.find(m=>m.building.id==='boott-mill-four');assert.equal(hits(mill.batches.filter(b=>b.kind==='roof'),[53.8,10.54,3],[1,0,0],.4),false,'Internal flat-roof rectangle cap');
});
test('ten reusable part recipes retain native attachments, source detail and complete bounds',()=>{
 assert.equal(MEASURED_PARTS.length,10);for(const p of MEASURED_PARTS){const game=buildMeasuredPart(p.id),source=buildMeasuredPart(p.id,{lod:'source'});assert.deepEqual(game.bounds,source.bounds,p.id);assert.ok(source.metrics.triangles>game.metrics.triangles);assert.ok(Object.values(p.attachments).flat().every(Number.isFinite));const model=createMeasuredModel(T,game);assert.deepEqual(model.root.scale.toArray(),[1,1,1]);model.dispose();}
 const stair=buildMeasuredPart('standard-u-stair-v1');assert.equal(hits(stair.batches.filter(b=>b.kind==='floor'&&b.level===1),[1.5,2.5,2],[0,-1,0],1),false);
 const pair=buildMeasuredPart('paired-timber-entry-v1');assert.equal(pair.doorLeaves.length,2);near(pair.doorLeaves[0].pivot[0],.565);near(pair.doorLeaves[1].pivot[0],2.435);
 const counter=buildMeasuredPart('market-stall-bay-v1');assert.equal(hits(counter.batches,[2.4,.4,-.2],[0,0,1],1.5),false,'Counter blocks its side access gap');
});
test('host adapter owns geometry/materials and preserves borrowed textures and other instances',()=>{
 const atlas=new T.Texture(),graniteTexture=new T.Texture();let textureDisposals=0;atlas.addEventListener('dispose',()=>textureDisposals++);graniteTexture.addEventListener('dispose',()=>textureDisposals++);
 const one=createMeasuredModel(T,buildings[0],{atlas,graniteTexture}),two=createMeasuredModel(T,buildings[0],{atlas,graniteTexture});let disposed=0;one.root.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>disposed++);});one.dispose();one.dispose();assert.ok(disposed>0);assert.equal(textureDisposals,0);assert.ok(two.root.children.length);assert.throws(()=>one.setDoorsOpen(true),/disposed/);two.dispose();
});
test('recorded source/export hashes, preserved sculpt data and standard glTF buffers agree',()=>{
 const catalogue=JSON.parse(fs.readFileSync(new URL('../assets/measured-buildings/catalogue.json',import.meta.url)));assert.equal(catalogue.baseline,'12ad8c9b1c96637cd05c8e344692063bfde385f3');
 const partManifest=JSON.parse(fs.readFileSync(new URL('../'+catalogue.partsManifest.file,import.meta.url))),records=[...catalogue.buildings,...partManifest.parts];
 for(const item of[...catalogue.inputs,...catalogue.skins,catalogue.partsManifest,...records.flatMap(b=>b.files)])assert.equal(sha(fs.readFileSync(new URL('../'+item.file,import.meta.url))),item.sha256,item.file);
 for(const record of records){const source=JSON.parse(gunzipSync(fs.readFileSync(new URL('../art/measured-buildings/sculpts/'+record.id+'.source-mesh.json.gz',import.meta.url))));assert.equal(source.metrics.triangles,record.source.triangles);
  const base=new URL('../assets/measured-buildings/'+(record.files[0].file.includes('/parts/')?'parts/':'models/'),import.meta.url),g=JSON.parse(fs.readFileSync(new URL(record.id+'.gltf',base))),buffer=fs.readFileSync(new URL(record.id+'.bin',base));assert.equal(buffer.length,g.buffers[0].byteLength);
  for(const image of g.images)assert.ok(fs.existsSync(new URL(image.uri,new URL(record.id+'.gltf',base))));
  for(const m of g.materials)assert.ok(m.pbrMetallicRoughness.baseColorFactor.every(v=>v>=0&&v<=1));
  for(const mesh of g.meshes)for(const p of mesh.primitives){const vertexCount=g.accessors[p.attributes.POSITION].count,a=g.accessors[p.indices],v=g.bufferViews[a.bufferView];assert.equal(a.componentType,5125);for(let i=0;i<a.count;i++)assert.ok(buffer.readUInt32LE(v.byteOffset+i*4)<vertexCount);
   const tile=MEASURED_MATERIALS[g.materials[p.material].name].tile,uv=g.accessors[p.attributes.TEXCOORD_0],view=g.bufferViews[uv.bufferView];if(tile!==null)for(let i=0;i<uv.count;i++){const u=buffer.readFloatLE(view.byteOffset+i*8),v=buffer.readFloatLE(view.byteOffset+i*8+4);assert.ok(u>=(tile%4)/4-1e-6&&u<=(tile%4+1)/4+1e-6);assert.ok(v>=Math.floor(tile/4)/4-1e-6&&v<=(Math.floor(tile/4)+1)/4+1e-6,'glTF atlas V must use upper-left image origin');}}
 }
});
