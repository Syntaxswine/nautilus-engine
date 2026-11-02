import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..'),evidence=path.join(here,'evidence');
const read=file=>fs.readFileSync(path.join(evidence,file)),json=file=>JSON.parse(read(file));
const text=file=>{const bytes=read(file);return bytes[0]===255&&bytes[1]===254?bytes.subarray(2).toString('utf16le'):bytes.toString('utf8').replace(/^\uFEFF/,'');};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const tsc=process.argv.find(arg=>arg.startsWith('--tsc='))?.slice(6);assert.ok(tsc,'Pass an existing read-only --tsc= compiler');
const compiler=execFileSync(process.execPath,[tsc,'--version'],{encoding:'utf8',windowsHide:true}).trim();
const flags=['--strict','--noEmit','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2023','--lib','ES2023,DOM'];
execFileSync(process.execPath,[tsc,...flags,path.join(here,'tests/types.mts')],{cwd:root,windowsHide:true});
const negativeControls=[...fs.readFileSync(path.join(here,'tests/types.mts'),'utf8').matchAll(/@ts-expect-error/g)].length;assert.equal(negativeControls,8);
fs.writeFileSync(path.join(evidence,'types.json'),JSON.stringify({status:'passed',compiler,flags,negativeControls,test:'tests/types.mts'},null,2)+'\n');
const runs=[];
for(const [file,total,scope] of [['node.tap',22,'Actual Root controller hub with explicit protocol workbench'],['repository-tests.log',1162,'Unchanged 938e normal worktree: npm test -- --test-concurrency=4'],['upstream.log',32,'npm run test:upstream']]){
 const counts={},data=text(file);
 for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const match=data.match(new RegExp('^(?:#|ℹ) '+key+' (\\d+)','mu'));assert.ok(match,file+' '+key);counts[key]=Number(match[1]);}
 assert.equal(counts.tests,total);assert.equal(counts.pass,total);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(counts[key],0);runs.push({file,scope,...counts});
}
const repository=json('repository-runs.json');assert.equal(repository.runs.length,4);for(const run of repository.runs){assert.equal(run.exitCode,0);assert.equal(run.error,null);}
assert.ok(text('repository-check.log').includes('Verified optional tile authoring Core:'));
assert.ok(text('build.log').includes('563 module paths checked'));
const browser=json('browser.json');assert.equal(browser.status,'passed');assert.equal(browser.checks.length,16);for(const check of browser.checks)assert.equal(check.status,'pass');assert.equal(browser.captures.length,3);
for(const key of ['host','native','meter','wal'])assert.equal(browser[key],false);
assert.equal(browser.cleanup.portReleased,true);assert.equal(browser.cleanup.browserClosed,true);assert.equal(browser.cleanup.httpClosed,true);
const helpers=text('helper-history.jsonl').trim().split(/\r?\n/).map(JSON.parse),receipts=text('helper-cleanup-history.jsonl').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(helpers.length,receipts.length);
for(const helper of helpers){
 const receipt=receipts.find(row=>row.browser.pid===helper.browser.pid&&row.browser.creationFiletime===helper.browser.creationFiletime);
 assert.ok(receipt,'Receipt for exact browser process lifetime');assert.equal(receipt.process.pid,helper.process.pid);assert.equal(receipt.process.creationFiletime,helper.process.creationFiletime);assert.equal(receipt.port,helper.port);assert.equal(receipt.browserClosed,true);assert.equal(receipt.httpClosed,true);assert.ok(Date.parse(receipt.stoppedAt)<=Date.parse(helper.expiresAt));
 await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(helper.port,'127.0.0.1',()=>probe.close(resolve));});
}
const pids=[...new Set(helpers.flatMap(h=>[h.process.pid,h.browser.pid]))];
const processQuery="$items=@(Get-Process -Id "+pids.join(',')+" -ErrorAction SilentlyContinue); @($items | ForEach-Object { [pscustomobject]@{pid=$_.Id;creationFiletime=$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()} }) | ConvertTo-Json -Compress";
const processOutput=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',processQuery],{encoding:'utf8',windowsHide:true}).trim();
const live=processOutput?JSON.parse(processOutput):[];
for(const helper of helpers)for(const process of [helper.process,helper.browser])assert.ok(![live].flat().some(row=>row.pid===process.pid&&row.creationFiletime===process.creationFiletime),'Task-owned process lifetime exited');
const sources=['tools/art-review-browser.mjs','tools/module-references.mjs','package.json'];
fs.writeFileSync(path.join(evidence,'helper-lifecycle.json'),JSON.stringify({owner:repository.owner,retainedHelpers:[],browserLifetimes:helpers.length,exactLifetimeReceipts:receipts.length,allOwnedProcessesExited:true,allRecordedPortsReleased:true,stopMethod:'Supported Playwright browser.close and HTTP close in finally; actual automatic 180000 ms expiry installed for each run',restart:'Deliberate tools/browser-review.mjs invocation using the committed source and its frozen inputs; stateless fixture, no pending in-memory work',sourceManifest:'../source.json',additionalSourceHashes:sources.map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(root,file)))}))},null,2)+'\n');
const logs=[];for(const entry of fs.readdirSync(evidence)){if(['checks.json','CHECKS.md','provenance.json'].includes(entry))continue;const file=path.join(evidence,entry);if(fs.statSync(file).isFile()){const bytes=fs.readFileSync(file);logs.push({file:entry,bytes:bytes.length,sha256:sha(bytes)});}}
logs.sort((a,b)=>a.file.localeCompare(b.file));
const summary={status:'passed',recordedAt:new Date().toISOString(),node:process.version,compiler,negativeTypeControls:8,nodeGroups:22,domGroups:16,viewports:3,runs,repositoryCheck:'passed',normalBuildModules:563,
 reviewedRoot:'648cad33c3e0e1f36b4313b1492b1a750492ece4',rootPanelSha256:'81e0d2ad2aaa52c01b9d1d3ed172b5bef951b4f8e7440c8218e591f787425db4',
 rootFoundationProof:'Architect separately reported 1174 tests, 32 upstream and build602 on exact Root648. This worktree retains unchanged 938e/471 normal runtime: 1162 tests, 32 upstream and build563.',
 visualReview:{status:'passed',captures:['desktop.png','tablet.png','phone.png'],observed:'Two desktop panels; stacked tablet/phone panels; readable fields/actions, no horizontal overflow or clipped controls.'},
 historyAndDraft:'Same borrowed protocol workbench; actual C1/C2 controls and Root algorithm',
 proof:{actualRootController:true,actualC1AndC2DOM:true,workbenchSessionReadinessHistory:'Protocol fixtures',hostApply:false,native:false,editingMeter:false,wal:false},
 historicalFailures:[{file:'browser-initial-failed.json',resolution:'Test read textContent of closed technical details instead of invisible innerText.'},{file:'browser-fixture-failed.json',resolution:'Protocol draft fixture updates its current message before emitting; no Host readiness claim.'}],
 helpers:{createdLifetimes:helpers.length,allStopped:true,retained:[]},noPush:true,logs};
fs.writeFileSync(path.join(evidence,'checks.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(evidence,'CHECKS.md'),[
 '# Fixed shared-controller candidate checks',
 '22 Node control groups pass through the actual byte-exact Root648 controller. They cover one controller/subscription, shared draft/history, full overlay comparison, pending fanout, independent detach, late borrowed results, callback reentry, post-callback predicates, caught rebind/restoration and last-close cleanup. Retired callbacks cannot poison another attachment. An action-observed rebind immediately clears both views. Resource UI gating creates no command or controller and cannot clear actual action debt.',
 '16 real Edge DOM groups pass with both actual panels and the public C1 rectangle constructor. The two surfaces use the same controller, subscription, draft and history. Cross-panel pending, unchanged default C1 and mounted caught-rebind invalidation pass. Desktop1440, tablet900 and phone390 layouts pass overflow checks; all three captures were visually reviewed.',
 'The new Load selected artwork control is present and disabled when unbound. Protocol load callbacks cover one load with the actual binding-issued read, zero IDs/builds/commands, duplicate invocation refusal, returned ready flags ignored, rejection, caught rebind, control disposal and late settlement preserving actual action debt. No resource control adds another subscription or controller. Actual d8/native RESOURCE composition is still unbound.',
 'Strict TypeScript '+compiler+' passes eight negative controls. Repository check, all1,162 tests,32 upstream tests and normal build563 module paths pass on this unchanged 938e/471 normal worktree. Root648\'s separately reviewed1174/build602 foundation is not substituted for this worktree\'s evidence.',
 'The proposed semantic mount patch applies cleanly in isolated scratch against the exact Root648 Git object and yields the recorded continuation. Original vendor bytes/notices, old938e/a4 files and receipts, normal exports/build/navigation, schemas and consumer pins are unchanged. Indexed provenance is recorded separately.',
 'The DOM workbench/session/readiness/history, resource load callbacks and Node Host services are explicitly protocol fixtures. This proves no actual Host Apply, native rendering, browser-wide editing meter, WAL, consumer adoption or deployment. Pending preparation cancellation stays with the actual separately bound SAME-session helper; it is never draft discard, review-token cancel or an eighth service verb.',
 'All '+helpers.length+' isolated browser lifetimes, including the two early fixture/assertion failures, have matching exact-identity cleanup receipts. Their processes exited and ports were verified released. Source, restart references, original inputs and captures are preserved; no preview/helper is retained. No push.'
].join('\n\n')+'\n');
console.log(JSON.stringify({status:'passed',nodeGroups:22,domGroups:16,viewports:3,negativeTypeControls:8,repositoryTests:1162,upstreamTests:32,normalBuildModules:563,helpersStopped:helpers.length,noPush:true}));
