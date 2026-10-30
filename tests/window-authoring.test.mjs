import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {blankMap,engineManifest,loadBlueprint} from '../packages/map-core/index.js';
import {FARMYARD_WINDOW_CATALOGUE,FARMYARD_WINDOW_DEFINITIONS,createFarmyardWindowHostSave,serializeFarmyardWindowHostSave} from '../packages/adapters/farmyard/windows.js';
import {queryWindowSegment,WINDOW_HOST_SERVICES,createWindowState} from '../packages/windows-core/index.js';
import * as A from '../packages/windows-authoring/index.js';
import {windowAuthoringFixture,windowAuthoringConsumer} from '../tools/fixtures/window-authoring.mjs';
const clone=structuredClone,fixture=windowAuthoringFixture;
const accepted=doc=>({text:doc.serialize(),revision:doc.snapshot.revision,history:doc.snapshot.history});
const edit=(base,change)=>{const d=clone(base);change(d);return d;};
const code=(run,expected)=>assert.throws(run,error=>error.code===expected);

test('closed authoring wrapper preserves complete unknown base data and source facts',()=>{
  const d=fixture(),source=fs.readFileSync(new URL('./fixtures/window-authoring/source-catalogue.json',import.meta.url),'utf8'),facts=JSON.parse(source);
  assert.deepEqual(FARMYARD_WINDOW_CATALOGUE.presets.map(p=>p.id),facts.presets.map(p=>p.id));
  for(const p of facts.presets){const spec=FARMYARD_WINDOW_DEFINITIONS.resolve({id:p.id});assert.equal(spec.width,p.widthM);assert.equal(spec.height,p.heightM);assert.deepEqual(spec.panes.map(v=>v.id),p.paneIds);}
  const enriched=edit(d,value=>{value.baseBlueprint.metadata.unknown={arbitrary:[null,false,17],negativeZero:-0};Object.defineProperty(value.baseBlueprint.metadata,'__proto__',{value:{safe:true},enumerable:true,writable:true});});
  const restored=A.openWindowAuthoring(A.serializeWindowAuthoring(enriched));assert.deepEqual(restored,enriched);assert.equal(Object.is(restored.baseBlueprint.metadata.unknown.negativeZero,-0),true);assert.equal(Object.hasOwn(restored.baseBlueprint.metadata,'__proto__'),true);
  assert.equal(globalThis.document,undefined);assert.equal(globalThis.window,undefined);
});

test('no closed wrapper or native reference accepts extra fields or future versions',()=>{
  const d=fixture();
  for(const change of [v=>{v.ready=true;},v=>{v.version=2;},v=>{v.definitions.version='future';},v=>{v.placements[0].underlay={};},v=>{v.placements[0].contentEpoch='old';},v=>{v.bindings[0].engineInstanceId='a'.repeat(25);},v=>{v.placements[0].id='bad\n';}])assert.throws(()=>A.openWindowAuthoring(edit(d,change)));
  code(()=>A.prepareWindowAuthoring(d,{queryRevision:null}),'AUTHORING_INVALID_NUMBER');
  assert.throws(()=>A.createWindowAuthoring({id:'a',worldId:'b',baseBlueprint:d.baseBlueprint,placements:null}));
});

test('accessors, toJSON functions, hidden data, sparse/cyclic input reject before invocation',()=>{
  const d=clone(fixture());let called=0;
  Object.defineProperty(d.baseBlueprint.metadata,'trap',{get(){called++;throw Error('executed');},enumerable:true});code(()=>A.openWindowAuthoring(d),'AUTHORING_INVALID_DATA');assert.equal(called,0);
  for(const make of [()=>{const v=clone(fixture());v.baseBlueprint.metadata.toJSON=()=>{called++;};return v;},()=>{const v=clone(fixture());Object.defineProperty(v,'hidden',{value:1});return v;},()=>{const v=clone(fixture());v.baseBlueprint.metadata.loop=v;return v;},()=>{const v=clone(fixture());v.placements=new Array(1);return v;}])assert.throws(()=>A.openWindowAuthoring(make()));
  assert.equal(called,0);
});

test('aggregate byte/node/depth and original base-map bounds are prospective',()=>{
  const d=fixture();
  code(()=>A.openWindowAuthoring(' '.repeat(8_000_001)),'AUTHORING_LIMIT');
  code(()=>A.openWindowAuthoring(edit(d,v=>{v.baseBlueprint.metadata.large='x'.repeat(4_000_001);})), 'AUTHORING_BASE_LIMIT');
  code(()=>A.openWindowAuthoring(edit(d,v=>{v.baseBlueprint.metadata.nodes=Array.from({length:8},()=>Array(65536).fill(0));})), 'AUTHORING_LIMIT');
  code(()=>A.openWindowAuthoring(edit(d,v=>{let node={};v.baseBlueprint.metadata.deep=node;for(let n=0;n<30;n++)node=node.child={};})), 'AUTHORING_LIMIT');
  assert.throws(()=>A.openWindowAuthoring(edit(d,v=>{v.baseBlueprint.width=24;})));
});

test('old extensions and nested pane authorities refuse without a migration or original loss',()=>{
  const d=fixture();
  for(const key of ['farmyardWindows','windows','windowBreaks','windowSequence','windowEvents','windowState']) {
    const candidate=edit(d,v=>{v.baseBlueprint[key]=key==='windowSequence'?0:{};}),before=JSON.stringify(candidate);
    code(()=>A.openWindowAuthoring(candidate),'AUTHORING_MIGRATION_REQUIRED');assert.equal(JSON.stringify(candidate),before);
  }
  code(()=>A.openWindowAuthoring(edit(d,v=>{v.baseBlueprint.metadata.saved={kind:'nautilus-window-pane-state',receipts:[]};})),'AUTHORING_MIGRATION_REQUIRED');
  code(()=>A.openWindowAuthoring(edit(d,v=>{v.baseBlueprint.metadata.nested={farmyardWindows:{version:1}};})),'AUTHORING_MIGRATION_REQUIRED');
});

test('native ground mapping and explicit dimensions do not treat layers as metres',()=>{
  const d=fixture(),p=d.placements[0];assert.deepEqual([p.x,p.y,p.rotation],[21,21.5,0]);
  const h=A.prepareWindowAuthoring(d),g=A.windowAuthoringGeometryProjection(h);assert.deepEqual(g.content[0].coveredEdges,['s:20:21','s:21:21','s:22:21']);
  assert.equal(g.members.find(m=>m.kind==='glass').bounds.z0,.055);
  const metres=A.windowAuthoringDimensions(20,5,'metres'),storeys=A.windowAuthoringDimensions(20,5,'storeys');assert.equal(metres.height,5);assert.equal(storeys.height,10.6);
  const tall=fixture({tall:true}),t=A.windowAuthoringGeometryProjection(A.prepareWindowAuthoring(tall));assert.equal(t.content[0].panes.length,1);assert.equal(t.content[0].solids.length,0);assert.equal(t.members.find(m=>m.kind==='glass').bounds.height,10.6);assert.equal(t.document.placements[0].id,tall.placements[0].id);
  code(()=>A.openWindowAuthoring(edit(tall,v=>{v.placements[0].z=1;})),'UNSUPPORTED_FLOOR');
  code(()=>A.windowPlacementAtEdge({id:'a',definitionId:'window.full.clear.1m',edge:'s:20:21\n'}),'AUTHORING_INVALID_EDGE');
});

test('all legacy door families and locks reject semantically including jail doors',()=>{
  const d=fixture({empty:true});
  for(const kind of ['door','door-steel-closed','door-wood-closed','doorway-concrete-open','jail-door-closed']) {
    const candidate=edit(d,v=>{v.baseBlueprint.edges={'s:20:21':kind};v.placements=[A.windowPlacementAtEdge({id:'one',definitionId:'window.full.clear.1m',edge:'s:20:21'})];v.bindings=[{placementId:'one',engineInstanceId:'view-one'}];});
    code(()=>A.openWindowAuthoring(candidate),'WINDOW_DOOR_CONFLICT');
    if(kind.endsWith('closed'))code(()=>A.openWindowAuthoring(edit(candidate,v=>{v.baseBlueprint.edgeLocks={'s:20:21':42};})),'WINDOW_DOOR_CONFLICT');
  }
});

test('place/remove keep exact underlay and single-entry undo/redo/save/reopen',()=>{
  const empty=fixture({empty:true}),doc=A.createWindowAuthoringDocument(empty),before=doc.serialize(),p=fixture().placements[0];
  assert.equal(doc.apply({kind:'place',placement:p,engineInstanceId:'one-view'}).ok,true);assert.equal(doc.snapshot.history.undo,1);assert.deepEqual(doc.snapshot.document.baseBlueprint,empty.baseBlueprint);
  const placed=doc.serialize();assert.equal(doc.undo().ok,true);assert.equal(doc.serialize(),before);assert.equal(doc.redo().ok,true);assert.equal(doc.serialize(),placed);
  assert.deepEqual(A.openWindowAuthoring(placed),doc.snapshot.document);assert.equal(doc.apply({kind:'remove',placementId:p.id}).ok,true);assert.equal(doc.snapshot.history.undo,2);assert.equal(doc.serialize(),before);
  assert.equal(doc.undo().ok,true);assert.equal(doc.serialize(),placed);
});

test('a dense complete base does not overflow the pane-only semantic projection',()=>{
  const input=clone(fixture({empty:true}));input.baseBlueprint.edges={};let count=0;
  for(let y=0;y<240;y++)for(let x=0;x<240;x++)for(const axis of ['s','e'])if(count++<65537)input.baseBlueprint.edges[axis+':'+x+':'+y]='wall';
  const doc=A.createWindowAuthoringDocument(input);assert.equal(doc.inspect().edgeFacts.length,0);assert.equal(Object.keys(doc.snapshot.document.baseBlueprint.edges).length,65537);
  assert.equal(doc.apply({kind:'place',placement:fixture().placements[0],engineInstanceId:'dense-view'}).ok,true);assert.equal(doc.inspect().edgeFacts.length,3);assert.deepEqual(A.openWindowAuthoring(doc.serialize()).baseBlueprint,input.baseBlueprint);
});

test('manual joins/dimensions and fresh copy identities each commit once without journals',()=>{
  const doc=A.createWindowAuthoringDocument(fixture({tall:true})),id=doc.snapshot.document.placements[0].id;
  assert.equal(doc.apply({kind:'configure',placementId:id,dimensions:{width:20,height:5},joins:{left:true,right:false}}).ok,true);assert.equal(doc.snapshot.history.undo,1);
  assert.equal(doc.apply({kind:'copy',placementId:id,newPlacementId:'sheet-copy',engineInstanceId:'new-visual',x:49.5,y:90.5}).ok,true);assert.equal(doc.snapshot.history.undo,2);
  const copy=doc.snapshot.document.placements[1];assert.deepEqual(copy.dimensions,{width:20,height:5});assert.deepEqual(copy.joins,{left:true,right:false});assert.notEqual(copy.id,id);
  for(const key of ['observedBroken','receipts','windowState','contentEpoch'])assert.equal(Object.hasOwn(copy,key),false);
  const before=accepted(doc);assert.equal(doc.apply({kind:'copy',placementId:id,newPlacementId:id,engineInstanceId:'other',x:49.5,y:110.5}).ok,false);assert.deepEqual(accepted(doc),before);
  assert.equal(doc.apply({kind:'copy',placementId:id,newPlacementId:'distinct',engineInstanceId:'new-visual',x:49.5,y:110.5}).ok,false);assert.deepEqual(accepted(doc),before);
});

test('native quarter turns use an explicit metre pivot and reject unsnapped results',()=>{
  const doc=A.createWindowAuthoringDocument(fixture()),id=doc.snapshot.document.placements[0].id;
  const centre=[21,21.5],pivot={x:19.5,y:21.5};
  for(let turn=1;turn<=4;turn++){assert.equal(doc.apply({kind:'quarter-turn',placementId:id,turns:1,pivot}).ok,true);assert.equal(doc.snapshot.document.placements[0].rotation,turn*90%360);assert.equal(doc.snapshot.history.undo,turn);}
  assert.deepEqual([doc.snapshot.document.placements[0].x,doc.snapshot.document.placements[0].y],centre);
  const before=accepted(doc);assert.equal(doc.apply({kind:'quarter-turn',placementId:id,turns:1,pivot:{x:21,y:21.5}}).ok,false);assert.deepEqual(accepted(doc),before);
});

test('covered base edits are protected while unrelated bounded data stays editable',()=>{
  const doc=A.createWindowAuthoringDocument(fixture()),before=accepted(doc);
  const changed=clone(doc.snapshot.document.baseBlueprint);changed.edges['s:21:21']='wall';assert.equal(doc.apply({kind:'replace-base',baseBlueprint:changed}).code,'AUTHORING_COVERED_BASE_EDGE');assert.deepEqual(accepted(doc),before);
  const metadata=clone(doc.snapshot.document.baseBlueprint);metadata.metadata.retained.ap=0;metadata.metadata.other='kept';assert.equal(doc.apply({kind:'replace-base',baseBlueprint:metadata}).ok,true);assert.equal(doc.snapshot.history.undo,1);
  const aliases=edit(fixture(),v=>{v.baseBlueprint.edges['s:20:21:0']=v.baseBlueprint.edges['s:20:21'];});code(()=>A.openWindowAuthoring(aliases),'AUTHORING_INVALID_BASE');
});

test('native edge occupants refuse without guessing their kind or live actor shape',()=>{
  const d=fixture(),occupied=edit(d,v=>{v.baseBlueprint.interactables=[{id:'controller',kind:'custom',edge:'s:20:21'}];});
  code(()=>A.openWindowAuthoring(occupied),'AUTHORING_EDGE_OCCUPIED');
  const other=edit(occupied,v=>{v.baseBlueprint.interactables[0].edge='s:30:31';});assert.deepEqual(A.openWindowAuthoring(other).baseBlueprint.interactables,other.baseBlueprint.interactables);
});

test('upper-base data stays saveable but cannot be handoff-ready by treating a layer as height',()=>{
  const d=edit(fixture(),v=>{v.baseBlueprint.upper[0]['20,20']='floor';});
  const p=A.prepareWindowAuthoring(d);assert.equal(A.windowAuthoringReadiness(p).saveable,true);assert.equal(A.windowAuthoringReadiness(p).handoff.code,'AUTHORING_UNSUPPORTED_BASE_HEIGHT');
  assert.equal(A.windowAuthoringCompatibility(p,windowAuthoringConsumer({bound:true})).ok,false);assert.deepEqual(A.openWindowAuthoring(A.serializeWindowAuthoring(d)).baseBlueprint.upper,d.baseBlueprint.upper);
});

test('history budgets stay combined after asymmetric authoring undo',()=>{
  const doc=A.createWindowAuthoringDocument(fixture({empty:true}),{maxHistoryEntries:3,maxHistoryBytes:1_000_000}),p=fixture().placements[0];
  doc.apply({kind:'place',placement:p,engineInstanceId:'one-view'});const base=clone(doc.snapshot.document.baseBlueprint);base.metadata.large='x'.repeat(700_000);
  assert.equal(doc.apply({kind:'replace-base',baseBlueprint:base}).ok,true);assert.equal(doc.undo().ok,true);
  assert.equal(doc.snapshot.history.bytes,0);assert.equal(doc.snapshot.history.redo,0);assert.equal(doc.snapshot.history.undo,0);assert.equal(doc.snapshot.document.placements.length,1);
});

test('handoff validates the retained complete save without replacing runtime authority',()=>{
  // An explicit native host test fixture, not a portable-map-to-game adapter.
  const d=edit(fixture(),v=>{v.baseBlueprint.edges={};}),p=A.prepareWindowAuthoring(d),geometry=A.windowAuthoringGeometry(p);
  const state=createWindowState(geometry,{id:'existing-pane-authority',contentEpoch:'existing-epoch',broken:{}});
  const source={solo:{version:2},revision:17,seed:0,elapsed:19.75,map:Array.from({length:240},()=>Array(240).fill('yard')),queue:[{x:8,y:14.5}],log:['retained'],units:[{id:7,team:'squad',x:8,y:15.5,hp:37,ap:0,stamina:.125,maxHp:100,maxAp:12,maxStamina:1,ammo:{pistol:3},pack:[{id:'retained-item'}]}],windows:clone(d.placements),interactables:[],edges:{},windowBreaks:{},windowSequence:0,seen:new Set(['7,8']),visible:new Set(['7,8']),detected:new Set([7,'7']),future:{timer:.375,order:[7,'7']}};
  const store=createFarmyardWindowHostSave(state,source,{sequenceOrigin:0}),before=serializeFarmyardWindowHostSave(store,{definitions:FARMYARD_WINDOW_DEFINITIONS}),calls={read:0,context:0,validate:0,writes:0};
  const forbidden=()=>{calls.writes++;throw Error('Binding must never commit or publish.');};
  const services={
    'fixed-window-definitions-v1':{version:1,definitions:FARMYARD_WINDOW_DEFINITIONS},
    'complete-window-query-composition-v1':{version:1,context(){calls.context++;return 'a'.repeat(64);},capture:forbidden},
    'confirmed-impact-authority-v1':{version:1,confirm:forbidden},
    'atomic-window-context-commit-v1':{version:1,read(){calls.read++;return store;},compareAndSwap:forbidden},
    'window-geometry-invalidation-v1':{version:1,invalidate:forbidden,publish:forbidden},
    'complete-window-save-staging-v1':{version:1,validate(){calls.validate++;return true;}}
  };
  for(const key of Object.keys(services)){const missing={...services};delete missing[key];assert.throws(()=>A.bindWindowAuthoringHandoff(p,windowAuthoringConsumer({bound:true}),missing));}
  const bound=A.bindWindowAuthoringHandoff(p,windowAuthoringConsumer({bound:true}),services);assert.equal(bound.adopted,false);assert.deepEqual(calls,{read:1,context:1,validate:1,writes:0});assert.deepEqual(JSON.parse(bound.authoring),d);assert.equal(bound.connection.manifest().capabilities.length,7);bound.connection.dispose();
  assert.equal(serializeFarmyardWindowHostSave(store,{definitions:FARMYARD_WINDOW_DEFINITIONS}),before);assert.equal(store.windowState.contentEpoch,'existing-epoch');assert.equal(store.source.units[0].ap,0);assert.equal(calls.writes,0);
  const refusing={...services,'complete-window-save-staging-v1':{version:1,validate:()=>false}};assert.throws(()=>A.bindWindowAuthoringHandoff(p,windowAuthoringConsumer({bound:true}),refusing));assert.equal(serializeFarmyardWindowHostSave(store,{definitions:FARMYARD_WINDOW_DEFINITIONS}),before);
});

test('failed open/edit/preparation preserve redo and old async candidates cannot accept',async()=>{
  const doc=A.createWindowAuthoringDocument(fixture()),id=doc.snapshot.document.placements[0].id;doc.apply({kind:'move',placementId:id,x:31,y:31.5});doc.undo();
  const before=accepted(doc),old=doc.prepare({kind:'move',placementId:id,x:41,y:41.5});assert.equal(old.ok,true);
  assert.equal(doc.apply({kind:'configure',placementId:id,dimensions:{width:2,height:8}}).ok,false);assert.deepEqual(accepted(doc),before);assert.equal(doc.accept(old.candidate).code,'AUTHORING_STALE_PREPARATION');
  assert.equal(doc.open('{bad').ok,false);assert.deepEqual(accepted(doc),before);
  const a=doc.prepare({kind:'move',placementId:id,x:51,y:51.5}),b=doc.prepare({kind:'move',placementId:id,x:61,y:61.5});assert.equal(doc.accept(b.candidate).ok,true);
  const current=accepted(doc);await Promise.resolve();assert.equal(doc.accept(a.candidate).ok,false);assert.deepEqual(accepted(doc),current);
});

test('definition/context changes invalidate tickets without rewriting live authoring',()=>{
  const doc=A.createWindowAuthoringDocument(fixture()),before=accepted(doc),ticket=doc.prepare({kind:'move',placementId:'native-pane-a',x:31,y:31.5});
  doc.setContext('new-approved-context');assert.equal(doc.snapshot.preparationCurrent,false);assert.equal(doc.snapshot.prepared,null);assert.equal(doc.accept(ticket.candidate).ok,false);assert.deepEqual(accepted(doc),before);
  const rebuild=doc.prepareRebuild();assert.equal(doc.accept(rebuild.candidate).ok,true);assert.equal(doc.snapshot.preparationCurrent,true);assert.equal(doc.snapshot.revision,before.revision);assert.deepEqual(doc.snapshot.history,before.history);
});

test('authoring/preview/host readiness and actual schema/capability negotiation stay separate',()=>{
  const p=A.prepareWindowAuthoring(fixture()),ready=A.windowAuthoringReadiness(p),empty=A.prepareWindowAuthoring(fixture({empty:true}));
  assert.equal(ready.saveable,true);assert.equal(ready.preview.ready,false);assert.equal(ready.handoff.ready,false);
  assert.equal(A.windowAuthoringCompatibility(p,engineManifest()).ok,false);assert.equal(A.windowAuthoringCompatibility(p,windowAuthoringConsumer()).ok,false);
  assert.equal(A.windowAuthoringCompatibility(p,windowAuthoringConsumer({bound:true})).ok,true);
  const requirements=A.windowAuthoringRequirements(p);assert.equal(requirements.windows.required.length,7);assert.equal(A.windowAuthoringRequirements(empty).windows.required.length,0);
  assert.throws(()=>A.bindWindowAuthoringHandoff(p,windowAuthoringConsumer({bound:true}),Object.fromEntries(WINDOW_HOST_SERVICES.map(s=>[s.id,{version:1}]))));
});

test('complete retained base requirements cannot be omitted by a pane-capable consumer',()=>{
  const d=edit(fixture(),v=>{v.baseBlueprint.slopedRoofs={version:1,roofs:[{id:'roof-1',x:150,y:150,width:6,depth:8,z:1,style:'gable',axis:'x',pitch:35,overhang:.3,material:'slate',seed:7}]};}),p=A.prepareWindowAuthoring(d),consumer=windowAuthoringConsumer({bound:true});
  const requirements=A.windowAuthoringRequirements(p),roof=requirements.base.required.find(r=>/roof/.test(r.id));assert.ok(roof);
  assert.equal(A.windowAuthoringCompatibility(p,consumer).ok,true);consumer.capabilities=consumer.capabilities.filter(c=>c.id!==roof.id);
  const result=A.windowAuthoringCompatibility(p,consumer);assert.equal(result.ok,false);assert.equal(result.scopes.authoring.ok,true);assert.equal(result.scopes.windows.ok,true);assert.equal(result.scopes.base.ok,false);
  assert.deepEqual(A.openWindowAuthoring(A.serializeWindowAuthoring(d)).baseBlueprint,d.baseBlueprint);
});

test('installed support metadata links the schema/guide and fixed facts keep their original hashes',()=>{
  const card=A.windowAuthoringUsageCard(),request=JSON.parse(fs.readFileSync(new URL(card.registration))),dependencies=JSON.parse(fs.readFileSync(new URL('../docs/reviews/window-authoring/dependencies.json',import.meta.url)));
  assert.equal(card.schemaUri,A.WINDOW_AUTHORING_CONTRACT.schemaUri);assert.equal(JSON.parse(fs.readFileSync(new URL(card.schema))).$id,card.schemaUri);assert.match(fs.readFileSync(new URL(card.guide),'utf8'),/adopted:false/);assert.equal(request.engineCapability,null);
  for(const file of dependencies.sourceFacts.files){const bytes=fs.readFileSync(new URL('../'+file.target,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
  const fragment=JSON.parse(fs.readFileSync(new URL('./fixtures/window-authoring/source-underlay.json',import.meta.url)));assert.deepEqual(fixture().baseBlueprint.edges,fragment.beforeEdges);assert.deepEqual(fragment.afterRemoveEdges,fragment.beforeEdges);
});

test('nonempty legacy/block/generation export refuses; empty export retains every base value',()=>{
  const p=A.prepareWindowAuthoring(fixture());for(const target of ['map','block','generation','unknown'])code(()=>A.exportWindowAuthoringLegacy(p,{target}),'AUTHORING_EXPORT_REFUSED');
  const d=fixture({empty:true}),text=A.exportWindowAuthoringLegacy(d);assert.deepEqual(JSON.parse(text),d.baseBlueprint);assert.deepEqual(loadBlueprint(text),d.baseBlueprint);
  code(()=>A.exportWindowAuthoringLegacy(d,{target:null}),'AUTHORING_EXPORT_REFUSED');
});

test('plain projection is detached and only actual legacy-provenance wall boxes are clipped',()=>{
  const p=A.prepareWindowAuthoring(fixture()),g=A.windowAuthoringGeometryProjection(p),kind=g.content[0].panes[0].paneId;g.document.placements[0].id='mutated';assert.equal(A.windowAuthoringGeometryProjection(p).document.placements[0].id,'native-pane-a');
  const wall={provider:'farmyard-legacy-wall-v1',edge:'s:20:21',floorId:'ground',bounds:{x0:19.44,x1:20.56,y0:21.42,y1:21.58,z0:0,height:2}};assert.equal(A.clipWindowAuthoringLegacyWall(p,wall),null);
  code(()=>A.clipWindowAuthoringLegacyWall(p,{...wall,provider:'native-wall'}),'UNSUPPORTED_LEGACY_WALL');
  const query=queryWindowSegment(A.windowAuthoringGeometry(p),{purpose:'projectile',floorId:'ground',from:{x:21,y:24,h:1},to:{x:21,y:19,h:1}});assert.equal(query.nearest.paneId,kind);
  assert.throws(()=>queryWindowSegment(g,{purpose:'sight',floorId:'ground',from:{x:0,y:0,h:1},to:{x:1,y:1,h:1}}));
});
