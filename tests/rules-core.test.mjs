import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacter, openCharacter, exportCharacter, deriveStats, effectiveSkill, characterSheet,
  trainCharacter, previewCosts, spendResources, previewSkillCheck, resolveSkillCheck,
  previewAttack, resolveAttack, resolveAttackRoll, applyDamage, CHECK_PROFILES, STAT_DEFINITIONS, nextRandom}
  from '@nautilus-engine/map-core/rules';
import {climbingPreview, rollClimb} from '@nautilus-engine/map-core/rules/aft';
import {createDialogueState, getDialogueRecord, choicePreview, stageDialogue, validateDialogueState}
  from '@nautilus-engine/map-core/rules/dialogue';

const make = options => createCharacter({id: 'actor', ...options});
const seedForOutput = value => Number(((BigInt(value) - 1013904223n) * 4276115653n) & 0xffffffffn);
const attackSpec = extra => ({profile: CHECK_PROFILES.farmyard, skill: 'firearms', permitted: true, costs: {ap: 6, stamina: 1}, ...extra});

test('headless sheets have six attributes, eight skills and independent resources', () => {
  assert.equal(typeof globalThis.document, 'undefined'); assert.equal(typeof globalThis.window, 'undefined');
  const a = make(), b = make({id: 'other'}), sheet = characterSheet(a);
  assert.equal(STAT_DEFINITIONS.filter(s => s.kind === 'attribute').length, 6);
  assert.equal(sheet.stats.filter(s => s.kind === 'skill').length, 8);
  assert.equal(sheet.resources.hp.current, 75);
  a.stats.strength = 100; a.resources.hp = 0;
  assert.equal(b.stats.strength, 25); assert.equal(b.resources.hp, 75);
});

test('named cast and species do not silently choose a balance profile', () => {
  const a = make({name: 'Yakov'}), b = make({name: 'Unrelated protagonist'});
  assert.deepEqual(a.stats, b.stats); assert.equal(a.stats.strength, 25);
});

test('derived resource limits and resistance retain established endpoint formulas', () => {
  for (const [stat, hp, ap, resistance] of [[1, 51, 4, 1], [50, 100, 11, 5], [100, 150, 18, 10]]) {
    const a = make({stats: {strength: stat, endurance: stat, agility: stat}}), derived = deriveStats(a);
    assert.equal(derived.maxHp, hp); assert.equal(derived.maxStamina, hp); assert.equal(derived.maxAp, ap);
    assert.equal(derived.damageResistance, resistance);
  }
});

test('portable saves preserve empty resources and reject unsupported or damaged sheets', () => {
  const a = make({resources: {hp: 0, ap: 0, stamina: 0}});
  assert.deepEqual(openCharacter(exportCharacter(a)), a);
  const mutations = [s => delete s.resources.hp, s => s.resources.ap = -1, s => s.resources.hp = 151,
    s => delete s.stats.climbing, s => s.stats.dexterity = 2.5, s => s.stats.medical = NaN,
    s => s.stats.charisma = 80, s => s.version = 2, s => s.skillPoints = -1, s => s.id = '', s => s.inventory = []];
  for (const mutate of mutations) {const damaged = structuredClone(a); mutate(damaged); assert.throws(() => openCharacter(damaged));}
  assert.throws(() => make({stats: {strength: 101}})); assert.throws(() => make({resources: {hp: null}}));
});

test('training costs one point, preserves injuries and never refills AP or stamina', () => {
  const a = make({stats: {strength: 99}, skillPoints: 1, resources: {hp: 20, ap: 0, stamina: 0}}), before = structuredClone(a);
  const out = trainCharacter(a, 'vitality');
  assert.equal(out.ok, true); assert.equal(out.character.stats.strength, 100); assert.equal(out.character.skillPoints, 0);
  assert.deepEqual(out.character.resources, {hp: 20, ap: 0, stamina: 0}); assert.deepEqual(a, before);
  assert.equal(trainCharacter(out.character, 'strength').ok, false);
  assert.equal(trainCharacter(make({stats: {strength: 100}, skillPoints: 1}), 'strength').ok, false);
  assert.throws(() => trainCharacter(a, 'typo'));
});

test('Intelligence bonus stays explicit; dialogue checks retain raw skill scores', () => {
  const a = make({stats: {medical: 95, mechanical: 40, intelligence: 100}});
  assert.equal(effectiveSkill(a, 'medical'), 100); assert.equal(effectiveSkill(a, 'mechanical'), 50);
  assert.equal(previewSkillCheck(a, {skill: 'mechanical'}).chance, 40);
});

test('skill gates, bounded modifiers and repeated previews consume no state', () => {
  const a = make({stats: {mechanical: 45}}), before = exportCharacter(a);
  for (let i = 0; i < 25; i++) assert.equal(previewSkillCheck(a, {skill: 'mechanical', difficulty: 75}).chance, 20);
  assert.equal(exportCharacter(a), before);
  assert.equal(previewSkillCheck(a, {skill: 'mechanical', minimum: 46}).ok, false);
  assert.equal(previewSkillCheck(a, {skill: 'mechanical', difficulty: 76}).ok, false);
  const p = previewSkillCheck(a, {skill: 'mechanical', modifiers: [{id: 'tool', add: 20}, {id: 'help', add: 20}]});
  assert.equal(p.modifier, 20); assert.equal(p.chance, 65);
  const denied = resolveSkillCheck(a, {skill: 'mechanical', minimum: 46}, 42);
  assert.equal(denied.seed, 42); assert.deepEqual(denied.events, []);
  assert.throws(() => previewSkillCheck(a, {skill: 'mechanical', modifiers: [{id: 'bad', add: 21}]}));
});

test('every percentile boundary produces the displayed success count and replayable receipts', () => {
  for (const chance of [20, 50, 99]) {
    const a = make({stats: {leadership: chance}}); let successes = 0;
    for (let roll = 1; roll <= 100; roll++) {
      const seed = seedForOutput(roll - 1), out = resolveSkillCheck(a, {skill: 'leadership'}, seed);
      assert.equal(out.roll, roll); assert.equal(out.outcome, roll <= chance ? 'success' : 'failure');
      assert.deepEqual(out, resolveSkillCheck(a, {skill: 'leadership'}, seed)); successes += out.outcome === 'success';
    }
    assert.equal(successes, chance);
  }
});

test('resource spending is atomic when a second resource is unavailable', () => {
  const a = make({resources: {ap: 9, stamina: 0}}), before = exportCharacter(a);
  assert.equal(previewCosts(a, {ap: 6, stamina: 1}).ok, false);
  const denied = spendResources(a, {ap: 6, stamina: 1});
  assert.equal(denied.ok, false); assert.deepEqual(denied.character, a); assert.deepEqual(denied.events, []);
  assert.equal(exportCharacter(a), before); assert.throws(() => spendResources(a, {ap: -1}));
  assert.throws(() => spendResources(a, {ammo: 1}));
});

test('attack preview explains skill blend and world modifiers; host permission is mandatory', () => {
  const a = make({stats: {firearms: 80, heavyWeapons: 20, dexterity: 40}});
  const p = previewAttack(a, attackSpec({modifiers: [{id: 'cover', add: -20}]}));
  assert.equal(p.base, 70); assert.equal(p.chance, 50);
  assert.equal(previewAttack(a, attackSpec({skill: 'heavyWeapons'})).base, 25);
  assert.equal(previewAttack(a, attackSpec({skill: null})).base, 40);
  assert.equal(previewAttack(a, attackSpec({permitted: false, reason: 'Blocked by a wall.'})).reason, 'Blocked by a wall.');
  const missing = attackSpec(); delete missing.permitted; assert.throws(() => previewAttack(a, missing));
  assert.throws(() => previewAttack(a, attackSpec({skill: 'unknown-weapon'})));
});

test('rejected attack spends nothing and does not advance either random profile', () => {
  const a = make({stats: {agility: 1}}), before = exportCharacter(a);
  for (const profile of [CHECK_PROFILES.farmyard, CHECK_PROFILES.aftFirearm]) {
    const out = resolveAttack(a, attackSpec({profile}), 42);
    assert.equal(out.ok, false); assert.equal(out.reason, 'Not enough AP.'); assert.equal(out.seed, 42);
    assert.deepEqual(out.character, a); assert.deepEqual(out.events, []);
  }
  assert.equal(exportCharacter(a), before);
});

test('Farmyard percent and AFT D20 consume their own exact draw counts and critical bands', () => {
  const naturalOne = seedForOutput(0), naturalTwenty = seedForOutput(4294967295);
  const failed = resolveAttackRoll(95, CHECK_PROFILES.aftFirearm, naturalOne);
  const passed = resolveAttackRoll(5, CHECK_PROFILES.aftFirearm, naturalTwenty);
  assert.equal(failed.die, 1); assert.equal(failed.rolledHit, false); assert.equal(failed.critical, 'failure');
  assert.equal(passed.die, 20); assert.equal(passed.rolledHit, true); assert.equal(passed.critical, 'success');
  assert.equal(failed.draws, 2); assert.equal(passed.draws, 2);
  const percent = resolveAttackRoll(5, CHECK_PROFILES.farmyard, naturalOne);
  assert.equal(percent.draws, 1); assert.equal(percent.rolledHit, true); assert.equal(percent.critical, null);
  assert.throws(() => resolveAttackRoll(50, 'unknown', 42)); assert.throws(() => nextRandom(NaN));
});

test('accepted attacks spend resources once but cannot apply damage before a world impact', () => {
  const a = make({stats: {agility: 100}}), before = structuredClone(a);
  const out = resolveAttack(a, attackSpec(), 42);
  assert.equal(out.ok, true); assert.equal(out.character.resources.ap, a.resources.ap - 6);
  assert.equal(out.character.resources.stamina, a.resources.stamina - 1);
  assert.equal(out.character.resources.hp, a.resources.hp); assert.equal(Object.hasOwn(out, 'target'), false);
  assert.deepEqual(a, before); assert.deepEqual(out, resolveAttack(a, attackSpec(), 42));
});

test('confirmed raw damage applies resistance once, floors at zero and supports real-time policy', () => {
  const target = make({stats: {endurance: 100}, resources: {hp: 20}});
  const hit = applyDamage(target, 15);
  assert.equal(hit.resistance, 10); assert.equal(hit.applied, 5); assert.equal(hit.character.resources.hp, 15);
  assert.equal(applyDamage(target, 5).applied, 0);
  assert.equal(applyDamage(target, 100).applied, 20);
  assert.equal(applyDamage(target, 15, {resistance: 'none'}).character.resources.hp, 5);
  assert.equal(target.resources.hp, 20); assert.throws(() => applyDamage(target, -1));
});

test('AFT climbing preserves automatic ladders, critical falls and an independent saved RNG', () => {
  const unit = {stats: {climbing: 50, strength: 25}, hp: 75, maxHp: 75, stamina: 80, maxStamina: 80};
  const state = {phase: 'player', seed: seedForOutput(4294967295)};
  const before = structuredClone(state), ladder = climbingPreview(unit, {kind: 'ladder'}, true);
  assert.equal(ladder.chance, 100); assert.equal(rollClimb(state, unit, {kind: 'ladder'}).success, true);
  assert.deepEqual(state, before);
  unit.stats.climbing = 90;
  const risky = rollClimb(state, unit, {kind: 'wall'});
  assert.equal(risky.roll, 100); assert.equal(risky.criticalFailure, true); assert.equal(risky.fall, true);
  assert.equal(state.seed, before.seed); assert.notEqual(state.climbSeed, undefined);
});

test('full dialogue staging rejects stale previews and returns a receipt for repeated attempts', () => {
  const definition = {schemaVersion: 1, id: 'repair', version: 1, facts: {}, entry: [{node: 'start'}], nodes: {
    start: {npc: 'Can you repair it?', choices: [{id: 'try', text: 'Try the repair.',
      check: {attemptId: 'repair_once', skill: 'mechanical'}, outcomes: {success: {to: 'fixed'}, failure: {to: 'broken'}}}]},
    fixed: {npc: 'It works.'}, broken: {npc: 'It remains broken.'}
  }};
  const state = createDialogueState(42), speaker = {id: 'mechanic', stats: {mechanical: 60}};
  const record = getDialogueRecord(state, 'npc', definition);
  const preview = choicePreview(definition, record, 'start', 'try', speaker, state.revision);
  const before = structuredClone(state);
  assert.throws(() => stageDialogue(state, definition, 'npc', {...speaker, stats: {mechanical: 61}}, 'start', 'try', preview.token), /changed/);
  assert.deepEqual(state, before);
  const out = stageDialogue(state, definition, 'npc', speaker, 'start', 'try', preview.token);
  assert.deepEqual(state, before); validateDialogueState(out.next);
  const saved = JSON.parse(JSON.stringify(out.next));
  const repeated = stageDialogue(saved, definition, 'npc', speaker, 'start', 'try', preview.token);
  assert.equal(repeated.repeated, true); assert.deepEqual(repeated.receipt, out.receipt);
  assert.deepEqual(saved, out.next);
  const changed = structuredClone(saved); Object.values(changed.records)[0].receipts[0].roll = 500;
  assert.throws(() => validateDialogueState(changed));
});
