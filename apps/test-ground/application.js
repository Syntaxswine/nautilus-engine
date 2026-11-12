import {mountPlayerSetup,createSetupConfiguration,bindSetupProvider} from '@nautilus-engine/map-core/player-setup/browser';
import {SETUP_PORTS,output} from '@nautilus-engine/map-core/player-setup';
import {PLAYER_PORTS} from '@nautilus-engine/map-core/player-ui';
import {REGISTRY,identity,defaultRecipe,validateRecipe,contentFor,fixtureById,goldenRecipe,fixtureSpawn,objectiveById,observerCapabilities} from './registry.js';
import {createGroundHost} from './host.js';import {createGroundSurface} from './surface.js';import {createChecklist,evaluateObjective} from './runner.js';
import {clone,canonical,fields,insist,refusal,accepted} from './data.js';

const SAVE_KEY='nautilus-night-ledger-ground-v1',TRANSACTION_KEY='nautilus-night-ledger-last-transaction-v1';
export async function createGroundApplication(container,{installation,storage=container.ownerDocument.defaultView.localStorage}={}) {
  const document=container.ownerDocument;let current=null,retired=false,pending=null,epoch=0,disposePromise;
  function persist(snapshot){storage.setItem(TRANSACTION_KEY,JSON.stringify(snapshot));}
  async function prepare({recipe=defaultRecipe(),spawn,packet,signal}={}) {
    const stage=document.createElement('section');stage.className='ground-scene';stage.style.visibility='hidden';container.append(stage);
    let host,surface,setup,entry;
    try {
      host=createGroundHost({recipe,spawn,checkpoint:packet?.host,persist});surface=createGroundSurface(document,host);
      const services={
        [SETUP_PORTS.world.id]:host,[SETUP_PORTS.pose.id]:{read:()=>host.readPose()},[SETUP_PORTS.surface.id]:surface,
        [PLAYER_PORTS.scene.id]:host.scene,[PLAYER_PORTS.walking.id]:host.walking};
      const provider={descriptor:{id:'ground.services',version:1,ports:[SETUP_PORTS.world,SETUP_PORTS.pose,SETUP_PORTS.surface,PLAYER_PORTS.scene,PLAYER_PORTS.walking].map(output)},services};
      const configuration=packet?.setup.configuration||bindSetupProvider(createSetupConfiguration({content:clone(identity)}),provider);
      setup=await mountPlayerSetup(stage,{content:contentFor(recipe,spawn),configuration,providers:[provider],signal,...(packet?{checkpoint:packet.setup}:{}),onConfigurationChange:config=>entry?.checklist.setPlayerSetup(config),onError:(error,context)=>{document.defaultView.console.warn('Test ground observer',context.phase,error.message);}});
      const checklist=createChecklist(recipe,packet?.checklist,setup.readConfiguration(),{engineArchiveSHA:installation.package.sha256,consumer:installation.runtime.map(({path,sha256})=>({path,sha256}))});entry={stage,host,surface,setup,checklist,missionBaseline:packet?.missionBaseline||host.read(),unsubscribe:()=>{},dialog:null,closeDialog:null};
      entry.unsubscribe=host.scene.subscribe(()=>{if(current===entry)render(entry);});
      return entry;
    }catch(e){await setup?.dispose();surface?.dispose();host?.dispose();stage.remove();throw e;}
  }
  async function retire(entry){entry.closeDialog?.();entry.dialog?.remove();entry.unsubscribe();await entry.setup.dispose();entry.surface.dispose();entry.host.dispose();entry.stage.remove();}
  function checkpoint(){insist(current&&!retired,'APPLICATION_RETIRED','No accepted sandbox.');return clone({kind:'nautilus-test-ground-checkpoint',version:1,installationSHA:installation.package.sha256,recipe:current.host.read().recipe,host:current.host.read(),setup:current.setup.checkpoint(),checklist:current.checklist.read(),missionBaseline:current.missionBaseline});}
  function readMission(entry){const state=entry.host.read(),recipe=state.recipe,objective=objectiveById(recipe.objective.id),missing=objective.requires.filter(c=>!observerCapabilities(recipe.observers.profile).includes(c));if(missing.length)return {status:'unavailable',missionComplete:false,reason:'Missing observations: '+missing.join(', ')};
    const result=evaluateObjective({objective,slot:recipe.objective.slot,conditions:recipe.conditions.id,baseline:entry.missionBaseline,observed:{state,passage:objective.id==='door-passage'?entry.host.passage(recipe.objective.slot):null}});
    if(recipe.conditions.id==='transition'&&state.receipts.length===entry.missionBaseline.receipts.length)result.status='pending';return result;
  }
  function render(entry) {if(!entry.map)return;const s=entry.host.read(),mission=readMission(entry);entry.mission.dataset.state=mission.status;entry.mission.textContent=(mission.missionComplete?'Mission complete':'Mission pending')+' · '+(mission.missionComplete&&mission.status==='passed'?'verified':mission.status==='unavailable'?'observations unavailable':'awaiting confirmed outcome');
    entry.inventory.textContent=s.resources.inventory.length?s.resources.inventory.map(i=>i.instanceId+' × '+i.quantity).join(', '):'No recovered items';entry.plotText.textContent=s.recipe.plots.map(p=>p.slot+': '+p.fixture).join(' · ');
    entry.objective.textContent=objectiveById(s.recipe.objective.id).name+' · '+s.recipe.objective.slot+' · '+(s.recipe.conditions.id==='transition'?'new transition':'current-state audit');entry.coordinates.textContent='Metres '+s.actor.position.x.toFixed(1)+', '+s.actor.position.y.toFixed(1)+' · main ground 64 × 64';
  }
  function extensions(entry){
    const map=document.createElement('section');map.className='ground-card';map.setAttribute('aria-label','Ground fixture controls');
    const title=document.createElement('h1');title.textContent='Night Ledger';map.append(title);
    const sub=document.createElement('small');sub.textContent='Independent test ground · registry v1';map.append(sub);
    entry.objective=document.createElement('p');entry.mission=document.createElement('p');entry.mission.setAttribute('role','status');entry.plotText=document.createElement('small');entry.coordinates=document.createElement('small');map.append(entry.objective,entry.mission,entry.plotText,entry.coordinates);
    const button=(name,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',()=>Promise.resolve(fn()).catch(e=>{entry.mission.textContent=e.message;}));map.append(b);};
    button('Fixtures & golden checks',()=>openFixtures(entry));button('Save sandbox',()=>dispatch({version:1,type:'save'}));button('Reload save',async()=>{const r=await dispatch({version:1,type:'reload'});if(!r.ok)entry.mission.textContent=r.reason;});
    const help=document.createElement('details');help.className='ground-help';const summary=document.createElement('summary');summary.textContent='How to try';const prose=document.createElement('p');prose.textContent='WASD / arrows or the shared joystick. E or a contextual action button operates a nearby target. Enter opens player setup. Fixture Try explicitly resets this sandbox. The rock keeps its native 5.5 cm radius; the ring marks it.';help.append(summary,prose);map.append(help);entry.setup.ui.slots.map.append(map);entry.map=map;
    const inventory=document.createElement('section');inventory.className='ground-card ground-inventory';inventory.setAttribute('aria-label','Recovered inventory');const heading=document.createElement('strong');heading.textContent='Recovered rock';entry.inventory=document.createElement('p');inventory.append(heading,entry.inventory);entry.setup.ui.slots.inventory.append(inventory);render(entry);
  }
  async function replace({recipe,spawn,packet,signal}={}) {
    if(retired)return refusal('APPLICATION_RETIRED','The ground has retired.');const request=++epoch;pending?.abort();const controller=new AbortController();pending=controller;
    const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    const prior=current;prior?.setup.dispatch({version:1,type:'pause',paused:true});let next,committed=false;
    try {
      insist(!controller.signal.aborted,'PREPARATION_CANCELLED','Sandbox preparation cancelled.');next=await prepare({recipe,spawn,packet,signal:controller.signal});
      insist(!retired&&request===epoch&&!controller.signal.aborted,'PREPARATION_CANCELLED','A newer request or cancellation owns preparation.');
      current=next;committed=true;next.stage.style.visibility='';extensions(next);next.surface.canvas.focus();
      if(prior)await retire(prior);return accepted();
    }catch(e){if(committed)return accepted({observerErrors:1,reason:e.message});if(next)await retire(next);return refusal(e.code||'PREPARATION_FAILED',e.message);}
    finally{signal?.removeEventListener('abort',abort);if(pending===controller)pending=null;if(!committed&&current===prior)prior?.setup.dispatch({version:1,type:'pause',paused:false});}
  }
  async function applyRecipe(input,{signal}={}) {
    const valid=validateRecipe(input);if(!valid.ok)return valid;const entry=current;entry.setup.dispatch({version:1,type:'pause',paused:true});let candidate,visual;
    try{insist(!signal?.aborted,'PREPARATION_CANCELLED','Composition preparation cancelled.');candidate=entry.host.prepareRecipe(valid.recipe);if(!candidate.ok)return candidate;visual=entry.surface.prepare(candidate.snapshot);await Promise.resolve();
      insist(current===entry&&!signal?.aborted,'PREPARATION_CANCELLED','Composition preparation cancelled.');const r=candidate.commit();if(!r.ok)return r;
      // Acceptance is now durable. Presentation/notification errors cannot undo it.
      let observerErrors=0;try{visual.commit();entry.checklist.configure(valid.recipe);entry.missionBaseline=entry.host.read();render(entry);entry.setup.ui.refresh();}catch{observerErrors++;}return {...r,observerErrors};
    }catch(e){return refusal(e.code||'PREPARATION_FAILED',e.message);}finally{visual?.dispose();candidate?.dispose?.();if(current===entry)entry.setup.dispatch({version:1,type:'pause',paused:false});}
  }
  function validatePacket(value) {
    fields(value,['kind','version','installationSHA','recipe','host','setup','checklist','missionBaseline']);insist(value.kind==='nautilus-test-ground-checkpoint'&&value.version===1,'SAVE_VERSION','Use a complete ground checkpoint v1.');
    insist(value.installationSHA===installation.package.sha256,'PACKAGE_MISMATCH','Restore with the exact installed engine package.');insist(canonical(value.recipe)===canonical(value.host.recipe)&&canonical(value.recipe)===canonical(value.checklist.recipe),'SAVE_RECIPE','World, setup recipe and checklist must belong together.');
    insist(value.setup.ownedWorld===null&&value.setup.configuration.actorId==='player'&&canonical(value.setup.configuration.content)===canonical(identity),'SAVE_OWNERSHIP','Restore the host-owned world and exact player setup.');
    insist(canonical(value.setup.configuration)===canonical(value.checklist.playerSetup),'SAVE_SETUP','Checklist evidence belongs to another player setup recipe.');
    insist(value.missionBaseline?.kind==='nautilus-test-ground-state','BASELINE_REQUIRED','Keep the objective baseline distinct from current state.');return value;
  }
  async function dispatch(command,options={}) {
    if(retired)return refusal('APPLICATION_RETIRED','The ground has retired.');
    if(command?.version!==1)return refusal('COMMAND_VERSION','Use test ground command v1.');
    try {
      switch(command.type) {
        case 'recipe': return applyRecipe(command.recipe,options);
        case 'selection': return current.checklist.select(command.ids);
        case 'run-selected': {const prior=current.setup.readControls().context.blocked;current.setup.dispatch({version:1,type:'pause',paused:true});try{const results=current.checklist.run();return accepted({checklist:results});}finally{current.setup.dispatch({version:1,type:'pause',paused:prior});}}
        case 'try': {const f=fixtureById(command.fixtureId);insist(f,'FIXTURE_UNAVAILABLE','This fixture is deferred.');return replace({recipe:goldenRecipe(f,current.host.read().recipe),spawn:fixtureSpawn(f),signal:options.signal});}
        case 'reset': return replace({recipe:command.recipe||current.host.read().recipe,signal:options.signal});
        case 'save': {const saved=checkpoint();storage.setItem(SAVE_KEY,JSON.stringify(saved));return accepted({checkpoint:saved});}
        case 'reload': {const value=command.checkpoint??storage.getItem(SAVE_KEY);insist(value,'NO_SAVED_SANDBOX','Save this sandbox first.');const packet=validatePacket(clone(typeof value==='string'?JSON.parse(value):value));return replace({recipe:packet.recipe,packet,signal:options.signal});}
        case 'export': return accepted({json:JSON.stringify({kind:'nautilus-test-ground-report',version:1,installation:{package:installation.package,engineCommit:installation.engineCommit},checkpoint:checkpoint()})});
        case 'import': {const report=JSON.parse(command.json);insist(report.kind==='nautilus-test-ground-report'&&report.version===1,'REPORT_VERSION','Use a complete exported report v1.');return dispatch({version:1,type:'reload',checkpoint:report.checkpoint},options);}
        default:return refusal('UNSUPPORTED_COMMAND','Use recipe, selection, try, run-selected, reset, save, reload, export or import.');
      }
    }catch(e){return refusal(e.code||'COMMAND_FAILED',e.message);}
  }
  function openFixtures(entry) {
    if(entry!==current)return;entry.setup.dispatch({version:1,type:'pause',paused:true});const dialog=document.createElement('dialog');dialog.className='fixture-dialog';dialog.setAttribute('aria-label','Golden fixture checklist');entry.dialog=dialog;
    const h=document.createElement('h2');h.textContent='Choose · try · verify';const p=document.createElement('p');p.textContent='Registry v1 · two committed golden fixtures. Run selected uses isolated baselines and preserves your current sandbox. Try / Reset explicitly starts a fresh sandbox with 37 health, 9 AP and 11 stamina.';dialog.append(h,p);
    const form=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Independent composition';form.append(legend);const selects={},recipe=entry.host.read().recipe;
    const choose=(key,label,options,value)=>{const wrap=document.createElement('label');wrap.textContent=label;const s=document.createElement('select');s.setAttribute('aria-label',label);for(const [id,name]of options){const o=document.createElement('option');o.value=id;o.textContent=name;s.append(o);}s.value=value;wrap.append(s);form.append(wrap);selects[key]=s;};
    for(const slot of REGISTRY.slots)choose(slot.id,slot.name,REGISTRY.plots.map(p=>[p.id,p.name]),recipe.plots.find(p=>p.slot===slot.id).fixture);
    choose('objective','Mission objective',REGISTRY.objectives.map(o=>[o.id,o.name]),recipe.objective.id);choose('target','Objective target',REGISTRY.slots.map(s=>[s.id,s.name]),recipe.objective.slot);
    choose('conditions','Expected observations',REGISTRY.conditionProfiles.map(o=>[o.id,o.name]),recipe.conditions.id);
    choose('observers','Observation support',[['full','All required observations'],['without-passage','Passage observer unavailable']],recipe.observers.profile);choose('probe','Verifier probe',[['ordinary','Ordinary provider'],['acknowledge-without-door-effect','Broken acknowledgement · expect FAIL']],recipe.probe);
    dialog.append(form);const feedback=document.createElement('p');feedback.className='feedback';feedback.setAttribute('role','status');const table=document.createElement('table');table.setAttribute('aria-label','Versioned golden fixtures');
    function renderTable(){table.replaceChildren();const head=document.createElement('tr');for(const label of ['Run','Fixture / baseline','Outcome','Try']){const th=document.createElement('th');th.textContent=label;head.append(th);}table.append(head);
      for(const row of entry.checklist.rows()){const tr=document.createElement('tr'),select=document.createElement('td'),info=document.createElement('td'),status=document.createElement('td'),tryCell=document.createElement('td'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=row.selected;checkbox.disabled=!row.available;checkbox.setAttribute('aria-label','Select '+row.name);checkbox.addEventListener('change',()=>{const ids=entry.checklist.rows().filter(r=>r.id===row.id?checkbox.checked:r.selected).map(r=>r.id);dispatch({version:1,type:'selection',ids});renderTable();});select.append(checkbox);info.textContent=row.name+(row.version?' · v'+row.version:'');const detail=document.createElement('small');detail.textContent=row.reason||fixtureById(row.id)?.baseline||'';info.append(detail);const out=document.createElement('output');out.dataset.state=row.status;out.textContent=row.status;status.append(out);if(fixtureById(row.id)){const b=document.createElement('button');b.type='button';b.textContent='Try · reset';b.setAttribute('aria-label','Try '+row.name);b.disabled=!row.available;b.addEventListener('click',async()=>{close();const r=await dispatch({version:1,type:'try',fixtureId:row.id});if(!r.ok)current.mission.textContent=r.reason;});tryCell.append(b);}tr.append(select,info,status,tryCell);table.append(tr);}}
    const button=(text,fn,primary=false)=>{const b=document.createElement('button');b.type='button';b.textContent=text;if(primary)b.className='primary';b.addEventListener('click',()=>Promise.resolve(fn()).catch(e=>feedback.textContent=e.message));dialog.append(b);return b;};
    button('Apply composition',async()=>{const next=clone(entry.host.read().recipe);next.plots=next.plots.map(p=>({...p,fixture:selects[p.slot].value,version:1}));next.objective={id:selects.objective.value,version:1,slot:selects.target.value};next.conditions={id:selects.conditions.value,version:1};next.observers.profile=selects.observers.value;next.probe=selects.probe.value;const r=await dispatch({version:1,type:'recipe',recipe:next});feedback.textContent=r.ok?'Composition accepted. Previous verification results are stale.':r.code+': '+r.reason;renderTable();},true);
    dialog.append(table);button('Run selected',async()=>{const r=await dispatch({version:1,type:'run-selected'});feedback.textContent=r.ok?entry.checklist.rows().filter(row=>fixtureById(row.id)).map(row=>row.id+': '+row.status+(!row.selected?' · not run (not selected)':row.reason?' · '+row.reason:row.lastResult?.reason?' · '+row.lastResult.reason:'')).join('\n'):r.reason;renderTable();},true);
    button('Explicit sandbox reset',async()=>{close();await dispatch({version:1,type:'reset'});});button('Return to ground',close);
    const text=document.createElement('textarea');text.setAttribute('aria-label','Exact recipe and result JSON');button('Export recipe & results',async()=>{const r=await dispatch({version:1,type:'export'});text.value=r.json;});button('Import exact report',async()=>{const json=text.value;close();const r=await dispatch({version:1,type:'import',json});if(!r.ok)current.mission.textContent=r.reason;});dialog.append(text,feedback);
    const deferred=document.createElement('p');deferred.className='deferred';deferred.textContent='Railway: adjoining 240 × 180 m reserved, unbuilt. Driving: open south strip only. Combat, fire and height fixtures await reviewed providers and golden baselines. No historical ledger asset is supplied.';dialog.append(deferred);
    function close(){if(!dialog.isConnected)return;dialog.close();dialog.remove();if(entry.dialog===dialog)entry.dialog=null;if(current===entry){entry.setup.dispatch({version:1,type:'pause',paused:false});entry.surface.canvas.focus();}}
    entry.closeDialog=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);renderTable();dialog.showModal();
  }
  const first=await replace();if(!first.ok)throw Object.assign(Error(first.reason),{code:first.code});
  return Object.freeze({dispatch,checkpoint,read(){return {world:current.host.read(),setup:current.setup.read(),checklist:current.checklist.read(),mission:readMission(current),surface:current.surface.read()};},
    get setup(){return current.setup;},get host(){return current.host;},get surface(){return current.surface;},
    dispose(){if(disposePromise)return disposePromise;retired=true;++epoch;pending?.abort();disposePromise=retire(current);return disposePromise;}});
}
