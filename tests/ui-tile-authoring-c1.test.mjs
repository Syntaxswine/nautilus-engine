import test from 'node:test';
import assert from 'node:assert/strict';
import {createTileAuthoringCommands,finiteUIData,tileAuthoringExpected,tileAuthoringPin,TILE_AUTHORING_EXPECTED_FIELDS} from '../apps/editor/tile-authoring/ui/commands.js';
import {createTileAuthoringUIController,readTileAuthoringUIView,mountTileAuthoringUI} from '../apps/editor/tile-authoring/ui/panel.js';

// Every producer, sealer, authority token, document and HostService below is a
// PROTOCOL DOUBLE. These tests do not execute Core authoring or prove a native host.
const hash = c => c.repeat(64);
const copy = structuredClone;
const pin = tileAuthoringPin;
const def = (id='definition.a',revision=1) => ({kind:'nautilus-recipe-definition',version:1,id,revision,body:{label:id,recipe:{kind:'protocol-double-rectangle',id:'recipe.'+id+'.'+revision,anchors:[{id:'anchor.top'}]},sourceProfile:'local-level-region-v1',surfaces:[],requires:[],notices:[]},contentDigest:hash(String(revision))});
const preset = (definition=def()) => ({kind:'nautilus-tile-preset',version:1,id:'preset.p',revision:1,body:{label:'P',definition:pin(definition),defaultLayers:[],defaultMarks:[],requires:[],notices:[]},contentDigest:hash('a')});
function snapshot() {
  return {document:{kind:'nautilus-tile-workbench-document',version:3,id:'protocol-double-workspace',sourceJSON:'{"protocolDouble":true}',floorBinding:{kind:'nautilus-tile-stack-floor-binding',version:1,id:'floors',profile:{id:'protocol-double',version:1},sourceSha256:hash('a'),floors:[{id:'F00',label:'1',elevationM:0,source:{kind:'legacy-layer',layerIndex:0}}]},finishBinding:{id:'finishes',version:1,digest:hash('b')},tileBundle:{kind:'protocol-double-tile-bundle',recipes:[],layout:{revision:0,instances:[]}},constraints:{kind:'nautilus-stack-constraints',version:1,floorProfileId:'protocol-double',minimumClearanceM:2,owners:[],managedRelations:[]},contentRevision:0,authoring:{kind:'nautilus-tile-authoring-module',version:1,library:{kind:'nautilus-tile-content',version:1,id:'library',definitions:[],presets:[],artwork:[]},decorations:{kind:'nautilus-local-decorations',version:1,surfaces:[],chunks:[],groups:[]},ownerPins:[]},resourceRefs:[]},source:{kind:'protocol-double-read-only-source'},expected:Object.fromEntries(TILE_AUTHORING_EXPECTED_FIELDS.map(k=>[k,k==='workspaceRevision'?0:hash('a')])),hostProtocolVersion:1,missingBindings:[]};
}
const names=['recipe.create','recipe.clone','recipe.revise','preset.save','preset.place','placement.upgrade','review','apply','cancel','recover','undo','redo','save','open','retryPresentation'];
const flags=()=>Object.fromEntries(names.map(n=>[n,{enabled:!['review','apply','recover','retryPresentation'].includes(n),diagnostics:[]}]));
function uiView() {
  return {snapshot:snapshot(),presentation:{command:null,scope:'new-immutable-library-record',targetOwnerIds:[],includeSelectedDecorationDefaults:false,selectedCaptureMarkIds:[],review:null,retainedApplyRequest:null,outcome:null,actions:flags()},commandJSON:null};
}
function constructors(record=def()) {
  const calls={produce:[],seal:[]},tiles={protocolDouble:true};
  const authoring={
    createRectangleDefinition(actual,spec){assert.equal(actual,tiles);calls.produce.push(spec);return {definition:copy(record),pin:pin(record)};},
    sealTileContentRecord(actual,input){assert.equal(actual,tiles);calls.seal.push(input);if(input.contentDigest&&input.contentDigest!==hash('a'))throw Object.assign(new Error('supplied digest mismatch'),{code:'PROTOCOL_DOUBLE_DIGEST_MISMATCH'});const record={...copy(input),contentDigest:input.contentDigest??hash('a')};return {record,pin:pin(record)};}
  };
  return {tiles,authoring,calls,commands:createTileAuthoringCommands({tiles,authoring})};
}
function host(options={}) {
  let value=uiView();const observers=new Set(),calls={collect:[],prepare:[],apply:[],cancel:[],recover:[],history:[],discard:0,reads:0};
  const publish=(next=value)=>{value=next;for(const observer of [...observers])observer(value);};
  const prepared=()=>{const p=value.presentation,review={kind:'nautilus-tile-authoring-review',version:1,requestId:p.command.requestId,reviewToken:hash('c'),tilePreparation:'source-unchanged',targetDocument:value.snapshot.document};return {...value,presentation:{...p,review,retainedApplyRequest:{requestId:review.requestId,reviewToken:review.reviewToken,expectedTargetDigest:hash('d')},actions:{...p.actions,review:{enabled:false,diagnostics:[]},apply:{enabled:true,diagnostics:[]}}}};};
  const service={
    describe(){return {protocolDouble:true};},
    snapshot(){return value.snapshot;},
    query(){return Promise.resolve({protocolDouble:true});},
    async prepare(command){calls.prepare.push(command);if(options.prepare)return options.prepare(command,{publish,prepared,get view(){return value;}});publish(prepared());return value.presentation.review;},
    async apply(request){calls.apply.push(request);if(options.apply)return options.apply(request,{publish,get view(){return value;}});return {outcome:'committed',committed:true,requestId:request.requestId,presentation:'ready'};},
    cancel(token){calls.cancel.push(token);return {cancelled:true};},
    async recover(id){calls.recover.push(id);return {outcome:'unknown',committed:null,requestId:id,recoveryRequestId:id,writesFrozen:true,potentiallyCommittedResources:'retain-until-same-id-recovery'};}
  };
  const binding={
    service,
    getSnapshot(){calls.reads++;options.onRead?.({publish,get view(){return value;}});return value;},
    subscribe(observer){observers.add(observer);observer(value);return()=>observers.delete(observer);},
    collectCommand(command){calls.collect.push(command);publish({...value,commandJSON:JSON.stringify(command),presentation:{...value.presentation,command,actions:{...value.presentation.actions,review:{enabled:true,diagnostics:[]}}}});return {ok:true};},
    discardDraft(){calls.discard++;return {ok:true};},
    history:Object.fromEntries(['undo','redo','save','open','retryPresentation'].map(n=>[n,(...args)=>{calls.history.push([n,...args]);return {ok:true,checkpointJSON:n==='save'?'{"protocolDouble":true}':undefined};}]))
  };
  return {binding,calls,publish,prepared,get view(){return value;},set(next,emit=true){value=next;if(emit)publish();}};
}
const request=(kind='recipe.create')=>({snapshot:snapshot(),requestId:'request.'+kind,opId:'op.'+kind,kind,spec:{protocolDouble:true}});
const place=(id,x)=>({ownerId:id,originM:[x,0,0],floorBindings:{base:'F00'},transform:{quarterTurns:0,mirrorX:false},locked:false,anchorIds:['anchor.top'],freshMarkIds:[],freshLayerIds:[],chunkId:'chunk.'+id});
async function staged(h,c=constructors()) {
  const controller=createTileAuthoringUIController(h.binding);
  await controller.stage('recipe.create',s=>c.commands.rectangle({...request(),snapshot:s}));
  return controller;
}

test('C1 modules are inert in Node and have no C0 construction fallback',()=>{
  assert.equal(globalThis.document,undefined);
  assert.throws(()=>createTileAuthoringCommands({tiles:{},authoring:{}}),/UI_CONSTRUCTION_UNBOUND/);
  assert.throws(()=>mountTileAuthoringUI(null,null),/UI_MOUNT_BINDING_REQUIRED/);
});
test('UI data cannot call getters, drop nonfinite values or accept inherited records',()=>{
  let gets=0;const accessor={};Object.defineProperty(accessor,'x',{enumerable:true,get(){gets++;return 1;}});
  for(const value of [accessor,{x:NaN},{x:undefined},Object.create({x:1}),[,,]])assert.throws(()=>finiteUIData(value),/UI_FINITE_DATA/);
  assert.equal(gets,0);const value=finiteUIData({text:'unchanged',values:[0,false,null]});assert.ok(Object.isFrozen(value.values));
});
test('Expected is the exact twelve-field Editor capture and v2 is rejected',()=>{
  const s=snapshot(),expected=tileAuthoringExpected(s);assert.deepEqual(expected,s.expected);assert.ok(Object.isFrozen(expected));
  for(const mutate of [s=>s.document.version=2,s=>delete s.expected.resourceSetDigest,s=>s.expected.alias=hash('a'),s=>s.expected.floorProfileDigest='guess']){const s=snapshot();mutate(s);assert.throws(()=>tileAuthoringExpected(s),/UI_/);}
});
test('create/clone/revise call the supplied producer once and preserve its complete output',()=>{
  for(const kind of ['recipe.create','recipe.clone','recipe.revise']){
    const record=def('definition.b',kind==='recipe.revise'?2:1),c=constructors(record),base=def(),input={...request(kind),base,spec:{label:'B',base,derive:kind}};
    const before=copy(input),command=c.commands.rectangle(input);
    assert.equal(c.calls.produce.length,1);assert.deepEqual(input,before);assert.deepEqual(command.operations[0].body.definition,record);
    assert.deepEqual(command.expected,input.snapshot.expected);assert.equal(command.operations[0].kind,kind);assert.ok(Object.isFrozen(command.operations));
    if(kind!=='recipe.create')assert.deepEqual(command.operations[0].body.base,pin(base));else assert.equal(Object.hasOwn(command.operations[0].body,'base'),false);
  }
});
test('public producer/sealer failures refuse without repairing digests or retrying construction',()=>{
  const c=constructors();c.authoring.createRectangleDefinition=()=>{throw Error('actual producer refusal');};
  assert.throws(()=>c.commands.rectangle(request()),/producer refusal/);
  const p=preset();p.contentDigest=hash('f');assert.throws(()=>c.commands.preset({snapshot:snapshot(),requestId:'r',opId:'o',input:p}),/digest mismatch/);assert.equal(c.calls.seal.length,1);
});
test('P1 explicitly pins B1 even when another revision is selected elsewhere',()=>{
  const b1=def('definition.b',1),c=constructors(),p=preset(b1),command=c.commands.preset({snapshot:snapshot(),requestId:'request.p1',opId:'op.p1',input:p});
  assert.equal(c.calls.seal.length,1);assert.deepEqual(command.operations[0].body.preset.body.definition,pin(b1));assert.deepEqual(command.operations[0].body.preset.body.defaultMarks,[]);
  const bad=preset(b1);bad.body.defaultLayers=[{protocolDouble:true}];assert.throws(()=>c.commands.preset({snapshot:snapshot(),requestId:'r',opId:'o',input:bad}),/UI_C1_DEFAULTS_UNAVAILABLE/);
});
test('one placement command carries both explicit owners and empty default remaps',()=>{
  const c=constructors(),copies=[place('owner.one',40),place('owner.two',50)],before=copy(copies),command=c.commands.place({snapshot:snapshot(),requestId:'request.two',opId:'op.two',preset:preset(),placements:copies});
  assert.deepEqual(command.operations[0].body.placements,copies);assert.deepEqual(copies,before);assert.equal(command.operations.length,1);assert.equal(command.operations[0].body.defaults,'empty');assert.equal(c.calls.produce.length,0);
  assert.throws(()=>c.commands.place({snapshot:snapshot(),requestId:'r',opId:'o',preset:preset(),placements:[copies[0],copies[0]]}),/UI_DISTINCT_OWNERS/);
});
test('upgrade names only one owner and never supplies implicit decoration deletion',()=>{
  const c=constructors(),s=snapshot(),input={snapshot:s,requestId:'request.upgrade',opId:'op.upgrade',ownerId:'owner.one',from:def('definition.b',1),to:def('definition.b',2),anchorIds:['anchor.top']},before=copy(s);
  const op=c.commands.upgrade(input).operations[0];assert.deepEqual(op.body.ownerIds,['owner.one']);assert.deepEqual(op.body.anchorDecisions,[]);assert.deepEqual(s,before);
  s.document.authoring.decorations.chunks=[{id:'chunk',marks:[{target:{ownerId:'owner.one'}}]}];assert.throws(()=>c.commands.upgrade(input),/UI_C1_ANCHOR_DECISIONS_UNAVAILABLE/);
});
test('Stage constructs once and hands Editor the canonical command without preparing',async()=>{
  const h=host(),c=constructors(),controller=await staged(h,c);
  assert.equal(c.calls.produce.length,1);assert.equal(h.calls.collect.length,1);assert.equal(h.calls.prepare.length,0);assert.equal(h.calls.apply.length,0);
  assert.deepEqual(JSON.parse(h.view.commandJSON),h.calls.collect[0]);controller.dispose();
});
test('Review forwards the existing staged object once during repeated activation',async()=>{
  let release;const h=host({prepare:async(_c,{publish,prepared})=>{await new Promise(r=>release=r);publish(prepared());return {protocolDouble:true};}}),controller=await staged(h);
  const command=h.view.presentation.command,first=controller.review();assert.equal(h.calls.prepare.length,1);assert.strictEqual(h.calls.prepare[0],command);
  assert.equal((await controller.review()).ok,false);assert.equal(h.calls.prepare.length,1);assert.equal(h.calls.apply.length,0);release();await first;controller.dispose();
});
test('Apply forwards the exact Editor-retained request and never prepares again',async()=>{
  let release;const h=host({apply:async()=>new Promise(r=>release=r)}),controller=await staged(h);await controller.review();const retained=h.view.presentation.retainedApplyRequest,first=controller.apply();
  assert.strictEqual(h.calls.apply[0],retained);assert.equal((await controller.apply()).ok,false);assert.equal(h.calls.prepare.length,1);release({outcome:'committed',committed:true});await first;controller.dispose();
});
test('a stale displayed snapshot cannot rebuild a proposal with silently refreshed Expected',async()=>{
  const h=host(),c=constructors(),controller=createTileAuthoringUIController(h.binding),next=copy(h.view);next.snapshot.expected.authorityContextToken=hash('b');h.set(next,false);
  let built=0;const result=await controller.stage('recipe.create',s=>{built++;return c.commands.rectangle({...request(),snapshot:s});});assert.equal(result.code,'UI_DISPLAY_CHANGED');assert.equal(built,0);assert.equal(h.calls.collect.length,0);
  await controller.stage('recipe.create',s=>c.commands.rectangle({...request(),snapshot:s}));assert.equal(h.calls.collect[0].expected.authorityContextToken,hash('b'));controller.dispose();
});
test('malformed null notifications revoke actions; same-event read repair cannot grant them',async()=>{
  const h=host(),controller=await staged(h),valid=h.view;h.publish(null);assert.equal(controller.view,null);h.set(valid,false);assert.equal((await controller.review()).code,'UI_ACTION_UNAVAILABLE');assert.equal(h.calls.prepare.length,0);
  controller.refresh();await controller.review();assert.equal(h.calls.prepare.length,1);controller.dispose();
});
test('render failure revokes permission until a later successful render',async()=>{
  const h=host();let fail=false;const controller=createTileAuthoringUIController(h.binding,{onView:v=>{if(v&&fail)throw Error('display failed');}});
  await controller.stage('recipe.create',s=>constructors().commands.rectangle({...request(),snapshot:s}));fail=true;h.publish();assert.equal(controller.view,null);await controller.review();assert.equal(h.calls.prepare.length,0);
  fail=false;controller.refresh();await controller.review();assert.equal(h.calls.prepare.length,1);controller.dispose();
});
test('observer reentry during an action read cannot grant a host action',async()=>{
  let armed=false;const h=host({onRead:({publish})=>{if(armed){armed=false;publish();}}}),controller=await staged(h);armed=true;
  assert.equal((await controller.review()).code,'UI_DISPLAY_CHANGED');assert.equal(h.calls.prepare.length,0);controller.dispose();
});
test('unknown freezes every mutation even if bad action flags say enabled; recover keeps original ID',async()=>{
  const h=host(),controller=await staged(h),next=copy(h.view);next.presentation.outcome={outcome:'unknown',requestId:'original.request',committed:null,recoveryRequestId:'original.request',writesFrozen:true,potentiallyCommittedResources:'retain-until-same-id-recovery'};for(const a of Object.values(next.presentation.actions))a.enabled=true;h.publish(next);
  await controller.review();await controller.stage('recipe.create',()=>{throw Error('must not build');});await controller.history('save');await controller.apply();assert.equal(h.calls.prepare.length+h.calls.apply.length+h.calls.history.length,0);
  await controller.recover();assert.deepEqual(h.calls.recover,['original.request']);controller.dispose();
});
test('NO_CHANGE/refusal causes no automatic write, history action or reprepare',async()=>{
  const h=host({prepare:async command=>({kind:'nautilus-tile-authoring-refusal',version:1,requestId:command.requestId,ok:false,targetDocument:null,diagnostics:[{code:'NO_CHANGE',message:'unchanged',action:'Keep redo'}]})}),controller=await staged(h),before=copy(h.view.snapshot.document);
  const result=await controller.review();assert.equal(result.diagnostics[0].code,'NO_CHANGE');assert.deepEqual(h.view.snapshot.document,before);assert.equal(h.calls.apply.length+h.calls.history.length,0);assert.equal(h.calls.prepare.length,1);controller.dispose();
});
test('immutable workspace changes permanently retire the mount without cancelling borrowed services',async()=>{
  const h=host(),controller=await staged(h),original=h.view,changed=copy(original);changed.snapshot.document.id='another-workspace';h.publish(changed);h.publish(original);
  assert.equal(controller.view,null);await controller.review();assert.equal(h.calls.prepare.length+h.calls.cancel.length,0);controller.dispose();
});
test('mutable content and Expected updates preserve the binding and use a fresh visible capture',async()=>{
  const h=host(),controller=createTileAuthoringUIController(h.binding),next=copy(h.view);next.snapshot.document.contentRevision++;next.snapshot.expected.workspaceDigest=hash('b');h.publish(next);
  await controller.stage('recipe.create',s=>constructors().commands.rectangle({...request(),snapshot:s}));assert.equal(h.calls.collect.length,1);assert.equal(h.calls.collect[0].expected.workspaceDigest,hash('b'));controller.dispose();
});
test('disposing an in-flight presentation ignores late UI work and leaves the host operation alone',async()=>{
  let release;const h=host({prepare:()=>new Promise(r=>release=r)});let renders=0;const controller=createTileAuthoringUIController(h.binding,{onView:()=>renders++});
  await controller.stage('recipe.create',s=>constructors().commands.rectangle({...request(),snapshot:s}));const task=controller.review();controller.dispose();const before=renders;release({protocolDouble:true});await task;h.publish();assert.equal(renders,before);assert.equal(h.calls.cancel.length,0);
});
test('retained bytes and request identity are checked without reconstructing authority',async()=>{
  const h=host(),controller=await staged(h);const valid=copy(h.view),reordered=Object.fromEntries(Object.entries(valid.presentation.command).reverse());valid.commandJSON=JSON.stringify(reordered);assert.doesNotThrow(()=>readTileAuthoringUIView(valid));
  const invalid=copy(valid);invalid.commandJSON='{"kind":"old-alias"}';assert.throws(()=>readTileAuthoringUIView(invalid),/UI_COMMAND_BYTES_REQUIRED/);
  await controller.review();const broken=copy(h.view);broken.presentation.retainedApplyRequest.requestId='another';assert.throws(()=>readTileAuthoringUIView(broken),/UI_RETAINED_REQUEST_REQUIRED/);controller.dispose();
});
test('whole-document history and presentation retry remain borrowed Editor hooks outside HostService',async()=>{
  const h=host(),controller=createTileAuthoringUIController(h.binding);await controller.history('undo');await controller.history('redo');await controller.history('save');await controller.history('open','exact-whole-checkpoint');
  const next=copy(h.view);next.presentation.actions.retryPresentation.enabled=true;h.publish(next);await controller.history('retryPresentation');
  assert.deepEqual(h.calls.history.map(x=>x[0]),['undo','redo','save','open','retryPresentation']);assert.equal(h.calls.history[3][1],'exact-whole-checkpoint');assert.equal(h.calls.apply.length+h.calls.prepare.length,0);controller.dispose();
});

test('pending-display reentry revokes the action before any borrowed host call',async()=>{
  const h=host();let armed=false;const controller=createTileAuthoringUIController(h.binding,{onPending:busy=>{if(busy&&armed){armed=false;h.publish();}}});
  await controller.stage('recipe.create',s=>constructors().commands.rectangle({...request(),snapshot:s}));armed=true;assert.equal((await controller.review()).code,'UI_DISPLAY_CHANGED');assert.equal(h.calls.prepare.length,0);controller.dispose();
});
test('a replaced HostService permanently retires the presentation without forwarding an old review',async()=>{
  const h=host(),controller=await staged(h);await controller.review();const old=h.binding.service;h.binding.service={...old};h.publish();h.binding.service=old;h.publish();
  assert.equal(controller.view,null);await controller.apply();assert.equal(h.calls.apply.length,0);controller.dispose();
});
test('tri-state outcomes cannot be coerced or presented under the wrong state',()=>{
  for(const [outcome,committed]of [['committed',false],['rejected',null],['unknown',false]]){const view=uiView();view.presentation.outcome={outcome,committed,requestId:'r'};assert.throws(()=>readTileAuthoringUIView(view),/UI_OUTCOME_REQUIRED/);}
});
