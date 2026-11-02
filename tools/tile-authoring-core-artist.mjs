// Fixed-Git contract fixture conversion only; not a runtime content importer.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export const ARTIST_COMMIT='f5bfda9ec0f639018ccfee2415b1f70502e77cae';
export const ARTIST_MANIFEST='candidates/tile-authoring/art/resources.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const raw=p=>execFileSync('git',['show',ARTIST_COMMIT+':'+p],{cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,maxBuffer:16*1024*1024});
const inputURL=new URL('../candidates/tile-authoring/core/inputs/',import.meta.url);
const fixed=JSON.parse(fs.readFileSync(new URL('fixed-inputs.json',inputURL)));
const metadata=(file,expected)=>{const bytes=fs.readFileSync(new URL(file,inputURL));assert.equal(sha(bytes),expected);const ref=fixed.metadata.find(r=>r.file===file);assert.equal(ref.sha256,expected);assert.equal(ref.byteLength,bytes.length);return bytes;};
let input;
const verifiedBytes=new Map();
export function artistInput(){
 if(input)return input;
 const manifestBytes=metadata('artist-resources.json','914ab6b9e514a1e627c91eddc48fb34c3c5d4b7f7e77d601158fc5ea690a1baa'),manifest=JSON.parse(manifestBytes),noticePath='candidates/tile-authoring/art/PROVENANCE.md',noticeBytes=metadata('artist-PROVENANCE.md','d428625c41658da78adc6a3f7650b3dfb7e2fd9403a93bc3bc768f67abd28cf6');
 const pages=manifest.resources.map(r=>{const sourcePath='candidates/tile-authoring/art/'+r.uri,ref=fixed.pages.find(p=>p.path===sourcePath&&p.sha256===r.sha256);assert.ok(ref);return {resource:r,sourcePath,byteLength:ref.byteLength};});
 input={manifest,manifestBytes,manifestSha256:sha(manifestBytes),noticePath,noticeBytes,pages};return input;
}
function pageBytes(p){
 if(verifiedBytes.has(p.resource.sha256))return verifiedBytes.get(p.resource.sha256);
 const bytes=raw(p.sourcePath);assert.equal(sha(bytes),p.resource.sha256);assert.equal(bytes.length,p.byteLength);assert.equal(bytes.readUInt32BE(16),p.resource.width);assert.equal(bytes.readUInt32BE(20),p.resource.height);verifiedBytes.set(p.resource.sha256,bytes);return bytes;
}
export const imageViewDigest=(T,artwork)=>T.tileLayoutToken({blob:artwork.body.blob,imageView:artwork.body.imageView});
export const resourceRef=(T,r)=>({kind:'nautilus-artwork-resource-ref',version:1,artwork:{id:r.id,revision:r.revision,contentDigest:r.contentDigest},imageViewDigest:imageViewDigest(T,r)});
export const resourceRefs=(T,records)=>records.map(r=>resourceRef(T,r)).sort((a,b)=>a.artwork.id<b.artwork.id?-1:a.artwork.id>b.artwork.id?1:a.artwork.revision-b.artwork.revision);
export function artistFixture(T,{includeBytes=false}={}){
 const input=artistInput(),artwork=[],rows=[];
 for(const a of input.manifest.artworks){
  const page=input.pages.find(p=>p.resource.id===a.resource.id&&p.resource.version===a.resource.version&&p.resource.sha256===a.resource.sha256);assert.ok(page,'exact immutable resource tuple');
  const r=page.resource;assert.equal(r.mediaType,'image/png');assert.equal(r.bitDepth,8);assert.equal(r.channels,'RGBA');assert.equal(r.colourSpace,'sRGB');assert.equal(r.alpha.storage,'straight');assert.equal(r.alpha.sampling,'linear-premultiplied-bilinear-v1');assert.equal(r.atlas.origin,'top-left');assert.equal(r.sampler.mipmaps,false);
  const frame=r.atlas.frames.find(f=>f.id===a.frameId);assert.ok(frame,'explicit frameId, never inferred from graphic ID');
  const blob={sha256:r.sha256,byteLength:page.byteLength,mediaType:r.mediaType,widthPx:r.width,heightPx:r.height,colorSpace:'srgb',alphaMode:'straight'};
  const imageView={profile:'finite-raster-frame-v1',pageDigest:T.tileLayoutToken(blob),frame:{id:frame.id,rectPx:frame.rectPx,origin:'top-left',imageTop:'local-positive-v'},sampler:{profile:'linear-premultiplied-bilinear-frame-v1',alphaFloor8:r.alpha.zeroAtOrBelow8,mipmaps:false,stampOutside:'transparent',detailWrap:'repeat-frame'}};
  const body={label:a.label,blob,imageView,channels:['color','alpha'],requires:['owner-local-level-top-v1','finite-raster-frame-v1','linear-premultiplied-bilinear-frame-v1','png-rgba8-decoder-v1'],notices:[{id:'notice.artist-provenance',licenseRef:'LicenseRef-Nautilus-Original-Contract-Samples',attribution:'Original Nautilus contract samples. Full immutable Artist provenance follows.',noticeText:input.noticeBytes.toString('utf8'),source:{repository:'https://github.com/Syntaxswine/nautilus-engine',commit:ARTIST_COMMIT,path:input.noticePath}}]};
  const record={kind:'nautilus-tile-artwork',version:1,id:'artist.'+a.id,revision:a.version,body};record.contentDigest=T.tileLayoutToken(record);artwork.push(record);
  const linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
  rows.push({sourceArtwork:{id:a.id,version:a.version,digest:a.digest},sourceResource:{...a.resource},sourceFrameId:a.frameId,corePin:{id:record.id,revision:record.revision,contentDigest:record.contentDigest},imageViewDigest:imageViewDigest(T,record),graphicDefaults:{positionM:[0,0],sizeM:a.frameSizeM,rotationRad:0,mirrorU:false,pivotUV:a.pivotUV,opacity:a.defaultOpacity,tintLinearRGB:a.tintSRGB.map(linear)}});
 }
 assert.equal(rows.length,30);
 return {artwork,mapping:{kind:'nautilus-artist-to-core-import-mapping',version:1,sourceCommit:ARTIST_COMMIT,sourceManifest:{path:ARTIST_MANIFEST,sha256:input.manifestSha256},sourceNotice:{path:input.noticePath,sha256:sha(input.noticeBytes)},rows},pages:input.pages.map(p=>includeBytes?{...p,bytes:pageBytes(p)}:p)};
}
