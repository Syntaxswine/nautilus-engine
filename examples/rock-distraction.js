import * as T from '../packages/render-effects/three.js';
import {createRockModel} from '../packages/item-visuals/rock.js';
import {createRockYard, YARD} from './rock-distraction-host.js';

const $=id=>document.getElementById(id), canvas=$('scene'), abort=new AbortController();
const listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:abort.signal});
const manual=new URLSearchParams(location.search).has('review'), reduced=matchMedia('(prefers-reduced-motion: reduce)'), keys=new Set(), models=new Map(), labels=new Map();
let renderer, frame=0, lastTime=0, retired=false, paused=false, visible=true, soundEnabled=false, audio, lastEvent=0, ring=null, drawings=0, thuds=0, scheduledThuds=0,uiStamp='',previewStamp='';
const resources=[], own=value=>(resources.push(value),value), scene=new T.Scene();
scene.background=new T.Color(0x172b24);
const camera=new T.OrthographicCamera(), raycaster=new T.Raycaster(), groundPlane=new T.Plane(new T.Vector3(0,1,0),0);
const yard=createRockYard(), objects=new T.Group();scene.add(objects);
const v=new T.Vector3(), projection=new T.Vector3();
function material(color){return own(new T.MeshStandardMaterial({color,roughness:.95}));}
function mesh(geometry,paint,position){const result=new T.Mesh(own(geometry),paint);result.position.set(...position);objects.add(result);return result;}
const ground=mesh(new T.BoxGeometry(YARD.width,.12,YARD.depth),material(0x3b4b35),[YARD.width/2,-.06,YARD.depth/2]);
const gridPoints=[];for(let x=0;x<=YARD.width;x++)gridPoints.push(new T.Vector3(x,.006,0),new T.Vector3(x,.006,YARD.depth));for(let y=0;y<=YARD.depth;y++)gridPoints.push(new T.Vector3(0,.006,y),new T.Vector3(YARD.width,.006,y));
const grid=new T.LineSegments(own(new T.BufferGeometry().setFromPoints(gridPoints)),own(new T.LineBasicMaterial({color:0x7e8760,transparent:true,opacity:.45})));objects.add(grid);
for(const wall of YARD.walls){const m=mesh(new T.BoxGeometry(wall.max.x-wall.min.x,wall.max.h-wall.min.h,wall.max.y-wall.min.y),material(0x7b735b),[(wall.min.x+wall.max.x)/2,(wall.min.h+wall.max.h)/2,(wall.min.y+wall.max.y)/2]);const cap=mesh(new T.BoxGeometry(wall.max.x-wall.min.x,.08,wall.max.y-wall.min.y),material(0x9a9172),[m.position.x,wall.max.h-.04,m.position.z]);}
for(const boulder of YARD.boulders){const m=mesh(new T.DodecahedronGeometry(boulder.radius,0),material(0x626e58),[boulder.x,boulder.radius*.65,boulder.y]);m.scale.set(1,.78,.9);}
scene.add(new T.HemisphereLight(0xffefd1,0x45614b,2.4));
const sun=new T.DirectionalLight(0xffe3ac,2.6);sun.position.set(-3,12,9);scene.add(sun);
const actorPaint={player:material(0xd8b773),near:material(0x90a68a),far:material(0x738779),engaged:material(0xae6751)};
function actor(id,paint){const root=new T.Group();const body=new T.Mesh(own(new T.CylinderGeometry(.23,.29,.78,8)),paint);body.position.y=.64;const head=new T.Mesh(own(new T.SphereGeometry(.17,8,6)),paint);head.position.y=1.22;const pointer=new T.Mesh(own(new T.ConeGeometry(.10,.29,5)),paint);pointer.rotation.x=Math.PI/2;pointer.position.set(0,.98,.36);root.add(body,head,pointer);objects.add(root);return root;}
const actorModels=new Map([['player',actor('player',actorPaint.player)],...['near','far','engaged'].map(id=>[id,actor(id,actorPaint[id])])]);
const target=mesh(new T.TorusGeometry(.24,.016,6,28),material(0xe7ca86),[6,.025,6]);target.rotation.x=Math.PI/2;
const impactRing=mesh(new T.TorusGeometry(1,.02,6,48),own(new T.MeshBasicMaterial({color:0xf7d18c,transparent:true,opacity:.8,depthWrite:false,depthTest:false})),[0,.035,0]);impactRing.rotation.x=Math.PI/2;impactRing.visible=false;impactRing.renderOrder=5;
const arc=new T.Line(new T.BufferGeometry(),own(new T.LineDashedMaterial({color:0xe4c283,dashSize:.12,gapSize:.08,transparent:true,opacity:.85})));objects.add(arc);
const portrait=new T.Scene();portrait.background=new T.Color(0x20362b);portrait.add(new T.HemisphereLight(0xfff1d7,0x344a3b,2.4));const portraitSun=new T.DirectionalLight(0xffeed3,2.7);portraitSun.position.set(-1,2,3);portrait.add(portraitSun);
const portraitRock=createRockModel(T,{seed:17});portrait.add(portraitRock.root);portraitRock.root.rotation.set(.18,.55,-.1);
const portraitCamera=new T.PerspectiveCamera(35,1,.001,2);portraitCamera.position.set(.15,.12,.20);portraitCamera.lookAt(0,0,0);

function label(id,text,position,className=''){let element=labels.get(id);if(!element){element=document.createElement('span');element.className='world-label '+className;$('labels').append(element);labels.set(id,element);}element.textContent=text;projection.set(position.x,position.h??1.55,position.y).project(camera);element.style.left=((projection.x+1)*canvas.clientWidth/2)+'px';element.style.top=((-projection.y+1)*canvas.clientHeight/2)+'px';element.hidden=projection.z< -1||projection.z>1;}
function refresh(){
 const state=yard.presentation();
 const stamp=JSON.stringify([state.count,!!state.nearby,state.canThrow,paused,state.aim,state.guards.map(g=>g.label),state.notes.at(-1)]);
 if(stamp!==uiStamp){uiStamp=stamp;
 $('carried').replaceChildren(document.createTextNode(state.count+' '),Object.assign(document.createElement('small'),{textContent:state.count===1?'rock':'rocks'}));
 $('pickup').disabled=!state.nearby||paused;$('throw').disabled=!state.canThrow||paused;
 $('nearby').textContent=state.nearby?'A loose rock is within reach.':state.count?'Rock ready. Choose where to throw.':'Walk closer to a loose rock to pick it up.';
 $('aim-x').value=state.aim.x;$('aim-y').value=state.aim.y;
 $('aim-x-value').textContent=state.aim.x.toFixed(2).replace(/\.?0+$/,'')+' m';$('aim-y-value').textContent=state.aim.y.toFixed(2).replace(/\.?0+$/,'')+' m';
 for(const [id,p]of Object.entries({open:YARD.targets.open,wall:YARD.targets.wall}))$('target-'+id).setAttribute('aria-pressed',String(p.x===state.aim.x&&p.y===state.aim.y));
 $('guards').replaceChildren(...state.guards.map(g=>{const li=document.createElement('li'),name=document.createElement('span'),mode=document.createElement('span');name.textContent=g.name;mode.className='guard-state '+g.id;mode.textContent=g.label;li.append(name,mode);return li;}));
 $('events').replaceChildren(...state.notes.slice(-6).reverse().map(note=>Object.assign(document.createElement('li'),{textContent:note.text})));
 if(state.notes.length)$('status').textContent=state.notes.at(-1).text;
 }
 for(const event of state.events){if(event.sequence<=lastEvent)continue;lastEvent=event.sequence;if(event.kind==='impact'){ring={position:event.position,born:event.time,surface:event.receipt.kind};scheduledThuds++;playThud(event.position);}}
 return state;
}
async function resumeAudio(){if(!soundEnabled)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){soundEnabled=false;$('sound').textContent='Sound unavailable';$('sound').disabled=true;return;}audio??=new Audio();if(audio.state==='suspended')await audio.resume();}
function playThud(position){
 if(!soundEnabled||!audio||audio.state!=='running')return;
 const now=audio.currentTime, oscillator=audio.createOscillator(),gain=audio.createGain();
 oscillator.type='triangle';oscillator.frequency.setValueAtTime(170,now);oscillator.frequency.exponentialRampToValueAtTime(45,now+.11);
 gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.16,now+.005);gain.gain.exponentialRampToValueAtTime(.001,now+.15);
 oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(now);oscillator.stop(now+.16);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};thuds++;
}
function syncScene(state){
 const live=new Set();
 for(const rock of state.rocks){
  if(rock.phase==='carried')continue;live.add(rock.id);
  let model=models.get(rock.id);if(!model){model=createRockModel(T,{radius:rock.radius,seed:17});objects.add(model.root);models.set(rock.id,model);}
  model.root.position.set(rock.position.x,rock.position.h,rock.position.y);
  if(rock.phase==='flight')model.root.rotation.set(state.time*8,state.time*4,0);else model.root.rotation.set(0,0,0);
  label('rock-'+rock.id,rock.phase==='flight'?'Rock in flight':'Loose rock',{...rock.position,h:rock.position.h+.38},'rock');
 }
 for(const [id,model]of models)if(!live.has(id)){model.dispose();models.delete(id);labels.get('rock-'+id)?.remove();labels.delete('rock-'+id);}
 const player=actorModels.get('player');player.position.set(state.player.x,0,state.player.y);player.rotation.y=state.player.heading||0;
 label('player','You',{...state.player,h:1.65},'player');
 for(const guard of state.guards){const model=actorModels.get(guard.id);model.position.set(guard.position.x,0,guard.position.y);model.rotation.y=guard.heading;label(guard.id,guard.name+' · '+guard.label,{...guard.position,h:1.65},guard.id);}
 target.position.set(state.aim.x,.035,state.aim.y);
 const nextPreview=JSON.stringify(state.preview);if(nextPreview!==previewStamp){previewStamp=nextPreview;const points=state.preview.map(point=>new T.Vector3(point.x,point.h,point.y));arc.geometry.dispose();arc.geometry=new T.BufferGeometry().setFromPoints(points);arc.computeLineDistances();arc.visible=points.length>1;}
 const age=ring?state.time-ring.born:Infinity;impactRing.visible=age<1.5;
 if(impactRing.visible){impactRing.position.set(ring.position.x-(ring.surface==='wall'?.015:0),ring.position.h+(ring.surface==='wall'?0:.035),ring.position.y);impactRing.rotation.set(ring.surface==='wall'?0:Math.PI/2,ring.surface==='wall'?Math.PI/2:0,0);const radius=reduced.matches?1.6:.2+age*1.3;impactRing.scale.setScalar(radius);impactRing.material.opacity=.85*(1-age/1.5);}
}
function render(state=refresh()){
 syncScene(state);if(!renderer)return;
 const width=canvas.clientWidth,height=canvas.clientHeight;renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.render(scene,camera);
 const side=width<500?70:88;renderer.autoClear=false;renderer.clearDepth();renderer.setScissorTest(true);renderer.setScissor(width-side-10,height-side-10,side,side);renderer.setViewport(width-side-10,height-side-10,side,side);renderer.render(portrait,portraitCamera);renderer.setScissorTest(false);renderer.autoClear=true;drawings++;
}
function resize(){
 const width=canvas.clientWidth,height=canvas.clientHeight,aspect=width/Math.max(1,height);const span=Math.max(16,28/aspect);
 camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=100;
 camera.position.set(24,28,31);camera.lookAt(11,0,7);camera.updateProjectionMatrix();
 renderer?.setSize(width,height,false);invalidate();
}
function needsMotion(){return keys.size||yard.moving||ring&&yard.presentation().time-ring.born<1.5;}
function request(){if(!manual&&!retired&&!frame&&visible&&!document.hidden&&!paused)frame=requestAnimationFrame(animate);}
function invalidate(){if(retired)return;render();if(needsMotion())request();}
function animate(now){
 frame=0;if(retired||paused||!visible||document.hidden){lastTime=0;return;}
 const dt=lastTime?Math.min(.1,(now-lastTime)/1000):0;lastTime=now;
 if(dt){let dx=0,dy=0;if(keys.has('a')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('arrowright'))dx++;if(keys.has('w')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('arrowdown'))dy++;if(dx||dy)yard.walk(dx,dy,dt);yard.advance(dt);}
 render();
 if(needsMotion())request();else lastTime=0;
}
function action(fn){if(retired||paused)return;resumeAudio().catch(()=>{});fn();invalidate();}
function setAim(point){yard.aim(point);invalidate();}
listen($('pickup'),'click',()=>action(()=>yard.pickup()));
listen($('throw'),'click',()=>action(()=>yard.throw()));
listen($('target-open'),'click',()=>setAim(YARD.targets.open));listen($('target-wall'),'click',()=>setAim(YARD.targets.wall));
for(const id of ['aim-x','aim-y'])listen($(id),'input',()=>setAim({x:Number($('aim-x').value),y:Number($('aim-y').value),h:0}));
for(const button of document.querySelectorAll('[data-walk]'))listen(button,'click',()=>action(()=>{const [x,y]=button.dataset.walk.split(',').map(Number);yard.walk(x,y,.25);}));
listen(canvas,'pointerup',event=>{if(event.button!==0)return;const box=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),camera);if(raycaster.ray.intersectPlane(groundPlane,v))setAim({x:Math.round(v.x*4)/4,y:Math.round(v.z*4)/4,h:0});canvas.focus({preventScroll:true});});
listen(window,'keydown',event=>{if(event.target.matches('input,button,summary,a')||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;const key=event.key.toLowerCase();if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown'].includes(key)){event.preventDefault();keys.add(key);request();}else if(key==='e'&&!event.repeat){event.preventDefault();action(()=>yard.pickup());}else if((key===' '||key==='enter')&&!event.repeat){event.preventDefault();action(()=>yard.throw());}});
listen(window,'keyup',event=>keys.delete(event.key.toLowerCase()));listen(window,'blur',()=>keys.clear());
listen($('sound'),'click',async()=>{soundEnabled=!soundEnabled;$('sound').textContent=soundEnabled?'Mute sound':'Sound off';$('sound').setAttribute('aria-pressed',String(soundEnabled));try{if(soundEnabled)await resumeAudio();else await audio?.suspend();}catch{$('status').textContent='Sound could not start. You can follow the visible landing ring.';}});
listen($('pause'),'click',()=>{paused=!paused;keys.clear();cancelAnimationFrame(frame);frame=0;lastTime=0;$('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));refresh();if(!paused)invalidate();});
function reset(){yard.reset();ring=null;lastEvent=0;lastTime=0;scheduledThuds=0,uiStamp='',previewStamp='';thuds=0;keys.clear();invalidate();}
listen($('reset'),'click',reset);
listen(document,'visibilitychange',()=>{keys.clear();lastTime=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else invalidate();});
const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=0;if(visible)invalidate();else{cancelAnimationFrame(frame);frame=0;keys.clear();}},{threshold:.01});intersection.observe($('yard'));
const sizeObserver=new ResizeObserver(resize);sizeObserver.observe($('yard'));
try{renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;}catch{$('scene-fallback').hidden=false;}
function dispose(){
 if(retired)return;retired=true;abort.abort();intersection.disconnect();sizeObserver.disconnect();cancelAnimationFrame(frame);frame=0;keys.clear();
 for(const model of models.values())model.dispose();models.clear();portraitRock.dispose();arc.geometry.dispose();for(const resource of new Set(resources)){if(Array.isArray(resource))resource.forEach(item=>item.dispose?.());else resource.dispose?.();}
 renderer?.dispose();renderer?.forceContextLoss();audio?.close().catch(()=>{});$('labels').replaceChildren();labels.clear();
}
listen(window,'pagehide',dispose,{once:true});
window.rockDemo={
 snapshot:()=>yard.snapshot(),
 restore:snapshot=>{yard.restore(snapshot);lastEvent=yard.presentation().events.at(-1)?.sequence||0;ring=null;invalidate();},
 advance:seconds=>{yard.advance(seconds);invalidate();return yard.presentation();},
 pickup:()=>{const result=yard.pickup();invalidate();return result;},
 throw:()=>{const result=yard.throw();invalidate();return result;},
 aim:point=>setAim(point),preset:name=>setAim(YARD.targets[name]),walk:(x,y,seconds=.25)=>{yard.walk(x,y,seconds);invalidate();},
 reset,dispose,
 inspect:()=>({...yard.presentation(),manual,paused,visible,retired,framePending:!!frame,drawings,thuds,scheduledThuds,ring:impactRing.visible?{...ring,drawnPosition:{x:impactRing.position.x,y:impactRing.position.z,h:impactRing.position.y}}:null,modelMetrics:[...models.values()].map(model=>({metrics:model.metrics,scale:model.root.scale.toArray(),radius:model.radius})),audioState:audio?.state||'uncreated',modelCount:models.size,renderer:renderer?renderer.getContext().getParameter(0x1f01):null})
};
resize();invalidate();
