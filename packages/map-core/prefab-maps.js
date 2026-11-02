import * as legacy from './maps.js';
import {requiredMapFeatures as wallFeatures,assertMapCapabilities as assertWallCapabilities} from './wall-runs.js';
import {prefabErrors,PREFAB_FEATURE,buildingAsset,ORIGINAL_BUILDING_FEATURE} from '../prefab-core/index.js';
export * from './maps.js';
export function validateMap(map,options) {return [...legacy.validateMap(map,options),...prefabErrors(map)];}
export function parseMap(text,options) {
  if(typeof text==='string'&&text.length<=4000000){const errors=prefabErrors(JSON.parse(text));if(errors.length)throw Error(errors.join(' '));}
  const map=legacy.parseMap(text,options),errors=prefabErrors(map);if(errors.length)throw Error(errors.join(' '));return map;
}
export function requiredMapFeatures(map) {
  const errors=prefabErrors(map);if(errors.length)throw Error(errors.join(' '));
  const instances=map.buildingPrefabs?.instances||[];
  return [...wallFeatures(map),...(instances.length?[PREFAB_FEATURE]:[]),...(instances.some(p=>buildingAsset(p.asset).provider==='original')?[ORIGINAL_BUILDING_FEATURE]:[])];
}
export function assertMapCapabilities(map,features=[]) {
  if(!Array.isArray(features)||features.some(f=>typeof f!=='string'))throw Error('A game adapter must declare supported map features as a string array.');
  const required=requiredMapFeatures(map);
  assertWallCapabilities(map,features);
  if(map.buildingPrefabs?.instances?.length&&!features.includes(PREFAB_FEATURE))throw Error('This game adapter does not support building prefabs ('+PREFAB_FEATURE+').');
  if(required.includes(ORIGINAL_BUILDING_FEATURE)&&!features.includes(ORIGINAL_BUILDING_FEATURE))throw Error('This game adapter does not support original building prefabs ('+ORIGINAL_BUILDING_FEATURE+').');
  return map;
}
