import {InspectionScene as LegacyScene} from '../__AFT__/dist/tactics/editor-3d-scene.js';
import * as T from '../__AFT__/dist/tactics/vendor/three.module.js';
import {surfacePixels} from '../__AFT__/dist/tactics/hybrid-materials.js';
import {wallRunsOf, wallPanels, WALL_KIT} from '../packages/map-core/wall-runs.js';

export class InspectionScene extends LegacyScene {
  constructor(...args) {
    super(...args);this.wallGroup = new T.Group();this.scene.add(this.wallGroup);this.wallGeometries = new Map();this.wallMaterials = new Map();
    this.anchorGeometry = new T.RingGeometry(.09,.14,16);this.anchorMaterial = new T.MeshBasicMaterial({color:0xa8e6d4,side:T.DoubleSide,depthTest:false});
  }
  wallMaterial(kind, z) {
    if (!this.wallMaterials.has(kind)) {
      const p = surfacePixels(kind), map = new T.DataTexture(p.data,p.width,p.height);map.colorSpace = T.SRGBColorSpace;map.wrapS = map.wrapT = T.RepeatWrapping;map.needsUpdate = true;
      this.wallMaterials.set(kind,new T.MeshStandardMaterial({map,roughness:1}));
    }
    return this.dim(this.wallMaterials.get(kind),z);
  }
  rebuild() {super.rebuild();if (this.wallGroup && this.document) this.rebuildWalls();}
  rebuildWalls() {
    for (const mesh of this.wallGroup.children) if (mesh.isInstancedMesh) mesh.dispose();this.wallGroup.clear();
    const groups = new Map(), usedGeometry = new Set(), matrix = new T.Matrix4(), position = new T.Vector3(), rotation = new T.Quaternion(), scale = new T.Vector3(1,1,1);
    if (this.options.walls) for (const run of wallRunsOf(this.document.map)) for (const panel of wallPanels(run)) {
      if (panel.z > this.visibleLevel) continue;
      const width = panel.size[0], geometryKey = width.toFixed(6);usedGeometry.add(geometryKey);
      if (!this.wallGeometries.has(geometryKey)) {
        const geometry = new T.BoxGeometry(width,WALL_KIT.height,WALL_KIT.thickness), uv = geometry.attributes.uv;
        // One texture repeat per metre on every face, including cut ends.
        for (let i=0;i<uv.count;i++) {const face=Math.floor(i/4),w=face<2?WALL_KIT.thickness:width,h=face===2||face===3?WALL_KIT.thickness:WALL_KIT.height;uv.setXY(i,uv.getX(i)*w,uv.getY(i)*h);}
        this.wallGeometries.set(geometryKey,geometry);
      }
      const material=this.wallMaterial(panel.material,panel.z), key=`${geometryKey}:${material.uuid}`;
      if(!groups.has(key))groups.set(key,{geometry:this.wallGeometries.get(geometryKey),material,matrices:[]});
      matrix.compose(position.fromArray(panel.center),rotation.setFromAxisAngle(new T.Vector3(0,1,0),panel.yaw),scale);groups.get(key).matrices.push(matrix.clone());
    }
    for(const {geometry,material,matrices}of groups.values()){const mesh=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();this.wallGroup.add(mesh);}
    // Old instances are gone; retain only geometry used by the current view.
    for(const [key,geometry]of this.wallGeometries)if(!usedGeometry.has(key)){geometry.dispose();this.wallGeometries.delete(key);}
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
  dispose() {for(const mesh of this.wallGroup.children)if(mesh.isInstancedMesh)mesh.dispose();this.wallGroup.removeFromParent();for(const g of this.wallGeometries.values())g.dispose();for(const material of this.wallMaterials.values()){material.map.dispose();material.dispose();}this.anchorGeometry.dispose();this.anchorMaterial.dispose();super.dispose();}
}
