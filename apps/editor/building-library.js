import {createBuildingPicker} from '../buildings/building-picker.js';
let cataloguePromise;
export const editorBuildingCatalogue=()=>cataloguePromise??=fetch(new URL('../assets/buildings/editor/index.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Editable building library could not load.');return r.json();});
export async function loadEditorBuilding(id,format='map'){
 if(!['map','block'].includes(format))throw Error('Choose an editable map or reusable block.');
 const catalogue=await editorBuildingCatalogue(),entry=catalogue.buildings.find(b=>b.id===id);
 if(!entry)throw Error('Choose a building from the editable library.');
 if(format==='block'&&!entry.blockAvailable)throw Error(entry.blockReason);
 const response=await fetch(new URL('../assets/buildings/editor/'+entry.id+'.'+format+'.json',import.meta.url));
 if(!response.ok)throw Error('The editable building file could not load.');
 return {map:await response.json(),entry};
}
export function installEditorBuildingLibrary(api){
 const button=document.getElementById('nautilus-buildings'),dialog=document.createElement('dialog');dialog.className='nautilus-building-dialog';
 dialog.innerHTML=`<button class="close-buildings" aria-label="Close building library">×</button><p class="eyebrow">EDITABLE BUILDINGS</p><h1>Start with a place.</h1><p>Choose one of 48 buildings assembled from the map editor’s floors, walls, openings, stairs and roof modules. Every piece remains editable.</p><div id="building-picker" class="building-picker"><label id="building-label" for="search">Find a building</label><div class="picker-field"><input id="search" type="text" role="combobox" autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="catalogue"><button id="picker-toggle" type="button" tabindex="-1" aria-label="Show building options" aria-controls="catalogue" aria-expanded="false">⌄</button></div><div id="picker-popup" class="picker-popup" hidden><div id="catalogue" role="listbox" aria-labelledby="building-label"></div><p id="picker-status" class="picker-status" role="status"></p></div></div><label>Action<select id="building-format"><option value="map">Editable map</option><option value="block">Edit reusable 24 × 24 block</option><option value="place">Place building in current map</option></select></label><div id="building-destination" hidden><label>Block column<input id="building-column" type="number" min="1" max="10" value="2"></label><label>Block row<input id="building-row" type="number" min="1" max="10" value="1"></label><p>Placement replaces that block on all floors. Undo restores it.</p></div><p id="building-library-status" role="status"></p><p class="building-library-note">The one-metre editor grid and its native material/roof palette adapt the more detailed art studies. Your edits save as ordinary game-editor JSON.</p>`;
 document.body.append(dialog);let picker,busy=false,currentId=new URLSearchParams(location.search).get('building');
 const status=text=>dialog.querySelector('#building-library-status').textContent=text;
 const openBuilding=async(id,{format='map',confirmReplace=true}={})=>{
  if(window.editor3d?.loading||busy)throw Error('Wait for the current design to finish loading.');
  if(confirmReplace&&(api.document?.changed||window.editor3d?.hasUnsaved)&&!confirm('Open this building in place of the current design? Save or export your edits first.'))return false;
  busy=true;try{const {map,entry}=await loadEditorBuilding(id,format);await api.open(map);Object.assign(window.editor3d.view,entry.view);if(window.editor3d.presentation!=='plan')window.editor3d.view.span+=Math.max(0,entry.occupiedFloors-1)*2;await window.editor3d.changed();api.document.changed=false;currentId=id;history.replaceState(null,'',location.pathname+'?building='+id+(format==='block'?'&buildingFormat=block':''));document.getElementById('status').textContent=entry.name+' · Editable '+format+' · every floor, wall, opening and roof module can be changed.';return entry;}finally{busy=false;}
 };
 api.openBuilding=openBuilding;
 const placeBuilding=async(id,sectorX,sectorY,{confirmReplace=true}={})=>{
  if(window.editor3d?.loading||busy)throw Error('Wait for the current design to finish loading.');
  const target=api.document;if(!target||target.block)throw Error('Open a full map before placing a building block.');
  if(![sectorX,sectorY].every(n=>Number.isInteger(n)&&n>=0&&n<10))throw Error('Choose a block column and row from 1 to 10.');
  if(confirmReplace&&!confirm('Replace block '+(sectorX+1)+', '+(sectorY+1)+' with this building on every floor? Undo restores the previous block.'))return false;
  busy=true;try{const {map:block,entry}=await loadEditorBuilding(id,'block');if(api.document!==target)throw Error('The active design changed; choose the destination again.');target.place(block,sectorX,sectorY);Object.assign(window.editor3d.view,entry.view,{x:entry.view.x+24*sectorX,y:entry.view.y+24*sectorY});if(window.editor3d.presentation!=='plan')window.editor3d.view.span+=Math.max(0,entry.occupiedFloors-1)*2;await window.editor3d.changed();document.getElementById('status').textContent=entry.name+' placed in block '+(sectorX+1)+', '+(sectorY+1)+'. Undo restores it.';return entry;}finally{busy=false;}
 };
 api.placeBuilding=placeBuilding;
 button.onclick=async()=>{try{if(!picker){const catalogue=await editorBuildingCatalogue();picker=createBuildingPicker({root:dialog.querySelector('#building-picker'),items:catalogue.buildings,onSelect:async id=>{try{status('Opening editable building…');const action=dialog.querySelector('#building-format').value;const result=action==='place'?await placeBuilding(id,Number(dialog.querySelector('#building-column').value)-1,Number(dialog.querySelector('#building-row').value)-1):await openBuilding(id,{format:action});if(result){status('');dialog.close();}else{picker.setSelection(currentId||catalogue.buildings[0].id);status('Current design kept.');}}catch(error){status(error.message);}}});if(currentId)picker.setSelection(currentId);}status('Select a result to open it.');dialog.showModal();dialog.querySelector('#search').focus();}catch(error){document.getElementById('status').textContent=error.message;}};
 dialog.querySelector('#building-format').onchange=()=>{dialog.querySelector('#building-destination').hidden=dialog.querySelector('#building-format').value!=='place';};
 dialog.querySelector('.close-buildings').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
}
