// Draft for tools/verify-tile-visual-browser-parity.mjs after Root registration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {root} from './distribution.mjs';
import {TILE_VISUAL_RUNTIME,TILE_VISUAL_SUPPORT,TILE_VISUAL_EXAMPLES,TILE_VISUAL_ATLAS,TILE_VISUAL_CAPTURES,TILE_VISUAL_CHECKS,tileVisualReviewInputs,tileVisualRegularFile,tileVisualSha,tileVisualJSONHash,tileVisualPlayerHTML,tileVisualInstalledPolicy,tileVisualInstalledRequestAllowed,assertTileVisualSnapshot} from './tile-visual-review-inputs.mjs';

const digest=/^[a-f0-9]{64}$/,json=file=>JSON.parse(tileVisualRegularFile(root,file));
function when(value){assert.equal(typeof value,'string');const time=Date.parse(value);assert.ok(Number.isFinite(time));return time;}
function expectedPlayerFiles(inputs){return TILE_VISUAL_EXAMPLES.map(name=>{const bytes=name.endsWith('.html')?Buffer.from(tileVisualPlayerHTML(tileVisualRegularFile(root,'examples/'+name).toString(),inputs.bindings)):tileVisualRegularFile(root,'examples/'+name);return {name,bytes:bytes.length,sha256:tileVisualSha(bytes)};});}
export function assertTileVisualBrowserReport(report,mode,inputs,{now=Date.now()}={}){
  assert.equal(report.status,'pass','Tile browser proof did not finish: '+mode);assert.equal(report.mode,mode);assert.equal(report.installed,mode==='installed');assert.match(report.runId,/^[a-f0-9-]{36}$/);
  assert.equal(report.inputSha256,inputs.inputSha256,'Stale tile browser fingerprint: '+mode);assert.deepEqual(report.inputs,inputs,'Current tile input ledger differs.');
  const start=when(report.startedAt),end=when(report.completedAt);assert.ok(start<=end&&end<=now+2000&&start>=now-24*60*60*1000,'Tile report is stale or has an invalid time span.');
  assert.equal(report.availability,mode==='installed'?'actual-declared-core-and-renderer':mode+'-reference-public-module-bytes');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
  assert.equal(report.backend.platform,process.platform);assert.equal(report.backend.architecture,process.arch);assert.equal(report.backend.browser,'chromium');assert.ok(['msedge','chrome','chromium'].includes(report.backend.channel));assert.ok(typeof report.backend.version==='string'&&report.backend.version.length);
  assert.deepEqual(report.backend.desktopViewport,{width:1600,height:1100});assert.deepEqual(report.backend.phoneViewport,{width:390,height:844});assert.equal(report.backend.phoneMode,'same-context viewport proof; not a device benchmark');assert.equal(report.backend.deviceScaleFactor,1);
  assert.deepEqual(report.checks.map(row=>row.name),TILE_VISUAL_CHECKS,'Missing/duplicate tile behavior checks.');
  for(const row of report.checks){assert.equal(row.status,'pass');assertTileVisualSnapshot(row.snapshot,{retired:row.name==='retirement'});}
  assert.equal(report.behaviorSha256,tileVisualJSONHash(report.checks));
  const retirement=report.checks.find(row=>row.name==='retirement');assert.equal(retirement.repeatedCloseQuiet,true);
  assert.equal(report.finalCanonicalJSON,retirement.snapshot.bundleJSON);assert.equal(report.finalStateSha256,tileVisualJSONHash(retirement.snapshot));
  assert.equal(report.checks.find(row=>row.name==='phone').viewportFits,true);
  const held=report.checks.find(row=>row.name==='held-controls');assert.equal(held.sceneSelect,true);assert.equal(held.detailSelect,true);assert.equal(held.boundaryToggleHeld,true);
  const assets=report.atlasResponses;assert.ok(Array.isArray(assets)&&assets.length>0,'No verified painted atlas response.');
  for(const asset of assets){assert.deepEqual(asset,{resource:TILE_VISUAL_ATLAS,bytes:inputs.atlas.bytes,sha256:inputs.atlas.sha256,status:200});}
  const folder='artifacts/tile-visuals-'+mode+'/',helper=json(folder+'helper-process.json'),receiptBytes=tileVisualRegularFile(root,folder+'cleanup-receipt.json'),receipt=JSON.parse(receiptBytes);
  assert.equal(helper.owner,report.owner);assert.equal(receipt.owner,report.owner);assert.equal(helper.startedAt,report.helperStartedAt);
  assert.ok(start<=when(helper.startedAt)&&when(helper.startedAt)<=when(receipt.stoppedAt)&&when(receipt.stoppedAt)<=end,'Cleanup receipt does not belong to this proof.');
  assert.ok(when(helper.expiresAt)>when(helper.startedAt)&&when(helper.expiresAt)<=when(helper.startedAt)+181000,'Expected the bounded 180-second helper lifetime.');
  assert.deepEqual(helper.process,receipt.process);assert.deepEqual(helper.browser,receipt.browser);assert.equal(helper.port,receipt.port);assert.equal(receipt.httpClosed,true);assert.equal(receipt.browserClosed,true);
  assert.deepEqual(report.cleanup,{receiptSha256:tileVisualSha(receiptBytes),httpClosed:true,browserClosed:true,port:receipt.port});
  const failure=path.join(root,folder,'browser-failure.json');if(fs.existsSync(failure))assert.ok(fs.statSync(failure).mtimeMs<start,'Fresh browser-failure artifact exists.');
  assert.deepEqual(report.captures.map(capture=>capture.name),TILE_VISUAL_CAPTURES,'Incomplete canonical tile capture set.');
  for(const capture of report.captures){
    assert.equal(capture.file,folder+capture.name+'.png');const bytes=tileVisualRegularFile(root,capture.file),stat=fs.statSync(path.join(root,capture.file));assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
    assert.equal(bytes.length,capture.bytes);assert.equal(tileVisualSha(bytes),capture.sha256,'Capture bytes changed: '+capture.file);
    assert.ok(when(capture.capturedAt)>=when(helper.startedAt)&&when(capture.capturedAt)<=when(receipt.stoppedAt));assert.ok(stat.mtimeMs>=start-2000&&stat.mtimeMs<=end+2000,'Stale capture file.');
    assert.match(capture.stateSha256,digest);assert.equal(capture.stateSha256,tileVisualJSONHash(report.checks.find(row=>row.name===capture.name).snapshot),'Capture state differs from its checked canonical state.');
  }
  if(mode==='installed'){
    const proof=report.installation;assert.ok(proof);assert.equal(proof.availability,'actual-declared-core-and-renderer');assert.equal(proof.registered,true);assert.equal(proof.stageRemoved,true);assert.deepEqual(proof.bindings,inputs.bindings);assert.deepEqual(proof.policy,tileVisualInstalledPolicy(proof.policy.prefix));
    assert.equal(fs.existsSync(path.join(root,proof.policy.prefix.slice(1))),false,'Installed browser stage is retained.');
    assert.deepEqual(Object.keys(proof.packages).sort(),['core','renderer']);for(const profile of ['core','renderer']){assert.equal(proof.packages[profile].name,'@nautilus-engine/'+profile);assert.equal(proof.packages[profile].version,inputs.manifest.version);assert.match(proof.packages[profile].archiveSha256,digest);}
    const expected=new Map(),actual=new Map();
    for(const [profile,files]of Object.entries(inputs.byProfile))for(const file of files)expected.set(profile+'/'+file,{profile,...inputs.files.find(row=>row.file===file)});
    for(const profile of ['core','renderer'])for(const file of TILE_VISUAL_SUPPORT)expected.set(profile+'/'+file,{profile,...inputs.files.find(row=>row.file===file)});
    expected.set('renderer/'+TILE_VISUAL_ATLAS,{profile:'renderer',...inputs.atlas});
    for(const row of proof.installedFiles){const key=row.profile+'/'+row.file;assert.equal(actual.has(key),false);actual.set(key,row);}assert.deepEqual([...actual.keys()].sort(),[...expected.keys()].sort());
    for(const [key,row]of expected)assert.deepEqual(actual.get(key),row,'Actual installed tile bytes differ: '+key);
    assert.deepEqual(proof.playerFiles,expectedPlayerFiles(inputs));
    assert.ok(Array.isArray(report.allowedRequests)&&report.allowedRequests.length>0);
    for(const request of report.allowedRequests){assert.equal(request.local,true);assert.equal(tileVisualInstalledRequestAllowed(request,proof.policy.prefix),true,'Installed tile fallback: '+request.path);}
    const requested=new Set(report.allowedRequests.map(request=>request.path));
    for(const binding of inputs.bindings)assert.ok(requested.has(proof.policy.prefix+'node_modules/'+binding.package+'/'+binding.file),'Public tile entry not requested: '+binding.specifier);
    for(const file of TILE_VISUAL_RUNTIME)assert.ok(['core','renderer'].some(profile=>requested.has(proof.policy.prefix+'node_modules/@nautilus-engine/'+profile+'/'+file)),'Provider module not requested: '+file);
    assert.ok(requested.has(proof.policy.atlasPath),'Installed renderer atlas was never requested.');
    assert.equal(proof.allPublicBindingsRequested,true);assert.equal(proof.allProviderRuntimeRequested,true);assert.equal(proof.atlasRequested,true);
  }else{assert.equal(report.installation,null);assert.deepEqual(report.allowedRequests,[]);}
  return report;
}
export function verifyTileVisualBrowserParity(){
  const inputs=tileVisualReviewInputs(),modes=['source','built','installed'],reports=modes.map(mode=>assertTileVisualBrowserReport(json('artifacts/tile-visuals-'+mode+'/review.json'),mode,inputs));
  assert.equal(new Set(reports.map(report=>report.runId)).size,3,'Tile modes reused one run identity.');
  const baseline=reports[0];
  for(const report of reports.slice(1)){
    assert.deepEqual(report.backend,baseline.backend,'Fresh tile modes use different backends.');assert.deepEqual(report.checks,baseline.checks,'Fresh canonical behavior/readiness/resource states differ.');assert.equal(report.behaviorSha256,baseline.behaviorSha256);
    assert.equal(report.finalCanonicalJSON,baseline.finalCanonicalJSON);assert.equal(report.finalStateSha256,baseline.finalStateSha256);
    for(let i=0;i<TILE_VISUAL_CAPTURES.length;i++){assert.equal(report.captures[i].sha256,baseline.captures[i].sha256,'Fresh tile pixels/bytes differ: '+TILE_VISUAL_CAPTURES[i]);assert.equal(report.captures[i].bytes,baseline.captures[i].bytes);assert.equal(report.captures[i].stateSha256,baseline.captures[i].stateSha256);}
  }
  const result={status:'pass',inputSha256:inputs.inputSha256,modes,backend:baseline.backend,runs:reports.map(report=>({mode:report.mode,runId:report.runId,startedAt:report.startedAt,completedAt:report.completedAt,captures:report.captures.length,checks:report.checks.length,cleanupClosed:true})),
    captures:TILE_VISUAL_CAPTURES.map((name,index)=>({name,sha256:baseline.captures[index].sha256,bytes:baseline.captures[index].bytes})),sameFreshPixels:true,sameFreshCaptureBytes:true,sameCanonicalSource:true,sameBehavior:true,sameReadiness:true,sameFinalResources:true,actualDeclaredCoreAndRenderer:true,noInstalledFallback:true,
    atlas:{path:TILE_VISUAL_ATLAS,bytes:inputs.atlas.bytes,sha256:inputs.atlas.sha256},behaviorSha256:baseline.behaviorSha256,finalStateSha256:baseline.finalStateSha256,
    qualification:'Fresh source/build/public-installed comparison on one backend. Historical worker pixels are separate; no query/support/game adoption is inferred.'};
  fs.writeFileSync(path.join(root,'artifacts/tile-visuals-browser-parity.json'),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const result=verifyTileVisualBrowserParity();console.log(JSON.stringify({status:result.status,inputSha256:result.inputSha256,modes:result.modes,captures:result.captures.length,sameFreshPixels:result.sameFreshPixels,sameFinalResources:result.sameFinalResources,actualDeclaredCoreAndRenderer:result.actualDeclaredCoreAndRenderer}));}
