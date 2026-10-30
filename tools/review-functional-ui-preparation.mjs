import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
const checks=[],passed=name=>{checks.push(name);console.log('PASS '+name);};
await withArtReview('Functional player UI preparation',async({page,browser,baseURL,out,errors,failedRequests})=>{
 page.setDefaultTimeout(10000);const url=baseURL+'/examples/functional-player-preparation.html';
 const snapshot=()=>page.evaluate(()=>window.functionalUIPreparation.snapshot());
 await page.goto(url);await page.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);
 await page.screenshot({path:path.join(out,'preparation-title-desktop.png'),fullPage:true});
 await page.locator('#hold-prepare').check();await page.locator('[data-action=start]').click();await page.locator('#load-state').waitFor({state:'visible'});await page.locator('#release-load').click();await page.locator('#player').waitFor({state:'visible'});
 const accepted=(await snapshot()).acceptedId;assert.ok(accepted);assert.equal((await snapshot()).owned,1);
 await page.locator('#input-surface').focus();await page.keyboard.down('w');await page.keyboard.down('d');
 let moves=(await snapshot()).logs.filter(value=>value.move);assert.ok(Math.abs(moves.at(-1).move.x-Math.SQRT1_2)<1e-8);assert.ok(Math.abs(moves.at(-1).move.y+Math.SQRT1_2)<1e-8);
 const heldCount=moves.length;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal((await snapshot()).logs.filter(value=>value.move).length,heldCount);
 await page.keyboard.up('w');await page.keyboard.up('d');assert.deepEqual((await snapshot()).logs.filter(value=>value.move).at(-1).move,{x:0,y:0});
 await page.keyboard.press('p');assert.equal(await page.locator('[data-action=pause]').getAttribute('aria-pressed'),'true');await page.keyboard.press('p');assert.equal(await page.locator('[data-action=pause]').getAttribute('aria-pressed'),'false');
 await page.keyboard.press('e');assert.equal((await snapshot()).logs.at(-1).authoritativeEffects,0);
 passed('scoped held keyboard input, normalized diagonals, no frame-driven commands and pause/resume');
 const east=page.getByRole('button',{name:'Walk east',exact:true});await east.hover();await page.mouse.down();assert.deepEqual((await snapshot()).logs.filter(value=>value.move).at(-1).move,{x:1,y:0});await page.mouse.up();assert.deepEqual((await snapshot()).logs.filter(value=>value.move).at(-1).move,{x:0,y:0});
 await page.locator('#input-surface').focus();await page.keyboard.down('w');await page.locator('#preset').focus();assert.deepEqual((await snapshot()).logs.filter(value=>value.move).at(-1).move,{x:0,y:0});await page.keyboard.up('w');
 passed('native pointer release and focus loss clear held movement');

 // Controlled missing-release events exercise the mounted component in a real DOM.
 // Pointer capture is stubbed only on this synthetic probe, not on the native fixture above.
 const recovery=await page.evaluate(async()=>{
  const {mountPlayerControls}=await import('../packages/functional-scene-ui/controls.js'),root=document.createElement('div'),surface=document.createElement('div'),mount=document.createElement('div'),moves=[],marks={};
  surface.tabIndex=0;root.append(surface,mount);document.body.append(root);
  const controls=mountPlayerControls(mount,{inputTarget:surface,onMove:vector=>moves.push(vector)}),east=mount.querySelector('[data-move="Walk east"]');
  east.setPointerCapture=()=>{};
  const fire=(type,pointerType='mouse',buttons=1,pointerId=31,target=east)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,button:type==='pointerdown'?0:-1,buttons,pointerType,pointerId}));
  const mark=name=>{marks[name]=structuredClone(moves.at(-1));};
  try{
   controls.update({active:true});surface.focus();fire('pointerdown');mark('mousePress');fire('pointermove','mouse',0,31,window);mark('mouseHover');
   fire('pointermove','mouse',1);mark('mouseHeldAfterRecovery');fire('pointerdown');mark('freshMousePress');fire('pointerup','mouse',0);
   fire('pointerdown','pen');fire('pointermove','pen',0,31,window);mark('penHover');
   fire('pointerdown','pen');surface.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW',bubbles:true}));fire('pointermove','pen',0,31,window);mark('keyboardSurvivesPenRecovery');window.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW'}));
   fire('pointerdown','touch');fire('pointermove','touch',0,31,window);mark('touchZeroButtons');fire('pointermove','mouse',0,99,window);mark('otherPointerHover');
   east.style.transform='translate(80px, 0)';fire('pointermove','touch',0);mark('heldDirectionAfterLayoutChange');fire('pointerup','touch',0);mark('touchRelease');
   for(const ending of ['pointerup','pointercancel','lostpointercapture']){fire('pointerdown');fire(ending,'mouse',0);mark(ending);}
   fire('pointerdown');window.dispatchEvent(new Event('blur'));mark('blur');fire('pointermove','mouse',1);mark('hoverAfterBlur');
   fire('pointerdown');controls.update({active:true,paused:true});mark('pause');controls.update({active:true});fire('pointermove','mouse',1);mark('resumeRequiresPress');fire('pointerdown');mark('freshPressAfterPause');
   controls.update({active:false});mark('inactive');fire('pointerdown');mark('inactivePress');controls.update({active:true});fire('pointerdown');controls.dispose();mark('dispose');
   controls.update({active:true});fire('pointerdown');fire('pointermove','mouse',0,31,window);mark('retiredInput');
   return marks;
  }finally{controls.dispose();root.remove();}
 });
 for(const name of ['mousePress','freshMousePress','touchZeroButtons','otherPointerHover','heldDirectionAfterLayoutChange','freshPressAfterPause'])assert.deepEqual(recovery[name],{x:1,y:0},name);
 assert.deepEqual(recovery.keyboardSurvivesPenRecovery,{x:0,y:-1});
 for(const name of ['mouseHover','mouseHeldAfterRecovery','penHover','touchRelease','pointerup','pointercancel','lostpointercapture','blur','hoverAfterBlur','pause','resumeRequiresPress','inactive','inactivePress','dispose','retiredInput'])assert.deepEqual(recovery[name],{x:0,y:0},name);
 passed('mouse/pen no-buttons recovery, fresh press, independent keys, touch continuity, blur, pause, gating and disposal');

 await page.locator('#fail-prepare').check();await page.locator('#reprepare').click();assert.equal(await page.locator('[data-owned-handle="'+accepted+'"]').count(),1);assert.equal(await page.locator('[data-action=interact]').isDisabled(),true);
 await page.locator('#release-load').click();await page.locator('#error').waitFor({state:'visible'});assert.equal((await snapshot()).acceptedId,accepted);assert.equal((await snapshot()).owned,1);assert.equal((await snapshot()).borrowedDisposals,0);
 await page.locator('#retry').click();await page.locator('#release-load').click();await page.waitForFunction(id=>window.functionalUIPreparation.snapshot().acceptedId!==id,accepted);
 assert.equal((await snapshot()).owned,1);assert.equal((await snapshot()).retired,1);const replacement=(await snapshot()).acceptedId;
 await page.locator('#reprepare').click();await page.locator('#cancel-load').click();await page.waitForFunction(()=>!document.querySelector('[data-action=continue]').disabled);
 assert.equal((await snapshot()).acceptedId,replacement);const beforeMenuMoves=(await snapshot()).logs.filter(value=>value.move).length;await page.keyboard.press('w');assert.equal((await snapshot()).logs.filter(value=>value.move).length,beforeMenuMoves);
 await page.locator('[data-action=continue]').click();await page.locator('#player').waitFor({state:'visible'});assert.equal((await snapshot()).acceptedId,replacement);
 passed('failed and cancelled replacement retains accepted resources; retry and title continue reuse correct handles');
 await page.locator('#preset').selectOption('incomplete');await page.getByRole('button',{name:'Select sample-assembly / sample-door'}).click();assert.match(await page.locator('#selected').innerText(),/connections\/upper/);
 await page.locator('#reprepare').click();await page.locator('#release-load').click();await page.locator('#error').waitFor({state:'visible'});assert.equal((await snapshot()).acceptedId,replacement);
 await page.locator('#preset').selectOption('unsupported');assert.equal(await page.locator('.nr-classification').getAttribute('data-classification'),'unsupported');
 await page.locator('#preset').selectOption('decorative');assert.equal(await page.locator('.nr-classification').getAttribute('data-classification'),'decorative');await page.locator('#preset').selectOption('functional');
 passed('functional/decorative/incomplete/unsupported feedback and exact source selection');
 const initial=(await snapshot()).floor.selectedId;await page.locator('#between').click();assert.equal((await snapshot()).floor.selectedId,initial);assert.match(await page.locator('.npf-transition').innerText(),/Between floor 1 and 2/);
 for(let index=0;index<5;index++)await page.locator('#arrive').click();assert.equal((await snapshot()).floor.selectedId,'fixture-floor-5');assert.equal(await page.locator('.fn-floor:visible').count(),5);
 await page.locator('[data-floor-id="fixture-floor-3"]').click();await page.locator('#arrive').click();assert.equal((await snapshot()).floor.selectedId,'fixture-floor-3');assert.equal((await snapshot()).floor.character.floorId,'fixture-floor-6');
 await page.getByRole('button',{name:'Return to character follow'}).click();assert.equal((await snapshot()).floor.selectedId,'fixture-floor-6');assert.equal((await snapshot()).floor.floors.length,7);
 await page.screenshot({path:path.join(out,'preparation-player-desktop.png'),fullPage:true});
 passed('host-confirmed landing identity, five-label follow/manual return and visibility-only floor callbacks');
 const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 try{
  const mobile=await phone.newPage();mobile.on('pageerror',error=>errors.push(error.message));mobile.on('console',message=>{if(message.type()==='error')errors.push(message.text());});mobile.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});
  await mobile.goto(url);await mobile.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);await mobile.locator('[data-action=start]').tap();await mobile.locator('#player').waitFor({state:'visible'});
  await mobile.getByRole('button',{name:'Walk east',exact:true}).tap();
  const log=await mobile.evaluate(()=>window.functionalUIPreparation.snapshot().logs.filter(value=>value.move));assert.deepEqual(log.at(-2).move,{x:1,y:0});assert.deepEqual(log.at(-1).move,{x:0,y:0});
  const targets=await mobile.locator('.nautilus-player-controls button').evaluateAll(nodes=>nodes.map(node=>({label:node.textContent,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));assert.ok(targets.every(value=>value.width>=44&&value.height>=44));
  await mobile.screenshot({path:path.join(out,'preparation-player-phone.png'),fullPage:true});await mobile.setViewportSize({width:320,height:700});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await mobile.screenshot({path:path.join(out,'preparation-player-320.png'),fullPage:true});
  await mobile.evaluate(()=>window.functionalUIPreparation.dispose());assert.equal(await mobile.evaluate(()=>window.functionalUIPreparation.snapshot().owned),0);
  passed('native phone touch down/up, 44px targets, 320px reflow and component cleanup');
 }finally{await phone.close();}
 await page.evaluate(()=>window.functionalUIPreparation.dispose());const final=await snapshot();assert.equal(final.owned,0);assert.equal(final.borrowedDisposals,0);assert.equal(final.flow.phase,'disposed');
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.startsWith(location.origin)).map(entry=>({path:new URL(entry.name).pathname,transferBytes:entry.transferSize,encodedBodyBytes:entry.encodedBodySize,decodedBodyBytes:entry.decodedBodySize})));assert.equal(resources.some(entry=>/three[.](?:module|core)[.]js|[\\/]vendor[\\/]/.test(entry.path)),false);
 const sourceCommit=execFileSync('git',['-c','safe.directory='+projectRoot.replaceAll('\\','/'),'rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim(),provenance=path.join(projectRoot,'dist/build-provenance.json');
 const sourceMode=process.env.NAUTILUS_REVIEW_SOURCE==='1',controlsPath='packages/functional-scene-ui/controls.js',digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const controlsSourceSha256=digest(path.join(projectRoot,controlsPath)),controlsServedSha256=digest(path.join(projectRoot,sourceMode?'':'dist',controlsPath));assert.equal(controlsServedSha256,controlsSourceSha256,'The reviewed private controls must match the working tree.');
 fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify({sourceCommit,sourceMode,controlsPath,controlsSourceSha256,controlsServedSha256,pointerRecovery:{method:'Synthetic missed-release PointerEvents on a mounted DOM component; capture stubbed only on the synthetic probe. Native mouse and mobile touch down/up are exercised separately.',observed:recovery},buildProvenanceSha256:fs.existsSync(provenance)?createHash('sha256').update(fs.readFileSync(provenance)).digest('hex'):null,resources,resourceNote:'Measured local HTTP resource timing for this UI fixture only; excludes the navigation document and any native compiler/scene/package workload.',scope:'UI preparation only; native art, compiled runtime, physical door/stair traversal, game checkpoints and installed public package acceptance are not run.',compilerPin:null,artistKitPin:null,checks,errors,failedRequests,final},null,2));
},{output:'functional-ui-preparation',timeoutMs:180000,source:process.env.NAUTILUS_REVIEW_SOURCE==='1'});
console.log('Functional UI preparation browser checks passed.');