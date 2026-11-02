// Gate A source component proof only. No planner, real host save, renderer or gameplay claim.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {withArtReview,projectRoot} from './art-review-browser.mjs';
const checks=[],captures=[],files=['candidates/tile-stack/ui/contract.js','candidates/tile-stack/ui/panel.js','candidates/tile-stack/ui/styles.css','candidates/tile-stack/ui/fixture-adapter.js','candidates/tile-stack/ui/fixture.js','candidates/tile-stack/ui/fixture.html','packages/floor-navigation/index.js','packages/floor-navigation/dom.js','packages/floor-navigation/style.css','apps/editor/smart-tile/contract.js','apps/editor/smart-tile/input.js','tests/ui-tile-stack.test.mjs','tools/ui-tile-stack-review.mjs'];
const report={scope:'Gate A UI component fixture only; no stacked geometry/clearance/105-relations/CAS/history/save/installed-host or physical-device proof',base:'5d69c2130eb64b6f4e31bc672e884bdc33bf47d2',sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim(),hashes:Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(projectRoot,file))).digest('hex')])),checks,captures};
const pass=name=>{checks.push(name);console.log('PASS '+name);};
// Preserve each disposable review's exact nonsecret inputs before acquisition.
const restartDir=path.join(projectRoot,'artifacts/tile-stack-ui/restart-inputs');
fs.mkdirSync(restartDir,{recursive:true});
for(const [file,hash]of Object.entries(report.hashes)){
 const bytes=fs.readFileSync(path.join(projectRoot,file));
 fs.writeFileSync(path.join(restartDir,hash+path.extname(file)),bytes);
}

await withArtReview('Tile-stack Gate A UI component proof',async({page,browser,baseURL,out})=>{
 page.setDefaultTimeout(10000);const url=baseURL+'/candidates/tile-stack/ui/fixture.html',panel=()=>page.locator('.tile-stack-ui'),action=name=>panel().locator('[data-action="'+name+'"]'),calls=()=>page.evaluate(()=>tileStackUIProof.fixture.calls);
 const ready=()=>page.waitForFunction(()=>document.body.dataset.ready==='true'),reset=async()=>{await page.goto(url);await ready();};
 const patch=value=>page.evaluate(value=>tileStackUIProof.fixture.patch(value),value),idle=()=>page.waitForFunction(()=>!document.querySelector('.tile-stack-ui [data-action=review]').disabled||tileStackUIProof.fixture.peek().phase==='idle');
 try{
  report.browser=await browser.version();await page.emulateMedia({reducedMotion:'reduce'});await reset();assert.equal(await panel().locator('.ts-fault').isVisible(),false);assert.match(await page.locator('.proof').innerText(),/No planner/);
  const labels=()=>panel().locator('.fn-floor:visible').allTextContents();
  assert.deepEqual(await labels(),['1','2','3','4','5']);await page.locator('#view-probe').focus();for(let i=0;i<7;i++)await page.keyboard.press('PageUp');assert.deepEqual(await labels(),['6','7','8','9','10']);assert.match(await panel().locator('.ts-current').innerText(),/8 · 14.84 m/);
  for(let i=0;i<7;i++)await page.keyboard.press('PageUp');assert.deepEqual(await labels(),['11','12','13','14','15']);assert.match(await panel().locator('.ts-current').innerText(),/15 · 29.68 m/);assert.equal(await panel().getByRole('button',{name:'Next floor',exact:true}).isDisabled(),true);
  await page.locator('#profile').selectOption('nonuniform');await page.locator('#view-probe').focus();for(let i=0;i<14;i++)await page.keyboard.press('PageUp');assert.match(await panel().locator('.ts-current').innerText(),/15 · 42.7 m/);
  assert.equal(await page.evaluate(()=>tileStackUIProof.navigation.state.character),null);assert.equal(await page.evaluate(()=>tileStackUIProof.navigation.state.contact),null);
  pass('actual floor controller/widget shows five labels on fifteen declared floors and preserves nonuniform native elevations');

  await reset();await panel().getByLabel('Requested minimum clearance (m)').focus();await page.keyboard.press('PageUp');assert.equal(await page.evaluate(()=>tileStackUIProof.navigation.state.selectedId),'F00');
  await page.locator('#open-dialog').click();await page.evaluate(()=>document.getElementById('view-probe').dispatchEvent(new KeyboardEvent('keydown',{key:'PageUp',bubbles:true,cancelable:true})));assert.equal(await page.evaluate(()=>tileStackUIProof.navigation.state.selectedId),'F00');await page.locator('#close-dialog').click();
  await page.locator('#view-probe').focus();await page.evaluate(()=>{const canvas=document.getElementById('view-probe');for(const options of [{isComposing:true},{ctrlKey:true},{altKey:true},{metaKey:true},{repeat:true}])canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'PageUp',bubbles:true,cancelable:true,...options}));});assert.equal(await page.evaluate(()=>tileStackUIProof.navigation.state.selectedId),'F00');
  await page.evaluate(()=>{const foreign=document.createElement('button');foreign.id='foreign-key-scope';foreign.textContent='Outside keyboard owner';document.body.append(foreign);foreign.focus();});await page.keyboard.press('PageUp');assert.equal(await page.evaluate(()=>tileStackUIProof.navigation.state.selectedId),'F00');
  await page.locator('#view-probe').focus();await panel().locator('.fn-floor[aria-pressed=true]').hover();await page.mouse.wheel(0,-100);await page.waitForFunction(()=>tileStackUIProof.navigation.state.selectedId==='F01');assert.equal(await page.evaluate(()=>tileStackUIProof.host.wheel),0);
  await page.locator('#view-probe').hover();await page.mouse.wheel(0,100);await page.waitForFunction(()=>tileStackUIProof.host.wheel===1);assert.equal(await page.evaluate(()=>tileStackUIProof.navigation.state.selectedId),'F01');
  pass('owned PageUp/PageDown guards forms/dialogs/IME/modifiers/repeats and keeps selector wheel separate from canvas zoom');

  await reset();await page.locator('#view-probe').focus();
  const steps=await page.evaluate(()=>{const target=document.querySelector('.fn-floor[aria-pressed=true]');const dispatch=(time,delta)=>{const event=new WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true});Object.defineProperty(event,'timeStamp',{value:time});target.dispatchEvent(event);return {id:tileStackUIProof.navigation.state.selectedId,cancelled:event.defaultPrevented};};const values=[];for(let i=0;i<121;i++)values.push(dispatch(1000+i*5,-2));values.push(dispatch(1779,-100));values.push(dispatch(1959,-100));return values;});
  assert.equal(steps.at(-3).id,'F01');assert.equal(steps.at(-2).id,'F01');assert.equal(steps.at(-1).id,'F02');assert.ok(steps.every(step=>step.cancelled));report.controlledWheel={method:'Fresh actual DOM widget; synthetic timestamps only, never mixed with the native gate',events:steps.length};
  pass('actual widget wheel gate latches a long burst and honours separate 179/180 ms gesture boundaries');

  await reset();await page.evaluate(()=>tileStackUIProof.fixture.patch({acceptedMinimumClearanceM:2}));await panel().getByLabel('Requested minimum clearance (m)').fill('2.123456789012345');await action('stack').click();await idle();
  let log=await calls(),request=log.find(call=>call.name==='setDraft'&&call.args[0]?.tool==='stack').args[0];assert.equal(request.floorIds.length,15);assert.equal(request.minimumClearanceM,2.123456789012345);assert.deepEqual(request.origin,[0,0]);assert.equal(request.widthM,8);assert.equal(request.depthM,4);assert.equal(request.seed,17);assert.equal(request.finishId,'skin.painterly');assert.deepEqual(Object.keys(request).sort(),['tool','ownerId','origin','widthM','depthM','seed','floorIds','minimumClearanceM','lockPolicy','finishId'].sort());
  await panel().getByRole('button',{name:'Clear selection',exact:true}).click();await panel().getByLabel('Stack floor 1 · 0 m',{exact:true}).check();await panel().getByLabel('Stack floor 15 · 29.68 m',{exact:true}).check();await panel().getByLabel('Requested minimum clearance (m)').fill('3.125');await action('stack').click();await idle();
  request=(await calls()).filter(call=>call.name==='setDraft'&&call.args[0]?.tool==='stack').at(-1).args[0];assert.deepEqual(request.floorIds,['F00','F14']);assert.equal(request.minimumClearanceM,3.125);assert.match(await panel().getByLabel('Accepted saved minimum clearance').innerText(),/2 m/);assert.equal(await page.evaluate(()=>tileStackUIProof.fixture.peek().acceptedMinimumClearanceM),2);
  await patch({diagnostics:[{code:'CLEARANCE_UNSUPPORTED',path:'/stack/owners',ownerIds:['fixture.surface.01','fixture.surface.15'],reservationIds:['body.lower','body.upper'],requiredCapability:'projected-separation-vNext',message:'Named owner pair has insufficient declared clearance.',action:'Keep the requirement; change the source/floors explicitly.'}]});assert.equal(await panel().getByLabel('Requested minimum clearance (m)').inputValue(),'3.125');assert.match(await panel().locator('.ts-diagnostics').innerText(),/fixture.surface.01/);assert.match(await panel().locator('.ts-diagnostics').innerText(),/body.upper/);assert.match(await panel().locator('.ts-diagnostics').innerText(),/projected-separation-vNext/);
  pass('stack form submits exact source identity, declared member IDs and requested minimum without inventing relations or lowering clearance');

  await reset();await panel().getByLabel('Cosmetic finish',{exact:true}).selectOption('fixture.finish.brick');await action('finish').click();await idle();request=(await calls()).find(call=>call.name==='setDraft'&&call.args[0]?.tool==='finish').args[0];assert.deepEqual(request,{tool:'finish',ownerId:'fixture.surface.15',finishId:'fixture.finish.brick'});
  await panel().getByLabel('Authored owner',{exact:true}).selectOption('fixture.surface.02');await page.waitForFunction(()=>tileStackUIProof.fixture.peek().selectedOwnerId==='fixture.surface.02');assert.equal(await action('finish').isDisabled(),true);assert.match(await panel().locator('.ts-hint').filter({hasText:'Selected owner is locked'}).innerText(),/locked/);
  await panel().getByLabel('Authored owner',{exact:true}).selectOption('fixture.surface.15');await page.waitForFunction(()=>tileStackUIProof.fixture.peek().selectedOwnerId==='fixture.surface.15');await panel().getByLabel('Cosmetic finish',{exact:true}).selectOption('fixture.finish.brick');
  await page.evaluate(()=>{const f=tileStackUIProof.fixture,s=f.peek();s.finishCatalogue.entries=s.finishCatalogue.entries.map(entry=>entry.id==='fixture.finish.brick'?{...entry,version:2}:entry);f.patch({finishCatalogue:s.finishCatalogue});});
  assert.equal(await action('finish').isDisabled(),true);assert.match(await panel().locator('.ts-fault').innerText(),/identity changed/);
  pass('friendly typed finishes use fixed IDs, respect locks and reject an in-session version mapping change');

  const workspaceCases=['changed profile ID','unsupported profile version','changed floor-table ID','missing profile identity','non-record profile','inherited profile fields','missing source SHA','empty workspace ID'];
  report.workspaceWitnesses=[];
  for(const name of workspaceCases){
    await reset();await patch({phase:'review',reviewId:'must-not-cross-workspace'});
    const result=await page.evaluate(async name=>{
      const proof=tileStackUIProof,f=proof.fixture,read=f.adapter.getSnapshot;
      const before=read();
      const mutate=s=>{
        if(name==='changed profile ID')s.workspace.floorProfile.id='another-host-profile';
        else if(name==='unsupported profile version')s.workspace.floorProfile.version=99;
        else if(name==='changed floor-table ID')s.workspace.floorTableId='another-floor-table';
        else if(name==='missing profile identity')s.workspace.floorProfile={};
        else if(name==='non-record profile')s.workspace.floorProfile=[];
        else if(name==='inherited profile fields')s.workspace.floorProfile=Object.create({id:'inherited-profile',version:99});
        else if(name==='missing source SHA')delete s.workspace.sourceSha256;
        else if(name==='empty workspace ID')s.workspace.id='';
        return s;
      };
      f.adapter.getSnapshot=()=>mutate(read());
      const accepted=proof.panel.refresh();
      // Stale programmatic events must not bypass the native disabled state.
      for(const form of proof.panel.element.querySelectorAll('form'))form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      proof.panel.element.querySelector('[data-action=apply]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
      const blocked={stack:proof.panel.element.querySelector('[data-action=stack]').disabled,finish:proof.panel.element.querySelector('[data-action=finish]').disabled,apply:proof.panel.element.querySelector('[data-action=apply]').disabled};
      const result={name,hostFlags:{stack:before.actions.stack,finish:before.actions.finish,apply:before.actions.apply},refreshAccepted:accepted!==null,blocked,authoringCalls:f.calls.filter(call=>['setDraft','apply'].includes(call.name)).length,reason:proof.panel.element.querySelector('.ts-fault').textContent};
      if(['changed profile ID','changed floor-table ID'].includes(name)){
        let reads=0;f.adapter.getSnapshot=()=>{reads++;return read();};
        proof.panel.refresh();f.notify();
        result.oldMountRemainsRetired=proof.panel.element.querySelector('[data-action=stack]').disabled&&proof.panel.element.querySelector('[data-action=apply]').disabled;
        result.retiredMountReads=reads;
        proof.panel.dispose();
        const {mountTileStackUI}=await import('/candidates/tile-stack/ui/panel.js');
        const {createTileStackUIFixture}=await import('/candidates/tile-stack/ui/fixture-adapter.js');
        const next=createTileStackUIFixture(proof.navigation,'aft-native-fifteen');
        next.patch({workspace:mutate(next.peek()).workspace});
        const mounted=mountTileStackUI(document.getElementById('candidate-panel'),next.adapter,{floorController:proof.navigation,keyboardTarget:document.getElementById('workspace')});
        try{
          result.explicitNewMount={fault:!mounted.element.querySelector('.ts-fault').hidden,stack:!mounted.element.querySelector('[data-action=stack]').disabled,finish:!mounted.element.querySelector('[data-action=finish]').disabled,oldReviewNotApplied:mounted.element.querySelector('[data-action=apply]').disabled};
        }finally{mounted.dispose();}
        result.borrowedServicesSurvive=f.diagnostics().borrowedAdapterDisposals===0&&next.diagnostics().borrowedAdapterDisposals===0&&proof.navigation.state.selectedId==='F00';
      }
      return result;
    },name);
    assert.deepEqual(result.hostFlags,{stack:true,finish:true,apply:true},name);
    assert.equal(result.refreshAccepted,false,name);assert.deepEqual(result.blocked,{stack:true,finish:true,apply:true},name);
    assert.equal(result.authoringCalls,0,name);assert.ok(result.reason.length>0,name);
    if(result.explicitNewMount){
      assert.equal(result.oldMountRemainsRetired,true,name);assert.equal(result.retiredMountReads,0,name);
      assert.deepEqual(result.explicitNewMount,{fault:false,stack:true,finish:true,oldReviewNotApplied:true},name);assert.equal(result.borrowedServicesSurvive,true,name);
    }
    report.workspaceWitnesses.push(result);
  }
  pass('all eight original workspace witnesses block mounted stack/finish/apply and stale form events; valid identity changes retire until an explicit fresh mount');

  await reset();await action('stack').click();await idle();
  await page.evaluate(()=>{const f=tileStackUIProof.fixture;f.on('review',()=>{f.patch({phase:'preparing'});window.pendingIdentityReview=new Promise(resolve=>window.resolveIdentityReview=resolve);return window.pendingIdentityReview;});});
  await action('review').click();await page.waitForFunction(()=>tileStackUIProof.fixture.peek().phase==='preparing');
  await page.evaluate(()=>{const f=tileStackUIProof.fixture,s=f.peek();s.workspace.floorTableId='changed-table-during-review';f.patch({workspace:s.workspace});});
  assert.equal(await action('apply').isDisabled(),true);
  await page.evaluate(async()=>{window.resolveIdentityReview({ok:false,code:'LATE_REPLY_FROM_RETIRED_BINDING'});await window.pendingIdentityReview;await Promise.resolve();const f=tileStackUIProof.fixture;f.patch({phase:'review',reviewId:'late-old-review'});});
  assert.match(await panel().locator('.ts-fault').innerText(),/identity changed/);assert.equal(await action('stack').isDisabled(),true);assert.equal(await action('apply').isDisabled(),true);assert.equal((await calls()).filter(call=>call.name==='apply').length,0);
  pass('workspace identity retirement invalidates pending UI replies without cancelling or replacing the borrowed Editor authority');


  await reset();await action('stack').click();await idle();await action('review').focus();await page.keyboard.down('Enter');for(let i=0;i<4;i++)await page.keyboard.down('Enter');await page.keyboard.up('Enter');await page.waitForFunction(()=>tileStackUIProof.fixture.peek().phase==='review');assert.equal((await calls()).filter(call=>call.name==='review').length,1);
  await action('apply').focus();await page.keyboard.press(' ');await page.waitForFunction(()=>tileStackUIProof.fixture.calls.some(call=>call.name==='apply'));assert.deepEqual((await calls()).find(call=>call.name==='apply'),{name:'apply',args:['fixture.review.original']});
  await patch({phase:'recovery-required',recoveryId:'retained-original-0042'});assert.equal(await action('stack').isDisabled(),true);assert.equal(await action('finish').isDisabled(),true);assert.equal(await action('apply').isDisabled(),true);await action('recover').click();await page.waitForFunction(()=>tileStackUIProof.fixture.calls.some(call=>call.name==='recover'));assert.deepEqual((await calls()).find(call=>call.name==='recover').args,['retained-original-0042']);
  await patch({phase:'presentation-error'});await action('retryPresentation').click();await page.waitForFunction(()=>tileStackUIProof.fixture.calls.some(call=>call.name==='retryPresentation'));assert.equal((await calls()).filter(call=>call.name==='apply').length,1);
  assert.match(await panel().innerText(),/No follow action/);assert.match(await panel().innerText(),/No contact\/detection action/);assert.equal(await action('setInspection').first().isDisabled(),true);
  pass('native activation stays single and separate; unknown actions freeze, recovery keeps its ID and retry is presentation-only');

  await reset();await action('stack').click();await idle();await page.evaluate(()=>{const f=tileStackUIProof.fixture;f.on('review',()=>{f.patch({phase:'preparing'});return new Promise(resolve=>window.resolveStackReview=resolve);});});await action('review').click();await page.waitForFunction(()=>tileStackUIProof.fixture.peek().phase==='preparing');await action('cancel').click();await page.waitForFunction(()=>tileStackUIProof.fixture.peek().phase==='idle');await page.evaluate(()=>window.resolveStackReview({ok:false,code:'LATE_CANCELLED_UI_RESULT'}));await page.waitForTimeout(20);assert.equal(await panel().locator('.ts-fault').isVisible(),false);
  await reset();await page.locator('#outside').focus();await patch({revision:1});assert.equal(await page.evaluate(()=>document.activeElement===document.getElementById('outside')),true);
  await patch({phase:'review',reviewId:'must-not-apply'});await page.evaluate(()=>{const f=tileStackUIProof.fixture;f.adapter.getSnapshot=()=>({...f.peek(),owners:[null]});});await action('apply').click();assert.equal((await calls()).filter(call=>call.name==='apply').length,0);assert.equal(await action('apply').isDisabled(),true);
  pass('late replies, malformed refreshes and same-named host inputs cannot acquire action/focus authority');

  await reset();await page.evaluate(()=>tileStackUIProof.panel.dispose());assert.equal(await page.locator('.tile-stack-ui').count(),0);assert.equal(await page.evaluate(()=>tileStackUIProof.fixture.diagnostics().borrowedAdapterDisposals),0);await page.evaluate(()=>tileStackUIProof.navigation.select('F14'));assert.equal(await page.evaluate(()=>tileStackUIProof.navigation.state.selectedId),'F14');
  pass('component disposal releases its subscriptions/widget while preserving borrowed floor/controller/adapter ownership');

  const touchContext=await browser.newContext({viewport:{width:1440,height:1100},hasTouch:true});
  try{
    const touch=await touchContext.newPage();await touch.goto(url);await touch.waitForFunction(()=>document.body.dataset.ready==='true');const cdp=await touchContext.newCDPSession(touch);
    try{
      const p=touch.locator('.tile-stack-ui');await p.getByLabel('Requested minimum clearance (m)').scrollIntoViewIfNeeded();const ui=await p.getByLabel('Requested minimum clearance (m)').boundingBox(),canvas=await touch.locator('#view-probe').boundingBox();
      const a={id:1,x:ui.x+ui.width/2,y:ui.y+ui.height/2},b={id:2,x:canvas.x+canvas.width/2,y:canvas.y+canvas.height/2};const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
      await send('touchStart',[a]);await send('touchStart',[a,b]);await send('touchMove',[a,{...b,x:b.x+60}]);await send('touchEnd',[b]);await send('touchMove',[{...b,x:b.x+90}]);await send('touchEnd',[]);assert.equal(await touch.evaluate(()=>tileStackUIProof.fixture.calls.some(call=>call.name==='setDraft')),false);
      await send('touchStart',[b]);await send('touchStart',[b,{...b,id:3,x:b.x+20}]);assert.equal(await touch.evaluate(()=>tileStackUIProof.input.snapshot().consumed),true);await send('touchEnd',[{...b,id:3,x:b.x+20}]);await send('touchMove',[{...b,id:3,x:b.x+80}]);await send('touchEnd',[]);assert.equal(await touch.evaluate(()=>tileStackUIProof.fixture.calls.filter(call=>call.name==='setDraft').length),0);
      await send('touchStart',[b]);await send('touchMove',[{...b,x:b.x+80,y:b.y+40}]);await send('touchEnd',[]);assert.equal(await touch.evaluate(()=>tileStackUIProof.fixture.calls.filter(call=>call.name==='setDraft').length),1);
      await touch.evaluate(()=>{window.stackCaptureId=null;document.getElementById('view-probe').addEventListener('gotpointercapture',event=>{window.stackCaptureId=event.pointerId;},{once:true});});await send('touchStart',[b]);await send('touchMove',[{...b,x:b.x+5}]);await touch.waitForFunction(()=>typeof window.stackCaptureId==='number');await touch.evaluate(()=>document.getElementById('view-probe').releasePointerCapture(window.stackCaptureId));await send('touchMove',[{...b,x:b.x+20}]);assert.equal(await touch.evaluate(()=>tileStackUIProof.input.snapshot().consumed),true);await send('touchEnd',[]);assert.equal(await touch.evaluate(()=>tileStackUIProof.fixture.calls.filter(call=>call.name==='setDraft').length),1);
      await send('touchStart',[b]);await send('touchMove',[{...b,x:b.x+5}]);await touch.evaluate(()=>tileStackUIProof.navigation.select('F01'));assert.equal(await touch.evaluate(()=>tileStackUIProof.input.snapshot().consumed),true);await send('touchMove',[{...b,x:b.x+80}]);await send('touchEnd',[]);assert.equal(await touch.evaluate(()=>tileStackUIProof.fixture.calls.filter(call=>call.name==='setDraft').length),1);assert.equal(await touch.evaluate(()=>tileStackUIProof.host.planeH),2.12);assert.equal(await touch.evaluate(()=>tileStackUIProof.host.retirements.at(-1).height),0);
      await send('touchStart',[b]);await send('touchMove',[{...b,x:b.x+80,y:b.y+40}]);await send('touchEnd',[]);assert.equal(await touch.evaluate(()=>tileStackUIProof.fixture.calls.filter(call=>call.name==='setDraft').length),2);
    }finally{await cdp.detach();}
  }finally{await touchContext.close();}
  pass('unchanged actual input owner preserves native UI-first/quarantine/capture-loss/floor cancellation and fresh-primary recovery');

  await reset();const capture=async(target,file)=>{await target.screenshot({path:path.join(out,file),animations:'disabled'});captures.push({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')});};await capture(page,'component-desktop.png');
  for(const width of [390,320]){
    const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});try{
      const phone=await context.newPage();await phone.goto(url);await phone.waitForFunction(()=>document.body.dataset.ready==='true');const p=phone.locator('.tile-stack-ui');await p.locator('[data-action=stack]').tap();await phone.waitForFunction(()=>tileStackUIProof.fixture.peek().phase==='draft');await p.locator('[data-action=review]').tap();await phone.waitForFunction(()=>tileStackUIProof.fixture.peek().phase==='review');await p.locator('[data-action=apply]').tap();assert.equal(await phone.evaluate(()=>tileStackUIProof.fixture.calls.filter(call=>call.name==='apply').length),1);
      for(let i=0;i<14;i++)await p.getByRole('button',{name:'Next floor',exact:true}).tap();assert.match(await p.locator('.fn-readout').innerText(),/15 · 29.68 m/);assert.equal(await p.locator('.fn-floor:visible').count(),5);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const heights=await p.locator('button:visible,.ts-membership label:visible').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,height:node.getBoundingClientRect().height})));for(const target of heights)assert.ok(target.height>=44,JSON.stringify(target));
      await p.locator('.fn-readout').scrollIntoViewIfNeeded();await capture(phone,'component-phone-'+width+'.png');
    }finally{await context.close();}
  }
  pass('390/320 px native touch retains five-floor labels, readable native heights, 44 px targets and no overflow');
 }finally{fs.writeFileSync(path.join(out,'component-proof.json'),JSON.stringify(report,null,2));}
},{source:true,output:'tile-stack-ui',timeoutMs:180000});
