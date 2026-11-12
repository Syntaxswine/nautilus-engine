export {PLAYER_UI_CONTRACT,PLAYER_COMPONENTS,PLAYER_PORTS,PLAYER_PRESETS,playerDescriptors,providerPort,compatiblePort} from './descriptors.js';
export {createPlayerConfiguration,validatePlayerConfiguration,presetConfiguration,PLAYER_ENGINE_BASE} from './configuration.js';
export {createActionRouter,trainActionProvider} from './actions.js';
export {createControlContext} from './context.js';
export {createTrainPlayerProvider} from './train-provider.js';
export {PLAYER_SKIN_RESOURCES} from './resources.js';

import {startModules} from '../runtime-core/index.js';
import {createActionRouter,trainActionProvider} from './actions.js';
import {createControlContext} from './context.js';
import {validatePlayerConfiguration,componentSettings,UI_MODULE,VIEW_SERVICE} from './configuration.js';
import {PLAYER_PORTS,PLAYER_COMPONENTS} from './descriptors.js';
import {data,refusal,exact} from './data.js';
import {viewFactory,assertScene} from './view.js';
import {prepareSkin} from './resources.js';
import {hudSafeRectangle} from './hud-bounds.js';
import {createSetupMenu} from './menu.js';

const accepted=()=>({version:1,ok:true,committed:false,code:null,reason:null});
const editable=target=>target?.closest?.('input,textarea,select,[contenteditable="true"]');
const selectedService=(validated,providers,name)=>providers.find(p=>p.descriptor.id===validated.configuration.bindings[PLAYER_PORTS[name].id])?.services[PLAYER_PORTS[name].id];
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/** Stage1 DOM shell. Borrows game services; creates no world, clock or actor. */
export async function mountPlayerUI(container,{providers,configuration,actionProviders=[],resourceURL=url=>url,signal:mountSignal,onError=()=>{},onConfigurationChange=()=>{}}={}) {
  const doc=container?.ownerDocument,win=doc?.defaultView;if(!win||!Array.isArray(providers))throw TypeError('Supply an owned UI slot and registered retained providers.');
  const initial=validatePlayerConfiguration(configuration,{providers});if(!initial.ok)throw Object.assign(Error(initial.errors.map(e=>e.message).join(' ')),{code:'CONFIGURATION_NOT_READY',diagnostics:initial.errors});
  const root=doc.createElement('section');root.className='nautilus-player-ui';root.setAttribute('aria-label','Player interface');
  const make=(tag,className,text)=>{const n=doc.createElement(tag);n.className=className;if(text)n.textContent=text;return n;};
  const status=make('header','pui-status'),name=make('strong','pui-name'),mode=make('span','pui-mode'),stats=make('div','pui-stats');status.append(name,mode,stats);
  const tools=make('nav','pui-tools'),menuButton=make('button','pui-menu-button','Setup · Enter');menuButton.type='button';menuButton.setAttribute('aria-label','Open player setup');tools.append(menuButton);
  const dock=make('div','pui-dock'),actions=make('nav','pui-actions'),controls=make('div','pui-controls'),notice=make('p','pui-notice'),titleSlot=make('div','pui-title'),mapSlot=make('div','pui-map-slot'),inventorySlot=make('div','pui-inventory-slot');
  actions.setAttribute('aria-label','Contextual actions');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');dock.append(actions,controls);root.append(status,tools,mapSlot,inventorySlot,dock,notice,titleSlot);
  const events=new win.AbortController(),owner='player-ui/'+win.crypto.randomUUID(),buttons=new Map(),offers=new WeakMap();
  let current=null,runtime=null,config=null,validated=null,scene=selectedService(initial,providers,'scene'),pause=null,unsubscribe=()=>{},retired=false,menuOpen=false,titleVisible=!!componentSettings(initial.configuration,'player.title'),paused=false,applying=false,prepareController=null,ticket=0,refreshing=false,again=false,boundsQueued=false,lastBounds='',observer=null,disposePromise=null;
  const on=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:events.signal});
  function report(error,phase){try{onError(error,{phase});}catch{}}
  function inScope(node=doc.activeElement){return !!node&&(root.contains(node)||node===scene.inputElement);}
  function release(){current?.walking.release();current?.train?.releaseInput('player-context');}
  const context=createControlContext({release,install(state,snapshot){if(!current)return;const blocked=state.blocked||applying;current.train?.setBlocked(blocked);current.walking.setEnabled(!blocked&&state.mode==='on-foot'&&snapshot?.walkingAllowed&&!!componentSettings(config,'player.walking'));}});
  const router=createActionRouter({providers:[trainActionProvider(()=>current?.train),...actionProviders],readContext:()=>context.state});
  function notify(result){if(!result?.ok)notice.textContent=result?.reason||result?.code||'The request was refused.';else notice.textContent='';measureSoon();return result;}
  function focusGame(){if(retired)return;if(titleVisible&&!menuOpen){current?.title?.element.querySelector('button:not(:disabled):not([hidden])')?.focus();return;}if(context.state.blocked)return;if(context.state.mode==='on-foot')current?.walking.focus();else current?.train?.element.querySelector(context.state.mode==='driver'?'[data-part="driver"]':'[data-part="rider"] button:not(:disabled)')?.focus();}
  function sync(){
    if(retired)return;if(refreshing){again=true;return;}refreshing=true;
    try{let count=0;do{again=false;if(++count>8)throw Error('PLAYER_CONTEXT_REENTRY');const snapshot=assertScene(scene,config||initial.configuration);
      context.update(snapshot,{menu:menuOpen||titleVisible,paused:paused||applying,hidden:doc.visibilityState==='hidden'});pause?.setBlocked(context.state.blocked);for(const n of [tools,dock,mapSlot,inventorySlot])n.inert=titleVisible;
      if(retired)return;name.textContent=snapshot.actorId;mode.textContent=context.state.mode.replace('-',' ');stats.textContent=(snapshot.status||[]).map(s=>s.label+' '+s.value).join(' · ');
      const view=router.read(),present=new Set();actions.dataset.format=componentSettings(config||initial.configuration,'player.shell').actions;for(const action of view.actions){present.add(action.id);let item=buttons.get(action.id);if(!item){const button=make('button','pui-action'),reason=make('small','pui-action-reason'),wrapper=make('div','pui-action-item');button.type='button';button.dataset.playerAction=action.id;button.dataset.actionProvider=action.providerId;button.dataset.actionId=action.actionId;button.append(make('span','pui-action-icon'),make('span','pui-action-label'));wrapper.append(button,reason);actions.append(wrapper);item={button,reason,wrapper};buttons.set(action.id,item);}item.button.lastChild.textContent=action.label;item.button.setAttribute('aria-label',action.label);item.button.firstChild.textContent=action.verb==='enter'?'↗':action.verb==='exit'?'↙':'◇';item.button.firstChild.dataset.iconRef=action.icon||action.verb;item.button.firstChild.setAttribute('aria-hidden','true');item.button.disabled=!action.enabled;item.button.title=action.reason||action.label;item.reason.textContent=action.enabled?'':action.reason||'';offers.set(item.button,action.intent);}
      for(const [id,item]of buttons)if(!present.has(id)){item.wrapper.remove();buttons.delete(id);}actions.hidden=!view.actions.length;measureSoon();
    }while(again&&!retired);}catch(error){release();current?.train?.setBlocked(true);current?.walking.setEnabled(false);context.update(null,{unavailable:true});pause?.setBlocked(true);notice.textContent='Player connection unavailable. '+error.message;report(error,'read');}finally{refreshing=false;}
  }
  function measureSoon(){if(boundsQueued||retired)return;boundsQueued=true;win.queueMicrotask(()=>{boundsQueued=false;if(retired||!validated)return;const viewport={x:0,y:0,width:win.innerWidth,height:win.innerHeight},rects=[];for(const [id,node]of [['status',status],['tools',tools],['actions',actions],['controls',controls],['notification',notice],['map',mapSlot],['inventory',inventorySlot],['title',titleSlot]]){if((!node.textContent.trim()&&!node.childElementCount)||node.hidden)continue;const r=node.getBoundingClientRect();if(!r.width||!r.height||r.bottom<=0||r.right<=0||r.x>=viewport.width||r.y>=viewport.height)continue;const x=Math.max(0,r.x),y=Math.max(0,r.y);rects.push({id,x,y,width:Math.max(0,Math.min(viewport.width,r.right)-x),height:Math.max(0,Math.min(viewport.height,r.bottom)-y)});}if(menuOpen){const r=menu.element.getBoundingClientRect();rects.push({id:'menu',x:r.x,y:r.y,width:r.width,height:r.height});}
      const key=JSON.stringify({viewport,rects});if(key!==lastBounds){lastBounds=key;const bounds={version:1,viewport,occlusions:rects,safe:hudSafeRectangle(viewport,rects)};try{selectedService(validated,providers,'bounds').publish(bounds);}catch(error){report(error,'hud-bounds');}}});}
  function openMenu(){if(retired)return refusal('DISPOSED','Player UI retired.');if(menuOpen)return accepted();menuOpen=true;sync();try{menu.show();}catch(error){menuOpen=false;sync();return notify(refusal('MENU_UNAVAILABLE',error.message));}measureSoon();return accepted();}
  function closeMenu(){if(retired)return refusal('DISPOSED','Player UI retired.');menuOpen=false;menu.hide();sync();focusGame();measureSoon();return accepted();}
  function readConfiguration(){const next=data(config);const trains=componentSettings(next,'player.trains');if(trains&&current?.train)trains.muted=current.train.state.feedback.muted;return next;}
  const menu=createSetupMenu(doc,{read:readConfiguration,apply:next=>applyConfiguration(next),validate:next=>validatePlayerConfiguration(next,{providers}),close:closeMenu,connections:()=>({version:1,connections:validated.connections,unavailable:['Stage2 default world/actor startup is not supplied by Stage1.','Stage3 native train-yard adoption is not supplied by this source fixture.']})});root.append(menu.element);
  function shellSettings(next,material){const s=componentSettings(next,'player.shell');root.dataset.skin=s.skin;root.dataset.layout=s.layout;root.style.setProperty('--pui-material',`url("${material}")`);}
  function onlyLive(prior,next){if(prior.actorId!==next.actorId||!eq(prior.content,next.content)||!eq(prior.bindings,next.bindings)||prior.components.map(c=>c.id).join()!==next.components.map(c=>c.id).join())return false;return next.components.every(c=>PLAYER_COMPONENTS.find(d=>d.id===c.id).settings.every(s=>s.change==='live'||componentSettings(prior,c.id)[s.id]===c.settings[s.id]));}
  async function prepare(valid,controller){return startModules(valid.compiled,{factories:{[UI_MODULE]:viewFactory({doc,configuration:valid.configuration,signal:controller.signal,resourceURL,inScope,isCurrent:view=>current===view&&!retired,onVisibility:value=>{titleVisible=value;sync();},onFocus:()=>{sync();focusGame();},onSettings:openMenu,onError:(e,c)=>report(e,c?.phase||'widget'),titleVisible})},hostServices:Object.fromEntries(providers.map(p=>[p.descriptor.id,p.services]))});}
  async function applyConfiguration(input,{signal}={}){
    if(retired)return refusal('DISPOSED','Player UI retired.');const request=++ticket,previousPrepare=prepareController;prepareController=null;previousPrepare?.abort();if(retired||request!==ticket)return refusal('PREPARATION_CANCELLED','A newer request owns preparation.');const result=validatePlayerConfiguration(input,{providers});if(!result.ok)return {...refusal('CONFIGURATION_NOT_READY',result.errors.map(e=>e.message).join(' ')),diagnostics:result.errors};
    const next=result.configuration;
    try{if(config&&scene.read(config.actorId).mode!=='on-foot'&&!componentSettings(next,'player.trains'))return refusal('CONTROL_COMPONENT_REQUIRED','Exit the train before removing its controls.');}catch(error){return refusal('SCENE_NOT_READY',error.message);}
    if(config&&(next.actorId!==config.actorId||!['id','version','sourcePin'].every(k=>next.content[k]===config.content[k])||Object.keys(next.bindings).some(id=>config.bindings[id]&&next.bindings[id]!==config.bindings[id])))return refusal('REBIND_REQUIRES_STAGE2','Stage1 changes UI settings; keep retained actor/content/service bindings.');
    const live=config&&onlyLive(readConfiguration(),next);if(config&&!live&&!context.state.blocked)return refusal('PAUSE_REQUIRED','Open setup or pause before changing control behavior or selected components.');
    const controller=new win.AbortController();prepareController=controller;const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();let candidate=null,camera=null,material=null,committed=false,retiring=null;
    function commitPoint(){
      // Preparation cancellation ends before invoking the prepared camera's
      // atomic update. Its notifications may cancel/start requests or dispose
      // this UI; they must observe the already accepted config/view and cannot
      // turn that accepted update into an uncommitted result.
      committed=true;signal?.removeEventListener('abort',abort);if(prepareController===controller)prepareController=null;
    }
    try{
      if(live){material=await prepareSkin(doc,componentSettings(next,'player.shell').skin,controller.signal,resourceURL);const settings=componentSettings(next,'player.camera');if(settings){camera=await selectedService(result,providers,'camera').prepare({...settings},{signal:controller.signal});if(typeof camera?.commit!=='function'||typeof camera?.dispose!=='function')throw Error('CAMERA_SCHEMA');}}
      else candidate=await prepare(result,controller);
      if(retired||request!==ticket||controller.signal.aborted)throw Error('PREPARATION_CANCELLED');
      if(live){shellSettings(next,material);current.train?.setMuted(componentSettings(next,'player.trains')?.muted||false);config=next;validated=result;current.material=material;commitPoint();camera?.commit();}
      else {
        const nextView=candidate.service(UI_MODULE,VIEW_SERVICE),prior=current,priorRuntime=runtime;
        if(!pause){const endpoint=selectedService(result,providers,'pause');if(typeof endpoint?.acquire!=='function')throw Error('PAUSE_NOT_READY');pause=endpoint.acquire(owner);if(typeof pause?.setBlocked!=='function'||typeof pause?.dispose!=='function')throw Error('PAUSE_SCHEMA');}
        applying=true;release();if(retired||request!==ticket||controller.signal.aborted)throw Error('PREPARATION_CANCELLED');
        // The candidate has no authority until this ownership transfer. Retired
        // view callbacks observe the new owner before their cleanup can run.
        try{controls.replaceChildren(nextView.stage);titleSlot.replaceChildren(nextView.titleStage);if(retired||request!==ticket||controller.signal.aborted)throw Error('PREPARATION_CANCELLED');shellSettings(next,nextView.material);}
        catch(error){controls.replaceChildren(...(prior?[prior.stage]:[]));titleSlot.replaceChildren(...(prior?[prior.titleStage]:[]));if(prior)shellSettings(config,prior.material);throw error;}
        if(prior)prior.active=false;retiring=priorRuntime;
        current=nextView;runtime=candidate;candidate=null;config=next;validated=result;current.active=true;titleVisible=!!current.title&&!current.title.element.hidden;applying=false;commitPoint();current.camera?.commit();
      }
      if(!retired){sync();try{onConfigurationChange(data(next));}catch(error){report(error,'configuration-observer');}}
      return {...accepted(),committed:true};
    }catch(error){if(committed){report(error,'committed-configuration');return {...accepted(),committed:true,observerErrors:1};}return refusal(controller.signal.aborted||request!==ticket?'PREPARATION_CANCELLED':'PREPARATION_FAILED',error.message);}
    finally{applying=false;signal?.removeEventListener('abort',abort);if(candidate)await candidate.stop();if(retiring){const cleanup=await retiring.stop();if(!cleanup.ok)report(Error(JSON.stringify(cleanup.errors)),'retired-view-cleanup');}if(camera)try{camera.dispose();}catch(error){report(error,'camera-cleanup');}if(prepareController===controller)prepareController=null;if(!retired)sync();}
  }
  function request(input,event){
    let intent;try{intent=data(input);}catch{return notify(refusal('INVALID_INTENT','Use plain versioned player intent data.'));}if(retired)return refusal('DISPOSED','Player UI retired.');if(intent?.version!==1)return notify(refusal('INTENT_VERSION','Use player intent version1.'));sync();
    if(intent.type==='menu')return typeof intent.open==='boolean'?(intent.open?openMenu():closeMenu()):notify(refusal('INTENT_SCHEMA','Menu open must be boolean.'));
    if(intent.type==='pause'){if(typeof intent.paused!=='boolean')return notify(refusal('INTENT_SCHEMA','Pause must be boolean.'));paused=intent.paused;sync();return accepted();}
    if(intent.type==='configuration')return applyConfiguration(intent.configuration);
    if(intent.type==='action'){const prior=context.state.mode,result=router.request(intent,event);if(result.committed&&context.state.mode!==prior)focusGame();return notify(result);}
    if(intent.type==='title'){if(typeof intent.visible!=='boolean')return notify(refusal('INTENT_SCHEMA','Title visibility must be boolean.'));if(!current.title)return notify(refusal('TITLE_NOT_READY','Select a title provider.'));if(intent.visible)void current.title.show();else current.title.hide();return accepted();}
    if(context.state.blocked||intent.context!==context.state.token)return notify(refusal('STALE_CONTEXT','Read current controls after restoring the player context.'));
    if(intent.type==='control')return notify(current.train?.requestControl(intent.control,intent.offer,event)||refusal('CONTROL_NOT_READY','Train controls are not selected.'));
    if(intent.type==='walk'){
      if(context.state.mode!=='on-foot'||!componentSettings(config,'player.walking'))return notify(refusal('WALK_UNAVAILABLE','Walking is unavailable in this context.'));
      const v=intent.vector,dt=intent.seconds;if(!exact(v,['x','y'])||!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.hypot(v.x,v.y)>1.000001||!Number.isFinite(dt)||dt<=0||dt>.1)return notify(refusal('WALK_SCHEMA','Use a normalised world-ground vector and 0 < seconds <= 0.1.'));
      const pace=componentSettings(config,'player.walking').pace;return notify(selectedService(validated,providers,'walking').request({version:1,actorId:config.actorId,vector:{x:v.x*pace,y:v.y*pace},seconds:dt}));
    }
    return notify(refusal('UNSUPPORTED_INTENT','Use a selected player action or control.'));
  }
  on(menuButton,'click',event=>request({version:1,type:'menu',open:true},event));on(actions,'click',event=>{const intent=offers.get(event.target.closest('[data-player-action]'));if(intent)request(intent,event);});
  on(doc,'keydown',event=>{if(retired||event.defaultPrevented||event.repeat||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||!inScope())return;const key=event.key.toLowerCase();if(key==='escape'&&menuOpen){event.preventDefault();closeMenu();return;}if(menuOpen||titleVisible||editable(event.target))return;if(key==='enter'&&!event.target.closest('button,[role=slider]')){event.preventDefault();event.stopPropagation();openMenu();}else if(key==='e'){const eligible=router.read().actions.filter(a=>a.enabled);if(eligible.length===1){event.preventDefault();request(eligible[0].intent,event);}else if(eligible.length>1)notify(refusal('CHOOSE_ACTION','Choose one of the available action buttons.'));}},{capture:true});
  on(win,'blur',release);on(win,'pagehide',release);on(doc,'visibilitychange',sync);on(win,'resize',measureSoon);on(root,'focusout',event=>{if(!inScope(event.relatedTarget))release();});
  function dispose(){if(disposePromise)return disposePromise;retired=true;const errors=[];disposePromise=Promise.resolve().then(async()=>{for(const close of [()=>router.dispose(),()=>unsubscribe(),()=>events.abort(),()=>observer?.disconnect(),()=>menu.dispose(),()=>pause?.dispose(),()=>root.remove()])try{close();}catch(error){errors.push(error.message);}const cleanup=await runtime?.stop();if(cleanup&&!cleanup.ok)errors.push(...cleanup.errors.map(e=>e.message));return {ok:!errors.length,errors};});++ticket;if(current)current.active=false;for(const block of [()=>current?.walking.setEnabled(false),()=>current?.train?.setBlocked(true),()=>context.dispose()])try{block();}catch(error){errors.push(error.message);}prepareController?.abort();return disposePromise;}
  const first=await applyConfiguration(initial.configuration,{signal:mountSignal});if(!first.ok){await dispose();throw Object.assign(Error(first.reason),{code:first.code});}
  const ready=current?.title?.ready||Promise.resolve(true),firstView=current;
  if(!retired)try{container.append(root);unsubscribe=scene.subscribe(sync);if(typeof unsubscribe!=='function')throw Error('SCENE_SUBSCRIPTION: return a disposer.');if(win.ResizeObserver){observer=new win.ResizeObserver(measureSoon);for(const n of [status,tools,actions,controls,notice,titleSlot,mapSlot,inventorySlot])observer.observe(n);}sync();if(titleVisible)void ready.then(()=>{if(current===firstView)focusGame();});else focusGame();}catch(error){await dispose();throw error;}
  return Object.freeze({element:root,ready,slots:Object.freeze({map:mapSlot,inventory:inventorySlot}),dispatch:input=>request(input),applyConfiguration,openMenu,closeMenu,refresh:sync,readConfiguration,readContext:()=>data(context.state),readActions:()=>{sync();return router.read();},readControls:()=>{sync();return {version:1,context:data(context.state),train:current?.train?.readControlView()||null};},connectionInspector:()=>data(validated.connections),advanceInput(seconds){if(retired||context.state.blocked)return;const v=current.walking.read();if(v.x||v.y)request({version:1,type:'walk',context:context.state.token,vector:v,seconds});},dispose});
}
