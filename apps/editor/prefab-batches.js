// Bake unchanged native vertex transforms into shared material batches. No source
// geometry, dimensions, UVs or material definitions are edited.
export function batchPrefab(T,source) {
  source.root.updateMatrixWorld(true);
  const groups=new Map(),normalMatrix=new T.Matrix3(),p=new T.Vector3(),n=new T.Vector3();
  source.root.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;
    const chain=[];let node=mesh;while(node!==source.root){chain.unshift(node);node=node.parent;}
    // Native floor/props, roofs and ornament have independent visibility. Walls
    // also retain a separate toggle, without fragmenting each metre-long panel.
    const scope=chain.slice(0,chain[0]?.name.startsWith('Level ')?2:1),wall=chain.some(node=>node.name.startsWith('wall:'));
    const geometry=mesh.geometry,attributes=geometry.attributes,index=geometry.index,total=index?index.count:attributes.position.count;
    const faces=Array.isArray(mesh.material)?geometry.groups:[{start:0,count:total,materialIndex:0}];
    if(!faces.length)throw Error('Native multi-material geometry must declare its face groups.');
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    for(const face of faces){
      const material=Array.isArray(mesh.material)?mesh.material[face.materialIndex]:mesh.material;
      const key=scope.map(node=>node.uuid).join('/')+':'+wall+':'+material.uuid;
      if(!groups.has(key))groups.set(key,{scope,wall,material,position:[],normal:[],uv:[],grossUV:[]});
      const out=groups.get(key),start=Math.max(face.start,geometry.drawRange.start),end=Math.min(face.start+face.count,geometry.drawRange.start+geometry.drawRange.count,total);
      for(let i=start;i<end;i++) {
        const v=index?index.getX(i):i;p.fromBufferAttribute(attributes.position,v).applyMatrix4(mesh.matrixWorld);out.position.push(...p.toArray());
        n.fromBufferAttribute(attributes.normal,v).applyNormalMatrix(normalMatrix);out.normal.push(...n.toArray());
        for(const name of ['uv','grossUV'])out[name].push(attributes[name]?.getX(v)||0,attributes[name]?.getY(v)||0);
      }
    }
  });
  const root=new T.Group(),records=[];
  for(const group of groups.values()) {
    const geometry=new T.BufferGeometry();for(const name of ['position','normal','uv','grossUV'])geometry.setAttribute(name,new T.Float32BufferAttribute(group[name],['position','normal'].includes(name)?3:2));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new T.Mesh(geometry,group.material);mesh.name=source.house.id+' · '+group.material.name;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
    records.push({mesh,scope:group.scope,wall:group.wall});
  }
  function sync({walls=true}={}) {for(const record of records)record.mesh.visible=record.scope.every(node=>node.visible)&&(walls||!record.wall);}
  sync();
  return {root,records,sync,dispose(){root.removeFromParent();for(const {mesh}of records)mesh.geometry.dispose();root.clear();}};
}
