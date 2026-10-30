import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as W from '../packages/windows-core/index.js';
import * as F from '../packages/adapters/farmyard/windows.js';
import * as Source from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/solo-game.js';
import {windowSystem as nativeWindows} from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/window-catalogue.js';
import {paneHarness} from './fixtures/farmyard-window-impacts/harness.mjs';
import fs from 'node:fs';
import {windowStateSchemas} from '../tools/farmyard-window-state-schemas.mjs';
const clone=value=>structuredClone(value),deps={W,F,Source},make=(t,hooks)=>{const h=paneHarness(deps,hooks);t.after(()=>h.binding.dispose());return h;},refused=(action,code)=>assert.throws(action,e=>e.code===code,code);
function kernel(h){const base=W.openWindowGeometry(h.store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),state=W.openWindowState(base,h.store.windowState);return {base,state,geometry:W.windowStateGeometry(state)};}

test('a query observation, miss, bare boolean or retired authority cannot break a pane or spend resources',t=>{
  const h=make(t),p=h.packet(),{state,geometry}=kernel(h),before=h.token();refused(()=>W.stageConfirmedWindowImpact(geometry,state,p),'UNCONFIRMED_IMPACT');refused(()=>W.stageConfirmedWindowImpact(geometry,state,p,{authority:true}),'UNCONFIRMED_IMPACT');
  const authority=W.createWindowImpactAuthority({version:1,confirm:()=>false});refused(()=>W.stageConfirmedWindowImpact(geometry,state,p,{authority}),'UNCONFIRMED_IMPACT');W.retireWindowImpactAuthority(authority);refused(()=>W.stageConfirmedWindowImpact(geometry,state,p,{authority}),'UNCONFIRMED_IMPACT');
  h.hooks.confirm=(_h,loan)=>({attestation:false,sourceNext:clone(loan.source)});refused(()=>h.binding.perform(p),'UNCONFIRMED_IMPACT');assert.equal(h.token(),before);assert.equal(h.writes,0);assert.equal(h.publications.length,0);
  h.hooks={};h.store.source.confirmedHostImpacts=[];const observed=h.packet();refused(()=>h.binding.perform(observed),'UNCONFIRMED_IMPACT');assert.equal(h.writes,0);
});

test('native confirmed first-hit glass and the next round match source masks/sequence/revision; host owns costs',t=>{
  const h=make(t),p=h.packet('burst',0),sourceBefore=clone(h.store.source),native=clone(sourceBefore),result=h.binding.perform(p);assert.equal(result.committed,true);assert.equal(result.receipt.outcome,'pane-broken');
  nativeWindows.breakPane(native,p.placementId,p.paneId,p.confirmation.point,{cause:'bullet',direction:p.confirmation.direction});assert.deepEqual(h.store.source.windowBreaks,native.windowBreaks);assert.equal(h.store.source.windowSequence,native.windowSequence);assert.equal(h.store.source.revision,native.revision);
  const revised=W.windowStateGeometry(result.next);assert.equal(W.serializeWindowGeometry(W.openWindowGeometry(W.serializeWindowGeometry(revised),{definitions:F.FARMYARD_WINDOW_DEFINITIONS})),W.serializeWindowGeometry(revised),'Fast monotonic revisions retain the exact full-compiler digest.');
  assert.equal(Source.hero(h.store.source).hp,37);assert.equal(Source.hero(h.store.source).ap,11);assert.equal(Source.hero(h.store.source).ammo.pistol,8);assert.equal(Source.hero(h.store.source).stamina,.125);for(const field of ['seed','elapsed','queue','futureRetained'])assert.deepEqual(h.store.source[field],sourceBefore[field]);assert.deepEqual(Source.hero(h.store.source).futureRetained,Source.hero(sourceBefore).futureRetained);
  assert.deepEqual(h.publications.map(p=>p.name),['invalidate','publish','present']);const next=h.packet('burst',1);assert.equal(next.placementId,'clear-b');assert.notEqual(next.id,p.id);assert.equal(h.binding.perform(next).committed,true);assert.equal(h.store.windowState.receipts.length,2);assert.equal(h.binding.query(h.ray).hit,null);
});

test('exact typed retries remain quiet after later impacts, unrelated host movement/resources and complete reload',t=>{
  const h=make(t),first=h.packet(7,0);assert.equal(h.binding.perform(first).committed,true);assert.equal(h.binding.perform(h.packet('7',0)).committed,true);const u=Source.hero(h.store.source);u.hp=19;u.ap=.25;u.ammo.pistol=2;h.store.source.queue=[{x:9,y:14}];h.store.source.elapsed+=.75;h.store.source.seed=777;h.store.source.futureRetained.clock.remaining=.125;
  const saved=h.binding.save();h.store=F.openFarmyardWindowHostSave(saved,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});const before=h.token(),published=h.publications.length,confirmations=h.confirmations,queries=h.queries,writes=h.writes,result=h.binding.perform(first);assert.equal(result.repeated,true);assert.equal(result.committed,false);assert.deepEqual(result.effects,[]);assert.equal(h.token(),before);assert.equal(h.binding.save(),saved);assert.equal(h.confirmations,confirmations);assert.equal(h.queries,queries);assert.equal(h.writes,writes);assert.equal(h.publications.length,published);assert.deepEqual(JSON.parse(first.id)[1],['integer',7]);assert.deepEqual(JSON.parse(h.store.windowState.receipts[1].command.id)[1],['string','7']);
});

test('changed payload conflicts before stale geometry/revision checks; wrong scopes and aliases cannot reuse receipts',t=>{
  const h=make(t),first=h.packet();h.binding.perform(first);for(const change of [p=>p.expectedRevision++,p=>p.confirmation.geometryRevision++,p=>p.confirmation.point.x+=.1,p=>p.definitionDigest='0'.repeat(64),p=>p.confirmation.hostToken='1'.repeat(64)]){const p=clone(first);change(p);assert.equal(h.binding.perform(p).code,'COMMAND_ID_CONFLICT');}
  for(const [field,code]of [['stateId','WRONG_WINDOW_STATE'],['sceneId','WRONG_WINDOW_SCENE'],['contentEpoch','STALE_CONTENT_EPOCH'],['contentDigest','CONTENT_MISMATCH']]){const p=clone(first);p[field]=field==='contentDigest'?'f'.repeat(64):'different';refused(()=>h.binding.perform(p),code);}
  const alias=clone(first);alias.id='arbitrary';refused(()=>h.binding.perform(alias),'INVALID_IMPACT_ID');const index=clone(first);index.confirmation.impactIndex=1;index.id=W.windowImpactId(index.confirmation.hostCommandId,0,1);refused(()=>h.binding.perform(index),'UNSUPPORTED_IMPACT_INDEX');
});

test('fresh commands bind exact geometry, host and complete-world query; a nearer world wall/actor wins',t=>{
  const h=make(t),p=h.packet(),before=h.token();const bad=clone(p);bad.confirmation.geometryDigest='a'.repeat(64);refused(()=>h.binding.perform(bad),'STALE_WINDOW_GEOMETRY');assert.equal(h.token(),before);
  h.store.source.futureRetained.clock.remaining=.1;refused(()=>h.binding.perform(p),'STALE_QUERY_CONTEXT');assert.equal(h.writes,0);
  const near=make(t),packet=near.packet();near.store.source.obstacles.push({kind:'wall',x0:7,x1:9,y0:13.5,y1:13.7,z0:0,height:2});assert.equal(near.binding.query(near.ray).hit,null);refused(()=>near.binding.perform(packet),'STALE_QUERY_CONTEXT');assert.equal(near.writes,0);
  const body=make(t);body.store.source.units[1].x=8;body.store.source.units[1].y=14;assert.equal(body.binding.query(body.ray).hit,null);assert.equal(body.writes,0);
});

test('complete prospective saves preserve unknown retained data and source set/field order, and reject partial/corrupt aggregates',t=>{
  const h=make(t);h.binding.perform(h.packet());const saved=h.binding.save(),opened=F.openFarmyardWindowHostSave(saved,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});assert.equal(F.serializeFarmyardWindowHostSave(opened,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),saved);assert.ok(opened.source.seen instanceof Set);assert.deepEqual(Object.keys(opened.source),Object.keys(h.store.source));assert.equal(opened.source.windowEvents.length,0,'No cosmetic source events are replayed or manufactured.');
  for(const change of [s=>delete s.source.windowBreaks,s=>s.source.windowSequence++,s=>s.windowState.broken={},s=>s.windowState.receipts=[],s=>s.windowState.receipts[0].command.confirmation.point.h+=.1,s=>s.geometry.document.placements[0].x++,s=>s.source.units[0].hp=null,s=>s.source.windows[0].definitionId='unknown']){const candidate=JSON.parse(saved);change(candidate);assert.throws(()=>F.openFarmyardWindowHostSave(candidate,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}));}
  const large=JSON.parse(saved);large.source.futureRetained.text='x'.repeat(8000001);refused(()=>F.openFarmyardWindowHostSave(large,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),'STATE_LIMIT');
  let called=0;const getter=clone(opened);Object.defineProperty(getter.source,'hidden',{enumerable:true,get(){called++;return 1;}});refused(()=>F.openFarmyardWindowHostSave(getter,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),'INVALID_DATA');assert.equal(called,0);
});

for(const field of ['seen','visible','detected'])test('encoded '+field+' rejects lossy native sets before standalone loads or any live restore write',t=>{
  const h=make(t,{validate:()=>true}),saved=h.binding.save(),before=h.token(),entry=field==='detected'?h.store.source.units[1].id:Source.key(1,2),bad=JSON.parse(saved);bad.source[field]=[entry,entry];
  for(const input of [bad,JSON.stringify(bad)]){
    refused(()=>F.openFarmyardWindowHostSave(input,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),'INVALID_SOURCE_SET');
    refused(()=>F.serializeFarmyardWindowHostSave(input,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),'INVALID_SOURCE_SET');
    refused(()=>h.binding.restore(input),'INVALID_SOURCE_SET');
  }
  const invalid=field==='detected'?[{},true,1.5]:[{},17,'duplicate-cell','01,2','-0,2','1,2\n','9007199254740992,0'];
  for(const entry of invalid){const value=JSON.parse(saved);value.source[field]=[entry];assert.throws(()=>F.openFarmyardWindowHostSave(value,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}));assert.throws(()=>F.serializeFarmyardWindowHostSave(value,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}));assert.throws(()=>h.binding.restore(value));}
  assert.equal(h.token(),before);assert.equal(h.binding.save(),saved);assert.equal(h.candidates.length,0);assert.equal(h.writes,0);assert.equal(h.publications.length,0);
});

test('native fog sets retain insertion order and detected IDs retain their source types across save and live restore',t=>{
  const h=make(t),{state}=kernel(h),source=clone(h.store.source);source.seen=new Set([Source.key(9,10),Source.key(1,2)]);source.visible=new Set([Source.key(3,4),Source.key(1,2)]);source.detected=new Set([7,'7',0,'guard:one']);
  const save=F.createFarmyardWindowHostSave(state,source,{sequenceOrigin:0}),text=F.serializeFarmyardWindowHostSave(save,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),opened=F.openFarmyardWindowHostSave(text,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});
  for(const field of ['seen','visible','detected']){assert.ok(opened.source[field] instanceof Set);assert.deepEqual([...opened.source[field]],[...source[field]]);}
  assert.equal(F.serializeFarmyardWindowHostSave(opened,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),text);assert.equal(h.binding.restore(text).committed,true);assert.equal(h.binding.save(),text);assert.equal(h.writes,1);assert.deepEqual(h.publications.map(p=>p.name),['invalidate','publish']);assert.deepEqual([...h.store.source.detected],[7,'7',0,'guard:one']);
});

test('unmarked source arrays keep ordinary duplicates, element values and ordering, including beside native sets',t=>{
  const h=make(t),{state}=kernel(h),source=clone(h.store.source),arrays={seen:['duplicate-cell','duplicate-cell','1,2'],visible:[{retained:1},{retained:1},false],detected:[7,'7',7,{retained:true}]};Object.assign(source,clone(arrays));
  for(const marked of [null,'seen','visible','detected']){
    const mixed=clone(source);if(marked)mixed[marked]=new Set(marked==='detected'?[7,'7']:['9,10','1,2']);const save=F.createFarmyardWindowHostSave(state,mixed,{sequenceOrigin:0}),text=F.serializeFarmyardWindowHostSave(save,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),opened=F.openFarmyardWindowHostSave(text,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});
    assert.deepEqual(opened.setFields,marked?[marked]:[]);for(const field of ['seen','visible','detected'])if(field!==marked){assert.ok(Array.isArray(opened.source[field]));assert.deepEqual(opened.source[field],arrays[field]);}assert.equal(F.serializeFarmyardWindowHostSave(opened,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),text);
    if(marked===null){h.binding.dispose();h.store=opened;h.binding=F.connectFarmyardWindows(h.services);const next=JSON.parse(text);next.source.seen.push('duplicate-cell');assert.equal(h.binding.restore(next).committed,true);assert.deepEqual(h.store.source.seen,[...arrays.seen,'duplicate-cell']);assert.ok(Array.isArray(h.store.source.seen));}
  }
});

test('all six exact versioned services are necessary; an engine-only manifest cannot claim a connected host',t=>{
  const h=make(t);for(const service of W.WINDOW_HOST_SERVICES){const missing={...h.services};delete missing[service.id];refused(()=>F.connectFarmyardWindows(missing),'MISSING_BINDING');const wrong={...h.services,[service.id]:{...h.services[service.id],version:2}};refused(()=>F.connectFarmyardWindows(wrong),'UNSUPPORTED_HOST_SERVICE');}
  const {state}=kernel(h),requirements=W.windowRequirements(state);assert.equal(requirements.required.length,7);const engineOnly=W.windowCompatibility(state);assert.equal(engineOnly.ok,false);for(const service of W.WINDOW_HOST_SERVICES)assert.ok(engineOnly.errors.some(e=>e.feature===service.id&&e.action===service.action));assert.equal(W.assertWindowCompatible(state,h.binding.manifest()).ok,true);
});

test('CAS compares every retained field and the final active fence, and closes old fences permanently',t=>{
  const h=make(t),p=h.packet(),before=h.token();h.hooks.beforeWrite=owner=>{owner.store.source.futureRetained.unknown.push('concurrent');};assert.equal(h.binding.perform(p).code,'STALE_HOST');assert.equal(h.writes,0);assert.equal(h.store.windowState.revision,0);assert.notEqual(h.token(),before);assert.equal(h.publications.length,0);assert.equal(h.candidates[0].canCommit(),false);
  h.hooks={};assert.equal(h.binding.perform(h.packet()).committed,true);assert.equal(h.candidates.at(-1).canCommit(),false);
  const retired=make(t),intent=retired.packet();retired.hooks.beforeWrite=(owner,candidate)=>{assert.equal(candidate.canCommit(),true);owner.binding.dispose();assert.equal(candidate.canCommit(),false);};assert.equal(retired.binding.perform(intent).code,'DISPOSED');assert.equal(retired.writes,0);
});

test('unknown before/after-write exceptions and non-boolean acknowledgements recover with the original identity',t=>{
  for(const mode of ['throw-before','throw-after','invalid-before','invalid-after']){const h=make(t),p=h.packet(),before=h.token();h.hooks.cas=(owner,c)=>{if(mode.endsWith('after')){assert.equal(c.canCommit(),true);owner.store=c.next;owner.writes++;}if(mode.startsWith('throw'))throw Object.create(null);return {unknown:true};};const result=h.binding.perform(p);assert.equal(result.committed,null,mode);assert.equal(result.code,'COMMIT_OUTCOME_UNKNOWN');assert.deepEqual(result.recovery.command,p);assert.deepEqual(result.effects,[]);assert.equal(h.publications.length,0);assert.equal(h.candidates[0].canCommit(),false);if(mode.endsWith('before'))assert.equal(h.token(),before);h.hooks={};const retry=h.binding.perform(p);assert.equal(retry.repeated,mode.endsWith('after'));assert.equal(retry.committed,mode.endsWith('before'));assert.equal(h.store.windowState.receipts.length,1);assert.equal(Source.hero(h.store.source).ap,11);assert.equal(Source.hero(h.store.source).ammo.pistol,8);}
});

test('reentry, retirement and stale postcommit ownership stop later publication without undoing an acknowledged impact',t=>{
  for(const service of ['read','context','capture','confirm','validate','beforeWrite','invalidate','publish','present']){const h=make(t),p=h.packet();let attempted=false;const hook=(owner,loan)=>{if(!attempted){attempted=true;refused(()=>owner.binding.perform(p),'REENTRANT_OPERATION');refused(()=>owner.binding.save(),'REENTRANT_OPERATION');}if(service==='confirm'){const next=clone(loan.source);Source.hero(next).ap--;Source.hero(next).ammo.pistol--;return {attestation:W.windowImpactAttestation(loan.command),sourceNext:next};}if(service==='validate')return true;};h.hooks[service]=hook;assert.equal(h.binding.perform(p).committed,true,service);assert.equal(h.store.windowState.receipts.length,1);}
  for(const service of ['read','context','capture','confirm','validate']){const h=make(t),p=h.packet(),before=h.token();h.hooks[service]=owner=>owner.binding.dispose();refused(()=>h.binding.perform(p),'DISPOSED');assert.equal(h.token(),before);assert.equal(h.writes,0);}
  for(const service of ['afterWrite','invalidate','publish','present']){const h=make(t),p=h.packet();h.hooks[service]=owner=>owner.binding.dispose();const result=h.binding.perform(p);assert.equal(result.committed,true,service);assert.equal(result.publicationStopped,'disposed');assert.equal(h.store.windowState.receipts.length,1);}
  const stale=make(t);stale.hooks.invalidate=owner=>{owner.store.source.elapsed+=.01;};const result=stale.binding.perform(stale.packet());assert.equal(result.committed,true);assert.equal(result.publicationStopped,'stale');assert.deepEqual(stale.publications.map(p=>p.name),['invalidate']);
});

test('borrowed callback/result mutations never alias persistence; hostile publication throws stay acknowledged',t=>{
  const h=make(t),p=h.packet(),result=h.binding.perform(p),before=h.token();result.hostNext.source.units[0].hp=-99;result.hostNext.source.seen.clear();result.hostNext.source.futureRetained.unknown.push('result');result.receipt.command.id='changed';for(const loan of h.loans){if(loan.source){loan.source.units[0].hp=-999;loan.source.seen.clear();}if(loan.save)loan.save.source.elapsed=-99;}assert.equal(h.token(),before);assert.ok(h.binding.save().length>0);
  for(const name of ['invalidate','publish','present']){const h=make(t);h.hooks[name]=()=>{throw Object.defineProperty({},'message',{get(){throw Error('message getter must not run');}});};const r=h.binding.perform(h.packet());assert.equal(r.committed,true);assert.equal(r.presentationErrors.length,1);assert.equal(r.presentationErrors[0].service,name);assert.equal(h.store.windowState.revision,1);}
});

test('live restore validates the whole prospective save, never rewinds receipts and never replays cosmetic effects',t=>{
  const h=make(t),initial=h.binding.save(),p=h.packet();h.binding.perform(p);const saved=h.binding.save();refused(()=>h.binding.restore(initial),'RESTORE_HISTORY_CONFLICT');assert.equal(h.binding.restore(saved).repeated,true);
  const origin=JSON.parse(saved);origin.sequenceOrigin++;origin.source.windowSequence++;refused(()=>h.binding.restore(origin),'RESTORE_HISTORY_CONFLICT');
  const newer=JSON.parse(saved);newer.source.units[0].hp=13;newer.source.elapsed=27;const prior=h.publications.length,result=h.binding.restore(newer);assert.equal(result.committed,true);assert.deepEqual(h.publications.slice(prior).map(e=>e.name),['invalidate','publish']);assert.equal(Source.hero(h.store.source).hp,13);assert.equal(h.binding.perform(p).repeated,true);
  const refusedSave=make(t),intent=refusedSave.packet(),before=refusedSave.token();refusedSave.hooks.validate=()=>false;refused(()=>refusedSave.binding.perform(intent),'HOST_SAVE_REFUSED');assert.equal(refusedSave.token(),before);assert.equal(refusedSave.writes,0);
});

test('full host context keeps semantic jail-door and lock refusal at commit/save time',t=>{
  for(const kind of ['jail-door-closed','jail-door-open','closed-door','door']){const h=make(t);h.store.source.edges['s:8:12']=kind;refused(()=>h.binding.save(),'WINDOW_DOOR_CONFLICT');assert.equal(h.writes,0);}
  const h=make(t);h.store.source.edgeLocks={'s:8:12':50};refused(()=>h.binding.save(),'WINDOW_DOOR_CONFLICT');
});

test('public pane/host entries stay headless without clocks, RNG, IO, storage or a renderer',()=>{
  const r=spawnSync(process.execPath,['--input-type=module','-e',`for(const key of ['window','document','navigator','THREE','fetch','localStorage','performance'])Object.defineProperty(globalThis,key,{get(){throw Error(key)}});Math.random=()=>{throw Error('RNG')};Date.now=()=>{throw Error('clock')};await import('./packages/windows-core/index.js');await import('./packages/adapters/farmyard/windows.js');`],{encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(r.status,0,r.stderr);
});

test('solid hits retain all 128 durable identities, stop without glass damage, and retry quietly at capacity',()=>{
  const document={kind:'nautilus-window-placement-document',version:1,id:'solid-yard',profileId:W.WINDOW_GEOMETRY_CONTRACT.profileId,queryRevision:0,placements:[{id:'grid',definitionId:'window.waist.grid-2x2.2m',x:8.5,y:12.5}],bindings:[{placementId:'grid',engineInstanceId:'grid-view'}],observedBroken:{}},base=W.compileWindowPlacements(document,{definitions:F.FARMYARD_WINDOW_DEFINITIONS,world:{id:'solid-world',floorId:'ground',grid:{width:32,height:32}},edgeFacts:[8,9].map(x=>({edge:`s:${x}:12`,semantic:'wall',locked:false}))});
  let state=W.createWindowState(base,{id:'solid-state',contentEpoch:'epoch',broken:{}}),first,confirmations=0;const authority=W.createWindowImpactAuthority({version:1,confirm({command}){confirmations++;return W.windowImpactAttestation(command);}}),ray={purpose:'projectile',floorId:'ground',from:{x:8.5,y:15.5,h:1.1},to:{x:8.5,y:5.5,h:1.1}};
  function packet(round){const geometry=W.windowStateGeometry(state),hit=W.queryWindowSegment(geometry,ray).nearest;assert.equal(hit.role,'mullion');return {version:1,id:W.windowImpactId('capacity',round,0),profileId:state.profileId,sceneId:state.sceneId,stateId:state.id,contentEpoch:state.contentEpoch,contentDigest:state.contentDigest,expectedRevision:state.revision,placementId:hit.placementId,partId:hit.partId,paneId:null,definitionDigest:hit.definitionDigest,confirmation:{hostCommandId:'capacity',round,impactIndex:0,geometryRevision:geometry.queryRevision,geometryDigest:geometry.geometryDigest,hostToken:'1'.repeat(64),queryToken:'2'.repeat(64),cause:'bullet',point:hit.point,direction:-1,ray}};}
  for(let round=0;round<128;round++){const p=packet(round);first??=p;const result=W.stageConfirmedWindowImpact(W.windowStateGeometry(state),state,p,{authority});assert.equal(result.ok,true);assert.equal(result.receipt.outcome,'solid-hit');assert.deepEqual(result.effects,[]);state=result.next;}
  const wire=W.serializeWindowState(state),restored=W.openWindowState(base,wire);assert.equal(W.serializeWindowState(restored),wire);assert.deepEqual(state.broken,{});assert.equal(W.stageConfirmedWindowImpact(base,restored,first).repeated,true);assert.equal(W.stageConfirmedWindowImpact(W.windowStateGeometry(state),state,packet(128),{authority}).code,'JOURNAL_LIMIT');assert.equal(confirmations,128);W.retireWindowImpactAuthority(authority);
});

test('new state/host structural schemas reproduce without registering host promises',()=>{
  for(const {file,schema}of windowStateSchemas())assert.equal(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),JSON.stringify(schema,null,2)+'\n');
});

test('external complete-world context is compared inside CAS and again before every publication',t=>{
  const h=make(t),p=h.packet(),before=h.token();h.hooks.beforeWrite=owner=>owner.externalContextRevision++;assert.equal(h.binding.perform(p).code,'STALE_HOST');assert.equal(h.token(),before);assert.equal(h.writes,0);assert.equal(h.publications.length,0);
  const after=make(t);after.hooks.afterWrite=owner=>owner.externalContextRevision++;const result=after.binding.perform(after.packet());assert.equal(result.committed,true);assert.equal(result.publicationStopped,'stale');assert.equal(after.publications.length,0);assert.equal(after.store.windowState.receipts.length,1);
  const retry=make(t),first=retry.packet();retry.binding.perform(first);const saved=retry.token();retry.hooks.context=()=>{throw Error('temporary world registry outage');};retry.hooks.capture=()=>{throw Error('temporary query outage');};assert.equal(retry.binding.perform(first).repeated,true);assert.equal(retry.token(),saved);
});

test('saved native cosmetic tails never become break authority or replayed presentation',t=>{
  const h=make(t),p=h.packet();h.binding.perform(p);h.store.source.windowEvents=[{sequence:1,instanceId:p.placementId,paneId:p.paneId,point:clone(p.confirmation.point),direction:-1,cause:'bullet',seed:123}];const saved=h.binding.save(),before=h.publications.length;h.store=F.openFarmyardWindowHostSave(saved,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});assert.equal(h.binding.perform(p).repeated,true);assert.equal(h.publications.length,before);assert.equal(h.store.source.windowEvents.length,1);assert.equal(h.store.windowState.receipts.length,1);
});
