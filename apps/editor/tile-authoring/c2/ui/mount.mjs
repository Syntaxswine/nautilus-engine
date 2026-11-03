// Concrete two-surface composition. The hub creates exactly one Root controller.
import {createSharedTileAuthoringController} from './hub.mjs';
import {mountTileAuthoringUI} from '../../ui/panel.js';
import {mountC2OverlayUI} from '../read-pairing/component.mjs';
import {mountSelectedArtworkLoadControl} from './resource-control.mjs';
export function mountSharedTileAuthoringUI({libraryContainer,overlayContainer,binding,isAdditionalConnectionCurrent,libraryOptions={},overlayOptions={},resourceActions=null}){
 const hub=createSharedTileAuthoringController(binding,{isAdditionalConnectionCurrent});let library=null,overlay=null,resources=null,closed=false;
 const resourceGates=()=>{if(hub.diagnostics().resourceUIPending)for(const panel of [library,overlay])for(const node of panel?.element.querySelectorAll('button,input,select,textarea')??[])node.disabled=true;};
 const attach=(candidate,options)=>{const {onView,onPending}=options;return hub.attach(candidate,{...options,onView(view){onView?.(view);resources?.observe(view);resourceGates();},onPending(pending){onPending?.(pending);resources?.refreshGates();resourceGates();}});};
 try{
  library=mountTileAuthoringUI(libraryContainer,binding,{...libraryOptions,attachCoordinator:attach});
  const mounted=mountC2OverlayUI(overlayContainer,binding,{...overlayOptions,attachCoordinator:attach});
  overlay=Object.freeze({...mounted,dispose(){resources?.dispose();return mounted.dispose();}});
  const palette=overlay.element.querySelector('select[name="artwork"]')?.closest('fieldset');
  if(!palette)throw new TypeError('The fixed overlay artwork fieldset is required.');
  resources=mountSelectedArtworkLoadControl(palette,{binding,hub,resourceActions});hub.refresh();
 }catch(e){for(const stop of [()=>resources?.dispose(),()=>overlay?.dispose(),()=>library?.dispose(),()=>hub.dispose()])try{stop();}catch{}throw e;}
 return Object.freeze({library,overlay,resources,hub,dispose(){if(closed)return;closed=true;const errors=[];for(const stop of [()=>resources.dispose(),()=>overlay.dispose(),()=>library.dispose(),()=>hub.dispose()])try{stop();}catch(e){errors.push(e);}return errors;}});
}
