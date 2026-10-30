import test from 'node:test';
import assert from 'node:assert/strict';
import {starterFixture} from '../examples/game-starter-host.js';
import {createInteractionState,createInteractionActor,openInteractionState,openInteractionActor,createInteractionQueries,previewInteraction,applyInteraction,walkActor,advanceTraversal} from '../packages/interactions/index.js';

test('interaction loads reject accessors and hidden/non-JSON data before invoking or discarding them',()=>{
  for(const [name,open,value]of [['state',openInteractionState,starterFixture().state],['actor',openInteractionActor,starterFixture().actor]]){
    for(const attack of ['accessor','hidden','toJSON','class','undefined','sparse','symbol']){
      const input=structuredClone(value);let calls=0;
      if(attack==='accessor')Object.defineProperty(input,'revision',{enumerable:true,get(){calls++;return 0;}});
      if(attack==='hidden')Object.defineProperty(input,'unreviewed',{value:'must not disappear'});
      if(attack==='toJSON')Object.defineProperty(input,'toJSON',{get(){calls++;return ()=>{calls++;return value;};}});
      if(attack==='class')Object.setPrototypeOf(input,{unreviewed:true});
      if(attack==='undefined')input.unreviewed=undefined;
      if(attack==='sparse'){if(name==='state')input.doors=new Array(1);else input.position=Object.assign(new Array(3),{x:2.5,y:5,h:0});}
      if(attack==='symbol')input[Symbol('hidden')]='must not disappear';
      let error;try{open(input);}catch(cause){error=cause;}assert.equal(calls,0,name+' '+attack+' executed user code');assert.ok(error,name+' '+attack+' was silently accepted');assert.equal(error.code,'INVALID_DATA',name+' '+attack+' needs a data diagnostic');
    }
  }
});

test('interaction constructors validate raw options before destructuring or defaulting explicit undefined',()=>{
  for(const [create,options,key]of [[createInteractionState,{worldId:'world'},'worldId'],[createInteractionActor,{id:'actor',floorId:'floor-0',position:{x:1,y:1,h:0}},'id']]){
    let calls=0;const bad=structuredClone(options);Object.defineProperty(bad,key,{enumerable:true,get(){calls++;return options[key];}});let error;try{create(bad);}catch(cause){error=cause;}assert.equal(calls,0);assert.equal(error?.code,'INVALID_DATA');
    const omitted={...options,[key==='id'?'heightM':'doors']:undefined};assert.throws(()=>create(omitted),error=>error.code==='INVALID_DATA');
  }
});

test('raw action options/commands reject data accessors before destructuring and preserve state without events',()=>{
  const f=starterFixture(),queries=createInteractionQueries(f.world),command=previewInteraction(f.state,f.actor,{targetId:'yard-gate'},queries).command,before=structuredClone({state:f.state,actor:f.actor});
  for(const [run,options,key]of [
    [value=>previewInteraction(f.state,f.actor,value,queries),{targetId:'yard-gate'},'kind'],
    [value=>applyInteraction(f.state,f.actor,value,queries),command,'kind'],
    [value=>walkActor(f.state,f.actor,value,queries),{direction:{x:1,y:0},seconds:.1},'seconds'],
    [value=>advanceTraversal(f.state,f.actor,value,queries),{seconds:.1},'seconds']
  ]){let calls=0;const input=structuredClone(options);Object.defineProperty(input,key,{enumerable:true,get(){calls++;return key==='kind'?'open-door':.1;}});const result=run(input);assert.equal(result.code,'INVALID_DATA');assert.equal(calls,0);assert.deepEqual(result.events,[]);assert.deepEqual({state:f.state,actor:f.actor},before);}
  assert.throws(()=>openInteractionActor({...f.actor,id:'visitor\n'}),error=>error.code==='INVALID_DATA');
});

const solid=(id,bounds)=>({id,floorId:'floor-0',role:'solid',bounds,supports:false,supportFloorId:null});
function emptySwing(){const f=starterFixture();f.world.surfaces=f.world.surfaces.filter(surface=>surface.role!=='solid');return f;}
test('door readiness rejects static geometry in its open pose and in the swept clearance envelope',()=>{
  for(const [id,bounds]of [
    ['open-leaf-solid',{min:{x:5,y:4.15,h:.5},max:{x:5.3,y:4.24,h:1}}],
    ['sweep-only-solid',{min:{x:4.5,y:5,h:.5},max:{x:4.8,y:5.3,h:1}}]
  ]){const f=emptySwing();f.world.surfaces.push(solid(id,bounds));const queries=createInteractionQueries(f.world),before=structuredClone(f.state),result=previewInteraction(f.state,f.actor,{targetId:'yard-gate'},queries);assert.equal(result.ok,false,id);assert.equal(result.code,'DOOR_BLOCKED');assert.match(result.reason,new RegExp(id));assert.deepEqual(f.state,before);assert.throws(()=>queries.validateBindings(f.state),error=>error.code==='DOOR_BLOCKED');}
});

test('door operation rechecks other closed/open leaves and reserved clearances before commit',()=>{
  const f=emptySwing(),queries=createInteractionQueries(f.world),preview=previewInteraction(f.state,f.actor,{targetId:'yard-gate'},queries);assert.equal(preview.ok,true);
  for(const open of [false,true]){
    const other={...structuredClone(f.state.doors[0]),id:'other-door',position:{x:5,y:5,h:0},
      closedBounds:{min:{x:4.7,y:5,h:0},max:{x:4.8,y:5.5,h:2}},
      openBounds:{min:{x:4.7,y:4.7,h:0},max:{x:5.2,y:4.8,h:2}},
      motionBounds:{min:{x:4.7,y:4.7,h:0},max:{x:5.2,y:5.5,h:2}},open};
    f.state.doors.push(other);const result=applyInteraction(f.state,f.actor,preview.command,queries);assert.equal(result.ok,false);assert.equal(result.code,'DOOR_BLOCKED');assert.match(result.reason,/other-door/);assert.equal(result.state.doors[0].open,false);assert.deepEqual(result.events,[]);f.state.doors.pop();
  }
  const reserved={...structuredClone(f.state.doors[0]),id:'clearance-only',position:{x:5.8,y:5.8,h:0},closedBounds:{min:{x:5.8,y:5.6,h:0},max:{x:5.9,y:6,h:2}},openBounds:{min:{x:5.7,y:5.9,h:0},max:{x:6.2,y:6,h:2}},motionBounds:{min:{x:5.4,y:5.5,h:0},max:{x:6.2,y:6,h:2}}};f.state.doors.push(reserved);assert.equal(previewInteraction(f.state,f.actor,{targetId:'yard-gate'},queries).code,'DOOR_BLOCKED');
});

test('static surface face contact is allowed while an earlier intent rechecks a newly bound obstruction',()=>{
  const f=emptySwing();f.world.surfaces.push(solid('touching-jamb',{min:{x:5.6,y:4,h:0},max:{x:5.8,y:6,h:2}}));const queries=createInteractionQueries(f.world);queries.validateBindings(f.state);const preview=previewInteraction(f.state,f.actor,{targetId:'yard-gate'},queries);assert.equal(preview.ok,true);
  f.world.surfaces.push(solid('new-obstruction',{min:{x:4.7,y:5,h:.4},max:{x:5,y:5.2,h:1}}));const result=applyInteraction(f.state,f.actor,preview.command,createInteractionQueries(f.world));assert.equal(result.code,'DOOR_BLOCKED');assert.equal(result.state.doors[0].open,false);assert.deepEqual(result.events,[]);
});

test('native 1.65m lintel blocks the default 1.7m mover without shrinking either body or aperture',()=>{
  const f=emptySwing();f.state.doors[0].open=true;f.state.doors[0].openBounds=null;f.actor.position={x:3,y:5,h:0};
  f.state.doors[0].closedBounds.max.h=1.65;f.state.doors[0].motionBounds.max.h=1.65;
  f.world.surfaces.push(solid('native-lintel',{min:{x:3.9,y:4.2,h:1.65},max:{x:4.1,y:5.8,h:2}}));const before=structuredClone(f.actor),result=walkActor(f.state,f.actor,{direction:{x:1,y:0},seconds:1},createInteractionQueries(f.world));assert.equal(before.heightM,1.7);assert.equal(result.code,'BLOCKED');assert.match(result.reason,/native-lintel/);assert.deepEqual(result.actor,before);assert.equal(f.world.surfaces.at(-1).bounds.min.h,1.65);
});
