import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';

// One batch mesh of a cluster of neighbouring copies of one design, drawn for all of
// them at once: three's BatchedMesh on the template's own geometry, one instance per
// copy. Every camera that draws it (the view, the sun's shadow map, each face of each
// lamp's) culls the copies one by one against its own frustum, by the sphere each copy's
// own mesh would have; an InstancedMesh is culled as a whole, so every lamp face drew every
// copy. Sub-draw k is copy k, drawn with the template geometry's group (so a view still
// follows the template); a culled copy draws no vertices. The copy table (BatchedMesh's
// indirect texture) is the identity, written once: three rewrites it for every camera,
// and on Direct3D each rewrite between draws that read it stalled the frame (lamp-lit
// cutaway: 14.9 ms against 7.2 ms without the rewrites).
const frustum=new T.Frustum(),matrix=new T.Matrix4(),box=new T.Box3();
export class CopyBatch extends T.BatchedMesh {
  constructor(node,matrices) {
    super(matrices.length,0,0,node.material);
    // three r180's renderer asks object.colorTexture, which BatchedMesh never sets (it
    // keeps _colorsTexture); left undefined, every draw would re-derive its program.
    this.colorTexture=null;
    this.geometry.dispose();this.geometry=node.geometry;
    this.name=node.name;this.castShadow=node.castShadow;this.receiveShadow=node.receiveShadow;
    this.spheres=matrices.map(m=>{this.setMatrixAt(this.addInstance(0),m);return node.geometry.boundingSphere.clone().applyMatrix4(m);});
    this.matrices=matrices.map(m=>m.clone());
    const table=this._indirectTexture.image.data;for(let k=0;k<matrices.length;k++)table[k]=k;this._indirectTexture.needsUpdate=true;
    this.computeBoundingSphere();this.computeBoundingBox();
  }
  computeBoundingSphere() {(this.boundingSphere??=new T.Sphere()).makeEmpty();for(const sphere of this.spheres)this.boundingSphere.union(sphere);}
  computeBoundingBox() {(this.boundingBox??=new T.Box3()).makeEmpty();for(const m of this.matrices)this.boundingBox.union(box.copy(this.geometry.boundingBox).applyMatrix4(m));}
  // Raycasts reach the copies' own nodes, which stay in place (hidden); the batch adds none.
  raycast() {}
  onBeforeRender(renderer,scene,camera,geometry,material,group) {
    // As the renderer clips a group's draw to the geometry's draw range.
    const range=geometry.drawRange,vertices=geometry.index?geometry.index.count:geometry.attributes.position.count;
    const first=Math.max(range.start,group?group.start:0),count=Math.max(0,Math.min(range.start+range.count,group?group.start+group.count:Infinity,vertices)-first),start=first*(geometry.index?geometry.index.array.BYTES_PER_ELEMENT:1);
    frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(this.matrixWorld),camera.coordinateSystem,camera.reversedDepth);
    const starts=this._multiDrawStarts,counts=this._multiDrawCounts;let n=0;
    for(let k=0;k<this.spheres.length;k++){
      starts[k]=start;
      if(this.perObjectFrustumCulled&&!frustum.intersectsSphere(this.spheres[k])){counts[k]=0;continue;}
      counts[k]=count;n=k+1;
    }
    // Sub-draws after the last copy in view are dropped; with no copy in view nothing is drawn.
    this._multiDrawCount=n;
  }
  onBeforeShadow(renderer,object,camera,shadowCamera,geometry,depthMaterial,group) {this.onBeforeRender(renderer,null,shadowCamera,geometry,depthMaterial,group);}
  // The geometry is the template's, released by the template.
  dispose() {if(this.disposed)return;this.disposed=true;this.geometry=new T.BufferGeometry();super.dispose();}
}
