// The isolated Editor session has one canvas gesture owner. Numeric controls
// and native buttons remain UI-owned; the real floor widget owns floor keys.
export function bindSmartTileInput({canvas,session,screenToWorld,hitOwner,readDraft,onGuide=()=>{},onCamera=()=>{},selectionMode=()=>false}){
  const doc=canvas.ownerDocument,win=doc.defaultView,events=new AbortController(),pointers=new Map(),blockedClicks=new Set();
  let gesture=null,sequenceOwner=null,consumed=false,disposed=false,enterHeld=false,releasing=false;
  const blockClick=id=>{blockedClicks.delete(id);blockedClicks.add(id);while(blockedClicks.size>32)blockedClicks.delete(blockedClicks.values().next().value);};
  const options={signal:events.signal,capture:true,passive:false};
  const eat=e=>{e.preventDefault();e.stopPropagation();};
  function release(ids){
    releasing=true;try{for(const id of ids)try{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch{}}finally{releasing=false;}
  }
  function allUp(){if(!pointers.size){sequenceOwner=null;consumed=false;}}
  function retire(reason,{releaseCapture=false,notifySession=true}={}){
    const owned=gesture;gesture=null;enterHeld=false;
    // Retire ownership before session observers, guides or capture callbacks.
    if(pointers.size&&sequenceOwner==='canvas'){consumed=true;for(const id of pointers.keys())blockClick(id);}
    // Escape/focus loss retires the edit, not the physical contacts. Their
    // releases may still arrive; a later non-primary finger cannot restart it.
    if(releaseCapture)release([...pointers.keys()]);
    if(notifySession&&(owned||reason!=='dispose'))session.cancel(reason);onGuide(null);
  }
  function down(e){
    if(disposed)return;const type=e.pointerType||'mouse';
    // A new primary pointerdown certifies a fresh sequence for its own pointer
    // type, including after releases missed while blurred/hidden. Other types
    // remain accounted for. Non-primary contacts never establish this fence.
    if(e.isPrimary===true){const stale=[...pointers].filter(([,p])=>p.type===type).map(([id])=>id);if(stale.length){if(sequenceOwner==='canvas')retire('fresh-primary');for(const id of stale)pointers.delete(id);release(stale);allUp();}}
    if(pointers.has(e.pointerId))return;if(!pointers.size)blockedClicks.delete(e.pointerId);
    const previous=pointers.size,contact={type,canvas:e.target===canvas};pointers.set(e.pointerId,contact);
    if(previous){
      if(sequenceOwner==='ui'){if(contact.canvas){blockClick(e.pointerId);eat(e);}return;}
      try{canvas.setPointerCapture(e.pointerId);}catch{}retire('second-pointer');eat(e);return;
    }
    if(!contact.canvas||e.button!==0&&e.button!==2){sequenceOwner='ui';return;}
    sequenceOwner='canvas';consumed=false;
    if(type==='touch'&&e.isPrimary!==true){consumed=true;blockClick(e.pointerId);eat(e);return;}
    canvas.focus({preventScroll:true});
    const snapshot=session.getSnapshot(),point=screenToWorld(e),owner=e.button===2||e.altKey?'camera':selectionMode()||snapshot.tool==='finish'?'select':'draw';
    if(!point||snapshot.floor.mode!=='manual'||owner==='draw'&&!snapshot.actions.setDraft||owner==='select'&&!snapshot.actions.selectOwner){consumed=true;blockClick(e.pointerId);eat(e);return;}
    gesture={pointerId:e.pointerId,owner,start:point,last:point,screen:[e.clientX,e.clientY],floorId:snapshot.floor.id,mode:snapshot.floor.mode,tool:snapshot.tool,base:owner==='draw'?readDraft():null};
    try{canvas.setPointerCapture(e.pointerId);}catch{retire('capture-unavailable');}
    eat(e);
  }
  function move(e){
    const contact=pointers.get(e.pointerId);if(!contact||sequenceOwner==='ui'&&!contact.canvas)return;eat(e);const g=gesture;if(consumed||!g||e.pointerId!==g.pointerId)return;
    if(g.owner==='camera'){const previous=g.screen;g.screen=[e.clientX,e.clientY];onCamera({dx:g.screen[0]-previous[0],dy:g.screen[1]-previous[1]});return;}
    const p=screenToWorld(e);if(!p)return;g.last=p;if(g.owner==='draw')onGuide({tool:g.tool,from:g.start,to:p,floorId:g.floorId});
  }
  function up(e){
    const contact=pointers.get(e.pointerId);if(!contact)return;pointers.delete(e.pointerId);
    if(sequenceOwner==='ui'){if(contact.canvas)eat(e);allUp();return;}
    eat(e);const g=gesture;
    if(consumed){release([e.pointerId]);allUp();return;}
    if(!g||g.pointerId!==e.pointerId)return;
    gesture=null;release([e.pointerId]);allUp();onGuide(null);
    const s=session.getSnapshot(),end=screenToWorld(e)||g.last;
    if(s.floor.id!==g.floorId||s.floor.mode!==g.mode||s.tool!==g.tool){session.cancel('gesture-context-changed');return;}
    if(g.owner==='camera')return;
    if(g.owner==='select'){const ownerId=hitOwner(e,end);if(ownerId)session.selectOwner(ownerId);return;}
    const origin=[Math.min(g.start[0],end[0]),Math.min(g.start[1],end[1])],round=n=>Math.round(n*1000)/1000;
    if(g.tool==='rectangle'){
      const widthM=round(Math.abs(g.start[0]-end[0])),depthM=round(Math.abs(g.start[1]-end[1]));if(widthM<.1||depthM<.1)return;
      session.setDraft({tool:'rectangle',ownerId:null,origin:origin.map(round),widthM,depthM,seed:g.base.seed});
    }else if(g.tool==='path'){
      const d=structuredClone(g.base);d.origin=g.start.map(round);d.ownerId=null;
      if(d.path.kind==='line'){const dx=round(end[0]-g.start[0]),dy=round(end[1]-g.start[1]);if(Math.hypot(dx,dy)<.1)return;d.path.a=[0,0,0];d.path.b=[dx,dy,0];}
      session.setDraft(d);
    }
    // Pointer-up produces a draft. Review and Apply are separate activations.
  }
  function cancelled(e){const contact=pointers.get(e.pointerId);if(!contact||releasing)return;if(sequenceOwner==='ui'){if(contact.canvas)eat(e);if(e.type==='pointercancel')pointers.delete(e.pointerId);allUp();return;}eat(e);blockClick(e.pointerId);if(e.type==='pointercancel')pointers.delete(e.pointerId);retire(e.type);allUp();}
  function keydown(e){
    if(e.target!==canvas||e.isComposing||e.defaultPrevented)return;
    if(e.key==='Escape'){eat(e);retire('escape',{releaseCapture:true});return;}
    if(e.key==='Enter'){
      eat(e);if(enterHeld||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return;enterHeld=true;
      const s=session.getSnapshot();if(s.actions.review)void session.review();return;
    }
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z'){
      eat(e);if(e.repeat)return;const s=session.getSnapshot();if(e.shiftKey&&s.actions.redo)void session.redo();else if(!e.shiftKey&&s.actions.undo)void session.undo();
    }
  }
  doc.addEventListener('pointerdown',down,options);doc.addEventListener('pointermove',move,options);doc.addEventListener('pointerup',up,options);doc.addEventListener('pointercancel',cancelled,options);
  doc.addEventListener('click',e=>{if(blockedClicks.has(e.pointerId)){blockedClicks.delete(e.pointerId);eat(e);}},{signal:events.signal,capture:true});
  canvas.addEventListener('lostpointercapture',cancelled,options);canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal:events.signal});
  canvas.addEventListener('keydown',keydown,{signal:events.signal});canvas.addEventListener('keyup',e=>{if(e.key==='Enter')enterHeld=false;},{signal:events.signal});
  win.addEventListener('blur',()=>retire('blur',{releaseCapture:true}),{signal:events.signal});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)retire('hidden',{releaseCapture:true});},{signal:events.signal});
  return Object.freeze({cancel:reason=>retire(reason),retire:reason=>retire(reason,{notifySession:false}),snapshot:()=>({owner:gesture?.owner??null,sequenceOwner,pointers:pointers.size,consumed,enterHeld}),dispose(){if(disposed)return;disposed=true;retire('dispose',{releaseCapture:true});events.abort();pointers.clear();allUp();blockedClicks.clear();}});
}
