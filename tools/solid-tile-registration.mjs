import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Public ground-solid v1 is an additive registration over the fixed main
// before it. Historical tile proofs can still inspect the authenticated
// previous shared files. Their runtime, fixtures and assertions are unchanged.
export const SOLID_TILE_BASE = '1e6a97b67c57917160db89db34cbae9e4e46f90c';
export const SOLID_TILE_SCHEMA = 'schemas/solid-ground-tiles-v1.schema.json';
const coreFiles = ['packages/map-core/solid-tile-document.js', 'packages/map-core/solid-tiles.js'];
const publicFiles = [SOLID_TILE_SCHEMA, ...coreFiles].sort();
export function solidTilePackageFiles(profile) {
  return profile === 'core' || profile === 'compatibility' ? publicFiles : [SOLID_TILE_SCHEMA];
}

function replace(text, before, after) {
  assert.equal(text.split(before).length, 2, 'Expected one solid tile registration anchor: ' + before);
  return text.replace(before, after);
}
const withSchemaRef = text => replace(text, '    "slopedRoofs": {',
  '    "solidTiles": {\n      "$ref": "urn:nautilus:schema:solid-ground-tiles:1"\n    },\n    "slopedRoofs": {');
const additions = {
  'packages/map-core/contract-manifest.js': text => {
    text = replace(text, 'SCHEMA_IDS = freeze({', "SCHEMA_IDS = freeze({solidTiles:'nautilus-solid-ground-tiles',");
    text = replace(text, 'FEATURE_IDS = freeze({', "FEATURE_IDS = freeze({solidTiles:'nautilus-solid-ground-tiles-v1',");
    text = replace(text, '  schemas: [', '  schemas: [{id:SCHEMA_IDS.solidTiles,versions:[1]},');
    text = replace(text, '  capabilities: [',
      "  capabilities: [\n    {id:FEATURE_IDS.solidTiles,versions:[1],description:'Sparse solid terrain columns and ordinary stair-step candidates. Consumers bind clearance, movement costs and world physics.'},");
    return replace(text, 'const SCHEMA_DOCUMENTS = freeze([',
      "const SCHEMA_DOCUMENTS = freeze([\n  {id:SCHEMA_IDS.solidTiles,version:1,uri:'urn:nautilus:schema:solid-ground-tiles:1',file:'solid-ground-tiles-v1.schema.json'},");
  },
  'packages/map-core/capabilities.js': text => replace(text,
    "import {requiredMapFeatures, parseMap} from './roof-maps.js';\nimport {validateBlock} from './roof-blocks.js';",
    "import {requiredMapFeatures, parseMap, validateBlock} from './solid-tile-document.js';"),
  'packages/map-core/index.js': text => {
    text = replace(text,
      "import {EditingDocument} from './roof-document.js';\nimport {blankMap, parseMap, validateMap, W, H, SECTOR, LEVELS} from './roof-maps.js';\nimport {blockCanvas, extractBlock, validateBlock} from './roof-blocks.js';",
      "import {EditingDocument, parseMap, validateMap, extractBlock, validateBlock} from './solid-tile-document.js';\nimport {blankMap, W, H, SECTOR, LEVELS} from './roof-maps.js';\nimport {blockCanvas} from './roof-blocks.js';\nimport {SOLID_TILE_FEATURE} from './solid-tiles.js';");
    text = replace(text,
      "export {generateConnectedMap} from './roof-generator.js';\nexport {assertMapCapabilities,requiredMapFeatures} from './roof-maps.js';",
      "export {generateConnectedMap, assertMapCapabilities, requiredMapFeatures} from './solid-tile-document.js';");
    text = replace(text,
      "export {openBlock, placeBlock} from './roof-blocks.js';\nexport {rotateSceneryBlock} from './roof-rotation.js';",
      "export {openBlock, placeBlock, rotateSceneryBlock} from './solid-tile-document.js';\nexport {SOLID_TILE_FEATURE, SOLID_TILE_STEPS, SOLID_TILE_LIMIT, SOLID_TILE_SKINS, solidTileHeightM, solidTileAt, solidTileGeometry, planSolidTileStep} from './solid-tiles.js';");
    return replace(text, "'nautilus-sloped-roofs-v1']});", "'nautilus-sloped-roofs-v1',SOLID_TILE_FEATURE]});");
  },
  'packages/map-core/persistence.js': text => replace(text,
    "import {EditingDocument} from './roof-document.js';\nimport {parseMap} from './roof-maps.js';",
    "import {EditingDocument, parseMap} from './solid-tile-document.js';"),
  'schemas/aft-map-v2.schema.json': withSchemaRef,
  'schemas/aft-block-v1.schema.json': withSchemaRef
};
export const solidTileRegisteredSharedFiles = Object.keys(additions);
export function registeredSolidTileBytes(file, preimage) {
  return Buffer.from(additions[file](preimage.toString()), 'utf8');
}
export function historicalSolidTileBytes(object, file, current) {
  if (!Object.hasOwn(additions, file)) return current;
  const original = object(SOLID_TILE_BASE, file);
  assert.ok(current.equals(registeredSolidTileBytes(file, original)), 'Shared file differs outside the solid-tile registration: ' + file);
  return original;
}
export function verifySolidTileFiles({object, read, indexed}) {
  const preimages = {}, actual = {};
  for (const file of solidTileRegisteredSharedFiles) {
    actual[file] = read(file);
    preimages[file] = historicalSolidTileBytes(object, file, actual[file]);
    indexed(file, actual[file]);
  }
  for (const file of publicFiles) {
    const bytes = read(file);
    assert.ok(bytes.length, 'Missing registered solid tile file: ' + file);
    if (file === SOLID_TILE_SCHEMA) assert.equal(createHash('sha256').update(bytes).digest('hex'), 'f842a4c951352da0a9b6da8bf8c4519b12bf38d9d726e74705d9fae4ff9b24db');
    indexed(file, bytes);
  }
  return {preimages, actual};
}
