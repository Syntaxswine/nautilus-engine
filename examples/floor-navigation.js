import {createFloorNavigation} from '../packages/floor-navigation/index.js';
import {mountFloorNavigation} from '../packages/floor-navigation/dom.js';
const $=id=>document.getElementById(id),resources=Object.freeze({ap:0,clock:480});
let controller,view,stop,preview=false,zoom=100,contactFloor,detected=true;
const status=text=>{$('status').textContent=text;};
function draw(state){
 const count=state.floors.length,step=Math.min(44,455/count),bottom=548,top=bottom-count*step,active=state.floors.findIndex(floor=>floor.id===state.selectedId);
 const player=state.floors.findIndex(floor=>floor.id===state.character?.floorId),contact=state.floors.findIndex(floor=>floor.id===contactFloor);
 let svg='<defs><pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#627259" stroke-width=".6" opacity=".2"/></pattern></defs><path d="M105 561L450 598 659 546 319 514Z" fill="#334c36" stroke="#66805a"/><path d="M280 '+top+'L475 '+top+' 519 '+(top-18)+' 325 '+(top-18)+'Z" fill="#7a8061" stroke="#a09c73"/><path d="M475 '+top+'L519 '+(top-18)+' 519 530 475 548Z" fill="#2b4432" stroke="#687d57"/><rect x="280" y="'+top+'" width="195" height="'+(count*step)+'" fill="url(#hatch)" stroke="#7b8b63"/>';
 for(let i=0;i<count;i++){
  const y=bottom-(i+1)*step,selected=i===active,color=selected?'#d9bc75':'#5b7153';
  svg+='<g data-story="'+state.floors[i].label+'"><rect x="281" y="'+y+'" width="193" height="'+step+'" fill="'+(selected?'#b59c4833':'#243d2b')+'" stroke="'+color+'" stroke-width="'+(selected?1.5:.6)+'"/><path d="M340 '+y+'v'+step+'m74 -'+step+'v'+step+'" stroke="'+color+'" opacity=".5"/><path d="M281 '+(y+step-2)+'h193" stroke="'+color+'" stroke-width="2"/>';
  if(selected||i===0||i===count-1||(i+1)%5===0)svg+='<text x="259" y="'+(y+step*.7)+'" fill="'+(selected?'#f1d48b':'#8fa684')+'" font-family="system-ui" font-size="'+(selected?14:10)+'" text-anchor="end">'+state.floors[i].label+'</text>';
  if(i===player)svg+='<circle cx="310" cy="'+(y+step/2)+'" r="'+Math.min(5,step*.3)+'" fill="#e3cf92"/>';
  if(detected&&i===contact)svg+='<circle cx="445" cy="'+(y+step/2)+'" r="'+Math.min(5,step*.3)+'" fill="#b4d0a3" stroke="#dcf1cd" stroke-dasharray="2 2"/>';
  if(selected)svg+='<path d="M215 '+(y+step/2)+'h24" stroke="#e1c275" stroke-width="2"/><text x="540" y="'+(y+step*.7)+'" fill="#dfc589" font-family="system-ui" font-size="11">'+state.floors[i].elevationM.toFixed(2)+' m</text>';
  svg+='</g>';
 }
 svg+='<path d="M281 548v15h194v-15" fill="#7b8061" stroke="#9a9a70"/><path d="M120 574h80m-40 -4v8m390 -9h80" stroke="#6b825b" opacity=".6"/><text x="310" y="601" fill="#96aa88" font-family="system-ui" font-size="10">● Character</text><text x="414" y="601" fill="#96aa88" font-family="system-ui" font-size="10">◌ Known contact</text>';
 $('building').innerHTML=svg;$('scene-floor').textContent='Floor '+state.floors[active].label+' · '+state.floors[active].elevationM.toFixed(2)+' m';
 $('direct-floor').value=state.selectedId;$('preview-mark').hidden=!preview;
 $('contact-readout').textContent=detected?'Floor '+state.floors[contact].label+' · known':'Detection lost';
 $('inspect-contact').disabled=!detected;$('lose-contact').disabled=!detected;
}
function install(profile){
 view?.dispose();stop?.();controller?.dispose();preview=false;detected=true;
 const count=profile==='legacy6'?6:32,floors=Array.from({length:count},(_,i)=>({id:'floor-'+(i+1),label:String(i+1),elevationM:i*2.12}));
 contactFloor=floors[Math.min(14,count-1)].id;
 for(const id of ['direct-floor','character-floor']){$(id).replaceChildren(...floors.map(floor=>new Option(floor.label+' · '+floor.elevationM.toFixed(2)+' m',floor.id)));}
 controller=createFloorNavigation({floors,selectedId:floors[Math.min(8,count-1)].id,
  cancelPreview(){preview=false;},
  onFloorChange({to}){status('Floor '+to.label+' · '+to.elevationM.toFixed(2)+' m. '+(preview?'Preview cancelled.':'Uncommitted previews cleared.'));},
  onTrackingLost(){status('Contact lost. Live tracking stopped; returning to the character.');}
 });
 controller.setCharacter({id:'player',floorId:floors[0].id});
 view=mountFloorNavigation($('floor-control'),controller,{onError:error=>status(error.message)});
 stop=controller.subscribe(draw);$('profile-label').textContent=profile==='legacy6'?'LEGACY · 6 LAYERS':'EXTENDED REFERENCE · 32 FLOORS';
 $('character-floor').value=floors[0].id;
 status(profile==='legacy6'?'Six legacy layers. The top layer retains its fringe / high-terrain role.':'Declared 32-floor reference. The workshop’s extended world integration is pending.');
}
$('profile').onchange=()=>install($('profile').value);
$('direct-floor').onchange=()=>controller.select($('direct-floor').value);
$('confirm-character').onclick=()=>{controller.setCharacter({id:'player',floorId:$('character-floor').value});status('Confirmed character floor. Manual inspection stays where you put it.');};
$('inspect-contact').onclick=()=>controller.inspectContact({id:'contact',floorId:contactFloor,detected});
$('lose-contact').onclick=()=>{detected=false;controller.updateContact({id:'contact',detected:false});draw(controller.state);};
$('preview-wall').onclick=()=>{preview=true;draw(controller.state);status('Wall preview ready. Changing floors cancels it; no geometry has been placed.');};
$('world-scene').addEventListener('wheel',event=>{if(event.ctrlKey)return;event.preventDefault();zoom=Math.max(60,Math.min(150,zoom+(event.deltaY<0?5:-5)));$('zoom').textContent=zoom+'%';$('building').style.transform='scale('+zoom/100+')';$('building').style.transformOrigin='50% 80%';},{passive:false});
$('open-focus-dialog').onclick=()=>$('focus-dialog').showModal();
window.floorDemo={get controller(){return controller;},inspect:()=>({state:controller.state,visible:controller.visibleFloors,preview,zoom,resources,undo:0,geometryEdits:0})};
$('floor-control').style.setProperty('--fn-switch-image','url("'+new URL('../vendor/farmyard/b2f2b6bd033cc3dbc8b572caa251244d283829c8/sites/tactical-animal/dist/assets/ui/industrial-switches/switch-skins-v2.webp',import.meta.url).href+'")');
install($('profile').value);
window.addEventListener('pagehide',()=>{view.dispose();stop();controller.dispose();},{once:true});
