// Engine-owned identifiers. Versioned capabilities describe data semantics,
// never an automatic promise that a consumer implements gameplay for them.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const ENGINE_VERSION = '0.8.0';
export const SCHEMA_IDS = freeze({parts:'nautilus-functional-parts', partDefinition:'nautilus-part-definition', compiledParts:'nautilus-compiled-parts', partsRuntime:'nautilus-parts-runtime-save', map: 'aft-map', block: 'aft-block', save: 'nautilus-save', rock: 'nautilus-rock', rockNoise: 'nautilus-rock-impact-noise', progression: 'nautilus-progression', world: 'nautilus-extended-world', interactions: 'nautilus-standard-interactions', moduleConfiguration: 'nautilus-module-configuration'});
export const FEATURE_IDS = freeze({parts:'nautilus-functional-parts-v1', interactions: 'nautilus-standard-interactions-v1', walls: 'nautilus-wall-runs-v1', prefabs: 'nautilus-building-prefabs-v1',
  originalBuildings: 'nautilus-original-buildings-v1', slopedRoofs: 'nautilus-sloped-roofs-v1', rockItems: 'nautilus-rock-items-v1', progression: 'nautilus-basic-progression-v1', composition: 'nautilus-module-composition-v1', extendedHeight: 'nautilus-extended-height-v1', worldGeometry: 'nautilus-world-aabb-v1', worldPlacements: 'nautilus-world-placements-v1', worldTraversal: 'nautilus-world-traversal-links-v1'});
export const ENGINE_MANIFEST = freeze({id: 'nautilus-engine', version: ENGINE_VERSION, contractVersion: 1,
  schemas: [{id:SCHEMA_IDS.parts,versions:[1]},{id:SCHEMA_IDS.partDefinition,versions:[1]},{id:SCHEMA_IDS.compiledParts,versions:[1]},{id:SCHEMA_IDS.partsRuntime,versions:[1]},{id: SCHEMA_IDS.interactions, versions:[1]}, {id: SCHEMA_IDS.map, versions: [2]}, {id: SCHEMA_IDS.block, versions: [1]}, {id: SCHEMA_IDS.save, versions: [1]}, {id: SCHEMA_IDS.rock, versions: [1]}, {id: SCHEMA_IDS.rockNoise, versions: [1]}, {id: SCHEMA_IDS.progression, versions: [1]}, {id: SCHEMA_IDS.world, versions: [1]}, {id: SCHEMA_IDS.moduleConfiguration, versions: [1]}],
  capabilities: [
    {id:FEATURE_IDS.parts,versions:[1],description:'Optional strict native-quarter-turn part authoring/compiler, matching AABB interactions/render bindings and bounded content-bound runtime saves; consumer binds measured actors, queries and presentation.'},
    {id: FEATURE_IDS.interactions, versions:[1], description:'Optional door transactions and continuous authored stair routes with explicit queries, host time and atomic commits; bounded kinematic profile.'},
    {id: FEATURE_IDS.composition, versions: [1], description: 'Optional headless module planning and explicit lifecycle; hosts own state, clocks and borrowed services.'},
    {id: FEATURE_IDS.extendedHeight, versions: [1], description: 'Sparse explicit native-height floor records; no implied game movement or legacy conversion.'},
    {id: FEATURE_IDS.worldGeometry, versions: [1], description: 'Static authored AABB/panel queries and support; no arbitrary mesh or swept-shape physics.'},
    {id: FEATURE_IDS.worldPlacements, versions: [1], description: 'Validated authored content/actor anchors; consumers own asset binding and live actors.'},
    {id: FEATURE_IDS.worldTraversal, versions: [1], description: 'Validated inter-floor landing links; consumers own routes, costs and execution.'},
    {id: FEATURE_IDS.walls, versions: [1], description: 'Native-scale oriented wall data; consumer owns movement, sight and impacts.'},
    {id: FEATURE_IDS.prefabs, versions: [1], description: 'Whole-building references with immutable catalogue identities.'},
    {id: FEATURE_IDS.originalBuildings, versions: [1], description: 'The reviewed original architectural catalogue and its full assemblies.'},
    {id: FEATURE_IDS.slopedRoofs, versions: [1], description: 'Procedural roof descriptors; consumer owns support, traversal, fire and collapse.'},
    {id: FEATURE_IDS.progression, versions: [1], description: 'Versioned basic character progression, practice and 15-point level rewards; consumer owns eligible outcomes and atomic commits.'},
    {id: FEATURE_IDS.rockItems, versions: [1], description: 'Recoverable rock pickup/throw/impact-noise helpers; consumer owns inventory commits, world collision, hearing and guard AI.'}
  ]});
export function engineManifest() { return structuredClone(ENGINE_MANIFEST); }

const SCHEMA_DOCUMENTS = freeze([
  {id:SCHEMA_IDS.parts,version:1,uri:'urn:nautilus:schema:functional-parts:1',file:'functional-parts-v1.schema.json'},
  {id:SCHEMA_IDS.partDefinition,version:1,uri:'urn:nautilus:schema:part-definition:1',file:'part-definition-v1.schema.json'},
  {id:SCHEMA_IDS.compiledParts,version:1,uri:'urn:nautilus:schema:compiled-parts:1',file:'compiled-parts-v1.schema.json'},
  {id:SCHEMA_IDS.partsRuntime,version:1,uri:'urn:nautilus:schema:parts-runtime-save:1',file:'parts-runtime-save-v1.schema.json'},
  {id:'nautilus-standard-interactions',version:1,uri:'urn:nautilus:schema:standard-interactions:1',file:'standard-interactions-v1.schema.json'},
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
  {id:'nautilus-rock-impact-noise',version:1,uri:'urn:nautilus:schema:rock-impact-noise:1',file:'rock-impact-noise-v1.schema.json'},
  {id:'nautilus-progression',version:1,uri:'urn:nautilus:schema:progression:1',file:'progression-v1.schema.json'},
  {id:'nautilus-module-configuration',version:1,uri:'urn:nautilus:schema:module-configuration:1',file:'module-configuration-v1.schema.json'},
  {id:'nautilus-extended-world',version:1,uri:'urn:nautilus:schema:extended-world:1',file:'extended-world-v1.schema.json',resource:'../world-core/extended-world-v1.schema.json'}
]);
export function schemaDocuments() { return SCHEMA_DOCUMENTS.map(item => {const {resource,...contract}=item;return {...contract,url:new URL(resource||'../../schemas/'+item.file,import.meta.url).href};}); }
