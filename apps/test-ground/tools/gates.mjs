import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const out=path.join(root,'artifacts/night-ledger-gates');
fs.mkdirSync(out,{recursive:true});
const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));
if(!cli)throw Error('Locate npm-cli.js.');
const bounds={check:1800000,test:1200000,'test:upstream':120000,build:180000};
const ps=source=>execFileSync('powershell.exe',['-NoProfile','-Command',source],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:1024*1024});
const identity=pid=>JSON.parse(ps(`$p=Get-Process -Id ${pid};[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress`));
const started=Date.now();
const record={owner:'01a1811b-5974-7d83-8cff-136a1d8b02ab',purpose:'Required finished-candidate repository gates',startedAt:new Date(started).toISOString(),expiresAt:new Date(started+60*60*1000).toISOString(),process:identity(process.pid),endCondition:'Finish all four foreground gates, or fail and retire the exact task-owned descendants. Check/test/upstream/build have finite 30/20/2/3 minute bounds.',restart:{cwd:root,executable:process.execPath,args:['apps/test-ground/tools/gates.mjs'],dependencies:'Existing Node/npm and repository sources',inputs:['package.json'],outputs:['artifacts/night-ledger-gates'],pendingWork:'Deliberately rerun after resolving a failed gate',secretReferences:[]},checks:[]};
record.stagedTree=execFileSync('git',['-c','core.longpaths=true','write-tree'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(record,null,2)+'\n');
save();

// CIM supplies parent links only. Preserve exact Get-Process timestamps before
// terminating a failed gate's disposable descendants, then revalidate each one.
function retire(gate){
  const id=gate.process;
  const source=`$ErrorActionPreference='Stop'
$rootLive=Get-Process -Id ${id.pid} -ErrorAction SilentlyContinue
if($rootLive -and $rootLive.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -ne '${id.creationFiletime}'){throw 'Root PID was reused; do not terminate.'}
$all=@(Get-CimInstance Win32_Process)
$owned=[System.Collections.Generic.HashSet[int]]::new();[void]$owned.Add(${id.pid})
do{$added=$false;foreach($item in $all){if($owned.Contains([int]$item.ParentProcessId) -and -not $owned.Contains([int]$item.ProcessId) -and $item.CreationDate.ToUniversalTime().ToFileTimeUtc() -ge ([long]'${id.creationFiletime}'-20)){[void]$owned.Add([int]$item.ProcessId);$added=$true}}}while($added)
$identities=@(foreach($item in $all){if($owned.Contains([int]$item.ProcessId)){$live=Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue;if($live){[pscustomobject]@{pid=$live.Id;parentPid=$item.ParentProcessId;creationFiletime=$live.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$live.Path}}}})
$identities|ConvertTo-Json -Depth 4 -Compress`;
  const raw=ps(source).trim();
  gate.retirement={reason:gate.reason,recordedAt:new Date().toISOString(),processes:raw?[].concat(JSON.parse(raw)):[]};
  save();
  gate.retirement.results=gate.retirement.processes.slice().reverse().map(item=>JSON.parse(ps(`$ErrorActionPreference='Stop'
$live=Get-Process -Id ${item.pid} -ErrorAction SilentlyContinue
$same=$live -and $live.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq '${item.creationFiletime}' -and $live.Path -eq '${item.executable.replaceAll("'","''")}'
$stopped=$false
if($same){if(-not $live.CloseMainWindow()){Stop-Process -InputObject $live -Force};[void]$live.WaitForExit(3000);$stopped=$true}
$after=Get-Process -Id ${item.pid} -ErrorAction SilentlyContinue
[pscustomobject]@{pid=${item.pid};creationFiletime='${item.creationFiletime}';stopped=$stopped;exited=(-not $after -or $after.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -ne '${item.creationFiletime}')}|ConvertTo-Json -Compress`)));
  save();
  if(gate.retirement.results.some(item=>!item.exited))throw Error('A task-owned gate process did not exit.');
}

let stopActive=null;
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>stopActive?.('Interrupted by '+signal));
for(const name of ['check','test','test:upstream','build']){
  const gate={command:'npm run '+name,status:'running',startedAt:new Date().toISOString(),log:name.replace(':','-')+'.log'};
  record.checks.push(gate);save();console.log('Running '+gate.command);
  const then=Date.now(),fd=fs.openSync(path.join(out,gate.log),'w');
  try{
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[cli,'run',name],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});
      let timer,settled=false;
      const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);stopActive=null;error?reject(error):resolve();};
      child.once('error',finish);
      child.once('close',(code,signal)=>finish(gate.reason?Error(gate.reason):code===0?null:Error('Gate exited with '+(signal||code))));
      try{gate.process=identity(child.pid);save();}catch(error){gate.reason=error.message;child.kill();finish(error);return;}
      stopActive=reason=>{gate.reason=reason;try{retire(gate);}catch(error){gate.cleanupError=error.message;save();finish(error);}};
      timer=setTimeout(()=>stopActive?.('Exceeded '+bounds[name]+' ms gate limit'),bounds[name]);
    });
    gate.status='passed';console.log('Passed '+gate.command);
  }catch(error){gate.status='failed';gate.reason=error.message;record.status='failed';throw error;}
  finally{fs.closeSync(fd);gate.elapsedMs=Date.now()-then;gate.finishedAt=new Date().toISOString();save();}
}
record.status='passed';record.finishedAt=new Date().toISOString();record.elapsedMs=Date.now()-started;save();
console.log(JSON.stringify({status:record.status,elapsedMs:record.elapsedMs,checks:record.checks}));
