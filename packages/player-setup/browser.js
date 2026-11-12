import {startModules} from '../runtime-core/index.js';
import {mountPlayerUI,PLAYER_PORTS,PLAYER_COMPONENTS,PLAYER_PRESETS} from '../player-ui/index.js';
import {prepareNativeActor} from '../native-actors/three.js';
import {plain,abort,receipt,fields} from '../native-actors/data.js';
import {validatePlayerSetup,uiConfiguration,settings,SETUP_PORTS,SETUP_COMPONENTS,output,setupPreset} from './configuration.js';
import {createDefaultWorld} from './world.js';
import {createFrameClock} from './clock.js';
import {createDefaultSurface,createSetupCamera} from './surface.js';
import {prepareSetupStyles,untilReady} from './styles.js';
import {Vector3} from '../render-effects/three.js';
export {createSetupConfiguration,bindSetupProvider,flatYardContent,validatePlayerSetup} from './index.js';
export {retainTrainYard,retainVehicleYard,createRetainedFrameSource} from './retained.js';

const pool=()=>{const entries=new Map();return {acquire(key,create){let e=entries.get(key);if(!e){e={value:create(),refs:0};entries.set(key,e);}e.refs++;let released=false;return {value:e.value,release(){if(released)return;released=true;if(!--e.refs){entries.delete(key);e.value.dispose();}}};},size:()=>entries.size};};
const uiPart=config=>config.components.filter(c=>PLAYER_COMPONENTS.some(d=>d.id===c.id));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/** Executable optional assembly. Factories acquire only in runtime-core prepare;
 * authority/DOM activation is guarded once after all providers are ready. */
export async function mountPlayerSetup(container,{configuration,content,providers=[],registry,signal,checkpoint,resourceURL=url=>url,autoClock=true,onError=()=>{},onConfigurationChange=()=>{},factories:extraFactories={}}={}){
  const document=container?.ownerDocument,window=document?.defaultView;if(!window)throw Error('SETUP_CONTAINER: supply the player scene/UI container.');
  const owned=pool(),objectIds=new WeakMap();let nextObject=0,current=null,pending=null,ticket=0,worldEpoch=0,retired=false,disposePromise=null;
  const objectKey=value=>{if(!objectIds.has(value))objectIds.set(value,++nextObject);return objectIds.get(value);};
  const error=(cause,phase)=>{try{onError(cause,{phase});}catch{}};
  if(checkpoint!==undefined){checkpoint=plain(typeof checkpoint==='string'?JSON.parse(checkpoint):checkpoint);fields(checkpoint,['kind','version','configuration','ownedWorld','native','clock']);if(checkpoint.kind!=='nautilus-player-setup-checkpoint'||checkpoint.version!==1)throw Error('SETUP_CHECKPOINT_VERSION');if(configuration&&!same(configuration,checkpoint.configuration))throw Error('CHECKPOINT_CONFIGURATION_MISMATCH');configuration=checkpoint.configuration;}
  function readConfiguration(){if(!current)throw Error('SETUP_NOT_ACTIVE');const full=plain(current.config),subset=current.root.ui.readConfiguration();full.components=[...subset.components,...full.components.filter(c=>!PLAYER_COMPONENTS.some(d=>d.id===c.id))];return full;}
  function contextCurrent(ctx){return !retired&&current?.root===ctx&&ctx.active;}
  function factoriesFor(valid,controller,restore,epoch){
    const config=valid.configuration,ctx={active:false,ui:null,stage:null,surface:null,native:null,clock:null,camera:null,gates:[],pendingCameras:[],pendingBounds:null,unsubscribe:()=>{},ownedClock:false,attached:false};
    const handle=(provides,prepare,dispose=()=>{})=>({services:provides,prepare,dispose});
    const runtimeFactories={
      'setup.world'(){let lease;const services={};return handle(services,()=>{abort(controller.signal);const key='world/'+JSON.stringify(config.content)+'/'+config.actorId+'/'+epoch;lease=owned.acquire(key,()=>createDefaultWorld(content,{actorId:config.actorId,...(restore?.ownedWorld?{checkpoint:restore.ownedWorld}:{})}));const world=lease.value;Object.assign(services,{[SETUP_PORTS.world.id]:world,[SETUP_PORTS.pose.id]:{read:id=>world.readPose(id)},[PLAYER_PORTS.scene.id]:{...world.scene,actionProviders:[world.actions]},[PLAYER_PORTS.walking.id]:world.walking});},()=>lease?.release());},
      'setup.clock'(){let lease;const services={};return handle(services,({services:input})=>{const world=input[SETUP_PORTS.world.id];lease=owned.acquire('clock/'+objectKey(world),()=>createFrameClock({world,window,auto:autoClock,elapsedSeconds:restore?.clock?.elapsedSeconds||0}));services[SETUP_PORTS.clock.id]=lease.value;services[PLAYER_PORTS.pause.id]=lease.value.pause;},()=>lease?.release());},
      'setup.surface'(){let lease;const services={};return handle(services,({services:input})=>{const world=input[SETUP_PORTS.world.id];lease=owned.acquire('surface/'+objectKey(world),()=>createDefaultSurface({document,world,content}));services[SETUP_PORTS.surface.id]=lease.value;},()=>lease?.release());},
      'setup.camera'(){let camera;const services={};return handle(services,({services:input})=>{camera=createSetupCamera({surface:input[SETUP_PORTS.surface.id],scene:input[PLAYER_PORTS.scene.id],actorId:config.actorId,content});services[PLAYER_PORTS.camera.id]=camera.endpoint;services[PLAYER_PORTS.bounds.id]=camera.bounds;ctx.camera=camera;},()=>camera?.dispose());},
      'setup.actor'(){let view;const services={};return handle(services,async({services:input})=>{const actor=settings(config,'setup.actor'),surface=input[SETUP_PORTS.surface.id],nativeCheckpoint=restore?.native||(!restore&&current&&same(actor,settings(current.config,'setup.actor'))?current.root.native.checkpoint():null);view=await prepareNativeActor({renderer:surface.renderer,actorId:config.actorId,model:actor.model,motion:actor.motion,signal:controller.signal,resourceURL,...(nativeCheckpoint?{checkpoint:nativeCheckpoint}:{})});abort(controller.signal);view.updateConfirmed(input[SETUP_PORTS.pose.id].read(config.actorId));view.root.visible=false;services[SETUP_PORTS.native.id]=view;},()=>view?.dispose());},
      'setup.title'(){const services={};return handle(services,()=>{services[PLAYER_PORTS.title.id]={options:{title:content?.world?.name||'Player workshop',tagline:'Choose, change, try.',onStart:async({signal})=>abort(signal)}};});},
      'setup.shell'(){let styleLease;const services={};return handle(services,async({services:input})=>{
        const styleURL=resourceURL(new URL('../player-ui/style.css',import.meta.url).href);styleLease=owned.acquire('styles/'+styleURL,()=>prepareSetupStyles(document,styleURL));await untilReady(styleLease.value.ready,controller.signal);
        abort(controller.signal);ctx.stage=document.createElement('div');ctx.stage.className='nautilus-player-setup-stage';ctx.stage.style.visibility='hidden';
        const subset=uiConfiguration(config),needs=[...new Map(subset.components.flatMap(c=>PLAYER_COMPONENTS.find(d=>d.id===c.id).ports).map(p=>[p.id,p])).values()],wrapped={};
        for(const need of needs){const value=input[need.id];wrapped[need.id]=value;
          if(need.id===PLAYER_PORTS.scene.id)wrapped[need.id]={...value,inputElement:null,read:id=>value.read(id),subscribe:fn=>value.subscribe(fn)};
          if(need.id===PLAYER_PORTS.walking.id)wrapped[need.id]={request:intent=>contextCurrent(ctx)?value.request(intent):receipt(false,'SETUP_NOT_ACTIVE','This setup does not own input.')};
          if(need.id===PLAYER_PORTS.pause.id)wrapped[need.id]={acquire(owner){const gate=value.acquire(owner);if(typeof gate?.setBlocked!=='function'||typeof gate?.dispose!=='function')throw Error('PAUSE_SCHEMA');let blocked=false,disposed=false;const proxy={setBlocked(v){if(disposed)return;blocked=!!v;if(contextCurrent(ctx))gate.setBlocked(blocked);},activate(){if(!disposed)gate.setBlocked(blocked);},dispose(){if(disposed)return;disposed=true;gate.dispose();}};ctx.gates.push(proxy);return proxy;}};
          if(need.id===PLAYER_PORTS.bounds.id)wrapped[need.id]={publish(bounds){if(contextCurrent(ctx))value.publish(bounds);else ctx.pendingBounds=plain(bounds);}};
          if(need.id===PLAYER_PORTS.camera.id)wrapped[need.id]={async prepare(next,options){const stage=await value.prepare(next,options);if(typeof stage?.commit!=='function'||typeof stage?.dispose!=='function')throw Error('CAMERA_SCHEMA');let disposed=false;const proxy={commit(){if(disposed)throw Error('CAMERA_STAGE_RETIRED');if(contextCurrent(ctx))stage.commit();else ctx.pendingCameras.push(proxy);},accept(){if(!disposed)stage.commit();},dispose(){if(disposed)return;disposed=true;stage.dispose();}};return proxy;}};
          if(need.id===PLAYER_PORTS.trains.id)wrapped[need.id]={contract:value.contract,readForActor:id=>value.readForActor(id),subscribe:fn=>value.subscribe(fn),dispatch:command=>contextCurrent(ctx)?value.dispatch(command):{ok:false,committed:false,code:'SETUP_NOT_ACTIVE',reason:'This setup does not own train input.',commandId:command.commandId,repeated:false,observerErrors:0}};
          if(need.id===PLAYER_PORTS.vehicles.id)wrapped[need.id]={contract:value.contract,readForActor:id=>value.readForActor(id),subscribe:fn=>value.subscribe(fn),release:owner=>value.release(owner),dispatch:command=>contextCurrent(ctx)?value.dispatch(command):receipt(false,'SETUP_NOT_ACTIVE','This setup does not own vehicle input.'),actions(actorId){const actions=value.actions(actorId);return {id:actions.id,read:()=>actions.read(),request:(id,offer)=>contextCurrent(ctx)?actions.request(id,offer):receipt(false,'SETUP_NOT_ACTIVE','This setup does not own vehicle actions.')};}};
        }
        const provider={descriptor:{id:'setup.ui-inputs',version:1,ports:needs.map(output)},services:wrapped};subset.bindings=Object.fromEntries(needs.map(p=>[p.id,provider.descriptor.id]));
        const menu={descriptors:SETUP_COMPONENTS,read:readConfiguration,validate:next=>validatePlayerSetup(next,{providers,registry,content}),apply:next=>applyConfiguration(next),connections:()=>({version:1,connections:current?.valid.connections||valid.connections}),presets:PLAYER_PRESETS.map(({id,label})=>({id,label})),preset:setupPreset};
        const actions=input[PLAYER_PORTS.scene.id].actionProviders||[];
        ctx.ui=await mountPlayerUI(ctx.stage,{providers:[provider],configuration:subset,setupMenu:menu,actionProviders:actions,resourceURL,signal:controller.signal,onError,onConfigurationChange:()=>{if(contextCurrent(ctx))onConfigurationChange(readConfiguration());}});
        ctx.sceneFacade=wrapped[PLAYER_PORTS.scene.id];ctx.boundsBase=input[PLAYER_PORTS.bounds.id];services[SETUP_PORTS.ui.id]=ctx.ui;
      },async()=>{try{const result=await ctx.ui?.dispose();if(result&&!result.ok)throw new AggregateError(result.errors.map(message=>Error(message)),'Player UI cleanup failed.');}finally{styleLease?.release();}});},
      'setup.runtime'(){const services={[SETUP_PORTS.runtime.id]:ctx};return {services,
        prepare({services:input,providers:sources}){
          ctx.ui=input[SETUP_PORTS.ui.id];ctx.surface=input[SETUP_PORTS.surface.id];ctx.native=input[SETUP_PORTS.native.id];ctx.clock=input[SETUP_PORTS.clock.id];ctx.ownedClock=sources[SETUP_PORTS.clock.id].source==='module'&&sources[SETUP_PORTS.clock.id].provider==='setup.clock';
          const poseProvider=valid.configuration.bindings[SETUP_PORTS.pose.id];ctx.pose=poseProvider==='setup.world'?null:providers.find(p=>p.descriptor.id===poseProvider)?.services[SETUP_PORTS.pose.id];
          if(typeof ctx.clock?.subscribe!=='function')throw Error('CLOCK_SCHEMA: bind a before/after host clock.');
          ctx.unsubscribe=ctx.clock.subscribe(event=>{if(!contextCurrent(ctx))return;try{if(event.phase==='before'&&!event.blocked)ctx.ui.advanceInput(event.seconds);if(event.phase==='after'){ctx.draw({settle:!event.blocked});}}catch(cause){error(cause,'confirmed-frame');}});if(typeof ctx.unsubscribe!=='function')throw Error('CLOCK_SCHEMA: subscribe must return an owned disposer.');
        },
        stop(){ctx.unsubscribe();ctx.active=false;},dispose(){ctx.stage?.remove();}};}
    };
    return {factories:{...runtimeFactories,...extraFactories},ctx};
  }
  async function applyConfiguration(input,{signal:requestSignal,restore}={}){
    if(retired)return receipt(false,'DISPOSED','Player setup retired.');const request=++ticket;pending?.abort();const controller=new window.AbortController();pending=controller;
    const cancel=()=>controller.abort();requestSignal?.addEventListener('abort',cancel,{once:true});if(requestSignal?.aborted)cancel();
    const valid=validatePlayerSetup(input,{providers,registry,content});if(!valid.ok){if(pending===controller)pending=null;requestSignal?.removeEventListener('abort',cancel);return {...receipt(false,'SETUP_NOT_READY',valid.errors.map(e=>e.message).join(' ')),diagnostics:valid.errors};}
    const next=valid.configuration;let runtime=null,committed=false,ctx;
    try{
      abort(controller.signal);
      if(restore){const ownsWorld=valid.plan.order.includes('setup.world'),ownsClock=valid.plan.order.includes('setup.clock');
        if(ownsWorld?!restore.ownedWorld:restore.ownedWorld!==null)throw Error('CHECKPOINT_WORLD_OWNERSHIP: supply exact owned state; retained world saves remain with their host.');
        if(!restore.native)throw Error('CHECKPOINT_NATIVE_REQUIRED');
        if(ownsClock){fields(restore.clock,['elapsedSeconds','blocked']);if(!Number.isFinite(restore.clock.elapsedSeconds)||restore.clock.elapsedSeconds<0||typeof restore.clock.blocked!=='boolean')throw Error('CHECKPOINT_CLOCK_INVALID');}
        else if(restore.clock!==null)throw Error('CHECKPOINT_CLOCK_OWNERSHIP');}
      if(current){const before=readConfiguration();if(before.actorId!==next.actorId||!same(before.content,next.content))return receipt(false,'SCENE_RESTART_REQUIRED','Stage a deliberate new-scene start; never reset a retained actor through settings.');
        const owner=current.root.ui.readControls().inputOwner,required=owner==='road-vehicle'?'player.vehicles':owner==='train'?'player.trains':null;if(required&&!settings(next,required))return receipt(false,'CONTROL_COMPONENT_REQUIRED','Exit the occupied transport before removing '+required+'.');
        const sameNative=same(settings(before,'setup.actor'),settings(next,'setup.actor')),sameBindings=same(before.bindings,next.bindings),sameComponents=same(before.components.map(c=>c.id).sort(),next.components.map(c=>c.id).sort());
        if(!restore&&sameNative&&sameBindings&&sameComponents){const subset=uiConfiguration(next);subset.bindings=Object.fromEntries(Object.keys(subset.bindings).map(key=>[key,'setup.ui-inputs']));const result=await current.root.ui.applyConfiguration(subset,{signal:controller.signal});return result;}
        if(!current.root.ui.readContext().blocked)return receipt(false,'PAUSE_REQUIRED','Open setup or pause before replacing providers or native actor roles.');}
      const epoch=restore?++worldEpoch:current?.epoch||0,built=factoriesFor(valid,controller,restore,epoch);ctx=built.ctx;
      runtime=await startModules(valid.compiled,{factories:built.factories,hostServices:Object.fromEntries(providers.map(p=>[p.descriptor.id,p.services]))});
      const poseId=next.bindings[SETUP_PORTS.pose.id],pose=valid.plan.hosts.some(p=>p.id===poseId)?providers.find(p=>p.descriptor.id===poseId).services[SETUP_PORTS.pose.id]:runtime.service(poseId,SETUP_PORTS.pose.id);
      ctx.pose=pose;ctx.draw=(options)=>{ctx.native.updateConfirmed(pose.read(next.actorId),options);ctx.camera?.draw();ctx.surface.draw?.();};
      if(retired||request!==ticket)throw Object.assign(Error('A newer setup owns preparation.'),{code:'PREPARATION_CANCELLED'});abort(controller.signal);
      ctx.native.updateConfirmed(pose.read(next.actorId));ctx.native.root.visible=false;ctx.surface.scene.add(ctx.native.root);container.append(ctx.stage);ctx.attached=true;
      if(retired||request!==ticket)throw Object.assign(Error('Setup retired during attachment.'),{code:'PREPARATION_CANCELLED'});abort(controller.signal);
      // Replacement requires an already blocked prior context. Its held input
      // was released by that owner; do not retire it before this commit point.
      const prior=current;if(prior){prior.root.active=false;prior.root.native.setActive(false);}
      current={runtime,root:ctx,config:next,valid,epoch};runtime=null;committed=true;requestSignal?.removeEventListener('abort',cancel);if(pending===controller)pending=null;
      if(prior?.root.ownedClock&&prior.root.clock!==ctx.clock)prior.root.clock.suspend();
      ctx.active=true;ctx.stage.style.visibility='';if(ctx.surface.element&&!ctx.surface.element.isConnected)container.prepend(ctx.surface.element);ctx.sceneFacade.inputElement=ctx.surface.canvas;
      let observerErrors=0;for(const accept of [()=>ctx.native.setActive(true),...ctx.gates.map(g=>()=>g.activate()),...ctx.pendingCameras.map(c=>()=>c.accept()),()=>ctx.camera?.activate(),()=>{if(ctx.pendingBounds)ctx.boundsBase.publish(ctx.pendingBounds);},()=>ctx.ui.closeMenu(),()=>{if(ctx.ownedClock)ctx.clock.activate();},()=>ctx.draw(),()=>onConfigurationChange(readConfiguration())]){
        if(!contextCurrent(ctx))break;try{accept();}catch(cause){observerErrors++;error(cause,'accepted-setup');}}
      if(prior){const stopped=await prior.runtime.stop();if(!stopped.ok){observerErrors+=stopped.errors.length;error(Error(JSON.stringify(stopped.errors)),'retired-setup');}}
      return {...receipt(true,null,null,true),observerErrors};
    }catch(cause){if(committed){error(cause,'accepted-setup');return {...receipt(true,null,null,true),observerErrors:1};}return receipt(false,controller.signal.aborted||request!==ticket?'PREPARATION_CANCELLED':cause.code||'PREPARATION_FAILED',cause.message);}
    finally{requestSignal?.removeEventListener('abort',cancel);if(runtime)await runtime.stop();if(pending===controller)pending=null;}
  }
  const first=await applyConfiguration(configuration,{signal,restore:checkpoint});if(!first.ok){retired=true;throw Object.assign(Error(first.reason),{code:first.code,diagnostics:first.diagnostics});}
  function restoreCheckpoint(input,options={}){let saved;try{saved=plain(typeof input==='string'?JSON.parse(input):input);fields(saved,['kind','version','configuration','ownedWorld','native','clock']);if(saved.kind!=='nautilus-player-setup-checkpoint'||saved.version!==1)throw Error('Use setup checkpoint version1.');}catch(cause){return Promise.resolve(receipt(false,'CHECKPOINT_INVALID',cause.message));}return applyConfiguration(saved.configuration,{...options,restore:saved});}
  return Object.freeze({initialReceipt:Object.freeze({...first}),readConfiguration,validate:next=>validatePlayerSetup(next,{providers,registry,content}),applyConfiguration,restoreCheckpoint,
    connectionInspector:()=>plain(current.valid.connections),get ui(){return current.root.ui;},
    dispatch(intent){if(intent?.version===1&&intent.type==='configuration')return applyConfiguration(intent.configuration);if(retired)return receipt(false,'DISPOSED','Player setup retired.');return current.root.ui.dispatch(intent);},
    readActions:()=>current.root.ui.readActions(),readControls:()=>current.root.ui.readControls(),
    read(){const r=current.root,actor=r.pose.read(current.config.actorId),rect=r.surface.canvas.getBoundingClientRect(),p=new Vector3(actor.position.x,actor.position.h+r.native.spec.heightM/2,actor.position.y).project(r.surface.camera);
      return {configuration:readConfiguration(),actor,native:r.native.checkpoint(),camera:r.camera?.read()||null,screenPoint:{x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2},sharedOwnedProviders:owned.size()};},
    step(seconds){if(retired)throw Error('Setup retired.');if(!current.root.ownedClock)throw Error('RETAINED_CLOCK_ONLY: advance the existing host clock.');current.root.clock.tick(seconds);},
    checkpoint(){if(retired)throw Error('Setup retired.');current.root.native.updateConfirmed(current.root.pose.read(current.config.actorId));const worldId=current.config.bindings[SETUP_PORTS.world.id],world=worldId==='setup.world'?current.runtime.service(worldId,SETUP_PORTS.world.id):null;return plain({kind:'nautilus-player-setup-checkpoint',version:1,configuration:readConfiguration(),ownedWorld:world?.checkpoint()||null,native:current.root.native.checkpoint(),clock:current.root.ownedClock?current.root.clock.read():null});},
    dispose(){if(disposePromise)return disposePromise;const prior=current;disposePromise=Promise.resolve().then(()=>prior.runtime.stop());++ticket;pending?.abort();
      // Native input retires synchronously while this exact facade still owns
      // the original cab, so its safety release reaches retained authority.
      try{void prior.root.ui.dispose();}finally{retired=true;prior.root.active=false;prior.root.native.setActive(false);if(prior.root.ownedClock)prior.root.clock.suspend();}return disposePromise;}
  });
}
