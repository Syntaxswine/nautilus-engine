// Optional presentation only. One shared Three; no game, clock or authority imports.
import * as T from '../render-effects/three.js';

export const GRENADE_PRESENTATION_MARKERS = Object.freeze({pin:.50,drop:.70,plant:1.60,release:1.92,lever:1.945,duration:4.6});
export const GRENADE_VISUAL_RESOURCE_PATHS = Object.freeze({
  horseData:'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-10k-data.json',
  horsePaint:'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/assets/characters/lowpoly-proof/horse-worker-model-paint-v1.png',
  grenadePaint:'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/assets/equipment/painted-ui/grenade-surface.png'
});
export function grenadeVisualResourceURLs(){return Object.fromEntries(Object.entries(GRENADE_VISUAL_RESOURCE_PATHS).map(([key,value])=>[key,new URL('../../'+value,import.meta.url).href]));}
const abortError=()=>Object.assign(new Error('Grenade visual preparation was cancelled.'),{name:'AbortError'});
const finite=(value,name)=>{if(!Number.isFinite(value))throw new TypeError(name+' must be finite.');return value;};
const unit=object=>{if(object.scale.toArray().some(n=>Math.abs(n-1)>1e-8))throw new Error('Grenade presentation requires native unit scale.');};
const clamp=value=>Math.max(0,Math.min(1,value));

function lifetime(external){
  const controller=new AbortController(),cleanups=[],textures=new Map(),errors=[];let closed=false,rejectAbort;
  const cancelled=new Promise((_,reject)=>{rejectAbort=reject;});
  // A lifetime may be cancelled before the first await is installed.
  cancelled.catch(()=>{});
  const forget=texture=>{const observer=textures.get(texture);textures.delete(texture);if(observer)texture.removeEventListener('dispose',observer);};
  function ownTexture(texture,borrowed=false){
    if(!texture?.isTexture)throw new TypeError('Texture loader must return a Three Texture with transferred ownership.');
    if(borrowed)texture=texture.clone();
    if(!textures.has(texture)){
      const dispose=texture.dispose;let released=false;
      texture.dispose=function(){if(released)return;released=true;return dispose.call(this);};
      const observer=()=>forget(texture);textures.set(texture,observer);texture.addEventListener('dispose',observer);
    }
    if(closed){texture.dispose();throw abortError();}
    return texture;
  }
  function defer(cleanup){if(closed){try{cleanup();}catch(error){errors.push(error);}}else cleanups.push(cleanup);}
  function close(throwErrors=false){
    if(closed)return;closed=true;external?.removeEventListener('abort',onAbort);
    for(const cleanup of cleanups.reverse())try{cleanup();}catch(error){errors.push(error);}cleanups.length=0;
    for(const texture of [...textures.keys()])try{texture.dispose();}catch(error){errors.push(error);}textures.clear();
    controller.abort();rejectAbort(abortError());
    if(throwErrors&&errors.length)throw new AggregateError(errors,'Grenade visual cleanup reported errors.');
  }
  function onAbort(){close();}
  if(external?.aborted)close();else external?.addEventListener('abort',onAbort,{once:true});
  return {signal:controller.signal,defer,ownTexture,close,errors,
    assertOpen(){if(closed)throw new Error('Grenade visual is disposed or cancelled.');},
    wait:promise=>Promise.race([Promise.resolve(promise),cancelled]),
    get closed(){return closed;}};
}

// TextureLoader has no AbortSignal support. Dispose its placeholder on abort/error,
// reject promptly, and guard the later onLoad without disposing the same texture twice.
function defaultTexture(url,{signal}){
  if(signal.aborted)return Promise.reject(abortError());
  return new Promise((resolve,reject)=>{
    let texture,settled=false,released=false;
    const drop=()=>{if(texture&&!released){released=true;texture.dispose();}};
    const finish=()=>signal.removeEventListener('abort',onAbort);
    const onAbort=()=>{if(settled)return;settled=true;finish();drop();reject(abortError());};
    signal.addEventListener('abort',onAbort,{once:true});
    try{texture=new T.TextureLoader().load(url,value=>{
      if(settled){drop();return;}settled=true;finish();resolve(value);
    },undefined,error=>{if(settled)return;settled=true;finish();drop();reject(new Error('Cannot load grenade visual texture: '+url,{cause:error}));});}
    catch(error){settled=true;finish();drop();reject(error);}
  });
}
async function defaultJSON(url,{signal}){const response=await fetch(url,{signal});if(!response.ok)throw new Error('Cannot load grenade visual data: '+url+' ('+response.status+')');return response.json();}
function resource(options,key){const url=grenadeVisualResourceURLs()[key],resolved=options.resolveResource?.(key,url)??url;if(!(typeof resolved==='string'&&resolved.length)||resolved.startsWith('javascript:'))throw new TypeError('Resolve '+key+' to a resource URL.');return resolved;}
function texture(scope,options,key,borrowed){
  if(borrowed)return Promise.resolve(scope.ownTexture(borrowed,true));
  return Promise.resolve().then(()=>{scope.assertOpen();return (options.loadTexture??defaultTexture)(resource(options,key),{signal:scope.signal,kind:key});}).then(value=>scope.ownTexture(value));
}

/** Prop-only: does not import horse, paint projection, motion or balance modules. */
export async function createGrenadeModel(options={}){
  if(options.signal?.aborted)throw abortError();
  const scope=lifetime(options.signal);let source;
  try{
    scope.assertOpen();
    const [module,paint]=await scope.wait(Promise.all([
      import('../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/grenade-model.js'),
      texture(scope,options,'grenadePaint',options.texture)
    ]));scope.assertOpen();
    source=module.createGrenadeModel(paint);
    scope.defer(()=>{source.root.removeFromParent();source.dispose();});
    return Object.freeze({id:'grenade',root:source.root,parts:Object.freeze([...source.parts]),anchors:Object.freeze({...source.anchors}),carry:source.carry,triangles:source.triangles,
      diagnostics:()=>({disposed:scope.closed,meshes:source.parts.length,triangles:source.triangles,cleanupErrors:scope.errors.map(error=>error.message)}),
      dispose:()=>scope.close(true)});
  }catch(error){scope.close();throw error;}
}

function restoreChild(parent,child,index){if(!parent){child.removeFromParent();return;}parent.add(child);const at=parent.children.indexOf(child);parent.children.splice(at,1);parent.children.splice(Math.min(index,parent.children.length),0,child);}
function actorSnapshot(worker){
  const parent=worker.root.parent,index=parent?.children.indexOf(worker.root)??0,equipment=worker.weapon,objects=[],geometries=new Map();
  worker.root.traverse(object=>{
    objects.push({object,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone(),visible:object.visible});
    if(object.geometry&&!geometries.has(object.geometry)){
      const geometry=object.geometry;geometries.set(geometry,{index:geometry.index,attributes:{...geometry.attributes},skin:Object.fromEntries(['skinIndex','skinWeight'].filter(key=>geometry.attributes[key]).map(key=>[key,geometry.attributes[key].clone()]))});
    }
  });
  return ()=>{
    worker.equipWeapon(equipment);
    for(const [geometry,saved]of geometries){geometry.setIndex(saved.index);for(const [key,value]of Object.entries(saved.attributes))geometry.setAttribute(key,value);for(const [key,value]of Object.entries(saved.skin)){geometry.attributes[key].copy(value);geometry.attributes[key].needsUpdate=true;}}
    for(const saved of objects){saved.object.position.copy(saved.position);saved.object.quaternion.copy(saved.quaternion);saved.object.scale.copy(saved.scale);saved.object.visible=saved.visible;}
    restoreChild(parent,worker.root,index);worker.root.updateWorldMatrix(true,true);worker.skeleton.update();
  };
}
function nativeHorse(worker){
  if(!worker?.root||!worker.skeleton||typeof worker.equipWeapon!=='function'||typeof worker.pose!=='function'||worker.bones?.length!==17)throw new TypeError('Supply the existing native seventeen-bone horse worker.');
  unit(worker.root);for(const name of ['hips','spine','head',...[-1,1].flatMap(side=>['upperArm','forearm','hand','fingers','thigh','shin','hoof'].map(name=>name+side))])if(!worker.bones.some(bone=>bone.name===name))throw new TypeError('Native horse is missing bone '+name);
}
function nativeHorseData(data){
  const names=['connected shirt and sleeves','connected overalls seat and legs','forearm and hand -1','exposed hoof -1','forearm and hand 1','exposed hoof 1','unified skull jaw neck and ears','mane crest'];
  const invalid=()=>{throw new TypeError('Use the complete pinned native horse-10k-data resource.');};
  if(!data||data.schema!==1||data.triangles!==10300||data.sourceTriangles!==856076||data.preparedParts||data.bonePositions||!Array.isArray(data.parts)||data.parts.length!==names.length)invalid();
  let triangles=0;
  for(let i=0;i<names.length;i++){
    const part=data.parts[i];
    if(!part||part.name!==names[i]||!Array.isArray(part.position)||part.position.length<3||part.position.length%3||part.position.length>50000||!part.position.every(Number.isFinite)||!Array.isArray(part.normal)||part.normal.length!==part.position.length||!part.normal.every(Number.isFinite)||!Array.isArray(part.index)||!part.index.length||part.index.length%3||!part.index.every(n=>Number.isInteger(n)&&n>=0&&n<part.position.length/3))invalid();
    triangles+=part.index.length/3;
  }
  if(triangles!==10300)invalid();
}
function frameData(frame){
  if(!frame||typeof frame!=='object')throw new TypeError('Supply a committed presentation frame.');
  const elapsedSeconds=finite(frame.elapsedSeconds,'elapsedSeconds');if(elapsedSeconds<0)throw new RangeError('elapsedSeconds must be nonnegative.');
  const actor={};for(const key of ['x','y','h','headingRad'])actor[key]=finite(frame.actor?.[key],'actor.'+key);
  let projectile=null;
  if(frame.projectile){if(frame.projectile.state==='ended')projectile={state:'ended'};else if(frame.projectile.state==='flying'){projectile={state:'flying'};for(const key of ['x','y','h'])projectile[key]=finite(frame.projectile[key],'projectile.'+key);}else throw new TypeError('projectile.state must be flying or ended.');}
  if(elapsedSeconds>=GRENADE_PRESENTATION_MARKERS.release&&!projectile)throw new TypeError('After release supply the committed flying projectile point or {state:"ended"}. The presenter never invents a trajectory.');
  return {elapsedSeconds,actor,projectile};
}

/** One committed clip. The caller supplies time, placement and projectile samples. */
export async function createNativeGrenadePresentation(options={}){
  if(options.signal?.aborted)throw abortError();
  if(typeof options.presentationId!=='string'||!options.presentationId.length||options.presentationId.length>16384)throw new TypeError('Supply the opaque committed presentationId; do not decode or truncate it.');
  const blendSeconds=options.releaseBlendSeconds??.12;if(!Number.isFinite(blendSeconds)||blendSeconds<0||blendSeconds>.5)throw new RangeError('releaseBlendSeconds must be 0–0.5.');
  const borrowed=options.borrowedActor;
  if(borrowed){if(borrowed.species!=='horse'||typeof borrowed.acquireController!=='function')throw new TypeError('Borrowed horse requires species:"horse" and acquireController returning a release function.');nativeHorse(borrowed.worker);}
  else if(!options.renderer&&!options.preparePaint)throw new TypeError('Supply the retained host renderer for native horse paint.');
  const scope=lifetime(options.signal),root=new T.Group(),actorFrame=new T.Group(),projectileRoot=new T.Group();
  root.name='grenade-presentation';root.userData={presentationId:options.presentationId,presentationOnly:true};actorFrame.name='native-horse';projectileRoot.name='single-released-casing';root.add(actorFrame,projectileRoot);scope.defer(()=>{root.removeFromParent();root.clear();});
  let worker,prop,motion,last=null;
  try{
    scope.assertOpen();
    const propReady=createGrenadeModel({...options,signal:scope.signal,texture:options.grenadeTexture}).then(value=>{scope.defer(()=>value.dispose());return value;});
    const modelReady=borrowed?Promise.resolve(null):import('../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-light-model.js');
    const dataReady=borrowed?null:options.horseData??Promise.resolve().then(()=>{scope.assertOpen();return (options.loadJSON??defaultJSON)(resource(options,'horseData'),{signal:scope.signal,kind:'horseData'});});
    const paintReady=borrowed?null:texture(scope,options,'horsePaint',options.horseTexture);
    const modules=await scope.wait(Promise.all([import('./throw-motion.js'),import('./horse-balance.js'),modelReady,dataReady,paintReady,propReady]));scope.assertOpen();
    const [driver,balance,model,data,horsePaint,grenade]=modules;prop=grenade;
    if(borrowed)worker=borrowed.worker;
    else{
      nativeHorseData(data);
      worker=model.createLightHorse(structuredClone(data));scope.defer(()=>{worker.root.removeFromParent();worker.dispose();worker.skeleton.dispose();});
      const createPaint=options.preparePaint??(async input=>{const paint=await import('./paint.js');if(input.signal.aborted)throw abortError();return paint.prepareNativeHorsePaint(input);});
      const paintPromise=Promise.resolve().then(()=>{scope.assertOpen();return createPaint({renderer:options.renderer,worker,texture:horsePaint,signal:scope.signal});}).then(value=>{if(value?.dispose)scope.defer(()=>value.dispose());if(!value?.material||typeof value.dispose!=='function')throw new TypeError('preparePaint must return an owned material and synchronous dispose().');return value;});
      const paint=await scope.wait(paintPromise);scope.assertOpen();for(const part of worker.parts)part.material=paint.material;
    }
    nativeHorse(worker);
    if(borrowed){const restore=actorSnapshot(worker),release=borrowed.acquireController({presentationId:options.presentationId});if(typeof release!=='function')throw new TypeError('acquireController must return a release function.');scope.defer(release);scope.defer(restore);}
    actorFrame.add(worker.root);worker.root.position.set(0,0,0);worker.root.quaternion.identity();root.updateMatrixWorld(true);
    motion=driver.createGrenadeThrow(worker,prop,{animal:'horse',preparedBalance:balance.HORSE_BALANCE});scope.defer(()=>motion.dispose());
    const casing=prop.parts.filter(part=>!['pull ring','curved safety lever'].includes(part.name));
    const releaseNative=motion.releaseCenter.clone();
    function seek(input){
      scope.assertOpen();const frame=frameData(input);unit(root);unit(worker.root);const worldScale=root.getWorldScale(new T.Vector3());if(worldScale.toArray().some(n=>Math.abs(n-1)>1e-8))throw new Error('The retained scene must preserve native unit scale.');
      const parent=root.parent,index=parent?.children.indexOf(root)??0,position=root.position.clone(),quaternion=root.quaternion.clone();
      // The source IK evaluates native coordinates. Isolate it from retained
      // scene transforms synchronously, then restore the caller's placement.
      root.removeFromParent();root.position.set(0,0,0);root.quaternion.identity();actorFrame.position.set(0,0,0);actorFrame.quaternion.identity();root.updateMatrixWorld(true);
      let state,failure;
      try{
        state=motion.at(frame.elapsedSeconds);
        const released=frame.elapsedSeconds>=GRENADE_PRESENTATION_MARKERS.release;
        const holder=released?projectileRoot:prop.root;for(const part of casing)if(part.parent!==holder)holder.add(part);
        for(const part of casing)part.visible=true;
        actorFrame.position.set(frame.actor.x,frame.actor.h,frame.actor.y);actorFrame.rotation.y=-frame.actor.headingRad;actorFrame.updateMatrix();
        const release=releaseNative.clone().applyMatrix4(actorFrame.matrix),target=frame.projectile?.state==='flying'?new T.Vector3(frame.projectile.x,frame.projectile.h,frame.projectile.y):null;
        let blend=1,rendered=null;
        projectileRoot.visible=released&&!!target;
        if(released&&target){const age=frame.elapsedSeconds-GRENADE_PRESENTATION_MARKERS.release,u=blendSeconds?clamp(age/blendSeconds):1;blend=u*u*(3-2*u);rendered=release.clone().lerp(target,blend);projectileRoot.position.copy(rendered);const releaseQ=actorFrame.quaternion.clone().multiply(motion.projectile(GRENADE_PRESENTATION_MARKERS.release).quaternion),spinQ=new T.Quaternion().setFromEuler(new T.Euler(age*7,age*3,age*5));projectileRoot.quaternion.copy(releaseQ).slerp(spinQ,blend);}
        last={presentationId:options.presentationId,coordinateFrame:'presentation-root-local',elapsedSeconds:frame.elapsedSeconds,sampledSeconds:state.time,phase:state.phase,released,projectileState:frame.projectile?.state??'held',nativeScale:worker.root.scale.toArray(),heldGripErrorM:state.gripError,releasePoint:release.toArray(),authoritativePoint:target?.toArray()??null,renderedPoint:rendered?.toArray()??null,cosmeticBlend:blend,releaseBlendSeconds:blendSeconds,cosmeticOnly:true,visibleCasingMeshes:released?(target?casing.length:0):casing.length};
      }catch(error){failure=error;}finally{root.position.copy(position);root.quaternion.copy(quaternion);restoreChild(parent,root,index);root.updateWorldMatrix(true,true);worker.skeleton.update();}
      if(failure){scope.close();throw failure;}
      return structuredClone(last);
    }
    const visual=Object.freeze({root,seek,diagnostics:()=>({disposed:scope.closed,...(last?structuredClone(last):{}),actorOwnership:borrowed?'borrowed':'owned',cleanupErrors:scope.errors.map(error=>error.message)}),dispose:()=>scope.close(true)});
    seek({elapsedSeconds:0,actor:{x:0,y:0,h:0,headingRad:0},projectile:null});return visual;
  }catch(error){scope.close();throw error;}
}
