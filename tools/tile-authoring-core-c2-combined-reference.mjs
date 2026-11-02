// DESIGN REFERENCE ONLY: exercise existing accepted C1/public journal facts.
// No proposed combined/producer runtime, fake live ownership or native provider.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from '../packages/tiles-core/index.js';
import * as M from '../packages/map-core/index.js';
import * as A from '../packages/tile-authoring-core/index.js';
import * as F from '../packages/tile-finishes/catalogue.js';
import {createWindowAuthoringJournal} from '../packages/windows-authoring/journal.js';
import {fixture} from '../tests/fixtures/tile-authoring/c1-workflow.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const prefix='candidates/tile-authoring/core/c2/proposals/';
const rawHash=x=>createHash('sha256').update(x).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p));
export function verifyCombinedReferenceSources(){
 const evidence=JSON.parse(read(prefix+'source-evidence.json'));
 for(const r of evidence.files){
  const raw=read(r.localPath);assert.equal(raw.length,r.bytes);assert.equal(rawHash(raw),r.sha256);
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),r.gitBlob);
  const lines=raw.toString('utf8').split(/\r?\n/);for(const anchor of r.anchors)assert.ok(lines[anchor.line-1]?.includes(anchor.contains),r.path+':'+anchor.line);
 }
 const session=read(prefix+'vendor/ad41/apps/editor/smart-tile/session.js').toString('utf8');
 const positions=['prepared=consumer.prepare(request);','profile.editOperation({checkpoint','history.beginEdit(JSON.stringify','const view=await views.acquire('].map(x=>session.indexOf(x));
 assert.ok(positions.every(x=>x>=0));assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
 return {fixedSources:evidence.files.length,hostReference:evidence.hostReference,actualPrepareBeforeOperationTicketAndNative:true,originalBytesAndAnchors:true};
}
export function runCombinedReferenceEvidence(){
 const sources=verifyCombinedReferenceSources(),f=fixture(T,M,A,F),documents=[f.document],boundMetadata=[];
 let document=f.document;
 for(let i=0;i<4;i++){
  const command=f.command(document,f.context,[f.operations[i]],'reference.metadata.'+i),plan=A.planTileAuthoring(T,{document,command,context:f.context});assert.equal(plan.ok,true,JSON.stringify(plan));assert.equal(plan.route,'source-unchanged');
  const bound=A.bindTileAuthoringTarget(T,{before:document,plan,prepared:null});assert.equal(bound.ok,true,JSON.stringify(bound));document=bound.targetDocument;documents.push(document);boundMetadata.push(bound);
 }
 const before=document,sourceText=JSON.stringify(before),command=f.command(before,f.context,[f.operations[4]],'reference.actual-prepare-first');
 const plan=A.planTileAuthoring(T,{document:before,command,context:f.context});assert.equal(plan.ok,true,JSON.stringify(plan));assert.equal(plan.route,'public-v1-repair');
 let reads=0,casCalls=0,actualPreparations=0,prepared,bound;
 const consumer=T.createRetainedTileConsumer({read(){reads++;return {bundle:before.tileBundle,token:f.context.hostAuthorityToken,contextToken:f.context.authorityContextToken};},compareAndSwap(){casCalls++;throw Error('Reference preparation must not write.');}});
 try{
  prepared=consumer.prepare(plan.request);actualPreparations++;assert.equal(prepared.ok,true,JSON.stringify(prepared));
  bound=A.bindTileAuthoringTarget(T,{before,plan,prepared});assert.equal(bound.ok,true,JSON.stringify(bound));
  assert.equal(JSON.stringify(before),sourceText);assert.equal(reads,1);assert.equal(casCalls,0);assert.equal(actualPreparations,1);
  assert.deepEqual(bound.targetDocument.tileBundle,prepared.next.bundle);assert.equal(prepared.expectedHostToken,f.context.hostAuthorityToken);
 }finally{consumer.dispose();}
 // Exercise the real journal's current ticket/ordinal behavior, not a proposed peek.
 const text=documents.map(x=>JSON.stringify(x)),journal=createWindowAuthoringJournal({initialText:text[0],contextKey:'reference-fixed-context'});
 for(let i=1;i<=2;i++)assert.equal(journal.accept(journal.beginEdit(text[i]),boundMetadata[i-1]).ok,true);
 const undo=journal.beginUndo();assert.equal(journal.snapshot.pending,undo);assert.equal(undo.targetText,text[1]);const firstOrdinal=undo.ordinal;
 assert.equal(journal.reject(undo),true);const secondUndo=journal.beginUndo();assert.equal(secondUndo.ordinal,firstOrdinal+1);assert.equal(journal.accept(secondUndo,boundMetadata[0]).ok,true);
 const redoCount=journal.snapshot.history.redo,probe=journal.beginUndo();assert.equal(journal.reject(probe),true);assert.equal(journal.snapshot.history.redo,redoCount);assert.equal(redoCount,1);
 assert.equal(Object.hasOwn(journal.snapshot,'past'),false);assert.equal(Object.hasOwn(journal.snapshot,'future'),false);assert.equal(Object.hasOwn(journal.snapshot.history,'targetText'),false);
 const cold=createWindowAuthoringJournal({initialText:journal.snapshot.text,contextKey:'reference-cold-context'});assert.equal(cold.accept(cold.beginOpen(journal.snapshot.text),boundMetadata[0]).ok,true);assert.equal(cold.snapshot.history.undo,0);assert.equal(cold.snapshot.history.redo,0);
 // Known-fixture hash-domain ORACLE ONLY. This is not a producer implementation.
 const d=bound.targetDocument,o=d.tileBundle.layout.instances[0],pin=d.authoring.ownerPins.find(x=>x.ownerId===o.id).definition;
 const def=d.authoring.library.definitions.find(x=>x.id===pin.id&&x.revision===pin.revision),surface=def.body.surfaces[0];
 const {contentDigest,...rawDefinition}=def,{frameDigest,...rawFrame}=surface;
 assert.equal(T.tileLayoutToken(rawDefinition),contentDigest);assert.equal(T.tileLayoutToken(rawFrame),frameDigest);
 assert.equal(T.tileLayoutToken({profile:surface.profile,frame:def.body.recipe.frame,shape:def.body.recipe.shape}),surface.geometryDigest);
 assert.equal(T.compileTileRecipe(def.body.recipe).contentDigest,o.contentDigest);
 const floorId=o.floorBindings[surface.floorSlot],gridDigest=T.tileLayoutToken(surface.grid),data={ownerId:o.id,surfaceId:surface.id,floorId,geometryDigest:surface.geometryDigest,frameDigest:surface.frameDigest,gridDigest};
 assert.equal(d.authoring.decorations.surfaces.length,0);
 const schema=JSON.parse(read('packages/tile-authoring-core/contract.schema.json'));
 assert.equal(schema.$defs.surfaceBinding.properties.layers.minItems,1);
 return {status:'existing-source-seam-and-domain-reference-pass',sources,
  existingPublicSeam:{actualPreparations,hostReads:reads,casCalls,sourceUnchanged:true,exactActualNextBundle:true,sourceLayoutRevision:before.tileBundle.layout.revision,targetLayoutRevision:prepared.next.bundle.layout.revision,actualPublicWork:prepared.work},
  existingJournal:{snapshotExposesHistoryHead:false,beginUndoCreatesActualPending:true,firstUndoOrdinal:firstOrdinal,nextUndoOrdinal:secondUndo.ordinal,rejectDoesNotReverseOrdinal:true,rejectedTicketPreservesRedo:true,coldBeginOpenResetsSessionHistory:true},
  firstSurfaceDomainOracle:{unpaintedPlacedRectangle:true,definitionPin:pin,geometryDigest:surface.geometryDigest,frameDigest,gridDigest,bindingDigest:T.tileLayoutToken(data),persistedBindingRequiresExplicitLayers:true},
  claims:{combinedRuntime:false,surfaceProducerImplemented:false,hostOwnership:false,nativeOwnership:false,decoderRun:false,walRecoveryProved:false,previewServers:0,retainedHelpers:0}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=runCombinedReferenceEvidence();if(process.argv.includes('--record'))fs.writeFileSync(path.join(root,prefix+'reference-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
