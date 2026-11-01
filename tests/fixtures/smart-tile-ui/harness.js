import {mountSmartTilePanel} from '../../../apps/editor/smart-tile/panel.js';
import {createFloorNavigation} from '../../../packages/floor-navigation/index.js';
import {mountFloorNavigation} from '../../../packages/floor-navigation/dom.js';
import {createSmartTileUIFixture} from './adapter.mjs';
const fixture=createSmartTileUIFixture(),host={wheel:0,pointers:0,keys:0,outside:0,cancellations:0};
const canvas=document.getElementById('host-canvas');
canvas.addEventListener('wheel',event=>{if(!event.ctrlKey)event.preventDefault();host.wheel++;},{passive:false});
canvas.addEventListener('pointerdown',()=>host.pointers++);
canvas.addEventListener('keydown',()=>host.keys++);
document.getElementById('outside-action').onclick=()=>host.outside++;
const floors=[{id:'ground',label:'G',elevationM:.37},{id:'gallery',label:'Gallery',elevationM:3.42},{id:'roof',label:'Roof',elevationM:7.8},{id:'tower',label:'Tower',elevationM:12.11},{id:'loft',label:'Loft',elevationM:15.2},{id:'crown',label:'Crown',elevationM:19.6}];
const navigation=createFloorNavigation({floors,selectedId:'ground',
  cancelPreview(){host.cancellations++;fixture.adapter.cancel('host-floor-change');},
  onFloorChange({to}){fixture.patch({floor:{...to,mode:'manual'}});}
});
const floorView=mountFloorNavigation(document.getElementById('floors'),navigation,{showModes:false,label:'Host editing floor'});
let panel=mountSmartTilePanel(document.getElementById('panel'),fixture.adapter,{floorElement:floorView.element});
window.smartTileUIFixture=Object.freeze({version:1,fixture,host,navigation,floorView,
  get panel(){return panel;},
  remount(options={}){panel?.dispose();panel=mountSmartTilePanel(document.getElementById('panel'),fixture.adapter,{floorElement:floorView.element,...options});return true;},
  dispose(){panel?.dispose();floorView.dispose();navigation.dispose();}
});
document.body.dataset.ready='true';
