import {CAPS,fail,integer} from './common.mjs';
import {typedArrayStorage,attributeArray} from './typed-array-storage.mjs';
const number=(v,label)=>{if(typeof v!=='number'||!Number.isFinite(v))fail('GEOMETRY_STATE_PROFILE',label);return Object.is(v,-0)?0:v;};
const ordinary=(v,label)=>{if(!v||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('GEOMETRY_STATE_PROFILE',label);return v;};
function entries(value,label,max){ordinary(value,label);const keys=Reflect.ownKeys(value);if(keys.length>max)fail('GEOMETRY_STATE_PROFILE',label);return keys.map(key=>{const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!d?.enumerable||!Object.hasOwn(d,'value'))fail('GEOMETRY_STATE_PROFILE',label);return [key,d.value];});}
function list(value,label){if(!Array.isArray(value)||value.length>CAPS.triangles)fail('GEOMETRY_STATE_PROFILE',label);const result=[];for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value'))fail('GEOMETRY_STATE_PROFILE',label);result.push(d.value);}return result;}
/** Pure observation of actual static shared-Three geometry. Never computes/mutates bounds or uploads. */
export function geometryState(THREE,geometry,{id,hashBytes}){
 if(!(geometry instanceof THREE.BufferGeometry)||Object.getPrototypeOf(geometry)!==THREE.BufferGeometry.prototype||geometry.isBufferGeometry!==true||geometry.isInstancedBufferGeometry||geometry.indirect!=null)fail('GEOMETRY_STATE_PROFILE','ordinary static BufferGeometry required');
 const attribute=(a,index=false)=>{
  if(!(a instanceof THREE.BufferAttribute)||a.isBufferAttribute!==true||a.isInterleavedBufferAttribute||a.isInstancedBufferAttribute||a.isGLBufferAttribute)fail('GEOMETRY_ATTRIBUTE_PROFILE','ordinary owned typed BufferAttribute required');
  const array=attributeArray(a),storage=typedArrayStorage(array),type=storage.brand;
  if(index&&!['Uint8Array','Uint16Array','Uint32Array'].includes(type))fail('GEOMETRY_ATTRIBUTE_PROFILE','supported typed storage required');
  const itemSize=integer(a.itemSize,'attribute item size',1,4),count=integer(a.count,'attribute count');
  if(storage.length/itemSize!==count||index&&itemSize!==1||typeof a.normalized!=='boolean')fail('GEOMETRY_ATTRIBUTE_PROFILE','attribute layout');
  const ranges=list(a.updateRanges,'attribute update ranges').map(r=>{ordinary(r,'attribute update range');return {start:integer(r.start,'update start'),count:integer(r.count,'update count')};});
  if(typeof a.onUploadCallback!=='function')fail('GEOMETRY_ATTRIBUTE_PROFILE','upload callback');
  return {id:id(a,'attribute'),prototypeId:id(Object.getPrototypeOf(a),'attribute-prototype'),arrayId:id(array,'array'),arrayType:type,bufferId:id(storage.buffer,'buffer'),bufferBytes:storage.bufferBytes,byteOffset:storage.byteOffset,bytes:storage.byteLength,length:storage.length,hash:hashBytes(new Uint8Array(storage.buffer,storage.byteOffset,storage.byteLength)),itemSize,count,normalized:a.normalized,version:integer(a.version,'attribute version'),usage:integer(a.usage,'attribute usage'),gpuType:integer(a.gpuType,'attribute GPU type'),float16:a.isFloat16BufferAttribute===true,updateRanges:ranges,onUpload:id(a.onUploadCallback,'attribute-upload')};
 };
 const attributes=entries(geometry.attributes,'geometry attributes',64).map(([name,a])=>({name,...attribute(a)}));
 const index=geometry.index===null?null:attribute(geometry.index,true);
 const draw=ordinary(geometry.drawRange,'draw range'),drawRange={start:integer(draw.start,'draw start'),count:draw.count===Infinity?'unbounded':integer(draw.count,'draw count')};
 const groups=list(geometry.groups,'geometry groups').map(g=>{ordinary(g,'geometry group');return {start:integer(g.start,'group start'),count:integer(g.count,'group count'),materialIndex:integer(g.materialIndex,'group material')};});
 // Public tile art is static. Unsupported dynamic attribute storage must never be silently omitted.
 if(entries(geometry.morphAttributes,'morph attributes',64).length||typeof geometry.morphTargetsRelative!=='boolean')fail('GEOMETRY_STATE_PROFILE','morph geometry is unsupported');
 const vector=v=>{if(!(v instanceof THREE.Vector3))fail('GEOMETRY_STATE_PROFILE','bounds vector');return {id:id(v,'bounds-vector'),xyz:[number(v.x,'bounds x'),number(v.y,'bounds y'),number(v.z,'bounds z')]};};
 let boundingBox=null,boundingSphere=null;
 if(geometry.boundingBox!==null){const b=geometry.boundingBox;if(!(b instanceof THREE.Box3))fail('GEOMETRY_STATE_PROFILE','bounding box');boundingBox={id:id(b,'bounding-box'),min:vector(b.min),max:vector(b.max)};}
 if(geometry.boundingSphere!==null){const b=geometry.boundingSphere;if(!(b instanceof THREE.Sphere))fail('GEOMETRY_STATE_PROFILE','bounding sphere');boundingSphere={id:id(b,'bounding-sphere'),center:vector(b.center),radius:number(b.radius,'bounds radius')};}
 return {id:id(geometry,'geometry'),attributes,index,drawRange,groups,boundingBox,boundingSphere,morphTargetsRelative:geometry.morphTargetsRelative};
}
