import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapDocument, createBlockDocument, openDocument, validateMap, extractBlock, placeBlock, rotateSceneryBlock, generateConnectedMap, wallRunsOf, wallRunErrors, measureWallRun, wallPanels, snapWallPoint, wallRunsIntersect, wallRunsBlockStep, neighbors, assertMapCapabilities, requiredMapFeatures, WALL_RUN_FEATURE, WALL_KIT} from '../packages/map-core/index.js';
import {angledBayExample} from '../packages/map-core/wall-example.js';
import {generateConnectedMap as legacyGenerate} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-generator.js';
import {applyData, openBlock} from '../packages/map-core/blocks.js';
import {EditingDocument as LegacyDocument} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-controller.js';
import {towerSlots, towerPost, towerEntry} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/tower-geometry.js';

const command = (a=[7.5,7.5],b=[10.5,10.5],options={}) => ({tool:'wall-run',start:{x:a[0],y:a[1],z:0},end:{x:b[0],y:b[1],z:0},options:{exact:true,...options}});
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('diagonal geometry retains native panels, physical trim and five story spacing',()=>{
  const document=createMapDocument(),before=document.export(),result=document.preview(command(undefined,undefined,{stories:5}));
  assert.equal(result.ok,true);assert.equal(document.export(),before);assert.equal(document.editor.undo.length,0);
  near(result.measurement.length,Math.sqrt(18));near(result.measurement.angle,45);
  const panels=wallPanels(result.wallRun);assert.equal(panels.length,25);
  for(let story=0;story<5;story++){
    const row=panels.filter(p=>p.z===story);assert.equal(row.length,5);near(row.reduce((n,p)=>n+p.size[0],0),Math.sqrt(18));
    row.forEach(p=>{assert.equal(p.size[1],2);assert.equal(p.size[2],.16);near(p.center[1],1+story*2.12);near(p.center[0],p.center[2]);near(p.yaw,-Math.PI/4);});
    row.slice(0,4).forEach(p=>assert.equal(p.size[0],1));near(row[4].size[0],Math.sqrt(18)-4);
  }
  assert.deepEqual(WALL_KIT,{panel:1,height:2,thickness:.16,floorSpacing:2.12,maxStories:5});
});
test('wall edits, ordinary edits, undo and redo preserve block geometry and extension metadata',()=>{
  const document=createBlockDocument(),before=document.export();assert.equal(document.apply(command()).ok,true);
  document.editor.map.wallRuns.artistNotes={reference:'generic tracing fixture'};document.refresh();const added=document.export();
  assert.equal(document.apply({tool:'floor',start:{x:8,y:9,z:0}}).ok,true);const painted=document.export();
  assert.equal(document.undo(),true);assert.equal(document.export(),added);assert.equal(document.redo(),true);assert.equal(document.export(),painted);
  assert.deepEqual(JSON.parse(openDocument(painted).export()),JSON.parse(painted));
  assert.equal(JSON.parse(painted).version,1);assert.equal(document.undo(),true);assert.equal(document.undo(),true);assert.equal(document.export(),before);
});
test('grid, 45-degree, 15-degree, free and endpoint snapping are explicit',()=>{
  const start={x:1.5,y:2.5,z:0};
  assert.deepEqual(snapWallPoint({x:4.42,y:5.31,z:0},{start}),{x:4.5,y:5.5,z:0,snapped:'angle'});
  const fine=snapWallPoint({x:8,y:5,z:0},{start,angleStep:15,step:0});assert.ok(Math.abs(measureWallRun({a:[1.5,2.5],b:[fine.x,fine.y]}).angle-15)<1e-4); // endpoints retain six decimal places
  assert.deepEqual(snapWallPoint({x:4.42,y:5.31,z:0},{step:0,angleStep:0}),{x:4.42,y:5.31,z:0,snapped:'free'});
  const joined=snapWallPoint({x:8.58,y:3.31,z:0},{start,anchors:[[8.6,3.3]]});assert.equal(joined.snapped,'endpoint');assert.deepEqual([joined.x,joined.y],[8.6,3.3]);
  assert.throws(()=>snapWallPoint({x:Infinity,y:1}));assert.throws(()=>snapWallPoint({x:1,y:1},{step:-1}));
});
test('a drawn run, selection, exact edit, rotation and deletion share transactional history',()=>{
  const document=createMapDocument(),drawn=document.apply({...command([6.5,6.5],[9.7,9.6]),options:{step:.5,angleStep:45}});
  assert.equal(drawn.ok,true);assert.deepEqual(drawn.wallRun.b,[9.5,9.5]);
  const selection=document.inspect(8,8,0);assert.equal(selection.type,'wall-run');assert.equal(document.rotate(selection).ok,true);
  const rotated=document.export();near(measureWallRun(wallRunsOf(document.map)[0]).length,Math.sqrt(18));
  assert.equal(document.apply({tool:'erase-wall-run',options:{id:drawn.wallRun.id}}).ok,true);assert.equal(wallRunsOf(document.map).length,0);
  document.undo();assert.equal(document.export(),rotated);document.undo();assert.deepEqual(wallRunsOf(document.map)[0].b,[9.5,9.5]);
  const id=drawn.wallRun.id;assert.equal(document.apply(command([6.5,6.5],[9,10],{id,material:'brick',stories:3})).ok,true);assert.equal(wallRunsOf(document.map).length,1);assert.equal(wallRunsOf(document.map)[0].id,id);
});
test('malformed and overlapping runs fail without changing the document or history',()=>{
  const document=createMapDocument();document.apply(command());const before=document.export(),history=document.editor.undo.length;
  for(const bad of [command([1,1],[NaN,2]),command([-.6,1],[2,2]),command([2,2],[2,2]),command([2,2],[3,3],{stories:6}),command([2,2],[3,3],{stories:1.5}),command([2,2],[3,3],{material:'unknown'}),command(),command([8,8],[9,9])]){
    assert.equal(document.apply(bad).ok,false);assert.equal(document.export(),before);assert.equal(document.editor.undo.length,history);
  }
  const input=JSON.parse(before);input.wallRuns.version=2;assert.throws(()=>openDocument(input),/version 1/);
  input.wallRuns.version=1;input.wallRuns.segments.push(structuredClone(input.wallRuns.segments[0]));assert.throws(()=>openDocument(input),/unique/);
  assert.equal(wallRunErrors({wallRuns:null}).length,1);assert.equal(document.export(),before);
});
test('block placement, capture, replacement and four rotations keep oriented endpoints',()=>{
  const block=angledBayExample(),before=JSON.stringify(block),map=createMapDocument();map.place(block,2,3);
  const run=wallRunsOf(map.map)[1];assert.deepEqual(run.a,[63.5,79.5]);assert.deepEqual(run.b,[65.5,81.5]);
  const captured=map.capture(2,3);assert.deepEqual(captured.wallRuns.segments.map(r=>[r.a,r.b]),block.wallRuns.segments.map(r=>[r.a,r.b]));
  let rotated=block;for(let i=0;i<4;i++)rotated=rotateSceneryBlock(rotated);assert.deepEqual(rotated,block);
  const first=rotateSceneryBlock(block);assert.deepEqual(first.wallRuns.segments[1].a,[15.5,15.5]);assert.deepEqual(first.wallRuns.segments[1].b,[13.5,17.5]);
  map.place(JSON.parse(createBlockDocument().export()),2,3);assert.equal(wallRunsOf(map.map).length,0);map.undo();assert.equal(wallRunsOf(map.map).length,6);assert.equal(JSON.stringify(block),before);
});
test('capture and replacement reject a wall crossing a block even when both ends are outside',()=>{
  const map=createMapDocument();assert.equal(map.apply(command([20,30],[55,30])).ok,true);
  const before=map.export();assert.throws(()=>map.capture(1,1),/crosses this block boundary/);assert.throws(()=>map.place(angledBayExample(),1,1),/crosses this block boundary/);assert.equal(map.export(),before);
});
test('world-space collision follows the rotated wall, story height and real floor gaps',()=>{
  const document=createMapDocument();document.apply(command([7.5,7.5],[10.5,10.5],{stories:2}));const map=document.map;
  assert.equal(wallRunsIntersect(map,{x:8,y:9,h:1},{x:9,y:8,h:1}),true);
  assert.equal(wallRunsIntersect(map,{x:7.6,y:10,h:1},{x:7.8,y:10,h:1}),false);
  assert.equal(wallRunsIntersect(map,{x:8,y:9,h:3},{x:9,y:8,h:3}),true);
  assert.equal(wallRunsIntersect(map,{x:8,y:9,h:2.06},{x:9,y:8,h:2.06}),false);
  assert.equal(wallRunsIntersect(map,{x:8,y:9,h:4.2},{x:9,y:8,h:4.2}),false);
  assert.equal(wallRunsBlockStep(map,{x:8,y:9,z:0},{x:9,y:8,z:0}),true);
  assert.ok(!neighbors(map,{x:8,y:9,z:0}).some(p=>p.x===9&&p.y===8));
  assert.throws(()=>wallRunsIntersect(map,{x:0,y:0,h:0},{x:1,y:1,h:NaN}),/finite/);
});
test('validation notices a newly enclosed squad start and can validate disconnected authoring',()=>{
  const document=createMapDocument();const p=document.map.starts[0],x=p.x,y=p.y;
  for(const [a,b]of [[[x-.5,y-.5],[x+.5,y-.5]],[[x+.5,y-.5],[x+.5,y+.5]],[[x+.5,y+.5],[x-.5,y+.5]],[[x-.5,y+.5],[x-.5,y-.5]]]) assert.equal(document.apply(command(a,b)).ok,true);
  assert.deepEqual(validateMap(document.map,{connectivity:false}),[]);assert.ok(document.validate().some(e=>e.includes('behind wall runs')));
});
test('game handoff explicitly requires oriented geometry capability while old maps remain supported',()=>{
  const document=createMapDocument();assert.deepEqual(requiredMapFeatures(document.map),[]);assert.doesNotThrow(()=>assertMapCapabilities(document.map));
  document.apply(command());assert.deepEqual(requiredMapFeatures(document.map),[WALL_RUN_FEATURE]);assert.throws(()=>assertMapCapabilities(document.map),/does not support/);
  assert.doesNotThrow(()=>assertMapCapabilities(document.map,[WALL_RUN_FEATURE]));
});
test('generation keeps shifted runs and unique IDs, matches legacy output without the feature, and rejects unsupported seams',()=>{
  const block=JSON.parse(createBlockDocument('Open').export());block.connections={north:'none',east:'none',south:'none',west:'none'};
  assert.deepEqual(generateConnectedMap([block],54),legacyGenerate([block],54));
  const bay=angledBayExample();bay.connections=structuredClone(block.connections);const before=JSON.stringify(bay),first=generateConnectedMap([bay],27),second=generateConnectedMap([bay],27);
  assert.deepEqual(first,second);assert.equal(JSON.stringify(bay),before);assert.equal(wallRunsOf(first).length,600);assert.equal(new Set(wallRunsOf(first).map(r=>r.id)).size,600);
  assert.deepEqual(extractBlock(first,9,9).wallRuns.segments.map(r=>[r.a,r.b]),bay.wallRuns.segments.map(r=>[r.a,r.b]));assert.deepEqual(validateMap(first),[]);
  const seam=structuredClone(bay);seam.wallRuns.segments[0].a=[-.5,7.5];assert.throws(()=>generateConnectedMap([seam],7),/seams are not supported/);
});

test('unsupported wall extensions fail closed at query and capability boundaries, including empty versions',()=>{
  const map=createMapDocument().map;
  for(const wallRuns of [{version:2,segments:[]},{version:2,segments:[{}]},{version:1},null]){
    const input={...map,wallRuns};
    assert.throws(()=>requiredMapFeatures(input),/version 1/);
    assert.throws(()=>assertMapCapabilities(input,[WALL_RUN_FEATURE]),/version 1/);
    assert.throws(()=>wallRunsIntersect(input,{x:1,y:1,h:1},{x:2,y:2,h:1}),/version 1/);
  }
  const sparse=[,8];
  assert.ok(wallRunErrors({...map,wallRuns:{version:1,segments:[{id:'sparse',a:sparse,b:[9,9],z:0,stories:1,material:'wood'}]}}).length);
});

test('snap settings and anchors are checked even when a nearby endpoint wins',()=>{
  const point={x:8.58,y:3.31,z:0},anchors=[[8.6,3.3]];
  for(const options of [{step:-1},{angleStep:10},{endpointRadius:NaN},{endpointRadius:-1},{start:{x:NaN,y:2}},{anchors:[[8.6]]}])
    assert.throws(()=>snapWallPoint(point,{anchors,...options}),/snap|finite|endpoint/);
});

test('block transforms copy nested extension and run metadata without aliasing the source',()=>{
  const document=createBlockDocument();assert.equal(document.apply(command()).ok,true);
  const block=JSON.parse(document.export());
  block.wallRuns.artistNotes={references:['pinned practice fixture']};block.wallRuns.segments[0].source={anchors:['bay-a']};
  const original=structuredClone(block),map=createMapDocument().map;
  for(const result of [openBlock(block),rotateSceneryBlock(block),placeBlock(map,block,2,3)]){
    assert.deepEqual(result.wallRuns.artistNotes,original.wallRuns.artistNotes);
    result.wallRuns.artistNotes.references.push('caller mutation');result.wallRuns.segments[0].source.anchors.push('caller mutation');
    assert.deepEqual(block,original);
  }
  const placed=placeBlock(map,block,2,3),captured=extractBlock(placed,2,3),placedBefore=structuredClone(placed);
  captured.wallRuns.artistNotes.references.push('capture mutation');captured.wallRuns.segments[0].source.anchors.push('capture mutation');
  assert.deepEqual(placed,placedBefore);
});

test('free-angle coordinates and metadata survive four quarter turns',()=>{
  const document=createBlockDocument();assert.equal(document.apply(command([7.123456,8.234567],[10.345678,9.456789])).ok,true);
  const block=JSON.parse(document.export());block.wallRuns.segments[0].artist={label:'free outline'};
  let rotated=block;for(let i=0;i<4;i++)rotated=rotateSceneryBlock(rotated);
  assert.deepEqual(rotated,block);
});

test('direct placement rejects a wall through a squad start and keeps its input unchanged',()=>{
  const document=createBlockDocument();assert.equal(document.apply(command([2.5,4],[3.5,4])).ok,true);
  const map=createMapDocument().map,before=structuredClone(map);
  assert.throws(()=>placeBlock(map,JSON.parse(document.export()),0,0),/wall intersects/i);
  assert.deepEqual(map,before);
});

test('upper stair landings and authored patrol points reject walls before history changes',()=>{
  const document=createMapDocument();assert.equal(document.apply({tool:'stairs',start:{x:20,y:20,z:0}}).ok,true);
  const map=structuredClone(document.map);map.guards.push({x:30,y:30,z:0,species:'cow',weapon:'pistol',patrol:[{x:31,y:30,z:0,waitSeconds:0}]});document.replace(map);
  document.undo();document.redo();const before=document.export(),history=document.editor.undo.length,revision=document.revision;
  for(const bad of [{...command([19.5,20],[20.5,20]),start:{x:19.5,y:20,z:1}},command([30.5,30],[31.5,30])]){
    assert.equal(document.apply(bad).ok,false);assert.equal(document.export(),before);assert.equal(document.editor.undo.length,history);assert.equal(document.revision,revision);
  }
});

test('block remapping keeps maximum-length IDs valid and deterministic',()=>{
  const document=createBlockDocument();assert.equal(document.apply(command()).ok,true);
  const block=JSON.parse(document.export());block.wallRuns.segments[0].id='a'.repeat(96);
  const map=createMapDocument().map,first=placeBlock(map,block,9,9),second=placeBlock(map,block,9,9);
  assert.deepEqual(wallRunErrors(first),[]);assert.deepEqual(first,second);assert.ok(first.wallRuns.segments[0].id.length<=96);
});

test('in-place assembly rejects wall overflow and bad offsets before mutating terrain or resources',()=>{
  const document=createBlockDocument();assert.equal(document.apply(command()).ok,true);
  const block=JSON.parse(document.export()),map=createMapDocument().map;
  map.wallRuns={version:1,segments:Array.from({length:4096},(_,i)=>({id:'old-'+i,a:[120.5,120.5],b:[121.5,120.5],z:0,stories:1,material:'wood'}))};
  const before=structuredClone(map);assert.throws(()=>applyData(map,block,24,24,true),/4096/);assert.deepEqual(map,before);
  const empty=createMapDocument().map,emptyBefore=structuredClone(empty);
  for(const [x,y]of [[240,0],[-24,0],[.5,0],[0,Infinity]]){assert.throws(()=>applyData(empty,block,x,y,true),/offset|footprint|sector/);assert.deepEqual(empty,emptyBefore);}
});

test('conflicting extension metadata is rejected instead of silently discarded',()=>{
  const document=createBlockDocument();assert.equal(document.apply(command()).ok,true);const block=JSON.parse(document.export());
  block.wallRuns.artistNotes={reference:'block-b'};
  const map=createMapDocument();assert.equal(map.apply(command([70.5,70.5],[71.5,71.5])).ok,true);map.editor.map.wallRuns.artistNotes={reference:'map-a'};map.refresh();
  const before=map.export(),history=map.editor.undo.length;
  assert.throws(()=>map.place(block,2,3),/metadata/i);assert.equal(map.export(),before);assert.equal(map.editor.undo.length,history);
});

test('nonzero radius is conservative slab padding and is not exact rounded actor clearance',()=>{
  const map={wallRuns:{version:1,segments:[{id:'edge',a:[8,8],b:[10,8],z:0,stories:1,material:'wood'}]}};
  const point={x:7.8,y:8.2,h:1};assert.equal(wallRunsIntersect(map,point,point),false);
  assert.ok(Math.hypot(8-point.x,point.y-(8+WALL_KIT.thickness/2))>.2);
  assert.equal(wallRunsIntersect(map,point,point,{radius:.2}),true);
});

test('legacy placeholder opening retains inherited authored data and character identity policy',()=>{
  const placeholder={kind:'sector-placeholder',version:1,id:'coder-open',config:{roads:[],feature:null},allowedTransforms:[{turns:0,mirror:false}]};
  const inherited=JSON.parse(new LegacyDocument().open(JSON.stringify(placeholder)).export()),opened=JSON.parse(openDocument(placeholder).export());
  // Opening the legacy recipe creates fresh character UUIDs on both paths.
  for(const map of [inherited,opened]){assert.equal(new Set(map.starts.map(p=>p.character.id)).size,4);map.starts.forEach(p=>delete p.character.id);}
  assert.deepEqual(opened,inherited);
  assert.throws(()=>openDocument({...placeholder,wallRuns:{version:1,segments:[]}}),/expanded/);
});

test('seeded no-run generation keeps inherited output bytes across multiblock seeds',()=>{
  const block=JSON.parse(createBlockDocument('A').export());block.connections={north:'none',east:'none',south:'none',west:'none'};
  const alternate=structuredClone(block);alternate.name='B';alternate.terrain[12][12]='floor';
  for(const seed of [0,7,54,4294967295])assert.equal(JSON.stringify(generateConnectedMap([block,alternate],seed)),JSON.stringify(legacyGenerate([block,alternate],seed)));
});

test('wall-aware authoring reachability preserves the inherited locked-door policy',()=>{
  const document=createMapDocument(),map=structuredClone(document.map),p=map.starts[0];
  map.edges[`e:${p.x-1}:${p.y}`]='wall';map.edges[`e:${p.x}:${p.y}`]='door-wood-closed';
  map.edges[`s:${p.x}:${p.y-1}`]='wall';map.edges[`s:${p.x}:${p.y}`]='wall';map.edgeLocks={[`e:${p.x}:${p.y}`]:70};
  document.replace(map);assert.deepEqual(document.validate(),[]);
  assert.equal(document.apply(command()).ok,true);assert.deepEqual(document.validate(),[]);
  assert.ok(!neighbors(document.map,p).some(q=>q.x===p.x+1&&q.y===p.y));
});

test('a tower lookout remains a reachability target through its inherited entry',()=>{
  const document=createMapDocument(),map=structuredClone(document.map),tower={kind:'wooden-spotlight-tower',x:20,y:20,z:0};
  const post=towerSlots(tower)[0],entry=towerEntry(tower);map.props.push(tower);map.guards.push({...post,species:'cow',weapon:'pistol',towerPost:towerPost(tower,post)});
  document.replace(map);assert.deepEqual(document.validate(),[]);
  // Three sides surround the open approach; the tower footprint closes the north.
  for(const [a,b]of [[[entry.x-.5,entry.y-.5],[entry.x-.5,entry.y+.5]],[[entry.x-.5,entry.y+.5],[entry.x+.5,entry.y+.5]],[[entry.x+.5,entry.y+.5],[entry.x+.5,entry.y-.5]]])assert.equal(document.apply(command(a,b)).ok,true);
  assert.ok(document.validate().some(e=>e.includes('behind wall runs')));
});

test('empty extension metadata survives the last deletion, saved reload and block rotation',()=>{
  const document=createBlockDocument();assert.equal(document.apply(command()).ok,true);
  const block=JSON.parse(document.export());block.wallRuns.artistNotes={reference:'retain after erasing'};document.open(JSON.stringify(block));
  assert.equal(document.apply({tool:'erase-wall-run',options:{id:block.wallRuns.segments[0].id}}).ok,true);
  const saved=JSON.parse(document.export());assert.deepEqual(saved.wallRuns,{version:1,segments:[],artistNotes:block.wallRuns.artistNotes});
  assert.deepEqual(JSON.parse(openDocument(saved).export()),saved);assert.deepEqual(rotateSceneryBlock(saved),saved);assert.deepEqual(requiredMapFeatures(saved),[]);
});

test('generation rejects a wall body reaching a seam when its endpoints are inset',()=>{
  const block=angledBayExample();block.connections={north:'none',east:'none',south:'none',west:'none'};
  for(const [a,b]of [[[23.45,7.5],[23.45,10.5]],[[-.45,7.5],[-.45,10.5]],[[7.5,23.45],[10.5,23.45]],[[7.5,-.45],[10.5,-.45]]]){
    const input=structuredClone(block);input.wallRuns.segments=[{...input.wallRuns.segments[0],a,b}];const before=structuredClone(input);
    assert.deepEqual(wallRunErrors(input),[]);assert.throws(()=>generateConnectedMap([input],7),/seams are not supported/);assert.deepEqual(input,before);
  }
});

test('aggregate native-panel overflow is rejected before assembly commits',()=>{
  const document=createBlockDocument();assert.equal(document.apply(command()).ok,true);const block=JSON.parse(document.export()),map=createMapDocument().map;
  map.levels=5;map.upper=[{},{},{},{}];map.wallRuns={version:1,segments:Array.from({length:1000},(_,i)=>({id:'panels-'+i,a:[120.5,120.5],b:[130.5,120.5],z:0,stories:5,material:'wood'}))};
  assert.deepEqual(wallRunErrors(map),[]);const before=structuredClone(map);
  assert.throws(()=>applyData(map,block,24,24,true),/50,000/);assert.deepEqual(map,before);
});

test('failed wall imports, replacements and boundary placements preserve redo and document flags',()=>{
  const document=createMapDocument();assert.equal(document.apply(command([20,30],[55,30])).ok,true);assert.equal(document.apply(command([70,70],[72,72])).ok,true);document.undo();
  const before=document.export(),undo=structuredClone(document.editor.undo),redo=structuredClone(document.editor.redo),revision=document.revision,changed=document.changed;
  const invalid=JSON.parse(before);invalid.wallRuns.version=2;
  for(const action of [()=>document.open(JSON.stringify(invalid)),()=>document.replace(invalid),()=>document.place(angledBayExample(),1,1)]){
    assert.throws(action);assert.equal(document.export(),before);assert.deepEqual(document.editor.undo,undo);assert.deepEqual(document.editor.redo,redo);assert.equal(document.revision,revision);assert.equal(document.changed,changed);
  }
  assert.equal(document.redo(),true);assert.equal(wallRunsOf(document.map).length,2);
});
