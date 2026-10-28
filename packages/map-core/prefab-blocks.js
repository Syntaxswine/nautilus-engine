import * as legacy from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';
import {assertPrefabBlock,assertPrefabSector,prefabErrors} from '../prefab-core/index.js';
export * from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';
export function validateBlock(block) {assertPrefabBlock(block);return legacy.validateBlock(block);}
export function openBlock(block) {assertPrefabBlock(block);return legacy.openBlock(block);}
export function extractBlock(map,sx=0,sy=0) {assertPrefabSector(map,sx,sy);return legacy.extractBlock(map,sx,sy);}
export function placeBlock(map,block,sx,sy) {
  assertPrefabBlock(block);assertPrefabSector(map,sx,sy);
  const result=legacy.placeBlock(map,block,sx,sy),errors=prefabErrors(result);if(errors.length)throw Error(errors[0]);return result;
}
