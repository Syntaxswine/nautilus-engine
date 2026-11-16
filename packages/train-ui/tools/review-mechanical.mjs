import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Runs inside the existing bounded review; no second server/browser or runtime.
export async function reviewMechanicalControls({page, evidence, report, record}) {
  const part = name => page.locator(`[data-part="${name}"]`), lever = part('direction-lever'), brake = part('brake');
  await page.evaluate(() => mountTest('driver'));
  assert.equal(await page.evaluate(() => testUI.state.feedback.contextState),'not-created');
  assert.equal(await page.evaluate(() => testUI.state.feedback.played),0);record('audio is silent and unallocated on mount');

  await lever.scrollIntoViewIfNeeded();let box = await lever.boundingBox();
  await page.mouse.move(box.x + 22,box.y + 12);await page.mouse.down();
  assert.equal(await lever.getAttribute('aria-valuetext'),'forward');
  await page.mouse.move(box.x + 22,box.y + box.height - 12);assert.equal(await lever.getAttribute('aria-valuetext'),'reverse');
  await page.mouse.up();assert.equal(await page.evaluate(() => testUI.state.requestedDirection),'reverse');
  await page.waitForFunction(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.lever-hand')).transform).m42 > 87);
  assert.deepEqual(await page.evaluate(() => testHost.commands),[]);record('native reverser drag selects detents without granting motion');
  await lever.focus();await page.keyboard.press('ArrowUp');assert.equal(await lever.getAttribute('aria-valuetext'),'neutral');await page.keyboard.press('End');assert.equal(await lever.getAttribute('aria-valuetext'),'forward');await page.keyboard.press('Home');assert.equal(await lever.getAttribute('aria-valuetext'),'reverse');
  assert.deepEqual(await page.evaluate(() => testHost.commands),[]);record('reverser arrow and Home/End keys expose requested direction accessibly');

  for(const reason of ['pointer-cancel','lost-capture','blur','modal']) {
    await page.evaluate(reason => {mountTest('driver');const node = document.querySelector('[data-part="direction-lever"]'), r = node.getBoundingClientRect();node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1,pointerId:41,pointerType:'touch',clientY:r.top+8}));
      if(testUI.state.requestedDirection !== 'forward') throw Error('Lever did not move');
      if(reason==='pointer-cancel') window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:41,pointerType:'touch'}));
      if(reason==='lost-capture') node.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:41}));
      if(reason==='blur') window.dispatchEvent(new Event('blur'));
      if(reason==='modal') {testUI.setBlocked(true);testUI.setBlocked(false);}
    },reason);
    assert.equal(await lever.getAttribute('aria-valuetext'),'neutral');assert.deepEqual(await page.evaluate(() => testHost.commands),[]);
  }record('cancelled reverser gestures restore their prior request on cancel/capture/blur/modal');

  await page.evaluate(() => {mountTest('driver');startPower();});await brake.scrollIntoViewIfNeeded();box = await brake.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+85);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+125);
  let commands = await page.evaluate(() => testHost.commands);
  assert.deepEqual(commands.map(c=>c.type),['drive','release','drive']);assert.equal(commands[2].brake,1);assert.equal(commands[2].power,0);assert.notEqual(commands[0].leaseId,commands[2].leaseId);
  assert.equal(await page.evaluate(() => testUI.element.style.getPropertyValue('--chain-pull')),'28px');
  await page.waitForFunction(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.chain-hanging')).transform).m42 > 27);
  await page.mouse.move(900,30);await page.mouse.up();commands = await page.evaluate(() => testHost.commands);
  assert.equal(commands[3].type,'release');assert.equal(commands[3].leaseId,commands[2].leaseId);assert.equal(await page.evaluate(() => testUI.state.leaseId),null);record('native pull-chain drag takes brake priority, moves the grip and releases its exact lease outside');

  for(const reason of ['pointer-cancel','lost-capture','blur','modal','dispose']) {
    await page.evaluate(reason => {mountTest('driver');const node = document.querySelector('[data-part="brake"]');node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1,pointerId:31,pointerType:'touch',clientY:50}));
      if(reason==='pointer-cancel') window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:31,pointerType:'touch'}));
      if(reason==='lost-capture') node.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:31}));
      if(reason==='blur') window.dispatchEvent(new Event('blur'));
      if(reason==='modal') {testUI.setBlocked(true);testUI.setBlocked(false);}
      if(reason==='dispose') testUI.dispose();
    },reason);
    commands = await page.evaluate(() => testHost.commands);assert.deepEqual(commands.map(c=>c.type),['drive','release']);assert.equal(commands[0].brake,1);assert.equal(commands[0].leaseId,commands[1].leaseId);
    assert.equal(await page.evaluate(() => testUI.state.leaseId),null);
  }record('pull-chain brake keeps existing cancellation and disposal ownership');

  await page.evaluate(() => {mountTest('driver');const next = testHost.snapshot;next.train.stock='electric';testHost.publish(next);});
  assert.equal(await page.locator('.nautilus-train-controls').getAttribute('data-stock'),'electric');assert.equal(await lever.isVisible(),false);assert.equal(await brake.getAttribute('aria-label'),'Apply brake (B)');
  assert.equal(await part('driver').locator('[data-lamp="aboard"]').getAttribute('data-on'),'true');
  await page.locator('[data-direction="forward"]').click();assert.equal(await part('driver').locator('[data-lamp="traction"]').getAttribute('data-on'),'false');record('authoritative stock switches skins; direction selection never lights traction');
  await page.evaluate(() => testHost.replies.push({committed:false,code:'HELD',reason:'Wait for the signal.'}));await part('power-hold').click();
  assert.equal(await part('driver').locator('[data-lamp="traction"]').getAttribute('data-on'),'false');assert.match(await part('request-status').innerText(),/Wait for the signal/);assert.equal(await page.evaluate(() => testUI.state.feedback.played),0);record('refused power stays visible without optimistic lamps or audio');
  await page.evaluate(() => {const next=testHost.snapshot;next.train.controls={direction:'forward',power:.6,brake:0,leaseId:'external'};testHost.publish(next);});
  assert.equal(await part('driver').locator('[data-lamp="traction"]').getAttribute('data-on'),'true');assert.equal(await part('driver').locator('[data-lamp="brake"]').getAttribute('data-on'),'false');
  await page.evaluate(() => {const next=testHost.snapshot;next.train.hold={kind:'signal',reason:'Crossing occupied.'};testHost.publish(next);});assert.equal(await part('driver').locator('[data-lamp="traction"]').getAttribute('data-on'),'false');
  await page.evaluate(() => {const next=testHost.snapshot;next.train.hold=null;next.train.controls.brake=1;testHost.publish(next);});assert.equal(await part('driver').locator('[data-lamp="brake"]').getAttribute('data-on'),'true');record('commuter traction, occupancy and brake lamps follow confirmed controls and hold state');

  await page.evaluate(() => {mountTest('on-foot');const next=testHost.fixture('driver');next.train.stock='electric';testHost.replies.push({snapshot:next});});
  await page.locator('[data-train-action="enter"]:visible').click();
  await page.waitForFunction(() => testUI.state.feedback.contextState==='running');assert.equal(await page.evaluate(() => testUI.state.feedback.played),1);assert.equal(await page.evaluate(() => testUI.state.feedback.lastCue),'electric-boarded');
  await page.evaluate(() => {testHost.publish(testHost.snapshot);testHost.publish(testHost.snapshot);});assert.equal(await page.evaluate(() => testUI.state.feedback.played),1);record('native trusted boarding sounds one real WebAudio chime; repeated subscription updates stay silent');
  await page.evaluate(() => {testHost.replies.push({snapshot:testHost.fixture('on-foot')});});await page.locator('[data-train-action="exit"]:visible').click();assert.equal(await page.evaluate(() => testUI.state.feedback.played),2);assert.equal(await page.evaluate(() => testUI.state.feedback.lastCue),'electric-exited');record('commuter exit chime follows the confirmed on-foot transition');

  await page.evaluate(() => {mountTest('driver');const s=testHost.snapshot;s.train.stock='electric';testHost.publish(s);});
  await part('driver').locator('[data-audio-toggle]').click();assert.equal(await page.evaluate(() => testUI.state.feedback.muted),true);
  await page.evaluate(() => {testHost.replies.push({snapshot:testHost.fixture('on-foot')});});await page.locator('[data-train-action="exit"]:visible').click();assert.equal(await page.evaluate(() => testUI.state.feedback.played),0);
  await page.evaluate(() => testUI.setMuted(false));assert.equal(await page.evaluate(() => testUI.state.feedback.played),0);record('mute button and host preference suppress cues without deferred playback');

  await page.evaluate(() => mountTest('driver'));await page.locator('[data-direction="forward"]').click();await part('power-hold').focus();await page.keyboard.down('Space');
  assert.equal(await page.evaluate(() => testUI.state.feedback.played),0);
  await page.evaluate(() => {const next=testHost.snapshot;next.train.speedMps=.2;next.train.signedSpeedMps=.2;next.train.stopped=false;testHost.publish(next);});
  assert.equal(await page.evaluate(() => testUI.state.feedback.played),1);assert.equal(await page.evaluate(() => testUI.state.feedback.lastCue),'steam-departure');
  await page.evaluate(() => {const next=testHost.snapshot;next.expected.controlRevision++;next.train.controlRevision++;testHost.publish(next);testHost.publish(next);});assert.equal(await page.evaluate(() => testUI.state.feedback.played),1);
  await page.keyboard.up('Space');await page.evaluate(() => {window.closedSoundUI=testUI;testUI.dispose();});await page.waitForFunction(() => closedSoundUI.state.feedback.contextState==='closed');assert.equal(await page.evaluate(() => closedSoundUI.state.feedback.activeSounds),0);record('native WebAudio whistle waits for confirmed departure and closes cleanly on disposal');

  await page.evaluate(() => {mountTest('driver');const next=testHost.snapshot;next.train.speedMps=2;next.train.stopped=false;testHost.publish(next);});
  assert.equal(await page.evaluate(() => testUI.state.feedback.contextState),'not-created');assert.equal(await page.evaluate(() => testUI.state.feedback.played),0);
  await page.evaluate(() => {mountTest('driver');startPower();const next=testHost.snapshot;next.train.speedMps=.2;next.train.stopped=false;testHost.publish(next);});assert.equal(await page.evaluate(() => testUI.state.feedback.contextState),'not-created');assert.equal(await page.evaluate(() => testUI.state.feedback.played),0);record('restored motion and untrusted synthetic control events cannot unlock or replay sounds');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await lever.locator('.lever-hand').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');assert.equal(await brake.locator('.chain-hanging').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await page.emulateMedia({reducedMotion:'no-preference'});record('reduced motion removes lever and chain transitions; lamps remain steady');

  await page.evaluate(() => testUI.dispose());fs.mkdirSync(path.join(evidence,'mechanical'),{recursive:true});
  for(const [width,height,story,file] of [[1440,1000,'steam','desktop-steam.png'],[1440,1000,'electric','desktop-electric.png'],[390,844,'steam','phone-steam.png'],[390,844,'electric','phone-electric.png'],[320,844,'steam','narrow-steam.png'],[320,844,'electric','narrow-electric.png'],[390,844,'commuter','phone-commuter-rider.png']]) {
    await page.setViewportSize({width,height});await page.evaluate(story => trainStudy.showStory(story),story);
    const component = page.locator('.nautilus-train-controls');await component.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
    const dimensions=await component.boundingBox();assert.ok(dimensions.height<height);
    assert.ok(await component.locator('button:visible').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44 && n.getBoundingClientRect().width>=44)));
    await component.screenshot({path:path.join(evidence,'mechanical',file),animations:'disabled'});report.captures.push({file:'mechanical/'+file,width,height,story,scope:'component'});
  }record('both stock skins and commuter rider fit desktop,390px and320px with44px targets');
  await page.evaluate(() => trainStudy.dispose());
}
