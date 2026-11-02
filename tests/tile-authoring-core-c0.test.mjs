// Contract conformance/reference oracles only. No authoring executor or shader.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import * as T from '../packages/tiles-core/index.js';
import * as M from '../packages/map-core/index.js';
import {buildFixture,checkDocument,checkReferences,sourceProjection,checkLedger,clone,recordDigest,hashBytes} from '../tools/tile-authoring-core-fixtures.mjs';
import {artistInput,resourceRefs} from '../tools/tile-authoring-core-artist.mjs';
import {referenceGraphicPoint,referenceImageTopLeftUV,referenceTexelCenter,checkCoordinateVectors} from '../tools/tile-authoring-core-coordinate-reference.mjs';
const f=buildFixture(T,M),read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url))),schema=read('candidates/tile-authoring/core/contract.schema.json');
const vectors=read('candidates/tile-authoring/core/examples/sampling-contract-vectors.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);

test('C0 preserves direct777 command/query/pack/Expected/Pin/outcome/transport definitions; transitive Artwork adds imageView',()=>{
 const bytes=fs.readFileSync(new URL('../candidates/tile-authoring/core/inputs/core777.schema.json',import.meta.url));assert.equal(hashBytes(bytes),'5c90b291c03c02aa2f29232ad9474415715223cfe7d1cceb654b3c553ec06ced');const prior=JSON.parse(bytes);
 for(const name of ['command','operation','query','pack','expected','pin','applyOutcome','transport','applyRequest'])assert.deepEqual(schema.$defs[name],prior.$defs[name],name);
});

test('all30 fixed Artist frames have explicit whole-page/view/Core pin mappings and unchanged notices',()=>{
 const art=artistInput();assert.equal(f.artist.mapping.rows.length,30);assert.equal(f.artist.pages.length,2);assert.equal(hashBytes(art.manifestBytes),f.artist.mapping.sourceManifest.sha256);
 for(const [i,row]of f.artist.mapping.rows.entries()){
  const original=art.manifest.artworks[i],page=art.pages.find(p=>p.resource.id===row.sourceResource.id),resource=page.resource,frame=resource.atlas.frames.find(x=>x.id===original.frameId),core=f.document.authoring.library.artwork.find(x=>x.id===row.corePin.id),view=core.body.imageView;
  assert.deepEqual(row.sourceArtwork,{id:original.id,version:original.version,digest:original.digest});assert.deepEqual(row.sourceResource,original.resource);
  assert.deepEqual(view.frame.rectPx,frame.rectPx);assert.equal(view.frame.id,original.frameId);assert.equal(view.pageDigest,T.tileLayoutToken(core.body.blob));assert.equal(resource.sha256,core.body.blob.sha256);assert.equal(page.byteLength,core.body.blob.byteLength);
  assert.equal(view.sampler.alphaFloor8,resource.id==='art.organic-marks'?2:0);assert.equal(core.body.notices[0].noticeText,art.noticeBytes.toString('utf8'));assert.equal(recordDigest(T,core),row.corePin.contentDigest);
 }
});

test('full v3 document preserves six B1 fields while the source projection is a detached read-only view',()=>{
 const d=f.document;assert.equal(checkDocument(T,d).ok,true);assert.deepEqual(Object.keys(d).sort(),['kind','version','id','sourceJSON','floorBinding','finishBinding','tileBundle','constraints','contentRevision','authoring','resourceRefs'].sort());
 assert.equal(d.floorBinding.floors.length,15);assert.deepEqual(d.floorBinding.floors.slice(0,3).map(r=>r.source),[0,1,2].map(layerIndex=>({kind:'legacy-layer',layerIndex})));assert.equal(d.floorBinding.sourceSha256,hashBytes(d.sourceJSON));
 assert.equal(f.commands[0].expected.hostDocumentDigest,T.tileLayoutToken(d));assert.equal(f.commands[0].expected.workspaceRevision,d.contentRevision);assert.equal(f.commands[0].expected.resourceSetDigest,T.tileLayoutToken(d.resourceRefs));
 const before=T.tileLayoutToken(d),projection=sourceProjection(d);projection.authoring.library.artwork=[];assert.equal(T.tileLayoutToken(d),before);assert.notDeepEqual(projection,d);
});

test('durable resourceRefs resolve the one library authority and reject missing/stale/extra descriptors',()=>{
 for(const mutate of [d=>d.resourceRefs.pop(),d=>d.resourceRefs[0].imageViewDigest='0'.repeat(64),d=>d.resourceRefs[0].artwork.revision++,d=>d.resourceRefs.push(clone(d.resourceRefs[0])),d=>d.authoring.decorations.chunks[0].marks[0].graphic.artwork={...d.authoring.ownerPins[0].definition}]){const d=clone(f.document);mutate(d);assert.equal(checkDocument(T,d).ok,false);}
});

test('rehashed records still refuse out-of-page frames or a stale whole-page descriptor binding',()=>{
 for(const mutate of [r=>r.body.imageView.frame.rectPx[0]=1536,r=>r.body.blob.widthPx--]){const d=clone(f.document),r=d.authoring.library.artwork[1];mutate(r);r.contentDigest=recordDigest(T,r);d.resourceRefs=resourceRefs(T,d.authoring.library.artwork);assert.equal(checkDocument(T,d).ok,false);}
});

test('owner D4 uses current public source geometry once and preserves local mark binding; stale floor/frame refuses',()=>{
 const original=clone(f.source.authoring.decorations),recipe=f.source.authoring.library.definitions[0].body.recipe;
 for(const mirrorX of [false,true])for(let quarterTurns=0;quarterTurns<4;quarterTurns++){
  const s=clone(f.source),owner=s.tileBundle.layout.instances[0];owner.origin=[10,20,0];owner.transform={quarterTurns,mirrorX};
  const g=T.transformTileRecipe(recipe,owner,s.tileBundle.layout.floors).geometry,p=g.ports.find(p=>p.id==='north').endpoint.map(n=>n/1e6);
  let [x,y]=[mirrorX?-4:4,0];for(let i=0;i<quarterTurns;i++)[x,y]=[-y,x];assert.deepEqual(p,[10+x,20+y,0]);assert.deepEqual(s.authoring.decorations,original);assert.equal(checkReferences(T,s).ok,true);
 }
 const stale=clone(f.source);stale.tileBundle.layout.instances[0].floorBindings.base='F03';assert.equal(checkReferences(T,stale).ok,false);
 const frame=clone(f.source);frame.authoring.decorations.surfaces[0].frameDigest='0'.repeat(64);assert.equal(checkReferences(T,frame).ok,false);
});

test('grouped layer opacity is applied after ordered source-over, yielding .375',()=>{
 const v=vectors.groupOpacity,alpha=v.markAlphas.reduce((a,s,i)=>s*v.markOpacities[i]+a*(1-s*v.markOpacities[i]),0);near(alpha,v.compositedLayerAlpha);near(alpha*v.layerOpacity,v.resultAlpha);
 const wrong=v.markAlphas.reduce((a,s)=>s*v.layerOpacity+a*(1-s*v.layerOpacity),0);near(wrong,v.incorrectPerMarkLayerAlpha);assert.notEqual(wrong,v.resultAlpha);
});

test('sampler vectors require cutoff then linear premultiplication, linear tint and frame-local wrapping',()=>{
 const linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
 for(const s of vectors.alphaFloor.samples)near(s.alpha8<=vectors.alphaFloor.threshold8?0:s.alpha8/255,s.expectedAlpha);
 const b=vectors.bilinearPremultiplication,out=[0,0,0,0];b.straightSRGBTaps.forEach((t,i)=>{for(let c=0;c<3;c++)out[c]+=linear(t[c])*t[3]*b.weights[i];out[3]+=t[3]*b.weights[i];});assert.deepEqual(out,b.expectedLinearPremultipliedRGBA);
 near(linear(vectors.linearTint.sourceSRGB)*vectors.linearTint.tintLinear,vectors.linearTint.expectedLinear);
 for(const s of vectors.frameSampling.samples)assert.deepEqual(referenceTexelCenter(s.imageTopLeftUV,vectors.frameSampling.rectPx,s.form),s.expectedTransparent?null:s.expectedTexelCenter);
});

test('all aggregate appearance ceilings include existing finishes, pending views and retiring copies',()=>{
 const row={phase:'accepted-plus-pending-and-retiring',roots:2,triangles:50000,cells:1024,marks:1024,ownedAppearanceMaterials:64,contributorsPerBin:8,binReferences:32768,derivedBufferBytes:4194304,decodedAssets:[{allocationId:'decode',sha256:'a'.repeat(64),bytes:33554432}],atlasBindings:[0,1,2,3].map(i=>({allocationId:'page.'+i,sha256:String(i).repeat(64)}))};assert.equal(checkLedger([row]).ok,true);
 for(const key of ['roots','triangles','cells','marks','ownedAppearanceMaterials','contributorsPerBin','binReferences','derivedBufferBytes']){const over=clone(row);over[key]++;assert.equal(checkLedger([over]).ok,false,key);}
 const fifth=clone(row);fifth.atlasBindings.push({allocationId:'page.4',sha256:'4'.repeat(64)});assert.equal(checkLedger([fifth]).ok,false);
 const copy=clone(row);copy.decodedAssets.push({...copy.decodedAssets[0],allocationId:'decode-copy'});assert.equal(checkLedger([copy]).counts.decodedBytes,67108864);assert.equal(checkLedger([copy]).ok,false);
 const finishes=clone(row),compositor={...clone(row),roots:0,triangles:0,cells:0,marks:0,ownedAppearanceMaterials:1,contributorsPerBin:0,binReferences:0,derivedBufferBytes:0,decodedAssets:[],atlasBindings:[]};assert.equal(checkLedger([finishes,compositor]).ok,false);
});

test('PNG is the first required runtime decoder while WebP metadata grants no decoder capability',()=>{
 const d=read('candidates/tile-authoring/core/discovery.json');assert.equal(d.imageDecoders.firstRequired,'image/png');assert.equal(d.imageDecoders.implementedHere,false);assert.deepEqual(d.imageDecoders.optionalUnbound,['image/webp']);assert.equal(d.imageDecoders.metadataIsDecodeProof,false);assert.equal(d.proposedLimits.ownedAppearanceMaterialsAllViews,64);
});

test('standard fixture construction works without Git in PATH or worker commits fetched',()=>{
 const fixture=new URL('../tools/tile-authoring-core-fixtures.mjs',import.meta.url).href,tiles=new URL('../packages/tiles-core/index.js',import.meta.url).href,map=new URL('../packages/map-core/index.js',import.meta.url).href;
 const code=`import * as T from ${JSON.stringify(tiles)};import * as M from ${JSON.stringify(map)};import {buildFixture} from ${JSON.stringify(fixture)};console.log(buildFixture(T,M).artist.mapping.rows.length);`;
 const run=spawnSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,PATH:''},encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(run.status,0,run.stderr);assert.equal(run.stdout.trim(),'30');
});

test('stored noncentral image pivot remains fixed and top-left pixels use the same stored V convention',()=>{
 const w=vectors.noncentralPivotWitness,actual=referenceGraphicPoint(w.imageTopLeftUV,w.transform,w.surface,w.owner);assert.deepEqual(actual.surfaceLocalM,[3,5]);assert.deepEqual(actual.nativeM,w.expectedNativeM);
 const [ui,vi]=w.imageTopLeftUV,[pu,pv]=w.transform.pivotUV,mixed=[w.transform.positionM[0]+(ui-pu)*w.transform.sizeM[0],w.transform.positionM[1]+(1-vi-pv)*w.transform.sizeM[1]];near(mixed[1],2.6);assert.notDeepEqual(mixed,actual.surfaceLocalM);
 const up=[ui,1-vi],pivotUp=[pu,1-pv];near(up[1]-pivotUp[1],0);assert.deepEqual(referenceTexelCenter([.25,.75],[512,512,256,256],'stamp'),[575.5,703.5]);
});

test('nonzero source frame and noncentral off-pivot graphic transform agree with every explicit D4 witness and inverse',()=>{
 const result=checkCoordinateVectors(vectors);assert.deepEqual(result.problems,[]);assert.equal(result.allD4Poses,16);
 const w=vectors.sourceFrameWitness,actual=referenceGraphicPoint(w.imageTopLeftUV,w.transform,w.surface,w.owner);assert.deepEqual(actual.nativeM,[8,51,7]);assert.deepEqual(actual.renderM,[8,7,51]);
 const omitted=referenceGraphicPoint(w.imageTopLeftUV,w.transform,{...w.surface,originM:[0,0,0]},w.owner);assert.deepEqual(omitted.nativeM,[28,41,7]);assert.notDeepEqual(omitted.nativeM,actual.nativeM);
 const changed=clone(vectors);changed.allD4Witnesses[1].poses[7].expectedNativeM[0]++;assert.equal(checkCoordinateVectors(changed).ok,false);
 assert.throws(()=>referenceImageTopLeftUV([8,51,8],w.transform,w.surface,w.owner),/source-frame plane/);
});
