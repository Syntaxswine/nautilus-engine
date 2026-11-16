import * as maps from './roof-maps.js';
import * as blocks from './roof-blocks.js';
import {generateConnectedMap as generate} from './roof-generator.js';
import {rotateSceneryBlock as rotate} from './roof-rotation.js';
import {RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_CROSSING_FEATURE, RAILWAY_TRAIN_FEATURE,
  RAILWAY_SIGNAL_FEATURE, RAILWAY_WORLD_STOCK_FEATURE,RAILWAY_SURVEYED_FEATURE} from '../railway-visuals/route.js';
import {assertRailwayRoutes, refuseRailwayRoutes as refuseRailways, railwayTrainsOf} from './railway-routes.js';
function refuseRailwayRoutes(map,workflow){refuseRailways(map,workflow);if(map?.mountDora!==undefined||map?.mountDoraEngine!==undefined)throw Error(workflow+' cannot preserve Mount Dora global source/placement metadata. Keep the complete native sector and its explicit adapter.');}

export {blankMap, W, H, SECTOR, LEVELS} from './roof-maps.js';
export {blockCanvas, isBlock} from './roof-blocks.js';

export function validateMap(map, options) {
  const errors = maps.validateMap(map, options);
  if (errors.length) return errors;
  try { assertRailwayRoutes(map); return []; }
  catch (error) { return [error.message]; }
}

export function parseMap(text, options) {
  // Check the source before the legacy migration can discard unknown fields.
  if (typeof text === 'string' && text.length <= 4000000) {
    const raw = JSON.parse(text);
    if (raw?.version !== 2) refuseRailwayRoutes(raw, 'The legacy map format');
  }
  const map = maps.parseMap(text, options);
  assertRailwayRoutes(map);
  return map;
}

export function requiredMapFeatures(map) {
  const required = maps.requiredMapFeatures(map);
  if(map.mountDora!==undefined||map.mountDoraEngine!==undefined)required.push('nautilus-mount-dora-content-v1');
  const {plans, crossings} = assertRailwayRoutes(map);
  if (plans.length) required.push(RAILWAY_ROUTE_FEATURE);
  if (plans.some(route => route.turnout)) required.push(RAILWAY_TURNOUT_FEATURE);
  if (crossings.length) required.push(RAILWAY_CROSSING_FEATURE);
  const trains = railwayTrainsOf(map);
  if (trains.length) required.push(RAILWAY_TRAIN_FEATURE);
  if (trains.length > 1) required.push(RAILWAY_SIGNAL_FEATURE);
  if (map.railwayRoutes?.version >= 6) required.push(RAILWAY_WORLD_STOCK_FEATURE);
  if(map.railwayRoutes?.routes.some(r=>r.geometryProfile==='surveyed-v1'))required.push(RAILWAY_SURVEYED_FEATURE);
  return required;
}

export function assertMapCapabilities(map, features = []) {
  maps.assertMapCapabilities(map, features);
  if((map.mountDora!==undefined||map.mountDoraEngine!==undefined)&&!features.includes('nautilus-mount-dora-content-v1'))throw Error('This game adapter does not support Mount Dora source/content metadata (nautilus-mount-dora-content-v1).');
  const {plans, crossings} = assertRailwayRoutes(map);
  if (plans.length && !features.includes(RAILWAY_ROUTE_FEATURE)) {
    throw new Error(`This game adapter does not support railway routes (${RAILWAY_ROUTE_FEATURE}).`);
  }
  if (plans.some(route => route.turnout) && !features.includes(RAILWAY_TURNOUT_FEATURE)) {
    throw new Error(`This game adapter does not support railway splits (${RAILWAY_TURNOUT_FEATURE}).`);
  }
  if (crossings.length && !features.includes(RAILWAY_CROSSING_FEATURE)) {
    throw new Error(`This game adapter does not support railway crossings (${RAILWAY_CROSSING_FEATURE}).`);
  }
  const trains = railwayTrainsOf(map);
  if (trains.length && !features.includes(RAILWAY_TRAIN_FEATURE)) {
    throw new Error(`This game adapter does not support railway trains (${RAILWAY_TRAIN_FEATURE}).`);
  }
  if (trains.length > 1 && !features.includes(RAILWAY_SIGNAL_FEATURE)) {
    throw new Error(`This game adapter does not support shared railway signals (${RAILWAY_SIGNAL_FEATURE}).`);
  }
  if (map.railwayRoutes?.version >= 6 && !features.includes(RAILWAY_WORLD_STOCK_FEATURE)) {
    throw new Error(`This game adapter does not support world-size railways (${RAILWAY_WORLD_STOCK_FEATURE}).`);
  }
  if(map.railwayRoutes?.routes.some(r=>r.geometryProfile==='surveyed-v1')&&!features.includes(RAILWAY_SURVEYED_FEATURE))throw Error('This game adapter does not support measured railway bearings ('+RAILWAY_SURVEYED_FEATURE+').');
  return map;
}

export function validateBlock(block) {
  refuseRailwayRoutes(block, 'The reusable block format');
  return blocks.validateBlock(block);
}
export function openBlock(block) {
  refuseRailwayRoutes(block, 'The reusable block format');
  return blocks.openBlock(block);
}
export function extractBlock(map, sx = 0, sy = 0) {
  refuseRailwayRoutes(map, 'Block capture');
  return blocks.extractBlock(map, sx, sy);
}
export function placeBlock(map, block, sx, sy) {
  refuseRailwayRoutes(map, 'Block replacement in this map');
  refuseRailwayRoutes(block, 'The reusable block format');
  return blocks.placeBlock(map, block, sx, sy);
}
export function rotateSceneryBlock(block, ...args) {
  refuseRailwayRoutes(block, 'Block rotation');
  return rotate(block, ...args);
}
export function generateConnectedMap(designs, seed, plan) {
  for (const block of designs) refuseRailwayRoutes(block, 'Connected map generation');
  return generate(designs, seed, plan);
}
