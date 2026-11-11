import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const RAILWAY_ROUTE_BASE = 'e17360b3041215cf2a6d1ea3dfb7a8ef76ae7e35';
export const RAILWAY_ROUTE_SCHEMA = 'schemas/railway-routes-v1.schema.json';
const turnoutSchema = 'schemas/railway-routes-v2.schema.json';
const crossingSchema = 'schemas/railway-routes-v3.schema.json';
const trainSchema = 'schemas/railway-routes-v4.schema.json';
const worldStockSchema = 'schemas/railway-routes-v6.schema.json';
const signalsSchema = 'schemas/railway-routes-v5.schema.json';
export const RAILWAY_ROUTE_SCHEMAS = Object.freeze([RAILWAY_ROUTE_SCHEMA, turnoutSchema, crossingSchema, trainSchema, signalsSchema, worldStockSchema]);
const planner = 'packages/railway-visuals/route.js';
const train = 'packages/map-core/railway-train.js';
const core = ['packages/map-core/railway-document.js', 'packages/map-core/railway-map.js', 'packages/map-core/railway-routes.js', train, 'packages/map-core/railway-traffic.js'];

export function railwayRoutePackageFiles(profile) {
  if (profile === 'core') return [...RAILWAY_ROUTE_SCHEMAS, planner, ...core, 'packages/railway-visuals/catalogue.js', 'packages/railway-visuals/stock-profile.js', 'packages/railway-visuals/entrances.js'];
  if (profile === 'compatibility') return [...RAILWAY_ROUTE_SCHEMAS, planner, ...core];
  return profile === 'renderer' ? [...RAILWAY_ROUTE_SCHEMAS, planner, train] : RAILWAY_ROUTE_SCHEMAS;
}

export function historicalRailwayCoreClosure(closure) {
  const additions = railwayRoutePackageFiles('core');
  return closure.filter(file => !additions.includes(file));
}

function replace(text, anchor, replacement) {
  assert.equal(text.split(anchor).length, 2, 'Expected one railway route registration anchor: ' + anchor);
  return text.replace(anchor, replacement);
}

// Authenticate the exact additive facade against the reviewed railway-kit
// tree before feeding any historical bytes to a fixed-baseline source check.
const additions = {
  'packages/map-core/index.js': text => {
    text = replace(text, "import {EditingDocument} from './roof-document.js';\nimport {blankMap, parseMap, validateMap, W, H, SECTOR, LEVELS} from './roof-maps.js';\nimport {blockCanvas, extractBlock, validateBlock} from './roof-blocks.js';",
      "import {EditingDocument} from './railway-document.js';\nimport {blankMap, parseMap, validateMap, W, H, SECTOR, LEVELS, blockCanvas, extractBlock, validateBlock} from './railway-map.js';\nimport {RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_CROSSING_FEATURE, RAILWAY_TRAIN_FEATURE, RAILWAY_SIGNAL_FEATURE, RAILWAY_WORLD_STOCK_FEATURE} from '../railway-visuals/route.js';");
    text = replace(text, "export {generateConnectedMap} from './roof-generator.js';\nexport {assertMapCapabilities,requiredMapFeatures} from './roof-maps.js';",
      "export {generateConnectedMap,assertMapCapabilities,requiredMapFeatures} from './railway-map.js';");
    text = replace(text, "export {openBlock, placeBlock} from './roof-blocks.js';\nexport {rotateSceneryBlock} from './roof-rotation.js';",
      "export {openBlock, placeBlock, rotateSceneryBlock} from './railway-map.js';\nexport {RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_CROSSING_FEATURE, RAILWAY_TRAIN_FEATURE, RAILWAY_SIGNAL_FEATURE, RAILWAY_WORLD_STOCK_FEATURE, RAILWAY_ROUTE_LIMITS, RAILWAY_RADIUS_M, planRailwayRoute, planRailwayTurnout, railwayStationAt, snapRailwayWaypoint, railwayCrossingsByRoute} from '../railway-visuals/route.js';\nexport {railwayRoutesOf, railwayCrossingsOf, railwayTrainOf, railwayTrainsOf} from './railway-routes.js';\nexport {createRailwayTrain, RAILWAY_STOCK, RAILWAY_STOCK_PROFILES, RAILWAY_COUPLER_HEIGHT_M} from './railway-train.js';\nexport {createRailwayTraffic} from './railway-traffic.js';");
    text = replace(text, "'nautilus-sloped-roofs-v1']});", "'nautilus-sloped-roofs-v1',RAILWAY_ROUTE_FEATURE,RAILWAY_TURNOUT_FEATURE,RAILWAY_CROSSING_FEATURE,RAILWAY_TRAIN_FEATURE,RAILWAY_SIGNAL_FEATURE,RAILWAY_WORLD_STOCK_FEATURE]});");
    return replace(text, '    upperLevels:', '    ...(map.railwayRoutes ? {railwayRoutes: map.railwayRoutes.routes.length} : {}),\n    upperLevels:');
  },
  'packages/map-core/capabilities.js': text => replace(text,
    "import {requiredMapFeatures, parseMap} from './roof-maps.js';\nimport {validateBlock} from './roof-blocks.js';",
    "import {requiredMapFeatures, parseMap, validateBlock} from './railway-map.js';"),
  'packages/map-core/persistence.js': text => replace(text,
    "import {EditingDocument} from './roof-document.js';\nimport {parseMap} from './roof-maps.js';",
    "import {EditingDocument} from './railway-document.js';\nimport {parseMap} from './railway-map.js';"),
  'packages/map-core/contract-manifest.js': text => {
    text = replace(text, '// never an automatic promise that a consumer implements gameplay for them.\n',
      "// never an automatic promise that a consumer implements gameplay for them.\nimport {RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_CROSSING_FEATURE, RAILWAY_TRAIN_FEATURE, RAILWAY_SIGNAL_FEATURE, RAILWAY_WORLD_STOCK_FEATURE} from '../railway-visuals/route.js';\n\n");
    text = replace(text, 'SCHEMA_IDS = freeze({', "SCHEMA_IDS = freeze({railwayRoutes:'nautilus-railway-routes', ");
    text = replace(text, 'FEATURE_IDS = freeze({', 'FEATURE_IDS = freeze({railwayRoutes:RAILWAY_ROUTE_FEATURE, railwayTurnouts:RAILWAY_TURNOUT_FEATURE, railwayCrossings:RAILWAY_CROSSING_FEATURE, railwayTrains:RAILWAY_TRAIN_FEATURE, railwaySignals:RAILWAY_SIGNAL_FEATURE, railwayWorldStock:RAILWAY_WORLD_STOCK_FEATURE, ');
    text = replace(text, '  schemas: [', '  schemas: [{id:SCHEMA_IDS.railwayRoutes,versions:[1,2,3,4,5,6]}, ');
    text = replace(text, '  capabilities: [',
      "  capabilities: [\n    {id: FEATURE_IDS.railwayRoutes, versions: [1], description: 'Optional level railway waypoints and deterministic 4 m tangent routes; consumer owns presentation and runtime behavior.'},\n    {id: FEATURE_IDS.railwayTurnouts, versions: [1], description: 'Static level 45 degree railway splits and versioned branch waypoints.'},\n    {id: FEATURE_IDS.railwayCrossings, versions: [1], description: 'Derived level 45 and 90 degree diamond crossings between independent straight railway approaches.'},\n    {id: FEATURE_IDS.railwayTrains, versions: [1], description: 'Authored train departure and switch position with a host-driven rail itinerary for a single consist.'},\n    {id: FEATURE_IDS.railwaySignals, versions: [1], description: 'Two train departures and shared crossing and turnout signals.'},\n    {id: FEATURE_IDS.railwayWorldStock, versions: [1], description: 'Explicit world-size train proportions, 16 m bends and wider rolling-stock clearance.'},");
    return replace(text, 'const SCHEMA_DOCUMENTS = freeze([',
      "const SCHEMA_DOCUMENTS = freeze([\n  {id:SCHEMA_IDS.railwayRoutes,version:1,uri:'urn:nautilus:schema:railway-routes:1',file:'railway-routes-v1.schema.json'},\n  {id:SCHEMA_IDS.railwayRoutes,version:2,uri:'urn:nautilus:schema:railway-routes:2',file:'railway-routes-v2.schema.json'},\n  {id:SCHEMA_IDS.railwayRoutes,version:3,uri:'urn:nautilus:schema:railway-routes:3',file:'railway-routes-v3.schema.json'},\n  {id:SCHEMA_IDS.railwayRoutes,version:4,uri:'urn:nautilus:schema:railway-routes:4',file:'railway-routes-v4.schema.json'},\n  {id:SCHEMA_IDS.railwayRoutes,version:5,uri:'urn:nautilus:schema:railway-routes:5',file:'railway-routes-v5.schema.json'},\n  {id:SCHEMA_IDS.railwayRoutes,version:6,uri:'urn:nautilus:schema:railway-routes:6',file:'railway-routes-v6.schema.json'},");
  },
  'schemas/aft-map-v2.schema.json': text => replace(text, '      "$ref": "urn:nautilus:schema:sloped-roofs:1"\n    }',
    '      "$ref": "urn:nautilus:schema:sloped-roofs:1"\n    },\n    "railwayRoutes": {\n      "oneOf": [\n        {"$ref": "urn:nautilus:schema:railway-routes:1"},\n        {"$ref": "urn:nautilus:schema:railway-routes:2"},\n        {"$ref": "urn:nautilus:schema:railway-routes:3"},\n        {"$ref": "urn:nautilus:schema:railway-routes:4"},\n        {"$ref": "urn:nautilus:schema:railway-routes:5"},\n        {"$ref": "urn:nautilus:schema:railway-routes:6"}\n      ]\n    }')
};

export function historicalRailwayRouteBytes(object, file, current) {
  if (!Object.hasOwn(additions, file)) return current;
  const before = object(RAILWAY_ROUTE_BASE, file);
  assert.ok(current.equals(Buffer.from(additions[file](before.toString('utf8')))),
    'Shared bytes differ outside the exact railway route registration: ' + file);
  return before;
}

export function verifyRailwayRouteFiles({object, read, indexed}) {
  const preimages = {}, actual = {};
  for (const file of Object.keys(additions)) {
    actual[file] = read(file);
    preimages[file] = historicalRailwayRouteBytes(object, file, actual[file]);
    indexed(file, actual[file]);
  }
  for (const file of [...RAILWAY_ROUTE_SCHEMAS, planner, ...core, 'tools/railway-route-registration.mjs']) {
    const bytes = read(file);
    assert.ok(bytes.length, 'Empty railway route registration file: ' + file);
    if (file === RAILWAY_ROUTE_SCHEMA) {
      assert.equal(createHash('sha256').update(bytes).digest('hex'),
        '935a7db4251a5a9105d97974e3e999059285f5a3c114216e5e01183bee7b75b3');
    }
    if (file === turnoutSchema) {
      assert.equal(createHash('sha256').update(bytes).digest('hex'),
        '43d22950e98c62bda9682a4d010259d3dc526bbfbf69b134efa60a93f7e11913');
    }
    if (file === crossingSchema) {
      assert.equal(createHash('sha256').update(bytes).digest('hex'),
        '6296c51f34204ed6adab7bba0ae1f3c0b6e7c61f82192a0d4700caa76adebf86');
    }
    if (file === trainSchema) {
      assert.equal(createHash('sha256').update(bytes).digest('hex'),
        '572bd1a350d34c3c53f9c850dadc969924b48651211edb6e34dbf9e5fe73c106');
    }
    if (file === signalsSchema) {
      assert.equal(createHash('sha256').update(bytes).digest('hex'),
        '676476e80cebc66411541f766ebeb37279cc0d1e10d2930f1789157fd84f9b48');
    }
    if (file === worldStockSchema) {
      assert.equal(createHash('sha256').update(bytes).digest('hex'), 'a3ee9caeeecff9864e9394833bd3a47796f65eb444de179047b770cfcb3ea044');
    }
    indexed(file, bytes);
  }
  return {preimages, actual};
}
