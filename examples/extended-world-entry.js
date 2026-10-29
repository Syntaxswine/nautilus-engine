// Build copies apps/editor modules to app/. The architect owns the main-editor
// launch link; this stable standalone entry has exactly one keyboard owner.
import {mountExtendedWorldEditor} from '../app/extended-world.js';
const root=document.getElementById('extended-world');
try {
  const fixtureURL=new URL('./native-fifteen-story.world.json',import.meta.url);
  const response=await fetch(fixtureURL);if(!response.ok)throw Error('The native world fixture could not load.');
  const fixture=await response.text();
  window.nautilusExtendedWorld=mountExtendedWorldEditor(root,{initialWorld:fixture,fixture,initialSelectedId:'floor:9'});
  window.addEventListener('pagehide',event=>{if(!event.persisted)window.nautilusExtendedWorld.dispose();});
}catch(error){root.replaceChildren();const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=error.message+' Build and serve Nautilus, then reopen this workshop.';root.append(message);}
