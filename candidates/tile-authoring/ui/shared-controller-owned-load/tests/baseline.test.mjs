import test from 'node:test';import assert from 'node:assert/strict';
import {createSharedTileAuthoringController} from '../hub.mjs';
import {fixture,command} from './fixture.mjs';
function setup(){const f=fixture(),hub=createSharedTileAuthoringController(f.binding,{isAdditionalConnectionCurrent:()=>true});return{f,hub};}
const opts=(extra={})=>({readAdditionalData:r=>r.overlay,isAdditionalConnectionCurrent:()=>true,strictCallbackReads:true,...extra});

test('two attachments share one actual Root controller/subscription and one draft/history',async()=>{
 const {f,hub}=setup(),views=[[],[]],a=hub.attach(f.binding,{onView:v=>views[0].push(v)}),b=hub.attach(f.binding,opts({onView:v=>views[1].push(v)}));
 try{assert.equal(hub.diagnostics().controllerCreations,1);assert.equal(f.calls.subscribe,1);assert.equal(f.observers,1);let builds=0;const first=command(f,'library'),second=command(f,'overlay');assert.equal((await a.stage('recipe.create',()=>{builds++;return first;})).ok,true);assert.equal(b.view.presentation.command.requestId,'library');assert.equal((await b.stage('surface.layers',()=>{builds++;return second;})).ok,true);assert.equal(a.view.presentation.command.requestId,'overlay');assert.equal(builds,2);assert.equal(f.calls.collect[0],first);assert.equal(f.calls.collect[1],second);await a.history('save');await b.history('undo');assert.deepEqual(f.calls.history.map(x=>x.name),['save','undo']);assert.equal(f.calls.prepare.length,0);}
 finally{a.dispose();assert.equal(f.observers,1);b.dispose();assert.equal(f.observers,0);assert.equal(f.calls.unsubscribe,1);hub.dispose();}
});
test('pending on one attachment gates actions on both through the SAME Root controller',async()=>{
 const {f,hub}=setup(),pending=[[],[]],a=hub.attach(f.binding,{onPending:p=>pending[0].push(p)}),b=hub.attach(f.binding,opts({onPending:p=>pending[1].push(p)}));let release;f.hooks.prepare=()=>new Promise(r=>release=r);
 try{await a.stage('recipe.create',()=>command(f));const operation=a.review();assert.equal(a.pending,true);assert.equal(b.pending,true);assert.equal((await b.stage('surface.layers',()=>{throw Error('Must not build');})).code,'UI_ACTION_UNAVAILABLE');assert.deepEqual(pending.map(x=>x.at(-1)),[true,true]);release({ok:true});await operation;assert.equal(a.pending,false);assert.equal(b.pending,false);assert.deepEqual(pending.map(x=>x.at(-1)),[false,false]);assert.equal(f.calls.prepare.length,1);assert.equal(f.calls.subscribe,1);}
 finally{a.dispose();b.dispose();hub.dispose();}
});
test('detach only one consumer; stale facade refuses and remaining attachment stays usable',async()=>{
 const {f,hub}=setup();let aViews=0,bViews=0;const a=hub.attach(f.binding,{onView:()=>aViews++}),b=hub.attach(f.binding,opts({onView:()=>bViews++}));a.dispose();const prior=aViews;f.update(v=>v.overlay.nested.retained=false);assert.equal(aViews,prior);assert.ok(bViews>1);assert.equal(a.view,null);assert.equal((await a.stage('recipe.create',()=>command(f))).code,'UI_ATTACHMENT_RETIRED');assert.equal((await b.stage('surface.layers',()=>command(f))).ok,true);assert.equal(f.calls.subscribe,1);b.dispose();assert.equal(f.observers,0);hub.dispose();
});
test('detachment inside pending callback invalidates the outer operation before build',async()=>{
 const {f,hub}=setup();let a,armed=false,builds=0;a=hub.attach(f.binding,{onPending:p=>{if(p&&armed)a.dispose();}});const b=hub.attach(f.binding,opts());armed=true;const result=await a.stage('recipe.create',()=>{builds++;return command(f);});assert.equal(result.code,'UI_DISPLAY_CHANGED');assert.equal(builds,0);assert.equal(f.calls.collect.length,0);assert.equal(hub.diagnostics().controllerCreations,1);assert.equal((await b.stage('surface.layers',()=>command(f))).ok,true);b.dispose();hub.dispose();
});
test('detaching another attachment during construction refuses collection with no replay',async()=>{
 const {f,hub}=setup(),a=hub.attach(f.binding,{}),b=hub.attach(f.binding,opts());let builds=0;const result=await a.stage('recipe.create',()=>{builds++;b.dispose();return command(f);});assert.equal(result.code,'UI_ATTACHMENT_CHANGED');assert.equal(builds,1);assert.equal(f.calls.collect.length,0);assert.equal(f.calls.subscribe,1);a.dispose();hub.dispose();
});
test('reentrant actions/attachments inside callbacks cannot invoke or create another controller',async()=>{
 const {f,hub}=setup();let a,armed=false,nested,attachCode;a=hub.attach(f.binding,{onPending:p=>{if(p&&armed){nested=a.stage('recipe.create',()=>{throw Error('Reentrant build');});try{hub.attach(f.binding,{});}catch(e){attachCode=e.code;}}}});const b=hub.attach(f.binding,opts());armed=true;assert.equal((await a.stage('recipe.create',()=>command(f))).ok,true);assert.equal((await nested).code,'UI_ATTACHMENT_REENTRY');assert.equal(attachCode,'UI_ATTACHMENT_REENTRY');assert.equal(f.calls.collect.length,1);assert.equal(hub.diagnostics().controllerCreations,1);a.dispose();b.dispose();hub.dispose();
});
test('caught connection replacement in callback permanently refuses despite restoring method',async()=>{
 const {f,hub}=setup();let a,b,armed=false,nested;const original=f.binding.service.apply;a=hub.attach(f.binding,{onPending:p=>{if(p&&armed){f.binding.service.apply=()=>{};nested=b.stage('surface.layers',()=>command(f));f.binding.service.apply=original;}}});b=hub.attach(f.binding,opts());armed=true;assert.equal((await a.stage('recipe.create',()=>command(f))).code,'UI_REBIND_REQUIRED');assert.equal((await nested).code,'UI_REBIND_REQUIRED');assert.equal((await a.stage('recipe.create',()=>command(f))).code,'UI_REBIND_REQUIRED');assert.equal(f.calls.collect.length,0);assert.equal(hub.diagnostics().broken,true);a.dispose();b.dispose();hub.dispose();
});
test('the whole overlay is compared even when C1 supplies no additional callback',async()=>{
 const {f,hub}=setup();let armed=false;const a=hub.attach(f.binding,{onPending:p=>{if(p&&armed)f.update(v=>v.overlay.nested.retained=false,false);}}),b=hub.attach(f.binding,opts());armed=true;let builds=0;assert.equal((await a.stage('recipe.create',()=>{builds++;return command(f);})).code,'UI_DISPLAY_CHANGED');assert.equal(builds,0);assert.equal(f.calls.collect.length,0);a.dispose();b.dispose();hub.dispose();
});
test('last close retires and unsubscribes, a later explicit lifetime owns one new subscription',()=>{
 const {f,hub}=setup(),a=hub.attach(f.binding,{});a.dispose();assert.equal(f.observers,0);assert.equal(hub.diagnostics().liveControllers,0);const b=hub.attach(f.binding,opts());assert.equal(f.observers,1);assert.equal(hub.diagnostics().liveControllers,1);assert.equal(hub.diagnostics().controllerCreations,2);b.dispose();assert.equal(f.calls.unsubscribe,2);hub.dispose();
});
test('new attachment during pending shares pending and does not create a second controller',async()=>{
 const {f,hub}=setup(),a=hub.attach(f.binding,{});let release;f.hooks.prepare=()=>new Promise(r=>release=r);await a.stage('recipe.create',()=>command(f));const operation=a.review(),b=hub.attach(f.binding,opts());assert.equal(b.pending,true);assert.equal(hub.diagnostics().controllerCreations,1);assert.equal(f.calls.subscribe,1);release({ok:true});await operation;assert.equal(b.pending,false);a.dispose();b.dispose();hub.dispose();
});
test('late actual result survives last UI detach; hub does not cancel the borrowed operation',async()=>{
 const {f,hub}=setup(),a=hub.attach(f.binding,{});let release;f.hooks.prepare=()=>new Promise(r=>release=r);await a.stage('recipe.create',()=>command(f));const operation=a.review();a.dispose();assert.equal(f.observers,0);assert.equal(f.calls.cancel.length,0);assert.equal(f.calls.discard,0);const result={ok:true,retainedOriginalRequest:true};release(result);assert.equal(await operation,result);assert.equal(f.observers,0);hub.dispose();
});
test('factory rejects foreign bindings and incomplete overlay comparison attachment',()=>{
 const {f,hub}=setup();assert.throws(()=>hub.attach({...f.binding},{}),{code:'UI_HUB_FOREIGN_BINDING'});assert.throws(()=>hub.attach(f.binding,{strictCallbackReads:true}),{code:'UI_ADDITIONAL_BINDING_REQUIRED'});assert.equal(f.calls.subscribe,0);hub.dispose();
});
test('fanout skips consumer detached by an earlier callback',()=>{
 const {f,hub}=setup();let a,b,armed=false,hits=0;a=hub.attach(f.binding,{onView:()=>{if(armed)b.dispose();}});b=hub.attach(f.binding,opts({onView:()=>hits++}));const before=hits;armed=true;f.update(v=>v.overlay.nested.retained=false);assert.equal(hits,before);assert.equal(f.observers,1);a.dispose();assert.equal(f.observers,0);hub.dispose();
});
test('reentry during initial binding subscription cannot create another controller',()=>{
 const {f,hub}=setup();let code;f.hooks.subscribe=()=>{try{hub.attach(f.binding,{});}catch(e){code=e.code;}};const a=hub.attach(f.binding,{});assert.equal(code,'UI_ATTACHMENT_REENTRY');assert.equal(f.calls.subscribe,1);assert.equal(hub.diagnostics().controllerCreations,1);a.dispose();hub.dispose();
});
test('post-callback consumer predicate failure sends invalidation to both surfaces',async()=>{
 const {f,hub}=setup();let connected=true,armed=false;const seen=[[],[]],a=hub.attach(f.binding,{onView:v=>seen[0].push(v),onPending:p=>{if(p&&armed)connected=false;}}),b=hub.attach(f.binding,opts({onView:v=>seen[1].push(v),isAdditionalConnectionCurrent:()=>connected}));armed=true;const result=await a.stage('recipe.create',()=>command(f));assert.equal(result.code,'UI_REBIND_REQUIRED');assert.equal(f.calls.collect.length,0);assert.equal(a.view,null);assert.equal(b.view,null);assert.equal(seen[0].at(-1),null);assert.equal(seen[1].at(-1),null);a.dispose();b.dispose();hub.dispose();
});
test('observed rebind from view callback clears both views even after caught restoration',()=>{
 const {f,hub}=setup();let a,b,armed=false,nested;const original=f.binding.service.apply;a=hub.attach(f.binding,{onView:view=>{if(view&&armed){f.binding.service.apply=()=>{};nested=b.stage('surface.layers',()=>command(f));f.binding.service.apply=original;}}});b=hub.attach(f.binding,opts());armed=true;f.update(v=>v.overlay.nested.retained=false);assert.equal(nested.code,'UI_REBIND_REQUIRED');assert.equal(a.view,null);assert.equal(b.view,null);assert.equal(hub.diagnostics().broken,true);assert.equal(f.calls.collect.length,0);a.dispose();b.dispose();hub.dispose();
});
test('pending prepare with unavailable owned cancellation never aliases to discard or review-token cancel',async()=>{
 const {f,hub}=setup(),a=hub.attach(f.binding,{}),b=hub.attach(f.binding,opts());let release;f.hooks.prepare=()=>new Promise(r=>release=r);await a.stage('recipe.create',()=>command(f));f.update(v=>v.presentation.actions.cancel.enabled=false);const operation=a.review();assert.equal((await b.cancel()).code,'UI_ACTION_UNAVAILABLE');assert.equal(f.calls.discard,0);assert.equal(f.calls.cancel.length,0);release({ok:true});await operation;a.dispose();b.dispose();hub.dispose();
});
test('error callback reentry cannot stage and default Root recovery refresh still works',async()=>{
 const {f,hub}=setup();let a,armed=false,nested;a=hub.attach(f.binding,{onView:view=>{if(view&&armed){armed=false;throw Error('Surface callback failed');}},onError:()=>{if(a)nested=a.stage('recipe.create',()=>command(f));}});const b=hub.attach(f.binding,opts());armed=true;f.update(v=>v.overlay.nested.retained=false);assert.equal(nested.code,'UI_ATTACHMENT_REENTRY');assert.equal(f.calls.collect.length,0);a.refresh();assert.equal((await b.stage('surface.layers',()=>command(f))).ok,true);a.dispose();b.dispose();hub.dispose();
});
test('a detached consumer no longer observes callbacks or poisons the remaining lifetime',async()=>{
 const {f,hub}=setup(),options={onView:()=>{}},a=hub.attach(f.binding,options),b=hub.attach(f.binding,opts());a.dispose();options.onView=()=>{throw Error('Retired callback must not run');};assert.equal((await a.stage('recipe.create',()=>command(f))).code,'UI_ATTACHMENT_RETIRED');assert.throws(()=>a.refresh(),{code:'UI_ATTACHMENT_RETIRED'});assert.equal(hub.diagnostics().broken,false);assert.equal((await b.stage('surface.layers',()=>command(f))).ok,true);assert.equal(f.calls.subscribe,1);assert.equal(f.observers,1);b.dispose();assert.equal(f.observers,0);hub.dispose();
});
test('a rebind first observed by an action invalidates every panel immediately and stays retired',async()=>{
 const {f,hub}=setup(),seen=[[],[]],a=hub.attach(f.binding,{onView:v=>seen[0].push(v)}),b=hub.attach(f.binding,opts({onView:v=>seen[1].push(v)})),original=f.binding.service.apply;f.binding.service.apply=()=>{throw Error('Never invoke rebound service');};assert.equal((await a.stage('recipe.create',()=>command(f))).code,'UI_REBIND_REQUIRED');assert.equal(a.view,null);assert.equal(b.view,null);assert.equal(seen[0].at(-1),null);assert.equal(seen[1].at(-1),null);f.binding.service.apply=original;assert.equal((await b.stage('surface.layers',()=>command(f))).code,'UI_REBIND_REQUIRED');assert.equal(f.calls.collect.length,0);assert.equal(f.observers,1);a.dispose();b.dispose();assert.equal(f.observers,0);hub.dispose();
});
test('resource invocation gates both attachments without a new controller or command',async()=>{
 const {f,hub}=setup(),seen=[[],[]],a=hub.attach(f.binding,{onPending:p=>seen[0].push(p)}),b=hub.attach(f.binding,opts({onPending:p=>seen[1].push(p)}));const end=hub.beginResourceUI();assert.equal(a.pending,true);assert.equal(b.pending,true);assert.deepEqual(seen.map(x=>x.at(-1)),[true,true]);assert.throws(()=>hub.beginResourceUI(),{code:'UI_RESOURCE_PENDING'});assert.equal((await a.stage('recipe.create',()=>{throw Error('No resource-stage builder');})).code,'UI_RESOURCE_PENDING');assert.equal((await b.cancel()).code,'UI_RESOURCE_PENDING');assert.equal(f.calls.collect.length,0);assert.equal(f.calls.subscribe,1);hub.refresh();assert.deepEqual(seen.map(x=>x.at(-1)),[true,true]);end();end();assert.equal(a.pending,false);assert.equal(b.pending,false);assert.deepEqual(seen.map(x=>x.at(-1)),[false,false]);a.dispose();b.dispose();hub.dispose();
});
test('ending resource UI cannot reset actual action debt or the underlying pending operation',async()=>{
 const {f,hub}=setup(),a=hub.attach(f.binding,{}),b=hub.attach(f.binding,opts()),end=hub.beginResourceUI();a.dispose();f.update(v=>{for(const entry of Object.values(v.presentation.actions))entry.enabled=false;});end();assert.equal((await b.stage('surface.layers',()=>{throw Error('Actual debt must refuse');})).code,'UI_ACTION_UNAVAILABLE');assert.equal(f.calls.collect.length,0);assert.equal(hub.diagnostics().controllerCreations,1);
 f.update(v=>{v.presentation.actions['surface.layers'].enabled=true;v.presentation.actions.review.enabled=true;});let release;f.hooks.prepare=()=>new Promise(resolve=>release=resolve);await b.stage('surface.layers',()=>command(f));const pending=b.review();assert.equal(b.pending,true);assert.throws(()=>hub.beginResourceUI(),{code:'UI_RESOURCE_PENDING'});end();assert.equal(b.pending,true);release({ok:true});await pending;assert.equal(b.pending,false);b.dispose();assert.equal(f.observers,0);hub.dispose();
});
