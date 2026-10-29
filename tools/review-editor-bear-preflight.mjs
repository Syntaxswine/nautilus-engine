import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
import {bearEditorCases} from './fixtures/editor-bear.mjs';

// Baseline/editor preparation only. Actual bear rendering and placement must
// receive their own acceptance after the architect distributes a provider pin.
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=['apps/editor/assets.js','apps/editor/asset-appearance.js','apps/editor/asset-preview.js','apps/editor/asset-catalog.js','tools/review-editor-bear-preflight.mjs'];
const report={status:'editor-preparation; bear provider/appearance integration pending',
  sourceCommit:execFileSync('git',['-c','safe.directory='+projectRoot.replaceAll('\\','/'),'rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim(),
  sourceFiles:files.map(file=>({file,sha256:sha(fs.readFileSync(path.join(projectRoot,file)))})),
  buildProvenanceSha256:sha(fs.readFileSync(path.join(projectRoot,'dist/build-provenance.json'))),checks:{},captures:[],comparison:[],expectedGraphicsErrors:[]};
await withArtReview('Bear editor preflight: existing Cow comparison, isolated appearance choices and metadata without native tools/WebGL',async({page,context,browser,baseURL,out,errors,failedRequests})=>{
  const capture=async(name,target=page)=>{await target.screenshot({path:path.join(out,name),animations:'disabled'});report.captures.push({file:name,sha256:sha(fs.readFileSync(path.join(out,name)))});};
  await page.goto(baseURL+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.editor3d?.document&&!window.editor3d.loading,undefined,{timeout:120000});
  report.browser=await browser.version();const before=await page.evaluate(()=>({json:window.editor3d.export(),revision:window.editor3d.document.revision,undo:window.editor3d.document.editor.undo.length,redo:window.editor3d.document.editor.redo.length}));
  await page.evaluate(async()=>{
    const {InspectionScene}=await import('/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-scene.js');
    const open=InspectionScene.prototype.open;
    InspectionScene.prototype.open=function(document){if(document.map.name==='Asset preview')window.reviewAssetScene=this;return open.call(this,document);};
  });
  await page.locator('#nautilus-assets').click();await page.locator('#asset-search').fill('cow');
  await page.locator('[data-asset="People:cow"]').click();
  await page.waitForFunction(()=>!document.getElementById('asset-use').disabled);
  assert.equal(await page.locator('#asset-weapon option').count(),13);assert.equal(await page.locator('#asset-outfit option').count(),2);
  for(const appearance of bearEditorCases().variants) {
    await page.locator('#asset-outfit').selectOption(appearance.outfit);await page.locator('#asset-weapon').selectOption(appearance.weapon);
    await page.waitForFunction(()=>!document.getElementById('asset-use').disabled);
    const actual=await page.evaluate(()=>({weapon:document.getElementById('asset-weapon').value,outfit:document.getElementById('asset-outfit').value}));
    assert.deepEqual(actual,{weapon:appearance.weapon,outfit:appearance.outfit});
    const rendered=await page.evaluate(()=>{
      const model=window.reviewAssetScene?.models[0];
      return model?{species:model.unit.species,weapon:model.unit.weapon,outfit:model.unit.outfit,equipment:model.equipment?.id??null,cap:!!model.cap,scale:model.root.scale.toArray()}:null;
    });
    assert.ok(rendered);assert.equal(rendered.species,'cow');assert.equal(rendered.weapon,appearance.weapon);assert.equal(rendered.outfit,appearance.outfit);
    if(appearance.weapon!=='hands')assert.equal(rendered.equipment,appearance.weapon);
    assert.equal(rendered.cap,appearance.outfit==='red-hats');assert.deepEqual(rendered.scale,[1,1,1]);
    const unchanged=await page.evaluate(()=>({json:window.editor3d.export(),revision:window.editor3d.document.revision,undo:window.editor3d.document.editor.undo.length,redo:window.editor3d.document.editor.redo.length}));
    assert.deepEqual(unchanged,before);report.comparison.push(rendered);
    if(appearance.weapon==='rifle'&&appearance.outfit==='normal')await capture('comparison-cow-regular.png');
    if(appearance.weapon==='hmg'&&appearance.outfit==='red-hats')await capture('comparison-cow-red-hat-hmg.png');
  }
  await page.locator('#asset-close').click();await page.locator('#nautilus-assets').click();
  await page.waitForFunction(()=>!document.getElementById('asset-use').disabled);
  assert.equal(await page.locator('#asset-name').textContent(),'Cow worker');
  assert.equal(await page.evaluate(()=>window.editor3d.export()),before.json);await page.locator('#asset-close').click();
  report.checks.cow26ChoicesIndependentPreviewAndCloseReopen=true;

  // Isolate the missing-workshop/graphics case from the real editor page.
  // Expected Three constructor errors are recorded, never treated as success
  // or suppressed for unrelated browser failures.
  const metadata=await context.newPage();
  metadata.on('pageerror',error=>errors.push(error.message));
  metadata.on('console',message=>{
    if(message.type()!=='error')return;
    if(message.text()==='THREE.WebGLRenderer: Error creating WebGL context.')report.expectedGraphicsErrors.push(message.text());else errors.push(message.text());
  });
  metadata.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});
  await metadata.route('**/dist/tactics/editor-3d.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// Native workshop deliberately absent for isolated metadata acceptance.'}));
  await metadata.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:original.call(this,type,...args);};});
  await metadata.goto(baseURL+'/index.html',{waitUntil:'domcontentloaded'});
  await metadata.locator('#nautilus-assets').click();await metadata.locator('#asset-search').fill('cow');await metadata.locator('[data-asset="People:cow"]').click();
  await metadata.waitForFunction(()=>document.getElementById('asset-preview-status').textContent.includes('Preview unavailable'));
  assert.equal(await metadata.locator('#unit-weapon').count(),0);assert.equal(await metadata.locator('#asset-name').textContent(),'Cow worker');
  assert.equal(await metadata.locator('#asset-weapon option').count(),13);assert.equal(await metadata.locator('#asset-outfit option').count(),2);
  assert.equal(await metadata.locator('#asset-use').isDisabled(),true);assert.equal(await metadata.evaluate(()=>typeof window.editor3d),'undefined');
  await capture('metadata-without-workshop-or-webgl.png',metadata);
  await metadata.setViewportSize({width:390,height:844});await capture('metadata-phone-390.png',metadata);
  assert.equal(await metadata.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  report.checks.metadataChoicesAvailableWithoutNativeControlsOrWebGL=true;
  report.checks.phone390MetadataNoPageOverflow=true;
  await metadata.close();
  report.errors=errors;report.failedRequests=failedRequests;
  fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.checks));
},{output:'editor-bear-preflight',owner:process.env.CODEX_THREAD_ID||'01a1811b-5974-7d83-8cff-136a1d8b02ab',timeoutMs:240000});
