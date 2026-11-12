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
  try{for(const surface of world.read().world.surfaces)box(surface.bounds,surface.supports?ground:solid);for(const door of world.read().interactions.doors)doors.set(door.id,box(door.closedBounds,leaf));}
  catch(error){resources.forEach(r=>r.dispose());renderer.dispose();throw error;}
  return Object.freeze({kind:'owned-player-surface',element,canvas,renderer,scene,camera,
    resize(){const r=canvas.getBoundingClientRect(),width=Math.max(1,r.width),height=Math.max(1,r.height),ratio=renderer.getPixelRatio();if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio))renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();return {width,height};},
    draw(){if(retired)return;for(const door of world.read().interactions.doors){const mesh=doors.get(door.id),b=door.open?door.openBounds:door.closedBounds;mesh.visible=!!b;if(b)mesh.position.set((b.min.x+b.max.x)/2,(b.min.h+b.max.h)/2,(b.min.y+b.max.y)/2);}renderer.render(scene,camera);},
    dispose(){if(retired)return;retired=true;const errors=[];for(const close of [()=>element.remove(),...resources.map(r=>()=>r.dispose()),()=>renderer.dispose()])try{close();}catch(error){errors.push(error);}scene.clear();if(errors.length)throw new AggregateError(errors,'Owned surface cleanup failed.');}});
}

export function createSetupCamera({surface,scene,actorId,content}){
  let settings={mode:'follow',zoom:1},bounds=null,active=false,retired=false;
  const endpoint={prepare(next,{signal}){abort(signal);if(!['follow','overview'].includes(next.mode)||!Number.isFinite(next.zoom)||next.zoom<.7||next.zoom>1.5)throw Error('CAMERA_SETTINGS: choose a supported view/zoom.');const staged=plain(next);let disposed=false;
    return {commit(){if(disposed||retired)throw Error('Camera stage retired before acceptance.');settings=staged;},dispose(){disposed=true;}};}};
  return Object.freeze({endpoint,bounds:{publish(value){bounds=plain(value);}},activate(){active=true;},
    draw(){if(!active||retired)return;const {camera,canvas}=surface,r=canvas.getBoundingClientRect();surface.resize?.();const width=Math.max(1,r.width),height=Math.max(1,r.height);camera.aspect=width/height;
      const p=scene.read(actorId).position,zoom=settings.zoom;
      if(settings.mode==='overview'){const w=content?.world?.widthM||240,d=content?.world?.depthM||180;camera.position.set(w/2,Math.max(w,d)*.9/zoom,d*1.3);camera.lookAt(w/2,0,d/2);}
      else{camera.position.set(p.x+7/zoom,p.h+11/zoom,p.y+12/zoom);camera.lookAt(p.x,p.h+.9,p.y);}
      camera.clearViewOffset();const safe=bounds?.safe;
      if(safe&&safe.width>0&&safe.height>0){const cx=safe.x+safe.width/2-r.x,cy=safe.y+safe.height/2-r.y;camera.setViewOffset(width,height,width/2-cx,height/2-cy,width,height);}
      camera.updateProjectionMatrix();camera.updateMatrixWorld();},
    read:()=>({settings:plain(settings),bounds:bounds?plain(bounds):null}),dispose(){active=false;retired=true;}});
}
