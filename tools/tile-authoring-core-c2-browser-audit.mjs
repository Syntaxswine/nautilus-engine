import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {distribution,moduleClosure} from './distribution.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder='candidates/tile-authoring/core/c2/browser-owned-v1/',base='0597fc3b7ed9213842df90e8a1bbd4d0887ba49f';
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(folder+p)),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32*1024*1024});
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v!==null&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const row=p=>({path:p,bytes:read(p).length,sha256:sha(read(p))});
const walk=p=>fs.readdirSync(path.join(root,p),{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(p+'/'+x.name):[p+'/'+x.name]);
export function auditBrowser({record=false}={}){
 const refs=json('references.json');for(const r of refs.inputs){const bytes=git('show',r.commit+':'+r.path);assert.equal(sha(bytes),r.sha256);assert.equal(bytes.length,r.bytes);assert.equal(git('rev-parse',r.commit+':'+r.path).toString().trim(),r.gitBlob);assert.deepEqual(read(folder+r.copy),bytes);}
 assert.equal(sha(read(folder+'vendor/architect-decisions.md')),refs.architectDecision.sha256);
 const schema=json('browser.schema.json'),profile=json('profile.json'),digest=json('profile-digest.json'),contracts=json('contracts.json'),coverage=json('coverage.json');
 assert.equal(sha(canonical(schema)),digest.schemaCanonicalSha256);assert.equal(sha(canonical(contracts)),digest.contractsCanonicalSha256);assert.equal(sha(canonical(coverage)),digest.coverageCanonicalSha256);assert.equal(sha(canonical(profile)),digest.profileDigest);
 assert.equal(profile.resourceCatalogue.catalogueDigest,sha(canonical(json('resource-catalogue.json'))));
 assert.equal(Object.keys(profile.ceilings).length,15);assert.equal(Object.keys(coverage.rawCeilings).length,10);assert.equal(Object.keys(coverage.separateMonotonicFlowDomains).length,5);
 assert.deepEqual(profile.ceilings,json('vendor/20118a84/docs/reviews/tile-authoring/architect/browser-accounting-v1/profile.json').ceilings);
 const schemas=[schema,JSON.parse(read('candidates/tile-authoring/core/c2/abi/proposal.schema.json')),JSON.parse(read('candidates/tile-authoring/core/c2/contract.schema.json')),...['tile-recipe','tile-layout','tile-bundle'].map(n=>JSON.parse(read('packages/tiles-core/'+n+'-v1.schema.json')))];const known=new Map(schemas.map(x=>[x.$id,x]));
 const allowedStrict=['Origin','AuthoringContext','EffectiveLimits','Fingerprints','ResourceRequirements','AuthorityObservation','VisualObservation'];
 function refsWalk(v,current){if(!v||typeof v!=='object')return;if(v.$ref){const [uri,frag]=v.$ref.split('#'),target=uri?known.get(uri):current;assert.ok(target,'Unknown schema '+v.$ref);if(frag){let at=target;for(const k of frag.slice(1).split('/')){at=at?.[k.replaceAll('~1','/').replaceAll('~0','~')];assert.notEqual(at,undefined,'Missing schema pointer '+v.$ref);}}if(current===schema&&uri===schemas[1].$id)assert.ok(allowedStrict.includes(frag.split('/').at(-1)),'Strict ownership type leaked: '+v.$ref);}for(const x of Object.values(v))refsWalk(x,current);}
 for(const s of schemas)refsWalk(s,s);
 for(const f of ['types.d.ts','index.d.ts']){const source=read(folder+f).toString();stripTypeScriptTypes(source);if(f==='types.d.ts')assert.ok(!/\bunknown\b/.test(source.replace(/"[^"]*"/g,'')),'Unexpanded generated type');}
 const closure=moduleClosure([folder+'index.js']),runtime=closure.filter(p=>p.startsWith(folder)),dependencies=closure.filter(p=>!p.startsWith(folder));
 for(const p of dependencies)assert.equal(sha(read(p)),sha(git('show',base+':'+p)),'Accepted byte drift '+p);
 for(const p of runtime.filter(x=>x.endsWith('.js')))assert.ok(!/(?:Date\.now|Math\.random|randomUUID|\bsetTimeout\b|\bsetInterval\b|\blocalStorage\b|\bsessionStorage\b|from ['"]node:|\.prepareTileRepair\s*\(|\.createRetainedTileConsumer\s*\()/.test(read(p).toString()),'Side effect in candidate '+p);
 const profiles=[];for(const name of ['core','compatibility','renderer','assets']){const d=distribution(name);assert.ok(!d.files.some(x=>x.startsWith(folder)));profiles.push({profile:name,candidateShipped:false});}
 const allowed=p=>p.startsWith(folder)||/^tests\/tile-authoring-core-c2-browser-[^/]+\.test\.mjs$/.test(p)||/^tools\/tile-authoring-core-c2-browser-[^/]+\.mjs$/.test(p);
 for(const p of [...git('diff','--name-only',base).toString().trim().split(/\r?\n/),...git('ls-files','--others','--exclude-standard').toString().trim().split(/\r?\n/)].filter(Boolean))assert.ok(allowed(p),'Unauthorized path '+p);
 const ownFiles=[...walk(folder.slice(0,-1)),...fs.readdirSync(path.join(root,'tests')).filter(x=>/^tile-authoring-core-c2-browser-.*\.test\.mjs$/.test(x)).map(x=>'tests/'+x),...fs.readdirSync(path.join(root,'tools')).filter(x=>/^tile-authoring-core-c2-browser-.*\.mjs$/.test(x)).map(x=>'tools/'+x)].filter(x=>x!==folder+'source.json').sort();
 const result={status:'PRIVATE-headless-data-only; live-backends-UNBOUND',base,profileDigest:digest.profileDigest,closedDefinitions:Object.keys(schema.$defs).length,referencedGitObjects:refs.inputs.length,ownRuntimeInputs:runtime.length,acceptedDependencies:dependencies.length,profiles};
 if(record)fs.writeFileSync(path.join(root,folder+'source.json'),JSON.stringify({...result,files:ownFiles.map(row),runtime:runtime.map(row),dependencies:dependencies.map(row)},null,2)+'\n');else{const manifest=json('source.json');for(const x of [...manifest.files,...manifest.dependencies])assert.deepEqual(row(x.path),x,'Candidate source drift '+x.path);assert.deepEqual(manifest.runtime.map(x=>x.path),runtime);assert.deepEqual(manifest.files.map(x=>x.path),ownFiles);}
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(auditBrowser({record:process.argv.includes('--record')})));
