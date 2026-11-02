import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapDocument,createBlockDocument,openDocument,parseMap,blankMap,placeBuilding,removeBuilding,generateBuildingLayout,buildingLot,prefabErrors,requiredMapFeatures,assertMapCapabilities,PREFAB_FEATURE,WALL_RUN_FEATURE,rotateSceneryBlock,placeBlock} from '../packages/map-core/index.js';
import {PREFAB_CATALOGUE} from '../packages/prefab-core/catalogue.js';

const placement={asset:'albany-cottage',x:40,y:40,turns:0,clearance:2};
const command=(x=40,y=40)=>({tool:'building-prefab',start:{x,y,z:0},options:{asset:placement.asset,turns:0,clearance:2}});
const generation={seed:'boundary audit',count:1,assets:[placement.asset],area:{x:24,y:24,width:48,depth:48},clearance:2};
const envelope=(instances=[],extra={})=>({version:1,catalogue:PREFAB_CATALOGUE,instances,...extra});
const state=doc=>structuredClone({json:doc.export(),undo:doc.editor.undo,redo:doc.editor.redo,revision:doc.revision,changed:doc.changed});
const run=(a,b,z=0)=>({id:'audit-wall',a,b,z,stories:1,material:'wood',notes:{reference:'preserve'}});
function withWall(map,a,b,z=0){return {...structuredClone(map),wallRuns:{version:1,segments:[run(a,b,z)]}};}

test('block generation and replacement reject prefab data without hidden canvas state or history',()=>{
  const doc=createBlockDocument();doc.apply({tool:'floor',start:{x:8,y:8,z:0}});doc.undo();const before=state(doc);
  assert.equal(doc.apply({tool:'building-generate',options:generation}).ok,false);assert.deepEqual(state(doc),before);
  const candidate=placeBuilding(doc.editor.map,placement).map;
  assert.throws(()=>doc.replace(candidate),/prefab|block/i);assert.deepEqual(state(doc),before);
  for(const buildingPrefabs of [envelope(),{version:99,catalogue:PREFAB_CATALOGUE,instances:[]}]){
    assert.throws(()=>doc.replace({...doc.editor.map,buildingPrefabs}),/prefab|block/i);assert.deepEqual(state(doc),before);
  }
});

test('legacy migration and placeholder expansion reject prefab envelopes before losing data',()=>{
  const map=blankMap(),legacy={version:1,width:24,height:24,name:'Legacy',terrain:Array.from({length:24},()=>Array(24).fill('yard')),edges:{},starts:map.starts,guards:[],exits:map.exits};
  const recipe={kind:'sector-placeholder',version:1,id:'audit-recipe',config:{roads:[],feature:null},allowedTransforms:[{turns:0,mirror:false}]};
  for(const buildingPrefabs of [envelope([],{notes:{reference:'keep'}}),envelope([{id:'one',...placement,x:8,y:8}]),{version:99,catalogue:PREFAB_CATALOGUE,instances:[]}]){
    assert.throws(()=>parseMap(JSON.stringify({...legacy,buildingPrefabs})),/prefab|version|format/i);
    assert.throws(()=>openDocument({...recipe,buildingPrefabs}),/prefab|version|format/i);
  }
});

test('empty envelopes retain metadata, validate versions and require only features with geometry',()=>{
  const map=withWall(blankMap(),[7.5,7.5],[10.5,10.5]);map.buildingPrefabs=envelope([],{notes:{reference:'empty collection'}});
  assert.deepEqual(prefabErrors(map),[]);assert.deepEqual(requiredMapFeatures(map),[WALL_RUN_FEATURE]);
  assert.doesNotThrow(()=>assertMapCapabilities(map,[WALL_RUN_FEATURE]));assert.deepEqual(JSON.parse(openDocument(map).export()).buildingPrefabs,map.buildingPrefabs);
  for(const data of [null,{version:99,catalogue:PREFAB_CATALOGUE,instances:[]},envelope([],{catalogue:'moving-branch'}),{...envelope(),instances:{}}]){
    const invalid={...map,buildingPrefabs:data};assert.throws(()=>requiredMapFeatures(invalid));assert.throws(()=>assertMapCapabilities(invalid,[WALL_RUN_FEATURE,PREFAB_FEATURE]));
    assert.throws(()=>removeBuilding(invalid,'missing'));assert.throws(()=>placeBuilding(invalid,placement));assert.throws(()=>generateBuildingLayout(invalid,generation));
  }
});

test('portable building IDs are strings and rejected edits retain redo and document flags',()=>{
  const doc=createMapDocument();doc.apply(command());doc.apply(command(80,80));doc.undo();const before=state(doc);
  for(const id of [123,['valid'],{},null]){
    const map=structuredClone(doc.map);map.buildingPrefabs.instances[0].id=id;
    assert.ok(prefabErrors(map).length);assert.throws(()=>doc.open(JSON.stringify(map)));assert.deepEqual(state(doc),before);
  }
  const result=doc.apply({tool:'building-remove',start:{x:42,y:42,z:0},options:{id:'missing'}});
  assert.equal(result.ok,false);assert.deepEqual(state(doc),before);
  assert.equal(doc.redo(),true);assert.equal(doc.map.buildingPrefabs.instances.length,2);
});

test('nested envelope and instance metadata survive rotation, undo, deletion and saved reload',()=>{
  const doc=createMapDocument();doc.apply(command());const map=structuredClone(doc.map);
  map.buildingPrefabs.notes={references:['fixed source']};map.buildingPrefabs.instances[0].author={anchors:['entry']};doc.replace(map);
  const saved=doc.export(),selection=doc.inspect(42,42,0);assert.equal(doc.rotate(selection).ok,true);
  assert.deepEqual(doc.map.buildingPrefabs.notes,map.buildingPrefabs.notes);assert.deepEqual(doc.map.buildingPrefabs.instances[0].author,map.buildingPrefabs.instances[0].author);
  assert.equal(doc.undo(),true);assert.equal(doc.export(),saved);
  assert.equal(doc.apply({tool:'building-remove',options:{id:'building-1'}}).ok,true);
  assert.deepEqual(doc.map.buildingPrefabs,envelope([],{notes:map.buildingPrefabs.notes}));
  assert.deepEqual(openDocument(doc.export()).map.buildingPrefabs,doc.map.buildingPrefabs);assert.deepEqual(requiredMapFeatures(doc.map),[]);
  assert.equal(doc.undo(),true);assert.equal(doc.export(),saved);
  const future=structuredClone(map);future.buildingPrefabs.version=99;assert.throws(()=>removeBuilding(future,'building-1'));
  const added=placeBuilding(map,{...placement,x:80,y:80}).map;added.buildingPrefabs.notes.references.push('caller mutation');added.buildingPrefabs.instances[0].author.anchors.push('caller mutation');
  assert.deepEqual(map.buildingPrefabs.notes,{references:['fixed source']});assert.deepEqual(map.buildingPrefabs.instances[0].author,{anchors:['entry']});
});

test('distant and corner-separated oriented walls permit buildings without changing either source',()=>{
  const lot=buildingLot(placement,placement.clearance),left=lot.x-.5,bottom=lot.y-.5;
  for(const [a,b]of [[[180,180],[184,182]],[[left-5,bottom+2],[left+2,bottom-5]]]){
    const map=withWall(blankMap(),a,b),before=structuredClone(map),placed=placeBuilding(map,placement).map;
    assert.deepEqual(prefabErrors(placed),[]);assert.deepEqual(placed.wallRuns,map.wallRuns);assert.deepEqual(map,before);
    assert.deepEqual(requiredMapFeatures(placed),[WALL_RUN_FEATURE,PREFAB_FEATURE]);assert.doesNotThrow(()=>assertMapCapabilities(placed,[WALL_RUN_FEATURE,PREFAB_FEATURE]));
  }
});

test('full wall thickness, endpoint contact, clearance and upper stories reject overlapping lots',()=>{
  const lot=buildingLot(placement,placement.clearance),left=lot.x-.5,bottom=lot.y-.5,right=left+lot.width,top=bottom+lot.depth;
  for(const [a,b,z]of [
    [[left-.04,bottom+1],[left-.04,bottom+3],0],
    [[left-.08,bottom+1],[left-.08,bottom+3],0],
    [[left-4,(bottom+top)/2],[right+4,(bottom+top)/2],0],
    [[left,bottom-3],[left,bottom],0],
    [[left+.2,bottom+1],[left+.2,bottom+3],1]
  ]){
    const map=withWall(blankMap(),a,b,z),before=structuredClone(map);assert.throws(()=>placeBuilding(map,placement),/wall|clearance|lot/i);assert.deepEqual(map,before);
  }
  const separated=withWall(blankMap(),[left-.081,bottom+1],[left-.081,bottom+3]);assert.doesNotThrow(()=>placeBuilding(separated,placement));
});

test('ordinary wall edits respect existing building lots and rejected edits preserve complete history',()=>{
  const doc=createMapDocument();doc.apply(command());const lot=buildingLot(placement,placement.clearance),left=lot.x-.5,bottom=lot.y-.5;
  const wall=(a,b)=>({tool:'wall-run',start:{x:a[0],y:a[1],z:1},end:{x:b[0],y:b[1],z:1},options:{exact:true}});
  assert.equal(doc.apply(wall([180,180],[183,182])).ok,true);const saved=doc.export();doc.undo();const before=state(doc);
  assert.equal(doc.apply(wall([left-.04,bottom+1],[left-.04,bottom+3])).ok,false);assert.deepEqual(state(doc),before);
  assert.equal(doc.redo(),true);assert.equal(doc.export(),saved);assert.deepEqual(openDocument(saved).map.wallRuns,doc.map.wallRuns);
});

test('seeded generation coexists with distant walls and keeps metadata, inputs and replay stable',()=>{
  const map=withWall(blankMap(),[180,180],[183,182]);map.buildingPrefabs=envelope([],{notes:{reference:'generation provenance'}});const before=structuredClone(map);
  const a=generateBuildingLayout(map,generation),b=generateBuildingLayout(map,generation);
  assert.deepEqual(a,b);assert.deepEqual(map,before);assert.deepEqual(a.map.wallRuns,map.wallRuns);assert.deepEqual(a.map.buildingPrefabs.notes,map.buildingPrefabs.notes);
  assert.deepEqual(prefabErrors(a.map),[]);
});

test('legacy block capture, rotation and placement preserve walls while refusing every prefab envelope',()=>{
  const doc=createBlockDocument();assert.equal(doc.apply({tool:'wall-run',start:{x:7.5,y:7.5,z:0},end:{x:10.5,y:10.5,z:0},options:{exact:true}}).ok,true);
  const block=doc.capture(0,0);let rotated=block;for(let i=0;i<4;i++)rotated=rotateSceneryBlock(rotated);assert.deepEqual(rotated,block);
  const placed=placeBlock(blankMap(),block,4,4);assert.deepEqual(placed.wallRuns.segments[0].a,[103.5,103.5]);
  const invalid={...block,buildingPrefabs:envelope()};assert.throws(()=>rotateSceneryBlock(invalid));assert.throws(()=>placeBlock(placed,invalid,5,5));
});
