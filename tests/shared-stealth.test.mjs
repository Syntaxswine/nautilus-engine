import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCharacter} from '../packages/rules-core/index.js';
import * as S from '../packages/stealth-core/index.js';
import {blankMap,openDocument} from '../packages/map-core/index.js';
import {blueprintRequirements,assertBlueprintCompatible} from '../packages/map-core/capabilities.js';
import {assertMapCapabilities} from '../packages/map-core/railway-map.js';
import {awarenessRate as originalRate} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/awareness.js';
import {movementCost,sightRange} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/engine.js';
import {woodlandDepth} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/woodland.js';
import {buildFoliageObstacles,traceFoliage as originalTrace} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/foliage-obstacles.js';
import {foliageIndex,traceFoliage} from '../packages/stealth-core/foliage-trace.js';
const character=()=>createCharacter({id:'goat',stats:{sneak:40,agility:80},resources:{hp:37,ap:10,stamina:30}});
const specification=(extra={})=>({version:1,mode:'walk',stance:'standing',distanceM:1,terrainCost:1,injuryMultiplier:1,loadMultiplier:1,walkSpeedMps:3.6,chargeAP:true,...extra});
const confirmation=(extra={})=>({accepted:true,worldId:'yard',worldRevision:2,floorId:'ground',from:{x:4,y:10,h:0},to:{x:5,y:10,h:0},...extra});
const observation=(extra={})=>({version:1,observer:{id:'guard',position:{x:4,y:10,h:0},heading:0,perception:50,alert:false,ap:10,maxAp:10,cone:120},target:{id:'goat',position:{x:24,y:10,h:0},mode:'sneak',stance:'standing',rawSneak:40,moving:true,ap:10,maxAp:10},visibility:{zones:['head','torso','legs'],light:.18,contrast:0,spotlit:false},concealment:0,...extra});
const posture=(state,extra={})=>S.stageStealthPosture(state,{version:1,id:'posture-'+state.revision,expectedRevision:state.revision,sequence:state.revision,actorId:'goat',mode:'sneak',stance:'standing',confirmed:true,...extra}).next;

test('movement parity preserves AFT mode, stance, cost order and distinct stamina/noise',()=>{
  for(const mode of ['walk','sneak','run'])for(const stance of ['standing','kneeling','prone']){
    const p=S.previewStealthMove(character(),specification({mode,stance})),u={stance,sneaking:mode==='sneak',running:mode==='run'};
    assert.equal(p.requestedCosts.ap,movementCost(u));assert.equal(p.speedMps,3.6*({walk:1,sneak:.5,run:2})[mode]);assert.equal(p.noiseRadiusM,mode==='sneak'?3:10);assert.equal(p.rawSneak,40);assert.equal(p.effectiveSneak,mode==='sneak'?60:40);
  }
  const injured=S.previewStealthMove(character(),specification({mode:'sneak',injuryMultiplier:2,terrainCost:1.5}));assert.equal(injured.requestedCosts.ap,2*1.5*1.5*2);
  assert.equal(S.previewStealthMove(character(),specification({stance:'prone',mode:'run',loadMultiplier:2})).requestedCosts.stamina,6);
});

test('only accepted segments stage atomic costs/noise; durable replay cannot pay twice',()=>{
  let state=posture(S.createStealthState(['goat','guard'])),actor=character();const untouched=structuredClone(actor),before=structuredClone(state),spec=specification({mode:'sneak'});
  for(let i=0;i<10;i++)S.previewStealthMove(actor,spec);assert.deepEqual(actor,untouched);assert.deepEqual(state,before);
  const command={version:1,id:'move-1',expectedRevision:state.revision,sequence:state.revision,actorId:'goat',specification:spec,confirmation:confirmation()};
  assert.throws(()=>S.stageStealthMove(state,actor,{...command,confirmation:{...confirmation(),accepted:false}}),/accepted host/);
  const r=S.stageStealthMove(state,actor,command);assert(r.ok);assert.equal(r.character.resources.ap,7);assert.equal(r.character.resources.stamina,28);assert.equal(r.character.resources.hp,37);assert.equal(r.next.actors[0].travelM,1);assert.equal(r.events[0].radiusM,3);
  const repeat=S.stageStealthMove(r.next,r.character,command);assert(repeat.repeated);assert.deepEqual(repeat.character,r.character);assert.deepEqual(repeat.next,r.next);assert.deepEqual(repeat.events,[]);
  assert.throws(()=>S.stageStealthMove(r.next,r.character,{...command,confirmation:confirmation({to:{x:6,y:10,h:0}})}),/reused/);
  const poor={...actor,resources:{hp:37,ap:0,stamina:0}},blocked=S.stageStealthMove(state,poor,{...command,id:'no-resources'});assert(!blocked.ok);assert.deepEqual(blocked.next,state);assert.deepEqual(blocked.character,poor);
  assert.throws(()=>S.stageStealthMove(state,actor,{...command,id:'upstairs',confirmation:confirmation({to:{x:5,y:10,h:2.12}})}),/same-plane/);
});

test('footsteps distinguish actor streams, later sequences and worlds across durable retries',()=>{
  const initial=S.createStealthState(['alpha','beta']),characters=['alpha','beta'].map(id=>({...character(),id})),listener={id:'guard',position:{x:4,y:10,h:0},hearingScale:1,hearingEnabled:true,audible:true,permitted:true,sourceSeen:false,incapacitated:false};
  const command={version:1,id:'move-1',sequence:1,expectedRevision:0,actorId:'alpha',specification:specification(),confirmation:confirmation()};
  const alpha=S.stageStealthMove(initial,characters[0],command),beta=S.stageStealthMove(alpha.next,characters[1],{...command,actorId:'beta',expectedRevision:alpha.next.revision});
  assert.equal(new Set([...alpha.events,...beta.events].map(e=>e.id)).size,2);
  assert.equal(new Set([...alpha.events,...beta.events].flatMap(e=>S.evaluateStealthNoise(e,[listener])).map(e=>e.eventId)).size,2);
  assert.deepEqual(alpha.events,S.stageStealthMove(initial,characters[0],command).events,'same confirmed boundary has deterministic identity');
  const saved=S.exportStealthSave({state:beta.next,characters:[alpha.character,beta.character]}),loaded=S.openStealthSave(saved);
  assert.deepEqual(loaded.characters.map(c=>c.resources),[alpha.character.resources,beta.character.resources]);
  const repeat=S.stageStealthMove(loaded.state,loaded.characters[0],command);assert(repeat.repeated);assert.deepEqual(repeat.events,[]);assert.deepEqual(repeat.next,loaded.state);assert.deepEqual(repeat.character,alpha.character);
  const laterCommand={...command,sequence:2,expectedRevision:loaded.state.revision,confirmation:confirmation({from:{x:5,y:10,h:0},to:{x:6,y:10,h:0}})},later=S.stageStealthMove(loaded.state,loaded.characters[0],laterCommand);
  assert(later.ok);assert.notEqual(later.events[0].id,alpha.events[0].id,'a higher sequence may reuse the caller ID');assert.equal(later.next.receipts.length,2);
  assert.deepEqual(later.character.resources,{hp:37,ap:6,stamina:28});
  const resumed=S.openStealthSave(S.exportStealthSave({state:later.next,characters:[later.character,beta.character]})),latest=S.stageStealthMove(resumed.state,resumed.characters[0],laterCommand);
  assert(latest.repeated);assert.deepEqual(latest.events,[]);assert.deepEqual(latest.character,later.character);assert.deepEqual(latest.next,resumed.state);
  assert.throws(()=>S.stageStealthMove(resumed.state,resumed.characters[0],command),e=>e.code==='STEALTH_COMMAND_RETIRED');
  const otherWorld=S.stageStealthMove(initial,characters[0],{...command,confirmation:confirmation({worldId:'another-yard'})});assert.notEqual(otherWorld.events[0].id,alpha.events[0].id);
});

test('footstep identity is unambiguous and bounded for maximum world/actor/sequence inputs',()=>{
  const step=(worldId,actorId,sequence=1)=>S.stageStealthMove(S.createStealthState([actorId]),{...character(),id:actorId},{version:1,id:'M'+'x'.repeat(127),sequence,expectedRevision:0,actorId,specification:specification(),confirmation:confirmation({worldId})}).events[0];
  assert.notEqual(step('yard:alpha','beta').id,step('yard','alpha:beta').id,'legal ID separators cannot alias world/actor tuples');
  const event=step('W'+'x'.repeat(127),'A'+'x'.repeat(95),1e9),listener={id:'guard',position:event.position,hearingScale:1,hearingEnabled:true,audible:true,permitted:true,sourceSeen:false,incapacitated:false};
  assert(event.id.length<=320);assert.equal(S.evaluateStealthNoise(event,[listener])[0].eventId,event.id);
  assert.throws(()=>S.evaluateStealthNoise({...event,id:'x'.repeat(321)},[listener]),/durable event identity/);
});

test('awareness rate is source-exact; effective Sneak does not replace raw Sneak',()=>{
  for(const stance of ['standing','kneeling','prone'])for(const mode of ['walk','sneak','run'])for(const cover of [0,.4,4]){
    const args={distance:22,exposure:.75,light:.19,contrast:.2,perception:65,stealth:40,sneaking:mode==='sneak',running:mode==='run',moving:true,stance,alert:false,concealment:cover};assert.equal(S.awarenessRate(args),originalRate(args));
  }
  const obs=observation(),p=S.previewAwareness(obs);assert.equal(p.rawSneak,40);assert.equal(p.effectiveSneak,60);
  assert.equal(sightRange({}, {sneaking:true,stealth:40,stance:'standing'}),28);
  assert.equal(p.rate,originalRate({distance:20,exposure:1,light:.18,perception:50,stealth:40,sneaking:true,moving:true,stance:'standing',concealment:0}));
  assert(!S.previewAwareness({...obs,target:{...obs.target,position:{x:34,y:10,h:0}}}).candidate,'sneak range cap is 28, not 38');
});

test('confirmed time/action boundaries retain recognition hysteresis and do not reroll',()=>{
  let state=S.createStealthState(['goat','guard']);const obs=observation();const command={version:1,id:'tick-1',expectedRevision:0,sequence:0,observation:obs,boundary:{kind:'time',seconds:1},confirmed:true};
  const p=S.previewAwareness(obs);for(let i=0;i<20;i++)assert.deepEqual(S.previewAwareness(obs),p);assert.equal(state.revision,0);
  const r=S.stageStealthAwareness(state,command);assert.equal(r.next.contacts[0].score,p.rate);assert.deepEqual(S.stageStealthAwareness(r.next,command).next,r.next);
  assert.throws(()=>S.stageStealthAwareness(state,{...command,confirmed:false}),/confirmed host/);
  const bright={...obs,target:{...obs.target,mode:'walk'},visibility:{...obs.visibility,light:1}},lit=S.stageStealthAwareness(r.next,{...command,id:'bright',expectedRevision:r.next.revision,sequence:r.next.revision,observation:bright}).next;assert.equal(lit.contacts[0].score,100);assert.equal(lit.contacts[0].perceived,2);
  const dark=S.stageStealthAwareness(lit,{...command,id:'dark',expectedRevision:lit.revision,sequence:lit.revision,observation:{...obs,visibility:{...obs.visibility,zones:[]}},boundary:{kind:'time',seconds:20}}).next;assert.equal(dark.contacts[0].score,60);assert(dark.contacts[0].lastKnown);
  const regained=S.stageStealthAwareness(dark,{...command,id:'regained',expectedRevision:dark.revision,sequence:dark.revision,boundary:{kind:'time',seconds:0}}).next;assert.equal(regained.contacts[0].perceived,2);
  let combat=S.stageStealthAwareness(state,{...command,id:'combat-start',boundary:{kind:'action',round:1}}).next;assert.equal(combat.contacts[0].seconds,0);
  const nextObs={...obs,target:{...obs.target,ap:8}};combat=S.stageStealthAwareness(combat,{...command,id:'combat-action',expectedRevision:combat.revision,sequence:combat.revision,observation:nextObs,boundary:{kind:'action',round:1}}).next;assert.equal(combat.contacts[0].seconds,12);assert.equal(combat.contacts[0].spent,12);
  combat=S.stageStealthAwareness(combat,{...command,id:'combat-round',expectedRevision:combat.revision,sequence:combat.revision,observation:nextObs,boundary:{kind:'action',round:2}}).next;assert.equal(combat.contacts[0].seconds,48);
});

test('complete saves preserve injured/exhausted characters, modes, travel, contacts and receipts',()=>{
  const state=posture(S.createStealthState(['goat','guard'])),a={...character(),resources:{hp:7,ap:0,stamina:0}},guard=createCharacter({id:'guard'}),save=S.exportStealthSave({state,characters:[a,guard]}),loaded=S.openStealthSave(save);
  assert.deepEqual(loaded.characters[0],a);assert.deepEqual(loaded.state,state);
  assert.throws(()=>S.openStealthSave({...loaded,version:2}),/v1/);const broken=structuredClone(loaded);delete broken.characters[0].resources.stamina;assert.throws(()=>S.openStealthSave(broken));
  assert.throws(()=>S.openStealthState({...state,profile:'unknown'}),/supported stealth/);
});

test('public document brush, clear, undo/redo and reload invalidate retained query snapshots',()=>{
  const doc=openDocument(blankMap('Brush route')),store=S.createFoliageStore(),from={x:4,y:10,level:0},to={x:20,y:10,level:0};let rev=0;
  const read=()=>store.replace({mapId:'brush-yard',revision:rev++,map:JSON.parse(doc.export())});
  const bare=read();assert.equal(bare.depth(from,to),0);
  assert(doc.apply({tool:'foliage-cover',start:{x:6,y:9,z:0},end:{x:18,y:11,z:0},options:{foliagePreset:'woodland-v1',foliageDensity:80}}).ok);
  const painted=read();assert.equal(painted.depth(from,to),10.4);assert(!painted.cell({x:10,y:10,level:0}).blocked);assert.equal(bare.depth(from,to),0);
  const json=doc.export();assert(doc.apply({tool:'clear-foliage',start:{x:6,y:9,z:0},end:{x:18,y:11,z:0}}).ok);const clear=read();assert.equal(clear.depth(from,to),0);assert.equal(painted.depth(from,to),10.4);
  doc.undo();assert.equal(read().depth(from,to),10.4);doc.redo();assert.equal(read().depth(from,to),0);
  const reloaded=S.createFoliageSnapshot({mapId:'reload',revision:0,map:JSON.parse(openDocument(json).export())});assert.equal(reloaded.depth(from,to),10.4);
  const map=JSON.parse(json);assert(blueprintRequirements(map).required.some(r=>r.id===S.FOLIAGE_CAPABILITY));assert.throws(()=>assertMapCapabilities(map,[]),e=>e.code==='UNSUPPORTED_MAP_FOLIAGE');assertMapCapabilities(map,[S.FOLIAGE_CAPABILITY]);
  assert.throws(()=>assertBlueprintCompatible(map,{id:'no-cover',schemas:[{id:'aft-map',versions:[2]}],capabilities:[]}));
  assert.throws(()=>store.replace({mapId:'brush-yard',revision:clear.revision,map:JSON.parse(json)}),/monotonic/);
});

test('foliage legacy encodings/presets preserve separate movement, concealment and shots',()=>{
  const map=blankMap('Legacy foliage');map.foliage={'10,10,0':[100,false],'11,10,0':[100,true],'12,10,0':[80,true,'wetland-v1'],'13,10,0':[100,true,'bog-v1'],'14,10,0':[100,true,'thicket-v1','mixed-v1']};
  const q=S.createFoliageSnapshot({mapId:'legacy',revision:0,map});assert.equal(q.cell({x:10,y:10,level:0}).preset,'woodland-v1');assert.equal(q.cell({x:11,y:10,level:0}).preset,'thicket-v1');assert(q.cell({x:13,y:10,level:0}).blocked);
  const ray={origin:{x:10.6,y:10,h:1.9},direction:{x:1,y:0,h:0},maxReach:.8,space:'native-world',purpose:'sight'};assert(q.trace(ray));assert.equal(q.trace({...ray,purpose:'shot'}),null,'leaf screen is not bulletproof');
  const volumes=q.volumes('native-world'),wood=volumes.find(v=>v.blocksShot&&v.beam),a=wood.beam.a,b=wood.beam.b,mid=a.map((n,i)=>(n+b[i])/2),hit=q.trace({origin:{x:mid[0],y:mid[2],h:mid[1]},direction:{x:0,y:0,h:1},maxReach:.1,purpose:'shot',space:'native-world'});assert.equal(hit?.material,'wood');
  assert.equal(q.depth({x:9,y:10,level:0},{x:15,y:10,level:0}),woodlandDepth(map,{x:9,y:10,z:0},{x:15,y:10,z:0}));
  assert.throws(()=>q.trace({...ray,space:'guessed'}),/explicit/);assert.throws(()=>S.createFoliageSnapshot({mapId:'bad',revision:0,map:{...map,foliage:{'10,10,0':[100,true,'invented']}}}));
});

test('ordered smaller buckets retain original nearest geometry for corners, reverse and elevated rays',()=>{
  const map=blankMap('Ray parity');map.foliage={};for(let y=12;y<25;y++)for(let x=12;x<25;x++)map.foliage[x+','+y+',0']=[100,true,'thicket-v1'];
  map.upper[0]??={};for(let y=12;y<18;y++)for(let x=12;x<18;x++){map.upper[0][x+','+y]='ground-grass';map.foliage[x+','+y+',1']=[100,true,'thicket-v1'];}
  const original=buildFoliageObstacles(map),optimized={...original,index:foliageIndex(original.boxes),worldIndex:foliageIndex(original.worldBoxes)};
  let rays=0;for(const space of ['simulation','world'])for(const purpose of ['sight','shot'])for(const height of [.3,1.2,3,4.2,8])for(const endpoints of [[[4,4],[32,32]],[[4,24],[32,12]],[[12,4],[12,32]],[[16,16],[16,16]],[[4,16],[32,16]]])for(const reverse of [false,true]){
    const [a,b]=reverse?[...endpoints].reverse():endpoints,start=[a[0],height,a[1]],end=[b[0],height+(a[0]===b[0]&&a[1]===b[1]?1:0),b[1]],expected=originalTrace(original,start,end,purpose,space),actual=traceFoliage(optimized,start,end,purpose,space);rays++;
    assert.equal(!!actual,!!expected);if(actual){assert(Math.abs(actual.t-expected.t)<1e-10);assert.equal(actual.box.id,expected.box.id);}assert.equal(!!traceFoliage(optimized,start,end,purpose,space,true),!!expected);
  }
  assert.equal(rays,200);
});

test('durable stream high water rejects retired replay and stays bounded over host ticks',()=>{
  let state=S.createStealthState(['goat','guard']);const obs=observation(),old={version:1,id:'tick-0',sequence:0,expectedRevision:0,observation:obs,boundary:{kind:'time',seconds:.01},confirmed:true};
  state=S.stageStealthAwareness(state,old).next;const random=Math.random;Math.random=()=>{throw Error('No implicit combat/acquisition RNG.');};
  try{for(let i=1;i<=1000;i++)state=S.stageStealthAwareness(state,{...old,id:'tick-'+i,sequence:i,expectedRevision:state.revision}).next;}finally{Math.random=random;}
  assert.equal(state.receipts.length,1);const before=structuredClone(state);assert.throws(()=>S.stageStealthAwareness(state,old),e=>e.code==='STEALTH_COMMAND_RETIRED');assert.deepEqual(state,before);assert.deepEqual(S.openStealthState(JSON.stringify(state)),state);
});

test('movement hearing borrows eligibility without inventing a rock event or guard action',()=>{
  const event={kind:'nautilus-stealth-footstep',version:1,id:'move:footstep',actorId:'goat',worldId:'yard',worldRevision:1,position:{x:1,y:1,h:0},radiusM:3},listener={id:'guard',position:{x:5,y:1,h:0},hearingScale:1,hearingEnabled:true,audible:true,permitted:true,sourceSeen:false,incapacitated:false};
  assert.deepEqual(S.evaluateStealthNoise(event,[listener]),[]);assert.equal(S.evaluateStealthNoise({...event,radiusM:10},[listener]).length,1);assert.equal(S.evaluateStealthNoise(event,[{...listener,hearingScale:2}]).length,1);
  for(const override of [{permitted:false},{audible:false},{sourceSeen:true},{incapacitated:true},{hearingEnabled:false}])assert.deepEqual(S.evaluateStealthNoise({...event,radiusM:10},[{...listener,...override}]),[]);
  assert.throws(()=>S.evaluateStealthNoise({...event,kind:'rock-impact-noise'},[listener]));
});

test('caller mutation cannot alter retained foliage identity, data or volumes',()=>{
  const input={mapId:'detached',revision:1,map:blankMap('Detached foliage')};input.map.foliage={'10,10,0':[100,true,'thicket-v1']};const q=S.createFoliageSnapshot(input),volumes=q.volumes('native-world');input.mapId='changed';input.revision=99;input.map.foliage['10,10,0'][0]=1;volumes[0].min[0]=900;
  assert.equal(q.statistics().mapId,'detached');assert.equal(q.statistics().revision,1);assert.equal(q.cell({x:10,y:10,level:0}).density,1);assert(q.volumes('native-world')[0].min[0]<20);
  const store=S.createFoliageStore(),map=q.exportMap();store.replace({mapId:'store',revision:1,map});assert.throws(()=>store.replace({mapId:'store',revision:1,map:{...map,foliage:{}}}),/changed without/);assert.equal(store.read().cell({x:10,y:10,level:0}).density,1);
});

test('selected AFT contact math and Fighters accepted-travel cursor remain source-compatible',async()=>{
  const load=async file=>import('data:text/javascript;base64,'+fs.readFileSync(new URL(file,import.meta.url)).toString('base64')),
    aft=await load('../vendor/shared-stealth/aft-motion/25d0e91858be0fa5ea7d54132a4a642624bd9aa7/original/dist/tactics/crawl-state.js.original'),ff=await load('../vendor/shared-stealth/fighters/541b0facc0597eaa719fd78cf391b417f12473da/original/sites/tactical-animal/dist/locomotion-sample.js.original'),native=await import('../packages/native-actors/crawl-contact.js');
  for(const distance of [-2,-.37,0,.11,.7,2])for(const side of [0,.5])assert.deepEqual(native.crawlContact(distance,.35,side),aft.crawlContact(distance,.35,side));
  const {createCrawlCursor}=await import('../packages/native-actors/crawl.js'),cursor=createCrawlCursor({actorId:'goat',surface:{kind:'flat-plane',floorId:'yard',heightM:0}});let previous,revision=0;
  for(const [x,y,travelled,heading]of [[1,1,90,0],[1.1,1,90.1,0],[1.1,1,90.1,90],[1.1,.9,90.2,90],[1.1,.9,90.2,0]]){
    const unit={x,y,travelled,heading,stance:'prone'},distance=ff.crawlTravel(unit,previous),sample={kind:'nautilus-native-crawl-sample',version:1,actorId:'goat',revision:revision++,mode:'on-foot',position:{x,y,h:0},heading,stance:'prone',action:'locomotion',travelM:travelled,floorId:'yard'};cursor.stage(sample).commit();assert(Math.abs(cursor.read().signedDistanceM-distance)<1e-9);previous={...unit,crawlDistance:distance};
  }
});
