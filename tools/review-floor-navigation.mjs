import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
const sourceMode=process.env.NAUTILUS_REVIEW_SOURCE==='1';
const report={sourceCommit:execFileSync('git',['-c','safe.directory='+projectRoot.replaceAll('\\','/'),'rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim(),sourceMode,buildProvenanceSha256:sourceMode?null:createHash('sha256').update(fs.readFileSync(path.join(projectRoot,'dist/build-provenance.json'))).digest('hex'),checks:{},captures:[]};
await withArtReview('Five-label floor navigation, focus, follow and legacy editor cancellation',async({page,browser,baseURL,out,errors,failedRequests})=>{
 const url=baseURL+'/examples/floor-navigation.html',inspect=()=>page.evaluate(()=>window.floorDemo.inspect());
 const capture=async name=>{await page.screenshot({path:path.join(out,name),animations:'disabled'});report.captures.push({file:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')});};
 const selected=async()=> (await inspect()).state.selectedId;
 const jump=async label=>{await page.locator('#direct-floor').selectOption('floor-'+label);assert.equal(await selected(),'floor-'+label);};
 const stable=async action=>{const before=await selected();await action();assert.equal(await selected(),before);};
 await page.setViewportSize({width:1440,height:1100});await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.floorDemo);
 report.browser=await browser.version();const initial=await inspect();
 assert.deepEqual(initial.visible.map(floor=>floor.label),['7','8','9','10','11']);
 await capture('extended-floor-9-desktop.png');
 await jump(10);assert.deepEqual((await inspect()).visible.map(floor=>floor.label),['8','9','10','11','12']);
 await jump(15);assert.deepEqual((await inspect()).visible.map(floor=>floor.label),['13','14','15','16','17']);await capture('extended-floor-15-desktop.png');
 await jump(1);assert(await page.locator('[data-action=previous]').isDisabled());
 await jump(32);assert(await page.locator('[data-action=next]').isDisabled());assert.deepEqual((await inspect()).visible.map(floor=>floor.label),['28','29','30','31','32']);
 report.checks.windows9to10and15andEnds=true;
 await jump(10);await page.locator('#world-scene').focus();await page.keyboard.press('PageUp');assert.equal(await selected(),'floor-11');await page.keyboard.press('PageDown');assert.equal(await selected(),'floor-10');
 await page.locator('#text-field').focus();await stable(()=>page.keyboard.press('PageUp'));
 await page.locator('#character-floor').focus();await stable(()=>page.keyboard.press('PageDown'));
 await page.locator('#open-focus-dialog').click();await stable(()=>page.keyboard.press('PageUp'));await page.locator('#focus-dialog button').click();
 await page.evaluate(()=>{const node=document.createElement('div');node.id='menu-focus';node.setAttribute('role','menu');node.tabIndex=0;node.textContent='Menu focus';document.body.append(node);node.focus();});
 await stable(()=>page.keyboard.press('PageUp'));await page.locator('#menu-focus').evaluate(node=>node.remove());
 await page.evaluate(()=>{const node=document.createElement('div');node.id='editable-focus';node.contentEditable='true';node.textContent='Editable';document.body.append(node);node.focus();});
 await stable(()=>page.keyboard.press('PageDown'));await page.locator('#editable-focus').evaluate(node=>node.remove());
 report.checks.inputSelectModalMenuAndEditableFocus=true;
 // Observe after the production listener on the same element: state and
 // defaultPrevented are then synchronous, unlike capture/microtask observers.
 const zoom=(await inspect()).zoom;
 await page.evaluate(()=>{
  const data={idleMs:180,native:[],bubbled:[],controlled:[],pointer:null,targeting:[]},selector=document.querySelector('.nautilus-floor-nav'),scene=document.getElementById('world-scene');
  let phase='native-first';
  const describe=node=>node instanceof Element?{tag:node.localName,id:node.id||null,class:node.getAttribute('class'),floorId:node.getAttribute('data-floor-id')}:null;
  const pointerMove=event=>{data.pointer={timeStamp:event.timeStamp,clientX:event.clientX,clientY:event.clientY,pageX:event.pageX,pageY:event.pageY,isTrusted:event.isTrusted,target:describe(event.target)};};
  const observe=zone=>event=>{
   const previous=data.native.filter(item=>item.zone===zone).at(-1),snapshot=window.floorDemo.inspect();
   data.native.push({zone,phase,timeStamp:event.timeStamp,gapMs:previous?event.timeStamp-previous.timeStamp:null,deltaY:event.deltaY,deltaMode:event.deltaMode,clientX:event.clientX,clientY:event.clientY,target:describe(event.target),hitTarget:describe(document.elementFromPoint(event.clientX,event.clientY)),pointer:data.pointer,isTrusted:event.isTrusted,defaultPrevented:event.defaultPrevented,selectedId:snapshot.state.selectedId,zoom:snapshot.zoom,scrollY});
  };
  const selectorObserver=observe('selector'),sceneObserver=observe('scene'),bubbled=event=>data.bubbled.push({phase,timeStamp:event.timeStamp,clientX:event.clientX,clientY:event.clientY,target:describe(event.target),isTrusted:event.isTrusted,defaultPrevented:event.defaultPrevented});
  selector.addEventListener('wheel',selectorObserver,{passive:true});scene.addEventListener('wheel',sceneObserver,{passive:true});document.addEventListener('wheel',bubbled,{passive:true});document.addEventListener('pointermove',pointerMove,true);
  window.floorWheelReview={data,describe,beginTarget(zone,value,locator){
   phase=value;data.targeting.push({zone,phase,locator,status:'pending-hover',startedAt:performance.now(),scrollBefore:{x:scrollX,y:scrollY},pointerBefore:data.pointer});
  },inspectTarget(node){
   const attempt=data.targeting.at(-1),pointer=data.pointer,rect=node.getBoundingClientRect(),hit=pointer?document.elementFromPoint(pointer.clientX,pointer.clientY):null;
   Object.assign(attempt,{status:'hit-tested',timeStamp:performance.now(),pointer,expectedTarget:describe(node),hitTarget:describe(hit),bounds:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom},containsPointer:!!hit&&(hit===node||node.contains(hit)),hovered:node.matches(':hover'),scrollX,scrollY});return attempt;
  },stop(){selector.removeEventListener('wheel',selectorObserver);scene.removeEventListener('wheel',sceneObserver);document.removeEventListener('wheel',bubbled);document.removeEventListener('pointermove',pointerMove,true);}};
 });
 const hoverWheelTarget=async(zone,phase)=>{
  const selector=zone==='selector'?'.fn-floor[aria-pressed="true"]':'#world-scene',locator=page.locator(selector);
  await page.evaluate(({zone,phase,selector})=>window.floorWheelReview.beginTarget(zone,phase,selector),{zone,phase,selector});
  // Flush focus-removal scroll anchoring before actionability, then allow the
  // compositor to settle after locator hover. Never reuse a saved viewport box.
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await settle();await locator.hover();await settle();
  const targeting=await locator.evaluate(node=>window.floorWheelReview.inspectTarget(node));
  assert(targeting.pointer?.isTrusted,'Native hover did not deliver a trusted pointer: '+JSON.stringify(targeting));
  assert(targeting.containsPointer&&targeting.hovered,'Native wheel target failed its live DOM hit test: '+JSON.stringify(targeting));
  return targeting;
 };
 try{
  const target=await hoverWheelTarget('selector','native-first'),scroll=target.scrollY;
  await page.mouse.wheel(0,-400);
  await page.waitForFunction(()=>window.floorWheelReview.data.native.some(item=>item.zone==='selector'));
  assert.equal(await selected(),'floor-11');assert.equal((await inspect()).zoom,zoom);assert.equal(await page.evaluate(()=>scrollY),scroll);
  assert.equal(await page.evaluate(()=>window.floorWheelReview.data.bubbled.length),0);
  // Awaited automation calls do not imply one continuous gesture. Wait for
  // the existing idle rule, then verify the actual delivered timestamp gap.
  await page.waitForFunction(()=>{const last=window.floorWheelReview.data.native.filter(item=>item.zone==='selector').at(-1);return performance.now()-last.timeStamp>=window.floorWheelReview.data.idleMs;});
  const priorCount=await page.evaluate(()=>window.floorWheelReview.data.native.length);
  await hoverWheelTarget('selector','native-later-gesture');await page.mouse.wheel(0,-400);
  await page.waitForFunction(count=>window.floorWheelReview.data.native.length>count,priorCount);
  const nativeSelector=await page.evaluate(()=>window.floorWheelReview.data.native.filter(item=>item.zone==='selector'));
  assert.equal(nativeSelector.length,2,'Both native wheel requests must be delivered.');assert(nativeSelector.every(item=>item.isTrusted&&item.defaultPrevented&&item.deltaY<0));
  assert(nativeSelector.at(-1).gapMs>=180,'The later native gesture did not have an observed idle gap.');
  assert.equal(await selected(),'floor-12');assert.equal((await inspect()).zoom,zoom);assert.equal(await page.evaluate(()=>scrollY),scroll);
  assert.equal(await page.evaluate(()=>window.floorWheelReview.data.bubbled.length),0);
  const controlled=await page.evaluate(async()=>{
   const {createFloorNavigation}=await import('/packages/floor-navigation/index.js'),{mountFloorNavigation}=await import('/packages/floor-navigation/dom.js');
   const container=document.createElement('div');container.style.cssText='position:fixed;left:0;top:0;width:400px';document.body.append(container);
   const changes=[],controller=createFloorNavigation({floors:window.floorDemo.controller.state.floors,selectedId:'floor-10',onFloorChange:({to})=>changes.push(to.id)});
   const view=mountFloorNavigation(container,controller,{keyboardTarget:container,showModes:false}),events=[];
   const observe=event=>{const previous=events.at(-1);events.push({timeStamp:event.timeStamp,gapMs:previous?event.timeStamp-previous.timeStamp:null,deltaY:event.deltaY,deltaMode:event.deltaMode,clientX:event.clientX,clientY:event.clientY,target:window.floorWheelReview.describe(event.target),isTrusted:event.isTrusted,defaultPrevented:event.defaultPrevented,selectedId:controller.state.selectedId});};
   view.element.addEventListener('wheel',observe,{passive:true});
   const send=(time,deltaY=-400)=>{
    const event=new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true});
    Object.defineProperty(event,'timeStamp',{value:time});
    const dispatched=view.element.dispatchEvent(event);events.at(-1).dispatchCanceled=!dispatched;
   };
   try{
    // One browser task and explicit event times isolate inertia from RPC load.
    for(let time=0;time<=600;time+=5)send(time);
    const burst=events.length;send(779);send(959);
    for(const [time,delta]of [[960,-220],[965,-60],[990,-15],[1080,-1]])send(time,delta);
    send(1260,400);
    const result={events,changes,burstCount:burst,selectedId:controller.state.selectedId};
    window.floorWheelReview.data.controlled=result;return result;
   }finally{view.dispose();controller.dispose();container.remove();}
  });
  assert.equal(controlled.burstCount,121);assert.equal(controlled.events.length,128,'All controlled wheel events must be delivered.');assert(controlled.events.slice(0,121).every(item=>item.selectedId==='floor-11'));
  assert.equal(controlled.events[120].timeStamp-controlled.events[0].timeStamp,600);
  assert.equal(controlled.events[121].gapMs,179);assert.equal(controlled.events[121].selectedId,'floor-11');
  assert.equal(controlled.events[122].gapMs,180);assert.equal(controlled.events[122].selectedId,'floor-12');
  assert(controlled.events.slice(123,127).every(item=>item.selectedId==='floor-12'));
  assert.equal(controlled.events[127].gapMs,180);assert.equal(controlled.selectedId,'floor-11');
  assert.deepEqual(controlled.changes,['floor-11','floor-12','floor-11']);
  assert(controlled.events.every(item=>!item.isTrusted&&item.defaultPrevented&&item.dispatchCanceled));
  assert.equal(await selected(),'floor-12');assert.equal((await inspect()).zoom,zoom);assert.equal(await page.evaluate(()=>scrollY),scroll);
  await hoverWheelTarget('scene','native-scene-zoom');
  await page.mouse.wheel(0,-80);await page.waitForFunction(()=>window.floorWheelReview.data.native.some(item=>item.zone==='scene')&&window.floorWheelReview.data.bubbled.length===1);assert.equal((await inspect()).zoom,105);
  assert.equal(await selected(),'floor-12');
  const sceneEvents=await page.evaluate(()=>window.floorWheelReview.data.native.filter(item=>item.zone==='scene'));
  assert.equal(sceneEvents.length,1,'The native scene wheel request must be delivered.');assert(sceneEvents.every(item=>item.isTrusted&&item.defaultPrevented&&item.zoom===105&&item.selectedId==='floor-12'));
  report.checks.nativeWheelChangesFloorAfterObservedIdleAndRemainsScoped=true;
  report.checks.controlledContinuousBurstAndInertiaAnd179to180Boundary=true;
  report.checks.selectorGestureLatchedNoSceneZoomAndSceneWheelZoomOnly=true;
 }finally{
  const data=await page.evaluate(()=>{const probe=window.floorWheelReview;probe.stop();delete window.floorWheelReview;return probe.data;});
  const file='wheel-events.json';fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2));
  report.wheelEvidence={file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex'),nativeEvents:data.native.length,controlledEvents:data.controlled.events?.length??0};
 }
 await jump(11);
 await page.locator('#character-floor').selectOption('floor-9');await page.locator('#confirm-character').click();assert.equal(await selected(),'floor-11');
 await page.getByRole('button',{name:'Return to character follow',exact:true}).click();assert.equal(await selected(),'floor-9');
 await page.locator('#inspect-contact').click();assert.equal(await selected(),'floor-15');assert.equal((await inspect()).state.mode,'contact-inspection');
 await page.locator('#lose-contact').click();assert.equal(await selected(),'floor-9');assert.equal((await inspect()).state.mode,'character-follow');
 assert.equal(await page.evaluate(()=>window.floorDemo.controller.updateContact({id:'contact',floorId:'floor-32',detected:true})),false);
 await jump(15);await page.locator('#character-floor').selectOption('floor-10');await page.locator('#confirm-character').click();assert.equal(await selected(),'floor-15');assert.equal((await inspect()).state.mode,'manual');
 await page.locator('#preview-wall').click();assert((await inspect()).preview);await page.locator('#world-scene').focus();await page.keyboard.press('PageUp');assert.equal((await inspect()).preview,false);
 assert.deepEqual((await inspect()).resources,initial.resources);assert.equal((await inspect()).geometryEdits,0);assert.equal((await inspect()).undo,0);
 report.checks.followDetectionLossManualAndNoGameplayOrGeometryCosts=true;
 await page.locator('#profile').selectOption('legacy6');
 assert.equal((await inspect()).state.floors.length,6);await jump(1);assert.deepEqual((await inspect()).visible.map(floor=>floor.label),['1','2','3','4','5']);await jump(6);assert.deepEqual((await inspect()).visible.map(floor=>floor.label),['2','3','4','5','6']);await capture('legacy-6-desktop.png');
 report.checks.legacy6=true;
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.fn-floor').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s');report.checks.reducedMotion=true;
 const phoneContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true}),phone=await phoneContext.newPage();
 phone.on('pageerror',error=>errors.push(error.message));phone.on('console',message=>{if(message.type()==='error')errors.push(message.text());});phone.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});
 await phone.goto(url,{waitUntil:'networkidle'});await phone.locator('.fn-floor[aria-pressed=true]').scrollIntoViewIfNeeded();await phone.locator('[data-action=next]').tap();assert.equal(await phone.evaluate(()=>window.floorDemo.inspect().state.selectedId),'floor-10');
 for(const width of [390,320]){
  await phone.setViewportSize({width,height:844});const bounds=await phone.locator('.fn-strip button:visible').evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));
  assert(bounds.every(box=>box.width>=44&&box.height>=44),'Phone targets are smaller than 44px at '+width);
  assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await phone.locator('.world-footer').scrollIntoViewIfNeeded();await phone.screenshot({path:path.join(out,'extended-phone-320.png'),animations:'disabled'});report.captures.push({file:'extended-phone-320.png',sha256:createHash('sha256').update(fs.readFileSync(path.join(out,'extended-phone-320.png'))).digest('hex')});
 await phoneContext.close();report.checks.phoneTouchAnd320Reflow=true;
 const reflow=await browser.newContext({viewport:{width:640,height:450},deviceScaleFactor:2}),small=await reflow.newPage();
 small.on('pageerror',error=>errors.push(error.message));small.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});await small.goto(url,{waitUntil:'networkidle'});assert(await small.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await reflow.close();report.checks.zoomEquivalent200PercentReflow=true;
 if(!sourceMode){
  await page.goto(baseURL+'/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.editor3d?.document&&!window.editor3d.loading,undefined,{timeout:60000});
  assert.ok(await page.evaluate(()=>!!window.nautilus?.floorNavigation),'The built editor must install its floor controls automatically.');
  await page.evaluate(()=>{window.floorReviewBinding=window.nautilus.floorNavigation;});
  assert.equal(await page.evaluate(()=>window.floorReviewBinding.controller.state.floors.length),6);
  await page.evaluate(()=>window.floorReviewBinding.controller.select('0'));
  const before=await page.evaluate(()=>({json:window.editor3d.export(),revision:window.editor3d.document.revision}));
  await page.evaluate(()=>{const tool=document.getElementById('edit-tool');tool.value='wall';tool.dispatchEvent(new Event('change'));});
  const canvas=await page.locator('#scene').boundingBox();await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.55);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.6,canvas.y+canvas.height*.55,{steps:4});
  assert.match(await page.locator('#status').textContent(),/Release to place/);
  await page.keyboard.press('PageUp');await page.mouse.up();
  const after=await page.evaluate(()=>({json:window.editor3d.export(),revision:window.editor3d.document.revision,floor:window.editor3d.scene.options.level}));
  assert.deepEqual({json:after.json,revision:after.revision},before);assert.equal(after.floor,1);
  await page.evaluate(()=>{const control=document.getElementById('floor');control.value='5';control.dispatchEvent(new Event('change'));});
  assert.equal(await page.evaluate(()=>window.floorReviewBinding.controller.state.selectedId),'5');
  await capture('legacy-editor-desktop.png');
  await page.setViewportSize({width:390,height:844});await page.locator('.fn-editor').waitFor();const editorBounds=await page.locator('.fn-editor').boundingBox();assert(editorBounds.x>=0&&editorBounds.x+editorBounds.width<=390&&editorBounds.y+editorBounds.height<=844);assert.equal(await page.locator('.fn-editor .fn-modes:visible').count(),0);
  await capture('legacy-editor-phone.png');
  await page.evaluate(()=>window.floorReviewBinding.dispose());report.checks.legacyEditorNativeRangeStrokeCancellationAndPhoneManualControls=true;
 }
 report.errors=errors;report.failedRequests=failedRequests;fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.checks));
},{output:'floor-navigation',source:sourceMode,timeoutMs:240000});
