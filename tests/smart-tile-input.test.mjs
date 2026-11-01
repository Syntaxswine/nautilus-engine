import test from 'node:test';
import assert from 'node:assert/strict';
import {bindSmartTileInput} from '../apps/editor/smart-tile/input.js';
import {createSmartTileViews} from '../apps/editor/smart-tile/views.js';

// Control-flow stand-ins only. Native trusted pointer, buttons and layout are
// verified separately in review-smart-tile-editor.mjs against the real session.
function routing(){
 const doc=new EventTarget(),win=new EventTarget(),canvas=new EventTarget(),captures=new Set(),calls=[],camera=[];doc.defaultView=win;canvas.ownerDocument=doc;canvas.focus=()=>{};canvas.setPointerCapture=id=>captures.add(id);canvas.hasPointerCapture=id=>captures.has(id);canvas.releasePointerCapture=id=>captures.delete(id);
 let select=false,input;const state={tool:'rectangle',draft:null,floor:{id:'0',mode:'manual'},actions:{setDraft:true,selectOwner:true,review:true,undo:true,redo:true}},session={getSnapshot:()=>structuredClone(state),setDraft:d=>{state.draft=d;calls.push(['draft',d]);},selectOwner:id=>calls.push(['select',id]),review:()=>calls.push(['review']),undo:()=>calls.push(['undo']),redo:()=>calls.push(['redo']),cancel:reason=>{calls.push(['cancel',reason]);input.retire(reason);}};
 input=bindSmartTileInput({canvas,session,screenToWorld:e=>[e.clientX,e.clientY],hitOwner:()=> 'whole-owner',readDraft:()=>({seed:17}),selectionMode:()=>select,onCamera:p=>camera.push(p)});
 function event(type,{target=canvas,...values}={}){const e=new Event(type,{cancelable:true});for(const [k,v]of Object.entries({target,pointerId:1,clientX:0,clientY:0,button:0,...values}))Object.defineProperty(e,k,{value:v});(type==='lostpointercapture'||type.startsWith('key')?canvas:type==='blur'?win:doc).dispatchEvent(e);return e;}
 return {doc,canvas,input,state,calls,camera,event,set select(v){select=v;},close:()=>input.dispose()};
}
test('input fixes one pointer-down owner and release produces one draft, never acceptance',()=>{
 const h=routing();try{h.event('pointerdown',{clientX:20,clientY:20});h.select=true;h.event('pointermove',{clientX:28,clientY:24});h.event('pointerup',{clientX:28,clientY:24});assert.deepEqual(h.calls,[['draft',{tool:'rectangle',ownerId:null,origin:[20,20],widthM:8,depthM:4,seed:17}]]);
 h.event('pointerdown',{button:2,clientX:20});h.select=false;h.event('pointermove',{clientX:25,clientY:2});h.event('pointerup',{clientX:25,clientY:2});assert.equal(h.camera.length,1);assert.equal(h.calls.length,1);
 }finally{h.close();}
});
test('a second finger quarantines all remaining fingers and their native click follow-ups',()=>{
 const h=routing(),outside={};try{
 h.event('pointerdown',{pointerId:1});h.event('pointerdown',{pointerId:2,target:outside});assert.equal(h.input.snapshot().consumed,true);
 h.event('pointerup',{pointerId:1,clientX:8,clientY:4});assert.equal(h.input.snapshot().pointers,1);assert.equal(h.input.snapshot().consumed,true);h.event('pointerdown',{pointerId:3});h.event('pointermove',{pointerId:3,clientX:8,clientY:4});h.event('pointerup',{pointerId:2});assert.equal(h.input.snapshot().consumed,true);h.event('pointerup',{pointerId:3});assert.equal(h.input.snapshot().pointers,0);assert.equal(h.calls.filter(c=>c[0]==='draft').length,0);
 assert.equal(h.event('click',{pointerId:2,target:outside}).defaultPrevented,true);h.event('pointerdown',{pointerId:2,target:outside});assert.equal(h.event('click',{pointerId:2,target:outside}).defaultPrevented,false);
 h.event('pointerdown',{pointerId:1});h.event('pointerup',{pointerId:1,clientX:8,clientY:4});assert.equal(h.calls.filter(c=>c[0]==='draft').length,1);
 }finally{h.close();}
});
test('capture loss, blur, hidden state and ticket retirement prevent stale release writes',()=>{
 const h=routing();try{
 h.event('pointerdown');h.event('lostpointercapture');assert.equal(h.input.snapshot().consumed,true);assert.equal(h.input.snapshot().pointers,1);h.event('pointerup',{clientX:8,clientY:4});assert.equal(h.calls.filter(c=>c[0]==='draft').length,0);
 h.event('pointerdown');h.input.retire('tool-change');h.event('pointerup',{clientX:8,clientY:4});assert.equal(h.calls.filter(c=>c[0]==='draft').length,0);
 h.event('pointerdown');h.event('blur');assert.equal(h.input.snapshot().pointers,0);h.event('pointerup',{clientX:8,clientY:4});assert.equal(h.calls.filter(c=>c[0]==='draft').length,0);
 h.event('pointerdown');h.doc.hidden=true;h.event('visibilitychange');assert.equal(h.input.snapshot().owner,null);assert.equal(h.input.snapshot().pointers,0);
 }finally{h.close();}
});
test('scoped Enter reviews once and never routes form/button Enter, Space or repeated history',()=>{
 const h=routing();try{
 h.event('keydown',{key:'Enter',repeat:false});h.event('keydown',{key:'Enter',repeat:true});h.event('keyup',{key:'Enter'});assert.deepEqual(h.calls,[['review']]);
 assert.equal(h.event('keydown',{key:'Enter',target:{}}).defaultPrevented,false);assert.equal(h.event('keydown',{key:' '}).defaultPrevented,false);h.event('keydown',{key:'z',ctrlKey:true,repeat:false});h.event('keydown',{key:'z',ctrlKey:true,repeat:true});assert.equal(h.calls.filter(c=>c[0]==='undo').length,1);
 }finally{h.close();}
});
test('retiring allocations remain charged when cleanup cannot be verified; no third root starts',async()=>{
 const owned=[],codes=[];let views,attachSnapshot;
 const owner=createSmartTileViews({acquire(bundle){let disposed=false;const v={root:{visible:true},cellCount:4,diagnostics:()=>({triangles:8,disposed,ownedGeometry:disposed?0:1}),dispose(){if(bundle.bad)throw Error('unverified service failure');disposed=true;}};owned.push(v);return v;},attach(){attachSnapshot=views.snapshot();},onDiagnostic:c=>codes.push(c)});views=owner;
 const a=await views.acquire({},()=>true);assert.equal(a.ok,true);assert.equal(views.promote(a.record),true);const b=await views.acquire({bad:true},()=>true);assert.equal(b.ok,true);assert.equal(attachSnapshot.accepted+attachSnapshot.candidate+attachSnapshot.acquiring+attachSnapshot.retiring,attachSnapshot.roots);
 views.cancel();const charged=views.snapshot();assert.equal(charged.retiring,1);assert.equal(charged.roots,2);assert.equal(charged.triangles,16);assert.equal((await views.acquire({},()=>true)).code,'AGGREGATE_VIEW_BUDGET');assert.equal(owned.length,2);assert.ok(codes.includes('VIEW_RETIREMENT_UNVERIFIED'));views.dispose();assert.equal(views.snapshot().retiring,1);
});
