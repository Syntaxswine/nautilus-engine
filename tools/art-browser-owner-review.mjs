import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from './art-review-browser.mjs';
const output='art-browser-owner-'+new Date().toISOString().toLowerCase().replaceAll(/[^a-z0-9]/g,'');
await withArtReview('New private browser resource/range/view owner controls',async({page,baseURL,out})=>{
 await page.goto(baseURL+'/candidates/tile-authoring/browser-art/owner-v1/tests/browser.html');await page.waitForFunction(()=>window.__browserOwnerFinished,{},{timeout:180000});
 const report=await page.evaluate(()=>window.__browserOwnerResult);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await page.screenshot({path:path.join(out,'component.png'),fullPage:true});if(await page.locator('#first-mark-preview').count())await page.locator('#first-mark-preview').screenshot({path:path.join(out,'first-stamp.png')});console.log(JSON.stringify({status:report.status,controls:report.controls?.length,passed:report.passed?.length,message:report.message,out}));if(report.status!=='pass')throw Error(report.message);
},{source:true,owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',output,timeoutMs:240000});
