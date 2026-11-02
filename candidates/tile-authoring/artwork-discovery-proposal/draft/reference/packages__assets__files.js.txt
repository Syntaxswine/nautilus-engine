import {listSharedAssets,sharedAsset} from './index.js';
export const BUILDING_FILE_CONTRACT=Object.freeze({version:1,modelFormat:'glTF 2.0',metresPerUnit:1,collection:'original'});
export function listBuildingAssets() {return listSharedAssets({category:'Buildings'}).filter(asset=>asset.source.catalogue==='original');}
export function buildingAssetURLs(id) {
 const key=typeof id==='string'&&id.startsWith('building:')?id:'building:'+id;
 const asset=sharedAsset(key);if(asset.source.catalogue!=='original')throw Error('This asset package contains original building files only: '+id);
 const stem=key.slice(9),base=new URL('../../assets/buildings/',import.meta.url);
 return {id:asset.id,contract:{...BUILDING_FILE_CONTRACT},model:new URL('models/'+stem+'.gltf',base).href,buffer:new URL('models/'+stem+'.bin',base).href,blueprint:new URL('models/'+stem+'.blueprint.json',base).href,atlas:new URL('painted-materials-v2.png',base).href};
}
