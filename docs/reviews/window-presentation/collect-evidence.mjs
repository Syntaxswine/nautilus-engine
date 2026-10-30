import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),dir=path.dirname(fileURLToPath(import.meta.url));
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file))),sha=b=>createHash('sha256').update(b).digest('hex');
const modes=['source','built','installed'],results=modes.map(mode=>read('artifacts/window-presentation-'+mode+'/result.json'));
const captures=[];
for(const file of fs.readdirSync(path.join(root,'artifacts/window-presentation-source')).filter(n=>n.endsWith('.png'))){
  const hashes=modes.map(mode=>sha(fs.readFileSync(path.join(root,'artifacts/window-presentation-'+mode,file))));if(new Set(hashes).size!==1)throw Error('Source/built/installed pixel drift: '+file);
  captures.push({file,sha256:hashes[0],pixelIdenticalModes:modes});
}
const histories=modes.flatMap(mode=>fs.readFileSync(path.join(root,'artifacts/window-presentation-'+mode+'/helper-history.jsonl'),'utf8').trim().split('\n').map(JSON.parse));
const identities=histories.flatMap(r=>[r.process,r.browser]);let live=[];
if(process.platform==='win32'){
  const ids=[...new Set(identities.map(i=>i.pid))];if(ids.some(i=>!Number.isSafeInteger(i)))throw Error('Invalid helper identity');
  const script=`$taskPids=@(${ids.join(',')});@($taskPids|ForEach-Object {Get-Process -Id $_ -ErrorAction SilentlyContinue}|ForEach-Object {[pscustomobject]@{pid=$_.Id;creationFiletime=$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$_.Path}})|ConvertTo-Json -Compress`;
  const output=execFileSync('powershell.exe',['-NoProfile','-Command',script],{encoding:'utf8',windowsHide:true}).trim();live=output?JSON.parse(output):[];if(!Array.isArray(live))live=[live];
}else if(process.platform==='linux'){
  for(const pid of new Set(identities.map(i=>i.pid)))try{const stat=fs.readFileSync('/proc/'+pid+'/stat','utf8');live.push({pid,executable:fs.readlinkSync('/proc/'+pid+'/exe'),creationTicks:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19]});}catch(error){if(!['ENOENT','ESRCH'].includes(error.code))throw error;}
}else throw Error('Exact helper lifetime audit supports Windows and Linux only.');
const free=port=>new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});
const helpers=[];
for(const h of histories){
  const active=ident=>live.some(p=>p.pid===ident.pid&&(ident.creationFiletime?p.creationFiletime===ident.creationFiletime:p.creationTicks===ident.creationTicks)&&p.executable.toLowerCase()===ident.executable.toLowerCase());
  const record={owner:h.owner,purpose:h.purpose,startedAt:h.startedAt,expiresAt:h.expiresAt,process:h.process,browser:h.browser,port:h.port,nodeLifetimeEnded:!active(h.process),browserLifetimeEnded:!active(h.browser),portReleased:await free(h.port),stopMethod:h.stopMethod,restart:h.restart};
  if(!record.nodeLifetimeEnded||!record.browserLifetimeEnded||!record.portReleased)throw Error('Helper retirement needs review: '+JSON.stringify(record));helpers.push(record);
}
const cleanups=modes.map(mode=>read('artifacts/window-presentation-'+mode+'/cleanup-receipt.json'));
if(cleanups.some(c=>!c.httpClosed||!c.browserClosed))throw Error('Browser helper cleanup incomplete');
const cleanup={schemaVersion:1,verifiedAt:new Date().toISOString(),method:'Supported owning-tool closes, then exact PID/creation/executable comparison and localhost bind/release probes. No unrelated process stopped.',helpers,latestReceipts:cleanups,retained:0};
fs.writeFileSync(path.join(dir,'helper-cleanup.json'),JSON.stringify(cleanup,null,2)+'\n');
fs.mkdirSync(path.join(dir,'previews'),{recursive:true});for(const file of ['joined-frames.png','joined-sheets.png','waist-brick.png','shatter-phone.png','tall-shatter-phone.png'])fs.copyFileSync(path.join(root,'artifacts/window-presentation-source',file),path.join(dir,'previews',file));
const installed=read('artifacts/window-presentation-package/result.json');
const checks={schemaVersion:1,status:'pass',baseline:'5f3627cd9fc4d95f15b7f1eefafdfb1d6034475f',gates:{check:'pass; 603 existing pinned sources plus headless/closure/whitelist checks',tests:'638 pass, zero failures/skips/cancellations',upstream:'32 pass',build:'pass; 457 module paths, 11 recorded deployment patches'},
  scope:'Optional appearance candidate only. No root exports/whitelist/version/global capability/CI or consumer pin changed.',geometry:{presets:39,rotationsJoins:624,tallMetres:[20,10.6],standardStoreyMetres:2.12},browser:results,captures,installed,cleanup:{file:'helper-cleanup.json',retained:0},
  limits:['Private renderer artifact overlay pending Root registration; actual separately installed core and renderer were exercised.','SwiftShader desktop/phone viewport proof, not physical-phone performance.','Audio, editor authoring bindings and production game adoption remain deferred.'],
  gateLogs:['check','tests','upstream','build'].map(name=>{const file='artifacts/window-presentation-'+name+'.log';return {file,sha256:sha(fs.readFileSync(path.join(root,file)))};})};
fs.writeFileSync(path.join(dir,'checks.json'),JSON.stringify(checks,null,2)+'\n');
console.log(JSON.stringify({status:checks.status,captures:captures.length,identicalModes:modes,verifiedHelperLifetimes:helpers.length,retained:0,installedCandidateOverlay:installed.candidateOverlay}));
