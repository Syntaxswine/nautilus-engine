import {floorInputBlocked} from '../floor-navigation/dom.js';
// Only user input emits movement. No frame, timer, world state or renderer is owned.
export function mountPlayerControls(container,{inputTarget,onMove=()=>{},onInteract=()=>{},onPause=()=>{},onCheckpoint=()=>{},onTitle=()=>{},onError=()=>{}}={}){
  const doc=container.ownerDocument,win=doc.defaultView;if(!inputTarget)throw Error('Supply the owned player input surface.');
  const element=doc.createElement('section');element.className='nautilus-player-controls';element.setAttribute('aria-label','Player controls');
  const movement=doc.createElement('div');movement.className='npc-movement';movement.setAttribute('role','group');movement.setAttribute('aria-label','Walk');
  const actions=doc.createElement('div');actions.className='npc-actions';const removers=[],keys=new Map(),pointers=new Map();let enabled=false,inputActive=false,disposed=false,last={x:0,y:0};
  const button=(label,name)=>{const node=doc.createElement('button');node.type='button';node.textContent=label;node.dataset.action=name;return node;};
  const interact=button('Interact','interact'),pause=button('Pause','pause'),checkpoint=button('Save','checkpoint'),title=button('Main menu','title');
  const reason=doc.createElement('p');reason.className='npc-reason';reason.setAttribute('role','status');reason.setAttribute('aria-live','polite');
  const help=doc.createElement('p');help.className='npc-help';help.textContent='WASD / arrows · E interact · P pause';actions.append(interact,pause,checkpoint,title);element.append(movement,actions,reason,help);container.append(element);
  const listen=(target,event,handler,options)=>{target.addEventListener(event,handler,options);removers.push(()=>target.removeEventListener(event,handler,options));};
  const safe=callback=>{try{const result=callback();if(result?.catch)result.catch(onError);}catch(error){onError(error);}};
  const emit=()=>{let x=0,y=0;for(const vector of [...keys.values(),...pointers.values()]){x+=vector.x;y+=vector.y;}const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}if(!enabled){x=0;y=0;}if(x!==last.x||y!==last.y){last={x,y};safe(()=>onMove({...last}));}};
  const stop=()=>{keys.clear();pointers.clear();emit();};
  for(const [label,name,vector]of [['↑','Walk north',{x:0,y:-1}],['←','Walk west',{x:-1,y:0}],['↓','Walk south',{x:0,y:1}],['→','Walk east',{x:1,y:0}]]){
    const node=button(label,name);node.setAttribute('aria-label',name);node.dataset.move=name;movement.append(node);
    listen(node,'pointerdown',event=>{if(!enabled||event.button!==0||floorInputBlocked(doc,event))return;event.preventDefault();inputTarget.focus({preventScroll:true});pointers.set(event.pointerId,vector);node.setPointerCapture(event.pointerId);emit();});
    const release=event=>{pointers.delete(event.pointerId);emit();};listen(node,'pointerup',release);listen(node,'pointercancel',release);listen(node,'lostpointercapture',release);
  }
  const direction={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},w:{x:0,y:-1},a:{x:-1,y:0},s:{x:0,y:1},d:{x:1,y:0}};
  listen(inputTarget,'keydown',event=>{
    if(!inputActive||event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||floorInputBlocked(doc,event))return;
    const key=event.key.length===1?event.key.toLowerCase():event.key,vector=direction[key];
    if(vector){if(!enabled)return;event.preventDefault();keys.set(event.code||key,vector);emit();}
    else if(!event.repeat&&key==='e'&&!interact.disabled){event.preventDefault();safe(onInteract);}
    else if(!event.repeat&&key==='p'&&!pause.disabled){event.preventDefault();safe(onPause);}
  });
  listen(win,'keyup',event=>{keys.delete(event.code||(event.key.length===1?event.key.toLowerCase():event.key));emit();});
  listen(inputTarget,'focusout',event=>{if(!inputTarget.contains(event.relatedTarget))stop();});listen(win,'blur',stop);listen(doc,'visibilitychange',()=>{if(doc.visibilityState==='hidden')stop();});
  for(const [node,callback]of [[interact,onInteract],[pause,onPause],[checkpoint,onCheckpoint],[title,onTitle]])listen(node,'click',()=>{if(!node.disabled&&!disposed){stop();safe(callback);}});
  function update({active=false,actionLabel='Interact',actionAvailable=false,actionReason='Connect a prepared player scene.',checkpointAvailable=false,paused=false,busy=false}={}){
    if(disposed)return;inputActive=!!active&&!busy;enabled=inputActive&&!paused;if(!enabled)stop();
    for(const node of movement.children)node.disabled=!enabled;
    interact.textContent=actionLabel;interact.disabled=!enabled||!actionAvailable;checkpoint.disabled=!active||busy||!checkpointAvailable;pause.disabled=!active||busy;title.disabled=busy;
    pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));reason.textContent=actionReason;
  }
  update();
  return Object.freeze({element,update,stop,dispose(){if(disposed)return;stop();disposed=true;removers.forEach(remove=>remove());element.remove();}});
}