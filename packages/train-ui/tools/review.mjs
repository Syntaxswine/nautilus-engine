import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {withArtReview, projectRoot} from '../../../tools/art-review-browser.mjs';
import {reviewMechanicalControls} from './review-mechanical.mjs';
import {reviewCompactControls} from './review-compact.mjs';
import {reviewReverseControls} from './review-reverse.mjs';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), evidence = path.join(here, 'evidence'), output = 'train-ui-review', out = path.join(projectRoot, 'artifacts', output);
fs.mkdirSync(evidence, {recursive: true});
const report = {connectorPin: '32cce619ac1b8930ac7636dc49aa8704ce08cc92', contentPin: '8efe3da49186f36b07e19da9a31777fe46a71874', checks: [], captures: [], fixture: 'Actual fixed connector, always FIXTURE_ONLY', protocol: 'Scripted synchronous replies for DOM/input lifecycle only; no train simulation', liveBoardingMotion: false, nativeArtAcceptance: false, errors: []};
const record = name => report.checks.push({name, status: 'passed'});
try {
 await withArtReview('Train HUD fixed-fixture design and input lifecycle review', async ({page, browser, baseURL, out}) => {
  report.browser = browser.version();page.setDefaultTimeout(6000);
  const helperPath = path.join(out, 'helper-process.json'), helper = JSON.parse(fs.readFileSync(helperPath));helper.sourceFiles.push(...['index.js','view.js','style.css','feedback.js','compact-model.js','compact-input.js','reverse-intent.js','compact.css','art/steam-cab-surface.svg','fixture/index.html','fixture/study.js','fixture/study.css','tests/scripted-connector.js','tools/review-mechanical.mjs','tools/review-compact.mjs','tools/review-reverse.mjs'].map(p => 'packages/train-ui/' + p),'examples/train-yard-host.js','packages/train-core/index.js','vendor/tinderbox-train-controls/fb0628605c274550ff8abad50b151843f08747d1/source.json');fs.writeFileSync(helperPath, JSON.stringify(helper, null, 2));
  await page.goto(baseURL + '/packages/train-ui/fixture/index.html');
  const part = name => page.locator(`[data-part="${name}"]`), action = kind => page.locator(`[data-train-action="${kind}"]:visible`);
  assert.equal(await part('driver').isVisible(), true);assert.equal(await page.evaluate(() => trainStudy.walkingEnabled), false);record('fixed driver fixture replaces the walking slot');
  await page.locator('[data-direction="forward"]').click();await part('power-hold').click();
  assert.ok(await page.evaluate(() => trainStudy.results.length >= 1 && trainStudy.results.every(r => r.code === 'FIXTURE_ONLY' && !r.committed)));
  assert.equal(await page.evaluate(() => trainStudy.controls.state.mode), 'driver');assert.match(await part('request-status').innerText(), /Preview only/);record('fixed fixture refuses Drive without optimistic state or fake commits');
  await page.evaluate(() => trainStudy.showStory('walking'));assert.equal(await page.locator('#walking').isVisible(), true);await action('enter').click();await action('enter').click();
  const enters = await page.evaluate(() => trainStudy.commands.filter(c => c.type === 'enter'));assert.equal(enters.length, 2);assert.notEqual(enters[0].commandId, enters[1].commandId);assert.deepEqual(enters[0].expected, {actorRevision: 0, occupancyRevision: 0, controlRevision: 0});assert.equal(await part('driver').isVisible(), false);record('Enter and explicit retry preserve offered tuple/Expected and do not invent boarding');
  await page.evaluate(() => trainStudy.showStory('riding'));assert.equal(await part('rider').isVisible(), true);assert.equal(await part('driver').isVisible(), false);await action('exit').click();assert.equal(await page.evaluate(() => trainStudy.controls.state.mode), 'rider');record('rider exposes Exit and no driving UI; fixed fixture refuses exit');
  await page.evaluate(() => trainStudy.showStory('tender'));assert.equal(await action('enter').count(), 0);assert.equal(await page.evaluate(() => trainStudy.walkingEnabled), true);record('tender offers no inferred passenger entry');
  await page.evaluate(() => trainStudy.showStory('electric'));assert.match(await part('cab-facing').innerText(), /Rear/);assert.equal(await part('speed').innerText(), '12.4');assert.match(await part('confirmed-direction').innerText(), /forward/i);await page.locator('[data-direction="forward"]').click();await part('power-hold').click();assert.equal(await page.evaluate(() => trainStudy.commands.filter(c => c.type === 'drive').at(-1).direction), 'forward');record('rear-facing cab formats speed/travel while forwarding cab-relative direction unchanged');
  await page.evaluate(() => trainStudy.showStory('signal'));assert.match(await part('signal-reason').innerText(), /crossing/);record('host signal wait is shown as text');
  for (const [width, height, story, file] of [[1440,1000,'steam','desktop-driver.png'],[390,844,'steam','phone-driver.png'],[390,844,'walking','phone-entry.png'],[390,844,'riding','phone-rider.png'],[320,700,'signal','narrow-signal.png']]) {
   await page.setViewportSize({width, height});await page.evaluate(story => trainStudy.showStory(story), story);
   if (story === 'steam') await page.locator('[data-direction="forward"]').click();
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
   assert.ok(await page.evaluate(() => [...document.querySelectorAll('.nautilus-train-controls button')].filter(n => n.getClientRects().length).every(n => n.getBoundingClientRect().height >= 44)));
   await page.screenshot({path: path.join(evidence, file), fullPage: true});report.captures.push({file, width, height, story});
  }
  record('desktop390px320px layouts keep readable44px controls and no horizontal overflow');
  await page.setViewportSize({width: 1100, height: 1000});
  await page.evaluate(async () => {
   const [ui, test] = await Promise.all([import('/packages/train-ui/index.js'), import('/packages/train-ui/tests/scripted-connector.js')]);
   window.mountTest = (mode,steamProfile='classic') => {
    window.testUI?.dispose();trainStudy.dispose();window.testHost = test.scriptedConnector(mode);let serial = 0;
    window.walkingEvents = [];window.focusReturns = 0;
    window.testUI = ui.mountTrainControls(document.getElementById('hud-slot'), {session: testHost.session, actorId: 'player', walkingElement: document.getElementById('walking'),steamProfile,
      newId: kind => `test/${kind}/${++serial}`, setWalkingEnabled: value => walkingEvents.push(value), focusWalking: () => { focusReturns++;document.getElementById('walk-focus').focus(); }, onError: error => {throw error;}
    });
   };
   window.startPower = () => { document.querySelector('[data-direction="forward"]').click();const node = document.querySelector('[data-part="power-hold"]');node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1,pointerId:21,pointerType:'touch'})); };
   mountTest('on-foot');
  });
  await page.evaluate(() => testHost.replies.push({snapshot: testHost.fixture('driver')}));await action('enter').click();assert.equal(await part('driver').isVisible(), true);assert.deepEqual(await page.evaluate(() => walkingEvents), [true, false]);record('scripted post-commit boarding disables the borrowed walking input before driver controls');
  await page.evaluate(() => startPower());assert.ok(await page.evaluate(() => testUI.state.leaseId));
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup',{pointerId:21,pointerType:'touch'})));
  let pair = await page.evaluate(() => testHost.commands.slice(-2));assert.equal(pair[0].type, 'drive');assert.equal(pair[1].type, 'release');assert.equal(pair[0].leaseId, pair[1].leaseId);assert.notEqual(pair[0].commandId, pair[1].commandId);assert.deepEqual(Object.keys(pair[1]).sort(), ['actorId','commandId','leaseId','type']);record('pointer release sends original actor/lease with fresh ID and no stale Expected');
  await page.evaluate(() => {mountTest('driver');document.querySelector('[data-direction="forward"]').click();});await part('power-hold').scrollIntoViewIfNeeded();const box=await part('power-hold').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();assert.ok(await page.evaluate(()=>testUI.state.leaseId));await page.mouse.move(900,30);await page.mouse.up();assert.equal(await page.evaluate(()=>testUI.state.leaseId),null);assert.deepEqual(await page.evaluate(()=>testHost.commands.map(c=>c.type)),['drive','release']);record('native mouse capture releases after dragging outside the HUD');
  for (const reason of ['pointer-cancel','lost-capture','hover-repair','blur','hidden','modal','focus-left']) {
   await page.evaluate(reason => {
    mountTest('driver');startPower();
    if(reason==='pointer-cancel')window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:21,pointerType:'touch'}));
    if(reason==='lost-capture')document.querySelector('[data-part="power-hold"]').dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:21}));
    if(reason==='hover-repair')window.dispatchEvent(new PointerEvent('pointermove',{pointerId:21,pointerType:'mouse',buttons:0}));
    if(reason==='blur')window.dispatchEvent(new Event('blur'));
    if(reason==='hidden'){Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));}
    if(reason==='modal'){testUI.setBlocked(true);testUI.setBlocked(false);}
    if(reason==='focus-left'){const node=document.querySelector('[data-part="driver"]');node.focus();document.getElementById('story').focus();}
   }, reason);
   assert.equal(await page.evaluate(() => testUI.state.leaseId), null);assert.equal(await page.evaluate(() => testHost.commands.at(-1).type), 'release');assert.equal(await page.evaluate(() => testHost.commands.filter(c=>c.type==='drive').length), 1);record('scripted input release on '+reason+' does not resume power');
  }
  await page.evaluate(() => {mountTest('driver');document.querySelector('[data-direction="forward"]').click();});await part('power-hold').focus();await page.keyboard.down('Space');assert.ok(await page.evaluate(() => testUI.state.leaseId));await page.keyboard.down('b');await page.keyboard.up('Space');assert.ok(await page.evaluate(() => testUI.state.leaseId));await page.keyboard.up('b');assert.equal(await page.evaluate(() => testUI.state.leaseId), null);pair=await page.evaluate(()=>testHost.commands);assert.deepEqual(pair.map(c=>c.type),['drive','release','drive','release']);assert.notEqual(pair[0].leaseId,pair[2].leaseId);assert.equal(pair[2].brake,1);record('keyboard power, priority brake and keyup use separate never-reused leases');
  await page.evaluate(() => {mountTest('driver');startPower();const next=testHost.fixture('driver');next.carId='train/steam/car/9';next.expected.occupancyRevision=7;testHost.setEcho(false);testHost.publish(next);});assert.equal(await page.evaluate(() => testUI.state.leaseId),null);pair=await page.evaluate(()=>testHost.commands.slice(-2));assert.equal(pair[1].leaseId,pair[0].leaseId);assert.equal(pair[1].actorId,'player');record('cab replacement releases only the original gesture, never a new occupancy');
  await page.evaluate(()=>{mountTest('driver');startPower();const guest=testHost.fixture('on-foot');guest.actorId='guest';guest.actions=[];testHost.addActor(guest);testUI.setActor('guest');});assert.equal(await page.evaluate(()=>testUI.state.actorId),'guest');assert.equal(await page.evaluate(()=>testHost.commands.at(-1).actorId),'player');assert.equal(await page.evaluate(()=>testUI.state.leaseId),null);record('selected actor replacement releases the original actor without retagging');
  await page.evaluate(() => {mountTest('driver');startPower();const next=testHost.fixture('driver');testHost.setEcho(false);testHost.publish(next);});assert.equal(await page.evaluate(()=>testUI.state.leaseId),null);assert.equal(await page.evaluate(()=>testHost.commands.at(-1).type),'release');record('restore/revocation snapshot retires held UI input without replay');
  await page.evaluate(() => {mountTest('driver');testHost.replies.push({committed:false,code:'STOP_BEFORE_REVERSE',reason:'Stop before reversing. Brake, then try again.'});document.querySelector('[data-direction="reverse"]').click();const n=document.querySelector('[data-part="power-hold"]');n.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));});assert.match(await part('request-status').innerText(), /Stop before reversing/);let ids=await page.evaluate(()=>testHost.commands.filter(c=>c.type==='drive').map(c=>c.commandId));await part('power-hold').focus();await page.keyboard.down('Space');await page.keyboard.up('Space');let later=await page.evaluate(()=>testHost.commands.filter(c=>c.type==='drive').map(c=>c.commandId));assert.equal(later.length,2);assert.notEqual(ids[0],later[1]);record('stop-before-reverse refusal remains readable and deliberate retry uses a new command ID');
  await page.evaluate(() => {mountTest('driver');startPower();testHost.setEcho(false);testHost.replies.push({snapshot:testHost.fixture('on-foot')},{committed:false,code:'LEASE_CLOSED',reason:'Already retired.'});});await action('exit').click();assert.equal(await page.evaluate(()=>testUI.state.mode),'on-foot');assert.equal(await page.evaluate(()=>walkingEvents.at(-1)),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'walk-focus');assert.equal(await page.evaluate(()=>testUI.state.result.committed),true);record('confirmed exit restores walking/focus and closed-lease refusal cannot replace the known primary outcome');
  await page.evaluate(() => {mountTest('rider');testHost.replies.push({snapshot:testHost.fixture('on-foot')});});assert.equal(await part('driver').isVisible(),false);await action('exit').click();assert.equal(await page.evaluate(()=>testUI.state.mode),'on-foot');record('scripted rider exit restores walking without granting driving input');
  await page.evaluate(()=>{mountTest('driver');startPower();const input=document.createElement('input');input.id='typing-test';document.getElementById('hud-slot').append(input);input.focus();});await page.keyboard.type('fbr');assert.equal(await page.evaluate(()=>testUI.state.leaseId),null);assert.deepEqual(await page.evaluate(()=>testHost.commands.map(c=>c.type)),['drive','release']);await page.evaluate(()=>document.getElementById('typing-test').remove());record('typing inside the HUD retires power and does not trigger drive shortcuts');
  await page.evaluate(async()=>{testUI.dispose();const {mountTrainControls}=await import('/packages/train-ui/index.js');const before=document.querySelectorAll('.nautilus-train-controls').length;let threw=false;try{mountTrainControls(document.getElementById('hud-slot'),{session:{...testHost.session,subscribe(){throw Error('Retired connection');}},actorId:'player',walkingElement:document.getElementById('walking'),setWalkingEnabled(){}});}catch{threw=true;}if(!threw||document.querySelectorAll('.nautilus-train-controls').length!==before)throw Error('Failed mount leaked DOM');});record('subscription failure leaves no owned panel or listeners');
  await page.evaluate(() => {mountTest('driver');startPower();window.retired=testUI;testUI.dispose();testUI.dispose();});assert.equal(await page.evaluate(()=>testHost.subscribers),0);assert.equal(await page.evaluate(()=>testHost.commands.filter(c=>c.type==='release').length),1);assert.equal(await page.evaluate(()=>walkingEvents.at(-1)),false);record('dispose releases once, unsubscribes and keeps walking disabled while still occupied');
  assert.deepEqual(await page.evaluate(()=>trainStudy.errors),[]);
  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  try{const touch=await touchContext.newPage();touch.on('pageerror',error=>report.errors.push(error.message));touch.on('response',response=>{if(response.status()>=400)report.errors.push(response.url());});await touch.goto(baseURL+'/packages/train-ui/fixture/index.html');
   await touch.evaluate(async()=>{trainStudy.dispose();const [ui,test]=await Promise.all([import('/packages/train-ui/index.js'),import('/packages/train-ui/tests/scripted-connector.js')]);window.host=test.scriptedConnector('driver');window.touchUI=ui.mountTrainControls(document.getElementById('hud-slot'),{session:host.session,actorId:'player',walkingElement:document.getElementById('walking'),setWalkingEnabled(){}});});
   await touch.locator('[data-direction="forward"]').tap();await touch.locator('[data-part="power-hold"]').tap();assert.deepEqual(await touch.evaluate(()=>host.commands.map(c=>c.type)),['drive','release']);assert.equal(await touch.evaluate(()=>touchUI.state.leaseId),null);await touch.evaluate(()=>touchUI.dispose());assert.equal(await touch.evaluate(()=>host.subscribers),0);record('native emulated touch tap releases its exact lease and retires cleanly');
  }finally{await touchContext.close();}
  await reviewMechanicalControls({page,browser,evidence,report,record});
  await reviewCompactControls({page,browser,evidence,report,record,baseURL});
  await reviewReverseControls({page,evidence,report,record});
  assert.deepEqual(report.errors,[]);
 }, {source:true,owner:'01a1810e-3297-7142-ac31-ac504ea8553d',output,timeoutMs:180000});
 report.status='passed';
} finally {
 const receiptPath=path.join(out,'cleanup-receipt.json');
 if(fs.existsSync(receiptPath)){
  const receipt=JSON.parse(fs.readFileSync(receiptPath));assert.equal(receipt.browserClosed,true);assert.equal(receipt.httpClosed,true);
  await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(receipt.port,'127.0.0.1',()=>server.close(resolve));});
  report.cleanup={...receipt,portReleased:true};
  for(const file of ['helper-process.json','cleanup-receipt.json','helper-history.jsonl','helper-cleanup-history.jsonl'])fs.copyFileSync(path.join(out,file),path.join(evidence,file));
 }
 fs.writeFileSync(path.join(evidence,'browser.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({status:report.status,checks:report.checks.length,screenshots:report.captures.length,live:false,cleanup:report.cleanup?.portReleased}));
