import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';
import * as T from'../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import{VARIANT_BUILDINGS,VARIANT_PARTS,VARIANT_CONTRACT,compileVariant,variantRecipe,variantFloorSvg,validateLayout,worldSockets}from'../packages/fort-variants/index.js';
import{VARIANT_LAYOUTS}from'../packages/fort-variants/layouts.js';import{VARIANT_MATERIALS,buildVariantMesh,buildVariantLayout}from'../packages/fort-variants/mesh.js';
import{createVariantModel}from'../packages/fort-variants/three.js';
import{VARIANT_CONNECTORS}from'../packages/fort-variants/connectors.js';
import{FRONTIER_BUILDINGS,FRONTIER_PARTS,WALK}from'../packages/frontier-fort/designs.js';
const specs=[...VARIANT_BUILDINGS,...VARIANT_PARTS],meshes=new Map(specs.map(r=>[r.id,buildVariantMesh(r.id)])),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`),
  sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function hit(batches,origin,direction,far=1){
  const ray=new T.Ray(new T.Vector3(...origin),new T.Vector3(...direction)),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),p=new T.Vector3();
  for(const batch of batches)for(let i=0;i<batch.positions.length;i+=9){a.fromArray(batch.positions,i);b.fromArray(batch.positions,i+3);c.fromArray(batch.positions,i+6);
    if(ray.intersectTriangle(a,b,c,false,p)&&p.distanceTo(ray.origin)<far)return true;}return false;
}
test('variant recipes are immutable, native and renderer independent',()=>{
  const snapshot=JSON.stringify(VARIANT_BUILDINGS);for(const r of VARIANT_BUILDINGS){const b=compileVariant(r.id);assert.deepEqual(compileVariant(r.id),b);
    assert.equal(b.contract.wallHeight,2);assert.equal(b.contract.wallThickness,.16);assert.equal(b.contract.slabThickness,.12);assert.equal(b.contract.floorInterval,2.12);
    assert.deepEqual(b.contract.scale,[1,1,1]);for(const f of b.floors)near(f.height,f.level*2.12);
    assert.equal(b.consumerSupport.navigation,false);assert.equal(b.consumerSupport.fire,false);assert.ok(variantFloorSvg(b,0).includes('fictional module plan'));
  }
  const changed=variantRecipe(VARIANT_BUILDINGS[0].id);changed.floors[0].rooms[0].name='Changed';assert.equal(JSON.stringify(VARIANT_BUILDINGS),snapshot);
  assert.equal(VARIANT_CONTRACT.walk.minimumClearWidth,1.4);assert.equal(typeof globalThis.document,'undefined');
  const parts=JSON.parse(fs.readFileSync(new URL('../assets/fort-variants/parts.json',import.meta.url)));
  for(const module of parts.modules)assert.ok(VARIANT_CONNECTORS.roles.includes(module.role),'Undeclared module role: '+module.role);
});

test('both themes retain every original module socket and the fixed legacy walking profile',()=>{
  const original=[...FRONTIER_BUILDINGS,...FRONTIER_PARTS];assert.equal(specs.length,38);
  for(const theme of['castle','cyclone']){
    const themed=specs.filter(r=>r.theme===theme);assert.equal(themed.length,18);
    for(const r of themed){const base=original.find(b=>b.id===r.sourceModuleId);assert.deepEqual(r.interfaces,base.interfaces,r.id);}
  }
  assert.equal(VARIANT_CONNECTORS.profile.profile,WALK.profile);assert.equal(VARIANT_CONNECTORS.constructionProfiles.castle.frontParapetThickness,.32);
});

test('modern panels and decks contain real diamond and grating voids, and the guard cabin is raised',()=>{
  const mesh=meshes.get('cyclone-fence-6'),wire=mesh.batches.filter(b=>b.material==='wire');assert.ok(wire.length);
  let hits=0,misses=0;for(let x=.35;x<1.2;x+=.031)for(let h=.4;h<1;h+=.037){if(hit(wire,[x,h,-.15],[0,0,1],.3))hits++;else misses++;}
  assert.ok(hits>10&&misses>100,'Diamond apertures missing');
  const deck=mesh.batches.filter(b=>b.kind==='walkway');assert.equal(hit(deck,[.075,2.5,.91],[0,-1,0],.8),false,'Grating void capped');
  assert.equal(hit(deck,[.15,2.5,.91],[0,-1,0],.8),true,'Grating crossbar missing');
  const tower=meshes.get('cyclone-guard-tower').building;assert.equal(tower.levels,3);assert.equal(tower.floors[1].walls.length,0);near(tower.floors[2].height,4.24);
  assert.equal(tower.stairs.length,2);assert.equal(tower.recipe.towerSupports,true);assert.equal(tower.windows.length,4);
  for(const id of['castle-gatehouse','castle-corner-tower']){const b=meshes.get(id).building;assert.equal(b.recipe.battlements.length,1);assert.ok(b.floors.at(-1).holes.length);}
});
test('five unit-scale themed and mixed configurations make one closed, accurately matched perimeter each',()=>{
  assert.equal(VARIANT_LAYOUTS.length,5);
  for(const l of VARIANT_LAYOUTS){const p=validateLayout(l);assert.deepEqual(p.errors,[]);assert.equal(p.closed,true);assert.equal(p.connections.length,p.perimeterModules);
    for(const i of l.instances){near(i.position[0]/3,Math.round(i.position[0]/3));near(i.position[2]/3,Math.round(i.position[2]/3));assert.deepEqual(i.scale,[1,1,1]);}
    for(const angle of[0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const rotated=structuredClone(l),c=Math.cos(angle),s=Math.sin(angle);
      for(const i of rotated.instances){const[x,y,z]=i.position;i.position=[x*c+z*s,y,-x*s+z*c];i.yaw+=angle;}
      assert.equal(validateLayout(rotated).closed,true);
    }
    const missing=structuredClone(l);missing.instances=missing.instances.filter(i=>i.id!=='front-west-0');assert.ok(validateLayout(missing).errors.length);
    const scaled=structuredClone(l);scaled.instances[0].scale=[.5,.5,.5];assert.ok(validateLayout(scaled).errors.length);
    const arbitrary=structuredClone(l);arbitrary.instances[0].yaw=.2;assert.ok(validateLayout(arbitrary).errors.length);
    const mesh=buildVariantMesh(l.id);assert.ok(mesh.bounds.min[0]>=-1e-6&&mesh.bounds.max[0]<=l.width+1e-6);
    assert.ok(mesh.bounds.min[2]>=-1e-6&&mesh.bounds.max[2]<=l.depth+1e-6);
    assert.equal(hit(mesh.batches.filter(b=>b.kind==='roof'),[l.width/2,20,25],[0,-1,0],25),false,'Courtyard is roof-capped');
  }
});
test('wall/walk sockets contain a real floor and an unobstructed walking-lane cross section',()=>{
  for(const r of specs)for(const p of (r.interfaces||[]).filter(p=>!p.optional)){
    const m=meshes.get(r.id),out=p.out,walk=p.walk,inside=[walk[0]-out[0]*.18,walk[1]+.3,walk[2]-out[1]*.18];
    assert.equal(hit(m.batches.filter(b=>['floor','walkway'].includes(b.kind)),inside,[0,-1,0],.6),true,r.id+' '+p.id+' missing deck');
    const side=[-out[1],out[0]];
    for(const lateral of[-.69,0,.69])for(const height of[.3,1,1.8]){
      const origin=[walk[0]+out[0]*.3+side[0]*lateral,walk[1]+height,walk[2]+out[1]*.3+side[1]*lateral];
      assert.equal(hit(m.batches,origin,[-out[0],0,-out[1]],.6),false,r.id+' '+p.id+' lane obstruction');
    }
  }
});
test('optional roof-walk caps open explicitly and instance variants do not share cached geometry',()=>{
  const r=variantRecipe('castle-roof-store'),closed=meshes.get(r.id);
  const lane=[0,2.8,.91];assert.equal(hit(closed.batches,[-.3,lane[1],lane[2]],[1,0,0],.6),true);
  r.openInterfaces=['roof-west','roof-east'];const opened=buildVariantMesh(r);
  assert.equal(hit(opened.batches,[-.3,lane[1],lane[2]],[1,0,0],.6),false);
  assert.throws(()=>compileVariant({...r,openInterfaces:['missing']}),/Unknown optional/);
  const layout=structuredClone(VARIANT_LAYOUTS[0]),instance=layout.instances.find(i=>i.id==='rear-east-0');
  instance.assetId=r.id;instance.openInterfaces=[...r.openInterfaces];assert.equal(validateLayout(layout).closed,true);
  const mesh=buildVariantLayout(layout),socket=worldSockets(instance).find(p=>p.id==='roof-west'),p=socket.walk,d=socket.out;
  assert.equal(hit(mesh.batches,[p[0]+d[0]*.3,p[1]+.68,p[2]+d[1]*.3],[-d[0],0,-d[1]],.6),false);
  assert.equal(hit(mesh.batches,[44.7,2.8,24.91],[1,0,0],.6),true,'Default storehouse lost its closed roof cap');
});

test('all window and portal holes are real, including the gateway across the intermediate datum',()=>{
  for(const r of VARIANT_BUILDINGS){const m=meshes.get(r.id),b=m.building;
    for(const f of b.floors)for(const w of f.walls)for(const o of w.openings){
      const u=(o.u0+o.u1)/2,dx=(w.b[0]-w.a[0])/w.length,dz=(w.b[1]-w.a[1])/w.length,
        point=[w.a[0]+dx*u+w.normal[0]*.3,f.height+(o.bottom+o.top)/2,w.a[1]+dz*u+w.normal[1]*.3];
      assert.equal(hit(m.batches.filter(q=>['exterior','datum-band','interior'].includes(q.kind)&&q.level===f.level),point,[-w.normal[0],0,-w.normal[1]],.6),false,o.id+' capped');
    }
  }
  const gate=meshes.get('castle-gatehouse');for(const h of[1,2.06,2.2,3.8])
    assert.equal(hit(gate.batches.filter(q=>['exterior','datum-band'].includes(q.kind)),[9,h,-.3],[0,0,1],.6),false,'Gateway band is capped');
  assert.equal(hit(gate.batches.filter(q=>q.kind==='floor'&&q.level===1),[9,2.5,3],[0,-1,0],.7),false,'Floor crosses the tall gateway');
});
test('paired gates preserve independent hinges, full-open approach clearances and fitting sweeps',()=>{
  for(const[id,center,width,height,far]of[['castle-gatehouse',9,4,1.2,7],['cyclone-security-gatehouse',9,4,1.2,7],['castle-postern',3,3,1.2,2],['cyclone-service-gate',3,3,1.2,2]]){
    const model=createVariantModel(T,id),leaves=model.pivots.filter(p=>['gate','sally'].includes(p.userData.style));assert.equal(leaves.length,2);
    const ray=new T.Raycaster();ray.far=far;
    const hits=x=>{let count=0;for(let offset=-.12;offset<=.12;offset+=.011)for(const dh of[0,.013]){ray.set(new T.Vector3(x+offset,height+dh,-.35),new T.Vector3(0,0,1));count+=ray.intersectObject(model.root,true).length;}return count;};
    const leftX=center-width*.22,rightX=center+width*.22;
    assert.ok(hits(leftX)>0&&hits(rightX)>0,id+' closed leaves missing');
    const left=leaves.find(p=>p.userData.side==='left'),pivot=left.position.toArray();model.setDoorPose(left.name,90);
    assert.deepEqual(left.position.toArray(),pivot);assert.equal(hits(leftX),0,id+' left leaf not clear');assert.ok(hits(rightX)>0,id+' right leaf unexpectedly open');
    model.setDoorsOpen(true,{gatesOnly:true});
    const half=width===4?1.59:1.24;
    for(let x=center-half;x<=center+half;x+=.13)for(const h of width===4?[.25,1.2,2.6,3.88]:[.25,1.1,1.88]){
      ray.set(new T.Vector3(x,h,-.35),new T.Vector3(0,0,1));assert.equal(ray.intersectObject(model.root,true).length,0,id+' open approach obstruction');
    }
    assert.throws(()=>model.setDoorPose(left.name,91),/0–90/);model.dispose();
  }
  for(const id of['castle-gatehouse','cyclone-security-gatehouse'])for(const leaf of meshes.get(id).doorLeaves.filter(l=>l.style==='gate'))for(let degree=0;degree<=90;degree+=5){
    const a=leaf.yaw+leaf.swingSign*degree*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    for(const batch of leaf.batches)for(let i=0;i<batch.positions.length;i+=3){const[x,y,z]=batch.positions.slice(i,i+3),px=leaf.pivot[0]+x*c+z*s,pz=leaf.pivot[2]-x*s+z*c;
      if(pz>.17&&pz<5.9&&leaf.pivot[1]+y<4.1)assert.ok(px>=7.08-1e-6&&px<=10.92+1e-6,'Gate fitting intersects return wall');
    }
  }
});

test('stairs retain standard rises, real holes, reachable landings and unblocked exterior side exits',()=>{
  for(const r of VARIANT_BUILDINGS){const m=meshes.get(r.id),b=m.building;
    for(const f of b.floors)for(const h of f.holes){
      assert.equal(hit(m.batches.filter(q=>['floor','roof-terrace'].includes(q.kind)&&q.level===f.level),[h.x+1.5,f.height+.3,h.y+2],[0,-1,0],.6),false,h.id);
      assert.equal(hit(m.batches.filter(q=>['floor','roof-terrace'].includes(q.kind)&&q.level===f.level),[h.x+.65,f.height+.3,h.y+h.depth+.45],[0,-1,0],.6),true,'Missing stair landing');
    }
    for(const s of b.stairs){near(s.rise,2.12);assert.equal(s.risers,14);near(s.upperAttachment[1],s.toLevel*2.12);}
    for(const s of b.auxiliaryStairs){
      near(s.rise,2.12);assert.equal(s.upperLanding.depth,1.5);
      const p=s.upperExit,dir=r.separateStair.openLandingSide==='east'?[1,0,0]:[-1,0,0];
      for(const height of[.4,.8,1,1.8])assert.equal(hit(m.batches,[p[0]-dir[0]*.3,p[1]+height,p[2]],dir,.6),false,'Exterior stair exit is blocked by a wall or guard');
      assert.equal(hit(m.batches.filter(q=>q.kind==='walkway'),[p[0]-dir[0]*.3,p[1]+.3,p[2]],[0,-1,0],.6),true,'Missing extended side landing');
    }
  }
});
test('settled detailed sources reduce with identical bounds, finite geometry and unit normals',()=>{
  for(const r of specs){const g=meshes.get(r.id),s=buildVariantMesh(r.id,{lod:'source'});s.bounds.min.forEach((n,i)=>near(n,g.bounds.min[i]));s.bounds.max.forEach((n,i)=>near(n,g.bounds.max[i]));
    assert.ok(s.metrics.triangles>g.metrics.triangles*1.5,r.id);assert.ok(g.bounds.max[0]-g.bounds.min[0]<240);
    for(const b of[...g.batches,...g.doorLeaves.flatMap(l=>l.batches)]){
      assert.equal(b.positions.length,b.normals.length);assert.equal(b.uvs.length,b.positions.length/3*2);
      for(const values of[b.positions,b.normals,b.uvs])assert.ok(values.every(Number.isFinite));
      for(let i=0;i<b.normals.length;i+=3)near(Math.hypot(...b.normals.slice(i,i+3)),1);
    }
  }
});
test('pitched and flat roof shells are positive closed surfaces without duplicate facets',()=>{
  const key=p=>p.map(n=>Math.round(n*1e6)).join(',');
  for(const m of meshes.values())for(const proof of m.roofProofs){
    const edges=new Map(),faces=new Set();let volume=0;
    for(const polygon of proof.faces){const k=polygon.map(key).sort().join('|');assert.equal(faces.has(k),false,'Duplicate roof face');faces.add(k);
      for(let i=0;i<polygon.length;i++){const k=[key(polygon[i]),key(polygon[(i+1)%polygon.length])].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}
      for(let i=1;i<polygon.length-1;i++)volume+=new T.Vector3(...polygon[0]).dot(new T.Vector3(...polygon[i]).cross(new T.Vector3(...polygon[i+1])))/6;
    }
    assert.ok(volume>0,proof.id+' nonpositive volume');assert.ok([...edges.values()].every(n=>n===2),proof.id+' unpaired roof edges');
  }
});
test('host adapter releases only owned resources and preserves borrowed textures and other models',()=>{
  const atlas=new T.Texture(),eraAtlas=new T.Texture();let textures=0;for(const t of[atlas,eraAtlas])t.addEventListener('dispose',()=>textures++);
  const a=createVariantModel(T,'cyclone-fence-6',{atlas,eraAtlas}),b=createVariantModel(T,'cyclone-fence-6',{atlas,eraAtlas});
  let disposed=0;a.root.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>disposed++);});a.dispose();a.dispose();assert.ok(disposed>0);assert.equal(textures,0);assert.ok(b.root.children.length);
  assert.throws(()=>a.setDoorsOpen(true),/disposed/);b.dispose();
});

test('accessible battlement roofs peel off for interior review and remain visible at a selected cutaway level',()=>{
  for(const id of['castle-gatehouse','castle-corner-tower','castle-fort-courtyard']){
    const model=createVariantModel(T,id),decks=model.root.children.filter(c=>c.userData.kind==='roof-terrace');assert.ok(decks.length);
    model.setView({roof:false});assert.ok(decks.every(c=>!c.visible));
    const level=Math.max(...decks.map(c=>c.userData.level));model.setView({roof:false,maxLevel:level});assert.ok(decks.some(c=>c.visible&&c.userData.level===level));
    model.dispose();
  }
  for(const id of['castle-roof-store','cyclone-roof-store']){const model=createVariantModel(T,id),guards=model.root.children.filter(c=>['roof-guards','roof-parapet'].includes(c.userData.kind));
    assert.ok(guards.length);model.setView({roof:false});assert.ok(guards.every(c=>!c.visible),'Roof guard floats after its roof is removed');model.dispose();}
});
test('all original source/export hashes, glTF materials and paired-gate animation channels are complete',()=>{
  const cat=JSON.parse(fs.readFileSync(new URL('../assets/fort-variants/catalogue.json',import.meta.url)));assert.equal(cat.assets.length,43);
  for(const item of[...cat.inputs,...cat.skins,cat.partsManifest,cat.connectorsManifest,...cat.assets.flatMap(r=>r.files)])
    assert.equal(sha(fs.readFileSync(new URL('../'+item.file,import.meta.url))),item.sha256,item.file);
  for(const r of cat.assets){
    const blueprintFile=r.files.find(f=>f.file.endsWith('.blueprint.json')).file,blueprint=JSON.parse(fs.readFileSync(new URL('../'+blueprintFile,import.meta.url))),rebuilt=buildVariantMesh(blueprint);
    assert.equal(rebuilt.metrics.triangles,r.engineGame.triangles,r.id+' blueprint readback');assert.deepEqual(rebuilt.bounds,r.bounds);
    const sculpt=JSON.parse(gunzipSync(fs.readFileSync(new URL('../art/fort-variants/sculpts/'+r.id+'.source-mesh.json.gz',import.meta.url))));assert.equal(sculpt.metrics.triangles,r.source.triangles);
    const base=new URL('../assets/fort-variants/'+(r.category==='part'?'parts/':'models/'),import.meta.url),g=JSON.parse(fs.readFileSync(new URL(r.id+'.gltf',base))),buffer=fs.readFileSync(new URL(r.id+'.bin',base));
    assert.equal(buffer.length,g.buffers[0].byteLength);for(const i of g.images)assert.ok(fs.existsSync(new URL(i.uri,base)));
    for(const mesh of g.meshes)for(const p of mesh.primitives){
      const a=g.accessors[p.indices],v=g.bufferViews[a.bufferView],count=g.accessors[p.attributes.POSITION].count;
      for(let i=0;i<a.count;i++)assert.ok(buffer.readUInt32LE(v.byteOffset+i*4)<count);
      const spec=VARIANT_MATERIALS[g.materials[p.material].name],u=g.accessors[p.attributes.TEXCOORD_0],view=g.bufferViews[u.bufferView];
      if(spec.tile!==null)for(let i=0;i<u.count;i++){
        const x=buffer.readFloatLE(view.byteOffset+i*8),y=buffer.readFloatLE(view.byteOffset+i*8+4),grid=spec.grid;
        assert.ok(x>=spec.tile%grid/grid-1e-6&&x<=(spec.tile%grid+1)/grid+1e-6);
        assert.ok(y>=Math.floor(spec.tile/grid)/grid-1e-6&&y<=(Math.floor(spec.tile/grid)+1)/grid+1e-6,'Atlas V origin differs from standard glTF');
      }
    }
    for(const animation of g.animations||[]){
      assert.equal(animation.channels.length,2);const sides=new Set();
      for(const channel of animation.channels){const n=g.nodes[channel.target.node];assert.equal(n.matrix,undefined);assert.ok(n.rotation&&n.translation);sides.add(n.extras.side);assert.equal(channel.target.path,'rotation');
        const sampler=animation.samplers[channel.sampler],a=g.accessors[sampler.output],v=g.bufferViews[a.bufferView];assert.equal(a.type,'VEC4');assert.equal(a.count,2);
        for(let i=0;i<2;i++)near(Math.hypot(...Array.from({length:4},(_,j)=>buffer.readFloatLE(v.byteOffset+(i*4+j)*4))),1);
      }assert.deepEqual([...sides].sort(),['left','right']);
    }
  }
});
