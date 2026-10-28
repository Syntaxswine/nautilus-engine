import {rotateSceneryBlock as legacy} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/scenery-block-rotation.js';
import {assertPrefabBlock} from '../prefab-core/index.js';
export function rotateSceneryBlock(block,turns) {assertPrefabBlock(block);return legacy(block,turns);}
