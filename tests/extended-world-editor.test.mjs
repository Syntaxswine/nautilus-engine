import test from 'node:test';
import assert from 'node:assert/strict';
import {createExtendedWorldDocument} from '../apps/editor/extended-world-document.js';
import {createFloorNavigation} from '../packages/floor-navigation/index.js';
import {makeFifteenStoryWorld} from '../tools/fixtures/fifteen-story.mjs';

const box=(id='editor:wall',floorId='floor:10',h=21.2)=>({type:'put-surface',surface:{id,floorId,role:'solid',
  bounds:{min:{x:13,y:7,h},max:{x:14,y:7.16,h:h+2}},supports:false,supportFloorId:null}});

test('high-floor preview is uncommitted, cancelled on real navigation, and cannot apply late',()=>{
  const document=createExtendedWorldDocument(makeFifteenStoryWorld()),original=document.export();
  const navigation=createFloorNavigation({floors:document.snapshot().floors,selectedId:'floor:9',cancelPreview:()=>{document.cancelPreview();}});
  const preview=document.preview(box('editor:wall','floor:9',19.08));assert.equal(preview.ok,true);
  assert.equal(document.export(),original);assert.equal(document.history.undo,0);
  assert.equal(document.queries.traceSegment({from:{x:13.5,y:6,h:20},to:{x:13.5,y:8,h:20}}),null);
  assert.equal(navigation.step(1),true);assert.equal(navigation.state.selectedId,'floor:10');
  assert.equal(document.commitPreview(preview.token).code,'STALE_PREVIEW');
  assert.equal(document.export(),original);assert.equal(document.history.undo,0);
  const next=document.preview(box());assert.equal(document.commitPreview(next.token).ok,true);
  const edited=document.export();assert.notEqual(edited,original);
  assert.equal(document.queries.traceSegment({from:{x:13.5,y:6,h:22},to:{x:13.5,y:8,h:22}}).surfaceId,'editor:wall');
  navigation.select('floor:2'); // Cutaway selection must not prune hidden geometry.
  assert.equal(document.queries.traceSegment({from:{x:13.5,y:6,h:22},to:{x:13.5,y:8,h:22}}).anchorFloorId,'floor:10');
  assert.equal(document.undo(),true);assert.equal(document.export(),original);
  assert.equal(document.redo(),true);assert.equal(document.export(),edited);
  assert.equal(createExtendedWorldDocument(edited).export(),edited);
  navigation.dispose();
});

test('invalid bounds, dangling landings, legacy import and malformed import preserve document and redo',()=>{
  const document=createExtendedWorldDocument(makeFifteenStoryWorld()),original=document.export();
  document.apply(box());document.undo();const before=document.history;
  const bad=box();bad.surface.bounds.max.x=100;
  assert.equal(document.apply(bad).ok,false);
  assert.equal(document.apply({type:'remove-surface',id:'tower:slab:10:east'}).code,'INVALID_LANDING');
  for(const input of ['{',{version:2,name:'Legacy',levels:16},{...document.snapshot(),alienField:true}])assert.equal(document.replace(input).ok,false);
  assert.equal(document.export(),original);assert.deepEqual(document.history,before);
  assert.equal(document.redo(),true);assert.ok(document.snapshot().surfaces.some(surface=>surface.id==='editor:wall'));
});

test('editing a static door pose changes high-floor contact and roundtrips through history',()=>{
  const document=createExtendedWorldDocument(makeFifteenStoryWorld()),before=document.export();
  const segment={from:{x:8,y:10.5,h:22},to:{x:14,y:10.5,h:22}};
  assert.equal(document.queries.traceSegment(segment).surfaceId,'tower:door:10');
  const door=document.snapshot().surfaces.find(surface=>surface.id==='tower:door:10');
  door.bounds={min:{x:10,y:9.94,h:21.2},max:{x:11,y:10.06,h:22.85}};
  const preview=document.preview({type:'put-surface',surface:door});assert.equal(preview.ok,true);
  assert.equal(document.queries.traceSegment(segment).surfaceId,'tower:door:10');
  assert.equal(document.commitPreview(preview.token).ok,true);
  assert.equal(document.queries.traceSegment(segment).surfaceId,'tower:actor:10:body');
  const reloaded=createExtendedWorldDocument(document.export());assert.equal(reloaded.queries.traceSegment(segment).surfaceId,'tower:actor:10:body');
  document.undo();assert.equal(document.export(),before);
  document.redo();assert.equal(document.export(),reloaded.export());
});

test('legacy map and block export explicitly refuse tall geometry without truncation',()=>{
  const document=createExtendedWorldDocument(makeFifteenStoryWorld()),before=document.export();
  for(const target of ['aft-map-v2','aft-block-v1']) {
    const report=document.legacyReport(target);assert.equal(report.ok,false);assert.equal(report.legacy,null);
    assert.equal(report.diagnostics.filter(item=>item.code==='UNREPRESENTABLE_FLOOR').length,11);
    assert.ok(report.diagnostics.some(item=>item.path==='/floors/10'));
  }
  assert.equal(document.export(),before);assert.equal(document.history.undo,0);
});

test('history obeys its memory budget, rejects stale tickets and never shares snapshot mutations',()=>{
  const source=makeFifteenStoryWorld(),size=Buffer.byteLength(JSON.stringify(source));
  const document=createExtendedWorldDocument(source,{maxHistoryEntries:2,maxHistoryBytes:size*3});
  const first=document.preview(box('first')),second=document.preview(box('second'));
  assert.equal(document.commitPreview(first.token).code,'STALE_PREVIEW');assert.equal(document.commitPreview(second.token).ok,true);
  document.apply(box('third'));document.apply(box('fourth'));
  assert.equal(document.history.undo,2);assert.ok(document.history.bytes<=document.history.maxHistoryBytes);
  const snapshot=document.snapshot();snapshot.floors[10].id='changed';source.floors[10].elevationM=999;
  assert.equal(document.queries.getFloor('floor:10').elevationM,21.2);
  assert.equal(document.undo(),true);assert.equal(document.undo(),true);assert.equal(document.undo(),false);
  assert.equal(document.redo(),true);
  assert.equal(document.preview({type:'unknown'}).ok,false);assert.equal(document.previewState,null);
  const smallBudget=createExtendedWorldDocument(makeFifteenStoryWorld(),{maxHistoryBytes:1});
  assert.equal(smallBudget.apply(box()).ok,true);assert.equal(smallBudget.history.bytes,0);assert.equal(smallBudget.undo(),false);
});
