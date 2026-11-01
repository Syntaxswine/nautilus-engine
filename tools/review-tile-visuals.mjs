// Draft for tools/review-tile-visuals.mjs. Root runs after public registration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {withArtReview,projectRoot as root} from './art-review-browser.mjs';
import {packProfile} from './distribution.mjs';
import {TILE_VISUAL_BINDINGS,TILE_VISUAL_RUNTIME,TILE_VISUAL_SUPPORT,TILE_VISUAL_EXAMPLES,TILE_VISUAL_ATLAS,TILE_VISUAL_CAPTURES,TILE_VISUAL_CHECKS,tileVisualReviewInputs,tileVisualRegularFile,tileVisualSha,tileVisualJSONHash,tileVisualPlayerHTML,tileVisualInstalledPolicy,tileVisualInstalledRequestAllowed,assertTileVisualSnapshot,slash} from './tile-visual-review-inputs.mjs';

assert.ok(!(process.argv.includes('--source')&&process.argv.includes('--installed')));
const installed=process.argv.includes('--installed'),source=process.argv.includes('--source'),mode=installed?'installed':source?'source':'built';
const owner=process.env.CODEX_THREAD_ID||'01a18107-b4af-78c0-850f-0235d4df307f',output='tile-visuals-'+mode,out=path.join(root,'artifacts',output);
const startedAt=new Date().toISOString(),runId=randomUUID(),captures=[],checks=[],allowedRequests=[],atlasResponses=[];
fs.mkdirSync(out,{recursive:true});
const write=value=>fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(value,null,2)+'\n');
write({status:'pending',mode,runId,startedAt});
let inputs=null,stage=null,prefix=null,installation=null,report=null,entry='/examples/canonical-tile-art.html';
function npm(args,cwd){
  const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));
  assert.ok(cli);return execFileSync(process.execPath,[cli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,timeout:120000});
}
function prepareInstalled(){
  stage=fs.mkdtempSync(path.join(root,'artifacts/tile-visuals-installed-browser-'));prefix='/artifacts/'+path.basename(stage)+'/';
  const player=path.join(stage,'player');fs.mkdirSync(player);
  const packs={core:packProfile('core'),renderer:packProfile('renderer')};
  fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'actual-public-tile-browser-proof',private:true,type:'module'}));
  npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',packs.core.file,packs.renderer.file],stage);
  const roots=Object.fromEntries(['core','renderer'].map(profile=>[profile,path.join(stage,'node_modules/@nautilus-engine',profile)]));
  const manifests=Object.fromEntries(Object.entries(roots).map(([profile,directory])=>{assert.equal(fs.lstatSync(directory).isSymbolicLink(),false);assert.ok(fs.realpathSync(directory).startsWith(fs.realpathSync(stage)+path.sep));const pkg=JSON.parse(tileVisualRegularFile(directory,'package.json'));assert.equal(pkg.name,'@nautilus-engine/'+profile);return [profile,pkg];}));
  const installedFiles=[],seen=new Set();
  function checkFile(profile,file){
    const key=profile+'/'+file;if(seen.has(key))return;seen.add(key);assert.ok(manifests[profile].files.includes(file),'Installed whitelist omits '+key);
    const bytes=tileVisualRegularFile(roots[profile],file),expected=tileVisualRegularFile(root,file);assert.ok(bytes.equals(expected),'Installed public bytes differ: '+key);
    installedFiles.push({profile,file,bytes:bytes.length,sha256:tileVisualSha(bytes)});
  }
  for(const [profile,files]of Object.entries(inputs.byProfile))for(const file of files)checkFile(profile,file);
  for(const profile of ['core','renderer'])for(const file of TILE_VISUAL_SUPPORT)checkFile(profile,file);
  checkFile('renderer',TILE_VISUAL_ATLAS);
  for(const profile of ['core','renderer']){
    const provenance=JSON.parse(tileVisualRegularFile(roots[profile],'package-provenance.json'));assert.equal(provenance.profile,profile);
    for(const file of installedFiles.filter(file=>file.profile===profile)){const record=provenance.files.find(row=>row.path===file.file);assert.ok(record,'Missing installed provenance '+file.file);assert.equal(record.bytes,file.bytes);assert.equal(record.sha256,file.sha256);}
  }
  for(const binding of inputs.bindings)assert.equal(manifests[binding.profile].exports[binding.entry],'./'+binding.file,'Actual public export absent: '+binding.specifier);
  fs.copyFileSync(path.join(root,'examples/canonical-tile-art.js'),path.join(player,'canonical-tile-art.js'));
  fs.writeFileSync(path.join(player,'canonical-tile-art.html'),tileVisualPlayerHTML(tileVisualRegularFile(root,'examples/canonical-tile-art.html').toString(),inputs.bindings));
  assert.deepEqual(fs.readdirSync(player).sort(),[...TILE_VISUAL_EXAMPLES].sort());
  installation={availability:'actual-declared-core-and-renderer',registered:true,bindings:inputs.bindings,policy:tileVisualInstalledPolicy(prefix),
    packages:Object.fromEntries(Object.entries(packs).map(([profile,pack])=>[profile,{name:pack.name,version:pack.version,archiveSha256:tileVisualSha(fs.readFileSync(pack.file))}])),
    installedFiles:installedFiles.sort((a,b)=>(a.profile+'/'+a.file).localeCompare(b.profile+'/'+b.file)),
    playerFiles:TILE_VISUAL_EXAMPLES.map(name=>{const bytes=fs.readFileSync(path.join(player,name));return {name,bytes:bytes.length,sha256:tileVisualSha(bytes)};}),
    allPublicBindingsRequested:false,allProviderRuntimeRequested:false,atlasRequested:false,stageRemoved:false};
  entry=prefix+'player/canonical-tile-art.html';
}
try{
  inputs=tileVisualReviewInputs();
  if(mode==='built')for(const file of inputs.browserFiles)assert.ok(tileVisualRegularFile(path.join(root,'dist'),file).equals(tileVisualRegularFile(root,file)),'Built tile input is stale: '+file);
  if(installed)prepareInstalled();
  await withArtReview('Canonical tile surfaces: '+mode+' public-package desktop/phone proof',async({page,context,browser,baseURL,errors,failedRequests})=>{
    const backend={channel:process.env.NAUTILUS_REVIEW_CHANNEL||(process.platform==='win32'?'msedge':'chromium'),browser:browser.browserType().name(),version:browser.version(),platform:process.platform,architecture:process.arch,desktopViewport:{width:1600,height:1100},phoneViewport:{width:390,height:844},phoneMode:'same-context viewport proof; not a device benchmark',deviceScaleFactor:1};
    const assetPath=installed?installation.policy.atlasPath:'/'+TILE_VISUAL_ATLAS,pending=[];
    if(installed)await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url()),record={path:url.pathname,search:url.search,method:request.method(),resourceType:request.resourceType(),local:url.origin===baseURL};if(record.local&&tileVisualInstalledRequestAllowed(record,prefix)){allowedRequests.push(record);return route.continue();}errors.push('Installed tile request escaped actual public packages/player: '+url.pathname);return route.abort();});
    page.on('response',response=>{if(new URL(response.url()).pathname!==assetPath)return;const job=(async()=>{assert.equal(response.status(),200,'Painted atlas HTTP response failed.');const bytes=await response.body();assert.equal(bytes.length,inputs.atlas.bytes);assert.equal(tileVisualSha(bytes),inputs.atlas.sha256,'Browser received a different painted atlas.');const record={resource:TILE_VISUAL_ATLAS,bytes:bytes.length,sha256:tileVisualSha(bytes),status:response.status()};if(!atlasResponses.some(row=>row.sha256===record.sha256))atlasResponses.push(record);})();job.catch(()=>{});pending.push(job);});
    const snapshot=async({retired=false}={})=>{const value=await page.evaluate(()=>{if(typeof canonicalTileArt.proofSnapshot!=='function')throw Error('Missing read-only tile proofSnapshot seam.');return canonicalTileArt.proofSnapshot();});return assertTileVisualSnapshot(value,{retired});};
    async function check(name,value,details={}){checks.push({name,status:'pass',snapshot:value,...details});return value;}
    async function capture(name){
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      const value=await snapshot(),file=path.join(out,name+'.png');await page.locator('#stage').screenshot({path:file});const bytes=fs.readFileSync(file);
      captures.push({name,file:slash(path.relative(root,file)),bytes:bytes.length,sha256:tileVisualSha(bytes),capturedAt:new Date().toISOString(),stateSha256:tileVisualJSONHash(value)});
    }
    async function show(name,options){await page.evaluate(async args=>canonicalTileArt.show(args.name,args.options),{name,options});const value=await snapshot();assert.equal(value.controls.scene,name);return value;}
    async function waitForProjection(scene,detail,detailsByInstance={}){await page.waitForFunction(({scene,detail,detailsByInstance})=>{const state=canonicalTileArt.proofSnapshot(),ids=JSON.parse(state.bundleJSON).layout.instances.map(instance=>instance.id).sort();return state.controls.scene===scene&&state.controls.detail===detail&&Array.isArray(state.projectionEntries)&&JSON.stringify(state.projectionEntries.map(entry=>entry.instanceId).sort())===JSON.stringify(ids)&&state.projectionEntries.every(entry=>entry.detail===(Object.hasOwn(detailsByInstance,entry.instanceId)?detailsByInstance[entry.instanceId]:detail));},{scene,detail,detailsByInstance});}
    await page.setViewportSize(backend.desktopViewport);await page.goto(baseURL+entry);await page.waitForFunction(()=>canonicalTileArt?.ready);
    for(const scene of ['yard','fields','seam','holes','material-shared','material-faces']){
      const value=await show(scene),diagnostics=await page.evaluate(()=>canonicalTileArt.diagnostics());assert.ok(diagnostics.calls);assert.equal(diagnostics.sourcePreserved,true);
      if(scene==='yard'){const pathRecipe=JSON.parse(value.bundleJSON).recipes.find(recipe=>recipe.id==='path');assert.equal(pathRecipe.shape.path.kind,'cubic');assert.deepEqual(pathRecipe.shape.path.points[1],[2.123456789,5.0000000001,0]);assert.equal(pathRecipe.shape.widthM,.85);}
      if(scene==='fields')assert.equal(value.provider.instances,18);
      if(scene==='holes')assert.equal(value.provider.instances,2);
      if(scene.startsWith('material-')){assert.equal(diagnostics.materialAudit.boundaryEdges,192);assert.equal(diagnostics.materialAudit.violations,0);assert.equal(value.provider.instances,24);}
      await check(scene,value,{materialAudit:diagnostics.materialAudit});await capture(scene);
    }
    let lowFields,highFields;
    for(const detail of [0,2]){const value=await show('fields',{detail});assert.equal(value.controls.detail,detail);assert.ok(value.projectionEntries.every(entry=>entry.detail===detail));await check('fields-detail-'+detail,value);await capture('fields-detail-'+detail);if(detail===0)lowFields=value;else highFields=value;}
    assert.equal(lowFields.bundleJSON,highFields.bundleJSON);assert.deepEqual(lowFields.interfaces,highFields.interfaces,'Detail changed an authoritative canonical schedule.');assert.ok(highFields.provider.triangles>lowFields.provider.triangles);
    await show('seam');await page.getByRole('button',{name:'Toggle canonical boundaries'}).click();await page.waitForFunction(()=>{const state=canonicalTileArt.proofSnapshot();return state.controls.boundaries===true&&state.boundaryLines===state.interfaces.length;});
    const seam=await snapshot(),a=seam.interfaces.find(edge=>edge.instanceId==='a'&&edge.record.id==='east'),b=seam.interfaces.find(edge=>edge.instanceId==='b'&&edge.record.id==='west');
    assert.ok(a&&b);assert.equal(a.record.worldEdgeId,b.record.worldEdgeId);assert.deepEqual(a.attributes,b.attributes,'Mixed-detail seam buffers differ.');
    await check('seam-boundaries',seam);await capture('seam-boundaries');
    const before=await page.evaluate(()=>canonicalTileArt.diagnostics());await page.getByRole('button',{name:'Reopen canonical bundle'}).click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('bundle reopened'));
    const after=await page.evaluate(()=>canonicalTileArt.diagnostics()),reopened=await snapshot();assert.equal(before.canonicalSamples,after.canonicalSamples);assert.equal(before.triangles,after.triangles);assert.equal(reopened.bundleJSON,seam.bundleJSON);assert.deepEqual(reopened.interfaces,seam.interfaces);await check('canonical-reopen',reopened);
    await page.getByRole('button',{name:'Remove first chunk'}).click();const remaining=await page.evaluate(()=>canonicalTileArt.diagnostics()),removed=await snapshot();assert.equal(remaining.instances,1);assert.ok(remaining.canonicalSamples);assert.equal(removed.bundleJSON,reopened.bundleJSON,'Presentation removal changed canonical saved intent.');assert.deepEqual(removed.interfaces,reopened.interfaces.filter(edge=>edge.instanceId==='b'),'Chunk removal changed the surviving boundary.');await check('chunk-removal',removed);
    await page.locator('#scene').selectOption('yard');await waitForProjection('yard',2);
    await page.locator('#detail').selectOption('0');await waitForProjection('yard',0);const heldLow=await snapshot();
    await page.locator('#detail').selectOption('2');await waitForProjection('yard',2);const heldHigh=await snapshot();assert.deepEqual([...new Set(JSON.parse(heldHigh.bundleJSON).recipes.map(recipe=>recipe.shape.kind))].sort(),['field-cell','profile-sweep','region']);assert.equal(heldLow.bundleJSON,heldHigh.bundleJSON);assert.deepEqual(heldLow.interfaces,heldHigh.interfaces);assert.ok(heldHigh.provider.triangles>heldLow.provider.triangles);
    await page.locator('#scene').selectOption('seam');await waitForProjection('seam',2,{a:0,b:2});const held=await snapshot();assert.equal(held.controls.detail,2);assert.equal(held.controls.boundaries,true);await check('held-controls',held,{sceneSelect:true,detailSelect:true,boundaryToggleHeld:true});
    await page.setViewportSize(backend.phoneViewport);await show('yard');await page.locator('#stage').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const phone=await snapshot();assert.equal(phone.controls.scene,'yard');await check('phone',phone,{viewportFits:true});await capture('phone');
    await page.evaluate(()=>canonicalTileArt.close());const retired=await snapshot({retired:true});assert.equal(retired.bundleJSON,phone.bundleJSON);await page.evaluate(()=>canonicalTileArt.close());assert.deepEqual(await snapshot({retired:true}),retired);await check('retirement',retired,{repeatedCloseQuiet:true});
    const assets=await Promise.allSettled(pending);for(const result of assets)if(result.status==='rejected')throw result.reason;
    assert.ok(atlasResponses.length>0,'The browser never received the exact painted atlas.');
    assert.deepEqual(checks.map(row=>row.name),TILE_VISUAL_CHECKS);assert.deepEqual(captures.map(row=>row.name),TILE_VISUAL_CAPTURES);
    if(installed){
      const requested=new Set(allowedRequests.map(request=>request.path));
      installation.allPublicBindingsRequested=inputs.bindings.every(binding=>requested.has(prefix+'node_modules/'+binding.package+'/'+binding.file));
      installation.allProviderRuntimeRequested=TILE_VISUAL_RUNTIME.every(file=>inputs.bindings.some(binding=>requested.has(prefix+'node_modules/'+binding.package+'/'+file)));
      installation.atlasRequested=requested.has(assetPath);assert.equal(installation.allPublicBindingsRequested,true);assert.equal(installation.allProviderRuntimeRequested,true);assert.equal(installation.atlasRequested,true);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
    report={status:'pass',mode,installed,runId,startedAt,inputSha256:inputs.inputSha256,inputs,availability:installed?'actual-declared-core-and-renderer':mode+'-reference-public-module-bytes',backend,captures,checks,behaviorSha256:tileVisualJSONHash(checks),finalCanonicalJSON:retired.bundleJSON,finalStateSha256:tileVisualJSONHash(retired),atlasResponses,allowedRequests,errors,failedRequests,installation,
      scope:'Native flat surfaces only. Canonical source is the save authority; presentation caches and gameplay query/support/navigation/fire remain unbound.'};
  },{source:source||installed,owner,output,timeoutMs:180000});
}catch(error){write({status:'fail',mode,runId,startedAt,inputSha256:inputs?.inputSha256??null,message:error.message,captures,checks});throw error;}
finally{
  if(stage){const actual=fs.realpathSync(stage),allowed=fs.realpathSync(path.join(root,'artifacts'));assert.equal(path.dirname(actual),allowed);assert.match(path.basename(actual),/^tile-visuals-installed-browser-[A-Za-z0-9]{6}$/);fs.rmSync(actual,{recursive:true,force:true});assert.equal(fs.existsSync(actual),false);if(installation)installation.stageRemoved=true;}
}
const helper=JSON.parse(fs.readFileSync(path.join(out,'helper-process.json'))),bytes=fs.readFileSync(path.join(out,'cleanup-receipt.json')),receipt=JSON.parse(bytes);
assert.equal(helper.owner,owner);assert.equal(receipt.owner,owner);assert.equal(receipt.httpClosed,true);assert.equal(receipt.browserClosed,true);assert.deepEqual(helper.process,receipt.process);assert.deepEqual(helper.browser,receipt.browser);assert.equal(helper.port,receipt.port);
report.completedAt=new Date().toISOString();report.owner=owner;report.helperStartedAt=helper.startedAt;report.cleanup={receiptSha256:tileVisualSha(bytes),httpClosed:true,browserClosed:true,port:receipt.port};write(report);
console.log(JSON.stringify({status:'pass',mode,inputSha256:inputs.inputSha256,captures:captures.length,checks:checks.length,availability:report.availability,output}));
