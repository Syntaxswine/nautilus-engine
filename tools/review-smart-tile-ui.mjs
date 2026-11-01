// Narrow source-only UI conformance, never integrated authoring/game evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
const checks=[],captures=[],files=['apps/editor/smart-tile/panel.js','apps/editor/smart-tile/panel-fields.js','apps/editor/smart-tile/panel.css','apps/editor/smart-tile/contract.js','tests/fixtures/smart-tile-ui/adapter.mjs','tests/fixtures/smart-tile-ui/harness.js','tests/fixtures/smart-tile-ui/index.html'];
const sha=file=>createHash('sha256').update(fs.readFileSync(path.join(projectRoot,file))).digest('hex');
const report={proof:'UI conformance double v1 — not Editor integrated authoring, persistence, geometry or gameplay evidence',interfaceCommit:'5c4e6964fdccf3b7df79a87dd1cefd8e82ee9e1a',sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim(),contentHashes:Object.fromEntries(files.map(file=>[file,sha(file)])),checks,captures};
const pass=name=>{checks.push(name);console.log('PASS '+name);};
await withArtReview('Smart Tile UI conformance double v1',async({page,browser,baseURL,out})=>{
  const url=baseURL+'/tests/fixtures/smart-tile-ui/index.html',panel=()=>page.locator('.smart-tile-panel'),action=name=>panel().locator('[data-action="'+name+'"]'),calls=()=>page.evaluate(()=>smartTileUIFixture.fixture.calls);
  const patch=value=>page.evaluate(value=>smartTileUIFixture.fixture.patch(value),value);
  const reset=async()=>{await page.goto(url);await page.waitForFunction(()=>document.body.dataset.ready==='true');};
  const settled=()=>page.waitForFunction(()=>!document.querySelector('.smart-tile-panel [data-action=setDraft]').disabled||smartTileUIFixture.fixture.peek().phase==='recovery-required'||smartTileUIFixture.fixture.peek().phase==='presentation-error');
  const capture=async file=>{await page.screenshot({path:path.join(out,file),animations:'disabled'});captures.push({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')});};
  try{
    report.browser=await browser.version();await page.emulateMedia({reducedMotion:'reduce'});await reset();
    assert.match(await page.locator('.proof-label').innerText(),/no authored world/i);
    for(const phase of ['idle','draft','preparing','review','applying','recovery-required','presentation-error','disposed']){
      await patch({phase,draft:{tool:'rectangle',ownerId:null,origin:[0,0],widthM:8,depthM:4,seed:1},reviewId:'fixed-review',recoveryId:'original-request',selectedOwnerId:'paving-a',history:{undo:1,redo:1,bytes:500,maxEntries:64,maxBytes:16000000}});
      const flags=await page.evaluate(()=>smartTileUIFixture.fixture.peek().actions);
      for(const name of ['setTool','setDraft','review','apply','cancel','undo','redo','save','open','recover','retryPresentation'])for(const button of await action(name).all())assert.equal(await button.isDisabled(),!flags[name],phase+': '+name);
    }
    await patch({phase:'review'});await page.evaluate(()=>{const f=smartTileUIFixture.fixture,s=f.peek();f.patch({actions:{...s.actions,apply:false,review:false}},{deriveActions:false});});
    assert.equal(await action('apply').isDisabled(),true);assert.equal(await action('review').isDisabled(),true);
    pass('all eight phases follow only supplied action flags, including restrictive host overrides');

    await reset();await panel().getByLabel('Origin X (m)',{exact:true}).fill('0.12345678901234567');await panel().getByLabel('Saved variation seed').fill('4294967295');
    await panel().getByLabel('Native depth (m)').press('Enter');await settled();
    let log=await calls();assert.equal(log.filter(call=>call.name==='setDraft').length,1);assert.equal(log.some(call=>['review','apply'].includes(call.name)),false);
    assert.equal(log[0].args[0].origin[0],.12345678901234567);assert.equal(log[0].args[0].seed,4294967295);assert.deepEqual(Object.keys(log[0].args[0]).sort(),['depthM','origin','ownerId','seed','tool','widthM'].sort());
    await panel().getByLabel('Find a construction tool').fill('curve');assert.equal(await panel().locator('[data-tool=rectangle]').isVisible(),false);assert.equal(await panel().locator('[data-tool=path]').isVisible(),true);
    await panel().getByLabel('Find a construction tool').fill('');await panel().locator('[data-tool=path]').click();await settled();
    await panel().getByLabel('Original curve type').selectOption('arc');await panel().getByLabel('Centreline radius (m)').fill('5.125');await panel().getByLabel('Sweep angle (rad)').fill('1.2345678901234567');await action('setDraft').click();await settled();
    log=await calls();let draft=log.filter(call=>call.name==='setDraft').at(-1).args[0];assert.equal(draft.path.kind,'arc');assert.equal(draft.path.radius,5.125);assert.equal(draft.path.sweepRad,1.2345678901234567);assert.equal(draft.widthM,2);
    await patch({draft:{...draft,seed:67108863,path:{kind:'cubic',id:'original-cubic',points:[[0,0,0],[2.123456789012345,0,0],[5,4,0],[8,4,0]]}}});
    await panel().getByLabel('Control 2 X (m)').fill('6.123456789012345');await action('setDraft').click();await settled();
    draft=(await calls()).filter(call=>call.name==='setDraft').at(-1).args[0];assert.equal(draft.path.id,'original-cubic');assert.deepEqual(draft.path.points,[[0,0,0],[2.123456789012345,0,0],[6.123456789012345,4,0],[8,4,0]]);assert.equal(draft.seed,67108863);
    pass('numeric forms submit exact rectangle/arc/cubic intent and seeds without implicit review, acceptance or sampling');

    await reset();await panel().getByLabel('Whole owner',{exact:true}).selectOption('paving-a');await settled();await panel().locator('[data-tool=finish]').click();await settled();
    assert.match(await panel().getByLabel('Whole owner',{exact:true}).innerText(),/paving-b · Owner locked/);
    await panel().getByLabel('Finish ID').fill('stone.cosmetic-v2');await action('setDraft').click();await settled();
    log=await calls();assert.deepEqual(log.at(-1).args[0],{tool:'finish',ownerId:'paving-a',skinId:'stone.cosmetic-v2'});
    assert.equal(log.some(call=>/lock|recipe|history/i.test(call.name)),false);
    await patch({diagnostics:[{code:'INCOMPLETE_REPAIR',path:'/joins/3',ownerId:'paving-a',portId:'east',message:'Width/profile/UV coverage is unsupported <img src=x onerror=alert(1)>',action:'Keep original controls; choose a supported finite straight interface.'}]});
    assert.equal(await panel().locator('.st-diagnostics img').count(),0);assert.match(await panel().locator('.st-diagnostics').innerText(),/1\. INCOMPLETE_REPAIR/);assert.match(await panel().locator('.st-diagnostics').innerText(),/Keep original controls/);
    assert.equal(await panel().locator('.st-diagnostics button').count(),0);
    pass('whole-owner finish routing, locked labels and numbered text diagnostics do not invent repairs or shared-recipe edits');

    await reset();await action('setDraft').click();await settled();await action('review').focus();
    await page.keyboard.down('Enter');await page.waitForFunction(()=>smartTileUIFixture.fixture.calls.filter(call=>call.name==='review').length===1);
    for(let index=0;index<4;index++)await page.keyboard.down('Enter');await page.keyboard.up('Enter');assert.equal((await calls()).filter(call=>call.name==='review').length,1);
    await action('apply').focus();await page.keyboard.down('Enter');for(let index=0;index<4;index++)await page.keyboard.down('Enter');await page.keyboard.up('Enter');await settled();
    assert.deepEqual((await calls()).filter(call=>call.name==='apply'),[{name:'apply',args:['fixture-review-1']}]);
    await reset();await action('setDraft').click();await settled();await action('review').focus();await page.keyboard.down(' ');await page.keyboard.down(' ');await page.keyboard.up(' ');await page.waitForFunction(()=>smartTileUIFixture.fixture.calls.some(call=>call.name==='review'));
    assert.equal((await calls()).filter(call=>call.name==='review').length,1);await action('apply').evaluate(button=>button.click());await settled();assert.equal((await calls()).filter(call=>call.name==='apply').length,1);
    pass('trusted Enter/Space and assistive click activate once; review and apply remain separate with the exact review identity');

    await reset();await patch({phase:'recovery-required',recoveryId:'request-original-0042',requestId:'request-original-0042'});
    assert.match(await panel().locator('.st-notice').innerText(),/last confirmed scene/);await action('cancel').evaluate(button=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    assert.equal((await calls()).length,0);await action('recover').click();await page.waitForFunction(()=>smartTileUIFixture.fixture.calls.some(call=>call.name==='recover'));
    assert.deepEqual((await calls()).at(-1),{name:'recover',args:['request-original-0042']});
    await patch({phase:'presentation-error',diagnostics:[{code:'VIEW_FAILURE_AFTER_COMMIT',path:'/view',message:'The edit is committed; display acquisition failed.',action:'Retry accepted presentation only.'}]});
    await action('retryPresentation').click();await page.waitForFunction(()=>smartTileUIFixture.fixture.calls.some(call=>call.name==='retryPresentation'));
    assert.equal((await calls()).filter(call=>['apply','setDraft','undo','redo','save','open'].includes(call.name)).length,0);
    pass('unknown outcome freezes edits and recovers the original identity; presentation retry never repeats an edit');

    await reset();await action('setDraft').click();await settled();
    await page.evaluate(()=>{const f=smartTileUIFixture.fixture;f.on('review',()=>{f.patch({phase:'preparing'});return new Promise(resolve=>window.resolveUIReview=resolve);});});
    await action('review').click();await page.waitForFunction(()=>smartTileUIFixture.fixture.peek().phase==='preparing');await action('cancel').click();await settled();
    await page.evaluate(()=>window.resolveUIReview({ok:false,code:'LATE_CANCELLED_PREVIEW'}));await page.waitForTimeout(30);
    assert.equal(await panel().locator('.st-fault').isVisible(),false);assert.equal((await calls()).some(call=>call.name==='apply'),false);
    await page.evaluate(()=>{const f=smartTileUIFixture.fixture;f.on('save',()=>new Promise(resolve=>window.resolveUISave=resolve));});
    await panel().locator('summary').filter({hasText:'Save or open'}).click();await action('save').click();
    await patch({phase:'recovery-required',recoveryId:'pending-save-race'});await page.evaluate(()=>window.resolveUISave({ok:true,checkpointJSON:'stale-output-must-not-appear'}));await page.waitForTimeout(30);
    assert.equal(await panel().getByLabel('Saved complete checkpoint JSON').isVisible(),false);
    pass('cancelled late replies and save replies racing unknown acceptance cannot replace current UI or expose stale output');

    await reset();await panel().locator('summary').filter({hasText:'Save or open'}).click();await action('save').click();await settled();assert.match(await panel().getByLabel('Saved complete checkpoint JSON').inputValue(),/notAnAuthoringCheckpoint/);const rawCheckpoint='  {\n  \"unparsedUIFixture\": true, \"unknown\": [7, 8]\n}  ';await panel().getByLabel('Checkpoint JSON',{exact:true}).fill(rawCheckpoint);await action('open').click();await settled();assert.deepEqual((await calls()).find(call=>call.name==='open').args,[rawCheckpoint]);await patch({history:{undo:1,redo:1,bytes:128,maxEntries:64,maxBytes:16000000}});await action('undo').click();await settled();await action('redo').click();await settled();assert.deepEqual((await calls()).filter(call=>['undo','redo'].includes(call.name)).map(call=>[call.name,call.args]),[['undo',[]],['redo',[]]]);pass('checkpoint text and history actions pass unchanged to Editor without UI parsing, persistence or history');

    await reset();await panel().getByLabel('Origin X (m)',{exact:true}).fill('999');await page.locator('#host-canvas').focus();await page.keyboard.press('PageUp');
    await page.waitForFunction(()=>smartTileUIFixture.navigation.state.selectedId==='gallery');
    assert.match(await panel().locator('.st-floor').innerText(),/Gallery · 3.42 m/);assert.equal(await panel().getByLabel('Origin X (m)',{exact:true}).inputValue(),'0');
    await panel().getByLabel('Origin X (m)',{exact:true}).focus();await page.keyboard.press('PageDown');assert.equal(await page.evaluate(()=>smartTileUIFixture.navigation.state.selectedId),'gallery');
    await page.locator('#host-canvas').hover();await page.mouse.wheel(0,100);await page.waitForFunction(()=>smartTileUIFixture.host.wheel===1);assert.equal(await page.evaluate(()=>smartTileUIFixture.navigation.state.selectedId),'gallery');
    await page.locator('#host-canvas').focus();await page.locator('#floors .fn-floor[aria-pressed=true]').hover();await page.mouse.wheel(0,100);await page.waitForFunction(()=>smartTileUIFixture.navigation.state.selectedId==='ground');assert.equal(await page.evaluate(()=>smartTileUIFixture.host.wheel),1);
    await page.locator('#host-canvas').click();assert.ok(await page.evaluate(()=>smartTileUIFixture.host.pointers)>0);await page.locator('#outside-action').click();assert.equal(await page.evaluate(()=>smartTileUIFixture.host.outside),1);
    await panel().getByRole('button',{name:'Go to floor controls'}).click();assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#floors')),true);
    for(const name of ['x','widthM']){await page.evaluate(name=>{const outside=document.getElementById('outside');outside.name=name;outside.focus();const f=smartTileUIFixture.fixture;f.patch({revision:f.peek().revision+1});},name);assert.equal(await page.evaluate(()=>document.activeElement===document.getElementById('outside')),true,'outside named '+name+' retains focus');}
    await panel().getByLabel('Origin X (m)',{exact:true}).focus();await page.evaluate(()=>{const f=smartTileUIFixture.fixture;f.patch({revision:f.peek().revision+1});});assert.equal(await page.evaluate(()=>document.activeElement.name==='x'&&!!document.activeElement.closest('.smart-tile-panel')),true,'owned field regains focus after replacement');
    pass('real borrowed floor labels/heights, keyboard/wheel scopes and unrelated host controls survive without a panel input router');

    await reset();await patch({phase:'review',reviewId:'real-review',draft:{tool:'rectangle',ownerId:null,origin:[0,0],widthM:8,depthM:4,seed:0}});assert.equal(await action('apply').isDisabled(),false);await page.evaluate(()=>{const f=smartTileUIFixture.fixture;f.adapter.getSnapshot=()=>({...f.peek(),owners:[null]});});await action('apply').click();assert.deepEqual(await calls(),[]);assert.equal(await action('apply').isDisabled(),true);assert.match(await panel().locator('.st-fault').innerText(),/null/);

    await reset();await patch({version:99});assert.equal(await action('setDraft').isDisabled(),true);assert.match(await panel().locator('.st-fault').innerText(),/Unsupported Smart Tile snapshot/);
    await patch({version:1,phase:'idle'});await page.evaluate(()=>smartTileUIFixture.fixture.readFault(true));await page.evaluate(()=>smartTileUIFixture.panel.refresh());assert.equal(await action('review').isDisabled(),true);
    await page.evaluate(()=>{const h=smartTileUIFixture;h.fixture.readFault(false);h.fixture.unsubscribeFault(true);window.panelCleanupErrors=h.panel.dispose().map(error=>error.message);});
    assert.equal(await page.locator('.smart-tile-panel').count(),0);assert.deepEqual(await page.evaluate(()=>window.panelCleanupErrors),['Fixture unsubscribe fault']);
    assert.deepEqual(await page.evaluate(()=>smartTileUIFixture.fixture.diagnostics()),{subscriptions:0,adapterDisposeCalls:0});
    await page.locator('#floors button').filter({hasText:'Gallery'}).click();assert.equal(await page.evaluate(()=>smartTileUIFixture.navigation.state.selectedId),'gallery');
    await reset();await page.evaluate(()=>{window.faultReentries=0;smartTileUIFixture.remount({onError(){window.faultReentries++;smartTileUIFixture.fixture.patch({version:99});}});smartTileUIFixture.fixture.patch({version:99});});assert.ok(await page.evaluate(()=>window.faultReentries)<30);assert.equal(await action('setDraft').isDisabled(),true);
    pass('malformed/read-fault snapshots fail closed; throwing unsubscribe cannot prevent DOM retirement or dispose borrowed adapter/floors');

    await reset();await action('setDraft').click();await settled();await action('review').click();await page.waitForFunction(()=>smartTileUIFixture.fixture.peek().phase==='review');
    await capture('desktop-ui-conformance.png');
    for(const width of [390,320]){
      const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
      try{
        const phone=await context.newPage();await phone.goto(url);await phone.waitForFunction(()=>document.body.dataset.ready==='true');
        const p=phone.locator('.smart-tile-panel');await p.locator('[data-tool=path]').tap();await phone.waitForFunction(()=>smartTileUIFixture.fixture.peek().tool==='path');
        await p.locator('[data-action=setDraft]').tap();await phone.waitForFunction(()=>smartTileUIFixture.fixture.peek().phase==='draft');
        await p.locator('[data-action=review]').tap();await phone.waitForFunction(()=>smartTileUIFixture.fixture.peek().phase==='review');
        assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const sizes=await p.locator('button:visible,input:visible,select:visible,summary:visible').evaluateAll(nodes=>nodes.map(node=>({tag:node.tagName,height:node.getBoundingClientRect().height})));
        for(const size of sizes)assert.ok(size.height>=44,width+'px '+JSON.stringify(size));
        await p.locator('[data-action=apply]').tap();await phone.waitForFunction(()=>smartTileUIFixture.fixture.calls.some(call=>call.name==='apply'));
        assert.equal(await phone.evaluate(()=>smartTileUIFixture.fixture.calls.filter(call=>call.name==='apply').length),1);
        await p.locator('[data-tool=path]').scrollIntoViewIfNeeded();const file='phone-'+width+'-ui-conformance.png';await phone.screenshot({path:path.join(out,file),animations:'disabled'});captures.push({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')});
      }finally{await context.close();}
    }
    pass('native emulated touch at 390/320 px preserves 44 px targets, safe-area CSS, explicit review/apply and no horizontal overflow');
  }finally{fs.writeFileSync(path.join(out,'ui-conformance.json'),JSON.stringify(report,null,2));}
},{source:true,output:'smart-tile-ui',timeoutMs:180000});
