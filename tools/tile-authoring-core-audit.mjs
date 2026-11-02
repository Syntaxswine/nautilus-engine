import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {root,distribution,moduleClosure} from './distribution.mjs';
const baseline='b850e20e2fdd85435d33f16327482b80380af728',stack='45ecaef16bb39424c8b885d53acb4371654b4fa0';
const git=(args,encoding='utf8')=>execFileSync('git',args,{cwd:root,encoding,windowsHide:true,maxBuffer:16*1024*1024}),hash=b=>createHash('sha256').update(b).digest('hex');
const allowed=f=>f.startsWith('candidates/tile-authoring/core/')||f.startsWith('docs/reviews/tile-authoring/core/')||/^tools\/tile-authoring-core-[^/]+\.(mjs|py)$/.test(f)||/^tests\/tile-authoring-core-[^/]+\.test\.mjs$/.test(f);
const changed=[...new Set((git(['diff','--name-only',baseline])+'\n'+git(['ls-files','--others','--exclude-standard'])).split(/\r?\n/).filter(Boolean))].sort();changed.forEach(f=>assert.ok(allowed(f),'Outside contract scope '+f));
assert.equal(git(['rev-parse','codex/tile-stack-planner']).trim(),stack,'Approved stack branch moved');
const protectedFiles=git(['ls-tree','-r','--name-only',baseline,'--','packages/tiles-core','packages/tile-visuals','packages/map-core','apps/editor/smart-tile','package.json','package-lock.json','upstream.json','.github','tools/distribution.mjs','NOTICE.md','assets/buildings/painted-materials-v2.png']).trim().split('\n');
for(const f of protectedFiles)assert.equal(hash(fs.readFileSync(path.join(root,f))),hash(git(['show',baseline+':'+f],null)),'Protected byte change '+f);
const publicClosure=moduleClosure(['packages/tiles-core/index.js']);assert.equal(publicClosure.length,14);assert.equal(publicClosure.reduce((n,f)=>n+fs.statSync(path.join(root,f)).size,0),91604);
const profiles=['core','renderer','compatibility','assets'].map(profile=>{const d=distribution(profile);assert.ok(!d.files.some(f=>f.startsWith('candidates/')));assert.ok(!Object.values(d.exports).some(f=>f.includes('tile-authoring')));return {profile,candidateExcluded:true};});
const sourceHashes=changed.filter(f=>!f.startsWith('docs/')).map(f=>({path:f,bytes:fs.statSync(path.join(root,f)).size,sha256:hash(fs.readFileSync(path.join(root,f)))}));
const report={schemaVersion:1,baseline,stackCheckpointPreserved:stack,scope:'contract/design only; no candidate executor or public registration',candidateRuntimeModules:0,publicTileModules:14,publicTileBytes:91604,protectedFiles:protectedFiles.length,profiles,sourceHashes,borrowedSchemaHashes:['tile-recipe','tile-layout','tile-bundle','compiled-tiles'].map(n=>{const f='packages/tiles-core/'+n+'-v1.schema.json';return {path:f,sha256:hash(fs.readFileSync(path.join(root,f)))};}),borrowedResource:{path:'assets/buildings/painted-materials-v2.png',sha256:hash(fs.readFileSync(path.join(root,'assets/buildings/painted-materials-v2.png')))},changed};
if(process.argv.includes('--verify-commit')){const commit=git(['rev-parse','HEAD']).trim();for(const r of sourceHashes)assert.equal(hash(git(['show',commit+':'+r.path],null)),r.sha256);console.log(JSON.stringify({commit,gitRawEqual:true,protectedFiles:protectedFiles.length,stackCheckpointPreserved:stack}));}
else{const target=path.join(root,'artifacts/tile-authoring-core/source-audit.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:true,sourceFiles:sourceHashes.length,protectedFiles:protectedFiles.length,candidateRuntimeModules:0,publicTileModules:14}));}
