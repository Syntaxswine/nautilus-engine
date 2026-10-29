// Standard glTF 2.0 triangle buffers and independent TRS clips. No Three/DOM.
import {SILO_MATERIALS} from '../packages/silo/geometry.js';
export function exportSiloGLTF(data){
 if(data.uvMode!=='atlas')throw Error('Bake repeated UV seams before standard glTF export.');
 const chunks=[],bufferViews=[],accessors=[],nodes=[],meshes=[],materials=[],animations=[],materialIds=new Map();let bytes=0;
 function accessor(values,size,position=false,vertex=false){const array=new Float32Array(values),raw=Buffer.from(array.buffer,array.byteOffset,array.byteLength);while(bytes%4){chunks.push(Buffer.alloc(1));bytes++;}
  const view=bufferViews.length;bufferViews.push({buffer:0,byteOffset:bytes,byteLength:raw.byteLength,...(vertex?{target:34962}:{})});chunks.push(raw);bytes+=raw.byteLength;
  const item={bufferView:view,componentType:5126,count:values.length/size,type:{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[size]};
  if(position||size===1){item.min=Array(size).fill(Infinity);item.max=Array(size).fill(-Infinity);for(let i=0;i<array.length;i++){
   item.min[i%size]=Math.min(item.min[i%size],array[i]);item.max[i%size]=Math.max(item.max[i%size],array[i]);}}
  accessors.push(item);return accessors.length-1;
 }
 const used=new Set([...data.batches,...data.rigs.flatMap(r=>r.batches)].map(b=>b.material));
 for(const [id,spec]of Object.entries(SILO_MATERIALS).filter(([id])=>used.has(id))){
  materialIds.set(id,materials.length);materials.push({name:id,pbrMetallicRoughness:{baseColorFactor:[...spec.color,1],metallicFactor:spec.metalness||0,roughnessFactor:spec.roughness,
   ...(spec.tile!==null?{baseColorTexture:{index:0}}:{})}});
 }
 nodes.push({name:data.asset.id,children:[],extras:{asset:data.asset,units:'metres',nativeToWorld:data.nativeToWorld,artistGeometry:true,consumerIntegrated:false}});
 function meshNode(batch){
  const name=[batch.zone,batch.kind,batch.level,batch.material,meshes.length].join('-'),index=nodes.length,uv=batch.uvs.map((v,i)=>i%2?1-v:v);
  nodes.push({name,mesh:meshes.length,extras:{zone:batch.zone,kind:batch.kind,level:batch.level,highLevel:batch.highLevel}});
  meshes.push({name,primitives:[{mode:4,material:materialIds.get(batch.material),attributes:{POSITION:accessor(batch.positions,3,true,true),NORMAL:accessor(batch.normals,3,false,true),...(SILO_MATERIALS[batch.material].tile!==null?{TEXCOORD_0:accessor(uv,2,false,true)}:{})}}]});return index;
 }
 for(const b of data.batches)nodes[0].children.push(meshNode(b));
 const quaternion=angle=>[0,Math.sin(angle/2),0,Math.cos(angle/2)];
 for(const rig of data.rigs){const index=nodes.length;
  nodes.push({name:rig.id,translation:rig.pivot,rotation:quaternion(rig.yaw),children:[],extras:{kind:rig.kind,level:rig.level,highLevel:rig.highLevel,maximum:rig.maximum,pose:'one-second normalized display clip, reversible; host owns clock and collision'}});nodes[0].children.push(index);
  for(const b of rig.batches)nodes[index].children.push(meshNode(b));
  const input=accessor([0,1],1),isDoor=rig.kind==='door',output=isDoor?accessor([...quaternion(rig.yaw),...quaternion(rig.yaw+Math.PI/2*rig.swingSign)],4):accessor([...rig.pivot,...rig.pivot.map((v,i)=>v+rig.travel[i])],3);
  animations.push({name:rig.id+(rig.kind==='platform'?'-retract':'-open'),samplers:[{input,output,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:index,path:isDoor?'rotation':'translation'}}],extras:{rigId:rig.id,independent:true,presentationOnly:true}});
 }
 const bin=Buffer.concat(chunks),gltf={asset:{version:'2.0',generator:'Nautilus original silo artist provider v1'},scene:0,scenes:[{nodes:[0]}],nodes,meshes,materials,...(animations.length?{animations}:{}),
  buffers:[{uri:data.asset.id+'.bin',byteLength:bytes}],bufferViews,accessors,
  images:[{uri:'../painted-silo-materials-v1.png'}],samplers:[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}],textures:[{source:0,sampler:0}],
  extras:{assetId:data.asset.id,units:'metres',nativeSignedHeights:true,nativeToWorld:data.nativeToWorld,consumerIntegrated:false,
   geometryStatus:'Artist annular/polygon geometry; current AABB world provider is not a curved gameplay adapter.',uvConvention:'Native repeated seams baked to atlas, V reflected for standard glTF image convention.'}};
 return {gltf,bin};
}
