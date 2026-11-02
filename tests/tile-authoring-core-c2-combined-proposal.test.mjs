import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {runCombinedReferenceEvidence,verifyCombinedReferenceSources} from '../tools/tile-authoring-core-c2-combined-reference.mjs';
const dir=new URL('../candidates/tile-authoring/core/c2/proposals/',import.meta.url),read=p=>fs.readFileSync(new URL(p,dir)),load=p=>JSON.parse(read(p)),combined=load('combined-route.schema.json'),surface=load('surface-target.schema.json');
const hash=x=>createHash('sha256').update(x).digest('hex');

test('proposal uses fixed Git-object Host/source bytes and the actual public preparation precedes operation/ticket/native',()=>{
 const result=verifyCombinedReferenceSources();assert.equal(result.actualPrepareBeforeOperationTicketAndNative,true);assert.equal(result.fixedSources,13);
});
test('existing retained public C1 seam prepares once without CAS and materializes target from its actual result',()=>{
 const result=runCombinedReferenceEvidence();assert.equal(result.existingPublicSeam.actualPreparations,1);assert.equal(result.existingPublicSeam.casCalls,0);assert.equal(result.existingPublicSeam.exactActualNextBundle,true);assert.equal(result.existingJournal.rejectDoesNotReverseOrdinal,true);assert.equal(result.existingJournal.rejectedTicketPreservesRedo,true);assert.equal(result.existingJournal.coldBeginOpenResetsSessionHistory,true);assert.equal(result.claims.combinedRuntime,false);assert.equal(result.claims.surfaceProducerImplemented,false);
 assert.deepEqual(result,load('reference-results.json'));
});
test('combined intent has no predicted target and completed Plan3 discriminates real preparation from exact history',()=>{
 const defs=combined.$defs;assert.equal(combined.$id,'urn:nautilus:proposal:tile-authoring:c2-combined:2');
 assert.equal(defs.CombinedEditIntent.additionalProperties,false);assert.equal(Object.hasOwn(defs.CombinedEditIntent.properties,'targetDocument'),false);assert.equal(Object.hasOwn(defs.CombinedEditIntent.properties,'nextBundle'),false);
 const history=defs.CombinedHistoryPlan3.properties;assert.deepEqual(history.command,{type:'null'});assert.deepEqual(history.stackBinding,{type:'null'});assert.equal(history.request.properties.kind.const,'smart-tile-history-restore');assert.equal(history.geometryPreparation.$ref,'#/$defs/StoredHistoryGeometryObservation');
 for(const k of ['maxSteps','maxClosure','maxSpatialTests','maxGeometryWork'])assert.equal(defs.PublicRequestSubset.properties[k].minimum,1);
 const cold=defs.CombinedColdRecovery.properties;assert.equal(cold.replayAllowed.const,false);assert.equal(cold.blobGcAllowed.const,false);assert.equal(cold.oldLiveCapabilities.const,'invalid');
});
test('separate first-surface contract requires original source/current pin and never invents empty C0 layers',()=>{
 const defs=surface.$defs,input=defs.SurfaceTargetInput.properties;assert.equal(surface.$id,'urn:nautilus:proposal:tile-authoring:surface-target:1');assert.deepEqual(input.selection.required,['ownerId','surfaceId','definition']);assert.deepEqual(input.expectedSource.required,['hostDocumentDigest','workspaceRevision']);
 assert.equal(Object.hasOwn(defs.SurfaceBindingSeed.properties,'layers'),false);assert.equal(defs.SurfaceBindingSeed.additionalProperties,false);assert.deepEqual(defs.ProspectiveSurfaceTarget.properties.existingBinding,{type:'null'});assert.equal(defs.ExistingSurfaceTarget.properties.existingBinding.$ref,'urn:nautilus:candidate:tile-authoring:core:1#/$defs/surfaceBinding');
 const result=load('reference-results.json');assert.equal(result.firstSurfaceDomainOracle.unpaintedPlacedRectangle,true);assert.equal(result.firstSurfaceDomainOracle.persistedBindingRequiresExplicitLayers,true);
});
test('all added DTO object shapes are closed, declarations parse and packet manifest authenticates exact files',()=>{
 for(const schema of [combined,surface]){const walk=v=>{if(!v||typeof v!=='object')return;if(v.type==='object'&&v.properties)assert.equal(v.additionalProperties,false);for(const child of Object.values(v))walk(child);};walk(schema);}
 for(const p of ['combined-route.d.ts','surface-target.d.ts'])assert.doesNotThrow(()=>stripTypeScriptTypes(read(p).toString('utf8')));
 const manifest=load('manifest.json');for(const f of manifest.files){const raw=read(f.path.replace(/^proposals\//,''));assert.equal(raw.length,f.bytes);assert.equal(hash(raw),f.sha256);}
});
test('frozen appearance contract and existing public exports remain unchanged and proposals are not runtime imports',()=>{
 const abi=fs.readFileSync(new URL('../candidates/tile-authoring/core/c2/abi/manifest.json',import.meta.url));assert.equal(hash(abi),'f819d85c7f2f1f1111754e1f91f1dba40f3026ef6af726f809fc677e6497af70');
 for(const p of ['../candidates/tile-authoring/core/c2/index.js','../packages/tile-authoring-core/index.js']){const source=fs.readFileSync(new URL(p,import.meta.url),'utf8');assert.doesNotMatch(source,/planCombinedTile|proposals\//);if(p.includes('/packages/'))assert.doesNotMatch(source,/deriveTileSurfaceTarget/);}
});
