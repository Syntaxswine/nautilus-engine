import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {root} from './snapshot-native-window-presenter.mjs';
const out=path.join(root,'artifacts/native-window-presenter/gates');fs.mkdirSync(out,{recursive:true});const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),results=[];
for(const [name,args]of [['check',['run','check']],['test',['test']],['upstream',['run','test:upstream']],['build',['run','build']]]){
  const started=Date.now(),r=spawnSync(process.execPath,[npm,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:20*1024*1024}),log=(r.stdout??'')+(r.stderr??'');fs.writeFileSync(path.join(out,name+'.log'),log);results.push({name,status:r.status===0?'pass':'fail',exitCode:r.status,elapsedMs:Date.now()-started,log:'artifacts/native-window-presenter/gates/'+name+'.log',summary:log.trim().split(/\r?\n/).slice(-12)});console.log(name+': '+results.at(-1).status);if(r.status!==0){console.error(log.slice(-8000));break;}
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:results.length===4&&results.every(r=>r.status==='pass')?'pass':'fail',results},null,2)+'\n');if(results.length!==4||results.some(r=>r.status!=='pass'))process.exitCode=1;
