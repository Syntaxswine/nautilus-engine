import {createFloorNavigation} from '../../packages/floor-navigation/index.js';
import {mountFloorNavigation} from '../../packages/floor-navigation/dom.js';

// An explicit editor adapter. Its native select remains the authority for
// available legacy layers; this binding cannot advertise an extended world.
export function installEditorFloorNavigation({editor=window.editor3d,doc=document,mount=doc.querySelector('#editor-bottom .altitude'),native=doc.getElementById('floor'),getHeight,getLabel,cancelPreview}={}){
 if(!editor||!mount||!native)throw Error('Install floor navigation after the editor controls are ready.');
 if(mount.querySelector('.fn-editor'))throw Error('Floor navigation is already installed.');
 if(typeof getHeight!=='function'||typeof getLabel!=='function')throw new TypeError('Supply the legacy renderer height and display-label mappings explicitly.');
 const floors=[...native.options].filter(option=>!option.disabled).map(option=>({id:option.value,label:getLabel(option),elevationM:getHeight(option.value)}));
 const canvas=doc.querySelector('canvas'),status=doc.getElementById('status');
 const tell=text=>{if(status)status.textContent=text;};
 const stopPreview=cancelPreview||(()=>{
  // The inherited tool owns cancellation, including pending brush workers.
  canvas?.dispatchEvent(new Event('pointercancel'));
  // Exact roof previews have their own ticket; invalidate those as well.
  doc.getElementById('sloped-roof-options')?.dispatchEvent(new Event('input',{bubbles:true}));
  editor.scene.preview(null);
 });
 let dispatching=false;
 const cancel=()=>{
  if(editor.loading)return false;
  stopPreview();return true;
 };
 const controller=createFloorNavigation({floors,selectedId:native.value,cancelPreview:cancel,onFloorChange:({to,source})=>{
  if(source!=='editor-native'){
   dispatching=true;
   try{native.value=to.id;native.dispatchEvent(new Event('change',{bubbles:true}));}
   finally{dispatching=false;}
  }
  tell('Floor '+to.label+' · '+to.elevationM.toFixed(2)+' m. Uncommitted edit previews cancelled.');
 }});
 const old=[...mount.children].map(node=>({node,hidden:node.hidden}));
 for(const item of old)item.node.hidden=true;
 const view=mountFloorNavigation(mount,controller,{showModes:false,label:'Editing floor',onError:error=>tell(error.message)});view.element.classList.add('fn-editor');
 const style=doc.createElement('link');style.rel='stylesheet';style.href=new URL('../../packages/floor-navigation/style.css',import.meta.url).href;doc.head.append(style);
 // Native changes include Land height, numeric shortcuts and opening a map.
 // Capture cancels before the inherited scene's change handler runs.
 const capture=event=>{
  if(dispatching||native.value===controller.state.selectedId)return;
  if(editor.loading){native.value=controller.state.selectedId;event.stopImmediatePropagation();return;}
  stopPreview();
 };
 const reflect=()=>{
  if(dispatching||native.value===controller.state.selectedId)return;
  try{controller.select(native.value,{source:'editor-native'});}catch(error){tell(error.message);}
 };
 native.addEventListener('change',capture,true);native.addEventListener('change',reflect);
 return Object.freeze({controller,element:view.element,dispose(){
  native.removeEventListener('change',capture,true);native.removeEventListener('change',reflect);
  view.dispose();controller.dispose();style.remove();for(const item of old)item.node.hidden=item.hidden;
 }});
}
