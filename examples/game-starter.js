import {mountTitleScreen} from '../packages/game-ui/title.js';
import {createStarterHost} from './game-starter-host.js';
const $=id=>document.getElementById(id),saveKey='nautilus.standard-starter.v1',preferencesKey='nautilus.standard-starter.preferences.v1';
let host=createStarterHost(),paused=false,menuOpen=true,frame=0,lastTime=0,retired=false,settings={autoWalk:true};
const inputs=new AbortController();
function listen(target,type,handler){target.addEventListener(type,event=>{if(!retired)handler(event);},{signal:inputs.signal});}
try{const saved=JSON.parse(localStorage.getItem(preferencesKey)||'null');if(saved&&typeof saved.autoWalk==='boolean')settings=saved;}catch{/* Preferences can safely use defaults. Game-save errors are surfaced by the menu. */}
const ns='http://www.w3.org/2000/svg',yard=$('yard'),events=$('events');
const p=point=>[260+(point.x-point.y)*22,55+(point.x+point.y)*12-point.h*27];
function shape(tag,attributes,text){const node=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;yard.append(node);return node;}
const poly=(points,fill,stroke='#829170')=>shape('polygon',{points:points.map(point=>p(point).join(',')).join(' '),fill,stroke,'stroke-width':1.2});
const at=(x,y,h=0)=>({x,y,h});
function drawBox(bounds,color){
  const a=bounds.min,b=bounds.max;
  poly([at(a.x,a.y,a.h),at(b.x,a.y,a.h),at(b.x,a.y,b.h),at(a.x,a.y,b.h)],color);
  poly([at(b.x,a.y,a.h),at(b.x,b.y,a.h),at(b.x,b.y,b.h),at(b.x,a.y,b.h)],'#304f40');
  poly([at(a.x,a.y,b.h),at(b.x,a.y,b.h),at(b.x,b.y,b.h),at(a.x,b.y,b.h)],'#6d8061');
}
function draw(){
  const state=host.state,actor=host.actor;yard.replaceChildren();
  shape('rect',{x:0,y:0,width:640,height:410,fill:'#15362e'});
  poly([at(0,0),at(14,0),at(14,10),at(0,10)],'#315340','#78906a');
  for(let x=0;x<=14;x++)shape('path',{d:'M'+p(at(x,0)).join(' ')+'L'+p(at(x,10)).join(' '),stroke:'#b7bd8733',fill:'none'});
  for(let y=0;y<=10;y++)shape('path',{d:'M'+p(at(0,y)).join(' ')+'L'+p(at(14,y)).join(' '),stroke:'#b7bd8733',fill:'none'});
  poly([at(10,0,2.12),at(14,0,2.12),at(14,10,2.12),at(10,10,2.12)],'#7d8a66','#c6bb83');
  poly([at(10,10,2.12),at(14,10,2.12),at(14,10,2),at(10,10,2)],'#4f6950');
  for(const surface of host.world.surfaces.filter(s=>s.role==='solid'))drawBox(surface.bounds,'#61775c');
  const stairs=state.stairs[0];
  poly([at(6,4.4),at(9.3,4.4,2.12),at(9.3,5.6,2.12),at(6,5.6)],'#c2ac73','#e4c57d');
  for(let n=0;n<=12;n++){const t=n/12;shape('path',{d:'M'+p(at(6+3.3*t,4.4,2.12*t)).join(' ')+'L'+p(at(6+3.3*t,5.6,2.12*t)).join(' '),stroke:'#556e53','stroke-width':1.2,fill:'none'});}
  shape('path',{d:stairs.path.map((point,index)=>(index?'L':'M')+p(point).join(' ')).join(' '),stroke:'#f0d58f','stroke-width':2,'stroke-dasharray':'5 4',fill:'none'});
  const door=state.doors[0];drawBox(door.open?door.openBounds:door.closedBounds,door.locked?'#915e45':'#9b8455');
  for(const [position,text]of [[at(2,1),'YARD / 0 m'],[at(11.3,1,2.12),'DECK / 2.12 m']]){const [x,y]=p(position);shape('text',{x,y,fill:'#ede0b6','font-family':'system-ui','font-size':9,'letter-spacing':1},text);}
  const [x,y]=p(actor.position);shape('ellipse',{cx:x,cy:y+1,rx:8,ry:4,fill:'#09261f88'});shape('path',{d:'M'+x+' '+y+'v-23',stroke:'#f1d392','stroke-width':7,'stroke-linecap':'round'});shape('circle',{cx:x,cy:y-29,r:5,fill:'#f4dfb1'});
  shape('text',{x:x+12,y:y-24,fill:'#fff0c8','font-family':'system-ui','font-size':10},'YOU');
  const floor=host.world.floors.find(f=>f.id===actor.floorId);
  $('location').textContent=(actor.traversal?'Between landings':'Floor '+floor.label)+' · '+actor.position.h.toFixed(2)+' m';
}
function feedback(result,success){
  if(retired)return;
  $('status').textContent=result.ok?(success||'Moved.'):result.reason;
  for(const event of result.events||[]){const li=document.createElement('li');li.textContent=event.type.replaceAll('-',' ')+' · '+event.targetId;events.prepend(li);while(events.children.length>8)events.lastChild.remove();}
  render();schedule();
}
function render(){
  if(retired)return;
  draw();const actor=host.actor,door=host.state.doors[0],doorPreview=host.inspect('yard-gate'),stairsPreview=host.inspect('deck-stairs'),unlock=host.inspect('yard-gate','unlock-door');
  $('gate-state').textContent=door.locked?'Locked':door.open?'Open':'Closed';
  $('door-action').textContent=door.open?'Close yard gate':'Open yard gate';$('door-action').disabled=!doorPreview.ok;
  $('door-reason').textContent=doorPreview.ok?'The gate is within reach.':doorPreview.reason;
  $('unlock').hidden=!door.locked;$('unlock').disabled=!unlock.ok;
  if(door.locked&&!unlock.ok)$('door-reason').textContent=unlock.reason;
  $('stairs').disabled=!stairsPreview.ok;$('stairs-reason').textContent=actor.traversal?'Following the stair route. Save here to resume mid-flight.':stairsPreview.ok?'The landing and route are clear.':stairsPreview.reason;
  $('stair-state').textContent=actor.traversal?'On the stairs':actor.floorId==='floor-1'?'Return to the yard':'Deck · floor 2';
  $('pause').disabled=!actor.traversal;$('pause').textContent=paused?'Resume walk':'Pause walk';$('pause').setAttribute('aria-pressed',String(paused));
  $('step').disabled=!actor.traversal;$('travel').value=actor.traversal?Math.min(.99,actor.traversal.distanceM/actor.traversal.path.slice(1).reduce((total,p,index)=>total+Math.hypot(p.x-actor.traversal.path[index].x,p.y-actor.traversal.path[index].y,p.h-actor.traversal.path[index].h),0)):actor.floorId==='floor-1'?1:0;
  for(const button of document.querySelectorAll('[data-walk]'))button.disabled=!!actor.traversal;
  $('lock').disabled=door.open||!!actor.traversal;$('lock').textContent=door.locked?'Unlock closed gate':'Lock closed gate';
}
function schedule(){
  if(retired||frame||menuOpen||paused||!settings.autoWalk||!host.actor.traversal)return;
  lastTime=0;frame=requestAnimationFrame(tick);
}
function tick(time){
  frame=0;if(retired||menuOpen||paused||!settings.autoWalk||!host.actor.traversal)return;
  const seconds=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;
  if(seconds){const result=host.advance(seconds);if(!result.ok){paused=true;feedback(result);return;}if(result.events.length)feedback(result,'You reached the landing.');else render();}
  if(!retired&&host.actor.traversal)frame=requestAnimationFrame(tick);
}
function adoptHost(next){if(retired)return;host=next;$('block-door').checked=false;$('have-key').checked=true;}
function readSave(){const saved=localStorage.getItem(saveKey);if(!saved)return null;return createStarterHost(saved);}
function settingsDialog({signal}={}){
  if(retired||signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
  $('auto-walk').checked=settings.autoWalk;
  return new Promise((resolve,reject)=>{const dialog=$('settings');const closed=()=>{signal?.removeEventListener('abort',aborted);schedule();resolve();};const aborted=()=>{dialog.removeEventListener('close',closed);if(dialog.open)dialog.close();reject(new DOMException('Cancelled','AbortError'));};dialog.addEventListener('close',closed,{once:true});signal?.addEventListener('abort',aborted,{once:true});if(signal?.aborted){aborted();return;}dialog.showModal();$('auto-walk').focus();});
}
const menu=mountTitleScreen($('title-mount'),{
  title:'Beyond\nthe threshold',eyebrow:'A NAUTILUS FIELD STUDY',tagline:'Every world begins with a way in.',edition:'REFERENCE YARD / STANDARD GAME SYSTEMS',
  art:{src:'./threshold-art.svg',alt:'A warm doorway above a flight of stone steps in a green industrial courtyard.',caption:'An open door. A higher point of view.'},
  credits:['Original interface, yard and illustration: Nautilus Engine.','Shared world queries and floor conventions: Nautilus native-height world v1.','This study demonstrates reusable systems. Game-specific missions and rules belong to each game.'],
  async checkSave({signal}){await Promise.resolve();if(retired||signal.aborted)return {available:false};const saved=readSave();return {available:!!saved,summary:saved?'Threshold yard · '+(saved.actor.traversal?'on the stairs':'floor '+(saved.actor.floorId==='floor-1'?'2':'1')):''};},
  async onStart({signal}){
    if(retired||signal.aborted)return;
    const candidate=createStarterHost(),checkpoint=candidate.save();
    try{localStorage.setItem(saveKey,checkpoint);}catch(error){
      // A storage wrapper may throw after writing. Only adopt a known committed candidate.
      if(localStorage.getItem(saveKey)!==checkpoint)throw error;
    }
    if(retired||signal.aborted)return;
    adoptHost(candidate);$('game').hidden=false;paused=false;events.replaceChildren();render();$('status').textContent='Open the gate, then walk east toward the stair landing.';
  },
  async onContinue({signal}){if(retired||signal.aborted)return;const saved=readSave();if(!saved)throw Error('No save.');if(retired||signal.aborted)return;adoptHost(saved);$('game').hidden=false;paused=false;render();$('status').textContent='Your saved progress is restored.';},
  onSettings:settingsDialog,
  onVisibilityChange(visible){if(retired)return;menuOpen=visible;if(visible){cancelAnimationFrame(frame);frame=0;$('game').hidden=true;}else schedule();},
  focusGame(){if(!retired&&!$('game').hidden)yard.focus();},
  onError(error,action){if(!retired)document.body.dataset.lastMenuError=action;}
});
listen($('menu'),'click',()=>{try{localStorage.setItem(saveKey,host.save());void menu.show();}catch{$('status').textContent='Save progress or export a checkpoint before returning to the menu.';}});
listen($('settings-cancel'),'click',()=>$('settings').close());
listen($('settings-form'),'submit',event=>{event.preventDefault();settings={autoWalk:$('auto-walk').checked};localStorage.setItem(preferencesKey,JSON.stringify(settings));$('settings').close();});
listen($('door-action'),'click',()=>feedback(host.interact('yard-gate'),'The gate is '+(host.state.doors[0].open?'open.':'closed.')));
listen($('unlock'),'click',()=>feedback(host.interact('yard-gate','unlock-door'),'The gate is unlocked.'));
listen($('stairs'),'click',()=>{paused=false;feedback(host.interact('deck-stairs'),'Walking the stair route.');});
function walk(x,y){feedback(host.walk(x,y),'Moved half a metre.');}
for(const button of document.querySelectorAll('[data-walk]'))listen(button,'click',()=>walk(...button.dataset.walk.split(',').map(Number)));
listen(yard,'keydown',event=>{const direction={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];if(direction&&!event.altKey&&!event.ctrlKey&&!event.metaKey){event.preventDefault();walk(...direction);}});
listen($('pause'),'click',()=>{paused=!paused;render();schedule();});
listen($('step'),'click',()=>{paused=true;feedback(host.advance(.25),'Advanced the stair route by a quarter second.');});
listen($('save'),'click',()=>{try{localStorage.setItem(saveKey,host.save());$('status').textContent='Progress saved, including the gate and stair position.';}catch{$('status').textContent='Progress could not be saved. Export a text checkpoint instead.';}});
listen($('restore'),'click',()=>{try{const restored=readSave();if(!restored)throw Error('No save.');adoptHost(restored);paused=true;render();$('status').textContent='Saved progress restored. Resume walking when ready.';}catch{$('status').textContent='Saved progress could not be restored. The current yard is unchanged.';}});
listen($('export'),'click',()=>{$('save-json').value=host.save();$('status').textContent='The complete checkpoint is ready to copy.';});
listen($('import'),'click',()=>{try{const imported=createStarterHost($('save-json').value);adoptHost(imported);paused=true;render();$('status').textContent='Checkpoint imported. Resume walking when ready.';}catch{$('status').textContent='That checkpoint is unsupported or invalid. The current yard is unchanged.';}});
listen($('block-door'),'change',()=>{host.setBlocker($('block-door').checked);render();});
listen($('have-key'),'change',()=>{host.setKey($('have-key').checked);render();});
listen($('lock'),'click',()=>{try{host.setLocked(!host.state.doors[0].locked);render();}catch(error){$('status').textContent=error.message;}});
window.nautilusStarter=Object.freeze({snapshot:()=>JSON.parse(host.save()),preferences:()=>({...settings})});
addEventListener('pagehide',()=>{
  // Dispose can synchronously notify visibility and abort settings callbacks.
  retired=true;cancelAnimationFrame(frame);frame=0;inputs.abort();menu.dispose();
},{once:true});