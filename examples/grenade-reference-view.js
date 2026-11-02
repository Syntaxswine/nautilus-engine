import * as THREE from '@nautilus-engine/map-core/render-effects/three';
import {createGrenadeOverlay} from '@nautilus-engine/map-core/grenades/view';
// The example owns this renderer. The public overlay/native provider borrow it.
export function createReferenceView(container,{world,cameraFrame,fieldCamera,onError=()=>{}}){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x23372b);const camera=new THREE.OrthographicCamera(),objects=new THREE.Group();scene.add(objects);
 scene.add(new THREE.HemisphereLight(0xffefd1,0x45614b,2.4));const sun=new THREE.DirectionalLight(0xffe3ac,2.6);sun.position.set(-3,12,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 const resources=[],own=value=>(resources.push(value),value),material=color=>own(new THREE.MeshStandardMaterial({color,roughness:.95}));
 const bounds=world.bounds,ground=new THREE.Mesh(own(new THREE.BoxGeometry(bounds.w,.12,bounds.h)),material(0x536344));ground.position.set(bounds.x+bounds.w/2-.5,-.06,bounds.y+bounds.h/2-.5);ground.receiveShadow=true;objects.add(ground);
 const points=[],x0=bounds.x-.5,y0=bounds.y-.5;for(let x=0;x<=bounds.w;x++)points.push(new THREE.Vector3(x0+x,.006,y0),new THREE.Vector3(x0+x,.006,y0+bounds.h));for(let y=0;y<=bounds.h;y++)points.push(new THREE.Vector3(x0,.006,y0+y),new THREE.Vector3(x0+bounds.w,.006,y0+y));const grid=new THREE.LineSegments(own(new THREE.BufferGeometry().setFromPoints(points)),own(new THREE.LineBasicMaterial({color:0x7b8960,transparent:true,opacity:.45})));objects.add(grid);
 for(const box of world.boxes){const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(box.x1-box.x0,box.height-box.z0,box.y1-box.y0)),material(0x8a8065));mesh.position.set((box.x0+box.x1)/2,(box.z0+box.height)/2,(box.y0+box.y1)/2);mesh.castShadow=mesh.receiveShadow=true;objects.add(mesh);}
 const effect=new THREE.Group();scene.add(effect);let effectNodes=[];const markers=new Map();
 function clearEffect(){for(const object of effectNodes){object.removeFromParent();object.geometry.dispose();object.material.dispose();}effectNodes=[];}
 const overlay=createGrenadeOverlay(THREE,{scene,cameraFrame}),target=new THREE.Vector3(bounds.x+bounds.w/2,0,bounds.y+bounds.h/2),offset=new THREE.Vector3(fieldCamera.x,fieldCamera.y,fieldCamera.z);let span=18,baseSpan=18,aiming=false,linger=0,lastFrame=null,mode='field',sideReview=false,inspectionFrame=null,disposed=false,draws=0;
 const lost=event=>{event.preventDefault();if(!disposed)onError(Error('The field view lost its graphics context. Retry the view to keep playing.'));};renderer.domElement.addEventListener('webglcontextlost',lost);
 const viewport=()=>({width:container.clientWidth,height:container.clientHeight,left:16,right:container.clientWidth-16,top:80,bottom:container.clientHeight-16});
 function resize(){if(disposed)return;const width=container.clientWidth,height=container.clientHeight;if(width<1||height<1)return;renderer.setSize(width,height,false);camera.left=-span*width/height/2;camera.right=span*width/height/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.01;camera.far=500;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();
 return {renderer,scene,camera,
  add(root){if(disposed)throw Error('Reference view is disposed.');scene.add(root);},
  beginAim(){baseSpan=span;aiming=true;linger=0;lastFrame=null;},
  preview(value){if(disposed)return;overlay.update(value);lastFrame=overlay.frame(viewport(),baseSpan);},
  endAim({linger:milliseconds=0}={}){aiming=false;linger=milliseconds/1000;overlay.clear();if(!linger)lastFrame=null;},
  cameraMode(value){mode=value;},
  sideInspection(value){sideReview=!!value;},
  fitInspection(points){inspectionFrame=points?cameraFrame(points,viewport(),8):null;},
  syncActors(actors){for(const actor of actors){let marker=markers.get(actor.id);if(!marker){marker=new THREE.Mesh(own(new THREE.RingGeometry(.31,.38,32)),own(new THREE.MeshBasicMaterial({color:actor.team==='squad'?0xe2c27a:0xdd8a62,side:THREE.DoubleSide,transparent:true,opacity:.9})));marker.rotation.x=-Math.PI/2;objects.add(marker);markers.set(actor.id,marker);}marker.position.set(actor.x,.025,actor.y);marker.material.color.setHex(actor.hp<=0?0x766e60:actor.team==='squad'?0xe2c27a:0xdd8a62);}},
  startEffect(presentation,{arc=true}={}){clearEffect();const event=presentation.sequence[0],line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(presentation.trajectory.map(point=>new THREE.Vector3(point.x,point.z,point.y))),new THREE.LineBasicMaterial({color:0xf6d68c,transparent:true,opacity:.9})),ring=new THREE.Mesh(new THREE.RingGeometry(event.blast-.07,event.blast,64),new THREE.MeshBasicMaterial({color:0xf4a568,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(event.bx,.07,event.by);if(arc){effect.add(line,ring);effectNodes=[line,ring];}else{line.geometry.dispose();line.material.dispose();effect.add(ring);effectNodes=[ring];}},
  effectTime(elapsed){for(const object of effectNodes){object.visible=elapsed>=0&&elapsed<.7;object.material.opacity=Math.max(0,1-elapsed/.7);}if(elapsed>=.7)clearEffect();},
  clearEffect,
  render({seconds=0,actor}={}){if(disposed)return;const dt=Math.max(0,Number.isFinite(seconds)?seconds:0);if(linger>0){linger=Math.max(0,linger-dt);if(!linger)lastFrame=null;}const frame=aiming?overlay.frame(viewport(),baseSpan):lastFrame;let desiredSpan=baseSpan,desiredTarget=new THREE.Vector3(actor?.x??target.x,0,actor?.y??target.z);if(frame){desiredSpan=frame.span;desiredTarget.set(frame.target.x,0,frame.target.y);}if(mode==='actor'&&actor){desiredSpan=3.1;desiredTarget.set(actor.x,.85,actor.y);}if(sideReview&&actor){desiredSpan=1.9;desiredTarget.set(actor.x,1.15,actor.y);}if(inspectionFrame){desiredSpan=inspectionFrame.span;desiredTarget.set(inspectionFrame.target.x,0,inspectionFrame.target.y);}target.lerp(desiredTarget,.14);span+=(desiredSpan-span)*.14;camera.position.copy(target).add(sideReview?new THREE.Vector3(0,3,14):offset);camera.lookAt(target);resize();renderer.render(scene,camera);draws++;},
  projection(points){return points.map(point=>{const value=new THREE.Vector3(point.x,point.z||0,point.y).project(camera);return {x:(value.x+1)*container.clientWidth/2,y:(1-value.y)*container.clientHeight/2,z:value.z};});},
  diagnostics(){return {draws,span,viewport:viewport(),memory:{...renderer.info.memory},calls:renderer.info.render.calls};},
  dispose(){if(disposed)return;disposed=true;observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);overlay.dispose();clearEffect();for(const resource of resources)resource.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
 };
}
