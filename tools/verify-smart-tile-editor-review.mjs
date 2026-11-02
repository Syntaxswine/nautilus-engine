// Root-owned CI evidence verification. Reads reports/current inputs; writes only
// artifacts/smart-tile-editor-matrix.json. Never run the documentation collector.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=value=>createHash('sha256').update(value).digest('hex'),digest=/^[a-f0-9]{64}$/;
const atlas='assets/buildings/painted-materials-v2.png';
const reportDirectory=mode=>'artifacts/smart-tile-editor-'+mode+'/';
export const SMART_TILE_CONTROLLER_SOURCES={acceptedController:'f754afcc9f46b196f258bf09e8091c962c9b31f8',b1Controller:'4b0499cc776fcd85fdd415fa7344982b75fbf8fb',historicalController:'9e996f96b69ba4867e643b558e9fdfeaf752d19e'};
export const SMART_TILE_REVIEW_BINDINGS=[
  ['@nautilus-engine/core','core','.','packages/map-core/index.js'],
  ['@nautilus-engine/core/floors','core','./floors','packages/floor-navigation/index.js'],
  ['@nautilus-engine/core/tiles','core','./tiles','packages/tiles-core/index.js'],
  ['@nautilus-engine/core/tiles/art','core','./tiles/art','packages/tile-visuals/prepare.js'],
  ['@nautilus-engine/core/tiles/art/example','core','./tiles/art/example','packages/tile-visuals/example.js'],
  ['@nautilus-engine/renderer/tiles/art/three','renderer','./tiles/art/three','packages/tile-visuals/three.js'],
  ['@nautilus-engine/renderer/render-effects/three','renderer','./render-effects/three','packages/render-effects/three.js']
].map(([specifier,profile,entry,file])=>({specifier,profile,entry,file}));
export const SMART_TILE_REVIEW_CHECKS=[
  'initial-real-host','rectangle-review-across-real-24m-sector','rectangle-accepted','straight-neighbour',
  'native-derived-cell-whole-owner-selection','selected-owner-finish','failed-overlap-preserves-redo-and-view',
  'save-reopen-complete-source','native-page-reload','original-line-controls','original-arc-controls','original-cubic-controls',
  'native-floor-change-retires-review','actual-native-upper-floor','real-floor-key-form-guard',
  'scoped-held-enter-reviews-without-applying','synthetic-host-after-recovery','synthetic-host-before-recovery',
  'synthetic-host-cancel-after-recovery','owned-retirement-borrowed-pool-host-disposal',
  'native-pinch-cancel-then-fresh-ui-activation','native-ui-first-contact-blocks-later-canvas-construction',
  'native-escape-keeps-held-contact-quarantine','native-cdp-second-finger-quarantine',
  'native-phone-canvas-draft-without-acceptance','native-phone-review-apply','native-phone-capture-loss-cancels'
];
export const SMART_TILE_REVIEW_CAPTURES=['desktop-finish','native-upper-floor','phone-390-viewport','phone-390','phone-320-viewport','phone-320'];
// Shared explicit proof-tool/metadata inventory. The runtime dependency parser
// intentionally rejects Node tooling imports; this list does not claim to
// discover computed imports or fingerprint external browser/Node installations.
const verificationFiles=['tools/review-smart-tile-editor.mjs','tools/art-review-browser.mjs','tools/distribution.mjs','tools/check-smart-tile-editor-source.mjs','docs/reviews/smart-tile-editor/sources.json','docs/reviews/smart-tile-editor/integration-sources.json','tools/verify-smart-tile-editor-review.mjs','tools/tile-surface-corrections.mjs','tools/tile-stack-registration.mjs','tools/tile-stack-editor-source.mjs','docs/reviews/tile-stack/architect/b1-sources.json','tools/tile-stack-editor-b2-source.mjs','docs/reviews/tile-stack/architect/b2-sources.json','tools/module-references.mjs','packages/tile-visuals/source.json','package.json','upstream.json'];
export const smartTileVerificationFiles=()=>[...verificationFiles].sort();
function relative(file){assert.equal(typeof file,'string');assert.ok(file&&!path.posix.isAbsolute(file)&&!file.includes('\\')&&!file.includes('%')&&!/[\x00-\x1f\x7f?#]/.test(file)&&path.posix.normalize(file)===file&&!file.split('/').some(p=>!p||p==='.'||p==='..'),'Unsafe evidence path: '+file);return file;}
function fileAt(root,file){relative(file);let resolved=root;for(const part of file.split('/')){resolved=path.join(resolved,part);assert.equal(fs.lstatSync(resolved).isSymbolicLink(),false,'Evidence symlink: '+file);}assert.equal(fs.statSync(resolved).isFile(),true,file);return resolved;}
const read=(root,file)=>fs.readFileSync(fileAt(root,file));
const json=(root,file)=>JSON.parse(read(root,file));
function timestamp(value){assert.equal(typeof value,'string');const n=Date.parse(value);assert.ok(Number.isFinite(n),'Invalid evidence time.');return n;}
function named(rows,key){assert.ok(Array.isArray(rows));const result=new Map();for(const row of rows){assert.ok(row&&typeof row==='object');assert.equal(result.has(row[key]),false,'Duplicate evidence '+key+': '+row[key]);result.set(row[key],row);}return result;}
function identity(value){assert.ok(value&&Number.isSafeInteger(value.pid)&&value.pid>0);assert.equal(typeof value.executable,'string');assert.ok(value.executable.length);const created=value.creationFiletime??value.creationTicks;assert.equal(typeof created,'string');assert.match(created,/^\d+$/);}
function gitSource(root){
  const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:2*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
  const [head,headTree]=git('show','-s','--format=%H%n%T','HEAD').trim().split(/\r?\n/);assert.match(head,/^[a-f0-9]{40}$/);assert.match(headTree,/^[a-f0-9]{40}$/);
  const status=git('status','--porcelain=v1','--untracked-files=normal');return {head,headTree,dirty:status.length>0,statusSha256:sha(status),scope:'HEAD/tree identify the checked-out base. Dirty source is described by the current input fingerprint; this is not a claim that dirty bytes belong to the HEAD tree.'};
}

// Exactly the accepted collector's semantic projection. Deliberately excludes
// owner UUIDs, history byte counts, pixels, camera/geometry details and timings.
export const smartTileSemanticState=s=>({phase:s.phase,revision:s.revision,serial:s.serial,history:{undo:s.history.undo,redo:s.history.redo},floor:s.floor,sourceDigest:s.sourceDigest,owners:s.owners.map(o=>({locked:o.locked,shapeKind:o.shapeKind,skinId:o.skinId,floorId:o.floorId})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),readiness:s.readiness,limits:[s.resources.maxRoots,s.resources.maxTriangles,s.resources.maxCells]});
export function assertSmartTileReviewSnapshot(s,{retired=false}={}){
  assert.ok(s&&typeof s==='object');assert.match(s.sourceDigest,digest);assert.match(s.checkpointSha256,digest);
  for(const key of ['revision','serial'])assert.ok(Number.isSafeInteger(s[key])&&s[key]>=0);
  for(const key of ['undo','redo'])assert.ok(Number.isSafeInteger(s.history[key])&&s.history[key]>=0);
  assert.ok(Array.isArray(s.owners)&&Array.isArray(s.views)&&Array.isArray(s.pool)&&s.pool.length>0);
  const r=s.resources;assert.deepEqual([r.maxRoots,r.maxTriangles,r.maxCells],[2,50000,1024]);
  for(const key of ['accepted','candidate','acquiring','retiring','roots','triangles','cells'])assert.ok(Number.isSafeInteger(r[key])&&r[key]>=0,key);
  assert.equal(r.roots,r.accepted+r.candidate+r.acquiring+r.retiring);assert.ok(r.roots<=2&&r.triangles<=50000&&r.cells<=1024);
  for(const key of ['query','support','navigation','fire','water','game'])assert.equal(s.readiness[key].state,'unbound');
  assert.ok(s.pool.every(value=>value===(retired?1:0)),'Unexpected host-pool disposal.');
  assert.equal(s.disposed,retired);
  if(retired){assert.equal(s.phase,'disposed');assert.equal(r.roots,0);assert.equal(r.triangles,0);assert.equal(r.cells,0);assert.deepEqual(s.views,[]);}
  return s;
}
export function assertSmartTileReviewChecks(checks){
  assert.deepEqual(checks.map(c=>c.name),SMART_TILE_REVIEW_CHECKS,'Missing, duplicate or reordered Smart Tile check.');
  for(const c of checks){assert.equal(c.status,'pass',c.name);assertSmartTileReviewSnapshot(c.snapshot,{retired:c.name==='owned-retirement-borrowed-pool-host-disposal'});}
  const ui=checks.find(c=>c.name==='native-ui-first-contact-blocks-later-canvas-construction');
  assert.equal(ui.held.owner,null);assert.equal(ui.held.sequenceOwner,'ui');assert.equal(ui.held.pointers,2);assert.equal(ui.held.consumed,false);
  const escape=checks.find(c=>c.name==='native-escape-keeps-held-contact-quarantine');
  assert.equal(escape.afterEscape.owner,null);assert.equal(escape.afterEscape.sequenceOwner,'canvas');assert.equal(escape.afterEscape.pointers,2);assert.equal(escape.afterEscape.consumed,true);
  for(const c of [ui,escape]){assert.equal(c.snapshot.input.owner,null);assert.equal(c.snapshot.input.pointers,0);}
  return checks.map(c=>({name:c.name,state:smartTileSemanticState(c.snapshot)}));
}
function stagedHostBytes(root,file){
  const original=read(root,file);if(file==='packages/floor-navigation/dom.js'){const text=original.toString(),needle="from './index.js'";assert.equal(text.split(needle).length,2);return Buffer.from(text.replace(needle,"from '@nautilus-engine/core/floors'"));}
  if(file!=='examples/smart-tile-editor.html')return original;
  let html=original.toString();const maps=[...html.matchAll(/<script type="importmap">([\s\S]*?)<\/script>/g)];assert.equal(maps.length,1);
  const imports=JSON.parse(maps[0][1]).imports;assert.deepEqual(Object.keys(imports).sort(),SMART_TILE_REVIEW_BINDINGS.map(b=>b.specifier).sort());
  for(const b of SMART_TILE_REVIEW_BINDINGS)assert.equal(imports[b.specifier],'../'+b.file);
  const replacement=Object.fromEntries(SMART_TILE_REVIEW_BINDINGS.map(b=>[b.specifier,'../node_modules/@nautilus-engine/'+b.profile+'/'+b.file]));
  html=html.replace(maps[0][0],'<script type="importmap">'+JSON.stringify({imports:replacement})+'</script>');
  const needle='href="../'+atlas+'"';assert.equal(html.split(needle).length,2);return Buffer.from(html.replace(needle,'href="../node_modules/@nautilus-engine/renderer/'+atlas+'"'));
}
export async function verifySmartTileEditorReview({projectRoot=defaultRoot,write=true,now=Date.now(),maxAgeMs=24*60*60*1000}={}){
  const root=path.resolve(projectRoot);assert.ok(Number.isFinite(now)&&Number.isFinite(maxAgeMs)&&maxAgeMs>0);
  // This tools-only parser reads static module references; no runtime/browser is evaluated.
  const {moduleClosure,distribution}=await import(pathToFileURL(path.join(root,'tools/distribution.mjs')).href);
  const pkg=json(root,'package.json'),plans=Object.fromEntries(['core','renderer'].map(profile=>[profile,distribution(profile)]));
  for(const b of SMART_TILE_REVIEW_BINDINGS){assert.equal(pkg.exports[b.entry],'./'+b.file);assert.equal(plans[b.profile].exports[b.entry],'./'+b.file);}
  const closures=Object.fromEntries(['core','renderer'].map(profile=>[profile,[...new Set(SMART_TILE_REVIEW_BINDINGS.filter(b=>b.profile===profile).flatMap(b=>moduleClosure([b.file])))].sort()]));
  const hostFiles=[...fs.readdirSync(path.join(root,'apps/editor/smart-tile')).filter(name=>/\.(js|css)$/.test(name)).map(name=>'apps/editor/smart-tile/'+name),'examples/smart-tile-editor.html','examples/smart-tile-editor.js','packages/parts-core/hash.js','packages/windows-authoring/journal.js','packages/floor-navigation/dom.js','packages/floor-navigation/style.css'];
  const inputFiles=[...new Set([...hostFiles,...Object.values(closures).flat(),atlas])].sort();
  const expectedInputs=inputFiles.map(file=>{const bytes=read(root,file);return {file,bytes:bytes.length,sha256:sha(bytes)};});
  const expectedVerification=smartTileVerificationFiles(root).map(file=>({file,sha256:sha(read(root,file))}));
  const expectedInstalled=new Map();for(const profile of ['core','renderer'])for(const file of new Set([...closures[profile],...(profile==='renderer'?[atlas]:['packages/parts-core/hash.js','packages/windows-authoring/journal.js'])])){assert.ok(plans[profile].files.includes(file));expectedInstalled.set(profile+'/'+file,{profile,file,sha256:sha(read(root,file))});}
  const summaries=[],semantic={},allRunIds=new Set();let baselineBackend=null;
  for(const mode of ['source','built','installed']){
    const directory=reportDirectory(mode),reportBytes=read(root,directory+'review.json'),report=JSON.parse(reportBytes);
    assert.equal(report.version,1);assert.equal(report.status,'pass');assert.equal(report.mode,mode);assert.equal(report.smoke,false);assert.equal(report.phoneOnly,false);
    assert.match(report.runId,/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);assert.equal(allRunIds.has(report.runId),false,'Reused Smart Tile run ID.');allRunIds.add(report.runId);
    assert.deepEqual(report.bindings,SMART_TILE_REVIEW_BINDINGS);assert.deepEqual(report.inputs,expectedInputs);assert.deepEqual(report.verificationInputs,expectedVerification);
    assert.deepEqual(report.controllerSources,SMART_TILE_CONTROLLER_SOURCES);
    for(const [key,value]of Object.entries({foundation:'8aac00de19c80c1143945b4dd4f2a88e59e86013',uiCommit:'e4196e43da9f7c480817b9ae22e237451d3c7a86',runtimeBase:'0fbc5c3630e257dfcd7a6ea82027634dfe6989b6'}))assert.equal(report[key],value);
    if(mode==='built')for(const row of expectedInputs)assert.equal(sha(read(root,'dist/'+row.file)),row.sha256,'Stale built input '+row.file);
    assert.ok(report.backend&&typeof report.backend.browserVersion==='string'&&report.backend.browserVersion.length);assert.equal(report.backend.phone.isMobile,true);assert.equal(report.backend.phone.hasTouch,true);
    if(baselineBackend===null)baselineBackend=report.backend;else assert.deepEqual(report.backend,baselineBackend,'Matrix modes use different browser/device configurations.');
    semantic[mode]=assertSmartTileReviewChecks(report.checks);
    const helper=json(root,directory+'helper-process.json'),receiptBytes=read(root,directory+'cleanup-receipt.json'),receipt=JSON.parse(receiptBytes);
    assert.equal(helper.owner,receipt.owner);assert.equal(typeof helper.owner,'string');assert.ok(helper.owner.length);assert.equal(helper.purpose,receipt.purpose);assert.equal(helper.purpose,'Smart Tile Editor '+mode+' real host acceptance');
    identity(helper.process);identity(helper.browser);assert.deepEqual(receipt.process,helper.process);assert.deepEqual(receipt.browser,helper.browser);assert.equal(receipt.port,helper.port);assert.ok(Number.isSafeInteger(helper.port)&&helper.port>0&&helper.port<=65535);assert.equal(receipt.httpClosed,true);assert.equal(receipt.browserClosed,true);
    const started=timestamp(helper.startedAt),expires=timestamp(helper.expiresAt),stopped=timestamp(receipt.stoppedAt),finished=timestamp(report.finishedAt);assert.ok(started<=stopped&&stopped<=finished&&finished<=now+2000&&started>=now-maxAgeMs);assert.ok(expires>started&&expires-started<=600000,'Unbounded review helper expiry.');
    assert.ok(fs.statSync(fileAt(root,directory+'review.json')).mtimeMs>=started-2000,'Stale review file.');
    const failure=path.join(root,directory,'browser-failure.json');if(fs.existsSync(failure))assert.ok(fs.statSync(fileAt(root,directory+'browser-failure.json')).mtimeMs<started,'Fresh browser failure exists.');
    assert.deepEqual(report.captures.map(c=>c.name),SMART_TILE_REVIEW_CAPTURES);
    const captures=report.captures.map(c=>{assert.equal(c.file,directory+c.name+'.png');const bytes=read(root,c.file);assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Capture is not PNG.');assert.equal(sha(bytes),c.sha256);assert.equal(sha(JSON.stringify(c.state)),c.stateSha256);assertSmartTileReviewSnapshot(c.state);const mtime=fs.statSync(fileAt(root,c.file)).mtimeMs;assert.ok(mtime>=started-2000&&mtime<=finished+2000,'Stale capture '+c.name);return {name:c.name,sha256:c.sha256,stateSha256:c.stateSha256};});
    if(mode==='installed'){
      const proof=report.installation;assert.ok(proof);assert.equal(proof.privatePrimaryProvider,false);assert.equal(proof.allPublicBindingsRequested,true);assert.equal(proof.stageRemoved,true);assert.deepEqual(Object.keys(proof.packages).sort(),['core','renderer']);
      for(const profile of ['core','renderer']){assert.equal(proof.packages[profile].name,plans[profile].name);assert.match(proof.packages[profile].archiveSha256,digest);}
      const actualInstalled=new Map();for(const row of proof.installedFiles){const key=row.profile+'/'+row.file;relative(row.file);assert.equal(actualInstalled.has(key),false);assert.match(row.sha256,digest);actualInstalled.set(key,row);}
      assert.deepEqual([...actualInstalled.keys()].sort(),[...expectedInstalled.keys()].sort());for(const [key,row]of expectedInstalled)assert.deepEqual(actualInstalled.get(key),row,'Installed source hash mismatch '+key);
      const actualHost=named(proof.hostFiles,'file');assert.deepEqual([...actualHost.keys()].sort(),[...hostFiles].sort());for(const file of hostFiles){const row=actualHost.get(file);assert.equal(row.sourceSha256,sha(read(root,file)));assert.equal(row.stagedSha256,sha(stagedHostBytes(root,file)),'Undeclared staged host adaptation '+file);}
      assert.ok(Array.isArray(proof.requestedFiles)&&proof.requestedFiles.length);assert.equal(new Set(proof.requestedFiles).size,proof.requestedFiles.length);
      const prefix=proof.requestedFiles[0].match(/^\/artifacts\/smart-tile-installed-[A-Za-z0-9]{6}\//)?.[0];assert.ok(prefix,'Missing isolated installed request prefix.');assert.equal(fs.existsSync(path.join(root,prefix.slice(1))),false,'Installed stage still exists.');
      for(const request of proof.requestedFiles){assert.equal(typeof request,'string');assert.equal(path.posix.normalize(request),request);assert.ok(!/[\\%?#\x00-\x1f\x7f]/.test(request));if(hostFiles.some(file=>request===prefix+file))continue;const profile=['core','renderer'].find(p=>request.startsWith(prefix+'node_modules/@nautilus-engine/'+p+'/'));assert.ok(profile,'Installed source/provider fallback '+request);const file=request.slice((prefix+'node_modules/@nautilus-engine/'+profile+'/').length);relative(file);assert.ok(plans[profile].files.includes(file),'Request outside declared installed files '+file);}
      for(const b of SMART_TILE_REVIEW_BINDINGS)assert.ok(proof.requestedFiles.includes(prefix+'node_modules/@nautilus-engine/'+b.profile+'/'+b.file),'Missing actual public binding request '+b.specifier);assert.ok(proof.requestedFiles.includes(prefix+'node_modules/@nautilus-engine/renderer/'+atlas),'Missing installed renderer atlas request.');
    }else assert.equal(report.installation,null);
    summaries.push({mode,runId:report.runId,reportSha256:sha(reportBytes),startedAt:helper.startedAt,finishedAt:report.finishedAt,checks:report.checks.length,captures,cleanup:{receiptSha256:sha(receiptBytes),httpClosed:true,browserClosed:true,port:receipt.port}});
  }
  assert.deepEqual(semantic.built,semantic.source,'Built semantic authority/readiness/history differs.');assert.deepEqual(semantic.installed,semantic.source,'Installed semantic authority/readiness/history differs.');
  for(const row of [...expectedInputs,...expectedVerification])assert.equal(sha(read(root,row.file)),row.sha256,'Input changed during matrix verification '+row.file);
  const result={version:1,status:'pass',...SMART_TILE_CONTROLLER_SOURCES,source:gitSource(root),inputSha256:sha(JSON.stringify({inputs:expectedInputs,verificationInputs:expectedVerification,bindings:SMART_TILE_REVIEW_BINDINGS,manifest:{name:pkg.name,version:pkg.version,exports:pkg.exports},profiles:Object.fromEntries(Object.entries(plans).map(([p,plan])=>[p,{name:plan.name,exports:plan.exports}]))})),modes:['source','built','installed'],requiredChecks:SMART_TILE_REVIEW_CHECKS,capturesPerMode:6,runs:summaries,sameSemanticAuthorityReadinessHistory:true,actualDeclaredCoreAndRenderer:true,installedStageRemoved:true,recordedCleanupClosed:true,scope:'Current-source-bound source/build/actual-installed reports. Parity uses only the accepted collector semantic fields. Capture bytes bind each capture to its own reported state; UUIDs, full state, pixels and device performance are not compared. The optional raw-touch observation is separate and not required. Cleanup validates recorded identities/receipts, not a live port scan.'};
  if(write){const directory=path.join(root,'artifacts'),target=path.join(directory,'smart-tile-editor-matrix.json');if(!fs.existsSync(directory))fs.mkdirSync(directory);assert.equal(fs.lstatSync(directory).isSymbolicLink(),false);if(fs.existsSync(target)){assert.equal(fs.lstatSync(target).isSymbolicLink(),false);assert.equal(fs.statSync(target).isFile(),true);}fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');}
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);assert.ok(args.length===0||args.length===2&&args[0]==='--root','Use --root PROJECT only when running the draft outside tools/.');const result=await verifySmartTileEditorReview({projectRoot:args[1]??defaultRoot});console.log(JSON.stringify({status:result.status,inputSha256:result.inputSha256,modes:3,checksPerMode:SMART_TILE_REVIEW_CHECKS.length,capturesPerMode:6,output:'artifacts/smart-tile-editor-matrix.json'}));
}
