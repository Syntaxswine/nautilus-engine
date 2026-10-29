import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFloorNavigation,floorWindow,createFloorWheel,floorKeyStep,FLOOR_MODES} from '../packages/floor-navigation/index.js';
import {floorInputBlocked} from '../packages/floor-navigation/dom.js';
const floors=count=>Array.from({length:count},(_,i)=>({id:i,label:String(i+1),elevationM:i*2.12}));
const make=(options={})=>createFloorNavigation({floors:floors(32),selectedId:0,...options});

test('headless controller has no browser, renderer, timer or game dependencies',()=>{
 const source=fs.readFileSync(new URL('../packages/floor-navigation/index.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:document|window|localStorage|setTimeout|setInterval|requestAnimationFrame|performance|Date|import)\b/);
 assert.equal(globalThis.document,undefined);assert.equal(make().state.mode,FLOOR_MODES.manual);
});
test('five-label window follows real IDs through 9 to 10, 15 and both ends',()=>{
 const controller=make();
 for(const [selectedId,labels]of [[0,['1','2','3','4','5']],[8,['7','8','9','10','11']],[9,['8','9','10','11','12']],[14,['13','14','15','16','17']],[31,['28','29','30','31','32']]]){
  controller.select(selectedId);assert.deepEqual(controller.visibleFloors.map(value=>value.label),labels);assert(controller.visibleFloors.some(value=>value.id===selectedId));
 }
 assert.equal(controller.step(1),false);controller.select(0);assert.equal(controller.step(-1),false);
 assert.equal(floorWindow(floors(3),1).length,3);
});
test('IDs, labels and native heights do not assume contiguous numbers or standard spacing',()=>{
 const declared=[{id:'basement-b',label:'B',elevationM:-3.1},{id:'ground',label:'G',elevationM:.37},{id:'mezzanine',label:'M',elevationM:4.2}];
 const changes=[],controller=make({floors:declared,selectedId:'ground',onFloorChange:event=>changes.push(event)});
 declared[1].elevationM=999;controller.step(1);
 assert.equal(controller.state.selectedId,'mezzanine');assert.equal(changes[0].from.elevationM,.37);assert.equal(changes[0].to.elevationM,4.2);
 assert(Object.isFrozen(controller.state.floors[0]));assert.throws(()=>controller.select('unknown'),/unavailable/);
});
test('reject malformed floor contracts and unavailable initial selection',()=>{
 for(const value of [[],[{id:0,label:'G',elevationM:NaN}],[{id:0,label:'',elevationM:0}],[{id:0,label:'G',elevationM:0},{id:0,label:'1',elevationM:2}]]){
  assert.throws(()=>make({floors:value}));
 }
 assert.throws(()=>make({selectedId:99}),/initial/);assert.throws(()=>make({onFloorChange:3}),/callbacks/);
});
test('cancel precedes host working-plane change and selection has no edit command',()=>{
 const calls=[],resources={ap:0,stamina:12,clock:480,undo:7};let preview=true;
 const controller=make({cancelPreview:event=>{calls.push(['cancel',event.from.id,event.to.id]);preview=false;},onFloorChange:event=>{assert.equal(preview,false);assert.equal(controller.state.selectedId,0);calls.push(['floor',event.to.id]);}});
 controller.select(9);assert.deepEqual(calls,[['cancel',0,9],['floor',9]]);
 assert.deepEqual(resources,{ap:0,stamina:12,clock:480,undo:7});assert.equal(controller.state.selectedId,9);
});
test('host veto or error leaves selection intact; host callbacks cannot reenter',()=>{
 const controller=make({cancelPreview:()=>false,onFloorChange:()=>assert.fail('Veto was ignored')});
 assert.equal(controller.select(9),false);assert.equal(controller.state.selectedId,0);
 const throwing=make({onFloorChange:()=>{throw Error('Unavailable scene');}});assert.throws(()=>throwing.select(9),/Unavailable/);assert.equal(throwing.state.selectedId,0);
 const reentrant=make({onFloorChange:()=>reentrant.select(2)});assert.throws(()=>reentrant.select(1),/reenter/);assert.equal(reentrant.state.selectedId,0);
});
test('manual inspection stays put; follow uses confirmed support-floor reports',()=>{
 const controller=make();controller.setCharacter({id:'player',floorId:0,y:100});
 controller.followCharacter();controller.setCharacter({id:'player',floorId:9,y:0});
 assert.equal(controller.state.selectedId,9);assert.equal(controller.state.mode,FLOOR_MODES.character);
 controller.select(14);controller.setCharacter({id:'player',floorId:10});
 assert.equal(controller.state.selectedId,14);assert.equal(controller.state.mode,FLOOR_MODES.manual);
 controller.followCharacter();assert.equal(controller.state.selectedId,10);
 controller.setCharacter(null);assert.equal(controller.state.mode,FLOOR_MODES.manual);
});
test('contact inspection requires detection, loss stops tracking before reading hidden floor',()=>{
 const lost=[],controller=make({onTrackingLost:event=>lost.push(event)});
 controller.setCharacter({id:'player',floorId:8});controller.followCharacter();
 assert.equal(controller.inspectContact({id:'guard',floorId:14,detected:false}),false);
 controller.inspectContact({id:'guard',floorId:14,detected:true});assert.equal(controller.state.mode,FLOOR_MODES.contact);
 assert.equal(controller.updateContact({id:'other',floorId:30,detected:true}),false);
 controller.updateContact({id:'guard',detected:false,get floorId(){assert.fail('Hidden floor was read');}});
 assert.equal(controller.state.mode,FLOOR_MODES.character);assert.equal(controller.state.selectedId,8);
 assert.equal(controller.state.contact,null);assert.deepEqual(lost,[{id:'guard',lastKnownFloorId:14}]);
 assert.equal(controller.updateContact({id:'guard',floorId:30,detected:true}),false);assert.equal(controller.state.selectedId,8);
});
test('detection loss remains disarmed even if host rejects fallback floor',()=>{
 let veto=false;
 const controller=make({onFloorChange:()=>!veto});controller.setCharacter({id:'p',floorId:0});
 controller.inspectContact({id:'c',floorId:14,detected:true});veto=true;
 assert.equal(controller.updateContact({id:'c',detected:false}),false);
 assert.equal(controller.state.contact,null);assert.equal(controller.state.mode,FLOOR_MODES.manual);assert.equal(controller.state.selectedId,14);
});
test('Page keys respect repeat, edits, modal/menu focus, composing and modifiers',()=>{
 assert.equal(floorKeyStep({key:'PageUp'}),1);assert.equal(floorKeyStep({key:'PageDown'}),-1);
 for(const key of ['repeat','defaultPrevented','composing','modified','blocked'])assert.equal(floorKeyStep({key:'PageUp',[key]:true}),0);
 assert.equal(floorKeyStep({key:'ArrowUp'}),0);
 const free={activeElement:null,querySelectorAll:()=>[]};
 assert.equal(floorInputBlocked(free,{target:{closest:()=>null}}),false);
 assert.equal(floorInputBlocked(free,{target:{closest:()=>({})}}),true);
 assert.equal(floorInputBlocked({...free,activeElement:{isContentEditable:true}},{target:null}),true);
 assert.equal(floorInputBlocked({...free,querySelectorAll:()=>[{closest:()=>null}]},{target:null}),true);
});
test('wheel normalizes lines/pages and latches the whole gesture including inertia',()=>{
 const wheel=createFloorWheel();
 assert.equal(wheel.step({deltaY:-10,time:0}),0);assert.equal(wheel.step({deltaY:-30,time:5}),1);
 for(const time of [10,50,100,180,250])assert.equal(wheel.step({deltaY:-500,time}),0);
 assert.equal(wheel.step({deltaY:3,deltaMode:1,time:500}),-1);
 assert.equal(wheel.step({deltaY:-1,deltaMode:2,time:800}),1);
 assert.throws(()=>wheel.step({deltaY:1,time:700}),/monotonic/);
 wheel.reset();assert.equal(wheel.step({deltaY:45,time:0}),-1);
});
test('subscriptions and disposal release ownership',()=>{
 const controller=make();let calls=0;const stop=controller.subscribe(()=>calls++);
 controller.select(1);stop();controller.select(2);assert.equal(calls,2);controller.dispose();
 assert.throws(()=>controller.select(3),/disposed/);
});
