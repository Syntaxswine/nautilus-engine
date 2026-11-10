import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const RAILWAY_ROUTE_BASE = 'e17360b3041215cf2a6d1ea3dfb7a8ef76ae7e35';
export const RAILWAY_ROUTE_SCHEMA = 'schemas/railway-routes-v1.schema.json';
const turnoutSchema = 'schemas/railway-routes-v2.schema.json';
export const RAILWAY_ROUTE_SCHEMAS = Object.freeze([RAILWAY_ROUTE_SCHEMA, turnoutSchema]);
const planner = 'packages/railway-visuals/route.js';
const core = ['packages/map-core/railway-document.js', 'packages/map-core/railway-map.js', 'packages/map-core/railway-routes.js'];

export function railwayRoutePackageFiles(profile) {
  if (profile === 'core') return [...RAILWAY_ROUTE_SCHEMAS, planner, ...core, 'packages/railway-visuals/catalogue.js'];
  if (profile === 'compatibility') return [...RAILWAY_ROUTE_SCHEMAS, planner, ...core];
  return profile === 'renderer' ? [...RAILWAY_ROUTE_SCHEMAS, planner] : RAILWAY_ROUTE_SCHEMAS;
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
      "import {EditingDocument} from './railway-document.js';\nimport {blankMap, parseMap, validateMap, W, H, SECTOR, LEVELS, blockCanvas, extractBlock, validateBlock} from './railway-map.js';\nimport {RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE} from '../railway-visuals/route.js';");
    text = replace(text, "export {generateConnectedMap} from './roof-generator.js';\nexport {assertMapCapabilities,requiredMapFeatures} from './roof-maps.js';",
      "export {generateConnectedMap,assertMapCapabilities,requiredMapFeatures} from './railway-map.js';");
    text = replace(text, "export {openBlock, placeBlock} from './roof-blocks.js';\nexport {rotateSceneryBlock} from './roof-rotation.js';",
      "export {openBlock, placeBlock, rotateSceneryBlock} from './railway-map.js';\nexport {RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_ROUTE_LIMITS, RAILWAY_RADIUS_M, planRailwayRoute, planRailwayTurnout, railwayStationAt, snapRailwayWaypoint} from '../railway-visuals/route.js';\nexport {railwayRoutesOf} from './railway-routes.js';");
    text = replace(text, "'nautilus-sloped-roofs-v1']});", "'nautilus-sloped-roofs-v1',RAILWAY_ROUTE_FEATURE,RAILWAY_TURNOUT_FEATURE]});");
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
      "// never an automatic promise that a consumer implements gameplay for them.\nimport {RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE} from '../railway-visuals/route.js';\n\n");
    text = replace(text, 'SCHEMA_IDS = freeze({', "SCHEMA_IDS = freeze({railwayRoutes:'nautilus-railway-routes', ");
    text = replace(text, 'FEATURE_IDS = freeze({', 'FEATURE_IDS = freeze({railwayRoutes:RAILWAY_ROUTE_FEATURE, railwayTurnouts:RAILWAY_TURNOUT_FEATURE, ');
    text = replace(text, '  schemas: [', '  schemas: [{id:SCHEMA_IDS.railwayRoutes,versions:[1,2]}, ');
    text = replace(text, '  capabilities: [',
      "  capabilities: [\n    {id: FEATURE_IDS.railwayRoutes, versions: [1], description: 'Optional level railway waypoints and deterministic 4 m tangent routes; consumer owns presentation and runtime behavior.'},\n    {id: FEATURE_IDS.railwayTurnouts, versions: [1], description: 'Static level 45 degree railway splits and versioned branch waypoints.'},");
    return replace(text, 'const SCHEMA_DOCUMENTS = freeze([',
      "const SCHEMA_DOCUMENTS = freeze([\n  {id:SCHEMA_IDS.railwayRoutes,version:1,uri:'urn:nautilus:schema:railway-routes:1',file:'railway-routes-v1.schema.json'},\n  {id:SCHEMA_IDS.railwayRoutes,version:2,uri:'urn:nautilus:schema:railway-routes:2',file:'railway-routes-v2.schema.json'},");
  },
  'schemas/aft-map-v2.schema.json': text => replace(text, '      "$ref": "urn:nautilus:schema:sloped-roofs:1"\n    }',
    '      "$ref": "urn:nautilus:schema:sloped-roofs:1"\n    },\n    "railwayRoutes": {\n      "oneOf": [\n        {"$ref": "urn:nautilus:schema:railway-routes:1"},\n        {"$ref": "urn:nautilus:schema:railway-routes:2"}\n      ]\n    }')
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
    indexed(file, bytes);
  }
  return {preimages, actual};
}
