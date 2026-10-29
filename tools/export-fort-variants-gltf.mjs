// Standard glTF fork of fixed artist foundation 6d9dfeca; variant material closure and gate animations.
import {VARIANT_MATERIALS} from '../packages/fort-variants/geometry.js';
// Bakes atlas UVs and reflects V to the glTF upper-left image convention.
export function exportVariantGltf(model){const chunks=[],bufferViews=[],accessors=[],meshes=[],nodes=[],materials=[],materialIds=new Map(),animated=new Map();let byteLength=0;
  const view=array=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),index=bufferViews.length;bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:bytes.length});chunks.push(bytes);byteLength+=bytes.length;return index;};
  const accessor=(array,type,count,componentType=5126,bounds=false)=>{const a={bufferView:view(array),componentType,type,count};if(bounds){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {a.min[i%3]=Math.min(a.min[i%3],array[i]);a.max[i%3]=Math.max(a.max[i%3],array[i]);}}const index=accessors.length;accessors.push(a);return index;};
  for(const[id,m]of model.materials){materialIds.set(m.uuid,materials.length);materials.push({name:id,pbrMetallicRoughness:{baseColorFactor:[...m.color.toArray(),m.opacity],roughnessFactor:m.roughness,metallicFactor:m.metalness,...(VARIANT_MATERIALS[id].sheet===null?{}:{baseColorTexture:{index:VARIANT_MATERIALS[id].sheet==='era'?1:0}})},...(id==='glass'?{alphaMode:'BLEND',doubleSided:false}:{})});}
  function node(object){object.updateMatrix();const index=nodes.length,n={name:object.name,matrix:object.matrix.toArray(),extras:object.userData};nodes.push(n);
    if(object.userData.kind==='door-pivot'&&['gate','sally'].includes(object.userData.style)){delete n.matrix;n.translation=object.position.toArray();n.rotation=object.quaternion.toArray();n.scale=object.scale.toArray();const key=object.userData.openingId;if(!animated.has(key))animated.set(key,[]);animated.get(key).push({index,object});}
    if(object.isMesh){const geometry=object.geometry,p=geometry.attributes.position,norm=geometry.attributes.normal,uv=geometry.attributes.uv,map=new Map(),pos=[],normal=[],tex=[],indices=[];
      // glTF's UV origin is the image's upper-left. The source Three textures
      // use flipY=true, so reflect V for standard flipY=false glTF readers.
      for(let i=0;i<p.count;i++){const values=[p.getX(i),p.getY(i),p.getZ(i),norm.getX(i),norm.getY(i),norm.getZ(i),uv.getX(i),uv.getY(i)],key=values.join(',');let v=map.get(key);if(v===undefined){v=pos.length/3;map.set(key,v);pos.push(...values.slice(0,3));normal.push(...values.slice(3,6));tex.push(values[6],1-values[7]);}indices.push(v);}
      const attrs={POSITION:accessor(new Float32Array(pos),'VEC3',pos.length/3,5126,true),NORMAL:accessor(new Float32Array(normal),'VEC3',normal.length/3),TEXCOORD_0:accessor(new Float32Array(tex),'VEC2',tex.length/2)};
      n.mesh=meshes.length;meshes.push({name:object.name,primitives:[{attributes:attrs,indices:accessor(new Uint32Array(indices),'SCALAR',indices.length,5125),material:materialIds.get(object.material.uuid),mode:4}]});
    }
    if(object.children.length)n.children=object.children.map(node);return index;
  }
  const rootNode=node(model.root),json={asset:{version:'2.0',generator:'Nautilus original castle and cyclone fort variants v1; baked atlases and independent gate pivots'},scene:0,scenes:[{nodes:[rootNode]}],nodes,meshes,materials,
    buffers:[{uri:model.building.id+'.bin',byteLength}],bufferViews,accessors,images:[{uri:'../../buildings/painted-materials-v2.png'},{uri:'../painted-era-materials-v1.png'}],
    samplers:[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071},{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],textures:[{source:0,sampler:0},{source:1,sampler:0}],
    extras:{collection:model.building.collection,assetId:model.building.id,contract:model.building.contract,sourceReferences:model.building.sourceId,consumerIntegrated:false,texturePolicy:'Standard glTF uses atlas-clipped tessellation; compact engine meshes use metre UVs and the supplied adapter.'}};
  const animations=[];
  for(const [opening,leaves]of animated){
    const animation={name:opening+':open',samplers:[],channels:[],extras:{openingId:opening,meaning:'Independent paired leaves, closed to 90 degrees inward; reverse time to close.',durationSeconds:1}};
    const time=accessor(new Float32Array([0,1]),'SCALAR',2);accessors[time].min=[0];accessors[time].max=[1];
    for(const{index,object}of leaves){const a=object.userData.yaw,b=a+object.userData.swingSign*Math.PI/2,
      values=new Float32Array([0,Math.sin(a/2),0,Math.cos(a/2),0,Math.sin(b/2),0,Math.cos(b/2)]),output=accessor(values,'VEC4',2);
      animation.samplers.push({input:time,output,interpolation:'LINEAR'});animation.channels.push({sampler:animation.samplers.length-1,target:{node:index,path:'rotation'}});
    }animations.push(animation);
  }
  if(animations.length)json.animations=animations;
  json.buffers[0].byteLength=byteLength;
  return {json,bin:Buffer.concat(chunks)};
}
