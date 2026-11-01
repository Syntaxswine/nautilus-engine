import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,distribution,packProfile} from './distribution.mjs';
import {checkTileVisualsSource,TILE_ART_ACCEPTED_SOURCE} from './check-tile-visuals-source.mjs';

// No candidate/private fallback: absent actual registration fails before packing.
const source=checkTileVisualsSource(),output=path.join(root,'artifacts/tile-visuals');fs.mkdirSync(output,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));
if(!cli)throw Error('Use a Node installation containing npm.');
const npm=(args,cwd)=>execFileSync(process.execPath,[cli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,timeout:120000});
const git=file=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show',TILE_ART_ACCEPTED_SOURCE+':'+file],{windowsHide:true,maxBuffer:24*1024*1024});
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-tile-visuals-'));let report;
try{
  const core=packProfile('core'),renderer=packProfile('renderer');
  fs.writeFileSync(path.join(scratch,'package.json'),JSON.stringify({name:'actual-tile-surfaces-installed-proof',private:true,type:'module'}));
  npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',core.file,renderer.file],scratch);
  const expected={source,packages:Object.fromEntries(['core','renderer'].map(profile=>{
    const d=distribution(profile),critical=new Set([...source.runtime.map(f=>f.path),...source.coreFiles.map(f=>f.path),...source.packageSupport,source.atlas.path,source.threeNotice.path,'NOTICE.md']);
    return [profile,{name:d.name,files:d.files,critical:d.files.filter(file=>critical.has(file)).map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(root,file)))}))}];
  }))};
  fs.writeFileSync(path.join(scratch,'expected-installed.json'),JSON.stringify(expected));
  for(const name of ['boundary-material-proof.mjs','input-grade-proof.mjs','lifecycle-proof.mjs'])fs.writeFileSync(path.join(scratch,name),git('tests/fixtures/tile-visuals/'+name));
  fs.copyFileSync(path.join(root,'tests/fixtures/tile-visuals/package-proof.mjs'),path.join(scratch,'package-proof.mjs'));

  // Keep every accepted assertion. Only the five module specifiers and fixture
  // location change so the20+10 tests exercise actual physical public packages.
  const imports=[['../packages/tiles-core/index.js','@nautilus-engine/core/tiles'],['../packages/render-effects/three.js','@nautilus-engine/renderer/render-effects/three'],['../packages/tile-visuals/prepare.js','@nautilus-engine/core/tiles/art'],['../packages/tile-visuals/three.js','@nautilus-engine/renderer/tiles/art/three'],['../packages/tile-visuals/example.js','@nautilus-engine/core/tiles/art/example'],['./fixtures/tile-visuals/','./']];
  const stagedTests=[];
  for(const [file,name,count]of [['tests/tile-visuals.test.mjs','installed-provider.test.mjs',20],['tests/tile-visuals-lifecycle.test.mjs','installed-lifecycle.test.mjs',10]]){
    const original=git(file);let code=original.toString('utf8');for(const [from,to]of imports)code=code.replaceAll(from,to);
    assert.equal(code.includes('../packages/'),false,'Unmapped source import in '+file);
    fs.writeFileSync(path.join(scratch,name),code);stagedTests.push({source:file,installed:name,tests:count,originalSha256:sha(original),installedSha256:sha(Buffer.from(code))});
  }
  const childEnv={...process.env};delete childEnv.NODE_TEST_CONTEXT;
  const suites=[];
  for(const test of stagedTests){
    const log=execFileSync(process.execPath,['--test','--test-reporter=tap',test.installed],{cwd:scratch,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:8*1024*1024,env:childEnv});
    const counters=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key=>{const match=new RegExp('^# '+key+' (\\d+)\\s*$','m').exec(log);if(!match)throw Error('Missing complete positive '+key+' summary for '+test.source);return [key,Number(match[1])];}));
    assert.equal(counters.tests,test.tests);assert.equal(counters.pass,test.tests);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(counters[key],0);
    fs.writeFileSync(path.join(output,test.installed+'.tap'),log);suites.push({...test,...counters});
  }

  const guide=fs.readFileSync(path.join(root,'packages/tile-visuals/README.md'),'utf8'),heading=/^## Installed surface example\s*$/m.exec(guide);
  if(!heading)throw Error('Installed surface example heading is absent.');
  const section=guide.slice(heading.index+heading[0].length).split(/^## /m)[0],snippet=/```js\r?\n([\s\S]*?)\r?\n```/.exec(section)?.[1];
  if(!snippet)throw Error('First executable public-import surface example is absent.');
  const specifiers=[...snippet.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*(?:\(\s*)?['"]([^'"]+)['"]/g)].map(match=>match[1]??match[2]);
  if(!specifiers.length||specifiers.some(specifier=>!/^@nautilus-engine\/(?:core|renderer)(?:\/[^?#]+)?$/.test(specifier)&&specifier!=='node:assert/strict'))throw Error('Guide example must use actual public core/renderer imports.');
  fs.writeFileSync(path.join(scratch,'guide-example.mjs'),snippet);
  const proof=JSON.parse(execFileSync(process.execPath,['package-proof.mjs'],{cwd:scratch,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:6*1024*1024,env:childEnv}).trim());
  report={status:'pass',availability:'actual-declared-core-and-renderer',registered:true,source,core,renderer,suites,proof,privateProvider:false,scope:'Native flat-surface presentation; editor, body/support/query/navigation/fire/water and game adoption remain unbound.'};
}finally{
  const actual=fs.realpathSync(scratch),temp=fs.realpathSync(os.tmpdir());
  if(path.dirname(actual)!==temp||!path.basename(actual).startsWith('nautilus-tile-visuals-'))throw Error('Unexpected disposable consumer; cleanup refused.');
  fs.rmSync(actual,{recursive:true,force:true});if(fs.existsSync(actual))throw Error('Disposable installed consumer remains.');
}
report.cleanup='Offline consumer and copied proof inputs removed in finally; no server, browser, watcher or retained helper.';
fs.writeFileSync(path.join(output,'installed-package-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,availability:report.availability,suites:report.suites,proof:report.proof,cleanup:report.cleanup},null,2));
