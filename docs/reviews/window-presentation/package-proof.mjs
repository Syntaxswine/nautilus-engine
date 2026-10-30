// --candidate changes only a private artifact stage, never root metadata.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {packProfile,moduleClosure,root} from '../../../tools/distribution.mjs';
import {browserProof} from './browser-proof.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const request=JSON.parse(fs.readFileSync(new URL('./registration-request.json',import.meta.url)));
const npmCli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));
function npm(args,cwd){if(!npmCli)throw Error('Use a Node installation containing npm.');return execFileSync(process.execPath,[npmCli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:8e6});}
export async function packageProof({candidate=false,browser=false}={}){
  const out=path.join(root,'artifacts/window-presentation-package'),stage=path.join(out,'stage-renderer'),consumer=path.join(out,'consumer');fs.mkdirSync(out,{recursive:true});
  // Exact known artifact paths only; no sibling worktree or external temporary source.
  const clean=folder=>{const resolved=path.resolve(folder);if(path.dirname(resolved)!==out||!['consumer','stage-renderer'].includes(path.basename(resolved)))throw Error('Unsafe proof cleanup');fs.rmSync(resolved,{recursive:true,force:true});};
  let result;
  try{
    clean(stage);clean(consumer);const core=packProfile('core'),renderer=packProfile('renderer');let rendererFile=renderer.file;
    if(candidate){
      fs.cpSync(path.join(root,'artifacts/distribution/stage-renderer'),stage,{recursive:true});
      const manifest=JSON.parse(fs.readFileSync(path.join(stage,'package.json'))),extra=[...moduleClosure([request.candidateEntry]),...request.supportFiles];
      for(const file of extra){const to=path.join(stage,file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,file),to);}
      Object.assign(manifest.exports,request.proposedExport);manifest.files=[...new Set([...manifest.files,...extra])].sort();fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify(manifest,null,2));
      const provenance=JSON.parse(fs.readFileSync(path.join(stage,'package-provenance.json')));provenance.privateCandidateOverlay=true;provenance.proposedExport=request.proposedExport;
      for(const file of extra){const data=fs.readFileSync(path.join(root,file));provenance.files=provenance.files.filter(r=>r.path!==file);provenance.files.push({path:file,bytes:data.length,sha256:sha(data)});}
      fs.writeFileSync(path.join(stage,'package-provenance.json'),JSON.stringify(provenance,null,2));
      rendererFile=path.join(out,JSON.parse(npm(['pack','--ignore-scripts','--json','--pack-destination',out],stage))[0].filename);
    }else{const manifest=JSON.parse(fs.readFileSync(path.join(root,'artifacts/distribution/stage-renderer/package.json')));for(const [k,v]of Object.entries(request.proposedExport))if(manifest.exports[k]!==v)throw Error('Root registration pending; use explicitly labelled --candidate private overlay.');}
    fs.mkdirSync(consumer);fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({private:true,type:'module'}));npm(['install','--offline','--ignore-scripts','--no-package-lock','--no-audit','--no-fund',core.file,rendererFile],consumer);
    fs.copyFileSync(path.join(root,'tests/fixtures/window-presentation/installed.mjs'),path.join(consumer,'proof.mjs'));fs.copyFileSync(path.join(root,'examples/window-presentation-fixture.js'),path.join(consumer,'fixture.js'));
    const proof=execFileSync(process.execPath,['proof.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true});
    const closure=moduleClosure([request.candidateEntry]);
    result={schemaVersion:1,status:'pass',candidateOverlay:candidate,rootRegistration:candidate?'pending, untouched':'declared',core:{file:path.relative(root,core.file),sha256:sha(fs.readFileSync(core.file))},renderer:{file:path.relative(root,rendererFile),sha256:sha(fs.readFileSync(rendererFile))},closure:{modules:closure.length,bytes:closure.reduce((n,f)=>n+fs.statSync(path.join(root,f)).size,0),files:closure},proof:proof.trim(),browser:browser?await browserProof('installed'):null};
    return result;
  }finally{clean(consumer);clean(stage);if(result){result.cleanup={consumerRemoved:!fs.existsSync(consumer),privateStageRemoved:!fs.existsSync(stage),helpersRetained:0};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));}}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await packageProof({candidate:process.argv.includes('--candidate'),browser:process.argv.includes('--browser')}),null,2));
