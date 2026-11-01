// Compare fresh source/build/public-installed evidence on the same backend.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {root} from './distribution.mjs';
import {NATIVE_WINDOW_BINDINGS,NATIVE_WINDOW_EXAMPLES,NATIVE_WINDOW_RUNTIME,NATIVE_WINDOW_SUPPORT,NATIVE_WINDOW_CAPTURES,NATIVE_WINDOW_CHECKS,nativeWindowReviewInputs,nativeWindowRegularFile,nativeWindowSha,nativeWindowJSONHash,nativeWindowInstalledPolicy,nativeWindowInstalledRequestAllowed} from './native-window-review-inputs.mjs';

const digest=/^[a-f0-9]{64}$/;
const json=file=>JSON.parse(nativeWindowRegularFile(root,file));
const when=value=>{assert.equal(typeof value,'string','Missing proof timestamp.');const time=Date.parse(value);assert.ok(Number.isFinite(time),'Invalid proof timestamp.');return time;};
function expectedPlayerFiles(inputs){
  const html=nativeWindowRegularFile(root,'examples/native-window-presenter.html').toString(),maps=[...html.matchAll(/<script\s+type=["']importmap["']\s*>([\s\S]*?)<\/script>/g)];
  assert.equal(maps.length,1);
  const imports=Object.fromEntries(inputs.bindings.map(binding=>[binding.specifier,'../node_modules/'+binding.package+'/'+binding.file]));
  return NATIVE_WINDOW_EXAMPLES.map(name=>{
    const bytes=name.endsWith('.html')?Buffer.from(html.replace(maps[0][0],'<script type="importmap">'+JSON.stringify({imports})+'</script>')):nativeWindowRegularFile(root,'examples/'+name);
    return {name,bytes:bytes.length,sha256:nativeWindowSha(bytes)};
  });
}
export function assertNativeWindowBrowserReport(report,mode,inputs,{now=Date.now()}={}){
  assert.equal(report.status,'pass','Browser proof did not complete successfully: '+mode);
  assert.equal(report.mode,mode);assert.equal(report.installed,mode==='installed');
  assert.match(report.runId,/^[a-f0-9-]{36}$/,'Missing fresh run identity.');
  assert.equal(report.inputSha256,inputs.inputSha256,'Stale browser input fingerprint: '+mode);
  assert.deepEqual(report.inputs,inputs,'Browser input ledger differs from current source: '+mode);
  const start=when(report.startedAt),end=when(report.completedAt);
  assert.ok(start<=end&&end<=now+2000&&start>=now-24*60*60*1000,'Browser proof is stale or has an invalid time span: '+mode);
  assert.equal(report.availability,mode==='installed'?'actual-declared-core-and-renderer':mode+'-reference-public-module-bytes');
  for(const key of ['errors','failedRequests'])assert.deepEqual(report[key],[],'Missing/nonempty '+key+': '+mode);
  assert.equal(report.backend.platform,process.platform);assert.equal(report.backend.architecture,process.arch);
  assert.ok(['msedge','chrome','chromium'].includes(report.backend.channel));assert.equal(report.backend.browser,'chromium');assert.ok(typeof report.backend.version==='string'&&report.backend.version.length);
  assert.deepEqual(report.backend.desktopViewport,{width:1456,height:900});assert.deepEqual(report.backend.phoneViewport,{width:390,height:844});assert.equal(report.backend.deviceScaleFactor,1);
  assert.deepEqual(report.checks.map(check=>check.name),NATIVE_WINDOW_CHECKS,'Missing/reordered behavior assertions: '+mode);
  for(const check of report.checks){assert.equal(check.status,'pass');assert.ok(check.snapshot&&typeof check.snapshot==='object');assert.match(check.authoritySha256,digest);}
  assert.equal(report.behaviorSha256,nativeWindowJSONHash(report.checks),'Behavior digest is not bound: '+mode);
  assert.deepEqual(Object.keys(report.authoritySnapshots).sort(),['desktopFinal','desktopRestored','phoneRestored']);
  const associated={desktopRestored:'quiet-live-restore',desktopFinal:'borderless-back',phoneRestored:'phone-quiet-restore'};
  for(const [name,authority]of Object.entries(report.authoritySnapshots)){
    assert.ok(authority&&typeof authority.saved==='string'&&authority.saved.length>0,'Missing complete saved authority: '+name);
    assert.ok(Array.isArray(authority.events)&&Array.isArray(authority.clippedWalls));
    assert.equal(authority.savedUnderlayIntact,true);assert.match(authority.projection.geometryDigest,digest);
    const saved=JSON.parse(authority.saved);assert.ok(saved.windowState&&saved.source&&saved.geometry,'Missing retained host authority fields.');
    assert.equal(report.checks.find(check=>check.name===associated[name]).authoritySha256,nativeWindowJSONHash(authority),'Final authority differs from its behavior checkpoint.');
  }
  assert.equal(report.authoritySha256,nativeWindowJSONHash(report.authoritySnapshots),'Final authority digest is not bound: '+mode);
  const folder='artifacts/native-window-presenter-'+mode+'/',helper=json(folder+'helper-process.json'),receiptBytes=nativeWindowRegularFile(root,folder+'cleanup-receipt.json'),receipt=JSON.parse(receiptBytes);
  assert.equal(report.owner,helper.owner);assert.equal(report.owner,receipt.owner);assert.equal(report.helperStartedAt,helper.startedAt);
  assert.ok(start<=when(helper.startedAt)&&when(helper.startedAt)<=when(receipt.stoppedAt)&&when(receipt.stoppedAt)<=end,'Helper receipt is not from this proof.');
  assert.ok(when(helper.expiresAt)>when(helper.startedAt)&&when(helper.expiresAt)<=when(helper.startedAt)+181000,'Expected the bounded 180-second helper.');
  assert.deepEqual(helper.process,receipt.process);assert.deepEqual(helper.browser,receipt.browser);assert.equal(helper.port,receipt.port);
  assert.equal(receipt.httpClosed,true);assert.equal(receipt.browserClosed,true);
  assert.deepEqual(report.cleanup,{receiptSha256:nativeWindowSha(receiptBytes),httpClosed:true,browserClosed:true,port:receipt.port},'Cleanup evidence differs.');
  const failure=path.join(root,folder,'browser-failure.json');if(fs.existsSync(failure))assert.ok(fs.statSync(failure).mtimeMs<start,'Current proof has a browser-failure artifact.');
  assert.deepEqual(report.captures.map(capture=>capture.name),NATIVE_WINDOW_CAPTURES,'Incomplete/duplicate visual set: '+mode);
  for(const capture of report.captures){
    assert.equal(capture.file,folder+capture.name+'.png','Capture escapes its mode directory.');
    const bytes=nativeWindowRegularFile(root,capture.file),stat=fs.statSync(path.join(root,capture.file));
    assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Capture is not PNG.');
    assert.equal(bytes.length,capture.bytes);assert.equal(nativeWindowSha(bytes),capture.sha256,'Capture bytes changed: '+capture.file);
    assert.ok(when(capture.capturedAt)>=when(helper.startedAt)&&when(capture.capturedAt)<=when(receipt.stoppedAt),'Stale capture timestamp.');
    assert.ok(stat.mtimeMs>=start-2000&&stat.mtimeMs<=end+2000,'Capture file predates the fresh proof.');
    assert.ok(capture.snapshot&&typeof capture.snapshot==='object');assert.match(capture.authoritySha256,digest);
  }
  if(mode==='installed'){
    const proof=report.installation;assert.ok(proof,'Missing actual installed proof.');assert.equal(proof.availability,'actual-declared-core-and-renderer');assert.equal(proof.registered,true);assert.equal(proof.stageRemoved,true);
    assert.deepEqual(proof.bindings,inputs.bindings);assert.deepEqual(proof.policy,nativeWindowInstalledPolicy(proof.policy.prefix));
    assert.equal(fs.existsSync(path.join(root,proof.policy.prefix.slice(1))),false,'Installed browser stage was retained.');
    assert.deepEqual(Object.keys(proof.packages).sort(),['core','renderer']);
    for(const profile of ['core','renderer']){assert.equal(proof.packages[profile].name,'@nautilus-engine/'+profile);assert.equal(proof.packages[profile].version,inputs.manifest.version);assert.match(proof.packages[profile].archiveSha256,digest);}
    const expected=new Map();
    for(const [profile,files]of Object.entries(inputs.byProfile))for(const file of files)expected.set(profile+'/'+file,{profile,...inputs.files.find(record=>record.file===file)});
    for(const file of NATIVE_WINDOW_SUPPORT)expected.set('renderer/'+file,{profile:'renderer',...inputs.files.find(record=>record.file===file)});
    const actual=new Map();for(const record of proof.installedFiles){const key=record.profile+'/'+record.file;assert.equal(actual.has(key),false,'Duplicate installed byte record.');actual.set(key,record);}
    assert.deepEqual([...actual.keys()].sort(),[...expected.keys()].sort(),'Actual public runtime/support closure differs.');
    for(const [key,record]of expected)assert.deepEqual(actual.get(key),record,'Installed public bytes differ: '+key);
    assert.deepEqual(proof.playerFiles,expectedPlayerFiles(inputs),'Generated player differs from the four current fixture files.');
    assert.ok(Array.isArray(report.allowedRequests)&&report.allowedRequests.length>0,'Installed allowlist evidence missing.');
    for(const request of report.allowedRequests){assert.equal(request.local,true);assert.ok(['desktop','phone'].includes(request.context));assert.equal(nativeWindowInstalledRequestAllowed(request,proof.policy.prefix),true,'Installed request used fallback: '+request.path);}
    const base=proof.policy.prefix+'node_modules/@nautilus-engine/renderer/';
    for(const context of ['desktop','phone']){
      const requested=new Set(report.allowedRequests.filter(request=>request.context===context).map(request=>request.path));
      for(const file of NATIVE_WINDOW_RUNTIME)assert.ok(requested.has(base+file),'Actual public native module not requested by '+context+': '+file);
      for(const binding of NATIVE_WINDOW_BINDINGS)assert.ok(requested.has(proof.policy.prefix+'node_modules/'+inputs.bindings.find(b=>b.specifier===binding.specifier).package+'/'+binding.file),'A public import-map target was not requested.');
    }
    assert.equal(proof.nativeModuleRequested,true);assert.equal(proof.allNativeModulesRequested,true);
  }else{assert.equal(report.installation,null);assert.deepEqual(report.allowedRequests,[]);}
  return report;
}
export function verifyNativeWindowBrowserParity(){
  const inputs=nativeWindowReviewInputs(),modes=['source','built','installed'],reports=modes.map(mode=>assertNativeWindowBrowserReport(json('artifacts/native-window-presenter-'+mode+'/report.json'),mode,inputs));
  assert.equal(new Set(reports.map(report=>report.runId)).size,3,'Mode reports reused one run.');
  const baseline=reports[0];
  for(const report of reports.slice(1)){
    assert.deepEqual(report.backend,baseline.backend,'Fresh modes use different browser backends.');
    assert.deepEqual(report.checks,baseline.checks,'Fresh browser behavior/authority checkpoints differ.');
    assert.deepEqual(report.authoritySnapshots,baseline.authoritySnapshots,'Fresh final saved authority differs.');
    assert.equal(report.behaviorSha256,baseline.behaviorSha256);assert.equal(report.authoritySha256,baseline.authoritySha256);
    for(let i=0;i<NATIVE_WINDOW_CAPTURES.length;i++){
      assert.equal(report.captures[i].sha256,baseline.captures[i].sha256,'Fresh capture pixels/bytes differ: '+NATIVE_WINDOW_CAPTURES[i]);
      assert.equal(report.captures[i].bytes,baseline.captures[i].bytes);
      assert.deepEqual(report.captures[i].snapshot,baseline.captures[i].snapshot,'Capture behavior state differs.');
      assert.equal(report.captures[i].authoritySha256,baseline.captures[i].authoritySha256,'Capture authority state differs.');
    }
  }
  const result={status:'pass',inputSha256:inputs.inputSha256,modes,backend:baseline.backend,runs:reports.map(report=>({mode:report.mode,runId:report.runId,startedAt:report.startedAt,completedAt:report.completedAt,captures:report.captures.length,checks:report.checks.length,cleanupClosed:true})),
    captures:NATIVE_WINDOW_CAPTURES.map((name,i)=>({name,sha256:baseline.captures[i].sha256,bytes:baseline.captures[i].bytes})),sameFreshCaptureBytes:true,sameFreshPixels:true,sameBehavior:true,sameFinalAuthority:true,actualDeclaredRenderer:true,noInstalledFallback:true,behaviorSha256:baseline.behaviorSha256,authoritySha256:baseline.authoritySha256,
    comparison:'Fresh source, built and actual public core/renderer on this backend. Historical Windows pixel hashes are not a CI baseline.'};
  fs.writeFileSync(path.join(root,'artifacts/native-window-presenter-browser-parity.json'),JSON.stringify(result,null,2)+'\n');
  return result;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const result=verifyNativeWindowBrowserParity();console.log(JSON.stringify({status:result.status,inputSha256:result.inputSha256,modes:result.modes,captures:result.captures.length,sameFreshPixels:result.sameFreshPixels,sameFinalAuthority:result.sameFinalAuthority,actualDeclaredRenderer:result.actualDeclaredRenderer}));}
