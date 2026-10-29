// Engine-owned identifiers. Versioned capabilities describe data semantics,
// never an automatic promise that a consumer implements gameplay for them.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const ENGINE_VERSION = '0.6.0';
export const SCHEMA_IDS = freeze({map: 'aft-map', block: 'aft-block', save: 'nautilus-save', rock: 'nautilus-rock', rockNoise: 'nautilus-rock-impact-noise'});
export const FEATURE_IDS = freeze({walls: 'nautilus-wall-runs-v1', prefabs: 'nautilus-building-prefabs-v1',
  originalBuildings: 'nautilus-original-buildings-v1', slopedRoofs: 'nautilus-sloped-roofs-v1', rockItems: 'nautilus-rock-items-v1'});
export const ENGINE_MANIFEST = freeze({id: 'nautilus-engine', version: ENGINE_VERSION, contractVersion: 1,
  schemas: [{id: SCHEMA_IDS.map, versions: [2]}, {id: SCHEMA_IDS.block, versions: [1]}, {id: SCHEMA_IDS.save, versions: [1]}, {id: SCHEMA_IDS.rock, versions: [1]}, {id: SCHEMA_IDS.rockNoise, versions: [1]}],
  capabilities: [
    {id: FEATURE_IDS.walls, versions: [1], description: 'Native-scale oriented wall data; consumer owns movement, sight and impacts.'},
    {id: FEATURE_IDS.prefabs, versions: [1], description: 'Whole-building references with immutable catalogue identities.'},
    {id: FEATURE_IDS.originalBuildings, versions: [1], description: 'The reviewed original architectural catalogue and its full assemblies.'},
    {id: FEATURE_IDS.slopedRoofs, versions: [1], description: 'Procedural roof descriptors; consumer owns support, traversal, fire and collapse.'},
    {id: FEATURE_IDS.rockItems, versions: [1], description: 'Recoverable rock pickup/throw/impact-noise helpers; consumer owns inventory commits, world collision, hearing and guard AI.'}
  ]});
export function engineManifest() { return structuredClone(ENGINE_MANIFEST); }

const SCHEMA_DOCUMENTS = freeze([
  {
    "id": "aft-map",
    "version": 2,
    "uri": "urn:nautilus:schema:map:2",
    "file": "aft-map-v2.schema.json"
  },
  {
    "id": "aft-block",
    "version": 1,
    "uri": "urn:nautilus:schema:block:1",
    "file": "aft-block-v1.schema.json"
  },
  {
    "id": "nautilus-save",
    "version": 1,
    "uri": "urn:nautilus:schema:save:1",
    "file": "nautilus-save-v1.schema.json"
  },
  {
    "id": "nautilus-capability-requirements",
    "version": 1,
    "uri": "urn:nautilus:schema:capability-requirements:1",
    "file": "capability-requirements-v1.schema.json"
  },
  {
    "id": "nautilus-sloped-roofs",
    "version": 1,
    "uri": "urn:nautilus:schema:sloped-roofs:1",
    "file": "sloped-roofs-v1.schema.json"
  },
  {id:'nautilus-rock',version:1,uri:'urn:nautilus:schema:rock:1',file:'rock-v1.schema.json'},
  {id:'nautilus-rock-impact-noise',version:1,uri:'urn:nautilus:schema:rock-impact-noise:1',file:'rock-impact-noise-v1.schema.json'}
]);
export function schemaDocuments() { return SCHEMA_DOCUMENTS.map(item => ({...item, url:new URL('../../schemas/'+item.file,import.meta.url).href})); }
