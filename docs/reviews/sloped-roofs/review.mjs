// Reproducible, short-lived review; does not attach to user or app browsers.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview} from '../../../tools/art-review-browser.mjs';

await withArtReview('Procedural roof form, painted UV and geometry cost review', async ({page, baseURL, out, errors, failedRequests, browser}) => {
  await page.setViewportSize({width:1536,height:1100});
  await page.goto(baseURL+'/docs/reviews/sloped-roofs/scene.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.roofReview?.ready);
  const records=await page.evaluate(()=>window.roofReview.set('painted'));
  await page.screenshot({path:path.join(out,'painted.png'),fullPage:true});
  await page.evaluate(()=>window.roofReview.set('grey'));
  await page.screenshot({path:path.join(out,'grey.png'),fullPage:true});
  await page.evaluate(()=>window.roofReview.set('wire'));
  await page.screenshot({path:path.join(out,'wire.png'),fullPage:true});
  await page.evaluate(()=>window.roofReview.underside());
  await page.screenshot({path:path.join(out,'underside.png'),fullPage:true});
  await page.evaluate(()=>window.roofReview.close());
  await page.screenshot({path:path.join(out,'detail.png'),fullPage:true});
  await page.goto(baseURL+'/docs/reviews/sloped-roofs/scene.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.roofReview?.ready);
  const comparison=await page.evaluate(()=>window.roofReview.comparison());
  if(JSON.stringify(comparison.map(c=>[c.triangles,c.drawCalls]))!==JSON.stringify([[12,1],[96,1],[20,3]]))throw Error('Unexpected geometry/draw-call costs: '+JSON.stringify(comparison));
  await page.screenshot({path:path.join(out,'comparison.png'),fullPage:true});
  const captures=fs.readdirSync(out).filter(n=>n.endsWith('.png')).map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')}));
  const report={browser:browser.version(),rendering:'Isolated Edge software WebGL2; correctness only, no frame-time benchmark',records,comparison,captures,errors,failedRequests};
  fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify(report,null,2));
  await page.evaluate(()=>window.roofReview.dispose());
  console.log(JSON.stringify({roofs:records.length,comparison,captures:captures.length,errors,failedRequests}));
},{source:true,artifactFolder:'sloped-roofs-review',timeoutMs:120000});
