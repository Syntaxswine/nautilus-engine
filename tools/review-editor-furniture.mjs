import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot} from './art-review-browser.mjs';

const assert=(value,message)=>{if(!value)throw Error(message);};
const sourceFiles=['apps/editor/asset-catalog.js','apps/editor/asset-preview.js','apps/editor/assets.js','apps/editor/furniture-preview.js','apps/editor/editor.css','packages/furniture-core/index.js','packages/furniture-core/three.js','tools/shared-assets.mjs','tools/review-editor-furniture.mjs'];
await withArtReview('Pinned library furniture discovery, native previews and recovery',async({page,context,browser,baseURL,out,errors,failedRequests})=>{
  page.setDefaultTimeout(20000);const optionalRequests=[],captures=[],poses=[];
  page.on('request',request=>{if(/furniture-core\/three\.js|book-spines\.svg/.test(request.url()))optionalRequests.push(request.url());});
  await page.goto(baseURL+'/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.editor3d?.document&&!window.editor3d.loading);
  const snapshot=()=>page.evaluate(()=>{
    const doc=window.editor3d.document;
    return JSON.stringify({export:doc.export(),revision:doc.revision,changed:doc.changed,undo:doc.editor.undo.length,redo:doc.editor.redo.length,storage:Object.fromEntries(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)]))});
  });
  const before=await snapshot();assert(optionalRequests.length===0,'Furniture loaded during workshop startup.');
  await page.evaluate(async()=>{
    const {FurniturePreviewScene}=await import('/app/furniture-preview.js'),draw=FurniturePreviewScene.prototype.draw;
    FurniturePreviewScene.prototype.draw=function(...args){const result=draw.apply(this,args);window.__furnitureReview=this;return result;};
  });
  await page.locator('#nautilus-assets').click();assert(optionalRequests.length===0,'Opening the ordinary library loaded furniture.');
  await page.locator('#asset-category').selectOption('Furniture');
  const count=()=>page.locator('#asset-results button').count();assert(await count()===96,'Furniture catalogue must contain 96 variants.');
  const counts={};
  for(const [field,value,expected]of [['form','bookcase-tall',12],['finish','sage',16],['contents','books',48]]) {
    await page.locator('#asset-furniture-'+field).selectOption(value);counts[field]=await count();assert(counts[field]===expected,'Incorrect '+field+' count.');
    await page.locator('#asset-furniture-'+field).selectOption('');
  }
  await page.locator('#asset-furniture-form').selectOption('bookcase-tall');await page.locator('#asset-furniture-finish').selectOption('sage');
  counts.formAndFinish=await count();assert(counts.formAndFinish===2,'Form and finish must leave two contents states.');
  await page.locator('#asset-furniture-contents').selectOption('books');counts.exact=await count();assert(counts.exact===1,'Exact filter must leave one variant.');
  async function ready(){await page.waitForFunction(()=>document.getElementById('asset-preview-status').textContent.startsWith('Authored furniture'));await page.evaluate(()=>new Promise(requestAnimationFrame));}
  async function choose(form,finish='oak',contents='books') {
    await page.locator('#asset-search').fill('');
    for(const [field,value]of Object.entries({form,finish,contents}))await page.locator('#asset-furniture-'+field).selectOption(value);
    await page.locator(`#asset-results [data-asset="Furniture:furniture:library.${form}.${finish}.${contents}"]`).click();await ready();
    assert(await page.locator('#asset-use').isDisabled(),'Furniture advertises map placement.');
  }
  async function capture(name) {
    await ready();await page.locator('#asset-inspector').evaluate(element=>element.scrollTop=0);await page.locator('#asset-library .asset-inspector').screenshot({path:path.join(out,name+'.png')});captures.push(name+'.png');
    poses.push(await page.evaluate(()=>{const s=window.__furnitureReview,m=s.model;return {id:m.spec.id,rotation:m.spec.rotation,size:m.spec.size,tiles:m.spec.tiles,placementOffset:m.spec.placementOffset,rootPosition:m.root.position.toArray(),scale:m.root.scale.toArray(),bounds:{min:s.bounds.min.toArray(),max:s.bounds.max.toArray()},bodyLabel:document.getElementById('asset-footprint').textContent,overallLabel:document.getElementById('asset-rendered-size').textContent};}));
    assert(poses.at(-1).scale.every(value=>value===1),'Preview resized the furniture.');
    const pose=poses.at(-1),shownSize=pose.bounds.max.map((value,index)=>Number((value-pose.bounds.min[index]).toFixed(4))).join(' × ');
    assert(pose.overallLabel===`Overall size: ${shownSize} m (W × H × D)`,'Displayed size differs from actual rendered bounds.');
  }
  await page.locator('#asset-results button').first().focus();await page.keyboard.press('Enter');await ready();
  assert(await page.locator('#asset-results button').first().getAttribute('aria-pressed')==='true','Keyboard selection did not inspect the matching asset.');
  for(const form of ['bookcase-tall','bookcase-wide','bookcase-low','bookcase-double','bookcase-double-thick','bookcase-double-ornate','library-table','library-table-large']) {
    await choose(form);await capture(form+'-painted');
    await page.locator('#asset-furniture-mode').selectOption('clay');await capture(form+'-clay');
    await page.locator('#asset-furniture-mode').selectOption('painted');await choose(form,'oak','empty');
    if(form.startsWith('library-table'))await page.locator('#asset-furniture-camera').selectOption('low');
    await capture(form+'-empty');await page.locator('#asset-furniture-camera').selectOption('raised');
  }
  for(const finish of ['oak','walnut','sage','ivory','oxblood','graphite']){await choose('bookcase-tall',finish);await capture('finish-'+finish);}
  await choose('bookcase-double');await page.locator('#asset-turn').click();await page.locator('#asset-turn').click();await capture('double-opposite-face');
  await choose('bookcase-double-ornate','sage');
  const cameraLabel=await page.locator('#asset-footprint').textContent();await page.locator('#asset-turn').click();await ready();
  assert(await page.locator('#asset-footprint').textContent()===cameraLabel,'Camera turn changed physical labels.');
  for(const rotation of ['0','90','180','270']){await page.locator('#asset-furniture-rotation').selectOption(rotation);await capture('frieze-rotation-'+rotation);}
  const lastFour=poses.slice(-4);assert(lastFour[0].size[0]===lastFour[1].size[2]&&lastFour[0].tiles[0]===lastFour[1].tiles[1],'Model quarter turn failed to swap dimensions/reservation.');
  await page.locator('#asset-furniture-rotation').selectOption('0');
  for(const form of ['library-table','library-table-large']) {
    await choose(form,'oak','empty');
    const hits=await page.evaluate(async()=>{
      const T=await import('/packages/render-effects/three.js'),root=window.__furnitureReview.model.root;
      root.updateMatrixWorld(true);const start=new T.Vector3(0,.4,-5).applyMatrix4(root.matrixWorld),end=new T.Vector3(0,.4,5).applyMatrix4(root.matrixWorld);
      const meshes=[];root.traverse(node=>{if(node.isMesh)meshes.push(node);});return new T.Raycaster(start,end.sub(start).normalize()).intersectObjects(meshes,false).length;
    });assert(hits===0,'Table centre is an opaque blocker below the top.');
  }

  // Gate an obsolete open after its actual source library loaded, then let the
  // replacement finish first. Both resolve and reject paths must stay retired.
  for(const outcome of ['resolve','reject']) {
    await page.evaluate(async()=>{
      const {FurniturePreviewScene}=await import('/app/furniture-preview.js'),original=FurniturePreviewScene.prototype.library;
      window.__furnitureGate={entered:false};let first=true;
      FurniturePreviewScene.prototype.library=async function(){const pack=await original.call(this);if(!first)return pack;first=false;window.__furnitureGate.entered=true;await new Promise((resolve,reject)=>Object.assign(window.__furnitureGate,{resolve,reject}));return pack;};
      window.__restoreFurnitureLibrary=()=>{FurniturePreviewScene.prototype.library=original;};
    });
    // A new scene is required so the gate belongs to an independently owned load.
    await page.locator('#asset-close').click();await page.locator('#nautilus-assets').click();
    await page.waitForFunction(()=>window.__furnitureGate.entered);
    await choose('bookcase-wide','graphite');const name=await page.locator('#asset-name').textContent(),label=await page.locator('#asset-footprint').textContent();
    await page.evaluate(outcome=>{const gate=window.__furnitureGate;if(outcome==='reject')gate.reject(Error('Obsolete furniture completion'));else gate.resolve();window.__restoreFurnitureLibrary();},outcome);
    await page.evaluate(()=>new Promise(requestAnimationFrame));
    assert(await page.locator('#asset-name').textContent()===name&&await page.locator('#asset-footprint').textContent()===label,'An obsolete selection replaced newer metadata.');await ready();
  }
  // Fail exactly one real atlas request, then recover through the visible retry.
  await page.locator('#asset-close').click();let failedAtlas=0;
  await page.route('**/book-spines.svg',async route=>{if(!failedAtlas++){await route.abort('failed');}else await route.continue();});
  await page.locator('#nautilus-assets').click();await page.locator('#asset-retry').waitFor({state:'visible'});
  const failedName=await page.locator('#asset-name').textContent();await page.locator('#asset-retry').click();await ready();
  assert(await page.locator('#asset-name').textContent()===failedName,'Retry discarded the selected variant.');await page.unroute('**/book-spines.svg');
  const expectedConsoleFailure=errors.findIndex(message=>message==='Failed to load resource: net::ERR_FAILED');
  const expectedErrors=expectedConsoleFailure<0?[]:errors.splice(expectedConsoleFailure,1);
  assert(failedAtlas>=2,'A failed atlas was not retried.');

  await page.locator('#asset-search').fill('no such library furniture');assert(await count()===0,'Missing empty search state.');
  assert(await page.locator('#asset-name').textContent()==='No matching assets','Filtered-out selection remains active.');
  await page.locator('#asset-search').fill('');await choose('bookcase-double-ornate','ivory');
  for(const [width,height,label]of [[1280,900,'desktop'],[390,844,'phone'],[320,568,'small-phone'],[640,450,'200-percent-equivalent']]) {
    await page.setViewportSize({width,height});await page.locator('#asset-close').scrollIntoViewIfNeeded();
    await page.locator('#asset-inspector').evaluate(element=>element.scrollTop=0);
    await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});captures.push(label+'.png');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.getElementById('asset-library').scrollWidth<=document.getElementById('asset-library').clientWidth+1),'Furniture UI overflows at '+label);
    await page.locator('#asset-preview').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,label+'-preview.png'),fullPage:true});captures.push(label+'-preview.png');
  }
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('asset-library').open);
  assert(await page.locator('#nautilus-assets').evaluate(button=>button===document.activeElement),'Escape did not restore launch focus.');
  await page.evaluate(()=>{window.__furnitureLoadingDescriptor=Object.getOwnPropertyDescriptor(window.editor3d,'loading');Object.defineProperty(window.editor3d,'loading',{configurable:true,get:()=>true});});
  try {
    await page.locator('#nautilus-assets').click();await ready();
    assert(await page.locator('#asset-library').isVisible(),'Pending main-map loading blocked discovery.');
    assert(await page.locator('#asset-use').isDisabled(),'Pending main-map loading enabled placement.');await page.keyboard.press('Escape');
  }finally{await page.evaluate(()=>Object.defineProperty(window.editor3d,'loading',window.__furnitureLoadingDescriptor));}
  assert(await snapshot()===before,'Furniture inspection changed document/history/browser saves.');

  const cold=await context.newPage(),coldErrors=[];cold.on('pageerror',error=>coldErrors.push(error.message));
  await cold.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return ['webgl','webgl2','experimental-webgl'].includes(type)?null:original.call(this,type,...args);};});
  await cold.goto(baseURL+'/',{waitUntil:'networkidle'});await cold.locator('#nautilus-assets').click();
  await cold.locator('#asset-retry').waitFor({state:'visible'});assert(await cold.locator('#asset-results button').count()===96,'Cold WebGL failure blocked furniture discovery.');
  assert((await cold.locator('#asset-furniture-source').textContent()).includes('fb6e20a'),'Cold metadata lost its source.');
  await cold.locator('#asset-furniture-form').selectOption('library-table');await cold.locator('#asset-furniture-finish').selectOption('sage');await cold.locator('#asset-furniture-contents').selectOption('empty');
  assert(await cold.locator('#asset-results button').count()===1,'Cold filters depend on the renderer.');await cold.locator('#asset-results button').first().click();
  assert((await cold.locator('#asset-footprint').textContent()).includes('Body footprint:'),'Cold metadata disappeared after selection.');
  assert(coldErrors.every(message=>/WebGL is unavailable|Error creating WebGL context/.test(message)),'Unexpected cold-start error: '+coldErrors.join('; '));
  await cold.screenshot({path:path.join(out,'cold-webgl-unavailable.png'),fullPage:true});captures.push('cold-webgl-unavailable.png');await cold.close();
  const record={baseCommit:'581258aa506798dca3909bfd41ec39d3ee23b550',apiCommit:'bfe26a01086726e3dfdc0ae20755675f36f4d080',browser:browser.version(),renderer:'Isolated software WebGL; visual correctness, not a GPU benchmark',sourceHashes:sourceFiles.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(projectRoot,file))).digest('hex')})),
    collection:{forms:8,variants:96,source:'fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b'},lazyOptionalLoad:true,filterCounts:counts,poses,
    bothFaces:true,emptyAndStocked:true,clay:true,underTableGaps:true,staleResolveAndReject:true,failedAtlasRetry:true,expectedErrors,coldWebGL:{metadataAndFilters:true,mainLoadingDoesNotBlock:true,expectedStartupErrors:coldErrors},
    documentHistoryAndStorageUnchanged:true,keyboardSelection:true,escapeFocus:true,viewports:['1280×900','390×844','320×568','640×450 effective 200%'],captures:captures.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')})),errors,failedRequests};
  fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(record,null,2));console.log(JSON.stringify({...record,sourceHashes:sourceFiles.length,poses:poses.length,captures:captures.length}));
},{owner:'01a1811b-5974-7d83-8cff-136a1d8b02ab',output:'editor-furniture',timeoutMs:180000});
