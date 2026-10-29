import * as EngineThree from './three.js';
import {bearSelection,bearResources,bearResourceURL,bearMotionCapabilities,BEAR_WEAPONS} from './index.js';
import {BEAR_PROFILE,createBearWorker} from './adapted/bear-worker.js';
import {createBearPaint} from './adapted/bear-paint.js';
import {textureValidity} from './adapted/horse-model-paint.js';
import {createRedHatCap} from './adapted/red-hat-model.js';
import {createWeaponModel} from './adapted/weapon-models.js';
import {createGrenadeModel} from './adapted/grenade-model.js';
import {createArmedIdle} from './adapted/armed-idle-motion.js';
import {createWorkerLocomotion} from './adapted/worker-locomotion.js';
import {createBattlePosture} from './adapted/battle-posture.js';
import {createCrawlMotion} from './adapted/crawl-motion.js';
import {createMammalMotion} from './adapted/animal-motion.js';
import {createGrenadeThrow} from './adapted/grenade-throw-motion.js';
import {createLadderMotion} from './adapted/ladder-motion.js';
import {createRoofMantle} from './adapted/roof-mantle.js';
import {createLedgeDescent} from './adapted/ledge-descent.js';
import {createHorseChairMotion} from './adapted/horse-chair-motion.js';
import {createPaintedFireMotion} from './adapted/painted-fire-motion.js';
import {makeBurnRoute} from './adapted/painted-fire-state.js';
import {withSpeakingHead,rigSpeakingHead,SPEECH_OPEN} from './adapted/speaking-head.js';

const leases=new WeakSet(),cancelled=()=>Object.assign(Error('Bear loading cancelled or provider disposed.'),{name:'AbortError'});
function ownership(){const active=new Set(),seen=new WeakSet();return {active,own(value){if(!value?.dispose||seen.has(value))return value;seen.add(value);active.add(value);const dispose=value.dispose;let closed=false;value.dispose=function(){if(closed)return;closed=true;active.delete(value);return dispose.call(this);};return value;},close(){let error;for(const resource of [...active])try{resource.dispose();}catch(cause){error||=cause;}if(error)throw error;}};}
const finite=value=>typeof value==='number'&&Number.isFinite(value);
function loan(asset,id){
  if(!asset?.root?.isObject3D||asset.id!==id||!asset.anchors||!asset.carry||typeof asset.dispose!=='function')throw Error('Borrow a compatible weapon asset with the selected equipment ID.');
  if(asset.updateHose)throw Error('Borrowed dynamic-hose weapons require a host-specific provider; use owned flamethrower equipment.');
  if(leases.has(asset))throw Error('This borrowed weapon already has a live actor owner.');leases.add(asset);
  const carry=asset.carry,objects=[asset.root,asset.mount,asset.hose].filter(Boolean),states=objects.map(object=>({object,parent:object.parent,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone(),visible:object.visible})),resources=new Set();
  for(const object of objects)object.traverse(node=>{if(node.geometry)resources.add(node.geometry);for(const material of [].concat(node.material||[]))resources.add(material);if(node.skeleton)resources.add(node.skeleton);});
  let closed=false;return {asset,resources,close(){if(closed)return;closed=true;asset.carry=carry;for(const state of states){const {object}=state;object.removeFromParent();state.parent?.add(object);object.position.copy(state.position);object.quaternion.copy(state.quaternion);object.scale.copy(state.scale);object.visible=state.visible;object.updateMatrixWorld(true);}leases.delete(asset);}};
}

/** Optional static presentation library. The host owns the renderer, world
 * transform, playback clock and gameplay. Actor creation is the first I/O seam.
 * loadTexture transfers ownership; borrowedTextures explicitly keeps ownership.
 */
export function createBearProvider({renderer,THREE=EngineThree,loadJSON,loadTexture,borrowedTextures={},sceneLighting=true}={}){
  if(THREE.Vector3!==EngineThree.Vector3||THREE.SkinnedMesh!==EngineThree.SkinnedMesh)throw Error('Bear presentation requires the engine shared Three namespace.');
  if(!renderer?.render||!renderer?.getRenderTarget||!renderer?.capabilities?.getMaxAnisotropy)throw Error('Supply the borrowed host Three renderer.');
  for(const [key,texture]of Object.entries(borrowedTextures))if(!['weaponAtlas','grenadeSurface'].includes(key)||!texture?.isTexture)throw Error('Only explicit borrowed weapon/grenade texture resources are accepted.');
  const controller=new AbortController(),owned=ownership(),cache=new Map(),paintMasks=new WeakMap(),actors=new Set(),pending=new Set(),creates=new Set(),resources=bearResources();let closed=false;
  const defaultJSON=async(url,{signal})=>{const response=await fetch(url,{signal});if(!response.ok)throw Error('Bear JSON load failed: '+response.status);return response.json();};
  const defaultTexture=url=>new EngineThree.TextureLoader().loadAsync(url);
  function keyOf(value){if(resources.some(resource=>resource.id===value))return value;const resource=resources.find(resource=>value==='../'+resource.path.slice(5));if(!resource)throw Error('Unknown source bear resource.');return resource.id;}
  function resource(key){
    if(closed)return Promise.reject(cancelled());if(cache.has(key))return cache.get(key);
    const texture=resources.find(record=>record.id===key)?.path.endsWith('.png');
    const task=Promise.resolve().then(()=>texture?(borrowedTextures[key]||(loadTexture||defaultTexture)(bearResourceURL(key),{signal:controller.signal,key})):(loadJSON||defaultJSON)(bearResourceURL(key),{signal:controller.signal,key})).then(value=>{
      if(texture){if(!value?.isTexture)throw Error('A bear texture loader must return a Three texture.');if(value!==borrowedTextures[key])owned.own(value);}
      if(closed){if(texture&&value!==borrowedTextures[key])value.dispose();throw cancelled();}return value;
    }).catch(error=>{cache.delete(key);throw error;});
    cache.set(key,task);pending.add(task);task.then(()=>pending.delete(task),()=>pending.delete(task));return task;
  }
  function create(options={}){
    const task=(async()=>{
      const selection=bearSelection(options);if(closed||options.signal?.aborted)throw cancelled();
      const owner=ownership(),outer=new EngineThree.Group();outer.name='Nautilus bear';let worker,paint,cap,speech,activeMotion,weaponAsset,weaponLoan,weaponOwned=false,disposed=false,ready=false,version=0;
      const live=()=>{if(closed||disposed||!ready&&options.signal?.aborted)throw cancelled();};
      // Donor IK mixes local rest vectors with world-space bone positions. Run
      // synchronous native operations without the host placement transform;
      // never detach across an await or alter the host's outer transform.
      let nativeDepth=0;
      function updateNativeMatrices(){worker.root.updateMatrixWorld(true);if(!disposed){const skeletons=new Set([worker.skeleton]);worker.root.traverse(object=>{if(object.skeleton)skeletons.add(object.skeleton);});for(const skeleton of skeletons)skeleton?.update();}}
      function inLocal(run){
        if(!worker||nativeDepth)return run();const root=worker.root,parent=root.parent;nativeDepth++;root.removeFromParent();updateNativeMatrices();
        try{return run();}finally{nativeDepth--;if(parent)parent.add(root);updateNativeMatrices();}
      }
      function trackTree(root){root.traverse(object=>{for(const value of [object.geometry,object.skeleton,...[].concat(object.material||[])])if(value&&!weaponLoan?.resources.has(value))owner.own(value);});}
      const view=async key=>{const base=await resource(key);live();let mask;if(['normal','red-hats','capPaint'].includes(key)){mask=paintMasks.get(base);if(!mask){mask=textureValidity(base);paintMasks.set(base,mask);}}const texture=owner.own(base.clone());if(mask||base.userData.paintValidity)texture.userData.paintValidity=mask||base.userData.paintValidity;return texture;};
      const localTextures=new Map(),textureViews=new Map(),texture=key=>{if(!localTextures.has(key))localTextures.set(key,view(key).then(value=>{textureViews.set(key,value);return value;}));return localTextures.get(key);};
      function stopMotion(){if(!activeMotion)return;const current=activeMotion;activeMotion=null;current.dispose();}
      function releaseWeapon(){if(!weaponAsset)return;worker.equipWeapon();if(weaponOwned)weaponAsset.dispose();weaponLoan?.close();weaponLoan=null;weaponAsset=null;weaponOwned=false;}
      async function equip(id,borrowedWeapon){
        live();if(!BEAR_WEAPONS.includes(id))throw Error('Unsupported bear equipment.');const request=++version,newLoan=borrowedWeapon?loan(borrowedWeapon,id):null;let asset;
        try{const atlas=await texture(id==='grenade'?'grenadeSurface':'weaponAtlas');live();if(request!==version)throw cancelled();asset=borrowedWeapon||createWeaponModel(id,atlas);
          inLocal(()=>{stopMotion();releaseWeapon();weaponLoan=newLoan;weaponAsset=asset;weaponOwned=!newLoan;worker.equipWeapon(asset);trackTree(worker.root);worker.pose('carry');selection.weapon=id;});
        }catch(error){if(asset&&asset!==weaponAsset&&!newLoan)asset.dispose();if(newLoan!==weaponLoan)newLoan?.close();throw error;}
      }
      const instance={root:outer,get worker(){return worker;},get selection(){return {...selection};},
        capabilities(){return bearMotionCapabilities().filter(capability=>capability.weapons.includes(selection.weapon)&&(!selection.speaking||capability.speaking!==false)&&(!capability.requiresSpeaking||selection.speaking));},
        setEquipment(id,{borrowedWeapon}={}){return equip(id,borrowedWeapon);},
        pose(mode='carry',heading=0){live();if(!['neutral','carry'].includes(mode)||!finite(heading))throw Error('Choose neutral/carry and a finite heading.');inLocal(()=>{stopMotion();worker.pose(mode,heading);});},
        setGrey(value){live();if(typeof value!=='boolean')throw Error('Grey mode must be boolean.');worker.setGrey(value);cap?.setGrey(value);speech?.setGrey(value);},
        setJaw(angle){live();if(!speech)throw Error('Create a speaking-enabled bear first.');if(!finite(angle)||angle<0||angle>SPEECH_OPEN.bear)throw Error('Jaw angle exceeds the native bear speaking range.');speech.setJaw(angle);},
        motion(family,settings={}){
          live();const capability=bearMotionCapabilities().find(row=>row.id===family);if(!capability||family==='speaking'||!capability.weapons.includes(selection.weapon)||selection.speaking&&capability.speaking===false)throw Error('Unsupported bear motion/equipment/speaking combination.');return inLocal(()=>{stopMotion();worker.root.position.set(0,0,0);worker.root.rotation.set(0,0,0);worker.pose('carry');
          const surfaces=worker.parts.map(part=>({part,skeleton:part.skeleton,bind:part.bindMatrix.clone(),visible:part.visible,index:part.geometry.index,attributes:Object.fromEntries(Object.entries(part.geometry.attributes).map(([key,attribute])=>[key,{attribute,values:attribute.array.slice()}]))}));
          const inverses=new Map(surfaces.map(({skeleton})=>[skeleton,skeleton.boneInverses.map(matrix=>matrix.clone())]));
          function restoreSurfaces(){for(const [skeleton,matrices]of inverses){skeleton.boneInverses.length=matrices.length;matrices.forEach((matrix,index)=>{if(skeleton.boneInverses[index])skeleton.boneInverses[index].copy(matrix);else skeleton.boneInverses[index]=matrix.clone();});}for(const saved of surfaces){saved.part.geometry.setIndex(saved.index);for(const key of Object.keys(saved.part.geometry.attributes))if(!Object.hasOwn(saved.attributes,key))saved.part.geometry.deleteAttribute(key);for(const [key,{attribute,values}]of Object.entries(saved.attributes)){attribute.array.set(values);attribute.needsUpdate=true;saved.part.geometry.setAttribute(key,attribute);}saved.part.bind(saved.skeleton,saved.bind);saved.part.visible=saved.visible;}}
          let source,extra,route;try{
          if(family==='idle')source=createArmedIdle(worker,BEAR_PROFILE,settings);
          else if(family==='walk')source=createWorkerLocomotion(worker,BEAR_PROFILE);
          else if(family==='posture')source=createBattlePosture(worker,BEAR_PROFILE);
          else if(family==='crawl')source=createCrawlMotion(worker,BEAR_PROFILE,settings);
          else if(family==='aim-fire')source=createMammalMotion({...worker,rifle:worker.weapon},BEAR_PROFILE);
          else if(family==='throw'){extra=createGrenadeModel(textureViews.get('grenadeSurface'));owner.own(extra);worker.root.add(extra.root);source=createGrenadeThrow(worker,extra,{animal:'bear',...settings});}
          else if(family==='ladder')source=createLadderMotion(worker,BEAR_PROFILE,settings.definition,settings);
          else if(family==='roof-mantle')source=createRoofMantle(worker,BEAR_PROFILE);
          else if(family==='descent')source=createLedgeDescent(worker,BEAR_PROFILE);
          else if(family==='chair')source=createHorseChairMotion(worker,{...settings,profile:BEAR_PROFILE});
          else if(family==='fire'||family==='burn'){if(family==='burn')route=makeBurnRoute(settings.points);source=createPaintedFireMotion(worker,BEAR_PROFILE);}
          }catch(error){extra?.root.removeFromParent();extra?.dispose();restoreSurfaces();worker.pose('neutral');throw error;}
          trackTree(worker.root);let stopped=false;
          const handle={unit:capability.unit,duration:source.duration,source,
            sample(value,parameters={}){live();if(stopped||activeMotion!==handle)throw Error('Bear motion is stopped.');return inLocal(()=>{if(family==='posture'){if(!value||typeof value!=='object')throw Error('Posture requires an explicit sample.');restoreSurfaces();worker.root.position.set(0,0,0);worker.root.rotation.set(0,0,0);worker.pose('carry');source.apply(value,parameters);if(parameters.ground)source.ground();return worker.diagnostics();}
              if(!finite(value)||value<0||capability.unit==='progress'&&value>1)throw Error('Invalid bear motion sample.');
              if(family==='idle')return source.at(value,parameters);if(family==='walk')return source.apply({heading:0,blend:1,...parameters,distance:value});if(family==='crawl')return source.at(value,parameters);
              if(family==='fire')return source.fire(value,parameters);if(family==='burn')return source.burn(value,route,{...settings,...parameters});return source.apply?source.apply(value,parameters):source.at(value,parameters);});},
            diagnostics:()=>inLocal(()=>source.diagnostics?.()),dispose(){if(stopped)return;stopped=true;inLocal(()=>{try{source.dispose?.();source.resetTail?.();}finally{extra?.root.removeFromParent();extra?.dispose();restoreSurfaces();worker.pose('neutral');worker.root.position.set(0,0,0);worker.root.rotation.set(0,0,0);if(activeMotion===handle)activeMotion=null;}});}
          };activeMotion=handle;return handle;});
        },
        bounds(){live();return inLocal(()=>{const measure=roots=>{const bounds=new EngineThree.Box3(),point=new EngineThree.Vector3();for(const root of roots)root.traverseVisible(object=>{if(!object.isMesh)return;const count=object.geometry.attributes.position?.count||0;for(let index=0;index<count;index++){object.getVertexPosition(index,point);point.applyMatrix4(object.matrixWorld);bounds.expandByPoint(point);}});return bounds.isEmpty()?null:{min:bounds.min.toArray(),max:bounds.max.toArray()};};return {body:measure(worker.parts),visual:measure([worker.root]),equipped:measure([weaponAsset.root]),scale:outer.scale.toArray()};});},
        diagnostics(){return {selection:{...selection},disposed,ownedResources:owner.active.size,body:disposed?null:inLocal(()=>worker.diagnostics())};},
        dispose(){if(disposed)return;disposed=true;version++;let error;inLocal(()=>{for(const close of [stopMotion,()=>speech?.dispose(),()=>cap?.dispose(),()=>paint?.dispose(),()=>releaseWeapon(),()=>worker?.dispose(),()=>owner.close()])try{close();}catch(cause){error||=cause;}});outer.removeFromParent();outer.clear();actors.delete(instance);if(error)throw error;}
      };
      try{
        const data=await resource('mesh');live();const head=selection.speaking?await resource('speakingHead'):null;live();worker=createBearWorker(head?withSpeakingHead(data,head):data);outer.add(worker.root);trackTree(worker.root);
        if(head){speech=rigSpeakingHead(worker,head);trackTree(worker.root);}
        const base=await texture(selection.outfit);live();paint=createBearPaint(renderer,worker,base,{sceneLighting});owner.own(paint.material);owner.own(paint.target);for(const tex of paint.textures)owner.own(tex);worker.setGrey=value=>{for(const part of worker.parts)part.material=value?worker.grey:paint.material;};worker.setGrey(false);
        if(speech){speech.applyPaint(paint);trackTree(worker.root);}
        if(selection.outfit==='red-hats'){cap=await createRedHatCap(renderer,worker,BEAR_PROFILE,{loadJSON:async key=>{const value=await resource(key);live();return value;},loadAsync:async path=>{const value=await texture(keyOf(path));live();return value;}},sceneLighting);live();trackTree(worker.root);}
        await equip(selection.weapon,options.borrowedWeapon);live();actors.add(instance);ready=true;return instance;
      }catch(error){instance.dispose();throw error;}
    })();creates.add(task);task.then(()=>creates.delete(task),()=>creates.delete(task));return task;
  }
  return {create,stats:()=>({closed,actors:actors.size,cached:cache.size,pending:pending.size+creates.size,ownedResources:owned.active.size}),async whenIdle(){await Promise.allSettled([...pending,...creates]);},dispose(){if(closed)return;closed=true;controller.abort();let error;for(const actor of [...actors])try{actor.dispose();}catch(cause){error||=cause;}cache.clear();try{owned.close();}catch(cause){error||=cause;}if(error)throw error;}};
}
export {EngineThree as THREE};
