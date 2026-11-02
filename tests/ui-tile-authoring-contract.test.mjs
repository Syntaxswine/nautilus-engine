import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {tileLayoutToken} from '../packages/tiles-core/index.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),prefix='candidates/tile-authoring/ui/';
const read=file=>JSON.parse(fs.readFileSync(path.join(root,prefix,file),'utf8'));
const metadata=read('presentation.json'),schema=read('inputs/core-c0.schema.json'),discovery=read('inputs/core-discovery.json');
const pointer=(value,p)=>p.replace(/^#/,'').split('/').slice(1).reduce((v,k)=>v[k.replaceAll('~1','/').replaceAll('~0','~')],value);
test('pinned Core evidence is byte-exact and every UI control points at the canonical operation/discovery',()=>{
 for(const row of read('inputs/provenance.json').files){const bytes=fs.readFileSync(path.join(root,row.copy));assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);}
 assert.equal(metadata.controls.length,13);assert.equal(metadata.queries.length,2);
 for(const control of metadata.controls){assert.equal(pointer(schema,control.schemaPointer).properties.kind.const,control.operation);assert.equal(pointer(discovery,control.discoveryPointer).name,control.operation);}
 for(const row of metadata.queries)assert.equal(pointer(schema,row.schemaPointer).properties.kind.const,row.kind);
 for(const row of metadata.fieldControls)assert.ok(pointer(schema,row.schemaPointer),row.schemaPointer);
 assert.equal(metadata.service.authorityOwner,'Editor');
 assert.deepEqual(metadata.service.methods,['describe','snapshot','query','prepare','apply','cancel','recover']);
});
test('UI types borrow the sole Core grammar and no runtime/alias parser remains',()=>{
 const types=fs.readFileSync(path.join(root,prefix,'contract.d.ts'),'utf8'),html=fs.readFileSync(path.join(root,prefix,'specimen.html'),'utf8');
 assert.match(types,/import type \* as Core/);assert.match(types,/Core\.HostService/);
 assert.doesNotMatch(types,/interface (Command|Pin|Expected|Pack|ApplyOutcome)\b/);
 for(const file of ['discovery.js','specimen.js'])assert.equal(fs.existsSync(path.join(root,prefix,file)),false);
 assert.doesNotMatch(html,/<script|\son(?:click|pointerup|submit)=/i);
 assert.equal(metadata.runtimeImplemented,false);assert.equal(discovery.executorImplemented,false);
 for(const match of html.matchAll(/<button\b([^>]*)>/g))assert.match(match[1],/\bdisabled\b/);
});
test('examples use operations, full Expected and canonical exact pins without historical wrappers',()=>{
 const index=read('example-index.json'),required=Object.keys(schema.$defs.expected.properties).sort();
 for(const row of index.examples){
  assert.ok(pointer(schema,row.schemaPointer));
  const value=JSON.parse(fs.readFileSync(path.join(root,row.file),'utf8'));
  if(row.schemaPointer==='#/$defs/command'){
   assert.deepEqual(Object.keys(value).sort(),['kind','version','requestId','expected','operations','budgetProfile'].sort());
   assert.deepEqual(Object.keys(value.expected).sort(),required);
   assert.ok(value.operations.every(op=>metadata.controls.some(row=>row.operation===op.kind)));
  }
 }
 const paint=read('examples/paint-command.json'),pin=paint.operations[0].body.mark.graphic.artwork;
 assert.deepEqual(Object.keys(pin).sort(),['contentDigest','id','revision']);
 const transport=read('examples/transport-prepare.json');assert.equal(transport.action,'prepare');assert.deepEqual(transport.command,paint);
});
test('v3 document retains all B1 fields, one module and exact typed artwork references; Source stays read-only',()=>{
 const packet=read('examples/snapshot.json'),doc=packet.document,source=packet.source;
 assert.equal(doc.version,3);assert.equal(doc.kind,'nautilus-tile-workbench-document');
 assert.deepEqual(Object.keys(doc).sort(),schema.$defs.workbenchDocument.required.toSorted());
 assert.deepEqual(doc.authoring,source.authoring);assert.equal(doc.contentRevision,source.revision);
 assert.ok(doc.floorBinding.floors.some(row=>row.source.kind==='legacy-layer'));
 assert.ok(doc.floorBinding.floors.some(row=>row.source.kind==='authored-tile'));
 assert.equal(doc.resourceRefs.length,doc.authoring.library.artwork.length);
 for(const ref of doc.resourceRefs){
  assert.deepEqual(Object.keys(ref).sort(),['artwork','imageViewDigest','kind','version']);
  const art=doc.authoring.library.artwork.find(row=>row.id===ref.artwork.id&&row.revision===ref.artwork.revision);
  assert.equal(art.contentDigest,ref.artwork.contentDigest);
  assert.equal(tileLayoutToken({blob:art.body.blob,imageView:art.body.imageView}),ref.imageViewDigest);
 }
 assert.equal(metadata.dataAuthority.sourceProjectionReadOnly,true);assert.equal(metadata.dataAuthority.sourceIsDocumentAlias,false);
});
test('library versions are immutable, default capture is off and selected upgrade cannot touch the other copy',()=>{
 assert.equal(metadata.defaults.includeSelectedDecorationDefaults,false);
 const clean=read('examples/preset-save-clean.json').operations[0].body.preset;
 assert.deepEqual(clean.body.defaultMarks,[]);assert.deepEqual(clean.body.defaultLayers,[]);
 const captured=read('examples/preset-save-selected.json').operations[0].body.preset;
 assert.equal(captured.body.defaultMarks.length,1);assert.notEqual(captured.id,clean.id);
 const cow=read('examples/placement-cow-command.json');
 assert.deepEqual(cow.operations.map(row=>row.kind),['recipe.clone','placement.upgrade']);
 assert.deepEqual(cow.operations[1].body.ownerIds,['owner.a']);
 assert.equal(cow.operations[1].body.to.contentDigest,cow.operations[0].body.definition.contentDigest);
 assert.equal(cow.operations[1].body.anchorDecisions[0].action,'preserve-identical');
 const place=read('examples/place-two-empty.json').operations[0].body;
 assert.equal(place.defaults,'empty');assert.equal(new Set(place.placements.map(row=>row.ownerId)).size,2);
 const upgrade=read('examples/upgrade-selected.json').operations[0].body;
 assert.deepEqual(upgrade.ownerIds,['owner.a']);assert.ok(!upgrade.ownerIds.includes('owner.b'));assert.equal(upgrade.anchorDecisions[0].action,'delete');
 for(const file of ['clone-command.json','revise-command.json','preset-save-clean.json','preset-save-selected.json']){
  const body=read('examples/'+file).operations[0].body,record=body.definition||body.preset,{contentDigest,...raw}=record;assert.equal(tileLayoutToken(raw),contentDigest);
 }
});
test('outcomes distinguish true/false/null and recovery preserves the original identity',()=>{
 const yes=read('examples/outcome-committed.json'),no=read('examples/outcome-rejected.json'),unknown=read('examples/outcome-unknown.json');
 assert.equal(yes.committed,true);assert.equal(no.committed,false);assert.equal(unknown.committed,null);
 assert.equal(unknown.writesFrozen,true);assert.equal(unknown.requestId,unknown.recoveryRequestId);
 assert.equal(read('examples/transport-recover.json').requestId,unknown.requestId);
 assert.equal(unknown.potentiallyCommittedResources,'retain-until-same-id-recovery');assert.equal(yes.presentation,'failed');
 assert.equal(read('examples/prepare-no-change.json').diagnostics[0].code,'NO_CHANGE');
 assert.match(metadata.flow.noChange,/preserves redo/);assert.match(metadata.flow.metadataOnly,/source-unchanged/);
});
test('appearance and resource controls retain explicit frame/sampler, linear tint, grouped opacity and top-left pivots',()=>{
 const doc=read('inputs/core-document-v3.json'),art=doc.authoring.library.artwork[0],mark=read('examples/update-local-mark.json').operations[0].body.replacement;
 assert.equal(art.body.blob.colorSpace,'srgb');assert.equal(art.body.blob.alphaMode,'straight');
 assert.equal(art.body.imageView.frame.origin,'top-left');assert.equal(art.body.imageView.sampler.profile,'linear-premultiplied-bilinear-frame-v1');
 assert.deepEqual(mark.graphic.transform.pivotUV,[.2,.8]);assert.deepEqual(mark.graphic.tintLinearRGB,[.5,.75,1]);
 assert.equal(metadata.coordinates.storedImageUV,'top-left');assert.equal(metadata.coordinates.storedPivotUV,'top-left');
 assert.equal(metadata.resources.bytesInFiniteCommand,false);assert.match(metadata.resources.layerOpacity,/group/);
 assert.equal(metadata.proposedLimits.ownedAppearanceMaterialsAllViews,64);assert.equal(metadata.limitsMeasured,false);
 assert.ok(metadata.unsupported.includes('physical-crater'));assert.ok(metadata.unsupported.includes('3d-plant'));
});

test('Expected binds the full v3 document/floor/resource authority, not its reduced Source alias',()=>{
 const packet=read('examples/snapshot.json'),{document:doc,source,expected}=packet;
 assert.equal(expected.workspaceDigest,tileLayoutToken(source));assert.equal(expected.hostDocumentDigest,tileLayoutToken(doc));
 assert.equal(expected.floorProfileDigest,tileLayoutToken(doc.floorBinding));
 assert.notEqual(expected.floorProfileDigest,tileLayoutToken(source.floorProfile));
 assert.equal(expected.resourceSetDigest,tileLayoutToken(doc.resourceRefs));
 assert.equal(expected.contentDigest,tileLayoutToken(doc.authoring.library));
 assert.equal(expected.decorationDigest,tileLayoutToken(doc.authoring.decorations));
});
test('corrected Core coordinate witnesses retain top-left pivots, nonzero source origin and all sixteen D4 vectors',()=>{
 const v=read('inputs/core-sampling-vectors.json');
 assert.equal(v.coordinates.storedImageUV,'image-top-left');assert.equal(v.coordinates.storedPivotUV,'image-top-left');
 assert.deepEqual(v.noncentralPivotWitness.expectedSurfaceLocalM,[3,5]);
 assert.notDeepEqual(v.noncentralPivotWitness.expectedSurfaceLocalM,v.noncentralPivotWitness.previousMixedPivotSurfaceLocalM);
 assert.deepEqual(v.sourceFrameWitness.expectedNativeM,[8,51,7]);assert.deepEqual(v.sourceFrameWitness.expectedRenderM,[8,7,51]);
 assert.equal(v.allD4Witnesses.flatMap(row=>row.poses).length,16);
 for(const row of v.allD4Witnesses)for(const p of row.poses)assert.deepEqual(p.expectedRenderM,[p.expectedNativeM[0],p.expectedNativeM[2],p.expectedNativeM[1]]);
 assert.equal(v.groupOpacity.resultAlpha,.375);assert.notEqual(v.groupOpacity.resultAlpha,v.groupOpacity.incorrectPerMarkLayerAlpha);
 assert.equal(metadata.coordinates.status,'fixed-core-coordinate-contract');
});
