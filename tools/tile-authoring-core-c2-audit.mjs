import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {distribution,moduleClosure} from './distribution.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder='candidates/tile-authoring/core/c2/',base='8184f06aa587542b026352a739f3766d1794c4fe';
const sha=x=>createHash('sha256').update(x).digest('hex'),read=p=>fs.readFileSync(path.join(root,p)),row=p=>({path:p,bytes:read(p).length,sha256:sha(read(p))});
const own=p=>p.startsWith(folder)||/^tests\/tile-authoring-core-c2-[^/]+\.test\.mjs$/.test(p)||/^tools\/tile-authoring-core-c2-[^/]+\.mjs$/.test(p);
const walk=p=>fs.readdirSync(path.join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32*1024*1024});
export function audit({record=false}={}){
 const manifest=JSON.parse(read(folder+'source.json')),closure=moduleClosure([folder+'index.js']),runtime=closure.filter(p=>p.startsWith(folder)),deps=closure.filter(p=>!p.startsWith(folder));
 for(const p of deps)assert.equal(sha(read(p)),sha(git('show',base+':'+p)),'Protected accepted dependency changed: '+p);
 for(const r of manifest.originalC1)assert.equal(sha(read(folder+'vendor/c1/'+path.basename(r.path))),r.sha256,'Original C1 bytes');
 assert.equal(sha(read(folder+'vendor/artist/content-pack-manifest.json')),manifest.artistOriginal.sha256);
 for(const r of manifest.originalAbi)assert.equal(sha(read(folder+'abi/frozen/'+r.path)),r.sha256,'Frozen accepted ABI bytes');
 assert.equal(sha(read(folder+'contract.schema.json')),'3c9b36e807eff9b3f9bdeb6314e976d6caa5acfdc7d2f0368b853d5f8fab7ddc');
 for(const p of runtime.filter(p=>p.endsWith('.js'))){const s=read(p).toString('utf8');assert.ok(!/(?:Date\.now|Math\.random|randomUUID|\bsetTimeout\b|\bsetInterval\b|\blocalStorage\b|\bsessionStorage\b|from ['"]node:|\.prepareTileRepair\s*\(|\.createRetainedTileConsumer\s*\()/.test(s),'Owned side effect: '+p);}
 for(const p of [folder+'index.d.ts',folder+'abi/types.d.ts'])stripTypeScriptTypes(read(p).toString('utf8'));
 const profiles=[];for(const profile of ['core','compatibility','renderer','assets']){const d=distribution(profile);assert.ok(!d.files.some(p=>p.startsWith(folder)));assert.ok(!Object.values(d.exports).some(p=>String(p).includes('/c2/')));profiles.push({profile,candidateShipped:false});}
 const changed=git('diff','--name-only',base).toString('utf8').trim().split(/\r?\n/).filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').toString('utf8').trim().split(/\r?\n/).filter(Boolean);
 for(const p of [...changed,...untracked])assert.ok(own(p),'Out-of-scope change: '+p);
 const abiFiles=[...['proposal.schema.json','types.d.ts','decision-work-carry.json','vectors.json'].map(p=>folder+'abi/'+p),folder+'README.md'];
 if(record){
  fs.writeFileSync(path.join(root,folder+'abi/manifest.json'),JSON.stringify({originalAcceptedManifestSha256:manifest.acceptedAbiManifestSha256,status:'private amended ABI; two Architect-authorized work/limits clarifications',files:abiFiles.map(row)},null,2)+'\n');
  const files=[...walk(folder.slice(0,-1)),...fs.readdirSync(path.join(root,'tests')).filter(p=>/^tile-authoring-core-c2-.*\.test\.mjs$/.test(p)).map(p=>'tests/'+p),...fs.readdirSync(path.join(root,'tools')).filter(p=>/^tile-authoring-core-c2-.*\.mjs$/.test(p)).map(p=>'tools/'+p)].filter(p=>p!==folder+'source.json').sort();
  Object.assign(manifest,{status:'private-C2-stage-A-candidate',runtime:runtime.map(row),dependencies:deps.map(row),files:files.map(row),profiles});fs.writeFileSync(path.join(root,folder+'source.json'),JSON.stringify(manifest,null,2)+'\n');
 }else{
  for(const r of [...manifest.files,...manifest.dependencies])assert.deepEqual(row(r.path),r,'Source byte drift: '+r.path);
  const abi=JSON.parse(read(folder+'abi/manifest.json'));for(const r of abi.files)assert.deepEqual(row(r.path),r);
  assert.deepEqual(manifest.runtime.map(x=>x.path),runtime);
 }
 return {status:'private-C2-stage-A-source-pass',base,ownRuntimeModules:runtime.length,acceptedDependencies:deps.length,abiManifestSha256:sha(read(folder+'abi/manifest.json')),profiles};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(audit({record:process.argv.includes('--record')})));
