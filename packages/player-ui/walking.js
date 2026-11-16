export function mountWalkingControl(container,options) {return mountVectorControl(container,options);}
export function mountVectorControl(container,{inScope,kind='walking',onRelease=()=>{}}) {
  const doc=container.ownerDocument,win=doc.defaultView,events=new win.AbortController(),keys=new Set();let enabled=false,pointer=null,vector={x:0,y:0},retired=false;
  const car=kind==='vehicle',element=doc.createElement('div');element.className='pui-walking'+(car?' pui-vehicle':'');element.tabIndex=0;element.setAttribute('role','group');element.setAttribute('aria-label',car?'Car controls':'Walking controls');
  const stick=doc.createElement('div');stick.className='pui-stick';stick.setAttribute('role','application');stick.setAttribute('aria-label',car?'Car joystick; up forward, down reverse, left and right steer; WASD and arrow keys':'Walking joystick; drag to move, or use WASD and arrow keys');stick.tabIndex=0;
  const thumb=doc.createElement('span');thumb.className='pui-thumb';thumb.setAttribute('aria-hidden','true');stick.append(thumb);
  const caption=doc.createElement('p');caption.textContent=car?'Drive · WASD / arrows':'Walk · WASD / arrows';element.append(stick,caption);container.append(element);
  const on=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:events.signal});
  function release(){const old=pointer,held=!!pointer||keys.size>0;pointer=null;keys.clear();vector={x:0,y:0};thumb.style.transform='translate(0,0)';if(old)try{stick.releasePointerCapture(old.id);}catch{}if(held)onRelease();}
  function move(event){if(!enabled||!pointer||event.pointerId!==pointer.id)return;if(event.pointerType!=='touch'&&event.buttons===0){release();return;}const dx=(event.clientX-pointer.x)/pointer.radius,dy=(event.clientY-pointer.y)/pointer.radius,n=Math.max(1,Math.hypot(dx,dy));vector={x:dx/n,y:dy/n};thumb.style.transform=`translate(${vector.x*pointer.radius}px,${vector.y*pointer.radius}px)`;}
  on(stick,'pointerdown',event=>{if(!enabled||event.button!==0||pointer)return;event.preventDefault();stick.focus();const r=stick.getBoundingClientRect();pointer={id:event.pointerId,x:r.x+r.width/2,y:r.y+r.height/2,radius:r.width*.27};try{stick.setPointerCapture(event.pointerId);}catch{}move(event);});
  on(win,'pointermove',move);on(win,'pointerup',event=>{if(pointer?.id===event.pointerId)release();});on(win,'pointercancel',event=>{if(pointer?.id===event.pointerId)release();});on(stick,'lostpointercapture',event=>{if(pointer?.id===event.pointerId)release();});
  const mapping={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
  on(doc,'keydown',event=>{const key=event.key.toLowerCase();if(!enabled||!mapping[key]||event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.repeat&&!keys.has(key)||!inScope()||event.target.closest?.('input,textarea,select,[contenteditable=true]'))return;event.preventDefault();keys.add(key);});
  on(win,'keyup',event=>{const had=keys.delete(event.key.toLowerCase());if(had&&!keys.size&&!pointer)onRelease();});on(win,'blur',release);on(element,'focusout',event=>{if(!inScope(event.relatedTarget))release();});
  return Object.freeze({element,release,
    setEnabled(value){enabled=!!value&&!retired;if(!enabled)release();element.hidden=!enabled;element.inert=!enabled;},
    read(){if(!enabled)return {x:0,y:0};let x=vector.x,y=vector.y;for(const key of keys){x+=mapping[key][0];y+=mapping[key][1];}const n=Math.max(1,Math.hypot(x,y));return {x:x/n,y:y/n};},
    isHeld:()=>enabled&&(!!pointer||keys.size>0),
    focus(){if(enabled)stick.focus();},
    dispose(){if(retired)return;retired=true;enabled=false;release();events.abort();element.remove();}
  });
}
