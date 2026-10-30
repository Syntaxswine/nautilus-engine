import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMapDocument,openDocument} from '../packages/map-core/index.js';
import {createPartAuthoringJournal} from '../apps/editor/part-authoring-journal.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./fixtures/editor-panes/'+name,import.meta.url),'utf8'));
const facts=read('catalogue-facts.json'),observed=read('observations.json'),fragment=read('legacy-authoring-fragment.json');

test('fixed pane intake distinguishes 39 presets from the separate resizable template',()=>{
  assert.equal(facts.presets.length,39);assert.equal(new Set(facts.presets.map(item=>item.id)).size,39);
  assert.equal(facts.presets.filter(item=>item.borderless).length,3);assert.equal(facts.presets.filter(item=>!item.borderless).length,36);
  assert.ok(!facts.presets.some(item=>item.id===facts.resizableTemplate.id));
  for(const item of facts.presets){assert.ok([1,2,3].includes(item.widthM));assert.equal(item.heightM,item.borderless?2.12:2);assert.equal(item.paneIds.length,item.grid[0]*item.grid[1]);}
  assert.equal(facts.inspectionRoots.length,8);assert.ok(facts.inspectionRoots.every(item=>item.sameAtReviewedWindowCommit&&/^[0-9a-f]{40}$/.test(item.gitBlob)&&/^[0-9a-f]{64}$/.test(item.sha256)));
});

test('metres and storeys stay distinct and one large borderless sheet has one pane',()=>{
  assert.deepEqual(observed.dimensions.metres,{width:20,height:5});assert.deepEqual(observed.dimensions.storeys,{width:20,height:10.6});
  assert.deepEqual(observed.sizedSheet,{widthM:20,heightM:10.6,paneIds:['r0c0'],solidCount:0});
  assert.deepEqual(observed.rotations.map(item=>item.rotation),[0,90,180,270]);
  for(const item of observed.rotations){assert.equal(item.coveredEdges.length,20);assert.equal(new Set(item.coveredEdges).size,20);assert.deepEqual(item.paneIds,['r0c0']);assert.equal(item.solids,0);}
  assert.equal(observed.joinComparison.paneIdsUnchanged,true);assert.ok(Math.abs(observed.joinComparison.joinedPostWidthM*2-observed.joinComparison.unjoinedPostWidthM)<1e-12);
  assert.ok(observed.rejections.every(item=>item.rejected));
});

test('frozen source damage observations retain instance isolation and never imply traversal',()=>{
  assert.equal(observed.damage.repeatedBreak,null);assert.equal(observed.damage.unbrokenOtherInstance,true);assert.equal(observed.damage.restoredEventsPresent,false);
  assert.deepEqual(observed.damage.glassByInstance,{'sheet-a':0,'sheet-b':1,divided:5});assert.equal(observed.damage.sequence,2);assert.equal(observed.damage.brokenSheetStillHasPassage,true);
});

test('actual authoring fragment survives existing opaque editor history and reopen without claiming pane support',()=>{
  const document=createMapDocument(fragment.name);document.replace({...document.map,edges:fragment.beforeEdges});
  const before=document.export(),candidate={...document.map,edges:fragment.afterEdges,farmyardWindows:fragment.extension};document.replace(candidate);const accepted=document.export();
  assert.equal(document.undo(),true);assert.equal(document.export(),before);assert.equal(document.redo(),true);assert.equal(document.export(),accepted);
  assert.deepEqual(openDocument(accepted).map.farmyardWindows,fragment.extension);assert.deepEqual(fragment.afterRemoveEdges,fragment.beforeEdges);
  const journal=createPartAuthoringJournal({initialText:before,contextKey:'pane-api-pending:test-only'}),ticket=journal.beginEdit(accepted),artifact=Object.freeze({testOnly:true});journal.accept(ticket,artifact);
  journal.accept(journal.beginUndo(),artifact);const state=journal.snapshot;
  const rejected=journal.beginEdit(accepted);journal.reject(rejected);assert.equal(journal.snapshot.text,state.text);assert.deepEqual(journal.snapshot.history,state.history);
  const late=journal.beginEdit(accepted);journal.setContext('different-pane-definition-context:test-only');assert.equal(journal.accept(late,artifact).ok,false);assert.equal(journal.snapshot.text,before);assert.equal(journal.snapshot.history.redo,1);
});

test('source door protection gap is recorded as an intake finding, not desired engine behavior',()=>{
  const byKind=Object.fromEntries(observed.doorObservations.filter(item=>item.locked!==false).map(item=>[item.kind,item]));
  assert.equal(byKind['door-wood-closed'].sourceAccepted,false);assert.equal(byKind['door-steel-closed'].sourceAccepted,false);
  assert.equal(byKind['jail-door-closed'].sourceAccepted,true);assert.equal(byKind['jail-door-closed'].hostAccepted,false);assert.equal(byKind['jail-door-closed'].hostUnchanged,true);
  assert.equal(observed.doorObservations.find(item=>item.locked===false).hostAccepted,true);
  assert.ok(observed.unimplementedInThisPreparation.includes('supported consumer export/refusal'));
});
