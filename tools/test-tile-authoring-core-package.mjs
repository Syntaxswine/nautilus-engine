import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {packProfile,distribution,root} from './distribution.mjs';
import {checkTileAuthoringCoreSource} from './check-tile-authoring-core-source.mjs';
export function testTileAuthoringCorePackage(){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));assert.equal(pkg.exports?.['./tiles/authoring'],'./packages/tile-authoring-core/index.js','AUTHORING_REGISTRATION_REQUIRED: no overlay, patched tarball or source fallback.');const checked=checkTileAuthoringCoreSource(),normal=distribution('core');assert.equal(normal.exports['./tiles/authoring'],pkg.exports['./tiles/authoring']);
 const packed=packProfile('core'),scratch=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'nautilus-c1-authoring-')),records=[],output=path.join(root,'artifacts/tile-authoring-core-c1/package-proof');fs.mkdirSync(output,{recursive:true});let report;
 function run(executable,args,purpose){const start=new Date().toISOString(),child=spawnSync(executable,args,{cwd:scratch,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:24*1024*1024,env:{...process.env,NODE_TEST_CONTEXT:'',NODE_PATH:'',NODE_OPTIONS:''}});records.push({owner:'Coder, Nautilus Engine',purpose,project:'Nautilus Engine C1',pid:child.pid??null,executable:path.basename(executable),startedAt:start,endedAt:new Date().toISOString(),foreground:true,endCondition:'bounded command exit',stopMethod:'owning process handle',exitCode:child.status,signal:child.signal??null,ports:[]});if(child.error)throw child.error;assert.equal(child.status,0,(child.stdout??'')+(child.stderr??''));return child.stdout;}
 try{
 fs.writeFileSync(path.join(scratch,'package.json'),JSON.stringify({name:'nautilus-c1-external-proof',private:true,type:'module'}));const npmCli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(p=>p&&path.basename(p)==='npm-cli.js'&&fs.existsSync(p));assert.ok(npmCli,'Run through npm or a Node distribution with npm.');run(process.execPath,[npmCli,'install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',packed.file],'offline ordinary tarball install');
 for(const file of ['package-proof.mjs','c1-workflow.mjs'])fs.copyFileSync(path.join(root,'tests/fixtures/tile-authoring',file),path.join(scratch,file));const stdout=run(process.execPath,['package-proof.mjs'],'actual public installed workflow');const proof=JSON.parse(stdout.trim());const installed=path.join(scratch,'node_modules/@nautilus-engine/core'),manifest=JSON.parse(fs.readFileSync(path.join(installed,'package.json')));assert.equal(manifest.exports['./tiles/authoring'],pkg.exports['./tiles/authoring']);for(const f of normal.files.filter(x=>x.startsWith('packages/tile-authoring-core/'))){const actual=fs.readFileSync(path.join(installed,f)),source=fs.readFileSync(path.join(root,f));assert.ok(actual.equals(source),'Installed raw bytes changed: '+f);}
 report={schemaVersion:1,status:'actual-ordinary-installed-package-proof',packed,profileDelta:checked.profiles,proof,helpers:records};fs.writeFileSync(path.join(output,'proof.log'),stdout);return report;
 }finally{
 const resolved=fs.realpathSync(scratch),parent=fs.realpathSync(os.tmpdir());assert.ok(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('nautilus-c1-authoring-'));fs.rmSync(resolved,{recursive:true,force:true});const receipt={owner:'Coder, Nautilus Engine',foreground:records,temporaryInstallRemoved:!fs.existsSync(resolved),retainedHelpers:0,ports:[],noBackgroundServerBrowser:true};fs.writeFileSync(path.join(output,'cleanup.json'),JSON.stringify(receipt,null,2)+'\n');if(report){report.cleanup=receipt;fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');}
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(testTileAuthoringCorePackage()));
