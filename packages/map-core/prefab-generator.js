import {generateConnectedMap as legacy} from './generator.js';
import {assertPrefabBlock} from '../prefab-core/index.js';
export function generateConnectedMap(designs,seed,plan) {for(const block of designs)assertPrefabBlock(block);return legacy(designs,seed,plan);}
