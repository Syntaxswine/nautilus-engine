import * as legacy from './prefab-maps.js';
import {ROOF_FEATURE,roofsOf} from '../roof-core/index.js';
import {roofAuthoringErrors,assertRoofData} from './roof-data.js';
export * from './prefab-maps.js';
export function validateMap(map,options) {return [...legacy.validateMap(map,options),...roofAuthoringErrors(map)];}
export function parseMap(text,options) {
  if(typeof text==='string'&&text.length<=4000000)assertRoofData(JSON.parse(text));
  return assertRoofData(legacy.parseMap(text,options));
}
export function requiredMapFeatures(map) {
  assertRoofData(map);return [...legacy.requiredMapFeatures(map),...(roofsOf(map).length?[ROOF_FEATURE]:[])];
}
export function assertMapCapabilities(map,features=[]) {
  assertRoofData(map);legacy.assertMapCapabilities(map,features);
  if(roofsOf(map).length&&!features.includes(ROOF_FEATURE))throw Error('This game adapter does not support procedural sloped roofs ('+ROOF_FEATURE+').');
  return map;
}
