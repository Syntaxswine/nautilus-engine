// Drives the unmodified donor art workbench. No engine renderer/provider is implemented.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview} from '../../../tools/art-review-browser.mjs';
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
await withArtReview('Original Farmyard pane art workbench review',async({page,baseURL,out,errors,failedRequests})=>{
 await page.goto(baseURL+'/artifacts/window-art-audit/source/sites/tactical-animal/dist/art/windows/index.html');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.endsWith('ready'));
 const records=[];
 async function controls(values){
  await page.evaluate(values=>{for(const [id,value]of Object.entries(values))document.getElementById(id).value=value;document.querySelector('#pattern').dispatchEvent(new Event('change',{bubbles:true}));},values);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.endsWith('ready'));
  const status=await page.locator('#status').innerText();if(!status.includes('WebGL preview'))throw Error('Original art preview did not use native WebGL.');
  return status;
 }
 await controls({height:'all',span:'all',pattern:'all',view:'front',finish:'steel',wall:'brick',pane:'r0c0'});
 if(await page.locator('.card').count()!==39)throw Error('Expected all 39 original presets.');
 for(let i=0;i<39;i++){
  const card=page.locator('.card').nth(i),id=await card.locator('.id').innerText(),file=id+'.png';
  await card.screenshot({path:path.join(out,file)});records.push({id,view:'front',finish:'steel',wall:'brick',removedPane:'r0c0',image:file,sha256:sha(path.join(out,file))});
 }
 for(const [name,values]of [
  ['full-six-back',{height:'full',span:'3',pattern:'grid-3x2',view:'back',finish:'sage',wall:'concrete',pane:'r1c2'}],
  ['waist-six-corrugated',{height:'waist',span:'3',pattern:'grid-3x2',view:'oblique',finish:'ivory',wall:'corrugated',pane:'r1c2'}],
  ['tall-sheet',{span:'custom',width:'20','sheet-height':'5','height-unit':'storeys',view:'front'}]
 ]){const status=await controls(values);const file=name+'.png';await page.locator('#catalog').screenshot({path:path.join(out,file)});records.push({id:name,controls:values,status,image:file,sha256:sha(path.join(out,file))});}
 await page.setViewportSize({width:390,height:844});await controls({height:'waist',span:'1',pattern:'grid-2x2',view:'oblique',finish:'steel',wall:'brick'});await page.screenshot({path:path.join(out,'phone-source.png'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 // Leaving invokes the original pagehide handler and its owned preview/library disposal.
 await page.goto('about:blank');
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({scope:'Unmodified source art workbench, native WebGL via local Edge/SwiftShader. Not an engine/provider or game-physics acceptance.',records,phoneHorizontalOverflow:overflow,sourcePagehideExecuted:true,errors,failedRequests},null,2));
 console.log(JSON.stringify({presets:39,additionalViews:3,phoneHorizontalOverflow:overflow,errors,failedRequests}));
},{source:true,owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',output:'window-native-source',timeoutMs:120000});
