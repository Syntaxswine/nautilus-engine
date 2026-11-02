import test from 'node:test';
import assert from 'node:assert/strict';
import {actual,documentFixture,catalogueFor} from './fixtures/tile-stack-editor/b1.mjs';
import {createFloorNavigation} from '../packages/floor-navigation/index.js';
import {createTileStackCheckpointCodec,createTileStackStorage} from '../apps/editor/tile-stack/checkpoint.js';
import {createTileStackSessionProfile} from '../apps/editor/tile-stack/profile.js';
import {createSmartTileSession} from '../apps/editor/smart-tile/session.js';
import {smartTileData,fields} from '../apps/editor/smart-tile/checkpoint.js';

// Production v2 codec/profile/shared session and real retained core. This
// callback port deliberately exercises the private profile seam; its empty
// resource-only view does not advertise a native presenter or browser proof.
async function harness(){
 const document=documentFixture(),binding=createTileStackCheckpointCodec(actual,document),values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},authority=createTileStackStorage(actual,{binding,storage,initialCheckpoint:binding.codec.create(document)});let session,retire=()=>{},setter=()=>{},sets=0,inspection={mode:'selected-floor',cutawayFloorId:null};
 const floors=createFloorNavigation({floors:binding.domain.floorRecords,selectedId:'F00',cancelPreview(){session?.cancel('before-floor');}}),profile=createTileStackSessionProfile(actual,{binding,initialDocument:document,finishCatalogue:catalogueFor(document),inspection:{isLive:()=>true,validate(input){const v=smartTileData(input);fields(v,['mode','cutawayFloorId'],'/inspection');return v;},get:()=>structuredClone(inspection),set(v){sets++;inspection=v;setter();}}});
 session=await createSmartTileSession(actual,{codec:binding.codec,profile,authority,floorController:floors,presentation:{acquire(){let disposed=false;return {root:{visible:true},cellCount:0,diagnostics:()=>({disposed,ownedGeometry:0,triangles:0}),dispose(){disposed=true;}};},attach(){}},providerToken:'inspection-retirement-control-flow-test',retireInput:()=>retire()});
 return {session,floors,authority,get sets(){return sets;},set retire(v){retire=v;},set setter(v){setter=v;},close(){session.dispose();floors.dispose();}};
}
for(const stage of ['retirement','setter','notification'])for(const change of ['dispose','floor-context','cancel'])test('inspection '+stage+' callback '+change+' cannot activate or report a current success',async t=>{
 const h=await harness();t.after(()=>h.close());let armed=true,publications=0;
 const callback=()=>{if(!armed)return;armed=false;if(change==='dispose')h.session.dispose();else if(change==='floor-context')h.floors.select('F01');else h.session.cancel('callback-retirement');};
 if(stage==='retirement')h.retire=callback;else if(stage==='setter')h.setter=callback;else {let watch=false;h.session.subscribe(()=>{if(watch){publications++;callback();}});watch=true;}
 const before=h.authority.read(),result=h.session.setInspection({mode:'overview',cutawayFloorId:null});assert.equal(result.ok,false,JSON.stringify(result));assert.equal(result.code,change==='dispose'?'DISPOSED':'STALE_INSPECTION');assert.equal(h.sets,stage==='retirement'?0:1);assert.deepEqual(h.authority.read(),before);const s=h.session.getSnapshot();if(change==='dispose'){assert.equal(s.phase,'disposed');assert.equal(s.actions.setInspection,false);}else if(change==='floor-context')assert.equal(s.floor.id,'F01');if(stage==='notification')assert.equal(publications,1);
});
test('inspection validates and owns input before retirement, and a normal activation reports success once',async t=>{
 const h=await harness();t.after(()=>h.close());let retired=0,gets=0;h.retire=()=>retired++;assert.equal(h.session.setInspection({mode:'overview',get cutawayFloorId(){gets++;return null;}}).ok,false);assert.equal(gets,0);assert.equal(retired,0);assert.equal(h.sets,0);
 const input={mode:'overview',cutawayFloorId:null};h.retire=()=>{retired++;input.mode='malicious mutation';};assert.equal(h.session.setInspection(input).ok,true);assert.equal(h.session.getSnapshot().inspection.mode,'overview');assert.equal(retired,1);assert.equal(h.sets,1);
});
