// Farmyard UI adaptation: 251bf8094b5f9ebe44208443084c1a6d6658512a.
// Original source attribution and hashes: docs/ui/grenade-controls.sources.json.
// Optional DOM adapter. Aim math is supplied by the public source-exact aim entry.
// preview/confirm/context are host bindings; this module never mutates game state.
export function mountGrenadeControls(container,{
 aim,context,preview,confirm,onModeChange=()=>{},onPreview=()=>{},onAimEnd=()=>{},
 onAccepted=()=>{},onRetry=null,onError=()=>{},keyboardTarget=container
}={}){
 if(!container?.ownerDocument||!aim||['start','cancel','aim','nudge'].some(key=>typeof aim[key]!=='function')||[context,preview,confirm].some(fn=>typeof fn!=='function'))throw Error('Supply a container, source-exact aim instance and context/preview/confirm bindings.');
 const doc=container.ownerDocument,win=doc.defaultView,element=doc.createElement('section');element.className='nautilus-grenade-controls';element.setAttribute('aria-label','Grenade controls');
 const make=(tag,className,text)=>{const node=doc.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
 const trigger=make('button','gc-trigger','Aim grenade');trigger.type='button';
 const panel=make('section','gc-panel'),heading=make('div','gc-heading'),cancel=make('button','gc-cancel','Cancel ×');
 cancel.type='button';heading.append(make('strong','','GRENADE AIM'),cancel);
 const detail=make('output','gc-detail'),warning=make('p','gc-warning'),instructions=make('p','gc-hint','Release to hold aim, then press Throw. Enter throws; Escape cancels.'),key=make('p','gc-key','Fill: exposed explored ground · outline: maximum blast');
 detail.setAttribute('aria-live','polite');warning.setAttribute('role','status');panel.setAttribute('aria-label','Grenade aiming');panel.append(heading,detail,warning,instructions,key);
 const stick=make('div','gc-stick');stick.tabIndex=0;stick.setAttribute('role','group');stick.setAttribute('aria-label','Grenade aim thumbstick. Direction aims; full displacement reaches maximum range. Release to hold aim. Keyboard: W A S D or arrows.');
 const ring=make('div','gc-ring'),knob=make('div','gc-knob');stick.append(ring,knob);
 const status=make('p','gc-status'),retry=make('button','gc-retry','Retry');status.setAttribute('role','status');status.setAttribute('aria-live','polite');retry.type='button';retry.hidden=true;element.append(panel,stick,trigger,status,retry);container.append(element);
 const removers=[],keys=new Set();let pointer=null,triggerPointer=null,busy=false,disposed=false,focused=true,pressed=false,closing=false,preparing=false,fault=null,pending=null,retryAbort=null,lastIdentity=null,lastPreview=null;
 const identityOf=value=>[value.actorId,value.controlEpoch,value.sessionKey];
 const changedSubject=value=>lastIdentity&&identityOf(value).some((part,index)=>part!==lastIdentity[index]);
 const point=()=>aim.point?{x:aim.point.x,y:aim.point.y}:null;
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);removers.push(()=>target.removeEventListener(type,fn,options));};
 const report=(cause,phase)=>{const error=cause instanceof Error?cause:Error(String(cause));try{onError(error,{phase});}catch{}return error;};
 const setFault=(cause,phase)=>{if(fault&&['confirm','committed-context','playback'].includes(fault.phase)&&phase!==fault.phase)return;const error=cause instanceof Error?cause:Error(String(cause));if(fault?.phase!==phase||fault.message!==error.message)report(error,phase);if(fault?.phase!=='confirm'||phase==='confirm')fault={phase,message:error.message};};
 function read(){
  const value=context();
  if(!value||!value.origin||![value.origin.x,value.origin.y,value.range,value.cost].every(Number.isFinite)||value.range<=0||value.cost<0||!Number.isInteger(value.stock)||value.stock<0)throw Error('Connect a valid grenade context: origin, range, stock and cost.');
  return value;
 }
 function resetStick(){
  const old=pointer;pointer=null;
  if(old!==null&&stick.hasPointerCapture(old))stick.releasePointerCapture(old);
  knob.style.transform='translate(-50%,-50%)';
 }
 function resetInput(){keys.clear();triggerPointer=null;pressed=false;resetStick();}
 const editable=node=>node?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable=false])');
 const modalOpen=()=>[...doc.querySelectorAll('dialog[open],[role=dialog][aria-modal=true]')].some(node=>!node.closest('[hidden],[inert]'));
 function inputBlocked(){const active=doc.activeElement;return !!(editable(active)||modalOpen()||(typeof keyboardTarget.contains==='function'&&!keyboardTarget.contains(active)));}
 function blocked(event){return event.defaultPrevented||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||editable(event.target)||modalOpen();}
 function endAim({linger=0,force=false,keepLinger=()=>true}={}){
  if((busy&&!force)||!aim.active)return false;
  resetInput();aim.cancel();lastPreview=null;closing=true;
  try{
   try{onModeChange(false);}catch(error){if(!disposed)setFault(error,'presentation');}
   if(!disposed)try{onAimEnd({linger:keepLinger()?linger:0});}catch(error){if(!disposed)setFault(error,'presentation');}
  }finally{closing=false;}
  render();return true;
 }
 function evaluate(value,notify){
  lastPreview=null;
  if(!aim.active||!aim.point)return;
  lastPreview=preview(point());
  if(!lastPreview||typeof lastPreview.ok!=='boolean')throw Error('Preview must return the grenade API result.');
  if(notify)onPreview({point:point(),preview:lastPreview});
 }
 function render(){
  if(disposed)return;
  let value;
  try{value=read();}catch(error){setFault(error,'context');value={origin:{x:0,y:0},range:0,cost:0,stock:0,canControl:false,canAim:false,reason:error.message};}
  const adjusting=pointer!==null||keys.size>0,ready=!!(aim.active&&aim.point&&lastPreview?.ok&&!adjusting&&!pressed&&!busy&&!fault&&value.canControl&&!value.paused&&!value.loading&&!doc.hidden&&focused&&!inputBlocked());
  panel.hidden=stick.hidden=!aim.active;trigger.textContent=aim.active?'Throw':'Aim grenade';trigger.dataset.action=aim.active?'confirm':'aim';trigger.dataset.ready=String(ready);
  trigger.disabled=!!(busy||fault||!value.canControl||value.loading||value.paused);
  trigger.setAttribute('aria-pressed',String(!!aim.active));trigger.setAttribute('aria-label',(aim.active?'Throw grenade':'Aim grenade')+'. '+value.stock+' grenades remaining. '+value.cost+' AP.');
  cancel.disabled=busy;stick.setAttribute('aria-disabled',String(busy||!value.canControl||!!value.loading||!!value.paused));
  detail.textContent=aim.point&&lastPreview?(Number.isFinite(lastPreview.distance)?lastPreview.distance.toFixed(1):'—')+' / '+value.range+' m · '+(Number.isFinite(lastPreview.blast)?lastPreview.blast:'—')+' m blast · '+value.cost+' AP · '+value.stock+' left':'Move the joystick to aim · '+value.cost+' AP · '+value.stock+' left';
  const reason=lastPreview?.reason||value.reason||'',danger=lastPreview?.selfDanger?'Your animal is exposed to the blast.':'';
  warning.textContent=[reason,danger].filter(Boolean).join('. ');warning.hidden=!warning.textContent;
  const readiness=inputBlocked()?'Return focus to the grenade controls':adjusting?'Release the aim controls, then confirm':!aim.point&&aim.active?'Choose a landing point with the joystick':reason;
  trigger.title=ready?'Ready to throw':readiness||'Aim grenade';
  trigger.setAttribute('aria-description',ready?'Ready to throw. Yellow light pulses.':readiness);
  status.textContent=busy?'Confirming throw…':fault?fault.message:aim.active?'Aim is held when the controls return to neutral.':value.reason||'Aim a grenade without changing your equipped weapon.';
  retry.hidden=!fault||typeof onRetry!=='function';retry.disabled=busy;
 }
 function refresh({notify=true}={}){
  if(disposed)return;let value;
  try{value=read();if(fault?.phase==='context')fault=null;}catch(error){setFault(error,'context');render();return;}
  const identity=identityOf(value);
  if(!busy&&lastIdentity&&(changedSubject(value)||!value.canControl)){if(aim.active)endAim({force:true});}
  lastIdentity=identity;
  if(value.paused||value.loading||doc.hidden||!focused||inputBlocked())resetInput();
  try{evaluate(value,notify);}catch(error){setFault(error,'preview');}
  render();
 }
 function arm(){
  if(disposed||closing||preparing||busy||fault||aim.active)return false;
  try{const value=read();lastIdentity=identityOf(value);if(!value.canControl||!value.canAim||value.loading||value.paused||doc.hidden||!focused||modalOpen()){render();return false;}
   resetInput();aim.start();onModeChange(true);if(disposed)return false;refresh();if(!aim.active||disposed)return false;stick.focus({preventScroll:true});return true;
  }catch(error){endAim({force:true});setFault(error,'arm');render();return false;}
 }
 async function commit(){
  if(disposed||closing||preparing||busy||fault||!aim.active||!aim.point||pointer!==null||keys.size||pressed)return false;
  const landing=point();let subject;preparing=true;
  try{
   const value=read();if(changedSubject(value)){endAim({force:true});return false;}subject={actorId:value.actorId,sessionKey:value.sessionKey,controlEpoch:value.controlEpoch};if(!value.canControl||value.paused||value.loading||doc.hidden||!focused||inputBlocked()){resetInput();render();return false;}
   evaluate(value,true);if(disposed)return false;const current=read();if(current.actorId!==subject.actorId||current.sessionKey!==subject.sessionKey||current.controlEpoch!==subject.controlEpoch){endAim({force:true});return false;}if(!current.canControl||current.paused||current.loading||doc.hidden||!focused||inputBlocked()){resetInput();render();return false;}if(fault||!aim.active||!lastPreview?.ok){render();return false;}
  }catch(error){if(!disposed){setFault(error,'preview');render();}return false;}finally{preparing=false;}
  busy=true;resetInput();render();
  const task=(async()=>{
   let result;
   try{
    // Host must stage, atomically persist/adopt and deduplicate before ok:true.
    result=await confirm(landing);
    if(disposed)return result?.ok===true;
    if(!result||typeof result.ok!=='boolean')throw Error('Confirmation must return a known committed or refused result.');
   }catch(error){if(!disposed){busy=false;setFault(error,'confirm');render();}return false;}
   if(!result.ok){lastPreview={...lastPreview,ok:false,reason:result.reason||'Throw was refused.'};busy=false;render();return false;}
   // A known commit remains successful even if host cleanup replaces/disposes UI.
   busy=false;
   const remainsCurrent=()=>{
    if(disposed)return false;
    try{const current=read();return current.actorId===subject.actorId&&current.sessionKey===subject.sessionKey;}
    catch(error){setFault(Error('Throw committed; controls could not refresh. '+error.message),'committed-context');return false;}
   };
   endAim({linger:800,keepLinger:remainsCurrent});
   if(remainsCurrent())try{await onAccepted(result);}catch(error){if(!disposed)setFault(Error('Throw committed; playback is unavailable. '+error.message),'playback');}
   if(!disposed)render();return true;
  })();
  pending=task;try{return await task;}finally{if(pending===task)pending=null;}
 }
 function aimPointer(event){
  const value=read();if(changedSubject(value)||!value.canControl){endAim({force:true});return;}if(value.loading||value.paused||doc.hidden||!focused||inputBlocked()){resetInput();render();return;}const rect=stick.getBoundingClientRect(),limit=rect.width*.3,dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2,n=Math.hypot(dx,dy),scale=Math.min(1,limit/Math.max(1,n));
  const offset=n<limit*.12?{x:0,y:0}:{x:dx*scale/limit,y:dy*scale/limit};
  knob.style.transform='translate(calc(-50% + '+offset.x*limit+'px),calc(-50% + '+offset.y*limit+'px))';
  aim.aim(value.origin,offset,value.range);refresh();
 }
 listen(stick,'pointerdown',event=>{if(event.button!==0||pointer!==null||!aim.active||busy||fault||modalOpen())return;stick.focus({preventScroll:true});try{const value=read();if(!value.canControl||value.loading||value.paused)return;event.preventDefault();pointer=event.pointerId;stick.setPointerCapture(pointer);aimPointer(event);}catch(error){setFault(error,'aim');render();}});
 listen(stick,'pointermove',event=>{if(event.pointerId===pointer)try{aimPointer(event);}catch(error){setFault(error,'aim');render();}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(stick,type,event=>{if(event.pointerId===pointer){resetStick();render();}});
 listen(trigger,'pointerdown',event=>{if(event.button!==0)return;triggerPointer=event.pointerId;pressed=true;render();});
 for(const type of ['pointerup','pointercancel'])listen(win,type,event=>{if(event.pointerId===triggerPointer){triggerPointer=null;pressed=false;render();}},true);
 listen(trigger,'lostpointercapture',()=>{triggerPointer=null;pressed=false;render();});
 listen(trigger,'click',()=>{trigger.focus({preventScroll:true});if(aim.active)void commit();else arm();});listen(cancel,'click',()=>endAim());
 const movementKeys=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright']);
 listen(keyboardTarget,'keydown',event=>{
  if(disposed||blocked(event))return;const key=event.key.toLowerCase(),button=event.target.closest?.('button');
  if(key==='g'){event.preventDefault();if(!event.repeat)arm();return;}
  if(!aim.active||busy||fault)return;
  if(key==='enter'&&!button){event.preventDefault();if(!event.repeat)void commit();return;}
  if(key==='escape'){event.preventDefault();endAim();return;}
  if(movementKeys.has(key)){event.preventDefault();keys.add(key);render();}
 });
 listen(doc,'focusin',()=>{if(inputBlocked())resetInput();render();});
 listen(win,'keyup',event=>{keys.delete(event.key.toLowerCase());render();});
 listen(win,'blur',()=>{focused=false;resetInput();render();});listen(win,'focus',()=>{focused=true;refresh();});listen(doc,'visibilitychange',()=>{resetInput();render();});
 listen(retry,'click',()=>{if(busy||!fault||typeof onRetry!=='function')return;const phase=fault.phase;busy=true;render();retryAbort?.abort();retryAbort=new AbortController();
  const task=Promise.resolve().then(()=>onRetry({phase,signal:retryAbort.signal})).then(result=>{if(disposed)return;if(result?.ok!==true)throw Error(result?.reason||'Retry must confirm that resources and the current commit outcome are reconciled.');fault=null;busy=false;if(phase==='confirm')endAim({force:true});refresh();}).catch(error=>{if(!disposed){busy=false;setFault(error,phase);render();}}).finally(()=>{if(!disposed){busy=false;render();}if(pending===task)pending=null;});pending=task;
 });
 render();
 return Object.freeze({
  element,panel,stick,trigger,refresh,arm,cancel:()=>endAim(),confirm:commit,
  advanceAim(seconds){if(disposed||!aim.active||busy||fault||!keys.size)return;try{const value=read();if(changedSubject(value)){endAim({force:true});return;}if(value.paused||value.loading||!value.canControl||doc.hidden||!focused||inputBlocked()){resetInput();render();return;}const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);aim.nudge(value.origin,{x,y},value.range,Math.min(.05,Math.max(0,Number.isFinite(seconds)?seconds:0)));refresh();}catch(error){setFault(error,'aim');render();}},
  get state(){return {active:!!aim.active,point:point(),adjusting:pointer!==null||keys.size>0,busy,ready:trigger.dataset.ready==='true',fault:fault?{...fault}:null};},
  settled(){return pending||Promise.resolve();},
  dispose(){if(disposed)return;disposed=true;retryAbort?.abort();resetInput();aim.cancel();for(const callback of [()=>onModeChange(false),()=>onAimEnd({linger:0})])try{callback();}catch(error){report(error,'dispose');}removers.forEach(remove=>remove());element.remove();}
 });
}