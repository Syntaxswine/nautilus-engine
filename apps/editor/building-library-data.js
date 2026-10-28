import {BUILDING_ASSETS,GROSS_BUILDING_ASSETS,ORIGINAL_BUILDING_ASSETS,DEFAULT_RESIDENTIAL_ASSETS,ORIGINAL_BUILDING_FEATURE,buildingAsset} from '../../packages/prefab-core/registry.js';
import {STRUCTURE_PRESETS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-structure-presets.js';
const portable=Object.entries(STRUCTURE_PRESETS).filter(([id])=>id!=='room').map(([id,p])=>Object.freeze({id,name:p.name,width:p.width,depth:p.height,portable:true,collectionId:'aft',collection:'AFT structures'}));
export const LIBRARY_BUILDINGS=Object.freeze([...BUILDING_ASSETS,...portable]);
export const BUILDING_POOLS=Object.freeze([
  {id:'residential',label:'Small residential mix',ids:DEFAULT_RESIDENTIAL_ASSETS},
  {id:'gross',label:'Gross catalogue · 13 houses',ids:GROSS_BUILDING_ASSETS.map(a=>a.id)},
  {id:'original-homes',label:'Original architecture · 24 homes',ids:ORIGINAL_BUILDING_ASSETS.filter(a=>a.group==='Homes').map(a=>a.id)},
  {id:'original',label:'Original architecture · all 48',ids:ORIGINAL_BUILDING_ASSETS.map(a=>a.id)},
  {id:'all',label:'Both collections · all 61',ids:BUILDING_ASSETS.map(a=>a.id)},
  {id:'selected',label:'Selected whole building'}
].map(pool=>Object.freeze({...pool,...pool.ids&&{ids:Object.freeze([...pool.ids])}})));
export function findBuildings(query='',collection='') {
  const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return LIBRARY_BUILDINGS.filter(a=>(!collection||a.collectionId===collection)&&words.every(word=>[a.id,a.name,a.collection,a.group,a.style].filter(Boolean).join(' ').toLowerCase().includes(word)));
}
export function seedAssetIds(poolId,selectedId) {
  const pool=BUILDING_POOLS.find(p=>p.id===poolId);if(!pool)throw Error('Choose a building collection.');
  if(poolId==='selected'){if(!buildingAsset(selectedId))throw Error('Select a whole building; AFT structure stamps use their placement tool.');return [selectedId];}
  return [...pool.ids];
}
export function assertBuildingAuthoringSupport(ids,contract) {
  const features=contract?.optionalFeatures;
  if(ids.some(id=>buildingAsset(id)?.provider==='original')&&(!Array.isArray(features)||!features.includes(ORIGINAL_BUILDING_FEATURE)))throw Error('This editor build needs original-building placement support. The models remain available to inspect.');
}
