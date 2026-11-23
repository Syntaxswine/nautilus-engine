import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCharacter} from '@nautilus-engine/map-core/rules';
import {blueprintRequirements} from '@nautilus-engine/map-core/capabilities';
import {previewStealthMove,createStealthState,stageStealthPosture,stageStealthMove,evaluateStealthNoise,openStealthSave,exportStealthSave,FOLIAGE_CAPABILITY} from '@nautilus-engine/map-core/stealth';
import {createFoliageStore} from '@nautilus-engine/map-core/stealth/foliage';
import {createCrawlCursor} from '@nautilus-engine/map-core/native-actors/crawl';
import {createStealthReference,referenceMap} from './host.mjs';
assert.equal(typeof globalThis.document,'undefined');assert.equal(typeof globalThis.window,'undefined');
const map=referenceMap(),q=createFoliageStore().replace({mapId:'installed',revision:1,map});assert.equal(q.depth({x:4,y:10,level:0},{x:20,y:10,level:0}),10.4);assert(blueprintRequirements(map).required.some(r=>r.id===FOLIAGE_CAPABILITY));
let character=createCharacter({id:'goat',stats:{sneak:40,agility:80},resources:{hp:37,ap:3,stamina:20}}),state=createStealthState(['goat']);
state=stageStealthPosture(state,{version:1,id:'posture-1',sequence:1,expectedRevision:0,actorId:'goat',mode:'sneak',stance:'prone',confirmed:true}).next;
const spec={version:1,mode:'sneak',stance:'prone',distanceM:.1,terrainCost:1,injuryMultiplier:1,loadMultiplier:1,walkSpeedMps:.35,chargeAP:false};
const seed=12345,oldRandom=Math.random;Math.random=()=>{throw Error('Stealth preview/commit consumed implicit randomness.');};
try{for(let i=0;i<12;i++)previewStealthMove(character,spec);const staged=stageStealthMove(state,character,{version:1,id:'move-2',sequence:2,expectedRevision:state.revision,actorId:'goat',specification:spec,confirmation:{accepted:true,worldId:'yard',worldRevision:1,floorId:'ground',from:{x:4,y:4,h:0},to:{x:4.1,y:4,h:0}}});state=staged.next;character=staged.character;}finally{Math.random=oldRandom;}
assert.equal(seed,12345);assert.equal(character.resources.hp,37);assert.equal(character.resources.ap,3);assert.equal(character.resources.stamina,19.7);assert.deepEqual(openStealthSave(exportStealthSave({state,characters:[character]})).characters[0],character);
let streams=createStealthState(['alpha','beta']),latestCommand;
const walkers=['alpha','beta'].map(id=>createCharacter({id})),steps=[],listener={id:'guard',position:{x:4,y:4,h:0},hearingScale:1,hearingEnabled:true,audible:true,permitted:true,sourceSeen:false,incapacitated:false};
for(const [actorId,sequence]of [['alpha',1],['beta',1],['alpha',2]]){
  latestCommand={version:1,id:'move-1',sequence,expectedRevision:streams.revision,actorId,specification:{...spec,mode:'walk',stance:'standing',distanceM:1},confirmation:{accepted:true,worldId:'yard',worldRevision:1,floorId:'ground',from:{x:3+sequence,y:4,h:0},to:{x:4+sequence,y:4,h:0}}};
  const index=walkers.findIndex(c=>c.id===actorId),result=stageStealthMove(streams,walkers[index],latestCommand);assert(result.ok);streams=result.next;walkers[index]=result.character;steps.push(...result.events);
}
assert.equal(new Set(steps.map(e=>e.id)).size,3);assert.equal(new Set(steps.flatMap(e=>evaluateStealthNoise(e,[listener])).map(e=>e.eventId)).size,3);assert.equal(streams.receipts.length,2);
const durable=openStealthSave(exportStealthSave({state:streams,characters:walkers})),retry=stageStealthMove(durable.state,durable.characters[0],latestCommand);assert(retry.repeated);assert.deepEqual(retry.events,[]);assert.deepEqual(retry.character,walkers[0]);assert.deepEqual(retry.next,streams);
assert.throws(()=>stageStealthMove(durable.state,durable.characters[0],{...latestCommand,sequence:1}),e=>e.code==='STEALTH_COMMAND_RETIRED');
const footstepIdentity={confirmedSteps:steps.length,distinctEvents:new Set(steps.map(e=>e.id)).size,durableRetry:true};
const host=createStealthReference({route:'brush'});let resumed;try{const action=host.actions.read();host.actions.request('stance',action.context);for(let i=0;i<24;i++){host.walking.request({version:1,actorId:'goat',vector:{x:1,y:0},seconds:.05});host.advance(.05);}resumed=createStealthReference({checkpoint:host.checkpoint()});assert.deepEqual(resumed.readPose(),host.readPose());assert.deepEqual(resumed.read().resources,host.read().resources);}finally{resumed?.dispose();host.dispose();}
const surface={kind:'flat-plane',floorId:'ground',heightM:0},cursor=createCrawlCursor({actorId:'goat',surface,equipment:'rifle'}),sample={kind:'nautilus-native-crawl-sample',version:1,actorId:'goat',revision:1,mode:'on-foot',position:{x:4,y:4,h:0},heading:0,stance:'prone',action:'locomotion',travelM:800,floorId:'ground'};cursor.stage(sample).commit();assert.equal(cursor.read().signedDistanceM,0);cursor.stage({...sample,revision:2,position:{x:4.1,y:4,h:0},travelM:800.1}).commit();assert(Math.abs(cursor.read().signedDistanceM-.1)<1e-8);
let native=null;
if(process.argv.includes('--renderer')){
  const {createNativeCrawlBody}=await import('@nautilus-engine/map-core/native-actors/crawl/three'),{nativeActorResources}=await import('@nautilus-engine/map-core/native-actors'),T=await import('@nautilus-engine/map-core/render-effects/three'),data=JSON.parse(fs.readFileSync(new URL(nativeActorResources('goat')[0].url),'utf8'));
  const a=createNativeCrawlBody({model:'goat',actorId:'goat',data,crawl:{surface,equipment:'rifle'}});let b;try{a.update(sample);const moved={...sample,revision:2,position:{x:4.1,y:4,h:0},travelM:800.1};a.update(moved);b=createNativeCrawlBody({model:'goat',actorId:'goat',data,crawl:{surface,equipment:'rifle'},checkpoint:a.checkpoint()});b.update(moved);assert.deepEqual(a.checkpoint(),b.checkpoint());assert(a.root instanceof T.Group);let minimum=Infinity;const v=new T.Vector3();for(const part of a.worker.parts)for(let i=0;i<part.geometry.attributes.position.count;i++){part.getVertexPosition(i,v);minimum=Math.min(minimum,v.applyMatrix4(part.matrixWorld).y);}assert(minimum>=0);native={model:'goat',equipment:'rifle',minimumH:minimum,sharedThree:true};}finally{a.dispose();b?.dispose();}
}else await assert.rejects(()=>import('@nautilus-engine/map-core/native-actors/crawl/three'),error=>error.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');
console.log(JSON.stringify({status:'passed',headless:true,publicEntries:process.argv.includes('--renderer')?4:3,footstepIdentity,native}));
