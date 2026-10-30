import * as T from '/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {createLightHorse} from '/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-light-model.js';
import {createModelPaint,MODEL_PAINT,PAINT_FRAME} from '/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-model-paint.js';
import {createWeaponModel} from '/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/weapon-models.js';
import {createBuildingModel} from '/packages/building-catalog/three.js';
import {assembly,definition,placedAssembly,ATLAS} from './kit.js';
import {createKitLibrary} from './three.js';
const host=document.querySelector('#view'),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.setClearColor(0x344a3d);host.append(renderer.domElement);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(),camera=new T.OrthographicCamera(),loader=new T.TextureLoader();
scene.add(new T.HemisphereLight(0xfff7dc,0x698071,2));const sun=new T.DirectionalLight(0xfff1d8,2.3);sun.position.set(7,12,-8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-20;sun.shadow.camera.right=40;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-20;sun.shadow.camera.near=.1;sun.shadow.camera.far=80;sun.shadow.bias=-.0002;scene.add(sun);
const atlas=await loader.loadAsync('/'+ATLAS);atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=renderer.capabilities.getMaxAnisotropy();
const horseData=await fetch('/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-10k-data.json').then(response=>response.json());
let library=createKitLibrary(T,{atlas}),models=[],actors=[],guides=[],rowan=null,disposed=false;
function clear(){for(const actor of actors){actor.worker.equipWeapon();actor.paint.dispose();actor.weapon.dispose();actor.worker.root.removeFromParent();actor.worker.dispose();actor.worker.skeleton.dispose();}actors=[];for(const model of models)model.dispose();models=[];rowan?.dispose();rowan=null;for(const object of guides){object.removeFromParent();object.geometry?.dispose();if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());else object.material?.dispose();}guides=[];}
function guide(object){scene.add(object);guides.push(object);return object;}
function grid(size=24){const object=new T.GridHelper(size,size,0xb3b791,0x6d816d);object.position.y=-.125;guide(object);}
function line(points,color=0xe0b766){return guide(new T.Line(new T.BufferGeometry().setFromPoints(points.map(point=>new T.Vector3(...point))),new T.LineBasicMaterial({color})));}
function outline(min,max,color){return guide(new T.Box3Helper(new T.Box3(new T.Vector3(...min),new T.Vector3(...max)),color));}
async function actor(position,{equipment='hands',heading=-Math.PI/2,envelope=false}={}){
 const worker=createLightHorse(horseData),weapon=createWeaponModel(equipment);worker.equipWeapon(weapon);worker.pose('carry');
 const paint=createModelPaint(renderer,worker,await loader.loadAsync(MODEL_PAINT),{species:'horse',frame:PAINT_FRAME});for(const part of worker.parts)part.material=paint.material;
 worker.root.position.fromArray(position);worker.root.rotation.y=heading;worker.root.updateMatrixWorld(true);worker.skeleton.update();scene.add(worker.root);actors.push({worker,weapon,paint});
 worker.root.traverse(object=>{if(object.isMesh)object.castShadow=object.receiveShadow=true;});
 if(envelope){const radius=equipment==='hmg'?.64:.46;outline([position[0]-radius,position[1],position[2]-radius],[position[0]+radius,position[1]+1.70,position[2]+radius],equipment==='hmg'?0xff8e78:0xbdd890);}
}
function model(recipe){const value=library.createModel(recipe);models.push(value);scene.add(value.root);return value;}
function fit(focus,position,metres){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height,false);camera.left=-metres*width/height/2;camera.right=metres*width/height/2;camera.top=metres/2;camera.bottom=-metres/2;camera.near=.05;camera.far=200;camera.position.fromArray(position);camera.lookAt(new T.Vector3(...focus));camera.updateProjectionMatrix();renderer.render(scene,camera);}
async function set({mode='assembly',layout='longhouse',doorOpen=false,grey=false}={}){
 clear();library.dispose();library=createKitLibrary(T,{atlas,grey});
 const recipe=assembly(layout);let focus=[4,1.9,4.5],position=layout==='cross-workshop'?[-14,10,-12]:[15,11,-14],metres=14;
 document.querySelector('#title').textContent='Native kit · '+(layout==='longhouse'?'Longhouse':'Cross workshop');
 document.querySelector('#caption').textContent='Artist geometry / semantic candidate · authored openings, landings and reusable local part IDs';
 if(mode==='assembly'||mode==='shaft'||mode==='stair'){
  const building=model(recipe);building.setView({roof:mode==='assembly',cutaway:mode==='stair'});
  const door=recipe.parts.find(part=>part.definitionId==='native-door-bay');building.setDoorOpen(door.id,doorOpen);
  if(mode!=='stair')await actor(recipe.referenceActor.position,{heading:recipe.referenceActor.headingRad});grid();
  if(mode==='shaft'){position=layout==='longhouse'?[4,20,5.001]:[5,20,4.001];focus=layout==='longhouse'?[4,1,5]:[5,1,4];metres=13;const hole=recipe.openings[0].bounds;outline(hole.min,hole.max,0xe9c870);document.querySelector('#caption').textContent='Roof removed · actual 2 × 5 m upper slab opening · 70 m² upper support · 0 / 2.12 m floor datums';}
  if(mode==='stair'){
   const landingIds=new Set(recipe.connections.map(connection=>connection.supportPartId));
   for(const part of building.root.children)if(part.userData.floorId==='upper'&&!landingIds.has(part.name))part.visible=false;
   const stair=recipe.parts.find(part=>part.id==='main-stair'),path=definition('native-stair-14').stairs.path.map(point=>{const value=new T.Vector3(...point).applyAxisAngle(new T.Vector3(0,1,0),stair.quarterTurns*Math.PI/2).add(new T.Vector3(...stair.position));return value.toArray();});
   line(path.map(point=>[point[0],point[1]+.035,point[2]]),0xffd274);
   await actor(path[0],{heading:layout==='longhouse'?-Math.PI/2:0,envelope:true});await actor(path.at(-1),{heading:layout==='longhouse'?-Math.PI/2:0,envelope:true});
   focus=layout==='longhouse'?[5,1.5,4]:[5.5,1.5,3];position=layout==='longhouse'?[13,6,-7]:[12,6,-8];metres=9;
   document.querySelector('#caption').textContent='Stair cutaway · 14 real treads, 1.20 m width / 4 m run / 2.12 m rise · authored route and contact surfaces; runtime support binding pending';
  }
 }else if(mode==='door'||mode==='oversized'){
  const bay={id:'native-door-fit',parts:[{id:'door',definitionId:'native-door-bay',position:[0,0,0],quarterTurns:0,floor:'ground'},{id:'floor',definitionId:'native-slab-2x2',position:[0,0,-2],quarterTurns:0,floor:'ground',materialOverride:'concrete'}]};
  const building=model(bay);building.setDoorOpen('door',doorOpen);await actor([1,0,-.65],{equipment:mode==='oversized'?'hmg':'hands',envelope:true});grid(8);
  line([[.4,1.90,-.19],[1.6,1.90,-.19]],0xffd274);focus=[1,.95,-.2];position=[3.8,2.1,-5.5];metres=3.2;
  document.querySelector('#title').textContent=mode==='oversized'?'Native equipped-envelope refusal':'Native doorway fit';
  document.querySelector('#caption').textContent=mode==='oversized'?'Unscaled horse + HMG · selected centred half-extent 0.64 m · 1.28 m clearance profile exceeds 1.20 m opening':'Unscaled horse · body 1.65 m / selected mover 1.70 m · 1.20 × 1.90 m clear opening · '+(doorOpen?'90° open leaf':'closed leaf');
 }else if(mode==='instances'){
  for(const [layout,offset,turn,instanceId]of [['longhouse',[0,0,2],0,'longhouse-original'],['longhouse',[20,0,14],1,'longhouse-quarter-copy'],['cross-workshop',[0,0,20],0,'cross-workshop-second-layout']]){const value=placedAssembly(assembly(layout),offset,turn,instanceId),building=model(value);building.setView({roof:false});const door=value.parts.find(part=>part.definitionId==='native-door-bay');building.setDoorOpen(door.id,true);await actor(value.referenceActor.position,{heading:value.referenceActor.headingRad});}
  grid(64);focus=[13,1.6,15];position=[44,32,-26];metres=39;
  document.querySelector('#title').textContent='Shared definitions · two layouts and a quarter-turned second instance';
  document.querySelector('#caption').textContent='Five identical definitions reused by every instance · no building-name-specific behavior · art placements at native scale';
 }else if(mode==='rowan'){
  rowan=createBuildingModel(T,'rowan-family',{atlas,lod:'game',grey});scene.add(rowan.root);rowan.setView({roof:false,cutaway:true});rowan.setDoorsOpen(true);grid(28);
  focus=[6,1.8,4.5];position=[19,13,-15];metres=15;
  document.querySelector('#title').textContent='Rowan Family House · bounded conversion audit';
  document.querySelector('#caption').textContent='Existing catalogue art only · 22 regular 1.00 × 1.65 m openings · 1 × 3 m stair hole · no functional certification';
 }
 fit(focus,position,metres);return diagnostics();
}
function diagnostics(){let triangles=0,meshes=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;}});return{library:library.diagnostics(),actors:actors.map(({worker,weapon})=>({species:'horse',equipment:weapon.id,nativeScale:worker.root.scale.toArray(),position:worker.root.position.toArray()})),models:models.map(model=>({id:model.root.name,bindings:model.bindings.map(binding=>({assemblyInstanceId:binding.assemblyInstanceId,partId:binding.partId,nodeId:binding.nodeId,definitionId:binding.definitionId}))})),triangles,meshes,renderer:{memory:{...renderer.info.memory},render:{...renderer.info.render}},threeRevision:T.REVISION};}
function dispose(){if(disposed)return;disposed=true;clear();library.dispose();atlas.dispose();sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss();}
window.nativeKitReview={set,diagnostics,dispose,ready:false};window.addEventListener('pagehide',dispose,{once:true});
try{await set({});window.nativeKitReview.ready=true;}catch(error){document.querySelector('#error').textContent=error.stack;throw error;}
