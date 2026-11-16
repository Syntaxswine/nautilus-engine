import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {withArtReview} from '../../../tools/art-review-browser.mjs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inventory} from './inventory.mjs';
const groups=[],inputs=inventory();
await withArtReview('Executable player setup: real native startup, generated menu and guarded replacement',async({page,baseURL,out,browser})=>{
  page.setDefaultTimeout(25000);await page.setViewportSize({width:1280,height:900});
  try{
    await page.goto(baseURL+'/packages/player-setup/fixture/');await page.waitForFunction(()=>window.playerSetupFixture);
    const initial=await page.evaluate(()=>window.playerSetupFixture.setup.read());
    assert.equal(initial.native.model,'goat');assert.ok(initial.sharedOwnedProviders>=3);
    await page.screenshot({path:path.join(out,'native-default-startup.png')});groups.push('short config starts an owned world, native painted actor, camera, clock and existing UI without handmade controls');
    await page.keyboard.down('d');await page.waitForFunction(x=>window.playerSetupFixture.setup.read().actor.position.x>x+.3,initial.actor.position.x);await page.keyboard.up('d');
    const walked=await page.evaluate(()=>window.playerSetupFixture.setup.read());assert.ok(walked.native.distanceM>.2);
    groups.push('existing native walking input reaches authoritative movement and confirmed distance drives native gait');
    await page.getByRole('button',{name:'Open player setup',exact:true}).click();
    const failed=await page.evaluate(async()=>{const s=window.playerSetupFixture.setup,before=s.read(),config=s.readConfiguration();config.components.find(c=>c.id==='setup.actor').settings.model='donkey';window.rejectNative=true;const result=await s.applyConfiguration(config);window.rejectNative=false;return {result,before,after:s.read()};});
    assert.equal(failed.result.committed,false);assert.deepEqual(failed.after.configuration,failed.before.configuration);assert.deepEqual(failed.after.actor,failed.before.actor);assert.equal(failed.after.sharedOwnedProviders,failed.before.sharedOwnedProviders);
    groups.push('failed native preparation retains accepted world, pose/configuration and owned provider leases');
    let heldRoute,requestSeen;const seen=new Promise(resolve=>{requestSeen=resolve;});
    await page.route('**/donkey-10k-data.json',route=>{heldRoute=route;requestSeen();});
    await page.evaluate(()=>{const s=window.playerSetupFixture.setup,c=s.readConfiguration();c.components.find(c=>c.id==='setup.actor').settings.model='donkey';window.setupAbort=new AbortController();window.cancelledSetup=s.applyConfiguration(c,{signal:window.setupAbort.signal});});
    await seen;await page.evaluate(()=>window.setupAbort.abort());const cancelled=await page.evaluate(()=>window.cancelledSetup);assert.equal(cancelled.committed,false);assert.equal(cancelled.code,'PREPARATION_CANCELLED');await heldRoute.abort().catch(()=>{});await page.unroute('**/donkey-10k-data.json');
    assert.equal(await page.evaluate(()=>window.playerSetupFixture.setup.read().native.model),'goat');
    groups.push('pre-commit cancellation aborts pending native acquisition and preserves the accepted setup');
    assert.equal(await page.locator('[data-module="player.trains"]').isDisabled(),true);
    await page.locator('[data-component="player.walking"][data-setting="pace"]').fill('0.6');
    await page.locator('[data-component="player.camera"][data-setting="zoom"]').fill('1.3');
    await page.locator('[data-component="player.shell"][data-setting="skin"]').selectOption('tinderbox');
    await page.getByRole('button',{name:'Apply & try',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.pui-setup').open);
    const changed=await page.evaluate(()=>window.playerSetupFixture.setup.readConfiguration());assert.equal(changed.components.find(c=>c.id==='player.walking').settings.pace,.6);assert.equal(changed.components.find(c=>c.id==='player.camera').settings.zoom,1.3);
    groups.push('one descriptor-generated menu applies actual pace/camera/skin; unavailable train module is a named disabled choice');
    await page.getByRole('button',{name:'Open player setup',exact:true}).click();await page.getByText('Save or load recipe',{exact:true}).click();await page.getByRole('button',{name:'Export accepted recipe',exact:true}).click();
    const exported=JSON.parse(await page.locator('textarea').inputValue());assert.equal(exported.kind,'nautilus-player-setup');assert.deepEqual(exported,changed);
    await page.locator('[data-component="setup.actor"][data-setting="model"]').selectOption('donkey');await page.getByRole('button',{name:'Apply & try',exact:true}).click();
    await page.waitForFunction(()=>window.playerSetupFixture.setup.read().native.model==='donkey');
    assert.equal(await page.locator('.nautilus-player-ui').count(),1);
    const replaced=await page.evaluate(()=>window.playerSetupFixture.setup.read());assert.equal(replaced.sharedOwnedProviders,walked.sharedOwnedProviders);
    assert.deepEqual(replaced.actor.position,walked.actor.position);await page.screenshot({path:path.join(out,'native-donkey-replacement.png')});
    groups.push('full-recipe native actor replacement preserves the live world/position and retires the old shell/view');
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open player setup',exact:true}).click();
    await page.screenshot({path:path.join(out,'generated-setup-phone.png')});
    const check=await page.evaluate(()=>{const setup=window.playerSetupFixture.setup,c=setup.readConfiguration();c.components.find(c=>c.id==='setup.actor').settings.model='missing';return {before:setup.read().actor,ready:setup.validate(c)};});assert.equal(check.ready.ok,false);
    await page.getByRole('button',{name:'Return',exact:true}).click();
    const restore=await page.evaluate(async()=>{const s=window.playerSetupFixture.setup;s.ui.openMenu();const saved=s.checkpoint();const r=await s.restoreCheckpoint(saved);return {result:r,after:s.checkpoint(),before:saved};});
    assert.equal(restore.result.committed,true);assert.deepEqual(restore.after.ownedWorld,restore.before.ownedWorld);assert.deepEqual(restore.after.native,restore.before.native);
    groups.push('complete setup checkpoint restores matching native pose/identity and exact resources without replaying input');
    await page.waitForFunction(()=>{const {camera,screenPoint:p}=window.playerSetupFixture.setup.read(),r=camera?.bounds?.safe;return r&&p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;});
    groups.push('phone camera uses measured generated HUD bounds to keep the native actor inside the free rectangle');

    const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),touch=await touchContext.newPage();
    await touch.goto(baseURL+'/packages/player-setup/fixture/');await touch.waitForFunction(()=>window.playerSetupFixture);
    const start=await touch.evaluate(()=>window.playerSetupFixture.setup.read().actor.position),stick=await touch.getByRole('application',{name:'Walking joystick; drag to move, or use WASD and arrow keys'}).boundingBox(),cdp=await touchContext.newCDPSession(touch);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+stick.width*.75,y:stick.y+stick.height/2}]});
    await touch.waitForFunction(x=>window.playerSetupFixture.setup.read().actor.position.x>x+.2,start.x);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});const stopped=await touch.evaluate(()=>window.playerSetupFixture.setup.read().actor.position);await touch.waitForTimeout(120);assert.deepEqual(await touch.evaluate(()=>window.playerSetupFixture.setup.read().actor.position),stopped);
    await touch.evaluate(()=>window.playerSetupFixture.setup.dispose());await touchContext.close();groups.push('actual phone touch drives confirmed native movement; cancellation does not retain a held walk');

    // Test-only immutable legacy-host conformance. No runtime package imports
    // an example, donor checkout or private scene startup module.
    const legacy=execFileSync('git',['show','578a86113395ea3ebcb76c636ce8f0882600d03e:examples/train-yard-host.js'],{encoding:'utf8'});
    const legacyHash=createHash('sha256').update(legacy).digest('hex');
    await page.setViewportSize({width:1280,height:900});
    const retained=await page.evaluate(async({legacy,baseURL})=>{
      await window.playerSetupFixture.setup.dispose();
      const api=await import('/packages/player-setup/browser.js'),T=await import('/packages/render-effects/three.js'),assets=await import('/packages/assets/three.js');
      const url=URL.createObjectURL(new Blob([legacy.replaceAll("from '../packages/","from '"+baseURL+'/packages/')],{type:'text/javascript'}));
      const {createTrainYardHost}=await import(url);URL.revokeObjectURL(url);const host=createTrainYardHost(),before=host.actors;
      const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%';canvas.tabIndex=0;document.querySelector('#game').append(canvas);
      const renderer=new T.WebGLRenderer({canvas,antialias:true}),scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,700);scene.background=new T.Color(0x91ada5);scene.add(new T.HemisphereLight(0xf2eed8,0x3a5034,2.3));
      const kit=assets.createRailwayKit(T),views=[];for(const route of host.routes)scene.add(kit.createCircuit(route.waypoints,route.radiusM).root);for(const train of host.read().trains){const view=assets.createRailwayTrainView(T,train.state);views.push(view);scene.add(view.root);}
      const source=api.createRetainedFrameSource();let paused=false,hostDisposals=0,rendererDisposals=0,commands=0,draws=0,saves=0,cleaned=false;
      const borrowed={connector:{contract:host.connector.contract,readForActor:id=>host.connector.readForActor(id),subscribe:fn=>host.connector.subscribe(fn),dispatch:command=>{commands++;return host.connector.dispatch(command);}},walk:(...args)=>host.walk(...args),get actors(){return host.actors;},save(){saves++;return host.save();},dispose(){hostDisposals++;host.dispose();}};
      const surface={renderer,scene,camera,canvas,resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;},draw(){draws++;for(const [i,train]of host.read().trains.entries())views[i].update(train.state);renderer.render(scene,camera);}};
      const originalDispose=renderer.dispose.bind(renderer);renderer.dispose=()=>{rendererDisposals++;originalDispose();};
      const identity={id:'retained-two-circuit-yard',version:1,sourcePin:'578a86113395ea3ebcb76c636ce8f0882600d03e'},provider=api.retainTrainYard({host:borrowed,content:identity,surface,clock:source,setUIPaused:value=>{paused=value;}});
      const configuration=api.bindSetupProvider(api.createSetupConfiguration({content:identity,trains:true}),provider);
      const setup=await api.mountPlayerSetup(document.querySelector('#game'),{configuration,content:{identity,world:{widthM:240,depthM:180}},providers:[provider]});
      const step=()=>{source.beforeStep(.05,paused);if(!paused)host.advance(.05);source.afterStep(.05,paused);};step();
      window.retainedSetupTest={setup,host,step,read:()=>({paused,hostDisposals,rendererDisposals,commands,draws,saves}),before,
        cleanup(){if(cleaned)return;cleaned=true;views.forEach(v=>v.dispose());kit.dispose();originalDispose();canvas.remove();host.dispose();}};
      return {sameActorIds:JSON.stringify(before.map(a=>a.id))===JSON.stringify(host.actors.map(a=>a.id)),plan:setup.connectionInspector(),saved:setup.checkpoint()};
    },{legacy,baseURL});
    assert.equal(retained.sameActorIds,true);assert.equal(retained.saved.ownedWorld,null);assert.equal(retained.saved.clock,null);
    assert.ok(!retained.plan.some(p=>['setup.world','setup.clock','setup.surface'].includes(p.providerId)));
    await page.keyboard.press('e');assert.equal(await page.evaluate(()=>window.retainedSetupTest.host.connector.readForActor('player').mode),'driver');
    const train=await page.evaluate(()=>{const t=window.retainedSetupTest,v=t.setup.readControls(),r=t.setup.dispatch({version:1,type:'control',context:v.context.token,offer:v.train.context,control:{kind:'notch',notch:1}});for(let i=0;i<30;i++)t.step();return {result:r,actor:t.host.actors[0],speed:t.host.connector.readForActor('player').train.speedMps,read:t.read()};});
    assert.equal(train.result.committed,true);assert.ok(train.speed>0);assert.equal(train.read.hostDisposals,0);assert.equal(train.read.rendererDisposals,0);assert.equal(train.read.saves,0);
    await page.screenshot({path:path.join(out,'retained-train-yard-adapter.png')});
    const survival=await page.evaluate(async()=>{const t=window.retainedSetupTest,resources=t.host.actors.map(({health,ap,inventory,stamina})=>({health,ap,inventory,stamina}));await t.setup.dispose();const snapshot=t.host.connector.readForActor('player'),before=t.read();t.step();const after=t.read();return {before,after,controls:snapshot.train.controls,resourcesSame:JSON.stringify(resources)===JSON.stringify(t.host.actors.map(({health,ap,inventory,stamina})=>({health,ap,inventory,stamina}))),sceneAlive:!!t.host.read().trains.length};});
    assert.equal(survival.before.hostDisposals,0);assert.equal(survival.before.rendererDisposals,0);assert.equal(survival.before.saves,0);assert.equal(survival.controls.power,0);assert.equal(survival.controls.brake,1);assert.equal(survival.resourcesSame,true);assert.equal(survival.sceneAlive,true);assert.equal(survival.before.draws,survival.after.draws);
    await page.evaluate(()=>window.retainedSetupTest.cleanup());groups.push('retained real train host keeps world/clock/resources/persistence/authority; mounted actuator release and owned cleanup spare borrowed services');
    fs.writeFileSync(path.join(out,'retained-source.json'),JSON.stringify({commit:'578a86113395ea3ebcb76c636ce8f0882600d03e',path:'examples/train-yard-host.js',sha256:legacyHash,bytes:Buffer.byteLength(legacy),testOnly:true,adaptation:'Only ESM import URLs in an ephemeral test module; original host implementation and game command authority unchanged.'},null,2)+'\n');
    fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({status:'passed',browser:browser.version(),groups,engine:initial.configuration.engine,content:initial.configuration.content,runtime:inputs.runtime,source:true,physicalHandset:false,installed:false},null,2)+'\n');
  }catch(error){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
  finally{await page.evaluate(async()=>{await window.retainedSetupTest?.setup.dispose();window.retainedSetupTest?.cleanup();await window.playerSetupFixture?.setup.dispose();}).catch(()=>{});}
},{source:true,owner:'01a1810c-62da-7210-a1ca-b72b449ce024',output:'player-setup-stage2',timeoutMs:180000});
console.log(JSON.stringify({status:'passed',groups:groups.length}));
