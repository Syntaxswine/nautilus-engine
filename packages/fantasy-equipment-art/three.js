import {equipmentSpec,equipmentFinish,equipmentPose} from './specs.js';
import {buildEquipmentGeometry} from './geometry.js';
import {equipmentPaintPixels,PAINT_SIZE} from './paint-data.js';

const MATERIALS={steel:{roughness:.48,metalness:.62},iron:{roughness:.77,metalness:.30},wood:{roughness:.88,metalness:0},leather:{roughness:.94,metalness:0},brass:{roughness:.53,metalness:.57},teal:{roughness:.85,metalness:0},cloth:{roughness:.95,metalness:0},red:{roughness:.87,metalness:0}};
// One native dispatch per resource; a bad observer cannot skip the renderer's
// release hook. This owner never traverses/disposes resources supplied by a host.
function release(resource,errors){const descriptor=Object.getOwnPropertyDescriptor(resource,'dispatchEvent'),inherited=resource.dispatchEvent;let sent=false;
 function dispatch(event){if(event.type!=='dispose')return inherited.call(resource,event);if(sent)return;sent=true;event.target=resource;try{for(const listener of [...(resource._listeners?.dispose||[])])try{listener.call(resource,event);}catch(error){errors.push(error);}}finally{event.target=null;if(resource._listeners)delete resource._listeners.dispose;}}
 try{resource.dispatchEvent=dispatch;try{resource.dispose();}catch(error){errors.push(error);}}finally{if(descriptor)Object.defineProperty(resource,'dispatchEvent',descriptor);else delete resource.dispatchEvent;}
}
export function createFantasyEquipmentModel(THREE,options){
 if(!THREE||['Group','Object3D','Mesh','BufferGeometry','Float32BufferAttribute','MeshStandardMaterial','DataTexture'].some(k=>typeof THREE[k]!=='function'))throw new TypeError('EQUIPMENT_THREE: supply the host Three namespace.');
 if(!options||Object.getPrototypeOf(options)!==Object.prototype||Object.keys(options).some(k=>!['id','finish'].includes(k)))throw new TypeError('EQUIPMENT_OPTIONS: expected {id,finish?}.');
 const spec=equipmentSpec(options.id),finish=equipmentFinish(spec,options.finish),root=new THREE.Group(),sockets={},owned=[],meshes=new Map(),groups=new Map(),materials=new Map();
 let retired=false,pose={draw:0,loaded:false};root.name='fantasy-equipment:'+spec.id;root.userData={id:spec.id,appearanceOnly:true,units:'metres',front:'+Z'};
 const own=r=>{owned.push(r);return r;};
 function dispose(){if(retired)return;retired=true;const resources=owned.splice(0),errors=[];meshes.clear();groups.clear();materials.clear();root.visible=false;try{root.removeFromParent();}catch(error){errors.push(error);}for(const r of resources.reverse())release(r,errors);if(errors.length)throw new AggregateError(errors,'EQUIPMENT_DISPOSE: owned cleanup completed with observer failures.');}
 try{
  const texture=own(new THREE.DataTexture(equipmentPaintPixels(),PAINT_SIZE,PAINT_SIZE,THREE.RGBAFormat,THREE.UnsignedByteType));texture.name='Original Nautilus equipment brush atlas';texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
  function material(id){if(!materials.has(id)){const properties=id==='glass'?{color:0xb5d2d1,roughness:.23,metalness:.05,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}:{color:0xffffff,map:texture,...MATERIALS[id],...(id==='cloth'?{side:THREE.DoubleSide}:{})};const m=own(new THREE.MeshStandardMaterial(properties));m.name='equipment:'+id;materials.set(id,m);}return materials.get(id);}
  const initial=buildEquipmentGeometry(spec.id,{finish});
  for(const b of initial.batches){if(!groups.has(b.part)){const group=new THREE.Group();group.name=b.part;groups.set(b.part,group);root.add(group);}const geometry=own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(b.uvs,2));geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material(b.material));mesh.name=b.key;mesh.castShadow=b.material!=='glass';mesh.receiveShadow=true;groups.get(b.part).add(mesh);meshes.set(b.key,mesh);}
  for(const [name,position] of Object.entries(initial.anchors)){const node=new THREE.Object3D();node.name=name;node.position.fromArray(position);node.userData.appearanceOnly=true;sockets[name]=node;root.add(node);}
  function apply(data){for(const b of data.batches){if(b.part==='static')continue;const mesh=meshes.get(b.key);for(const [name,values] of [['position',b.positions],['normal',b.normals]]){const a=mesh.geometry.getAttribute(name);a.array.set(values);a.needsUpdate=true;}mesh.geometry.computeBoundingSphere();}for(const [name,position] of Object.entries(data.anchors))sockets[name].position.fromArray(position);const projectile=groups.get('projectile');if(projectile){projectile.visible=data.loaded;projectile.position.fromArray(data.projectilePosition);}root.updateMatrixWorld(true);}
  apply(initial);
  return {root,sockets,setArticulation(input={}){if(retired)throw new Error('EQUIPMENT_RETIRED: create a fresh model.');const next=equipmentPose(spec,input,pose);if(spec.ranged){const data=buildEquipmentGeometry(spec.id,{...next,finish});apply(data);}pose=next;return spec.ranged?{...pose}:{};},dispose};
 }catch(primary){try{dispose();}catch(cleanup){throw new AggregateError([primary,cleanup],'EQUIPMENT_PREPARE: allocation/rollback failed.',{cause:primary});}throw primary;}
}
