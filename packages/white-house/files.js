import {FURNISHINGS} from './plan.js';
export function whiteHouseModelFiles(id='white-house'){
 if(!['white-house','white-house-exterior',...FURNISHINGS.map(p=>p.id)].includes(id))throw Error('Unknown White House model: '+id);
 const base=new URL('../../assets/white-house/',import.meta.url);
 return {id,model:new URL('models/'+id+'.gltf',base).href,buffer:new URL('models/'+id+'.bin',base).href,atlas:new URL('painted-heritage-v1.png',base).href,scene:new URL('white-house.scene.json',base).href,manifest:new URL('manifest.json',base).href};
}
