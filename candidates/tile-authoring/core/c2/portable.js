// Pure file-set carrier: exact C0 Pack plus actual owned Uint8Array entries.
// The consumer owns archive/filesystem transport and durable blob retention.
import {Budget,readData,corePort,fields,shape,fail,hash,freeze,plain} from './data.js';
import {jsonBytes} from './budget.js';
import {validateDocument,recordKey,libraryIndex} from './model.js';
import {validatePack,validateAppearanceDocument} from './operations.js';
import {sha256Bytes} from './byte-hash.js';
const typedProto=Object.getPrototypeOf(Uint8Array.prototype);
const typedLength=Object.getOwnPropertyDescriptor(typedProto,'byteLength').get;
const typedBuffer=Object.getOwnPropertyDescriptor(typedProto,'buffer').get;
const typedName=Object.getOwnPropertyDescriptor(typedProto,Symbol.toStringTag).get;
const isShared=buffer=>typeof SharedArrayBuffer!=='undefined'&&buffer instanceof SharedArrayBuffer;
function dataRecord(v,allowed,required=allowed){
 fields(v,allowed,'/portable',required);const out={};
 for(const k of Reflect.ownKeys(v)){const q=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||!q.enumerable||!Object.hasOwn(q,'value')||k==='__proto__')fail('INVALID_DATA','/portable','Only own enumerable data fields; no getters/symbols/hidden values.');out[k]=q.value;}
 return out;
}
function begin(input,allowed,required){
 const outer=dataRecord(input,allowed,required),entries=outer.entries;delete outer.entries;
 const reader=new Budget(),v=readData(outer,reader,reader.limits.inputBytes),b=new Budget(v.limits??{});
 b.take(reader.units);b.nodes=reader.nodes;b.maxDepthObserved=reader.maxDepthObserved;b.input(reader.inputBytes);
 if(b.nodes>b.limits.nodes||(b.maxDepthObserved??0)>b.limits.depth)fail('AUTHORING_NODE_LIMIT','/portable','Effective finite metadata nodes/depth exceeded.');
 return {v,b,entries};
}
function copyEntries(entries,pack,b){
 if(!Array.isArray(entries)||Object.getPrototypeOf(entries)!==Array.prototype||entries.length>256)fail('PACK_ENTRIES_REQUIRED','/entries','Finite explicit file entries are required.');
 if(Reflect.ownKeys(entries).length!==entries.length+1)fail('INVALID_DATA','/entries','No sparse/exotic entry arrays.');
 const wanted=new Map(pack.blobEntries.map(x=>[x.entry,x])),seen=new Set(),out=[];let bytes=0;
 for(let i=0;i<entries.length;i++){
  const q=Object.getOwnPropertyDescriptor(entries,String(i));if(!q||!Object.hasOwn(q,'value')||!q.enumerable)fail('INVALID_DATA','/entries','No sparse/accessor entry lists.');
  const row=dataRecord(q.value,['entry','bytes']),name=readData({entry:row.entry},b,b.limits.commandBytes).entry,need=wanted.get(name);
  if(!need||seen.has(name))fail('PACK_ENTRY_CLOSURE','/entries','Exact canonical unique file names are required; no aliases or extra files.');seen.add(name);
  let length,buffer,tag;try{length=typedLength.call(row.bytes);buffer=typedBuffer.call(row.bytes);tag=typedName.call(row.bytes);}catch{fail('PACK_BYTES_REQUIRED','/entries/bytes','Actual Uint8Array bytes are required, never a path, digest string or decoder flag.');}
  if(tag!=='Uint8Array'||isShared(buffer))fail('PACK_BYTES_REQUIRED','/entries/bytes','Use stable non-shared Uint8Array bytes.');
  if(length!==need.byteLength)fail('PACK_BYTE_LENGTH','/entries','Actual byte length must equal the complete blob descriptor.');
  bytes+=length;if(bytes>67108864)fail('PACK_ENCODED_LIMIT','/entries','Unique portable encoded payload exceeds64MiB.');
  b.input(length);b.take(Math.ceil(length/64));const copy=new Uint8Array(length);Uint8Array.prototype.set.call(copy,row.bytes);
  b.take(Math.ceil(length/64));if(sha256Bytes(copy)!==need.sha256)fail('PACK_BYTE_HASH','/entries','Actual copied encoded bytes must match full SHA-256.');
  out.push({entry:name,bytes:copy});
 }
 if(seen.size!==wanted.size)fail('PACK_ENTRY_CLOSURE','/entries','Every dependency page requires actual bytes.');
 out.sort((a,z)=>a.entry<z.entry?-1:1);return {entries:out,bytes};
}
function result(pack,copies,b){
 b.output(pack);b.take(Math.ceil(copies.bytes/64));b.outputBytes+=copies.bytes;
 if(b.outputBytes>b.limits.outputBytes)fail('AUTHORING_OUTPUT_LIMIT','/portable','Complete metadata plus actual copied binary output exceeds effective output bytes.');
 // Byte arrays are owned mutable copies; they are never blessed as immutable
 // readiness. Every import rehashes them against the frozen descriptor.
 return Object.freeze({pack:freeze(pack),entries:Object.freeze(copies.entries.map(Object.freeze)),work:freeze(b.snapshot())});
}
export function exportTileContentPack(actual,input){
 const {v,b,entries}=begin(input,['document','query','manifestId','entries','limits'],['document','query','manifestId','entries']),t=corePort(actual);
 b.take(Math.ceil(jsonBytes(v.document,b.limits.sourceBytes)/64));shape(t,'query',v.query,b);shape(t,'id',v.manifestId,b);
 if(v.query.kind!=='content.export')fail('CONTENT_EXPORT_QUERY_REQUIRED','/query','Use the frozen content.export query with includeAllDependencies:true.');
 const idx=validateDocument(t,v.document,b);validateAppearanceDocument(t,v.document,b);
 const queue=v.query.presetRefs.map(x=>idx.resolve(x,'nautilus-tile-preset')),seen=new Set(),all=[];
 for(let i=0;i<queue.length;i++){
  const r=queue[i],key=recordKey(r);b.take();if(seen.has(key))continue;seen.add(key);all.push(r);
  if(r.kind==='nautilus-tile-preset'){queue.push(idx.resolve(r.body.definition,'nautilus-recipe-definition'));for(const m of r.body.defaultMarks)queue.push(idx.resolve(m.graphic.artwork,'nautilus-tile-artwork'));}
 }
 const manifest={kind:'nautilus-tile-content',version:1,id:v.manifestId,definitions:all.filter(x=>x.kind==='nautilus-recipe-definition'),presets:all.filter(x=>x.kind==='nautilus-tile-preset'),artwork:all.filter(x=>x.kind==='nautilus-tile-artwork')};
 for(const k of ['definitions','presets','artwork'])manifest[k].sort((a,z)=>a.id<z.id?-1:a.id>z.id?1:a.revision-z.revision);
 const blobs=new Map(manifest.artwork.map(r=>[r.body.blob.sha256,r.body.blob]));
 const pack={kind:'nautilus-tile-content-pack',version:1,manifest,blobEntries:[...blobs.values()].sort((a,z)=>a.sha256<z.sha256?-1:1).map(x=>({sha256:x.sha256,byteLength:x.byteLength,entry:'blobs/'+x.sha256+(x.mediaType==='image/png'?'.png':'.webp')})),requires:[...new Set(all.flatMap(r=>r.body.requires))].sort()};
 b.take(Math.ceil(jsonBytes(pack,b.limits.commandBytes)/64));shape(t,'pack',pack,b);validatePack(t,pack,b);return result(pack,copyEntries(entries,pack,b),b);
}
export function importTileContentPack(actual,input){
 const {v,b,entries}=begin(input,['pack','entries','limits'],['pack','entries']),t=corePort(actual);
 b.take(Math.ceil(jsonBytes(v.pack,b.limits.commandBytes)/64));shape(t,'pack',v.pack,b);validatePack(t,v.pack,b);
 for(const k of ['definitions','presets','artwork'])if(v.pack.manifest[k].length>b.limits[k])fail('CONTENT_LIMIT','/pack/manifest/'+k,'All imported immutable versions count.');
 return result(v.pack,copyEntries(entries,v.pack,b),b);
}
