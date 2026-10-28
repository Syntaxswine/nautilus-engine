import * as T from '../packages/render-effects/three.js';
import {SearchHalo, HALO_WIDTHS} from '../packages/render-effects/index.js';
import {createDiagonalOccluder,wallVisibility,REVIEW_ORIGIN,REVIEW_CAMERA} from './halo-wall-fixture.js';

const $=id=>document.getElementById(id), errors=[];
addEventListener('error',event=>errors.push(event.message));
addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x17241e,1);
renderer.toneMapping=T.NoToneMapping;
$('scene').append(renderer.domElement);
const scene=new T.Scene(), camera=new T.PerspectiveCamera(36,1,.1,80);
camera.position.fromArray(REVIEW_CAMERA);camera.lookAt(REVIEW_ORIGIN[0],1.2,REVIEW_ORIGIN[2]);
const fixtures=new T.Group();fixtures.position.fromArray(REVIEW_ORIGIN);scene.add(fixtures);
scene.add(new T.HemisphereLight(0xfff2d5,0x354939,2));
const sun=new T.DirectionalLight(0xffe6a2,2.6);sun.position.set(REVIEW_ORIGIN[0]-4,8,REVIEW_ORIGIN[2]+5);sun.target.position.fromArray(REVIEW_ORIGIN);scene.add(sun,sun.target);
const floor=new T.Mesh(new T.PlaneGeometry(30,20),new T.MeshStandardMaterial({color:0x293d31,roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.02;fixtures.add(floor);
const grid=new T.GridHelper(24,24,0x4a6050,0x344a3b);grid.position.y=.005;fixtures.add(grid);

// Engine-owned review artwork: transparent gaps test the silhouette, not a box outline.
const painting=document.createElement('canvas');painting.width=256;painting.height=256;
const ink=painting.getContext('2d');
ink.fillStyle='#d8b371';ink.beginPath();ink.roundRect(35,92,186,117,12);ink.fill();
ink.fillStyle='#6b442a';ink.fillRect(42,121,172,76);
for(let x=45;x<215;x+=22){ink.fillStyle=x%3?'#95643c':'#ae7b49';ink.fillRect(x,125,17,68);}
ink.strokeStyle='#d5a552';ink.lineWidth=8;ink.strokeRect(39,119,178,81);
ink.fillStyle='#435b51';ink.fillRect(51,101,14,106);ink.fillRect(190,101,14,106);
ink.fillStyle='#eac677';ink.fillRect(119,133,20,29);ink.fillStyle='#2b291d';ink.fillRect(126,142,6,13);
ink.strokeStyle='#cc9c54';ink.lineWidth=13;ink.beginPath();ink.moveTo(46,105);ink.lineTo(70,51);ink.lineTo(185,39);ink.lineTo(211,96);ink.stroke();
const texture=new T.CanvasTexture(painting);texture.colorSpace=T.SRGBColorSpace;
const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,alphaTest:.05}));sprite.position.set(-2,1.25,0);sprite.scale.set(2.7,2.7,1);fixtures.add(sprite);

// A genuine skin binding and bent child bone exercise the shared posed silhouette.
const geometry=new T.CylinderGeometry(.48,.63,3,12,12), positions=geometry.attributes.position;
const indices=[],weights=[];
for(let i=0;i<positions.count;i++){
  const blend=T.MathUtils.clamp((positions.getY(i)+.3)/1.2,0,1);
  indices.push(0,1,0,0);weights.push(1-blend,blend,0,0);
}
geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
const material=new T.MeshStandardMaterial({color:0xa17b60,roughness:.95});
const body=new T.SkinnedMesh(geometry,material), rootBone=new T.Bone(), joint=new T.Bone();
rootBone.position.y=-1.5;joint.position.y=1.5;rootBone.add(joint);body.add(rootBone);
const skeleton=new T.Skeleton([rootBone,joint]);body.bind(skeleton);body.position.set(1.8,1.5,0);joint.rotation.z=-.6;fixtures.add(body);
const occluder=createDiagonalOccluder(),wall=occluder.group;wall.visible=false;scene.add(wall);
const propWorld=new T.Vector3(),bodyWorld=new T.Vector3();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const halo=new SearchHalo({reducedMotion:()=>!$('motion').checked||reducedMotion.matches});
let phase=null, request, retired=false;
function resize(){const bounds=$('scene').getBoundingClientRect();renderer.setSize(bounds.width,bounds.height);camera.aspect=bounds.width/bounds.height;camera.updateProjectionMatrix();}
const observer=new ResizeObserver(resize);observer.observe($('scene'));resize();
for(const [id,value] of [['phase0',0],['phase3',3000],['resume',null]])$(id).onclick=()=>{phase=value;};
function draw(now){
  if(retired)return;
  wall.visible=$('wall').checked;
  const enabled=$('halo').checked&&$('targets').checked;
  scene.updateMatrixWorld(true);
  const map=wall.visible?occluder.map:{...occluder.map,wallRuns:{version:1,segments:[]}};
  const propVisibility=wallVisibility(map,camera.position,sprite.getWorldPosition(propWorld));
  const bodyVisibility=wallVisibility(map,camera.position,body.getWorldPosition(bodyWorld));
  const targets=enabled? [{root:sprite,width:HALO_WIDTHS.standard,eligible:propVisibility.eligible},{root:body,width:$('wide').checked?HALO_WIDTHS.wide:HALO_WIDTHS.standard,eligible:bodyVisibility.eligible}].filter(target=>target.eligible):[];
  try{
    halo.render(renderer,scene,camera,targets,phase??now);
    const state={phase:halo.time.value,profiles:enabled?($('wide').checked?2:1):0,proxies:halo.proxies.size,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,errors:errors.length,occluder:wall.visible,propVisibility,bodyVisibility};
    $('status').textContent=(enabled?'Halo active':'Normal scene')+' · phase '+state.phase.toFixed(2)+' s · '+state.profiles+' width profiles · '+state.errors+' errors'+(wall.visible?' · prop center blocked: '+propVisibility.centerBlocked+', upper sample visible: '+!propVisibility.upperBlocked:'');
    $('status').dataset.review=JSON.stringify(state);
  }catch(error){errors.push(String(error));$('status').textContent=String(error);return;}
  request=requestAnimationFrame(draw);
}
request=requestAnimationFrame(draw);
addEventListener('pagehide',()=>{
  retired=true;cancelAnimationFrame(request);observer.disconnect();halo.dispose();
  occluder.dispose();
  for(const object of [floor,grid,sprite,body]){object.geometry?.dispose();for(const value of Array.isArray(object.material)?object.material:[object.material])value?.dispose();}
  texture.dispose();skeleton.dispose();renderer.dispose();
},{once:true});
