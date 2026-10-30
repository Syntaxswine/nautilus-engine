import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {distribution,moduleClosure,root} from './distribution.mjs';
import {checkWindowQueries} from './check-farmyard-window-queries.mjs';
const source=checkWindowQueries(),base=distribution('core'),name='@nautilus-engine/window-query-candidate',entries={'./windows':'./packages/windows-core/index.js','./adapters/farmyard/windows':'./packages/adapters/farmyard/windows.js'};
const support=['packages/windows-core/window-geometry-v1.schema.json','packages/adapters/farmyard/windows/NOTICE.md','docs/adapters/farmyard-windows.md','docs/reviews/farmyard-windows/source-audit.json','docs/reviews/farmyard-windows/query-checkpoint.md','docs/reviews/farmyard-windows/query-integration-request.json'];
const files=[...new Set([...base.files,...moduleClosure(Object.values(entries)),...support])].sort();if(files.some(file=>file.startsWith('vendor/farmyard-grenades/')))throw Error('Raw donor conformance sources must not enter the candidate package.');
const output=path.join(root,'artifacts/farmyard-windows');fs.mkdirSync(output,{recursive:true});
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-window-query-proof-')),stage=path.join(scratch,'stage'),consumer=path.join(scratch,'consumer');fs.mkdirSync(stage);fs.mkdirSync(consumer);
function npm(args,cwd){const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));if(!cli)throw Error('Use Node with npm.');return execFileSync(process.execPath,[cli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,timeout:120000});}
let result;
try{
  for(const file of files){const destination=path.join(stage,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(root,file),destination);}
  const manifest={name,version:'0.0.0-window-query-candidate',private:true,type:'module',exports:{...base.exports,...entries},files};fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify(manifest,null,2)+'\n');
  const packed=JSON.parse(npm(['pack','--offline','--ignore-scripts','--json','--pack-destination',output],stage))[0],archive=path.join(output,packed.filename);fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'offline-window-query-proof',private:true,type:'module'}));
  npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',archive],consumer);fs.copyFileSync(path.join(root,'tests/fixtures/farmyard-windows-queries/package-proof.mjs'),path.join(consumer,'proof.mjs'));
  const proof=JSON.parse(execFileSync(process.execPath,['proof.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:2000000}).trim());
  result={status:'pass',kind:'Private candidate package OVERLAY; not the root declared package or a release',name,version:manifest.version,entries,archive,sha256:createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),compressedBytes:packed.size,unpackedBytes:packed.unpackedSize,fileCount:packed.entryCount,source,proof};
}finally{
  const resolved=fs.realpathSync(scratch),temp=fs.realpathSync(os.tmpdir());if(path.dirname(resolved)!==temp||!path.basename(resolved).startsWith('nautilus-window-query-proof-'))throw Error('Refusing unsafe proof cleanup.');fs.rmSync(resolved,{recursive:true,force:true});if(fs.existsSync(resolved))throw Error('Offline proof helper directory was not removed.');
}
result.cleanup='Temporary stage and offline consumer removed in finally. No preview server, watcher or browser was started.';fs.writeFileSync(path.join(output,'installed-query-candidate-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,kind:result.kind,archive:result.archive,sha256:result.sha256,fileCount:result.fileCount,proof:result.proof,cleanup:result.cleanup},null,2));
