import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,validateMap,parseMap} from '@nautilus-engine/map-core';
import {placeBuilding,generateBuildingLayout,buildingLot,prefabErrors} from '@nautilus-engine/map-core/prefabs';

const placement={asset:'archer-worker',x:40,y:40,turns:0,clearance:1};
const generation={seed:'public roof audit',count:2,assets:[placement.asset],area:{x:24,y:24,width:72,depth:72},clearance:1};
const roof=(changes={})=>({id:'roof-audit',x:35,y:35,width:30,depth:30,z:1,style:'gable',axis:'x',pitch:30,overhang:.5,material:'slate',seed:7,...changes});
const withRoof=(spec=roof())=>({...blankMap('Public prefab roof audit'),slopedRoofs:{version:1,roofs:[spec]}});
const valid=map=>assert.deepEqual(validateMap(map),[]);

test('public prefab placement rejects existing roofs before changing the input',()=>{
  const map=withRoof(),before=structuredClone(map);valid(map);
  assert.throws(()=>placeBuilding(map,placement),/roof.*(lot|clearance)/i);
  assert.deepEqual(map,before);

  // A conflict supplied by an external caller must also reject on later edits.
  const conflict=placeBuilding(blankMap(),placement).map;
  conflict.slopedRoofs=structuredClone(map.slopedRoofs);
  const snapshot=structuredClone(conflict);
  assert.ok(prefabErrors(conflict).some(error=>/roof/i.test(error)));
  assert.throws(()=>placeBuilding(conflict,{...placement,x:120,y:120}),/roof/i);
  assert.throws(()=>generateBuildingLayout(conflict,generation),/roof/i);
  assert.deepEqual(conflict,snapshot);
});

test('all orientations reserve fractional roof overhangs against access clearance on every layer',()=>{
  for(const turns of [0,1,2,3])for(const z of [1,2])for(const style of ['gable','hip','shed']){
    const instance={...placement,turns,clearance:2},lot=buildingLot(instance,instance.clearance);
    // Only the final quarter metre of the overhang enters the clearance ring.
    const spec=roof({x:lot.x+lot.width+1.75,y:lot.y+2,width:1,depth:1,overhang:2,z,style});
    const map=withRoof(spec),before=structuredClone(map);valid(map);
    assert.throws(()=>placeBuilding(map,instance),/roof.*(lot|clearance)/i);
    assert.deepEqual(map,before);
    const withoutOverhang=placeBuilding(withRoof({...spec,overhang:0}),instance).map;valid(withoutOverhang);
    const touching=placeBuilding(withRoof({...spec,x:lot.x+lot.width+2}),instance).map;valid(touching);
  }
});

test('public prefab operations validate malformed roof envelopes with and without existing prefabs',()=>{
  const existing=placeBuilding(blankMap(),{...placement,x:120,y:120}).map;
  const malformed=[undefined,null,[],{version:2,roofs:[]},{version:1,roofs:{}},{version:1,roofs:[],future:true},
    {version:1,roofs:[roof({overhang:2.1})]},{version:1,roofs:[roof({width:NaN})]},
    {version:1,roofs:[roof(),roof()]},{version:1,roofs:[],metadata:{value:Infinity}}];
  for(const base of [blankMap(),existing])for(const slopedRoofs of malformed){
    const map={...structuredClone(base),slopedRoofs},before=structuredClone(map);
    assert.throws(()=>placeBuilding(map,placement),/roof/i);
    assert.throws(()=>generateBuildingLayout(map,generation),/roof/i);
    assert.deepEqual(map,before);
  }
});

test('seeded generation skips a roof-covered first lot and returns a valid deterministic alternative',()=>{
  const first=generateBuildingLayout(blankMap(),generation).instances[0],lot=buildingLot(first,generation.clearance);
  const map=withRoof(roof({...lot,overhang:0}));
  map.slopedRoofs.metadata={reference:['preserve']};map.slopedRoofs.roofs[0].metadata={finish:['fixed']};
  const before=structuredClone(map);valid(map);
  const result=generateBuildingLayout(map,generation);valid(result.map);
  assert.equal(result.instances.length,generation.count);assert.notDeepEqual(result.instances[0],first);
  assert.deepEqual(generateBuildingLayout(map,generation),result);
  assert.deepEqual(result.map.slopedRoofs,map.slopedRoofs);
  assert.deepEqual(parseMap(JSON.stringify(result.map)).slopedRoofs,map.slopedRoofs);
  assert.deepEqual(map,before);
  result.map.slopedRoofs.metadata.reference.push('output only');
  result.map.slopedRoofs.roofs[0].metadata.finish.push('output only');
  assert.deepEqual(map,before);
});

test('insufficient roof-free seeded slots reject atomically after finding partial candidates',()=>{
  const options={...generation,count:16},unblocked=generateBuildingLayout(blankMap(),options);
  assert.equal(unblocked.instances.length,16);
  const lot=buildingLot(unblocked.instances[0],options.clearance);
  const map=withRoof(roof({...lot,overhang:0})),before=structuredClone(map);valid(map);
  assert.throws(()=>generateBuildingLayout(map,options),/Only 15 of 16 buildings fit.*map was not changed/i);
  assert.deepEqual(map,before);assert.equal(Object.hasOwn(map,'buildingPrefabs'),false);
  const covered=withRoof(roof({...generation.area,overhang:0})),snapshot=structuredClone(covered);valid(covered);
  assert.throws(()=>generateBuildingLayout(covered,generation),/Only 0 of 2 buildings fit/i);
  assert.deepEqual(covered,snapshot);
});

test('roof-free seeds retain their original instances and distant or empty roof envelopes do not change draws',()=>{
  const expected=[
    {id:'building-1',asset:'archer-worker',turns:3,clearance:1,x:44,y:29},
    {id:'building-2',asset:'archer-worker',turns:3,clearance:1,x:61,y:46}
  ];
  const result=generateBuildingLayout(blankMap(),generation);assert.deepEqual(result.instances,expected);valid(result.map);
  const distant=withRoof(roof({x:150,y:150}));
  assert.deepEqual(generateBuildingLayout(distant,generation).instances,expected);
  distant.slopedRoofs={version:1,roofs:[],metadata:{empty:true}};
  const empty=generateBuildingLayout(distant,generation);
  assert.deepEqual(empty.instances,expected);assert.deepEqual(empty.map.slopedRoofs,distant.slopedRoofs);valid(empty.map);
});
