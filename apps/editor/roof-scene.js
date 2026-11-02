import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {InspectionScene as Legacy} from './prefab-scene.js';
import {roofsOf} from '../../packages/roof-core/index.js';
import {createRoofGroup} from '../../packages/roof-core/three.js';
import {prefabFileURL} from '../../packages/prefab-core/asset-urls.js';

// Roof data uses tile-edge coordinates. Native tile centres are integers, so
// every roof projection uses the same half-metre origin conversion.
export const ROOF_MAP_OFFSET=-.5;

export class RoofLayer {
  constructor(scene,{factory=createRoofGroup,preview=false,atlas=null}={}) {
    this.scene=scene;this.factory=factory;this.preview=preview;this.atlas=atlas;this.models=new Map();
    if(preview)this.lineMaterial=new T.LineBasicMaterial({color:0xa8e6d4,depthTest:false,transparent:true,opacity:.85});
  }
  update(document,options={}) {
    if(this.disposed)return;this.document=document;this.options={...options};
    const roofs=roofsOf(document?.map),wanted=new Set(roofs.map(r=>r.id));
    for(const [id,model]of this.models)if(!wanted.has(id)){this.release(model);this.models.delete(id);}
    for(const roof of roofs) {
      const {metadata,...geometrySpec}=roof,signature=JSON.stringify(geometrySpec)+':'+(this.atlas?.uuid||'palette');let model=this.models.get(roof.id);
      if(model?.signature!==signature) {
        if(model){this.release(model);this.models.delete(roof.id);}
        const built=this.factory(T,roof,{atlas:this.atlas}),root=built.root||built;
        if(!root?.isObject3D||typeof built.dispose!=='function')throw Error('The roof renderer must supply a Three root and dispose().');
        root.position.x+=ROOF_MAP_OFFSET;root.position.z+=ROOF_MAP_OFFSET;
        model={built,root,signature,roof,edges:[]};
        if(this.preview) {
          const meshes=[];root.traverse(node=>{if(node.isMesh)meshes.push(node);});
          for(const mesh of meshes){const geometry=new T.EdgesGeometry(mesh.geometry),edge=new T.LineSegments(geometry,this.lineMaterial);edge.renderOrder=25;mesh.add(edge);model.edges.push(edge);}
        }
        this.models.set(roof.id,model);this.scene.add(root);
      }
      model.roof=structuredClone(roof);model.root.userData.spec=structuredClone(roof);
      model.root.visible=options.roofs!==false&&(options.showAllLevels!==false||roof.z<=(options.level||0));
    }
  }
  setAtlas(atlas) {if(this.atlas===atlas)return;this.atlas=atlas;if(this.document)this.update(this.document,this.options);}
  release(model) {for(const edge of model.edges){edge.removeFromParent();edge.geometry.dispose();}model.root.removeFromParent();model.built.dispose();}
  dispose() {if(this.disposed)return;this.disposed=true;for(const model of this.models.values())this.release(model);this.models.clear();this.lineMaterial?.dispose();}
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
