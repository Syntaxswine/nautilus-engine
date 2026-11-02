// Seal local gate results and task scope. No network, mutation of donors, or Git writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/').replace(/\/$/,''),'-C',root,...a],{encoding:'utf8',windowsHide:true}).trim();
const review='docs/reviews/actor-height-intake/',baseline='ddfd43cf4b156eeb82b5c27772fe977ec10b0633';
const branch=git('branch','--show-current');assert.equal(branch,'codex/actor-height-binding-intake');
const candidates=new Set([...git('diff','--name-only',baseline).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean));
for(const p of candidates)assert.ok(p.startsWith(review)||p.startsWith('packages/assets/bindings/'),'Out-of-scope change: '+p);
const preservedBranches={'codex/bathroom-art':'4e1b7f0f04868770ca3226280fd1679ca9c2ccf4','codex/fort-era-variants':'65c06735396e14b8774ae1e7d5ad61969692963f','codex/frontier-stockade-art':'6d9dfeca7e47a4bded6497472f46f49f8ce14a5b'};
for(const [name,sha]of Object.entries(preservedBranches))assert.equal(git('rev-parse',name),sha);
function log(name){const bytes=fs.readFileSync(path.join(root,'artifacts/actor-height-intake',name));return {sha256:hash(bytes),text:bytes[0]===0xff&&bytes[1]===0xfe?bytes.subarray(2).toString('utf16le'):bytes.toString('utf8')};}
const gates=[];
for(const [command,file,pattern,tests]of [
 ['node --test docs/reviews/actor-height-intake/verify.test.mjs','focused-tests.log',/fail\s+0/,5],
 ['npm run check','check.log',/Verified 603 pinned source files/,null],
 ['npm test','test.log',/fail\s+0/,254],
 ['npm run test:upstream','upstream.log',/fail\s+0/,32],
 ['npm run build','build.log',/Built Nautilus Engine 0\.7\.0/,null]
]){const r=log(file);assert.match(r.text,pattern);if(tests)assert.match(r.text,new RegExp('tests\\s+'+tests+'\\b'));gates.push({command,status:'passed',tests,localLog:'artifacts/actor-height-intake/'+file,logSha256:r.sha256});}
const files=['README.md','inventory.py','measure.mjs','bindings.mjs','verify.test.mjs','seal.mjs','sources.json','measurements.json'].map(p=>review+p).concat(['packages/assets/bindings/actor-intake-v1.json','packages/assets/bindings/tall-building-intake-v1.json']);
const evidence=files.map(p=>{const bytes=fs.readFileSync(path.join(root,p));return {path:p,bytes:bytes.length,sha256:hash(bytes)};});
const result={schemaVersion:1,reviewedAtUtc:new Date().toISOString(),branch,baselineCommit:baseline,status:'local-checks-passed-intake-only',
 gates,bindingsCheck:'node docs/reviews/actor-height-intake/bindings.mjs passed',
 sourceProbe:'Hash-verified headless native factories, Misha pose/throw markers and tall-building lifecycle; see measurements.json',
 sourceImagesReviewed:['administration:docs/art/exposition-administration/previews/front-isometric.jpg','administration:docs/art/exposition-administration/previews/structural-cutaway.jpg','farmyard:sites/tactical-animal/dist/aft/assets/characters/lowpoly-proof/donkey-worker-model-paint-v1.png'],
 browserReview:'No browser was launched; runtime/editor interactions unchanged. Existing source pictures inspected; WebGL/device acceptance remains pending.',
 scope:{donorRuntimeBytesImported:0,currentVendorChanges:0,publicExportChanges:0,rootBuildChanges:0,versionChanges:0,consumerPinChanges:0,mainMerged:false},
 preservedBranches,helpers:{retained:0,previewServersStarted:0,browserSessionsStarted:0,foregroundAuditAndGateCommands:'completed; no background helper or open port created'},
 evidence,evidenceBytes:evidence.reduce((n,f)=>n+f.bytes,0),selfHashExcluded:true,
 pending:['One optional loader and shared Three/lifecycle binding','Body-only rock presentation adapter aligned to the existing host-committed release','Misha prone support and ordinary-door clearance','Tall query/traversal/region semantics and separate fifteen-story connected acceptance','Comparable WebGL visuals and device cost','Earlier bathroom/fort runtime intake remains separate']};
fs.writeFileSync(path.join(root,review,'acceptance.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({branch,gates:gates.map(g=>({command:g.command,status:g.status,tests:g.tests})),evidenceFiles:evidence.length,evidenceBytes:result.evidenceBytes,retainedHelpers:0},null,2));
