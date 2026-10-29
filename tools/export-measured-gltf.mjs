// Standard glTF export adapted from reviewed artist commit e5abac574ccf7c9d2cf3839b20f32dc6e09c525e.
// Bakes atlas UVs and reflects V to the glTF upper-left image convention.
export function exportMeasuredGltf(model){const chunks=[],bufferViews=[],accessors=[],meshes=[],nodes=[],materials=[],materialIds=new Map();let byteLength=0;
  const view=array=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),index=bufferViews.length;bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:bytes.length});chunks.push(bytes);byteLength+=bytes.length;return index;};
  const accessor=(array,type,count,componentType=5126,bounds=false)=>{const a={bufferView:view(array),componentType,type,count};if(bounds){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {a.min[i%3]=Math.min(a.min[i%3],array[i]);a.max[i%3]=Math.max(a.max[i%3],array[i]);}}const index=accessors.length;accessors.push(a);return index;};
  for(const[id,m]of model.materials){materialIds.set(m.uuid,materials.length);materials.push({name:id,pbrMetallicRoughness:{baseColorFactor:[...m.color.toArray(),m.opacity],roughnessFactor:m.roughness,metallicFactor:m.metalness,...(id==='glass'?{}:{baseColorTexture:{index:id==='granite'?1:id==='felt'?2:0}})},...(id==='glass'?{alphaMode:'BLEND',doubleSided:false}:{})});}
  function node(object){object.updateMatrix();const index=nodes.length,n={name:object.name,matrix:object.matrix.toArray(),extras:object.userData};nodes.push(n);
    if(object.isMesh){const geometry=object.geometry,p=geometry.attributes.position,norm=geometry.attributes.normal,uv=geometry.attributes.uv,map=new Map(),pos=[],normal=[],tex=[],indices=[];
      // glTF's UV origin is the image's upper-left. The source Three textures
      // use flipY=true, so reflect V for standard flipY=false glTF readers.
      for(let i=0;i<p.count;i++){const values=[p.getX(i),p.getY(i),p.getZ(i),norm.getX(i),norm.getY(i),norm.getZ(i),uv.getX(i),uv.getY(i)],key=values.join(',');let v=map.get(key);if(v===undefined){v=pos.length/3;map.set(key,v);pos.push(...values.slice(0,3));normal.push(...values.slice(3,6));tex.push(values[6],1-values[7]);}indices.push(v);}
      const attrs={POSITION:accessor(new Float32Array(pos),'VEC3',pos.length/3,5126,true),NORMAL:accessor(new Float32Array(normal),'VEC3',normal.length/3),TEXCOORD_0:accessor(new Float32Array(tex),'VEC2',tex.length/2)};
      n.mesh=meshes.length;meshes.push({name:object.name,primitives:[{attributes:attrs,indices:accessor(new Uint32Array(indices),'SCALAR',indices.length,5125),material:materialIds.get(object.material.uuid),mode:4}]});
    }
    if(object.children.length)n.children=object.children.map(node);return index;
  }
  const rootNode=node(model.root),json={asset:{version:'2.0',generator:'Nautilus measured building art v1; baked atlas UV interchange'},scene:0,scenes:[{nodes:[rootNode]}],nodes,meshes,materials,
    buffers:[{uri:model.building.id+'.bin',byteLength}],bufferViews,accessors,images:[{uri:'../../buildings/painted-materials-v2.png'},{uri:'../painted-granite-v1.png'},{uri:'../painted-roof-felt-v1.png'}],
    samplers:[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071},{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],textures:[{source:0,sampler:0},{source:1,sampler:1},{source:2,sampler:1}],
    extras:{collection:model.building.collection,assetId:model.building.id,contract:model.building.contract,sourceReferences:model.building.sourceId,consumerIntegrated:false,texturePolicy:'Standard glTF uses atlas-clipped tessellation; compact engine meshes use metre UVs and the supplied adapter.'}};
  return {json,bin:Buffer.concat(chunks)};
}
