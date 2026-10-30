// Artist preview provider. Borrow the host Three namespace and existing atlas.
import {DEFINITIONS,definition} from './kit.js';
import {boxGeometryData} from './geometry.js';
export function createKitLibrary(T,{atlas=null,lod='game',grey=false}={}) {
  if(!T?.BufferGeometry||!T?.Group)throw Error('Supply the existing host Three namespace.');
  const geometries=new Map(),materials=new Map(),models=new Set();let disposed=false;
  function meshFor(def,node,materialOverride) {
    const materialId=materialOverride||node.material,key=def.id+'/'+node.id+'/'+materialId;
    if(!geometries.has(key)){
      const data=boxGeometryData({...node,material:materialId},{lod}),geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(data.normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(data.uvs,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.set(key,geometry);
    }
    if(!materials.has(materialId))materials.set(materialId,new T.MeshStandardMaterial({map:grey?null:atlas,color:grey?0xaaaaa0:materialId==='wood'?0xc6b291:0xffffff,roughness:1}));
    const mesh=new T.Mesh(geometries.get(key),materials.get(materialId));mesh.castShadow=mesh.receiveShadow=true;return mesh;
  }
  function createModel(recipe) {
    if(disposed)throw Error('Native kit library was disposed.');
    const root=new T.Group(),bindings=[],doors=new Map(),instanceId=recipe.instanceId??recipe.id;root.name=instanceId;root.userData={recipeId:recipe.id,instanceId,kit:recipe.kitId,contentVersion:recipe.contentVersion,playable:false};
    try {
      for(const part of recipe.parts){
        const def=definition(part.definitionId),group=new T.Group();group.name=part.id;group.position.fromArray(part.position);group.rotation.y=part.quarterTurns*Math.PI/2;group.userData={partId:part.id,floorId:part.floor,presentationRole:part.role??null,kind:def.kind};root.add(group);
        const bind=(node,parent=group)=>{const mesh=meshFor(def,node,part.materialOverride);mesh.name=node.id;mesh.userData={assemblyInstanceId:instanceId,partId:part.id,nodeId:node.id,definitionId:def.id,floorId:part.floor,role:node.role};parent.add(mesh);bindings.push({assemblyInstanceId:instanceId,partId:part.id,nodeId:node.id,definitionId:def.id,object:mesh});};
        def.nodes.forEach(node=>bind(node));
        if(def.door){const pivot=new T.Group();pivot.name=def.door.pivotNode;pivot.position.fromArray(def.door.hinge);pivot.userData={assemblyInstanceId:instanceId,partId:part.id,nodeId:def.door.pivotNode,definitionId:def.id};group.add(pivot);bind(def.door.leaf,pivot);bind(def.door.handle,pivot);doors.set(part.id,{pivot,definition:def.door});bindings.push({assemblyInstanceId:instanceId,partId:part.id,nodeId:def.door.pivotNode,definitionId:def.id,object:pivot});}
      }
      root.updateMatrixWorld(true);
      let ended=false;
      const model={root,bindings,
        setDoorOpen(partId,open){if(ended)throw Error('Native kit model was disposed.');const door=doors.get(partId);if(!door)throw Error('Unknown native door part: '+partId);if(typeof open!=='boolean')throw Error('Supply committed boolean presentation state.');door.pivot.rotation.y=open?door.definition.openYawRad:door.definition.closedYawRad;root.updateMatrixWorld(true);},
        setView({roof=true,cutaway=false,maximumFloor='upper'}={}){if(ended)throw Error('Native kit model was disposed.');for(const part of root.children){part.visible=(roof||part.userData.presentationRole!=='roof')&&(!cutaway||part.userData.kind!=='wall'&&part.userData.kind!=='door-bay')&&(maximumFloor!=='ground'||part.userData.floorId==='ground');}},
        dispose(){if(ended)return;ended=true;root.removeFromParent();root.clear();bindings.length=0;doors.clear();models.delete(model);}};
      models.add(model);return model;
    }catch(error){root.clear();throw error;}
  }
  return {createModel,definitions:DEFINITIONS.map(part=>part.id),
    diagnostics:()=>({models:models.size,ownedGeometries:geometries.size,ownedMaterials:materials.size,atlasBorrowed:true,lod}),
    dispose(){if(disposed)return;disposed=true;for(const model of [...models])model.dispose();for(const geometry of geometries.values())geometry.dispose();for(const material of materials.values())material.dispose();geometries.clear();materials.clear();}};
}
