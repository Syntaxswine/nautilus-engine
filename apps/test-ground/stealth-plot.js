// Application-owned projection and orchestration; rules remain public SDK calls.
import {blankMap,openDocument,assertMapCapabilities} from '@nautilus-engine/map-core';
import {createCharacter,deriveStats} from '@nautilus-engine/map-core/rules';
import {createStealthState,openStealthSave,exportStealthSave,previewStealthMove,stageStealthMove,stageStealthPosture,stageStealthAwareness,previewAwareness,evaluateStealthNoise,FOLIAGE_CAPABILITY} from '@nautilus-engine/map-core/stealth';
import {createFoliageStore,FOLIAGE_CONTRACT} from '@nautilus-engine/map-core/stealth/foliage';
import {confirmedCrawlSample} from '@nautilus-engine/map-core/native-actors/crawl';
import {clone,canonical,fields,insist} from './data.js';

export const STEALTH_SOURCE='bbf4f8adfebfd80ae7afe3744b5fab52b8a78366';
export const STEALTH_CAPABILITIES=['stealth-state-v1','foliage-query-v1','stealth-event-v1'];
export const STEALTH_ORIGIN=Object.freeze({x:8.5,y:16.5});
export const STEALTH_SURFACE=Object.freeze({kind:'flat-plane',floorId:'floor-0',heightM:0});
export const STEALTH_BODY=Object.freeze({radiusM:1.4,heightM:1.8});
export const hasStealth=recipe=>recipe.plots.some(p=>p.fixture==='stealth-yard');
export function stealthBlueprint({brush=true}={}) {
  const map=blankMap('Night Ledger foliage plot');
  // Four fixed portable authoring markers are required by map v2. They are
  // scaffolding, not four spawned actors; this fixture binds only player/guard.
  map.starts.forEach((p,i)=>{p.species='goat';p.weapon='hands';p.outfit='normal';});
  const doc=openDocument(map);doc.map.starts.forEach((p,i)=>{p.character.id='char_nl-foliage-marker-'+i;});
  if(brush){const r=doc.apply({tool:'foliage-cover',start:{x:5,y:10,z:0},end:{x:11,y:12,z:0},options:{foliagePreset:'woodland-v1',foliageDensity:80}});insist(r.ok,'BRUSH_REFUSED',r.error);}
  return JSON.parse(doc.export());
}
function scaffold(map){const next=clone(map);delete next.name;delete next.foliage;return canonical(next);}
let baseline;
export function projectStealthMap(input,{mapId='night-ledger-foliage',revision=0}={}) {
  const doc=openDocument(typeof input==='string'?input:JSON.stringify(input));
  insist(!doc.block,'STEALTH_MAP_SCOPE','Use the complete flat foliage blueprint, not a block.');
  const errors=doc.validate();insist(!errors.length,'STEALTH_MAP_INVALID',errors.join(' '));
  assertMapCapabilities(doc.map,[FOLIAGE_CAPABILITY]);
  const map=JSON.parse(doc.export());baseline??=scaffold(stealthBlueprint({brush:false}));
  insist(scaffold(map)===baseline,'STEALTH_MAP_SCOPE','Only name and ground-level foliage in local cells 0–15 are supported. Keep the flat yard, fixed authoring markers, empty upper floors and all other blueprint fields unchanged.');
  for(const key of Object.keys(map.foliage||{})){const [x,y,z]=key.split(',').map(Number);insist(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<16&&y>=0&&y<16&&z===0,'STEALTH_MAP_SCOPE','Keep foliage inside local cells 0–15 at level 0.');}
  const snapshot=createFoliageStore().replace({mapId,revision,map});
  const surfaces=[];
  for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(snapshot.cell({x,y,level:0}).blocked)surfaces.push({id:'west-foliage-'+x+'-'+y,floorId:'floor-0',role:'solid',supports:false,supportFloorId:null,bounds:{min:{x:STEALTH_ORIGIN.x+x-.5,y:STEALTH_ORIGIN.y+y-.5,h:0},max:{x:STEALTH_ORIGIN.x+x+.5,y:STEALTH_ORIGIN.y+y+.5,h:3}}});
  return Object.freeze({map,snapshot,surfaces});
}
export function initialStealth(resources,position={y:20.5}) {
  const characters=[createCharacter({id:'player',stats:{sneak:40,agility:80,endurance:60},resources:{hp:resources.health,ap:resources.ap,stamina:resources.stamina}}),createCharacter({id:'guard'})];
  return {version:1,map:stealthBlueprint(),mapRevision:0,poseRevision:0,heading:0,sequence:0,elapsedSeconds:0,moving:false,observerY:position.y<24.5?20.5:27.5,heard:[],save:exportStealthSave({state:createStealthState(['player','guard']),characters})};
}
export function validateStealth(value,resources) {
  fields(value,['version','map','mapRevision','poseRevision','heading','sequence','elapsedSeconds','moving','observerY','heard','save']);
  insist([20.5,27.5].includes(value.observerY),'STEALTH_OBSERVER','Keep the saved fixed observer lane for this route baseline.');
  insist(value.version===1&&[value.mapRevision,value.poseRevision,value.sequence].every(n=>Number.isSafeInteger(n)&&n>=0)&&Number.isFinite(value.heading)&&value.heading>=-180&&value.heading<=180&&Number.isFinite(value.elapsedSeconds)&&value.elapsedSeconds>=0&&typeof value.moving==='boolean','STEALTH_SAVE','Keep the complete finite foliage/pose/command/clock state.');
  const saved=openStealthSave(value.save);
  insist(saved.characters.map(c=>c.id).join()=== 'player,guard'&&saved.state.actors.map(c=>c.actorId).join()==='player,guard','STEALTH_SAVE','Keep exactly the player and diagnostic guard.');
  const c=saved.characters[0];insist(c.resources.hp===resources.health&&c.resources.ap===resources.ap&&c.resources.stamina===resources.stamina,'STEALTH_RESOURCES','Restore the complete spent character and host resources together.');
  insist(saved.state.actors.every(a=>a.stance==='standing'||a.stance==='prone'),'STEALTH_STANCE','Only standing and prone native goat poses are bound.');
  insist(Array.isArray(value.heard)&&value.heard.length<=64&&value.heard.every(e=>e.listenerId==='guard'&&typeof e.eventId==='string')&&new Set(value.heard.map(e=>e.eventId)).size===value.heard.length,'STEALTH_EVENTS','Keep distinct bounded confirmed hearing events.');
  return saved;
}
const local=p=>({x:p.x-STEALTH_ORIGIN.x,y:p.y-STEALTH_ORIGIN.y,h:p.h});
export function withinStealthPlot(actor,position=actor.position) {return position.h===0&&position.x-actor.radiusM>=8&&position.x+actor.radiusM<=24&&position.y-actor.radiusM>=16&&position.y+actor.radiusM<=32;}
export function stealthPose(s) {
  const saved=openStealthSave(s.stealth.save),a=saved.state.actors.find(a=>a.actorId==='player');
  return confirmedCrawlSample({kind:'nautilus-native-crawl-sample',version:1,actorId:'player',revision:s.stealth.poseRevision,mode:'on-foot',position:clone(s.actor.position),heading:s.stealth.heading,stance:a.stance,action:'locomotion',travelM:a.travelM,floorId:'floor-0'},STEALTH_SURFACE);
}
export function stealthObservation(s,foliage) {
  const saved=openStealthSave(s.stealth.save),[c,gc]=saved.characters,a=saved.state.actors[0],p=s.actor.position,
    guard={x:STEALTH_ORIGIN.x+13,y:s.stealth.observerY,h:0},
    heights=a.stance==='prone'?[.55,.30,.13]:[1.5,.9,.35],zones=['head','torso','legs'].filter((_,i)=>!stealthRay(s,foliage,{...guard,h:1.45},{...p,h:heights[i]},'sight'));
  return {version:1,observer:{id:'guard',position:guard,heading:180,perception:50,alert:false,ap:gc.resources.ap,maxAp:deriveStats(gc).maxAp,cone:120},target:{id:'player',position:clone(p),mode:a.mode,stance:a.stance,rawSneak:c.stats.sneak,moving:s.stealth.moving,ap:c.resources.ap,maxAp:deriveStats(c).maxAp},visibility:{zones,light:.18,contrast:0,spotlit:false},concealment:foliage.depth({x:guard.x-STEALTH_ORIGIN.x,y:guard.y-STEALTH_ORIGIN.y,level:0},{x:p.x-STEALTH_ORIGIN.x,y:p.y-STEALTH_ORIGIN.y,level:0})};
}
export function stealthRay(s,foliage,from,to,purpose) {
  insist(['sight','shot'].includes(purpose),'STEALTH_QUERY','Select sight or shot explicitly.');
  insist([from,to].every(p=>p&&[p.x,p.y,p.h].every(Number.isFinite)&&p.x>=8&&p.x<=24&&p.y>=16&&p.y<=32&&p.h>=0&&p.h<=3),'STEALTH_QUERY_SCOPE','Sight/shot endpoints must stay in the declared flat west plot, heights 0–3 m. Other world geometry is outside this query binding.');
  const reach=Math.hypot(to.x-from.x,to.y-from.y,to.h-from.h);if(!reach)return null;
  const hit=foliage.trace({origin:local(from),direction:{x:(to.x-from.x)/reach,y:(to.y-from.y)/reach,h:(to.h-from.h)/reach},maxReach:reach,purpose,space:'native-world'});
  // The complete accepted plot is a flat plane with foliage only. Terrain,
  // walls, doors, props and additional actors inside it are refused at preflight.
  return hit?{...hit,point:{x:hit.point.x+STEALTH_ORIGIN.x,y:hit.point.y+STEALTH_ORIGIN.y,h:hit.point.h}}:null;
}
function store(s,saved){s.stealth.save=exportStealthSave(saved);const r=saved.characters[0].resources;Object.assign(s.resources,{health:r.hp,ap:r.ap,stamina:r.stamina});}
export function stealthSpecification(s,distanceM){const {state}=openStealthSave(s.stealth.save),a=state.actors[0];return {version:1,mode:a.mode,stance:a.stance,distanceM,terrainCost:1,injuryMultiplier:1,loadMultiplier:1,walkSpeedMps:a.stance==='prone'?.35:3.6,chargeAP:false};}
export function stealthSpeed(s){return previewStealthMove(openStealthSave(s.stealth.save).characters[0],stealthSpecification(s,0)).speedMps;}
export function stagePlotMove(prior,next,foliage) {
  const distanceM=Math.hypot(next.actor.position.x-prior.actor.position.x,next.actor.position.y-prior.actor.position.y);if(!distanceM)return;
  const saved=openStealthSave(prior.stealth.save),sequence=prior.stealth.sequence+1,
    result=stageStealthMove(saved.state,saved.characters[0],{version:1,id:'move-'+sequence,sequence,expectedRevision:saved.state.revision,actorId:'player',specification:stealthSpecification(prior,distanceM),confirmation:{accepted:true,worldId:prior.world.id,worldRevision:prior.sceneryRevision,floorId:'floor-0',from:prior.actor.position,to:next.actor.position}});
  insist(result.ok,result.code,'The confirmed movement cannot spend its required resources.');
  saved.state=result.next;saved.characters[0]=result.character;store(next,saved);next.stealth.sequence=sequence;next.stealth.poseRevision++;next.stealth.moving=true;
  const dx=next.actor.position.x-prior.actor.position.x,dy=next.actor.position.y-prior.actor.position.y,a=saved.state.actors[0],dot=dx*Math.cos(prior.stealth.heading*Math.PI/180)+dy*Math.sin(prior.stealth.heading*Math.PI/180);
  if(a.stance==='standing'||dot>=-distanceM*.5)next.stealth.heading=Math.atan2(dy,dx)*180/Math.PI;
  const observation=stealthObservation(next,foliage);
  for(const event of result.events)next.stealth.heard.push(...evaluateStealthNoise(event,[{id:'guard',position:observation.observer.position,hearingScale:1,hearingEnabled:true,audible:true,permitted:true,sourceSeen:saved.state.contacts[0]?.perceived===2,incapacitated:false}]));
  next.stealth.heard=next.stealth.heard.slice(-64);
}
export function stagePlotTick(next,seconds,foliage) {
  const saved=openStealthSave(next.stealth.save),sequence=++next.stealth.sequence,result=stageStealthAwareness(saved.state,{version:1,id:'observe-'+sequence,sequence,expectedRevision:saved.state.revision,observation:stealthObservation(next,foliage),boundary:{kind:'time',seconds},confirmed:true});
  insist(result.ok,result.code,'Awareness boundary refused.');saved.state=result.next;store(next,saved);next.stealth.elapsedSeconds+=seconds;next.stealth.moving=false;
}
export function stagePlotPosture(next,id) {
  const saved=openStealthSave(next.stealth.save),a=saved.state.actors[0];
  if(id==='stealth/turn'){next.stealth.heading=((next.stealth.heading+270)%360)-180;next.stealth.poseRevision++;next.stealth.moving=false;return;}
  const sequence=++next.stealth.sequence,result=stageStealthPosture(saved.state,{version:1,id:'posture-'+sequence,sequence,expectedRevision:saved.state.revision,actorId:'player',mode:id==='stealth/mode'?(a.mode==='sneak'?'walk':'sneak'):a.mode,stance:id==='stealth/stance'?(a.stance==='prone'?'standing':'prone'):a.stance,confirmed:true});
  insist(result.ok,result.code,'Posture refused.');saved.state=result.next;store(next,saved);next.stealth.poseRevision++;next.stealth.moving=false;
}
export function readStealth(s,foliage){const observation=stealthObservation(s,foliage),from={...observation.observer.position,h:1.45},to={...s.actor.position,h:.9};return {pose:stealthPose(s),observation:previewAwareness(observation),state:openStealthSave(s.stealth.save).state,heard:clone(s.stealth.heard),mapRevision:s.stealth.mapRevision,presets:[...FOLIAGE_CONTRACT.presets],rays:{sight:stealthRay(s,foliage,from,to,'sight'),shot:stealthRay(s,foliage,from,to,'shot')}};}
