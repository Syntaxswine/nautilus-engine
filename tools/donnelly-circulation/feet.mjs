// Read-only browser observation of actual skinned vertices against rendered boxes.
export function observeFeet(api,parts){
 api.surface.scene.updateMatrixWorld(true);const feet=[];
 api.surface.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let p=mesh;p;p=p.parent)if(!p.visible)return;mesh.skeleton.update();const hoofs=new Set(mesh.skeleton.bones.flatMap((b,i)=>b.name.startsWith('hoof')?[i]:[])),pos=mesh.geometry.attributes.position,skin=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;if(!hoofs.size||!skin||!weight)return;const groups=new Map();
  for(let i=0;i<pos.count;i++){let bone=-1;for(let j=0;j<4;j++)if(hoofs.has(skin.array[i*4+j])&&weight.array[i*4+j]>.8)bone=skin.array[i*4+j];if(bone<0)continue;const p=mesh.position.clone().fromBufferAttribute(pos,i);mesh.applyBoneTransform(i,p);mesh.localToWorld(p);if(!groups.has(bone))groups.set(bone,[]);groups.get(bone).push({x:p.x,y:p.y,z:p.z});}
  for(const [bone,points]of groups){let maxPenetration=-Infinity;for(const p of points){const h=Math.max(0,...parts.filter(s=>s.support&&p.x>=Math.min(...s.points.map(q=>q[0]))&&p.x<=Math.max(...s.points.map(q=>q[0]))&&p.z>=Math.min(...s.points.map(q=>q[1]))&&p.z<=Math.max(...s.points.map(q=>q[1]))).map(s=>s.topH));maxPenetration=Math.max(maxPenetration,h-p.y);}feet.push({bone:mesh.skeleton.bones[bone].name,vertices:points.length,minY:Math.min(...points.map(p=>p.y)),maxPenetration});}
 });
 const a=api.world.read();return {actor:a.actor,travel:a.travel,resources:a.resources,context:api.setup.readControls().context.token,feet,maxPenetration:Math.max(0,...feet.map(f=>f.maxPenetration)),notice:document.querySelector('.pui-notification')?.textContent||''};
}
export function nativeBones(api){const values=[];api.surface.scene.getObjectByName('Native actor player')?.traverse(b=>{if(b.isBone)values.push([b.name,...b.quaternion.toArray()]);});return values;}
