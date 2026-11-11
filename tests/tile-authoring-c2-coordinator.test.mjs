import test from 'node:test';
import assert from 'node:assert/strict';
import {attachTileAuthoringOverlayCoordinator} from '../apps/editor/tile-authoring/ui/panel.js';
import {TILE_AUTHORING_EXPECTED_FIELDS} from '../apps/editor/tile-authoring/ui/commands.js';

// Protocol controls only. These execute the real shared UI coordinator, but do
// not claim Core, native, storage, transaction or recovery authority.
function fixture(){
 let current={snapshot:{document:{kind:'nautilus-tile-workbench-document',version:3,id:'coordinator-protocol',sourceJSON:'{"protocolDouble":true}',floorBinding:{id:'floor-double'},finishBinding:{id:'finish-double'}},expected:Object.fromEntries(TILE_AUTHORING_EXPECTED_FIELDS.map(key=>[key,key==='workspaceRevision'?0:'a'.repeat(64)]))},presentation:{command:null,scope:'explicit-selected-placements',targetOwnerIds:[],includeSelectedDecorationDefaults:false,selectedCaptureMarkIds:[],review:null,retainedApplyRequest:null,outcome:null,actions:Object.fromEntries(['decoration.add','review','apply','cancel','recover'].map(name=>[name,{enabled:true,diagnostics:[]}]))},overlay:{basis:{generation:0},selected:'first'},commandJSON:null};
 const observers=new Set(),calls={collect:[],prepare:[],apply:[],cancel:[],recover:[],discard:0};
 const service={describe(){return {};},snapshot(){return current.snapshot;},query(){return {};},prepare(command){calls.prepare.push(command);return {ok:true};},apply(request){calls.apply.push(request);return {ok:true};},cancel(token){calls.cancel.push(token);return {cancelled:true};},recover(id){calls.recover.push(id);return {ok:true};}};
 const binding={service,getSnapshot:()=>current,subscribe(fn){observers.add(fn);fn(current);return()=>observers.delete(fn);},collectCommand(command){calls.collect.push(command);return {ok:true};},discardDraft(){calls.discard++;return {ok:true};},history:{}};
 return {binding,calls,get current(){return current;},get observers(){return observers.size;},replace(update,publish=false){current=update(structuredClone(current));if(publish)for(const fn of [...observers])fn(current);},options(extra={}){return {readAdditionalData:read=>read.overlay,isAdditionalConnectionCurrent:()=>true,strictCallbackReads:true,...extra};}};
}
const command=f=>({kind:'nautilus-tile-authoring-command',version:1,requestId:'protocol.request',expected:f.current.snapshot.expected,operations:[],budgetProfile:'authoring-reference-proposal-v1'});

test('overlay attachment requires every additional comparison port',()=>{
 const f=fixture();for(const opts of [{},{strictCallbackReads:true},{readAdditionalData:r=>r.overlay,isAdditionalConnectionCurrent:()=>true}])assert.throws(()=>attachTileAuthoringOverlayCoordinator(f.binding,opts),{code:'UI_ADDITIONAL_BINDING_REQUIRED'});
 assert.equal(f.observers,0);
});
test('overlay attachment constructs once and collects the identical canonical command through its borrowed connection',async()=>{
 const f=fixture(),c=attachTileAuthoringOverlayCoordinator(f.binding,f.options());let builds=0;const original=command(f);
 try{assert.deepEqual(await c.stage('decoration.add',()=>{builds++;return original;}),{ok:true});assert.equal(builds,1);assert.equal(f.calls.collect.length,1);assert.equal(f.calls.collect[0],original);}finally{c.dispose();}assert.equal(f.observers,0);
});
test('additional source changes inside pending callback refuse before construction without requiring a notification',async()=>{
 const f=fixture();let builds=0;const c=attachTileAuthoringOverlayCoordinator(f.binding,f.options({onPending(value){if(value)f.replace(v=>{v.overlay.basis.generation++;return v;});}}));
 try{const result=await c.stage('decoration.add',()=>{builds++;return command(f);});assert.equal(result.code,'UI_DISPLAY_CHANGED');assert.equal(builds,0);assert.equal(f.calls.collect.length,0);}finally{c.dispose();}
});
test('additional source changes during construction refuse collection even when C1 Expected is unchanged',async()=>{
 const f=fixture(),c=attachTileAuthoringOverlayCoordinator(f.binding,f.options());const expected=structuredClone(f.current.snapshot.expected);
 try{const result=await c.stage('decoration.add',()=>{const original=command(f);f.replace(v=>{v.overlay.selected='second';v.overlay.basis.generation++;return v;});return original;});assert.equal(result.code,'UI_STAGE_INVALIDATED');assert.equal(f.calls.collect.length,0);assert.deepEqual(f.current.snapshot.expected,expected);}finally{c.dispose();}
});
test('additional A-B-A generation changes cannot revive a displayed stage',async()=>{
 const f=fixture(),c=attachTileAuthoringOverlayCoordinator(f.binding,f.options());
 try{const result=await c.stage('decoration.add',()=>{const original=command(f);f.replace(v=>{v.overlay.selected='second';v.overlay.basis.generation++;return v;});f.replace(v=>{v.overlay.selected='first';v.overlay.basis.generation++;return v;});return original;});assert.equal(result.code,'UI_STAGE_INVALIDATED');assert.equal(f.calls.collect.length,0);}finally{c.dispose();}
});
test('strict attachment rechecks the actual borrowed port identity after pending callback',async()=>{
 const f=fixture(),c=attachTileAuthoringOverlayCoordinator(f.binding,f.options({onPending(value){if(value)f.binding.getSnapshot=()=>f.current;}}));
 try{assert.equal((await c.stage('decoration.add',()=>command(f))).code,'UI_REBIND_REQUIRED');assert.equal(f.calls.collect.length,0);}finally{c.dispose();}
});
test('overlay controller forwards exact retained Apply and its disposer preserves unknown service state',async()=>{
 const f=fixture();f.replace(v=>{v.presentation.review={requestId:'protocol.request',reviewToken:'b'.repeat(64)};v.presentation.retainedApplyRequest={requestId:'protocol.request',reviewToken:'b'.repeat(64),expectedTargetDigest:'c'.repeat(64)};return v;});
 const retained=f.current.presentation.retainedApplyRequest,c=attachTileAuthoringOverlayCoordinator(f.binding,f.options());
 assert.deepEqual(await c.apply(),{ok:true});assert.equal(f.calls.apply[0],retained);
 f.replace(v=>{v.presentation.outcome={outcome:'unknown',requestId:'protocol.request',committed:null,writesFrozen:true,recoveryRequestId:'protocol.request'};return v;},true);
 const before=structuredClone(f.current);c.dispose();assert.deepEqual(f.current,before);assert.equal(f.binding.service.describe!==undefined,true);assert.equal(f.calls.discard,0);assert.equal(f.calls.cancel.length,0);assert.equal(f.observers,0);
});
test('a strict post-pending snapshot cannot swap Apply before the original retained request is forwarded',async()=>{
 const f=fixture();f.replace(v=>{v.presentation.review={requestId:'protocol.request',reviewToken:'b'.repeat(64)};v.presentation.retainedApplyRequest={requestId:'protocol.request',reviewToken:'b'.repeat(64),expectedTargetDigest:'c'.repeat(64)};return v;});
 let armed=false,replacements=0;const read=f.binding.getSnapshot;f.binding.getSnapshot=()=>{if(armed){armed=false;f.binding.service.apply=()=>{replacements++;return {ok:true};};}return read();};
 const c=attachTileAuthoringOverlayCoordinator(f.binding,f.options({onPending(value){if(value)armed=true;}}));
 try{assert.equal((await c.apply()).code,'UI_REBIND_REQUIRED');assert.equal(replacements,0);assert.equal(f.calls.apply.length,0);}finally{c.dispose();}
});
test('a strict post-pending snapshot cannot swap the collector and still run command construction',async()=>{
 const f=fixture();let armed=false,builds=0,replacements=0;const read=f.binding.getSnapshot;f.binding.getSnapshot=()=>{if(armed){armed=false;f.binding.collectCommand=()=>{replacements++;return {ok:true};};}return read();};
 const c=attachTileAuthoringOverlayCoordinator(f.binding,f.options({onPending(value){if(value)armed=true;}}));
 try{assert.equal((await c.stage('decoration.add',()=>{builds++;return command(f);})).code,'UI_REBIND_REQUIRED');assert.equal(builds,0);assert.equal(replacements,0);assert.equal(f.calls.collect.length,0);}finally{c.dispose();}
});
test('the additional-data callback cannot change borrowed service methods during a fresh read',async()=>{
 const f=fixture();let armed=false,builds=0;const c=attachTileAuthoringOverlayCoordinator(f.binding,f.options({onPending(value){if(value)armed=true;},readAdditionalData(read){if(armed){armed=false;f.binding.service.prepare=()=>({ok:true});}return read.overlay;}}));
 try{assert.equal((await c.stage('decoration.add',()=>{builds++;return command(f);})).code,'UI_REBIND_REQUIRED');assert.equal(builds,0);assert.equal(f.calls.prepare.length,0);assert.equal(f.calls.collect.length,0);}finally{c.dispose();}
});
test('the additional-currentness callback is checked before final borrowed-port identities',async()=>{
 const f=fixture();let armed=false,builds=0;const c=attachTileAuthoringOverlayCoordinator(f.binding,f.options({onPending(value){if(value)armed=true;},isAdditionalConnectionCurrent(){if(armed){armed=false;f.binding.service.apply=()=>({ok:true});}return true;}}));
 try{assert.equal((await c.stage('decoration.add',()=>{builds++;return command(f);})).code,'UI_REBIND_REQUIRED');assert.equal(builds,0);assert.equal(f.calls.collect.length,0);}finally{c.dispose();}
});
