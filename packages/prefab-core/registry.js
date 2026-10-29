import {BUILDING_ASSETS as grossAssets,PREFAB_CATALOGUE,PREFAB_SOURCE_ROOT} from './catalogue.js';
import {ORIGINAL_BUILDING_ASSETS,ORIGINAL_BUILDING_SOURCE} from './original-catalogue.js';
export {PREFAB_CATALOGUE,PREFAB_SOURCE_ROOT,ORIGINAL_BUILDING_ASSETS,ORIGINAL_BUILDING_SOURCE};
export const COMBINED_PREFAB_CATALOGUE='nautilus-gross-original-v1@6693bfa3fea2edec77649d830de5ac68ba4c1a50+ee7c18ecdc2669168247b94a82156634b2c4ffe5';
export const ORIGINAL_BUILDING_FEATURE='nautilus-original-buildings-v1';
export const GROSS_BUILDING_ASSETS=Object.freeze(grossAssets.map(asset=>Object.freeze({...asset,provider:'gross',collectionId:'gross',group:'Historic homes'})));
export const BUILDING_ASSETS=Object.freeze([...GROSS_BUILDING_ASSETS,...ORIGINAL_BUILDING_ASSETS]);
const assets=new Map(BUILDING_ASSETS.map(asset=>[asset.id,asset]));
if(assets.size!==BUILDING_ASSETS.length)throw Error('Prefab asset IDs must be unique across fixed collections.');
export const buildingAsset=id=>assets.get(id);
export const isPrefabCatalogue=id=>id===PREFAB_CATALOGUE||id===COMBINED_PREFAB_CATALOGUE;
export const catalogueHasAsset=(catalogue,id)=>isPrefabCatalogue(catalogue)&&!!assets.get(id)&&(catalogue===COMBINED_PREFAB_CATALOGUE||assets.get(id).provider==='gross');
export function catalogueForAssets(ids,currentCatalogue=PREFAB_CATALOGUE){
  if(!isPrefabCatalogue(currentCatalogue))throw Error('Unsupported building prefab catalogue.');
  if(!Array.isArray(ids)||ids.some(id=>!assets.has(id)))throw Error('Choose known building assets.');
  return currentCatalogue===COMBINED_PREFAB_CATALOGUE||ids.some(id=>assets.get(id).provider==='original')?COMBINED_PREFAB_CATALOGUE:PREFAB_CATALOGUE;
}
export const DEFAULT_RESIDENTIAL_ASSETS=Object.freeze(['bramble-ranch','hearth-cape','cypress-shotgun','dogwood-breezeway','ashland-worker','archer-worker']);
