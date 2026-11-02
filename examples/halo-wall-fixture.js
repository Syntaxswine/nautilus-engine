// Small engine-owned acceptance fixture, not a consumer visibility implementation.
import * as T from '../packages/render-effects/three.js';
import {wallPanels, wallRunsIntersect, wallRunErrors} from '../packages/map-core/wall-runs.js';
import {surfacePixels} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js';

export const REVIEW_ORIGIN=Object.freeze([10,0,20]);
export const REVIEW_CAMERA=Object.freeze([10,6,31]);
export const REVIEW_WALL=Object.freeze({id:'halo-diagonal-review',a:Object.freeze([6,24]),b:Object.freeze([14,16]),z:0,stories:1,material:'wood'});
export function reviewWallMap() {
  return {width:240,height:240,levels:6,wallRuns:{version:1,segments:[structuredClone(REVIEW_WALL)]}};
}

export function createDiagonalOccluder() {
  const map=reviewWallMap(), errors=wallRunErrors(map);
  if(errors.length)throw Error(errors.join(' '));
  const group=new T.Group(), geometries=new Map(), pixels=surfacePixels('wood');
  const texture=new T.DataTexture(pixels.data,pixels.width,pixels.height);
  texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.needsUpdate=true;
  const material=new T.MeshStandardMaterial({map:texture,roughness:1});
  const groups=new Map(), matrix=new T.Matrix4(), position=new T.Vector3(), rotation=new T.Quaternion(), scale=new T.Vector3(1,1,1);
  for(const panel of wallPanels(map.wallRuns.segments[0])) {
    const key=panel.size[0].toFixed(6);
    if(!geometries.has(key)) {
      const [width,height,thickness]=panel.size, geometry=new T.BoxGeometry(width,height,thickness), uv=geometry.attributes.uv;
      for(let i=0;i<uv.count;i++) {
        const face=Math.floor(i/4), w=face<2?thickness:width, h=face===2||face===3?thickness:height;
        uv.setXY(i,uv.getX(i)*w,uv.getY(i)*h);
      }
      geometries.set(key,geometry);
    }
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(matrix.compose(position.fromArray(panel.center),rotation.setFromAxisAngle(new T.Vector3(0,1,0),panel.yaw),scale).clone());
  }
  for(const [key,matrices]of groups) {
    const mesh=new T.InstancedMesh(geometries.get(key),material,matrices.length);
    matrices.forEach((value,i)=>mesh.setMatrixAt(i,value));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
  }
  let disposed=false;
  return {map,group,dispose(){if(disposed)return;disposed=true;for(const mesh of group.children)mesh.dispose();group.clear();for(const geometry of geometries.values())geometry.dispose();material.dispose();texture.dispose();}};
}

export function wallVisibility(map, from, rootPosition, upperOffset=1.1) {
  const eye={x:from.x,y:from.z,h:from.y};
  const center={x:rootPosition.x,y:rootPosition.z,h:rootPosition.y};
  const upper={...center,h:center.h+upperOffset};
  const centerBlocked=wallRunsIntersect(map,eye,center), upperBlocked=wallRunsIntersect(map,eye,upper);
  return {centerBlocked,upperBlocked,eligible:!centerBlocked||!upperBlocked};
}
