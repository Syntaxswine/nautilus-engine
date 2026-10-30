import test from 'node:test';
import assert from 'node:assert/strict';
import {starterFixture,createStarterHost} from '../examples/game-starter-host.js';
import {createInteractionQueries,previewInteraction,applyInteraction,walkActor,advanceTraversal,createInteractionActor,openInteractionActor,openInteractionState,serializeInteractionActor,serializeInteractionState} from '../packages/interactions/index.js';
function setup(){const f=starterFixture();return {...f,queries:createInteractionQueries(f.world)};}
test('door preview is pure; commit changes only the sidecar and rejects replay',()=>{
  const {world,state,actor,queries}=setup(),before=JSON.stringify({world,state,actor});
  const preview=previewInteraction(state,actor,{targetId:'yard-gate'},queries);
  assert.equal(preview.ok,true);assert.equal(JSON.stringify({world,state,actor}),before);
  const result=applyInteraction(state,actor,preview.command,queries);
  assert.equal(result.ok,true);assert.equal(result.state.doors[0].open,true);assert.equal(result.events[0].type,'door-opened');
  assert.equal(JSON.stringify({world,state,actor}),before);
  const duplicate=applyInteraction(result.state,result.actor,preview.command,queries);
  assert.equal(duplicate.code,'STALE_ACTION');assert.deepEqual(duplicate.events,[]);assert.deepEqual(duplicate.state,result.state);
});
test('locked doors require explicit permission; unsupported bindings fail actionably',()=>{
  const {state,actor,queries}=setup();state.doors[0].locked=true;
  assert.equal(previewInteraction(state,actor,{targetId:'yard-gate'},queries).code,'LOCKED');
  assert.equal(previewInteraction(state,actor,{targetId:'yard-gate',kind:'unlock-door'},queries).code,'MISSING_BINDING');
  const denied={...queries,canUnlock:()=>({ok:false,code:'NO_KEY',reason:'A key is needed.'})};
  assert.equal(previewInteraction(state,actor,{targetId:'yard-gate',kind:'unlock-door'},denied).code,'NO_KEY');
  const allowed={...queries,canUnlock:()=>({ok:true})},p=previewInteraction(state,actor,{targetId:'yard-gate',kind:'unlock-door'},allowed);
  const unlocked=applyInteraction(state,actor,p.command,allowed);assert.equal(unlocked.state.doors[0].locked,false);assert.equal(unlocked.state.doors[0].open,false);
  assert.equal(previewInteraction(state,actor,{targetId:'yard-gate'}).code,'LOCKED');
});
test('door commit rechecks occupancy and never crushes an actor',()=>{
  const {state,actor,world}=setup();let others=[];
  const queries=createInteractionQueries(world,{actors:()=>others}),p=previewInteraction(state,actor,{targetId:'yard-gate'},queries);
  others=[createInteractionActor({id:'other',floorId:'floor-0',position:{x:4,y:5,h:0}})];
  const blocked=applyInteraction(state,actor,p.command,queries);
  assert.equal(blocked.code,'DOOR_OCCUPIED');assert.equal(blocked.state.doors[0].open,false);assert.deepEqual(blocked.events,[]);
});
test('swept movement stops at a closed door; opening makes the portal usable',()=>{
  const f=setup();f.actor.position.x=3.5;
  assert.equal(walkActor(f.state,f.actor,{direction:{x:1,y:0},seconds:1},f.queries).code,'BLOCKED');
  const p=previewInteraction(f.state,f.actor,{targetId:'yard-gate'},f.queries),opened=applyInteraction(f.state,f.actor,p.command,f.queries);
  assert.equal(walkActor(opened.state,opened.actor,{direction:{x:1,y:0},seconds:1},f.queries).ok,true);
  opened.actor.position.x=4;
  assert.equal(previewInteraction(opened.state,opened.actor,{targetId:'yard-gate'},f.queries).code,'DOOR_OCCUPIED');
});
test('stairs move continuously, preserve a mid-flight save and confirm a floor only on arrival',()=>{
  const {state,actor,queries}=setup();actor.position.x=5.5;
  const p=previewInteraction(state,actor,{targetId:'deck-stairs'},queries);assert.equal(p.ok,true);
  let step=applyInteraction(state,actor,p.command,queries);assert.equal(step.actor.position.x,5.5);
  step=advanceTraversal(step.state,step.actor,{seconds:.75},queries);assert.ok(step.actor.position.h>0&&step.actor.position.h<2.12);assert.equal(step.actor.floorId,'floor-0');
  let a={state:openInteractionState(serializeInteractionState(step.state)),actor:openInteractionActor(serializeInteractionActor(step.actor))},b=structuredClone(a);
  for(let index=0;index<20&&a.actor.traversal;index++){
    a=advanceTraversal(a.state,a.actor,{seconds:.25},queries);b=advanceTraversal(b.state,b.actor,{seconds:.25},queries);assert.equal(a.ok,true);assert.deepEqual(a,b);
  }
  assert.equal(a.actor.floorId,'floor-1');assert.deepEqual(a.actor.position,{x:11,y:5,h:2.12});assert.equal(a.actor.traversal,null);assert.equal(a.events[0].type,'stairs-arrived');
});
test('reverse stairs, one-way routes, body width and low clearance are explicit',()=>{
  const {state,actor,queries}=setup();actor.floorId='floor-1';actor.position={x:11,y:5,h:2.12};
  assert.equal(previewInteraction(state,actor,{targetId:'deck-stairs'},queries).ok,true);
  state.stairs[0].bidirectional=false;assert.equal(previewInteraction(state,actor,{targetId:'deck-stairs'},queries).code,'WRONG_DIRECTION');
  state.stairs[0].bidirectional=true;actor.radiusM=.7;assert.equal(previewInteraction(state,actor,{targetId:'deck-stairs'},queries).code,'BODY_TOO_LARGE');
  actor.radiusM=.25;actor.heightM=2.1;assert.equal(previewInteraction(state,actor,{targetId:'deck-stairs'},queries).code,'BODY_TOO_LARGE');
});
test('new dynamic blockers pause stair progress without teleporting or spending progress',()=>{
  const {state,actor,world}=setup();actor.position.x=6;let blockers=[];
  const queries=createInteractionQueries(world,{actors:()=>blockers}),p=previewInteraction(state,actor,{targetId:'deck-stairs'},queries);
  const started=applyInteraction(state,actor,p.command,queries);
  blockers=[createInteractionActor({id:'other',position:{x:7,y:5,h:.64},floorId:'floor-0'})];
  const paused=advanceTraversal(started.state,started.actor,{seconds:1},queries);
  assert.equal(paused.code,'BLOCKED');assert.deepEqual(paused.actor,started.actor);assert.deepEqual(paused.state,started.state);
  blockers=[];assert.equal(advanceTraversal(started.state,started.actor,{seconds:1},queries).ok,true);
});
test('missing support, floor holes and an overhead slab reject rather than inferring traversal',()=>{
  const f=setup();f.actor.position={x:11,y:5,h:2.12};f.actor.floorId='floor-1';
  assert.equal(walkActor(f.state,f.actor,{direction:{x:-1,y:0},seconds:1},f.queries).code,'NO_SUPPORT');
  f.world.surfaces.push({id:'low-ceiling',floorId:'floor-0',role:'solid',bounds:{min:{x:7,y:4,h:1.8},max:{x:8,y:6,h:1.9}},supports:false,supportFloorId:null});
  f.actor.position={x:6,y:5,h:0};f.actor.floorId='floor-0';
  assert.equal(previewInteraction(f.state,f.actor,{targetId:'deck-stairs'},createInteractionQueries(f.world)).code,'BLOCKED');
});
test('a narrow floor gap cannot be crossed even if both endpoints are supported',()=>{
  const f=setup();f.world.surfaces=f.world.surfaces.filter(s=>s.id!=='ground');
  for(const [id,x1,x2] of [['a',0,2],['b',2.1,14]])f.world.surfaces.push({id,floorId:'floor-0',role:'floor',bounds:{min:{x:x1,y:0,h:0},max:{x:x2,y:10,h:0}},supports:true,supportFloorId:'floor-0'});
  f.actor.position={x:1,y:2,h:0};
  assert.equal(walkActor(f.state,f.actor,{direction:{x:1,y:0},seconds:1},createInteractionQueries(f.world)).code,'NO_SUPPORT');
});
test('invalid saves, changed routes, stale actor positions and nonfinite time reject atomically',()=>{
  const f=setup();f.actor.position.x=6;
  assert.throws(()=>openInteractionState({...f.state,unknown:true}));assert.throws(()=>openInteractionState({...f.state,version:2}));
  assert.equal(previewInteraction(f.state,f.actor,{targetId:'deck-stairs'},{...f.queries,worldId:'elsewhere'}).code,'MISSING_BINDING');
  const p=previewInteraction(f.state,f.actor,{targetId:'deck-stairs'},f.queries);f.actor.revision++;
  assert.equal(applyInteraction(f.state,f.actor,p.command,f.queries).code,'STALE_ACTION');f.actor.revision--;
  const started=applyInteraction(f.state,f.actor,p.command,f.queries),changed=structuredClone(started.state);changed.stairs[0].path[1].x=9.2;
  assert.equal(advanceTraversal(changed,started.actor,{seconds:.1},f.queries).code,'CHANGED_ROUTE');
  assert.equal(advanceTraversal(started.state,started.actor,{seconds:NaN},f.queries).ok,false);
  assert.equal(walkActor(f.state,f.actor,{direction:{x:1,y:0},seconds:1.01},f.queries).ok,false);
});
test('the reference host restores closed/open doors and a complete mid-stair save',()=>{
  let host=createStarterHost();assert.equal(host.interact('yard-gate').ok,true);
  for(let i=0;i<6;i++)assert.equal(host.walk(1,0).ok,true);
  assert.equal(host.interact('deck-stairs').ok,true);host.advance(.75);
  const saved=host.save(),restored=createStarterHost(saved);assert.deepEqual(restored.actor,host.actor);assert.deepEqual(restored.state,host.state);
  assert.equal(restored.state.doors[0].open,true);assert.equal(host.save(),saved);
});
test('revision exhaustion returns unchanged state and all successful movement carries expected revisions',()=>{
 const f=setup();f.actor.revision=1e9;const p=previewInteraction(f.state,f.actor,{targetId:'yard-gate'},f.queries),result=applyInteraction(f.state,f.actor,p.command,f.queries);
 assert.equal(result.code,'REVISION_LIMIT');assert.deepEqual(result.state,f.state);assert.deepEqual(result.actor,f.actor);assert.deepEqual(result.events,[]);
 f.actor.revision=0;const moved=walkActor(f.state,f.actor,{direction:{x:-1,y:0},seconds:.1},f.queries);assert.deepEqual(moved.expected,{worldRevision:0,actorRevision:0});
 const bad=applyInteraction(f.state,f.actor,{...p.command,actorRevision:0,kind:undefined},f.queries);assert.equal(bad.ok,false);assert.deepEqual(bad.state,f.state);
});
