import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {InspectionScene as Legacy} from './prefab-scene.js';
import {roofsOf} from '../../packages/roof-core/index.js';
import {createRoofGroup,createRoofMaterial,PAINTED_ROOF_MATERIALS} from '../../packages/roof-core/three.js';
import {prefabFileURL} from '../../packages/prefab-core/asset-urls.js';

// Roof data uses tile-edge coordinates. Native tile centres are integers, so
// every roof projection uses the same half-metre origin conversion.
export const ROOF_MAP_OFFSET=-.5;
const AT_OFFSET=new T.Matrix4().makeTranslation(ROOF_MAP_OFFSET,0,ROOF_MAP_OFFSET),IDENTITY=new T.Matrix4();
const SHELL={position:3,normal:3,uv:2,color:3};

// A merging layer draws its roofs as one mesh with one group per shared slot
// material. Its vertices are exact copies of each roof's own, at the same map
// offset, so every triangle lands where the roof's own mesh would put it. Roofs
// keep their models (bounds, selection, specs); their shells hide while merged.
// Sorted by level, a level cut leaves a prefix of each material's run: one draw
// per material. The preview layer draws its roof itself.
export class RoofLayer {
  constructor(scene,{factory=createRoofGroup,preview=false,atlas=null,merge=!preview}={}) {
    this.scene=scene;this.factory=factory;this.preview=preview;this.atlas=atlas;this.merge=merge;this.models=new Map();this.merged=null;this.slots=null;
    if(preview)this.lineMaterial=new T.LineBasicMaterial({color:0xa8e6d4,depthTest:false,transparent:true,opacity:.85});
  }
  update(document,options={}) {
    if(this.disposed)return;this.document=document;this.options={...options};
    const roofs=roofsOf(document?.map),wanted=new Set(roofs.map(r=>r.id));let changed=false;
    // Every signature names the atlas, so a new atlas rebuilds every roof before its old slots go.
    const retired=this.slots?.atlas!==this.atlas?this.slots:null;if(retired)this.slots=null;
    for(const [id,model]of this.models)if(!wanted.has(id)){this.release(model);this.models.delete(id);changed=true;}
    for(const roof of roofs) {
      const {metadata,...geometrySpec}=roof,signature=JSON.stringify(geometrySpec)+':'+(this.atlas?.uuid||'palette');let model=this.models.get(roof.id);
      if(model?.signature!==signature) {
        if(model){this.release(model);this.models.delete(roof.id);}
        const built=this.factory(T,roof,{atlas:this.atlas,...(this.merge?{materialMap:this.slotMaterials()}:{})}),root=built.root||built;
        if(!root?.isObject3D||typeof built.dispose!=='function')throw Error('The roof renderer must supply a Three root and dispose().');
        root.position.x+=ROOF_MAP_OFFSET;root.position.z+=ROOF_MAP_OFFSET;
        model={built,root,signature,roof,edges:[]};
        if(this.preview) {
          const meshes=[];root.traverse(node=>{if(node.isMesh)meshes.push(node);});
          for(const mesh of meshes){const geometry=new T.EdgesGeometry(mesh.geometry),edge=new T.LineSegments(geometry,this.lineMaterial);edge.renderOrder=25;mesh.add(edge);model.edges.push(edge);}
        }
        this.models.set(roof.id,model);this.scene.add(root);changed=true;
      }
      model.roof=structuredClone(roof);model.root.userData.spec=structuredClone(roof);
      model.root.visible=options.roofs!==false&&(options.showAllLevels!==false||roof.z<=(options.level||0));
    }
    if(retired)for(const material of retired.materials.values())material.dispose();
    const order=new Map(roofs.map((roof,i)=>[roof.id,i]));
    if(changed||this.merged&&this.merged.order!==roofs.map(roof=>roof.id).join('\n'))this.remerge(order);
    this.showMerged();
  }
  // One material per painted slot for the current atlas, shared by all of the layer's roofs.
  slotMaterials() {
    this.slots??={atlas:this.atlas,materials:new Map(Object.keys(PAINTED_ROOF_MATERIALS).map(id=>[id,createRoofMaterial(T,id,{atlas:this.atlas})]))};
    return this.slots.materials;
  }
  // Exactly the default adapter's output: one indexed shell at the map offset, drawn
  // with this layer's slot materials, whole (no draw range, morphs or open-ended group),
  // visible, in the default layer and order. Any other model draws itself.
  mergeable(model) {
    const root=model.root,mesh=root.children[0],geometry=mesh?.geometry,shared=new Set(this.slots?.materials.values()),plain=node=>node.renderOrder===0&&node.layers.mask===1;
    if(root.children.length!==1||!mesh.isMesh||mesh.children.length||!Array.isArray(mesh.material)||!geometry?.index||!mesh.castShadow||!mesh.receiveShadow||!mesh.visible||!plain(root)||!plain(mesh))return false;
    root.updateMatrix();mesh.updateMatrix();if(!root.matrix.equals(AT_OFFSET)||!mesh.matrix.equals(IDENTITY))return false;
    if(geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity||Object.keys(geometry.morphAttributes).length)return false;
    const names=Object.keys(geometry.attributes);
    if(names.length!==4||names.some(name=>{const a=geometry.attributes[name];return a.itemSize!==SHELL[name]||a.isInterleavedBufferAttribute||a.normalized||!(a.array instanceof Float32Array);}))return false;
    return geometry.groups.length>0&&geometry.groups.every(group=>Number.isInteger(group.start)&&Number.isInteger(group.count)&&group.start>=0&&group.start+group.count<=geometry.index.count&&shared.has(mesh.material[group.materialIndex]));
  }
  remerge(order) {
    this.releaseMerged();if(!this.merge)return;
    const models=[...this.models.values()].filter(model=>this.mergeable(model)).sort((a,b)=>a.roof.z-b.roof.z||order.get(a.roof.id)-order.get(b.roof.id));
    if(models.length<2)return;
    const shells=models.map(model=>model.root.children[0]),materials=[];
    for(const shell of shells)for(const group of shell.geometry.groups){const material=shell.material[group.materialIndex];if(!materials.includes(material))materials.push(material);}
    const vertices=shells.reduce((sum,shell)=>sum+shell.geometry.attributes.position.count,0),indices=shells.reduce((sum,shell)=>sum+shell.geometry.groups.reduce((s,group)=>s+group.count,0),0);
    const arrays=Object.fromEntries(Object.entries(SHELL).map(([name,size])=>[name,new Float32Array(vertices*size)])),index=new (vertices>65535?Uint32Array:Uint16Array)(indices);
    let base=0,at=0;const bases=shells.map(shell=>{const start=base;for(const [name,size]of Object.entries(SHELL))arrays[name].set(shell.geometry.attributes[name].array,start*size);base+=shell.geometry.attributes.position.count;return start;});
    // Per material, each roof's triangles in sorted order: ranges sit back to back.
    const ranges=materials.map(material=>{const list=[];shells.forEach((shell,i)=>{const source=shell.geometry.index.array;
      for(const group of shell.geometry.groups)if(shell.material[group.materialIndex]===material){const start=at;for(let j=group.start;j<group.start+group.count;j++)index[at++]=source[j]+bases[i];list.push({model:models[i],start,count:at-start});}
    });return list;});
    const geometry=new T.BufferGeometry();for(const [name,size]of Object.entries(SHELL))geometry.setAttribute(name,new T.BufferAttribute(arrays[name],size));
    geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new T.Mesh(geometry,materials);mesh.name='sloped roofs';mesh.castShadow=mesh.receiveShadow=true;mesh.position.set(ROOF_MAP_OFFSET,0,ROOF_MAP_OFFSET);
    for(const shell of shells)shell.visible=false;this.scene.add(mesh);
    this.merged={mesh,ranges,shells,order:[...order.keys()].join('\n')};
  }
  // Consecutive visible roofs are one draw per material.
  showMerged() {
    if(!this.merged)return;const geometry=this.merged.mesh.geometry;geometry.clearGroups();
    this.merged.ranges.forEach((list,k)=>{let run=null;for(const range of list){if(!range.model.root.visible)run=null;else if(run)run.count+=range.count;else{geometry.addGroup(range.start,range.count,k);run=geometry.groups[geometry.groups.length-1];}}});
    this.merged.mesh.visible=geometry.groups.length>0;
  }
  releaseMerged() {if(!this.merged)return;const {mesh,shells}=this.merged;mesh.removeFromParent();mesh.geometry.dispose();for(const shell of shells)shell.visible=true;this.merged=null;}
  setAtlas(atlas) {if(this.atlas===atlas)return;this.atlas=atlas;if(this.document)this.update(this.document,this.options);}
  release(model) {for(const edge of model.edges){edge.removeFromParent();edge.geometry.dispose();}model.root.removeFromParent();model.built.dispose();}
  dispose() {
    if(this.disposed)return;this.disposed=true;this.releaseMerged();for(const model of this.models.values())this.release(model);this.models.clear();
    for(const material of this.slots?.materials.values()||[])material.dispose();this.slots=null;this.lineMaterial?.dispose();
  }
}

export class InspectionScene extends Legacy {
  constructor(...args) {super(...args);this.slopedRoofs=new RoofLayer(this.scene);this.roofPreview=new RoofLayer(this.scene,{preview:true});this.roofLoader=new T.TextureLoader();}
  prepareRoofs() {
    if(this.roofDisposed)return Promise.resolve();
    if(this.roofPaintReady)return this.roofPaintReady;
    const attempt={state:'pending',texture:null};
    const ready=new Promise((resolve,reject)=>{attempt.resolve=resolve;attempt.reject=reject;});
    this.roofPaintAttempt=attempt;this.roofPaintReady=ready;
    const fail=cause=>{
      if(attempt.state!=='pending')return;
      attempt.state='failed';this.disposeRoofTexture(attempt.texture);
      const error=Error('The shared painted roof atlas could not load.',{cause});
      if(this.roofPaintAttempt===attempt) {
        this.roofPaintAttempt=null;this.roofPaintReady=null;this.roofTexture=null;
        if(!this.roofDisposed&&!this.roofPaintError) {
          this.roofPaintError=error;this.roofPaintDiagnostic='Sloped roofs: '+error.message;
          this.diagnostics.push(this.roofPaintDiagnostic);this.changed();
        }
      }
      attempt.reject(error);
    };
    try {
      const texture=this.roofLoader.load(prefabFileURL('assets/buildings/painted-materials-v2.png'),texture=>{
        if(attempt.state!=='pending'||this.roofDisposed||this.roofPaintAttempt!==attempt) {
          if(attempt.state!=='ready'||texture!==attempt.texture)this.disposeRoofTexture(texture);
          return;
        }
        attempt.texture=texture;
        try {
          texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
          this.slopedRoofs.setAtlas(texture);this.roofPreview.setAtlas(texture);
        }catch(error){fail(error);return;}
        attempt.state='ready';this.roofTexture=texture;
        const diagnostic=this.diagnostics.indexOf(this.roofPaintDiagnostic);
        if(diagnostic!==-1)this.diagnostics.splice(diagnostic,1);
        this.roofPaintError=null;this.roofPaintDiagnostic=null;attempt.resolve();this.changed();
      },undefined,fail);
      attempt.texture??=texture;
      // A loader may complete synchronously before returning its owned texture.
      if(!this.roofDisposed&&this.roofPaintAttempt===attempt)this.roofTexture=attempt.texture;
      else this.disposeRoofTexture(texture);
    }catch(error){fail(error);}
    return ready;
  }
  loadRoofPaint() {return this.prepareRoofs().catch(()=>{});}
  rebuild() {super.rebuild();if(this.document){this.slopedRoofs?.update(this.document,this.options);if(this.slopedRoofs&&roofsOf(this.document.map).length)this.loadRoofPaint();}}
  async open(document) {if(this.roofDisposed)return;if(roofsOf(document.map).length)await this.prepareRoofs();if(this.roofDisposed)return;await super.open(document);if(this.roofDisposed)return;this.slopedRoofs.update(document,this.options);}
  async update(document) {if(this.roofDisposed)return;if(roofsOf(document.map).length)await this.prepareRoofs();if(this.roofDisposed)return;await super.update(document);if(this.roofDisposed)return;this.slopedRoofs.update(document,this.options);}
  preview(result) {
    super.preview(result);
    this.roofPreview?.update({map:{slopedRoofs:{version:1,roofs:result?.ok&&result.roofPreview?[result.roofPreview]:[]}}},{showAllLevels:true,roofs:true});
    if(result?.ok&&result.roofPreview)this.loadRoofPaint();
  }
  select(selection) {
    super.select(selection);if(selection?.type!=='sloped-roof')return;
    const model=this.slopedRoofs.models.get(selection.data.id);if(!model)return;
    model.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model.root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
    const box=new T.BoxGeometry(size.x,size.y,size.z),edges=new T.EdgesGeometry(box);box.dispose();edges.translate(center.x,center.y,center.z);
    this.highlight.geometry.dispose();this.highlight.geometry=edges;this.highlight.material.color.setHex(0xffe5a5);this.changed();
  }
  disposeRoofTexture(texture=this.roofTexture) {
    if(!texture)return;this.roofDisposedTextures??=new WeakSet();
    if(!this.roofDisposedTextures.has(texture)){this.roofDisposedTextures.add(texture);texture.dispose();}
  }
  dispose() {
    if(this.roofDisposed)return;this.roofDisposed=true;
    const attempt=this.roofPaintAttempt;
    if(attempt?.state==='pending'){attempt.state='disposed';attempt.resolve();}
    this.roofPaintAttempt=null;this.slopedRoofs.dispose();this.roofPreview.dispose();this.disposeRoofTexture();super.dispose();
  }
}
