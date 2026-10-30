import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {distribution,moduleClosure} from './distribution.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=path.join(root,'artifacts/farmyard-doors');fs.mkdirSync(output,{recursive:true});
const sourcePackage=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),sourceManifestBytes=fs.readFileSync(path.join(root,'package.json'));
const base=distribution('core'),entry='./adapters/farmyard/doors',target='./packages/adapters/farmyard/doors.js',extra=['docs/adapters/farmyard-doors.md','docs/reviews/farmyard-doors.sources.json','docs/reviews/farmyard-doors/integration-request.json','packages/adapters/farmyard/doors/door-state-v1.schema.json','packages/adapters/farmyard/doors/door-host-save-v1.schema.json'];
const files=[...new Set([...base.files,...moduleClosure([target]),...extra])].sort(),stage=fs.mkdtempSync(path.join(output,'stage-')),consumer=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-door-consumer-'));
function npm(args,cwd){const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));if(!cli)throw Error('Use a Node installation containing npm.');return execFileSync(process.execPath,[cli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});}
function cleanup(folder,parent,prefix){const resolved=fs.realpathSync(folder),base=fs.realpathSync(parent);if(!resolved.startsWith(base+path.sep)||!path.basename(resolved).startsWith(prefix))throw Error('Refusing cleanup of unexpected proof directory: '+resolved);fs.rmSync(resolved,{recursive:true,force:true});}
let result;
try{
  for(const file of files){const dest=path.join(stage,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
  // Overlay only the disposable package stage. Architect owns production
  // exports/whitelist/version/capabilities and the final composed CI gate.
  const manifest={name:base.name,version:sourcePackage.version,private:true,type:'module',exports:{...base.exports,[entry]:target},files};
  fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify(manifest,null,2)+'\n');
  const packed=JSON.parse(npm(['pack','--ignore-scripts','--json','--pack-destination',output],stage))[0],archive=path.join(output,packed.filename);
  if(packed.files.some(file=>file.path.startsWith('vendor/farmyard-grenades/')))throw Error('Original source test fixture must not be a runtime package dependency.');
  fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'nautilus-door-installed-proof',private:true,type:'module'}));npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',archive],consumer);
  const source=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/farmyard-doors.sources.json')));
  for(const record of source.files){const original=fs.readFileSync(path.join(root,source.snapshotRoot,record.path));if(original.length!==record.bytes||createHash('sha256').update(original).digest('hex')!==record.sha256)throw Error('Changed source evidence: '+record.path);const dest=path.join(consumer,'farmyard-source',record.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,original);}
  fs.copyFileSync(path.join(root,'tests/fixtures/farmyard-doors/package-proof.mjs'),path.join(consumer,'proof.mjs'));
  const proof=execFileSync(process.execPath,['proof.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true,maxBuffer:2*1024*1024,timeout:120000}).trim();
  if(!sourceManifestBytes.equals(fs.readFileSync(path.join(root,'package.json'))))throw Error('Production package metadata changed during the candidate proof.');
  result={status:'pass',kind:'candidate-only disposable export overlay',productionComposition:'pending Architect',entry,target,baseVersion:sourcePackage.version,files:packed.entryCount,compressedBytes:packed.size,unpackedBytes:packed.unpackedSize,integrity:packed.integrity,proof,sourceModules:source.files.length,sourceCommit:source.commit,cleanup:'pending'};
}finally{cleanup(consumer,os.tmpdir(),'nautilus-door-consumer-');cleanup(stage,output,'stage-');}
result.cleanup='Disposed offline consumer and package stage; no servers, watchers or browser sessions started.';fs.writeFileSync(path.join(output,'installed-package-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
