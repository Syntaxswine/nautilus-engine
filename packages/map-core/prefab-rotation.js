import {rotateSceneryBlock as legacy} from './blocks.js';
import {assertPrefabBlock} from '../prefab-core/index.js';
export function rotateSceneryBlock(block,turns) {assertPrefabBlock(block);return legacy(block,turns);}
