import {createFloorNavigation} from '../../../packages/floor-navigation/index.js';
import {bindSmartTileInput} from '../../../apps/editor/smart-tile/input.js';
import {mountTileStackUI} from './panel.js';
import {createTileStackUIFixture,compatibilityFloors,nonuniformFloors} from './fixture-adapter.js';
const workspace=document.getElementById('workspace'),canvas=document.getElementById('view-probe'),hostStatus=document.getElementById('host-status');
const host={zoom:1,wheel:0,camera:0,guides:0,planeH:0,retirements:[],outside:0};
let navigation,fixture,panel,input,unfloor;
function mount(profile='compatibility'){
  input?.dispose();panel?.dispose();unfloor?.();navigation?.dispose();
  const floors=profile==='nonuniform'?nonuniformFloors:compatibilityFloors;
  navigation=createFloorNavigation({floors,selectedId:floors[0].id,cancelPreview(){
    if(['applying','recovery-required'].includes(fixture.peek().phase)){hostStatus.textContent='Floor inspection vetoed by fixture during unknown acceptance.';return false;}
    input?.retire('floor-before-plane');host.retirements.push({reason:'floor-before-plane',height:host.planeH});fixture.adapter.cancel('floor-before-plane');return true;
  },onFloorChange({to}){host.planeH=to.elevationM;},onModeChange(){input?.retire('floor-mode');fixture.adapter.cancel('floor-mode');}});
  host.planeH=floors[0].elevationM;
  fixture=createTileStackUIFixture(navigation,profile==='nonuniform'?'nonuniform-fifteen':'aft-native-fifteen');
  panel=mountTileStackUI(document.getElementById('candidate-panel'),fixture.adapter,{floorController:navigation,keyboardTarget:workspace});
  input=bindSmartTileInput({canvas,session:fixture.adapter,screenToWorld:event=>{const rect=canvas.getBoundingClientRect();return [(event.clientX-rect.left)/20,(event.clientY-rect.top)/20];},hitOwner:()=>fixture.peek().selectedOwnerId,readDraft:()=>fixture.peek().draft??{tool:'rectangle',ownerId:null,origin:[0,0],widthM:8,depthM:4,seed:17},onGuide:()=>host.guides++,onCamera:()=>host.camera++});
  unfloor=navigation.subscribe(()=>fixture.notify());
  document.getElementById('profile-readout').textContent=profile==='nonuniform'?'Explicit nonuniform elevations; the same labels do not imply heights.':'Fifteen explicit fixture elevations: 0 through 29.68 m. 2.12 m is this named compatibility profile.';
}
canvas.addEventListener('wheel',event=>{if(event.ctrlKey)return;event.preventDefault();host.wheel++;host.zoom*=Math.exp(-event.deltaY*.001);hostStatus.textContent='Host camera input probe zoom '+host.zoom.toFixed(3);},{passive:false});
document.getElementById('outside-action').onclick=()=>host.outside++;
document.getElementById('profile').onchange=event=>mount(event.target.value);
document.getElementById('open-dialog').onclick=()=>document.getElementById('guard-dialog').showModal();
document.getElementById('close-dialog').onclick=()=>document.getElementById('guard-dialog').close();
mount();
window.tileStackUIProof=Object.freeze({version:1,host,get fixture(){return fixture;},get panel(){return panel;},get navigation(){return navigation;},get input(){return input;},setProfile:mount,dispose(){input.dispose();panel.dispose();unfloor();navigation.dispose();}});
document.body.dataset.ready='true';
