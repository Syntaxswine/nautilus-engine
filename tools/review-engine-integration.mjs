import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
const owner=process.env.CODEX_THREAD_ID||'manual-isolated-review';
const sourceCommit=execFileSync('git',['-c','safe.directory='+projectRoot.replaceAll('\\','/'),'-C',projectRoot,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
const buildProvenanceSha256=createHash('sha256').update(fs.readFileSync(path.join(projectRoot,'dist/build-provenance.json'))).digest('hex');
const assert=(ok,message)=>{if(!ok)throw Error(message);};
// The load bound. The editor loads in at most 3.6 s on a quiet machine and 6.2 s under 16 busy loops
// (docs/reviews/evidence/hostile-review-round-4/answer/load-latency.json); Playwright's default is 30 s.
const LOAD_MS=20000;
await withArtReview('Combined Engine 0.5 editor acceptance',async({page,baseURL,out,browser,errors,failedRequests})=>{
  page.on('dialog',dialog=>dialog.accept());
  // A wait that fails first asks whether the page still answers, so that an editor whose main thread is
  // stuck, as in an observer that re-triggers itself, is reported as frozen rather than as a timeout.
  const answers=()=>Promise.race([page.evaluate(()=>true).then(()=>true,()=>true),new Promise(resolve=>setTimeout(resolve,5000,false))]);
  const bounded=async(what,step)=>{try{return await step;}catch(error){if(!await answers())throw Error('The editor froze while '+what+': its page stopped answering.');const state=await page.evaluate(()=>({status:document.getElementById('status')?.textContent,feedback:[...document.querySelectorAll('#nautilus-settings-feedback')].map(node=>node.textContent),loading:window.editor3d?.loading})).catch(failure=>({unreadable:failure.message.split('\n')[0]}));throw Error('Failed while '+what+': '+JSON.stringify(state)+'. '+error.message.split('\n')[0]);}};
  const feedbacks=async when=>{const count=await page.locator('#nautilus-settings-feedback').count();assert(count===1,'Expected one settings feedback '+when+', found '+count+'.');};
  await page.emulateMedia({reducedMotion:'reduce'});
  const capture=async file=>{console.log('Capturing '+file);await page.screenshot({path:path.join(out,file),animations:'disabled',timeout:60000});};
  await page.setViewportSize({width:1280,height:900});
  await bounded('loading',page.goto(baseURL+'/',{waitUntil:'networkidle',timeout:LOAD_MS}));
  await bounded('loading',page.waitForFunction(()=>window.editor3d?.document&&!window.editor3d.loading&&!document.getElementById('nautilus-buildings').disabled,null,{timeout:LOAD_MS}));
  await feedbacks('after loading');
  const initial=await page.evaluate(()=>({version:document.querySelector('.engine-version').textContent,diagnostics:window.editor3d.scene.diagnostics,renderer:window.editor3d.scene.renderer.getContext().getParameter(0x1F01)}));
  assert(!initial.diagnostics.length,'Initial scene diagnostics: '+initial.diagnostics.join(';'));
  const schemaFiles=await page.evaluate(async()=>{const core=await import('/packages/map-core/index.js');return Promise.all(core.schemaDocuments().map(async entry=>{const response=await fetch(entry.url);return {id:entry.id,ok:response.ok&&((await response.json()).$id===entry.uri)};}));});
  assert(schemaFiles.every(file=>file.ok),'Published schema URLs are incomplete.');
  await page.evaluate(async()=>{const core=await import('/packages/map-core/index.js');await window.nautilus.open(core.blankMap('Expanded library acceptance'));});
  await page.locator('#nautilus-buildings').click();
  await page.locator('#building-library').waitFor({state:'visible'});
  await page.locator('#building-use').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('building-use').disabled);
  const inventory=await page.locator('#building-count').innerText();
  assert(await page.locator('#building-results button').count()===64,'Expected 61 assemblies + 3 editable stamps: '+inventory);
  await page.locator('.building-generator > summary').click();
  await page.locator('#building-seed').fill('Architect settlement acceptance');
  await page.locator('#building-number').fill('6');
  await page.locator('#building-plan').click();
  await page.waitForFunction(()=>!document.getElementById('building-generate').disabled);
  await capture('layout-preview.png');
  await page.locator('#building-generate').click();
  await page.waitForFunction(()=>!document.getElementById('building-library').open&&!window.editor3d.loading&&window.editor3d.document.map.buildingPrefabs?.instances.length===6);
  const generated=await page.evaluate(()=>window.editor3d.export());
  await page.locator('#undo').click();await page.waitForFunction(()=>!window.editor3d.document.map.buildingPrefabs?.instances.length&&!window.editor3d.loading);
  await page.locator('#redo').click();await page.waitForFunction(()=>window.editor3d.document.map.buildingPrefabs?.instances.length===6&&!window.editor3d.loading);
  assert(await page.evaluate(()=>window.editor3d.export())===generated,'Undo/redo changed seeded layout bytes.');
  const wall=await page.evaluate(async()=>{const r=await window.editor3d.apply({tool:'wall-run',start:{x:135,y:45,z:0},end:{x:146,y:56,z:0},options:{exact:true,stories:2,material:'brick'}});return {ok:r.ok,error:r.error};});
  assert(wall.ok,'Distant wall failed: '+wall.error);await feedbacks('after a wall edit');
  const rejection=await page.evaluate(async()=>{const doc=window.editor3d.document,b=doc.map.buildingPrefabs.instances[0],before=doc.export(),undo=doc.editor.undo.length,revision=doc.revision;const r=await window.editor3d.apply({tool:'wall-run',start:{x:b.x,y:b.y,z:0},end:{x:b.x+2,y:b.y+2,z:0},options:{exact:true,stories:1,material:'wood'}});return {ok:r.ok,error:r.error,unchanged:before===doc.export()&&undo===doc.editor.undo.length&&revision===doc.revision};});
  assert(!rejection.ok&&rejection.unchanged,'Overlapping wall changed the building map.');
  // Drive one roof through the actual authoring controls, then exercise the
  // same controller for the two other deterministic styles.
  await page.locator('[data-group="roofs"]').click();
  await page.locator('#tool-mode').selectOption('sloped-roof');
  await page.locator('#roof-exact > summary').click();
  const setRoof=async(id,value)=>{const field=page.locator('#'+id);if(await field.evaluate(el=>el.tagName==='SELECT'))await field.selectOption(String(value));else await field.fill(String(value));};
  for(const [id,value]of Object.entries({'roof-x':165,'roof-y':80,'roof-width':12,'roof-depth':8,'roof-eaves':1,'roof-style':'gable','roof-axis':'x','roof-pitch':35,'roof-overhang':.3,'roof-material':'slate','roof-seed':42}))await setRoof(id,value);
  const roofBefore=await page.evaluate(()=>window.editor3d.export());
  await page.locator('#roof-preview-exact').click();
  await page.waitForFunction(()=>!document.getElementById('roof-place-exact').disabled);
  assert(await page.evaluate(()=>window.editor3d.export())===roofBefore,'Roof preview mutated the map.');
  await page.locator('#roof-place-exact').click();
  await page.waitForFunction(()=>window.editor3d.document.map.slopedRoofs?.roofs.length===1&&!window.editor3d.loading);
  const oneRoof=await page.evaluate(()=>window.editor3d.export());
  await page.locator('#undo').click();await page.waitForFunction(()=>!window.editor3d.document.map.slopedRoofs?.roofs.length&&!window.editor3d.loading);
  await page.locator('#redo').click();await page.waitForFunction(()=>window.editor3d.document.map.slopedRoofs?.roofs.length===1&&!window.editor3d.loading);
  assert(await page.evaluate(()=>window.editor3d.export())===oneRoof,'Roof undo/redo changed its portable data.');
  const extraRoofs=await page.evaluate(async()=>{const results=[];for(const [x,style,axis,direction,material]of [[185,'hip','x',1,'clay'],[205,'shed','y',-1,'metal']]){const result=await window.editor3d.apply({tool:'sloped-roof',options:{exact:true,x,y:80,width:12,depth:8,eaves:1,style,axis,direction,pitch:35,overhang:.3,material,seed:42}});results.push({ok:result.ok,error:result.error});}return results;});
  assert(extraRoofs.every(result=>result.ok),'Additional roof styles failed: '+JSON.stringify(extraRoofs));
  await page.waitForFunction(()=>{const models=window.editor3d.scene.slopedRoofs?.models;return (models?.size??models?.length??0)===3;});
  const roofRejection=await page.evaluate(async()=>{const doc=window.editor3d.document,b=doc.map.buildingPrefabs.instances[0],before=doc.export(),history=doc.editor.undo.length,revision=doc.revision;const result=await window.editor3d.apply({tool:'sloped-roof',options:{exact:true,x:b.x+.5,y:b.y+.5,width:2,depth:2,eaves:1,style:'gable',axis:'x',direction:1,pitch:35,overhang:0,material:'slate',seed:42}});return {ok:result.ok,error:result.error,unchanged:doc.export()===before&&doc.editor.undo.length===history&&doc.revision===revision};});
  assert(!roofRejection.ok&&roofRejection.unchanged,'A roof overlapping a whole-building lot changed the map.');
  await page.evaluate(()=>{Object.assign(window.editor3d.view,{x:190,y:84,span:78,preset:'0'});window.editor3d.scene.changed();});
  await capture('procedural-roofs.png');
  await page.locator('#settings-button').click();await page.locator('#save-map').click();
  await bounded('saving in this browser',page.waitForFunction(()=>document.getElementById('nautilus-settings-feedback').textContent.includes('Saved in this browser'),null,{timeout:10000}));
  const savedId=await page.locator('#saved-designs').inputValue();assert(savedId,'Browser save has no ID.');
  const saved=await page.evaluate(()=>window.editor3d.export());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
  const exported=path.join(out,'mixed-map-roundtrip.json');await download.saveAs(exported);assert(fs.readFileSync(exported,'utf8')===saved,'Export bytes changed.');
  const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('label.file').click()]);await chooser.setFiles(exported);
  await page.waitForFunction(()=>!window.editor3d.loading&&window.editor3d.document.map.buildingPrefabs?.instances.length===6&&window.editor3d.document.map.wallRuns?.segments.length===1);
  assert(await page.evaluate(()=>window.editor3d.export())===saved,'Import bytes changed.');
  if(!await page.locator('#editor-settings').evaluate(el=>el.open))await page.locator('#settings-button').click();await page.locator('#saved-designs').selectOption(savedId);await page.locator('#load-map').click();
  await page.waitForFunction(()=>!window.editor3d.loading&&window.editor3d.document.libraryId);
  await page.locator('#close-settings').click();assert(await page.evaluate(()=>window.editor3d.export())===saved,'Browser save/reload changed references.');
  await page.evaluate(()=>{Object.assign(window.editor3d.view,{x:82,y:72,span:155,preset:'0'});window.editor3d.scene.changed();});
  await capture('editor-desktop.png');
  await page.locator('#nautilus-buildings').click();await page.locator('#building-search').fill('Bramble');
  await page.locator('#building-results [data-asset="bramble-ranch"]').click();await page.waitForFunction(()=>!document.getElementById('building-use').disabled);
  await page.locator('#building-floor').selectOption('0');await capture('original-interior.png');
  const originalDescription=await page.locator('#building-description').innerText();assert(!/\bfurnished\s+interiors?\b/i.test(originalDescription),'Original models incorrectly described as furnished.');
  await page.locator('#building-search').fill('Albany');await page.locator('#building-results [data-asset="albany-cottage"]').click();await page.waitForFunction(()=>!document.getElementById('building-use').disabled);
  await capture('gross-preview.png');await page.locator('#building-close').click();
  for(let i=0;i<2;i++){
    await page.locator('#nautilus-assets').click();await page.locator('#asset-search').fill('lathe');await page.locator('#asset-results button').first().click();await page.waitForFunction(()=>!document.getElementById('asset-use').disabled);await page.locator('#asset-close').click();
  }
  await page.setViewportSize({width:390,height:844});
  const narrow=await page.evaluate(()=>({pageOverflow:document.documentElement.scrollWidth>innerWidth,header:document.querySelector('.nautilus-header').getBoundingClientRect().toJSON()}));assert(!narrow.pageOverflow,'Mobile workshop overflows.');
  await page.locator('#nautilus-buildings').click();await page.waitForFunction(()=>!document.getElementById('building-use').disabled);
  const modal=await page.locator('#building-library').evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));
  assert(modal.left>=-1&&modal.right<=391&&modal.top>=-1&&modal.bottom<=845,'Mobile building modal is outside the viewport.');
  await capture('editor-mobile-library.png');await page.locator('#building-close').click();
  // The game handoff, through the Send button and through window.nautilus.sendToGame() with and
  // without a map. Each click must find Send enabled and must change the status; the result quotes it.
  const handoff=()=>page.evaluate(()=>({connected:window.nautilus.hasGameAdapter,disabled:document.getElementById('playtest').disabled,status:document.getElementById('status').textContent,feedback:document.getElementById('nautilus-settings-feedback').textContent}));
  const send=async()=>{
    const before=await handoff();assert(!before.disabled,'Send is disabled with a host connected: '+JSON.stringify(before));
    await page.locator('#playtest').click();
    await page.waitForFunction(previous=>{const text=document.getElementById('status').textContent;return text!==previous&&!text.startsWith('Sending map');},before.status,{timeout:10000}).catch(async()=>{if(!await answers())throw Error('The editor froze after a Send click: its page stopped answering.');throw Error('Send left the status unchanged: '+JSON.stringify(await handoff()));});
    const after=await handoff();assert(after.feedback===after.status,'Settings feedback does not show the status: '+JSON.stringify(after));return after.status;
  };
  const sendToGame=json=>page.evaluate(async json=>{try{await window.nautilus.sendToGame(...(json===undefined?[]:[json]));return {sent:true};}catch(error){return {error:error.message};}},json);
  const idle=await handoff();assert(!idle.connected,'The page reports a host before any connected: '+JSON.stringify(idle));assert(idle.disabled,'Send is enabled with no host connected: '+JSON.stringify(idle));
  await page.evaluate(async()=>{const core=await import('/packages/map-core/index.js'),manifest=core.engineManifest();manifest.id='acceptance-versioned-host';manifest.capabilities=manifest.capabilities.filter(feature=>feature.id!==core.ROOF_FEATURE);window.manifestHostCalls=0;window.manifestDisconnect=window.nautilus.connectGame({manifest,openMap(){window.manifestHostCalls++;}});});
  await page.locator('#settings-button').click();
  const versioned={click:await send(),sendToGame:await sendToGame()};
  assert(await page.evaluate(()=>window.manifestHostCalls)===0,'Versioned host missing roof support was called.');
  assert(versioned.click.includes('nautilus-sloped-roofs-v1')&&versioned.sendToGame.error?.includes('nautilus-sloped-roofs-v1'),'The host without roofs was not refused for roofs: '+JSON.stringify(versioned));
  await page.locator('#close-settings').click();await page.evaluate(()=>window.manifestDisconnect());
  await page.evaluate(()=>{window.integrationHostChecks={calls:0,received:[]};window.integrationDisconnect=window.nautilus.connectGame({features:['nautilus-wall-runs-v1','nautilus-building-prefabs-v1','nautilus-sloped-roofs-v1'],openMap(){window.integrationHostChecks.calls++;}});});
  await page.locator('#settings-button').click();
  const listed={click:await send(),sendToGame:await sendToGame()};
  assert(await page.evaluate(()=>window.integrationHostChecks.calls)===0,'Unsupported host was called.');
  assert(listed.click.includes('nautilus-original-buildings-v1')&&listed.sendToGame.error?.includes('nautilus-original-buildings-v1'),'The host without original buildings was not refused for them: '+JSON.stringify(listed));
  await page.evaluate(()=>{window.integrationDisconnect();window.integrationDisconnect=window.nautilus.connectGame({features:['nautilus-wall-runs-v1','nautilus-building-prefabs-v1','nautilus-original-buildings-v1','nautilus-sloped-roofs-v1'],async openMap({json,contract}){await Promise.resolve();const map=JSON.parse(json);window.integrationHostChecks.calls++;window.integrationHostChecks.received.push({name:map.name,buildings:map.buildingPrefabs?.instances.length,current:json===window.editor3d.export()});window.integrationHostChecks.buildings??=map.buildingPrefabs.instances.length;window.integrationHostChecks.contract=contract.optionalFeatures;}});});
  const sent={click:await send(),sendToGame:await sendToGame()};
  sent.explicit=await sendToGame(await page.evaluate(()=>{const map=JSON.parse(window.editor3d.export());map.name='Explicit acceptance map';return JSON.stringify(map);}));
  const host=await page.evaluate(()=>window.integrationHostChecks);
  assert(sent.click.startsWith('Map sent')&&sent.sendToGame.sent&&sent.explicit.sent,'The capable host was refused: '+JSON.stringify(sent));
  assert(host.calls===3&&host.buildings===6&&JSON.stringify(host.received.map(call=>[call.buildings,call.current]))==='[[6,true],[6,true],[6,false]]'&&host.received[2].name==='Explicit acceptance map','Declared asynchronous local host handoff failed: '+JSON.stringify(host));
  // A host that answers only when the acceptance releases it. While it works the status must still say that
  // the map is being sent; then it must report the answer, and a host that rejects must have its message shown.
  await page.evaluate(()=>{window.integrationDisconnect();window.manualHost={calls:0};window.integrationDisconnect=window.nautilus.connectGame({features:['nautilus-wall-runs-v1','nautilus-building-prefabs-v1','nautilus-original-buildings-v1','nautilus-sloped-roofs-v1'],openMap(){window.manualHost.calls++;return new Promise((resolve,reject)=>{window.manualHost.answer={resolve,reject};});}});});
  const working=async calls=>{
    const before=await handoff();assert(!before.disabled,'Send is disabled with a host connected: '+JSON.stringify(before));
    await page.locator('#playtest').click();await bounded('waiting for the host to be called',page.waitForFunction(calls=>window.manualHost.calls===calls,calls,{timeout:10000}));
    const state=await handoff();assert(state.status.startsWith('Sending map')&&state.feedback===state.status,'Send did not wait for the host: '+JSON.stringify(state));return state.status;
  };
  const manual={working:await working(1)};
  await page.evaluate(()=>window.manualHost.answer.resolve());
  await bounded('waiting for the host to answer',page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Map sent'),null,{timeout:10000}));
  manual.answered=(await handoff()).status;manual.refusing=await working(2);
  await page.evaluate(()=>window.manualHost.answer.reject(Error('The acceptance host refused this map.')));
  await bounded('waiting for the host to refuse',page.waitForFunction(()=>document.getElementById('status').textContent==='The acceptance host refused this map.',null,{timeout:10000}));
  manual.refused=await handoff();assert(manual.refused.feedback===manual.refused.status,'Settings feedback does not show the refusal: '+JSON.stringify(manual));
  await page.locator('#close-settings').click();await page.evaluate(()=>window.integrationDisconnect());
  const closed=await handoff();assert(!closed.connected,'The page still reports a host after it disconnected: '+JSON.stringify(closed));assert(closed.disabled,'Send is still enabled after the host disconnected: '+JSON.stringify(closed));
  await feedbacks('after the handoff');
  const final=await page.evaluate(async()=>{const core=await import('/packages/map-core/index.js');return {buildings:window.editor3d.document.map.buildingPrefabs.instances.length,walls:window.editor3d.document.map.wallRuns.segments.length,roofs:window.editor3d.document.map.slopedRoofs.roofs.length,features:core.requiredMapFeatures(window.editor3d.document.map),diagnostics:window.editor3d.scene.diagnostics,memory:window.editor3d.scene.renderer.info.memory,drawCalls:window.editor3d.scene.renderer.info.render.calls};});
  assert(!final.diagnostics.length,'Final scene reports missing assets.');
  assert(final.features.includes('nautilus-original-buildings-v1'),'Original feature is absent.');
  assert(final.features.includes('nautilus-sloped-roofs-v1')&&final.roofs===3,'Roof capability or saved geometry is absent.');
  const captures=fs.readdirSync(out).filter(n=>n.endsWith('.png')).map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')}));
  const record={sourceCommit,buildProvenanceSha256,host,versionedUnsupportedHostRejected:true,handoff:{idle,versioned,listed,sent,manual,closed},browser:browser.version(),renderer:'Isolated software WebGL; correctness only, no performance claim',initial,schemaFiles,inventory,seededBuildings:6,proceduralRoofs:3,roofPreview:true,roofUndoRedo:true,roofRejection,undoRedo:true,distantWall:wall,overlapRejection:rejection,saveReload:true,jsonRoundtrip:true,assetCloseReopen:2,desktop:{width:1280,height:900},mobile:{width:390,height:844,...narrow,modal},final,errors,failedRequests,captures};
  fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(record,null,2));console.log(JSON.stringify(record));
},{owner,output:'engine-integration',timeoutMs:300000});
