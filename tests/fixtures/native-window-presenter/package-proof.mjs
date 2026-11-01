import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as W from '@nautilus-engine/core/windows';
import * as F from '@nautilus-engine/core/adapters/farmyard/windows';
import * as MapCore from '@nautilus-engine/core';
import * as T from '@nautilus-engine/renderer/render-effects/three';
import * as V from '@nautilus-private/native-window-presenter';
import * as A from '@nautilus-private/staged-window-authoring';
import {runParity,makePool,compileCase,planRuntime,assertViewParity} from './proof.mjs';
const parity=runParity({W,F,T,V});
const privateRoot='node_modules/@nautilus-private/native-window-presenter/',attribution=JSON.parse(fs.readFileSync(privateRoot+'packages/native-window-presenter/source.json')),manifest=JSON.parse(fs.readFileSync(privateRoot+attribution.sourceManifest)),notice=manifest.files.find(f=>f.path.endsWith('THREE-LICENSE.txt')),noticeBytes=fs.readFileSync(privateRoot+attribution.sourceManifest.replace('provenance.json',notice.storedPath));assert.equal(createHash('sha256').update(noticeBytes).digest('hex'),notice.sha256);
const base=MapCore.blankMap('Preserved underlay'),id='authoring-source-'+('x'.repeat(65));base.edges['s:14:12']='wall-brick';const savedBase=JSON.stringify(base);
const c=compileCase(W,F,{definitionId:'window.full.clear.1m',id}),wire={kind:'nautilus-window-authoring',version:1,id:'native-window-yard',worldId:'native-world',profileId:W.WINDOW_GEOMETRY_CONTRACT.profileId,definitions:{sourceCommit:F.FARMYARD_WINDOW_DEFINITIONS.sourceCommit,version:F.FARMYARD_WINDOW_DEFINITIONS.version},baseBlueprint:base,placements:[c.placement],bindings:[{placementId:id,engineInstanceId:'native-view'}]};
const prepared=A.prepareWindowAuthoring(wire),projection=A.windowAuthoringGeometryProjection(prepared),p=V.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,projection),pool=makePool(T,V);let digest=p.geometryDigest;
const presenter=V.createNativeWindowPresenter({THREE:T,materials:pool.pool,isCurrent:s=>s.mode==='authoring'&&s.geometryDigest===digest});
let authoring;
try{
  presenter.activate(presenter.stage(p));assertViewParity({T},presenter.inspect(),projection);assert.equal('contentEpoch' in presenter.inspect().scope,false);assert.equal('stateId' in presenter.inspect().scope,false);
  assert.throws(()=>W.inspectWindowGeometry(A.windowAuthoringGeometry(prepared)),'Authoring owns a separate core instance; its opaque handles never cross.');
  assert.equal(JSON.stringify(A.inspectWindowAuthoring(prepared).document.baseBlueprint),savedBase);
  const document=A.createWindowAuthoringDocument(wire),before=document.serialize(),command={kind:'configure',placementId:id,finish:'sage',wall:'concrete'};
  // Use the fixed reviewed command shape and atomically accept only after art
  // staging. Authoring history stays in its own unregistered package.
  const candidate=document.prepare(command);if(!candidate.ok)throw Error(JSON.stringify(candidate));
  const nextProjection=A.windowAuthoringGeometryProjection(candidate.candidate.prepared),next=V.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,nextProjection);digest=next.geometryDigest;const staged=presenter.stage(next);assert.equal(document.accept(candidate.candidate).ok,true);assert.equal(presenter.activate(staged),true);assert.equal(document.undo().ok,true);assert.equal(document.serialize(),before);assert.equal(document.redo().ok,true);
  const cancelled=document.prepare({kind:'move',placementId:id,x:16,y:12.5});assert.equal(cancelled.ok,true);const cancelledProjection=A.windowAuthoringGeometryProjection(cancelled.candidate.prepared),cancelledView=V.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,cancelledProjection);digest=cancelledView.geometryDigest;const offscene=presenter.stage(cancelledView);assert.ok(document.reject(cancelled.candidate));presenter.abort(offscene);assert.equal(document.snapshot.history.redo,0);
  authoring={registered:false,dependency:JSON.parse(fs.readFileSync('node_modules/@nautilus-private/staged-window-authoring/staged-provenance.json')).authoringCommit,foreignHandleRefused:true,plainProjectionParity:true,history:'prepare/stage/accept/undo/redo/cancel',underlayPreserved:true};
}finally{presenter.dispose();assert.equal(pool.counters.disposed,0);pool.dispose();}
await assert.rejects(import('@nautilus-engine/core/windows/authoring'),e=>e.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');
await assert.rejects(import('@nautilus-engine/renderer/adapters/farmyard/windows/three'),e=>e.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');
const runtime=compileCase(W,F),runtimePlan=planRuntime(V,W,F,runtime);assert.equal(runtimePlan.mode,'runtime');
console.log(JSON.stringify({status:'pass',actualDeclaredCore:true,separatePrivatePresenter:true,noBundledCoreOrThree:true,originalNoticeAndManifestInstalled:true,parity,authoring,publicRegistrationAbsent:true}));
