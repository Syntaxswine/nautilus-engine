import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {blankMap, wallPanels, createMapDocument} from '../packages/map-core/index.js';
import {createTinderboxScene, exportNautilusMap, saveTinderboxScene, loadTinderboxScene, TINDERBOX_ADAPTER, TinderboxCompatibilityError} from '../packages/adapters/tinderbox/index.js';
import {compileModules} from './fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/content/exterior-kit.js';
import {scenarioDefinition} from './fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/fixtures.js';
import {createSimulation} from './fixtures/consumers/tinderbox/8a8405681614662a92f9b98fb9b9600bd06d3ad1/src/simulation/index.js';

const FIXTURES = new URL('./fixtures/consumers/tinderbox/', import.meta.url);
const PIN = new URL(TINDERBOX_ADAPTER.consumerCommit + '/', FIXTURES);
const recipe = JSON.parse(await readFile(new URL('flat-yard-recipe.json', FIXTURES), 'utf8'));
function fixture() {
  const map = blankMap(recipe.name);
  map.starts = structuredClone(recipe.starts); map.exits = structuredClone(recipe.exits);
  map.wallRuns = {version: 1, segments: structuredClone(recipe.walls)};
  map.metadata = structuredClone(recipe.metadata);
  for (const patch of recipe.terrain) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) map.terrain[y][x] = patch.value;
  return map;
}
const options = () => structuredClone(recipe.policy);
function compatibility(fn, code, path) {
  assert.throws(fn, error => error instanceof TinderboxCompatibilityError && error.code === code && (!path || error.path === path));
}

test('Tinderbox conformance source is a complete byte-preserved pinned module closure', async () => {
  const provenance = JSON.parse(await readFile(new URL('provenance.json', PIN), 'utf8'));
  assert.equal(provenance.commit, '8a8405681614662a92f9b98fb9b9600bd06d3ad1');
  assert.equal(provenance.closure.moduleCount, 9);
  const sourcePaths = new Set(provenance.files.map(file => file.path));
  for (const file of provenance.files) {
    const bytes = await readFile(new URL(file.path, PIN));
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), file.gitBlob, file.path);
    if (!file.path.endsWith('.js')) continue;
    for (const match of bytes.toString('utf8').matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
      const resolved = new URL(match[1], new URL(file.path, PIN));
      assert.ok(match[1].startsWith('.'), 'No third-party or renderer imports in the game simulation fixture');
      assert.ok(sourcePaths.has(decodeURIComponent(resolved.pathname.slice(PIN.pathname.length))), 'Closed import: ' + file.path + ' -> ' + match[1]);
    }
  }
});

test('Nautilus flat-yard projection compiles with the actual pinned Tinderbox compiler', () => {
  const map = fixture(), before = structuredClone(map), scene = createTinderboxScene(map, options());
  assert.deepEqual(map, before, 'Projection does not mutate portable data');
  const compiled = compileModules(scene.scenario.modules, scene.scenario);
  assert.equal(compiled.modules.length, recipe.walls.length);
  assert.equal(compiled.obstacles.length, recipe.walls.length);
  for (const [i, wall] of map.wallRuns.segments.entries()) {
    const obstacle = compiled.obstacles[i], panels = wallPanels(wall), offset = scene.scenario.nautilus.coordinateOffset;
    assert.equal(obstacle.height, panels[0].size[1]);
    assert.equal(obstacle.x, (wall.a[0] + wall.b[0]) / 2 + offset.x);
    assert.equal(obstacle.y, (wall.a[1] + wall.b[1]) / 2 + offset.y);
    assert.equal(obstacle.width * obstacle.depth, Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]) * panels[0].size[2]);
    assert.equal(obstacle.baseHeight, 0);
  }
  assert.deepEqual(scenarioDefinition(scene.scenario).obstacles, compiled.obstacles);
  assert.equal(compiled.obstacles[0].material, 'wood');
  assert.equal(compiled.obstacles[1].material, 'masonry');
  assert.deepEqual(exportNautilusMap(scene), map, 'Import/export retains original wall materials and all map data');
});

test('explicit crop and marker policy preserves all four starts, exit and coordinate meaning', () => {
  const map = fixture(), scene = createTinderboxScene(map, options()), metadata = scene.scenario.nautilus;
  assert.equal(metadata.starts.length, 4); assert.equal(metadata.exits.length, 1);
  assert.equal(metadata.selectedStart, 'start-1');
  assert.deepEqual(scene.scenario.player, {x: 10.5, y: 5.5, tool: 'matches'});
  for (const [i, point] of metadata.starts.entries()) {
    assert.equal(point.x - metadata.coordinateOffset.x, map.starts[i].x);
    assert.equal(point.y - metadata.coordinateOffset.y, map.starts[i].y);
    assert.deepEqual(point.source, map.starts[i]);
  }
  assert.deepEqual(scene.scenario.actors, [], 'Unused starts are preserved markers, not invented game actors');
  assert.equal(scene.scenario.patches.find(patch => patch.material === 'grass').width, 3);
  assert.equal(scene.scenario.patches.find(patch => patch.material === 'grass').depth, 16);
  const next = options(); next.playerStart = 2;
  assert.equal(createTinderboxScene(map, next).scenario.nautilus.selectedStart, 'start-3');
  compatibility(() => createTinderboxScene(map, {...options(), markerPolicy: undefined}), 'INVALID_JSON_DATA');
  const missingPolicy = options(); delete missingPolicy.markerPolicy;
  compatibility(() => createTinderboxScene(map, missingPolicy), 'INVALID_POLICY', 'policy.markerPolicy');
});

test('actual editor exports preserve identity and appearance markers through the real game and scene reload', () => {
  const document = createMapDocument('Real editor to Tinderbox');
  assert.equal(document.apply({tool: 'floor', start: {x: 10, y: 10, z: 0}, end: {x: 11, y: 11, z: 0}}).ok, true);
  const map = JSON.parse(document.export());
  assert.ok(map.starts.every(point => point.character && point.character.id), 'The real editor supplies persistent identity data');
  map.starts[0].species = 'goat'; map.starts[0].weapon = 'knife'; map.starts[0].outfit = 'normal'; map.starts[0].heading = 90;
  map.starts[0].character.displayName = 'Retained authoring character';
  map.starts[1].character.references.push({role: 'friend', targetId: map.starts[0].character.id});
  const policy = {...options(), region: {x: 0, y: 0, width: 20, height: 16}};
  const scene = createTinderboxScene(map, policy), restored = loadTinderboxScene(saveTinderboxScene(scene));
  assert.deepEqual(exportNautilusMap(restored), map);
  for (const name of ['starts', 'exits']) for (const [i, marker] of restored.scenario.nautilus[name].entries()) assert.deepEqual(marker.source, map[name][i]);
  assert.equal(restored.scenario.nautilus.starts[0].source.heading, 90);
  assert.equal(restored.scenario.nautilus.starts[0].source.species, 'goat');
  const play = input => {
    const game = createSimulation({scenario: input.scenario, seed: input.policy.seed});
    try {
      assert.equal(game.snapshot().player.id, 'bear', 'Explicit policy selects the game bear without reinterpreting authoring identity');
      assert.equal(game.snapshot().player.heading, 0, 'Original heading remains marker data; Tinderbox owns bear initialization');
      game.dispatch({type: 'move', x: 1, y: 0}); game.advance(1 / 60);
      return game.snapshot();
    } finally { game.dispose(); }
  };
  assert.deepEqual(play(scene), play(restored));
});

test('versioned golden adapter save reloads equivalent map and game scenario', async () => {
  const scene = createTinderboxScene(fixture(), options());
  const save = await readFile(new URL('flat-yard-save.json', FIXTURES), 'utf8');
  assert.equal(saveTinderboxScene(scene), save, 'Golden save is deterministic');
  assert.deepEqual(loadTinderboxScene(save), scene);
  assert.deepEqual(exportNautilusMap(save), fixture());
  assert.equal(saveTinderboxScene(loadTinderboxScene(save)), save);
  const changed = structuredClone(scene); changed.scenario.modules[0].width++;
  compatibility(() => loadTinderboxScene(changed), 'SCENARIO_MISMATCH', 'save.scenario');
  const sidecar = structuredClone(scene); sidecar.portableMap.wallRuns.segments[0].material = 'brick';
  compatibility(() => loadTinderboxScene(sidecar), 'SCENARIO_MISMATCH');
  const markers = structuredClone(scene); markers.scenario.nautilus.starts.pop();
  compatibility(() => loadTinderboxScene(markers), 'SCENARIO_MISMATCH');
});

test('real Tinderbox simulation accepts adapter scenario, walls block its bear and replay matches after reload', () => {
  const scene = createTinderboxScene(fixture(), options());
  const simulate = input => {
    const simulation = createSimulation({scenario: input.scenario, seed: input.policy.seed, config: {input: {cameraRelative: false}}});
    try {
      const initial = simulation.snapshot();
      assert.equal(initial.world.modules.length, 2);
      assert.equal(initial.world.obstacles.length, 2);
      assert.equal(initial.world.width, 20); assert.equal(initial.world.height, 16);
      assert.equal(simulation.dispatch({type: 'move', x: 1, y: 0, atTick: 1}), true);
      for (let i = 0; i < 180; i++) simulation.advance(1 / 60);
      const result = simulation.snapshot();
      assert.ok(result.player.x > initial.player.x, 'Real simulation applied movement');
      assert.ok(result.player.x <= 15.5 - 0.08 - 0.56 + 1e-9, 'Real wall collision preserves thickness and bear clearance');
      assert.equal(result.player.y, initial.player.y);
      return result;
    } finally { simulation.dispose(); }
  };
  assert.deepEqual(simulate(scene), simulate(loadTinderboxScene(saveTinderboxScene(scene))));
});

test('unsupported terrain, actors, traversal, prefabs, roofs and future functional fields fail explicitly', () => {
  const cases = [
    ['map.guards', map => map.guards.push({x: 18, y: 25, z: 0, species: 'goat', weapon: 'hands'})],
    ['map.props', map => map.props.push({kind: 'barrel-single', x: 17, y: 24, z: 0})],
    ['map.upper', map => map.upper[0]['18,25'] = 'floor'],
    ['map.edges', map => map.edges['e:17:25'] = 'wall'],
    ['map.buildingPrefabs', map => map.buildingPrefabs = {version: 1, instances: []}],
    ['map.slopedRoofs', map => map.slopedRoofs = {version: 1, instances: []}],
    ['map.futureMechanic', map => map.futureMechanic = {enabled: true}],
    ['map.stairs', map => { map.upper[0]['18,25'] = 'floor'; map.stairs.push({x: 18, y: 25, z: 0}); }],
    ['map.climbs', map => { map.upper[0]['19,25'] = 'floor'; map.climbs.push({x: 18, y: 25, z: 0, dx: 1, dy: 0}); }]
  ];
  for (const [path, change] of cases) {
    const map = fixture(); change(map); const before = structuredClone(map);
    assert.throws(() => createTinderboxScene(map, options()), error => error instanceof TinderboxCompatibilityError && (error.path === path || error.code === 'INVALID_MAP'), path);
    assert.deepEqual(map, before, path + ': rejection is transactional');
  }
  const terrain = fixture(); terrain.terrain[24][17] = 'water';
  compatibility(() => createTinderboxScene(terrain, options()), 'UNSUPPORTED_TERRAIN', 'map.terrain[24][17]');
  const unknown = fixture(); unknown.starts[1].futureCombat = {enabled: true};
  compatibility(() => createTinderboxScene(unknown, options()), 'UNSUPPORTED_MARKER_FIELD', 'map.starts[1].futureCombat');
  const futureCharacter = JSON.parse(createMapDocument('Future identity field').export()); futureCharacter.starts[0].character.newCombatRule = 7;
  compatibility(() => createTinderboxScene(futureCharacter, {...options(), region: {x: 0, y: 0, width: 20, height: 16}}), 'UNSUPPORTED_MARKER_FIELD', 'map.starts[0].character.newCombatRule');
});

test('crop rejects terrain, each unselected start, exits and complete wall extents outside its scope', () => {
  const terrain = fixture(); terrain.terrain[200][200] = 'floor';
  compatibility(() => createTinderboxScene(terrain, options()), 'CROPPED_CONTENT', 'map.terrain[200][200]');
  const marker = fixture(); marker.starts[3] = {x: 100, y: 100, z: 0};
  compatibility(() => createTinderboxScene(marker, options()), 'CROPPED_MARKER', 'map.starts[3]');
  const exit = fixture(); exit.exits[0] = {x: 100, y: 100, z: 0};
  compatibility(() => createTinderboxScene(exit, options()), 'CROPPED_MARKER', 'map.exits[0]');
  const wall = fixture(); wall.wallRuns.segments.push({id: 'outside', a: [100, 100], b: [110, 100], z: 0, stories: 1, material: 'wood'});
  compatibility(() => createTinderboxScene(wall, options()), 'CROPPED_WALL', 'map.wallRuns.segments[2]');
  const thickness = fixture(); thickness.wallRuns.segments.push({id: 'boundary', a: [9.5, 21], b: [9.5, 23], z: 0, stories: 1, material: 'wood'});
  compatibility(() => createTinderboxScene(thickness, options()), 'CROPPED_WALL', 'map.wallRuns.segments[2]');
});

test('wall and save versions, unsafe JSON, options and bear clearance have actionable diagnostics', () => {
  const angled = fixture(); angled.wallRuns.segments[1].b[0]++;
  compatibility(() => createTinderboxScene(angled, options()), 'UNSUPPORTED_WALL');
  const stories = fixture(); stories.wallRuns.segments[1].stories = 2;
  compatibility(() => createTinderboxScene(stories, options()), 'UNSUPPORTED_WALL');
  // A start inside a wall fails map validation before the adapter's own clearance rule runs.
  const onWall = fixture(); onWall.starts[0] = {x: 25, y: 25, z: 0};
  compatibility(() => createTinderboxScene(onWall, options()), 'INVALID_MAP', 'map');
  // The wall branch of PLAYER_CLEARANCE. The spawn projects to x 10.5. A wall run at map x 20.6
  // has its face at 11.02 (0.52 m, inside the 0.56 m disc); one at 20.7 has it at 11.12.
  const wallAt = x => { const map = fixture(); map.wallRuns.segments.push({id: 'spawn-side', a: [x, 24], b: [x, 26], z: 0, stories: 1, material: 'wood'}); return map; };
  compatibility(() => createTinderboxScene(wallAt(20.6), options()), 'PLAYER_CLEARANCE', 'map.starts[0]');
  assert.equal(createTinderboxScene(wallAt(20.7), options()).scenario.modules.length, 3, 'A wall outside the disc is accepted');
  const rim = fixture(); rim.starts[0] = {x: 10, y: 25, z: 0};
  compatibility(() => createTinderboxScene(rim, options()), 'PLAYER_CLEARANCE');
  compatibility(() => createTinderboxScene(fixture(), {...options(), seed: NaN}), 'INVALID_JSON_DATA');
  compatibility(() => createTinderboxScene(fixture(), {...options(), seed: 1.5}), 'INVALID_POLICY');
  const future = createTinderboxScene(fixture(), options()); future.schemaVersion++;
  compatibility(() => loadTinderboxScene(future), 'UNSUPPORTED_SAVE_SCHEMA');
  const differentPin = createTinderboxScene(fixture(), options()); differentPin.adapter.consumerCommit = '0'.repeat(40);
  compatibility(() => loadTinderboxScene(differentPin), 'UNSUPPORTED_ADAPTER_VERSION');
  compatibility(() => loadTinderboxScene('{'), 'INVALID_JSON');
  const extra = createTinderboxScene(fixture(), options()); extra.newSystem = {};
  compatibility(() => loadTinderboxScene(extra), 'UNSUPPORTED_FIELD', 'save.newSystem');
  const source = fixture(); source.metadata.loop = source.metadata;
  compatibility(() => createTinderboxScene(source, options()), 'INVALID_JSON_DATA');
  const error = new TinderboxCompatibilityError('EXAMPLE', 'map.unknown', 'Unsupported content.', 'Update the adapter.');
  assert.deepEqual(error.toJSON(), {code: 'EXAMPLE', path: 'map.unknown', message: 'Unsupported content.', action: 'Update the adapter.'});
});

test('runtime adapter imports only engine-owned public map API and needs no DOM, storage or renderer', async () => {
  const source = await readFile(new URL('../packages/adapters/tinderbox/index.js', import.meta.url), 'utf8');
  assert.deepEqual([...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(match => match[1]), ['../../map-core/index.js']);
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.localStorage, 'undefined');
  assert.equal(typeof globalThis.THREE, 'undefined');
});
