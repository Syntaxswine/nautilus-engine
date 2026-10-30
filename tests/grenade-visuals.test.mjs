import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as T from '../packages/render-effects/three.js';
import {createLightHorse} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-light-model.js';
import {createGrenadeModel,createNativeGrenadePresentation,GRENADE_PRESENTATION_MARKERS,grenadeVisualResourceURLs} from '../packages/grenade-visuals/three.js';
const data=JSON.parse(fs.readFileSync(new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-10k-data.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
const close=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const placement={x:0,y:0,h:0,headingRad:0};
const frame=(time,projectile=time<1.92?null:{state:'flying',x:0,y:0,h:1.1},actor=placement)=>({elapsedSeconds:time,actor,projectile});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tracked=()=>{const texture=new T.Texture();let disposals=0;texture.addEventListener('dispose',()=>disposals++);return {texture,get disposals(){return disposals;}};};
function paint({texture}){const material=new T.MeshBasicMaterial({map:texture});return {material,dispose(){material.dispose();texture.dispose();}};}
const options=extra=>({presentationId:'["grenade","committed-command:1"]',horseData:data,loadTexture:async()=>new T.Texture(),preparePaint:paint,...extra});
const casing=root=>{const out=[];root.traverse(object=>{if(object.isMesh&&['painted casing panels','dark shell beneath painted panels','metal collar'].includes(object.name))out.push(object);});return out;};
function skin(worker){const arrays=worker.parts.flatMap(part=>['skinIndex','skinWeight'].map(key=>{const a=part.geometry.attributes[key].array;return Buffer.from(a.buffer,a.byteOffset,a.byteLength);}));return sha(Buffer.concat(arrays));}
function rendererStub(render){
 const state={target:{borrowed:true},color:new T.Color(0x336699),alpha:.4,viewport:new T.Vector4(1,2,300,400),scissor:new T.Vector4(3,4,200,100),scissorTest:false};
 return {capabilities:{getMaxAnisotropy:()=>4},outputColorSpace:T.SRGBColorSpace,toneMapping:T.ACESFilmicToneMapping,
  getRenderTarget:()=>state.target,setRenderTarget:value=>{state.target=value;},getClearColor:target=>target.copy(state.color),getClearAlpha:()=>state.alpha,setClearColor:(value,alpha)=>{state.color.set(value);state.alpha=alpha;},
  getViewport:target=>target.copy(state.viewport),setViewport:(...args)=>{args[0]?.isVector4?state.viewport.copy(args[0]):state.viewport.set(...args);},getScissor:target=>target.copy(state.scissor),setScissor:(...args)=>{args[0]?.isVector4?state.scissor.copy(args[0]):state.scissor.set(...args);},getScissorTest:()=>state.scissorTest,setScissorTest:value=>{state.scissorTest=value;},getPixelRatio:()=>2,clear(){},render,
  snapshot(){return {target:state.target,color:state.color.getHex(),alpha:state.alpha,viewport:state.viewport.toArray(),scissor:state.scissor.toArray(),scissorTest:state.scissorTest,space:this.outputColorSpace,tone:this.toneMapping};}};
}
const validTexture=()=>{const value=tracked();value.texture.image={width:2,height:2};value.texture.userData.paintValidity=new Uint8Array(4).fill(255);return value;};

test('immutable source inputs, generated adapter and horse-only balance retain exact provenance',async()=>{
 const base='vendor/farmyard-grenade-visuals/251bf8094b5f9ebe44208443084c1a6d6658512a/',manifest=JSON.parse(fs.readFileSync(base+'provenance.json'));
 assert.equal(manifest.files.length,2);for(const file of manifest.files){const bytes=fs.readFileSync(base+file.path);assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256);}
 const source=fs.readFileSync(base+'tactics/grenade-throw-motion.js','utf8'),generated=fs.readFileSync('packages/grenade-visuals/throw-motion.js','utf8');
 assert.equal(generated.slice(generated.indexOf('\n')+1),source.replace("import * as T from './vendor/three.module.js';","import * as T from '../render-effects/three.js';").replace(/\r\n/g,'\n'));
 const original=JSON.parse(fs.readFileSync(base+'tactics/grenade-prepared.js','utf8').match(/export const GRENADE_PREPARED\s*=\s*(\{[\s\S]*\});\s*$/)[1]);
 const {HORSE_BALANCE}=await import('../packages/grenade-visuals/horse-balance.js');assert.deepEqual(HORSE_BALANCE,original.horse.balance);assert.equal(HORSE_BALANCE.rows.length,1841);
 assert.equal(Object.keys(grenadeVisualResourceURLs()).length,3);
});

test('prop-only public path has no horse, paint projection, throw, clock, DOM or network dependency',()=>{
 const code=`import {registerHooks} from 'node:module';import * as T from './packages/render-effects/three.js';registerHooks({resolve(s,c,n){if(/horse-|throw-motion|horse-balance/.test(s))throw Error('Unexpected actor dependency '+s);return n(s,c);}});for(const name of ['document','fetch','requestAnimationFrame','setTimeout'])Object.defineProperty(globalThis,name,{get(){throw Error('Unexpected '+name);}});const api=await import('./packages/grenade-visuals/three.js');const borrowed=new T.Texture();let disposed=0;borrowed.addEventListener('dispose',()=>disposed++);const prop=await api.createGrenadeModel({texture:borrowed});if(prop.triangles!==820||prop.parts.length!==5||!(prop.root instanceof T.Group))throw Error('Wrong native prop/Three');prop.dispose();prop.dispose();if(disposed)throw Error('Borrowed paint disposed');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
});

test('native prop owns its model and cloned paint while borrowed paint survives unchanged',async()=>{
 const input=tracked(),wrap=input.texture.wrapS,colorSpace=input.texture.colorSpace,prop=await createGrenadeModel({texture:input.texture});
 assert.equal(prop.triangles,820);assert.equal(prop.parts.length,5);assert.deepEqual(prop.anchors.grip.position.toArray(),[0,0,.016]);
 const bounds=new T.Box3().setFromObject(prop.root),size=bounds.getSize(new T.Vector3());close(size.x,.08173276484);close(size.y,.11100000143);close(size.z,.07494000345);
 assert.equal(input.texture.wrapS,wrap);assert.equal(input.texture.colorSpace,colorSpace);assert.notEqual(prop.parts[0].material.map,input.texture);
 let geometryDisposals=0;for(const part of prop.parts)part.geometry.addEventListener('dispose',()=>geometryDisposals++);
 prop.dispose();prop.dispose();assert.equal(geometryDisposals,5);assert.equal(input.disposals,0);assert.equal(prop.diagnostics().disposed,true);input.texture.dispose();
});

test('native horse choreography fits measured grip/markers and uses elapsed host time through repeated seeks',async()=>{
 const visual=await createNativeGrenadePresentation(options());
 try{
  assert.deepEqual(GRENADE_PRESENTATION_MARKERS,{pin:.5,drop:.7,plant:1.6,release:1.92,lever:1.945,duration:4.6});
  for(let i=0;i<=138;i++){const time=i/30,state=visual.seek(frame(time));assert.deepEqual(state.nativeScale,[1,1,1]);if(time<1.92)assert.ok(state.heldGripErrorM<1e-6);}
  const first=visual.seek(frame(1.92));for(const time of [.5,3.9,0,1.92,1.92,2.14])visual.seek(frame(time));assert.deepEqual(visual.seek(frame(1.92)),first);
  close(first.releasePoint[0],.1245299924418055);close(first.releasePoint[1],1.5672673578529783);close(first.releasePoint[2],.256339231376974);
  assert.equal(first.presentationId,'["grenade","committed-command:1"]');assert.equal(first.cosmeticOnly,true);
 }finally{visual.dispose();}
 assert.throws(()=>visual.seek(frame(0)),/disposed/);visual.dispose();
});

test('one casing preserves native release pose, cosmetic blending never changes the supplied arc, and ended hides it',async()=>{
 const visual=await createNativeGrenadePresentation(options()),parent=new T.Group(),sibling=new T.Group();parent.position.set(10,2,-3);parent.rotation.y=.4;parent.add(sibling,visual.root);
 try{
  const meshes=casing(visual.root),ids=meshes.map(mesh=>mesh.uuid).sort();assert.equal(ids.length,3);
  visual.seek(frame(1.92-1e-7));const held=visual.root.getObjectByName('Painted fragmentation grenade'),before=held.getWorldPosition(new T.Vector3()),qBefore=held.getWorldQuaternion(new T.Quaternion());
  const input=Object.freeze({elapsedSeconds:1.92,actor:Object.freeze({...placement}),projectile:Object.freeze({state:'flying',x:0,y:0,h:1.1})}),at=visual.seek(input),released=visual.root.getObjectByName('single-released-casing');
  assert.ok(released.getWorldPosition(new T.Vector3()).distanceTo(before)<1e-5);assert.ok(released.getWorldQuaternion(new T.Quaternion()).angleTo(qBefore)<1e-4);
  assert.equal(at.cosmeticBlend,0);assert.deepEqual(at.authoritativePoint,[0,1.1,0]);assert.deepEqual(input.projectile,{state:'flying',x:0,y:0,h:1.1});
  const half=visual.seek(frame(1.98));close(half.cosmeticBlend,.5);for(let axis=0;axis<3;axis++)close(half.renderedPoint[axis],(half.releasePoint[axis]+half.authoritativePoint[axis])/2);
  const done=visual.seek(frame(2.04));close(done.cosmeticBlend,1);assert.deepEqual(done.renderedPoint,[0,1.1,0]);assert.equal(done.visibleCasingMeshes,3);
  assert.equal(visual.seek(frame(2.04,{state:'ended'})).visibleCasingMeshes,0);assert.equal(released.visible,false);
  visual.seek(frame(0));assert.deepEqual(casing(visual.root).map(mesh=>mesh.uuid).sort(),ids);assert.ok(meshes.every(mesh=>mesh.parent===held));assert.equal(parent.children[0],sibling);assert.equal(parent.children[1],visual.root);
 }finally{visual.dispose();}
 assert.equal(parent.children.length,1);
});

test('transformed retained parent and quarter-turned elevated actor preserve root-local inputs and native world placement',async()=>{
 const visual=await createNativeGrenadePresentation(options()),actor={x:20,y:14,h:4.24,headingRad:Math.PI/2},parent=new T.Group();parent.position.set(9,3,-4);parent.rotation.y=.3;parent.add(visual.root);
 try{const value=visual.seek(frame(1.92,{state:'flying',x:20,y:14,h:5.34},actor));close(value.releasePoint[0],20-.256339231376974);close(value.releasePoint[1],4.24+1.5672673578529783);close(value.releasePoint[2],14+.1245299924418055);assert.deepEqual(value.authoritativePoint,[20,5.34,14]);assert.equal(value.coordinateFrame,'presentation-root-local');assert.deepEqual(visual.root.scale.toArray(),[1,1,1]);const expected=visual.root.localToWorld(new T.Vector3(...value.renderedPoint)),actual=visual.root.getObjectByName('single-released-casing').getWorldPosition(new T.Vector3());assert.ok(expected.distanceTo(actual)<1e-8);close(actual.y,3+4.24+1.5672673578529783);}finally{visual.dispose();}
});

test('malformed frames preserve the last valid view; no demo trajectory is substituted',async()=>{
 const visual=await createNativeGrenadePresentation(options());try{
  const expected=visual.seek(frame(1.6)),before=new T.Box3().setFromObject(visual.root);
  for(const bad of [frame(NaN),frame(-1),{...frame(2),projectile:null},frame(2,{state:'flying',x:1,y:2,h:Infinity}),frame(0,null,{...placement,headingRad:NaN})])assert.throws(()=>visual.seek(bad));
  const after=new T.Box3().setFromObject(visual.root);assert.deepEqual(before,after);assert.deepEqual(visual.diagnostics().releasePoint,expected.releasePoint);
  visual.root.scale.setScalar(.5);assert.throws(()=>visual.seek(frame(0)),/unit scale/);visual.root.scale.setScalar(1);
 }finally{visual.dispose();}
});

test('borrowed actor lease restores native skin, equipment, pose, parent order and controller without disposing host resources',async()=>{
 const worker=createLightHorse(structuredClone(data)),scene=new T.Group(),before=new T.Group(),after=new T.Group(),input=tracked();worker.pose('carry',25);scene.position.set(8,4,9);scene.rotation.y=.8;scene.add(before,worker.root,after);worker.root.position.set(2,0,3);scene.updateMatrixWorld(true);
 const originalSkin=skin(worker),position=worker.root.position.clone(),quaternion=worker.root.quaternion.clone(),equipment=worker.weapon;let acquired=0,released=0,geometryDisposed=0;for(const part of worker.parts)part.geometry.addEventListener('dispose',()=>geometryDisposed++);
 const visual=await createNativeGrenadePresentation({presentationId:'opaque:[1,2]',grenadeTexture:input.texture,borrowedActor:{species:'horse',worker,acquireController(){acquired++;return ()=>released++;}},loadJSON(){throw Error('Borrowed actor data loaded');},preparePaint(){throw Error('Borrowed actor paint replaced');}});
 visual.seek(frame(1.7));assert.equal(acquired,1);assert.notEqual(worker.weapon,equipment);assert.notEqual(skin(worker),originalSkin);
 visual.dispose();visual.dispose();assert.equal(released,1);assert.equal(worker.weapon,equipment);assert.equal(skin(worker),originalSkin);assert.deepEqual(worker.root.position,position);assert.deepEqual(worker.root.quaternion.toArray(),quaternion.toArray());assert.deepEqual(scene.children,[before,worker.root,after]);assert.equal(geometryDisposed,0);assert.equal(input.disposals,0);
 worker.dispose();worker.skeleton.dispose();input.texture.dispose();
});

test('a failed load rejects promptly and disposes late owned textures before constructing an actor',async()=>{
 const horse=deferred(),grenade=deferred(),started=deferred();let requests=0;
 const task=createNativeGrenadePresentation(options({horseData:undefined,loadJSON:async()=>{throw Error('JSON unavailable');},loadTexture:(_,{kind})=>{if(++requests===2)started.resolve();return kind==='horsePaint'?horse.promise:grenade.promise;}}));
 await assert.rejects(task,/JSON unavailable/);await started.promise;const a=tracked(),b=tracked();horse.resolve(a.texture);grenade.resolve(b.texture);await new Promise(resolve=>setImmediate(resolve));assert.equal(a.disposals,1);assert.equal(b.disposals,1);
});

test('malformed native resource data rejects before body construction and retires acquired textures',async()=>{
 const wrongIndex=structuredClone(data);wrongIndex.parts[0].index[0]=1e9;const wrongNormal=structuredClone(data);wrongNormal.parts[0].normal[0]=NaN;
 for(const bad of [{triangles:10300,parts:[null]},wrongIndex,wrongNormal]){const inputs=[];await assert.rejects(createNativeGrenadePresentation(options({horseData:bad,loadTexture:async()=>{const value=tracked();inputs.push(value);return value.texture;}})),/complete pinned native/);assert.ok(inputs.every(input=>input.disposals===1));}
});

test('abort during loading rejects before loaders finish and late results clean up once',async()=>{
 const pending=[],started=deferred(),controller=new AbortController();const task=createNativeGrenadePresentation(options({signal:controller.signal,loadTexture:()=>{const value=deferred();pending.push(value);if(pending.length===2)started.resolve();return value.promise;}}));
 await started.promise;controller.abort();await assert.rejects(task,{name:'AbortError'});const values=pending.map(()=>tracked());pending.forEach((item,i)=>item.resolve(values[i].texture));await new Promise(resolve=>setImmediate(resolve));assert.ok(values.every(value=>value.disposals===1));
});

test('already-cancelled preparation performs no loads or actor acquisition',async()=>{
 const controller=new AbortController();controller.abort();let loads=0;
 await assert.rejects(createGrenadeModel({signal:controller.signal,loadTexture(){loads++;}}),{name:'AbortError'});
 await assert.rejects(createNativeGrenadePresentation(options({signal:controller.signal,loadTexture(){loads++;}})),{name:'AbortError'});assert.equal(loads,0);
});

test('default texture loader retires its placeholder on abort and ignores a late onLoad',async()=>{
 const original=T.TextureLoader.prototype.load,started=deferred(),controller=new AbortController();let finish,input;
 T.TextureLoader.prototype.load=function(_url,onLoad){input=tracked();finish=()=>onLoad(input.texture);started.resolve();return input.texture;};
 try{const task=createGrenadeModel({signal:controller.signal});await started.promise;controller.abort();await assert.rejects(task,{name:'AbortError'});assert.equal(input.disposals,1);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(input.disposals,1);}finally{T.TextureLoader.prototype.load=original;}
});

test('late paint preparation releases its resources and cannot remount a cancelled actor',async()=>{
 const ready=deferred(),late=deferred(),controller=new AbortController(),textures=[];let actor,paintDisposals=0;
 const task=createNativeGrenadePresentation(options({signal:controller.signal,loadTexture:async()=>{const value=tracked();textures.push(value);return value.texture;},preparePaint:({worker,texture})=>{actor=worker;ready.resolve();return late.promise.then(()=>({material:new T.MeshBasicMaterial(),dispose(){paintDisposals++;texture.dispose();this.material.dispose();}}));}}));
 await ready.promise;controller.abort();await assert.rejects(task,{name:'AbortError'});assert.equal(actor.root.parent,null);late.resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(paintDisposals,1);assert.ok(textures.every(value=>value.disposals===1));assert.equal(actor.root.parent,null);
});

test('borrowed controller and pose restore even if source setup fails; abort after readiness retires the visual',async()=>{
 const worker=createLightHorse(structuredClone(data)),scene=new T.Group();scene.add(worker.root);const before=skin(worker),equipment=worker.weapon,pose=worker.pose;let released=0;
 worker.pose=function(...args){pose(...args);throw Error('Source setup failure');};
 await assert.rejects(createNativeGrenadePresentation({presentationId:'failed',grenadeTexture:new T.Texture(),borrowedActor:{species:'horse',worker,acquireController:()=>()=>released++}}),/Source setup failure/);
 assert.equal(released,1);assert.equal(worker.root.parent,scene);assert.equal(worker.weapon,equipment);assert.equal(skin(worker),before);worker.pose=pose;worker.dispose();worker.skeleton.dispose();
 const controller=new AbortController(),visual=await createNativeGrenadePresentation(options({signal:controller.signal}));controller.abort();assert.equal(visual.diagnostics().disposed,true);assert.throws(()=>visual.seek(frame(0)),/disposed/);visual.dispose();
});

test('two native instances have independent poses and owned resources while shared input textures/data survive',async()=>{
 const input=tracked(),dataHash=sha(JSON.stringify(data)),settings=options({horseTexture:input.texture,grenadeTexture:input.texture,loadTexture(){throw Error('Borrowed paint loaded again');}}),a=await createNativeGrenadePresentation(settings),b=await createNativeGrenadePresentation({...settings,presentationId:'second'});
 try{const bBefore=b.seek(frame(.7));a.seek(frame(2.1));assert.deepEqual(b.diagnostics().releasePoint,bBefore.releasePoint);assert.notEqual(casing(a.root)[0].geometry,casing(b.root)[0].geometry);a.dispose();assert.equal(input.disposals,0);assert.equal(b.seek(frame(1.2)).phase,'Turn & load');assert.equal(sha(JSON.stringify(data)),dataHash);}finally{a.dispose();b.dispose();}
 assert.equal(input.disposals,0);input.texture.dispose();
});

test('seeking and restoring use no timer, wall clock, animation callback or gameplay release callback',()=>{
 const code=`import fs from 'node:fs';import * as T from './packages/render-effects/three.js';import {createNativeGrenadePresentation} from './packages/grenade-visuals/three.js';const data=JSON.parse(fs.readFileSync('./vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-10k-data.json'));let events=0;const v=await createNativeGrenadePresentation({presentationId:'restore',horseData:data,horseTexture:new T.Texture(),grenadeTexture:new T.Texture(),preparePaint:({texture})=>({material:new T.MeshBasicMaterial(),dispose(){this.material.dispose();texture.dispose();}}),onRelease(){events++;}});for(const key of ['performance','requestAnimationFrame','setTimeout','setInterval'])Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('Unexpected '+key);}});Date.now=()=>{throw Error('Unexpected wall clock');};for(const t of [1.92,.5,4.6,1.92])v.seek({elapsedSeconds:t,actor:{x:0,y:0,h:0,headingRad:0},projectile:t<1.92?null:{state:'flying',x:0,y:0,h:1.1}});v.dispose();if(events)throw Error('Gameplay callback invoked');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
});

test('default native paint uses the existing shader/projection and restores the borrowed renderer',async()=>{
 let draws=0;const renderer=rendererStub(()=>draws++),before=renderer.snapshot(),inputs=[];
 const visual=await createNativeGrenadePresentation(options({renderer,preparePaint:undefined,loadTexture:async()=>{const value=validTexture();inputs.push(value);return value.texture;}}));
 try{assert.equal(draws,4);assert.deepEqual(renderer.snapshot(),before);const body=visual.root.getObjectByName('native-horse');let painted=0;body.traverse(object=>{if(object.isSkinnedMesh){assert.equal(object.material.isMeshStandardMaterial,true);assert.ok(object.geometry.attributes.paintPart);painted++;}});assert.ok(painted>0);}finally{visual.dispose();}
 assert.ok(inputs.every(input=>input.disposals===1));assert.deepEqual(renderer.snapshot(),before);
});

test('failed native paint draw restores renderer state and releases projection, depth, materials and acquired paint',async()=>{
 const inputs=[],renderer=rendererStub(scene=>{for(const mesh of scene.children)mesh.material.addEventListener('dispose',()=>materialDisposals++);throw Error('Projection draw failed');}),before=renderer.snapshot();let materialDisposals=0,targetDisposals=0,depthDisposals=0;
 const originalTarget=T.WebGLRenderTarget.prototype.dispose,originalDepth=T.DepthTexture.prototype.dispose;
 T.WebGLRenderTarget.prototype.dispose=function(){targetDisposals++;originalTarget.call(this);};T.DepthTexture.prototype.dispose=function(){depthDisposals++;originalDepth.call(this);};
 try{await assert.rejects(createNativeGrenadePresentation(options({renderer,preparePaint:undefined,loadTexture:async()=>{const value=validTexture();inputs.push(value);return value.texture;}})),/Projection draw failed/);}finally{T.WebGLRenderTarget.prototype.dispose=originalTarget;T.DepthTexture.prototype.dispose=originalDepth;}
 assert.deepEqual(renderer.snapshot(),before);assert.equal(targetDisposals,1);assert.equal(depthDisposals,1);assert.ok(materialDisposals>0);assert.ok(inputs.every(input=>input.disposals===1));
});

test('borrowed cached paint validity remains typed in private clones and the host mask survives unchanged',async()=>{
 const horse=validTexture(),grenade=validTexture(),renderer=rendererStub(()=>{}),original=horse.texture.userData.paintValidity;
 const visual=await createNativeGrenadePresentation(options({renderer,preparePaint:undefined,horseTexture:horse.texture,grenadeTexture:grenade.texture,loadTexture(){throw Error('Borrowed paints must not load again');}}));
 try{let material;visual.root.traverse(object=>{if(object.isSkinnedMesh)material=object.material;});const shader={uniforms:{},vertexShader:'void main(){}',fragmentShader:'void main(){}'};material.onBeforeCompile(shader);const mask=shader.uniforms.uPaintMask.value.image.data;assert.ok(mask instanceof Uint8Array);assert.notEqual(mask,original);assert.deepEqual(mask,original);assert.equal(horse.texture.userData.paintValidity,original);}finally{visual.dispose();}
 assert.equal(horse.disposals,0);assert.equal(grenade.disposals,0);assert.deepEqual(original,new Uint8Array(4).fill(255));horse.texture.dispose();grenade.texture.dispose();
});
