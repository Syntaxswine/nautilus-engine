import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
const assert=(value,message)=>{if(!value)throw Error(message);};
const sourceFiles=['packages/map-core/roof-data.js','packages/map-core/roof-document.js','packages/map-core/roof-blocks.js','packages/map-core/roof-rotation.js','packages/map-core/roof-generator.js','apps/editor/roof-tools.js','apps/editor/roof-scene.js','tools/editor-roof-adapter.mjs','tools/review-editor-roofs.mjs'];

await withArtReview('Sloped roof editor controls and portable workflow',async({page,baseURL,out,browser,errors,failedRequests})=>{
  page.on('dialog',dialog=>dialog.accept());page.setDefaultTimeout(20000);await page.setViewportSize({width:1440,height:1000});
  await page.goto(baseURL+'/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.editor3d?.document&&!window.editor3d.loading&&document.getElementById('roof-style'));
  await page.evaluate(async()=>{const {blankMap}=await import('/packages/map-core/index.js');await window.nautilus.open(blankMap('Sloped roof acceptance'));Object.assign(window.editor3d.view,{x:24,y:16,span:42,preset:'0'});window.editor3d.scene.changed();});
  await page.locator('[data-group="roofs"]').click();await page.locator('#tool-mode').selectOption('sloped-roof');
  await page.locator('#roof-exact > summary').click();
  for(const [i,style]of ['gable','hip','shed'].entries()){
    await page.locator('#roof-target').selectOption('');await page.locator('#roof-style').selectOption(style);
    await page.locator('#roof-x').fill(String(6+i*13));await page.locator('#roof-y').fill('9');
    await page.locator('#roof-width').fill('10');await page.locator('#roof-depth').fill('8');await page.locator('#roof-seed').fill('42');
    await page.locator('#roof-material').selectOption(['slate','clay','metal'][i]);
    if(style==='shed')await page.locator('#roof-direction').selectOption('-1');
    const before=await page.evaluate(()=>window.editor3d.export());await page.locator('#roof-preview-exact').click();
    assert(await page.evaluate(()=>window.editor3d.export())===before,'Preview mutated the map.');
    await page.waitForFunction(()=>!document.getElementById('roof-place-exact').disabled);
    await page.screenshot({path:path.join(out,style+'-preview.png')});
    await page.locator('#roof-place-exact').click();await page.waitForFunction(count=>window.editor3d.document.map.slopedRoofs?.roofs.length===count&&!window.editor3d.loading,i+1);
  }
  const placed=await page.evaluate(()=>window.editor3d.export());await page.locator('#undo').click();
  await page.waitForFunction(()=>window.editor3d.document.map.slopedRoofs.roofs.length===2&&!window.editor3d.loading);await page.locator('#redo').click();
  await page.waitForFunction(()=>window.editor3d.document.map.slopedRoofs.roofs.length===3&&!window.editor3d.loading);assert(await page.evaluate(()=>window.editor3d.export())===placed,'Roof undo/redo changed saved bytes.');
  await page.locator('#roof-target').selectOption('roof-1');await page.locator('#roof-pitch').fill('40');await page.locator('#roof-preview-exact').click();
  await page.locator('#roof-pitch').fill('41');assert(await page.locator('#roof-place-exact').isDisabled(),'Changed settings left a stale preview applicable.');
  await page.locator('#roof-preview-exact').click();await page.locator('#roof-place-exact').click();await page.waitForFunction(()=>window.editor3d.document.map.slopedRoofs.roofs.find(r=>r.id==='roof-1').pitch===41&&!window.editor3d.loading);
  // Exercise the ordinary selection/rotation path using the documented editor
  // projection. Public inspection returns a copied selection; the button edits it.
  await page.evaluate(()=>{const editor=window.editor3d;editor.select(editor.inspect(36,12,1));});
  await page.locator('#rotate-selected').click();await page.waitForFunction(()=>window.editor3d.document.map.slopedRoofs.roofs.find(r=>r.id==='roof-3').axis==='y'&&!window.editor3d.loading);
  const rotated=await page.evaluate(()=>window.editor3d.export());await page.locator('#undo').click();await page.waitForFunction(()=>window.editor3d.document.map.slopedRoofs.roofs.find(r=>r.id==='roof-3').axis==='x'&&!window.editor3d.loading);
  await page.locator('#redo').click();await page.waitForFunction(()=>window.editor3d.document.map.slopedRoofs.roofs.find(r=>r.id==='roof-3').axis==='y'&&!window.editor3d.loading);assert(await page.evaluate(()=>window.editor3d.export())===rotated,'Roof rotation undo/redo changed bytes.');
  await page.locator('#settings-button').click();await page.locator('#save-map').click();
  await page.waitForFunction(()=>document.getElementById('nautilus-settings-feedback').textContent.includes('Saved in this browser'));
  const saveId=await page.locator('#saved-designs').inputValue(),saved=await page.evaluate(()=>window.editor3d.export());assert(saveId,'No browser save ID.');
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]),exported=path.join(out,'roofs-roundtrip.json');await download.saveAs(exported);assert(fs.readFileSync(exported,'utf8')===saved,'Roof export changed bytes.');
  const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('label.file').click()]);await chooser.setFiles(exported);
  await page.waitForFunction(()=>!window.editor3d.loading&&window.editor3d.document.map.slopedRoofs?.roofs.length===3);assert(await page.evaluate(()=>window.editor3d.export())===saved,'Roof import changed bytes.');
  if(!await page.locator('#editor-settings').evaluate(el=>el.open))await page.locator('#settings-button').click();
  await page.locator('#saved-designs').selectOption(saveId);await page.locator('#load-map').click();await page.waitForFunction(()=>!window.editor3d.loading&&window.editor3d.document.libraryId);
  assert(await page.evaluate(()=>window.editor3d.export())===saved,'Browser reload changed roof data.');await page.locator('#close-settings').click();
  await page.evaluate(()=>{Object.assign(window.editor3d.view,{x:24,y:16,span:42,preset:'0'});window.editor3d.scene.changed();});await page.screenshot({path:path.join(out,'roofs-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.locator('#nautilus-options').click();await page.screenshot({path:path.join(out,'roofs-mobile.png')});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,'Roof controls create horizontal overflow.');
  const final=await page.evaluate(async()=>{const core=await import('/packages/map-core/roof-maps.js');return {roofs:window.editor3d.document.map.slopedRoofs.roofs,features:core.requiredMapFeatures(window.editor3d.document.map),diagnostics:window.editor3d.scene.diagnostics,models:window.editor3d.scene.slopedRoofs.models.size,previews:window.editor3d.scene.roofPreview.models.size};});
  assert(!final.diagnostics.length,'Scene diagnostics: '+final.diagnostics.join(';'));assert(final.models===3,'Missing roof scene models.');
  const record={browser:browser.version(),renderer:'Isolated software WebGL; correctness only',sourceHashes:sourceFiles.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(projectRoot,file))).digest('hex')})),previewNonmutating:true,stalePreviewRejected:true,undoRedo:true,rotation:true,jsonRoundtrip:true,browserSaveReload:true,mobileOverflow:overflow,final,errors,failedRequests};
  fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(record,null,2));console.log(JSON.stringify({...record,sourceHashes:sourceFiles.length}));
},{owner:'01a1811b-5974-7d83-8cff-136a1d8b02ab',output:'editor-roofs',timeoutMs:180000});
