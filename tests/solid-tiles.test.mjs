import assert from 'node:assert/strict';
import test from 'node:test';
import * as core from '../packages/map-core/index.js';
import {GROUNDS} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';
import {addStairs} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {EditingDocument as PriorDocument} from '../packages/map-core/roof-document.js';

const ground = 'ground-grass', road = 'road-diagonal-concrete-nw-border';
const point = (x, y, z = 0) => ({x, y, z});
const paint = (x, y, solidSteps, groundKind = ground, end) => ({
  tool: 'solid-block', start: point(x, y), end, options: {solidSteps, groundKind}
});
const erase = (x, y) => ({tool: 'erase-solid-block', start: point(x, y)});
const cells = document => JSON.parse(document.export()).solidTiles?.cells;

test('solid tiles support the complete live ground palette and all eight native heights', () => {
  assert.deepEqual(core.SOLID_TILE_SKINS, GROUNDS);
  const map = core.blankMap();
  map.solidTiles = {version: 1, cells: Object.fromEntries(GROUNDS.map((skin, i) => [`${10 + i},10`, [i % 8 + 1, skin]]))};
  const document = core.openDocument(map);
  assert.deepEqual(cells(document), map.solidTiles.cells);
  assert.deepEqual(core.solidTileGeometry(document.map).slice(0, 8).map(tile => tile.heightM),
    [.265, .53, .795, 1.06, 1.325, 1.59, 1.855, 2.12]);
  assert.equal(core.solidTileAt(document.map, 17, 10).heightM, core.WALL_KIT.floorSpacing);
});

test('preview, resize, repaint and erase are atomic in the existing undo and redo history', () => {
  const document = core.createMapDocument(), original = document.export();
  const first = paint(10, 10, 1, 'ground-dirt', point(11, 10));
  const preview = document.preview(first);
  assert.ok(preview.ok, preview.error);
  assert.equal(document.export(), original);
  assert.equal(document.editor.undo.length, 0);
  assert.ok(document.apply(first).ok);
  const placed = document.export(), invalid = paint(10, 10, 1, 'not-a-skin');
  assert.equal(document.apply(invalid).ok, false);
  assert.equal(document.export(), placed);
  assert.ok(document.apply(paint(11, 10, 2, 'ground-biome-snow')).ok);
  const changed = document.export();
  assert.equal(document.inspect(11, 10, 0).data.heightM, .53);
  assert.equal(document.map.terrain[10][11], 'yard');
  assert.ok(document.apply(erase(11, 10)).ok);
  assert.deepEqual(cells(document), {'10,10': [1, 'ground-dirt']});
  assert.ok(document.undo());
  assert.equal(document.export(), changed);
  assert.ok(document.undo());
  assert.equal(document.export(), placed);
  assert.ok(document.undo());
  assert.equal(document.export(), original);
  assert.ok(document.redo());
  assert.equal(document.export(), placed);
  assert.ok(document.redo());
  assert.equal(document.export(), changed);
  const saved = core.serializeSave(core.createSave(changed));
  assert.deepEqual(core.parseSave(saved).payload.data.solidTiles.cells, cells(document));
});

test('geometry uses exact 1 m faces with one exposed riser at an unequal shared edge', () => {
  const document = core.createMapDocument();
  for (const command of [paint(10, 10, 1), paint(11, 10, 2), paint(12, 10, 2)]) assert.ok(document.apply(command).ok);
  const [low, high, adjacent] = core.solidTileGeometry(document.map);
  assert.deepEqual(high.bounds, {min: {x: 10.5, y: 9.5, h: 0}, max: {x: 11.5, y: 10.5, h: .53}});
  assert.equal(low.sides.some(side => side.dx === 1), false);
  assert.deepEqual(high.sides.find(side => side.dx === -1), {dx: -1, dy: 0, minH: .265, maxH: .53});
  assert.equal(high.sides.some(side => side.dx === 1), false);
  assert.equal(adjacent.sides.some(side => side.dx === -1), false);
  assert.ok(high.sides.every(side => side.maxH > side.minH));
});

test('one-eighth rise commits the same movement cost as the actual inherited stair route', () => {
  const stairMap = core.blankMap();
  addStairs(stairMap, 10, 10, 0);
  const stair = core.neighbors(stairMap, point(10, 10)).find(edge => edge.kind === 'stairs');
  assert.equal(stair.cost, 2);
  const document = core.createMapDocument();
  for (const command of [paint(10, 10, 1), paint(11, 10, 2), paint(12, 10, 2), paint(13, 10, 4)]) assert.ok(document.apply(command).ok);
  const map = document.map;
  let actor = {at: point(9, 10), heightM: 1.65, ap: 8}, ceilingM = 2.12, assessments = 0;
  const assess = route => {
    assessments++;
    if (route.path.some(p => p.h + actor.heightM > ceilingM)) return {ok: false, code: 'NO_CLEARANCE'};
    return {ok: true, cost: route.kind === stair.kind ? stair.cost : 1};
  };
  const move = destination => {
    const plan = core.planSolidTileStep(map, actor.at, destination, assess);
    if (plan.ok && actor.ap >= plan.cost) actor = {...actor, at: plan.to, ap: actor.ap - plan.cost};
    return plan;
  };
  assert.equal(move(point(10, 10)).cost, stair.cost);
  assert.deepEqual(actor.at, {x: 10, y: 10, h: .265});
  const afterFirst = actor;
  assert.deepEqual(move(point(11, 10)), {ok: false, code: 'NO_CLEARANCE'});
  assert.equal(actor, afterFirst);
  ceilingM = 3;
  assert.equal(move(point(11, 10)).cost, stair.cost);
  assert.equal(move(point(12, 10)).kind, 'walk');
  const beforeRefusals = assessments;
  assert.deepEqual(move(point(13, 10)), {ok: false, code: 'STEP_TOO_HIGH'});
  assert.deepEqual(move(point(13, 11)), {ok: false, code: 'NOT_ADJACENT'});
  assert.deepEqual(move(point(14, 10)), {ok: false, code: 'NOT_ADJACENT'});
  assert.equal(assessments, beforeRefusals);
  assert.deepEqual(actor, {at: {x: 12, y: 10, h: .53}, heightM: 1.65, ap: 3});
  const blocked = structuredClone(map);
  blocked.edges['e:11:10'] = 'wall-brick';
  assert.deepEqual(core.planSolidTileStep(blocked, point(11, 10), point(12, 10), assess), {ok: false, code: 'BLOCKED_EDGE'});
  const water = structuredClone(map);
  water.terrain[10][9] = 'water';
  assert.deepEqual(core.planSolidTileStep(water, point(9, 10), point(10, 10), assess), {ok: false, code: 'NO_SUPPORT'});
});

test('conflicts and malformed portable heights refuse before committing', () => {
  const document = core.createMapDocument(), source = document.export(), [start] = document.map.starts;
  assert.match(document.apply(paint(start.x, start.y, 1)).error, /bury a marker/);
  assert.match(document.apply(paint(9, 9, 0)).error, /1–8/);
  assert.match(document.apply(paint(9, 9, 9)).error, /1–8/);
  assert.match(document.apply(paint(9, 9, 1, ground, point(9, 9, 1))).error, /ground layer/);
  assert.match(document.apply(paint(9, 9, 1, ground, point(25, 25))).error, /256/);
  assert.equal(document.export(), source);
  assert.ok(document.apply(paint(9, 9, 8)).ok);
  const placed = document.export();
  assert.match(document.apply({tool: 'floor', start: point(9, 9, 1)}).error, /overlaps the first upper floor/);
  assert.match(document.apply({tool: 'water', start: point(9, 9)}).error, /dry, unraised ground/);
  assert.equal(document.export(), placed);
  const map = JSON.parse(placed);
  for (const malformed of [{version: 2, cells: {}}, {version: 1, cells: {'09,9': [1, ground]}},
    {version: 1, cells: {'240,9': [1, ground]}}, {version: 1, cells: {'9,9': [1.5, ground]}},
    {version: 1, cells: {}}, {version: 1, cells: {'9,9': [1, ground]}, extra: true}]) {
    assert.throws(() => core.loadBlueprint({...map, solidTiles: malformed}), /solid block|solidTiles/i);
  }
});

test('manual sector capture, editing, rotation and replacement preserve cells and road orientation', () => {
  const map = core.createMapDocument();
  for (const command of [paint(25, 26, 2, road), paint(50, 50, 7), paint(74, 74, 4)]) assert.ok(map.apply(command).ok);
  const block = map.capture(1, 1);
  assert.deepEqual(block.solidTiles.cells, {'1,2': [2, road]});
  const document = core.openDocument(block);
  assert.equal(document.block, true);
  assert.ok(document.apply(paint(2, 2, 3, 'ground-wood-planks')).ok);
  assert.ok(document.undo());
  assert.deepEqual(cells(document), block.solidTiles.cells);
  assert.ok(document.redo());
  const rotated = core.rotateSceneryBlock(document.capture());
  assert.deepEqual(rotated.solidTiles.cells, {'21,1': [2, 'road-diagonal-concrete-ne-border'], '21,2': [3, 'ground-wood-planks']});
  map.place(rotated, 2, 2);
  assert.deepEqual(cells(map), {'25,26': [2, road], '74,74': [4, ground], '69,49': [2, 'road-diagonal-concrete-ne-border'], '69,50': [3, 'ground-wood-planks']});
  map.place(core.createBlockDocument().capture(), 2, 2);
  assert.deepEqual(cells(map), {'25,26': [2, road], '74,74': [4, ground]});
  assert.throws(() => core.generateConnectedMap([block]), /Connected generation cannot match solid block heights/);
});

test('new save capabilities refuse unsupported consumers and legacy inputs retain their original projection', () => {
  const document = core.createMapDocument(), source = document.export();
  assert.equal(new PriorDocument().open(source).export(), source);
  assert.deepEqual(core.requiredMapFeatures(JSON.parse(source)), []);
  assert.ok(document.apply(paint(9, 9, 1)).ok);
  const map = JSON.parse(document.export()), consumer = core.engineManifest();
  assert.deepEqual(core.requiredMapFeatures(map), [core.SOLID_TILE_FEATURE]);
  assert.equal(core.assertBlueprintCompatible(map, consumer), map);
  consumer.capabilities = consumer.capabilities.filter(feature => feature.id !== core.SOLID_TILE_FEATURE);
  assert.throws(() => core.assertBlueprintCompatible(map, consumer), error =>
    error.diagnostics.some(item => item.code === 'UNSUPPORTED_REQUIRED_FEATURE' && item.feature === core.SOLID_TILE_FEATURE));
  assert.throws(() => core.assertMapCapabilities(map), /does not support solid ground tiles/);
  assert.throws(() => core.parseMap(JSON.stringify({...map, version: 1})), /require a Nautilus aft-map-v2/);
});
