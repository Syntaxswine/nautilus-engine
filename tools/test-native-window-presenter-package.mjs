import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,vendorRoot} from './snapshot-native-window-presenter.mjs';
import {packProfile,moduleClosure,distribution} from './distribution.mjs';
import {stageAuthoring} from './stage-window-authoring-proof.mjs';
import {checkNativeWindowPresenter} from './check-native-window-presenter.mjs';

// Registration is mandatory. Private packages below are isolation peers only.
const source=checkNativeWindowPresenter();
const out=path.join(root,'artifacts/native-window-presenter-package');fs.mkdirSync(out,{recursive:true});
const npmCli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(f=>f&&path.basename(f)==='npm-cli.js'&&fs.existsSync(f));
if(!npmCli)throw Error('Missing npm CLI.');
const npm=(args,cwd)=>execFileSync(process.execPath,[npmCli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:6*1024*1024,timeout:120000});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-native-window-')),consumer=path.join(temp,'consumer'),privateStage=path.join(temp,'presenter'),authoringStage=path.join(temp,'authoring');
let report;
try{
  for(const directory of [consumer,privateStage,authoringStage])fs.mkdirSync(directory);
  const core=packProfile('core'),renderer=packProfile('renderer'),files=moduleClosure(['packages/native-window-presenter/three.js']);
  if(files.some(f=>!f.startsWith('packages/native-window-presenter/')))throw Error('Private isolation presenter bundles another core/renderer.');
  const peerFiles=[...new Set([...files,...source.packageSupport])].sort();
  for(const file of peerFiles){const dest=path.join(privateStage,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
  fs.writeFileSync(path.join(privateStage,'package.json'),JSON.stringify({name:'@nautilus-private/native-window-presenter',version:'0.0.0',private:true,type:'module',exports:{'.':'./packages/native-window-presenter/three.js'},files:peerFiles}));
  const staged=stageAuthoring(authoringStage),pack=dir=>{const r=JSON.parse(npm(['pack','--offline','--ignore-scripts','--json','--pack-destination',out],dir))[0];return path.join(out,r.filename);};
  const presenter=pack(privateStage),authoring=pack(authoringStage);
  fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'native-window-installed-proof',private:true,type:'module'}));
  npm(['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',core.file,renderer.file,presenter,authoring],consumer);
  for(const f of ['package-proof.mjs','proof.mjs','lifecycle-proof.mjs'])fs.copyFileSync(path.join(root,'tests/fixtures/native-window-presenter',f),path.join(consumer,f));

  // Complete-world source conformance stays only in this disposable consumer.
  const upstream=JSON.parse(fs.readFileSync(path.join(root,'upstream.json'))),pin=upstream.farmyardGrenades,manifest=JSON.parse(fs.readFileSync(path.join(root,pin.root,'provenance.json')));
  if(manifest.commit!==source.sourceCommit)throw Error('Complete-world conformance source pin mismatch.');
  for(const file of manifest.files){
    const original=fs.readFileSync(path.join(root,pin.root,file.path));
    if(original.length!==file.bytes||sha(original)!==file.sha256||createHash('sha1').update('blob '+original.length+'\0').update(original).digest('hex')!==file.gitBlob)throw Error('Changed immutable conformance input: '+file.path);
    const dest=path.resolve(consumer,'farmyard-source',file.path),allowed=path.resolve(consumer,'farmyard-source');
    if(!dest.startsWith(allowed+path.sep))throw Error('Conformance input escapes its temporary root.');
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,original);
  }
  fs.copyFileSync(path.join(root,'tests/fixtures/farmyard-window-impacts/harness.mjs'),path.join(consumer,'host-harness.mjs'));
  const profiles=Object.fromEntries(['core','renderer'].map(profile=>{const d=distribution(profile);return [profile,{name:d.name,files:d.files,critical:d.files.filter(file=>source.runtime.some(r=>r.path===file)||source.packageSupport.includes(file)||file.startsWith('packages/windows-authoring/')||file==='packages/map-core/contract-manifest.js').map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(root,file)))}))}];}));
  const authoringDependencies=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/window-authoring/dependencies.json'))).sourceFacts.files;
  const expected={entry:source.entry,entryFile:source.entryFile,profiles,runtime:source.runtime,support:source.packageSupport,vendorRoot,peerFiles,peerHashes:peerFiles.map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(root,file)))})),comparisonFixtures:authoringDependencies.map(f=>f.target),sourceCommit:source.sourceCommit};
  fs.writeFileSync(path.join(consumer,'expected-installed.json'),JSON.stringify(expected));

  const guide=fs.readFileSync(path.join(root,'packages/native-window-presenter/README.md'),'utf8'),heading=/^## Installed authoring-preview example\s*$/m.exec(guide);
  if(!heading)throw Error('Installed authoring-preview example heading is absent.');
  const section=guide.slice(heading.index+heading[0].length).split(/^## /m)[0],snippet=/```js\r?\n([\s\S]*?)\r?\n```/.exec(section)?.[1];
  if(!snippet)throw Error('First executable installed authoring-preview JS block is absent.');
  const imports=[...snippet.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*(?:\(\s*)?['"]([^'"]+)['"]/g)].map(match=>match[1]??match[2]);
  if(!imports.length||imports.some(specifier=>!/^@nautilus-engine\/(?:core|renderer)(?:\/[^?#]+)?$/.test(specifier)&&specifier!=='node:assert/strict'))throw Error('Installed guide must use public core/renderer imports, without a source/private fallback.');
  fs.writeFileSync(path.join(consumer,'guide-example.mjs'),snippet);
  const proof=JSON.parse(execFileSync(process.execPath,['package-proof.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true,maxBuffer:4000000,timeout:120000}).trim());
  report={status:'pass',availability:'actual-declared-core-and-renderer',registered:true,actualPresenterEntry:source.entry,actualAuthoringEntry:'./windows/authoring',publicCore:core,publicRenderer:renderer,source,privatePresenter:{archive:presenter,sha256:sha(fs.readFileSync(presenter)),modules:files,purpose:'Separate physical presenter instance used only for opaque-preparation isolation.'},privateAuthoring:{archive:authoring,commit:staged.authoringCommit,dependencyCommit:staged.dependencyCommit,purpose:'Separate historical physical authoring/core instance used only for opaque-handle isolation; never the public authoring implementation.'},testOnlyConformanceFiles:manifest.files.length,proof,editorAdopted:false,gameAdopted:false};
}finally{
  const target=fs.realpathSync(temp),parent=fs.realpathSync(os.tmpdir());
  if(path.dirname(target)!==parent||!path.basename(target).startsWith('nautilus-native-window-'))throw Error('Unsafe temporary cleanup target.');
  fs.rmSync(target,{recursive:true,force:true});if(fs.existsSync(target))throw Error('Temporary consumer remains.');
}
report.cleanup='Temporary stages, source fixtures and installed consumer removed in finally. No server/browser/worker retained.';
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,availability:report.availability,proof:report.proof,cleanup:report.cleanup},null,2));
