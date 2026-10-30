// Installed consumer proof. The original game's test-only 22-module closure is
// supplied beside this file by the runner, never inside the engine package.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '@nautilus-engine/core/adapters/farmyard/doors';
import {engineManifest,schemaDocuments} from '@nautilus-engine/core/contracts';
import * as Source from './farmyard-source/sites/tactical-animal/dist/solo-game.js';

const installedEngine=engineManifest();
assert.ok(installedEngine.capabilities.some(item=>item.id===D.FARMYARD_DOOR_CONTRACT.capability&&item.versions.includes(1)));
for(const service of D.FARMYARD_DOOR_COMPONENT.requiredHostServices)assert.ok(!installedEngine.capabilities.some(item=>item.id===service),'An engine build must not claim the adopting host service.');
for(const id of ['nautilus-farmyard-door-state','nautilus-farmyard-door-host-save']){assert.ok(installedEngine.schemas.some(item=>item.id===id&&item.versions.includes(1)));const row=schemaDocuments().find(item=>item.id===id);assert.ok(row);assert.equal(JSON.parse(fs.readFileSync(new URL(row.url),'utf8')).$id,row.uri);}
const card=D.farmyardDoorUsageCard();
for(const key of ['guide','schema','hostSaveSchema'])assert.ok(fs.statSync(new URL(card[key])).size>0);
const guide=fs.readFileSync(new URL(card.guide),'utf8'),example=guide.match(/```js\s*([\s\S]*?)```/);assert.ok(example,'Installed guide needs its actual connection example');
const exampleURL=new URL('./installed-guide.mjs',import.meta.url);fs.writeFileSync(exampleURL,example[1]);const {wireFarmyardDoors}=await import(exampleURL.href);
assert.equal(typeof wireFarmyardDoors,'function');

let host=Source.createSoloGame(undefined,1947);
host.map=host.map.map(row=>row.map(()=>'yard'));host.edges={'e:20:20':'closed-door'};host.interactables=[{id:'installed-leaf',kind:'door',name:'Installed leaf',x:20.5,y:20,edge:'e:20:20',swing:1,range:1.65,open:false,inventory:[]}];host.props=[];host.obstacles=[];
Source.hero(host).x=19.75;Source.hero(host).y=20;Source.hero(host).ap=12;Source.hero(host).hp=37;Source.hero(host).stamina=.125;
for(const guard of host.units.filter(unit=>unit.team==='guard')){guard.x=36;guard.y=27;guard.alert=true;}
host.phase='player';host.engaged=true;host=structuredClone(host);Source.refresh(host,{forceFog:true});
const project=source=>D.projectFarmyardDoorContext(source,{geometry:Source.geometry(source)}),store={host,doorState:D.createFarmyardDoorState({id:'installed-door-context',...project(host)})},published=[];
const retained={store,geometry:Source.geometry,invalidateRoutes:value=>published.push(['routes',value.receiptId]),publishVisibility:value=>published.push(['fog',value.receiptId]),publishColliders:value=>published.push(['geometry',value.colliders]),present:value=>published.push(['view',value.id])};
let binding=wireFarmyardDoors(retained);
function request(action,id){return {version:1,id,expectedRevision:store.doorState.revision,actorId:Source.hero(store.host).id,doorId:'installed-leaf',action};}
const open=request('open','installed-open'),original=structuredClone(store.host),before=D.farmyardDoorHostToken(store.host);assert.ok(binding.preview(open).ok);assert.equal(D.farmyardDoorHostToken(store.host),before);assert.ok(Source.performInteraction(original,'installed-leaf','open').ok);
const accepted=binding.perform(open);assert.ok(accepted.committed);assert.deepEqual(accepted.presentationErrors,[]);assert.equal(D.farmyardDoorHostToken(store.host),D.farmyardDoorHostToken(original));assert.equal(published.length,4);assert.equal(published.find(([kind])=>kind==='geometry')[1].filter(box=>box.interactionId==='installed-leaf').length,1);

// Keep the actual source movement implementation. No mover runtime, route
// translation, copied scene interaction handler or replacement actor is used.
const hero=Source.hero(store.host),y=hero.y;assert.ok(Source.move(store.host,hero,hero.x,hero.y+.1));for(let tick=0;tick<4;tick++)Source.tick(store.host,.05);assert.ok(hero.y>y);hero.hp=37;hero.ap=1.25;hero.stamina=.125;hero.ammo.pistol=3;store.host.solo.dressings=0;store.host.seed=2091;
assert.throws(()=>binding.preview(request('close','unadopted')),error=>error.code==='CONTEXT_ADOPTION_REQUIRED');
const checkpoint={version:1,id:'installed-host-checkpoint',expectedRevision:store.doorState.revision,...project(store.host)},captured=D.farmyardDoorHostToken(store.host),adopted=binding.adopt(checkpoint);assert.ok(adopted.committed);assert.equal(D.farmyardDoorHostToken(store.host),captured);assert.equal(published.length,4);
assert.ok(binding.perform(request('close','installed-close')).committed);assert.equal(Source.hero(store.host).ap,.25);const presentCount=published.length,current=D.farmyardDoorHostToken(store.host),repeat=binding.perform(open);assert.equal(repeat.repeated,true);assert.equal(repeat.committed,false);assert.equal(published.length,presentCount);assert.equal(D.farmyardDoorHostToken(store.host),current);assert.equal(store.host.interactables[0].open,false);

const save=binding.save(),prospective=D.openFarmyardDoorHostSave(save,{geometryForHost:Source.geometry});assert.equal(prospective.host.units[0].hp,37);assert.equal(prospective.host.units[0].ap,.25);assert.equal(prospective.host.units[0].stamina,.125);assert.equal(prospective.host.units[0].ammo.pistol,3);assert.equal(prospective.host.units[0].y,hero.y);assert.equal(prospective.host.solo.dressings,0);assert.equal(prospective.host.seed,2091);assert.equal(D.farmyardDoorHostToken(prospective.host),current);
binding.dispose();store.host=prospective.host;store.doorState=prospective.doorState;binding=wireFarmyardDoors(retained);assert.equal(published.length,presentCount);assert.equal(binding.perform(open).repeated,true);assert.equal(binding.adopt(checkpoint).repeated,true);assert.equal(published.length,presentCount);assert.equal(binding.perform({...open,action:'close'}).code,'COMMAND_ID_CONFLICT');
const broken=JSON.parse(save);broken.source.units[0].ap=14;assert.throws(()=>D.openFarmyardDoorHostSave(broken,{geometryForHost:Source.geometry}));assert.equal(D.farmyardDoorHostToken(store.host),current);
binding.dispose();assert.throws(()=>binding.preview(open),error=>error.code==='DISPOSED');assert.ok(Source.move(store.host,Source.hero(store.host),Source.hero(store.host).x,Source.hero(store.host).y+.1));Source.tick(store.host,.05);assert.ok(Source.hero(store.host).y>hero.y);
assert.equal(typeof globalThis.window,'undefined');
console.log('Installed door candidate + original retained movement: public card/guide/schemas, source-equivalent full-host commit, current collider, fresh injury/AP adoption, complete save/load, intervening close/retries, rejection and disposal pass.');
