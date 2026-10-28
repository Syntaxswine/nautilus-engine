// The public boundary is headless: no renderer, DOM or browser storage required.
import {EditingDocument} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-controller.js';
import {blankMap, parseMap, validateMap, W, H, SECTOR, LEVELS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {blockCanvas, extractBlock, validateBlock} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';

export {EditingDocument as MapDocument, blankMap, parseMap, validateMap, blockCanvas, extractBlock, validateBlock};
export {generateConnectedMap} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-generator.js';
export {connectionSet, connectionsMatch} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/connections.js';
export {emptyFeaturePlan, seededFeaturePlan, validateFeaturePlan} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/feature-plan.js';

export const ENGINE_VERSION = '0.1.0';
export const MAP_CONTRACT = Object.freeze({format: 'aft-map-v2', blockFormat: 'aft-block-v1', width: W, height: H, blockSize: SECTOR, levels: LEVELS, metresPerTile: 1, groundAxes: ['x', 'y'], renderUp: 'y'});
export function createMapDocument(name = 'Untitled map') { return new EditingDocument().open(JSON.stringify(blankMap(name))); }
export function createBlockDocument(name = 'Untitled block') { return new EditingDocument().open(JSON.stringify(extractBlock(blockCanvas(name)))); }
export function openDocument(input) {
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  if (typeof text !== 'string') throw new TypeError('Pass a map/block object or JSON string.');
  return new EditingDocument().open(text);
}
export function describeBlueprint(input) {
  const document = openDocument(input), map = document.map;
  return {kind: document.block ? 'block' : 'map', name: map.name, width: document.size, height: document.size,
    starts: map.starts.length, characters: map.guards.length, objects: map.props.length,
    upperLevels: (map.upper || []).filter(layer => Object.keys(layer).length > 0).length,
    errors: document.validate()};
}
