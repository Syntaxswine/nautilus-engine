import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {moduleClosure,distribution} from './distribution.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder='candidates/tile-authoring/core/c2/browser-owned-v1/integration-v1/',parent='30bfa968cf778750fbad6a7aec8ff7052e05ba0c';
const read=p=>fs.readFileSync(path.join(root,p)),sha=v=>createHash('sha256').update(v).digest('hex'),json=p=>JSON.parse(read(p)),git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32*1024*1024});
const row=p=>({path:p,bytes:read(p).length,sha256:sha(read(p))}),walk=p=>fs.readdirSync(path.join(root,p),{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(p+'/'+x.name):[p+'/'+x.name]);
export function auditIntegration({record=false}={}){
 const inputs=json(folder+'kernel-inputs.json');assert.equal(inputs.commit,'4ade3ea02084472b30d036e8a0561e473aa84f3f');assert.equal(inputs.closure.length,16);assert.equal(inputs.runtimeEntries.length,8);
 const originalPaths=new Set(inputs.closure.map(x=>x.path)),adapterPaths=new Set(inputs.closure.map(x=>x.adapter));
 for(const x of inputs.closure){const original=git('show',x.commit+':'+x.path);assert.equal(x.commit,inputs.commit);assert.equal(original.length,x.bytes);assert.equal(sha(original),x.sha256);assert.equal(git('rev-parse',x.commit+':'+x.path).toString().trim(),x.gitBlob);assert.deepEqual(read(x.vendor),original);let derived=original.toString();const used=new Set();for(const m of derived.matchAll(/(?:\bimport\s+(?:[^;]*?\s+from\s*)?|\bexport\s+[^;]*?\s+from\s*)['"]([^'"]+)['"]/g)){const rewrite=x.importRewrites.find(r=>r.from===m[1]);assert.ok(rewrite,'Unrecorded static import '+x.path+':'+m[1]);assert.ok(originalPaths.has(rewrite.sourceTarget));assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(x.path),rewrite.from)),rewrite.sourceTarget);const target=inputs.closure.find(r=>r.path===rewrite.sourceTarget);assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(x.adapter),rewrite.to)),target.adapter);used.add(rewrite.from);}for(const r of x.importRewrites){assert.ok(used.has(r.from));derived=derived.replaceAll("'"+r.from+"'","'"+r.to+"'").replaceAll('"'+r.from+'"','"'+r.to+'"');}assert.equal(sha(Buffer.from(derived)),x.adapterSha256);assert.deepEqual(read(x.adapter),Buffer.from(derived),'Source algorithm changed beyond recorded imports '+x.path);}
 assert.equal(sha(read(inputs.notice.path)),inputs.notice.sha256);assert.deepEqual(read(inputs.notice.path),git('show',inputs.commit+':NOTICE.md'));
 const inventory=json(folder+'adapter-inventory.json');assert.equal(inventory.Artist.commit,'e74df31fa9a4fdabd16ff9c5c018138bdc286ea5');assert.equal(inventory.Artist.formalSameOwnerAdapter,'UNBOUND');for(const x of inventory.Artist.sourceRows){const bytes=git('show',x.commit+':'+x.path);assert.equal(bytes.length,x.bytes);assert.equal(sha(bytes),x.sha256);assert.equal(git('rev-parse',x.commit+':'+x.path).toString().trim(),x.gitBlob);}
 stripTypeScriptTypes(read(folder+'index.d.ts').toString());
 const closure=moduleClosure([folder+'index.js']),runtime=closure.filter(p=>p.startsWith(folder)),dependencies=closure.filter(p=>!p.startsWith(folder));for(const p of dependencies)assert.deepEqual(read(p),git('show',parent+':'+p),'Frozen parent dependency drift '+p);
 const parentClosure=moduleClosure(['candidates/tile-authoring/core/c2/browser-owned-v1/index.js']);for(const p of parentClosure)assert.deepEqual(read(p),git('show',parent+':'+p),'Frozen corrected Core changed '+p);
 for(const p of runtime.filter(p=>p.endsWith('.js')&&!adapterPaths.has(p))){const text=read(p).toString();assert.ok(!/(?:Date\.now|Math\.random|randomUUID|\bsetTimeout\b|\bsetInterval\b|\blocalStorage\b|\bsessionStorage\b|from ['"]node:)/.test(text),'Unexpected runtime side effect '+p);assert.ok(!/reserveRemaining|perform\(callback/.test(text),'Unapproved generic work interface '+p);}
 const profiles=['core','compatibility','renderer','assets'].map(name=>{assert.ok(!distribution(name).files.some(p=>p.startsWith(folder)));return {profile:name,candidateShipped:false};});
 const ownFiles=[...walk(folder.slice(0,-1)),'tests/tile-authoring-core-c2-browser-integration.test.mjs','tools/tile-authoring-core-c2-browser-integration-audit.mjs'].filter(p=>p!==folder+'source.json').sort();
 const result={status:'PRIVATE executable source/readonly/journal/continued-Core/head-capacity checkpoint; presentation/final-WAL/write authority UNBOUND',parent,kernelCommit:inputs.commit,ArtistCommit:inventory.Artist.commit,originalKernelInputs:inputs.closure.length,runtimeInputs:runtime.length,protectedDependencies:dependencies.length,frozenCorrectedCoreClosure:parentClosure.length,profiles};
 const manifest={...result,files:ownFiles.map(row),runtime:runtime.map(row),dependencies:dependencies.map(row)};
 if(record)fs.writeFileSync(path.join(root,folder+'source.json'),JSON.stringify(manifest,null,2)+'\n');else assert.deepEqual(json(folder+'source.json'),manifest,'Actual integration source/closure drift');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(auditIntegration({record:process.argv.includes('--record')})));
