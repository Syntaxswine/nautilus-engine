// Foreground, bounded validation only. No preview, daemon or retained helper.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..');
const evidence=path.join(here,'evidence'),npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
assert.ok(fs.existsSync(npm),'Use the locally installed npm CLI; no install or network fallback');
fs.mkdirSync(evidence,{recursive:true});
const runs=[];
for(const [args,file] of [[['run','check'],'repository-check.log'],[['test','--','--test-concurrency=4'],'repository-tests.log'],[['run','test:upstream'],'upstream.log'],[['run','build'],'build.log']]){
 const startedAt=new Date().toISOString(),fd=fs.openSync(path.join(evidence,file),'w');
 let run;try{run=spawnSync(process.execPath,[npm,...args],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd],timeout:20*60*1000});}finally{fs.closeSync(fd);}
 runs.push({command:['npm',...args],file,startedAt,finishedAt:new Date().toISOString(),exitCode:run.status,error:run.error?.message??null});
 fs.writeFileSync(path.join(evidence,'repository-runs.json'),JSON.stringify({owner:'01a1810e-3297-7142-ac31-ac504ea8553d',purpose:'Required repository gates after focused shared-controller proof',worktreeBase:'938ea1f78d305d86c163f9e4e84033236916e897',endCondition:'All foreground checks exit; no retained process',runs},null,2)+'\n');
 console.log(JSON.stringify(runs.at(-1)));
 if(run.error||run.status!==0){process.exitCode=1;break;}
}
