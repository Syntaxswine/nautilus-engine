// Fixed Git-object intake. No donor checkout files are copied or changed.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const SOURCE_COMMIT='8395204ce6b60aa20cc8936fc89fe4a40192920c';
export const SOURCE_REPOSITORY='https://github.com/Syntaxswine/farmyard-commando-realtime.git';
export const SNAPSHOT='vendor/mount-dora/'+SOURCE_COMMIT;
export const HANDOFF_COMMIT='46d981e2021150700e3184b4f49b6364531a4556';
export const HANDOFF_PATH='docs/maps/mount-dora-handoff-8395204.md';
export const HANDOFF_SNAPSHOT='vendor/mount-dora-handoff/'+HANDOFF_COMMIT;
const root=fileURLToPath(new URL('../../',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const relative=p=>typeof p==='string'&&!p.includes('\\')&&!p.startsWith('/')&&!p.split('/').some(s=>!s||s==='.'||s==='..'||s==='.git');
export function importMountDoraHandoff(donor){
 const git=args=>execFileSync('git',args,{cwd:donor,windowsHide:true,maxBuffer:1024*1024});
 if(git(['remote','get-url','origin']).toString().trim().replace(/\.git$/,'')!==SOURCE_REPOSITORY.replace(/\.git$/,''))throw Error('MOUNT_DORA_DONOR_REPOSITORY');
 const b=git(['show',HANDOFF_COMMIT+':'+HANDOFF_PATH]),gitBlob=git(['rev-parse',HANDOFF_COMMIT+':'+HANDOFF_PATH]).toString().trim();
 if(sha(b)!=='4213cd6026fa3698ed317eaaf490a83dba73823ecc5249c0f4a19f5a7b1ba6e6')throw Error('MOUNT_DORA_HANDOFF_CHANGED');
 const store='original/'+HANDOFF_PATH+'.original',dest=path.join(root,HANDOFF_SNAPSHOT,store);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b);
 const ledger={version:1,repository:SOURCE_REPOSITORY,commit:HANDOFF_COMMIT,sourceMethod:'immutable Git object; separate handoff note, not primary runtime source',files:[{originalPath:HANDOFF_PATH,path:store,gitBlob,bytes:b.length,sha256:sha(b)}]};fs.writeFileSync(path.join(root,HANDOFF_SNAPSHOT,'source.json'),JSON.stringify(ledger,null,2)+'\n');return ledger;
}
export function verifyMountDoraSnapshot(){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,SNAPSHOT,'source.json')));if(manifest.commit!==SOURCE_COMMIT||manifest.repository!==SOURCE_REPOSITORY)throw Error('MOUNT_DORA_SOURCE_PIN');
 for(const row of manifest.files){if(!relative(row.originalPath)||!relative(row.path))throw Error('MOUNT_DORA_SOURCE_PATH');const b=fs.readFileSync(path.join(root,SNAPSHOT,row.path));if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('MOUNT_DORA_SOURCE_CHANGED: '+row.originalPath);}
 return {status:'verified',commit:SOURCE_COMMIT,files:manifest.files.length,bytes:manifest.files.reduce((n,r)=>n+r.bytes,0),runtimeSeeds:manifest.runtimeSeeds};
}
export function importMountDora(donor){
 const git=args=>execFileSync('git',args,{cwd:donor,windowsHide:true,maxBuffer:192*1024*1024});
 const remote=git(['remote','get-url','origin']).toString().trim();if(remote.replace(/\.git$/,'')!==SOURCE_REPOSITORY.replace(/\.git$/,''))throw Error('MOUNT_DORA_DONOR_REPOSITORY');
 if(git(['rev-parse',SOURCE_COMMIT+'^{commit}']).toString().trim()!==SOURCE_COMMIT)throw Error('MOUNT_DORA_DONOR_COMMIT');
 const tree=new Map(git(['ls-tree','-rz','--full-tree',SOURCE_COMMIT]).toString('utf8').split('\0').filter(Boolean).map(line=>{const [info,p]=line.split('\t');const [mode,kind,oid]=info.split(' ');return [p,{mode,kind,oid}];}));
 const selected=new Map(),runtimeSeeds=[
  'sites/tactical-animal/dist/mission-art/mount-dora/kit.js',
  'sites/tactical-animal/dist/mount-dora-pines.js',
  'sites/tactical-animal/dist/mount-dora-broadleaf.js',
  'sites/tactical-animal/dist/aft/tactics/biome-tree-mix.js',
  'sites/tactical-animal/dist/aft/tactics/biome-foliage-models.js',
  'sites/tactical-animal/dist/aft/tactics/biome-foliage-paint.js',
  'sites/tactical-animal/dist/aft/tactics/biome-foliage-data.js',
  'sites/tactical-animal/dist/aft/tactics/foliage-cutaway.js',
  'sites/tactical-animal/dist/world-grid.js',
  'sites/tactical-animal/dist/render-residency.js',
  'sites/tactical-animal/dist/map-player-marker.js',
  'sites/tactical-animal/dist/trunk-geometry.js'
  ,'sites/tactical-animal/dist/mount-dora-world.js'
 ];
 const add=(p,reason)=>{if(!relative(p)||tree.get(p)?.kind!=='blob')throw Error('MOUNT_DORA_MISSING_SOURCE: '+p);if(!selected.has(p))selected.set(p,new Set());selected.get(p).add(reason);};
 // The complete native content, house-part records and original geographic/art
 // metadata remain evidence. Prototype workshop pages are reference-only.
 for(const p of tree.keys())if(p.startsWith('maps/mount-dora/'))add(p,'complete native content/art/metadata evidence');
 for(const p of tree.keys())if(/(?:^|\/)(?:NOTICE(?:\.[^/]*)?|LICENSE(?:\.[^/]*)?|COPYING(?:\.[^/]*)?)$/i.test(p)&&!p.includes('node_modules/'))add(p,'source notice');
 for(const name of ['mount-dora-world.js','mount-dora-view.js','mount-dora-progress.js','world-grid.js','render-residency.js'])add('sites/tactical-animal/dist/'+name,'reference-only source behavior; not executed by engine');
 const runtime=new Set(),queue=runtimeSeeds.slice();
 while(queue.length){const p=queue.shift();if(runtime.has(p))continue;add(p,'minimal opt-in rendering/math dependency');runtime.add(p);if(!/\.(?:js|mjs)$/.test(p))continue;const code=git(['show',SOURCE_COMMIT+':'+p]).toString('utf8');
  const refs=[...code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)].map(m=>({specifier:m[1],module:true}));
  refs.push(...[...code.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g)].map(m=>({specifier:m[1],module:false})));
  refs.push(...[...code.matchAll(/['"]((?:\.\.?\/)[^'"]+\.(?:png|jpg|jpeg|webp))['"]/g)].map(m=>({specifier:m[1],module:false})));
  for(const {specifier,module}of refs){if(!specifier.startsWith('.')){if(!/^(?:node:|https?:|data:)/.test(specifier))throw Error('MOUNT_DORA_UNREVIEWED_BARE_IMPORT: '+p+' '+specifier);continue;}const f=path.posix.normalize(path.posix.join(path.posix.dirname(p),specifier));if(!tree.has(f)){if(module)throw Error('MOUNT_DORA_UNRESOLVED_MODULE: '+p+' '+specifier);continue;}add(f,module?'static module dependency':'static resource');if(module)queue.push(f);}
 }
 // The production kit's atlas is an explicit runtime resource, not its earlier
 // prototype atlas. Other foliage textures are selected by the engine adapter.
 add('sites/tactical-animal/dist/mission-art/mount-dora/painted-materials-bbe33709.png','production painted atlas');
 for(const file of ['ground-grass.png','ground-dirt.png','ground-gravel.png','ground-asphalt.png','ground-concrete.png','hybrid-surfaces/wood-factory-v2.png','hybrid-surfaces/brick-factory-v1.png','foliage/river-water.png'])add('sites/tactical-animal/dist/aft/assets/environment/'+file,'native town terrain/wall texture');
 const names=[...selected.keys()].sort();
 // Keep bulk original source reads in one bounded process.
 const bytes=execFileSync('git',['cat-file','--batch'],{cwd:donor,windowsHide:true,input:names.map(p=>SOURCE_COMMIT+':'+p).join('\n')+'\n',maxBuffer:192*1024*1024});
 let cursor=0;const files=[];
 for(const p of names){const end=bytes.indexOf(10,cursor),[oid,kind,sizeString]=bytes.subarray(cursor,end).toString().split(' '),size=Number(sizeString);if(kind!=='blob'||oid!==tree.get(p).oid||!Number.isFinite(size))throw Error('MOUNT_DORA_GIT_OBJECT: '+p);cursor=end+1;const b=bytes.subarray(cursor,cursor+size);cursor+=size+1;const store='original/'+p+'.original',dest=path.join(root,SNAPSHOT,store);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b);files.push({originalPath:p,path:store,gitBlob:oid,bytes:b.length,sha256:sha(b),purposes:[...selected.get(p)],runtimeModule:runtime.has(p)});}
 const manifest={version:1,repository:SOURCE_REPOSITORY,commit:SOURCE_COMMIT,sourceMethod:'full immutable Git objects; donor worktree untouched',scope:'Complete native town geometry/art/metadata evidence plus explicit minimal opt-in rendering/math closure; no full donor application execution',runtimeSeeds,files};
 fs.mkdirSync(path.join(root,SNAPSHOT),{recursive:true});fs.writeFileSync(path.join(root,SNAPSHOT,'source.json'),JSON.stringify(manifest,null,2)+'\n');return verifyMountDoraSnapshot();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyMountDoraSnapshot()));else{const index=process.argv.indexOf('--donor');if(index<0||!process.argv[index+1])throw Error('Pass --donor with the authorized read-only repository path.');console.log(JSON.stringify(importMountDora(process.argv[index+1])));}}
