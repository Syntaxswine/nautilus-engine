import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {InspectionScene as OriginalScene} from './wall-scene.js';
import {buildingTransform} from '../../packages/prefab-core/index.js';
import {buildingAsset} from '../../packages/prefab-core/registry.js';
import {createPrefabProviders} from './prefab-providers.js';
import {CopyBatch} from './copy-batch.js';

// Batch meshes (material arrays drawn through geometry groups) can be instanced;
// glass stays one mesh per placed copy so it still sorts back to front.
const instanceable=node=>node.isMesh&&Array.isArray(node.material);

// Libraries and templates are owned by one scene. Stale loads release their own
// resources, and failed loads are removed so a later selection can retry.
// A design placed more than once draws each batch mesh as one CopyBatch on the
// template's own geometry, which every camera culls copy by copy; views (geometry
// groups) still follow the template. The copies keep their nodes, hidden, for
// bounds and bookkeeping.
export class PrefabLayer {
  constructor(scene,renderer,changed,error,{providers=createPrefabProviders(T),instancing=true}={}) {Object.assign(this,{scene,renderer,changed,error,providers,instancing});this.templates=new Map();this.models=new Map();this.libraries=new Map();this.instanced=[];this.ticket=0;}
  load(providerId) {
    let record=this.libraries.get(providerId);
    if(record?.library)return Promise.resolve({library:record.library});
    if(record)return record.promise;
    const provider=this.providers.get(providerId);
    if(!provider)return Promise.resolve({error:Error('Unsupported building provider: '+providerId)});
    record={library:null,promise:null};this.libraries.set(providerId,record);
    record.promise=Promise.resolve().then(()=>provider.load({renderer:this.renderer})).then(library=>{
      if(this.disposed||this.libraries.get(providerId)!==record){library.dispose();return {};}
      record.library=library;return {library};
    }).catch(error=>{if(this.libraries.get(providerId)===record)this.libraries.delete(providerId);return {error};});
    return record.promise;
  }
  releaseLibrary(id) {const record=this.libraries.get(id);this.libraries.delete(id);record?.library?.dispose();}
  async update(document,options) {
    if(this.disposed)return;
    const ticket=++this.ticket;this.document=document;this.options={...options};
    // Copies draw themselves again until instancing is rebuilt below (it may span a load).
    this.releaseInstances();
    const wanted=document?.map.buildingPrefabs?.instances||[],keep=new Map(wanted.map(p=>[p.id,p.asset]));
    const usedAssets=new Set(wanted.map(p=>p.asset)),usedProviders=new Set(wanted.map(p=>buildingAsset(p.asset)?.provider));
    for(const [id,model]of this.models)if(keep.get(id)!==model.asset){model.root.removeFromParent();this.models.delete(id);}
    for(const [id,template]of this.templates)if(!usedAssets.has(id)){template.model.dispose();this.templates.delete(id);}
    for(const id of this.libraries.keys())if(!usedProviders.has(id))this.releaseLibrary(id);
    const loaded=new Map(await Promise.all([...usedProviders].map(async id=>[id,await this.load(id)])));
    if(this.disposed||ticket!==this.ticket)return;
    for(const result of loaded.values())if(result.error)this.error(result.error);
    for(const instance of wanted) {
      const asset=buildingAsset(instance.asset),library=loaded.get(asset?.provider)?.library;if(!library)continue;
      try {
        let template=this.templates.get(instance.asset);
        if(!template){const model=this.providers.get(asset.provider).create(library,instance.asset),nodes=[];model.root.traverse(node=>nodes.push(node));template={model,nodes};this.templates.set(instance.asset,template);}
        let model=this.models.get(instance.id);
        if(!model){const root=template.model.root.clone(true),nodes=[];root.traverse(node=>nodes.push(node));model={root,nodes,asset:instance.asset};this.models.set(instance.id,model);this.scene.add(root);}
        const transform=buildingTransform(instance);model.root.position.set(transform.x,0,transform.y);model.root.rotation.y=transform.angle;
      }catch(error){this.error(error);}
    }
    this.instance();this.setView();this.changed();
  }
  // Rebuilt on every update: instance matrices are each copy's world matrix times the
  // node's place in its template. The shared geometry belongs to the template.
  instance() {
    this.releaseInstances();if(!this.instancing)return;
    const copies=new Map();for(const model of this.models.values()){if(!copies.has(model.asset))copies.set(model.asset,[]);copies.get(model.asset).push(model);}
    for(const [id,models]of copies){
      const template=this.templates.get(id);if(!template||models.length<2)continue;
      template.model.root.updateMatrixWorld(true);for(const model of models)model.root.updateMatrixWorld(true);
      template.nodes.forEach((node,i)=>{
        if(!instanceable(node))return;
        const local=new T.Matrix4().copy(template.model.root.matrixWorld).invert().multiply(node.matrixWorld);
        const mesh=new CopyBatch(node,models.map(model=>new T.Matrix4().multiplyMatrices(model.root.matrixWorld,local)));
        this.scene.add(mesh);this.instanced.push({mesh,node,copies:models.map(model=>model.nodes[i])});
      });
    }
  }
  releaseInstances() {for(const {mesh,node,copies}of this.instanced){mesh.removeFromParent();mesh.dispose();for(const copy of copies)copy.visible=node.visible;}this.instanced=[];}
  setView(override=this.override) {
    this.override=override;
    for(const [id,template]of this.templates) {
      const asset=buildingAsset(id),cut=!this.options.showAllLevels||!this.options.roofs;
      const floor=asset.levels[Math.min(asset.levels.length-1,Math.max(0,Math.floor(this.options.level)||0))].index;
      template.model.setView(override||{view:cut?'cutaway':'exterior',level:floor,showFurniture:cut},this.options);
      for(const model of this.models.values())if(model.asset===id)model.nodes.forEach((node,i)=>{node.visible=template.nodes[i].visible;});
    }
    // Instanced nodes draw through their CopyBatch; the copies' own nodes stay hidden.
    for(const {mesh,node,copies}of this.instanced){mesh.visible=node.visible;for(const copy of copies)copy.visible=false;}
  }
  clearModels() {this.releaseInstances();for(const model of this.models.values())model.root.removeFromParent();this.models.clear();for(const template of this.templates.values())template.model.dispose();this.templates.clear();}
  dispose() {if(this.disposed)return;this.disposed=true;++this.ticket;this.clearModels();for(const id of this.libraries.keys())this.releaseLibrary(id);}
}
export class InspectionScene extends OriginalScene {
  constructor(canvas,changed) {super(canvas,changed);this.renderer.localClippingEnabled=true;this.prefabs=new PrefabLayer(this.scene,this.renderer,()=>this.changed(),error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});}
  rebuild() {super.rebuild();this.prefabs?.update(this.document,this.options);}
  async open(document) {await super.open(document);await this.prefabs.update(document,this.options);}
  async update(document) {await super.update(document);await this.prefabs.update(document,this.options);}
  dispose() {this.prefabs.dispose();super.dispose();this.renderer.forceContextLoss();}
}
