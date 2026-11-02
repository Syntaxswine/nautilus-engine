// Actual normal public core package plus an explicitly separate copied host helper.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {distribution,moduleClosure,root} from './distribution.mjs';
const output=path.join(root,'artifacts/tile-stack-core'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-tile-stack-core-proof-')),stage=path.join(scratch,'stage'),consumer=path.join(scratch,'consumer'),normal=distribution('core');fs.mkdirSync(output,{recursive:true});
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex'),records=[],copies=[];let report;
const npmCli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(f=>f&&path.basename(f)==='npm-cli.js'&&fs.existsSync(f));assert.ok(npmCli,'Use a Node installation containing npm.');
const env={...process.env,NAUTILUS_STACK_CORE_IMPORT:'@nautilus-engine/core/tiles'};delete env.NODE_TEST_CONTEXT;
function run(executable,args,cwd=consumer,filename=null){
 const startedAt=new Date().toISOString();const child=spawnSync(executable,args,{cwd,encoding:'utf8',windowsHide:true,env,maxBuffer:16*1024*1024});records.push({ownerChat:'01a1810c-62da-7210-a1ca-b72b449ce024',project:'Nautilus Engine',purpose:filename??args.find(a=>a.endsWith('.mjs'))??'offline package operation',startedAt,endedAt:new Date().toISOString(),endCondition:'synchronous foreground exit',stopMethod:'owning process handle waited to exit',executable:path.basename(executable),pid:child.pid??null,foreground:true,status:child.status,signal:child.signal??null,error:child.error?.code??null,exited:child.status!==null||Boolean(child.error)});
 if(filename)fs.writeFileSync(path.join(output,filename),(child.stdout??'')+(child.stderr??''));
 assert.equal(child.error,undefined,child.error?.message);assert.equal(child.status,0,(child.stdout??'')+(child.stderr??''));return child.stdout;
}
function npm(args,cwd){return run(process.execPath,[npmCli,...args,'--cache',path.join(scratch,'npm-cache')],cwd);}
function copy(relative){const dest=path.join(consumer,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,relative),dest);assert.equal(hash(dest),hash(path.join(root,relative)));copies.push({path:relative,sha256:hash(dest),identity:relative.startsWith('candidates/')?'copied private candidate host helper/fixture':'copied proof tooling'});}
try{
 fs.mkdirSync(stage);fs.mkdirSync(consumer);
 assert.ok(!normal.files.some(f=>f.startsWith('candidates/')));assert.ok(!Object.values(normal.exports).some(f=>f.includes('candidate')));
 for(const f of normal.files){const dest=path.join(stage,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,f),dest);}
 const source=JSON.parse(fs.readFileSync(path.join(root,'package.json')));fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:normal.name,version:source.version,private:true,type:'module',engines:source.engines,exports:normal.exports,files:normal.files}));
 fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'nautilus-stack-private-host-proof',private:true,type:'module'}));
 const pack=JSON.parse(npm(['pack','--offline','--ignore-scripts','--json','--pack-destination',scratch],stage))[0];
 npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',path.join(scratch,pack.filename)],consumer);
 const installed=path.join(consumer,'node_modules/@nautilus-engine/core'),installedManifest=JSON.parse(fs.readFileSync(path.join(installed,'package.json')));assert.deepEqual(installedManifest.exports,normal.exports);
 const packageHashes=normal.files.map(f=>{const installedHash=hash(path.join(installed,f)),sourceHash=hash(path.join(root,f));assert.equal(installedHash,sourceHash,f);return {path:f,sha256:installedHash,bytes:fs.statSync(path.join(installed,f)).size};});
 const publicClosure=moduleClosure(['packages/tiles-core/index.js']);assert.equal(publicClosure.length,14);assert.ok(!publicClosure.some(f=>/v2|composition|candidate|planar/.test(f)));
 const helperFiles=fs.readdirSync(path.join(root,'candidates/tile-stack/core')).filter(f=>/\.(js|mjs)$/.test(f)).map(f=>'candidates/tile-stack/core/'+f);
 const proofFiles=['tests/tile-stack-core-contracts.test.mjs','tests/tile-stack-core-planner.test.mjs','tools/tile-stack-core-measure.mjs','tools/tile-stack-core-scenarios.mjs','tools/tile-stack-core-node-probe.mjs'];
 for(const file of [...helperFiles,...proofFiles])copy(file);
 const tap=run(process.execPath,['--test','--test-reporter=tap','tests/tile-stack-core-contracts.test.mjs','tests/tile-stack-core-planner.test.mjs'],consumer,'installed-tests.tap');
 const counts=Object.fromEntries([...tap.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/gm)].map(m=>[m[1],Number(m[2])]));assert.ok(counts.tests>=28);assert.equal(counts.pass,counts.tests);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(counts[key],0);
 const nodeProbe=JSON.parse(run(process.execPath,['tools/tile-stack-core-node-probe.mjs'],consumer,'installed-node-probe.log'));assert.equal(nodeProbe.forbiddenDependencyAccesses,0);
 const installedEvidence=path.join(output,'installed.json');run(process.execPath,['tools/tile-stack-core-measure.mjs',installedEvidence],consumer,'installed-measure.log');
 // Source run uses the same proof bytes, resolving the real source public index.
 const prior=env.NAUTILUS_STACK_CORE_IMPORT;delete env.NAUTILUS_STACK_CORE_IMPORT;run(process.execPath,['tools/tile-stack-core-measure.mjs',path.join(output,'source.json')],root,'source-measure.log');env.NAUTILUS_STACK_CORE_IMPORT=prior;
 const a=JSON.parse(fs.readFileSync(path.join(output,'source.json'))),b=JSON.parse(fs.readFileSync(installedEvidence));assert.deepEqual(a,b,'source/actual-installed semantics differ');
 for(const mode of ['source','installed'])run('python',['tools/tile-stack-core-oracle.py',path.join(output,mode+'.json'),path.join(output,mode+'-oracle.json')],root,mode+'-oracle.log');
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'source-oracle.json'))),JSON.parse(fs.readFileSync(path.join(output,'installed-oracle.json'))));
 report={schemaVersion:1,identity:'actual offline-installed normal @nautilus-engine/core/tiles plus explicitly separate copied private candidate host helper; no overlay public entry',package:{name:normal.name,version:source.version,integrity:pack.integrity,normalFileCount:normal.files.length,exports:normal.exports,files:packageHashes},publicTilesClosure:publicClosure.map(f=>packageHashes.find(r=>r.path===f)),copiedProofFiles:copies,tests:counts,nodeProbe,semanticCases:a.cases.length,sourceInstalledEqual:true,independentOracleEqual:true,processes:records,cleanup:null};
}finally{
 // Revalidate the exact absolute task-owned disposable directory before recursion.
 const resolved=path.resolve(scratch),parent=path.resolve(os.tmpdir());assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('nautilus-tile-stack-core-proof-'));assert.ok(resolved!==parent);
 fs.rmSync(resolved,{recursive:true,force:true});assert.equal(fs.existsSync(resolved),false);
 const cleanup={scratchPath:resolved,removed:true,stageRemoved:!fs.existsSync(stage),consumerRemoved:!fs.existsSync(consumer),allForegroundChildrenExited:records.every(r=>r.exited),backgroundHelpers:0,servers:0,ports:[],retainedHelpers:0};
 fs.writeFileSync(path.join(output,'installed-cleanup.json'),JSON.stringify(cleanup,null,2)+'\n');if(report){report.cleanup=cleanup;fs.writeFileSync(path.join(output,'installed-report.json'),JSON.stringify(report,null,2)+'\n');}
}
console.log(JSON.stringify({ok:true,tests:report.tests,sourceInstalledEqual:true,oracleEqual:true,normalFiles:report.package.normalFileCount,publicTileModules:report.publicTilesClosure.length,cleanup:report.cleanup}));
