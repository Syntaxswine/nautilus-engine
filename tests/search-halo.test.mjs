import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SearchHalo, HALO_WIDTHS} from '../packages/render-effects/index.js';
import * as T from '../packages/render-effects/three.js';

function renderer() {
  return {
    size:new T.Vector2(390,844), ratio:1.75, target:null, face:0, mip:0,
    color:new T.Color(0x17241e), clearRGB:{r:23/255,g:36/255,b:30/255}, alpha:.8, autoClear:true,
    autoClearColor:false, autoClearDepth:false, autoClearStencil:false,
    toneMapping:T.NoToneMapping, shadowMap:{autoUpdate:true}, capabilities:{maxSamples:4},
    passes:[], clears:[], xr:{isPresenting:false}, clippingPlanes:[],
    getSize(out) { return out.copy(this.size); },
    getDrawingBufferSize(out) { return out.copy(this.size).multiplyScalar(this.ratio).floor(); },
    getPixelRatio() { return this.ratio; },
    getViewport(out) { return out.set(0,0,this.size.x,this.size.y); },
    getScissorTest() { return false; },
    getRenderTarget() { return this.target; },
    getActiveCubeFace() { return this.face; },
    getActiveMipmapLevel() { return this.mip; },
    setRenderTarget(target,face=0,mip=0) { this.target=target; this.face=face; this.mip=mip; },
    getClearColor(out) { return out.copy(this.color); },
    getClearAlpha() { return this.alpha; },
    setClearColor(color,alpha) { this.color.set(color); this.alpha=alpha; this.clearRGB=this.color.getRGB({},this.target?T.LinearSRGBColorSpace:T.SRGBColorSpace); },
    clear(...flags) { this.clears.push({target:this.target,flags,rgb:{...this.clearRGB}}); },
    render(scene) {
      scene.updateMatrixWorld(true);
      this.passes.push({target:this.target,scene,autoClear:this.autoClear});
      if (this.failAt===this.passes.length) throw Error('GPU fixture failure');
    }
  };
}

function fixture() {
  const halo=new SearchHalo(), r=renderer(), scene=new T.Scene(), camera=new T.Camera();
  scene.background=new T.Color(0x17241e);
  const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());
  scene.add(mesh); scene.updateMatrixWorld(true);
  return {halo,r,scene,camera,mesh,dispose() {halo.dispose();mesh.geometry.dispose();mesh.material.dispose();}};
}

test('effect entry shares the engine Three instance and has no game-policy exports', async()=>{
  const effect=await import('../packages/render-effects/index.js');
  const vendor=await import('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
  assert.equal(T.Mesh,vendor.Mesh); assert.equal(T.REVISION,'180');
  assert.equal((await import('@nautilus-engine/map-core/render-effects')).SearchHalo,SearchHalo);
  assert.equal((await import('@nautilus-engine/map-core/render-effects/three')).Mesh,T.Mesh);
  assert.deepEqual(Object.keys(effect).sort(),['HALO_WIDTHS','SearchHalo']);
  assert.deepEqual(HALO_WIDTHS,{standard:1,wide:1.75}); assert.ok(Object.isFrozen(HALO_WIDTHS));
  assert.equal(typeof globalThis.document,'undefined');
});

test('gold, edge and composite shader bodies retain the reviewed donor implementation',()=>{
  const pin=JSON.parse(fs.readFileSync(new URL('../upstream.json',import.meta.url))).searchHalo;
  const original=fs.readFileSync(new URL('../'+pin.root+'/sites/tactical-animal/dist/search-halo.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
  const adapted=fs.readFileSync(new URL('../packages/render-effects/search-halo.js',import.meta.url),'utf8');
  const shaders=original.slice(original.indexOf('const vertexShader='),original.indexOf('function actuallyVisible'));
  assert.ok(adapted.includes(shaders));
});

test('proxies borrow art/geometry, retire their materials and dispose only owned resources once',()=>{
  const {halo,mesh,dispose}=fixture(), texture=new T.Texture(); mesh.material.map=texture;
  let borrowed=0; for(const value of [texture,mesh.geometry,mesh.material])value.addEventListener('dispose',()=>borrowed++);
  halo.sync([{root:mesh,strength:.55}]); const record=halo.proxies.get(mesh);
  assert.equal(record.clone.geometry,mesh.geometry); assert.equal(record.clone.material.map,texture);
  let retired=0;record.clone.material.addEventListener('dispose',()=>retired++);
  halo.sync([{root:mesh,strength:1}]);assert.equal(halo.proxies.get(mesh),record);
  assert.equal(record.clone.material.userData.strength.value,1);
  mesh.visible=false;halo.sync([{root:mesh}]);assert.equal(halo.proxies.size,0);assert.equal(retired,1);assert.equal(borrowed,0);
  let owned=0;for(const value of [halo.field,halo.mask,halo.light,halo.edges,halo.composite,halo.quad.geometry])value.addEventListener('dispose',()=>owned++);
  halo.dispose();halo.dispose();assert.equal(owned,6);assert.equal(borrowed,0);
  dispose();texture.dispose();
});

test('material array growth/shrink, null groups, replacement geometry and alpha properties follow the source',()=>{
  const {halo,mesh,dispose}=fixture(), first=mesh.material, second=new T.MeshBasicMaterial(), oldGeometry=mesh.geometry;
  halo.sync([{root:mesh}]);const record=halo.proxies.get(mesh), retired=[];
  record.materials[0].addEventListener('dispose',()=>retired.push('single'));
  mesh.material=[first,second];halo.sync([{root:mesh}]);assert.equal(record.materials.length,2);assert.deepEqual(retired,['single']);
  record.materials.forEach(material=>material.addEventListener('dispose',()=>retired.push('array')));
  const map=new T.Texture(), alphaMap=new T.Texture();
  first.map=map;first.alphaMap=alphaMap;first.alphaTest=.4;first.side=T.DoubleSide;first.opacity=.7;first.vertexColors=true;
  mesh.material=first;mesh.geometry=new T.SphereGeometry();halo.sync([{root:mesh}]);
  assert.equal(retired.length,3);assert.equal(record.materials.length,1);assert.equal(record.clone.material,record.materials[0]);
  for(const key of ['map','alphaMap','alphaTest','side','opacity','vertexColors'])assert.equal(record.clone.material[key],first[key]);
  assert.equal(record.clone.geometry,mesh.geometry);
  mesh.material=[first,null];halo.sync([{root:mesh}]);assert.equal(record.materials[1].visible,false);
  mesh.material=first;dispose();second.dispose();oldGeometry.dispose();map.dispose();alphaMap.dispose();
});

test('sprites follow changed artwork, centers, rotation and attenuation without owning the source texture',()=>{
  const halo=new SearchHalo(), sprite=new T.Sprite(new T.SpriteMaterial()), texture=new T.Texture(), alpha=new T.Texture();
  halo.sync([{root:sprite}]);const record=halo.proxies.get(sprite);
  sprite.center.set(.1,.9);Object.assign(sprite.material,{map:texture,alphaMap:alpha,alphaTest:.2,rotation:.7,sizeAttenuation:false});
  halo.sync([{root:sprite}]);assert.equal(halo.proxies.get(sprite),record);
  assert.deepEqual(record.clone.center.toArray(),[.1,.9]);assert.equal(record.clone.material.rotation,.7);assert.equal(record.clone.material.sizeAttenuation,false);
  assert.equal(record.clone.material.alphaMap,alpha);assert.equal(record.clone.material.map,texture);
  halo.dispose();sprite.material.dispose();texture.dispose();alpha.dispose();
});

test('manual world matrices, live poses and replaced skin bindings stay borrowed and current',()=>{
  const halo=new SearchHalo(), geometry=new T.BoxGeometry(), material=new T.MeshBasicMaterial(), body=new T.SkinnedMesh(geometry,material), bone=new T.Bone();
  body.add(bone);const skeleton=new T.Skeleton([bone]);body.bind(skeleton);body.matrixWorldAutoUpdate=false;
  body.matrixWorld.makeTranslation(1,2,3);halo.sync([{root:body}]);const proxy=halo.proxies.get(body).clone;
  body.matrixWorld.makeTranslation(4,5,6);body.morphTargetInfluences=[.3];body.bindMatrix.makeTranslation(2,0,0);halo.sync([{root:body}]);halo.maskScene.updateMatrixWorld(true);
  assert.deepEqual(new T.Vector3().setFromMatrixPosition(proxy.matrixWorld).toArray(),[4,5,6]);
  assert.equal(proxy.skeleton,skeleton);assert.equal(proxy.morphTargetInfluences,body.morphTargetInfluences);
  assert.deepEqual(proxy.bindMatrix.toArray(),body.bindMatrix.toArray());assert.notEqual(proxy.bindMatrixInverse,body.bindMatrixInverse);
  let disposed=0;skeleton.dispose=()=>disposed++;halo.dispose();assert.equal(disposed,0);geometry.dispose();material.dispose();
});

test('the two approved widths use independent masks and reuse targets and materials',()=>{
  const {halo,r,scene,camera,mesh,dispose}=fixture(), sprite=new T.Sprite(new T.SpriteMaterial()), visible=[];
  scene.add(sprite);const render=r.render.bind(r);r.render=pass=>{if(pass===halo.maskScene)visible.push([...halo.proxies].filter(([,record])=>record.clone.visible).map(([source])=>source));render(pass);};
  const targets=[{root:mesh,width:HALO_WIDTHS.wide},{root:sprite,width:HALO_WIDTHS.standard}];
  halo.render(r,scene,camera,targets,3000);assert.deepEqual(visible,[[sprite],[mesh]]);assert.equal(r.passes.length,6);
  const materials=[...halo.proxies.values()].flatMap(record=>record.materials), field=halo.field;
  halo.render(r,scene,camera,targets,4000);assert.equal(halo.field,field);assert.deepEqual([...halo.proxies.values()].flatMap(record=>record.materials),materials);
  dispose();sprite.material.dispose();
});

test('motion uses supplied milliseconds; reduced motion freezes the field; no targets renders once',()=>{
  const {halo,r,scene,camera,mesh,dispose}=fixture();let reduced=false;halo.reducedMotion=()=>reduced;
  halo.render(r,scene,camera,[{root:mesh}],1000);assert.equal(halo.time.value,1);assert.equal(r.passes.length,4);
  halo.render(r,scene,camera,[{root:mesh}],3000);assert.equal(halo.time.value,3);reduced=true;
  halo.render(r,scene,camera,[{root:mesh}],9000);assert.equal(halo.time.value,0);
  r.passes=[];halo.render(r,scene,camera,[],10000);assert.equal(r.passes.length,1);assert.equal(halo.proxies.size,0);
  halo.render(r,scene,camera,[{root:mesh,strength:0}],10000);assert.equal(halo.proxies.size,0);dispose();
});

test('CSS and DPR resizing updates the mask even when physical drawing dimensions stay constant',()=>{
  const {halo,r,scene,camera,mesh,dispose}=fixture();r.size.set(200,200);r.ratio=2;
  halo.render(r,scene,camera,[{root:mesh}],0);assert.equal(halo.field.width,400);assert.equal(halo.mask.width,150);
  r.size.set(400,400);r.ratio=1;halo.render(r,scene,camera,[{root:mesh}],0);
  assert.equal(halo.field.width,400);assert.equal(halo.mask.width,300);assert.deepEqual(halo.logicalSize.value.toArray(),[400,400]);
  r.size.set(390,844);r.ratio=1.75;halo.render(r,scene,camera,[{root:mesh}],0);
  assert.equal(halo.field.width,682);assert.equal(halo.mask.width,293);assert.equal(halo.mask.height,633);dispose();
});

test('owned targets clear every frame independently of all caller auto-clear flags',()=>{
  const {halo,r,scene,camera,mesh,dispose}=fixture();r.autoClear=false;
  for(let frame=0;frame<2;frame++){mesh.position.x=frame;halo.render(r,scene,camera,[{root:mesh}],frame*1000);}
  assert.equal(r.clears.length,6);for(const target of [halo.field,halo.mask,halo.light])assert.equal(r.clears.filter(clear=>clear.target===target).length,2);
  assert.ok(r.clears.every(clear=>clear.flags.every(Boolean)));
  for(const clear of r.clears.filter(clear=>clear.target===halo.field))assert.deepEqual(clear.rgb,r.color.getRGB({},T.LinearSRGBColorSpace),'offscreen clear uses linear color, independently of the prior canvas output');
  assert.equal(r.autoClear,false);assert.equal(r.autoClearColor,false);assert.equal(r.autoClearDepth,false);assert.equal(r.autoClearStencil,false);
  assert.equal(r.color.getHex(),0x17241e);assert.equal(r.alpha,.8);dispose();
});

test('success and a failed mask pass restore the full supported output and renderer state',()=>{
  const {halo,r,scene,camera,mesh,dispose}=fixture();const output=new T.WebGLRenderTarget(682,1477);r.target=output;r.shadowMap.autoUpdate=false;
  halo.render(r,scene,camera,[{root:mesh}],0);assert.equal(r.target,output);assert.equal(r.face,0);assert.equal(r.mip,0);
  r.passes=[];r.failAt=2;assert.throws(()=>halo.render(r,scene,camera,[{root:mesh}],0),/GPU fixture failure/);
  assert.equal(r.target,output);assert.equal(r.face,0);assert.equal(r.mip,0);assert.equal(r.autoClear,true);
  assert.equal(r.color.getHex(),0x17241e);assert.equal(r.alpha,.8);assert.equal(r.shadowMap.autoUpdate,false);dispose();output.dispose();
});

test('unsupported output pipelines fail explicitly instead of changing scene color or clipping',()=>{
  const {halo,r,scene,camera,mesh,dispose}=fixture();r.toneMapping=T.ACESFilmicToneMapping;
  assert.throws(()=>halo.render(r,scene,camera,[{root:mesh}],0),/NoToneMapping/);assert.equal(r.passes.length,0);
  r.toneMapping=T.NoToneMapping;r.capabilities.logarithmicDepthBuffer=true;assert.throws(()=>halo.render(r,scene,camera,[{root:mesh}],0),/standard depth/);
  r.capabilities.logarithmicDepthBuffer=false;r.capabilities.reversedDepthBuffer=true;assert.throws(()=>halo.render(r,scene,camera,[{root:mesh}],0),/standard depth/);
  r.capabilities.reversedDepthBuffer=false;const target=new T.WebGLCubeRenderTarget(682);r.target=target;r.face=3;
  assert.throws(()=>halo.render(r,scene,camera,[{root:mesh}],0),/2D target/);assert.equal(r.face,3);assert.equal(r.target,target);
  r.target=null;r.face=0;r.getScissorTest=()=>true;assert.throws(()=>halo.render(r,scene,camera,[{root:mesh}],0),/full viewport/);
  dispose();target.dispose();
});

test('unsupported batched/instanced/custom silhouettes reject before allocating proxies',()=>{
  const halo=new SearchHalo(), root=new T.Group(), geometry=new T.BoxGeometry(), material=new T.MeshBasicMaterial(), ordinary=new T.Mesh(geometry,material), instance=new T.InstancedMesh(geometry,material,1);
  root.add(ordinary,instance);assert.throws(()=>halo.sync([{root}]),/instanced or batched/);assert.equal(halo.proxies.size,0);
  root.remove(instance);ordinary.isBatchedMesh=true;assert.throws(()=>halo.sync([{root}]),/instanced or batched/);assert.equal(halo.proxies.size,0);
  delete ordinary.isBatchedMesh;material.onBeforeCompile=()=>{};assert.throws(()=>halo.sync([{root}]),/custom shaders/);assert.equal(halo.proxies.size,0);
  halo.dispose();geometry.dispose();material.dispose();instance.dispose();
});

test('transparent output rejects explicitly while an opaque Color background supports saved clear alpha',()=>{
  const {halo,r,scene,camera,mesh,dispose}=fixture();scene.background=null;r.alpha=0;
  assert.throws(()=>halo.render(r,scene,camera,[{root:mesh}],0),/opaque scene coverage/);assert.equal(r.passes.length,0);
  scene.background=new T.Color(0x17241e);halo.render(r,scene,camera,[{root:mesh}],0);assert.equal(r.alpha,0);dispose();
});

test('auto-updating LOD roots and ancestors reject before masks can disagree with the scene',()=>{
  const halo=new SearchHalo(), lod=new T.LOD(), near=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()), far=new T.Mesh(near.geometry,near.material), camera=new T.PerspectiveCamera();
  lod.addLevel(near,0);lod.addLevel(far,10);camera.position.z=5;camera.updateMatrixWorld(true);lod.updateMatrixWorld(true);lod.update(camera);
  assert.throws(()=>halo.sync([{root:lod}]),/LOD/);assert.throws(()=>halo.sync([{root:near}]),/LOD/);assert.equal(halo.proxies.size,0);
  lod.autoUpdate=false;camera.position.z=20;camera.updateMatrixWorld(true);lod.update(camera);halo.sync([{root:lod}]);
  assert.equal(halo.proxies.has(near),false);assert.equal(halo.proxies.has(far),true);halo.dispose();near.geometry.dispose();near.material.dispose();
});
