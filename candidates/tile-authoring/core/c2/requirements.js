import {hash,equal,fail,Budget,readData,corePort,fields,shape,freeze} from './data.js';
import {CAPS} from './contract.js';
export function requirements(t,before,target,b){
 const source=before.resourceRefs,next=target.resourceRefs,keys=new Set(source.map(x=>hash(t,x,b))),blobs=new Map();
 const used=new Set(target.authoring.decorations.chunks.flatMap(c=>c.marks.map(m=>hash(t,m.graphic.artwork,b))));
 for(const r of target.authoring.library.artwork){
  b.take();const ref=next.find(x=>x.artwork.id===r.id&&x.artwork.revision===r.revision&&x.artwork.contentDigest===r.contentDigest);
  if(!ref)fail('RESOURCE_REF_SET','/resourceRefs','Complete exact artwork reference coverage required.');
  const descriptor=r.body.blob;let g=blobs.get(descriptor.sha256);
  if(!g){g={blob:descriptor,consumers:[]};blobs.set(descriptor.sha256,g);}else if(!equal(t,g.blob,descriptor,b))fail('BLOB_DESCRIPTOR_CONFLICT','/resourceRefs','Same byte hash must retain one complete descriptor.');
  g.consumers.push(ref);
 }
 const encodedNeeds=[...blobs.values()].sort((a,z)=>a.blob.sha256<z.blob.sha256?-1:1),decodeNeeds=[];
 for(const x of encodedNeeds){x.consumers.sort((a,z)=>a.artwork.id<z.artwork.id?-1:a.artwork.id>z.artwork.id?1:a.artwork.revision-z.artwork.revision);const consumers=x.consumers.filter(r=>used.has(hash(t,r.artwork,b)));if(consumers.length)decodeNeeds.push({blobSha256:x.blob.sha256,decoderProfile:'png-rgba8-srgb-straight-v1',consumers});}
 const declaredEncodedRequirementBytes=encodedNeeds.reduce((n,x)=>n+x.blob.byteLength,0);
 if(declaredEncodedRequirementBytes>67108864)fail('PACK_ENCODED_LIMIT','/resources','Complete unique encoded requirements exceed64MiB.');
 const nextKeys=new Set(next.map(x=>hash(t,x,b)));
 return {sourceResourceRefs:source,targetResourceRefs:next,introduced:next.filter(x=>!keys.has(hash(t,x,b))),retained:next.filter(x=>keys.has(hash(t,x,b))),released:source.filter(x=>!nextKeys.has(hash(t,x,b))),encodedNeeds,decodeNeeds,declaredEncodedRequirementBytes};
}
export function costs(before,target,allocations,b){
 let sourceMarks=0,maxLayersOnSurface=0;for(const c of target.authoring.decorations.chunks){sourceMarks+=c.marks.length;b.take();}for(const s of target.authoring.decorations.surfaces){maxLayersOnSurface=Math.max(maxLayersOnSurface,s.layers.length);b.take();}
 const old=new Set(before.authoring.library.artwork.map(r=>r.body.blob.sha256)),fresh=new Map();
 for(const r of target.authoring.library.artwork)if(!old.has(r.body.blob.sha256))fresh.set(r.body.blob.sha256,r.body.blob.byteLength);
 for(const [k,cap]of Object.entries(CAPS))if(!Number.isSafeInteger(allocations[k])||allocations[k]<0||allocations[k]>cap)fail('BUDGET_EXHAUSTED','/allocations/'+k,'All views, peaks and unverified debt count against fixed caps.');
 return {sourceMarks,maxLayersOnSurface,newBlobBytes:[...fresh.values()].reduce((a,z)=>a+z,0),...allocations,boundKind:'proposal-only-not-performance-measurement',planning:b.snapshot()};
}

export function inspectTileAuthoringRequirements(actual,input){
 const t=corePort(actual),b=new Budget(),v=readData(input,b);fields(v,['document','subject'],'/requirements');
 const {validateDocument,sourceProjection,pin,recordKey,resourceRefs}=inspectionModel;
 const lib=validateDocument(t,v.document,b),records=v.subject?.kind==='nautilus-tile-authoring-source'?(equal(t,v.subject,sourceProjection(v.document),b)?[...lib.all.values()]:(fail('STALE_SOURCE','/subject','Exact complete source required.'))):[lib.resolve(v.subject)];
 const seen=new Set(),profiles=new Set(),artwork=[],unavailable=[];
 for(let i=0;i<records.length;i++){
  const r=records[i],key=recordKey(r);if(seen.has(key))continue;seen.add(key);for(const req of r.body.requires)profiles.add(req);
  try{inspectionSupported(t,r,b);}catch(e){if(!e.diagnostics||e.code.includes('LIMIT'))throw e;unavailable.push(...e.diagnostics);}
  if(r.kind==='nautilus-tile-preset'){records.push(lib.resolve(r.body.definition,'nautilus-recipe-definition'));for(const m of r.body.defaultMarks)records.push(lib.resolve(m.graphic.artwork,'nautilus-tile-artwork'));}
  if(r.kind==='nautilus-tile-artwork')artwork.push(r);
 }
 const result={kind:'nautilus-tile-authoring-requirements',version:1,subjectDigest:hash(t,v.subject,b),requiredProfiles:[...profiles].sort(),requiredResources:artwork.map(pin),unavailable};shape(t,'requirementsResult',result,b);b.output(result);return freeze(result);
}

import * as inspectionModel from './model.js';
import {supportedRecord as inspectionSupported} from './operations.js';
