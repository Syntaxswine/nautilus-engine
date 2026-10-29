// Run from a fresh offline consumer, never through donor/editor internals.
import strict from 'node:assert/strict';
import {createRock,openRock,serializeRock,pickupRock,previewRockThrow,throwRock,stepRock,evaluateRockNoise,ROCK_CONTRACT} from '@nautilus-engine/core/items';
import {sharedAsset} from '@nautilus-engine/core/assets';
strict.equal(ROCK_CONTRACT.id,'nautilus-rock-items-v1');
strict.equal(sharedAsset('item:rock').availability,'shared-item-renderer');
let stone=createRock({id:'installed-rock',position:{x:0,y:0,h:.055}});
const taken=pickupRock(stone,{commandId:'installed-pickup',rockId:stone.id,expectedRevision:stone.revision,actorId:'player',actorPosition:{x:0,y:0,h:0},permitted:true,capacity:true});
strict.ok(taken.ok,taken.reason);strict.equal(taken.inventoryDelta[0].quantity,1);stone=taken.rock;
const command={commandId:'installed-throw-command',throwId:'installed-throw',rockId:stone.id,expectedRevision:stone.revision,actorId:'player',origin:{x:0,y:0,h:1.4},target:{x:5,y:0,h:.055},permitted:true};
const preview=previewRockThrow(stone,command);strict.ok(preview.ok,preview.reason);strict.deepEqual(preview.events,[]);strict.deepEqual(preview.inventoryDelta,[]);
const release=throwRock(stone,command);strict.ok(release.ok,release.reason);strict.equal(release.inventoryDelta[0].quantity,-1);strict.ok(release.events.every(event=>event.type!=='rock-impact-noise'));
const floor={sweepSphere({from,to,radius}){if(from.h>radius&&to.h<=radius){const fraction=(from.h-radius)/(from.h-to.h);return {fraction,point:{x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction,h:0},kind:'ground',surfaceId:'installed-floor'};}return null;}};
let midway=release.rock;
for(let tick=0;tick<12;tick++){const advanced=stepRock(midway,{dt:1/60,world:floor});strict.ok(advanced.ok,advanced.reason);midway=advanced.rock;}
function finish(start,world=floor){let current=start;const events=[];for(let tick=0;tick<600&&current.phase!=='world';tick++){const advanced=stepRock(current,{dt:1/60,world});strict.ok(advanced.ok,advanced.reason);current=advanced.rock;events.push(...advanced.events);}strict.equal(current.phase,'world');return {rock:current,events};}
const landed=finish(midway);strict.deepEqual(finish(openRock(serializeRock(midway))),landed);strict.equal(landed.events.length,1);
const impact=landed.events[0];strict.equal(impact.type,'rock-impact-noise');strict.equal(impact.position.h,0);strict.deepEqual(stepRock(landed.rock,{dt:1}).events,[]);
const base={position:{...impact.position},hearingEnabled:true,audible:true,permitted:true,behavior:'idle',confirmedThreat:false,incapacitated:false};
const heard=evaluateRockNoise(impact,[{...base,id:'idle-guard'},{...base,id:'combat-guard',behavior:'combat'},{...base,id:'far-guard',position:{x:100,y:0,h:0}}]);
strict.ok(heard.ok,heard.reason);strict.deepEqual(heard.requests.map(request=>request.listenerId),['idle-guard']);strict.deepEqual(heard.requests[0].position,impact.position);
const recovered=pickupRock(landed.rock,{commandId:'installed-recover',rockId:stone.id,expectedRevision:landed.rock.revision,actorId:'player',actorPosition:{...landed.rock.position},permitted:true,capacity:true});strict.ok(recovered.ok,recovered.reason);
const wallWorld={sweepSphere(query){const {from,to,radius}=query,contacts=[];if(from.x<2-radius&&to.x>=2-radius){const fraction=(2-radius-from.x)/(to.x-from.x);contacts.push({fraction,point:{x:2,y:from.y+(to.y-from.y)*fraction,h:from.h+(to.h-from.h)*fraction},kind:'wall',surfaceId:'installed-wall'});}const ground=floor.sweepSphere(query);if(ground)contacts.push(ground);return contacts.length?contacts:null;}};
let atWall=release.rock,wallEvents=[];
for(let tick=0;tick<120&&!wallEvents.length;tick++){const advanced=stepRock(atWall,{dt:1/60,world:wallWorld});strict.ok(advanced.ok,advanced.reason);atWall=advanced.rock;wallEvents.push(...advanced.events);}
strict.equal(wallEvents.length,1);strict.equal(wallEvents[0].kind,'wall');strict.equal(wallEvents[0].position.x,2);strict.equal(atWall.phase,'flying');strict.ok(atWall.flight.settling);
const settled=finish(atWall,wallWorld);strict.deepEqual(finish(openRock(serializeRock(atWall)),wallWorld),settled);strict.deepEqual(settled.events,[]);strict.ok(Math.abs(settled.rock.position.h-.055)<1e-9);strict.deepEqual(settled.rock.lastImpact,wallEvents[0]);
console.log('Installed public rock item: pickup, silent preview, throw, one impact, protected guard priority, recovery, quiet wall settling and save/replay pass.');
