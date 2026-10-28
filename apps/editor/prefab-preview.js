import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {DaylightRig} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/daylight-rig.js';
import {setInspectionCamera} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-camera.js';
import {surfacePixels} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js';
import {PrefabLayer} from './prefab-scene.js';
import {createInspectionRenderer} from './inspection-renderer.js';

// A house preview needs only house materials and the same workshop daylight.
// Avoid loading all character, biome, cargo and machinery atlases a second time.
export class BuildingPreviewScene {
  constructor(canvas,changed=()=>{}) {
    this.changed=changed;this.scene=new T.Scene();this.scene.background=new T.Color('#172c29');this.camera=new T.OrthographicCamera();
    this.renderer=createInspectionRenderer(T,canvas);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.localClippingEnabled=true;
    this.daylight=new DaylightRig(this.scene,this.renderer);this.options={level:0,showAllLevels:true,roofs:true,walls:true};this.diagnostics=[];
    this.prefabs=new PrefabLayer(this.scene,this.renderer,changed,error=>{this.diagnostics.push(error.message);changed();});
  }
  async open(document) {
    this.document=document;this.diagnostics=[];this.clearGround();
    if(document.size===240){const p=surfacePixels('grass'),map=new T.DataTexture(p.data,p.width,p.height);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(240,240);map.needsUpdate=true;
      this.ground=new T.Mesh(new T.PlaneGeometry(240,240),new T.MeshStandardMaterial({map,roughness:1}));this.ground.rotation.x=-Math.PI/2;this.ground.position.set(119.5,-.02,119.5);this.scene.add(this.ground);}
    await this.prefabs.update(document,this.options);
  }
  draw(view,width,height) {this.renderer.setSize(width,height,false);setInspectionCamera(this.camera,{...view,level:this.options.level},width,height);this.daylight.update(480,this.camera,0,true);this.renderer.render(this.scene,this.camera);}
  clearGround() {if(this.ground){this.ground.removeFromParent();this.ground.geometry.dispose();this.ground.material.map.dispose();this.ground.material.dispose();this.ground=null;}}
  dispose() {this.prefabs.dispose();this.clearGround();this.daylight.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
