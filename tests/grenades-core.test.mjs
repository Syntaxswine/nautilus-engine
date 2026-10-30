import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as G from '../packages/grenades-core/index.js';
import {negotiateCapabilities} from '../packages/map-core/capabilities.js';
import * as Source from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/solo-game.js';
import {WEAPONS} from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/aft/tactics/solo-weapon-data.js';

const clone=value=>structuredClone(value),command=(state,id,point)=>({version:1,id,expectedRevision:state.revision,actorId:state.control.actorId,point});
const project=game=>G.projectFarmyardGrenadeContext(game,{geometry:Source.geometry(game)});
const sidecar=game=>G.createGrenadeState({id:'source-conformance',...project(game)});
function ready(weapon='assault'){
 const game=Source.createSoloGame({...Source.DEFAULT_BUILD,utility:'grenade'}),hero=Source.hero(game);
 for(const guard of game.units.slice(1)){guard.x=36;guard.y=27;guard.alert=true;}
 hero.x=4;hero.y=25;hero.heading=0;hero.ap=12;hero.weapon=weapon;if(weapon==='flamethrower')hero.ammo.flamethrower=0;
 game.engaged=true;game.phase='player';Source.refresh(game,{forceFog:true});return game;
}
function explored(game){for(let y=1;y<=28;y++)for(let x=1;x<=38;x++)game.seen.add(Source.key(x,y));}
function comparePreview(actual,expected){for(const key of ['ok','reason','cost','distance','blast','discounted','selfDanger'])assert.equal(actual[key],expected[key],key);}
function parity(game,point,id='parity'){
 const before=Source.encodeSave(game),state=sidecar(game),cmd=command(state,id,point),expected=Source.Core.previewGrenade(game,Source.hero(game),point),preview=G.previewGrenade(state,cmd);
 comparePreview(preview,expected);assert.equal(Source.encodeSave(game),before,'Projection/preview cannot mutate the donor-shaped host');
 const result=G.stageGrenade(state,cmd),accepted=Source.Core.throwGrenade(game,Source.hero(game),point);assert.equal(result.ok,accepted);
 if(accepted){const current=project(game);assert.deepEqual(result.next.actors,current.actors);assert.deepEqual(result.next.control,current.control);assert.deepEqual(result.next.world,current.world);assert.equal(result.expected.state,G.serializeGrenadeState(state));}
 else assert.equal(G.serializeGrenadeState(result.next),G.serializeGrenadeState(state));
 return {state,cmd,result};
}
function rejects(fn,code,path){assert.throws(fn,error=>error instanceof G.GrenadeCompatibilityError&&error.code===code&&(!path||error.path===path));}

test('pinned Farmyard constants, all equipped weapon costs, stock, pack sync and held weapons match the real original',()=>{
 assert.equal(G.FARMYARD_GRENADE_PROFILE.sourceCommit,'251bf8094b5f9ebe44208443084c1a6d6658512a');
 for(const key of ['cost','range','blast','damage'])assert.equal(G.FARMYARD_GRENADE_PROFILE[key],WEAPONS.grenade[key]);
 for(const weapon of Object.keys(WEAPONS)){
  const game=ready(weapon),hero=Source.hero(game),rounds=clone(hero.ammo),{result}=parity(game,{x:10,y:25},'cost-'+weapon);
  assert.equal(result.receipt.cost,Source.Core.grenadeCost(hero));assert.equal(hero.weapon,weapon);assert.equal(hero.ammo.grenade,rounds.grenade-1);
  for(const [id,count]of Object.entries(rounds))if(id!=='grenade')assert.equal(hero.ammo[id],count);
  assert.equal(G.grenadeCost(weapon),Source.Core.grenadeCost(hero));
 }
});

test('low/high lobs, landing/air obstruction and wall/fog footprint use the exact pinned original geometry',()=>{
 for(const [x,point,expected]of [[19,{x:22,y:10},false],[18,{x:23,y:10},true],[20.2,{x:20.5,y:10},false],[20.2,{x:22,y:15},false]]){
  const game=ready();Source.hero(game).x=x;Source.hero(game).y=10;explored(game);game.units[1].x=23;game.units[1].y=10;
  assert.equal(parity(game,point).result.ok,expected);
 }
 const game=ready();explored(game);const state=sidecar(game),point={x:19,y:10};
 assert.deepEqual(G.grenadeTrajectory({x:19,y:10},{x:22,y:10}),Source.Core.grenadeTrajectory({x:19,y:10},{x:22,y:10}));
 assert.deepEqual(G.grenadeBlastFootprint(state,point),Source.Core.grenadeBlastFootprint(game,point));
 assert.equal(G.grenadeAffects(state,point,{x:22,y:10}),false);assert.equal(G.grenadeAffects(state,point,{x:17,y:10}),true);
 game.seen.clear();assert.deepEqual(G.grenadeBlastFootprint(sidecar(game),point),[]);
 game.seen.add(Source.key(point.x,point.y));assert.deepEqual(G.grenadeBlastFootprint(sidecar(game),point),Source.Core.grenadeBlastFootprint(game,point));
});

test('ordinary fatality, self/allied blast, source order, body requests and surviving guard alerts match source resources',()=>{
 const game=ready(),hero=Source.hero(game);hero.hp=30;game.units[1].x=6;game.units[1].y=25;game.units[1].hp=5;
 const ally=clone(hero);ally.id=99;ally.name='Existing squad ally';ally.x=7;ally.hp=80;game.units.push(ally);
 const guard=game.units[2];guard.x=18;guard.y=25;guard.alert=false;guard.lastKnown=null;guard.alertAge=7;
 const {result}=parity(game,{x:6,y:25});
 assert.deepEqual(result.receipt.damage.map(item=>item.actorId),[hero.id,game.units[1].id,ally.id]);
 assert.equal(result.next.actors[0].hp,0);assert.equal(result.next.actors[0].ap,0);assert.equal(result.next.actors[0].casualty,'dead');
 assert.equal(result.next.control.phase,'lost');assert.equal(result.next.control.status,'lost');
 assert.ok(result.receipt.bodies.some(body=>body.actorId===game.units[1].id));
 assert.ok(game.interactables.some(object=>object.kind==='body'&&object.unitId===game.units[1].id));
 const alerted=result.next.actors.find(actor=>actor.id===guard.id);assert.equal(alerted.alert,true);assert.deepEqual(alerted.lastKnown,{x:4,y:25});assert.equal(alerted.alertAge,0);
 assert.equal(result.presentation.sequence[0].hit,true);
});

test('exploration precheck, accepted engagement refill, no-guard won exception and epsilon AP remain exact',()=>{
 for(const ap of [2,5,7]){
  const game=Source.createSoloGame({...Source.DEFAULT_BUILD,utility:'grenade'});Source.hero(game).ap=ap;
  const {result}=parity(game,{x:5,y:18});assert.equal(result.ok,ap>=5);if(result.ok)assert.equal(result.next.actors[0].ap,Source.hero(game).maxAp-5);
 }
 const empty=ready();for(const guard of empty.units.slice(1)){guard.hp=0;guard.casualty='dead';guard.ap=0;guard.burningTurns=0;guard.isMoving=false;}
 empty.phase='explore';Source.hero(empty).ap=7;const {result}=parity(empty,{x:10,y:25});assert.equal(result.next.actors[0].ap,2);assert.equal(result.next.control.phase,'won');
 const epsilon=ready('smg');Source.hero(epsilon).ap=2.5-5e-8;assert.equal(parity(epsilon,{x:10,y:25}).result.next.actors[0].ap,0);
});

test('ordinary sight refresh preserves source alerts/detection/contact, species fallback, sneaking and prone air LOS',()=>{
 for(const species of ['horse','donkey','goat','cow','sheep','hen','pig-foreman','pig-director','skunk','bull','rabbit','dog','bear'])for(const sneaking of [false,true]){
  const game=ready('smg'),hero=Source.hero(game),guard=game.units[1];
  for(const other of game.units.slice(1)){other.alert=false;other.lastKnown=null;other.heading=0;}
  game.engaged=false;game.phase='player';hero.sneaking=sneaking;guard.x=26;guard.y=25;guard.heading=180;guard.weapon='rifle';guard.species=species;
  const sight=Source.canSee(game,guard,hero),{result}=parity(game,{x:10,y:25},'sight-'+species+'-'+sneaking);
  assert.equal(result.next.actors[1].alert,sight,species+'/'+sneaking);
  if(sight){assert.equal(result.next.control.phase,'player');assert.equal(result.next.actors[0].ap,9.5);assert.deepEqual(result.next.actors[1].lastKnown,{x:4,y:25});}
 }
 for(const [stance,kind,z0,height]of [['prone','crate',0,.45],['standing','crate',0,.45],['prone','part',.6,1],['prone','prop',0,3]]){
  let game=ready('smg');const hero=Source.hero(game),guard=game.units[1];for(const other of game.units.slice(1)){other.alert=false;other.lastKnown=null;other.heading=0;}
  game.engaged=false;hero.stance=stance;guard.stance='prone';guard.x=26;guard.y=25;guard.heading=180;
  game.obstacles=[...(game.obstacles||[]),{x0:15,x1:16,y0:24.7,y1:25.3,z0,height,kind}];game=structuredClone(game);
  parity(game,{x:10,y:25},'prone-'+stance+'-'+kind);
 }
 const fog=ready('smg');fog.fogAt={x:3,y:25};fog.seen.add('10,25');parity(fog,{x:10,y:25},'fog-moved');
 const cone=ready('smg');cone.units[1].species='bear';cone.units[1].cone=40;cone.units[1].heading=180;cone.units[1].x=26;cone.units[1].y=25;cone.engaged=false;parity(cone,{x:10,y:25},'fallback-cone');
});

test('valid rejection/cancel paths never debit, damage, mutate fog or change equipped ammo',()=>{
 for(const kind of ['ap','stock','range','turn','unexplored','outside','no-point']){
  const game=ready('smg'),hero=Source.hero(game);let point={x:10,y:25};
  if(kind==='ap')hero.ap=2.49;if(kind==='stock')hero.ammo.grenade=0;if(kind==='range')point={x:16,y:25};if(kind==='turn')game.phase='enemy';if(kind==='unexplored')game.seen.clear();if(kind==='outside')point={x:-2,y:25};
  const state=sidecar(game),before=G.serializeGrenadeState(state),cmd=command(state,'blocked',kind==='no-point'?null:point),result=G.stageGrenade(state,cmd);
  assert.equal(result.ok,false,kind);assert.equal(G.serializeGrenadeState(result.next),before);assert.deepEqual(result.consequences,[]);assert.equal(result.presentation,null);
  if(kind!=='no-point')comparePreview(G.previewGrenade(state,cmd),Source.Core.previewGrenade(game,hero,point));
 }
 rejects(()=>G.previewGrenade(G.createGrenadeExample(),{actorId:'thrower',point:{x:NaN,y:0}}),'INVALID_DATA');
});

test('durable retries and host checkpoints retain injuries, movement, AP and stock without replay or ID reset',()=>{
 const initial=G.createGrenadeExample(),first=command(initial,'first',{x:23,y:10}),accepted=G.stageGrenade(initial,first);assert.equal(accepted.ok,true);
 const context=G.grenadeContext(accepted.next);context.actors[0].x=17.5;context.actors[0].hp=17.25;context.actors[0].ap=3.125;context.actors[0].stamina=0;
 const adopted=G.adoptGrenadeContext(accepted.next,{version:1,id:'host-change',expectedRevision:1,...context});assert.equal(adopted.ok,true);
 assert.equal(G.matchesGrenadeContext(adopted.next,context),true);assert.equal(G.matchesGrenadeContext(accepted.next,context),false);
 const saved=G.serializeGrenadeState(adopted.next),restored=G.openGrenadeState(saved),retry=G.stageGrenade(restored,first);
 assert.equal(retry.ok,true);assert.equal(retry.repeated,true);assert.equal(G.serializeGrenadeState(retry.next),saved);assert.equal(retry.next.actors[0].hp,17.25);assert.equal(retry.next.actors[0].ap,3.125);
 assert.deepEqual(retry.receipt,accepted.receipt);assert.deepEqual(retry.consequences,[]);assert.equal(retry.presentation,null);
 const second=G.stageGrenade(restored,command(restored,'second',{x:23,y:10}));assert.equal(second.ok,true);assert.equal(second.next.actors[0].ap,.625);assert.equal(second.next.actors[0].hp,17.25);assert.equal(second.next.actors[0].stamina,0);assert.equal(second.next.actors[0].grenades,1);
 assert.equal(G.stageGrenade(restored,{...first,point:{x:22,y:10}}).code,'COMMAND_ID_CONFLICT');
 assert.equal(G.adoptGrenadeContext(restored,{version:1,id:'first',expectedRevision:2,...context}).code,'COMMAND_ID_CONFLICT');
 assert.equal(G.stageGrenade(restored,{...command(restored,'stale',{x:23,y:10}),expectedRevision:1}).code,'STALE_REVISION');
 assert.equal(Object.hasOwn(restored,'presentation'),false);assert.equal(saved.includes('trajectory'),false);assert.doesNotMatch(saved,/"sequence"\s*:/);
 const tampered=clone(restored);tampered.actors[0].hp++;rejects(()=>G.openGrenadeState(tampered),'INVALID_STATE');
 const fake=clone(restored);fake.receipts[0].cost=0;rejects(()=>G.openGrenadeState(fake),'INVALID_RECEIPT');
 const omitted=clone(restored);omitted.receipts.shift();rejects(()=>G.openGrenadeState(omitted),'INVALID_JOURNAL');
});

test('receipt IDs preserve numeric/string types and delimiter-bearing state/command tuple boundaries',()=>{
 const state=G.createGrenadeExample(),first=command(state,1,{x:23,y:10}),one=G.stageGrenade(state,first);
 const two=G.stageGrenade(one.next,command(one.next,'1',{x:23,y:10}));assert.equal(two.ok,true);assert.notEqual(one.receipt.id,two.receipt.id);
 assert.deepEqual(JSON.parse(one.receipt.id),['grenade-v1','grenade-yard',1]);assert.deepEqual(JSON.parse(two.receipt.id),['grenade-v1','grenade-yard','1']);
 assert.equal(G.stageGrenade(two.next,first).repeated,true);
 const context=G.grenadeContext(state),a=G.createGrenadeState({id:'a:b',...context}),b=G.createGrenadeState({id:'a',...context});
 const left=G.stageGrenade(a,command(a,'c',{x:23,y:10})),right=G.stageGrenade(b,command(b,'b:c',{x:23,y:10}));assert.notEqual(left.receipt.id,right.receipt.id);
 const adopted=G.adoptGrenadeContext(two.next,{version:1,id:2,expectedRevision:two.next.revision,...G.grenadeContext(two.next)});
 assert.equal(adopted.ok,true);assert.deepEqual(JSON.parse(adopted.receipt.id),['grenade-v1','grenade-yard',2]);
 assert.deepEqual(G.openGrenadeState(G.serializeGrenadeState(adopted.next)),adopted.next);
});

test('closed public Farmyard projection rejects known reactive, multilevel and unfamiliar functional source state',()=>{
 for(const [change,path]of [
  [game=>game.windows=[{id:'placed-window'}],'/source/windows'],
  [game=>game.fires=[{x:3,y:3,turns:2}],'/source/fires'],
  [game=>{Source.hero(game).ammo.flamethrower=1;Source.hero(game).pack.push({type:'weapon',kind:'flamethrower',rounds:1});},'/source/units/0/ammo/flamethrower'],
  [game=>{Source.hero(game).weapon='flamethrower';Source.hero(game).ammo.flamethrower=1;},'/source/units/0/ammo/flamethrower'],
  [game=>Source.hero(game).burningTurns=2,'/source/units/0/burningTurns'],
  [game=>Source.hero(game).z=1,'/source/units/0/z'],
  [game=>game.interactables.push({kind:'fuel-tank'}),'/source/interactables/'+ready().interactables.length+'/kind'],
  [game=>game.unknownFunctionalRule={version:1},'/source/unknownFunctionalRule'],
  [game=>Source.hero(game).armorStopsBlast=true,'/source/units/0/armorStopsBlast']
 ]){
  const game=ready();change(game);const before=Source.encodeSave(game);
  assert.throws(()=>project(game),error=>error instanceof G.GrenadeCompatibilityError&&error.path===path,path);assert.equal(Source.encodeSave(game),before);
 }
 const game=ready(),geometry=Source.geometry(game);rejects(()=>G.projectFarmyardGrenadeContext(game,{geometry,bounds:{x:0,y:0,w:20,h:20}}),'UNSUPPORTED_SOURCE','/options/bounds');
 const context=G.grenadeContext(G.createGrenadeExample());context.support.windows=true;rejects(()=>G.createGrenadeState({id:'bad',...context}),'UNSUPPORTED_FEATURE','/support/windows');
 context.support.windows=false;context.world.boxes[0].windowPart=true;rejects(()=>G.createGrenadeState({id:'bad',...context}),'UNSUPPORTED_FEATURE');
});

test('projection validates nested source records and preserves known retained turn/UI bookkeeping without invoking hooks',()=>{
 for(const [change,path]of [[game=>game.interactables={},'/source/interactables'],[game=>game.units[0]=null,'/source/units/0'],[game=>game.units[0].pack.push(null),'/source/units/0/pack/'+ready().units[0].pack.length]]){
  const game=ready();change(game);assert.throws(()=>project(game),error=>error instanceof G.GrenadeCompatibilityError&&error.path===path,path);
 }
 const game=ready();rejects(()=>G.projectFarmyardGrenadeContext(game,{geometry:[null]}),'UNSUPPORTED_SOURCE','/options/geometry/0');
 game.panicDelay=-.01;game.solo.areaWeapon='grenade';game.solo.spottedGuardIds=[game.units[1].id];const before=Source.encodeSave(game);assert.doesNotThrow(()=>project(game));assert.equal(Source.encodeSave(game),before);
 const bounds=project(game).world.bounds;assert.deepEqual(bounds,{x:1,y:1,w:38,h:28});
 const state=sidecar(game),point={x:0,y:0};comparePreview(G.previewGrenade(state,command(state,'rim',point)),Source.Core.previewGrenade(game,Source.hero(game),point));assert.equal(G.previewGrenade(state,command(state,'rim',point)).reason,'Choose a point on the field');
});

test('reserved prototype species refuse structurally and in source projection while normal unknown species retain fallback',()=>{
 const reserved=['constructor','__defineGetter__','__defineSetter__','hasOwnProperty','__lookupGetter__','__lookupSetter__','isPrototypeOf','propertyIsEnumerable','toString','valueOf','__proto__','toLocaleString'];
 const schema=JSON.parse(fs.readFileSync(new URL('../schemas/grenade-state-v1.schema.json',import.meta.url),'utf8'));
 assert.deepEqual(schema.$defs.actor.properties.species.not.enum,reserved);
 for(const species of reserved){
  const context=G.grenadeContext(G.createGrenadeExample());context.actors[1].species=species;
  rejects(()=>G.createGrenadeState({id:'reserved',...context}),'UNSUPPORTED_SPECIES','/actors/1/species');
  const game=ready();game.units[1].species=species;const before=Source.encodeSave(game);
  rejects(()=>project(game),'UNSUPPORTED_SPECIES','/actors/1/species');assert.equal(Source.encodeSave(game),before);
 }
 const context=G.grenadeContext(G.createGrenadeExample());context.actors[1].species='bear';assert.doesNotThrow(()=>G.createGrenadeState({id:'fallback',...context}));
 const game=ready();game.units[1].species='bear';assert.doesNotThrow(()=>project(game));
});

test('strict loading rejects unknown versions, missing resources, accessors/toJSON and oversized or evicted journals before hooks',()=>{
 const original=G.createGrenadeExample();let hooks=0;
 for(const mutate of [state=>Object.defineProperty(state,'actors',{get(){hooks++;throw Error('getter');},enumerable:true}),state=>state.toJSON=()=>{hooks++;throw Error('toJSON');},state=>Object.defineProperty(state.actors[0],'hp',{get(){hooks++;throw Error('HP getter');},enumerable:true})]){
  const state=clone(original);mutate(state);rejects(()=>G.openGrenadeState(state),'INVALID_DATA');
 }assert.equal(hooks,0);
 for(const [change,code]of [[state=>state.version=2,'UNSUPPORTED_SCHEMA'],[state=>state.profileId='future','UNSUPPORTED_PROFILE'],[state=>delete state.actors[0].stamina,'MISSING_FIELD'],[state=>state.actors[0].grenades=-1,'INVALID_NUMBER'],[state=>state.world.boxes[0].mysteryCollision=true,'UNKNOWN_FIELD']]){const state=clone(original);change(state);rejects(()=>G.openGrenadeState(state),code);}
 const context=G.grenadeContext(original);context.world.seen=[];context.world.boxes=[];context.actors=context.actors.slice(0,1);context.control.phase='won';
 const full=G.createGrenadeState({id:'limit',...context});full.revision=128;
 full.receipts=Array.from({length:128},(_,index)=>({id:JSON.stringify(['grenade-v1','limit','context-'+index]),type:'context',command:{version:1,id:'context-'+index,expectedRevision:index,...clone(context)},revision:index+1}));
 assert.equal(G.stageGrenade(full,command(full,'too-many',{x:20,y:10})).code,'JOURNAL_LIMIT');
 assert.equal(G.adoptGrenadeContext(full,full.receipts[0].command).repeated,true);
 const overflow=clone(full);overflow.receipts.push(clone(overflow.receipts[0]));rejects(()=>G.openGrenadeState(overflow),'INVALID_JOURNAL');
});

test('prospective aggregate budgets refuse checkpoints AND throws before returning any unsaveable accepted next',()=>{
 const context=G.grenadeContext(G.createGrenadeExample());context.world.bounds={x:0,y:0,w:240,h:240};context.world.grid={width:240,height:240};context.world.seen=Array.from({length:40000},(_,index)=>index%240+','+Math.floor(index/240));context.world.visible=[];
 const state=G.createGrenadeState({id:'aggregate-limit',...context});
 const nodes=value=>1+(value!==null&&typeof value==='object'?Object.values(value).reduce((sum,item)=>sum+nodes(item),0):0);
 const makeReceipt=index=>({id:JSON.stringify(['grenade-v1','aggregate-limit','checkpoint-'+index]),type:'context',command:{version:1,id:'checkpoint-'+index,expectedRevision:index,...clone(context)},revision:index+1});
 const count=Math.floor((500000-nodes(state))/nodes(makeReceipt(0)));state.revision=count;state.receipts=Array.from({length:count},(_,index)=>makeReceipt(index));
 const extra=Math.floor((500000-nodes(state)-64)/2),expanded=Array.from({length:40000+extra},(_,index)=>index%240+','+Math.floor(index/240));
 state.world.seen=expanded;state.receipts.at(-1).command.world.seen=[...expanded];
 const before=G.serializeGrenadeState(state);assert.ok(Buffer.byteLength(before,'utf8')<=8000000);assert.ok(nodes(state)<=500000);
 const checkpoint=G.adoptGrenadeContext(state,{version:1,id:'overflow-context',expectedRevision:state.revision,...G.grenadeContext(state)});
 const thrown=G.stageGrenade(state,command(state,'overflow-throw',{x:23,y:10}));
 for(const result of [checkpoint,thrown]){assert.equal(result.ok,false);assert.equal(result.code,'STATE_LIMIT');assert.deepEqual(result.next,state);assert.deepEqual(result.consequences,[]);assert.equal(result.presentation,null);}
 assert.deepEqual(state.actors[0],context.actors[0]);
 rejects(()=>G.openGrenadeState(' '.repeat(8000001)),'STATE_LIMIT');
});

test('grenade requirements share standard Nautilus negotiation and component nested metadata cannot mutate globally',()=>{
 const state=G.createGrenadeExample(),requirements=G.grenadeRequirements(state);
 assert.deepEqual(Object.keys(requirements).sort(),['optional','required','schema']);
 const consumer={id:'test.host',version:'fixture',contractVersion:1,schemas:[{id:requirements.schema.id,versions:[1],description:'grenade save'}],capabilities:requirements.required.map(item=>({id:item.id,versions:[1],description:'retained service'}))};
 assert.equal(negotiateCapabilities(requirements,consumer).ok,true);assert.deepEqual(G.assertGrenadeCompatible(state,consumer),state);
 for(const required of requirements.required){const incomplete=clone(consumer);incomplete.capabilities=incomplete.capabilities.filter(item=>item.id!==required.id);assert.equal(negotiateCapabilities(requirements,incomplete).ok,false);rejects(()=>G.assertGrenadeCompatible(state,incomplete),'INCOMPATIBLE_CONSUMER');}
 assert.throws(()=>G.GRENADE_COMPONENT.capabilities[0].version=999,TypeError);assert.equal(G.GRENADE_COMPONENT.capabilities[0].version,1);
});

test('public grenade and aim entry runtime closure has no donor imports, DOM/storage, implicit clock or RNG',()=>{
 for(const file of fs.readdirSync(new URL('../packages/grenades-core/',import.meta.url))){const source=fs.readFileSync(new URL('../packages/grenades-core/'+file,import.meta.url),'utf8');for(const match of source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g))assert.ok(match[1].startsWith('./'),file+' runtime import');}
 const url=new URL('../packages/grenades-core/index.js',import.meta.url).href,aim=new URL('../packages/grenades-core/aim.js',import.meta.url).href;
 const code="for(const name of ['window','document','navigator','localStorage','sessionStorage','indexedDB','fetch','crypto','performance','setTimeout','setInterval'])Object.defineProperty(globalThis,name,{get(){throw Error('Forbidden '+name)}});Date.now=()=>{throw Error('Clock')};Math.random=()=>{throw Error('RNG')};const g=await import("+JSON.stringify(url)+"),a=await import("+JSON.stringify(aim)+");const s=g.createGrenadeExample(),r=g.stageGrenade(s,{version:1,id:'headless',expectedRevision:0,actorId:s.control.actorId,point:{x:23,y:10}});g.openGrenadeState(g.serializeGrenadeState(r.next));const aim=new a.GrenadeAim();aim.start();aim.nudge({x:18,y:10},{x:1,y:0},10,.05);if(!r.ok)throw Error(r.reason);";
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(result.status,0,result.stderr);
});
