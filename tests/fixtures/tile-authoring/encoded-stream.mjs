// Test-only HTTP provider and exact-object staging. No actual Host source owner.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
import * as metadata from '../../../packages/assets/index.js';
export {metadata};
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const proof=path.join(root,'artifacts/encoded-stream'),sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true','-C',root,...a],{windowsHide:true,timeout:30000,maxBuffer:32*1024*1024});
export const fullPin=x=>({id:x.id,revision:x.revision,contentDigest:x.contentDigest});
export const road=fullPin(metadata.listSharedArtwork().find(x=>x.id.includes('road-'))),organic=fullPin(metadata.listSharedArtwork().find(x=>x.body.blob.widthPx===1536));
export async function serve(pin,fn,{mode='normal',lifetimeMs=20000}={}){
 const image=metadata.sharedArtworkImage(pin),location=image.locations.find(x=>x.profile==='compatibility'),resource='/'+location.packagePath,source=path.join(root,location.packagePath),sockets=new Set(),streams=new Set();
 const started=Date.now(),stats={requests:0,firstWrite:null,closed:false};let first;const firstWrite=new Promise(r=>{first=r;});
 const server=http.createServer((req,res)=>{stats.requests++;if(req.url!==resource||req.method!=='GET'){res.writeHead(404).end();return;}
  if(mode==='status'){res.writeHead(404,{'content-type':'image/png'}).end();return;}
  const headers={'content-type':'image/png','cache-control':'no-store'};if(mode!=='truncate')headers['content-length']=String(image.blob.byteLength);res.writeHead(200,headers);
  const input=fs.createReadStream(source,{highWaterMark:mode==='slow'?1024:65536,...(mode==='truncate'?{start:0,end:999}:{})});streams.add(input);input.on('close',()=>streams.delete(input));res.on('close',()=>input.destroy());
  (async()=>{try{let index=0;for await(const chunk of input){const data=mode==='corrupt'&&index++===0?Buffer.from(chunk):chunk;if(mode==='corrupt'&&index===1)data[0]^=1;if(res.destroyed)break;if(!res.write(data))await new Promise(r=>{const done=()=>{res.removeListener('drain',done);res.removeListener('close',done);r();};res.once('drain',done);res.once('close',done);});if(stats.firstWrite===null){stats.firstWrite=Date.now();first();}if(mode==='slow')await new Promise(r=>setTimeout(r,150));}if(!res.destroyed)res.end();}catch{res.destroy();}})();
 });server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 const timer=setTimeout(()=>{for(const input of streams)input.destroy();for(const socket of sockets)socket.destroy();server.close();},lifetimeMs);
 fs.mkdirSync(proof,{recursive:true});
 try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,origin='http://127.0.0.1:'+port;stats.port=port;const file=path.join(proof,'http-'+port+'.json');
  fs.writeFileSync(file,JSON.stringify({pid:process.pid,owner:'/root/window_host_review',purpose:'Bounded original-PNG HTTP provider for encoded adapter controls',port,mode,startedAt:new Date(started).toISOString(),expiresAt:new Date(started+lifetimeMs).toISOString(),stopMethod:'finally and actual timer close only owned streams/sockets/server'},null,2));
  return await fn({origin,assetAnchorURL:origin+'/packages/assets/index.js',resource,image,firstWrite,stats});
 }finally{clearTimeout(timer);for(const input of streams)input.destroy();const closed=[...sockets].map(socket=>new Promise(r=>{socket.once('close',r);socket.destroy();}));await new Promise(r=>server.close(r));await Promise.all(closed);stats.closed=!server.listening;stats.remainingSockets=sockets.size;fs.writeFileSync(path.join(proof,'http-'+stats.port+'-closed.json'),JSON.stringify(stats,null,2));assert.equal(stats.closed,true);assert.equal(stats.remainingSockets,0);}
}

let runtime;
export async function acceptedRuntime(){
 if(runtime)return runtime;const core='53d7d1f4bc4b5a8205e16cbbf6a29672e6f9db32',owner='d8ff73ce63282e897cac146bc3077ea443c38e05',target=path.join(proof,'accepted'),records=[];
 const stage=(commit,folder,initial)=>{const available=new Set(git('ls-tree','-r','--name-only',commit).toString().trim().split(/\r?\n/)),paths=new Set(initial),loaded=new Map();for(const p of paths){const b=git('show',commit+':'+p);loaded.set(p,b);if(/\.[cm]?js$/.test(p))for(const m of b.toString().matchAll(/(?:from\s*|import\s*\(|import\s*)['"](\.[^'"\r\n]+)['"]/g)){const q=path.posix.normalize(path.posix.join(path.posix.dirname(p),m[1]));if(available.has(q))paths.add(q);}}
  for(const [p,b]of loaded){const f=path.join(target,folder,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);records.push({commit,folder,path:p,bytes:b.length,sha256:sha(b)});}};
 const manifest=JSON.parse(git('show',core+':candidates/tile-authoring/core/c2/source.json'));
 const fixtures=git('ls-tree','-r','--name-only',core,'--','candidates/tile-authoring/core/c2/fixtures').toString().trim().split(/\r?\n/);
 stage(core,'core',[...manifest.runtime,...manifest.dependencies].map(x=>x.path).concat(['package.json','tools/tile-authoring-core-c2-fixtures.mjs','tests/fixtures/tile-authoring/c1-workflow.mjs',...fixtures]));
 const pre='candidates/tile-authoring/host/builtin-dependency-prefix/';stage(owner,'owner',['index.mjs','data.mjs','pack.mjs','owner.mjs'].map(p=>pre+p));
 fs.writeFileSync(path.join(proof,'accepted-inputs.json'),JSON.stringify({core,owner,mode:'immutable Git objects; no import adaptations',records},null,2));
 const load=p=>import(pathToFileURL(path.join(target,p)).href),fixture=await load('core/tools/tile-authoring-core-c2-fixtures.mjs'),Core=await load('core/candidates/tile-authoring/core/c2/index.js'),Owner=await load('owner/'+pre+'index.mjs');runtime={fixture,Core,Owner};return runtime;
}
export async function byteOwner(reader,selected){
 const {fixture,Core,Owner}=await acceptedRuntime(),T=fixture.T,document=structuredClone(fixture.stageFixture().input.document),context=fixture.stageFixture().input.context,expected=fixture.expected(T,document,context),basis={documentId:document.id,contentRevision:document.contentRevision,expected,floorId:'F00'};
 const read={snapshot:{document,expected},overlay:{basis}},cap=Object.freeze({});let epoch=0;
 const sourceOwner={resolve:r=>r===read?cap:null,isCurrent:s=>s===cap&&epoch===0,observe:s=>{assert.equal(s,cap);return {basis,document,sourceGeneration:epoch,ownerLifetimeId:'test.source',contextId:'test.resource',contextEpoch:epoch,mutationEpoch:epoch};}};
 const owner=Owner.createBuiltinByteOwner({tiles:T,metadata,sourceOwner,reader,portable:Core});return {owner,read,selected,document,bump:()=>epoch++};
}
