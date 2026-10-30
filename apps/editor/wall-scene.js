import {InspectionScene as LegacyScene} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-scene.js';
import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {surfacePixels} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js';
import {wallRunsOf, wallPanels, WALL_KIT} from '../../packages/map-core/wall-runs.js';

// Every panel of one material is one instance of a unit-width box; the vertex
// shader scales x and the long faces' u by the panel's width. x = ±0.5·width
// and u = {0,1}·width are exact in float32, so positions and per-metre UVs are
// bit-identical to a BoxGeometry(width) per cut length, at one draw per material.
export function patchWallWidth(material,key) {
  const compile=material.onBeforeCompile;
  material.onBeforeCompile=(shader,renderer)=>{
    compile.call(material,shader,renderer);
    shader.vertexShader='attribute float wallWidth;\nattribute float wallScaleU;\n'+shader.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\n\ttransformed.x *= wallWidth;')
      .replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\n\tvMapUv = ( mapTransform * vec3( wallScaleU > 0.5 ? uv.x * wallWidth : uv.x, uv.y, 1.0 ) ).xy;\n#endif');
  };
  material.customProgramCacheKey=()=>key;
  return material;
}
// One texture repeat per metre on every face, including cut ends: the ends'
// u spans the thickness; the other faces' u spans the width (scaled per instance).
export function unitWallGeometry(maxWidth=1) {
  const geometry=new T.BoxGeometry(1,WALL_KIT.height,WALL_KIT.thickness),uv=geometry.attributes.uv,scaleU=new Float32Array(uv.count);
  for (let i=0;i<uv.count;i++) {const face=Math.floor(i/4),w=face<2?WALL_KIT.thickness:1,h=face===2||face===3?WALL_KIT.thickness:WALL_KIT.height;uv.setXY(i,uv.getX(i)*w,uv.getY(i)*h);scaleU[i]=face<2?0:1;}
  geometry.setAttribute('wallScaleU',new T.BufferAttribute(scaleU,1));
  // Bounds of the widest instance, so culling never drops a long panel.
  geometry.boundingBox=new T.Box3(new T.Vector3(-maxWidth/2,-WALL_KIT.height/2,-WALL_KIT.thickness/2),new T.Vector3(maxWidth/2,WALL_KIT.height/2,WALL_KIT.thickness/2));
  geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new T.Sphere());
  return geometry;
}
// Shadow passes draw walls with their own materials: the sun and spot lights a
// depth material, point lights (lamps) a distance material. Both get the patch.
export function wallShadowMaterials() {
  return {depth:patchWallWidth(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}),'nautilus-wall-width-depth-v1'),distance:patchWallWidth(new T.MeshDistanceMaterial(),'nautilus-wall-width-distance-v1')};
}
function releaseWallMeshes(group) {for (const mesh of group.children) if (mesh.isInstancedMesh) {mesh.dispose();mesh.geometry.dispose();}group.clear();}

export class InspectionScene extends LegacyScene {
  constructor(...args) {
    super(...args);this.wallGroup = new T.Group();this.scene.add(this.wallGroup);this.wallMaterials = new Map();
    this.wallShadows = wallShadowMaterials();
    this.anchorGeometry = new T.RingGeometry(.09,.14,16);this.anchorMaterial = new T.MeshBasicMaterial({color:0xa8e6d4,side:T.DoubleSide,depthTest:false});
  }
  wallMaterial(kind, z) {
    if (!this.wallMaterials.has(kind)) {
      const p = surfacePixels(kind), map = new T.DataTexture(p.data,p.width,p.height);map.colorSpace = T.SRGBColorSpace;map.wrapS = map.wrapT = T.RepeatWrapping;map.needsUpdate = true;
      this.wallMaterials.set(kind,patchWallWidth(new T.MeshStandardMaterial({map,roughness:1}),'nautilus-wall-width-v1'));
    }
    return this.dim(this.wallMaterials.get(kind),z);
  }
  rebuild() {super.rebuild();if (this.wallGroup && this.document) this.rebuildWalls();}
  rebuildWalls() {
    releaseWallMeshes(this.wallGroup);this.wallShadows ??= wallShadowMaterials();
    const groups = new Map(), matrix = new T.Matrix4(), position = new T.Vector3(), rotation = new T.Quaternion(), scale = new T.Vector3(1,1,1), up = new T.Vector3(0,1,0);
    if (this.options.walls) for (const run of wallRunsOf(this.document.map)) for (const panel of wallPanels(run)) {
      if (panel.z > this.visibleLevel) continue;
      const material=this.wallMaterial(panel.material,panel.z);
      if(!groups.has(material))groups.set(material,[]);
      groups.get(material).push(panel);
    }
    // Second pass: counts are known, so widths and matrices go straight into
    // their typed buffers (matrices exactly as setMatrixAt would store them).
    for(const [material,panels]of groups){
      const widths=new Float32Array(panels.length);let widest=0;
      for(let i=0;i<panels.length;i++){widths[i]=panels[i].size[0];if(widths[i]>widest)widest=widths[i];}
      const geometry=unitWallGeometry(widest);geometry.setAttribute('wallWidth',new T.InstancedBufferAttribute(widths,1));
      const mesh=new T.InstancedMesh(geometry,material,panels.length),array=mesh.instanceMatrix.array;
      for(let i=0;i<panels.length;i++)matrix.compose(position.fromArray(panels[i].center),rotation.setFromAxisAngle(up,panels[i].yaw),scale).toArray(array,i*16);
      mesh.instanceMatrix.needsUpdate=true;mesh.customDepthMaterial=this.wallShadows.depth;mesh.customDistanceMaterial=this.wallShadows.distance;mesh.computeBoundingSphere();this.wallGroup.add(mesh);
    }
    if(this.wallDrawing && this.options.walls) {
      const seen=new Set();for(const run of wallRunsOf(this.document.map))if(run.z<=this.options.level&&run.z+run.stories>this.options.level)for(const [x,y]of [run.a,run.b]){const key=x+','+y;if(seen.has(key))continue;seen.add(key);const ring=new T.Mesh(this.anchorGeometry,this.anchorMaterial);ring.rotation.x=-Math.PI/2;ring.position.set(x,this.options.level*WALL_KIT.floorSpacing+.06,y);ring.renderOrder=24;this.wallGroup.add(ring);}
    }
    this.changed();
  }
  setWallDrawing(active) {if(this.wallDrawing===active)return;this.wallDrawing=active;if(this.document)this.rebuildWalls();}
  outlineWall(run, preview=false) {
    const points=[],a=run.a,b=run.b,z=preview?run.z:Math.max(run.z,this.options.level),bottom=z*WALL_KIT.floorSpacing+.05,top=(run.z+run.stories-1)*WALL_KIT.floorSpacing+WALL_KIT.height;
    const line=(x,y)=>points.push(new T.Vector3(...x),new T.Vector3(...y));
    line([a[0],bottom,a[1]],[b[0],bottom,b[1]]);line([a[0],top,a[1]],[b[0],top,b[1]]);line([a[0],bottom,a[1]],[a[0],top,a[1]]);line([b[0],bottom,b[1]],[b[0],top,b[1]]);
    for(const p of [a,b]){line([p[0]-.15,bottom,p[1]],[p[0]+.15,bottom,p[1]]);line([p[0],bottom,p[1]-.15],[p[0],bottom,p[1]+.15]);}
    this.highlight.geometry.dispose();this.highlight.geometry=new T.BufferGeometry().setFromPoints(points);this.highlight.material.color.setHex(preview?0xa8e6d4:0xffe5a5);this.changed();
  }
  select(selection) {super.select(selection);if(selection?.type==='wall-run')this.outlineWall(selection.data);}
  preview(result) {super.preview(result);if(result?.ok&&result.wallRun)this.outlineWall(result.wallRun,true);}
  dispose() {releaseWallMeshes(this.wallGroup);this.wallGroup.removeFromParent();for(const material of this.wallMaterials.values()){material.map.dispose();material.dispose();}this.wallShadows.depth.dispose();this.wallShadows.distance.dispose();this.anchorGeometry.dispose();this.anchorMaterial.dispose();super.dispose();}
}
