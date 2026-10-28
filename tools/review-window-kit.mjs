import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview} from './art-review-browser.mjs';

await withArtReview('Centered window sculpture and editor library review',async({page,context,baseURL,out,browser,errors,failedRequests})=>{
  page.setDefaultTimeout(20000);
  await page.goto(baseURL+'/',{waitUntil:'networkidle'});
  await page.locator('#nautilus-assets').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('nautilus-assets').disabled&&window.editor3d?.document&&!window.editor3d.loading);
  const blueprint=await page.evaluate(()=>window.editor3d.document.export());
  await page.locator('#nautilus-assets').click();
  await page.locator('#asset-category').selectOption('Windows');
  if(await page.locator('#asset-results button').count()!==2)throw Error('Missing window sculptures.');
  const captures=[];
  async function capture(name){
    await page.waitForFunction(()=>document.getElementById('asset-preview-status').textContent.startsWith('Window sculpture'));
    await page.locator('#asset-library .asset-inspector').screenshot({path:path.join(out,name+'.png')});captures.push(name+'.png');
  }
  for(const id of ['window-bay-compact','window-bay-period']){
    await page.locator(`[data-asset="Windows:${id}"]`).click();
    await page.locator('#asset-window-wall').selectOption('wood');
    if(!await page.locator('#asset-use').isDisabled())throw Error('Sculpture incorrectly advertises map placement.');
    await capture(id+'-wood');
    await page.locator('#asset-window-wall').selectOption('brick');await capture(id+'-brick');
    await page.locator('#asset-window-finish').selectOption('clay');await capture(id+'-clay');
    await page.locator('#asset-window-sashes').selectOption('removed');await capture(id+'-aperture');
    await page.locator('#asset-turn').click();await page.locator('#asset-turn').click();await capture(id+'-back');
    await page.locator('#asset-window-sashes').selectOption('installed');
    await page.locator('#asset-window-finish').selectOption('painted');
  }
  const downloadPromise=page.waitForEvent('download');await page.locator('#asset-window-download').click();
  const download=await downloadPromise,file=path.join(out,download.suggestedFilename());await download.saveAs(file);
  const sculpture=JSON.parse(fs.readFileSync(file));
  if(sculpture.id!=='window-bay-period'||sculpture.opening.width!==1||sculpture.traversal.status!=='deferred'||sculpture.parts.length<30)throw Error('Incomplete sculpture download.');
  for(let repeat=0;repeat<2;repeat++){
    await page.locator('#asset-close').click();await page.locator('#nautilus-assets').click();await capture('reopened-'+repeat);
  }
  // Switch back to a native asset, then into the new renderer on the same modal.
  await page.locator('#asset-category').selectOption('Boundaries');await page.locator('#asset-results button').first().click();
  await page.waitForFunction(()=>document.getElementById('asset-preview-status').textContent.startsWith('Authored model'));
  await page.locator('#asset-category').selectOption('Windows');await page.locator('[data-asset="Windows:window-bay-period"]').click();
  await page.locator('#asset-window-wall').selectOption('concrete');await capture('period-concrete');
  if(await page.evaluate(()=>window.editor3d.document.export())!==blueprint)throw Error('Sculpture preview changed the user map.');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});captures.push('mobile.png');
  const overflow=await page.evaluate(()=>document.getElementById('asset-library').scrollWidth>document.getElementById('asset-library').clientWidth+1);
  if(overflow)throw Error('Window library overflows on mobile.');
  await page.locator('#asset-close').click();
  const report={browser:browser.version(),renderer:'Isolated software WebGL; visual correctness only',profiles:2,captures:captures.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')})),
    views:['painted wood','painted brick','clay','sashes removed','opposite face','concrete'],download:{file:path.basename(file),format:sculpture.format},reopened:2,legacyRendererSwitch:true,mapUnchanged:true,mobileOverflow:overflow,errors,failedRequests};
  fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,captures:captures.length}));
},{owner:'01a1811b-5974-7d83-8cff-136a1d8b02ab',directory:'window-kit',sourceFiles:['tools/review-window-kit.mjs']});
