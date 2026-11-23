// One bounded contract fixture, not an editor/game adapter. All gameplay is
// composed from public imports; no donor runtime or alternate controller.
import {blankMap,openDocument} from '@nautilus-engine/map-core';
import {createCharacter,deriveStats} from '@nautilus-engine/map-core/rules';
import {createWorld,openWorld} from '@nautilus-engine/map-core/world';
import {createInteractionState,createInteractionActor,openInteractionActor,openInteractionState,createInteractionQueries,walkActor} from '@nautilus-engine/map-core/interactions';
import {createFoliageStore,previewStealthMove,evaluateStealthNoise,previewAwareness,createStealthState,stageStealthMove,stageStealthPosture,stageStealthAwareness,openStealthSave,exportStealthSave} from '@nautilus-engine/map-core/stealth';
const copy=v=>structuredClone(v),sourcePin='7e9052dcf6a2aa00c6d38130f5f2345b86ceb593';
const accepted=()=>({version:1,ok:true,committed:true,code:null,reason:null});
const refused=(code,reason)=>({version:1,ok:false,committed:false,code,reason});
const paint={tool:'foliage-cover',start:{x:6,y:9,z:0},end:{x:18,y:11,z:0},options:{foliagePreset:'woodland-v1',foliageDensity:80}};
export function referenceMap(){const map=blankMap('Shared stealth contract fixture');map.starts.forEach((p,i)=>{if(p.character)p.character.id='char_fixture-start-'+i;});const doc=openDocument(map);if(!doc.apply(paint).ok)throw Error('Reference brush failed.');const output=JSON.parse(doc.export());output.starts.forEach((p,i)=>p.character.id='char_fixture-start-'+i);return JSON.parse(openDocument(output).export());}
const baseMap=()=>{const m=referenceMap();delete m.foliage;return JSON.stringify(m);};
export function createStealthReference({route='bare',checkpoint}={}){
  if(!['bare','brush'].includes(route))throw Error('Choose the authored bare or brush contract route.');
  let map=referenceMap(),mapRevision=0,poseRevision=0,heading=0,action='locomotion',command=0,elapsedSeconds=0,heard=0,firstHeardSeconds=null,firstSeenSeconds=null,retired=false;
  let characters=[createCharacter({id:'goat',stats:{sneak:40,agility:80,endurance:60},resources:{hp:37,ap:3,stamina:88}}),createCharacter({id:'guard'})],stealth=createStealthState(['goat','guard']),interactions=createInteractionState({worldId:'shared-stealth-yard'}),
    actor=createInteractionActor({id:'goat',floorId:'floor-0',position:{x:4,y:route==='bare'?4:10,h:0},radiusM:1.4,heightM:1.8,speedMps:3.6});
  if(checkpoint){const c=copy(checkpoint);if(c.kind!=='nautilus-stealth-reference'||c.version!==1||Object.keys(c).sort().join()!==['kind','version','map','mapRevision','poseRevision','heading','action','command','elapsedSeconds','heard','firstHeardSeconds','firstSeenSeconds','route','actor','interactions','stealthSave'].sort().join())throw Error('Reference checkpoint version/fields differ.');
    route=c.route;if(!['bare','brush'].includes(route)||!['locomotion','other'].includes(c.action)||!Number.isFinite(c.heading)||Math.abs(c.heading)>180||[c.mapRevision,c.poseRevision,c.command,c.heard].some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isFinite(c.elapsedSeconds)||c.elapsedSeconds<0)throw Error('Reference checkpoint values differ.');
    ({map,mapRevision,poseRevision,heading,action,command,elapsedSeconds,heard,firstHeardSeconds,firstSeenSeconds}=c);actor=openInteractionActor(c.actor);interactions=openInteractionState(c.interactions);const saved=openStealthSave(c.stealthSave);stealth=saved.state;characters=saved.characters;
    if(actor.id!=='goat'||actor.floorId!=='floor-0'||actor.position.h!==0||actor.radiusM!==1.4||actor.heightM!==1.8||interactions.worldId!=='shared-stealth-yard'||interactions.doors.length||interactions.stairs.length||characters.map(a=>a.id).join()!=='goat,guard')throw Error('Reference checkpoint owners differ.');
  }
  const listeners=new Set(),store=createFoliageStore();let foliage,world,queries;
  const emit=()=>{for(const f of [...listeners])f();},mode=()=>stealth.actors.find(a=>a.actorId==='goat');
  const content={kind:'nautilus-player-content',version:1,identity:{id:'shared-stealth-contract-fixture',version:1,sourcePin},world:{id:'shared-stealth-yard',name:'Shared stealth contract fixture',widthM:32,depthM:16,floorCount:1,storyHeightM:2.12,groundHeightM:0,heightM:6},appearance:{ground:0xada68a,sky:0x99b6bb}};
  function bindMap(next,revision){
    const plain=copy(next);delete plain.foliage;if(JSON.stringify(plain)!==baseMap())throw Error('REFERENCE_MAP_SCOPE: this fixture accepts its authored flat blueprint and foliage edits only.');
    const candidate=store.replace({mapId:'shared-stealth-fixture',revision,map:next});let w=createWorld(content.world);
    w.surfaces=[{id:'yard',floorId:'floor-0',role:'floor',bounds:{min:{x:0,y:0,h:0},max:{x:32,y:16,h:0}},supports:true,supportFloorId:'floor-0'},
      {id:'route-stop',floorId:'floor-0',role:'solid',bounds:{min:{x:24,y:0,h:0},max:{x:24.3,y:16,h:3}},supports:false,supportFloorId:null}];
    // Source cell blocking is deliberately separate from leaf/wood ray solids.
    for(let y=0;y<16;y++)for(let x=0;x<32;x++)if(candidate.cell({x,y,level:0}).blocked)w.surfaces.push({id:'brush-'+x+'-'+y,floorId:'floor-0',role:'solid',bounds:{min:{x:x-.5,y:y-.5,h:0},max:{x:x+.5,y:y+.5,h:3}},supports:false,supportFloorId:null});
    w=openWorld(w);const q=createInteractionQueries(w,{actors:()=>[actor]});q.validateBindings(interactions);const fit=q.walk({state:interactions,actor,from:actor.position,to:actor.position});if(!fit.ok)throw Error('Reference map occupies the current native body: '+fit.reason);
    map=copy(next);mapRevision=revision;foliage=candidate;world=w;queries=q;
  }
  bindMap(map,mapRevision);
  function nextCommand(type){const sequence=++command;return {version:1,id:type+'-'+sequence,sequence,expectedRevision:stealth.revision};}
  function specification(distanceM){const m=mode();return {version:1,mode:m.mode,stance:m.stance,distanceM,terrainCost:1,injuryMultiplier:1,loadMultiplier:1,walkSpeedMps:m.stance==='prone'?.35:3.6,chargeAP:false};}
  function readPose(){return {kind:'nautilus-native-crawl-sample',version:1,actorId:'goat',revision:poseRevision,mode:'on-foot',position:copy(actor.position),heading,stance:mode().stance,action,travelM:mode().travelM,floorId:'floor-0'};}
  function observation(){
    const p=actor.position,g={x:20,y:route==='bare'?4:10,h:0},height=mode().stance==='prone'?[.55,.30,.13]:[1.5,.9,.35],zones=['head','torso','legs'].filter((_,i)=>{
      const from={...g,h:1.45},to={...p,h:height[i]},d=Math.hypot(to.x-from.x,to.y-from.y,to.h-from.h);return !d||!foliage.occluded({origin:from,direction:{x:(to.x-from.x)/d,y:(to.y-from.y)/d,h:(to.h-from.h)/d},maxReach:d,purpose:'sight',space:'native-world'});
    });
    return {version:1,observer:{id:'guard',position:g,heading:180,perception:50,alert:false,ap:characters[1].resources.ap,maxAp:deriveStats(characters[1]).maxAp,cone:120},target:{id:'goat',position:copy(p),mode:mode().mode,stance:mode().stance,rawSneak:characters[0].stats.sneak,moving:!!moving,ap:characters[0].resources.ap,maxAp:deriveStats(characters[0]).maxAp},visibility:{zones,light:.18,contrast:0,spotlit:false},concealment:foliage.depth({x:g.x,y:g.y,level:0},{x:p.x,y:p.y,level:0})};
  }
  let moving=false;
  const actions={id:'shared-stealth',read(){return {context:String(poseRevision),actions:[['mode',mode().mode==='sneak'?'Walk':'Sneak'],['stance',mode().stance==='prone'?'Stand':'Prone'],['turn','Turn in place'],['action',action==='other'?'Resume crawl':'Suspend crawl'],['brush',Object.keys(map.foliage||{}).length?'Clear brush':'Paint brush']].map(([id,label])=>({id,label,verb:'change',target:{id},enabled:true,reason:null}))};},request(id,offer){
    if(retired||offer!==String(poseRevision))return refused('STALE_ACTION','Refresh the confirmed fixture action.');
    if(id==='mode'||id==='stance'){const m=mode(),result=stageStealthPosture(stealth,{...nextCommand('posture'),actorId:'goat',mode:id==='mode'?(m.mode==='sneak'?'walk':'sneak'):m.mode,stance:id==='stance'?(m.stance==='prone'?'standing':'prone'):m.stance,confirmed:true});stealth=result.next;}
    else if(id==='turn')heading=((heading+90+180)%360)-180;
    else if(id==='action')action=action==='locomotion'?'other':'locomotion';
    else if(id==='brush'){const doc=openDocument(map),result=doc.apply(Object.keys(map.foliage||{}).length?{...paint,tool:'clear-foliage'}:paint);if(!result.ok)return refused('BRUSH_REFUSED',result.error);bindMap(JSON.parse(doc.export()),mapRevision+1);}
    else return refused('UNKNOWN_ACTION','Use an authored fixture action.');
    moving=false;++poseRevision;emit();return accepted();
  }};
  const host={content,actions,
    read(){return copy({world,interactions,actor,resources:characters[0].resources,stealth,poseRevision,heading,action,elapsedSeconds,heard,firstHeardSeconds,firstSeenSeconds,mapRevision,foliage:foliage.statistics(),observation:previewAwareness(observation())});},
    readPose,
    scene:{content:content.identity,actorIds:['goat'],inputElement:null,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},read(){return {version:1,actorId:'goat',mode:'on-foot',contextId:'shared-stealth-fixture',walkingAllowed:action==='locomotion',position:copy(actor.position),status:[{id:'stance',label:'',value:mode().stance+' / '+mode().mode},{id:'hp',label:'HP',value:String(characters[0].resources.hp)},{id:'stamina',label:'Stamina',value:characters[0].resources.stamina.toFixed(1)},{id:'awareness',label:'Awareness',value:(stealth.contacts[0]?.score??0).toFixed(1)}]};}},
    walking:{request(intent){
      if(retired||intent?.version!==1||intent.actorId!=='goat'||action!=='locomotion')return refused('WALK_UNAVAILABLE','This host does not own an active locomotion request.');
      const speed=previewStealthMove(characters[0],specification(0)).speedMps,result=walkActor(interactions,{...actor,speedMps:speed},{direction:intent.vector,seconds:intent.seconds},queries);if(!result.ok)return refused(result.code,result.reason);
      const dx=result.actor.position.x-actor.position.x,dy=result.actor.position.y-actor.position.y,distanceM=Math.hypot(dx,dy);if(!distanceM)return {...accepted(),committed:false};
      const staged=stageStealthMove(stealth,characters[0],{...nextCommand('move'),actorId:'goat',specification:specification(distanceM),confirmation:{accepted:true,worldId:world.id,worldRevision:mapRevision,floorId:actor.floorId,from:actor.position,to:result.actor.position}});if(!staged.ok)return refused(staged.code,'Movement resources are exhausted.');
      const dot=dx*Math.cos(heading*Math.PI/180)+dy*Math.sin(heading*Math.PI/180);if(mode().stance==='standing'||dot>=-distanceM*.5)heading=Math.atan2(dy,dx)*180/Math.PI;
      actor=result.actor;interactions=result.state;stealth=staged.next;characters[0]=staged.character;moving=true;++poseRevision;
      for(const noise of staged.events)if(evaluateStealthNoise(noise,[{id:'guard',position:{x:20,y:route==='bare'?4:10,h:0},hearingScale:1,hearingEnabled:true,audible:true,permitted:true,sourceSeen:stealth.contacts[0]?.perceived===2,incapacitated:false}]).length){heard++;firstHeardSeconds??=elapsedSeconds;}
      emit();return accepted();
    }},
    advance(seconds){if(retired)throw Error('Reference host retired.');if(!Number.isFinite(seconds)||seconds<0||seconds>.1)throw Error('Use the retained host clock, at most .1 s.');const result=stageStealthAwareness(stealth,{...nextCommand('tick'),observation:observation(),boundary:{kind:'time',seconds},confirmed:true});stealth=result.next;elapsedSeconds+=seconds;if(stealth.contacts[0]?.perceived===2)firstSeenSeconds??=elapsedSeconds;moving=false;++poseRevision;emit();},
    checkpoint(){return copy({kind:'nautilus-stealth-reference',version:1,map,mapRevision,poseRevision,heading,action,command,elapsedSeconds,heard,firstHeardSeconds,firstSeenSeconds,route,actor,interactions,stealthSave:exportStealthSave({state:stealth,characters})});},
    foliage:()=>foliage,
    dispose(){retired=true;listeners.clear();}
  };
  return Object.freeze(host);
}
