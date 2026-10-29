import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
import {openWorld} from '../packages/world-core/index.js';

const sha=data=>createHash('sha256').update(data).digest('hex');
const git=args=>execFileSync('git',['-c','safe.directory='+projectRoot.replaceAll('\\','/'),...args],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim();
const files=[
  'apps/editor/extended-world.js','apps/editor/extended-world-document.js','apps/editor/extended-world-view.js',
  'examples/extended-world.html','examples/extended-world-entry.js','examples/extended-world.css','examples/native-fifteen-story.world.json',
  ...['index.js','state.js','validation.js','queries.js','legacy.js'].map(name=>'packages/world-core/'+name),
  ...['index.js','dom.js','style.css'].map(name=>'packages/floor-navigation/'+name),
  'tools/fixtures/fifteen-story.mjs','tools/review-extended-world.mjs'
];
const report={sourceCommit:git(['rev-parse','HEAD']),sourceStatus:git(['status','--short']),builtOnly:true,
  reviewedDependencies:{world:'fbb57293805ecae34569ab3dd9f689ffea53beb0',floors:'e0977e785857277a1c59acc1134ada5156a3fa4b'},
  sourceFiles:files.map(file=>({file,sha256:sha(fs.readFileSync(path.join(projectRoot,file)))})),
  buildProvenanceSha256:sha(fs.readFileSync(path.join(projectRoot,'dist/build-provenance.json'))),checks:{},captures:[]};
const output=process.env.NAUTILUS_WORLD_REVIEW_OUTPUT||'extended-world-editor';

await withArtReview('Native fifteen-story authoring, preview cancellation, history, save/export/reload and narrow-screen review',async({page,browser,baseURL,out,errors,failedRequests})=>{
  const capture=async name=>{await page.screenshot({path:path.join(out,name),fullPage:true,animations:'disabled'});report.captures.push({file:name,sha256:sha(fs.readFileSync(path.join(out,name)))});};
  const inspect=()=>page.evaluate(()=>{const a=window.nautilusExtendedWorld;return {json:a.export(),floor:a.navigation.state.selectedId,history:a.document.history,revision:a.document.revision,preview:a.document.previewState?.token??null};});
  const ready=()=>page.waitForFunction(()=>window.nautilusExtendedWorld);
  const jump=id=>page.evaluate(id=>window.nautilusExtendedWorld.navigation.select(id),id);
  const next=()=>page.locator('.fn-button[data-action=next]').click();
  const original=fs.readFileSync(path.join(projectRoot,'examples/native-fifteen-story.world.json'),'utf8').trim();
  await page.setViewportSize({width:1560,height:1100});
  await page.goto(baseURL+'/examples/extended-world.html',{waitUntil:'networkidle'});await ready();
  report.browser=await browser.version();assert.equal((await inspect()).json,original);assert.equal((await inspect()).floor,'floor:9');
  assert.equal(await page.locator('.fn-floor:visible').count(),5);assert.equal(await page.locator('#ew-axon g[data-body-id]').count(),352);
  report.geometry=await page.evaluate(()=>{const a=window.nautilusExtendedWorld,w=a.document.snapshot();return {bounds:w.bounds,floors:w.floors,stats:a.document.queries.stats(),actorAnchors:w.entities,stairLinks:w.links.length};});
  assert.equal(report.geometry.floors.length,16);assert.equal(report.geometry.floors[10].elevationM,21.2);assert.equal(report.geometry.floors[15].elevationM,31.8);
  await capture('native-world-desktop.png');

  await page.locator('#ew-preview').click();const pending=await inspect();assert.ok(pending.preview);assert.equal(pending.json,original);
  await page.keyboard.press('PageUp');const switched=await inspect();assert.equal(switched.floor,'floor:10');assert.equal(switched.preview,null);assert.equal(switched.json,original);assert.equal(switched.history.undo,0);
  const stale=await page.evaluate(token=>window.nautilusExtendedWorld.document.commitPreview(token),pending.preview);assert.equal(stale.code,'STALE_PREVIEW');
  report.checks.previewFloorChangeAndLateApplyRefusal=true;
  await page.locator('#ew-min-x').fill('13');await page.locator('#ew-max-x').fill('14');
  await page.locator('#ew-preview').click();await capture('native-box-preview.png');await page.locator('#ew-apply').click();
  const edited=await inspect();assert.notEqual(edited.json,original);assert.equal(edited.history.undo,1);
  await page.locator('#ew-undo').click();assert.equal((await inspect()).json,original);
  await page.locator('#ew-max-x').fill('100');await page.locator('#ew-preview').click();
  assert.equal(await page.locator('#ew-apply').isDisabled(),true);assert.equal((await inspect()).history.redo,1);assert.equal((await inspect()).json,original);
  await page.locator('#ew-redo').click();assert.equal((await inspect()).json,edited.json);
  report.checks.measuredEditUndoRedoAndRejectedEditAtomicity=true;

  await page.locator('#ew-tool').selectOption('box');await page.locator('#ew-plan').scrollIntoViewIfNeeded();
  const points=await page.evaluate(()=>{const s=document.getElementById('ew-plan'),m=s.getScreenCTM();return [[8,7.5],[9,7.75]].map(([x,y])=>{const p=s.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(m);return {x:q.x,y:q.y};});});
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:4});
  await page.keyboard.press('PageDown');await page.mouse.up();
  const dragCancelled=await inspect();assert.equal(dragCancelled.floor,'floor:9');assert.equal(dragCancelled.json,edited.json);assert.equal(dragCancelled.preview,null);assert.equal(dragCancelled.history.undo,1);
  assert.match(await page.locator('#ew-status').textContent(),/cancelled/);
  await next();await page.locator('#ew-plan').scrollIntoViewIfNeeded();
  const draw=await page.evaluate(()=>{const s=document.getElementById('ew-plan'),m=s.getScreenCTM();return [[8,7.5],[9,7.75]].map(([x,y])=>{const p=s.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(m);return {x:q.x,y:q.y};});});
  await page.mouse.move(draw[0].x,draw[0].y);await page.mouse.down();await page.mouse.move(draw[1].x,draw[1].y,{steps:4});await page.mouse.up();
  assert.ok((await inspect()).preview);assert.equal((await inspect()).json,edited.json);await page.locator('#ew-apply').click();
  assert.equal((await inspect()).history.undo,2);report.checks.pointerDrawAndInterruptedStrokeCancellation=true;

  // This is valid world-core input but incompatible with this host's selector.
  // Reject before replacing the document or disposing its active controller.
  const beforeNavigationRejection=await inspect();await page.locator('#ew-undo').click();
  const withRedo=await inspect(),incompatible=JSON.parse(withRedo.json);
  incompatible.name='Valid world, incompatible floor labels';incompatible.floors[10].label='   ';
  openWorld(incompatible);
  const importNavigationState=await page.evaluate(()=>window.nautilusExtendedWorld.navigation.state);
  await page.evaluate(()=>{window.reviewImportNavigation=window.nautilusExtendedWorld.navigation;});
  await page.locator('#ew-file').setInputFiles({name:'incompatible-floor-labels.world.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incompatible))});
  await page.waitForFunction(()=>document.getElementById('ew-status').dataset.error==='true');
  assert.deepEqual(await inspect(),withRedo);
  assert.equal(await page.evaluate(()=>window.nautilusExtendedWorld.navigation===window.reviewImportNavigation),true);
  assert.deepEqual(await page.evaluate(()=>window.nautilusExtendedWorld.navigation.state),importNavigationState);
  await page.evaluate(()=>{window.reviewImportNavigation.step(1);window.reviewImportNavigation.step(-1);});
  assert.deepEqual(await inspect(),withRedo);
  await capture('native-rejected-floor-label-import.png');
  report.rejectedNavigationImport={worldCoreAccepted:true,exportSha256:sha(withRedo.json),revision:withRedo.revision,history:withRedo.history,workingFloor:withRedo.floor,sameController:true,oldControllerRemainsUsable:true};
  await page.locator('#ew-redo').click();assert.equal((await inspect()).json,beforeNavigationRejection.json);
  report.checks.navigationIncompatibleWorldImportIsAtomicAndControllerSurvives=true;

  await page.locator('#ew-tool').selectOption('select');await page.locator('#ew-surface').selectOption('tower:door:10');
  await page.locator('#ew-trace').click();assert.match(await page.locator('#ew-query').textContent(),/tower:door:10/);
  for(const [id,value]of Object.entries({'min-x':'10','max-x':'11','min-y':'9.94','max-y':'10.06','min-h':'21.2','max-h':'22.85'}))await page.locator('#ew-'+id).fill(value);
  await page.locator('#ew-preview').click();await page.locator('#ew-trace').click();assert.match(await page.locator('#ew-query').textContent(),/tower:door:10/);
  await page.locator('#ew-apply').click();await page.locator('#ew-trace').click();assert.match(await page.locator('#ew-query').textContent(),/tower:actor:10:body/);
  await capture('native-high-door-open.png');
  const saved=await inspect();await page.locator('#ew-save').click();
  const storageKey='nautilus-engine:extended-world-editor:1';
  const savedEnvelope=await page.evaluate(key=>localStorage.getItem(key),storageKey);
  await page.evaluate(()=>{window.reviewRestoreNavigation=window.nautilusExtendedWorld.navigation;});
  await page.evaluate(key=>localStorage.setItem(key,'{'),storageKey);await page.locator('#ew-restore').click();
  assert.equal((await inspect()).json,saved.json);assert.deepEqual((await inspect()).history,saved.history);
  report.rejectedSavedSelections=[];
  for(const [name,value]of [['null',null],['number',10],['boolean',false],['object',{}],['array',[]],['empty',''],['whitespace','   '],['unavailable','missing-floor'],['missing',undefined]]) {
    const state=JSON.parse(savedEnvelope);state.selectedFloorId=value;
    const restoreNavigationState=await page.evaluate(()=>window.nautilusExtendedWorld.navigation.state);
    await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:storageKey,value:JSON.stringify(state)});
    await page.locator('#ew-restore').click();assert.equal(await page.locator('#ew-status').getAttribute('data-error'),'true');
    assert.deepEqual(await inspect(),saved);
    assert.equal(await page.evaluate(()=>window.nautilusExtendedWorld.navigation===window.reviewRestoreNavigation),true);
    assert.deepEqual(await page.evaluate(()=>window.nautilusExtendedWorld.navigation.state),restoreNavigationState);
    await page.evaluate(()=>{window.reviewRestoreNavigation.step(1);window.reviewRestoreNavigation.step(-1);});
    assert.deepEqual(await inspect(),saved);
    report.rejectedSavedSelections.push({case:name,preservedWorldRevisionHistoryFloor:true,sameUsableController:true});
    if(name==='null')await capture('native-rejected-saved-selection.png');
  }
  const incompatibleSave=JSON.parse(savedEnvelope);incompatibleSave.world.floors[0].label='   ';openWorld(incompatibleSave.world);
  const restoreNavigationState=await page.evaluate(()=>window.nautilusExtendedWorld.navigation.state);
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:storageKey,value:JSON.stringify(incompatibleSave)});
  await page.locator('#ew-restore').click();assert.deepEqual(await inspect(),saved);
  assert.equal(await page.evaluate(()=>window.nautilusExtendedWorld.navigation===window.reviewRestoreNavigation),true);
  assert.deepEqual(await page.evaluate(()=>window.nautilusExtendedWorld.navigation.state),restoreNavigationState);
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:storageKey,value:savedEnvelope});
  report.checks.corruptSaveAndMissingFloorRestorePreserveCurrentWorld=true;
  report.checks.savedSelectionValidationAndNavigationPreflightAreAtomic=true;
  const downloadEvent=page.waitForEvent('download');await page.locator('#ew-export').click();const download=await downloadEvent;
  await download.saveAs(path.join(out,'native-edited.world.json'));
  assert.equal(fs.readFileSync(path.join(out,'native-edited.world.json'),'utf8'),saved.json+'\n');
  report.exportedWorldSha256=sha(saved.json);report.checks.highDoorStaticPoseAndDownload=true;
  await page.reload({waitUntil:'networkidle'});await ready();assert.equal((await inspect()).json,original);
  await page.locator('#ew-restore').click();assert.equal((await inspect()).json,saved.json);assert.equal((await inspect()).floor,'floor:10');assert.equal((await inspect()).history.undo,0);
  report.checks.browserSavePageReloadRestoreExactWorldAndFloor=true;

  const beforeRejected=await inspect();
  await page.locator('#ew-file').setInputFiles({name:'legacy-too-tall.json',mimeType:'application/json',buffer:Buffer.from('{"version":2,"levels":16}')});
  await page.waitForFunction(()=>document.getElementById('ew-status').dataset.error==='true');
  const afterRejected=await inspect();assert.equal(afterRejected.json,beforeRejected.json);assert.deepEqual(afterRejected.history,beforeRejected.history);assert.equal(afterRejected.floor,beforeRejected.floor);
  await page.locator('#ew-new').click();assert.equal((await inspect()).json,original);
  await page.locator('#ew-file').setInputFiles(path.join(out,'native-edited.world.json'));
  await page.waitForFunction(()=>document.getElementById('ew-status').textContent.includes('Imported the complete'));
  assert.equal((await inspect()).json,saved.json);report.checks.nativeFileImportAndLegacyImportPreservation=true;
  for(const target of ['aft-map-v2','aft-block-v1']) {
    await page.locator('#ew-legacy-target').selectOption(target);await page.locator('#ew-legacy').click();
    assert.match(await page.locator('#ew-legacy-result').textContent(),/Export refused\. 11 floor positions/);assert.equal((await inspect()).json,saved.json);
  }
  await capture('native-legacy-refusal.png');report.checks.bothLegacyExportsRefuseWithoutTruncation=true;

  report.contacts=await page.evaluate(()=>{
    const q=window.nautilusExtendedWorld.document.queries;
    return {floor9:q.findSupport({position:{x:12,y:10.5,h:19.13},maxDropM:1,requireFloor:true}),floor10:q.findSupport({position:{x:12,y:10.5,h:21.25},maxDropM:1,requireFloor:true}),
      lowRoof:q.findSupport({position:{x:24,y:8,h:4.74},maxDropM:1,requireFloor:true}),roofDeck:q.findSupport({position:{x:12,y:12,h:32.3},maxDropM:1,requireFloor:true}),
      highImpact:q.traceSegment({from:{x:8,y:11.5,h:30.48},to:{x:18,y:11.5,h:30.48}})};
  });
  assert.equal(report.contacts.floor9.floorId,'floor:9');assert.equal(report.contacts.floor10.floorId,'floor:10');
  assert.equal(report.contacts.lowRoof.point.h,4.24);assert.equal(report.contacts.roofDeck.point.h,31.8);assert.equal(report.contacts.highImpact.anchorFloorId,'floor:14');
  while((await inspect()).floor!=='floor:15')await next();
  assert.equal(await page.locator('.fn-button[data-action=next]').isDisabled(),true);await capture('native-roof-deck.png');
  report.checks.nativeHeightsIndependentRoofsAndHiddenHighContact=true;

  await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await jump('floor:10');
  const beforeFocus=await inspect();await page.locator('#ew-min-x').focus();await page.keyboard.press('PageUp');assert.equal((await inspect()).floor,'floor:10');assert.equal((await inspect()).json,beforeFocus.json);
  report.phone=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    buttons:[...document.querySelectorAll('.fn-floor:not([hidden])')].map(button=>{const b=button.getBoundingClientRect();return {label:button.textContent,x:b.x,width:b.width,height:b.height};})}));
  assert.ok(report.phone.scrollWidth<=320);assert.equal(report.phone.buttons.length,5);
  assert.ok(report.phone.buttons.every(button=>button.x>=0&&button.x+button.width<=320&&button.width>=44&&button.height>=44));
  await capture('native-phone-320.png');
  await page.locator('#ew-surface').selectOption('');await page.locator('#ew-preview').click();assert.ok((await inspect()).preview);
  await next();assert.equal((await inspect()).floor,'floor:11');assert.equal((await inspect()).preview,null);assert.equal((await inspect()).json,saved.json);
  await page.locator('#ew-support').click();await capture('native-phone-edit-controls.png');
  report.checks.phone320ManualControlsFocusAndPreviewCancellation=true;
  report.limitations=['Static authored AABBs and semantic stair endpoints; no route execution, capsule sweep, falling, damage, fire, dynamic door runtime or consumer adoption.','SVG is an event-driven structural view, not a textured asset or GPU-performance proof. Drawing is capped at 1600 bodies per view with counts disclosed; queries and exports keep the complete world.','Built-only examples/extended-world.html; npm run build copies every dependency.'];
  report.errors=errors;report.failedRequests=failedRequests;
  fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.checks));
},{output,owner:process.env.CODEX_THREAD_ID||'01a1811b-5974-7d83-8cff-136a1d8b02ab',timeoutMs:240000});
