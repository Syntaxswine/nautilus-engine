import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import grammar from '../candidates/tile-authoring/core/c2/surface-target.schema.json' with {type:'json'};
import * as Public from '../packages/tile-authoring-core/index.js';
import {deriveTileSurfaceTarget as direct} from '../candidates/tile-authoring/core/c2/surface-target.js';
import {C,T,cp,oracle,sha,selected,input,refresh,rehashRecord,nextDefinition,sizes,unpainted,painted,stageFixture,pack} from '../tools/tile-authoring-core-c2-surface-target-fixtures.mjs';
const run=v=>C.deriveTileSurfaceTarget(T,v),code=(v,want)=>assert.throws(()=>run(v),e=>{assert.ok(e.code,e.stack);if(want)assert.equal(e.code,want);return true;}),serialized=x=>JSON.stringify(x);
const immutableResult=r=>{const visit=v=>{if(v&&typeof v==='object'){assert.equal(Object.isFrozen(v),true);for(const child of Object.values(v))visit(child);}};visit(r);};

test('genuine unpainted saved rectangle returns an eight-field seed and target/grid without inserting a surface',()=>{
 const v=input(),before=serialized(v),r=run(v);assert.equal(v.document.authoring.decorations.surfaces.length,0);assert.equal(r.state,'prospective');assert.equal(r.existingBinding,null);assert.equal(r.committable,false);assert.equal(Object.keys(r.bindingSeed).length,8);assert.equal(Object.hasOwn(r.bindingSeed,'layers'),false);assert.equal(serialized(v),before);assert.equal(r.sourceDocumentDigest,oracle(v.document));assert.deepEqual(r.bindingSeed.definition,v.selection.definition);immutableResult(r);
 assert.equal(r.work.outputBytes,Buffer.byteLength(JSON.stringify(r)));assert.ok(r.work.unitsCharged>0&&r.work.unitsCharged<1000000);
});
test('existing binding is detached and preserves layers/order/marks/current definition exactly',()=>{
 const v=input(painted),s=v.document.authoring.decorations.surfaces[0];s.layers.unshift({...cp(s.layers[0]),id:'explicit.unused.layer',order:1,label:'preserve first'});refresh(v);const before=serialized(v),r=run(v);
 assert.equal(r.state,'existing');assert.deepEqual(r.existingBinding,s);assert.deepEqual(r.existingBinding.layers.map(x=>x.order),[1,0]);assert.notEqual(r.existingBinding,s);assert.notEqual(r.surface,selected(v.document).surface);assert.equal(serialized(v),before);immutableResult(r);
 s.layers[0].label='caller mutation';selected(v.document).surface.grid.originM[0]=99;assert.equal(r.existingBinding.layers[0].label,'preserve first');assert.notEqual(r.surface.grid.originM[0],99);
});
test('independent Node SHA canonical domains match saved definition/recipe/geometry/frame/grid/binding and full document',()=>{
 const v=input(),r=run(v),{definition,owner,surface}=selected(v.document),{contentDigest,...record}=definition,{frameDigest,...frame}=surface;
 assert.equal(oracle(record),definition.contentDigest);assert.equal(oracle(definition.body.recipe),owner.contentDigest);assert.equal(T.compileTileRecipe(definition.body.recipe).contentDigest,owner.contentDigest);
 assert.equal(oracle({profile:surface.profile,frame:definition.body.recipe.frame,shape:definition.body.recipe.shape}),surface.geometryDigest);assert.equal(oracle(frame),frameDigest);assert.equal(r.grid.digest,oracle(surface.grid));
 const {definition:pin,bindingDigest,...domain}=r.bindingSeed;assert.equal(bindingDigest,oracle(domain));assert.deepEqual(r.target,{ownerId:owner.id,surfaceId:surface.id,floorId:owner.floorBindings[surface.floorSlot],bindingDigest});assert.equal(r.sourceDocumentDigest,oracle(v.document));assert.notEqual(r.sourceDocumentDigest,sha(v.document.sourceJSON));
});
test('nondefault saved source origin and authored grid are copied exactly rather than reconstructed from defaults',()=>{
 const d=nextDefinition(body=>{body.surfaces[0].originM=[2.25,-3,0];body.surfaces[0].grid.originM=[1.25,-.5];body.surfaces[0].grid.cellSizeM=[.5,2];}),v=input(d),before=serialized(v),r=run(v);
 assert.equal(T.openTileBundle(d.tileBundle,{requireResolved:true}).ok,true);assert.deepEqual(r.surface,selected(d).surface);assert.deepEqual(r.surface.originM,[2.25,-3,0]);assert.deepEqual(r.surface.grid.cellSizeM,[.5,2]);assert.equal(r.grid.digest,oracle(selected(d).surface.grid));assert.equal(serialized(v),before);
});
test('fresh owner pose changes bind full source while retaining the frozen source-local target domain',()=>{
 const a=input(),old=run(a),b=input();selected(b.document).owner.origin[0]+=3;selected(b.document).owner.transform.quarterTurns=1;refresh(b);const changed=run(b);assert.notEqual(changed.sourceDocumentDigest,old.sourceDocumentDigest);assert.equal(changed.target.bindingDigest,old.target.bindingDigest);assert.deepEqual(changed.surface,old.surface);
});
test('original sourceJSON whitespace bytes remain exact and are separately bound by raw source SHA',()=>{
 const v=input();v.document.sourceJSON+='\n';v.document.floorBinding.sourceSha256=sha(v.document.sourceJSON);refresh(v);const before=serialized(v),r=run(v);assert.equal(r.sourceDocumentDigest,oracle(v.document));assert.equal(serialized(v),before);
});
test('producer output feeds unchanged canonical surface.layers and decoration.add batch in pure planning',()=>{
 const v=input(),r=run(v),art=pack.manifest.artwork[0],layer={id:'layer.producer',order:0,label:'First mark',opacity:1,blendProfile:'source-over-linear-premultiplied-v1'},mark={id:'mark.producer',revision:1,target:r.target,layerId:layer.id,ordinal:0,graphic:{artwork:{id:art.id,revision:art.revision,contentDigest:art.contentDigest},form:'stamp',transform:{positionM:[1,1],sizeM:[1,1],rotationRad:0,mirrorU:false,pivotUV:[.2,.7]},opacity:1,tintLinearRGB:[1,1,1],mask:{kind:'grid-spans',grid:r.grid,rows:[{j:0,spans:[{i0:0,count:1}]}]},wrap:'clamp'},groupId:null};
 const x=stageFixture([{kind:'content.import',body:{pack:cp(pack),conflict:'refuse-different-content'}},{kind:'surface.layers',body:{target:r.target,layers:[layer],removedLayerMarkIds:[]}},{kind:'decoration.add',body:{chunkId:'chunk.producer',mark}}],{document:v.document}),before=serialized(x.input.document);x.input.limits={plannerUnits:1000000-r.work.unitsCharged,inputBytes:6000000-r.work.inputBytes};const p=C.planTileAuthoring(T,x.input);assert.equal(p.ok,true,JSON.stringify(p));assert.ok(p.costBounds.planning.unitsCharged+r.work.unitsCharged<=1000000);assert.deepEqual(p.targetDocument.authoring.decorations.surfaces[0],{...r.bindingSeed,layers:[layer]});assert.deepEqual(p.targetDocument.authoring.decorations.chunks[0].marks[0],mark);assert.equal(serialized(x.input.document),before);
});
test('stale full document, revision and pose all refuse without refreshing source expectations',()=>{
 for(const mutate of [v=>v.document.contentRevision++,v=>selected(v.document).owner.origin[0]++,v=>v.expectedSource.workspaceRevision--]){const v=input();mutate(v);const before=serialized(v);code(v,'SURFACE_TARGET_STALE_SOURCE');assert.equal(serialized(v),before);}
});
test('stale current definition pin refuses even when the older version still exists',()=>{
 const v=input(),current=selected(v.document),older=v.document.authoring.library.definitions.find(d=>d.id===current.definition.id&&d.revision<current.definition.revision);v.selection.definition={id:older.id,revision:older.revision,contentDigest:older.contentDigest};code(v,'SURFACE_TARGET_STALE_PIN');
 const d=nextDefinition(body=>{body.surfaces[0].grid.cellSizeM=[.5,.5];}),stale=input(d);stale.selection.definition=input().selection.definition;code(stale,'SURFACE_TARGET_STALE_PIN');
});
test('missing owner or semantic surface cannot select an implicit first mesh/surface',()=>{
 for(const key of ['ownerId','surfaceId']){const v=input();v.selection[key]='missing.explicit.id';code(v,'SURFACE_TARGET_UNSUPPORTED');}
});
test('whole-owner locks refuse prospective and existing-binding targets',()=>{
 for(const d of [unpainted,painted]){const v=input(d);selected(v.document).owner.locked=true;refresh(v);code(v,'LOCK_CONFLICT');}
});
test('public-valid world geometry, nonrectangular source and unsupported source profile explicitly refuse',()=>{
 const cases=[body=>{body.recipe.frame='world';body.recipe.allowedTransforms=[{quarterTurns:0,mirrorX:false}];},body=>{const lines=body.recipe.shape.outlines[0].segments;lines[0].a[0]-=.5;lines[0].a[1]+=.5;lines.at(-1).b=cp(lines[0].a);body.recipe.reservations[0].min[0]-=.5;},body=>{body.sourceProfile='local-level-path-v1';}];
 for(const change of cases){const d=nextDefinition(change);assert.equal(T.openTileBundle(d.tileBundle,{requireResolved:true}).ok,true);const v=input(d),before=serialized(v);code(v);assert.equal(serialized(v),before);}
});
test('unsupported saved frame, level offset, authored grid and malformed grid dimensions refuse even with fresh record hashes',()=>{
 const changes=[s=>s.axes=[[0,1,0],[1,0,0]],s=>s.normal=[1,0,0],s=>s.originM[2]=.5,s=>s.floorOffsetM=.25,s=>s.grid.profile='renderer-uv',s=>s.grid.cellSizeM[0]=0,s=>s.grid.version=2];
 for(const change of changes){const d=nextDefinition(body=>change(body.surfaces[0])),v=input(d),before=serialized(v);code(v);assert.equal(serialized(v),before);}
});
test('stale geometry/frame/grid records cannot be repaired by resealing only the enclosing record',()=>{
 for(const change of [s=>s.geometryDigest='0'.repeat(64),s=>s.frameDigest='0'.repeat(64),s=>s.grid.originM[0]++]){const d=cp(unpainted);change(selected(d).surface);rehashRecord(d);const v=input(d),before=serialized(v);code(v);assert.equal(serialized(v),before);}
});
test('complete source validation rejects unrelated bad resource closure, definitions and current instance hashes',()=>{
 const cases=[()=>{const v=input(painted);v.document.resourceRefs.pop();return refresh(v);},()=>{const v=input();v.document.authoring.library.definitions[0].body.label+='invalid';return refresh(v);},()=>{const v=input();selected(v.document).owner.contentDigest='0'.repeat(64);return refresh(v);},()=>{const v=input();v.document.floorBinding.floors[1].elevationM++;return refresh(v);}];
 for(const make of cases){const v=make(),before=serialized(v);code(v);assert.equal(serialized(v),before);}
});
test('hostile own accessors, hidden fields and symbols refuse without invoking getters',()=>{
 let calls=0;for(const locate of [v=>v,v=>v.expectedSource,v=>v.selection,v=>v.document,v=>selected(v.document).surface.grid]){
  const v=input(),o=locate(v);Object.defineProperty(o,'hostile',{enumerable:true,get(){calls++;throw Error('getter');}});code(v);assert.equal(calls,0);
 }
 for(const locate of [v=>[v,'document'],v=>[v.expectedSource,'hostDocumentDigest'],v=>[v.selection,'definition'],v=>[v.document,'sourceJSON'],v=>[selected(v.document).surface,'grid']]){const v=input(),[o,key]=locate(v);Object.defineProperty(o,key,{enumerable:true,get(){calls++;throw Error('required getter');}});code(v);assert.equal(calls,0);}
 for(const hidden of [true,false]){const v=input();Object.defineProperty(v.document,hidden?'hidden':Symbol('field'),{value:1,enumerable:!hidden});code(v);}
});
test('inherited/exotic records, sparse arrays, cycles and typed descriptors refuse',()=>{
 const cases=[v=>Object.setPrototypeOf(v.selection,{ownerId:'inherited'}),v=>delete v.document.floorBinding.floors[0],v=>{v.document.cycle=v.document;},v=>{selected(v.document).surface.grid=new Uint8Array([1,2]);}];for(const change of cases){const v=input();change(v);code(v);}
});
test('nonfinite numbers and negative zero never normalize into a valid target',()=>{
 for(const n of [NaN,Infinity,-Infinity,-0]){const v=input();selected(v.document).surface.originM[0]=n;code(v,'INVALID_NUMBER');}
});
test('only the six frozen producer limits can tighten and none can increase or become fractional',()=>{
 for(const limits of [{owners:1},{outputBytes:4000001},{plannerUnits:1000001},{depth:33},{nodes:1.5},{plannerUnits:-1}]){const v=input();v.limits=limits;code(v);}
 const v=input();v.selection.bindingDigest='0'.repeat(64);code(v);
});
for(const [name,d] of [['prospective',unpainted],['existing',painted]])test(name+' exact final output bound passes and one byte below refuses with complete returned work counted',()=>{
 const v=input(d);if(name==='existing'){v.document.authoring.decorations.surfaces[0].layers[0].label='مرحبا 🌊\n\"\\';refresh(v);}v.limits={outputBytes:4000000};const first=run(v);assert.equal(first.work.outputBytes,Buffer.byteLength(JSON.stringify(first)));v.limits.outputBytes=first.work.outputBytes;const exact=run(v);assert.equal(exact.work.outputBytes,Buffer.byteLength(JSON.stringify(exact)));assert.equal(exact.work.outputBytes,v.limits.outputBytes);v.limits.outputBytes--;code(v,'AUTHORING_OUTPUT_LIMIT');
});
test('exact actual work bound passes and one below refuses; reported producer work can tighten a later phase',()=>{
 const v=input();v.limits={plannerUnits:1000000};const first=run(v);v.limits.plannerUnits=first.work.unitsCharged;const exact=run(v);assert.equal(exact.work.unitsCharged,v.limits.plannerUnits);v.limits.plannerUnits--;code(v,'AUTHORING_WORK_LIMIT');
 const remaining=1000000-exact.work.unitsCharged,next=input();next.limits={plannerUnits:remaining};const second=run(next);assert.ok(exact.work.unitsCharged+second.work.unitsCharged<=1000000);
});
test('exact complete source byte bound passes and one below refuses without changing original source',()=>{
 const v=input(),before=serialized(v.document);v.limits={sourceBytes:sizes(v).sourceBytes};assert.equal(run(v).sourceDocumentDigest,oracle(v.document));v.limits.sourceBytes--;code(v,'AUTHORING_BYTES_LIMIT');assert.equal(serialized(v.document),before);
});
test('exact aggregate input byte bound passes and one below refuses',()=>{
 const v=input();v.limits={inputBytes:6000000};for(let i=0;i<4;i++)v.limits.inputBytes=sizes(v).inputBytes;assert.equal(sizes(v).inputBytes,v.limits.inputBytes);assert.equal(run(v).work.inputBytes,v.limits.inputBytes);v.limits.inputBytes--;code(v,'AUTHORING_INPUT_LIMIT');
});
test('exact strict input plus original map node bound passes and one below refuses',()=>{
 const v=input();v.limits={nodes:200000};v.limits.nodes=sizes(v).nodes;assert.ok(run(v).work.unitsCharged>0);v.limits.nodes--;code(v,'AUTHORING_NODE_LIMIT');
});
test('exact observed depth bound passes and one below refuses',()=>{
 const v=input();v.limits={depth:32};v.limits.depth=sizes(v).depth;assert.ok(run(v).work.unitsCharged>0);v.limits.depth--;code(v,'AUTHORING_NODE_LIMIT');
});
test('private export/types/schema match the frozen contract while public grammar/profiles and combined route stay unchanged',()=>{
 assert.equal(Object.isFrozen(grammar),true);assert.throws(()=>{grammar.$defs.SurfaceTargetInput.properties.selection.additionalProperties=true;},TypeError);
 assert.equal(direct,C.deriveTileSurfaceTarget);assert.equal(Object.hasOwn(Public,'deriveTileSurfaceTarget'),false);assert.equal(C.tileAuthoringDiscovery().combinedPlacement,false);
 const base=new URL('../candidates/tile-authoring/core/c2/',import.meta.url),read=p=>fs.readFileSync(new URL(p,base)),schema=JSON.parse(read('surface-target.schema.json')),frozen=JSON.parse(read('proposals/surface-target.schema.json'));assert.deepEqual(schema.$defs,frozen.$defs);assert.equal(sha(read('proposals/manifest.json')),'c58687ab8472618d4236941e6b5e7499cf245d2dac25e9c7f1ad402dd7839026');assert.equal(sha(read('abi/manifest.json')),'f819d85c7f2f1f1111754e1f91f1dba40f3026ef6af726f809fc677e6497af70');
});
