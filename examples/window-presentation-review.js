// Fixture host only. The renderer component has no confirmation authority.
import * as W from '@nautilus-engine/core/windows';
import * as F from '@nautilus-engine/core/adapters/farmyard/windows';
import * as T from '@nautilus-engine/renderer/render-effects/three';
import {createFarmyardWindowPresentation,projectAcceptedWindowPresentation} from '@nautilus-engine/renderer/adapters/farmyard/windows/three';
import {windowFixture} from './window-presentation-fixture.js';
const $=id=>document.getElementById(id),viewport=$('viewport'),scene=new T.Scene();scene.background=new T.Color('#b7c0b1');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;viewport.append(renderer.domElement);
const camera=new T.PerspectiveCamera(38,1,.01,2000),view=createFarmyardWindowPresentation({THREE:T,scene});
scene.add(new T.HemisphereLight(0xffffff,0x485142,2.5));const light=new T.DirectionalLight(0xfff2d3,3.5);light.position.set(15,30,28);scene.add(light);
const ground=new T.Mesh(new T.PlaneGeometry(150,150),new T.MeshStandardMaterial({color:0x737e66,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(20,-.012,20);scene.add(ground);
let fixture,seconds=0,options={},current;const projection=()=>projectAcceptedWindowPresentation(W,fixture.state);
function render(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}
function aim(){const b=new T.Box3().setFromObject(view.root),center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3()),aspect=viewport.clientWidth/viewport.clientHeight,distance=Math.max(size.y,size.x/aspect,3)*1.6;camera.position.copy(center).add(new T.Vector3(options.angle==='quarter'?distance*.75:0,distance*.22,options.angle==='back'?-distance:distance));camera.lookAt(center);camera.far=Math.max(200,distance*5);render();}
function status(){current=view.diagnostics();$('status').textContent=`${options.definitionId} · revision ${current.revision} · ${current.windows} window${current.windows===1?'':'s'} · ${current.activeEffects} effect · ${current.shards} shards · audio deferred`;}
async function choose(input={}){options={definitionId:'window.full.grid-3x2.3m',finish:'steel',wall:'brick',angle:'front',...input};fixture=windowFixture(W,F,{...options,dimensions:options.definitionId==='window.full.borderless'?{width:20,height:10.6}:undefined,rotation:options.angle==='quarter'?90:0});seconds=0;await view.prepare(projection());aim();status();return current;}
function impact(){const pane=projection().windows[0].panes.find(p=>!fixture.state.broken['native-window']?.includes(p.paneId));if(!pane)return status();const result=fixture.impact({paneId:pane.paneId,commandId:'review-'+fixture.state.revision});view.update(projection(),{observation:{receiptId:result.receipt.id,effects:result.effects},timeSeconds:seconds});render();status();return current;}
function sample(value){seconds=value;view.sample(seconds);render();status();return current;}
async function restore(){await view.prepare(projection());seconds=0;aim();status();return current;}
for(const d of F.FARMYARD_WINDOW_CATALOGUE.presets.concat({id:'window.full.borderless'}))$('definition').add(new Option(d.id,d.id));$('definition').value='window.full.grid-3x2.3m';
const ui=()=>({definitionId:$('definition').value,finish:$('finish').value,wall:$('wall').value,angle:$('angle').value});
const run=fn=>Promise.resolve().then(fn).catch(e=>{$('status').textContent=e.code+': '+e.message;console.error(e);});
for(const id of ['definition','finish','wall','angle'])$(id).onchange=()=>run(()=>choose(ui()));$('break').onclick=()=>run(impact);$('sample').onclick=()=>run(()=>sample(seconds+.5));$('restore').onclick=()=>run(restore);$('pair').onclick=()=>run(()=>choose({...ui(),neighbor:true}));
const resize=()=>aim();addEventListener('resize',resize);
function close(){removeEventListener('resize',resize);view.dispose();ground.geometry.dispose();ground.material.dispose();renderer.dispose();renderer.forceContextLoss();}
addEventListener('pagehide',close,{once:true});
await choose();globalThis.windowReview={choose,impact,sample,restore,diagnostics:()=>view.diagnostics(),pixels:()=>renderer.domElement.toDataURL(),renderer:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}),close,ready:true};
