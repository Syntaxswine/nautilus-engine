import * as T from '../packages/render-effects/three.js';
import {VEHICLE_BODIES,VEHICLE_FINISHES} from '../packages/vehicle-core/index.js';
import {createRoadVehicleKit} from '../packages/vehicle-visuals/three.js';
const params=new URL(location.href).searchParams,body=params.get('body')||'hatchback',profile=params.get('quality')==='game'?'game':'full';
const bodySelect=document.querySelector('#body'),quality=document.querySelector('#quality');for(const b of VEHICLE_BODIES){const option=document.createElement('option');option.value=b.id;option.textContent=b.name;bodySelect.append(option);}bodySelect.value=body;quality.value=profile;
const change=()=>{const url=new URL(location.href);url.searchParams.set('body',bodySelect.value);url.searchParams.set('quality',quality.value);location.href=url;};bodySelect.addEventListener('change',change);quality.addEventListener('change',change);
const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene();scene.background=new T.Color(0xe0e3d7);scene.add(new T.HemisphereLight(0xf8f7ee,0x526753,2.3));const sun=new T.DirectionalLight(0xfff0d5,3);sun.position.set(7,13,10);scene.add(sun);
const camera=new T.OrthographicCamera(-11,11,7.5,-7.5,.05,100);camera.position.set(7,13,19);camera.lookAt(0,.6,0);
const grid=new T.GridHelper(24,24,0xa2afa2,0xc2cbbd);grid.position.y=-.01;scene.add(grid);
const kit=createRoadVehicleKit(T,{bodies:[body],purpose:'authoring',profile});let disposed=false;const models=[];
const draw=()=>{if(disposed)return;const c=renderer.domElement,w=c.clientWidth,h=c.clientHeight;renderer.setSize(w,h,false);const aspect=w/h;camera.left=-7.5*aspect;camera.right=7.5*aspect;camera.updateProjectionMatrix();renderer.render(scene,camera);};
function dispose(){if(disposed)return;disposed=true;removeEventListener('resize',draw);for(const m of models)m.dispose();kit.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose();}
try{await kit.ready;for(let i=0;i<VEHICLE_FINISHES.length;i++){const model=kit.create('vehicle-'+body+'-'+VEHICLE_FINISHES[i].id);model.root.position.x=(i-1)*5.5;scene.add(model.root);models.push(model);}await renderer.compileAsync(scene,camera);draw();document.querySelector('#status').textContent='1 m grid · '+(profile==='full'?'Full approved skins and sculpts':'Derived skins and approved reduced geometry');window.vehicleLibrary={kit,renderer,models,dispose};addEventListener('resize',draw);addEventListener('pagehide',dispose,{once:true});}catch(e){dispose();document.querySelector('#status').textContent=e.message;throw e;}
