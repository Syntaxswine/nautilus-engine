import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import net from 'node:net';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../..');
const base='db656a6d717ad36aabe32955b47a09b8badb116e',pin='fb0628605c274550ff8abad50b151843f08747d1';
const vendor='vendor/tinderbox-train-controls/'+pin,sha=b=>createHash('sha256').update(b).digest('hex');
const json=file=>JSON.parse(fs.readFileSync(path.join(root,file)));
const git=args=>execFileSync('git',['-c','core.longpaths=true',...args],{cwd:root,windowsHide:true,maxBuffer:8e6});
const protectedFiles=['packages/train-core/index.js','packages/train-core/index.d.ts','packages/train-core/contract.js','packages/train-core/connector-fixture.js','docs/drivable-trains.md','examples/train-yard-host.js','packages/train-ui/public.js','packages/train-ui/public.d.ts'];
const inputs=protectedFiles.map(file=>{const bytes=git(['show',base+':'+file]);assert.ok(bytes.equals(fs.readFileSync(path.join(root,file))),file+' changed outside UI scope');return {commit:base,path:file,bytes:bytes.length,sha256:sha(bytes)};});

const source=json(vendor+'/source.json');assert.equal(source.commit,pin);assert.equal(source.files.length,27);
for(const entry of source.files){const bytes=fs.readFileSync(path.join(root,vendor,entry.path));assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256,entry.path);assert.equal(entry.adaptations,'None; exact Git object bytes');}
const typography=json(vendor+'/assets/art/ui/typography/manifest.json');
for(const entry of typography.files){const bytes=fs.readFileSync(path.join(root,vendor,entry.installedPath));assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256);}
for(const notice of source.notices)assert.ok(fs.readFileSync(path.join(root,vendor,notice),'utf8').includes('SIL OPEN FONT LICENSE'));
// The byte-preserved upstream OFL texts each contain a trailing blank on line21.
// Check authored files strictly; original notice hashes remain the authority.
git(['diff',base,'--check','--','packages/train-ui/']);
const noticeWhitespace=source.notices.map(file=>({path:vendor+'/'+file,line:21,sha256:source.files.find(f=>f.path===file).sha256}));
for(const notice of noticeWhitespace)assert.ok(fs.readFileSync(path.join(root,notice.path),'utf8').split(/\r?\n/)[20].endsWith(' '));
const urls=[...fs.readFileSync(path.join(here,'compact.css'),'utf8').matchAll(/url\(['"]?([^)'"\n]+)['"]?\)/g)].map(m=>path.resolve(here,m[1]));
assert.equal(urls.length,3);assert.deepEqual(urls.map(p=>path.relative(root,p).replaceAll('\\','/')).sort(),source.runtimeResources.map(p=>vendor+'/'+p).sort());assert.ok(urls.every(p=>fs.existsSync(p)));
const css=fs.readFileSync(path.join(here,'style.css'),'utf8');assert.ok(css.startsWith('@import url("./compact.css");'));
const api=await import(pathToFileURL(path.join(here,'public.js')).href);assert.equal(typeof api.mountTrainControls,'function');

const report=json('packages/train-ui/evidence/browser.json');assert.equal(report.status,'passed');assert.equal(report.checks.length,80);assert.equal(report.captures.length,19);assert.deepEqual(report.errors,[]);
assert.equal(report.compact.sourcePin,pin);assert.equal(report.compact.baseCommit,base);assert.equal(report.compact.physicalHandset,false);assert.equal(report.nativeArtAcceptance,false);assert.equal(report.reverse.automaticAcceptedShiftOnce,true);assert.equal(report.reverse.rawCoreRefusalPreserved,true);assert.equal(report.reverse.baseCommit,base);
assert.deepEqual(report.compactResources.map(r=>r.path).sort(),source.runtimeResources.map(p=>vendor+'/'+p).sort());
for(const resource of report.compactResources)assert.equal(resource.bytes,fs.statSync(path.join(root,resource.path)).size);
const nodeOutput=execFileSync(process.execPath,['--test','--test-reporter=tap',path.join(here,'tests/feedback.test.mjs'),path.join(here,'tests/compact.test.mjs'),path.join(here,'tests/reverse.test.mjs')],{cwd:root,windowsHide:true,encoding:'utf8',timeout:60000});assert.match(nodeOutput,/# tests 27\b/);assert.match(nodeOutput,/# fail 0\b/);
const tsc=process.argv.find(a=>a.startsWith('--tsc='))?.slice(6);assert.ok(tsc,'Use the existing read-only TypeScript compiler');
const version=execFileSync(process.execPath,[tsc,'--version'],{windowsHide:true,encoding:'utf8'}).trim();
execFileSync(process.execPath,[tsc,'--strict','--noEmit','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2023','--lib','ES2023,DOM',path.join(here,'tests/types.ts')],{cwd:root,windowsHide:true,timeout:60000});
assert.equal((fs.readFileSync(path.join(here,'tests/types.ts'),'utf8').match(/@ts-expect-error/g)||[]).length,8);

const histories=file=>fs.readFileSync(path.join(here,'evidence',file),'utf8').trim().split(/\r?\n/).map(JSON.parse);
const helpers=histories('helper-history.jsonl'),receipts=histories('helper-cleanup-history.jsonl');
for(const helper of helpers){const receipt=receipts.find(r=>r.browser.pid===helper.browser.pid&&r.browser.creationFiletime===helper.browser.creationFiletime);assert.ok(receipt);assert.equal(receipt.process.pid,helper.process.pid);assert.equal(receipt.process.creationFiletime,helper.process.creationFiletime);assert.equal(receipt.browserClosed,true);assert.equal(receipt.httpClosed,true);assert.ok(Date.parse(receipt.stoppedAt)<Date.parse(helper.expiresAt));await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(helper.port,'127.0.0.1',()=>probe.close(resolve));});}
const pids=[...new Set(helpers.flatMap(h=>[h.process.pid,h.browser.pid]))];
const query="$ErrorActionPreference='Stop';$identityErrors=@();$items=@(Get-Process -Id "+pids.join(',')+" -ErrorAction SilentlyContinue -ErrorVariable identityErrors);foreach($err in $identityErrors){if($err.FullyQualifiedErrorId -notlike 'NoProcessFoundForGivenId*'){throw $err}};ConvertTo-Json -InputObject @($items|ForEach-Object{[pscustomobject]@{pid=$_.Id;creationFiletime=$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}}) -Compress";
const live=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',query],{windowsHide:true,encoding:'utf8'}));
for(const helper of helpers)for(const owned of[helper.process,helper.browser])assert.ok(!live.some(p=>p.pid===owned.pid&&p.creationFiletime===owned.creationFiletime));

const changed=[...new Set([git(['diff',base,'--name-only']),git(['ls-files','--others','--exclude-standard'])].flatMap(b=>b.toString().trim().split(/\r?\n/).filter(Boolean)))];
assert.ok(changed.every(file=>(file.startsWith('packages/train-ui/')&&!protectedFiles.includes(file))),'Changes escaped the bounded scope');
const checks={status:'passed',baseCommit:base,connectorContract:'nautilus-drivable-trains v1 / bounded-rail-driver-v1',sourcePin:pin,browserGroups:80,captures:19,nodeTests:27,types:{version,negativeControls:8},importWithoutDOM:true,
  compactProof:{authority:'real retained Core/yard host with explicit ticks; selected protocol edge cases',sourceFixture:'FIXTURE_ONLY',nativeArtAcceptance:false,physicalHandset:false,headlessAudio:'graph/lifecycle verified; speakers muted'},
  runtimeResources:{files:report.compactResources,bytes:report.compactResources.reduce((n,r)=>n+r.bytes,0),classicFetches:0},
  whitespace:{authored:'strict check passed',upstreamNotices:'original byte hashes verified; trailing blanks preserved',noticeWhitespace},
  helpers:{recordedBrowserLifetimes:helpers.length,exactLifetimesExited:true,portsReleased:true,retained:[]},
  fullProjectGates:{status:'DELEGATED_TO_ARCHITECT',reason:'Bounded UI tranche; Architect owns real rendered yard, root registration, combined gates and main merge'},sourceInputs:inputs};
fs.writeFileSync(path.join(here,'evidence/checks.json'),JSON.stringify(checks,null,2)+'\n');
const files=[];
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),relative=path.relative(here,file).replaceAll('\\','/');if(entry.isDirectory())visit(file);else if(relative!=='source.json'){const bytes=fs.readFileSync(file);files.push({path:relative,bytes:bytes.length,sha256:sha(bytes)});}}}
visit(here);files.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync(path.join(here,'source.json'),JSON.stringify({kind:'train-ui-steam-reverse-qol',baseCommit:base,sourcePin:pin,vendorManifest:{path:vendor+'/source.json',sha256:sha(fs.readFileSync(path.join(root,vendor,'source.json')))},publicEntry:'packages/train-ui/public.js (unchanged)',owns:'packages/train-ui except public facade; donor closure unchanged',liveIntegration:'Architect owns real rendered two-circuit acceptance and final delivery',sourceInputs:inputs,files},null,2)+'\n');
console.log(JSON.stringify({status:'passed',browserGroups:80,nodeTests:27,negativeTypes:8,importedFiles:source.files.length,runtimeResourceBytes:checks.runtimeResources.bytes,helpersClosed:helpers.length,files:files.length,fullGates:'Architect combined result'}));
