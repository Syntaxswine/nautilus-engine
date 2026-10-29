import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {distribution,packProfile} from './distribution.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),guide='docs/components/bear-authoring.md',index='docs/components/index.md';
const source=fs.readFileSync(path.join(root,guide),'utf8');
const snippet=source.match(/<!-- installed-example:start -->\s*```js\n([\s\S]*?)\n```\s*<!-- installed-example:end -->/)?.[1];
assert.ok(snippet,'The public-import example must remain extractable and executable.');
const profiles=['core','renderer','assets','compatibility'];
for(const profile of profiles)for(const file of [guide,index])assert.ok(distribution(profile).files.includes(file),profile+' omits '+file);
const packed=packProfile('core'),temporaryRoot=fs.realpathSync(os.tmpdir());
const npmCli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&fs.existsSync(file)&&path.basename(file)==='npm-cli.js');
assert.ok(npmCli,'Use Node with npm to verify the installed guide.');
const consumer=fs.mkdtempSync(path.join(temporaryRoot,'nautilus-bear-guide-'));let report;
try {
  fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'bear-guide-consumer',private:true,type:'module'}));
  execFileSync(process.execPath,[npmCli,'install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',packed.file],{cwd:consumer,encoding:'utf8',windowsHide:true});
  const installed=path.join(consumer,'node_modules/@nautilus-engine/core');
  assert.match(fs.readFileSync(path.join(installed,'README.md'),'utf8'),/docs\/components\/index\.md/);
  assert.match(fs.readFileSync(path.join(installed,index),'utf8'),/people:bear/);
  assert.match(fs.readFileSync(path.join(installed,index),'utf8'),/bear-authoring\.md/);
  assert.equal(fs.readFileSync(path.join(installed,guide),'utf8'),source);
  // A guide may link fixed source evidence; relative local guide links must be
  // inside this installed package, not a sibling checkout or omitted fixture.
  const links=[];
  for(const file of [index,guide])for(const match of fs.readFileSync(path.join(installed,file),'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
    if(/^(?:https?:|#)/.test(match[1]))continue;
    const destination=path.resolve(installed,path.dirname(file),match[1].split('#')[0]);
    assert.ok(destination.startsWith(installed+path.sep)&&fs.existsSync(destination),'Missing installed guide link '+match[1]);links.push({file,target:match[1]});
  }
  fs.writeFileSync(path.join(consumer,'example.mjs'),snippet);
  const output=execFileSync(process.execPath,['example.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true});
  report={status:'documentation candidate; real bear provider/appearance adoption pending',profiles,publicEntry:'@nautilus-engine/core',
    package:packed,guide,guideSha256:createHash('sha256').update(source).digest('hex'),installedRelativeLinks:links,output:output.trim(),cleanup:'finally removes only the validated temporary consumer'};
}finally{
  const target=fs.realpathSync(consumer);
  if(path.dirname(target)!==temporaryRoot||!path.basename(target).startsWith('nautilus-bear-guide-'))throw Error('Refusing cleanup outside the owned temporary consumer.');
  fs.rmSync(target,{recursive:true,force:true});assert.equal(fs.existsSync(target),false);
}
report.temporaryConsumerRemoved=true;
const artifacts=path.join(root,'artifacts/editor-bear-handoff');fs.mkdirSync(artifacts,{recursive:true});
fs.writeFileSync(path.join(artifacts,'installed-guide-proof.json'),JSON.stringify(report,null,2));console.log(report.output);
