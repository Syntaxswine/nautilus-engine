import test from 'node:test';
import assert from 'node:assert/strict';
import {planTileStack,prepareTileStack} from '../candidates/tile-stack/core/index.js';
import * as F from '../candidates/tile-stack/core/fixtures.mjs';
const C=await import(process.env.NAUTILUS_STACK_CORE_IMPORT??'../packages/tiles-core/index.js');
const clone=structuredClone,codes=r=>[...(r.plan?.diagnostics??r.diagnostics??[]),...(r.preparation?.diagnostics??[])].map(d=>d.code);
const check=r=>{assert.equal(r.ok,true,JSON.stringify(r.plan?.diagnostics??r.diagnostics)+JSON.stringify(r.preparation?.diagnostics));return r;};
const ref=instanceId=>({instanceId,primaryReservationId:'body'});
function upsert(v,changes={}){const x={...clone(v),primaryReservationId:'body',...changes};delete x.contentDigest;return x;}
function start(options={}){const state=F.initial(C,options),request=F.input(C,state,F.stackIntent(options));return {state,request,result:check(prepareTileStack(C,request))};}
function rebind(state){state.context.sourceConstraintsDigest=C.tileLayoutToken(state.constraints);return state;}
function single(r=F.rectangle(),{origin=[0,0,0],locked=false,id='old',floor='F00'}={}){return F.initial(C,{recipes:[r],instances:[F.placement(C,r,id,origin,floor,locked,[r.anchors[0].id])],ownerRefs:[ref(id)]});}
function pathRecipe(id='future.path',kind='cubic') {const r=F.rectangle(id);r.shape={kind:'profile-sweep',id:id+'.sweep',widthM:.85,thicknessM:.12,path:kind==='cubic'?{kind,id:id+'.curve',points:[[0,0,0],[.123456789,2.0000000001,0],[4,-1,0],[6.0000000001,0,0]]}:{kind:'arc',id:id+'.curve',center:[3,3],radius:3,startRad:0,sweepRad:Math.PI/2,h0:0,h1:0}};r.ports=[];r.reservations=[];r.anchors=[{id:r.shape.id,kind:'path',parentId:null}];return r;}
for(const nonuniform of [false,true])test('one finite operation: fifteen native decks and 105 explicit crossings '+nonuniform,()=>{
 const {state,request,result}=start({nonuniform}),p=result.plan,n=result.preparation.next.bundle;
 assert.deepEqual(prepareTileStack(C,request),result);assert.deepEqual(state.bundle,request.bundle);assert.equal(p.request.slots.length,15);assert.ok(p.request.slots.every(s=>s.alternatives.length===1));assert.equal(p.request.relations.length,105);assert.equal(n.layout.instances.filter(v=>v.locked).length,14);assert.equal(n.layout.instances.at(-1).locked,false);assert.equal(p.constraints.managedRelations.length,105);assert.deepEqual(result.preparation.work,{steps:16,spatialTests:435,geometryEvaluations:1950});
 assert.equal(p.binding.sourceConstraintsDigest,C.tileLayoutToken(state.constraints));assert.equal(p.binding.nextConstraintsDigest,C.tileLayoutToken(p.constraints));assert.equal(p.binding.floorProfileDigest,C.tileLayoutToken(state.context.floorProfile));
 for(const v of n.layout.instances){assert.equal(v.origin[2],state.context.floorProfile.floors.find(f=>f.id===v.floorBindings.base).elevationM);assert.deepEqual(v.anchorIds,['deck.shared.region','deck.shared.node.0']);}
 const opened=C.openTileBundle(JSON.stringify(n),{requireResolved:true});assert.deepEqual(opened.bundle,n);assert.deepEqual(n.recipes,state.bundle.recipes);assert.deepEqual(n.layout.extensions,state.bundle.layout.extensions);assert.equal(n.recipes[0].interior.variantSeed,12345);assert.equal(p.inspection.validatedOwnerIds.length,15);
});
test('unlocked finish copy-on-write preserves fourteen locked owners, controls, anchors, seed, relation IDs and accepted constraints',()=>{
 const {state,result}=start(),next=F.nextState(C,result,state),intent=F.finishIntent(C,next,'deck.14'),finished=check(prepareTileStack(C,F.input(C,next,intent))),bundle=finished.preparation.next.bundle;
 for(const v of next.bundle.layout.instances.slice(0,14))assert.deepEqual(bundle.layout.instances.find(x=>x.id===v.id),v);
 assert.deepEqual(bundle.recipes.find(r=>r.id==='deck.shared'),next.bundle.recipes[0]);assert.deepEqual(bundle.layout.relations,next.bundle.layout.relations);assert.deepEqual(finished.plan.constraints,next.constraints);
 const v=bundle.layout.instances.at(-1),r=bundle.recipes.find(r=>r.id===v.recipeId),expected=clone(next.bundle.recipes[0]);expected.id=r.id;expected.interior.skinId='skin.slate';assert.deepEqual(r,expected);assert.deepEqual(v.anchorIds,next.bundle.layout.instances.at(-1).anchorIds);assert.deepEqual(C.openTileBundle(JSON.stringify(bundle),{requireResolved:true}).bundle,bundle);
 assert.equal(prepareTileStack(C,F.input(C,next,F.finishIntent(C,next,'deck.00'))).ok,false);
});
test('same-floor straight join with a locked neighbour survives isolated finish',()=>{
 const r=F.rectangle(),a=F.placement(C,r,'left',[0,0,0]),b=F.placement(C,r,'right',[8,0,0],'F00',true,[r.shape.id]),join={id:'shared.edge',a:{instanceId:'left',faceId:'east',portIds:null},b:{instanceId:'right',faceId:'west',portIds:null}},state=F.initial(C,{recipes:[r],instances:[a,b],joins:[join],ownerRefs:[ref('left'),ref('right')]}),result=check(prepareTileStack(C,F.input(C,state,F.finishIntent(C,state,'left'))));
 assert.deepEqual(result.preparation.next.bundle.layout.instances.find(v=>v.id==='right'),b);assert.deepEqual(result.preparation.next.bundle.layout.joins,[join]);assert.deepEqual(result.preparation.next.bundle.layout.relations,[]);assert.deepEqual(result.plan.inspection.closureOwnerIds,['left','right']);
});
test('move and remove use old/new closure and maintain only owned crossings',()=>{
 const {state,result}=start(),next=F.nextState(C,result,state),top=next.bundle.layout.instances.at(-1),move=F.edit('move.top',{upserts:[upsert(top,{origin:[40,0,top.origin[2]]})]}),moved=check(prepareTileStack(C,F.input(C,next,move)));
 assert.equal(moved.plan.inspection.closureOwnerIds.length,15);assert.equal(moved.plan.request.relations.length,91);assert.equal(moved.plan.constraints.managedRelations.length,91);assert.equal(moved.plan.inspection.discovery.some(v=>v.a===top.id||v.b===top.id),true);
 const removed=check(prepareTileStack(C,F.input(C,next,F.edit('remove.top',{removeIds:[top.id]}))));assert.equal(removed.preparation.next.bundle.layout.instances.length,14);assert.equal(removed.plan.constraints.owners.length,14);assert.equal(removed.plan.request.relations.length,91);assert.deepEqual(next.bundle,result.preparation.next.bundle);
});
test('accepted stronger pair requirements survive smaller draft clearance; stronger draft is checked by public core',()=>{
 const {state,result}=start({nonuniform:true}),next=F.nextState(C,result,state),r=next.constraints.managedRelations.find(r=>r.a==='deck.00'&&r.b==='deck.14');r.clearanceM=3;next.bundle.layout.relations.find(v=>v.id===r.id).clearanceM=3;rebind(next);
 const finished=check(prepareTileStack(C,F.input(C,next,F.finishIntent(C,next,'deck.14'))));assert.equal(finished.plan.constraints.managedRelations.find(v=>v.id===r.id).clearanceM,3);assert.equal(finished.plan.constraints.minimumClearanceM,2);
 const stronger=F.finishIntent(C,next,'deck.14');stronger.minimumClearanceM=10;assert.equal(prepareTileStack(C,F.input(C,next,stronger)).ok,false);
 const weaker=F.finishIntent(C,next,'deck.14');weaker.minimumClearanceM=1;assert.equal(planTileStack(C,F.input(C,next,weaker)).ok,false);
});
test('missing one emitted crossing and explicit removal both refuse without a candidate',()=>{
 const {state,result}=start(),p=clone(result.plan.request);p.relations.pop();const failed=C.prepareTileRepair(state.bundle,p,{contextToken:state.context.contextToken,cancelled:false});assert.equal(failed.ok,false);assert.equal(failed.next,null);assert.ok(failed.diagnostics.some(d=>d.code==='INCOMPLETE_REPAIR'));
 const next=F.nextState(C,result,state),removed=planTileStack(C,F.input(C,next,F.edit('omit.cross',{relations:{removeIds:[next.constraints.managedRelations[0].id],upserts:[]}})));assert.equal(removed.ok,false);assert.ok(codes(removed).includes('STACK_MISSING_REQUIRED_CROSSING'));
});
test('each actual binding rejects stale source and cancellation precedes bundle access',()=>{
 const {request}=start();for(const key of ['layoutDigest','catalogueDigest','contextToken','sourceConstraintsDigest','floorProfileDigest']){const x=clone(request);x.expected[key]='0'.repeat(64);assert.equal(planTileStack(C,x).ok,false,key);}
 const x=clone(request);x.context.floorProfile.floors[1].elevationM=3;assert.equal(planTileStack(C,x).ok,false);
 const y=clone(request);y.constraints.minimumClearanceM=1;y.expected.sourceConstraintsDigest=C.tileLayoutToken(y.constraints);assert.ok(codes(planTileStack(C,y)).includes('STACK_STALE_CONSTRAINTS'));
 let reads=0;const cancelled={context:{...request.context,cancelled:true}};Object.defineProperty(cancelled,'bundle',{enumerable:true,get(){reads++;throw Error('must not read');}});assert.ok(codes(planTileStack(C,cancelled)).includes('STACK_CANCELLED'));assert.equal(reads,0);
 const hostile=clone(request);Object.defineProperty(hostile.intent,'id',{enumerable:true,get(){reads++;return 'bad';}});assert.equal(planTileStack(C,hostile).ok,false);assert.equal(reads,0);
});
test('wrong declared binding, same plane, zero and insufficient clearance refuse',()=>{
 const {request}=start();for(const gap of [0,.12,2.119999]){const x=clone(request);x.context.floorProfile.floors[1].elevationM=gap;x.bundle.layout.floors[1].elevationM=gap;x.expected.layoutDigest=C.tileLayoutToken(x.bundle.layout);x.expected.floorProfileDigest=C.tileLayoutToken(x.context.floorProfile);const r=prepareTileStack(C,x);assert.equal(r.ok,false,String(gap));if(r.preparation)assert.equal(r.preparation.next,null);}
 const state=single(),v=state.bundle.layout.instances[0],r=planTileStack(C,F.input(C,state,F.edit('bad.binding',{upserts:[upsert(v,{origin:[0,0,2.12]})]})));assert.ok(codes(r).includes('STACK_WRONG_FLOOR_BINDING'));
});
test('tall extra reservations are retained and checked by the actual public authority',()=>{
 const r=F.rectangle();r.reservations.push({...clone(r.reservations[0]),id:'tall',max:[8,4,3]});const state=F.initial(C,{recipes:[r]}),result=prepareTileStack(C,F.input(C,state,F.stackIntent({recipe:r})));assert.equal(result.ok,false);assert.equal(result.preparation.next,null);assert.deepEqual(result.plan.request.recipeUpdates,[]);assert.equal(result.plan.inspection.obligations.some(o=>o.reservationA==='tall'),true);assert.deepEqual(state.bundle.recipes[0].reservations,r.reservations);
});
test('primary envelopes cannot be omitted, displaced, shrunken or inferred',()=>{
 for(const mode of ['missing','shifted','small']){const r=F.rectangle();if(mode==='missing')r.reservations=[];else if(mode==='shifted'){r.reservations[0].min[0]=1;r.reservations[0].max[0]=9;}else r.reservations[0].max[0]=7;const state=F.initial(C,{recipes:[r]}),result=planTileStack(C,F.input(C,state,F.stackIntent({recipe:r})));assert.equal(result.ok,false,mode);}
 const state=single();state.constraints.owners=[];rebind(state);const result=planTileStack(C,F.input(C,state,F.finishIntent(C,state,'old')));assert.ok(codes(result).includes('STACK_PRIMARY_RESERVATION_REQUIRED'));
});
test('projected edge and radius-only separated contacts name owners and deferred capability',()=>{
 for(const [x,radius]of [[8,0],[8.1,.2]]){const state=single(),recipe=state.bundle.recipes[0],intent=F.stackIntent({count:1});intent.originXY=[x,0];intent.members[0].floorId='F01';intent.members[0].id='upper';const result=planTileStack(C,F.input(C,state,intent,{neighbourRadiusM:radius}));assert.equal(result.ok,false);const d=result.diagnostics[0];assert.equal(d.code,'STACK_FLOOR_SEPARATION_UNSUPPORTED');assert.equal(d.requiredCapability,'versioned-floor-separation');assert.deepEqual(d.ownerIds,['old','upper']);assert.deepEqual(state.bundle.recipes,[recipe]);}
});
test('a laterally extended additional reservation cannot disappear from projected-edge obligations',()=>{
 const r=F.rectangle();r.reservations.push({...clone(r.reservations[0]),id:'side',min:[8,0,0],max:[10,4,.12]});const state=single(r),intent=F.stackIntent({count:1,recipe:r});intent.members[0].floorId='F01';intent.members[0].id='upper';const result=planTileStack(C,F.input(C,state,intent));assert.ok(codes(result).includes('STACK_FLOOR_SEPARATION_UNSUPPORTED'));assert.ok(result.diagnostics[0].reservationIds.includes('side'));
});
test('unchanged reservation-free unsupported neighbours at either old/new XY are not height-filtered',()=>{
 for(const kind of ['cubic','arc'])for(const x of [0,40]){const r=F.rectangle(),future=pathRecipe('future.'+kind,kind),a=F.placement(C,r,'moving',[0,0,0]),b=F.placement(C,future,'unchanged',[x,0,42.7],'F14'),state=F.initial(C,{recipes:[r,future],instances:[a,b],ownerRefs:[ref('moving')]}),intent=F.edit('move',{upserts:[upsert(a,{origin:[40,0,0]})]}),result=planTileStack(C,F.input(C,state,intent));assert.equal(result.ok,false,kind+x);assert.ok(codes(result).includes('STACK_UNSUPPORTED_AFFECTED_GEOMETRY'));assert.deepEqual(result.diagnostics[0].ownerIds,['unchanged']);}
});
test('unused and unaffected publicly supported future source remains byte-equivalent',()=>{
 const r=F.rectangle(),unused=pathRecipe('unused'),future=pathRecipe('far'),a=F.placement(C,r,'edited',[0,0,0]),b=F.placement(C,future,'far.owner',[100,0,42.7],'F14'),state=F.initial(C,{recipes:[r,unused,future],instances:[a,b],ownerRefs:[ref('edited')]}),result=check(prepareTileStack(C,F.input(C,state,F.finishIntent(C,state,'edited')))),bundle=result.preparation.next.bundle;
 assert.deepEqual(result.plan.inspection.closureOwnerIds,['edited']);for(const q of [unused,future])assert.deepEqual(bundle.recipes.find(r=>r.id===q.id),q);assert.deepEqual(bundle.layout.instances.find(v=>v.id===b.id),b);assert.equal(bundle.recipes.find(r=>r.id==='unused').shape.path.points[1][0],.123456789);
});
test('bounded collision-checked IDs retain maximum-length hostile owner IDs deterministically',()=>{
 const state=F.initial(C),intent=F.stackIntent({count:2});intent.id='r'.repeat(96);intent.members[0].id='x'.repeat(96);intent.members[1].id='y'.repeat(96);const result=check(prepareTileStack(C,F.input(C,state,intent)));assert.equal(result.plan.request.relations[0].id.length,74);assert.deepEqual(prepareTileStack(C,F.input(C,state,intent)),result);assert.deepEqual(result.plan.request.relations.map(r=>[r.a,r.b]),[[intent.members[0].id,intent.members[1].id]]);
});
test('all governing core limits fail at measured need minus one with no partial result',()=>{
 const {request,result}=start(),w=result.preparation.work;for(const [key,n]of Object.entries({maxSteps:w.steps,maxClosure:15,maxSpatialTests:w.spatialTests,maxGeometryWork:w.geometryEvaluations})){const x=clone(request);x.limits[key]=n-1;const failed=prepareTileStack(C,x);assert.equal(failed.ok,false,key);if(failed.preparation)assert.equal(failed.preparation.next,null);else assert.equal(failed.plan.request,null);}
 const x=clone(request);x.limits.maxPlannerWork=result.plan.work.plannerUnits-1;assert.ok(codes(planTileStack(C,x)).includes('STACK_PLANNER_WORK_LIMIT'));
 const y=clone(request);y.limits.maxPlannerBytes=result.plan.work.serializedBytes-1;assert.ok(codes(planTileStack(C,y)).includes('STACK_PLANNER_BYTES_LIMIT'));
});
test('malformed nested source refuses structurally instead of throwing a raw exception',()=>{
 const {request}=start();for(const value of [null,{}, {boundary:null}]){const x=clone(request);x.bundle.recipes[0].ports[0]=value;const result=planTileStack(C,x);assert.equal(result.ok,false);assert.equal(result.request,null);}
 const x=clone(request);x.intent=F.edit('malformed',{relations:{removeIds:[],upserts:[null]}});assert.equal(planTileStack(C,x).ok,false);
});
for(const ack of [true,false,'lost','throw'])test('existing public retained consumer alone owns one-use CAS and acknowledgement '+ack,()=>{
 const {state,request}=start(),plan=check(planTileStack(C,request));let writes=0,lease;const original=clone(state),token=C.tileLayoutToken(state),consumer=C.createRetainedTileConsumer({read:()=>({bundle:state.bundle,token,contextToken:state.context.contextToken,cancelled:false}),compareAndSwap(p){writes++;lease=p.canCommit;assert.equal(p.expected.hostToken,token);assert.equal(p.requestId,request.intent.id);assert.equal(p.canCommit(),true);if(ack==='throw')throw Error('injected lost acknowledgement');return ack;}});
 try{const prepared=check(consumer.prepare(plan.request)),r=consumer.apply(prepared);assert.equal(writes,1);assert.equal(r.committed,ack===true?true:ack===false?false:null);assert.equal(r.requestId,request.intent.id);if(typeof ack!=='boolean')assert.equal(r.code,'COMMIT_OUTCOME_UNKNOWN');assert.equal(lease(),false);assert.throws(()=>consumer.apply(prepared));assert.deepEqual(state,original);}finally{consumer.dispose();}
});

test('private crossing allocator skips actual digest collisions and stops at its fixed bound',async()=>{
 const {allocateCrossingId}=await import('../candidates/tile-stack/core/ids.js'),seed={id:'synthetic-occupancy'},occupied=new Set(),units={take(){}};
 for(let attempt=0;attempt<2;attempt++)occupied.add('stk.cross.'+C.tileLayoutToken({...seed,attempt}));
 assert.equal(allocateCrossingId(C.tileLayoutToken,seed,occupied,units),'stk.cross.'+C.tileLayoutToken({...seed,attempt:2}));
 for(let attempt=2;attempt<=256;attempt++)occupied.add('stk.cross.'+C.tileLayoutToken({...seed,attempt}));
 assert.throws(()=>allocateCrossingId(C.tileLayoutToken,seed,occupied,units),e=>e.code==='STACK_ID_ALLOCATION_LIMIT');
});
test('all eight D4 rectangle placements preserve authored controls and explicit native elevations',()=>{
 for(let i=0;i<8;i++){const state=F.initial(C),intent=F.stackIntent({count:2});intent.transform={quarterTurns:i%4,mirrorX:i>=4};intent.originXY=[17.123456789,-8.123456789];const result=check(prepareTileStack(C,F.input(C,state,intent)));assert.deepEqual(result.preparation.next.bundle.recipes,state.bundle.recipes);assert.deepEqual(result.preparation.next.bundle.layout.instances[1].transform,intent.transform);assert.equal(result.preparation.next.bundle.layout.instances[1].origin[2],2.12);}
});

test('a fresh stack recipe preserves unused source and unsnapped authored rectangle controls',()=>{
 const unused=pathRecipe('unused.source'),recipe=F.rectangle('fresh.deck',8.123456789,4.0000000001),state=F.initial(C,{recipes:[unused]}),intent=F.stackIntent({recipe,count:2}),r=check(prepareTileStack(C,F.input(C,state,intent)));
 assert.equal(r.plan.request.recipeUpdates.length,1);assert.deepEqual(r.plan.request.recipeUpdates[0],recipe);assert.deepEqual(r.preparation.next.bundle.recipes.find(v=>v.id===recipe.id),recipe);assert.deepEqual(r.preparation.next.bundle.recipes.find(v=>v.id===unused.id),unused);assert.equal(recipe.shape.outlines[0].segments[0].b[0],8.123456789);assert.deepEqual(state.bundle.recipes,[unused]);
});
