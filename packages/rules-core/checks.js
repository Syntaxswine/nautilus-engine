import {checkChance, percentile, percentileOutcome, DIALOGUE_FORMULA, rollFirearmShot} from './upstream.js';
import {openCharacter, STAT_DEFINITIONS} from './characters.js';
import {fields, finite, integer, modifiers} from './validation.js';

export const CHECK_PROFILES = Object.freeze({skill: DIALOGUE_FORMULA, farmyard: 'farmyard-percent-1', aftFirearm: 'aft-firearm-d20-1'});
export const validSeed = seed => integer(seed, 0, 4294967295, 'random seed');
export function nextRandom(seed) {
  const next = (Math.imul(validSeed(seed), 1664525) + 1013904223) >>> 0;
  return {seed: next, value: next / 4294967296};
}

// Existing dialogue formula, including its minimum skill / 20% eligibility gate.
// Callers preselect contextual modifiers; full fact/attempt handling is in ./dialogue.
export function previewSkillCheck(character, specification) {
  const value = openCharacter(character);
  fields(specification, ['skill', 'minimum', 'difficulty', 'modifiers'], 'skill check');
  if (!STAT_DEFINITIONS.some(stat => stat.key === specification.skill)) throw new TypeError('Unknown check skill.');
  const check = {skill: specification.skill,
    minimum: integer(specification.minimum ?? 1, 1, 100, 'minimum skill'),
    difficulty: integer(specification.difficulty ?? 50, 0, 100, 'difficulty'),
    modifiers: modifiers(specification.modifiers)};
  if (check.modifiers.length > 32 || check.modifiers.some(modifier => !Number.isInteger(modifier.add) || Math.abs(modifier.add) > 20)) throw new TypeError('At most 32 skill modifiers, each a whole number from -20 to 20, are supported.');
  const preview = checkChance(check, value.stats);
  return {...preview, actorId: value.id, profile: CHECK_PROFILES.skill, stat: check.skill,
    ok: preview.eligible, reason: preview.eligible ? '' : preview.skill < check.minimum ? 'Minimum skill not met.' : 'Success chance is below 20%.'};
}
export function resolveSkillCheck(character, specification, seed) {
  validSeed(seed);
  const preview = previewSkillCheck(character, specification);
  if (!preview.ok) return {ok: false, reason: preview.reason, preview, seed, events: []};
  const draw = percentile(seed), outcome = percentileOutcome(preview.chance, draw.roll);
  const receipt = {type: 'skill-checked', actorId: preview.actorId, profile: preview.profile, stat: preview.stat,
    chance: preview.chance, roll: draw.roll, outcome, seedBefore: seed, seedAfter: draw.seed};
  return {ok: true, preview, ...draw, outcome, events: [receipt]};
}

// A probability decision only. AFT still traces a shot after this decision.
export function resolveAttackRoll(chance, profile, seed) {
  finite(chance, 5, 95, 'attack chance'); validSeed(seed);
  if (![CHECK_PROFILES.farmyard, CHECK_PROFILES.aftFirearm].includes(profile)) throw new TypeError('Choose an explicit attack profile.');
  let nextSeed = seed, draws = 0;
  const random = () => {const draw = nextRandom(nextSeed); nextSeed = draw.seed; draws++; return draw.value;};
  const roll = profile === CHECK_PROFILES.aftFirearm ? rollFirearmShot(chance, random) : (() => {
    const percent = random() * 100;
    return {percent, rolledHit: percent < chance, critical: null};
  })();
  return {profile, chance, ...roll, seed: nextSeed, draws};
}
