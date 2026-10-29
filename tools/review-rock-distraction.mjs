// Run after npm run build. Uses an isolated, bounded Edge/Chromium lifetime.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {withArtReview,projectRoot} from './art-review-browser.mjs';

const sourceCommit=execFileSync('git',['-c','safe.directory='+projectRoot.replaceAll('\\','/'),'rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim();
const report={sourceCommit,checks:{},captures:[]};
await withArtReview('Rock pickup, first impact and guard investigation acceptance',async({page,context,browser,baseURL,out,errors,failedRequests})=>{
 const capture=async name=>{await page.screenshot({path:path.join(out,name),animations:'disabled'});report.captures.push({file:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')});};
 const inspect=()=>page.evaluate(()=>window.rockDemo.inspect());
 const advance=seconds=>page.evaluate(seconds=>window.rockDemo.advance(seconds),seconds);
 const reset=async()=>{await page.locator('#reset').click();};
 const untilLanded=async()=>{
  let state=await inspect(),frames=0;
  while(state.rocks.some(rock=>rock.phase==='flight')&&frames++<600)state=await advance(1/60);
  assert(frames<600,'Rock did not settle within ten seconds.');
  return inspect();
 };
 await page.setViewportSize({width:1280,height:900});
 await page.goto(baseURL+'/examples/rock-distraction.html?review=1',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.rockDemo?.inspect().renderer);
 const initial=await inspect();report.browser=await context.browser().version();report.renderer=initial.renderer;
 assert.equal(initial.count,0);assert(initial.nearby);assert.equal(initial.rocks.length,1);
 assert(initial.modelMetrics.length===1&&initial.modelMetrics.every(model=>model.metrics.triangles===54&&model.radius===.055&&model.scale.every(value=>value===1)),'Shared native-scale rock model is missing.');report.checks.sharedModel=true;
 await capture('rock-yard-desktop.png');
 await page.locator('#sound').click();
 await page.waitForFunction(()=>window.rockDemo.inspect().audioState==='running');
 await page.locator('#scene').focus();await page.keyboard.press('e');
 let state=await inspect();assert.equal(state.count,1);assert.equal(state.rocks[0].phase,'carried');
 await page.locator('#target-open').click();await capture('rock-lob-preview.png');
 await page.locator('#scene').focus();await page.keyboard.press('Space');
 state=await inspect();assert.equal(state.count,0);assert.equal(state.rocks[0].phase,'flight');assert.equal(state.scheduledThuds,0);
 await advance(1/6);state=await inspect();assert(state.rocks[0].position.h>.1,'Rock did not follow a moving lob.');
 await capture('rock-in-flight.png');
 state=await untilLanded();
 const impact=state.events.filter(event=>event.kind==='impact');assert.equal(impact.length,1);assert.equal(state.scheduledThuds,1);assert.equal(state.thuds,1);
 assert.equal(state.rocks[0].phase,'world');assert(Math.hypot(state.rocks[0].position.x-impact[0].position.x,state.rocks[0].position.y-impact[0].position.y)<1e-8);
 assert(state.ring,'The confirmed impact did not produce a visible sound ring.');
 const guardBefore=initial.guards.find(g=>g.id==='near').position;
 const reacting=state.guards.find(g=>g.id==='near');assert.equal(reacting.mode,'investigate');assert.deepEqual(reacting.target,impact[0].position);
 assert.equal(state.guards.find(g=>g.id==='far').mode,'idle');assert.equal(state.guards.find(g=>g.id==='engaged').mode,'combat');
 await capture('rock-ground-impact.png');report.checks.pickupReleaseLobImpact={event:impact[0],thuds:state.thuds};
 const journey=await page.evaluate(()=>{
  const path=[];let sawSearch=false,sawReturn=false;
  for(let step=0;step<100;step++){const state=window.rockDemo.advance(.25),g=state.guards.find(g=>g.id==='near');path.push(g.position);sawSearch||=g.mode==='search';sawReturn||=g.mode==='return';}
  return {path,sawSearch,sawReturn,state:window.rockDemo.inspect()};
 });
 assert(journey.path.some(p=>Math.hypot(p.x-guardBefore.x,p.y-guardBefore.y)>.5),'Nearby guard never walked.');
 assert(journey.sawSearch&&journey.sawReturn,'Guard did not search and return.');
 assert(journey.path.every(p=>!(p.x>8.72&&p.x<9.53&&p.y>2.72&&p.y<10.28)),'Guard crossed the solid wall.');
 assert.equal(journey.state.guards.find(g=>g.id==='near').mode,'idle');assert.equal(journey.state.events.filter(e=>e.kind==='impact').length,1);
 assert.deepEqual(journey.state.guards.find(g=>g.id==='far').position,initial.guards.find(g=>g.id==='far').position);
 assert.deepEqual(journey.state.guards.find(g=>g.id==='engaged').target,initial.guards.find(g=>g.id==='engaged').target);
 report.checks.hearingAndInvestigation={walked:true,searched:true,returned:true,farUnchanged:true,engagedUnchanged:true,noPlayerLocation:true};
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Walk east',exact:true}).click();
 assert(await page.locator('#pickup').isEnabled(),'Landed rock cannot be approached.');
 await page.locator('#pickup').click();state=await inspect();assert.equal(state.count,1);assert.equal(state.rocks.length,1);assert.equal(state.rocks[0].id,initial.rocks[0].id);
 report.checks.repickup=true;
 await reset();await page.locator('#pickup').click();await page.locator('#target-wall').click();await page.locator('#throw').click();
 await advance(1/6);await capture('rock-wall-lob.png');state=await untilLanded();
 const wallImpact=state.events.find(e=>e.kind==='impact');assert(wallImpact);assert(wallImpact.position.x<9.01&&wallImpact.position.x>8.7,'Wall failed to intercept the throw.');
 assert(wallImpact.position.x<state.aim.x-1,'Impact was emitted at the cursor target.');
 assert.equal(state.events.filter(e=>e.kind==='impact').length,1);assert.equal(state.scheduledThuds,1);
 await capture('rock-wall-impact.png');
 const wallJourney=await page.evaluate(()=>{const path=[];let searched=false;for(let i=0;i<160;i++){const s=window.rockDemo.advance(.25),g=s.guards.find(g=>g.id==='near');path.push(g.position);searched||=g.mode==='search';}return {path,searched,state:window.rockDemo.inspect()};});
 assert(wallJourney.searched,'Guard could not route around the wall to the impact.');
 assert(wallJourney.path.some(p=>p.y<2.73||p.y>10.27),'Guard did not take an opening around the wall.');
 assert(wallJourney.path.every(p=>!(p.x>8.72&&p.x<9.53&&p.y>2.72&&p.y<10.28)),'Investigation walked through the wall.');
 report.checks.wallInterception={impact:wallImpact,walkedAround:true};
 report.checks.snapshots=await page.evaluate(async()=>{
  const {createRockYard}=await import('./rock-distraction-host.js');
  const a=createRockYard();a.pickup();a.throw();a.advance(.25);
  const saved=a.snapshot(),b=createRockYard({snapshot:saved});a.advance(1);for(let i=0;i<60;i++)b.advance(1/60);
  const midflight=JSON.stringify(a.snapshot())===JSON.stringify(b.snapshot());
  a.walk(1,0,.75);b.walk(1,0,.75);a.pickup();b.pickup();
  return {midflight,repickup:JSON.stringify(a.snapshot())===JSON.stringify(b.snapshot()),count:a.presentation().count};
 });
 assert(report.checks.snapshots.midflight&&report.checks.snapshots.repickup);assert.equal(report.checks.snapshots.count,1);
 await reset();
 report.checks.invalidActions=await page.evaluate(()=>{
  const stable=()=>{const s=window.rockDemo.snapshot();return JSON.stringify({rocks:s.rocks,inventory:s.inventory});};
  const initial=stable(),empty=window.rockDemo.throw(),emptyUnchanged=stable()===initial;
  window.rockDemo.walk(-1,0,.7);const farBefore=stable(),far=window.rockDemo.pickup(),farUnchanged=stable()===farBefore;
  window.rockDemo.reset();window.rockDemo.pickup();window.rockDemo.aim({x:21,y:13,h:0});const rangeBefore=stable(),range=window.rockDemo.throw();
  return {emptyRejected:!empty.ok,emptyUnchanged,farRejected:!far.ok,farUnchanged,rangeRejected:!range.ok,rangeUnchanged:stable()===rangeBefore,impacts:window.rockDemo.inspect().events.filter(e=>e.kind==='impact').length};
 });
 assert(Object.entries(report.checks.invalidActions).filter(([key])=>key!=='impacts').every(([,value])=>value));assert.equal(report.checks.invalidActions.impacts,0);
 await reset();await page.locator('#pause').click();state=await inspect();assert(state.paused);assert(!state.framePending);assert(await page.locator('#pickup').isDisabled());await page.locator('#pause').click();
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});await page.close();page=await mobileContext.newPage();
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(baseURL+'/examples/rock-distraction.html?review=1',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.rockDemo?.inspect().renderer);await page.locator('#pickup').scrollIntoViewIfNeeded();
 await page.locator('#pickup').tap();assert.equal((await inspect()).count,1);
 await page.locator('#target-open').tap();await page.locator('#throw').tap();await page.locator('#yard').scrollIntoViewIfNeeded();await untilLanded();
 const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,canvas:document.getElementById('scene').getBoundingClientRect().toJSON(),controls:[...document.querySelectorAll('button')].map(b=>({label:b.textContent.trim(),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))}));
 assert(!mobile.overflow);assert(mobile.controls.filter(c=>!['Pause','Resume','Mute sound','Sound off','Reset yard'].includes(c.label)).every(c=>c.width>=38&&c.height>=38));
 await capture('rock-yard-mobile.png');report.checks.mobile={width:390,height:844,overflow:false,tapPickupThrow:true,reducedMotion:true};
 await page.setViewportSize({width:320,height:568});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);report.checks.narrow320=true;
 await page.setViewportSize({width:1280,height:900});
 await page.goto(baseURL+'/examples/rock-distraction.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.rockDemo?.inspect().renderer);
 await page.locator('#scene').focus();const startX=(await inspect()).player.x;await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');assert((await inspect()).player.x>startX+.2);report.checks.keyboardWalking=true;
 await page.locator('#pickup').click();await page.locator('#throw').click();await page.waitForFunction(()=>window.rockDemo.inspect().events.some(e=>e.kind==='impact'),null,{timeout:10000});
 report.checks.realtimeFlight=true;
 await page.locator('#pause').click();const pausedDraws=(await inspect()).drawings;await page.waitForTimeout(150);assert.equal((await inspect()).drawings,pausedDraws);
 await page.locator('#pause').click();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForFunction(()=>!window.rockDemo.inspect().visible);
 // The observer pauses an offscreen yard; no hidden perpetual RAF is retained.
 await page.waitForTimeout(100);const offscreen=await inspect();if(!offscreen.visible){const before=offscreen.drawings;await page.waitForTimeout(150);assert.equal((await inspect()).drawings,before);}
 await page.evaluate(()=>window.rockDemo.dispose());await page.waitForTimeout(60);const disposed=await inspect();assert(disposed.retired);assert.equal(disposed.framePending,false);assert.equal(disposed.modelCount,0);assert(['closed','uncreated'].includes(disposed.audioState));
 const draws=disposed.drawings;await page.waitForTimeout(100);assert.equal((await inspect()).drawings,draws);
 report.checks.lifecycle={pauseNoFrames:true,offscreenNoFrames:!offscreen.visible,disposed:true,audioClosed:true};
 fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:report.checks,captures:report.captures.map(c=>c.file)},null,2));
},{output:'rock-distraction',timeoutMs:240000,source:process.env.NAUTILUS_REVIEW_SOURCE==='1'});




