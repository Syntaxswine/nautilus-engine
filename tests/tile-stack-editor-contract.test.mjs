import test from 'node:test';
import assert from 'node:assert/strict';
import * as mapCore from '../packages/map-core/index.js';
import {floorWindow} from '../packages/floor-navigation/index.js';
import {createFloorBinding,openFloorBinding,floorControllerRecords,floorTableToken} from '../candidates/tile-stack/editor/floors.js';
import {TILE_STACK_EDITOR,tileStackActions,validateStackDraft} from '../candidates/tile-stack/editor/contract.js';
const deps={mapCore},source=JSON.stringify(mapCore.blankMap('Verbatim three-layer source'),null,1),binding=createFloorBinding(deps,source),clone=structuredClone;
const draft=()=>({tool:'stack',ownerId:null,origin:[20,20],widthM:8,depthM:4,seed:771,floorIds:binding.floors.map(f=>f.id),minimumClearanceM:2,lockPolicy:'all-except-highest',finishId:'skin.painterly'});
test('fifteen explicit floors retain three legacy references and twelve tile-only identities',()=>{
 assert.deepEqual(openFloorBinding(deps,source,binding),binding);assert.equal(binding.floors.length,15);assert.deepEqual(binding.floors.slice(0,3).map(f=>f.source.layerIndex),[0,1,2]);assert.ok(binding.floors.slice(3).every(f=>f.source.kind==='authored-tile'&&!Object.hasOwn(f.source,'layerIndex')));assert.equal(JSON.parse(source).levels,3);assert.equal(binding.floors.at(-1).elevationM,29.68);
 const records=floorControllerRecords(binding);assert.equal(floorWindow(records,'F07').length,5);assert.equal(floorWindow(records,'F14').at(-1).label,'15');
});
test('nonuniform profile cannot derive metres from label or index',()=>{const b=createFloorBinding(deps,source,'nonuniform-fifteen');assert.equal(b.floors[3].elevationM,6.75);assert.equal(b.floors[14].elevationM,42.7);assert.notEqual(floorTableToken(b),floorTableToken(binding));assert.deepEqual(openFloorBinding(deps,source,b),b);});
test('unknown floor versions/identity, changed source bytes, forged layers and table drift refuse',()=>{
 for(const change of [b=>b.version=2,b=>b.profile.version=2,b=>b.profile.id='unknown',b=>b.id='other-table',b=>b.floors[4].elevationM=8.5,b=>b.floors[4].label='changed',b=>b.floors[3].source={kind:'legacy-layer',layerIndex:3},b=>b.floors[3].source={kind:'authored-tile',layerIndex:3},b=>b.floors[2].source.layerIndex=1]){const b=clone(binding);change(b);assert.throws(()=>openFloorBinding(deps,source,b));}
 assert.throws(()=>openFloorBinding(deps,source+' ',binding),e=>e.code==='STACK_FLOOR_TABLE_MISMATCH');
});
test('stack draft keeps IDs/clearance without claiming feasibility',()=>{
 const d=draft();assert.deepEqual(validateStackDraft(d,binding),d);d.minimumClearanceM=20;assert.equal(validateStackDraft(d,binding).minimumClearanceM,20);
 for(const change of [d=>d.floorIds=['F00','F00'],d=>d.floorIds=['F01','F00'],d=>d.floorIds=['F00','missing'],d=>d.minimumClearanceM=0,d=>d.minimumClearanceM=-1,d=>d.seed=-1,d=>d.floorIds=['F00'],d=>d.lockPolicy='none']){const d=draft();change(d);assert.throws(()=>validateStackDraft(d,binding));}
});
test('v2 proposal reuses unknown-state action freezing and original limits',()=>{
 assert.equal(TILE_STACK_EDITOR.version,2);assert.equal(TILE_STACK_EDITOR.methods.length,15);assert.equal(TILE_STACK_EDITOR.limits.derivedCells,1024);
 const a=tileStackActions({phase:'recovery-required',hasDraft:true,selected:true,undo:1,redo:1},{inspectionBound:true});for(const k of ['setDraft','stack','apply','undo','redo','save','open','setInspection'])assert.equal(a[k],false);assert.equal(a.recover,true);assert.equal(tileStackActions({phase:'draft',hasDraft:true},{inspectionBound:false}).setInspection,false);
});
