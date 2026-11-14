import fs from 'node:fs';import {withArtReview} from '../art-review-browser.mjs';import {buildMountDoraContent} from './content.mjs';
import {preserveReviewSources} from './review-record.mjs';
const output='mount-dora-presentation-review-v4';preserveReviewSources(output);
buildMountDoraContent('artifacts/mount-dora-intake/content',{engineURL:'../../../packages/'});
await withArtReview('Mount Dora matched source and photo-guided Donnelly views',async({page,browser,baseURL,out,errors,failedRequests})=>{
 const records=[];
 for(const presentation of ['source','engine']){
  await page.goto(baseURL+'/apps/mount-dora/?content=/artifacts/mount-dora-intake/content/index.js&place=donnelly&manual=1&presentation='+presentation);await page.waitForFunction(()=>window.nautilusMountDora||/failed|Error|UNAVAILABLE|INVALID/.test(document.querySelector('#status')?.textContent),{timeout:90000});
  for(const [name,position,target]of [['street',[434,13,493],[400,3.5,478]],['neighborhood',[444,35,512],[400,2,478]],['detail',[425,9,483],[403,3.6,477]]]){
   const data=await page.evaluate(({position,target})=>{const api=window.nautilusMountDora,s=api.surface;api.setup.dispatch({version:1,type:'pause',paused:true});s.resize();s.camera.clearViewOffset();s.camera.position.set(...position);s.camera.lookAt(...target);s.camera.updateProjectionMatrix();s.camera.updateMatrixWorld();s.draw();return api.read();},{position,target});await page.screenshot({path:out+'/'+presentation+'-'+name+'.png'});records.push({presentation,name,position,target,metrics:data.metrics,pose:data.pose});
  }
  await page.evaluate(()=>window.nautilusMountDora.dispose());
 }
 const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});let touch;
 try{const p=await phone.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()});});await p.goto(baseURL+'/apps/mount-dora/?content=/artifacts/mount-dora-intake/content/index.js');await p.waitForFunction(()=>window.nautilusMountDora,{timeout:90000});await p.waitForFunction(()=>window.nautilusMountDora.setup.read().camera.bounds?.occlusions.some(x=>x.id==='map'));
  const before=await p.evaluate(()=>window.nautilusMountDora.read()),button=p.locator('.pui-menu-button');await button.tap();await p.waitForFunction(()=>document.querySelector('.pui-setup')?.open);await p.keyboard.press('Escape');const box=await p.locator('.pui-stick').boundingBox(),cdp=await phone.newCDPSession(p),x=box.x+box.width/2,y=box.y+box.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:4,radiusY:4,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-25,radiusX:4,radiusY:4,id:1}]});await p.waitForTimeout(350);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  touch=await p.evaluate(()=>{const a=window.nautilusMountDora,setup=document.querySelector('.pui-menu-button').getBoundingClientRect(),panel=document.querySelector('#intake').getBoundingClientRect();return {read:a.read(),camera:a.setup.read().camera,overlap:!(setup.right<=panel.left||setup.left>=panel.right||setup.bottom<=panel.top||setup.top>=panel.bottom),width:innerWidth,scrollWidth:document.documentElement.scrollWidth};});if(touch.overlap||touch.width!==touch.scrollWidth||JSON.stringify(before.pose.position)===JSON.stringify(touch.read.pose.position))throw Error('Touch/HUD layout or movement failed.');await p.screenshot({path:out+'/phone-hud-walking.png'});await p.evaluate(()=>window.nautilusMountDora.dispose());
 }finally{await phone.close();}
 fs.writeFileSync(out+'/receipt.json',JSON.stringify({matchedCamera:true,records,touch},null,2));
},{source:true,owner:'01a1810c-62da-7210-a1ca-b72b449ce024',output,timeoutMs:180000});
