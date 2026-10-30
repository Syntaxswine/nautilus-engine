// Bounded native WebGL review; owns and closes its isolated browser/server.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview} from './art-review-browser.mjs';
const built=process.argv.includes('--built'),installed=process.argv.includes('--installed'),output='tinderbox-art-'+(installed?'installed':built?'built':'source');
await withArtReview('Tinderbox native asset visual and lifecycle review',async({page,baseURL,out,errors,failedRequests})=>{
 await page.goto(baseURL+(installed?'/artifacts/tinderbox-art-intake/consumer/index.html':'/examples/tinderbox-art.html'));await page.waitForFunction(()=>window.tinderboxArtExample);
 const entries=await page.locator('#asset option').evaluateAll(options=>options.map(o=>({id:o.value,family:o.value.split(':')[1],sourceId:o.value.split(':')[2]})));
 const records=[];
 for(const entry of entries){
  const actual=await page.evaluate(id=>window.tinderboxArtExample.choose(id),entry.id);
  if(actual.scale.some(v=>v!==1)||actual.triangles<=0)throw Error('Invalid native appearance: '+entry.id);
  const name=entry.family+'-'+entry.sourceId+'.png';await page.locator('canvas').screenshot({path:path.join(out,name)});
  records.push({...actual,image:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')});
 }
 await page.evaluate(()=>window.tinderboxArtExample.choose('tinderbox:interior:aquarium-large'));
 await page.locator('#aftermath').click();await page.screenshot({path:path.join(out,'aquarium-destroyed-desktop.png')});
 await page.locator('#aftermath').click();await page.locator('#search').fill('writing desk');
 if(await page.locator('#asset option').count()!==1)throw Error('Search did not narrow dropdown');
 await page.locator('#search').fill('no-such-furnishing');if(await page.locator('#asset option').count()!==0)throw Error('Empty search did not show empty state');
 await page.locator('#search').fill('');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.tinderboxArtExample.choose('tinderbox:interior:renaissance-armchair'));
 await page.screenshot({path:path.join(out,'phone-armchair.png'),fullPage:true});
 await page.evaluate(()=>window.tinderboxArtExample.choose('tinderbox:waterfront:quay-stairs'));await page.screenshot({path:path.join(out,'phone-water-stairs.png'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Phone gallery overflows horizontally');
 const before=await page.evaluate(()=>window.tinderboxArtExample.snapshot());await page.evaluate(()=>window.tinderboxArtExample.dispose());
 if(await page.locator('canvas').count()!==0)throw Error('Canvas survives disposal');
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({scope:'Native WebGL with local Edge/SwiftShader; not a device FPS benchmark',records,search:true,phoneOverflow:overflow,beforeDispose:before,canvasRemoved:true,errors,failedRequests},null,2));
 console.log(JSON.stringify({output,assets:records.length,search:true,phone:true,canvasRemoved:true,errors,failedRequests}));
},{source:!built,owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',output,timeoutMs:120000});
