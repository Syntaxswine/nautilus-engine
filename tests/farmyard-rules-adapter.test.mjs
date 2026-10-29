import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {STAT_DEFINITIONS, previewAttack, openCharacter, CHECK_PROFILES} from '../packages/rules-core/index.js';
import {FARMYARD_RULES_ADAPTER, FarmyardRulesCompatibilityError, deriveFarmyardStats,
  withFarmyardDerivedStats, farmyardWeaponAccuracy, farmyardEffectiveSkill,
  farmyardDamageAfterResistance} from '../packages/adapters/farmyard/rules.js';
import * as Farmyard from './fixtures/consumers/farmyard-rules/279d2d34786b3e6e5c5baeeac6898e60030afdbe/character-stats.js';
import {QUICKPLAY_PRESETS} from './fixtures/consumers/farmyard-rules/279d2d34786b3e6e5c5baeeac6898e60030afdbe/quickplay-presets.js';
import {WEAPONS} from './fixtures/consumers/farmyard-rules/279d2d34786b3e6e5c5baeeac6898e60030afdbe/solo-weapon-data.js';

const sourceManifest = new URL('../docs/reviews/2026-10-29-farmyard-rules.sources.json', import.meta.url);
const fields = [...FARMYARD_RULES_ADAPTER.derivedFields];
const projection = actor => Object.fromEntries(fields.map(key => [key, actor[key]]));
// makeUnit's reviewed host-owned fields are exercised without importing the game,
// mission, movement, rendering or persistence dependency graph.
function actor(preset = QUICKPLAY_PRESETS[3], weapon = 'assault') {
  const unit = {id: 0, team: 'squad', name: preset.name, species: preset.species, weapon,
    x: 3.25, y: 4.125, z: 0, heading: 270, stance: 'standing', running: false, sneaking: false,
    travelled: 0.37, isMoving: false, alert: false, lastKnown: null, alertAge: 0,
    slots: [weapon, 'pistol'], pack: [{type: 'weapon', kind: weapon, rounds: WEAPONS[weapon].mag, condition: 81}],
    ammo: {[weapon]: WEAPONS[weapon].mag}, ammoPouch: {[weapon]: WEAPONS[weapon].mag * 3}};
  Farmyard.initializeStats(unit, preset.stats);
  unit.hp -= 17; unit.ap -= 0.375; unit.stamina -= 3.625;
  return unit;
}
function rejects(fn, code, path) {
  assert.throws(fn, error => error instanceof FarmyardRulesCompatibilityError && error.code === code && error.path === path && typeof error.diagnostics[0].action === 'string');
}

test('Farmyard source fixtures retain exact Git blobs/bytes and a closed three-module test-only graph', () => {
  const manifest = JSON.parse(fs.readFileSync(sourceManifest));
  assert.equal(manifest.consumer.commit, '279d2d34786b3e6e5c5baeeac6898e60030afdbe');
  assert.equal(manifest.runtimeImportsDonor, false);
  assert.equal(manifest.moduleClosure.moduleCount, 3);
  const copies = manifest.files.filter(file => file.copied);
  assert.equal(copies.length, 3);
  const available = new Set(copies.map(file => new URL('../' + file.fixture, import.meta.url).href));
  for (const file of copies) {
    const url = new URL('../' + file.fixture, import.meta.url), bytes = fs.readFileSync(url);
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), file.gitBlob, file.path);
    for (const match of bytes.toString('utf8').matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) assert.ok(available.has(new URL(match[1], url).href), file.path + ' import closure');
  }
  assert.equal(manifest.files.find(file => file.path.endsWith('/solo-game.js')).copied, false);
  assert.deepEqual(STAT_DEFINITIONS.map(stat => stat.key), Farmyard.STAT_DEFINITIONS.map(([key]) => key));
  assert.deepEqual([...FARMYARD_RULES_ADAPTER.supportedWeapons].sort(), Object.keys(WEAPONS).sort());
});

test('all six actual quickplay animal profiles and all fourteen weapon blends match pinned Farmyard exactly', () => {
  assert.equal(QUICKPLAY_PRESETS.length, 6); assert.equal(Object.keys(WEAPONS).length, 14);
  const originalRandom = Math.random; Math.random = () => {throw Error('Implicit random used');};
  try {
    for (const preset of QUICKPLAY_PRESETS) for (const weapon of Object.keys(WEAPONS)) {
      const unit = actor(preset, weapon), before = structuredClone(unit), expected = structuredClone(unit);
      Farmyard.refreshStats(expected);
      assert.deepEqual(deriveFarmyardStats(unit), projection(expected), preset.id + '/' + weapon);
      assert.equal(farmyardWeaponAccuracy(unit), Farmyard.weaponAccuracy(unit), preset.id + '/' + weapon);
      assert.deepEqual(withFarmyardDerivedStats(unit), expected, preset.id + '/' + weapon);
      assert.deepEqual(unit, before, 'Calculations never mutate the host actor');
    }
  } finally {Math.random = originalRandom;}
});

test('guard defaults and every existing effective-stat query remain host-selected and numerically identical', () => {
  const guard = {id: 7, team: 'guard', name: 'Guard 7', species: 'goat', weapon: 'rifle',
    x: 11.25, y: 5.5, movementPlan: [{x: 12, y: 6}], alert: true};
  Farmyard.initializeStats(guard, {strength: 10, endurance: 20, agility: 22, firearms: 35, perception: 35, dexterity: 35});
  guard.hp = 5.25; guard.ap = 0; guard.stamina = 0;
  const expected = structuredClone(guard); Farmyard.refreshStats(expected);
  assert.deepEqual(deriveFarmyardStats(guard), projection(expected));
  for (const [key] of Farmyard.STAT_DEFINITIONS) assert.equal(farmyardEffectiveSkill(guard, key), Farmyard.effectiveSkill(guard, key), key);
  const renamed = {...guard, name: 'Yakov', species: 'horse'};
  assert.deepEqual(deriveFarmyardStats(renamed), deriveFarmyardStats(guard), 'Names/species cannot select another cast balance');
});

test('unrounded accuracy base remains distinct from the final chance and supports explicit weapon queries', () => {
  const unit = actor(); unit.stats.firearms = 81; unit.stats.dexterity = 40;
  const portable = openCharacter({version: 1, id: 'fixture', name: '', stats: unit.stats,
    resources: {hp: unit.hp, ap: unit.ap, stamina: unit.stamina}, skillPoints: 0});
  const preview = previewAttack(portable, {profile: CHECK_PROFILES.farmyard, skill: 'firearms', permitted: true});
  assert.equal(preview.base, 70.75); assert.equal(preview.chance, 71);
  assert.equal(farmyardWeaponAccuracy(unit), preview.base);
  for (const weapon of Object.keys(WEAPONS)) assert.equal(farmyardWeaponAccuracy(unit, weapon), Farmyard.weaponAccuracy(unit, weapon));
  for (const value of [1, 100]) {
    const edge = actor(); for (const [key] of Farmyard.STAT_DEFINITIONS) edge.stats[key] = value;
    edge.hp = edge.ap = edge.stamina = 0;
    assert.equal(farmyardWeaponAccuracy(edge), value, 'No implicit 5–95 attack-chance clamp');
    assert.equal(farmyardEffectiveSkill(edge, 'medical'), Farmyard.effectiveSkill(edge, 'medical'));
  }
});

test('damaged, exhausted, dead, fractional and epsilon-negative resources remain exact on projection/copy', () => {
  for (const current of [{hp: 0, ap: 0, stamina: 0}, {hp: 0.125, ap: 0.000001, stamina: 0.5}, {hp: 19.75, ap: 3.375, stamina: 21.625}, {hp: 19.75, ap: -0.00000005, stamina: 0}]) {
    const unit = Object.assign(actor(), current), before = structuredClone(unit);
    const result = withFarmyardDerivedStats(unit);
    for (const field of ['hp', 'ap', 'stamina']) assert.equal(result[field], current[field]);
    assert.deepEqual(unit, before);
    assert.deepEqual(withFarmyardDerivedStats(result), result);
    assert.deepEqual(withFarmyardDerivedStats(JSON.parse(JSON.stringify(result))), result, 'Existing JSON save shape reloads equivalently');
  }
});

test('resources are uninspected host state, with absent fields and exact data/accessor descriptors preserved', () => {
  const unit = actor(), expected = projection(Farmyard.refreshStats(structuredClone(unit)));
  const absent = {...unit};
  for (const key of ['hp', 'ap', 'stamina']) delete absent[key];
  assert.deepEqual(deriveFarmyardStats(absent), expected);
  assert.equal(farmyardWeaponAccuracy(absent), Farmyard.weaponAccuracy(absent));
  for (const [key] of Farmyard.STAT_DEFINITIONS) assert.equal(farmyardEffectiveSkill(absent, key), Farmyard.effectiveSkill(absent, key), key);
  assert.equal(farmyardDamageAfterResistance(absent, 10.5), Farmyard.damageAfterResistance(absent, 10.5));
  const copy = withFarmyardDerivedStats(absent);
  for (const key of ['hp', 'ap', 'stamina']) assert.equal(Object.hasOwn(copy, key), false, key + ' remains absent');
  for (const current of [{hp: NaN, ap: Infinity, stamina: undefined}, {hp: -Infinity, ap: -0.00000005, stamina: 10000000000}]) {
    const opaque = Object.assign(actor(), current), result = withFarmyardDerivedStats(opaque);
    assert.deepEqual(deriveFarmyardStats(opaque), expected);
    for (const key of ['hp', 'ap', 'stamina']) {
      assert.ok(Object.is(result[key], current[key]), key + ' is retained without validation');
      assert.deepEqual(Object.getOwnPropertyDescriptor(result, key), Object.getOwnPropertyDescriptor(opaque, key));
    }
  }
  let reads = 0, writes = 0;
  Object.defineProperties(unit, {
    hp: {get() {reads++; throw Error('Host HP must not be read');}, set() {writes++; throw Error('Host HP must not be written');}, enumerable: true, configurable: false},
    ap: {value: -0.00000005, enumerable: false, writable: false, configurable: false},
    stamina: {value: undefined, enumerable: true, writable: false, configurable: true},
    id: {value: 0, enumerable: false, writable: false, configurable: false}
  });
  assert.deepEqual(deriveFarmyardStats(unit), expected);
  assert.equal(farmyardWeaponAccuracy(unit), Farmyard.weaponAccuracy(unit));
  assert.equal(farmyardEffectiveSkill(unit, 'medical'), Farmyard.effectiveSkill(unit, 'medical'));
  assert.equal(farmyardDamageAfterResistance(unit, 20), Farmyard.damageAfterResistance(unit, 20));
  const result = withFarmyardDerivedStats(unit);
  for (const key of ['id', 'hp', 'ap', 'stamina']) assert.deepEqual(Object.getOwnPropertyDescriptor(result, key), Object.getOwnPropertyDescriptor(unit, key), key);
  assert.equal(reads, 0); assert.equal(writes, 0);
});

test('host identity, inventory, AI, unknown fields, descriptors and progression remain owned by the host', () => {
  const unit = actor(), token = Symbol('host-token'), shared = new Map([['socket', {name: 'borrowed host binding'}]]);
  unit.hostExtension = {futureField: ['keep', 7]}; unit.hostService = () => 'host'; unit.hostMap = shared;
  unit.skillPoints = 73; unit.progression = {unadopted: true, version: 99, receipts: ['existing']}; unit[token] = 'retain';
  let accesses = 0; Object.defineProperty(unit, 'hostAccessor', {get() {accesses++; return 'host';}, enumerable: true});
  Object.defineProperty(unit, 'privateHostCache', {value: shared, enumerable: false});
  const result = withFarmyardDerivedStats(unit);
  assert.notEqual(result, unit); assert.equal(result.id, 0); assert.equal(result.stats, unit.stats);
  assert.equal(result.hostExtension, unit.hostExtension); assert.equal(result.hostMap, shared);
  assert.equal(result.hostService, unit.hostService); assert.equal(result.privateHostCache, shared);
  assert.equal(result.progression, unit.progression); assert.equal(result.skillPoints, 73); assert.equal(result[token], 'retain');
  assert.equal(Object.getOwnPropertyDescriptor(result, 'hostAccessor').get, Object.getOwnPropertyDescriptor(unit, 'hostAccessor').get);
  assert.equal(accesses, 0, 'Unknown host accessors are neither invoked nor serialized');
  assert.equal(JSON.stringify(deriveFarmyardStats(unit)).includes('farmyard-calculation'), false);
  Object.freeze(unit.stats); Object.freeze(unit);
  assert.deepEqual(deriveFarmyardStats(unit), deriveFarmyardStats(result), 'Read-only actors are supported');
});

test('actual buildStats menu shape omits ID/weapon and keeps the source Firearms fallback without inventing fields', () => {
  for (const preset of QUICKPLAY_PRESETS) {
    const menu = {team: 'squad', name: preset.name}; Farmyard.initializeStats(menu, preset.stats);
    assert.equal(Object.hasOwn(menu, 'id'), false); assert.equal(Object.hasOwn(menu, 'weapon'), false);
    const result = withFarmyardDerivedStats(menu);
    assert.deepEqual(result, menu);
    assert.equal(Object.hasOwn(result, 'id'), false); assert.equal(Object.hasOwn(result, 'weapon'), false);
    assert.equal(result.accuracy, Farmyard.weaponAccuracy(menu));
  }
});

test('confirmed raw-damage calculation preserves pre-HP-floor amount without committing health or casualty state', () => {
  for (const preset of QUICKPLAY_PRESETS) for (const damage of [0, 0.25, 5, 10.5, 100, 1000000000]) {
    const unit = actor(preset); unit.hp = 0.5;
    const before = structuredClone(unit), amount = farmyardDamageAfterResistance(unit, damage);
    assert.equal(amount, Farmyard.damageAfterResistance(unit, damage));
    assert.deepEqual(unit, before); assert.equal(Object.hasOwn(unit, 'casualty'), false);
    if (damage === 100) assert.ok(amount > unit.hp, 'Do not substitute core applied-HP loss for source damage amount');
  }
});

test('unsupported legacy/incomplete/malformed stats and calculation arguments reject with paths without mutation', () => {
  const cases = [
    ['UNSUPPORTED_STAT_VERSION', '/actor/statVersion', unit => unit.statVersion = 1],
    ['UNSUPPORTED_STAT_VERSION', '/actor/statVersion', unit => unit.statVersion = 3],
    ['UNSUPPORTED_ACTOR_SHAPE', '/actor/statVersion', unit => delete unit.statVersion],
    ['UNSUPPORTED_ACTOR_SHAPE', '/actor/stats', unit => delete unit.stats],
    ['UNSUPPORTED_ACTOR_SHAPE', '/actor/stats/climbing', unit => delete unit.stats.climbing],
    ['INVALID_STAT', '/actor/stats/dexterity', unit => unit.stats.dexterity = 40.5],
    ['INVALID_STAT', '/actor/stats/strength', unit => unit.stats.strength = 0],
    ['INVALID_STAT', '/actor/stats/perception', unit => unit.stats.perception = 101],
    ['INVALID_STAT', '/actor/stats/firearms', unit => unit.stats.firearms = NaN],
    ['UNSUPPORTED_STAT_FIELD', '/actor/stats/charisma', unit => unit.stats.charisma = 70],
    ['UNSUPPORTED_WEAPON', '/actor/weapon', unit => unit.weapon = 'future-laser']
  ];
  for (const [code, path, change] of cases) {
    const unit = actor(); change(unit); const before = structuredClone(unit);
    rejects(() => withFarmyardDerivedStats(unit), code, path); assert.deepEqual(unit, before);
  }
  const missing = actor(); missing.hp = undefined;
  const repaired = Farmyard.refreshStats(structuredClone(missing)); assert.equal(repaired.hp, repaired.maxHp);
  assert.equal(withFarmyardDerivedStats(missing).hp, undefined, 'Calculation seam is not refreshStats resource repair');
  let calls = 0; const accessor = actor(); Object.defineProperty(accessor, 'stats', {get() {calls++; return {};}, enumerable: true});
  rejects(() => deriveFarmyardStats(accessor), 'UNSUPPORTED_ACTOR_SHAPE', '/actor/stats'); assert.equal(calls, 0);
  rejects(() => deriveFarmyardStats([]), 'UNSUPPORTED_ACTOR_SHAPE', '/actor');
  rejects(() => farmyardWeaponAccuracy(actor(), 'bad'), 'UNSUPPORTED_WEAPON', '/weapon');
  rejects(() => farmyardEffectiveSkill(actor(), 'charisma'), 'UNSUPPORTED_SKILL', '/skill');
  let coerced = 0; const badId = {toString() {coerced++; throw Error('Host coercion should not execute');}};
  rejects(() => farmyardWeaponAccuracy(actor(), badId), 'UNSUPPORTED_WEAPON', '/weapon');
  rejects(() => farmyardEffectiveSkill(actor(), badId), 'UNSUPPORTED_SKILL', '/skill'); assert.equal(coerced, 0);
  for (const bad of [-1, NaN, Infinity, 1000000001]) rejects(() => farmyardDamageAfterResistance(actor(), bad), 'INVALID_DAMAGE', '/rawDamage');
});

test('Farmyard adapter imports only the public engine-owned rules entry and starts no browser/runtime machinery', () => {
  const source = fs.readFileSync(new URL('../packages/adapters/farmyard/rules.js', import.meta.url), 'utf8');
  assert.deepEqual([...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(match => match[1]), ['../../rules-core/index.js']);
  assert.equal(typeof globalThis.window, 'undefined'); assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.localStorage, 'undefined');
});
