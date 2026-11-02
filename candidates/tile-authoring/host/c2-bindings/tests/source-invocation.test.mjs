import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {createWorkbenchReadFrame,createExactOperationData,matchesActualAuthorityInvocation} from '../index.js';
import {setup,Authority,T,deps} from './fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..');
const {harness}=await import(pathToFileURL(path.join(root,'artifacts/c2-host-bindings/exact/tests/fixtures/private-c2-shared/c1.mjs')).href);

async function actualWorkbench(){let frame,connected=true,reenter=null,onCheck=null,onConnectionCheck=null;const h=await harness({privateHooks(original,{binding,authority,floorController}){
 frame=createWorkbenchReadFrame({binding,connected:()=>{if(onConnectionCheck)onConnectionCheck();return connected;},captureCurrent(){if(reenter)reenter();return Object.freeze({checkpoint:authority.read(),floorState:floorController.state});},isCurrent:fact=>{if(onCheck)onCheck();return fact.checkpoint===authority.read()&&fact.floorState===floorController.state;}});return {authoringSnapshot:frame.composeProfile(original).authoringSnapshot};
 }});frame.bindWorkbench(h.workbench);return {h,frame,disconnect(){connected=false;},set reenter(fn){reenter=fn;},set onCheck(fn){onCheck=fn;},set onConnectionCheck(fn){onConnectionCheck=fn;},dispose(){frame.dispose();h.dispose();for(const view of h.nativeViews){assert.equal(view.diagnostics().disposed,true);assert.equal(view.diagnostics().ownedGeometry,0);}}};}

test('PROTOCOL actual workbench read retains pre-clone codec witness; copied and ordinary snapshots cannot issue a scope',async()=>{
 const s=await actualWorkbench();try{const raw=s.frame.read(),handle=s.frame.capture(raw),w=s.frame.witness(handle),actual=s.h.authority.read();assert.equal(w.checkpoint,actual);assert.equal(w.document,actual.document);assert.notEqual(raw.snapshot.document,w.document);assert.deepEqual(raw.snapshot.document,w.document);assert.equal(w.document.floorBinding.floors.length,15);assert.deepEqual(JSON.parse(w.document.sourceJSON).metadata.retained,{hp:37,ap:0,unknown:['keep',7]});assert.equal(s.frame.isCurrent(handle),true);assert.throws(()=>s.frame.capture(structuredClone(raw)),{code:'C2_SOURCE_FOREIGN_READ'});assert.throws(()=>s.frame.capture(s.h.workbench.getSnapshot()),{code:'C2_SOURCE_FOREIGN_READ'});
 }finally{s.dispose();}
});
test('PROTOCOL actual floor ABA/connection retirement and foreign frame invalidate source-read handles',async()=>{
 const a=await actualWorkbench(),b=await actualWorkbench();try{const raw=a.frame.read(),handle=a.frame.capture(raw);assert.throws(()=>b.frame.capture(raw),{code:'C2_SOURCE_FOREIGN_READ'});a.h.floors.select('F01');a.h.floors.select('F00');assert.equal(a.frame.isCurrent(handle),false);assert.throws(()=>a.frame.capture(raw),{code:'C2_SOURCE_STALE_READ'});const next=a.frame.read(),nextHandle=a.frame.capture(next);a.disconnect();assert.equal(a.frame.isCurrent(nextHandle),false);assert.throws(()=>a.frame.read(),{code:'C2_SOURCE_DISCONNECTED'});
 }finally{a.dispose();b.dispose();}
});
test('PROTOCOL caught callback reentry poisons that read and finally clears frame for the next real read',async()=>{
 const s=await actualWorkbench();try{let called=0;s.reenter=()=>{called++;assert.throws(()=>s.frame.read(),{code:'C2_SOURCE_READ_REENTRY'});};assert.throws(()=>s.frame.read(),{code:'C2_SOURCE_STALE_READ'});assert.equal(called,1);s.reenter=null;const raw=s.frame.read();assert.equal(s.frame.isCurrent(s.frame.capture(raw)),true);
 }finally{s.dispose();}
});
test('PROTOCOL reentry caught by the last currentness callback still prevents issuance after the final workbench return',async()=>{
 const s=await actualWorkbench();try{let checks=0;s.onCheck=()=>{checks++;if(checks===3)assert.throws(()=>s.frame.read(),{code:'C2_SOURCE_READ_REENTRY'});};assert.throws(()=>s.frame.read(),{code:'C2_SOURCE_STALE_READ'});assert.equal(checks,3);s.onCheck=null;const raw=s.frame.read();assert.equal(s.frame.isCurrent(s.frame.capture(raw)),true);
 }finally{s.dispose();}
});
for(const callback of ['onCheck','onConnectionCheck'])for(const operation of ['isCurrent','capture','witness'])test('PROTOCOL '+operation+' refuses disposal inside actual '+callback+' before that same callback returns true',async()=>{
 const s=await actualWorkbench();try{const raw=s.frame.read(),handle=s.frame.capture(raw);s[callback]=()=>s.frame.dispose();
  if(operation==='isCurrent')assert.equal(s.frame.isCurrent(handle),false);else assert.throws(()=>operation==='capture'?s.frame.capture(raw):s.frame.witness(handle),{code:'C2_SOURCE_STALE_READ'});
  assert.equal(s.frame.isCurrent(handle),false);assert.throws(()=>s.frame.capture(raw),{code:'C2_SOURCE_STALE_READ'});assert.throws(()=>s.frame.witness(handle),{code:'C2_SOURCE_STALE_READ'});
 }finally{s.dispose();}
});
test('PROTOCOL currentness callback disconnect and caught read reentry cannot succeed in that same validation',async()=>{
 const a=await actualWorkbench(),b=await actualWorkbench();try{const ar=a.frame.read(),ah=a.frame.capture(ar);a.onCheck=()=>a.disconnect();assert.equal(a.frame.isCurrent(ah),false);assert.throws(()=>a.frame.capture(ar),{code:'C2_SOURCE_STALE_READ'});
  const br=b.frame.read(),bh=b.frame.capture(br);b.onCheck=()=>assert.throws(()=>b.frame.read(),{code:'C2_SOURCE_READ_REENTRY'});assert.equal(b.frame.isCurrent(bh),false);b.onCheck=null;assert.equal(b.frame.isCurrent(bh),true);
 }finally{a.dispose();b.dispose();}
});
test('PROTOCOL initial connection callback disposal refuses the read before a source capture',async()=>{
 const s=await actualWorkbench();try{let captures=0;s.reenter=()=>{captures++;};s.onConnectionCheck=()=>s.frame.dispose();assert.throws(()=>s.frame.read(),{code:'C2_SOURCE_DISCONNECTED'});assert.equal(captures,0);
 }finally{s.dispose();}
});

test('PROTOCOL real observed authority invocation fences full pending WAL and dies outside actual stage/commit; no recursive read',()=>{
 const h=setup(),base=h.binding.codec,operation=createExactOperationData(h.input),pending=base.stage(h.before,operation),committed=base.settle(pending,operation.id,'committed'),notCommitted=base.settle(pending,operation.id,'not-committed');
 const wal=Object.fromEntries(Object.entries({pending,committed,notCommitted}).map(([k,checkpoint])=>[k,{checkpoint,checkpointJSON:base.serialize(checkpoint)}]));
 // Protocol-only call observation: no work counter, Native or factory pairing.
 let call=null;const observer={get active(){return call;},run(_name,fn){const prior=call;call=Object.freeze({protocolOnly:true});try{return fn();}finally{call=prior;}}},codec=Object.freeze({...base,privateObservation:{observer,utilities:{digest:T.tileLayoutToken}}});
 let raw=base.serialize(h.before),observation,latest,checks=0,authority;const input=(invocation,purpose)=>({authority,codec,observation,invocation,purpose,before:h.before,operation,pending,wal});
 authority=Authority.createSmartTileAuthority(deps,{read:()=>raw,write(packet){assert.throws(()=>authority.read(),{code:'AUTHORITY_REENTRY'});assert.equal(packet.canCommit(),true);raw=packet.nextJSON;return true;}},{codec});observation=Authority.createPrivateAuthorityObservationPort(authority);
 const fence=purpose=>()=>{const fact=observation.currentInvocation();latest=fact;checks++;assert.equal(matchesActualAuthorityInvocation(input(fact,purpose)),true);assert.equal(matchesActualAuthorityInvocation(input({...fact},purpose)),false);assert.equal(matchesActualAuthorityInvocation({...input(fact,purpose),[purpose==='stage'?'operation':'pending']:structuredClone(purpose==='stage'?operation:pending)}),false);assert.equal(matchesActualAuthorityInvocation({...input(fact,purpose),wal:{...wal,[purpose==='stage'?'pending':'committed']:{checkpointJSON:wal.notCommitted.checkpointJSON}}}),false);return true;};
 assert.equal(authority.stage(operation,fence('stage')).ack,true);assert.equal(matchesActualAuthorityInvocation(input(latest,'stage')),false);assert.equal(authority.commit(pending,fence('commit')).ack,true);assert.equal(matchesActualAuthorityInvocation(input(latest,'commit')),false);assert.equal(checks,4);assert.deepEqual(base.open(raw),committed);
});
