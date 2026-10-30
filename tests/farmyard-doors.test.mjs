import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import * as D from '../packages/adapters/farmyard/doors.js';
import * as Source from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/solo-game.js';
import {moduleClosure} from '../tools/distribution.mjs';
import {farmyardDoorSchemas} from '../tools/farmyard-door-schemas.mjs';

const snapshot='vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/',clone=value=>structuredClone(value),projection=host=>D.projectFarmyardDoorContext(host,{geometry:Source.geometry(host)});
function ready({phase='player',alert=true,axis='e',swing=1,isolated=false}={}){
  let host=Source.createSoloGame();const hero=Source.hero(host);
  for(const guard of host.units.filter(unit=>unit.team==='guard'&&unit.hp>0)){guard.x=36;guard.y=27;guard.alert=alert;}
  if(isolated){host.map=host.map.map(row=>row.map(()=> 'yard'));host.edges={};host.interactables=[{id:'fixture-door',kind:'door',name:'Fixture door',x:20+(axis==='e'?.5:0),y:20+(axis==='s'?.5:0),edge:axis+':20:20',swing,range:1.65,open:false,inventory:[]}];host.edges[host.interactables[0].edge]='closed-door';host.props=[];host.obstacles=[];}
  const door=host.interactables.find(object=>object.kind==='door');hero.x=door.x-(axis==='e'?.75:0);hero.y=door.y-(axis==='s'?.75:0);hero.ap=12;hero.heading=0;host.phase=phase;host.engaged=phase==='player';host=clone(host);Source.refresh(host,{forceFog:true});return host;
}
function command(state,door,action,id='door-1'){return {version:1,id,expectedRevision:state.revision,actorId:state.control.actorId,doorId:door.id,action};}
function parity(host,action='open',id='parity'){
  const door=host.interactables.find(object=>object.kind==='door'),before=Source.encodeSave(host),state=D.createFarmyardDoorState({id:'parity-context',...projection(host)}),request=command(state,door,action,id),a=D.previewFarmyardDoor(state,request),b=Source.Core.previewInteraction(host,door.id,action);
  for(const key of ['ok','reason','cost'])assert.equal(a[key],b[key],key);assert.equal(Source.encodeSave(host),before,'Projection and preview must not alter the host');
  const staged=D.stageFarmyardDoor(state,request),original=Source.Core.performInteraction(host,door.id,action);assert.equal(staged.ok,original.ok);
  if(staged.ok)assert.deepEqual(D.farmyardDoorContext(staged.next),projection(host));else{assert.equal(D.serializeFarmyardDoorState(staged.next),D.serializeFarmyardDoorState(state));assert.equal(Source.encodeSave(host),before);}
  return {state,request,staged,host};
}

test('door conformance reuses exact reviewed snapshot bytes and the runtime has no donor/editor/mover-history dependency',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../docs/reviews/farmyard-doors.sources.json',import.meta.url)));
  assert.equal(manifest.reusedEvidenceCommit,'c7beb44fa254b2d72657f7e3a959920216f09b35');assert.equal(manifest.commit,D.FARMYARD_DOOR_PROFILE.sourceCommit);
  for(const file of manifest.files){const bytes=fs.readFileSync(new URL('../'+snapshot+file.path,import.meta.url));assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),file.gitBlob);}
  const closure=moduleClosure(['packages/adapters/farmyard/doors.js']);assert.ok(closure.every(file=>file.startsWith('packages/')&&!file.includes('/parts-core/')&&!file.includes('/runtime-core/')&&!file.endsWith('/capabilities.js')),JSON.stringify(closure));
});

test('adjacent schema resources match the versioned generator and integration/card identities',()=>{
  const card=D.farmyardDoorUsageCard(),request=JSON.parse(fs.readFileSync(new URL('../docs/reviews/farmyard-doors/integration-request.json',import.meta.url)));
  for(const [index,{file,schema}]of farmyardDoorSchemas().entries()){assert.equal(fs.readFileSync(new URL('../packages/adapters/farmyard/doors/'+file,import.meta.url),'utf8'),JSON.stringify(schema,null,2)+'\n');assert.equal(request.schemas[index].uri,schema.$id);assert.equal(new URL(index?card.hostSaveSchema:card.schema).pathname.endsWith(file),true);}
  assert.equal(request.profile.id,D.FARMYARD_DOOR_PROFILE.id);assert.deepEqual(request.requiredHostServices.map(({id})=>id),D.FARMYARD_DOOR_COMPONENT.requiredHostServices);const missing=consumer(sourceState(ready()));missing.capabilities.pop();assert.throws(()=>D.assertFarmyardDoorCompatible(sourceState(ready()),missing),error=>error.code==='NAUTILUS_COMPATIBILITY');
});

test('source clear reach, control and calm/alert/combat AP costs match without touching held gear',()=>{
  for(const [phase,alert]of [['explore',false],['explore',true],['player',true]]){const host=ready({phase,alert});if(phase==='explore'&&alert){host.phase='explore';host.engaged=false;Source.hero(host).ap=1.25;}const hero=Source.hero(host),apBefore=hero.ap,roundBefore=host.round,ammo=clone(hero.ammo),weapon=hero.weapon,{staged}=parity(host);assert.ok(staged.ok);assert.equal(staged.receipt.cost,phase==='explore'&&!alert?0:1);assert.deepEqual(hero.ammo,ammo);assert.equal(hero.weapon,weapon);assert.equal(staged.next.queue.length,0);if(phase==='explore'&&alert){assert.equal(staged.receipt.before.ap,1.25);assert.equal(staged.next.control.phase,'player');assert.equal(staged.next.control.round,roundBefore+1);assert.equal(staged.receipt.after.ap,hero.maxAp,'Source contact refill overwrites the preceding 1 AP debit.');}if(phase==='player'){assert.equal(staged.receipt.after.ap,apBefore-1);assert.equal(staged.next.control.round,roundBefore);}}
  for(const mode of ['enemy','ap','range']){const host=ready(),hero=Source.hero(host);if(mode==='enemy')host.phase='enemy';if(mode==='ap')hero.ap=.99;if(mode==='range')hero.x-=2;assert.equal(parity(host).staged.ok,false);}
});

test('both edge orientations and swing signs retain exact current solid-leaf geometry',()=>{
  for(const axis of ['e','s'])for(const swing of [-1,1]){const host=ready({axis,swing,isolated:true}),door=host.interactables[0],opened=parity(host).staged;assert.ok(opened.ok);const box=D.farmyardDoorColliders(opened.next)[0],source=Source.geometry(host).find(box=>box.interactionId===door.id);for(const key of ['x0','x1','y0','y1','height'])assert.equal(box[key],source[key]);assert.equal(box.kind,'wall');assert.equal(D.farmyardDoorGeometry(opened.next).filter(box=>box.interactionId===door.id).length,1);assert.ok(parity(host,'close').staged.ok);}
});

test('endpoint occupants, static reach blockers and deliberate source-only endpoint behavior match',()=>{
  {const host=ready({isolated:true}),door=host.interactables[0],guard=host.units.find(unit=>unit.team==='guard'&&unit.hp>0);guard.x=door.x+.5;guard.y=door.y-.56;assert.equal(parity(host).staged.code,'DOOR_OCCUPIED');}
  {const host=ready({isolated:true}),door=host.interactables[0];host.obstacles=[{x0:door.x-.4,x1:door.x-.2,y0:door.y-.5,y1:door.y+.5,height:2,kind:'wall'}];assert.equal(parity(clone(host)).staged.code,'CLEAR_REACH_REQUIRED');}
  {const host=ready({isolated:true}),door=host.interactables[0],guard=host.units.find(unit=>unit.team==='guard'&&unit.hp>0);guard.x=door.x+.5;guard.y=door.y;assert.ok(parity(host).staged.ok,'Source permits a mid-arc-only occupant; native motion profile is unchanged');}
  {const host=ready({isolated:true}),door=host.interactables[0];host.obstacles=[{x0:door.x+.4,x1:door.x+.6,y0:door.y-.62,y1:door.y-.5,height:2,kind:'wall'}];assert.ok(parity(clone(host)).staged.ok,'Source endpoint policy does not inspect static pose/sweep obstruction');}
  {const host=ready({isolated:true}),door=host.interactables[0],hero=Source.hero(host);hero.x=door.x+.5;hero.y=door.y-.56;assert.equal(parity(host).staged.code,'DOOR_OCCUPIED','The controlled hero also blocks the destination leaf.');}
  {const host=ready({isolated:true}),door=host.interactables[0],guard=host.units.find(unit=>unit.team==='guard');guard.x=door.x+.5;guard.y=door.y-.56;guard.hp=0;assert.ok(parity(host).staged.ok,'A dead actor does not block the destination leaf.');}
  {const host=ready({isolated:true}),door=host.interactables[0],guard=host.units.find(unit=>unit.team==='guard');guard.x=door.x-.3;guard.y=door.y;guard.isMoving=true;assert.ok(parity(host).staged.ok,'Straight source reach does not check living actors along its segment.');}
});

test('stationary opening forces fog/sight and preserves the source post-debit engagement/AP ordering',()=>{
  const host=ready({isolated:true,phase:'explore',alert:false}),door=host.interactables[0],hero=Source.hero(host),guard=host.units.find(unit=>unit.team==='guard'&&unit.hp>0);guard.x=door.x+.75;guard.y=door.y;guard.heading=180;hero.ap=2;host.engaged=false;host.phase='explore';const fresh=clone(host);Source.refresh(fresh,{forceFog:true});assert.equal(fresh.phase,'explore');
  const {staged}=parity(fresh);assert.equal(staged.receipt.cost,0);assert.equal(staged.next.control.phase,'player');assert.equal(staged.next.actors.find(actor=>actor.id===hero.id).ap,hero.maxAp);assert.equal(staged.next.control.detected.includes(guard.id),true);assert.ok(staged.next.world.visible.includes(Math.round(guard.x)+','+Math.round(guard.y)));assert.deepEqual(staged.next.world.fogAt,{x:hero.x,y:hero.y});
  const closed=parity(fresh,'close').staged;assert.ok(closed.ok);assert.equal(Source.Core.canSee(fresh,Source.hero(fresh),fresh.units.find(unit=>unit.id===guard.id)),false);assert.equal(closed.next.actors.find(actor=>actor.id===guard.id).alert,true,'Closing occludes sight without clearing the source sticky alert.');assert.ok(closed.next.world.seen.includes(Math.round(guard.x)+','+Math.round(guard.y)),'Previously explored cells remain seen on close.');
  let player=ready({isolated:true,phase:'player',alert:false}),playerDoor=player.interactables[0],playerHero=Source.hero(player),newGuard=player.units.find(unit=>unit.team==='guard');newGuard.x=playerDoor.x+.75;newGuard.y=playerDoor.y;newGuard.heading=180;playerHero.ap=2;player.engaged=true;player=clone(player);Source.refresh(player,{forceFog:true});const round=player.round;assert.equal(player.units.find(unit=>unit.id===newGuard.id).alert,false);const revealed=parity(player).staged;assert.ok(revealed.ok);assert.equal(revealed.receipt.cost,1);assert.equal(revealed.receipt.after.ap,1,'Newly seeing a guard during player phase must not refill AP.');assert.equal(revealed.next.control.phase,'player');assert.equal(revealed.next.control.round,round);assert.equal(revealed.next.actors.find(actor=>actor.id===newGuard.id).alert,true);
});

test('source walk/air classifications, rounded reach corners, sight lobes and prone height refresh stay exact',()=>{
  for(const kind of ['wall','crate','prop','part']){
    let host=ready({isolated:true}),door=host.interactables[0];host.obstacles=[{x0:door.x-.4,x1:door.x-.2,y0:door.y-.1,y1:door.y+.1,z0:0,height:.5,kind}];assert.equal(parity(clone(host)).staged.ok,kind==='part');
    host=ready({isolated:true});door=host.interactables[0];host.obstacles=[{x0:door.x-.4,x1:door.x-.2,y0:door.y+.24,y1:door.y+.34,z0:0,height:.5,kind}];assert.ok(parity(clone(host)).staged.ok,'Rounded source reach clears a corner that a square footprint may refuse.');
    host=ready({isolated:true});door=host.interactables[0];const guard=host.units.find(unit=>unit.team==='guard');guard.x=door.x+2.5;guard.y=door.y;guard.heading=180;guard.stance='prone';Source.hero(host).stance='prone';host.obstacles=[{x0:door.x+1.6,x1:door.x+1.8,y0:door.y-.15,y1:door.y+.15,z0:0,height:.5,kind}];parity(clone(host));
  }
  for(const species of ['horse','donkey','goat','cow','sheep','hen','pig-foreman','pig-director','skunk','unlisted-animal']){const host=ready({isolated:true});Source.hero(host).species=species;Source.hero(host).cone=90;Source.hero(host).heading=540;const guard=host.units.find(unit=>unit.team==='guard');guard.species=species;guard.cone=90;guard.heading=-90;guard.sneaking=true;parity(clone(host));}
});

test('host injury/movement/AP adoption, saved replay and exact retries retain current state and emit no effects again',()=>{
  const host=ready({isolated:true}),{state,request,staged}=parity(host);let current=staged.next;const fresh=clone(D.farmyardDoorContext(current));fresh.actors[0].hp=37;fresh.actors[0].ap=1.25;fresh.actors[0].x-=.05;
  assert.equal(D.matchesFarmyardDoorContext(current,fresh),false);const adoption=D.adoptFarmyardDoorContext(current,{version:1,id:'host-injury',expectedRevision:current.revision,...fresh});assert.ok(adoption.ok);assert.equal(adoption.expected.state,D.serializeFarmyardDoorState(current));assert.equal(JSON.parse(adoption.expected.context).actors[0].hp,37);current=D.openFarmyardDoorState(D.serializeFarmyardDoorState(adoption.next));assert.equal(current.actors[0].ap,1.25);assert.equal(current.actors[0].hp,37);
  const closed=D.stageFarmyardDoor(current,command(current,current.doors[0],'close','close-1'));assert.ok(closed.ok,closed.code+': '+closed.reason);const retry=D.stageFarmyardDoor(closed.next,request);assert.equal(retry.ok,true);assert.equal(retry.repeated,true);assert.equal(retry.next.doors[0].open,false);assert.equal(retry.next.actors[0].ap,.25);assert.deepEqual(retry.consequences,[]);assert.equal(retry.presentation,null);assert.equal(D.stageFarmyardDoor(closed.next,{...request,action:'close'}).code,'COMMAND_ID_CONFLICT');assert.equal(D.stageFarmyardDoor(current,{...request,id:'stale-new'}).code,'STALE_REVISION');assert.equal(D.adoptFarmyardDoorContext(current,{version:1,id:'no-change',expectedRevision:current.revision,...D.farmyardDoorContext(current)}).code,'NO_CONTEXT_CHANGE');assert.equal(state.revision,0);
});

test('strict source/profile boundaries reject unsupported functional facts, raw getters, hidden data and corrupted saves',()=>{
  for(const change of [h=>h.edgeLocks={'e:7:18':50},h=>h.interactables.find(o=>o.kind==='door').locked=true,h=>h.interactables.find(o=>o.kind==='door').pairId='pair',h=>h.interactables.find(o=>o.kind==='door').hp=100,h=>h.units[0].z=1,h=>h.units[0].burningTurns=1,h=>h.windows=[{}]]){const host=ready();change(host);assert.throws(()=>projection(host));}
  const host=ready();let calls=0;Object.defineProperty(host.units[0],'ap',{enumerable:true,get(){calls++;return 12;}});assert.throws(()=>projection(host),error=>error.code==='INVALID_DATA');assert.equal(calls,0);
  const {staged}=parity(ready()),wire=D.serializeFarmyardDoorState(staged.next);for(const change of [s=>s.actors[0].ap++,s=>s.doors[0].open=false,s=>s.receipts[0].cost++,s=>s.receipts[0].command.expectedRevision++,s=>s.initial.world.staticBoxes[0].kind='glass']){const next=JSON.parse(wire);change(next);assert.throws(()=>D.openFarmyardDoorState(next));}
  const hidden=JSON.parse(wire);Object.defineProperty(hidden,'toJSON',{value:()=>{calls++;return {};}});assert.throws(()=>D.openFarmyardDoorState(hidden));assert.equal(calls,0);const sparse=JSON.parse(wire);delete sparse.actors[0];assert.throws(()=>D.openFarmyardDoorState(sparse));
});

test('prospective aggregate byte and node limits refuse a complete unsaveable checkpoint before adoption',()=>{
  const state=D.createFarmyardDoorState({id:'limits',...projection(ready())}),before=D.serializeFarmyardDoorState(state),context=D.farmyardDoorContext(state);context.queue=[{opaque:'x'.repeat(4100000)}];let result=D.adoptFarmyardDoorContext(state,{version:1,id:'bytes',expectedRevision:0,...context});assert.equal(result.ok,false);assert.equal(result.code,'STATE_LIMIT');assert.equal(D.serializeFarmyardDoorState(result.next),before);
  context.queue=[{opaque:Array.from({length:60000},()=>({a:0,b:0,c:0,d:0,e:0}))}];result=D.adoptFarmyardDoorContext(state,{version:1,id:'nodes',expectedRevision:0,...context});assert.equal(result.ok,false);assert.equal(result.code,'STATE_LIMIT');assert.equal(D.serializeFarmyardDoorState(state),before);
});

test('the optional door entry works with renderer, DOM, storage, network, clock and RNG unavailable',()=>{
  const code=`for(const key of ['window','document','navigator','THREE','fetch','localStorage','sessionStorage','indexedDB'])Object.defineProperty(globalThis,key,{get(){throw Error(key);}});Math.random=()=>{throw Error('RNG')};Date.now=()=>{throw Error('clock')};const api=await import('./packages/adapters/farmyard/doors.js');if(api.FARMYARD_DOOR_PROFILE.authority!=='retained-host-context')throw Error('profile');`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(child.status,0,child.stderr);
});

function sourceState(host,id='host-context'){return D.createFarmyardDoorState({id,...projection(host)});}
function consumer(state){const requirement=D.farmyardDoorRequirements(state);return {id:'retained-farmyard-test',contractVersion:1,schemas:[{...requirement.schema,versions:[1]}].map(({id,versions})=>({id,versions})),capabilities:requirement.required.map(({id})=>({id,versions:[1]}))};}
function capture(state,host,id='fresh-host'){return {version:1,id,expectedRevision:state.revision,...projection(host)};}

test('whole-host staging matches original source logs, revision, fog sets and post-door contact without altering unrelated host data',()=>{
  for(const mode of ['combat','calm','contact']){
    let host=ready({isolated:true,phase:mode==='combat'?'player':'explore',alert:mode==='combat'});const door=host.interactables[0];
    if(mode==='contact'){const guard=host.units.find(unit=>unit.team==='guard');guard.x=door.x+.75;guard.y=door.y;guard.heading=180;host=clone(host);Source.refresh(host,{forceFog:true});}
    Source.hero(host).hp=37;Source.hero(host).stamina=1.125;host.seed=2091;host.solo.dressings=0;host.effect={kind:'unrelated-host-presentation',cursor:3};host.queue=[{x:Source.hero(host).x,y:Source.hero(host).y-.1}];Source.hero(host).isMoving=true;
    const state=sourceState(host),request=command(state,door,'open'),before=D.farmyardDoorHostToken(host),staged=D.stageFarmyardDoorHost(state,host,request,{geometry:Source.geometry(host)});assert.ok(staged.ok,staged.code);assert.equal(D.farmyardDoorHostToken(host),before);assert.ok(staged.hostNext.seen instanceof Set);assert.ok(staged.hostNext.visible instanceof Set);assert.ok(staged.hostNext.detected instanceof Set);
    assert.ok(Source.performInteraction(host,door.id,'open').ok);assert.equal(D.farmyardDoorHostToken(staged.hostNext),D.farmyardDoorHostToken(host));assert.equal(staged.hostNext.units[0].hp,37);assert.equal(staged.hostNext.units[0].stamina,1.125);assert.deepEqual(staged.hostNext.effect,{kind:'unrelated-host-presentation',cursor:3});assert.equal(staged.hostNext.seed,2091);assert.equal(staged.hostNext.solo.dressings,0);
    const wire=D.serializeFarmyardDoorHostSave(staged.next,staged.hostNext,{geometry:Source.geometry(staged.hostNext)}),restored=D.openFarmyardDoorHostSave(wire,{geometryForHost:Source.geometry});assert.equal(D.farmyardDoorHostToken(restored.host),D.farmyardDoorHostToken(host));assert.equal(D.serializeFarmyardDoorState(restored.doorState),D.serializeFarmyardDoorState(staged.next));
  }
});

test('a complete original-map save retains edge enumeration while static collider identity is independent of raw query order',()=>{
  const host=ready(),state=sourceState(host),door=host.interactables.find(value=>value.kind==='door'),raw=Source.geometry(host);assert.deepEqual(D.projectFarmyardDoorContext(host,{geometry:[...raw].reverse()}),projection(host));
  const opened=D.stageFarmyardDoorHost(state,host,command(state,door,'open'),{geometry:raw});assert.ok(opened.ok);const closed=D.stageFarmyardDoorHost(opened.next,opened.hostNext,command(opened.next,door,'close','close-map'),{geometry:Source.geometry(opened.hostNext)});assert.ok(closed.ok);const saved=D.serializeFarmyardDoorHostSave(closed.next,closed.hostNext,{geometry:Source.geometry(closed.hostNext)}),restored=D.openFarmyardDoorHostSave(saved,{geometryForHost:Source.geometry});assert.deepEqual(Object.keys(restored.host.edges),Object.keys(closed.hostNext.edges));assert.equal(D.farmyardDoorHostToken(restored.host),D.farmyardDoorHostToken(closed.hostNext));assert.deepEqual(projection(restored.host),D.farmyardDoorContext(restored.doorState));
  const reordered=clone(closed.hostNext);reordered.edges=Object.fromEntries(Object.entries(reordered.edges).reverse());assert.deepEqual(projection(reordered),projection(closed.hostNext));assert.notEqual(D.farmyardDoorHostToken(reordered),D.farmyardDoorHostToken(closed.hostNext),'The complete CAS also protects relevant retained source enumeration.');
});

test('retained source movement, injury and AP adopt without relocation/healing; retries remain quiet after intervening actions and checkpoints',()=>{
  let host=ready({isolated:true}),state=sourceState(host);const door=host.interactables[0],first=command(state,door,'open','original-open'),opened=D.stageFarmyardDoorHost(state,host,first,{geometry:Source.geometry(host)});assert.ok(opened.ok);host=opened.hostNext;state=opened.next;
  const hero=Source.hero(host);assert.ok(Source.move(host,hero,hero.x,hero.y+.1));for(let frame=0;frame<4;frame++)Source.tick(host,.05);assert.notEqual(hero.y,20);hero.hp=37;hero.ap=1.25;hero.stamina=.125;const previous=D.farmyardDoorHostToken(host);
  assert.equal(D.stageFarmyardDoorHost(state,host,command(state,door,'close','too-early'),{geometry:Source.geometry(host)}).code,'CONTEXT_ADOPTION_REQUIRED');const checkpoint=capture(state,host),adopted=D.adoptFarmyardDoorHost(state,host,checkpoint,{geometry:Source.geometry(host)});assert.ok(adopted.ok,adopted.code);assert.equal(D.farmyardDoorHostToken(adopted.hostNext),previous);assert.equal(JSON.parse(adopted.expected.context).actors[0].hp,37);state=adopted.next;
  const closed=D.stageFarmyardDoorHost(state,host,command(state,door,'close','close-current'),{geometry:Source.geometry(host)});assert.ok(closed.ok,closed.code);host=closed.hostNext;state=closed.next;const retry=D.stageFarmyardDoorHost(state,host,first,{geometry:Source.geometry(host)});assert.equal(retry.repeated,true);assert.equal(D.farmyardDoorHostToken(retry.hostNext),D.farmyardDoorHostToken(host));assert.equal(retry.next.doors[0].open,false);assert.deepEqual(retry.consequences,[]);assert.equal(retry.presentation,null);assert.equal(D.adoptFarmyardDoorHost(state,host,checkpoint,{geometry:Source.geometry(host)}).repeated,true);
  const save=D.serializeFarmyardDoorHostSave(state,host,{geometry:Source.geometry(host)}),restored=D.openFarmyardDoorHostSave(save,{geometryForHost:Source.geometry});assert.equal(restored.host.units[0].hp,37);assert.equal(restored.host.units[0].ap,.25);assert.equal(restored.host.units[0].stamina,.125);assert.equal(restored.host.units[0].y,hero.y);assert.equal(D.stageFarmyardDoorHost(restored.doorState,restored.host,first,{geometry:Source.geometry(restored.host)}).repeated,true);
  const corrupt=JSON.parse(save);corrupt.source.units[0].ap=14;assert.throws(()=>D.openFarmyardDoorHostSave(corrupt,{geometryForHost:Source.geometry}),error=>error.code==='CONTEXT_ADOPTION_REQUIRED');const mismatched=JSON.parse(save);mismatched.source.edges[door.edge]='door';assert.throws(()=>D.openFarmyardDoorHostSave(mismatched,{geometryForHost:Source.geometry}));const missing=JSON.parse(save);delete missing.source.seen;assert.throws(()=>D.openFarmyardDoorHostSave(missing,{geometryForHost:Source.geometry}));
});

test('complete prospective host-save budget, stale captures and impure detached geometry queries fail before a host commit',()=>{
  const host=ready({isolated:true}),state=sourceState(host),request=command(state,host.interactables[0],'open');host.effect={note:'x'.repeat(7970000)};const before=D.farmyardDoorHostToken(host),result=D.stageFarmyardDoorHost(state,host,request,{geometry:Source.geometry(host)});assert.equal(result.ok,false);assert.equal(result.code,'STATE_LIMIT');assert.equal(D.farmyardDoorHostToken(result.hostNext),before);assert.equal(result.next.revision,0);assert.deepEqual(result.consequences,[]);assert.equal(result.receipt,null);
  const ordinary=ready({isolated:true}),original=sourceState(ordinary),checkpoint=capture(original,ordinary);ordinary.units[0].hp=37;assert.equal(D.adoptFarmyardDoorHost(original,ordinary,checkpoint,{geometry:Source.geometry(ordinary)}).code,'STALE_CONTEXT');checkpoint.actors[0].hp=38;assert.equal(D.adoptFarmyardDoorHost(original,ordinary,checkpoint,{geometry:Source.geometry(ordinary)}).code,'STALE_CONTEXT');
  const saved=D.serializeFarmyardDoorHostSave(original,ready({isolated:true}),{geometry:Source.geometry(ready({isolated:true}))});assert.throws(()=>D.openFarmyardDoorHostSave(saved,{geometryForHost:copy=>{copy.units[0].hp=100;return Source.geometry(copy);}}),error=>error.code==='IMPURE_GEOMETRY_QUERY');assert.equal(original.actors[0].hp,Source.hero(ready({isolated:true})).hp);
});

test('one retained-host connection enforces all CAS tokens, isolates presentation failure and disposes without owning borrowed services',()=>{
  let host=ready({isolated:true});host.obstacles=[{x0:30,x1:31,y0:25,y1:26,height:.5,kind:'prop',cover:true}];host=clone(host);let doorState=sourceState(host),published=[],attempts=0,interfere=true;
  const services={consumer:consumer(doorState),read:()=>({doorState,host}),geometry:Source.geometry,compareAndSwap(candidate){attempts++;if(interfere)host.units[0].ammo.grenade=(host.units[0].ammo.grenade??0)+1;
    if(candidate.expected.state!==D.serializeFarmyardDoorState(doorState)||!isDeepStrictEqual(JSON.parse(candidate.expected.context),projection(host))||candidate.expected.host!==D.farmyardDoorHostToken(host))return false;doorState=candidate.doorState;host=candidate.host;return true;},invalidateRoutes:effect=>published.push(['routes',effect.receiptId]),publishVisibility:effect=>published.push(['fog',effect.receiptId]),publishColliders:effect=>published.push(['geometry',effect.colliders.filter(box=>box.interactionId===host.interactables[0].id).length,effect.colliders.some(box=>box.cover===true)]),present(){throw Error('detached view');}};
  const request=command(doorState,host.interactables[0],'open'),binding=D.connectFarmyardDoors(services);assert.equal(binding.preview(request).ok,true);const failed=binding.perform(request);assert.equal(failed.code,'STALE_HOST');assert.equal(doorState.revision,0);assert.deepEqual(published,[]);assert.equal(host.interactables[0].open,false);interfere=false;const result=binding.perform(request);assert.equal(result.committed,true);assert.equal(result.presentationErrors.length,1);assert.equal(result.presentationErrors[0].service,'present');assert.deepEqual(published.map(([name])=>name),['routes','fog','geometry']);assert.equal(published[2][1],1);assert.equal(published[2][2],true,'Borrowed source cover metadata survives geometry publication');const prior=published.length;assert.equal(binding.perform(request).repeated,true);assert.equal(attempts,2);assert.equal(published.length,prior);assert.ok(binding.save().length>0);binding.dispose();assert.throws(()=>binding.perform(request),error=>error.code==='DISPOSED');assert.ok(Source.move(host,Source.hero(host),Source.hero(host).x,Source.hero(host).y+.1),'Borrowed source movement survives connection disposal');
  const missing={...services};delete missing.publishVisibility;assert.throws(()=>D.connectFarmyardDoors(missing),error=>error.code==='MISSING_BINDING');
});

test('journal retains all 128 durable IDs and quiet exact retries at capacity, including type-sensitive command IDs',()=>{
  const context=projection(ready({isolated:true}));context.world={...context.world,bounds:{x:1,y:1,w:3,h:3},grid:{width:5,height:5},staticBoxes:[],seen:[],visible:[],fogAt:null};context.doors=[{...context.doors[0],edge:'e:2:2',x:2.5,y:2}];context.actors=[{...context.actors[0],x:1.75,y:2}];context.control={...context.control,detected:[],engaged:false,phase:'explore'};let state=D.createFarmyardDoorState({id:'capacity',...context});let first;
  for(let index=0;index<128;index++){const request=command(state,state.doors[0],index%2?'close':'open',index===0?1:index===1?'1':'capacity-'+index);if(!index)first=request;const result=D.stageFarmyardDoor(state,request);assert.ok(result.ok,result.code);state=result.next;}
  const wire=D.serializeFarmyardDoorState(state),full=D.openFarmyardDoorState(wire);assert.equal(full.receipts.length,128);assert.equal(D.stageFarmyardDoor(full,first).repeated,true);assert.equal(D.stageFarmyardDoor(full,command(full,full.doors[0],'open','new')).code,'JOURNAL_LIMIT');assert.equal(D.serializeFarmyardDoorState(full),wire);assert.equal(D.stageFarmyardDoor(full,{...first,action:'close'}).code,'COMMAND_ID_CONFLICT');
});

// These services deliberately retain the exact objects supplied to CAS, as a
// real synchronous authoritative store does. Callback hooks exercise ownership
// and lifecycle boundaries without substituting another gameplay kernel.
function connected(hooks={}){
  const host=ready({isolated:true}),h={store:{host,doorState:sourceState(host)},hooks,binding:null,candidates:[],publications:[],reads:0,queries:0};
  h.token=()=>D.farmyardDoorHostToken(h.store.host);
  h.save=()=>D.serializeFarmyardDoorHostSave(h.store.doorState,h.store.host,{geometry:Source.geometry(h.store.host)});
  h.request=(action='open',id='connection-open')=>command(h.store.doorState,h.store.host.interactables[0],action,id);
  const publish=name=>value=>{h.publications.push({name,value});h.hooks[name]?.(h,value);};
  h.binding=D.connectFarmyardDoors({consumer:consumer(h.store.doorState),
    read(){h.reads++;if(h.binding)h.hooks.read?.(h);return {doorState:h.store.doorState,host:h.store.host};},
    geometry(input){h.queries++;if(h.binding)h.hooks.geometry?.(h,input);return Source.geometry(input);},
    compareAndSwap(candidate){
      h.candidates.push(candidate);if(h.hooks.cas)return h.hooks.cas(h,candidate);h.hooks.beforeWrite?.(h,candidate);
      if(candidate.expected.state!==D.serializeFarmyardDoorState(h.store.doorState)||candidate.expected.context!==D.farmyardDoorContextToken(projection(h.store.host))||candidate.expected.host!==h.token()||!candidate.canCommit())return false;
      h.store.doorState=candidate.doorState;h.store.host=candidate.host;h.hooks.afterWrite?.(h,candidate);
      return h.hooks.ack?h.hooks.ack(h,candidate):true;
    },invalidateRoutes:publish('invalidateRoutes'),publishVisibility:publish('publishVisibility'),publishColliders:publish('publishColliders'),present:publish('present')});
  return h;
}
function mutateResult(result){result.hostNext.units[0].hp=-999;result.hostNext.units[0].ammo.pistol=999;result.hostNext.seen.clear();result.hostNext.interactables[0].inventory.push({id:'result-only'});result.next.actors[0].hp=-999;result.next.world.bounds.w=99;if(result.receipt)result.receipt.command.id='result-only';}

test('accepted, refused, repeated and adoption results never alias CAS-owned authority, including nested save data',t=>{
  for(const mode of ['accepted','refused','repeated','adoption']){
    const h=connected(mode==='refused'?{cas:()=>false}:{});t.after(()=>h.binding.dispose());let result;
    if(mode==='adoption'){h.store.host.units[0].hp=37;h.store.host.units[0].ap=1.25;result=h.binding.adopt(capture(h.store.doorState,h.store.host,'adopt-owned'));assert.equal(result.committed,true);}
    else{const request=h.request();result=h.binding.perform(request);if(mode==='repeated'){assert.equal(result.committed,true);result=h.binding.perform(request);assert.equal(result.repeated,true);}else assert.equal(result.committed,mode==='accepted');}
    if(mode==='refused')assert.equal(result.code,'STALE_HOST');
    const before=h.token(),saved=h.save(),state=D.serializeFarmyardDoorState(h.store.doorState);assert.notEqual(result.hostNext,h.store.host);assert.notEqual(result.next,h.store.doorState);mutateResult(result);assert.equal(h.token(),before,mode);assert.equal(h.save(),saved,mode);assert.equal(D.serializeFarmyardDoorState(h.store.doorState),state,mode);
  }
});

test('arbitrary hostile thrown values in every postcommit service preserve committed outcomes and remaining publication',t=>{
  let invoked=0;
  const hostile=[()=>Object.create(null),()=>Object.defineProperty({},'message',{get(){invoked++;throw Error('getter');}}),()=>({message:{toString(){invoked++;throw Error('coercion');}}}),()=>new Proxy({},{getOwnPropertyDescriptor(){throw Error('descriptor trap');}}),()=>({[Symbol.toPrimitive](){invoked++;throw Error('coercion');}})];
  for(const service of ['invalidateRoutes','publishVisibility','publishColliders','present'])for(const make of hostile){
    const h=connected({[service](){throw make();}});t.after(()=>h.binding.dispose());const result=h.binding.perform(h.request());assert.equal(result.committed,true);assert.equal(result.ok,true);assert.equal(result.presentationErrors.length,1);assert.equal(result.presentationErrors[0].service,service);assert.equal(typeof result.presentationErrors[0].message,'string');assert.equal(result.publicationStopped,null);assert.deepEqual(h.publications.map(value=>value.name),['invalidateRoutes','publishVisibility','publishColliders','present']);assert.equal(h.store.host.interactables[0].open,true);assert.equal(h.store.doorState.receipts.length,1);assert.ok(h.save().length>0);
  }
  assert.equal(invoked,0);
});

test('read/geometry disposal prevents CAS; the expiring final CAS fence prevents writes after disposal or callback return',t=>{
  for(const service of ['read','geometry']){
    const h=connected({[service](owner){owner.binding.dispose();}}),before=h.token(),saved=h.save();t.after(()=>h.binding.dispose());assert.throws(()=>h.binding.perform(h.request()),error=>error.code==='DISPOSED');assert.equal(h.candidates.length,0);assert.equal(h.publications.length,0);assert.equal(h.token(),before);assert.equal(h.save(),saved);
  }
  const h=connected({beforeWrite(owner,candidate){assert.equal(candidate.canCommit(),true);owner.binding.dispose();assert.equal(candidate.canCommit(),false);}}),before=h.token();t.after(()=>h.binding.dispose());const result=h.binding.perform(h.request());assert.equal(result.committed,false);assert.equal(result.code,'DISPOSED');assert.equal(h.token(),before);assert.equal(h.publications.length,0);assert.equal(h.candidates[0].canCommit(),false);
  const success=connected({invalidateRoutes(owner){assert.equal(owner.candidates[0].canCommit(),false,'The write fence must close before postcommit services.');}});t.after(()=>success.binding.dispose());assert.equal(success.binding.perform(success.request()).committed,true);const expired=success.candidates[0].canCommit;assert.equal(expired(),false);success.hooks.beforeWrite=()=>assert.equal(expired(),false,'An old fence cannot revive during a later operation.');assert.equal(success.binding.perform(success.request('close','fence-close')).committed,true);
});

test('same-connection reentry is refused throughout borrowed services and cannot publish a stale nested close',t=>{
  for(const service of ['read','geometry','beforeWrite','invalidateRoutes','publishVisibility','publishColliders','present']){
    let attempted=false;const h=connected({[service](owner){if(attempted)return;attempted=true;assert.throws(()=>owner.binding.perform(owner.request('close','nested-close')),error=>error.code==='REENTRANT_OPERATION');assert.throws(()=>owner.binding.save(),error=>error.code==='REENTRANT_OPERATION');}});t.after(()=>h.binding.dispose());const result=h.binding.perform(h.request());assert.equal(result.committed,true,service);assert.equal(h.store.host.interactables[0].open,true);assert.equal(h.candidates.length,1);assert.equal(h.publications.length,4);assert.equal(h.store.doorState.receipts.length,1);
  }
  const uncaught=connected({invalidateRoutes(owner){owner.binding.perform(owner.request('close','uncaught-nested-close'));}});t.after(()=>uncaught.binding.dispose());const result=uncaught.binding.perform(uncaught.request());assert.equal(result.committed,true);assert.equal(result.presentationErrors[0].service,'invalidateRoutes');assert.equal(uncaught.store.host.interactables[0].open,true);assert.equal(uncaught.store.doorState.receipts.length,1);
});

test('disposal after acknowledged write stops further publications without undoing the accepted action',t=>{
  const names=['invalidateRoutes','publishVisibility','publishColliders','present'];
  for(const service of ['afterWrite',...names]){const h=connected({[service](owner){owner.binding.dispose();}});t.after(()=>h.binding.dispose());const result=h.binding.perform(h.request());assert.equal(result.committed,true,service);assert.equal(result.ok,true);assert.equal(result.publicationStopped,'disposed');assert.equal(h.store.host.interactables[0].open,true);assert.equal(h.store.doorState.receipts.length,1);assert.equal(h.publications.length,service==='afterWrite'?0:names.indexOf(service)+1);assert.equal(h.candidates[0].canCommit(),false);assert.ok(h.save().length>0);}
  const h=connected();t.after(()=>h.binding.dispose());let committed=false;h.hooks.afterWrite=()=>{committed=true;};h.hooks.read=owner=>{if(committed)owner.binding.dispose();};const result=h.binding.perform(h.request());assert.equal(result.committed,true);assert.equal(result.publicationStopped,'disposed');assert.equal(h.publications.length,0);
});

test('a later independent authority change or unreadable authority suppresses remaining stale publication',t=>{
  const h=connected({invalidateRoutes(owner){const closing=D.stageFarmyardDoorHost(owner.store.doorState,owner.store.host,owner.request('close','other-owner-close'),{geometry:Source.geometry(owner.store.host)});assert.equal(closing.ok,true);owner.store.doorState=closing.next;owner.store.host=closing.hostNext;}});t.after(()=>h.binding.dispose());const opening=h.request(),result=h.binding.perform(opening);assert.equal(result.committed,true);assert.equal(result.publicationStopped,'stale');assert.deepEqual(h.publications.map(value=>value.name),['invalidateRoutes']);assert.equal(h.store.host.interactables[0].open,false);assert.equal(h.binding.perform(opening).repeated,true);assert.equal(h.publications.length,1);assert.ok(h.save().length>0);
  const broken=connected({afterWrite(owner){owner.hooks.read=()=>{throw Object.create(null);};}});t.after(()=>broken.binding.dispose());const accepted=broken.binding.perform(broken.request());assert.equal(accepted.committed,true);assert.equal(accepted.publicationStopped,'unavailable');assert.equal(accepted.presentationErrors[0].service,'read');assert.equal(broken.publications.length,0);assert.ok(broken.save().length>0);
});

test('unknown before/after-write exceptions and invalid acknowledgements preserve original commands for quiet recovery',t=>{
  for(const mode of ['throw-before','throw-after','invalid-before','invalid-after']){
    const h=connected(),request=h.request(),initial=h.token();t.after(()=>h.binding.dispose());
    if(mode==='throw-before')h.hooks.beforeWrite=()=>{throw Object.create(null);};
    if(mode==='throw-after')h.hooks.afterWrite=()=>{throw Object.defineProperty({},'message',{get(){throw Error('must not invoke');}});};
    if(mode==='invalid-before')h.hooks.cas=()=>undefined;
    if(mode==='invalid-after')h.hooks.ack=()=>Object.create(null);
    const result=h.binding.perform(request);assert.equal(result.code,'COMMIT_OUTCOME_UNKNOWN');assert.equal(result.committed,null);assert.deepEqual(result.recovery.command,request);assert.equal(typeof result.recovery.receiptId,'string');assert.deepEqual(result.consequences,[]);assert.equal(result.presentation,null);assert.equal(h.publications.length,0);const after=mode.endsWith('after');assert.equal(h.store.doorState.receipts.length,after?1:0);if(!after)assert.equal(h.token(),initial);const current=h.token();mutateResult(result);assert.equal(h.token(),current);
    h.hooks={};const recovered=h.binding.perform(request);assert.equal(recovered.ok,true);assert.equal(recovered.repeated,after);assert.equal(recovered.committed,!after);assert.equal(h.store.doorState.receipts.length,1);assert.equal(h.store.host.units[0].ap,11);assert.equal(h.publications.length,after?0:4);assert.ok(h.save().length>0);assert.equal(h.candidates[0].canCommit(),false);
  }
  const h=connected({afterWrite(){throw Error('acknowledgement lost after the durable write');}});t.after(()=>h.binding.dispose());const original=h.request(),unknown=h.binding.perform(original);assert.equal(unknown.committed,null);h.hooks={};const hero=Source.hero(h.store.host),startY=hero.y;assert.equal(Source.move(h.store.host,hero,hero.x,hero.y+.1),true);for(let step=0;step<4;step++)Source.tick(h.store.host,.05);assert.ok(hero.y>startY);hero.hp=37;hero.ap=1.25;assert.equal(h.binding.adopt(capture(h.store.doorState,h.store.host,'recovery-movement')).committed,true);assert.equal(h.binding.perform(h.request('close','recovery-close')).committed,true);const current=h.token(),saved=h.save(),writes=h.candidates.length,published=h.publications.length;const repeated=h.binding.perform(unknown.recovery.command);assert.equal(repeated.repeated,true);assert.equal(repeated.committed,false);assert.equal(h.candidates.length,writes);assert.equal(h.publications.length,published);assert.equal(h.token(),current);assert.equal(h.save(),saved);assert.equal(h.store.host.interactables[0].open,false);assert.equal(h.store.host.units[0].hp,37);assert.equal(h.store.host.units[0].ap,.25);const loaded=D.openFarmyardDoorHostSave(saved,{geometryForHost:Source.geometry});h.store.host=loaded.host;h.store.doorState=loaded.doorState;assert.equal(h.binding.perform(original).repeated,true);assert.equal(h.token(),current);assert.equal(h.publications.length,published);
  const changedIntent=connected({cas(){throw Error('before write');}});t.after(()=>changedIntent.binding.dispose());const request=changedIntent.request(),captured=clone(request);changedIntent.hooks.read=()=>{request.id='borrowed-read-mutation';};const outcome=changedIntent.binding.perform(request);assert.equal(outcome.committed,null);assert.deepEqual(outcome.recovery.command,captured,'Capture the original typed command before any borrowed service runs.');changedIntent.hooks={};assert.equal(changedIntent.binding.perform(outcome.recovery.command).committed,true);assert.equal(changedIntent.store.doorState.receipts[0].command.id,captured.id);
});

test('borrowed query inputs/outputs cannot retain aliases into installed host, saved loads or later publications',t=>{
  const loans=[],rawLoans=[],h=connected({geometry(owner,input){loans.push(input);rawLoans.push(Source.geometry(input));},invalidateRoutes(){for(const boxes of rawLoans)for(const box of boxes)box.x0=-999;}});t.after(()=>h.binding.dispose());const result=h.binding.perform(h.request());assert.equal(result.committed,true);assert.equal(result.presentationErrors.length,0);const before=h.token(),saved=h.save();for(const loan of loans){loan.units[0].hp=-999;loan.seen.clear();}assert.equal(h.token(),before);assert.equal(h.save(),saved);const published=h.publications.find(value=>value.name==='publishColliders').value.colliders.find(box=>box.interactionId===h.store.host.interactables[0].id);assert.equal(published.x0,D.farmyardDoorColliders(h.store.doorState)[0].x0);
  let loadedQuery;const restored=D.openFarmyardDoorHostSave(saved,{geometryForHost(input){loadedQuery=input;return Source.geometry(input);}}),loadedToken=D.farmyardDoorHostToken(restored.host);loadedQuery.units[0].hp=-999;loadedQuery.seen.clear();assert.equal(D.farmyardDoorHostToken(restored.host),loadedToken);
});

test('legacy omitted flags preserve source refresh write presence and subsequent endTurn behavior without load/adopt normalization',()=>{
  const host=ready({isolated:true}),door=host.interactables[0],hero=Source.hero(host),guard=host.units.find(unit=>unit.team==='guard');guard.x=door.x+.75;guard.y=door.y;guard.heading=180;delete hero.isMoving;delete guard.alert;delete guard.lastKnown;delete guard.alertAge;
  const unseen=host.units.filter(unit=>unit.team==='guard')[1];unseen.x=36;unseen.y=29;unseen.heading=0;delete unseen.isMoving;delete unseen.alert;delete unseen.lastKnown;
  const original=clone(host),state=sourceState(host),request=command(state,door,'open','legacy-open'),saved=D.serializeFarmyardDoorHostSave(state,host,{geometry:Source.geometry(host)}),loaded=D.openFarmyardDoorHostSave(saved,{geometryForHost:Source.geometry});for(const key of ['isMoving'])assert.equal(Object.hasOwn(loaded.host.units[0],key),false);for(const key of ['alert','lastKnown','alertAge'])assert.equal(Object.hasOwn(loaded.host.units.find(unit=>unit.id===guard.id),key),false);
  const changed=clone(host);changed.units[0].hp=37;const adopted=D.adoptFarmyardDoorHost(state,changed,capture(state,changed,'legacy-injury'),{geometry:Source.geometry(changed)});assert.equal(adopted.ok,true);assert.equal(Object.hasOwn(adopted.hostNext.units[0],'isMoving'),false);assert.equal(Object.hasOwn(adopted.hostNext.units.find(unit=>unit.id===guard.id),'alertAge'),false);
  const result=D.stageFarmyardDoorHost(state,host,request,{geometry:Source.geometry(host)});assert.equal(result.ok,true);assert.equal(Source.performInteraction(original,door.id,'open').ok,true);assert.equal(D.farmyardDoorHostToken(result.hostNext),D.farmyardDoorHostToken(original));assert.equal(result.hostNext.units[0].isMoving,false);assert.equal(result.hostNext.units.find(unit=>unit.id===guard.id).alertAge,0);for(const key of ['isMoving','alert','lastKnown'])assert.equal(Object.hasOwn(result.hostNext.units.find(unit=>unit.id===unseen.id),key),false,key);
  assert.equal(Source.endTurn(original),true);assert.equal(Source.endTurn(result.hostNext),true);assert.equal(result.hostNext.units.find(unit=>unit.id===guard.id).alertAge,1);assert.equal(Number.isFinite(result.hostNext.units.find(unit=>unit.id===guard.id).alertAge),true);assert.equal(D.farmyardDoorHostToken(result.hostNext),D.farmyardDoorHostToken(original));
  const reordered=ready({isolated:true}),reorderedDoor=reordered.interactables[0],reorderedHero=Source.hero(reordered),reorderedGuard=reordered.units.find(unit=>unit.team==='guard');reorderedGuard.x=reorderedDoor.x+.75;reorderedGuard.y=reorderedDoor.y;reorderedGuard.heading=180;reorderedGuard.lastKnown={y:reorderedHero.y,x:reorderedHero.x};reorderedGuard.alert=true;reorderedGuard.alertAge=0;const expected=clone(reordered),reorderedState=sourceState(reordered),written=D.stageFarmyardDoorHost(reorderedState,reordered,command(reorderedState,reorderedDoor,'open','last-known-write'),{geometry:Source.geometry(reordered)});assert.equal(Source.performInteraction(expected,reorderedDoor.id,'open').ok,true);assert.equal(D.farmyardDoorHostToken(written.hostNext),D.farmyardDoorHostToken(expected),'Even an equal lastKnown value is rewritten with source field order.');
  const untouched=ready({isolated:true}),distant=untouched.units.find(unit=>unit.team==='guard');distant.x=36;distant.y=29;distant.heading=0;delete distant.alertAge;const untouchedState=sourceState(untouched),untouchedWire=D.serializeFarmyardDoorHostSave(untouchedState,untouched,{geometry:Source.geometry(untouched)}),untouchedLoad=D.openFarmyardDoorHostSave(untouchedWire,{geometryForHost:Source.geometry});assert.equal(Object.hasOwn(untouchedLoad.host.units.find(unit=>unit.id===distant.id),'alertAge'),false);untouched.units[0].hp=37;const unchangedAge=D.adoptFarmyardDoorHost(untouchedState,untouched,capture(untouchedState,untouched,'unseen-counter'),{geometry:Source.geometry(untouched)});assert.equal(unchangedAge.ok,true);assert.equal(Object.hasOwn(unchangedAge.hostNext.units.find(unit=>unit.id===distant.id),'alertAge'),false);
});
