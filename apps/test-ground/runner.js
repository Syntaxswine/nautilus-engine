import {createActionRouter} from '@nautilus-engine/map-core/player-ui';
import {createSetupConfiguration} from '@nautilus-engine/map-core/player-setup';
import {REGISTRY,CONTENT_SOURCE,defaultRecipe,fixtureById,objectiveById,plotById,slotById,validateRecipe,goldenRecipe,fixtureSpawn,observerCapabilities} from './registry.js';
import {createGroundHost} from './host.js';
import {clone,canonical,fields,insist,refusal,accepted} from './data.js';
import {verifyDriving,exerciseDriving} from './driving.js';

export const RUNNER_VERSION=1;
const available=(fixture,recipe)=>{if(recipe.conditions.id!=='transition')return 'This golden fixture requires new-transition observations. A current-state audit does not exercise the transition.';const objective=objectiveById(fixture.objective),caps=observerCapabilities(recipe.observers.profile),missing=objective.requires.filter(c=>!caps.includes(c));return missing.length?'Missing observations: '+missing.join(', ')+'. Select the full observer profile.':null;};
const port=c=>({service:c,version:1,role:c.includes('event')?'committed-event':'confirmed-state',units:c==='passage-query-v1'?'metres; upright body':'native record',frame:'world-x-y-h',lifetime:'sandbox',cardinality:'one authoritative provider'});
export function evaluateObjective({objective,slot,baseline,observed,conditions='transition'}) {
  if(slot==='driving')return verifyDriving(objective,baseline,observed.state);
  const transition=conditions==='transition';
  const failures=[],checks=[];const expect=(name,expected,value)=>{const ok=canonical(expected)===canonical(value);checks.push({name,expected:clone(expected),observed:clone(value),ok});if(!ok)failures.push(name+' expected '+JSON.stringify(expected)+' but observed '+JSON.stringify(value));};
  const target=slot+(objective.id==='door-passage'?'/door':':rock'),priorIDs=new Set(baseline.events.map(e=>e.id)),events=[...new Map(observed.state.events.filter(e=>!priorIDs.has(e.id)&&e.targetId===target||!priorIDs.has(e.id)&&e.rockId===target).map(e=>[e.id,e])).values()];
  let missionComplete=false;
  if(objective.id==='door-passage') {
    const before=baseline.interactions.doors.find(d=>d.id===target),door=observed.state.interactions.doors.find(d=>d.id===target);missionComplete=door?.open===true;
    if(transition)expect('baseline.door-closed',false,before?.open??null);expect('door.open',objective.expected.open,door?.open??null);expect('passage.clear',objective.expected.passage,observed.passage?.ok??null);
    if(transition)expect('new.door-opened-events',objective.expected.newEvents,events.filter(e=>e.type==='door-opened').length);
  } else {
    const before=baseline.rocks.find(r=>r.id===target),rock=observed.state.rocks.find(r=>r.id===target),count=s=>s.resources.inventory.filter(i=>i.instanceId===target).reduce((n,i)=>n+i.quantity,0);
    missionComplete=rock?.phase==='carried'&&rock.ownerId==='player'&&count(observed.state)===1;
    if(transition)expect('baseline.rock-in-world','world',before?.phase??null);expect('rock.phase',objective.expected.phase,rock?.phase??null);expect('rock.ownerId',objective.expected.ownerId,rock?.ownerId??null);expect('rock.old-world-position',objective.expected.position,rock?.position??null);
    if(transition)expect('new.inventory-gain',objective.expected.inventoryGain,count(observed.state)-count(baseline));expect('inventory.instance-count',1,count(observed.state));if(transition)expect('new.rock-picked-up-events',objective.expected.newEvents,events.filter(e=>e.type==='rock-picked-up').length);
  }
  if(transition){expect('fixture.ap-spent',objective.expected.apSpent,baseline.resources.ap-observed.state.resources.ap);expect('resources.health-retained',baseline.resources.health,observed.state.resources.health);expect('resources.stamina-retained',baseline.resources.stamina,observed.state.resources.stamina);}
  return {status:failures.length?'failed':'passed',scope:transition?'new-transition':'current-state-only',missionComplete,checks,failures,eventIds:events.map(e=>e.id)};
}
export function runFixture(fixture,recipe,runId,setupConfiguration=null,executionSource=null) {
  const objective=objectiveById(fixture.objective),sandboxRecipe=goldenRecipe(fixture,recipe),reason=available(fixture,sandboxRecipe),record={fixture:{id:fixture.id,version:fixture.version,sourcePin:CONTENT_SOURCE,sourceRole:'original Night Ledger content lineage; current registry is identified by executionSource.consumer'},source:{engineBaseline:REGISTRY.engineSource,engineCommit:executionSource?.engine?.dirty===false?executionSource.engine.commit:null,registry:'content-data.json',baseline:fixture.baseline},seed:recipe.seed,recipe:clone(sandboxRecipe),requiredPorts:objective.requires.map(port),placement:{slot:fixture.slot==='driving'?{id:'driving',boundsM:[8,48,56,64]}:clone(slotById(fixture.slot)),plot:fixture.slot==='driving'?{id:'collision-course',version:1,course:fixture.course}:clone(plotById(fixture.plot)),rules:['fixed footprint and floor','no occupied replacement','no carried-item retirement','no silent resource reset']},objective:clone(objective),observer:{...objective.observer,profile:recipe.observers.profile,runnerVersion:RUNNER_VERSION},expectationVersion:fixture.expectationVersion,runId};
  record.playerSetup=clone(setupConfiguration);record.executionSource=clone(executionSource);record.executionProfile='isolated public command authority; rendering and native controls are separate browser evidence';
  if(reason)return {...record,status:'unavailable',missionComplete:false,reason,checks:[],command:null};
  const host=createGroundHost({recipe:sandboxRecipe,spawn:fixtureSpawn(fixture)});
  try {
    if(fixture.slot==='driving'){
      const baseline=host.read(),command=exerciseDriving(host,fixture),observed={state:host.read(),passage:null},verification=evaluateObjective({objective,slot:'driving',baseline,observed});
      const refused=command.receipts.filter(r=>!r.ok);if(refused.length){verification.status='failed';verification.missionComplete=false;verification.failures.push(...refused.map(r=>r.code+': '+r.reason));}
      return {...record,...verification,reason:verification.failures.join('; ')||null,baseline,observed,command};
    }
    const baseline=host.read(),commandId=runId+':'+fixture.id,provider={...host.actions,request:(actionId,offer)=>host.requestAction({commandId,actionId,offer})};
    const router=createActionRouter({providers:[provider],readContext:()=>({token:runId,blocked:false})});
    try {
      const actionId=fixture.slot+(fixture.objective==='door-passage'?'/door/open':':rock/pickup'),action=router.read().actions.find(a=>a.actionId===actionId);
      if(!action?.enabled)return {...record,baseline,status:'unavailable',missionComplete:false,reason:action?.reason||'No compatible ordinary action is offered.',checks:[],command:null};
      const command=clone(action.intent),receipt=router.request(command),after=host.read(),observation={state:after,passage:fixture.objective==='door-passage'?host.passage(fixture.slot):null},verification=evaluateObjective({objective,slot:fixture.slot,baseline,observed:observation});
      if(!receipt.ok){verification.status='failed';verification.failures.unshift('Command refused: '+receipt.reason);}
      // A same-ID retry is deliberately checked through the same consumer service.
      const request={commandId,actionId,offer:command.offer},retry=host.requestAction(request),afterRetry=host.read();
      if(!retry.repeated||canonical(after)!==canonical(afterRetry)){verification.status='failed';verification.failures.push('Retry duplicated a command, cost or effect.');}
      return {...record,...verification,reason:verification.failures.join('; ')||null,baseline,observed:observation,command:{intent:command,commandId,receipt,retry},evidence:{eventIds:verification.eventIds,receiptId:receipt.receiptId||null,expectations:'committed registry data; never derived from this run',scope:'public pure simulation outcomes; manual native scene reviewed separately'}};
    }finally{router.dispose();}
  }finally{host.dispose();}
}
export function createChecklist(recipe=defaultRecipe(),saved,setupConfiguration=createSetupConfiguration({content:recipe.content}),sourceIdentity={runnerVersion:RUNNER_VERSION,contentSource:CONTENT_SOURCE}) {
  let current=clone(recipe),playerSetup=clone(setupConfiguration),executionSource=clone(sourceIdentity),selection=Object.fromEntries(REGISTRY.golden.map(f=>[f.id,true])),results={},serial=0;
  const valid=validateRecipe(current);insist(valid.ok,valid.code,valid.reason);
  if(saved){fields(saved,['version','recipe','playerSetup','executionSource','selection','results','serial']);insist(saved.version===1,'CHECKLIST_VERSION','Use checklist v1.');insist(canonical(saved.recipe)===canonical(recipe),'CHECKLIST_RECIPE','Saved checklist belongs to another recipe.');playerSetup=clone(saved.playerSetup);selection=clone(saved.selection);results=clone(saved.results);serial=saved.serial;insist(Number.isSafeInteger(serial)&&serial>=0,'CHECKLIST_SERIAL','Invalid run serial.');for(const key of Object.keys(selection))insist(!!fixtureById(key)&&typeof selection[key]==='boolean','SELECTION_INVALID','Use only registered fixture selections.');}
  const recipeKey=()=>canonical({registry:CONTENT_SOURCE,recipe:current,playerSetup,executionSource,expectations:REGISTRY.objectives,fixtures:REGISTRY.golden});
  const invalidate=()=>{for(const r of Object.values(results)){r.status='stale';r.reason='Recipe or declared dependency changed. Run again from a new baseline.';}};
  if(saved)for(const [id,r]of Object.entries(results)){const f=fixtureById(id);insist(f&&r.fixture?.id===id&&r.fixture.version===f.version&&canonical(r.objective)===canonical(objectiveById(f.objective)),'RESULT_VERSION','Saved results must keep their committed golden fixture and expectations.');}
  if(saved&&Object.values(results).some(r=>r.dependencyKey!==recipeKey()))invalidate();
  const read=()=>({version:1,recipe:clone(current),playerSetup:clone(playerSetup),executionSource:clone(executionSource),selection:clone(selection),results:clone(results),serial});
  return Object.freeze({read,
    rows(){return [...REGISTRY.golden.map(f=>({id:f.id,name:f.name,version:f.version,selected:selection[f.id],available:!available(f,current),reason:available(f,current),status:selection[f.id]?(results[f.id]?.status||'pending'):'disabled',lastResult:clone(results[f.id]||null)})),...REGISTRY.deferred.map(f=>({...f,version:null,selected:false,available:false,status:'unavailable'}))];},
    configure(next){const valid=validateRecipe(next);if(!valid.ok)return valid;const before=recipeKey();current=valid.recipe;if(before!==recipeKey())invalidate();return accepted();},
    setPlayerSetup(next){if(canonical(playerSetup)!==canonical(next)){playerSetup=clone(next);invalidate();}},
    setExecutionSource(next){if(canonical(executionSource)!==canonical(next)){executionSource=clone(next);invalidate();}},
    select(ids){try{insist(Array.isArray(ids)&&new Set(ids).size===ids.length,'SELECTION_INVALID','Use unique fixture IDs.');for(const id of ids){const f=fixtureById(id);insist(f,'FIXTURE_UNAVAILABLE','Unimplemented fixtures cannot be selected.');}selection=Object.fromEntries(REGISTRY.golden.map(f=>[f.id,ids.includes(f.id)]));return accepted();}catch(e){return refusal(e.code,e.message);}},
    run(){const key=recipeKey();serial++;const runId='run-'+serial;
      for(const f of REGISTRY.golden)if(selection[f.id]){results[f.id]={status:'running',dependencyKey:key};results[f.id]={...runFixture(f,current,runId,playerSetup,executionSource),dependencyKey:key};}
      return read();},
    export(){return JSON.stringify(read());}
  });
}
