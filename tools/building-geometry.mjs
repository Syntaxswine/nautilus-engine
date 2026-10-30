// Canonical digest of an original building model: what a viewer and a host can
// tell apart. It covers node order, types, names, visibility and local
// transforms; user data and each mesh's material settings; every attribute
// byte; bounds and the triangle count. It also covers the visibility of every
// node in each view the model's setView offers (roofs off, every floor's
// cutaway, every floor limit) and every door pivot with its doors open. Equal
// digests mean the renderer drew the same model, whatever its source text. The
// model is left exactly as it was found.
import {createHash} from 'node:crypto';
const sha256=data=>createHash('sha256').update(data).digest('hex');
const materialKey=m=>[m.type,m.name,m.color?.getHex(),!!m.map,m.transparent,m.opacity,m.side,m.roughness,m.metalness,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,m.depthWrite,m.depthTest,m.visible].join(',');
export function buildingDigest(model){
  const lines=[];
  model.root.traverse(node=>{
    const line=[node.type,node.name,node.visible,node.matrix.elements.join(','),JSON.stringify(node.userData)];
    if(node.isMesh){
      const geometry=node.geometry;
      for(const name of Object.keys(geometry.attributes).sort()){const a=geometry.attributes[name];line.push(name+':'+a.itemSize+':'+sha256(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)));}
      line.push('index:'+(geometry.index?sha256(Buffer.from(geometry.index.array.buffer)):'-'),'groups:'+JSON.stringify(geometry.groups),node.castShadow,node.receiveShadow,'material:'+[].concat(node.material).map(materialKey).join('+'));
    }
    lines.push(line.join(';'));
  });
  lines.push('triangles:'+model.triangles,'bounds:'+JSON.stringify(model.bounds));
  // View rules: the visibility of every node in each view.
  const nodes=[];model.root.traverse(node=>nodes.push(node));
  const before=nodes.map(node=>node.visible),levels=[...new Set(model.root.children.map(child=>child.userData.level??0))].sort((a,b)=>a-b);
  const views=[{roof:false},...levels.flatMap(level=>[{roof:false,cutaway:true,maxLevel:level},{maxLevel:level}])];
  for(const view of views){model.setView(view);lines.push('view '+JSON.stringify(view)+':'+nodes.map(node=>node.visible?1:0).join(''));}
  nodes.forEach((node,i)=>{node.visible=before[i];});
  // Door swing: every pivot's matrix with the doors open.
  model.setDoorsOpen(true);for(const pivot of model.doorRoots){pivot.updateMatrix();lines.push('open '+pivot.name+':'+pivot.matrix.elements.join(','));}
  model.setDoorsOpen(false);for(const pivot of model.doorRoots)pivot.updateMatrix();
  return sha256(lines.join('\n'));
}
export function buildingDigests(T,createBuildingModel,ids,lods=['game','authoring']){
  const digests={};
  for(const lod of lods)for(const id of ids){const model=createBuildingModel(T,id,{lod});try{digests[lod+':'+id]=buildingDigest(model);}finally{model.dispose();}}
  return digests;
}
