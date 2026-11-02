// Evidence collector, never a replacement for any required check or its exit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'docs/reviews/tile-stack/editor/gate-b');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const logs=Object.fromEntries(['check','tests','upstream','build'].map(name=>[name,fs.readFileSync(path.join(root,'artifacts/tile-stack-editor-b1',name+'.log'),'utf8')]));
const count=(text,name)=>Number(text.match(new RegExp('ℹ '+name+' (\\d+)'))?.[1]);
assert.equal(count(logs.tests,'tests'),944);assert.equal(count(logs.tests,'pass'),943);assert.equal(count(logs.tests,'fail'),1);assert.equal(count(logs.tests,'cancelled'),0);assert.equal(count(logs.tests,'skipped'),0);
const fenceMessage='Changed fixed source: apps/editor/smart-tile/authority.js';assert.ok(logs.check.includes(fenceMessage));assert.ok(logs.tests.includes(fenceMessage));
const failed='editor uses exact relayed UI and reviewed public runtime bytes without a private provider';
const failures=logs.tests.split(/\r?\n/).filter(line=>line.startsWith('✖ ')&&!line.startsWith('✖ failing tests:'));assert.equal(failures.length,2);assert.ok(failures.every(line=>line.includes(failed)));
const focused=logs.tests.split(/\r?\n/).filter(line=>line.startsWith('✔ B1 ')).map(line=>line.replace(/ \([0-9.]+ms\)$/,''));assert.equal(focused.length,11);
assert.equal(count(logs.upstream,'pass'),32);assert.equal(count(logs.upstream,'fail'),0);assert.match(logs.build,/519 module paths checked/);
const scope=JSON.parse(fs.readFileSync(path.join(out,'scope.json')));for(const row of scope.inputs)assert.equal(sha(fs.readFileSync(path.join(root,row.file))),row.sha256,'Stale source evidence: '+row.file);
const gates=[
  {command:'npm run check',exitCode:1,status:'failed-expected-unchanged-root-source-fence'},
  {command:'npm test',exitCode:1,status:'failed-expected-unchanged-root-source-fence',tests:944,passed:943,failed:1,focusedB1Passed:11},
  {command:'npm run test:upstream',exitCode:0,status:'pass',passed:32},
  {command:'npm run build',exitCode:0,status:'pass',modulePaths:519}
].map((row,i)=>({...row,log:'artifacts/tile-stack-editor-b1/'+['check','tests','upstream','build'][i]+'.log',logSha256:sha(logs[['check','tests','upstream','build'][i]])}));
const evidence={kind:'nautilus-editor-tile-stack-b1-validation',version:1,status:'local-candidate-requires-root-provenance-review',allRequiredGatesPassed:false,pushAllowed:false,
  base:scope.base,planner:scope.planner,gates,focusedCases:focused,
  expectedFailure:{message:fenceMessage,checker:'tools/check-smart-tile-editor-source.mjs',test:failed,allAuthorizedChangedHostPaths:scope.expectedGateFailure.paths,actualFirstFileBytes:3349,recordedFirstFileBytes:3054},
  proof:'Actual accepted private planTileStack -> one actual retained public consumer.prepare handle -> paired complete target -> one shared codec/authority/history/session. Test presentation is resource-only.',
  deferred:['Root strict provenance/fence update and combined green delivery','Native Artist/UI bindings','Actual browser source/built/installed workflow matrix','Physical/game providers','Custom authoring/library/overlays'],
  helpers:{background:[],ports:[],retained:[],method:'All finite tool gate sessions exited; no browser/server was created. Superseded scratch test lifetime was gracefully interrupted through its owning tool and both observed Node PIDs were absent afterwards.',superseded:{toolSession:45869,observedPids:[42560,53000],observedCreationLocal:'2026-11-02T00:36:55-05:00',exactCreationFiletimeRecorded:false,forceTerminationUsed:false,restartRecord:'artifacts/tile-stack-b1-superseded/restart.json',restart:'node --test tests/editor-tile-stack-b1.test.mjs',state:'Disposable in-memory test authorities only; restart creates declared fixtures, no user document or external pending work.'}}};
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(path.join(out,'headless-cases.txt'),focused.join('\n')+'\n');
fs.writeFileSync(path.join(out,'expected-source-fence.txt'),(logs.check.slice(logs.check.indexOf('AssertionError'))+'\n'+logs.tests.slice(logs.tests.indexOf('✖ failing tests:'))).replaceAll('\r\n','\n').replace(/[ \t]+$/gm,''));
console.log(JSON.stringify({status:evidence.status,allRequiredGatesPassed:false,pushAllowed:false,passed:943,failedExpected:1,focusedB1Passed:focused.length,upstreamPassed:32,builtModules:519}));
