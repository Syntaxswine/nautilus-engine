// Exercise the actual composed registration checker with real Git objects,
// current filesystem/closure/profile/index ports. Mutants alter one observation;
// no substitute checker/runtime or success flag supplies a verdict.
import test,{after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {root,moduleClosure,distribution} from '../tools/distribution.mjs';
import {checkTileAuthoringRegistration} from '../tools/tile-authoring-registration.mjs';
import {checkTileC2aSource} from '../tools/check-tile-c2a-source.mjs';
import {checkTileAuthoringCoreSource} from '../tools/check-tile-authoring-core-source.mjs';
import {SHARED_ARTWORK_BASE,SHARED_ARTWORK_SOURCE} from '../tools/shared-artwork-registration.mjs';
const cache=new Map(),git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,timeout:10000,maxBuffer:8*1024*1024}),object=(pin,file)=>{const key=pin+':'+file;if(!cache.has(key))cache.set(key,git('show',key));return cache.get(key);},read=f=>fs.readFileSync(path.join(root,f));
const folder='assets/artwork/local-graphics-v1',payloads=JSON.parse(object(SHARED_ARTWORK_SOURCE,'candidates/tile-authoring/artwork-discovery-proposal/preservation.json')).payloads.map(p=>p.packagePath),inventory=[...payloads,folder+'/.gitattributes'].sort();
// The controls do not change source/index bytes. Reuse actual immutable Git,
// module-closure and profile observations, retaining the uncached real-index
// production-checker control below. No expected answer or runtime is substituted.
const actualIndexPath=path.resolve(root,git('rev-parse','--git-path','index').toString().trim()),indexBefore=fs.readFileSync(actualIndexPath),indexCache=new Map(),closures=new Map(),plans=new Map();
const c1=JSON.parse(object('3df11ce6e62fb94806e30652b87168949f8ef4dd','packages/tile-authoring-core/source.json')),keys=new Set();
for(const file of [...c1.runtime,...c1.metadata,...c1.dependencies].map(r=>r.path))keys.add('3df11ce6e62fb94806e30652b87168949f8ef4dd:'+file);
for(const file of c1.dependencies.map(r=>r.path))keys.add('d869410625b246cfff2b51089e7878c31951775c:'+file);
for(const [pin,files]of [[SHARED_ARTWORK_BASE,['NOTICE.md','package.json','tools/distribution.mjs','tools/build.mjs','tools/shared-assets.mjs','packages/assets/index.js','packages/assets/catalogue.js','packages/tile-authoring-core/index.d.ts']],['3df11ce6e62fb94806e30652b87168949f8ef4dd',['package.json','tools/distribution.mjs','docs/distribution.md','tools/tile-stack-registration.mjs']],['d869410625b246cfff2b51089e7878c31951775c',['package.json','tools/distribution.mjs','docs/distribution.md','tools/tile-stack-registration.mjs']],['32101fa97a8706296dcba4d9614d9d663d53a6dd',['package.json','tools/distribution.mjs','upstream.json','packages/map-core/contract-manifest.js','packages/map-core/capabilities.js']]])for(const f of files)keys.add(pin+':'+f);
const preservation=JSON.parse(object(SHARED_ARTWORK_SOURCE,'candidates/tile-authoring/artwork-discovery-proposal/preservation.json'));for(const r of preservation.files)keys.add(SHARED_ARTWORK_SOURCE+':'+r.path);for(const r of preservation.payloads)for(const pin of [r.sourceCommit,r.originalCommit])keys.add(pin+':'+r.sourcePath);keys.add('43227894c50ec62b71806978195fff2c650eb388:candidates/tile-authoring/core/examples/document-v3.json');
const requested=[...keys].filter(k=>!cache.has(k)),batch=execFileSync('git',['-c','core.longpaths=true','-C',root,'cat-file','--batch'],{input:requested.join('\n')+'\n',windowsHide:true,timeout:30000,maxBuffer:64*1024*1024});let pos=0;for(const k of requested){const end=batch.indexOf(10,pos),[,type,size]=batch.subarray(pos,end).toString().split(' ');assert.equal(type,'blob',k);const n=Number(size);cache.set(k,Buffer.from(batch.subarray(end+1,end+1+n)));assert.equal(batch[end+1+n],10);pos=end+2+n;}
const realClosure=entries=>{const key=JSON.stringify(entries);if(!closures.has(key))closures.set(key,moduleClosure(entries));return[...closures.get(key)];},realPlan=profile=>{if(!plans.has(profile))plans.set(profile,distribution(profile));return structuredClone(plans.get(profile));};
const ports=()=>({object,read,moduleClosure:realClosure,distribution:realPlan,listArtworkFiles:()=>[...inventory],indexed:(file,expected)=>{if(!indexCache.has(file))indexCache.set(file,git('show',':'+file));assert.ok(indexCache.get(file).equals(expected),'Actual staged/working mismatch: '+file);}});
after(()=>assert.ok(fs.readFileSync(actualIndexPath).equals(indexBefore),'Actual source index changed during the finite read-only controls'));
function overrideRead(p,file,change){const previous=p.read;p.read=f=>f===file?change(previous(f)):previous(f);}
function catalogue(b,change){const text=b.toString(),marker='export const SHARED_ASSETS = ',at=text.indexOf(marker)+marker.length,rows=JSON.parse(text.slice(at).replace(/;\n$/,''));change(rows);return Buffer.from(text.slice(0,at)+JSON.stringify(rows,null,2)+';\n');}
test('actual composed checker authenticates current bytes before exposing exactly the historical profiles',()=>{
 const result=checkTileAuthoringRegistration(ports());assert.equal(result.sharedArtworkRegistration.status,'authenticated-shared-artwork-metadata-and-encoded-delivery');assert.deepEqual(Object.fromEntries(Object.entries(result.sharedArtworkRegistration.profiles).map(([p,r])=>[p,r.addedCount])),{core:5,renderer:14,assets:12,compatibility:11});assert.equal(result.authoringRegistration.sourceCommit,'3df11ce6e62fb94806e30652b87168949f8ef4dd');assert.deepEqual(result.sharedArtworkRegistration.historicalMappings,['NOTICE.md','package.json','tools/distribution.mjs']);
});
const variants=[
 ['unrelated NOTICE prefix edit',p=>overrideRead(p,'NOTICE.md',b=>Buffer.from(b.toString().replace('# Sources and notices','# Changed source notice')))],
 ['one-byte artwork NOTICE suffix edit',p=>overrideRead(p,'NOTICE.md',b=>{const c=Buffer.from(b);c[c.length-2]^=1;return c;})],
 ['extra physical artwork payload',p=>p.listArtworkFiles=()=>[...inventory,folder+'/resources/unreviewed.png']],
 ['missing physical artwork payload',p=>p.listArtworkFiles=()=>inventory.filter(f=>f!==payloads[0])],
 ['corrupt original PNG bytes',p=>overrideRead(p,payloads[0],b=>{const c=Buffer.from(b);c[0]^=1;return c;})],
 ['changed legacy catalogue row',p=>overrideRead(p,'packages/assets/catalogue.js',b=>catalogue(b,rows=>rows[0].name+='changed'))],
 ['changed new Artwork row',p=>overrideRead(p,'packages/assets/catalogue.js',b=>catalogue(b,rows=>rows[407].name+='changed'))],
 ['changed Railway row',p=>overrideRead(p,'packages/assets/catalogue.js',b=>catalogue(b,rows=>rows[437].name+='changed'))],
 ['drifting canonical Pin',p=>overrideRead(p,'packages/assets/catalogue.js',b=>catalogue(b,rows=>rows[407].artworkPin.contentDigest='0'.repeat(64)))],
 ['extra public renderer export',p=>{const actual=p.distribution;p.distribution=profile=>{const plan=actual(profile);return profile==='renderer'?{...plan,exports:{...plan.exports,'./unreviewed':'./packages/assets/index.js'}}:plan;};}],
 ['extra unrelated physical profile file',p=>{const actual=p.distribution;p.distribution=profile=>{const plan=actual(profile);if(profile!=='core')return plan;assert.equal(plan.files.includes('packages/assets/files.js'),false);return{...plan,files:[...plan.files,'packages/assets/files.js'].sort()};};}],
 ['altered public index literal',p=>overrideRead(p,'packages/assets/index.js',b=>Buffer.from(b.toString()+"export const unreviewed=true;\n"))],
 ['altered generator literal',p=>overrideRead(p,'tools/shared-assets.mjs',b=>Buffer.from(b.toString().replace('assets.push(...sharedArtworkDiscoveryRows())','assets.push()')))],
 ['altered six-path build copy literal',p=>overrideRead(p,'tools/build.mjs',b=>Buffer.from(b.toString().replace('for(const file of sharedArtworkPayloadPaths())write','for(const file of [])write')))],
 ['altered protected C1 authoring copy literal',p=>overrideRead(p,'tools/build.mjs',b=>Buffer.from(b.toString().replace("path.join(root,'apps/editor/tile-authoring')","path.join(root,'apps/editor/unreviewed')")))],
 ['tampered source metadata',p=>overrideRead(p,'packages/assets/artwork-source.json',b=>{const v=JSON.parse(b);v.readiness='ready';return Buffer.from(JSON.stringify(v,null,2)+'\n');})],
 ['missing immutable proposal tip',p=>{const real=p.object;p.object=(pin,file)=>{if(pin===SHARED_ARTWORK_SOURCE)throw Error('Actual immutable proposal object unavailable');return real(pin,file);};}],
 ['changed current distribution literal',p=>overrideRead(p,'tools/distribution.mjs',b=>Buffer.from(b.toString().replace("profile!=='core'","profile==='core'")))]
];
for(const [name,mutate]of variants)test('actual composed checker refuses '+name,()=>{const p=ports();mutate(p);assert.throws(()=>checkTileAuthoringRegistration(p));});
test('actual indexed source checkers refuse a changed temporary Git index while real filesystem and real index stay intact',()=>{
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-artwork-index-')),tempIndex=path.join(scratch,'index'),actualIndex=git('rev-parse','--git-path','index').toString().trim(),before=fs.readFileSync(path.resolve(root,actualIndex)),old=process.env.GIT_INDEX_FILE;
 try{
  // Build a real checksummed v2 temporary index from every actual staged row.
  // This changes no Git object/config/index and needs no repository writes.
  const wrong=git('rev-parse',SHARED_ARTWORK_BASE+':NOTICE.md').toString().trim(),raw=git('ls-files','--stage','-z').toString(),rows=raw.split('\0').filter(Boolean).map(line=>{const match=/^(\d{6}) ([a-f0-9]{40}) 0\t([\s\S]+)$/.exec(line);assert.ok(match);return{mode:parseInt(match[1],8),oid:match[3]===payloads[0]?wrong:match[2],file:match[3]};}),header=Buffer.alloc(12);header.write('DIRC');header.writeUInt32BE(2,4);header.writeUInt32BE(rows.length,8);
  const body=Buffer.concat([header,...rows.map(row=>{const name=Buffer.from(row.file),size=Math.ceil((62+name.length+1)/8)*8,b=Buffer.alloc(size);b.writeUInt32BE(row.mode,24);Buffer.from(row.oid,'hex').copy(b,40);b.writeUInt16BE(Math.min(name.length,4095),60);name.copy(b,62);return b;})]);fs.writeFileSync(tempIndex,Buffer.concat([body,createHash('sha1').update(body).digest()]));process.env.GIT_INDEX_FILE=tempIndex;
  const tracked=new Set(git('ls-files').toString().trim().split('\n'));assert.equal(tracked.size,rows.length);assert.equal(git('rev-parse',':'+payloads[0]).toString().trim(),wrong);assert.throws(()=>checkTileC2aSource(root,{tracked}),/Index changes reviewed C2a bytes/);assert.throws(()=>checkTileAuthoringCoreSource(root,{tracked}),/Index changes authenticated artwork bytes/);
 }
 finally{if(old===undefined)delete process.env.GIT_INDEX_FILE;else process.env.GIT_INDEX_FILE=old;assert.ok(fs.readFileSync(path.resolve(root,actualIndex)).equals(before),'The owning task index must stay untouched');const actual=fs.realpathSync(scratch);assert.equal(path.dirname(actual),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(actual).startsWith('nautilus-artwork-index-'));fs.rmSync(actual,{recursive:true,force:true});}
});
