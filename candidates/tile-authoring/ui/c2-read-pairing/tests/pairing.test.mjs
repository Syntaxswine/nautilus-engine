import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,artwork} from './fixture.mjs';
import {metadata} from '../../c2-host-bridge/tests/fixture.mjs';
import {formInputOwner,createFormProducer,fieldDefaults} from '../form-producer.mjs';
const refusal=(result,code)=>{assert.equal(result.status,'refused',JSON.stringify(result));if(code)assert.equal(result.diagnostics[0].code,code);};

for(const retained of [false,true])test('real frozen Root Stage across fresh reads: '+(retained?'retained two operations':'selected builtin prefix'),async t=>{
 const f=fixture({retained});t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork(),expected=structuredClone(original.snapshot.expected),c=f.controller();assert.equal(c.view.overlay.gates.firstMark.enabled,false);
 const acquisition=await f.acquire(original);assert.equal(acquisition.status,'verified',JSON.stringify(acquisition));assert.equal(f.h.allocationCalls,0);const view=c.refresh();assert.equal(view.overlay.gates.firstMark.enabled,true);
 const next=f.adapter.getSnapshot();assert.notEqual(next,original);assert.deepEqual(next.overlay.basis,original.overlay.basis);assert.equal(next.overlay.gates.firstMark.enabled,true);
 const dirty=new Set(retained?[]:['opacity']),result=await f.stage(c,{values:retained?{}:{opacity:'.43'},dirty});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(f.calls.forms,1);assert.equal(f.calls.builds,1);assert.equal(f.h.allocationCalls,1);assert.equal(f.calls.collect.length,1);assert.equal(f.calls.collect[0],f.builtCommand);assert.deepEqual(f.builtCommand.expected,expected);assert.deepEqual(f.builtCommand.operations.map(o=>o.kind),retained?['surface.layers','decoration.add']:['content.import','surface.layers','decoration.add']);
 const wanted=metadata.sharedArtworkDefaults(artwork);if(!retained)wanted.opacity=.43;assert.deepEqual(f.builtCommand.operations.at(-1).body.mark.graphic,wanted);assert.deepEqual(formInputOwner.touched(null,f.producedForm),retained?[]:['opacity']);
 assert.equal(f.calls.reader,1);assert.equal(f.calls.prepare,0);assert.equal(f.calls.apply,0);assert.equal(f.calls.formReads.length,1);assert.equal(f.calls.formReads[0],f.calls.rawBuildReads[0]);assert.notEqual(f.calls.formReads[0],original);assert.equal(f.adapter.leaseOwner.observeByteScope(acquisition.bytes).editingWorkCredit,0);assert.equal(f.adapter.leaseOwner.diagnostics().native,false);assert.equal(f.adapter.leaseOwner.diagnostics().browserWideMeter,'UNBOUND');assert.equal(f.h.document.authoring.decorations.chunks.length,0);
});

test('same real byte adapter keeps live preparation gates unavailable without protocol readiness fixture',async t=>{
 const f=fixture({liveProtocol:false});t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork(),result=await f.acquire(original);assert.equal(result.status,'verified');const current=f.adapter.getSnapshot();for(const name of ['firstMark','review','apply'])assert.equal(current.overlay.gates[name].enabled,false);assert.equal(f.h.allocationCalls,0);assert.equal(f.calls.prepare,0);
});

test('copy/foreign reads and arbitrary capability DTOs cannot register or use acquisition pairing',async t=>{
 const f=fixture(),foreign=fixture();t.after(()=>{f.close();foreign.close();});f.selectSurface();const original=f.selectArtwork(),acquired=await f.acquire(original);assert.equal(acquired.status,'verified');const current=f.adapter.getSnapshot(),form=f.form(current);foreign.selectSurface();const other=foreign.selectArtwork();
 for(const read of [structuredClone(current),{...current,overlay:{...current.overlay,basis:current.overlay.basis}},other]){refusal(f.adapter.overlayPorts.constructOverlayCommand(read,form),'C2_PAIR_FOREIGN_READ');refusal(await f.adapter.acquireSelected(read),'C2_PAIR_FOREIGN_READ');}
 const injected=await f.adapter.acquireSelected(current,{bytes:{...acquired.bytes},editingWorkCredit:1000000});refusal(injected);assert.equal(f.h.allocationCalls,0);assert.equal(f.calls.reader,1);assert.equal(f.calls.collect.length,0);assert.equal(f.calls.prepare,0);
 const foreignProducer=createFormProducer(),otherForm=foreignProducer.formFromFields(current,{...fieldDefaults},new Set(),'first-mark');
 for(const value of [structuredClone(form),otherForm]){assert.equal(formInputOwner.touched(null,value),null);refusal(f.adapter.overlayPorts.constructOverlayCommand(current,value),'C2_FORM_TOUCH_UNBOUND');}assert.equal(f.h.allocationCalls,0);
 f.release(acquired.bytes);const released=f.adapter.getSnapshot();assert.equal(released.overlay.gates.firstMark.enabled,false);refusal(f.adapter.overlayPorts.constructOverlayCommand(released,f.form(released)),'C2_PAIR_BYTES_STALE');assert.equal(f.h.allocationCalls,0);
});

test('selection ABA refuses old held read, then explicit actual cached reacquisition enables one Stage',async t=>{
 const f=fixture();t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork();assert.equal((await f.acquire(original)).status,'verified');f.selectSurface('owner.two');f.selectSurface('owner.one');const current=f.selectArtwork();assert.equal(current.overlay.gates.firstMark.enabled,false);refusal(f.adapter.overlayPorts.constructOverlayCommand(current,f.form(current)),'C2_READ_STALE');assert.equal(f.h.allocationCalls,0);
 assert.equal((await f.acquire(current)).status,'verified');const c=f.controller();assert.equal(c.view.overlay.gates.firstMark.enabled,true);assert.equal((await f.stage(c)).ok,true);assert.equal(f.calls.reader,1);assert.equal(f.calls.builds,1);assert.equal(f.calls.collect.length,1);assert.equal(f.h.allocationCalls,1);assert.equal(f.calls.prepare,0);
});

test('published complete-source ABA cannot borrow old scope merely because original bytes return',async t=>{
 const f=fixture();t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork();assert.equal((await f.acquire(original)).status,'verified');const a=structuredClone(f.h.document),b=structuredClone(a);b.contentRevision++;f.h.setDocument(b);f.h.setDocument(a);const current=f.adapter.getSnapshot();assert.deepEqual(current.overlay.basis,original.overlay.basis);assert.equal(current.overlay.gates.firstMark.enabled,false);refusal(f.adapter.overlayPorts.constructOverlayCommand(current,f.form(current)),'C2_READ_STALE');assert.equal(f.h.allocationCalls,0);assert.equal(f.calls.collect.length,0);
});

test('distinct actual source handles with equal generations/DTOs cannot reassign the original capability',async t=>{
 const f=fixture();t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork(),acquired=await f.acquire(original);assert.equal(acquired.status,'verified');f.replaceOpaqueHandle();assert.equal(f.adapter.leaseOwner.isByteScopeCurrent(acquired.bytes),true);const current=f.adapter.getSnapshot();assert.deepEqual(current.overlay.basis,original.overlay.basis);assert.equal(current.overlay.gates.firstMark.enabled,false);refusal(f.adapter.overlayPorts.constructOverlayCommand(current,f.form(current)),'C2_PAIR_SCOPE_CHANGED');assert.equal(f.h.allocationCalls,0);assert.equal(f.calls.reader,1);
});

test('Root pending callback sees fresh owner-generation invalidation before any builder/ID/collect',async t=>{
 const f=fixture();t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork();assert.equal((await f.acquire(original)).status,'verified');const c=f.controller({onPending(value){if(value)f.mutateMetadata();}});const result=await f.stage(c);assert.equal(result.code,'UI_DISPLAY_CHANGED');assert.equal(f.calls.builds,0);assert.equal(f.h.allocationCalls,0);assert.equal(f.calls.collect.length,0);assert.equal(f.calls.prepare,0);assert.equal(f.adapter.leaseOwner.diagnostics().leaseReferences,1);
});

test('Root final fresh check refuses collection after builder publication, retaining original command Expected',async t=>{
 const f=fixture();t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork(),expected=structuredClone(original.snapshot.expected);assert.equal((await f.acquire(original)).status,'verified');const c=f.controller(),result=await f.stage(c,{afterBuild:()=>f.h.emit()});assert.equal(result.code,'UI_STAGE_INVALIDATED');assert.equal(f.calls.builds,1);assert.equal(f.h.allocationCalls,1);assert.equal(f.calls.collect.length,0);assert.deepEqual(f.builtCommand.expected,expected);assert.equal(f.calls.prepare,0);assert.equal(f.adapter.leaseOwner.diagnostics().leaseReferences,1);
});

test('actual asynchronous acquisition rejects source ABA before exposing any new lease or allocating IDs',async t=>{
 let changed=false;const f=fixture({onChunk(api){if(changed)return;changed=true;const a=structuredClone(api.h.document),b=structuredClone(a);b.contentRevision++;api.h.setDocument(b);api.h.setDocument(a);}});t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork(),result=await f.acquire(original);refusal(result);await Promise.resolve();await Promise.resolve();assert.equal(f.h.allocationCalls,0);assert.equal(f.calls.collect.length,0);assert.equal(f.calls.prepare,0);assert.equal(f.adapter.leaseOwner.diagnostics().leaseReferences,0);
});

test('Root connection replacement inside pending callback refuses before builder and cannot revive',async t=>{
 const f=fixture();t.after(()=>f.close());f.selectSurface();const original=f.selectArtwork();assert.equal((await f.acquire(original)).status,'verified');const get=f.workbench.getSnapshot,c=f.controller({onPending(value){if(value)f.workbench.getSnapshot=()=>get();}}),result=await f.stage(c);assert.equal(result.code,'UI_REBIND_REQUIRED');f.workbench.getSnapshot=get;assert.equal((await c.stage('decoration.add',()=>{f.calls.builds++;})).code,'UI_ACTION_UNAVAILABLE');assert.equal(f.calls.builds,0);assert.equal(f.h.allocationCalls,0);assert.equal(f.calls.collect.length,0);
});
