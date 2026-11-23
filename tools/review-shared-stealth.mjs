import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {withArtReview} from './art-review-browser.mjs';
const equipment=process.argv.includes('--rifle')?'rifle':'hands',installed=process.argv.includes('--installed'),touch=process.argv.includes('--touch'),basePath=installed?'/artifacts/shared-stealth-installed/site':'',output='shared-stealth-'+(installed?'installed':'source')+'-'+equipment+(touch?'-touch':'')+(process.argv.includes('--draft')?'-draft':''),records=[];
const git=args=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim(),source={commit:git(['rev-parse','HEAD']),tree:git(['rev-parse','HEAD^{tree}']),dirty:!!git(['status','--porcelain'])};
const advance=(page,count)=>page.evaluate(count=>{for(let i=0;i<count;i++)window.stealthFixture.clock.tick(.05);},count);
await withArtReview('Shared stealth native '+equipment+' '+(installed?'installed':'source')+' contract fixture',async({page,browser,baseURL,out})=>{
  page.setDefaultTimeout(60000);
  let context;
  if(touch){context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});page=await context.newPage();}
  const loadedScripts=new Set(),viewErrors=[];page.on('response',r=>{if(r.status()>=400)viewErrors.push(r.status()+' '+r.url());if(r.request().resourceType()==='script'&&r.status()<400)loadedScripts.add(r.url());});page.on('pageerror',e=>viewErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')viewErrors.push(m.text());});
  try{
    const url=baseURL+basePath+'/examples/shared-stealth/?manual=1&observe=1&equipment='+equipment;
    await page.goto(url);await page.evaluate(()=>window.stealthFixtureReady);
    await page.getByRole('button',{name:'Prone',exact:true})[touch?'tap':'click']();await advance(page,1);
    if(touch){
      const stick=await page.getByRole('application',{name:'Walking joystick; drag to move, or use WASD and arrow keys'}).boundingBox(),cdp=await context.newCDPSession(page),x=stick.x+stick.width*.78,y=stick.y+stick.height/2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await advance(page,32);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{await page.locator('canvas').focus();await page.keyboard.down('d');await advance(page,32);await page.keyboard.up('d');}
    const moving=await page.evaluate(()=>window.stealthFixture.read());assert(moving.native.signedDistanceM>.1);await page.screenshot({path:path.join(out,'ordinary-crawl.png')});
    const initialFrames=await page.evaluate(()=>window.stealthFixture.frames),saved=await page.evaluate(()=>window.stealthFixture.save());await page.reload();await page.evaluate(()=>window.stealthFixtureReady);const restored=await page.evaluate(()=>window.stealthFixture.checkpoint());assert.deepEqual(restored.native,saved.native);assert.deepEqual(restored.host,saved.host);assert.deepEqual(restored.clock,saved.clock);
    records.push({type:'exact-moving-reload',signedDistanceM:saved.native.signedDistanceM,resources:saved.host.stealthSave});
    if(!touch){
      await page.getByRole('button',{name:'Open player setup',exact:true}).click();const paused=await page.evaluate(()=>window.stealthFixture.checkpoint());await page.keyboard.down('d');await advance(page,8);await page.keyboard.up('d');assert.deepEqual(await page.evaluate(()=>window.stealthFixture.checkpoint()),paused);await page.keyboard.press('Escape');
      records.push({type:'standard-pause-preserves-host-native-resources-clock'});
      await page.locator('canvas').focus();await page.keyboard.down('a');await advance(page,18);await page.keyboard.up('a');const reversed=await page.evaluate(()=>window.stealthFixture.native.checkpoint());assert(reversed.signedDistanceM<saved.native.signedDistanceM);
      await advance(page,3);const stopped=await page.evaluate(()=>window.stealthFixture.native.checkpoint());await advance(page,3);assert.equal((await page.evaluate(()=>window.stealthFixture.native.checkpoint())).signedDistanceM,stopped.signedDistanceM);
      await page.getByRole('button',{name:'Turn in place',exact:true}).click();await advance(page,1);assert.equal((await page.evaluate(()=>window.stealthFixture.native.checkpoint())).signedDistanceM,stopped.signedDistanceM);
      await page.getByRole('button',{name:'Suspend crawl',exact:true}).click();await advance(page,1);assert.equal((await page.evaluate(()=>window.stealthFixture.frames.at(-1))).result.poseOwner,'host-action');await page.getByRole('button',{name:'Resume crawl',exact:true}).click();await advance(page,1);
      // Turn back to the course, then let ordinary input meet the real AABB stop.
      for(let i=0;i<3;i++){await page.getByRole('button',{name:'Turn in place',exact:true}).click();await advance(page,1);}
      await page.locator('canvas').focus();await page.keyboard.down('d');await advance(page,1200);const blocked=await page.evaluate(()=>({host:window.stealthFixture.host.read(),cursor:window.stealthFixture.native.checkpoint()}));await advance(page,8);await page.keyboard.up('d');const after=await page.evaluate(()=>window.stealthFixture.read());assert.deepEqual(after.host.resources,blocked.host.resources);assert.equal(after.native.signedDistanceM,blocked.cursor.signedDistanceM);
      records.push({type:'reverse-stop-turn-suspend-blocked',blockedPosition:blocked.host.actor.position,travelM:blocked.cursor.signedDistanceM});
    }
    const inspection=await page.evaluate(()=>window.stealthFixture.inspect());await page.screenshot({path:path.join(out,'native-inspection.png')});
    const bareProof=await page.evaluate(()=>({frames:window.stealthFixture.frames,errors:window.stealthFixture.errors}));
    await page.evaluate(()=>window.stealthFixture.dispose());await page.goto(url+'&route=brush');await page.evaluate(()=>window.stealthFixtureReady);
    const beforeBrush=await page.evaluate(()=>window.stealthFixture.host.read());assert.equal(beforeBrush.observation.concealment,10.4);
    await page.getByRole('button',{name:'Clear brush',exact:true})[touch?'tap':'click']();await advance(page,1);const cleared=await page.evaluate(()=>window.stealthFixture.host.read());assert.equal(cleared.observation.concealment,0);assert(cleared.observation.rate>beforeBrush.observation.rate);assert.deepEqual(cleared.resources,beforeBrush.resources);
    const brushSave=await page.evaluate(()=>window.stealthFixture.save());await page.reload();await page.evaluate(()=>window.stealthFixtureReady);assert.deepEqual((await page.evaluate(()=>window.stealthFixture.checkpoint())).host,brushSave.host);
    await page.getByRole('button',{name:'Paint brush',exact:true})[touch?'tap':'click']();await advance(page,1);assert.equal((await page.evaluate(()=>window.stealthFixture.host.read())).mapRevision,2);
    await page.getByRole('button',{name:'Prone',exact:true})[touch?'tap':'click']();await advance(page,1);
    if(touch){const stick=await page.getByRole('application',{name:'Walking joystick; drag to move, or use WASD and arrow keys'}).boundingBox(),cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+stick.width*.78,y:stick.y+stick.height/2}]});await advance(page,260);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else{await page.locator('canvas').focus();await page.keyboard.down('d');await advance(page,190);await page.keyboard.up('d');}
    assert((await page.evaluate(()=>window.stealthFixture.host.read())).actor.position.x>6,'ordinary input entered authored brush');await page.screenshot({path:path.join(out,'ordinary-brush-crawl.png')});records.push({type:'shared-brush-route-clear-reload-paint-enter',before:beforeBrush.observation,cleared:cleared.observation});
    assert.deepEqual(viewErrors,[]);if(installed){const prefix=baseURL+basePath+'/';assert([...loadedScripts].every(u=>u.startsWith(prefix)),'Installed module escaped its verified site.');for(const suffix of ['/packages/stealth-core/index.js','/packages/native-actors/crawl-three.js','/packages/native-actors/crawl-motion.js'])assert([...loadedScripts].some(u=>u.endsWith(suffix)),'Actual installed feature module missing: '+suffix);}
    const proof=await page.evaluate(()=>({frames:window.stealthFixture.frames,errors:window.stealthFixture.errors,final:window.stealthFixture.read()}));proof.frames=[...initialFrames,...bareProof.frames,...proof.frames];proof.errors=[...bareProof.errors,...proof.errors];assert.deepEqual(proof.errors,[]);assert(proof.frames.length>2);
    for(const frame of proof.frames){assert.equal(frame.native.last.revision,frame.host.revision);assert.deepEqual(frame.native.last.position,frame.host.position);assert.deepEqual(frame.worldPosition,[frame.host.position.x,frame.host.position.h,frame.host.position.y]);assert(frame.bodyMinH>=-1e-5,'body ground clearance');if(frame.result.role==='crawl'){assert(Math.hypot(...frame.studyRootPosition)<1e-9);if(equipment==='rifle'){assert(frame.weaponMinH>=.005,'rifle ground clearance');assert(frame.result.gripErrorM<1e-8,'native rifle/hand contact');}}}
    fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({status:'passed',source,equipment,installed,touch,loadedScripts:[...loadedScripts].sort(),viewErrors,physicalHandset:false,scope:'contract fixture, not Editor/UI application acceptance',inspection,records,...proof},null,2)+'\n');
    await page.evaluate(()=>window.stealthFixture.dispose());
  }finally{await page.evaluate(()=>window.stealthFixture?.dispose()).catch(()=>{});await context?.close();}
},{source:true,owner:'01a1810c-62da-7210-a1ca-b72b449ce024',output,timeoutMs:540000});
console.log(JSON.stringify({status:'passed',output}));
