import * as legacy from './prefab-maps.js';
import {ROOF_FEATURE,roofsOf} from '../roof-core/index.js';
import {roofAuthoringErrors,assertRoofData} from './roof-data.js';
export * from './prefab-maps.js';
function rejectAppearance(map){if(map?.kind==='nautilus-appearance-document')throw Error('Use the appearance API and negotiated nautilus-bear-appearance-v1 support for this document.');}
export function validateMap(map,options) {if(map?.kind==='nautilus-appearance-document')return ['Use the appearance API and negotiated nautilus-bear-appearance-v1 support.'];return [...legacy.validateMap(map,options),...roofAuthoringErrors(map)];}
export function parseMap(text,options) {
  if(typeof text==='string'&&text.length<=4000000){const raw=JSON.parse(text);if(raw?.kind==='nautilus-appearance-document')throw Error('Use the appearance API and negotiated nautilus-bear-appearance-v1 support for this document.');assertRoofData(raw);}
  return assertRoofData(legacy.parseMap(text,options));
}
export function requiredMapFeatures(map) {
  rejectAppearance(map);assertRoofData(map);return [...legacy.requiredMapFeatures(map),...(roofsOf(map).length?[ROOF_FEATURE]:[])];
}
export function assertMapCapabilities(map,features=[]) {
  rejectAppearance(map);assertRoofData(map);legacy.assertMapCapabilities(map,features);
  if(roofsOf(map).length&&!features.includes(ROOF_FEATURE))throw Error('This game adapter does not support procedural sloped roofs ('+ROOF_FEATURE+').');
  return map;
}
