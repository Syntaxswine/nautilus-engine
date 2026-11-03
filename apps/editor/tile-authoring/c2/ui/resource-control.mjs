// Presentation only. Root owns resource work, byte/native residency, debt and
// cancellation. Resolved callback values never become readiness or editing credit.
const own=(object,key)=>Object.getOwnPropertyDescriptor(object??{},key)?.value;
const issue=(code,message)=>Object.assign(new TypeError(message),{code});
let mounts=0;
export function mountSelectedArtworkLoadControl(container,{binding,hub,resourceActions=null}){
 const doc=container?.ownerDocument;if(!doc||typeof container.append!=='function')throw issue('UI_RESOURCE_DOM_REQUIRED','Supply an artwork-control container.');
 const readOwner=own(binding,'resourceReadOwner'),captureRead=own(readOwner,'capture'),visitRead=own(readOwner,'visit');
 const loadSelected=own(resourceActions,'loadSelected'),getSnapshot=own(binding,'getSnapshot'),events=new doc.defaultView.AbortController();
 let disposed=false,retired=false,pending=false,displayed=null,message='';
 const element=doc.createElement('div');element.className='c2-resource-control';element.dataset.component='selected-artwork-loader';
 const button=doc.createElement('button');button.type='button';button.id='nautilus-load-selected-artwork-'+(++mounts);button.dataset.action='load-selected-artwork';button.textContent='Load selected artwork';
 const status=doc.createElement('p');status.className='c2-hint';status.dataset.resourceStatus='true';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
 const actions=doc.createElement('div');actions.className='c2-actions';actions.append(button);element.append(actions,status);container.append(element);
 function current(){if(disposed||retired)return false;if(own(resourceActions,'loadSelected')!==loadSelected||own(binding,'getSnapshot')!==getSnapshot||own(binding,'resourceReadOwner')!==readOwner||own(readOwner,'capture')!==captureRead||own(readOwner,'visit')!==visitRead){retired=true;return false;}if(!hub.isConnectionCurrent()){retired=true;return false;}return true;}
 function render(){
  if(disposed)return;
  const bound=typeof loadSelected==='function'&&typeof captureRead==='function'&&typeof visitRead==='function',valid=current(),selected=!!displayed?.overlay.chosenArtwork;
  button.disabled=!bound||!valid||!selected||pending||hub.pending;
  element.setAttribute('aria-busy',String(pending));
  status.textContent=!bound?'Artwork loading is unavailable in this host.':!valid?'Artwork loading connection unavailable.':pending?'Loading selected artwork…':message||(!selected?'Select an artwork revision to load.':'Load the selected artwork before painting.');
  button.title=button.disabled?status.textContent:'';
 }
 async function load(){
  const latched=displayed;
  if(disposed)return{status:'unavailable',code:'UI_RESOURCE_DISPOSED'};
  if(!current()){render();return{status:'unavailable',code:'UI_RESOURCE_RETIRED'};}
  if(typeof loadSelected!=='function'||typeof captureRead!=='function'||typeof visitRead!=='function')return{status:'unavailable',code:'UI_RESOURCE_UNBOUND'};
  if(!latched?.overlay.chosenArtwork)return{status:'unavailable',code:'UI_RESOURCE_SELECTION_REQUIRED'};
  if(pending||hub.diagnostics().resourceUIPending)return{status:'unavailable',code:'UI_RESOURCE_PENDING'};
  pending=true;message='';let end=null;
  try{
   const guard=hub.captureResourceDisplay(latched);
   end=hub.beginResourceUI();
   render();
   if(!current())throw issue('UI_RESOURCE_RETIRED','The artwork loading connection changed.');
   // Last source comparison occurs after pending/render/currentness callbacks.
   // The guard returns the actual issued read, never its parsed display copy.
   if(own(resourceActions,'loadSelected')!==loadSelected){retired=true;throw issue('UI_RESOURCE_RETIRED','The artwork loading port changed.');}
   const read=guard.read();
   // Pure descriptor/lifetime checks only; no callback after final source facts.
   if(disposed||retired||own(resourceActions,'loadSelected')!==loadSelected||own(binding,'getSnapshot')!==getSnapshot||own(binding,'resourceReadOwner')!==readOwner||own(readOwner,'capture')!==captureRead||own(readOwner,'visit')!==visitRead){retired=true;throw issue('UI_RESOURCE_RETIRED','The artwork loading port changed before dispatch.');}
   await loadSelected.call(resourceActions,read);
   if(disposed)return{status:'detached'};
   if(!current())throw issue('UI_RESOURCE_RETIRED','The artwork loading connection changed.');
   message='Load request finished. Artwork availability comes from the current editor state.';
   return{status:'refreshed'};
  }catch(error){if(!disposed)message='Artwork load refused: '+(error?.message??'The resource owner refused the request.');return{status:disposed?'detached':'refused',code:error?.code??'UI_RESOURCE_LOAD_FAILED'};}
  finally{
   // Refresh actual readiness even when this control detached while its borrowed
   // invocation was pending. Remaining panels keep the same Root controller.
   try{hub.refresh();}catch{}
   pending=false;try{end?.();}finally{render();}
  }
 }
 button.addEventListener('click',()=>{void load();},{signal:events.signal});
 const api=Object.freeze({element,get pending(){return pending;},load,refreshGates:render,observe(view){if(disposed)return;displayed=view;render();},dispose(){if(disposed)return;disposed=true;events.abort();element.remove();}});
 // The mount's initial shared refresh supplies the first complete display.
 return api;
}
