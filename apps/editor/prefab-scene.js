import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {InspectionScene as OriginalScene} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-scene.js';
import {loadGrossHousing,createGrossHouse} from '../../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/src/art/gross-housing.js';
import {buildingTransform,buildingAsset} from '../../packages/prefab-core/index.js';
import {batchPrefab} from './prefab-batches.js';

// Templates share geometry, materials and the six textures across placed copies.
export class PrefabLayer {
  constructor(scene,renderer,changed,error) {Object.assign(this,{scene,renderer,changed,error});this.templates=new Map();this.models=new Map();}
  async update(document,options) {
    this.document=document;this.options=options;
    const instances=document?.map.buildingPrefabs?.instances||[];
    if(!instances.length){this.clearModels();if(this.library){this.library.dispose();this.library=null;this.pending=null;}return;}
    if(!this.pending)this.pending=loadGrossHousing(T,{renderer:this.renderer}).then(library=>{if(this.disposed||!this.document?.map.buildingPrefabs?.instances.length){library.dispose();this.pending=null;return null;}this.library=library;return library;}).catch(error=>{if(!this.disposed)this.error(error);return null;});
    if(!this.library){await this.pending;if(!this.library||this.disposed)return;}
    const wanted=this.document?.map.buildingPrefabs?.instances||[],keep=new Set(wanted.map(p=>p.id));
    for(const [id,model]of this.models)if(!keep.has(id)){model.root.removeFromParent();this.models.delete(id);}
    for(const instance of wanted) {
      let template=this.templates.get(instance.asset);
      if(!template){const source=createGrossHouse(T,this.library,instance.asset),batch=batchPrefab(T,source),nodes=[];batch.root.traverse(node=>nodes.push(node));template={source,batch,nodes};this.templates.set(instance.asset,template);}
      let model=this.models.get(instance.id);
      if(model&&model.asset!==instance.asset){model.root.removeFromParent();this.models.delete(instance.id);model=null;}
      if(!model){const root=template.batch.root.clone(true),nodes=[];root.traverse(node=>nodes.push(node));model={root,nodes,asset:instance.asset};this.models.set(instance.id,model);this.scene.add(root);}
      const transform=buildingTransform(instance);model.root.position.set(transform.x,0,transform.y);model.root.rotation.y=transform.angle;
    }
    for(const [id,template]of this.templates)if(!wanted.some(p=>p.asset===id)){template.batch.dispose();template.source.dispose();this.templates.delete(id);}
    this.setView();this.changed();
  }
  setView(override=this.override) {
    this.override=override;
    for(const [id,template]of this.templates) {
      const asset=buildingAsset(id),cut=!this.options.showAllLevels||!this.options.roofs;
      const floor=asset.levels[Math.min(asset.levels.length-1,Math.max(0,Math.floor(this.options.level)||0))].index;
      template.source.setView(override||{view:cut?'cutaway':'exterior',level:floor,showFurniture:cut});
      template.batch.sync(this.options);
      for(const model of this.models.values())if(model.asset===id)model.nodes.forEach((node,i)=>{node.visible=template.nodes[i].visible;});
    }
  }
  clearModels() {for(const model of this.models.values())model.root.removeFromParent();this.models.clear();for(const template of this.templates.values()){template.batch.dispose();template.source.dispose();}this.templates.clear();}
  dispose() {this.disposed=true;this.clearModels();this.library?.dispose();this.library=null;}
}
export class InspectionScene extends OriginalScene {
  constructor(canvas,changed) {super(canvas,changed);this.renderer.localClippingEnabled=true;this.prefabs=new PrefabLayer(this.scene,this.renderer,()=>this.changed(),error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});}
  rebuild() {super.rebuild();this.prefabs?.update(this.document,this.options);}
  async open(document) {await super.open(document);await this.prefabs.update(document,this.options);}
  async update(document) {await super.update(document);await this.prefabs.update(document,this.options);}
  dispose() {this.prefabs.dispose();super.dispose();this.renderer.forceContextLoss();}
}
