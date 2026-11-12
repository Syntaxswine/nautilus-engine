import {createWorld,openWorld} from '../world-core/index.js';
import {createInteractionState,openInteractionState,createInteractionActor,openInteractionActor,createInteractionQueries,walkActor,previewInteraction,applyInteraction,advanceTraversal} from '../interactions/index.js';
import {plain,fields,receipt} from '../native-actors/data.js';

export function flatYardContent({sourcePin}={}){return {kind:'nautilus-player-content',version:1,identity:{id:'nautilus-flat-player-yard',version:1,sourcePin},
  world:{id:'flat-player-yard',name:'Player workshop',widthM:14,depthM:10,floorCount:1,storyHeightM:2.12,groundHeightM:0,heightM:6},
  surfaces:[{id:'yard',floorId:'floor-0',role:'floor',bounds:{min:{x:0,y:0,h:0},max:{x:14,y:10,h:0}},supports:true,supportFloorId:'floor-0'}],
  interactions:{doors:[],stairs:[]},actors:[{id:'player',floorId:'floor-0',position:{x:6,y:5,h:0},radiusM:.28,heightM:1.8,speedMps:3}],
  resources:{player:{health:37,ap:3,stamina:11,inventory:[{id:'yard-key',count:1}]}},appearance:{ground:0x75815a,sky:0x91ada5}};}

export function createDefaultWorld(content,{actorId,checkpoint}={}){
  content=plain(content);fields(content,['kind','version','identity','world','surfaces','interactions','actors','resources','appearance']);
  if(content.kind!=='nautilus-player-content'||content.version!==1)throw Error('CONTENT_VERSION: bind supported explicit scene content.');
  let world=createWorld(content.world);world.surfaces=content.surfaces;world=openWorld(world);
  let interactions=createInteractionState({worldId:world.id,...content.interactions}),actors=content.actors.map(createInteractionActor),resources=plain(content.resources),retired=false;
  if(checkpoint){const c=plain(checkpoint);fields(c,['kind','version','content','world','interactions','actors','resources']);if(c.kind!=='nautilus-default-player-world'||c.version!==1||JSON.stringify(c.content)!==JSON.stringify(content.identity))throw Error('WORLD_CHECKPOINT: incompatible content.');
    world=openWorld(c.world);interactions=openInteractionState(c.interactions);actors=c.actors.map(openInteractionActor);resources=c.resources;
    if(world.id!==content.world.id||interactions.worldId!==world.id||actors.length!==content.actors.length||actors.some((a,i)=>a.id!==content.actors[i].id))throw Error('WORLD_CHECKPOINT: preserve actor/world identities.');}
  if(!actors.some(a=>a.id===actorId))throw Error('ACTOR_UNAVAILABLE: select an authored actor.');
  const listeners=new Set(),emit=()=>{for(const fn of [...listeners])try{fn();}catch{}},get=id=>actors.find(a=>a.id===id);
  const queries=createInteractionQueries(world,{actors:()=>actors});queries.validateBindings(interactions);
  for(const actor of actors){const checked=actor.traversal?advanceTraversal(interactions,actor,{seconds:0},queries):walkActor(interactions,actor,{direction:{x:0,y:0},seconds:0},queries);if(!checked.ok)throw Error(checked.reason);}
  const retiredReceipt=()=>receipt(false,'WORLD_RETIRED','World retired.');
  const commit=result=>{if(retired)return retiredReceipt();if(result.ok){interactions=plain(result.state);actors=actors.map(a=>a.id===result.actor.id?plain(result.actor):a);emit();}return result;};
  return Object.freeze({content:plain(content.identity),actorIds:actors.map(a=>a.id),
    read(id=actorId){if(retired)throw Error('World retired.');const actor=get(id);if(!actor)throw Error('ACTOR_UNAVAILABLE');return plain({actor,resources:resources[id],world,interactions});},
    readPose(id=actorId){const a=get(id);return plain({actorId:id,revision:a.revision,position:a.position,mode:'on-foot'});},
    scene:{content:plain(content.identity),actorIds:actors.map(a=>a.id),read(id){const a=get(id),r=resources[id];if(!a)throw Error('ACTOR_UNAVAILABLE');return {version:1,actorId:id,mode:'on-foot',contextId:JSON.stringify([id,a.floorId,a.traversal?.stairId||null]),walkingAllowed:!a.traversal,position:plain(a.position),status:Object.entries(r||{}).filter(([,v])=>typeof v==='number').map(([id,v])=>({id,label:id,value:String(v)}))};},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}},
    walking:{request(intent){if(retired||intent.version!==1||!get(intent.actorId))return receipt(false,'WALK_UNAVAILABLE','Bind a current retained actor.');const before=get(intent.actorId),result=commit(walkActor(interactions,before,{direction:intent.vector,seconds:intent.seconds},queries));return receipt(result.ok,result.code||null,result.reason||null,result.ok&&result.actor.revision!==before.revision);}},
    actions:{id:'standard.interactions',read(){const a=get(actorId),actions=[...interactions.doors,...interactions.stairs].map(target=>{const p=previewInteraction(interactions,a,{targetId:target.id},queries);return {id:target.id,target:{id:target.id},verb:p.command?.kind||'interact',label:p.label||target.label,enabled:p.ok,reason:p.reason||null};});return {context:JSON.stringify([interactions.revision,a.revision]),actions};},request(targetId,offer){if(retired)return retiredReceipt();const a=get(actorId);if(offer!==JSON.stringify([interactions.revision,a.revision]))return receipt(false,'STALE_ACTION','Refresh the confirmed interaction.');const p=previewInteraction(interactions,a,{targetId},queries);if(!p.ok)return receipt(false,p.code,p.reason);const r=commit(applyInteraction(interactions,a,p.command,queries));return receipt(r.ok,r.code||null,r.reason||null,r.ok);}},
    advance(seconds){if(retired)throw Object.assign(Error('World retired.'),{code:'WORLD_RETIRED'});for(const a of actors){if(retired)break;if(a.traversal)commit(advanceTraversal(interactions,a,{seconds},queries));}},
    checkpoint(){return plain({kind:'nautilus-default-player-world',version:1,content:content.identity,world,interactions,actors,resources});},
    dispose(){retired=true;listeners.clear();}});
}
