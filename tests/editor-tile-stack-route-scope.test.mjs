import test from 'node:test';
import assert from 'node:assert/strict';
import {actual,harness,saved,review,apply} from './fixtures/tile-stack-editor/b1.mjs';
import {stackOperationBinding} from '../apps/editor/tile-stack/checkpoint.js';
const clone=structuredClone,rectangle=(origin=[20,20])=>({tool:'rectangle',ownerId:null,origin,widthM:8,depthM:4,seed:771,finishId:'skin.painterly'}),path=()=>({tool:'path',ownerId:null,origin:[75,75],path:actual.examples.pathRecipe('original.line','line').shape.path,widthM:.85,seed:19,finishId:'skin.slate'});
let evidence;
async function fixture(){return evidence??=(async()=>{const h=await harness();try{await apply(h,rectangle());const before=h.binding.codec.open(saved(h)),r=await review(h,path());assert.equal(r.ok,true);assert.equal((await h.session.apply(r.reviewId)).committed,true);const after=saved(h);assert.deepEqual(h.counts,{prepare:2,apply:2});return {binding:h.binding,before,after,operation:after.journal.receipts.at(-1).operation};}finally{h.session.dispose();}})();}
for(const markers of ['empty','coherent-unrelated-rectangle'])for(const adoptPath of [false,true])test('durable B2 scope rejects '+markers+' hiding actual path changes'+(adoptPath?' and managed adoption':''),async()=>{
 const {binding,before,after,operation}=await fixture(),op=clone(operation),target=clone(after.document),owner=target.tileBundle.layout.instances.find(v=>v.id!==before.document.tileBundle.layout.instances[0].id),old=before.document.tileBundle.layout.instances[0];
 op.request.slots=markers==='empty'?[]:[{id:old.id,origin:old.origin,floorBindings:old.floorBindings,alternatives:[{recipeId:old.recipeId,transform:old.transform}],locked:old.locked,anchorIds:old.anchorIds}];op.request.recipeUpdates=[];op.request.replaceIds=markers==='empty'?[]:[old.id];op.request.removeIds=[];
 if(adoptPath)target.constraints.owners.push({instanceId:owner.id,primaryReservationId:'authoring-envelope'});op.target={tileBundle:target.tileBundle,constraints:target.constraints};op.binding=stackOperationBinding(actual.tiles,before.document,target,op.request,op.expected.contextToken);
 assert.throws(()=>binding.codec.stage(before,op));const pending=clone(before);pending.journal.pending=op;assert.throws(()=>binding.codec.open(JSON.stringify(pending)));
});
test('durable B2 accepts a genuine unrelated rectangle request with an unchanged path component and reopens pending/committed source',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());await apply(h,path());const before=saved(h),r=await review(h,rectangle([140,140]));assert.equal(r.ok,true,JSON.stringify(r));h.hook=(p,when)=>{if(p.phase==='stage'&&when==='after')throw Error('Keep the original pending operation');};assert.equal((await h.session.apply(r.reviewId)).committed,null);const pending=h.binding.codec.open(h.raw);assert.equal(pending.journal.pending.id,r.requestId);assert.deepEqual(pending.document,before.document);h.hook=()=>{};assert.equal((await h.session.recover(r.requestId)).committed,false);
 await apply(h,rectangle([140,140]));const after=saved(h);assert.deepEqual(after.document.tileBundle.layout.instances.find(v=>v.id===before.document.tileBundle.layout.instances[0].id),before.document.tileBundle.layout.instances[0]);assert.deepEqual(h.binding.codec.open(h.session.save().checkpointJSON).document,after.document);
});
