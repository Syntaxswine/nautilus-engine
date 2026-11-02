// Pure-source/canonical-byte fixtures only; no live Host, renderer or decoder.
import fs from 'node:fs';
import * as C from '../candidates/tile-authoring/core/c2/index.js';
import {T,cp,pack,token,stageFixture,paintOperations,preparedCapture} from './tile-authoring-core-c2-fixtures.mjs';
export {T,cp,pack,token,C,stageFixture,preparedCapture};
export function source(){
 const f=stageFixture().f,ops=paintOperations(f,{count:30});
 for(let i=0;i<30;i++){const r=pack.manifest.artwork[i],g=ops[i+2].body.mark.graphic;g.artwork={id:r.id,revision:r.revision,contentDigest:r.contentDigest};if(i>=18){g.form='detail';g.wrap='repeat';}g.transform.pivotUV=[.15+(i%3)*.2,.75];}
 const x=stageFixture(ops),plan=C.planTileAuthoring(T,x.input);if(!plan.ok)throw Error(JSON.stringify(plan));
 return {document:plan.targetDocument,input:x.input,plan};
}
export function captureInput(document){
 const ownerId=document.authoring.ownerPins[0].ownerId,s=document.authoring.decorations.surfaces.find(x=>x.ownerId===ownerId);
 return {document,identity:{id:'preset.c2-captured-thirty',revision:1,label:'Captured original thirty'},ownerId,layerRemaps:s.layers.map(l=>({surfaceId:s.surfaceId,layerId:l.id,templateLayerId:'template.'+l.id})),markRemaps:document.authoring.decorations.chunks.flatMap(c=>c.marks).filter(m=>m.target.ownerId===ownerId).map(m=>({markId:m.id,templateMarkId:'template.'+m.id}))};
}
export function originalEntries(){
 const paths=['organic-marks-v1.png','road-marks-v1.png'];
 return paths.map(name=>{
  const bytes=fs.readFileSync(new URL('../candidates/tile-authoring/art/resources/'+name,import.meta.url)),r=pack.manifest.artwork.find(r=>r.body.blob.byteLength===bytes.length);
  if(!r)throw Error('Fixed original PNG page missing.');
  return {entry:'blobs/'+r.body.blob.sha256+'.png',bytes:new Uint8Array(bytes)};
 }).sort((a,z)=>a.entry<z.entry?-1:1);
}
export function save(document,preset){
 const x=stageFixture([{kind:'preset.save',body:{preset}}],{document}),plan=C.planTileAuthoring(T,x.input);if(!plan.ok)throw Error(JSON.stringify(plan));
 const capture=preparedCapture(plan,{reuseExistingArtwork:true}),bound=C.bindTileAuthoringTarget(T,{before:document,plan,prepared:null,appearanceCapture:capture});if(!bound.ok)throw Error(JSON.stringify(bound));
 return {document:bound.targetDocument,plan,capture,bound};
}
