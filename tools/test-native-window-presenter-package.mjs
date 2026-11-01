import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {root,baseCommit,vendorRoot} from './snapshot-native-window-presenter.mjs';
import {packProfile,moduleClosure} from './distribution.mjs';
import {stageAuthoring} from './stage-window-authoring-proof.mjs';
const out=path.join(root,'artifacts/native-window-presenter-package');fs.mkdirSync(out,{recursive:true});
const npmCli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(f=>f&&path.basename(f)==='npm-cli.js'&&fs.existsSync(f));if(!npmCli)throw Error('Missing npm CLI.');
const npm=(args,cwd)=>execFileSync(process.execPath,[npmCli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:6*1024*1024,timeout:120000});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-native-window-')),consumer=path.join(temp,'consumer'),privateStage=path.join(temp,'presenter'),authoringStage=path.join(temp,'authoring');
let report;
try{
  for(const directory of [consumer,privateStage,authoringStage])fs.mkdirSync(directory);
  const core=packProfile('core'),renderer=packProfile('renderer'),files=moduleClosure(['packages/native-window-presenter/three.js']);
  if(files.some(f=>!f.startsWith('packages/native-window-presenter/')))throw Error('Private presenter bundles another core/renderer.');
  const attribution=[vendorRoot+'/provenance.json',vendorRoot+'/sites/tactical-animal/dist/aft/tactics/vendor/THREE-LICENSE.txt.original'];
  for(const file of [...files,'packages/native-window-presenter/NOTICE.md','packages/native-window-presenter/source.json',...attribution]){const dest=path.join(privateStage,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
  fs.writeFileSync(path.join(privateStage,'package.json'),JSON.stringify({name:'@nautilus-private/native-window-presenter',version:'0.0.0',private:true,type:'module',exports:{'.':'./packages/native-window-presenter/three.js'},files:['packages/native-window-presenter',...attribution]}));
  const staged=stageAuthoring(authoringStage),pack=dir=>{const r=JSON.parse(npm(['pack','--offline','--ignore-scripts','--json','--pack-destination',out],dir))[0];return path.join(out,r.filename);},presenter=pack(privateStage),authoring=pack(authoringStage);
  fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'native-window-installed-proof',private:true,type:'module'}));npm(['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',core.file,renderer.file,presenter,authoring],consumer);
  for(const f of ['package-proof.mjs','proof.mjs','lifecycle-proof.mjs'])fs.copyFileSync(path.join(root,'tests/fixtures/native-window-presenter',f),path.join(consumer,f));
  const proof=JSON.parse(execFileSync(process.execPath,['package-proof.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true,maxBuffer:4000000,timeout:120000}).trim());
  report={status:'pass',baseCommit,publicCore:core,publicRenderer:renderer,privatePresenter:{archive:presenter,sha256:createHash('sha256').update(fs.readFileSync(presenter)).digest('hex'),modules:files,attribution},privateAuthoring:{archive:authoring,registered:false,commit:staged.authoringCommit,dependencyCommit:staged.dependencyCommit,files:staged.files},proof};
}finally{
  const target=fs.realpathSync(temp),parent=fs.realpathSync(os.tmpdir());if(path.dirname(target)!==parent||!path.basename(target).startsWith('nautilus-native-window-'))throw Error('Unsafe temporary cleanup target.');fs.rmSync(target,{recursive:true,force:true});if(fs.existsSync(target))throw Error('Temporary consumer remains.');
}
report.cleanup='Temporary stages and installed consumer removed in finally. No server/browser/worker retained.';fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,proof:report.proof,cleanup:report.cleanup},null,2));
