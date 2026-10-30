import {createFarmyardDoorReferenceHost,ACTIVE_KEY} from './farmyard-door-reference-host.js';
import {createDoorReferenceView} from './farmyard-door-reference-view.js';
import {mountPlayerControls} from './farmyard-door-reference-controls.js';
const $=id=>document.getElementById(id),events=new AbortController(),review=new URLSearchParams(location.search).has('review');
let host,view,controls,selected='reference-gate',displayed=null,pressed=null,targetEpoch=0,session=1,paused=false,retired=false,busy=false,writeFault=null,readFault=false,presentationFault=false,afterPreview=null,resize=null;
const metrics={attempts:0,knownCommits:0,quietLoads:0,cancelled:0,lateInputs:0},status=text=>{if(!retired)$('status').textContent=text;},listen=(target,type,callback,options={})=>target.addEventListener(type,callback,{...options,signal:events.signal});
const storage={getItem:key=>{if(readFault)throw Error('Injected unavailable active storage');return localStorage.getItem(key);},setItem:(key,value)=>localStorage.setItem(key,value)};
function retireTarget(){targetEpoch++;if(pressed)pressed.cancelled=true;displayed=null;controls?.stop();view?.clearInput();}
function select(id){if(retired)return;retireTarget();selected=id;sync();}
function capture(){if(!displayed||paused||retired||busy)return null;const info=host.diagnostics();if(info.pending||info.conflict||info.disposed)return null;const shown={...displayed},epoch=targetEpoch,subject=session,command=host.command(shown.doorId,shown.action);if(retired||epoch!==targetEpoch||subject!==session)return null;return {command:{...command,...shown},epoch,session:subject,cancelled:false};}
function sync(){
 if(retired||!host||!view)return;const value=host.snapshot(),actor=value.host.units.find(unit=>unit.team==='squad'),door=value.doorState.doors.find(door=>door.id===selected),info=host.diagnostics();let preview=null;
 displayed=door?{doorId:door.id,action:door.open?'close':'open',actorId:actor.id,expectedRevision:value.doorState.revision}:null;
 if(displayed&&!info.pending&&!info.conflict)try{preview=host.preview({version:1,id:'reference-preview',expectedRevision:value.doorState.revision,actorId:actor.id,...displayed});}catch(error){preview={ok:false,reason:error.message};}
 const available=!!preview?.ok&&!info.pending&&!info.conflict;
 controls.update({active:true,paused,busy:busy||info.pending||info.conflict,actionLabel:door?(door.open?'Close ':'Open ')+door.name+' · '+(preview?.cost??'—')+' AP':'Select a door',actionAvailable:available,actionReason:info.pending?'Reconcile the save outcome before another action.':info.conflict?'Validate and use the active record to continue.':!door?'Select a timber leaf or named door.':preview?.ok?'The displayed leaf is within clear reach.':preview?.reason??'Reference unavailable.',checkpointAvailable:false});
 $('resources').textContent=actor.hp+' HP · '+actor.ap.toFixed(2)+' AP · '+value.host.phase+' · '+value.host.detected.size+' contact'+(value.host.detected.size===1?'':'s');
 $('targets').replaceChildren(...value.doorState.doors.map(door=>{const button=document.createElement('button');button.type='button';button.textContent=door.name;button.setAttribute('aria-pressed',String(door.id===selected));button.onclick=()=>select(door.id);return button;}));
 $('reconcile').hidden=!info.pending;$('adopt-active').hidden=!info.conflict;$('retry').disabled=!info.lastCommand||info.pending||info.conflict||paused;$('save').disabled=$('load').disabled=info.pending||info.conflict||busy;
 view.sync(value,host.geometry(),selected);anchor();
 const probes=host.probes();$('probes').replaceChildren(...[['Movement lane',probes.movement],['Sight lane',probes.sight],['Projectile lane',probes.projectile],['Grenade arc',probes.grenade.ok],['Blast across doorway',probes.blastAcrossDoor]].map(([label,clear])=>{const li=document.createElement('li');li.textContent=label+': '+(clear?'clear':'blocked');return li;}));
}
function anchor(){if(retired)return;const point=selected?view.anchor(selected,$('world-root')):null;const visible=!!point?.visible;$('anchor').hidden=!visible;if(visible){$('anchor').style.left=point.x+'px';$('anchor').style.top=point.y+'px';$('anchor').textContent=host.snapshot().doorState.doors.find(door=>door.id===selected)?.name??'Door';}}
function showResult(result){if(result.committed){metrics.knownCommits++;status(result.presentationErrors?.length?'Door action recorded. View publication failed; current authority is retained.':(result.receipt?.command.action==='open'?'Opened':'Closed')+' the selected door.');}else if(result.repeated)status('The original command is already recorded. No costs or effects repeated.');else status(result.reason||result.code||'The reference action was refused.');}
function attempt(){
 const captured=pressed??capture();pressed=null;if(!captured||captured.cancelled||captured.epoch!==targetEpoch||captured.session!==session||paused||retired||busy){metrics.cancelled++;return;}
 busy=true;try{metrics.attempts++;const check=host.preview(captured.command);if(!check.ok){status(check.reason);return;}const callback=afterPreview;afterPreview=null;callback?.();if(retired||captured.epoch!==targetEpoch||captured.session!==session){metrics.cancelled++;return;}showResult(host.perform(captured.command));}catch(error){status(error.message);}finally{busy=false;if(!retired)sync();}
}
function run(callback,{replacement=false}={}){if(retired||busy)return;if(replacement){retireTarget();selected=null;session++;}try{const value=callback();if(value?.ok===false)status(value.reason||value.code);return value;}catch(error){status(error.message);}finally{sync();}}
async function start(){
 const response=await fetch('./farmyard-door-reference.fixture.json');if(!response.ok)throw Error('Reference fixture could not load.');const fixture=await response.json();if(retired)return;
 host=createFarmyardDoorReferenceHost({fixture,storage,write(key,value){if(writeFault==='before')throw Error('Injected before write');localStorage.setItem(key,value);if(writeFault==='after')throw Error('Injected after write');},present(){if(presentationFault)throw Error('Injected postcommit presentation failure');}});
 if(storage.getItem(ACTIVE_KEY)!==null)try{host.adoptActive();}catch(error){status('Active reference could not be restored: '+error.message);}
 view=createDoorReferenceView($('world'),{onPick:id=>select(id),onLayout:()=>{if(view)anchor();},onError:error=>status(error.message||'Source timber view could not load.')});
 controls=mountPlayerControls($('controls'),{inputTarget:view.canvas,onMove:vector=>{if(retired||paused||busy||(!vector.x&&!vector.y))return;run(()=>host.move(vector.x*.25,vector.y*.25));},onInteract:attempt,onPause:()=>{retireTarget();paused=!paused;sync();},onError:error=>status(error.message)});
 const action=controls.element.querySelector('[data-action=interact]');
 listen(action,'pointerdown',event=>{if(event.button===0&&!action.disabled)pressed={...capture(),pointer:event.pointerId};},{capture:true});
 listen(action,'keydown',event=>{if(['Enter',' '].includes(event.key)&&!event.repeat&&!action.disabled)pressed=capture();},{capture:true});
 listen(view.canvas,'keydown',event=>{if(event.key.toLowerCase()==='e'&&!event.repeat)pressed=capture();},{capture:true});
 listen(action,'focusout',()=>{if(pressed)pressed.cancelled=true;});
 listen(action,'pointerup',event=>{if(pressed?.pointer===event.pointerId)pressed.released=true;});
 listen(action,'pointercancel',()=>{if(pressed)pressed.cancelled=true;});listen(action,'lostpointercapture',()=>{if(pressed&&!pressed.released)pressed.cancelled=true;});
 listen(window,'pointermove',event=>{if(pressed&&!pressed.released&&pressed.pointer===event.pointerId&&(event.pointerType==='mouse'||event.pointerType==='pen')&&event.buttons===0)pressed.cancelled=true;},{capture:true});
 listen(window,'blur',()=>{retireTarget();sync();});listen(document,'visibilitychange',()=>{if(document.visibilityState==='hidden'){retireTarget();sync();}});
 listen($('anchor'),'click',()=>{if(selected)select(selected);});listen($('save'),'click',()=>run(()=>{host.save();status('Complete reference saved.');}));listen($('load'),'click',()=>run(()=>{host.load();metrics.quietLoads++;status('Complete reference restored quietly. Select a door to continue.');},{replacement:true}));listen($('retry'),'click',()=>run(()=>showResult(host.retry())));listen($('reconcile'),'click',()=>run(()=>{const result=host.reconcile();if(['load','adopt-active'].includes(result.kind)){retireTarget();selected=null;session++;}status('Save outcome '+result.outcome+'. No action effects replayed.');}));listen($('adopt-active'),'click',()=>run(()=>{host.adoptActive();status('Validated active reference adopted quietly. Select a door to continue.');},{replacement:true}));
 resize=new ResizeObserver(anchor);resize.observe($('world-root'));listen(window,'scroll',anchor,{capture:true});listen(window,'resize',anchor);
 window.farmyardDoorReference=Object.freeze({snapshot:()=>({value:host.snapshot(),selected,paused,session,metrics:{...metrics},diagnostics:host.diagnostics(),view:view.diagnostics(),probes:host.probes(),status:$('status').textContent}),select:id=>select(id),project:id=>view.project(id),dispose,
 ...(review?{faults(options={}){writeFault=options.write??null;readFault=!!options.read;presentationFault=!!options.presentation;},review(edit){if(retired)return;const value=host.review(edit);sync();return value;},previewHook(callback){afterPreview=callback;},perform:command=>run(()=>host.perform(command)),pause(){retireTarget();paused=!paused;sync();},repaint:sync,projection(options){view.reviewProjection(options);anchor();return view.anchor(selected,$('world-root'));},anchor:()=>view.anchor(selected,$('world-root')),replace(){retireTarget();selected=null;session++;sync();}}:{})});
 status('Select the timber gate, then Open. Arrow keys or direction buttons step .25 m.');sync();view.canvas.focus();document.body.dataset.ready='true';
}
function dispose(){if(retired)return;retired=true;targetEpoch++;session++;pressed=null;displayed=null;events.abort();resize?.disconnect();controls?.dispose();view?.dispose();host?.dispose();}
addEventListener('pagehide',dispose,{once:true});start().catch(error=>status(error.message));
