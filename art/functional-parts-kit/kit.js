// Artist-owned content recipe/evidence. Not a public parts schema or runtime.
export const KIT_ID = 'native-workshop-kit';
export const KIT_VERSION = 1;
export const KIT_BASELINE = '78d37b6cd3ba5de5c25d4922b4ba301b13491caa';
export const KIT_SCOPE = '04f915dd8b16c242d47b1e054b2406aedcbdefc8';
export const ATLAS = 'assets/buildings/painted-materials-v2.png';
export const DIMENSIONS = Object.freeze({story: 2.12, wall: 2, wallThickness: .16, slab: .12, bay: 2, doorWidth: 1.2, doorHeight: 1.9, stairWidth: 1.2, stairRun: 4, risers: 14});
const box = (id, min, max, material, role = 'static-solid') => ({id, shape: 'box', min, max, material, role});
const stairRise = 2.12 / 14, stairGoing = 4 / 14;
const doorHinge = [.4, 0, -.13], leafLength = 1.18, halfLeaf = .025;
const sweepRadius = Math.ceil(Math.hypot(leafLength, halfLeaf) * 1e6) / 1e6;
export const DEFINITIONS = [
  {id: 'native-slab-2x2', version: 1, kind: 'slab', origin: 'minimum-X/Z top corner',
    bounds: {min: [0, -.12, 0], max: [2, 0, 2]},
    nodes: [box('slab', [0, -.12, 0], [2, 0, 2], 'wood', 'slab')],
    support: {id: 'top', visualNodeId:'slab', min: [0, 0, 0], max: [2, 0, 2]}},
  {id: 'native-slab-2x1', version: 1, kind: 'slab', origin: 'minimum-X/Z top corner',
    bounds: {min: [0, -.12, 0], max: [2, 0, 1]},
    nodes: [box('slab', [0, -.12, 0], [2, 0, 1], 'wood', 'slab')],
    support: {id: 'top', visualNodeId:'slab', min: [0, 0, 0], max: [2, 0, 1]}},
  {id: 'native-wall-2m', version: 1, kind: 'wall', origin: 'left ground edge on wall centre plane',
    bounds: {min: [0, 0, -.08], max: [2, 2.12, .08]},
    nodes: [box('wall', [0, 0, -.08], [2, 2, .08], 'brick'), box('story-band', [0, 2, -.08], [2, 2.12, .08], 'plaster')]},
  {id: 'native-door-bay', version: 1, kind: 'door-bay', origin: 'left ground edge on wall centre plane',
    bounds: {min: [0, 0, -.13 - sweepRadius], max: [2, 2.12, .08]},
    boundsState: 'Includes both poses and conservative complete motion envelope.',
    closedVisualBounds: {min: [0, 0, -.1554], max: [2, 2.12, .08]},
    nodes: [
      box('jamb-left', [0, 0, -.08], [.4, 1.9, .08], 'brick'),
      box('jamb-right', [1.6, 0, -.08], [2, 1.9, .08], 'brick'),
      box('lintel', [0, 1.9, -.08], [2, 2.12, .08], 'brick'),
      box('trim-left', [.35, 0, -.10], [.4, 1.9, -.08], 'plaster', 'static-trim'),
      box('trim-right', [1.6, 0, -.10], [1.65, 1.9, -.08], 'plaster', 'static-trim'),
      box('trim-top', [.35, 1.9, -.10], [1.65, 1.95, -.08], 'plaster', 'static-trim')
    ],
    portal: {id: 'opening', min: [.4, 0, -.10], max: [1.6, 1.9, .08], widthM: 1.2, heightM: 1.9},
    door: {
      id: 'door', portalId:'opening', pivotNode: 'leaf-pivot', leafNode: 'leaf', hinge: doorHinge,
      closedYawRad: 0, openYawRad: Math.PI / 2,
      leaf: box('leaf', [0, 0, -halfLeaf], [leafLength, 1.88, halfLeaf], 'dark-wood', 'dynamic-leaf'),
      handle: box('handle-inlay', [1.02, .86, -.0254], [1.08, .92, -.025], 'copper', 'visual-only'),
      closedBounds: {min: [.4, 0, -.155], max: [1.58, 1.88, -.105]},
      openBounds: {min: [.375, 0, -1.31], max: [.425, 1.88, -.13]},
      motionBounds: {min: [.4 - halfLeaf, 0, -.13 - sweepRadius], max: [.4 + sweepRadius, 1.88, -.105]},
      queryProfile: 'conservative full motion AABB; exact axis-aligned closed/open leaf boxes',
      initialState: {open: false, locked: false}, reachM: 1.6
    }},
  {id: 'native-stair-14', version: 1, kind: 'stairs', origin: 'bottom-flight centre at lower finished floor',
    bounds: {min: [-.6, 0, 0], max: [.6, 2.12, 4]},
    nodes: Array.from({length: 14}, (_, i) => box('tread-' + String(i + 1).padStart(2, '0'), [-.6, 0, i * stairGoing], [.6, (i + 1) * stairRise, (i + 1) * stairGoing], 'wood', 'stepped-contact-mesh')),
    stairs: {id: 'route', widthM: 1.2, clearanceM: 2, riseM: 2.12, runM: 4, risers: 14, risePerStepM: stairRise, goingM: stairGoing,
      path: [[0, 0, -1.25], [0, 0, 0], [0, 2.12, 4], [0, 2.12, 5.25]],
      lowerPort: 'lower-landing', upperPort: 'upper-landing', bidirectional: true,
      walkingSupport: 'Authored continuous sloping centreline, with explicit flat landings; no inferred route.',
      contactPolicy: 'Visual treads are stepped. A generic presentation binder must use contact samples/foot placement; flat-ground locomotion is not accepted as stair animation.',
      collisionBindingRequirement: 'The walking-support route and under-stair exclusion need an explicit shared geometry binding. Do not silently discard tread solids or treat the sloping line as exact tread contact. Await Coder ABI/profile acceptance.',
      maximumRampToTreadDifferenceM: stairRise,
      contactSamples: Array.from({length: 14}, (_, i) => ({nodeId: 'tread-' + String(i + 1).padStart(2, '0'), min: [-.6, (i + 1) * stairRise, i * stairGoing], max: [.6, (i + 1) * stairRise, (i + 1) * stairGoing]}))}}
];

export const ACTOR_PROFILES = [
  {id: 'horse-unarmed', visual: {species: 'horse', outfit: 'normal', equipment: 'hands', rootScale: [1, 1, 1]},
    radiusM: .46, heightM: 1.7, source: '781246a668c723d5a4c5463e70534cc04b6a5641', role: 'selected measured native visual reference'},
  {id: 'horse-hmg-clearance-case', visual: {species: 'horse', outfit: 'normal', equipment: 'hmg', rootScale: [1, 1, 1]},
    radiusM: .64, heightM: 1.7, source: '781246a668c723d5a4c5463e70534cc04b6a5641', role: 'oversized equipped-envelope refusal case; not a scaled actor'},
  {id: 'bear-unarmed-provisional', visual: {species: 'bear', outfit: 'normal', equipment: 'hands', rootScale: [1, 1, 1]},
    radiusM: .50, heightM: 1.72, source: '4f5f53917990ec03b2f14c65f067e4b99ec8fcaa', role: 'measured source-reference fit only; await integrated provider acceptance'}
];

export function definition(id) {
  const found = DEFINITIONS.find(part => part.id === id);
  if (!found) throw Error('Unknown native kit definition: ' + id);
  return structuredClone(found);
}

export function turnPoint(point, quarterTurns = 0) {
  if (!Number.isInteger(quarterTurns) || quarterTurns < 0 || quarterTurns > 3) throw Error('Use one of four native quarter turns.');
  const [x, h, z] = point;
  return [[x, h, z], [z, h, -x], [-x, h, -z], [-z, h, x]][quarterTurns].map(n => Object.is(n, -0) ? 0 : n);
}
export function placePoint(point, placement) { return turnPoint(point, placement.quarterTurns ?? 0).map((value, axis) => value + placement.position[axis]); }
export function placeBounds(bounds, placement) {
  const corners = [];
  for (const x of [bounds.min[0], bounds.max[0]]) for (const h of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) corners.push(placePoint([x, h, z], placement));
  return {min: [0, 1, 2].map(axis => Math.min(...corners.map(p => p[axis]))), max: [0, 1, 2].map(axis => Math.max(...corners.map(p => p[axis])))};
}
const instance = (id, definitionId, position, quarterTurns = 0, floor = 'ground', extra = {}) => ({id, definitionId, definitionVersion: 1, position, quarterTurns, floor, ...extra});

export function assembly(layout = 'longhouse') {
  if (!['longhouse', 'cross-workshop'].includes(layout)) throw Error('Unknown native kit layout.');
  const wide = layout === 'cross-workshop', width = wide ? 10 : 8, depth = wide ? 8 : 10, parts = [];
  for (let x = 0; x < width; x += 2) for (let z = 0; z < depth; z += 2) {
    parts.push(instance(`ground-${x}-${z}`, 'native-slab-2x2', [x, 0, z], 0, 'ground', {materialOverride:'concrete'}));
    const cut = wide ? z === 2 && [2, 4, 6].includes(x) : x === 4 && [0, 2, 4].includes(z);
    if (!cut) parts.push(instance(`upper-${x}-${z}`, 'native-slab-2x2', [x, 2.12, z], 0, 'upper'));
    parts.push(instance(`roof-${x}-${z}`, 'native-slab-2x2', [x, 4.24, z], 0, 'upper', {role:'roof',supportEnabled: false, materialOverride: 'concrete'}));
  }
  if (wide) parts.push(instance('upper-hole-lead-strip', 'native-slab-2x1', [2, 2.12, 4], 1, 'upper'));
  else parts.push(instance('upper-hole-lead-strip', 'native-slab-2x1', [4, 2.12, 0], 0, 'upper'));
  for (let level = 0; level < 2; level++) {
    const h = level * 2.12, floor = level ? 'upper' : 'ground';
    for (let x = 0; x < width; x += 2) {
      const frontDoor = !wide && level === 0 && x === 4;
      parts.push(instance(`wall-${level}-south-${x}`, frontDoor ? 'native-door-bay' : 'native-wall-2m', [x, h, 0], 0, floor));
      parts.push(instance(`wall-${level}-north-${x}`, 'native-wall-2m', [x + 2, h, depth], 2, floor));
    }
    for (let z = 0; z < depth; z += 2) {
      const westDoor = wide && level === 0 && z === 2;
      parts.push(instance(`wall-${level}-west-${z}`, westDoor ? 'native-door-bay' : 'native-wall-2m', [0, h, z + 2], 1, floor));
      parts.push(instance(`wall-${level}-east-${z}`, 'native-wall-2m', [width, h, z], 3, floor));
    }
  }
  if (wide) {
    for (let x = 0; x < 10; x += 2) parts.push(instance('partition-rear-' + x, x === 6 ? 'native-door-bay' : 'native-wall-2m', [x, 0, 6]));
    for (const z of [2, 4]) parts.push(instance('apron-west-' + z, 'native-slab-2x2', [-2, 0, z], 0, 'ground', {materialOverride:'concrete'}));
    parts.push(instance('main-stair', 'native-stair-14', [4, 0, 3], 1));
  } else {
    for (const x of [4, 6]) parts.push(instance('apron-south-' + x, 'native-slab-2x2', [x, 0, -2], 0, 'ground', {materialOverride:'concrete'}));
    parts.push(instance('main-stair', 'native-stair-14', [5, 0, 2]));
  }
  return {
    id: wide ? 'native-cross-workshop' : 'native-longhouse', instanceId:'reference-'+layout, contentVersion: 1, kitId: KIT_ID, kitVersion: KIT_VERSION,
    status: 'Artist geometry/semantic candidate; public ABI and playable integration pending.',
    dimensions: {widthM: width, depthM: depth, floorHeightsM: [0, 2.12], roofTopM: 4.24},
    floorIds: ['ground', 'upper'], floors: [{id:'ground',elevationM:0},{id:'upper',elevationM:2.12}], parts,
    openings: [{id: 'stair-shaft', floorId: 'upper', bounds: wide ? {min: [3, 2, 2], max: [8, 2.12, 4]} : {min: [4, 2, 1], max: [6, 2.12, 6]}}],
    connections: [{id: 'main-stair-lower', partId: 'main-stair', port: 'lower-landing', floorId: 'ground', supportPartId: wide ? 'ground-2-2' : 'ground-4-0', supportLocalId: 'top'},
      {id: 'main-stair-upper', partId: 'main-stair', port: 'upper-landing', floorId: 'upper', supportPartId: wide ? 'upper-8-2' : 'upper-4-6', supportLocalId: 'top'}],
    referenceActor: {profileId: 'horse-unarmed', position: wide ? [-.75, 0, 4.1] : [6.1, 0, -.75], headingRad: wide ? 0 : -Math.PI / 2},
    routeGeometryProfile: 'Proposed continuous authored stair walking-support line with separately supplied stepped visual/foot contacts. Await Coder ABI: explicitly bind own support surfaces, foreign blockers and ordinary/under-stair walking; do not silently omit tread solids.',
    runtimeABI: null
  };
}

export function measuredParts(recipe) {
  return recipe.parts.map(part => {
    const def = definition(part.definitionId), bounds = placeBounds(def.bounds, part);
    return {assemblyInstanceId:recipe.instanceId,partId: part.id, definitionId: def.id, definitionVersion: def.version, floorId: part.floor, presentationRole:part.role??null, bounds,
      nodes: def.nodes.map(node => ({nodeId: node.id, role: node.role, bounds: placeBounds(node, part)})),
      support: def.support && part.supportEnabled !== false ? {localId: def.support.id, bounds: placeBounds(def.support, part)} : null,
      door: def.door ? {...structuredClone(def.door), hinge: placePoint(def.door.hinge, part), closedBounds: placeBounds(def.door.closedBounds, part), openBounds: placeBounds(def.door.openBounds, part), motionBounds: placeBounds(def.door.motionBounds, part)} : null,
      stairs: def.stairs ? {...structuredClone(def.stairs), path: def.stairs.path.map(point => placePoint(point, part)), contactSamples: def.stairs.contactSamples.map(sample => ({nodeId: sample.nodeId, bounds: placeBounds(sample, part)}))} : null};
  });
}

export function placedAssembly(recipe, position, quarterTurns, instanceId = recipe.instanceId) {
  if(typeof instanceId!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(instanceId))throw Error('Supply a bounded source instance ID; do not truncate identities.');
  const placement = {position, quarterTurns};
  const result = structuredClone(recipe);
  result.instanceId=instanceId;
  result.parts = recipe.parts.map(part => ({...part, position: placePoint(part.position, placement), quarterTurns: (part.quarterTurns + quarterTurns) % 4}));
  result.openings = recipe.openings.map(opening => ({...opening, bounds: placeBounds(opening.bounds, placement)}));
  result.referenceActor.position = placePoint(recipe.referenceActor.position, placement);
  result.referenceActor.headingRad += quarterTurns * Math.PI / 2;
  result.placement = placement;
  return result;
}
