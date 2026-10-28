import {generateConnectedMap as legacy} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-generator.js';
import {assertPrefabBlock} from '../prefab-core/index.js';
export function generateConnectedMap(designs,seed,plan) {for(const block of designs)assertPrefabBlock(block);return legacy(designs,seed,plan);}
