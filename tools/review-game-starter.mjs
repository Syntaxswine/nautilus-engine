import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
const checks=[],check=(name,details={})=>{checks.push({name,passed:true,...details});console.log('PASS '+name);};
await withArtReview('Standard title and door/stair acceptance',async({page,browser,baseURL,out,errors,failedRequests})=>{
 page.setDefaultTimeout(10000);
 const url=baseURL+'/examples/game-starter.html',snapshot=()=>page.evaluate(()=>window.nautilusStarter.snapshot());
 await page.goto(url);await page.locator('[data-action=start]').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);
 assert.equal(await page.locator('[data-action=continue]').isDisabled(),true);
 await page.screenshot({path:path.join(out,'title-desktop.png'),fullPage:true});
 await page.locator('[data-action=settings]').click();await page.locator('#auto-walk').uncheck();await page.getByRole('button',{name:'Apply',exact:true}).click();
 await page.locator('[data-action=credits]').click();assert.equal(await page.locator('.ng-dialog[open]').count(),1);await page.keyboard.press('Escape');
 await page.locator('[data-action=start]').focus();await page.keyboard.press('Enter');await page.locator('#game').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>document.activeElement.id),'yard');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 assert.equal((await snapshot()).actor.position.x,3.5);assert.match(await page.locator('#status').innerText(),/blocked/i);
 check('keyboard start and swept closed-door blocking');
 await page.locator('.test-controls summary').click();await page.locator('#lock').click();await page.locator('#have-key').uncheck();assert.equal(await page.locator('#unlock').isDisabled(),true);assert.match(await page.locator('#door-reason').innerText(),/key/i);
 await page.locator('#have-key').check();await page.locator('#unlock').click();assert.equal((await snapshot()).interactions.doors[0].locked,false);
 await page.locator('#block-door').check();assert.equal(await page.locator('#door-action').isDisabled(),true);assert.match(await page.locator('#door-reason').innerText(),/doorway/i);
 await page.locator('#block-door').uncheck();await page.locator('#door-action').click();assert.equal((await snapshot()).interactions.doors[0].open,true);
 await page.getByRole('button',{name:'Walk east',exact:true}).click();assert.equal((await snapshot()).actor.position.x,4);assert.equal(await page.locator('#door-action').isDisabled(),true);
 check('locked/key feedback and occupied door operation');
 for(let index=0;index<3;index++)await page.getByRole('button',{name:'Walk east',exact:true}).click();
 assert.equal((await snapshot()).actor.position.x,5.5);await page.locator('#stairs').click();
 assert.equal((await snapshot()).actor.position.x,5.5);await page.locator('#step').click();await page.locator('#step').click();
 const mid=await snapshot();assert.ok(mid.actor.position.h>0&&mid.actor.position.h<2.12);assert.equal(mid.actor.floorId,'floor-0');
 await page.locator('#save').click();await page.locator('.save-card summary').click();await page.locator('#export').click();const exported=await page.locator('#save-json').inputValue();assert.deepEqual(JSON.parse(exported),mid);
 await page.locator('#save-json').fill('{"kind":"unsupported","version":2}');await page.locator('#import').click();assert.deepEqual(await snapshot(),mid);assert.match(await page.locator('#status').innerText(),/unchanged/i);
 await page.locator('#save-json').fill(exported);await page.locator('#import').click();assert.deepEqual(await snapshot(),mid);
 await page.screenshot({path:path.join(out,'yard-mid-stair-desktop.png'),fullPage:true});
 await page.reload();await page.waitForFunction(()=>!document.querySelector('[data-action=continue]').disabled);
 assert.match(await page.locator('.ng-save-summary').innerText(),/stairs/i);await page.locator('[data-action=continue]').click();await page.locator('#game').waitFor({state:'visible'});assert.deepEqual(await snapshot(),mid);
 check('mid-stair save, reload, export/import and atomic invalid-import rejection',{heightM:mid.actor.position.h});
 await page.locator('#menu').click();await page.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);
 const beforeMenuArrow=await snapshot();await page.keyboard.press('ArrowRight');assert.deepEqual(await snapshot(),beforeMenuArrow);
 await page.locator('[data-action=start]').click();assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Keep playing');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Start new game');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Keep playing');
 await page.keyboard.press('Escape');assert.deepEqual(await snapshot(),beforeMenuArrow);
 check('menu input isolation, confirmation focus trap and cancellation');
 await page.locator('[data-action=settings]').click();await page.locator('#auto-walk').check();await page.getByRole('button',{name:'Apply',exact:true}).click();
 await page.locator('[data-action=continue]').click();await page.waitForFunction(()=>window.nautilusStarter.snapshot().actor.floorId==='floor-1');
 assert.equal((await snapshot()).actor.traversal,null);assert.equal((await snapshot()).actor.position.h,2.12);
 await page.locator('#stairs').click();await page.waitForFunction(()=>window.nautilusStarter.snapshot().actor.floorId==='floor-0'&&!window.nautilusStarter.snapshot().actor.traversal);
 check('continuous automatic stair travel in both directions');
 await page.locator('#menu').click();await page.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);await page.locator('[data-action=start]').click();await page.getByRole('button',{name:'Start new game',exact:true}).click();
 await page.locator('#game').waitFor({state:'visible'});assert.equal((await snapshot()).actor.position.x,2.5);assert.equal((await snapshot()).interactions.doors[0].open,false);
 check('confirmed new game creates a fresh yard');

 // Isolated module instance with deferred callbacks; real UI controls exercise race handling.
 await page.evaluate(async()=>{
   const {mountTitleScreen}=await import('../packages/game-ui/title.js'),root=document.createElement('div');root.id='async-title-probe';document.body.append(root);
   const pending=[],starts=[];let startCalls=0;
   const handle=mountTitleScreen(root,{title:'Async probe',credits:['<img src=x onerror=alert(1)>'],checkSave:({signal})=>new Promise((resolve,reject)=>pending.push({resolve,reject,signal})),onContinue:async()=>{},onStart:({signal})=>new Promise(resolve=>{startCalls++;starts.push({resolve,signal});})});
   window.titleProbe={handle,pending,starts,get calls(){return startCalls;},root};
 });
 const probe=page.locator('#async-title-probe');
 assert.equal(await probe.locator('[data-action=start]').isDisabled(),true);
 await page.evaluate(()=>titleProbe.pending[0].reject(Error('Expected saved-game inspection failure')));
 await page.waitForFunction(()=>!document.querySelector('#async-title-probe .ng-retry').hidden);await probe.locator('.ng-retry').click();
 await page.evaluate(()=>{titleProbe.handle.refreshSave();titleProbe.pending[1].resolve({available:true,summary:'stale'});titleProbe.pending[2].resolve({available:false});});
 await page.waitForFunction(()=>!document.querySelector('#async-title-probe [data-action=start]').disabled);
 assert.equal(await probe.locator('[data-action=continue]').isDisabled(),true);
 assert.equal(await page.evaluate(()=>titleProbe.pending[1].signal.aborted),true);
 await probe.locator('[data-action=credits]').click();assert.equal(await probe.locator('dialog[open] img').count(),0);await page.keyboard.press('Escape');
 await probe.locator('[data-action=start]').click();await page.evaluate(()=>document.querySelector('#async-title-probe [data-action=start]').click());assert.equal(await page.evaluate(()=>titleProbe.calls),1);
 await page.evaluate(()=>{titleProbe.handle.show();titleProbe.pending[3].resolve({available:false});});
 await page.waitForFunction(()=>!document.querySelector('#async-title-probe [data-action=start]').disabled);
 await page.evaluate(()=>titleProbe.starts[0].resolve());assert.equal(await probe.locator('.nautilus-title').isVisible(),true);
 assert.equal(await page.evaluate(()=>titleProbe.starts[0].signal.aborted),true);
 await page.evaluate(()=>{titleProbe.handle.refreshSave();titleProbe.handle.dispose();titleProbe.pending[4].resolve({available:true});titleProbe.root.remove();delete window.titleProbe;});
 check('loading, failed-save retry, latest-check wins, single start, stale completion and disposal');

 await page.evaluate(async()=>{
   const {mountTitleScreen}=await import('../packages/game-ui/title.js'),root=document.createElement('div');root.id='retry-title-probe';document.body.append(root);let count=0;
   const handle=mountTitleScreen(root,{title:'Retry probe',checkSave:async()=>({available:true,summary:'Checkpoint'}),onContinue:async()=>{if(++count===1)throw Error('Expected continue failure');},onStart:async()=>{}});
   window.retryProbe={handle,root};await handle.ready;
 });
 const retryProbe=page.locator('#retry-title-probe');await retryProbe.locator('[data-action=continue]').click();assert.match(await retryProbe.locator('.ng-status').innerText(),/could not be opened/i);assert.equal(await retryProbe.locator('.nautilus-title').isVisible(),true);
 await retryProbe.locator('[data-action=continue]').click();await retryProbe.locator('.nautilus-title').waitFor({state:'hidden'});
 await page.evaluate(()=>{retryProbe.handle.dispose();retryProbe.root.remove();delete window.retryProbe;});
 check('failed continue preserves menu and succeeds on retry');

 const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
 try{
   const mobile=await phone.newPage();mobile.on('pageerror',error=>errors.push(error.message));mobile.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});mobile.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});
   await mobile.goto(url);await mobile.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);
   await mobile.screenshot({path:path.join(out,'title-phone.png'),fullPage:true});
   const titleTargets=await mobile.locator('.ng-actions button:visible').evaluateAll(nodes=>nodes.map(node=>({label:node.textContent,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));
   assert.ok(titleTargets.every(target=>target.height>=44&&target.width>=44));
   await mobile.locator('[data-action=start]').tap();await mobile.locator('#game').waitFor({state:'visible'});await mobile.locator('#door-action').tap();
   assert.equal(await mobile.evaluate(()=>window.nautilusStarter.snapshot().interactions.doors[0].open),true);
   await mobile.screenshot({path:path.join(out,'yard-phone.png'),fullPage:true});
   for(const viewport of [{width:320,height:700},{width:640,height:450}]){
     await mobile.setViewportSize(viewport);await mobile.locator('#menu').tap();await mobile.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);
     const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
     await mobile.screenshot({path:path.join(out,'title-'+viewport.width+'.png'),fullPage:true});
     await mobile.locator('[data-action=continue]').tap();await mobile.locator('#game').waitFor({state:'visible'});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
   check('native touch start/door, 44px menu controls, 320px phone and 640px reflow',{titleTargets,reflowNote:'640 CSS pixels represents the width available after 200% browser zoom on a 1280px display; it is a reflow equivalent, not a native zoom measurement.'});
 }finally{await phone.close();}
 const git=execFileSync('git',['-c','safe.directory='+projectRoot.replaceAll('\\','/'),'rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim();
 const provenance=path.join(projectRoot,'dist/build-provenance.json');
 fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify({sourceCommit:git,sourceMode:process.env.NAUTILUS_REVIEW_SOURCE==='1',buildProvenanceSha256:fs.existsSync(provenance)?createHash('sha256').update(fs.readFileSync(provenance)).digest('hex'):null,checks,errors,failedRequests},null,2));
},{output:'game-starter',timeoutMs:240000,source:process.env.NAUTILUS_REVIEW_SOURCE==='1'});
console.log('Standard game starter browser acceptance passed.');