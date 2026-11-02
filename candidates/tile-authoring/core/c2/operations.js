import {fail,hash,equal,clone} from './data.js';
import {libraryIndex,resourceRefs,pin,recordKey} from './model.js';
import {rectangleInfo} from './geometry.js';
import {REQUIRED,PROFILES,STAGE_A} from './contract.js';

const targetKey=x=>[x.ownerId,x.surfaceId,x.floorId].join('|');
const unique=(xs,code,path)=>{if(new Set(xs).size!==xs.length)fail(code,path,'Duplicate identities refuse.');};
export function supportedRecord(t,r,b){
 b.supportedRecords??=new WeakSet();if(b.supportedRecords.has(r))return;
 const known=[...REQUIRED,'custom-raster-srgb-straight-v1','finite-raster-frame-v1','png-rgba8-decoder-v1',...Object.values(PROFILES)];
 for(const req of r.body.requires){b.take();if(!known.includes(req))fail('C2_REQUIRED_PROFILE_UNAVAILABLE','/requires','Unsupported required profile: '+req);}
 if(r.kind==='nautilus-recipe-definition'){
  if(r.body.sourceProfile!=='local-level-region-v1')fail('C2_RECTANGLE_PROFILE_REQUIRED','/definition','Only the local level rectangle source is supported.');
  rectangleInfo(t,r.body.recipe,b);
 }
 if(r.kind==='nautilus-tile-artwork'&&r.body.blob.mediaType!=='image/png')fail('C2_PNG_PROFILE_REQUIRED','/artwork/blob','Only the fixed narrow PNG profile is supported; descriptors do not imply decoder readiness.');
 if(r.kind==='nautilus-tile-preset'&&(r.body.defaultMarks.length||r.body.defaultLayers.length))fail('C2_STAGE_B_DEFAULTS_UNAVAILABLE','/preset','Graphic preset defaults require the separate Stage B checkpoint.');
 b.supportedRecords.add(r);
}
export function validatePack(t,p,b){
 const idx=libraryIndex(t,p.manifest,b),blobs=new Map();
 for(const r of idx.all.values()){
  supportedRecord(t,r,b);
  if(r.kind==='nautilus-tile-artwork'){const old=blobs.get(r.body.blob.sha256);if(old&&!equal(t,old,r.body.blob,b))fail('BLOB_DESCRIPTOR_CONFLICT','/pack','Same bytes cannot have inconsistent immutable descriptors.');blobs.set(r.body.blob.sha256,r.body.blob);}
 }
 const required=[...new Set([...idx.all.values()].flatMap(r=>r.body.requires))].sort();
 if(!equal(t,p.requires.slice().sort(),required,b))fail('PACK_REQUIRED_PROFILES','/pack/requires','Pack requires must cover the complete dependency closure exactly.');
 unique(p.blobEntries.map(x=>x.sha256),'PACK_BLOB_DUPLICATE','/pack/blobEntries');
 if(p.blobEntries.length!==blobs.size)fail('PACK_BLOB_CLOSURE','/pack','Exactly one encoded entry for every unique complete page is required.');
 let bytes=0;
 for(const e of p.blobEntries){const blob=blobs.get(e.sha256);if(!blob||e.byteLength!==blob.byteLength||e.entry!=='blobs/'+e.sha256+(blob.mediaType==='image/png'?'.png':'.webp'))fail('PACK_BLOB_CLOSURE','/pack','Entry name, hash, media type and byte length must bind the actual descriptor.');bytes+=e.byteLength;b.take();}
 if(bytes>67108864)fail('PACK_ENCODED_LIMIT','/pack','Complete unique encoded requirements exceed 64 MiB.');
 return idx;
}
export function sourceSurface(t,d,target,b,{editable=false}={}){
 b.surfaceCache??=new WeakMap();let cached=b.surfaceCache.get(d);if(!cached){cached=new Map();b.surfaceCache.set(d,cached);}const cacheKey=targetKey(target)+'|'+target.bindingDigest+'|'+editable;if(cached.has(cacheKey)){b.take();return cached.get(cacheKey);}
 const o=d.tileBundle.layout.instances.find(x=>x.id===target.ownerId),p=d.authoring.ownerPins.find(x=>x.ownerId===target.ownerId);
 if(!o||!p)fail('SURFACE_OWNER_REQUIRED','/target','Exact current placed owner and immutable definition are required.');
 if(editable&&o.locked)fail('LOCK_CONFLICT','/target','The whole owner is locked.');
 const def=d.authoring.library.definitions.find(x=>recordKey(x)===recordKey(p.definition)&&x.contentDigest===p.definition.contentDigest);
 if(!def)fail('MISSING_EXACT_REFERENCE','/target','Current definition is absent.');
 supportedRecord(t,def,b);
 const surface=def.body.surfaces.find(x=>x.id===target.surfaceId);
 if(!surface||o.floorBindings[surface.floorSlot]!==target.floorId||surface.floorOffsetM!==0||surface.originM[2]!==0)fail('C2_SURFACE_PROFILE_REQUIRED','/target','Use the exact existing level rectangle top and native floor.');
 const data={ownerId:o.id,surfaceId:surface.id,floorId:target.floorId,geometryDigest:surface.geometryDigest,frameDigest:surface.frameDigest,gridDigest:hash(t,surface.grid,b)};
 const binding={...data,definition:pin(def),bindingDigest:hash(t,data,b)};
 if(binding.bindingDigest!==target.bindingDigest)fail('STALE_SURFACE_BINDING','/target','Source geometry, frame or authored grid changed.');
 const result={binding,surface,def};cached.set(cacheKey,result);return result;
}
export function checkGraphic(t,d,m,b,{editable=false}={}){
 const {surface}=sourceSurface(t,d,m.target,b,{editable});
 b.artworkLookup??=new WeakMap();let art=b.artworkLookup.get(d);if(!art){art=new Map(d.authoring.library.artwork.map(x=>{b.take();return [recordKey(x),x];}));b.artworkLookup.set(d,art);}const r=art.get(recordKey(m.graphic.artwork));
 if(!r||r.contentDigest!==m.graphic.artwork.contentDigest)fail('MISSING_EXACT_REFERENCE','/graphic/artwork','Exact artwork Pin is required.');
 supportedRecord(t,r,b);
 if(m.groupId!==null)fail('C2_GROUPING_UNAVAILABLE','/groupId','Grouping, phase-preserving detach and reanchor remain Stage C.');
 const mask=m.graphic.mask;
 if(mask.kind==='grid-spans'&&(mask.grid.id!==surface.grid.id||mask.grid.version!==surface.grid.version||mask.grid.digest!==hash(t,surface.grid,b)))fail('MASK_GRID','/graphic/mask','Bind the exact authored grid ID, version and digest.');
}
export function stageOperations(t,before,command,context,b){
 // Already-owned strict input records are immutable in this reducer. Copy only
 // mutable containers/decorations, retaining validated record values by identity.
 const d={...before,authoring:{...before.authoring,library:{...before.authoring.library,definitions:[...before.authoring.library.definitions],presets:[...before.authoring.library.presets],artwork:[...before.authoring.library.artwork]},decorations:clone(before.authoring.decorations,b),ownerPins:before.authoring.ownerPins}},lib=d.authoring.library,deco=d.authoring.decorations;
 b.take(lib.definitions.length+lib.presets.length+lib.artwork.length);
 unique(command.operations.map(x=>x.opId),'DUPLICATE_OPERATION_ID','/operations');
 const markMap=new Map(),chunkMap=new Map();
 for(const c of deco.chunks){if(chunkMap.has(c.id))fail('DUPLICATE_CHUNK','/decorations/chunks','Chunk IDs must be unique.');chunkMap.set(c.id,c);for(const m of c.marks)markMap.set(m.id,{chunk:c,mark:m});}
 const deleteMarks=ids=>{unique(ids,'DUPLICATE_MARK','/markIds');for(const id of ids){b.take();const entry=markMap.get(id);if(!entry)fail('MARK_REQUIRED','/markIds','Every explicitly deleted mark must exist.');if(entry.mark.groupId!==null)fail('C2_GROUPING_UNAVAILABLE','/markIds','Grouped changes are deferred.');sourceSurface(t,d,entry.mark.target,b,{editable:true});}const set=new Set(ids);for(const c of deco.chunks)c.marks=c.marks.filter(m=>!set.has(m.id));for(const id of ids)markMap.delete(id);};
 for(const op of command.operations){
  b.take(8);const body=op.body;
  if(!STAGE_A.includes(op.kind))fail('C2_STAGE_A_OPERATION_UNAVAILABLE','/operations','Stage A does not implement '+op.kind+'. Geometry/appearance composition and Stage C require their explicit routes.');
  if(op.kind==='content.import'){
   const incoming=validatePack(t,body.pack,b),idx=libraryIndex(t,lib,b);
   for(const r of incoming.all.values()){
    const old=idx.all.get(recordKey(r));
    if(old){if(!equal(t,r,old,b))fail('IMMUTABLE_CONTENT_CONFLICT','/pack','Same identity/version cannot replace different immutable bytes.');continue;}
    if([...idx.all.values()].some(x=>x.id===r.id&&x.kind!==r.kind))fail('IDENTITY_KIND_CONFLICT','/pack','A content identity cannot change kind.');
    lib[r.kind==='nautilus-recipe-definition'?'definitions':r.kind==='nautilus-tile-preset'?'presets':'artwork'].push(r);idx.all.set(recordKey(r),r);
   }
   for(const k of ['definitions','presets','artwork'])if(lib[k].length>b.limits[k])fail('CONTENT_LIMIT','/library/'+k,'Retain all immutable versions within captured limits.');
   libraryIndex(t,lib,b);d.resourceRefs=resourceRefs(t,lib.artwork,b);b.artworkLookup?.delete(d);
  }else if(op.kind==='surface.layers'){
   const {binding}=sourceSurface(t,d,body.target,b,{editable:true}),key=targetKey(body.target),at=deco.surfaces.findIndex(x=>targetKey(x)===key);
   unique(body.layers.map(x=>x.id),'DUPLICATE_LAYER','/layers');unique(body.layers.map(x=>x.order),'DUPLICATE_LAYER_ORDER','/layers');
   const kept=new Set(body.layers.map(x=>x.id)),removed=[...markMap.values()].map(x=>x.mark).filter(m=>targetKey(m.target)===key&&!kept.has(m.layerId)).map(m=>m.id).sort();
   unique(body.removedLayerMarkIds,'DUPLICATE_MARK','/removedLayerMarkIds');
   if(!equal(t,removed,body.removedLayerMarkIds.slice().sort(),b))fail('EXPLICIT_LAYER_DELETE_REQUIRED','/removedLayerMarkIds','Explicitly list exactly every mark on a removed layer.');
   deleteMarks(removed);
   if(!body.layers.length){if(at>=0)deco.surfaces.splice(at,1);}
   else if(at<0)deco.surfaces.push({...binding,layers:clone(body.layers,b)});
   else deco.surfaces[at]={...binding,layers:clone(body.layers,b)};
  }else if(op.kind==='decoration.add'){
   const m=body.mark;if(markMap.has(m.id)||m.revision!==1)fail('FRESH_MARK_REQUIRED','/mark','Add uses a fresh ID and revision 1.');
   checkGraphic(t,d,m,b,{editable:true});
   const s=deco.surfaces.find(x=>targetKey(x)===targetKey(m.target));if(!s?.layers.some(l=>l.id===m.layerId))fail('MARK_LAYER_REQUIRED','/mark/layerId','Create the exact target layer explicitly.');
   let chunk=chunkMap.get(body.chunkId);if(!chunk){chunk={id:body.chunkId,marks:[]};deco.chunks.push(chunk);chunkMap.set(chunk.id,chunk);}
   if(chunk.marks.length>=4096)fail('SOURCE_MARK_LIMIT','/chunk','At most4096 source marks per chunk.');
   const mark=clone(m,b);chunk.marks.push(mark);markMap.set(mark.id,{chunk,mark});
  }else if(op.kind==='decoration.update'){
   const entry=markMap.get(body.markId),m=body.replacement;
   if(!entry||entry.mark.revision!==body.expectedRevision||m.id!==body.markId||m.revision!==body.expectedRevision+1)fail('STALE_MARK_REVISION','/replacement','Update requires exact old revision and same ID at next revision.');
   if(entry.mark.groupId!==null)fail('C2_GROUPING_UNAVAILABLE','/mark','Grouped updates are deferred.');
   if(!equal(t,entry.mark.target,m.target,b))fail('C2_REANCHOR_UNAVAILABLE','/replacement/target','Owner/surface/floor/binding changes require an explicit future reanchor route.');
   checkGraphic(t,d,m,b,{editable:true});
   const s=deco.surfaces.find(x=>targetKey(x)===targetKey(m.target));if(!s?.layers.some(l=>l.id===m.layerId))fail('MARK_LAYER_REQUIRED','/replacement/layerId','Target layer must already exist.');
   const next=clone(m,b);entry.chunk.marks[entry.chunk.marks.indexOf(entry.mark)]=next;markMap.set(next.id,{chunk:entry.chunk,mark:next});
  }else deleteMarks(body.markIds);
 }
 return d;
}
export function validateAppearanceDocument(t,d,b){
 if(d.authoring.decorations.groups.length)fail('C2_GROUPING_UNAVAILABLE','/decorations/groups','Stage C group/phase presentation has not been implemented. Preserve the whole saved source and refuse this appearance route.');
 const ids=new Set();
 for(const c of d.authoring.decorations.chunks){b.take();if(ids.has(c.id))fail('DUPLICATE_CHUNK','/chunks','Chunk IDs are unique.');ids.add(c.id);if(c.marks.length>4096)fail('SOURCE_MARK_LIMIT','/chunks','At most4096 marks per chunk.');for(const m of c.marks){if(m.groupId===null)checkGraphic(t,d,m,b);}}
 for(const s of d.authoring.decorations.surfaces)sourceSurface(t,d,s,b);
}
