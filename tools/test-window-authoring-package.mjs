import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {distribution,moduleClosure,packProfile,root} from './distribution.mjs';
import {schemaDocuments,engineManifest} from '../packages/map-core/contract-manifest.js';
import {WINDOW_HOST_SERVICES} from '../packages/windows-core/index.js';
import {serializeWindowAuthoring} from '../packages/windows-authoring/index.js';
import {windowAuthoringFixture} from './fixtures/window-authoring.mjs';
const request=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/window-authoring/registration-request.json'))),base=distribution('core'),entries=request.entries,support=request.packageSupport;
const declared=Object.entries(entries).every(([key,file])=>base.exports[key]===file)&&support.every(file=>base.files.includes(file))&&request.schemas.every(s=>schemaDocuments().some(v=>v.id===s.id&&v.version===s.version&&v.uri===s.uri)&&engineManifest().schemas.some(v=>v.id===s.id&&v.versions.includes(s.version)));
if(!declared&&!process.argv.includes('--candidate'))throw Error('AUTHORING_REGISTRATION_PENDING: actual root export/schema/support registration is absent. Only explicit --candidate enables the private partial-availability overlay.');
for(const service of WINDOW_HOST_SERVICES)if(engineManifest().capabilities.some(c=>c.id===service.id))throw Error('Engine must not advertise bound host services.');
const closure=moduleClosure(Object.values(entries)),files=[...new Set([...base.files,...closure,...support])].sort();
if(files.some(file=>file.startsWith('apps/')||file.startsWith('vendor/farmyard-grenades/')))throw Error('Authoring runtime package must exclude editor and raw donor game.');
const output=path.join(root,'artifacts/window-authoring');fs.mkdirSync(output,{recursive:true});const scratch=fs.mkdtempSync(path.join(output,'installed-')),stage=path.join(scratch,'stage'),consumer=path.join(scratch,'consumer');fs.mkdirSync(stage);fs.mkdirSync(consumer);
function npm(args,cwd){const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));if(!cli)throw Error('Use a Node installation containing npm.');return execFileSync(process.execPath,[cli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:8_000_000,timeout:120000});}
let result;
try{
  const actual=packProfile('core'),candidateName='@nautilus-engine/window-authoring-candidate';
  for(const file of files){const target=path.join(stage,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
  fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:candidateName,version:'0.0.0-window-authoring-candidate',private:true,type:'module',exports:{...base.exports,...entries},files},null,2)+'\n');
  const packed=JSON.parse(npm(['pack','--offline','--ignore-scripts','--json','--pack-destination',output],stage))[0],archive=path.join(output,packed.filename);
  fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'offline-window-authoring-proof',private:true,type:'module'}));npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',actual.file,archive],consumer);
  fs.copyFileSync(path.join(root,'tests/fixtures/window-authoring/package-proof.mjs'),path.join(consumer,'package-proof.mjs'));
  fs.writeFileSync(path.join(consumer,'authored-fixtures.json'),JSON.stringify({native:serializeWindowAuthoring(windowAuthoringFixture()),tall:serializeWindowAuthoring(windowAuthoringFixture({tall:true}))}));
  const name=declared?actual.name:candidateName,peer=declared?candidateName:actual.name,guide=fs.readFileSync(path.join(root,'docs/window-authoring.md'),'utf8'),snippet=/```js\r?\n([\s\S]*?)\r?\n```/.exec(guide)?.[1];if(!snippet)throw Error('Minimal guide example is absent.');
  fs.writeFileSync(path.join(consumer,'guide-example.mjs'),snippet.replaceAll('@nautilus-engine/core',name)+'\nexport {document,reopened,projection,card};\n');
  const proof=JSON.parse(execFileSync(process.execPath,['package-proof.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:1_000_000,env:{...process.env,NAUTILUS_AUTHORING_PACKAGE:name,NAUTILUS_AUTHORING_PEER:peer,NAUTILUS_AUTHORING_DECLARED:String(declared)}}).trim());
  const dependencyReport=JSON.parse(execFileSync(process.execPath,['--experimental-vm-modules','--disable-warning=ExperimentalWarning','tests/helpers/headless-closure.mjs','--entry','packages/windows-authoring/index.js'],{cwd:root,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:2_000_000}));
  const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  fs.writeFileSync(path.join(output,'headless-closure.json'),JSON.stringify(dependencyReport,null,2)+'\n');
  result={status:'pass',availability:declared?'actual-declared-core':'private-candidate-overlay',productionAvailability:declared,actualDeclaredAuthoringEntry:declared,rootRegistrationPending:!declared,entries,schemas:request.schemas,packageSupport:support,actualCore:{file:actual.file,sha256:hash(actual.file)},privateOverlay:{file:archive,sha256:hash(archive),purpose:'Candidate authoring entry when unregistered; second physical kernel instance when declared'},headless:{...dependencyReport.combined,violations:dependencyReport.violations},runtimeClosure:closure.map(file=>({file,sha256:hash(path.join(root,file))})),proof};
}finally{
  const resolved=fs.realpathSync(scratch),allowed=fs.realpathSync(output);if(path.dirname(resolved)!==allowed||!path.basename(resolved).startsWith('installed-'))throw Error('Refusing unsafe installed-proof cleanup.');fs.rmSync(resolved,{recursive:true,force:true});if(fs.existsSync(resolved))throw Error('Temporary consumer/stage remains.');
}
result.cleanup='Temporary stage and offline consumer removed in finally; no browser, server, watcher or retained helper.';fs.writeFileSync(path.join(output,'installed-report.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,availability:result.availability,productionAvailability:result.productionAvailability,actualDeclaredAuthoringEntry:result.actualDeclaredAuthoringEntry,headless:result.headless,proof:result.proof,cleanup:result.cleanup},null,2));
