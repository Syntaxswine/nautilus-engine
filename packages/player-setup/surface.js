import * as T from '../render-effects/three.js';
import {plain,abort} from '../native-actors/data.js';

export function createDefaultSurface({document,world,content}){
  const element=document.createElement('div');element.className='nautilus-player-surface';element.style.cssText='position:absolute;inset:0;overflow:hidden';
  const canvas=document.createElement('canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label',content.world.name);canvas.style.cssText='width:100%;height:100%;display:block';element.append(canvas);
  const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(document.defaultView.devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();scene.background=new T.Color(content.appearance.sky);scene.add(new T.HemisphereLight(0xf2eed8,0x3a5034,2.3));const sun=new T.DirectionalLight(0xffdfb2,3);sun.position.set(8,11,-3);scene.add(sun);
  const camera=new T.PerspectiveCamera(45,1,.05,700),resources=[],doors=new Map();let retired=false;
  const material=(color)=>{const m=new T.MeshStandardMaterial({color,roughness:.9});resources.push(m);return m;};
  const ground=material(content.appearance.ground),solid=material(0x8b785e),leaf=material(0x546d59);
  function box(bounds,mat){const {min:a,max:b}=bounds,geometry=new T.BoxGeometry(Math.max(.02,b.x-a.x),Math.max(.02,b.h-a.h),Math.max(.02,b.y-a.y));resources.push(geometry);const mesh=new T.Mesh(geometry,mat);mesh.position.set((a.x+b.x)/2,(a.h+b.h)/2,(a.y+b.y)/2);scene.add(mesh);return mesh;}
  function fitDoor(mesh,bounds){mesh.visible=!!bounds;if(!bounds)return;const {min:a,max:b}=bounds;mesh.position.set((a.x+b.x)/2,(a.h+b.h)/2,(a.y+b.y)/2);mesh.scale.set(b.x-a.x,b.h-a.h,b.y-a.y);}
  try{for(const surface of world.read().world.surfaces)box(surface.bounds,surface.supports?ground:solid);let geometry;for(const door of world.read().interactions.doors){if(!geometry){geometry=new T.BoxGeometry(1,1,1);resources.push(geometry);}const mesh=new T.Mesh(geometry,leaf);mesh.name='Door '+door.id;fitDoor(mesh,door.open?door.openBounds:door.closedBounds);scene.add(mesh);doors.set(door.id,mesh);}}
  catch(error){resources.forEach(r=>r.dispose());renderer.dispose();throw error;}
  return Object.freeze({kind:'owned-player-surface',element,canvas,renderer,scene,camera,
    resize(){const r=canvas.getBoundingClientRect(),width=Math.max(1,r.width),height=Math.max(1,r.height),ratio=renderer.getPixelRatio();if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio))renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();return {width,height};},
    draw(){if(retired)return;for(const door of world.read().interactions.doors)fitDoor(doors.get(door.id),door.open?door.openBounds:door.closedBounds);renderer.render(scene,camera);},
    dispose(){if(retired)return;retired=true;const errors=[];for(const close of [()=>element.remove(),...resources.map(r=>()=>r.dispose()),()=>renderer.dispose()])try{close();}catch(error){errors.push(error);}scene.clear();if(errors.length)throw new AggregateError(errors,'Owned surface cleanup failed.');}});
}

// The frame is confirmed transport data, never a hidden seat/avatar heuristic.
// Orthographic or game-specific cameras can retain their explicit provider.
function roadCameraFrame(state){
  const f=state.cameraFrame;if(!f||!['driver','rider'].includes(state.mode))return null;
  const t=state.transport,point=p=>p&&['x','y','h'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=1e6);
  if(f.version!==1||f.kind!=='road-vehicle'||t?.kind!=='road-vehicle'||typeof f.connectorId!=='string'||!f.connectorId||typeof f.vehicleId!=='string'||!f.vehicleId||f.connectorId!==t.connectorId||f.vehicleId!==t.vehicleId||!point(f.centre)||!point(f.bounds?.min)||!point(f.bounds?.max)||!Number.isFinite(f.headingRad)||Math.abs(f.headingRad)>1e6||['x','y','h'].some(k=>f.bounds.min[k]>f.centre[k]||f.bounds.max[k]<f.centre[k]||f.bounds.max[k]-f.bounds.min[k]>128))throw Error('ROAD_CAMERA_FRAME: bind a finite version1 confirmed vehicle centre, heading and envelope.');
  return f;
}
function followRoadVehicle(camera,frame,zoom,width,height,safe){
  if(!camera.isPerspectiveCamera||!Number.isFinite(camera.fov)||camera.fov<=0||camera.fov>=179||!Number.isFinite(camera.zoom)||camera.zoom<=0)throw Error('ROAD_CAMERA_PROJECTION: the default chase view requires a finite perspective surface.');
  const theta=frame.headingRad,back=new T.Vector3(-12*Math.sin(theta),11,-12*Math.cos(theta)).normalize(),right=new T.Vector3(-Math.cos(theta),0,Math.sin(theta)),up=back.clone().cross(right);
  const target=new T.Vector3(frame.centre.x,(frame.bounds.min.h+frame.bounds.max.h)/2,frame.centre.y),tanV=Math.tan(camera.fov*Math.PI/360)/camera.zoom,tanH=tanV*width/height;
  const availableW=Math.min(width,safe?.width||width),availableH=Math.min(height,safe?.height||height),usableW=Math.max(1,availableW-2*Math.min(12,availableW*.08)),usableH=Math.max(1,availableH-2*Math.min(12,availableH*.08));
  let distance=Math.hypot(12,11)/zoom;
  // Exact perspective half-space fit of all eight conservative envelope corners.
  // View-offset translation below places the optical centre in the HUD-safe rect.
  for(const x of [frame.bounds.min.x,frame.bounds.max.x])for(const y of [frame.bounds.min.y,frame.bounds.max.y])for(const h of [frame.bounds.min.h,frame.bounds.max.h]){const d=new T.Vector3(x,h,y).sub(target),depth=d.dot(back);distance=Math.max(distance,depth+Math.abs(d.dot(right))*width/(usableW*tanH),depth+Math.abs(d.dot(up))*height/(usableH*tanV),depth+camera.near+1);}
  camera.position.copy(target).addScaledVector(back,distance*1.02);camera.lookAt(target);
}
export function createSetupCamera({surface,scene,actorId,content}){
  let settings={mode:'follow',zoom:1},bounds=null,active=false,retired=false;
  const endpoint={prepare(next,{signal}){abort(signal);if(!['follow','overview'].includes(next.mode)||!Number.isFinite(next.zoom)||next.zoom<.7||next.zoom>1.5)throw Error('CAMERA_SETTINGS: choose a supported view/zoom.');const staged=plain(next);let disposed=false;
    return {commit(){if(disposed||retired)throw Error('Camera stage retired before acceptance.');settings=staged;},dispose(){disposed=true;}};}};
  return Object.freeze({endpoint,bounds:{publish(value){bounds=plain(value);}},activate(){active=true;},
    draw(){if(!active||retired)return;const {camera,canvas}=surface,r=canvas.getBoundingClientRect();surface.resize?.();const width=Math.max(1,r.width),height=Math.max(1,r.height);camera.aspect=width/height;
      const state=scene.read(actorId),p=state.position,zoom=settings.zoom,frame=settings.mode==='follow'?roadCameraFrame(state):null;
      if(settings.mode==='overview'){const w=content?.world?.widthM||240,d=content?.world?.depthM||180;camera.position.set(w/2,Math.max(w,d)*.9/zoom,d*1.3);camera.lookAt(w/2,0,d/2);}
      else if(frame)followRoadVehicle(camera,frame,zoom,width,height,bounds?.safe);
      else{camera.position.set(p.x+7/zoom,p.h+11/zoom,p.y+12/zoom);camera.lookAt(p.x,p.h+.9,p.y);}
      camera.clearViewOffset();const safe=bounds?.safe;
      if(safe&&safe.width>0&&safe.height>0){const cx=safe.x+safe.width/2-r.x,cy=safe.y+safe.height/2-r.y;camera.setViewOffset(width,height,width/2-cx,height/2-cy,width,height);}
      camera.updateProjectionMatrix();camera.updateMatrixWorld();},
    read:()=>({settings:plain(settings),bounds:bounds?plain(bounds):null}),dispose(){active=false;retired=true;}});
}
