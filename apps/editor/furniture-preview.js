import {DaylightRig} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/daylight-rig.js';
import {createInspectionRenderer} from './inspection-renderer.js';

// This scene owns one optional library and one instance. It never edits a map.
export class FurniturePreviewScene {
  constructor(T,canvas,changed=()=>{},{
    loadLibrary=async signal=>{const {loadFurnitureAssets}=await import('../../packages/furniture-core/three.js');return loadFurnitureAssets(T,{signal});},
    createRenderer=createInspectionRenderer,createDaylight=(scene,renderer)=>new DaylightRig(scene,renderer)
  }={}) {
    Object.assign(this,{T,changed,loadLibrary,ticket:0,diagnostics:[],options:{}});
    this.abort=new AbortController();
    this.scene=new T.Scene();this.scene.background=new T.Color('#172c29');this.camera=new T.OrthographicCamera();
    try {
      this.renderer=createRenderer(T,canvas);this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;
      this.daylight=createDaylight(this.scene,this.renderer);
      this.clay=new T.MeshStandardMaterial({color:0xb8b3a1,roughness:1});
    }catch(error){this.renderer?.dispose();this.renderer?.forceContextLoss();throw error;}
  }
  async library() {
    if(!this.loading)this.loading=Promise.resolve().then(()=>this.disposed?null:this.loadLibrary(this.abort.signal)).then(library=>{
      if(!library)return null;
      if(this.disposed){library.dispose();return null;}this.loadedLibrary=library;return library;
    }).catch(error=>{this.loading=null;throw error;});
    return this.loading;
  }
  async open(document) {
    if(this.disposed)return;
    const ticket=++this.ticket;this.document=structuredClone(document);this.diagnostics=[];this.releaseModel();
    const library=await this.library();
    if(this.disposed||ticket!==this.ticket||!library)return;
    const {id,rotation=0,mode='painted',lowAngle=false}=this.document.furniture;
    this.model=library.create(id,{rotation});
    const offset=this.model.spec.placementOffset;
    if(offset){this.model.root.position.x=offset[0];this.model.root.position.z=offset[1];}
    this.scene.add(this.model.root);this.materials=new Map();
    this.model.root.traverse(node=>{if(node.isMesh)this.materials.set(node,node.material);});
    this.bounds=new this.T.Box3().setFromObject(this.model.root);
    this.setPresentation({mode,lowAngle});
  }
  setPresentation({mode='painted',lowAngle=false}={}) {
    if(this.disposed)return;this.lowAngle=lowAngle;
    for(const [mesh,paint]of this.materials||[])mesh.material=mode==='clay'?(Array.isArray(paint)?paint.map(()=>this.clay):this.clay):paint;
    this.changed();
  }
  draw(view,width,height) {
    if(this.disposed||!this.model)return;
    const {T,camera,bounds}=this,aspect=width/Math.max(1,height),center=bounds.getCenter(new T.Vector3());
    const angle=Math.PI/4+Number(view.preset||0)*Math.PI/2;
    camera.up.set(0,1,0);camera.position.copy(center).add(new T.Vector3(Math.sin(angle)*100,this.lowAngle?27:100/Math.sqrt(3),Math.cos(angle)*100));
    camera.lookAt(center);camera.updateMatrixWorld(true);
    // Fit actual rendered bounds, including trim and rotation, by moving the
    // camera. Body reservations never resize the authored geometry.
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const p=new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
      minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
    }
    const span=Math.max(.35,maxY-minY,(maxX-minX)/aspect)*1.2;
    camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=1000;camera.updateProjectionMatrix();
    this.renderer.setSize(width,height,false);this.daylight.update(480,camera,0,true);this.renderer.render(this.scene,camera);
  }
  releaseModel() {
    if(!this.model)return;
    for(const [mesh,paint]of this.materials)mesh.material=paint;
    this.model.root.removeFromParent();this.model.dispose();this.model=null;this.materials=null;this.bounds=null;
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;++this.ticket;this.abort.abort();this.releaseModel();this.loadedLibrary?.dispose();
    this.clay.dispose();this.daylight.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.contextReleased=true;
  }
}
