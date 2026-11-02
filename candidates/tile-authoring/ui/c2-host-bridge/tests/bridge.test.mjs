import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,complete,painted,pin,metadata,sourceExpected,selection,inspectSurface,formFor,ids,basis,T,produceSelectedBuiltinPack,stageOperations,Budget} from './fixture.mjs';
import {createC2HostBridge} from '../bridge.mjs';
import {canonicalMaskData} from '../query.mjs';
import {graphicFromOriginalDefaults,patchMarkData,assembleOverlayCommandData} from '../data.mjs';
import {createBuiltinByteOwner} from '../vendor/bytesd8/root/candidates/tile-authoring/host/builtin-dependency-prefix/index.mjs';
const refused=(r,code)=>{assert.equal(r.status,'refused',JSON.stringify(r));if(code)assert.equal(r.diagnostics[0].code,code);};
const update=(h,changes=[{field:'opacity',value:.4}])=>({kind:'decoration.update',markId:'mark.seed.0',expectedRevision:1,changes});

test('component projection preserves complete source, all native heights, empty content and actual C1 gates',t=>{
 const h=harness();t.after(()=>h.dispose());const before=structuredClone(h.document),r=h.bridge.getSnapshot();
 assert.deepEqual(r.snapshot.document,before);assert.equal(r.snapshot.document.floorBinding.floors[1].elevationM,2.12);assert.equal(r.snapshot.document.floorBinding.floors[14].elevationM,29.68);
 assert.equal(r.overlay.palette.length,30);assert.equal(r.overlay.palette.filter(x=>x.origin==='workspace').length,0);assert.equal(r.overlay.palette.filter(x=>x.availability!=='unavailable').length,0);assert.equal(r.overlay.availability,'inspect-only');
 for(const name of ['firstMark','review','apply','content.import','decoration.add'])assert.equal(r.overlay.gates[name].enabled,false);
 assert.equal(h.allocationCalls,0);assert.deepEqual(h.document,before);assert.ok(Object.isFrozen(r.snapshot.document));assert.ok(!Object.isFrozen(h.document));
});

test('actual pure 0597 target is prospective with exact current revision and native floor, grants no editing',t=>{
 const h=harness();t.after(()=>h.dispose());const r=h.selectSurface(),d=h.document,target=inspectSurface(d,sourceExpected(d),selection(d));
 assert.equal(r.overlay.selection.bindingState,'prospective');assert.deepEqual(r.overlay.selection.target,target.target);assert.deepEqual(r.overlay.selection.grid,target.grid);assert.deepEqual(r.overlay.selection.frame,target.surface);
 assert.equal(target.committable,false);assert.equal(r.overlay.selection.pose.definition.revision,2);assert.equal(r.overlay.availability,'inspect-only');assert.equal(d.authoring.decorations.surfaces.length,0);
});

test('actual public 30 defaults retain 29 stamp + 1 detail and exact original Pins',()=>{
 const records=metadata.listSharedArtwork();assert.equal(records.length,30);assert.equal(records.filter(r=>metadata.sharedArtworkDefaults(pin(r)).form==='stamp').length,29);
 for(const r of records){const p=pin(r),f=formFor(p),g=graphicFromOriginalDefaults(f,[],()=>{throw Error('Untouched mask');});assert.deepEqual(g,metadata.sharedArtworkDefaults(p));assert.deepEqual(g.artwork,p);}
 assert.throws(()=>metadata.sharedArtworkDefaults({...pin(records[0]),revision:2}));
});

test('first-mark data helper includes one chosen complete d8 pack, then layers/add; no all30 adoption',()=>{
 const d=complete(),p=pin(metadata.listSharedArtwork()[0]),target=inspectSurface(d,sourceExpected(d),selection(d)),offer=produceSelectedBuiltinPack(T,{document:d,basis:basis(d),selected:p,metadata}),form=formFor(p),graphic=graphicFromOriginalDefaults(form,[],m=>m);
 const command=assembleOverlayCommandData({read:{snapshot:{expected:sourceExpected(d)},overlay:{selection:{marks:[]}}},form,target:target.target,graphic,layers:[{id:null,order:0,label:'Artwork',opacity:1,blendProfile:'source-over-linear-premultiplied-v1'}],prefix:[{kind:'content.import',body:{pack:offer.pack,conflict:'refuse-different-content'}}]},ids({operations:3,layers:1,marks:1,chunks:1}));
 assert.deepEqual(command.operations.map(o=>o.kind),['content.import','surface.layers','decoration.add']);assert.deepEqual(command.expected,sourceExpected(d));assert.equal(command.operations[0].body.pack.manifest.artwork.length,1);assert.deepEqual(command.operations[0].body.pack.manifest.artwork[0],metadata.sharedArtwork(p));
 const local=stageOperations(T,d,command,{},new Budget());assert.equal(local.authoring.library.artwork.length,1);assert.equal(d.authoring.library.artwork.length,0);assert.equal(local.authoring.decorations.surfaces.length,1);assert.equal(local.authoring.decorations.chunks[0].marks.length,1);
 // Local pure reducer data, not Host authority, native preparation or Apply.
});

test('retained first-mark data has exactly layers/add and no import',()=>{
 const d=painted();d.authoring.decorations={...d.authoring.decorations,surfaces:[],chunks:[]};const p=pin(d.authoring.library.artwork[0]),target=inspectSurface(d,sourceExpected(d),selection(d)),form=formFor(p,'retained');
 const result=assembleOverlayCommandData({read:{snapshot:{expected:sourceExpected(d)},overlay:{selection:{marks:[]}}},form,target:target.target,graphic:metadata.sharedArtworkDefaults(p),layers:[{id:null,order:0,label:'Retained',opacity:1,blendProfile:'source-over-linear-premultiplied-v1'}]},ids({operations:2,layers:1,marks:1,chunks:1}));
 assert.deepEqual(result.operations.map(o=>o.kind),['surface.layers','decoration.add']);assert.deepEqual(result.operations[1].body.mark.graphic.artwork,p);
});

test('untouched UI placeholder cannot replace exact defaults; touched values are explicit',()=>{
 const p=pin(metadata.listSharedArtwork()[0]),f=formFor(p);f.graphic.transform.rotationRad=.25;
 assert.throws(()=>graphicFromOriginalDefaults(f,[],m=>m),{code:'C2_DEFAULT_FIELDS_UNBOUND'});const g=graphicFromOriginalDefaults(f,['rotationRad'],m=>m);assert.equal(g.transform.rotationRad,.25);assert.deepEqual(g.transform.sizeM,metadata.sharedArtworkDefaults(p).transform.sizeM);
 assert.throws(()=>graphicFromOriginalDefaults(f,['rotationRad','rotationRad'],m=>m),{code:'C2_FORM_TOUCH_UNBOUND'});
});

test('pre-command first-mark refuses missing byte owner without attempt or ID allocation',t=>{
 const h=harness();t.after(()=>h.dispose());h.selectSurface();const p=pin(metadata.listSharedArtwork()[0]);const r=h.select({kind:'artwork',artwork:p}),f=h.touch(formFor(p));
 refused(h.bridge.overlayPorts.constructOverlayCommand(r,f),'C2_BUILTIN_BYTE_OWNER_UNBOUND');assert.equal(h.allocationCalls,0);assert.equal(h.document.authoring.library.artwork.length,0);
});

test('real accepted d8 owner stays unbound without actual byte reader; metadata never enables UI',async t=>{
 const h=harness();t.after(()=>h.dispose());const owner=createBuiltinByteOwner({tiles:T,metadata,sourceOwner:h.bridge.sourceOwner});h.bridge.pairBuiltinOwner(owner);
 h.selectSurface();const p=pin(metadata.listSharedArtwork()[0]),r=h.select({kind:'artwork',artwork:p});
 const bytes=await owner.acquireBuiltinBytes(r,p);assert.equal(bytes.status,'refused');assert.equal(owner.diagnostics().browserWideMeter,'UNBOUND');assert.equal(owner.diagnostics().native,false);assert.equal(r.overlay.gates.firstMark.enabled,false);
 refused(h.bridge.overlayPorts.constructOverlayCommand(r,h.touch(formFor(p))),'C2_BUILTIN_BYTE_OWNER_UNBOUND');assert.equal(h.allocationCalls,0);
});

test('byte pairing is once before any public read, and actual issued read is required for source scope',t=>{
 const h=harness();t.after(()=>h.dispose());const r=h.bridge.getSnapshot();assert.ok(h.bridge.sourceOwner.resolve(r));assert.equal(h.bridge.sourceOwner.resolve(structuredClone(r)),null);
 assert.throws(()=>h.bridge.pairBuiltinOwner(createBuiltinByteOwner({tiles:T,metadata,sourceOwner:h.bridge.sourceOwner})),{code:'C2_BYTE_PAIR_ONCE'});
});

test('data-only update preserves exact target, radians, pivots, Pin and mask; allocates once despite live gates false',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());const r=h.selectMark(),old=r.overlay.selection.selectedMark,before=structuredClone(h.document),result=h.bridge.overlayPorts.constructOverlayCommand(r,update(h));
 assert.equal(r.overlay.gates['decoration.update'].enabled,false);assert.equal(result.status,'constructed',JSON.stringify(result));assert.equal(result.route,'appearance-edit');assert.equal(h.allocationCalls,1);
 const mark=result.command.operations[0].body.replacement,wanted=structuredClone(old);wanted.revision++;wanted.graphic.opacity=.4;assert.deepEqual(mark,wanted);assert.deepEqual(result.command.expected,r.snapshot.expected);assert.deepEqual(h.document,before);assert.equal(r.overlay.gates.apply.enabled,false);
});

test('patch helper preserves untouched complete mark data and refuses stale/grouped revisions',()=>{
 const d=painted(),mark=d.authoring.decorations.chunks[0].marks[0],f=update(null),next=patchMarkData(mark,f,m=>m);assert.equal(next.graphic.transform.rotationRad,.234567);assert.deepEqual(next.graphic.transform.pivotUV,[.31,.72]);assert.deepEqual(next.graphic.mask,mark.graphic.mask);
 assert.throws(()=>patchMarkData(mark,{...f,expectedRevision:2},m=>m),{code:'C2_MARK_REVISION'});assert.throws(()=>patchMarkData({...mark,groupId:'group.test'},f,m=>m),{code:'C2_MARK_REVISION'});
});

test('explicit erase produces one canonical operation and preserves source',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());const r=h.selectMark(),f={kind:'decoration.remove',markIds:['mark.seed.0']},result=h.bridge.overlayPorts.constructOverlayCommand(r,f);
 assert.equal(result.status,'constructed');assert.deepEqual(result.command.operations[0].body,{markIds:['mark.seed.0'],groupPolicy:'preserve-whole-group'});assert.equal(h.document.authoring.decorations.chunks[0].marks.length,1);assert.equal(h.allocationCalls,1);
});

test('layer removal requires explicit complete deleted marks before allocating',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());let r=h.selectSurface(),f={kind:'surface.layers',layers:[],removedLayerMarkIds:[]};refused(h.bridge.overlayPorts.constructOverlayCommand(r,f),'C2_REMOVED_MARKS_REQUIRED');assert.equal(h.allocationCalls,0);
 const result=h.bridge.overlayPorts.constructOverlayCommand(r,{...f,removedLayerMarkIds:['mark.seed.0']});assert.equal(result.status,'constructed');assert.equal(result.command.operations[0].body.layers.length,0);assert.deepEqual(result.command.operations[0].body.removedLayerMarkIds,['mark.seed.0']);assert.equal(h.allocationCalls,1);
});

test('new layer IDs allocated once, retained layer IDs and contiguous complete order preserved',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());const r=h.selectSurface(),value=r.overlay.selection.layers[0].value,f={kind:'surface.layers',layers:[{kind:'existing',value},{kind:'new',order:1,label:'Second',opacity:.5}],removedLayerMarkIds:[]};
 const out=h.bridge.overlayPorts.constructOverlayCommand(r,f);assert.equal(out.status,'constructed');assert.deepEqual(out.command.operations[0].body.layers[0],value);assert.match(out.command.operations[0].body.layers[1].id,/^layer.allocated/);assert.equal(h.allocationCalls,1);
});

test('mask query creates sorted exact-grid spans and cannot grant editing credit',()=>{
 const d=complete(),target=inspectSurface(d,sourceExpected(d),selection(d));assert.deepEqual(canonicalMaskData({kind:'grid-cells',cells:[{i:3,j:2},{i:1,j:0},{i:2,j:0},{i:0,j:2}]},target),{kind:'grid-spans',grid:target.grid,rows:[{j:0,spans:[{i0:1,count:2}]},{j:2,spans:[{i0:0,count:1},{i0:3,count:1}]}]});
 assert.throws(()=>canonicalMaskData({kind:'grid-cells',cells:[{i:0,j:0},{i:0,j:0}]},target),{code:'C2_MASK_DUPLICATE'});
 assert.throws(()=>canonicalMaskData({kind:'grid-cells',cells:Array.from({length:257},(_,j)=>({i:0,j}))},target));
});

for(const [name,form,code] of [
 ['stale revision',{kind:'decoration.update',markId:'mark.seed.0',expectedRevision:2,changes:[{field:'opacity',value:.5}]},'C2_MARK_REVISION'],
 ['duplicate changes',{kind:'decoration.update',markId:'mark.seed.0',expectedRevision:1,changes:[{field:'opacity',value:.5},{field:'opacity',value:.6}]},'C2_MARK_REVISION'],
 ['foreign erase',{kind:'decoration.remove',markIds:['foreign']},'C2_ERASE_SCOPE'],
 ['duplicate mask',{kind:'decoration.update',markId:'mark.seed.0',expectedRevision:1,changes:[{field:'mask',value:{kind:'grid-cells',cells:[{i:0,j:0},{i:0,j:0}]}}]},'C2_MASK_DUPLICATE'],
 ['nonfinite field',{kind:'decoration.update',markId:'mark.seed.0',expectedRevision:1,changes:[{field:'opacity',value:NaN}]},null]
])test('invalid '+name+' refused before ID allocation',t=>{const h=harness({document:painted()});t.after(()=>h.dispose());const r=h.selectMark();refused(h.bridge.overlayPorts.constructOverlayCommand(r,form),code);assert.equal(h.allocationCalls,0);});

test('copies, exact copied Basis and foreign constructor reads do not grant permission',t=>{
 const h=harness({document:painted()}),other=harness({document:painted()});t.after(()=>{h.dispose();other.dispose();});const r=h.selectMark(),foreign=other.selectMark();
 for(const read of [structuredClone(r),{...r,overlay:{...r.overlay,basis:r.overlay.basis}},foreign])refused(h.bridge.overlayPorts.constructOverlayCommand(read,update(h)),'C2_FOREIGN_READ');assert.equal(h.allocationCalls,0);
});

test('published ABA invalidates original read even when complete source bytes return to A',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());const a=structuredClone(h.document),r=h.selectMark(),b=structuredClone(a);b.contentRevision++;h.setDocument(b);h.setDocument(a);
 refused(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),'C2_READ_STALE');assert.equal(h.allocationCalls,0);
});

test('unpublished source mutation cannot refresh original Expected behind caller',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());const r=h.selectMark(),next=structuredClone(h.document);next.contentRevision++;h.setDocument(next,{notify:false});refused(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),'C2_READ_STALE');assert.equal(h.allocationCalls,0);
});

test('selection ABA invalidates original read',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());const r=h.selectMark();h.select({kind:'surface',ownerId:'owner.two',surfaceId:'top'});h.selectMark();refused(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),'C2_READ_STALE');assert.equal(h.allocationCalls,0);
});

test('allocator callback invalidation yields preserving refusal after one allocation, no retry',t=>{
 let h;h=harness({document:painted(),idHook:()=>h.emit()});t.after(()=>h.dispose());const r=h.selectMark();refused(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),'C2_READ_STALE');assert.equal(h.allocationCalls,1);assert.equal(h.document.authoring.decorations.chunks[0].marks[0].revision,1);
});

test('colliding scoped layer ID refused and never silently reuses source world identity',t=>{
 const h=harness({document:painted(),idHook:(ids)=>{ids.layerIds[0]='layer.seed.0';}});t.after(()=>h.dispose());const r=h.selectSurface(),value=r.overlay.selection.layers[0].value;
 refused(h.bridge.overlayPorts.constructOverlayCommand(r,{kind:'surface.layers',layers:[{kind:'existing',value},{kind:'new',order:1,label:'Second',opacity:1}],removedLayerMarkIds:[]}),'C2_FRESH_IDS_REQUIRED');assert.equal(h.allocationCalls,1);
});

test('borrowed method replacement permanently retires connection, restoring bytes cannot revive it',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());const r=h.selectMark(),original=h.sourceOwner.isCurrent;h.sourceOwner.isCurrent=()=>true;
 refused(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),'C2_CONNECTION_RETIRED');h.sourceOwner.isCurrent=original;refused(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),'C2_CONNECTION_RETIRED');assert.equal(h.allocationCalls,0);
});

test('changing drawing floor clears unsupported current-floor selection without migrating source',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());h.selectMark();h.floor.state.selectedId='F01';h.emit();const r=h.bridge.getSnapshot();assert.equal(r.overlay.basis.floorId,'F01');assert.equal(r.overlay.selection,null);assert.equal(h.document.authoring.decorations.surfaces[0].floorId,'F00');
});

test('locked owner preserves all data with no constructor allocation',t=>{
 const d=painted();d.tileBundle.layout.instances[0].locked=true;const h=harness({document:d});t.after(()=>h.dispose());const r=h.selectSurface();assert.equal(r.overlay.selection.pose.locked,true);refused(h.bridge.overlayPorts.constructOverlayCommand(r,{kind:'decoration.remove',markIds:['mark.seed.0']}),'C2_SURFACE_UNSUPPORTED');assert.equal(h.allocationCalls,0);assert.equal(h.document.authoring.decorations.chunks[0].marks.length,1);
});

test('unsupported source group data stays present; no ungrouping or allocation',t=>{
 const d=painted();d.authoring.decorations.groups.push({id:'group.unsupported-fixture',floorId:'F00',memberMarkIds:['mark.seed.0']});const h=harness({document:d});t.after(()=>h.dispose());const r=h.selectSurface();assert.equal(r.overlay.groupsPresent,true);assert.deepEqual(r.overlay.selection.groups,d.authoring.decorations.groups);refused(h.bridge.overlayPorts.constructOverlayCommand(r,{kind:'decoration.remove',markIds:['mark.seed.0']}),'C2_SURFACE_UNSUPPORTED');assert.equal(h.allocationCalls,0);assert.deepEqual(h.document,d);
});

test('reentrant refusals cannot clear outer construction lock or allow a second allocation',t=>{
 let h,r,nesting=false;const nested=[];h=harness({document:painted(),idHook:()=>{if(nesting)return;nesting=true;nested.push(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),h.bridge.overlayPorts.constructOverlayCommand(r,update(h)));}});t.after(()=>h.dispose());r=h.selectMark();const result=h.bridge.overlayPorts.constructOverlayCommand(r,update(h));assert.equal(result.status,'constructed');for(const value of nested)refused(value,'C2_CONSTRUCTION_REENTRY');assert.equal(h.allocationCalls,1);
});

test('callback cannot mutate original form and silently construct older intent',t=>{
 let form;const h=harness({document:painted(),idHook:()=>{form.changes[0].value=.8;}});t.after(()=>h.dispose());const r=h.selectMark();form=update(h);refused(h.bridge.overlayPorts.constructOverlayCommand(r,form),'C2_FORM_STALE');assert.equal(h.allocationCalls,1);
});

test('allocator identity rejects trailing newlines after one scoped allocation',t=>{
 const h=harness({document:painted(),idHook:identities=>{identities.requestId+='\n';}});t.after(()=>h.dispose());const r=h.selectMark();refused(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),'C2_ID_SET_REQUIRED');assert.equal(h.allocationCalls,1);
});

test('unknown source acceptance freezes construction and cancellation with original ID retained',t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());h.selectMark();h.setPhase('recovery-required','request.original.unknown');const r=h.bridge.getSnapshot();assert.equal(r.overlay.current.state,'unknown');assert.equal(r.overlay.current.recoveryRequestId,'request.original.unknown');assert.equal(r.overlay.gates.cancel.enabled,false);refused(h.bridge.overlayPorts.constructOverlayCommand(r,update(h)),'C2_WRITES_FROZEN');assert.equal(h.bridge.cancelPendingPreparation(r).cancelled,false);assert.equal(h.cancelCalls,0);assert.equal(h.allocationCalls,0);
});

test('source observer callback must not replace complete source during byte-owner observation',t=>{
 const h=harness();t.after(()=>h.dispose());const original=h.sourceOwner.observe;let scope;
 // Replacement before the bridge is constructed is a paired component fixture.
 const sourceOwner={...h.sourceOwner,observe(s){const result=original(s),next=structuredClone(h.document);next.contentRevision++;h.setDocument(next,{notify:false});return result;}};
 const other=createC2HostBridge(h.workbench,{sourceOwner});t.after(()=>other.dispose());const r=other.getSnapshot();scope=other.sourceOwner.resolve(r);assert.ok(scope);assert.throws(()=>other.sourceOwner.observe(scope),{code:'C2_SOURCE_SCOPE_STALE'});
});

test('same input/thumbnail owner absent is a named refusal; numeric selection still works',t=>{
 const h=harness();t.after(()=>h.dispose());const r=h.selectSurface();refused(h.bridge.overlayPorts.acceptCanvasSelection(r,{}),'C2_INPUT_OWNER_UNBOUND');assert.equal(h.bridge.overlayPorts.resolveVerifiedThumbnail(r,pin(metadata.listSharedArtwork()[0])).status,'unavailable');
});

test('actual C1 pending prepare: review-token cancel/discard do not cancel; missing owned helper stays unavailable',async t=>{
 const h=harness({document:painted()});t.after(()=>h.dispose());const r=h.selectSurface(),result=h.bridge.overlayPorts.constructOverlayCommand(r,{kind:'surface.layers',layers:[],removedLayerMarkIds:['mark.seed.0']});assert.equal(result.status,'constructed');
 const pending=h.service.prepare(result.command);await Promise.resolve();const during=h.bridge.getSnapshot();assert.equal(during.overlay.current.state,'preparing');assert.equal(during.overlay.current.requestId,result.command.requestId);assert.equal(during.overlay.gates.cancel.enabled,false);
 assert.deepEqual(h.service.cancel('not-a-retained-review-token'),{cancelled:false});assert.equal(h.workbench.discardDraft().code,'EDITOR_REENTRY');assert.equal(h.bridge.cancelPendingPreparation(during).code,'C2_PREPARATION_CANCEL_UNBOUND');assert.equal(h.cancelCalls,0);
 h.finishPending();await pending;
});

test('disposal removes only this component listener and leaves borrowed service/session usable',()=>{
 const h=harness(),external=h.session.subscribe(()=>{});assert.equal(h.listenerCount,2);h.dispose();assert.equal(h.listenerCount,1);assert.equal(h.service.snapshot().document.id,h.document.id);assert.equal(h.cancelCalls,0);external();assert.equal(h.listenerCount,0);assert.throws(()=>h.bridge.getSnapshot(),{code:'C2_CONNECTION_RETIRED'});
});
