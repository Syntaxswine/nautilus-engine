import * as legacy from './maps.js';
import {requiredMapFeatures as wallFeatures,assertMapCapabilities as assertWallCapabilities} from './wall-runs.js';
import {prefabErrors,PREFAB_FEATURE} from '../prefab-core/index.js';
export * from './maps.js';
export function validateMap(map,options) {return [...legacy.validateMap(map,options),...prefabErrors(map)];}
export function parseMap(text,options) {
  const map=legacy.parseMap(text,options),errors=prefabErrors(map);if(errors.length)throw Error(errors.join(' '));return map;
}
export function requiredMapFeatures(map) {
  const errors=prefabErrors(map);if(errors.length)throw Error(errors.join(' '));
  return [...wallFeatures(map),...(map.buildingPrefabs?.instances?.length?[PREFAB_FEATURE]:[])];
}
export function assertMapCapabilities(map,features=[]) {
  if(!Array.isArray(features)||features.some(f=>typeof f!=='string'))throw Error('A game adapter must declare supported map features as a string array.');
  requiredMapFeatures(map);
  assertWallCapabilities(map,features);
  if(map.buildingPrefabs?.instances?.length&&!features.includes(PREFAB_FEATURE))throw Error('This game adapter does not support building prefabs ('+PREFAB_FEATURE+').');
  return map;
}
