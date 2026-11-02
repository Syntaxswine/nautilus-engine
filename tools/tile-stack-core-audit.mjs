import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {distribution,moduleClosure,root} from './distribution.mjs';
const baseline='5d69c2130eb64b6f4e31bc672e884bdc33bf47d2',run=(args,encoding='utf8')=>execFileSync('git',args,{cwd:root,encoding,windowsHide:true,maxBuffer:16*1024*1024}),hash=data=>createHash('sha256').update(data).digest('hex');
const allowed=f=>/^candidates\/tile-stack\/core\//.test(f)||/^docs\/reviews\/tile-stack\/core\//.test(f)||/^tests\/tile-stack-core-[^/]+\.test\.mjs$/.test(f)||/^tools\/tile-stack-core-[^/]+\.(mjs|py)$/.test(f);
const changed=[...new Set((run(['diff','--name-only',baseline])+'\n'+run(['ls-files','--others','--exclude-standard'])).trim().split(/\r?\n/).filter(Boolean))].sort();for(const f of changed)assert.ok(allowed(f),'Outside Gate A Coder ownership: '+f);
const protectedPaths=['packages/tiles-core','apps/editor/smart-tile','packages/tile-visuals','package.json','package-lock.json','upstream.json','.github','tools/check-smart-tile-editor-source.mjs','tools/distribution.mjs'];
const protectedFiles=run(['ls-tree','-r','--name-only',baseline,'--',...protectedPaths]).trim().split('\n').filter(Boolean);
const preserved=protectedFiles.map(f=>{const raw=fs.readFileSync(path.join(root,f)),original=run(['show',baseline+':'+f],null);assert.equal(hash(raw),hash(original),'Protected Git/raw byte mismatch '+f);return {path:f,sha256:hash(raw)};});
const helperClosure=moduleClosure(['candidates/tile-stack/core/index.js']),publicClosure=moduleClosure(['packages/tiles-core/index.js']);assert.equal(publicClosure.length,14);assert.ok(helperClosure.every(f=>f.startsWith('candidates/tile-stack/core/')));assert.ok(!publicClosure.some(f=>/candidate|composition|v2|planar/.test(f)));
const distributionChecks=['core','renderer','compatibility','assets'].map(profile=>{const d=distribution(profile);assert.ok(!d.files.some(f=>f.startsWith('candidates/')));assert.ok(!Object.values(d.exports).some(f=>f.includes('tile-stack')));return {profile,files:d.files.length,candidateIncluded:false};});
const inputs=[...new Set([...helperClosure,'candidates/tile-stack/core/api.d.ts','candidates/tile-stack/core/fixtures.mjs',...changed.filter(f=>f.startsWith('tests/')||f.startsWith('tools/'))])].sort();
const sourceHashes=inputs.map(f=>{const raw=fs.readFileSync(path.join(root,f));return {path:f,bytes:raw.length,sha256:hash(raw)};});
if(process.argv.includes('--verify-commit')){const commit=run(['rev-parse','HEAD']).trim();for(const r of sourceHashes)assert.equal(hash(run(['show',commit+':'+r.path],null)),r.sha256,r.path);console.log(JSON.stringify({commit,sourceGitRawEqual:true,sourceFiles:sourceHashes.length,protectedFiles:preserved.length,ownership:true}));}
else{const report={schemaVersion:1,baseline,identity:'private Gate A host helper; public core/source fences unchanged',ownership:{allowedPathsOnly:true,changed},helperClosure,publicClosure,sourceHashes,protectedFiles:preserved,distributions:distributionChecks};const output=path.join(root,'artifacts/tile-stack-core/source-audit.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:true,helperModules:helperClosure.length,publicTileModules:publicClosure.length,sourceFiles:sourceHashes.length,protectedFiles:preserved.length,output}));}
