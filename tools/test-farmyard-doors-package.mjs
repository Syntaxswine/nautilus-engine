import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {distribution,packProfile,root} from './distribution.mjs';
import {checkFarmyardDoors} from './check-farmyard-doors.mjs';
const source=checkFarmyardDoors(root),entry='./adapters/farmyard/doors',target='./packages/adapters/farmyard/doors.js';
const declared=distribution('core');
if(declared.exports[entry]!==target)throw Error('The actual core package must declare the public door entry.');
if(declared.files.some(file=>file.startsWith('vendor/farmyard-grenades/')))throw Error('Raw donor game must remain outside the actual package.');
const output=path.join(root,'artifacts/farmyard-doors');fs.mkdirSync(output,{recursive:true});
const packed=packProfile('core'),consumer=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-door-consumer-'));
function npm(args){const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));if(!cli)throw Error('Use a Node installation containing npm.');return execFileSync(process.execPath,[cli,...args],{cwd:consumer,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});}
let result;
try{
 fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'nautilus-door-installed-proof',private:true,type:'module'}));
 npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',packed.file]);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/farmyard-doors.sources.json')));
 for(const record of manifest.files){const original=fs.readFileSync(path.join(root,manifest.snapshotRoot,record.path));if(original.length!==record.bytes||createHash('sha256').update(original).digest('hex')!==record.sha256)throw Error('Changed source evidence: '+record.path);const dest=path.join(consumer,'farmyard-source',record.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,original);}
 fs.copyFileSync(path.join(root,'tests/fixtures/farmyard-doors/package-proof.mjs'),path.join(consumer,'proof.mjs'));
 const proof=execFileSync(process.execPath,['proof.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true,maxBuffer:2*1024*1024,timeout:120000}).trim();
 result={status:'pass',kind:'actual declared core package; no export overlay',...packed,entry,target,source,proof};
}finally{
 const resolved=fs.realpathSync(consumer),base=fs.realpathSync(os.tmpdir());if(!resolved.startsWith(base+path.sep)||!path.basename(resolved).startsWith('nautilus-door-consumer-'))throw Error('Refusing cleanup of unexpected consumer directory.');fs.rmSync(resolved,{recursive:true,force:true});
}
result.cleanup='Disposed offline consumer in finally; no server, watcher or browser started.';
fs.writeFileSync(path.join(output,'installed-package-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
