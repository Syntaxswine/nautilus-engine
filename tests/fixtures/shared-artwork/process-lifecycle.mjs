// Foreground proof-process bookkeeping only. No API/import substitution.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const target=process.env.NAUTILUS_ARTWORK_PROCESS_RECORD;if(!target)throw Error('Task-owned process record required.');
let nativeIdentity;
if(process.platform==='win32')nativeIdentity=JSON.parse(execFileSync('powershell',['-NoProfile','-Command',`$p=Get-Process -Id ${process.pid};@{creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress`],{windowsHide:true,encoding:'utf8',timeout:5000}));
else nativeIdentity={creationTicks:fs.readFileSync('/proc/'+process.pid+'/stat','utf8').slice(fs.readFileSync('/proc/'+process.pid+'/stat','utf8').lastIndexOf(')')+2).split(' ')[19],executable:process.execPath};
const identity={owner:'Architect / artwork-catalogue-integration',project:'Nautilus Engine',purpose:process.env.NAUTILUS_ARTWORK_PROCESS_PURPOSE,pid:process.pid,parentPid:process.ppid,...nativeIdentity,observedStartAt:new Date().toISOString(),foreground:true,ports:[],endCondition:'bounded synchronous command exit',stopMethod:'owning foreground process handle'};
fs.appendFileSync(target,JSON.stringify({...identity,event:'start'})+'\n');process.once('exit',code=>fs.appendFileSync(target,JSON.stringify({...identity,event:'exit',endedAt:new Date().toISOString(),code})+'\n'));
