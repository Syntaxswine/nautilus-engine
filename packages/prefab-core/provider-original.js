// Renderer-only entry. The headless registry never imports this module.
import {createBuildingModel} from '../building-catalog/three.js';
export function createOriginalBuildingProvider(T,{loadTexture=url=>new T.TextureLoader().loadAsync(url)}={}) {
  return {
    async load({renderer}={}) {
      let atlas;try{atlas=await loadTexture(new URL('../../assets/buildings/painted-materials-v2.png',import.meta.url).href);}catch{throw Error('Original architecture paint could not load. Select the building again to retry.');}
      atlas.colorSpace=T.SRGBColorSpace;atlas.wrapS=atlas.wrapT=T.ClampToEdgeWrapping;
      atlas.anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||2);
      let disposed=false;return {atlas,dispose(){if(!disposed){disposed=true;atlas.dispose();}}};
    },
    create(library,id) {
      const source=createBuildingModel(T,id,{atlas:library.atlas,lod:'game'}),floorMaterials=new Map();let disposed=false;
      // Native floor tops and the editor's ground both sit at height zero. Bias
      // copied floor materials in depth; never lift or rescale the source mesh.
      for(const child of source.root.children)if(child.userData.kind==='floor'){
        const original=child.material;if(!floorMaterials.has(original)){const material=original.clone();material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;floorMaterials.set(original,material);}child.material=floorMaterials.get(original);
      }
      return {root:source.root,
        setView({view='exterior',level=0}={},options={}) {
          source.setView({roof:view!=='cutaway',cutaway:view==='cutaway',maxLevel:view==='cutaway'?level:Infinity});
          if(options.walls===false)for(const child of source.root.children)if(['exterior','interior','glazing','trim','door'].includes(child.userData.kind))child.visible=false;
        },
        dispose(){if(!disposed){disposed=true;source.dispose();for(const material of floorMaterials.values())material.dispose();}}
      };
    }
  };
}
