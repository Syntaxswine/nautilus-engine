// Source/build references and the actual declared renderer, on isolated helpers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {withArtReview,projectRoot as root} from './art-review-browser.mjs';
import {packProfile} from './distribution.mjs';
import {NATIVE_WINDOW_EXAMPLES,NATIVE_WINDOW_RUNTIME,NATIVE_WINDOW_SUPPORT,NATIVE_WINDOW_CAPTURES,NATIVE_WINDOW_CHECKS,nativeWindowReviewInputs,nativeWindowRegularFile,nativeWindowSha,nativeWindowJSONHash,nativeWindowInstalledPolicy,nativeWindowInstalledRequestAllowed,slash} from './native-window-review-inputs.mjs';

assert.ok(!(process.argv.includes('--installed')&&process.argv.includes('--source')),'Choose one browser proof mode.');
const installed=process.argv.includes('--installed'),source=process.argv.includes('--source'),mode=installed?'installed':source?'source':'built';
const owner=process.env.CODEX_THREAD_ID||'01a18107-b4af-78c0-850f-0235d4df307f',output='native-window-presenter-'+mode,out=path.join(root,'artifacts',output);
const startedAt=new Date().toISOString(),runId=randomUUID(),captures=[],checks=[],allowedRequests=[],authoritySnapshots={};
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pending',mode,runId,startedAt})+'\n');
let stage=null,entry='/examples/native-window-presenter.html',prefix=null,installation=null,report=null,inputs=null;
function write(value){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(value,null,2)+'\n');}
function npm(args,cwd){
  const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));
  assert.ok(cli,'Node with npm is required.');
  return execFileSync(process.execPath,[cli,...args],{cwd,windowsHide:true,encoding:'utf8',maxBuffer:8*1024*1024,timeout:120000});
}
function prepareInstalled(){
  stage=fs.mkdtempSync(path.join(root,'artifacts/native-window-presenter-installed-browser-'));
  prefix='/artifacts/'+path.basename(stage)+'/';
  const player=path.join(stage,'player');fs.mkdirSync(player);
  const packs={core:packProfile('core'),renderer:packProfile('renderer')};
  fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'actual-native-window-browser-proof',private:true,type:'module'}));
  npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',packs.core.file,packs.renderer.file],stage);
  const packageRoots=Object.fromEntries(['core','renderer'].map(profile=>[profile,path.join(stage,'node_modules/@nautilus-engine',profile)]));
  const manifests=Object.fromEntries(Object.entries(packageRoots).map(([profile,directory])=>{
    assert.equal(fs.lstatSync(directory).isSymbolicLink(),false,'Installed public package must be physical.');
    assert.ok(fs.realpathSync(directory).startsWith(fs.realpathSync(stage)+path.sep),'Installed package escapes its private browser stage.');
    const manifest=JSON.parse(fs.readFileSync(path.join(directory,'package.json')));
    assert.equal(manifest.name,'@nautilus-engine/'+profile);
    return [profile,manifest];
  }));
  const installedFiles=[],seen=new Set();
  function checkFile(profile,file){
    const key=profile+'/'+file;if(seen.has(key))return;seen.add(key);
    assert.ok(manifests[profile].files.includes(file),'Actual package whitelist omits '+key);
    const expected=nativeWindowRegularFile(root,file),actual=nativeWindowRegularFile(packageRoots[profile],file);
    assert.ok(actual.equals(expected),'Installed public bytes differ: '+key);
    installedFiles.push({profile,file,bytes:actual.length,sha256:nativeWindowSha(actual)});
  }
  for(const [profile,files]of Object.entries(inputs.byProfile))for(const file of files)checkFile(profile,file);
  for(const file of NATIVE_WINDOW_SUPPORT)checkFile('renderer',file);
  const provenance=JSON.parse(nativeWindowRegularFile(packageRoots.renderer,'package-provenance.json'));
  assert.equal(provenance.profile,'renderer');
  for(const file of [...NATIVE_WINDOW_RUNTIME,...NATIVE_WINDOW_SUPPORT]){
    const expected=installedFiles.find(record=>record.profile==='renderer'&&record.file===file),declared=provenance.files.find(record=>record.path===file);
    assert.ok(expected&&declared,'Native installed provenance is incomplete: '+file);
    assert.equal(declared.sha256,expected.sha256);assert.equal(declared.bytes,expected.bytes);
  }
  const imports={};
  for(const binding of inputs.bindings){
    const target=manifests[binding.profile].exports[binding.entry];
    assert.equal(target,'./'+binding.file,'Actual installed public export is absent: '+binding.specifier);
    imports[binding.specifier]='../node_modules/'+binding.package+'/'+target.slice(2);
  }
  for(const name of NATIVE_WINDOW_EXAMPLES.filter(name=>name.endsWith('.js')))fs.copyFileSync(path.join(root,'examples',name),path.join(player,name));
  const html=nativeWindowRegularFile(root,'examples/native-window-presenter.html').toString(),maps=[...html.matchAll(/<script\s+type=["']importmap["']\s*>([\s\S]*?)<\/script>/g)];
  assert.equal(maps.length,1,'Expected one explicit source import map.');
  const old=JSON.parse(maps[0][1]);assert.deepEqual(Object.keys(old.imports).sort(),inputs.bindings.map(binding=>binding.specifier).sort());
  for(const binding of inputs.bindings)assert.equal(old.imports[binding.specifier],'../'+binding.file,'Unexpected source import-map target.');
  fs.writeFileSync(path.join(player,'native-window-presenter.html'),html.replace(maps[0][0],'<script type="importmap">'+JSON.stringify({imports})+'</script>'));
  assert.deepEqual(fs.readdirSync(player).sort(),[...NATIVE_WINDOW_EXAMPLES].sort(),'Only the four private player files are allowed.');
  const policy=nativeWindowInstalledPolicy(prefix);
  installation={availability:'actual-declared-core-and-renderer',registered:true,packages:Object.fromEntries(Object.entries(packs).map(([profile,p])=>[profile,{name:p.name,version:p.version,archiveSha256:nativeWindowSha(fs.readFileSync(p.file))}])),bindings:inputs.bindings,installedFiles:installedFiles.sort((a,b)=>(a.profile+'/'+a.file).localeCompare(b.profile+'/'+b.file)),policy,
    playerFiles:NATIVE_WINDOW_EXAMPLES.map(name=>{const bytes=fs.readFileSync(path.join(player,name));return {name,bytes:bytes.length,sha256:nativeWindowSha(bytes)};}),nativeModuleRequested:false,allNativeModulesRequested:false,stageRemoved:false};
  entry=prefix+'player/native-window-presenter.html';
}
try{
  inputs=nativeWindowReviewInputs();
  if(mode==='built')for(const file of inputs.browserFiles)assert.ok(nativeWindowRegularFile(path.join(root,'dist'),file).equals(nativeWindowRegularFile(root,file)),'Built browser input is stale: '+file);
  if(installed)prepareInstalled();
  await withArtReview('Native public window presenter '+mode+' desktop/phone review',async({page,context,browser,baseURL,errors,failedRequests})=>{
    const backend={channel:process.env.NAUTILUS_REVIEW_CHANNEL||(process.platform==='win32'?'msedge':'chromium'),browser:browser.browserType().name(),version:browser.version(),platform:process.platform,architecture:process.arch,desktopViewport:{width:1456,height:900},phoneViewport:{width:390,height:844},deviceScaleFactor:1};
    const routeFor=which=>route=>{
      const request=route.request(),url=new URL(request.url()),record={context:which,path:url.pathname,search:url.search,method:request.method(),resourceType:request.resourceType(),local:url.origin===baseURL};
      if(record.local&&nativeWindowInstalledRequestAllowed(record,prefix)){allowedRequests.push(record);return route.continue();}
      errors.push('Installed '+which+' request escaped the actual public packages/player: '+url.pathname);return route.abort();
    };
    if(installed)await context.route('**/*',routeFor('desktop'));
    const ready=async p=>{await p.waitForFunction(()=>document.body.dataset.ready==='true');};
    const snapshot=p=>p.evaluate(()=>windowPresenterReview.snapshot());
    const authority=p=>p.evaluate(()=>{if(typeof windowPresenterReview.authoritySnapshot!=='function')throw Error('Missing read-only authoritySnapshot proof seam.');return windowPresenterReview.authoritySnapshot();});
    async function record(name,p=page,details={}){
      const s=await snapshot(p),a=await authority(p);
      checks.push({name,status:'pass',snapshot:s,authoritySha256:nativeWindowJSONHash(a),...details});return {snapshot:s,authority:a};
    }
    async function capture(name,p=page){
      await p.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      const state=await snapshot(p),a=await authority(p),file=path.join(out,name+'.png');
      await p.screenshot({path:file});
      const bytes=fs.readFileSync(file);
      captures.push({name,file:slash(path.relative(root,file)),bytes:bytes.length,sha256:nativeWindowSha(bytes),capturedAt:new Date().toISOString(),snapshot:state,authoritySha256:nativeWindowJSONHash(a)});
    }
    await page.setViewportSize(backend.desktopViewport);await page.goto(baseURL+entry);await ready(page);
    assert.equal((await snapshot(page)).placements,39);await record('catalogue');await capture('catalogue-desktop');
    for(const study of ['skins','joins','borderless','clipping']){
      await page.getByRole('button',{name:{skins:'Finishes',joins:'Joined run',borderless:'Tall glass',clipping:'Wall opening'}[study],exact:true}).click();
      const s=await snapshot(page);assert.equal(s.mode,study);assert.equal(s.underlayPreserved,true);
      if(study==='clipping'){assert.equal(s.clippedWalls,6);assert.equal(s.legacyViewWalls,6);}
      if(study==='borderless'){assert.equal(s.placements,4);assert.equal(s.visiblePanes,4);assert.equal(s.glints,0);}
      await record(study);await capture(study+'-desktop');
    }
    await page.getByRole('button',{name:'Back view',exact:true}).click();assert.equal((await snapshot(page)).back,true);await record('clipping-back');await capture('clipping-back');await page.getByRole('button',{name:'Back view',exact:true}).click();
    assert.equal(await page.evaluate(()=>windowPresenterReview.breakPane()),true);
    let s=await snapshot(page);assert.equal(s.hiddenPanes,1);assert.equal(s.presentations,1);assert.equal(s.glints,5);
    const broken=await record('acknowledged-break',page,{accepted:true});
    assert.equal(await page.evaluate(()=>windowPresenterReview.retry()),true);
    const retried=await record('durable-retry',page,{quiet:true});assert.deepEqual(retried.authority,broken.authority,'Durable retry changed authoritative save/geometry/events.');
    const restored=await page.evaluate(()=>windowPresenterReview.restore());assert.deepEqual(restored,{committed:true,quiet:true,savePreserved:true});
    s=await snapshot(page);assert.equal(s.hiddenPanes,1);assert.equal(s.presentations,1);assert.equal(s.glints,5);assert.equal(s.underlayPreserved,true);
    const restoredState=await record('quiet-live-restore',page,{result:restored});assert.equal(restoredState.authority.saved,broken.authority.saved,'Quiet restore changed the saved authority.');authoritySnapshots.desktopRestored=restoredState.authority;await capture('broken-restored-desktop');
    await page.getByRole('button',{name:'Tall glass',exact:true}).click();await page.getByRole('button',{name:'Back view',exact:true}).click();assert.equal((await snapshot(page)).back,true);
    authoritySnapshots.desktopFinal=(await record('borderless-back')).authority;await capture('borderless-back');
    const mobile=await browser.newContext({viewport:backend.phoneViewport,deviceScaleFactor:1,isMobile:true,hasTouch:true});
    try{
      if(installed)await mobile.route('**/*',routeFor('phone'));
      const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));phone.on('console',m=>{if(m.type()==='error')errors.push(m.text());});phone.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()});});
      await phone.goto(baseURL+entry+'?mode=clipping');await ready(phone);
      const phoneInitial=await snapshot(phone);assert.equal(phoneInitial.clippedWalls,6);assert.equal(phoneInitial.legacyViewWalls,6);assert.equal(phoneInitial.underlayPreserved,true);
      assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await record('clipping-phone',phone,{viewportFits:true});await capture('clipping-phone',phone);
      await phone.getByRole('button',{name:'Confirm pane break',exact:true}).click();s=await snapshot(phone);assert.equal(s.hiddenPanes,1);assert.equal(s.presentations,1);assert.equal(s.glints,5);const phoneBroken=await record('phone-acknowledged-break',phone);
      await phone.getByRole('button',{name:'Quiet restore',exact:true}).click();s=await snapshot(phone);assert.deepEqual(s.restore,{committed:true,quiet:true,savePreserved:true});assert.equal(s.hiddenPanes,1);assert.equal(s.presentations,1);assert.equal(s.underlayPreserved,true);
      const phoneRestored=await record('phone-quiet-restore',phone);assert.equal(phoneRestored.authority.saved,phoneBroken.authority.saved);authoritySnapshots.phoneRestored=phoneRestored.authority;await capture('broken-restored-phone',phone);
      await phone.evaluate(()=>windowPresenterReview.dispose());
    }finally{await mobile.close();}
    await page.evaluate(()=>windowPresenterReview.dispose());
    assert.deepEqual(captures.map(c=>c.name),NATIVE_WINDOW_CAPTURES);assert.deepEqual(checks.map(c=>c.name),NATIVE_WINDOW_CHECKS);
    if(installed){
      const requested=new Set(allowedRequests.map(r=>r.path)),base=prefix+'node_modules/@nautilus-engine/renderer/';
      installation.nativeModuleRequested=requested.has(base+'packages/native-window-presenter/three.js');
      installation.allNativeModulesRequested=NATIVE_WINDOW_RUNTIME.every(file=>requested.has(base+file));
      assert.equal(installation.nativeModuleRequested,true,'Actual public renderer entry was never requested.');assert.equal(installation.allNativeModulesRequested,true,'Browser did not request the six actual public native modules.');
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
    report={status:'pass',mode,installed,runId,startedAt,inputSha256:inputs.inputSha256,inputs,availability:installed?'actual-declared-core-and-renderer':mode+'-reference-public-module-bytes',backend,captures,checks,
      behaviorSha256:nativeWindowJSONHash(checks),authoritySnapshots,authoritySha256:nativeWindowJSONHash(authoritySnapshots),allowedRequests,errors,failedRequests,installation};
  },{source:source||installed,owner,output,timeoutMs:180000});
}catch(error){write({status:'fail',mode,runId,startedAt,inputSha256:inputs?.inputSha256??null,message:error.message,captures,checks});throw error;}
finally{
  if(stage){
    const actual=fs.realpathSync(stage),allowed=fs.realpathSync(path.join(root,'artifacts'));
    assert.equal(path.dirname(actual),allowed,'Refusing escaped installed browser cleanup.');assert.match(path.basename(actual),/^native-window-presenter-installed-browser-[A-Za-z0-9]{6}$/);
    fs.rmSync(actual,{recursive:true,force:true});assert.equal(fs.existsSync(actual),false,'Installed browser stage remains.');
    if(installation)installation.stageRemoved=true;
  }
}
const helper=JSON.parse(fs.readFileSync(path.join(out,'helper-process.json'))),receipt=JSON.parse(fs.readFileSync(path.join(out,'cleanup-receipt.json')));
assert.equal(helper.owner,owner);assert.equal(receipt.owner,owner);assert.equal(receipt.httpClosed,true);assert.equal(receipt.browserClosed,true);assert.deepEqual(receipt.process,helper.process);assert.deepEqual(receipt.browser,helper.browser);assert.equal(receipt.port,helper.port);
report.completedAt=new Date().toISOString();report.owner=owner;report.helperStartedAt=helper.startedAt;report.cleanup={receiptSha256:nativeWindowSha(fs.readFileSync(path.join(out,'cleanup-receipt.json'))),httpClosed:true,browserClosed:true,port:receipt.port};
write(report);console.log(JSON.stringify({status:'pass',mode,inputSha256:inputs.inputSha256,captures:captures.length,checks:checks.length,availability:report.availability,output}));
