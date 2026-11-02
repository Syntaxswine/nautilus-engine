import test from 'node:test';
import assert from 'node:assert/strict';
import * as mapCore from '../packages/map-core/index.js';
import * as tiles from '../packages/tiles-core/index.js';
import * as examples from '../packages/tile-visuals/example.js';
import {createFloorBinding} from '../candidates/tile-stack/editor/floors.js';
import {smartTileDigest} from '../apps/editor/smart-tile/checkpoint.js';
import {validateFinishMenuProjection} from '../candidates/tile-stack/editor/finish-menu.js';
import {editorWorkspaceFixture,legacyRecoveryFixture,plannerBindingSourceFixture,preparedPlannerBindingFixture} from '../candidates/tile-stack/editor/fixtures.js';
import {capturePlannerSource} from '../candidates/tile-stack/editor/planner-seam.js';
import {validateTileStackDocument,createTileStackDocumentPolicy,createInitialCheckpointProposal,openInitialCheckpointProposal,planNewWorkspaceStorage,workspaceStorageKey} from '../candidates/tile-stack/editor/policy.js';
const deps={mapCore,tiles,examples},clone=structuredClone;
test('new v2 proposal retains exact original three-layer source and fifteen canonical tile floors',()=>{
 const d=editorWorkspaceFixture(deps),before=JSON.stringify(d),c=createInitialCheckpointProposal(deps,d);
 assert.deepEqual(openInitialCheckpointProposal(deps,JSON.stringify(c)),c);assert.equal(c.document.sourceJSON,d.sourceJSON);assert.equal(JSON.parse(d.sourceJSON).levels,3);assert.equal(c.document.tileBundle.layout.floors.length,15);assert.equal(c.document.tileBundle.layout.instances.length,0);assert.equal(JSON.stringify(d),before);
 assert.equal(JSON.parse(c.document.sourceJSON).metadata.retained.ap,0);assert.deepEqual(validateTileStackDocument(deps,c.document),c.document);
});
test('policy binds exact table/profile, original bytes, document/layout and finish identity',()=>{
 const d=editorWorkspaceFixture(deps),p=createTileStackDocumentPolicy(deps,d),ctx={floorId:'F00',mode:'manual',floorEpoch:0,providerToken:'actual-public-provider-pool-v1'},token=p.contextToken(ctx);
 for(const change of [c=>c.floorId='F14',c=>c.mode='character-follow',c=>c.floorEpoch=1,c=>c.providerToken='other-pool']){const c=clone(ctx);change(c);assert.notEqual(p.contextToken(c),token);}
 assert.throws(()=>p.contextToken({...ctx,floorId:'unknown'}));
 for(const change of [d=>d.id='other-workspace',d=>d.tileBundle.layout.id='other-layout',d=>d.finishBinding.id='other-catalogue',d=>d.finishBinding.digest='b'.repeat(64),d=>d.constraints.minimumClearanceM=1,d=>{d.sourceJSON+=' ';d.floorBinding=createFloorBinding(deps,d.sourceJSON);},d=>{d.floorBinding=createFloorBinding(deps,d.sourceJSON,'nonuniform-fifteen');d.constraints.floorProfileId=d.floorBinding.profile.id;d.tileBundle.layout.floors=d.floorBinding.floors.map(({id,elevationM})=>({id,elevationM}));}]){const next=clone(d);change(next);assert.throws(()=>p.assertDocumentTransition(d,next),e=>e.code==='STACK_WORKSPACE_BINDING');}
 const q=createTileStackDocumentPolicy(deps,editorWorkspaceFixture(deps,'nonuniform-fifteen'));assert.notEqual(p.bindingToken,q.bindingToken);assert.notEqual(q.contextToken(ctx),token);
 assert.equal(Object.hasOwn(p,'commit'),false);assert.equal(Object.hasOwn(p,'recover'),false);
});
test('bundle and next constraints form one target document and both bind live context',()=>{
 const d=plannerBindingSourceFixture(deps),before=JSON.stringify(d),p=createTileStackDocumentPolicy(deps,d),ctx={floorId:'F14',mode:'manual',floorEpoch:0,providerToken:'actual-pool'},frame=capturePlannerSource(p,tiles,d,{...ctx,cancelled:false}),prepared=preparedPlannerBindingFixture(deps,d,frame),bundle=prepared.prepared.next.bundle,constraints=prepared.plan.constraints;
 const target=p.targetDocument(d,{tileBundle:bundle,constraints});assert.equal(target.tileBundle.layout.revision,1);assert.equal(target.constraints.minimumClearanceM,2);assert.equal(target.constraints.managedRelations.find(r=>r.id==='upper-a').clearanceM,4);assert.equal(JSON.stringify(d),before);assert.notEqual(p.contextToken(ctx,target),p.contextToken(ctx,d));
 const record=p.bindTarget(d,{tileBundle:bundle,constraints});assert.equal(record.sourceDocumentDigest,smartTileDigest(d));assert.equal(record.sourceConstraintsDigest,tiles.tileLayoutToken(d.constraints));assert.equal(record.targetDocumentDigest,smartTileDigest(target));assert.equal(record.nextConstraintsDigest,tiles.tileLayoutToken(constraints));assert.throws(()=>p.targetDocument(d,{tileBundle:bundle}));assert.throws(()=>p.targetDocument(d,{tileBundle:bundle,constraints,ignored:'must refuse'}));
 assert.throws(()=>p.targetDocument(d,{tileBundle:bundle,constraints:{...constraints,floorProfileId:'foreign'}}));
 const changed=clone(d);changed.tileBundle.layout.extensions.changed='accepted-source';assert.notEqual(p.contextToken(ctx,changed),p.contextToken(ctx,d));
});
test('malformed/unknown versions, mismatched layout floors and invalid digests refuse',()=>{
 for(const change of [d=>d.finishBinding.version=2,d=>d.finishBinding.digest+='\n',d=>d.tileBundle.layout.floors[3].elevationM=6.4,d=>d.floorBinding.floors[3].source={kind:'legacy-layer',layerIndex:3},d=>d.constraints.version=2,d=>d.constraints.minimumClearanceM=0,d=>d.constraints.owners=[{instanceId:'absent',primaryReservationId:'missing'}],d=>d.constraints.managedRelations=[{id:'absent',kind:'cross',a:'x',b:'y',clearanceM:2}],d=>d.extra='drop me']){const d=clone(editorWorkspaceFixture(deps));change(d);assert.throws(()=>validateTileStackDocument(deps,d));}
});
test('finish menu requires one active version per stable ID and honest availability',()=>{
 const {finishBinding:b}=editorWorkspaceFixture(deps),row={id:'finish.brick',version:1,label:'Brick pavers',available:false,reason:'Artist binding not supplied in Gate A'},c={...b,entries:[row]};assert.deepEqual(validateFinishMenuProjection(c,b),c);
 assert.throws(()=>validateFinishMenuProjection({...c,entries:[row,{...row,version:2}]},b),e=>e.code==='STACK_FINISH_DUPLICATE_ID');assert.throws(()=>validateFinishMenuProjection({...c,entries:[{...row,reason:null}]},b));assert.throws(()=>validateFinishMenuProjection({...c,digest:'b'.repeat(64)},b));
});
test('v1 checkpoints and noninitial v2 journals refuse without migration, reset or pending clearing',()=>{
 const v1=legacyRecoveryFixture(deps),before=JSON.stringify(v1);assert.throws(()=>openInitialCheckpointProposal(deps,v1),e=>e.code==='STACK_CHECKPOINT_VERSION');assert.equal(JSON.stringify(v1),before);
 for(const change of [c=>c.journal.serial=1,c=>c.journal.receipts=[{id:'keep-original'}],c=>c.journal.pending={id:'same-request',opaque:['preserve',7]}]){const c=clone(createInitialCheckpointProposal(deps,editorWorkspaceFixture(deps)));change(c);const raw=JSON.stringify(c);assert.throws(()=>openInitialCheckpointProposal(deps,c),e=>e.code==='STACK_SHARED_CODEC_REQUIRED');assert.equal(JSON.stringify(c),raw);}
});
test('new workspace storage plan requires proven absent namespace and performs no write',()=>{
 const c=createInitialCheckpointProposal(deps,editorWorkspaceFixture(deps)),plan=planNewWorkspaceStorage(deps,c,null);assert.equal(plan.key,workspaceStorageKey(c.document.id));assert.notEqual(plan.key,'nautilus-smart-tile-editor-proof-v1');assert.equal(plan.expectedExisting,null);assert.deepEqual(JSON.parse(plan.initialJSON),c);
 for(const old of [undefined,'',JSON.stringify(c),'old v1 or pending bytes'])assert.throws(()=>planNewWorkspaceStorage(deps,c,old),e=>e.code==='STACK_NAMESPACE_OCCUPIED');
});
test('pure policy validation does not require browser, storage, clock, renderer or randomness',()=>{
 const d=editorWorkspaceFixture(deps),oldRandom=Math.random,oldNow=Date.now,descriptors=new Map();
 try{for(const key of ['window','document','localStorage']){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('No '+key);}});}Math.random=()=>{throw Error('No RNG');};Date.now=()=>{throw Error('No clock');};const p=createTileStackDocumentPolicy(deps,d);assert.deepEqual(p.validateDocument(d),d);}
 finally{Math.random=oldRandom;Date.now=oldNow;for(const [key,value]of descriptors)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
});
