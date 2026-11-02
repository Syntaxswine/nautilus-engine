import test from 'node:test';
import assert from 'node:assert/strict';
import {actual,documentFixture,harness,saved,review,apply,stack} from './fixtures/tile-stack-editor/b1.mjs';
import {capturePlannerSource} from '../apps/editor/tile-stack/planner-seam.js';
import {planIsolatedLevelSurface,validateSurfaceOperation} from '../apps/editor/tile-stack/surface-route.js';
import {bindIsolatedLevelSurfaceTarget} from '../apps/editor/tile-stack/surface-binding.js';
import {createTileStackCheckpointCodec} from '../apps/editor/tile-stack/checkpoint.js';
import * as publicStack from '../packages/tile-stack-core/index.js';
const clone=structuredClone;
const path=(kind='line',extra={})=>({tool:'path',ownerId:null,origin:[75,75],path:actual.examples.pathRecipe('original.'+kind,kind).shape.path,widthM:.85,seed:123,finishId:'skin.slate',...extra});
function sourceWithOwners(profile='nonuniform-fifteen',{envelope=true,locked=false,neighbour=[140,140],extraReservation=false}={}){
 const d=documentFixture(profile),recipe=actual.examples.pathRecipe('original.shared','cubic');recipe.interior.variantSeed=991;
 if(envelope)recipe.reservations=[{id:'authoring-envelope',floorSlot:'base',channel:'surface',layerId:'ground',min:[-4,-5,0],max:[12,10,.12]}];
 if(extraReservation)recipe.reservations.push({id:'remote-projection',floorSlot:'base',channel:'surface',layerId:'ground',min:[50,50,0],max:[60,60,.12]});
 const make=(id,origin,locked=false,index=7)=>{const floor=d.tileBundle.layout.floors[index];return {id,recipeId:recipe.id,contentDigest:actual.tiles.compileTileRecipe(recipe).contentDigest,origin:[...origin,floor.elevationM],floorBindings:{base:floor.id},transform:{quarterTurns:1,mirrorX:true},locked,anchorIds:[]};};
 const catalogue=actual.tiles.createTileCatalogue([...d.tileBundle.recipes,recipe]);
 d.tileBundle=actual.tiles.tileBundle({...clone(d.tileBundle.layout),catalogueDigest:catalogue.digest,instances:[make('surface/selected',[75,75],locked),make('surface/unrelated',neighbour,false,8)]},catalogue);return d;
}
for(const profile of ['aft-native-fifteen','nonuniform-fifteen'])for(const kind of ['line','arc','cubic'])test('B2 original '+kind+' on '+profile+' has one real preparation/apply and lossless complete history',async t=>{
 const h=await harness({document:documentFixture(profile)});t.after(()=>h.session.dispose());h.floors.select('F07');
 const before=saved(h),draft=path(kind),r=await review(h,draft);assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(h.counts,{prepare:1,apply:0});assert.deepEqual(saved(h),before);
 assert.equal((await h.session.apply(r.reviewId)).committed,true);const after=saved(h),owner=after.document.tileBundle.layout.instances[0],recipe=after.document.tileBundle.recipes.find(v=>v.id===owner.recipeId);
 assert.deepEqual(recipe.shape.path,draft.path);assert.equal(recipe.interior.variantSeed,draft.seed);assert.equal(owner.origin[2],before.document.floorBinding.floors[7].elevationM);assert.equal(owner.floorBindings.base,'F07');
 assert.deepEqual(after.document.constraints,before.document.constraints);assert.deepEqual(after.document.tileBundle.layout.selection,before.document.tileBundle.layout.selection);assert.equal(after.document.sourceJSON,before.document.sourceJSON);assert.deepEqual(after.document.tileBundle.recipes.find(v=>v.id===before.document.tileBundle.recipes[0].id),before.document.tileBundle.recipes[0]);
 assert.equal((await h.session.undo()).committed,true);assert.deepEqual(saved(h).document,before.document);assert.equal((await h.session.redo()).committed,true);assert.deepEqual(saved(h).document,after.document);
 assert.equal((await h.session.open(h.session.save().checkpointJSON)).ok,true);assert.deepEqual(saved(h).document,after.document);assert.deepEqual(h.counts,{prepare:1,apply:1});assert.equal(Object.hasOwn(h.session,'setInspection'),false);assert.equal(h.session.getSnapshot().actions.setInspection,false);
});
test('B2 path Finish preserves slash identity, exact controls/seed/D4/anchor subset/native floor, shared and unused recipes',async t=>{
 const document=sourceWithOwners(),h=await harness({document});t.after(()=>h.session.dispose());h.floors.select('F01');const before=saved(h),old=before.document.tileBundle.layout.instances.find(v=>v.id==='surface/selected'),oldRecipe=before.document.tileBundle.recipes.find(v=>v.id===old.recipeId);
 await apply(h,{tool:'finish',ownerId:old.id,finishId:'skin.slate'});const after=saved(h),owner=after.document.tileBundle.layout.instances.find(v=>v.id===old.id),recipe=after.document.tileBundle.recipes.find(v=>v.id===owner.recipeId);
 assert.deepEqual(owner,{...old,recipeId:recipe.id,contentDigest:owner.contentDigest});assert.deepEqual(recipe,{...oldRecipe,id:recipe.id,contentVersion:oldRecipe.contentVersion+1,interior:{...oldRecipe.interior,skinId:'skin.slate'}});
 for(const r of before.document.tileBundle.recipes)assert.deepEqual(after.document.tileBundle.recipes.find(v=>v.id===r.id),r);assert.deepEqual(after.document.tileBundle.layout.instances.find(v=>v.id==='surface/unrelated'),before.document.tileBundle.layout.instances.find(v=>v.id==='surface/unrelated'));assert.deepEqual(after.document.constraints,before.document.constraints);assert.deepEqual(h.counts,{prepare:1,apply:1});
});
for(const [name,options,code]of [['missing envelope',{envelope:false},'B2_SURFACE_ENVELOPE_REQUIRED'],['locked',{locked:true},'LOCK_CONFLICT'],['unchanged neighbour',{neighbour:[75,75]},'B2_SURFACE_INTERACTION_UNBOUND'],['extra reservation',{neighbour:[20,20],extraReservation:true},'B2_SURFACE_INTERACTION_UNBOUND']])test('B2 Finish refuses '+name+' before preparation, preserving complete source',async t=>{
 const h=await harness({document:sourceWithOwners(undefined,options)});t.after(()=>h.session.dispose());const before=saved(h),r=await review(h,{tool:'finish',ownerId:'surface/selected',finishId:'skin.slate'});assert.equal(r.ok,false);assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(saved(h),before);assert.deepEqual(h.counts,{prepare:0,apply:0});assert.equal(h.writes.length,0);
});
test('B2 possible interaction across all floor heights refuses, while a remote managed stack remains intact',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());await apply(h);const before=saved(h),counts=clone(h.counts);
 const refused=await review(h,path('line',{origin:[20,20]}));assert.equal(refused.code,'B2_STACK_INTERACTION_UNBOUND');assert.deepEqual(h.counts,counts);assert.deepEqual(saved(h),before);
 const accepted=await review(h,path());assert.equal(accepted.ok,true,JSON.stringify(accepted));assert.equal((await h.session.apply(accepted.reviewId)).committed,true);assert.deepEqual(saved(h).document.constraints,before.document.constraints);for(const o of before.document.tileBundle.layout.instances)assert.deepEqual(saved(h).document.tileBundle.layout.instances.find(v=>v.id===o.id),o);
});
test('B2 binder uses the actual ordinary public repair and rejects corrupt prepared source/constraints/affected scope',()=>{
 const document=documentFixture(),binding=createTileStackCheckpointCodec(actual,document),hostContext={floorId:'F00',mode:'manual',floorEpoch:0,providerToken:'actual-core-headless',cancelled:false},frame=capturePlannerSource(binding.domain,actual.tiles,document,hostContext),plan=planIsolatedLevelSurface(actual,{document,frame,draft:path(),requestId:'surface-request',newOwnerId:'surface/new',floorId:'F00',limits:publicStack.STACK_PLANNER_LIMITS,finishId:'skin.slate'});
 assert.equal(plan.route,'public-v1-isolated-surface');assert.equal(Object.hasOwn(plan,'kind'),false);assert.ok(Object.isFrozen(plan.request));const prepared=actual.tiles.prepareTileRepair(document.tileBundle,plan.request,{contextToken:frame.context.contextToken,cancelled:false});assert.equal(prepared.ok,true,JSON.stringify(prepared));
 const bound=bindIsolatedLevelSurfaceTarget(binding.domain,actual.tiles,{document,hostContext,plan,prepared});assert.deepEqual(bound.targetDocument.constraints,document.constraints);
 for(const mutate of [p=>p.changes.affectedIds.push('unrelated'),p=>p.next.bundle.layout.selection.seed++,p=>p.next.bundle.recipes.find(v=>v.id==='stack-default-template').interior.variantSeed++]){const p=clone(prepared);mutate(p);assert.throws(()=>bindIsolatedLevelSurfaceTarget(binding.domain,actual.tiles,{document,hostContext,plan,prepared:p}));}
 const target=clone(bound.targetDocument);target.constraints.minimumClearanceM=3;assert.throws(()=>validateSurfaceOperation(actual.tiles,{action:'edit',request:plan.request,binding:bound.binding},target,document),{code:'B2_SURFACE_CONSTRAINT_CHANGE'});
});
for(const failure of ['before','after'])test('B2 path '+failure+' unknown commit freezes actions and recovers the original request once',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());const before=saved(h),r=await review(h,path('cubic'));assert.equal(r.ok,true,JSON.stringify(r));h.hook=(p,when)=>{if(p.phase==='commit'&&when===failure)throw Error('Unknown path acknowledgement');};assert.equal((await h.session.apply(r.reviewId)).committed,null);assert.equal(h.session.setDraft(path()).ok,false);assert.equal(h.session.save().ok,false);assert.equal((await h.session.undo()).ok,false);h.hook=()=>{};assert.equal((await h.session.recover(r.requestId)).committed,failure==='after');assert.deepEqual(h.counts,{prepare:1,apply:1});assert.equal(saved(h).journal.receipts.length,1);if(failure==='before')assert.deepEqual(saved(h).document,before.document);
});
