// Engine-owned identifiers. Versioned capabilities describe data semantics,
// never an automatic promise that a consumer implements gameplay for them.
import {RAILWAY_ROUTE_FEATURE, RAILWAY_TURNOUT_FEATURE, RAILWAY_CROSSING_FEATURE, RAILWAY_TRAIN_FEATURE, RAILWAY_SIGNAL_FEATURE, RAILWAY_WORLD_STOCK_FEATURE} from '../railway-visuals/route.js';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const ENGINE_VERSION = '0.10.0';
export const SCHEMA_IDS = freeze({railwayRoutes:'nautilus-railway-routes', windowAuthoring:'nautilus-window-authoring',tileRecipe:'nautilus-tile-recipe',tileLayout:'nautilus-tile-layout',tileBundle:'nautilus-tile-bundle',compiledTiles:'nautilus-compiled-tiles', parts:'nautilus-functional-parts', partDefinition:'nautilus-part-definition', compiledParts:'nautilus-compiled-parts', partsRuntime:'nautilus-parts-runtime-save', map: 'aft-map', block: 'aft-block', save: 'nautilus-save', rock: 'nautilus-rock', rockNoise: 'nautilus-rock-impact-noise', progression: 'nautilus-progression', world: 'nautilus-extended-world', interactions: 'nautilus-standard-interactions', moduleConfiguration: 'nautilus-module-configuration', grenade: 'nautilus-grenade-state', farmyardDoor:'nautilus-farmyard-door-state', farmyardDoorHostSave:'nautilus-farmyard-door-host-save', windowGeometry:'nautilus-window-geometry', windowPaneState:'nautilus-window-pane-state', farmyardWindowHostSave:'nautilus-farmyard-window-host-save'});
export const FEATURE_IDS = freeze({railwayRoutes:RAILWAY_ROUTE_FEATURE, railwayTurnouts:RAILWAY_TURNOUT_FEATURE, railwayCrossings:RAILWAY_CROSSING_FEATURE, railwayTrains:RAILWAY_TRAIN_FEATURE, railwaySignals:RAILWAY_SIGNAL_FEATURE, railwayWorldStock:RAILWAY_WORLD_STOCK_FEATURE, tileBoundaries:'nautilus-procedural-tile-boundaries-v1', parts:'nautilus-functional-parts-v1', interactions: 'nautilus-standard-interactions-v1', walls: 'nautilus-wall-runs-v1', prefabs: 'nautilus-building-prefabs-v1',
  originalBuildings: 'nautilus-original-buildings-v1', slopedRoofs: 'nautilus-sloped-roofs-v1', rockItems: 'nautilus-rock-items-v1', progression: 'nautilus-basic-progression-v1', composition: 'nautilus-module-composition-v1', extendedHeight: 'nautilus-extended-height-v1', worldGeometry: 'nautilus-world-aabb-v1', worldPlacements: 'nautilus-world-placements-v1', worldTraversal: 'nautilus-world-traversal-links-v1', grenades: 'nautilus-grenades-static-planar-v1', grenadeAim: 'nautilus-grenade-aim-v1', farmyardDoors:'nautilus-farmyard-doors-v1', windowPanes:'nautilus-window-panes-v1'});
export const ENGINE_MANIFEST = freeze({id: 'nautilus-engine', version: ENGINE_VERSION, contractVersion: 1,
  schemas: [{id:SCHEMA_IDS.railwayRoutes,versions:[1,2,3,4,5,6]}, {id:SCHEMA_IDS.windowAuthoring,versions:[1]},{id:SCHEMA_IDS.tileRecipe,versions:[1]},{id:SCHEMA_IDS.tileLayout,versions:[1]},{id:SCHEMA_IDS.tileBundle,versions:[1]},{id:SCHEMA_IDS.compiledTiles,versions:[1]},{id:SCHEMA_IDS.parts,versions:[1]},{id:SCHEMA_IDS.partDefinition,versions:[1]},{id:SCHEMA_IDS.compiledParts,versions:[1]},{id:SCHEMA_IDS.partsRuntime,versions:[1]},{id: SCHEMA_IDS.interactions, versions:[1]}, {id: SCHEMA_IDS.map, versions: [2]}, {id: SCHEMA_IDS.block, versions: [1]}, {id: SCHEMA_IDS.save, versions: [1]}, {id: SCHEMA_IDS.rock, versions: [1]}, {id: SCHEMA_IDS.rockNoise, versions: [1]}, {id: SCHEMA_IDS.progression, versions: [1]}, {id: SCHEMA_IDS.world, versions: [1]}, {id: SCHEMA_IDS.moduleConfiguration, versions: [1]}, {id: SCHEMA_IDS.grenade, versions: [1]}, {id:SCHEMA_IDS.farmyardDoor,versions:[1]}, {id:SCHEMA_IDS.farmyardDoorHostSave,versions:[1]}, {id:SCHEMA_IDS.windowGeometry,versions:[1]}, {id:SCHEMA_IDS.windowPaneState,versions:[1]}, {id:SCHEMA_IDS.farmyardWindowHostSave,versions:[1]}],
  capabilities: [
    {id: FEATURE_IDS.railwayRoutes, versions: [1], description: 'Optional level railway waypoints and deterministic 4 m tangent routes; consumer owns presentation and runtime behavior.'},
    {id: FEATURE_IDS.railwayTurnouts, versions: [1], description: 'Static level 45 degree railway splits and versioned branch waypoints.'},
    {id: FEATURE_IDS.railwayCrossings, versions: [1], description: 'Derived level 45 and 90 degree diamond crossings between independent straight railway approaches.'},
    {id: FEATURE_IDS.railwayTrains, versions: [1], description: 'Authored train departure and switch position with a host-driven rail itinerary for a single consist.'},
    {id: FEATURE_IDS.railwaySignals, versions: [1], description: 'Two train departures and shared crossing and turnout signals.'},
    {id: FEATURE_IDS.railwayWorldStock, versions: [1], description: 'Explicit world-size train proportions, 16 m bends and wider rolling-stock clearance.'},
    {id:FEATURE_IDS.tileBoundaries,versions:[1],description:'Optional authored analytic tile descriptors, canonical boundary inspection/matching and bounded deterministic preparation; host presentation, query, support, navigation, fire and consumer adoption remain separately unbound.'},
    {id:FEATURE_IDS.windowPanes,versions:[1],description:'Optional native quarter-turn first-hit pane queries, confirmed impacts, durable receipts and complete retained saves; requires six separately bound v1 host services.'},
    {id:FEATURE_IDS.farmyardDoors,versions:[1],description:'Optional Farmyard single-ground-leaf endpoint doors; host retains movement and supplies atomic persistence, current geometry, routes and visibility.'},
    {id: FEATURE_IDS.grenades, versions: [1], description: 'Optional Farmyard static same-plane grenade transactions; explicit reactive/multilevel refusal and host commit/visibility/body bindings.'},
    {id: FEATURE_IDS.grenadeAim, versions: [1], description: 'Farmyard joystick/keyboard aiming and camera framing math; no DOM or implicit clock.'},
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
  {id:SCHEMA_IDS.railwayRoutes,version:1,uri:'urn:nautilus:schema:railway-routes:1',file:'railway-routes-v1.schema.json'},
  {id:SCHEMA_IDS.railwayRoutes,version:2,uri:'urn:nautilus:schema:railway-routes:2',file:'railway-routes-v2.schema.json'},
  {id:SCHEMA_IDS.railwayRoutes,version:3,uri:'urn:nautilus:schema:railway-routes:3',file:'railway-routes-v3.schema.json'},
  {id:SCHEMA_IDS.railwayRoutes,version:4,uri:'urn:nautilus:schema:railway-routes:4',file:'railway-routes-v4.schema.json'},
  {id:SCHEMA_IDS.railwayRoutes,version:5,uri:'urn:nautilus:schema:railway-routes:5',file:'railway-routes-v5.schema.json'},
  {id:SCHEMA_IDS.railwayRoutes,version:6,uri:'urn:nautilus:schema:railway-routes:6',file:'railway-routes-v6.schema.json'},
  {id:SCHEMA_IDS.windowAuthoring,version:1,uri:'urn:nautilus:schema:window-authoring:1',file:'window-authoring-v1.schema.json',resource:'../windows-authoring/window-authoring-v1.schema.json'},
  {id:SCHEMA_IDS.tileRecipe,version:1,uri:'urn:nautilus:schema:tile-recipe:1',file:'tile-recipe-v1.schema.json',resource:'../tiles-core/tile-recipe-v1.schema.json'},
  {id:SCHEMA_IDS.tileLayout,version:1,uri:'urn:nautilus:schema:tile-layout:1',file:'tile-layout-v1.schema.json',resource:'../tiles-core/tile-layout-v1.schema.json'},
  {id:SCHEMA_IDS.tileBundle,version:1,uri:'urn:nautilus:schema:tile-bundle:1',file:'tile-bundle-v1.schema.json',resource:'../tiles-core/tile-bundle-v1.schema.json'},
  {id:SCHEMA_IDS.compiledTiles,version:1,uri:'urn:nautilus:schema:compiled-tiles:1',file:'compiled-tiles-v1.schema.json',resource:'../tiles-core/compiled-tiles-v1.schema.json'},
  {id:SCHEMA_IDS.windowGeometry,version:1,uri:'urn:nautilus:schema:window-geometry:1',file:'window-geometry-v1.schema.json',resource:'../windows-core/window-geometry-v1.schema.json'},
  {id:SCHEMA_IDS.windowPaneState,version:1,uri:'urn:nautilus:schema:window-pane-state:1',file:'window-pane-state-v1.schema.json',resource:'../windows-core/window-pane-state-v1.schema.json'},
  {id:SCHEMA_IDS.farmyardWindowHostSave,version:1,uri:'urn:nautilus:schema:farmyard-window-host-save:1',file:'window-host-save-v1.schema.json',resource:'../adapters/farmyard/windows/window-host-save-v1.schema.json'},
  {id:SCHEMA_IDS.farmyardDoor,version:1,uri:'urn:nautilus:schema:farmyard-door-state:1',file:'door-state-v1.schema.json',resource:'../adapters/farmyard/doors/door-state-v1.schema.json'},
  {id:SCHEMA_IDS.farmyardDoorHostSave,version:1,uri:'urn:nautilus:schema:farmyard-door-host-save:1',file:'door-host-save-v1.schema.json',resource:'../adapters/farmyard/doors/door-host-save-v1.schema.json'},
  {id:'nautilus-grenade-state',version:1,uri:'urn:nautilus:schema:grenade-state:1',file:'grenade-state-v1.schema.json'},
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
