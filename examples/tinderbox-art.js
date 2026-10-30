import * as T from '../packages/render-effects/three.js';
import {listSharedAssets} from '../packages/assets/index.js';
import {loadTinderboxArt} from '../packages/assets/three.js';
const entries=listSharedAssets().filter(a=>a.id.startsWith('tinderbox:'));
const viewer=document.querySelector('#viewer'),select=document.querySelector('#asset'),search=document.querySelector('#search'),status=document.querySelector('#status'),details=document.querySelector('#details'),aftermath=document.querySelector('#aftermath');
let renderer,library,current,entry,closed=false,yaw=Math.PI-.68,pitch=.38,distance=5,target=new T.Vector3(),drag;
const scene=new T.Scene();scene.background=new T.Color('#23342d');
const camera=new T.PerspectiveCamera(38,1,.01,2000);
scene.add(new T.HemisphereLight(0xfff5df,0x496558,2.6));const sun=new T.DirectionalLight(0xffe8ca,3.1);sun.position.set(-8,16,9);scene.add(sun);
const grid=new T.GridHelper(1000,1000,0x778c7a,0x41574b);scene.add(grid);
function render(){if(!renderer||closed)return;const w=viewer.clientWidth,h=viewer.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();camera.position.set(target.x+Math.cos(pitch)*Math.sin(yaw)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(pitch)*Math.cos(yaw)*distance);camera.lookAt(target);renderer.render(scene,camera);}
function fit(){if(!current)return;const size=current.bounds.getSize(new T.Vector3()),aspect=viewer.clientWidth/viewer.clientHeight,fov=Math.min(38*Math.PI/180,2*Math.atan(Math.tan(19*Math.PI/180)*aspect));distance=Math.max(.6,size.length()*.6/Math.sin(fov/2));camera.far=Math.max(100,distance*5);}
function snapshot(){return{selected:entry?.id,closed,scale:current?.root.scale.toArray(),dimensions:entry?.dimensions,triangles:current?.diagnostics().triangles,damageTargets:current?.metadata.damageTargets||[],geometries:renderer?.info.memory.geometries,textures:renderer?.info.memory.textures,drawCalls:renderer?.info.render.calls};}
function choose(id){
 if(closed)throw Error('Gallery disposed');const next=entries.find(a=>a.id===id);if(!next)throw Error('Unknown gallery asset');
 const plan=next.family==='layout'?library.plan(next.sourceId):null,focus=plan?.props.find(p=>p.level===plan.occupiedLevels[0]);
 const model=library.create(id,plan?{levels:[plan.occupiedLevels[0]],includeCeilings:false,sectionBounds:{min:[focus.x-12,0,focus.z-12],max:[focus.x+12,200,focus.z+12]}}:{});
 current?.dispose();current=model;entry=next;scene.add(model.root);select.value=id;
 const bounds=model.bounds;bounds.getCenter(target);fit();grid.position.y=bounds.min.y-.025;
 const size=bounds.getSize(new T.Vector3()).toArray().map(n=>Math.round(n*1000)/1000);details.textContent=next.name+' · '+size.join(' × ')+' m · '+model.diagnostics().triangles.toLocaleString()+' triangles';
 status.textContent=next.family==='layout'?'Representative furnished section. Floors, exterior shell and access are separate.':next.family==='waterfront'?'Native 2.12 m deck pitch. Water and traversal are host-owned.':'Native-scale visual prop. Collision and physical materials are host-owned.';
 aftermath.disabled=!(model.metadata.damageTargets?.length);aftermath.textContent='Show shattered tank';render();return snapshot();
}
function filter(){const query=search.value.trim().toLowerCase();const shown=entries.filter(a=>(a.name+' '+a.id+' '+a.category).toLowerCase().includes(query));select.replaceChildren(...shown.map(a=>new Option(a.name,a.id)));if(!shown.length){status.textContent='No matching assets';return;}if(shown.some(a=>a.id===entry?.id))select.value=entry.id;else if(library)choose(shown[0].id);}
function dispose(){if(closed)return;closed=true;resize.disconnect();current?.dispose();library?.dispose();grid.geometry.dispose();grid.material.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();window.removeEventListener('pagehide',dispose);}
const resize=new ResizeObserver(()=>{fit();render();});resize.observe(viewer);
try{
 renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;viewer.prepend(renderer.domElement);
 library=await loadTinderboxArt(T);if(closed)library.dispose();else{filter();choose('tinderbox:interior:renaissance-armchair');}
 renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
 renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.008;pitch=Math.max(-.1,Math.min(1.4,pitch+(e.clientY-drag.y)*.008));drag={x:e.clientX,y:e.clientY};render();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>{drag=null;});
 renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(.2,distance*Math.exp(e.deltaY*.001));render();},{passive:false});
 search.addEventListener('input',filter);select.addEventListener('change',()=>choose(select.value));
 aftermath.addEventListener('click',()=>{const id=current.metadata.damageTargets[0].id,destroyed=current.getTankState(id)!=='destroyed';current.setTankDestroyed(id,destroyed);aftermath.textContent=destroyed?'Restore intact tank':'Show shattered tank';render();});
 window.tinderboxArtExample={choose,snapshot,render,dispose};window.addEventListener('pagehide',dispose);
}catch(error){status.textContent='Asset preview failed: '+error.message;console.error(error);dispose();}
