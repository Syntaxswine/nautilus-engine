import {VEHICLE_MESH_DATA} from './reduced-data.js';

function decode(text,Type){
  const raw=atob(text),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return new Type(bytes.buffer);
}
export function reducedRoadVehicle(T,id){
  const row=VEHICLE_MESH_DATA[id];if(!row)throw new RangeError('Unknown vehicle body: '+id);
  const parts=new Map();
  for(const [name,data]of Object.entries(row)){
    const g=new T.BufferGeometry();
    for(const [key,size]of [['position',3],['normal',3],['uv',2]])g.setAttribute(key,new T.BufferAttribute(decode(data[key],Float32Array),size));
    g.setIndex(new T.BufferAttribute(decode(data.index,Uint16Array),1));
    g.computeBoundingBox();g.computeBoundingSphere();parts.set(name,g);
  }return parts;
}
