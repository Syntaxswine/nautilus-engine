import {createWorld,openWorld} from '../packages/world-core/index.js';
import {createInteractionState,openInteractionState,serializeInteractionState,createInteractionActor,openInteractionActor,serializeInteractionActor,createInteractionQueries,previewInteraction,applyInteraction,walkActor,advanceTraversal} from '../packages/interactions/index.js';
export function starterFixture(){
  const world=createWorld({id:'threshold-yard',name:'The threshold yard',widthM:14,depthM:10,floorCount:2,storyHeightM:2.12,groundHeightM:0,heightM:6});
  const panel=(id,floorId,x1,y1,x2,y2,h)=>({id,floorId,role:'floor',bounds:{min:{x:x1,y:y1,h},max:{x:x2,y:y2,h}},supports:true,supportFloorId:floorId});
  const wall=(id,y1,y2)=>({id,floorId:'floor-0',role:'solid',bounds:{min:{x:3.9,y:y1,h:0},max:{x:4.1,y:y2,h:2}},supports:false,supportFloorId:null});
  world.surfaces=[panel('ground','floor-0',0,0,14,10,0),panel('upper-deck','floor-1',10,0,14,10,2.12),wall('west-wall',0,4.14),wall('east-wall',5.8,10)];
  const state=createInteractionState({worldId:world.id,doors:[{id:'yard-gate',label:'yard gate',floorId:'floor-0',position:{x:3.7,y:5,h:0},reachM:1.6,
    closedBounds:{min:{x:3.94,y:4.2,h:0},max:{x:4.06,y:5.8,h:2}},
    openBounds:{min:{x:3.94,y:4.14,h:0},max:{x:5.6,y:4.26,h:2}},
    motionBounds:{min:{x:3.9,y:4.14,h:0},max:{x:5.6,y:5.8,h:2}},open:false,locked:false}],
    stairs:[{id:'deck-stairs',label:'deck stairs',from:{floorId:'floor-0',surfaceId:'ground',position:{x:6,y:5,h:0}},
      to:{floorId:'floor-1',surfaceId:'upper-deck',position:{x:11,y:5,h:2.12}},
      path:[{x:6,y:5,h:0},{x:9.3,y:5,h:2.12},{x:11,y:5,h:2.12}],widthM:1.2,clearanceM:2,bidirectional:true,reachM:.75}]});
  const actor=createInteractionActor({id:'visitor',position:{x:2.5,y:5,h:0},floorId:'floor-0'});
  return {world,state,actor};
}
export function createStarterHost(saved){
  let fixture=starterFixture(),state=fixture.state,actor=fixture.actor,world=fixture.world,blocker=false,hasKey=true;
  if(saved){
    const input=typeof saved==='string'?JSON.parse(saved):structuredClone(saved);
    if(input.kind!=='nautilus-starter-save'||input.version!==1||Object.keys(input).sort().join(',')!=='actor,interactions,kind,version,world')throw Error('Use a complete starter save version 1.');
    world=openWorld(input.world);state=openInteractionState(input.interactions);actor=openInteractionActor(input.actor);
  }
  const queries={...createInteractionQueries(world,{actors:()=>blocker?[createInteractionActor({id:'waiting-visitor',floorId:'floor-0',position:{x:4,y:5,h:0}})]:[]}),
    canUnlock:()=>hasKey?{ok:true}:{ok:false,code:'KEY_REQUIRED',reason:'Find the yard key before unlocking this gate.'}};
  queries.validateBindings(state);world=openWorld(world);if(actor.traversal){
    const checked=advanceTraversal(state,actor,{seconds:1e-9},queries);if(!checked.ok)throw Error(checked.reason);
  }else{
    const checked=walkActor(state,actor,{direction:{x:0,y:0},seconds:0},queries);if(!checked.ok)throw Error(checked.reason);
    const support=queries.landing({actor,landing:{floorId:actor.floorId,surfaceId:world.surfaces.find(s=>s.supports&&s.supportFloorId===actor.floorId&&s.bounds.max.h===actor.position.h&&actor.position.x>=s.bounds.min.x&&actor.position.x<=s.bounds.max.x&&actor.position.y>=s.bounds.min.y&&actor.position.y<=s.bounds.max.y)?.id,position:actor.position}});
    if(!support.ok||!queries.sweep({state,actor,from:actor.position,to:actor.position}).ok)throw Error('Saved actor has no clear, supported position.');
  }
  const commit=result=>{if(result.ok){state=result.state;actor=result.actor;}return result;};
  return {
    get state(){return structuredClone(state);},get actor(){return structuredClone(actor);},get world(){return structuredClone(world);},
    inspect(targetId,kind){return previewInteraction(state,actor,kind===undefined?{targetId}:{targetId,kind},queries);},
    interact(targetId,kind){const preview=this.inspect(targetId,kind);return preview.ok?commit(applyInteraction(state,actor,preview.command,queries)):preview;},
    walk(x,y,seconds=.25){return commit(walkActor(state,actor,{direction:{x,y},seconds},queries));},
    advance(seconds){return commit(advanceTraversal(state,actor,{seconds},queries));},
    setBlocker(value){blocker=!!value;},
    setKey(value){hasKey=!!value;},
    setLocked(value){if(state.doors[0].open)throw Error('Close the gate before changing its lock.');state.doors[0].locked=!!value;state.revision++;},
    save(){return JSON.stringify({kind:'nautilus-starter-save',version:1,world,interactions:JSON.parse(serializeInteractionState(state)),actor:JSON.parse(serializeInteractionActor(actor))});}
  };
}
