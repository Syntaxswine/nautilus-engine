// Canonical digest of an original building model: node order, types, names,
// visibility, local transforms, userData, catalogue material per mesh, bounds,
// triangle count and every attribute byte. Equal digests mean the renderer drew
// the same model, whatever its source text.
import {createHash} from 'node:crypto';
const sha256=data=>createHash('sha256').update(data).digest('hex');
export function buildingDigest(model){
  const lines=[];
  model.root.traverse(node=>{
    const line=[node.type,node.name,node.visible,node.matrix.elements.join(','),JSON.stringify(node.userData)];
    if(node.isMesh){
      const geometry=node.geometry;
      for(const name of Object.keys(geometry.attributes).sort()){const a=geometry.attributes[name];line.push(name+':'+a.itemSize+':'+sha256(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)));}
      line.push('index:'+(geometry.index?sha256(Buffer.from(geometry.index.array.buffer)):'-'),'groups:'+JSON.stringify(geometry.groups),node.castShadow,node.receiveShadow);
    }
    lines.push(line.join(';'));
  });
  lines.push('triangles:'+model.triangles,'bounds:'+JSON.stringify(model.bounds));
  return sha256(lines.join('\n'));
}
export function buildingDigests(T,createBuildingModel,ids,lods=['game','authoring']){
  const digests={};
  for(const lod of lods)for(const id of ids){const model=createBuildingModel(T,id,{lod});try{digests[lod+':'+id]=buildingDigest(model);}finally{model.dispose();}}
  return digests;
}
