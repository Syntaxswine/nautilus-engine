// Farmyard UI adaptation: 251bf8094b5f9ebe44208443084c1a6d6658512a.
// Original source attribution and hashes: docs/ui/grenade-controls.sources.json.
// Optional borrowed-scene overlay; no actor, renderer, game clock or authority.
export function createGrenadeOverlay(THREE,{scene,cameraFrame}={}){
 if(!THREE?.Group||!THREE?.BufferGeometry||!THREE?.Line||!THREE?.Mesh||!scene?.add||typeof cameraFrame!=='function')throw Error('Supply host Three, a borrowed scene and the source-exact camera frame helper.');
 const root=new THREE.Group();root.name='grenade-preview';scene.add(root);
 const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xf4c77a,transparent:true,opacity:.9,depthTest:false}));
 const area=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0xf4c77a,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
 const ring=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xf4c77a,transparent:true,opacity:.65,depthTest:false}));
 const marker=new THREE.Mesh(new THREE.RingGeometry(.36,.45,32),new THREE.MeshBasicMaterial({color:0xf4c77a,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;
 root.add(line,area,ring,marker);root.visible=false;let disposed=false,snapshot=null;
 const validPoint=point=>!!point&&Number.isFinite(point.x)&&Number.isFinite(point.y);
 const replace=(object,geometry)=>{object.geometry.dispose();object.geometry=geometry;};
 const vector=point=>new THREE.Vector3(point.x,point.z||0,point.y);
 function clear(){if(disposed)return;root.visible=false;snapshot=null;}
 return Object.freeze({
  root,
  update({actor,point,preview}={}){
   if(disposed)throw Error('Grenade overlay is disposed.');
   clear();
   // Compatibility refusals may deliberately omit unsupported geometry.
   if(!validPoint(actor)||!validPoint(point)||!preview||!Array.isArray(preview.trajectory)||preview.trajectory.length<2||!Array.isArray(preview.footprint)||!Number.isFinite(preview.blast)||preview.blast<=0)return false;
   const trajectory=preview.trajectory.map(value=>{if(!validPoint(value)||!Number.isFinite(value.z))throw Error('Preview trajectory needs finite x/y/z coordinates.');return {...value};});
   const footprint=preview.footprint.map(value=>{if(!validPoint(value))throw Error('Preview footprint needs finite x/y coordinates.');return {...value};});
   const color=!preview.ok||preview.selfDanger?0xf08068:0xf4c77a;for(const object of [line,area,ring,marker])object.material.color.setHex(color);
   replace(line,new THREE.BufferGeometry().setFromPoints(trajectory.map(vector)));
   const vertices=[];for(let index=1;index<footprint.length;index++)vertices.push(point.x,.045,point.y,footprint[index-1].x,.045,footprint[index-1].y,footprint[index].x,.045,footprint[index].y);
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));replace(area,geometry);area.visible=vertices.length>0;
   const perimeter=[];for(let index=0;index<=64;index++){const angle=index/64*Math.PI*2;perimeter.push(new THREE.Vector3(point.x+Math.cos(angle)*preview.blast,.05,point.y+Math.sin(angle)*preview.blast));}replace(ring,new THREE.BufferGeometry().setFromPoints(perimeter));marker.position.set(point.x,.035,point.y);
   snapshot={actor:{x:actor.x,y:actor.y},point:{...point},trajectory,blast:preview.blast};root.visible=true;return true;
  },
  frame(viewport,minimumSpan){
   if(disposed)throw Error('Grenade overlay is disposed.');if(!snapshot)return null;
   const points=snapshot.trajectory.map(value=>({...value})),actor=snapshot.actor;points.push({x:actor.x,y:actor.y,z:0},{x:actor.x,y:actor.y,z:1.8});
   for(let index=0;index<16;index++){const angle=index/16*Math.PI*2;points.push({x:snapshot.point.x+Math.cos(angle)*snapshot.blast,y:snapshot.point.y+Math.sin(angle)*snapshot.blast,z:0});}
   return cameraFrame(points,viewport,minimumSpan);
  },
  clear,
  dispose(){if(disposed)return;disposed=true;snapshot=null;root.removeFromParent();for(const object of [line,area,ring,marker]){object.geometry.dispose();object.material.dispose();}}
 });
}
