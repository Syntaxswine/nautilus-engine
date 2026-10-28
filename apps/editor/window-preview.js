import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {DaylightRig} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/daylight-rig.js';
import {setInspectionCamera} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-camera.js';
import {createWindowBayModel} from '../../packages/window-kit/three.js';
import {createInspectionRenderer} from './inspection-renderer.js';

// Sculpture-only staging: no map prop, navigation node or gameplay state.
export class WindowPreviewScene {
  constructor(canvas,changed=()=>{}) {
    this.changed=changed;this.scene=new T.Scene();this.scene.background=new T.Color('#172c29');this.camera=new T.OrthographicCamera();
    this.renderer=createInspectionRenderer(T,canvas);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.daylight=new DaylightRig(this.scene,this.renderer);this.options={level:0};this.diagnostics=[];
  }
  async open(document) {
    this.model?.dispose();this.document=document;
    const {id,...options}=document.sculpture;this.model=createWindowBayModel(T,id,options);
    this.model.setView(options);this.scene.add(this.model.root);this.changed();
  }
  draw(view,width,height) {
    this.renderer.setSize(width,height,false);setInspectionCamera(this.camera,{...view,level:this.options.level},width,height);
    this.daylight.update(480,this.camera,0,true);this.renderer.render(this.scene,this.camera);
  }
  dispose() {if(this.disposed)return;this.disposed=true;this.model?.dispose();this.daylight.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
