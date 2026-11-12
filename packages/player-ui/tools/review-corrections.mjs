import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from '../../../tools/art-review-browser.mjs';

const parent='03096098ec51da1bca822a892e7cfe48638e39c5',groups=[];
let reviewOutput;
await withArtReview('Player UI review corrections: action identities and camera commit coherence',async({page,baseURL,out})=>{
  reviewOutput=out;
  await page.route(baseURL+'/player-ui-corrections',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><link rel="stylesheet" href="/packages/player-ui/style.css"></head><body><canvas id="world" tabindex="0"></canvas><main id="ui"></main></body></html>'}));
  await page.goto(baseURL+'/player-ui-corrections');
  await page.evaluate(async()=>{
    const api=await import('/packages/player-ui/index.js'),{createTrainYardHost}=await import('/examples/train-yard-host.js');
    window.freshCorrection=async({actions=false}={})=>{
      await window.subject?.cleanup();
      const host=createTrainYardHost(),t={host,commands:[],listeners:new Set(),stages:[],errors:[],notifications:[],sent:[],cameraState:{mode:'follow',zoom:1},notify:null,onPrepared:null,failPrepare:false};
      const connector={contract:host.connector.contract,readForActor:id=>host.connector.readForActor(id),dispatch:command=>{t.commands.push(structuredClone(command));return host.connector.dispatch(command);},subscribe(fn){t.listeners.add(fn);const off=host.connector.subscribe(fn);return ()=>{t.listeners.delete(fn);off();};}};
      const content={id:'retained-review-corrections',version:1,sourcePin:'03096098ec51da1bca822a892e7cfe48638e39c5'};
      const camera={async prepare(settings,{signal}){
        if(t.failPrepare)throw Error('EXPECTED_CAMERA_PREPARE_FAILURE');
        const stage={settings:{...settings},signal,commits:0,disposals:0};t.stages.push(stage);
        await t.onPrepared?.(stage);
        return {commit(){stage.commits++;t.cameraState={...settings};const notify=t.notify;t.notify=null;notify?.(stage);},dispose(){stage.disposals++;}};
      }};
      t.provider=api.createTrainPlayerProvider({host:{connector,walk:(...args)=>host.walk(...args),get actors(){return host.actors;}},content,inputElement:document.querySelector('#world'),setUIPaused:value=>{t.paused=value;},onHudBounds(){},camera});
      const custom=[['items','doors/open','Open first door'],['items/doors','open','Open second door']].map(([id,action,label])=>({id,read:()=>({context:'offer/'+id,actions:[{id:action,target:{id:label},verb:'open',label,enabled:true}]}),request:(actionId,offer)=>{t.sent.push([id,actionId,offer]);return {version:1,ok:true,committed:true,code:null,reason:null};}}));
      t.ui=await api.mountPlayerUI(document.querySelector('#ui'),{providers:[t.provider],actionProviders:actions?custom:[],configuration:api.createPlayerConfiguration({content,camera:true}),onConfigurationChange:configuration=>t.notifications.push(structuredClone(configuration)),onError:(error,context)=>t.errors.push({message:error.message,phase:context.phase})});
      t.board=()=>{const action=t.ui.readActions().actions.find(a=>a.providerId==='trains'&&a.enabled);if(!action||!t.ui.dispatch(action.intent).committed)throw Error('CAB_NOT_READY');const v=t.ui.readControls();if(!t.ui.dispatch({version:1,type:'control',context:v.context.token,offer:v.train.context,control:{kind:'notch',notch:1}}).committed)throw Error('DRIVE_NOT_READY');};
      t.change=(mode,zoom)=>{if(mode==='replacement')t.ui.openMenu();const configuration=t.ui.readConfiguration();configuration.components.find(c=>c.id==='player.camera').settings.zoom=zoom;if(mode==='replacement'){const s=configuration.components.find(c=>c.id==='player.trains').settings;s.steamProfile=s.steamProfile==='classic'?'compact-notched':'classic';}return configuration;};
      t.camera=()=>t.ui.readConfiguration().components.find(c=>c.id==='player.camera').settings;
      t.cleanup=async()=>{await t.ui.dispose();host.dispose();};
      window.subject=t;
    };
  });
  async function group(name,body){const evidence=await body();groups.push({name,ok:true,...(evidence?{evidence}:{})});fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({status:'callback-running',parentCommit:parent,groups},null,2));}
  try {
    await group('mounted shell preserves both slash-colliding action pairs and routes each native button correctly',async()=>{
      await page.evaluate(()=>window.freshCorrection({actions:true}));
      const before=await page.evaluate(()=>{const t=window.subject,view=t.ui.readActions().actions.filter(a=>a.providerId==='items'||a.providerId==='items/doors');return {ids:view.map(a=>a.id),buttons:[...t.ui.element.querySelectorAll('[data-action-provider]')].filter(n=>n.dataset.actionProvider.startsWith('items')).map(n=>({provider:n.dataset.actionProvider,action:n.dataset.actionId,label:n.getAttribute('aria-label')}))};});
      assert.equal(before.ids.length,2);assert.equal(new Set(before.ids).size,2);assert.equal(before.buttons.length,2);
      await page.getByRole('button',{name:'Open first door',exact:true}).click();await page.getByRole('button',{name:'Open second door',exact:true}).click();
      assert.deepEqual(await page.evaluate(()=>window.subject.sent),[['items','doors/open','offer/items'],['items/doors','open','offer/items/doors']]);
      assert.deepEqual(await page.evaluate(()=>window.subject.ui.readActions().actions.filter(a=>a.providerId.startsWith('items')).map(a=>a.id)),before.ids);return before;
    });
    for(const mode of ['live','replacement']){
      await group(mode+': post-update invalid request observes accepted camera/configuration and cannot cancel a crossed commit',async()=>{
        const r=await page.evaluate(async mode=>{await window.freshCorrection();const t=window.subject;t.board();const next=t.change(mode,1.1),node=document.querySelector('.nautilus-train-controls'),saved=JSON.stringify(t.host.save());let nested,observed;
          t.notify=stage=>{observed={configuration:t.camera(),actual:{...t.cameraState},aborted:stage.signal.aborted};nested=t.ui.applyConfiguration({version:99});};
          const result=await t.ui.applyConfiguration(next),nestedResult=await nested;return {result,nestedResult,observed,configuration:t.camera(),actual:t.cameraState,aborted:t.stages.at(-1).signal.aborted,worldUnchanged:saved===JSON.stringify(t.host.save()),sameActuator:node===document.querySelector('.nautilus-train-controls'),listeners:t.listeners.size,views:document.querySelectorAll('.nautilus-train-controls').length};},mode);
        assert.equal(r.result.committed,true);assert.equal(r.nestedResult.code,'CONFIGURATION_NOT_READY');assert.deepEqual(r.configuration,{mode:'follow',zoom:1.1});assert.deepEqual(r.actual,r.configuration);assert.deepEqual(r.observed.configuration,r.observed.actual);assert.equal(r.observed.aborted,false);assert.equal(r.aborted,false);assert.equal(r.worldUnchanged,true);assert.equal(r.sameActuator,mode==='live');assert.equal(r.views,1);assert.equal(r.listeners,2);return r;
      });
      await group(mode+': external abort after camera acceptance is truthful and does not abort accepted staging',async()=>{
        const r=await page.evaluate(async mode=>{await window.freshCorrection();const t=window.subject,next=t.change(mode,1.1),controller=new AbortController();t.notify=()=>controller.abort();const result=await t.ui.applyConfiguration(next,{signal:controller.signal});return {result,externalAborted:controller.signal.aborted,acceptedSignalAborted:t.stages.at(-1).signal.aborted,configuration:t.camera(),actual:t.cameraState};},mode);
        assert.equal(r.result.committed,true);assert.equal(r.externalAborted,true);assert.equal(r.acceptedSignalAborted,false);assert.deepEqual(r.configuration,r.actual);assert.equal(r.configuration.zoom,1.1);return r;
      });
      await group(mode+': a reentrant valid change follows the accepted change without an old completion overwriting it',async()=>{
        const r=await page.evaluate(async mode=>{await window.freshCorrection();const t=window.subject,next=t.change(mode,1.1);let nested,observed;t.notify=()=>{observed={configuration:t.camera(),actual:{...t.cameraState}};nested=t.ui.applyConfiguration(t.change(mode,1.2));};const first=await t.ui.applyConfiguration(next),second=await nested;return {first,second,observed,configuration:t.camera(),actual:t.cameraState,views:document.querySelectorAll('.nautilus-train-controls').length,listeners:t.listeners.size};},mode);
        assert.equal(r.first.committed,true);assert.equal(r.second.committed,true);assert.deepEqual(r.observed.configuration,r.observed.actual);assert.equal(r.observed.configuration.zoom,1.1);assert.deepEqual(r.configuration,r.actual);assert.equal(r.configuration.zoom,1.2);assert.equal(r.views,1);assert.equal(r.listeners,2);return r;
      });
      await group(mode+': throwing post-update notifications remain committed and retire prepared/replaced staging',async()=>{
        const r=await page.evaluate(async mode=>{await window.freshCorrection();const t=window.subject,next=t.change(mode,1.1);t.notify=()=>{throw Error('EXPECTED_CAMERA_OBSERVER_FAILURE');};const result=await t.ui.applyConfiguration(next);const state={result,configuration:t.camera(),actual:t.cameraState,views:document.querySelectorAll('.nautilus-train-controls').length,errors:t.errors};await t.ui.dispose();return {...state,listeners:t.listeners.size,stages:t.stages.map(s=>({commits:s.commits,disposals:s.disposals}))};},mode);
        assert.equal(r.result.committed,true);assert.equal(r.result.observerErrors,1);assert.deepEqual(r.configuration,r.actual);assert.equal(r.configuration.zoom,1.1);assert.equal(r.views,1);assert.ok(r.errors.some(e=>e.message==='EXPECTED_CAMERA_OBSERVER_FAILURE'));assert.equal(r.listeners,0);assert.ok(r.stages.every(s=>s.commits===1&&s.disposals===1));return r;
      });
      await group(mode+': disposal from a commit notification retires both views and synchronously blocks old native input',async()=>{
        const r=await page.evaluate(async mode=>{await window.freshCorrection();const t=window.subject;t.board();const next=t.change(mode,1.1);let observer;t.notify=()=>{void t.ui.dispose();const count=t.commands.length,panel=document.querySelector('[data-part="driver"]');panel?.dispatchEvent(new KeyboardEvent('keydown',{key:'f',bubbles:true}));observer={configuration:t.camera(),actual:{...t.cameraState},noNativeCommand:t.commands.length===count,rejected:t.ui.dispatch({version:1,type:'menu',open:true})};};const result=await t.ui.applyConfiguration(next);await t.ui.dispose();return {result,observer,configuration:t.camera(),actual:t.cameraState,views:document.querySelectorAll('.nautilus-player-ui,.nautilus-train-controls').length,listeners:t.listeners.size,stages:t.stages.map(s=>s.disposals),lease:t.host.connector.readForActor('player').train.controls.leaseId};},mode);
        assert.equal(r.result.committed,true);assert.deepEqual(r.configuration,r.actual);assert.deepEqual(r.observer.configuration,r.observer.actual);assert.equal(r.observer.noNativeCommand,true);assert.equal(r.observer.rejected.code,'DISPOSED');assert.equal(r.views,0);assert.equal(r.listeners,0);assert.ok(r.stages.every(n=>n===1));assert.equal(r.lease,null);return r;
      });
      await group(mode+': cancellation before the commit point leaves accepted camera/configuration and view intact',async()=>{
        const r=await page.evaluate(async mode=>{await window.freshCorrection();const t=window.subject,next=t.change(mode,1.1),before=t.ui.readConfiguration(),node=document.querySelector('.nautilus-train-controls'),controller=new AbortController();let resume,prepared;const reached=new Promise(resolve=>{prepared=resolve;});t.onPrepared=()=>new Promise(resolve=>{resume=resolve;prepared();});const pending=t.ui.applyConfiguration(next,{signal:controller.signal});await reached;controller.abort();resume();const result=await pending;return {result,configuration:t.camera(),actual:t.cameraState,sameConfig:JSON.stringify(before)===JSON.stringify(t.ui.readConfiguration()),sameActuator:node===document.querySelector('.nautilus-train-controls'),stage:{commits:t.stages.at(-1).commits,disposals:t.stages.at(-1).disposals}};},mode);
        assert.equal(r.result.code,'PREPARATION_CANCELLED');assert.equal(r.result.committed,false);assert.equal(r.sameConfig,true);assert.equal(r.sameActuator,true);assert.deepEqual(r.configuration,r.actual);assert.equal(r.configuration.zoom,1);assert.deepEqual(r.stage,{commits:0,disposals:1});return r;
      });
      await group(mode+': camera readiness refusal precedes acceptance and preserves the borrowed setup',async()=>{
        const r=await page.evaluate(async mode=>{await window.freshCorrection();const t=window.subject,next=t.change(mode,1.1),before=t.ui.readConfiguration(),node=document.querySelector('.nautilus-train-controls');t.failPrepare=true;const result=await t.ui.applyConfiguration(next);return {result,configuration:t.camera(),actual:t.cameraState,sameConfig:JSON.stringify(before)===JSON.stringify(t.ui.readConfiguration()),sameActuator:node===document.querySelector('.nautilus-train-controls')};},mode);
        assert.equal(r.result.committed,false);assert.equal(r.result.code,'PREPARATION_FAILED');assert.equal(r.sameConfig,true);assert.equal(r.sameActuator,true);assert.deepEqual(r.configuration,r.actual);return r;
      });
    }
  } finally {await page.evaluate(async()=>{await window.subject?.cleanup();}).catch(()=>{});}
},{source:true,owner:'01a1810e-3297-7142-ac31-ac504ea8553d',output:'player-ui-corrections',timeoutMs:120000});
fs.writeFileSync(path.join(reviewOutput,'browser.json'),JSON.stringify({status:'passed',parentCommit:parent,groups,errors:[],scope:'action identity and live/replacement camera commit corrections; unaffected baseline proof retained'},null,2)+'\n');
console.log(JSON.stringify({status:'passed',groups:groups.length,names:groups.map(g=>g.name)}));
