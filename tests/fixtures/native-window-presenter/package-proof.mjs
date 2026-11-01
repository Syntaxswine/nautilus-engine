import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import * as W from '@nautilus-engine/core/windows';
import * as F from '@nautilus-engine/core/adapters/farmyard/windows';
import * as MapCore from '@nautilus-engine/core';
import * as A from '@nautilus-engine/core/windows/authoring';
import * as T from '@nautilus-engine/renderer/render-effects/three';
import * as V from '@nautilus-engine/renderer/adapters/farmyard/windows/three';
import * as PrivateV from '@nautilus-private/native-window-presenter';
import * as PrivateA from '@nautilus-private/staged-window-authoring';
import * as Source from './farmyard-source/sites/tactical-animal/dist/solo-game.js';
import {paneHarness} from './host-harness.mjs';
import {runParity,makePool,compileCase,planRuntime,assertViewParity} from './proof.mjs';
import {runLifecycleProof} from './lifecycle-proof.mjs';

const expected=JSON.parse(fs.readFileSync(new URL('./expected-installed.json',import.meta.url))),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const packageURL=name=>new URL('./node_modules/'+name+'/',import.meta.url);
const read=(url,file)=>fs.readFileSync(new URL(file,url));
const filesAt=(url,prefix='')=>fs.readdirSync(new URL(prefix||'.',url),{withFileTypes:true}).flatMap(item=>item.isDirectory()?filesAt(url,prefix+item.name+'/'):[prefix+item.name]);
function exclusions(files){for(const file of files){assert.equal(file.startsWith('tests/'),false,file);assert.equal(file.startsWith('vendor/farmyard-grenades/')||file.startsWith('vendor/farmyard-grenade-visuals/'),false,file);if(file.startsWith(expected.vendorRoot+'/'))assert.ok(expected.support.includes(file),'Reference JavaScript/Three copy entered runtime: '+file);for(const fixture of expected.comparisonFixtures)assert.notEqual(file,fixture);}}
const publicPackages={};
for(const [profile,p]of Object.entries(expected.profiles)){
  const url=packageURL(p.name),pkg=JSON.parse(read(url,'package.json')),physical=filesAt(url);
  assert.deepEqual([...pkg.files].sort(),[...p.files,'package-provenance.json'].sort(),profile+' declared package whitelist');
  assert.deepEqual(physical.sort(),[...p.files,'package-provenance.json','package.json'].sort(),profile+' physical installed package');
  exclusions(physical);
  for(const f of p.critical)assert.equal(sha(read(url,f.path)),f.sha256,'Installed '+profile+' changed '+f.path);
  publicPackages[profile]={url,pkg};
}
const renderer=publicPackages.renderer,core=publicPackages.core;
assert.equal(renderer.pkg.exports[expected.entry],expected.entryFile);
assert.equal(core.pkg.exports[expected.entry],undefined);
assert.equal(core.pkg.exports['./windows/authoring'],'./packages/windows-authoring/index.js');
assert.equal(import.meta.resolve('@nautilus-engine/renderer/adapters/farmyard/windows/three'),new URL(expected.entryFile,renderer.url).href);
assert.equal(import.meta.resolve('@nautilus-engine/core/windows/authoring'),new URL('./packages/windows-authoring/index.js',core.url).href);
const source=JSON.parse(read(renderer.url,'packages/native-window-presenter/source.json')),reference=JSON.parse(read(renderer.url,source.sourceManifest));
assert.equal(source.sourceCommit,expected.sourceCommit);assert.equal(reference.commit,expected.sourceCommit);
const notice=reference.files.find(f=>f.path.endsWith('THREE-LICENSE.txt'));
assert.ok(notice);const noticeURL=new URL(source.sourceManifest.replace('provenance.json',notice.storedPath),renderer.url),noticeBytes=fs.readFileSync(noticeURL);
assert.equal(sha(noticeBytes),notice.sha256);assert.equal(noticeBytes.length,notice.bytes);
for(const file of expected.support)assert.ok(read(renderer.url,file).length>0,file);
const peerURL=packageURL('@nautilus-private/native-window-presenter'),peerManifest=JSON.parse(read(peerURL,'package.json')),peerPhysical=filesAt(peerURL);
assert.deepEqual(peerManifest.files,expected.peerFiles);assert.deepEqual(peerPhysical.sort(),[...expected.peerFiles,'package.json'].sort());exclusions(peerPhysical);
for(const f of expected.peerHashes)assert.equal(sha(read(peerURL,f.path)),f.sha256,'Private isolation peer changed '+f.path);
assert.equal(expected.peerFiles.filter(f=>f.endsWith('.js')).every(f=>f.startsWith('packages/native-window-presenter/')),true);
const privateAuthoringURL=packageURL('@nautilus-private/staged-window-authoring');exclusions(filesAt(privateAuthoringURL));
const authoringCard=A.windowAuthoringUsageCard();
for(const key of ['guide','schema','registration'])assert.ok(fs.statSync(new URL(authoringCard[key])).size>0,key);
assert.equal(authoringCard.schema,new URL('packages/windows-authoring/window-authoring-v1.schema.json',core.url).href);
assert.equal(JSON.parse(fs.readFileSync(new URL(authoringCard.schema))).$id,A.WINDOW_AUTHORING_CONTRACT.schemaUri);
assert.match(authoringCard.status,/registered/);
const authoringSchemas=MapCore.schemaDocuments().filter(s=>s.id===A.WINDOW_AUTHORING_CONTRACT.kind);assert.equal(authoringSchemas.length,1);assert.equal(authoringSchemas[0].url,authoringCard.schema);assert.equal(authoringSchemas[0].version,1);
const paneCard=F.farmyardWindowUsageCard();for(const key of ['guide','stateSchema','hostSaveSchema'])assert.ok(fs.statSync(new URL(paneCard[key])).size>0,key);
for(const service of W.WINDOW_HOST_SERVICES)assert.equal(MapCore.engineManifest().capabilities.some(c=>c.id===service.id),false);

// Run the complete native pose/mask and actual-Three lifecycle proofs through
// the actual declared public presenter, never the private physical peer.
const parity=runParity({W,F,T,V}),lifecycle=runLifecycleProof({W,F,T,V});
assert.equal(parity.poses,624);assert.equal(parity.masks,594);assert.equal(lifecycle.cases,18);
const base=MapCore.blankMap('Preserved underlay'),id='authoring-source-'+('x'.repeat(65));base.edges['s:14:12']='wall-brick';const savedBase=JSON.stringify(base);
const c=compileCase(W,F,{definitionId:'window.full.clear.1m',id}),wire={kind:'nautilus-window-authoring',version:1,id:'native-window-yard',worldId:'native-world',profileId:W.WINDOW_GEOMETRY_CONTRACT.profileId,definitions:{sourceCommit:F.FARMYARD_WINDOW_DEFINITIONS.sourceCommit,version:F.FARMYARD_WINDOW_DEFINITIONS.version},baseBlueprint:base,placements:[c.placement],bindings:[{placementId:id,engineInstanceId:'native-view'}]};
const prepared=A.prepareWindowAuthoring(wire),projection=A.windowAuthoringGeometryProjection(prepared),p=V.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,projection),pool=makePool(T,V);let digest=p.geometryDigest;
const presenter=V.createNativeWindowPresenter({THREE:T,materials:pool.pool,isCurrent:s=>s.mode==='authoring'&&s.geometryDigest===digest});
let authoring;
try{
  assert.equal(presenter.activate(presenter.stage(p)),true);assertViewParity({T},presenter.inspect(),projection);assert.equal('contentEpoch' in presenter.inspect().scope,false);assert.equal('stateId' in presenter.inspect().scope,false);
  assert.deepEqual(W.inspectWindowGeometry(A.windowAuthoringGeometry(prepared)),projection,'The actual public authoring and public windows API share their owning core.');
  const foreign=PrivateA.prepareWindowAuthoring(wire),foreignProjection=PrivateA.windowAuthoringGeometryProjection(foreign);
  assert.throws(()=>W.inspectWindowGeometry(PrivateA.windowAuthoringGeometry(foreign)),'Foreign physical authoring handles must not cross.');
  assert.deepEqual(V.inspectPreparedWindowView(V.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,foreignProjection)),V.inspectPreparedWindowView(p),'Detached projections may cross physical instances.');
  const privatePrepared=PrivateV.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,projection);
  assert.throws(()=>presenter.stage(privatePrepared),error=>error.code==='PREPARATION_REQUIRED');
  const peer=PrivateV.createNativeWindowPresenter({THREE:T,materials:pool.pool,isCurrent:()=>true});
  try{assert.throws(()=>peer.stage(p),error=>error.code==='PREPARATION_REQUIRED');assert.equal(peer.activate(peer.stage(privatePrepared)),true);assertViewParity({T},peer.inspect(),projection);}finally{peer.dispose();}
  assert.equal(pool.counters.disposed,0);
  assert.equal(JSON.stringify(A.inspectWindowAuthoring(prepared).document.baseBlueprint),savedBase);
  const document=A.createWindowAuthoringDocument(wire),before=document.serialize(),command={kind:'configure',placementId:id,finish:'sage',wall:'concrete'};
  const candidate=document.prepare(command);assert.equal(candidate.ok,true,JSON.stringify(candidate));
  const nextProjection=A.windowAuthoringGeometryProjection(candidate.candidate.prepared),next=V.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,nextProjection);digest=next.geometryDigest;const staged=presenter.stage(next);assert.equal(document.accept(candidate.candidate).ok,true);assert.equal(presenter.activate(staged),true);assert.equal(document.undo().ok,true);assert.equal(document.serialize(),before);assert.equal(document.redo().ok,true);
  const cancelled=document.prepare({kind:'move',placementId:id,x:16,y:12.5});assert.equal(cancelled.ok,true);const cancelledProjection=A.windowAuthoringGeometryProjection(cancelled.candidate.prepared),cancelledView=V.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,cancelledProjection);digest=cancelledView.geometryDigest;const offscene=presenter.stage(cancelledView);assert.ok(document.reject(cancelled.candidate));assert.equal(presenter.abort(offscene),true);assert.equal(document.snapshot.history.redo,0);assert.equal(JSON.stringify(document.snapshot.document.baseBlueprint),savedBase);
  authoring={registered:true,actualPublicEntry:true,sameOwningCoreHandleAccepted:true,foreignHandleRefused:true,foreignPresenterPreparationRefused:true,plainProjectionParity:true,history:'prepare/stage/accept/undo/redo/cancel',underlayPreserved:true};
}finally{presenter.dispose();assert.equal(presenter.stats().geometries,0);assert.equal(pool.counters.disposed,0);pool.dispose();}

// The fixture binds all six real retained-host services and pinned complete-
// world source queries. It does not claim production combat or game adoption.
const h=paneHarness({W,F,Source}),runtimePool=makePool(T,V);
let acknowledged=null,publications=0,quietRestore;
function currentRuntimeSnapshot(){
  const geometry=W.openWindowGeometry(h.store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),state=W.openWindowState(geometry,h.store.windowState),projection=W.inspectWindowGeometry(W.windowStateGeometry(state)),saved=JSON.parse(W.serializeWindowState(state));
  return {state,projection,hostToken:F.farmyardWindowHostToken(h.store),scope:{mode:'runtime',profileId:projection.profileId,sceneId:projection.sceneId,worldId:projection.worldId,stateId:saved.id,contentEpoch:saved.contentEpoch,contentDigest:projection.contentDigest,geometryDigest:projection.geometryDigest,geometryRevision:projection.queryRevision,stateRevision:saved.revision}};
}
function acknowledgedCurrent(scope){
  if(!acknowledged||F.farmyardWindowHostToken(h.store)!==acknowledged.hostToken)return false;
  const current=currentRuntimeSnapshot(),expectedScope={...current.scope,publicationReceiptId:acknowledged.receiptId};
  return current.hostToken===acknowledged.hostToken&&isDeepStrictEqual(current.projection,acknowledged.geometry)&&isDeepStrictEqual(expectedScope,acknowledged.scope)&&isDeepStrictEqual(scope,expectedScope);
}
const runtimePresenter=V.createNativeWindowPresenter({THREE:T,materials:runtimePool.pool,isCurrent:acknowledgedCurrent});
try{
  const accept=publication=>{
    const current=currentRuntimeSnapshot();assert.equal(typeof publication.receiptId,'string');assert.ok(publication.receiptId.length);assert.deepEqual(publication.geometry,current.projection);
    // The real host publish callback records acknowledgement BEFORE preparing
    // or allocating art. Cold open below first validates the complete save.
    acknowledged={receiptId:publication.receiptId,hostToken:current.hostToken,geometry:structuredClone(publication.geometry),scope:{...current.scope,publicationReceiptId:publication.receiptId}};
    const plan=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,current.state,{publication:{receiptId:publication.receiptId,geometry:publication.geometry}});assert.equal(runtimePresenter.activate(runtimePresenter.stage(plan)),true);publications++;
  };
  h.hooks.publish=(_host,publication)=>accept(publication);
  const command=h.packet();assert.equal(h.binding.perform(command).committed,true);assert.equal(publications,1);assert.equal(runtimePresenter.inspect().instances.get('clear-a').panes.get('r0c0').root.visible,false);
  const acceptedRoot=runtimePresenter.inspect().root,current=currentRuntimeSnapshot(),validPublication={receiptId:acknowledged.receiptId,geometry:acknowledged.geometry};
  const unacknowledged=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,current.state,{publication:{...validPublication,receiptId:'not-an-acknowledged-host-publication'}});
  assert.throws(()=>runtimePresenter.stage(unacknowledged),error=>error.code==='STALE_VIEW');
  const beforeHostWork=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,current.state,{publication:validPublication}),elapsed=h.store.source.elapsed;
  try{h.store.source.elapsed+=.125;assert.throws(()=>runtimePresenter.stage(beforeHostWork),error=>error.code==='STALE_VIEW');}finally{h.store.source.elapsed=elapsed;}
  assert.equal(runtimePresenter.inspect().root,acceptedRoot);
  const save=h.binding.save(),before=h.publications.length;assert.equal(h.binding.perform(command).repeated,true);assert.equal(publications,1);assert.equal(h.publications.length,before);assert.equal(h.binding.save(),save);
  const presentations=h.publications.filter(p=>p.name==='present').length,writes=h.writes;
  // Restoring the exact current save is an idempotent no-op, not a new CAS.
  const identical=h.binding.restore(save);assert.equal(identical.ok,true);assert.equal(identical.repeated,true);assert.equal(identical.committed,false);assert.deepEqual(identical.effects,[]);assert.equal(h.writes,writes);assert.equal(publications,1);assert.equal(h.publications.length,before);
  // Valid unrelated host work makes live restoration substantive without
  // rewinding/discarding any durable pane receipt or changing its scope.
  h.store.source.elapsed+=.25;h.store.source.futureRetained.unknown.push('fixture-host-work-after-save');h.store.source.revision++;
  assert.notEqual(h.binding.save(),save);
  const restored=h.binding.restore(save);assert.equal(restored.ok,true);assert.equal(restored.repeated,false);assert.equal(restored.committed,true);assert.deepEqual(restored.presentationErrors,[]);assert.equal(restored.publicationStopped,null);assert.equal(h.writes,writes+1);assert.equal(publications,2);assert.equal(h.publications.filter(p=>p.name==='present').length,presentations);assert.equal(h.binding.save(),save);assert.equal(runtimePresenter.inspect().instances.get('clear-a').panes.get('r0c0').root.visible,false);
  h.binding.dispose();h.store=F.openFarmyardWindowHostSave(save,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});const geometry=W.openWindowGeometry(h.store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),state=W.openWindowState(geometry,h.store.windowState);accept({receiptId:'acknowledged-cold-host-load',geometry:W.inspectWindowGeometry(W.windowStateGeometry(state))});assert.equal(h.publications.filter(p=>p.name==='present').length,presentations);assert.equal(F.serializeFarmyardWindowHostSave(h.store,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),save);
  assert.equal(Source.hero(h.store.source).hp,37);assert.equal(Source.hero(h.store.source).ap,11);assert.equal(Source.hero(h.store.source).ammo.pistol,8);assert.equal(Source.hero(h.store.source).stamina,.125);
  quietRestore={confirmedBreak:true,quietRetry:true,identicalSaveNoop:true,quietLiveRestore:true,quietColdOpen:true,completeSavePreserved:true,injuredSpentResourcesPreserved:true,fullPublicationFence:true,staleHostAndUnacknowledgedReceiptRefused:true};
}finally{h.binding.dispose();runtimePresenter.dispose();assert.equal(runtimePresenter.stats().geometries,0);assert.equal(runtimePool.counters.disposed,0);runtimePool.dispose();}

// This file is copied verbatim from the first installed-example JS fence.
const example=await import('./guide-example.mjs'),result=example.nativeWindowExampleResult;
assert.ok(result&&typeof result==='object','Guide must export nativeWindowExampleResult.');
assert.equal(result.status,'pass');assert.equal(result.actualPublicEntries,true);assert.equal(result.registeredAuthoring,true);assert.equal(result.borrowedPoolSurvived,true);assert.equal(result.finalOwnedGeometry,0);
assert.equal(globalThis.window,undefined);assert.equal(globalThis.document,undefined);
console.log(JSON.stringify({status:'pass',availability:'actual-declared-core-and-renderer',actualDeclaredCore:true,actualDeclaredRenderer:true,actualPublicPresenter:true,registeredAuthoring:true,privatePackagesOnlyIsolation:true,noBundledCoreOrThree:true,installedRuntimeAndSupportHashes:true,originalNoticeAndManifestInstalled:true,noticeURL:noticeURL.href,publicGuideURL:new URL('packages/native-window-presenter/README.md',renderer.url).href,authoringCardURLs:true,comparisonFixturesAndReferenceCodeExcluded:true,parity,lifecycle,authoring,quietRestore,guideExample:result,presenterTested:true,editorAdopted:false,gameAdopted:false}));
