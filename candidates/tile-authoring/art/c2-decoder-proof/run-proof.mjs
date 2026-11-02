// Finite Windows test launcher; no execution-policy changes and no retained helper.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn,execFileSync} from 'node:child_process';
const candidate=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(candidate,'../../../..'),arg=process.argv.indexOf('--python'),python=arg<0?process.env.NAUTILUS_PROOF_PYTHON:process.argv[arg+1];
if(process.platform!=='win32'||!python||!fs.existsSync(python))throw Error('This proof requires Windows and --python <absolute Python executable with pinned Pillow>.');
process.chdir(root);
const relative='artifacts/art-c2-decoder-proof/runs/'+new Date().toISOString().replaceAll(/[:.]/g,'')+'-'+process.pid,output=path.join(root,relative),steps=[];fs.mkdirSync(output,{recursive:true});
const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n'),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function native(pid){const script='$p=Get-Process -Id '+pid+" -ErrorAction SilentlyContinue;if($p){@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress}else{'null'}";return JSON.parse(execFileSync('powershell',['-NoProfile','-Command',script],{windowsHide:true,encoding:'utf8',timeout:10000}).replace(/^\uFEFF/,''));}
const owner={owner:'Nautilus Artist',purpose:'Finite private decoder proof launcher',process:native(process.pid),startedAt:new Date().toISOString(),endCondition:'Exit after input verification, independent oracle and 69 controls; no retained helper',ports:[],restart:{cwd:root,executable:process.execPath,arguments:[path.relative(root,fileURLToPath(import.meta.url)),'--python',python]},status:'running'};save('launcher-helper.json',owner);
async function run(name,exe,args,seconds){
 const ready=path.join(output,name+'-helper.json'),gate=path.join(output,name+'-start'),child=spawn(exe,args,{cwd:root,windowsHide:true,env:{...process.env,NAUTILUS_PROOF_OUTPUT:relative,NAUTILUS_PROOF_START_FILE:gate},stdio:['ignore','pipe','pipe']});
 let identity=null,closed=false,childError=null,stdout='',stderr='';const begin=Date.now(),deadline=begin+seconds*1000,record={owner:'Nautilus Artist',purpose:'Private decoder proof '+name,pid:child.pid,startedAt:new Date(begin).toISOString(),expiresAt:new Date(deadline).toISOString(),status:'starting',ports:[],stopMethod:'Natural exit; exact PID/creation/executable revalidation before termination',restart:{cwd:root,executable:exe,arguments:args,environment:{NAUTILUS_PROOF_OUTPUT:relative,NAUTILUS_PROOF_START_FILE:gate}}};
 const write=()=>save(name+'-wrapper-helper.json',record),exited=new Promise(resolve=>{child.once('error',e=>{childError=e;});child.once('close',(code,signal)=>{closed=true;record.exitCode=code;record.signal=signal;resolve();});});
 child.stdout.on('data',b=>{stdout+=b.toString();fs.appendFileSync(path.join(output,name+'.stdout.log'),b);});child.stderr.on('data',b=>{stderr+=b.toString();fs.appendFileSync(path.join(output,name+'.stderr.log'),b);});write();
 const stop=()=>{const current=native(child.pid);if(!current){if(closed)return;throw Error(name+' lifetime no longer observable; no termination attempted');}if(!identity||current.creationFiletime!==identity.creationFiletime||current.executable!==identity.executable)throw Error(name+' identity mismatch; refusing termination');record.revalidatedBeforeStop=current;record.stopRequestedAt=new Date().toISOString();write();if(!child.kill())throw Error(name+' stop was not acknowledged');};
 try{
   while(!closed&&!fs.existsSync(ready)&&Date.now()<deadline)await delay(10);
   if(fs.existsSync(ready)){const readyRecord=JSON.parse(fs.readFileSync(ready,'utf8').replace(/^\uFEFF/,''));identity={pid:readyRecord.pid,creationFiletime:readyRecord.creationFiletime,executable:readyRecord.executable};if(identity.pid!==child.pid||!identity.creationFiletime||identity.creationFiletime==='0')throw Error(name+' ready identity invalid');record.process=identity;record.status='running';write();fs.writeFileSync(gate,'start\n');}
   while(!closed&&Date.now()<deadline)await delay(25);
   if(!closed){record.status='timeout';write();stop();await exited;throw Error(name+' exceeded deadline');}
   if(childError)throw childError;
   if(!identity)throw Error(name+' exited before recording identity');
   if(record.exitCode!==0)throw Error(name+' failed with exit '+record.exitCode+'\n'+stderr.slice(-2000));
   record.status='exited';return record;
 }finally{
   if(!closed&&identity){try{stop();await exited;}catch(e){record.cleanupError=e.message;}}
   if(identity){const after=native(child.pid);record.originalLifetimeGone=!after||after.creationFiletime!==identity.creationFiletime;}
   record.finishedAt=new Date().toISOString();write();
   console.log(stdout.trim().split('\n').slice(-3).join('\n'));if(stderr)console.error(stderr.slice(-2000));
 }
}
try{
 await import('./verify-adaptations.mjs');
 steps.push(await run('oracle',path.resolve(python),['candidates/tile-authoring/art/c2-decoder-proof/oracle-fixtures.py'],45));
 steps.push(await run('suite',process.execPath,['candidates/tile-authoring/art/c2-decoder-proof/suite.mjs'],90));
 if(steps.some(s=>!s.originalLifetimeGone))throw Error('A helper lifetime is not verified closed');
 save('run-receipt.json',{status:'pass',output:relative,helpers:steps,ports:[],retainedHelpers:[],finishedAt:new Date().toISOString()});owner.status='completed';console.log('Proof complete; reports: '+relative);
}catch(e){owner.status='failed';owner.error=e.message;save('run-receipt.json',{status:'fail',error:e.message,output:relative,helpers:steps,finishedAt:new Date().toISOString()});throw e;}
finally{owner.finishedAt=new Date().toISOString();save('launcher-helper.json',owner);}
