import {mountTitleScreen} from '../packages/game-ui/title.js';
import {mountReadiness} from '../packages/functional-scene-ui/readiness-dom.js';
import {readinessViewModel} from '../packages/functional-scene-ui/readiness.js';
import {mountPlayerControls} from '../packages/functional-scene-ui/controls.js';
import {mountPlayerFloors} from '../packages/functional-scene-ui/floors.js';
import {createPlayerSessionController} from '../packages/functional-scene-ui/session-controller.js';
const $=id=>document.getElementById(id),logs=[],owned=new Map(),borrowed={disposed:0};let serial=0,retired=0,userPaused=false,titleHandle=null,currentFloor=0,holdRequested=false,releasePreparation=null;
const basePart={instanceId:'sample-assembly',partId:'sample-door',label:'Door record · UI sample',classification:'functional'};
const reports={
 functional:{parts:[basePart,{instanceId:'sample-assembly',partId:'sample-trim',label:'Trim · UI sample',classification:'decorative'}]},
 incomplete:{parts:[{...basePart,classification:'incomplete',diagnostics:[{code:'LANDING_UNCONNECTED',path:'/instances/0/connections/upper',reason:'The upper stair landing is not connected.',remedy:'Select the stair and connect its upper support.'}]}]},
 unsupported:{parts:[{...basePart,classification:'unsupported',diagnostics:[{code:'GEOMETRY_PROFILE_UNSUPPORTED',path:'/instances/0/profile',reason:'This sample requests curved geometry.',remedy:'Select a supported profile or bind a reviewed curved-world provider.'}]}]},
 decorative:{parts:[{...basePart,label:'Door decoration · UI sample',classification:'decorative'}]}
};
function log(value){logs.push(value);while(logs.length>40)logs.shift();const li=document.createElement('li');li.textContent=JSON.stringify(value);$('intents').prepend(li);while($('intents').children.length>20)$('intents').lastChild.remove();}
const readiness=mountReadiness($('readiness'),{onSelect:source=>{$('selected').textContent='Selected '+JSON.stringify(source);log({selection:source});}});
readiness.update(reports.functional);$('preset').addEventListener('change',()=>readiness.update(reports[$('preset').value]));
const floors=Array.from({length:7},(_,index)=>({id:'fixture-floor-'+index,label:String(index+1),elevationM:index*2.12}));
const floorView=mountPlayerFloors($('floors'),{floors,initialFloorId:floors[0].id,onVisibility:value=>log({visibilityOnly:value}),onError:error=>log({floorError:error.message})});
floorView.updateActor({id:'fixture-subject',confirmedFloorId:floors[0].id});
function wait(signal,hold){
 return new Promise((resolve,reject)=>{let timer;const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);if(releasePreparation===finish)releasePreparation=null;resolve();};const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);if(releasePreparation===finish)releasePreparation=null;reject(new DOMException('Preparation cancelled','AbortError'));};if(hold)releasePreparation=finish;else timer=setTimeout(finish,350);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
}
const flow=createPlayerSessionController({prepare:async({request,signal,progress})=>{
 progress({label:'Checking UI fixture connections',current:1,total:2});await wait(signal,request.hold);
 if(!request.report.canPlay)throw Error(request.report.summary);
 if(request.fail)throw Error('The fixture provider failed. Retry preserves the accepted handle.');
 const id='interface-handle-'+(++serial),root=document.createElement('div');root.dataset.ownedHandle=id;root.textContent=id+' · owned interface resources only';
 const handle={id,root,gated:true,activate(){if(signal.aborted)throw new DOMException('Cancelled','AbortError');$('owned-scenes').append(root);},setGated(value){this.gated=value;root.dataset.gated=String(value);},dispose(){root.remove();owned.delete(id);retired++;}};
 owned.set(id,handle);progress({label:'Prepared interface handle',current:2,total:2});return handle;
},onError:value=>log({lifecycleError:value.code})});
const controls=mountPlayerControls($('player-controls'),{
 inputTarget:$('input-surface'),
 onMove:vector=>{$('input-state').textContent='Movement input · '+vector.x.toFixed(3)+', '+vector.y.toFixed(3);log({move:vector});},
 onInteract:()=>log({interactRequested:true,authoritativeEffects:0}),
 onPause:()=>{userPaused=!userPaused;render(flow.state);log({userPaused});},
 onCheckpoint:()=>log({unexpectedCheckpointRequest:true}),
 onTitle:()=>{flow.returnToTitle();void titleHandle.show();},
 onError:error=>log({controlError:error.message})
});
function render(state){
 const active=state.hasSession&&state.view==='play';$('player').hidden=!active;
 $('load-state').hidden=!state.busy;$('release-load').hidden=!state.busy||!holdRequested;$('hold-prepare').disabled=state.busy;$('load-label').textContent=state.progress?.label||'Preparing scene';const bar=$('load-progress');
 if(state.progress?.total){bar.max=state.progress.total;bar.value=state.progress.current||0;}else bar.removeAttribute('value');
 $('error').hidden=!state.error;$('error').textContent=state.error?'Last preparation: '+state.error.reason+' '+state.error.remedy:'';
 $('retry').hidden=!state.error;$('reprepare').disabled=state.busy;$('between').disabled=$('arrive').disabled=!active||state.busy;
 controls.update({active,paused:userPaused,busy:state.busy,actionLabel:'Inspect input',actionAvailable:true,actionReason:'Interface fixture only; world interaction and checkpoint providers are not bound.',checkpointAvailable:false});
 $('session-state').textContent='Accepted: '+(flow.current?.id||'none')+' · gate: '+String(flow.current?.gated??true)+' · owned handles: '+owned.size+' · retired: '+retired+' · borrowed disposals: '+borrowed.disposed;
}
const unsubscribe=flow.subscribe(render);
async function loadFixture({signal,enterAfter=false}={}){
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 const abort=()=>flow.returnToTitle();signal?.addEventListener('abort',abort,{once:true});
 holdRequested=$('hold-prepare').checked;const request={report:readiness.model,fail:$('fail-prepare').checked,hold:holdRequested};$('fail-prepare').checked=false;
 try{const result=await flow.load(request);if(!result.ok)throw Error(result.reason);if(enterAfter)titleHandle.hide();return result;}
 finally{signal?.removeEventListener('abort',abort);}
}
titleHandle=mountTitleScreen($('title-mount'),{
 title:'A world,\nready to enter.',eyebrow:'FUNCTIONAL SCENE / UI PREPARATION',tagline:'One shared player surface. Every part connected through its host.',
 edition:'INTERFACE FIXTURE · NATIVE PLAY PROOF PENDING',
 art:{src:'./threshold-art.svg',alt:'A warm doorway above stone steps.',caption:'Frozen PR12 title component'},
 credits:['Nautilus UI preparation.','This fixture does not load a world compiler, physics, native character or durable game save.'],
 newGameWarning:'Replace the currently accepted interface fixture?',
 checkSave:async()=>({available:!!flow.current,summary:flow.current?'Accepted interface fixture · memory only':''}),
 onStart:({signal})=>loadFixture({signal}),
 onContinue:async()=>{if(!flow.resume())throw Error('No accepted interface fixture.');},
 onVisibilityChange:visible=>{if(visible)flow.returnToTitle();},
 focusGame:()=>$('input-surface').focus()
});
$('reprepare').addEventListener('click',()=>void loadFixture({enterAfter:true}).catch(()=>{}));
$('retry').addEventListener('click',()=>void loadFixture({enterAfter:true}).catch(()=>{}));
$('release-load').addEventListener('click',()=>releasePreparation?.());
$('cancel-load').addEventListener('click',()=>{flow.returnToTitle();void titleHandle.show();});
$('between').addEventListener('click',()=>floorView.updateActor({id:'fixture-subject',confirmedFloorId:floors[currentFloor].id,transition:{fromFloorId:floors[currentFloor].id,toFloorId:floors[Math.min(currentFloor+1,floors.length-1)].id}}));
$('arrive').addEventListener('click',()=>{currentFloor=Math.min(currentFloor+1,floors.length-1);floorView.updateActor({id:'fixture-subject',confirmedFloorId:floors[currentFloor].id});});
window.functionalUIPreparation=Object.freeze({snapshot:()=>({flow:flow.state,acceptedId:flow.current?.id||null,owned:owned.size,retired,borrowedDisposals:borrowed.disposed,floor:structuredClone(floorView.controller.state),logs:structuredClone(logs)}),dispose:async()=>{titleHandle.dispose();controls.dispose();readiness.dispose();floorView.dispose();unsubscribe();await flow.dispose();await flow.settled();}});
addEventListener('pagehide',()=>{void window.functionalUIPreparation.dispose();},{once:true});