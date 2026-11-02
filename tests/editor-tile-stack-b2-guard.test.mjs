import test from 'node:test';
import assert from 'node:assert/strict';
import {actual} from './fixtures/tile-stack-editor/b1.mjs';
import {assertSurfaceIsolation,surfaceWork} from '../apps/editor/tile-stack/surface-guard.js';
import {bindSmartTileInput} from '../apps/editor/smart-tile/input.js';
const clone=structuredClone,empty={owners:[],managedRelations:[]};
function bundle({origin=[0,0],neighbour=[80,80],kind='line',reservations=[],neighbourReservations=[],links=[]}={}){
 const r=actual.examples.pathRecipe('original',kind),n=actual.examples.surfaceRecipe('neighbour',2,2);r.reservations=reservations;n.reservations=neighbourReservations;
 const owner=(id,recipeId,p)=>({id,recipeId,origin:[...p,id==='surface'?0:100],transform:{quarterTurns:0,mirrorX:false}});
 return {recipes:[r,n],layout:{instances:[owner('surface',r.id,origin),owner('neighbour',n.id,neighbour)],joins:[],relations:links}};
}
test('B2 guard considers old locations, reservation-free neighbours, full arc circle and remote reservation projections',()=>{
 const before=bundle({neighbour:[6,0]}),next=clone(before);next.layout.instances[0].origin=[150,150,0];assert.throws(()=>assertSurfaceIsolation(before,next,'surface',empty,surfaceWork()),{code:'B2_SURFACE_INTERACTION_UNBOUND'});
 const arc=bundle({kind:'arc',neighbour:[-1,3]});assert.throws(()=>assertSurfaceIsolation(arc,arc,'surface',empty,surfaceWork()),{code:'B2_SURFACE_INTERACTION_UNBOUND'});
 const projected=bundle({neighbour:[80,80],reservations:[{min:[79,79,0],max:[84,84,.12]}]});assert.throws(()=>assertSurfaceIsolation(projected,projected,'surface',empty,surfaceWork()),{code:'B2_SURFACE_INTERACTION_UNBOUND'});
 const remote=bundle();const w=surfaceWork();assert.equal(assertSurfaceIsolation(remote,remote,'surface',empty,w).units,w.snapshot().units);assert.ok(w.snapshot().units>0);
});
test('B2 guard follows semantic chains to managed endpoints and enforces its work cap',()=>{
 const b=bundle({links:[{a:'surface',b:'neighbour'}]});assert.throws(()=>assertSurfaceIsolation(b,b,'surface',{owners:[],managedRelations:[{a:'neighbour',b:'remote-stack'}]},surfaceWork()),{code:'B2_STACK_INTERACTION_UNBOUND'});
 assert.throws(()=>assertSurfaceIsolation(b,b,'surface',empty,surfaceWork({maxSpatialTests:1})),{code:'B2_SURFACE_WORK_LIMIT'});
});
test('B2 rectangle projector captures finish at the same original pointer-down owner',()=>{
 const doc=new EventTarget(),win=new EventTarget(),canvas=new EventTarget(),drafts=[],captures=new Set();doc.defaultView=win;canvas.ownerDocument=doc;canvas.focus=()=>{};canvas.setPointerCapture=id=>captures.add(id);canvas.hasPointerCapture=id=>captures.has(id);canvas.releasePointerCapture=id=>captures.delete(id);
 let finishId='skin.brick-pavers';const session={getSnapshot:()=>({tool:'rectangle',floor:{mode:'manual'},actions:{setDraft:true,selectOwner:true}}),setDraft:d=>drafts.push(d),cancel:()=>{}};
 const input=bindSmartTileInput({canvas,session,screenToWorld:e=>[e.clientX,e.clientY],readDraft:()=>({seed:7,finishId}),projectRectangleDraft:(draft,captured)=>({...draft,finishId:captured.finishId})});
 function event(type,x,y){const e=new Event(type,{cancelable:true});for(const [k,v]of Object.entries({target:canvas,pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y}))Object.defineProperty(e,k,{value:v});doc.dispatchEvent(e);}
 try{event('pointerdown',20,20);finishId='skin.stone-flags';event('pointerup',28,24);assert.deepEqual(drafts,[{tool:'rectangle',ownerId:null,origin:[20,20],widthM:8,depthM:4,seed:7,finishId:'skin.brick-pavers'}]);}finally{input.dispose();}
});
