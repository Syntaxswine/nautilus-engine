import * as T from '../render-effects/three.js';
import {createVehicleYard,vehicleYardContent} from '../vehicle-core/index.js';
import {createRoadVehicleKit} from '../vehicle-visuals/three.js';
import {mountPlayerSetup,createSetupConfiguration,retainVehicleYard} from '../player-setup/browser.js';
import {bindSetupProvider} from '../player-setup/index.js';
import {createFrameClock} from '../player-setup/clock.js';
import {createDefaultSurface} from '../player-setup/surface.js';
import {prepareNativeActor} from '../native-actors/three.js';
import {keys} from '../vehicle-core/data.js';
/** Reusable public-package assembly. Consumer supplies scenery/content and host
 * policy only. All walking, car commands, actions and native UI are engine-owned.
 */
export async function mountVehicleYard(container,{content,profile='game',autoClock=true,checkpoint,signal,onError=()=>{},visualOptions={}}={}){
 if(checkpoint){keys(checkpoint,['kind','version','host','setup','clock','visuals']);keys(checkpoint.visuals,['profile']);keys(checkpoint.clock,['elapsedSeconds','blocked']);if(checkpoint.kind!=='nautilus-playable-vehicle-yard'||checkpoint.version!==1||!['game','full'].includes(checkpoint.visuals.profile)||!Number.isFinite(checkpoint.clock.elapsedSeconds)||checkpoint.clock.elapsedSeconds<0||typeof checkpoint.clock.blocked!=='boolean')throw Error('VEHICLE_PLAYABLE_CHECKPOINT');}
 if(!content){const response=await fetch(new URL('../../package-provenance.json',import.meta.url),{signal});if(!response.ok)throw Error('VEHICLE_PACKAGE_IDENTITY: use the built/installed example or bind exact content.');const provenance=await response.json();if(provenance.source?.dirty!==false||!/^[a-f0-9]{40}$/.test(provenance.source.commit))throw Error('VEHICLE_PACKAGE_IDENTITY: default content requires a fixed clean build; development callers bind explicit candidate content.');content=vehicleYardContent({sourcePin:provenance.source.commit});}
 const document=container.ownerDocument,window=document.defaultView,host=createVehicleYard(content,{checkpoint:checkpoint?.host}),surface=createDefaultSurface({document,world:host,content});
 const clock=createFrameClock({world:host,window,auto:autoClock,elapsedSeconds:checkpoint?.clock?.elapsedSeconds||0}),gate=clock.pause.acquire('vehicle-yard.ui'),natives=[];let setup,kit,models=[],retired=false,ticket=0,pending,unsubscribe=()=>{},disposePromise;
 const update=()=>{const state=host.connector.read();for(let i=0;i<models.length;i++){const v=state.vehicles[i],m=models[i];m.root.position.set(v.position.x,v.position.h,v.position.y);m.root.rotation.y=v.headingRad;m.update(v);}for(const n of natives)n.updateConfirmed(host.readPose(n.actorId));};
 async function setVisualProfile(next,{signal:requestSignal}={}){if(retired)throw Error('VEHICLE_YARD_RETIRED');if(!['full','game'].includes(next))throw Error('VEHICLE_PROFILE');const request=++ticket;pending?.abort();const controller=new AbortController();pending=controller;const abort=()=>controller.abort();requestSignal?.addEventListener('abort',abort,{once:true});if(requestSignal?.aborted)abort();const candidate=createRoadVehicleKit(T,{...visualOptions,bodies:content.vehicles.map(v=>v.body),profile:next,signal:controller.signal});let prepared=[],committed=false,prior=[],old;
   const current=()=>{if(retired||request!==ticket||controller.signal.aborted)throw Error('VEHICLE_PREPARATION_REPLACED');};
   try{await candidate.ready;current();prepared=host.connector.read().vehicles.map(v=>candidate.createDriving('vehicle-'+v.body+'-'+v.finish));for(const m of prepared){surface.scene.add(m.root);current();}current();old=kit;prior=models;kit=candidate;models=prepared;profile=next;committed=true;update();return {ok:true,profile};}
   catch(e){if(committed){try{onError(e,{phase:'accepted-vehicle-visuals'});}catch{}return {ok:true,profile,observerErrors:1};}const errors=[e];for(const close of [...prepared.map(m=>()=>m.dispose()),()=>candidate.dispose()])try{close();}catch(cause){errors.push(cause);}throw errors.length===1?e:new AggregateError(errors,'Vehicle candidate preparation/cleanup failed.');}
   finally{if(committed){const errors=[];for(const close of [...prior.map(m=>()=>m.dispose()),()=>{errors.push(...(old?.dispose()||[]));}])try{close();}catch(e){errors.push(e.message);}if(errors.length)try{onError(new AggregateError(errors,'Retired vehicle presentation cleanup failed.'),{phase:'retired-vehicle-visuals'});}catch{}}requestSignal?.removeEventListener('abort',abort);if(pending===controller)pending=null;}
 }
 function dispose(){if(disposePromise)return disposePromise;retired=true;++ticket;pending?.abort();const errors=[];let uiStop;try{clock.suspend();}catch(e){errors.push(e);}try{uiStop=setup?.dispose();}catch(e){errors.push(e);}const prior=models,old=kit,actors=natives.splice(0);models=[];kit=null;
   disposePromise=Promise.resolve().then(async()=>{for(const close of [()=>uiStop,()=>unsubscribe(),...actors.map(n=>()=>n.dispose()),...prior.map(m=>()=>m.dispose()),()=>{errors.push(...(old?.dispose()||[]));},()=>gate.dispose(),()=>clock.dispose(),()=>host.dispose(),()=>surface.dispose()])try{await close();}catch(e){errors.push(e);}if(errors.length)throw new AggregateError(errors,'Vehicle yard cleanup failed.');});return disposePromise;
 }
 try{
   if(checkpoint?.visuals)profile=checkpoint.visuals.profile;await setVisualProfile(profile,{signal});
   for(const a of content.actors.filter(a=>a.id!=='player')){const view=await prepareNativeActor({renderer:surface.renderer,actorId:a.id,model:'donkey',motion:'native-gait',signal});view.setActive(true);surface.scene.add(view.root);natives.push({actorId:a.id,root:view.root,updateConfirmed:view.updateConfirmed,dispose:view.dispose});}
   unsubscribe=clock.subscribe(event=>{if(event.phase==='after')update();});
   const provider=retainVehicleYard({host,content:content.identity,surface,clock,setUIPaused:blocked=>gate.setBlocked(blocked)});
   const configuration=bindSetupProvider(createSetupConfiguration({content:content.identity,vehicles:true}),provider);
   setup=await mountPlayerSetup(container,{configuration:checkpoint?.setup?.configuration||configuration,content,providers:[provider],signal,checkpoint:checkpoint?.setup,onError});
   update();clock.activate();
   return Object.freeze({host,setup,surface,clock,setVisualProfile,step:seconds=>clock.tick(seconds),
     read:()=>({state:host.connector.read(),player:setup.read(),visuals:kit.read(),clock:clock.read()}),
     checkpoint:()=>({kind:'nautilus-playable-vehicle-yard',version:1,host:host.checkpoint(),setup:setup.checkpoint(),clock:clock.read(),visuals:{profile}}),dispose});
 }catch(e){await dispose();throw e;}
}
