import * as T from '../../render-effects/three.js';
import {createRailwayKit} from '../../railway-visuals/three.js';
import {createRailwayTrainView} from '../../railway-visuals/train-view.js';
import {createTrainYardHost} from '../../../examples/train-yard-host.js';
import {mountPlayerUI,createPlayerConfiguration,createTrainPlayerProvider} from '../index.js';

const content={id:'retained-two-circuit-yard',version:1,sourcePin:'7f50cb2a48aef87a16fc0465997549be9ed88dc2'},canvas=document.querySelector('#world');
const host=createTrainYardHost(),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene();scene.background=new T.Color(0x91ada5);scene.fog=new T.Fog(0x91ada5,150,390);scene.add(new T.HemisphereLight(0xf2eed8,0x3a5034,2.3));const sun=new T.DirectionalLight(0xffdfb2,3);sun.position.set(80,110,-30);scene.add(sun);
const groundGeometry=new T.PlaneGeometry(280,220),groundMaterial=new T.MeshStandardMaterial({color:0x75815a,roughness:1}),ground=new T.Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.set(120,-.015,85);scene.add(ground);
const kit=createRailwayKit(T),views=new Map();for(const route of host.routes)scene.add(kit.createCircuit(route.waypoints,route.radiusM).root);for(const train of host.read().trains){const view=createRailwayTrainView(T,train.state);views.set(train.stock,view);scene.add(view.root);}
const camera=new T.PerspectiveCamera(45,1,.1,700);let cameraSettings={mode:'follow',zoom:1},uiPaused=false,bounds=null,retired=false,frame=0,previous=0;
const cameraProvider={async prepare(settings,{signal}){if(signal.aborted)throw Error('CAMERA_CANCELLED');const next={...settings};return {commit(){cameraSettings=next;},dispose(){}};}};
const provider=createTrainPlayerProvider({host,content,inputElement:canvas,setUIPaused:value=>{uiPaused=value;},onHudBounds:value=>{bounds=value;},camera:cameraProvider,title:{options:{title:'The railway workshop',eyebrow:'NAUTILUS · SHARED PLAYER INTERFACE',tagline:'One layout. Your world.',edition:'Retained yard · no actor bootstrap or save replacement',labels:{start:'Enter yard',empty:'The existing yard is ready. Your actor and resources are retained.'},onStart:async({signal})=>{if(signal.aborted)throw Error('Entry cancelled.');}}}});
const configuration=createPlayerConfiguration({content,camera:true,title:true});
const ui=await mountPlayerUI(document.querySelector('#ui'),{providers:[provider],configuration,onError:(error,context)=>console.error(context.phase+': '+error.message)});
function draw(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;const snapshot=host.read(),player=snapshot.actors[0];for(const train of snapshot.trains)views.get(train.stock).update(train.state);
  if(cameraSettings.mode==='overview'){camera.position.set(120,220/cameraSettings.zoom,220);camera.lookAt(120,0,86);}else {const distance=28/cameraSettings.zoom;camera.position.set(player.position.x+distance*.5,distance*.8,player.position.y+distance*.85);camera.lookAt(player.position.x,player.position.h+1,player.position.y);}
  if(bounds?.safe.height>0){const x=bounds.safe.x+bounds.safe.width/2,y=bounds.safe.y+bounds.safe.height/2;camera.setViewOffset(r.width,r.height,r.width/2-x,r.height/2-y,r.width,r.height);}else camera.clearViewOffset();camera.updateProjectionMatrix();renderer.render(scene,camera);
}
function tick(now){if(retired)return;const seconds=Math.min(.05,(now-(previous||now))/1000);previous=now;if(!document.hidden&&!uiPaused&&seconds>0){ui.advanceInput(seconds);host.advance(seconds);}draw();frame=requestAnimationFrame(tick);}
async function dispose(){if(retired)return;retired=true;cancelAnimationFrame(frame);await ui.dispose();host.dispose();for(const view of views.values())view.dispose();kit.dispose();groundGeometry.dispose();groundMaterial.dispose();renderer.dispose();}
window.addEventListener('pagehide',()=>void dispose(),{once:true});
// Fixture diagnostics expose retained state, never a second gameplay input path.
window.playerUIFixture={ui,host,provider,camera,read:()=>host.read(),get bounds(){return bounds;},get cameraSettings(){return {...cameraSettings};},get paused(){return uiPaused;},dispose};
frame=requestAnimationFrame(tick);
